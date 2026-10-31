import { api, createShifts, listShifts, updateSchedule, cancelSchedule, assignPerson, publishSchedule, confirmSchedule, copyWeek, finishSchedule, reviewSchedule, replacementCandidates, submitRequest, listRequests, respondRequest, objectId } from '../services/shiftWorkflow.js';
import { ShiftNotification } from '../models/shiftWorkflow.model.js';
export const createShift = api(createShifts);
export const getShiftsByDate = api(req => listShifts(req));
export const getShiftsByEmployee = api(req => listShifts(req, req.params.employeeId));
export const updateShift = api(updateSchedule);
// Existing delete URL is retained, but cancellation preserves attendance and history.
export const deleteShift = api(cancelSchedule);
export const assignStaffToShift = api(req => assignPerson(req));
export const unassignStaff = api(req => assignPerson(req, true));
export const publishShift = api(publishSchedule);
export const confirmShift = api(confirmSchedule);
export const copyShifts = api(copyWeek);
export const finishShift = api(finishSchedule);
export const reviewShift = api(reviewSchedule);
export const getCandidates = api(replacementCandidates);
export const createRequest = api(submitRequest);
export const getRequests = api(listRequests);
export const respondToRequest = api(respondRequest);
export const getNotifications = api(async req => {
    const [items, unread] = await Promise.all([
        ShiftNotification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50),
        ShiftNotification.countDocuments({ userId: req.userId, readAt: null }),
    ]);
    return { items, unread };
});
export const readNotification = api(async req => {
    const query = { userId: req.userId, readAt: null };
    if (req.params.id !== 'all') query._id = objectId(req.params.id);
    await ShiftNotification.updateMany(query, { $set: { readAt: new Date() } });
    return { read: true };
});
