import Attendance from '../models/attendance.model.js';
import Shift from '../models/shift.model.js';
import { api, checkInPerson, checkOutPerson, roster, employeeAttendance, transaction, getShift, correctRecord, closePeriod, objectId } from '../services/shiftWorkflow.js';
import { managerOnly } from '../middleware/shiftAccess.js';
import { dateRange, textReason } from '../utils/shiftTime.js';
export const checkIn = api(checkInPerson);
export const checkOut = api(checkOutPerson);
export const getRoster = api(roster);
export const getAttendanceByEmployee = api(employeeAttendance);
export const getCurrentAttendance = api(req => Attendance.findOne({
    userId: req.userId, checkInTime: { $ne: null }, checkOutTime: null, status: { $ne: 'absent' },
}).populate('shiftId', 'date shiftType startTime endTime status').sort({ checkInTime: -1 }));
export const getAttendanceByDate = api(async req => {
    managerOnly(req);
    const shifts = await Shift.find({ date: dateRange(req.params.date) }).select('_id');
    return Attendance.find({ shiftId: { $in: shifts.map(s => s._id) } })
        .populate('userId', 'name role employeeId').populate('shiftId').sort({ checkInTime: 1 });
});
export const correctAttendance = api(req => {
    managerOnly(req);
    return transaction(async session => {
        const shift = await getShift(req.body.shiftId, session);
        return correctRecord(shift, objectId(req.body.userId), req.body, req, session, textReason(req.body.reason));
    });
});
export const closeAttendancePeriod = api(closePeriod);
