import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Axios from '../utils/Axios';
import { Button } from '../components/shifts/WorkflowButton';
import { Feedback, ShiftInbox } from '../components/shifts/WorkflowShared';
import { useWorkflowData } from '../hooks/useWorkflowData';
import { today, formatTime, shiftLabels } from '../utils/shiftTime';
export default function EmployeeDashboard() {
    const user = useSelector(state => state.user);
    const staff = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'].includes(user?.role);
    const loader = useCallback(async () => {
        const day = today();
        const [current, shifts, stats] = await Promise.all([
            Axios.get('/api/attendance/current'),
            Axios.get('/api/shift/employee/' + user._id, { params: { startDate: day, endDate: day } }),
            Axios.get('/api/performance/employee/' + user._id),
        ]);
        return { current: current.data.data, shifts: shifts.data.data.filter(s => !['draft', 'cancelled'].includes(s.status)), stats: stats.data.data.summary };
    }, [user?._id]);
    const { data, loading, error, reload } = useWorkflowData(loader, staff && !!user?._id);
    if (!staff) return <p className="p-6">Chức năng dành cho nhân viên.</p>;
    return <section className="mx-auto grid max-w-6xl gap-4 p-3">
        <header className="rounded-lg border bg-card p-5"><h1 className="text-xl font-bold">Dashboard nhân viên</h1><p className="text-sm text-muted-foreground">Ca làm và công đã duyệt · Giờ Việt Nam</p></header>
        <ShiftInbox /><Feedback loading={loading} error={error} reload={reload} />
        <div className="grid gap-4 md:grid-cols-3">
            <article className="space-y-3 rounded-lg border bg-card p-4"><h2 className="font-semibold">Chấm công</h2>
                <p>{data?.current ? 'Đang làm việc / chưa ghi nhận giờ ra' : 'Không có phiên làm việc đang mở'}</p>
                {data?.current && <p>Giờ vào: {formatTime(data.current.checkInTime)}<br />Ca: {data.current.shiftId?.startTime}–{data.current.shiftId?.endTime}</p>}
                <p className="text-sm text-muted-foreground">Liên hệ quản lý để check-in/check-out. Nếu thiếu hoặc sai giờ, gửi yêu cầu sửa công trong lịch cá nhân.</p>
                <Button asChild variant="outline"><Link to="/dashboard/my-shifts">Xem lịch và giờ công</Link></Button>
            </article>
            <article className="space-y-3 rounded-lg border bg-card p-4"><h2 className="font-semibold">Ca bắt đầu hôm nay</h2>
                {(data?.shifts || []).map(shift => <div key={shift._id} className="rounded border p-2"><strong>{shiftLabels[shift.shiftType]}</strong><p>{shift.startTime}–{shift.endTime}</p></div>)}
                {data?.shifts.length === 0 && <p>Không có ca bắt đầu hôm nay.</p>}
            </article>
            <article className="space-y-3 rounded-lg border bg-card p-4"><h2 className="font-semibold">Hiệu suất</h2>
                <p>Giờ làm đã duyệt: <strong>{data?.stats.totalWorkingHours || 0} giờ</strong></p>
                {user.role === 'WAITER' && <p>Đơn hàng xử lý: {data?.stats.totalOrdersHandled || 0}</p>}
                {user.role === 'CHEF' && <p>Món đã nấu: {data?.stats.totalDishesCooked || 0}</p>}
                <Button asChild variant="outline"><Link to="/dashboard/my-performance">Xem hiệu suất</Link></Button>
            </article>
        </div>
    </section>;
}
