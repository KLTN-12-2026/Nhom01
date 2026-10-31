export const roles = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'];
export const roleLabels = { MANAGER: 'Quản lý', WAITER: 'Phục vụ', CHEF: 'Đầu bếp', CASHIER: 'Thu ngân' };
export const shiftLabels = { morning: 'Ca sáng', afternoon: 'Ca chiều', evening: 'Ca tối' };
export const actionLabels = { create: 'Tạo lịch', update: 'Sửa lịch', assign: 'Phân công', unassign: 'Gỡ phân công', publish: 'Công bố', cancel: 'Hủy ca', confirm: 'Xác nhận lịch', copy: 'Sao chép', leave: 'Duyệt nghỉ', swap: 'Duyệt thay ca', 'check-in': 'Vào ca', 'check-out': 'Ra ca', 'correct-attendance': 'Sửa công', finish: 'Kết thúc ca', lock: 'Chốt công', reopen: 'Mở chốt' };
export const statusLabels = { draft: 'Nháp', scheduled: 'Đã công bố', ongoing: 'Đang làm', completed: 'Đã kết thúc', cancelled: 'Đã hủy' };
export const requestLabels = { leave: 'Xin nghỉ', swap: 'Nhờ thay ca', correction: 'Sửa công', register: 'Đăng ký ca' };
export const requestStatuses = { pending: 'Chờ xử lý', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' };
export function today() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); }
export function addDays(day, count) { return new Date(Date.parse(day + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10); }
export function monthRange(month) {
    const [year, number] = month.split('-').map(Number);
    return { startDate: month + '-01', endDate: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) };
}
export function formatDate(value) { return value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—'; }
export function formatTime(value) {
    return value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
}
export function localInput(value) { return value ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16) : ''; }
export function instant(value) { return value ? new Date(value + ':00+07:00').toISOString() : null; }
export function canEdit(shift) { return ['draft', 'scheduled'].includes(shift.status) && new Date(shift.startAt) > new Date() && !shift.lockedAt; }
export function canCheckIn(shift) {
    return ['scheduled', 'ongoing'].includes(shift.status) && !shift.lockedAt &&
        Date.now() >= new Date(shift.startAt).getTime() - 30 * 60000 && Date.now() < new Date(shift.endAt).getTime();
}
export const fieldClass = 'w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm';
