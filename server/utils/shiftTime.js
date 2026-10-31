// Restaurant calendar dates use UTC+07:00; stored shift.date stays UTC midnight.
export const ROLES = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'];
export const HOUR = 3600000;
export const DAY = 24 * HOUR;
export function fail(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
export function dateKey(value) {
    const key = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isFinite(Date.parse(key)) ||
        new Date(key).toISOString().slice(0, 10) !== key) fail('Ngày không hợp lệ');
    return key;
}
export function todayKey(now = new Date()) {
    return new Date(now.getTime() + 7 * HOUR).toISOString().slice(0, 10);
}
export function addDays(value, count) {
    return new Date(new Date(dateKey(value)).getTime() + count * DAY).toISOString().slice(0, 10);
}
export function dateRange(startDate, endDate = startDate, maxDays = 93) {
    const start = new Date(dateKey(startDate));
    const end = new Date(dateKey(endDate));
    if (end < start || end - start >= maxDays * DAY) fail('Khoảng ngày phải tăng dần và không quá ' + maxDays + ' ngày');
    return { $gte: start, $lt: new Date(end.getTime() + DAY) };
}
export function shiftWindow(shift) {
    if (![shift.startTime, shift.endTime].every(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) fail('Giờ ca phải có định dạng HH:mm');
    const day = dateKey(shift.date);
    const start = new Date(day + 'T' + shift.startTime + ':00+07:00');
    let end = new Date(day + 'T' + shift.endTime + ':00+07:00');
    if (end <= start) end = new Date(end.getTime() + DAY);
    const hours = (end - start) / HOUR;
    if (hours > 16) fail('Ca làm phải dài hơn 0 và không quá 16 giờ');
    return { start, end, hours };
}
export function overlaps(a, b) { return a.start < b.end && b.start < a.end; }
export function integer(value, name, min = 0, max = 200) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) fail(name + ' phải là số nguyên từ ' + min + ' đến ' + max);
    return number;
}
export function textReason(value) {
    const reason = String(value || '').trim();
    if (reason.length < 3 || reason.length > 1000) fail('Vui lòng nhập lý do từ 3 đến 1000 ký tự');
    return reason;
}
export function validateShift(shift) {
    if (!['morning', 'afternoon', 'evening'].includes(shift.shiftType)) fail('Loại ca không hợp lệ');
    const window = shiftWindow(shift);
    integer(shift.maxStaff, 'Số nhân viên tối đa', 1);
    const breaks = integer(shift.breakMinutes ?? 0, 'Phút nghỉ', 0, 480);
    if (breaks >= window.hours * 60) fail('Giờ nghỉ phải ít hơn thời lượng ca');
    const staff = shift.assignedStaff || [];
    const ids = staff.map(s => String(s.userId?._id || s.userId));
    if (new Set(ids).size !== ids.length) fail('Nhân viên bị phân công trùng trong ca');
    if (staff.length > shift.maxStaff) fail('Số người vượt quá giới hạn ca');
    let total = 0;
    for (const role of ROLES) total += integer(shift.requirements?.[role] ?? 0, 'Định biên ' + role, 0);
    if (total > shift.maxStaff) fail('Tổng định biên vượt số nhân viên tối đa');
    for (const person of staff) if (!ROLES.includes(person.role)) fail('Vai trò trong ca không hợp lệ');
    return window;
}
export function shortages(shift) {
    return ROLES.flatMap(role => {
        const needed = Number(shift.requirements?.[role] || 0);
        const actual = (shift.assignedStaff || []).filter(s => s.role === role).length;
        return needed > actual ? [role + ': thiếu ' + (needed - actual) + ' người'] : [];
    });
}
export function attendanceMetrics(shift, checkIn, checkOut, breakMinutes = 0) {
    const { start, end } = shiftWindow(shift);
    const entered = checkIn ? new Date(checkIn) : null;
    const left = checkOut ? new Date(checkOut) : null;
    if (!entered || !Number.isFinite(+entered)) fail('Giờ vào không hợp lệ');
    if (entered < new Date(+start - 4 * HOUR) || entered >= new Date(+end + 4 * HOUR)) fail('Giờ vào nằm quá xa ca làm');
    if (left && (!Number.isFinite(+left) || left <= entered || left - entered > 24 * HOUR)) fail('Giờ ra phải sau giờ vào và tổng thời gian không quá 24 giờ');
    const breaks = integer(breakMinutes, 'Phút nghỉ', 0, 480);
    const elapsed = left ? (left - entered) / 60000 : 0;
    if (left && breaks > elapsed) fail('Giờ nghỉ vượt thời gian có mặt');
    const lateMinutes = Math.max(0, Math.ceil((entered - start) / 60000) - 15);
    const earlyLeaveMinutes = left ? Math.max(0, Math.ceil((end - left) / 60000)) : 0;
    return {
        lateMinutes, earlyLeaveMinutes, breakMinutes: breaks,
        workingHours: left ? Math.round((elapsed - breaks) / 60 * 100) / 100 : 0,
        overtimeMinutes: left ? Math.max(0, Math.floor((left - end) / 60000)) : 0,
        status: lateMinutes ? 'late' : earlyLeaveMinutes ? 'early_leave' : 'on_time',
    };
}
