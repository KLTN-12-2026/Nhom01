import { fail } from '../utils/shiftTime.js';
export const isManager = req => req.user?.role === 'MANAGER';
export const staffOnly = (req, res, next) => {
    if (!['MANAGER', 'WAITER', 'CHEF', 'CASHIER'].includes(req.user?.role) ||
        req.user?.employeeStatus === 'inactive' || req.user?.status !== 'Active') {
        return res.status(403).json({ success: false, error: true, message: 'Chức năng chỉ dành cho nhân viên đang làm việc' });
    }
    next();
};
export function managerOnly(req) {
    if (!isManager(req)) fail('Chỉ quản lý được thực hiện thao tác này', 403);
}
export function ownOrManager(req, userId) {
    if (!isManager(req) && String(req.userId) !== String(userId)) fail('Bạn chỉ được xem hoặc cập nhật dữ liệu của mình', 403);
}
