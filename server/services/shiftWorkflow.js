import mongoose from 'mongoose';
import Shift from '../models/shift.model.js';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import { ShiftRequest, ShiftNotification, WorkflowLock } from '../models/shiftWorkflow.model.js';
import { dateKey, dateRange, todayKey, addDays, shiftWindow, validateShift, shortages, overlaps, attendanceMetrics, integer, textReason, fail, HOUR, ROLES } from '../utils/shiftTime.js';
import { isManager, managerOnly, ownOrManager } from '../middleware/shiftAccess.js';

const id = value => String(value?._id || value);
const requestNames = { leave: 'xin nghỉ', swap: 'thay ca', correction: 'sửa công', register: 'đăng ký ca' };
const requestStates = { pending: 'chờ xử lý', approved: 'đã duyệt', rejected: 'đã từ chối', cancelled: 'đã hủy' };
export function objectId(value) {
    if (!mongoose.isValidObjectId(value)) fail('Mã dữ liệu không hợp lệ');
    return value;
}
export function api(handler) {
    return async (req, res) => {
        try {
            const data = await handler(req);
            res.json({ success: true, error: false, data, message: 'Thao tác thành công' });
        } catch (error) {
            const status = error.status || (error.code === 11000 || error.name === 'VersionError' ? 409 :
                ['ValidationError', 'CastError'].includes(error.name) ? 400 : 500);
            if (status === 500) console.error('Shift workflow:', error);
            res.status(status).json({
                success: false, error: true,
                message: status === 500 ? 'Không thể xử lý ca làm. Kiểm tra kết nối MongoDB replica set và thử lại.' :
                    error.code === 11000 ? 'Dữ liệu đã tồn tại. Vui lòng tải lại.' : error.message,
            });
        }
    };
}
let ready;
export async function transaction(work) {
    // init outside a transaction also ensures the unique attendance index exists.
    ready ||= Promise.all([Shift, Attendance, ShiftRequest, ShiftNotification, WorkflowLock].map(model => model.init()))
        .catch(error => { ready = undefined; throw error; });
    await ready;
    await WorkflowLock.updateOne({ _id: 'roster' }, { $setOnInsert: { version: 0 } }, { upsert: true });
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            await WorkflowLock.updateOne({ _id: 'roster' }, { $inc: { version: 1 } }, { session });
            result = await work(session);
        });
        return result;
    } finally { await session.endSession(); }
}
export async function getShift(value, session) {
    const shift = await Shift.findById(objectId(value)).session(session || null);
    if (!shift) fail('Không tìm thấy ca làm', 404);
    return shift;
}
const snapshot = shift => ({
    date: shift.date, startTime: shift.startTime, endTime: shift.endTime, status: shift.status,
    assignedStaff: shift.assignedStaff.map(s => ({ userId: id(s.userId), role: s.role, confirmed: s.confirmed })),
    maxStaff: shift.maxStaff, requirements: shift.requirements?.toObject?.() || shift.requirements,
    breakMinutes: shift.breakMinutes, notes: shift.notes, lockedAt: shift.lockedAt,
});
export function audit(shift, req, action, reason, before) {
    shift.history.push({ actor: req.userId, action, reason, before, after: snapshot(shift) });
}
export async function notify(people, shift, message, session) {
    const ids = [...new Set(people.filter(Boolean).map(id))];
    if (ids.length) await ShiftNotification.insertMany(ids.map(userId => ({
        userId, shiftId: shift._id,
        message: dateKey(shift.date) + ' ' + shift.startTime + '–' + shift.endTime + ': ' + message,
    })), { session });
}
async function notifyManagers(shift, message, session) {
    const managers = await User.find({ role: 'MANAGER', employeeStatus: 'active' }).select('_id').session(session);
    await notify(managers.map(u => u._id), shift, message, session);
}
export function requireMember(req, shift) {
    const staff = shift.assignedStaff.find(s => id(s.userId) === id(req.userId));
    if (!staff) fail('Bạn không được phân công vào ca này', 403);
    return staff;
}
function editable(shift) {
    if (shift.lockedAt || !['draft', 'scheduled'].includes(shift.status) || shiftWindow(shift).start <= new Date())
        fail('Chỉ sửa được ca chưa bắt đầu và chưa chốt', 409);
}
async function noAttendance(shift, session) {
    if (await Attendance.exists({ shiftId: shift._id }).session(session)) fail('Ca đã phát sinh công; không thể thay đổi lịch/phân công', 409);
}
async function validateStaff(shift, session) {
    const window = validateShift(shift);
    for (const staff of shift.assignedStaff) {
        objectId(staff.userId);
        const user = await User.findById(staff.userId).session(session);
        if (!user || user.employeeStatus !== 'active' || user.status !== 'Active' ||
            user.role !== staff.role)
            fail('Nhân viên không hoạt động hoặc không phù hợp vai trò ' + staff.role);
        const others = await Shift.find({
            _id: { $ne: shift._id },
            date: dateRange(addDays(shift.date, -1), addDays(shift.date, 1)),
            status: { $in: ['draft', 'scheduled', 'ongoing'] },
            'assignedStaff.userId': staff.userId,
        }).session(session);
        if (others.some(other => overlaps(window, shiftWindow(other))))
            fail(user.name + ' bị trùng giờ với ca khác', 409);
    }
    const duplicate = await Shift.exists({
        _id: { $ne: shift._id }, date: dateRange(dateKey(shift.date)),
        shiftType: shift.shiftType, status: { $ne: 'cancelled' },
    }).session(session);
    if (duplicate) fail('Ngày này đã có ca cùng loại', 409);
}
function requireCoverage(shift) {
    const missing = shortages(shift);
    if (!shift.assignedStaff.length || missing.length) fail('Chưa đủ nhân sự để công bố: ' + (missing.join(', ') || 'chưa phân công'));
}
async function invalidateRequests(shift, req, session, reason) {
    const requests = await ShiftRequest.find({ shiftId: shift._id, status: 'pending' }).session(session);
    for (const request of requests) {
        request.status = 'cancelled';
        request.reviewNote = reason;
        request.reviewedBy = req.userId;
        request.reviewedAt = new Date();
        await request.save({ session });
        await notify([request.userId, request.targetUserId], shift, 'Yêu cầu bị hủy: ' + reason, session);
    }
}
export function viewShift(shift, manager = false) {
    const data = shift.toObject ? shift.toObject() : { ...shift };
    const window = shiftWindow(data);
    const result = {
        ...data, startAt: window.start, endAt: window.end, plannedHours: window.hours - (data.breakMinutes || 0) / 60,
        shortages: shortages(data), overdue: !['cancelled', 'completed'].includes(data.status) && window.end < new Date(),
    };
    if (!manager) {
        delete result.history; delete result.createdBy;
        result.assignedStaff?.forEach(s => { if (s.userId && typeof s.userId === 'object') { delete s.userId.employeeStatus; delete s.userId.status; } });
    }
    return result;
}
export async function listShifts(req, employeeId) {
    if (employeeId) { objectId(employeeId); ownOrManager(req, employeeId); }
    const start = req.query.startDate || todayKey();
    const end = req.query.endDate || addDays(start, 30);
    const query = { date: dateRange(start, end) };
    if (employeeId || !isManager(req)) query['assignedStaff.userId'] = employeeId || req.userId;
    if (!isManager(req)) query.status = { $ne: 'draft' };
    const shifts = await Shift.find(query).populate('assignedStaff.userId', 'name role employeeId employeeStatus status').populate('history.actor', 'name employeeId').sort({ date: 1, startTime: 1 });
    // Include adjacent days for rest-time and total-hours warnings.
    const nearby = isManager(req) ? await Shift.find({
        date: dateRange(addDays(start, -7), addDays(end, 7), 110), status: { $nin: ['cancelled'] },
    }).lean() : [];
    return shifts.map(shift => {
        const data = viewShift(shift, isManager(req));
        data.warnings = [];
        for (const staff of shift.assignedStaff) {
            if (!staff.userId) { data.warnings.push('Có nhân viên không còn tồn tại'); continue; }
            if (isManager(req) && (staff.userId.employeeStatus !== 'active' || staff.userId.status !== 'Active')) data.warnings.push(staff.userId.name + ': hiện không hoạt động / đang nghỉ');
            const window = shiftWindow(shift);
            const own = nearby.filter(s => id(s._id) !== id(shift._id) && s.assignedStaff.some(p => id(p.userId) === id(staff.userId)));
            if (own.some(s => {
                const w = shiftWindow(s);
                return !overlaps(window, w) && Math.min(Math.abs(window.start - w.end), Math.abs(w.start - window.end)) < 8 * HOUR;
            })) data.warnings.push(staff.userId.name + ': nghỉ giữa hai ca dưới 8 giờ');
            const weekStart = addDays(shift.date, -((new Date(dateKey(shift.date)).getUTCDay() + 6) % 7));
            const weekEnd = addDays(weekStart, 7);
            const weeklyHours = window.hours + own.filter(s => dateKey(s.date) >= weekStart && dateKey(s.date) < weekEnd)
                .reduce((sum, s) => sum + shiftWindow(s).hours, 0);
            if (weeklyHours > 48) data.warnings.push(staff.userId.name + ': lịch tuần trên 48 giờ');
        }
        return data;
    });
}
export async function createShifts(req) {
    managerOnly(req);
    return transaction(async session => {
        const count = integer(req.body.repeatCount ?? 1, 'Số lần lặp', 1, 12);
        const every = integer(req.body.repeatEveryDays ?? 7, 'Khoảng lặp', 1, 7);
        if (![1, 7].includes(every)) fail('Chỉ hỗ trợ lặp hàng ngày hoặc hàng tuần');
        const results = [];
        for (let i = 0; i < count; i++) {
            const { shiftType, startTime, endTime, notes, requirements } = req.body;
            const shift = new Shift({
                shiftType, date: new Date(addDays(req.body.date, i * every)), startTime, endTime, notes,
                maxStaff: req.body.maxStaff ?? 10, breakMinutes: req.body.breakMinutes ?? 0, requirements,
                status: 'draft', assignedStaff: [], createdBy: req.userId,
            });
            if (shiftWindow(shift).start <= new Date()) fail('Không thể tạo lịch trong quá khứ');
            await validateStaff(shift, session);
            audit(shift, req, 'create', 'Tạo lịch nháp');
            await shift.save({ session });
            results.push(viewShift(shift, true));
        }
        return results;
    });
}
export async function updateSchedule(req) {
    managerOnly(req);
    return transaction(async session => {
        const shift = await getShift(req.params.id, session);
        editable(shift);
        await noAttendance(shift, session);
        if (req.body.version !== shift.__v) fail('Lịch đã thay đổi. Vui lòng tải lại trước khi sửa.', 409);
        const before = snapshot(shift);
        for (const key of ['shiftType', 'startTime', 'endTime', 'maxStaff', 'breakMinutes', 'notes', 'requirements'])
            if (req.body[key] !== undefined) shift.set(key, req.body[key]);
        if (req.body.date !== undefined) shift.date = new Date(dateKey(req.body.date));
        if (shiftWindow(shift).start <= new Date()) fail('Không được chuyển ca về quá khứ');
        await validateStaff(shift, session);
        if (shift.status === 'scheduled') requireCoverage(shift);
        const changedTime = dateKey(before.date) !== dateKey(shift.date) || before.startTime !== shift.startTime || before.endTime !== shift.endTime;
        if (changedTime) {
            shift.assignedStaff.forEach(s => { s.confirmed = false; s.confirmedAt = undefined; });
            await invalidateRequests(shift, req, session, 'Lịch ca đã đổi; vui lòng gửi lại nếu cần');
        }
        audit(shift, req, 'update', textReason(req.body.reason), before);
        await shift.save({ session });
        if (shift.status === 'scheduled') await notify(shift.assignedStaff.map(s => s.userId), shift, 'Lịch đã được cập nhật. Vui lòng kiểm tra lại.', session);
        return viewShift(shift, true);
    });
}
export async function assignPerson(req, remove = false) {
    managerOnly(req);
    return transaction(async session => {
        const shift = await getShift(req.body.shiftId || req.params.id, session);
        editable(shift);
        await noAttendance(shift, session);
        const assignment = remove && req.body.assignmentId ? shift.assignedStaff.id(objectId(req.body.assignmentId)) : null;
        if (remove && req.body.assignmentId && !assignment) fail('Không tìm thấy phân công', 404);
        const userId = objectId(assignment?.userId || req.body.userId);
        const before = snapshot(shift);
        if (remove) {
            if (!shift.assignedStaff.some(s => id(s.userId) === id(userId))) fail('Nhân viên không nằm trong ca');
            textReason(req.body.reason);
            shift.assignedStaff = shift.assignedStaff.filter(s => id(s.userId) !== id(userId));
            await invalidateRequests(shift, req, session, 'Phân công nhân sự đã thay đổi');
        } else shift.assignedStaff.push({ userId, role: req.body.role, confirmed: false });
        await validateStaff(shift, session);
        audit(shift, req, remove ? 'unassign' : 'assign', req.body.reason || 'Phân công nhân viên', before);
        await shift.save({ session });
        if (shift.status === 'scheduled') await notify([userId], shift, remove ? 'Bạn đã được gỡ khỏi ca.' : 'Bạn được phân công ca mới. Vui lòng xác nhận.', session);
        return viewShift(shift, true);
    });
}
export async function publishSchedule(req) {
    managerOnly(req);
    return transaction(async session => {
        const shift = await getShift(req.params.id, session);
        editable(shift);
        if (shift.status !== 'draft') fail('Ca đã được công bố', 409);
        await validateStaff(shift, session);
        requireCoverage(shift);
        shift.status = 'scheduled';
        shift.publishedAt = new Date();
        audit(shift, req, 'publish', 'Công bố lịch');
        await shift.save({ session });
        await notify(shift.assignedStaff.map(s => s.userId), shift, 'Lịch mới đã công bố. Vui lòng xác nhận.', session);
        return viewShift(shift, true);
    });
}
export async function cancelSchedule(req) {
    managerOnly(req);
    return transaction(async session => {
        const shift = await getShift(req.params.id, session);
        if (shift.lockedAt || !['draft', 'scheduled'].includes(shift.status)) fail('Chỉ hủy được ca chưa thực hiện', 409);
        await noAttendance(shift, session);
        const reason = textReason(req.body.reason);
        const before = snapshot(shift);
        shift.status = 'cancelled';
        shift.cancellationReason = reason;
        await invalidateRequests(shift, req, session, 'Ca làm đã bị hủy');
        audit(shift, req, 'cancel', reason, before);
        await shift.save({ session });
        await notify(shift.assignedStaff.map(s => s.userId), shift, 'Ca bị hủy: ' + reason, session);
        return viewShift(shift, true);
    });
}
export async function confirmSchedule(req) {
    return transaction(async session => {
        const shift = await getShift(req.params.id, session);
        editable(shift);
        if (shift.status !== 'scheduled') fail('Ca chưa được công bố');
        const person = requireMember(req, shift);
        person.confirmed = true;
        person.confirmedAt = new Date();
        audit(shift, req, 'confirm', 'Nhân viên xác nhận lịch');
        await shift.save({ session });
        return viewShift(shift);
    });
}
export async function copyWeek(req) {
    managerOnly(req);
    return transaction(async session => {
        const source = dateKey(req.body.sourceStart);
        const target = dateKey(req.body.targetStart);
        const originals = await Shift.find({ date: dateRange(source, addDays(source, 6)), status: { $ne: 'cancelled' } }).session(session);
        if (!originals.length) fail('Tuần nguồn không có ca');
        const results = [];
        for (const original of originals) {
            const offset = Math.round((new Date(dateKey(original.date)) - new Date(source)) / (24 * HOUR));
            const shift = new Shift({
                ...snapshot(original), _id: undefined, date: new Date(addDays(target, offset)), shiftType: original.shiftType,
                assignedStaff: original.assignedStaff.map(s => ({ userId: s.userId, role: s.role, confirmed: false })),
                status: 'draft', lockedAt: undefined, createdBy: req.userId,
            });
            if (shiftWindow(shift).start <= new Date()) fail('Tuần đích phải ở tương lai');
            await validateStaff(shift, session);
            audit(shift, req, 'copy', 'Sao chép lịch từ ' + source);
            await shift.save({ session });
            results.push(viewShift(shift, true));
        }
        return results;
    });
}
export async function replacementCandidates(req) {
    const shift = await getShift(req.params.id);
    const member = requireMember(req, shift);
    editable(shift);
    const candidates = await User.find({ role: member.role, status: 'Active', employeeStatus: 'active',
        _id: { $nin: shift.assignedStaff.map(s => s.userId) } }).select('name role employeeId');
    const nearby = await Shift.find({ date: dateRange(addDays(shift.date, -1), addDays(shift.date, 1)), status: { $in: ['draft', 'scheduled', 'ongoing'] } }).lean();
    return candidates.filter(u => !nearby.some(s => s.assignedStaff.some(p => id(p.userId) === id(u._id)) && overlaps(shiftWindow(s), shiftWindow(shift))));
}
export async function submitRequest(req) {
    return transaction(async session => {
        const shift = await getShift(req.params.id, session);
        const { type } = req.body;
        if (!['leave', 'swap', 'correction', 'register'].includes(type)) fail('Loại yêu cầu không hợp lệ');

        if (type === 'register') {
            const user = await User.findById(req.userId).session(session);
            if (!user || user.employeeStatus !== 'active' || user.status !== 'Active') fail('Chức năng dành cho nhân viên đang làm việc');
            if (shift.assignedStaff.some(s => id(s.userId) === id(req.userId))) fail('Bạn đã được phân công trong ca này rồi', 400);
            if (shift.assignedStaff.length >= shift.maxStaff) fail('Ca làm việc này đã đủ số lượng nhân sự', 400);
            editable(shift);
        } else {
            requireMember(req, shift);
            if (type !== 'correction') editable(shift);
            else if (shiftWindow(shift).start > new Date()) fail('Chưa đến ca để gửi sửa công');
        }
        if (shift.lockedAt || ['draft', 'cancelled'].includes(shift.status)) fail('Ca chưa công bố, đã hủy hoặc đã chốt', 409);
        if (await ShiftRequest.exists({ shiftId: shift._id, userId: req.userId, status: 'pending' }).session(session))
            fail('Bạn đã có yêu cầu đang chờ xử lý cho ca này', 409);
        const request = new ShiftRequest({ shiftId: shift._id, userId: req.userId, type, reason: textReason(req.body.reason) });
        if (type === 'swap') {
            const targetId = objectId(req.body.targetUserId);
            const person = shift.assignedStaff.find(s => id(s.userId) === id(req.userId));
            if (shift.assignedStaff.some(s => id(s.userId) === id(targetId))) fail('Người thay đã nằm trong ca');
            const proposed = { ...snapshot(shift), _id: shift._id, shiftType: shift.shiftType,
                assignedStaff: shift.assignedStaff.filter(s => id(s.userId) !== id(req.userId)).map(s => ({ userId: s.userId, role: s.role })) };
            proposed.assignedStaff.push({ userId: targetId, role: person.role });
            await validateStaff(proposed, session);
            request.targetUserId = targetId;
        }
        if (type === 'correction') {
            const { checkInTime, checkOutTime, breakMinutes = 0 } = req.body;
            if (!checkOutTime || new Date(checkOutTime) > new Date()) fail('Giờ ra phải có và không được ở tương lai');
            attendanceMetrics(shift, checkInTime, checkOutTime, breakMinutes);
            request.proposed = { checkInTime, checkOutTime, breakMinutes };
        }
        await request.save({ session });
        await notifyManagers(shift, 'Có yêu cầu ' + requestNames[type] + ' mới cần xử lý.', session);
        if (request.targetUserId) await notify([request.targetUserId], shift, 'Bạn được đề nghị nhận ca thay. Vui lòng đồng ý hoặc từ chối.', session);
        return request;
    });
}
export async function listRequests(req) {
    const query = isManager(req) ? {} : { $or: [{ userId: req.userId }, { targetUserId: req.userId }] };
    if (req.query.status) {
        if (!['pending', 'approved', 'rejected', 'cancelled'].includes(req.query.status)) fail('Trạng thái không hợp lệ');
        query.status = req.query.status;
    }
    return ShiftRequest.find(query).populate('userId targetUserId', 'name role employeeId')
        .populate('shiftId', 'date startTime endTime status').sort({ createdAt: -1 }).limit(200);
}
export async function respondRequest(req) {
    return transaction(async session => {
        const request = await ShiftRequest.findById(objectId(req.params.id)).session(session);
        if (!request) fail('Không tìm thấy yêu cầu', 404);
        if (request.status !== 'pending') fail('Yêu cầu đã được xử lý', 409);
        const shift = await getShift(request.shiftId, session);
        const action = req.body.action;
        if (action === 'cancel') {
            ownOrManager(req, request.userId);
            request.status = 'cancelled';
        } else if (['accept', 'decline'].includes(action)) {
            if (request.type !== 'swap' || id(request.targetUserId) !== id(req.userId)) fail('Chỉ người nhận ca được phản hồi', 403);
            editable(shift);
            request.targetAccepted = action === 'accept';
            if (action === 'decline') request.status = 'rejected';
        } else {
            managerOnly(req);
            if (!['approve', 'reject'].includes(action)) fail('Thao tác không hợp lệ');
            const reason = textReason(req.body.reason);
            if (shift.lockedAt) fail('Ca đã chốt; cần mở chốt trước', 409);
            if (action === 'approve') {
                if (request.type === 'correction') {
                    await correctRecord(shift, request.userId, request.proposed, req, session, reason);
                } else if (request.type === 'register') {
                    editable(shift);
                    await noAttendance(shift, session);
                    const user = await User.findById(request.userId).session(session);
                    if (!user) fail('Không tìm thấy thông tin nhân viên');
                    const role = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'].includes(user.role) ? user.role : 'WAITER';
                    if (shift.assignedStaff.some(s => id(s.userId) === id(request.userId))) fail('Nhân viên đã có trong ca');
                    if (shift.assignedStaff.length >= shift.maxStaff) fail('Ca làm việc này đã đủ người', 400);
                    const before = snapshot(shift);
                    shift.assignedStaff.push({ userId: request.userId, role, confirmed: true, confirmedAt: new Date() });
                    await validateStaff(shift, session);
                    audit(shift, req, 'register', reason, before);
                    await shift.save({ session });
                } else {
                    editable(shift);
                    await noAttendance(shift, session);
                    const member = shift.assignedStaff.find(s => id(s.userId) === id(request.userId));
                    if (!member) fail('Nhân viên đã được gỡ khỏi ca', 409);
                    const before = snapshot(shift);
                    const role = member.role;
                    shift.assignedStaff = shift.assignedStaff.filter(s => id(s.userId) !== id(request.userId));
                    if (request.type === 'swap') {
                        if (!request.targetAccepted) fail('Người thay ca chưa đồng ý');
                        shift.assignedStaff.push({ userId: request.targetUserId, role, confirmed: true, confirmedAt: new Date() });
                    }
                    await validateStaff(shift, session);
                    audit(shift, req, request.type, reason, before);
                    await shift.save({ session });
                }
                request.status = 'approved';
            } else request.status = 'rejected';
            request.reviewNote = reason;
            request.reviewedBy = req.userId;
            request.reviewedAt = new Date();
        }
        await request.save({ session });
        await notify([request.userId, request.targetUserId], shift, 'Yêu cầu ' + requestNames[request.type] + ': ' + requestStates[request.status] +
            (request.targetAccepted && request.status === 'pending' ? ' (người thay đã đồng ý)' : ''), session);
        if (action === 'accept' || action === 'cancel') await notifyManagers(shift, 'Yêu cầu đã được cập nhật; vui lòng kiểm tra.', session);
        return request;
    });
}
async function rejectOverlappingAttendance(userId, shiftId, start, end, session) {
    const records = await Attendance.find({ userId, shiftId: { $ne: shiftId }, checkInTime: { $ne: null } }).session(session);
    if (records.some(a => overlaps({ start, end }, { start: a.checkInTime, end: a.checkOutTime || new Date('9999-01-01') })))
        fail('Giờ công trùng với một phiên làm việc khác', 409);
}
export async function correctRecord(shift, userId, proposed, req, session, reason) {
    if (shift.lockedAt || ['draft', 'cancelled'].includes(shift.status)) fail('Không thể sửa công ca chưa công bố, đã hủy hoặc đã chốt', 409);
    if (!shift.assignedStaff.some(s => id(s.userId) === id(userId))) fail('Nhân viên không nằm trong ca');
    const checkInTime = new Date(proposed.checkInTime);
    const checkOutTime = new Date(proposed.checkOutTime);
    if (!proposed.checkOutTime || checkOutTime > new Date()) fail('Giờ ra phải có và không được ở tương lai');
    const metrics = attendanceMetrics(shift, proposed.checkInTime, proposed.checkOutTime, proposed.breakMinutes ?? 0);
    await rejectOverlappingAttendance(userId, shift._id, checkInTime, checkOutTime, session);
    let record = await Attendance.findOne({ userId, shiftId: shift._id }).session(session);
    if (!record) record = new Attendance({ userId, shiftId: shift._id });
    const before = record.isNew ? null : { checkInTime: record.checkInTime, checkOutTime: record.checkOutTime, workingHours: record.workingHours, breakMinutes: record.breakMinutes, status: record.status };
    Object.assign(record, metrics, { checkInTime, checkOutTime, reviewStatus: 'pending', reviewedAt: undefined, reviewedBy: undefined });
    record.history.push({ actor: req.userId, reason: textReason(reason), before, after: { checkInTime, checkOutTime, ...metrics } });
    await record.save({ session });
    audit(shift, req, 'correct-attendance', reason);
    await shift.save({ session });
    await notify([userId], shift, 'Giờ công đã được điều chỉnh: ' + reason, session);
    return record;
}
export async function checkInPerson(req) {
    managerOnly(req);
    return transaction(async session => {
        const userId = objectId(req.body.userId || req.userId);
        const shift = await getShift(req.body.shiftId, session);
        const now = new Date();
        const window = shiftWindow(shift);
        if (shift.lockedAt || !['scheduled', 'ongoing'].includes(shift.status)) fail('Ca chưa công bố, đã đóng hoặc đã hủy');
        if (now < new Date(+window.start - 30 * 60000) || now >= window.end) fail('Chỉ check-in từ 30 phút trước ca đến trước giờ kết thúc');
        const staff = shift.assignedStaff.find(s => id(s.userId) === id(userId));
        if (!staff) fail('Nhân viên không được phân công ca này', 403);
        const user = await User.findById(userId).session(session);
        if (!user || user.status !== 'Active' || user.employeeStatus !== 'active') fail('Nhân viên không hoạt động');
        if (await Attendance.exists({ userId, shiftId: shift._id }).session(session)) fail('Ca đã có chấm công; sử dụng điều chỉnh công', 409);
        if (await Attendance.exists({ userId, checkInTime: { $ne: null }, checkOutTime: null }).session(session)) fail('Nhân viên còn ca chưa check-out', 409);
        const record = new Attendance({ userId, shiftId: shift._id, checkInTime: now, checkedInBy: req.userId,
            ...attendanceMetrics(shift, now, null, 0) });
        await record.save({ session });
        shift.status = 'ongoing';
        staff.confirmed = true;
        staff.confirmedAt ||= now;
        audit(shift, req, 'check-in', 'Vào ca: ' + user.name);
        await shift.save({ session });
        return record;
    });
}
export async function checkOutPerson(req) {
    managerOnly(req);
    return transaction(async session => {
        const query = req.body.attendanceId ? { _id: objectId(req.body.attendanceId) } :
            { userId: objectId(req.body.userId), shiftId: objectId(req.body.shiftId) };
        const record = await Attendance.findOne(query).session(session);
        if (!record || !record.checkInTime) fail('Không có phiên đang làm', 404);
        const shift = await getShift(record.shiftId, session);
        if (shift.lockedAt || !['ongoing', 'scheduled'].includes(shift.status)) fail('Ca không cho phép check-out', 409);
        if (record.checkOutTime) fail('Đã check-out', 409);
        const now = new Date();
        const metrics = attendanceMetrics(shift, record.checkInTime, now, req.body.breakMinutes ?? shift.breakMinutes ?? 0);
        if (metrics.earlyLeaveMinutes) textReason(req.body.reason);
        Object.assign(record, metrics, { checkOutTime: now, checkedOutBy: req.userId, notes: req.body.reason || '', reviewStatus: 'pending' });
        await record.save({ session });
        audit(shift, req, 'check-out', req.body.reason || 'Kết thúc phiên làm việc');
        await shift.save({ session });
        return record;
    });
}
export async function finishSchedule(req) {
    managerOnly(req);
    return transaction(async session => {
        const shift = await getShift(req.params.id, session);
        if (shift.lockedAt || !['scheduled', 'ongoing'].includes(shift.status)) fail('Ca không thể kết thúc', 409);
        if (shiftWindow(shift).end > new Date()) fail('Chưa đến giờ kết thúc ca');
        const records = await Attendance.find({ shiftId: shift._id }).session(session);
        if (records.some(a => a.checkInTime && !a.checkOutTime)) fail('Còn nhân viên chưa check-out; hãy điều chỉnh công trước');
        for (const staff of shift.assignedStaff) {
            if (!records.some(a => id(a.userId) === id(staff.userId)))
                await Attendance.create([{ userId: staff.userId, shiftId: shift._id, status: 'absent', workingHours: 0,
                    history: [{ actor: req.userId, reason: 'Không có chấm công khi kết thúc ca' }] }], { session });
        }
        shift.status = 'completed';
        audit(shift, req, 'finish', req.body.reason ? textReason(req.body.reason) : 'Kết thúc ca; ghi nhận người vắng và chờ đối soát');
        await shift.save({ session });
        await notify(shift.assignedStaff.map(s => s.userId), shift, 'Ca đã kết thúc. Vui lòng kiểm tra giờ công.', session);
        return viewShift(shift, true);
    });
}
async function lockShift(shift, req, session) {
    if (shift.lockedAt) return;
    if (shift.status !== 'completed') fail('Cần kết thúc tất cả ca trước khi chốt công');
    if (await ShiftRequest.exists({ shiftId: shift._id, status: 'pending' }).session(session)) fail('Ca còn yêu cầu chưa xử lý');
    const records = await Attendance.find({ shiftId: shift._id }).session(session);
    if (records.some(a => a.checkInTime && !a.checkOutTime) ||
        shift.assignedStaff.some(s => !records.some(a => id(a.userId) === id(s.userId)))) fail('Công chưa đầy đủ để chốt');
    const now = new Date();
    await Attendance.updateMany({ shiftId: shift._id }, { $set: { reviewStatus: 'approved', reviewedBy: req.userId, reviewedAt: now } }, { session });
    shift.lockedAt = now;
    shift.lockedBy = req.userId;
    audit(shift, req, 'lock', textReason(req.body.reason));
    await shift.save({ session });
    await notify(shift.assignedStaff.map(s => s.userId), shift, 'Giờ công đã được duyệt và chốt.', session);
}
export async function reviewSchedule(req) {
    managerOnly(req);
    return transaction(async session => {
        const shift = await getShift(req.params.id, session);
        if (req.body.action && !['lock', 'reopen'].includes(req.body.action)) fail('Thao tác đối soát không hợp lệ');
        if (req.body.action === 'reopen') {
            if (!shift.lockedAt) fail('Ca chưa chốt');
            const reason = textReason(req.body.reason);
            shift.lockedAt = undefined;
            shift.lockedBy = undefined;
            await Attendance.updateMany({ shiftId: shift._id }, { $set: { reviewStatus: 'pending' }, $unset: { reviewedBy: 1, reviewedAt: 1 } }, { session });
            audit(shift, req, 'reopen', reason);
            await shift.save({ session });
            await notify(shift.assignedStaff.map(s => s.userId), shift, 'Công được mở lại để đối soát: ' + reason, session);
        } else await lockShift(shift, req, session);
        return viewShift(shift, true);
    });
}
export async function closePeriod(req) {
    managerOnly(req);
    return transaction(async session => {
        textReason(req.body.reason);
        const shifts = await Shift.find({ date: dateRange(req.body.startDate, req.body.endDate, 31), status: { $ne: 'cancelled' } }).session(session);
        if (!shifts.length) fail('Không có ca trong kỳ');
        for (const shift of shifts) await lockShift(shift, req, session);
        return { count: shifts.length };
    });
}
export async function roster(req) {
    managerOnly(req);
    const start = req.query.startDate || todayKey();
    const end = req.query.endDate || start;
    const shifts = await Shift.find({ date: dateRange(start, end, 31), status: { $ne: 'draft' } })
        .populate('assignedStaff.userId', 'name role employeeId employeeStatus status').populate('history.actor', 'name employeeId').sort({ date: 1, startTime: 1 });
    const records = await Attendance.find({ shiftId: { $in: shifts.map(s => s._id) } }).populate('userId', 'name role employeeId').populate('history.actor', 'name employeeId').lean();
    return shifts.map(shift => ({
        shift: viewShift(shift, true),
        rows: shift.assignedStaff.map(staff => ({
            staff, attendance: records.find(a => id(a.shiftId) === id(shift._id) && id(a.userId) === id(staff.userId)) || null,
        })),
    }));
}
export async function employeeAttendance(req) {
    const userId = objectId(req.params.employeeId);
    ownOrManager(req, userId);
    const query = { userId };
    if (req.query.startDate || req.query.endDate) {
        const start = req.query.startDate || req.query.endDate;
        const shifts = await Shift.find({ date: dateRange(start, req.query.endDate || start) }).select('_id');
        query.shiftId = { $in: shifts.map(s => s._id) };
    }
    const attendances = await Attendance.find(query).populate('shiftId', 'date shiftType startTime endTime status lockedAt').sort({ createdAt: -1 }).lean();
    if (!isManager(req)) attendances.forEach(a => { delete a.history; });
    return {
        attendances,
        totalHours: Math.round(attendances.reduce((sum, a) => sum + a.workingHours, 0) * 100) / 100,
        approvedHours: Math.round(attendances.filter(a => a.reviewStatus === 'approved').reduce((sum, a) => sum + a.workingHours, 0) * 100) / 100,
    };
}
export async function approvedHours(userId, startDate, endDate) {
    const query = { reviewStatus: 'approved' };
    if (userId) query.userId = userId;
    if (startDate || endDate) {
        const start = startDate || endDate;
        const shifts = await Shift.find({ date: dateRange(start, endDate || start) }).select('_id');
        query.shiftId = { $in: shifts.map(s => s._id) };
    }
    const records = await Attendance.find(query).select('userId workingHours').lean();
    const totals = {};
    records.forEach(a => { totals[id(a.userId)] = (totals[id(a.userId)] || 0) + a.workingHours; });
    Object.keys(totals).forEach(key => { totals[key] = Math.round(totals[key] * 100) / 100; });
    return totals;
}
