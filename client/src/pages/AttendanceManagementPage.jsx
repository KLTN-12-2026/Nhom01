import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { Button } from '../components/shifts/WorkflowButton';
import { Field, Modal, ReasonDialog, RequestsPanel, Feedback } from '../components/shifts/WorkflowShared';
import { useWorkflowData } from '../hooks/useWorkflowData';
import { today, formatDate, formatTime, localInput, instant, shiftLabels, roleLabels, statusLabels, fieldClass, canCheckIn } from '../utils/shiftTime';

function AttendanceEditor({ shift, row, checkout, onClose, onSaved }) {
    const record = row.attendance;
    const [entered, setEntered] = useState(localInput(record?.checkInTime || shift.startAt));
    const [left, setLeft] = useState(localInput(record?.checkOutTime || new Date(Math.min(Date.now(), +new Date(shift.endAt)))));
    const [breaks, setBreaks] = useState(record?.breakMinutes || shift.breakMinutes || 0);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    return <Modal title={checkout ? 'Ghi nhận ra ca' : 'Điều chỉnh / bổ sung giờ công'} onClose={busy ? () => {} : onClose}>
        <form className="space-y-4" onSubmit={async e => {
            e.preventDefault(); if (busy) return; setBusy(true);
            try {
                const payload = { userId: row.staff.userId?._id, shiftId: shift._id, breakMinutes: Number(breaks), reason };
                if (checkout) await Axios.post('/api/attendance/check-out', payload);
                else await Axios.post('/api/attendance/correct', { ...payload, checkInTime: instant(entered), checkOutTime: instant(left) });
                toast.success('Đã ghi nhận giờ công'); await onSaved(); onClose();
            } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
        }}>
            <p>{row.staff.userId?.name} · {formatDate(shift.date)} · {shift.startTime}–{shift.endTime}</p>
            {checkout ? <p>Giờ ra sẽ được ghi bằng thời điểm hiện tại. Nếu quên ra ca từ trước, hãy dùng “Sửa công”.</p> :
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Giờ vào thực tế"><input type="datetime-local" className={fieldClass} required value={entered} onChange={e => setEntered(e.target.value)} /></Field>
                    <Field label="Giờ ra thực tế"><input type="datetime-local" className={fieldClass} required value={left} onChange={e => setLeft(e.target.value)} /></Field>
                </div>}
            <Field label="Nghỉ thực tế (phút)"><input type="number" className={fieldClass} min="0" max="480" required value={breaks} onChange={e => setBreaks(e.target.value)} /></Field>
            <Field label="Lý do / ghi chú"><textarea className={fieldClass} minLength={3} maxLength={1000} required value={reason} onChange={e => setReason(e.target.value)} /></Field>
            <Button disabled={busy}>{busy ? 'Đang lưu…' : 'Ghi nhận'}</Button>
        </form>
    </Modal>;
}
function downloadReport(groups) {
    const rows = [['Ngày ca', 'Loại ca', 'Nhân viên', 'Vai trò', 'Giờ vào', 'Giờ ra', 'Giờ dự kiến', 'Giờ thực tế', 'Muộn (phút)', 'Về sớm (phút)', 'Trạng thái', 'Duyệt']];
    groups.filter(g => g.shift.status !== 'cancelled').forEach(({ shift, rows: staff }) => staff.forEach(({ staff: person, attendance: a }) =>
        rows.push([formatDate(shift.date), shiftLabels[shift.shiftType], person.userId?.name, roleLabels[person.role],
            formatTime(a?.checkInTime), formatTime(a?.checkOutTime), shift.plannedHours, a?.workingHours || 0,
            a?.lateMinutes || 0, a?.earlyLeaveMinutes || 0, a?.status || 'Chưa chấm công', a?.reviewStatus === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'])));
    const csv = rows.map(row => row.map(value => {
        let text = String(value ?? '');
        if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replaceAll('"', '""') + '"';
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'doi-soat-ca-lam.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function AttendanceManagementPage() {
    const user = useSelector(state => state.user);
    const manager = user?.role === 'MANAGER';
    const [range, setRange] = useState({ startDate: today(), endDate: today() });
    const [modal, setModal] = useState(null);
    const [busy, setBusy] = useState(false);
    const loader = useCallback(async () => (await Axios.get('/api/attendance/roster', { params: range })).data.data, [range]);
    const { data, loading, error, reload } = useWorkflowData(loader, manager);
    const groups = data || [];
    const actual = groups.flatMap(g => g.rows).reduce((sum, row) => sum + (row.attendance?.workingHours || 0), 0);
    const planned = groups.filter(g => g.shift.status !== 'cancelled').reduce((sum, g) => sum + g.shift.plannedHours * g.rows.length, 0);
    const approved = groups.flatMap(g => g.rows).filter(r => r.attendance?.reviewStatus === 'approved').reduce((sum, r) => sum + r.attendance.workingHours, 0);
    async function checkIn(shift, row) {
        if (busy) return; setBusy(true);
        try {
            await Axios.post('/api/attendance/check-in', { userId: row.staff.userId?._id, shiftId: shift._id });
            toast.success('Đã ghi nhận vào ca'); await reload(true);
        } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
    }
    if (!manager) return <p className="p-6">Bạn không có quyền quản lý chấm công.</p>;
    return <section className="mx-auto grid max-w-7xl gap-4 p-3">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-5">
            <div><h1 className="text-xl font-bold">Chấm công và đối soát</h1><p className="text-sm text-muted-foreground">Dữ liệu theo ngày bắt đầu ca, kể cả ca qua đêm · Giờ Việt Nam</p></div>
            <Button variant="outline" asChild><Link to="/dashboard/shift-management">Quản lý lịch ca</Link></Button>
        </header>
        <div className="flex flex-wrap items-end gap-3 rounded border bg-card p-4">
            <Field label="Từ ngày"><input className={fieldClass} type="date" required value={range.startDate} onChange={e => setRange({ ...range, startDate: e.target.value })} /></Field>
            <Field label="Đến ngày (tối đa 31 ngày)"><input className={fieldClass} type="date" required value={range.endDate} onChange={e => setRange({ ...range, endDate: e.target.value })} /></Field>
            <Button variant="outline" disabled={!groups.length || !!error} onClick={() => downloadReport(groups)}>Xuất CSV</Button>
            <Button disabled={!groups.length || !!error} onClick={() => setModal({ type: 'period', range: { ...range } })}>Duyệt và chốt kỳ</Button>
        </div>
        <Feedback loading={loading} error={error} reload={reload} />
        <div className="grid gap-3 sm:grid-cols-3">{[['Dự kiến', planned], ['Thực tế', actual], ['Đã duyệt', approved]].map(([label, hours]) =>
            <div key={label} className="rounded border bg-card p-4"><p className="text-sm">{label}</p><strong className="text-xl">{hours.toFixed(2)} giờ</strong></div>)}</div>
        {!loading && !groups.length && !error && <p className="p-6 text-center">Không có ca đã công bố trong khoảng ngày.</p>}
        {groups.map(({ shift, rows }) => <article key={shift._id} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap justify-between gap-3">
                <div><h2 className="font-semibold">{formatDate(shift.date)} · {shiftLabels[shift.shiftType]} · {shift.startTime}–{shift.endTime}{shift.endTime < shift.startTime ? ' (+1 ngày)' : ''}</h2>
                    <p className="text-sm">{statusLabels[shift.status]}{shift.lockedAt ? ' · Đã chốt công' : ' · Chưa chốt'}</p></div>
                <div className="flex flex-wrap gap-2">
                    {['scheduled', 'ongoing'].includes(shift.status) && new Date(shift.endAt) <= new Date() &&
                        <Button size="sm" onClick={() => setModal({ type: 'finish', shift })}>Kết thúc ca / ghi nhận vắng</Button>}
                    {shift.status === 'completed' && <Button size="sm" variant={shift.lockedAt ? 'outline' : 'default'} onClick={() => setModal({ type: shift.lockedAt ? 'reopen' : 'lock', shift })}>
                        {shift.lockedAt ? 'Mở chốt để sửa' : 'Duyệt và chốt ca'}</Button>}
                </div>
            </div>
            {shift.status !== 'cancelled' && <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
                <thead><tr className="border-b"><th className="p-2">Nhân viên</th><th>Vào / ra</th><th>Giờ công</th><th>Bất thường</th><th>Đối soát</th><th>Thao tác</th></tr></thead>
                <tbody>{rows.map(row => {
                    const a = row.attendance;
                    const editable = !shift.lockedAt && new Date(shift.startAt) <= new Date() && !!row.staff.userId;
                    return <tr key={row.staff._id} className="border-b align-top">
                        <td className="p-2"><strong>{row.staff.userId?.name || 'Nhân viên đã bị xóa'}</strong><p>{roleLabels[row.staff.role]}</p></td>
                        <td className="py-2">{formatTime(a?.checkInTime)}<br />{formatTime(a?.checkOutTime)}</td>
                        <td className="py-2">{(a?.workingHours || 0).toFixed(2)} giờ<br /><span className="text-xs">Nghỉ {a?.breakMinutes || 0} phút</span></td>
                        <td className="py-2">
                            {a?.status === 'absent' && <p>Vắng mặt</p>}
                            {!a && <p>Chưa chấm công</p>}
                            {!!a?.lateMinutes && <p>Muộn {a.lateMinutes} phút</p>}
                            {!!a?.earlyLeaveMinutes && <p>Về sớm {a.earlyLeaveMinutes} phút</p>}
                            {!!a?.overtimeMinutes && <p>Sau giờ ca {a.overtimeMinutes} phút</p>}
                            {a?.checkInTime && !a?.checkOutTime && <p>{new Date(shift.endAt) < new Date() ? 'Thiếu giờ ra' : 'Đang làm'}</p>}
                        </td>
                        <td className="py-2">{a?.reviewStatus === 'approved' ? 'Đã duyệt' : 'Chờ đối soát'}</td>
                        <td className="py-2"><div className="flex flex-wrap gap-2">
                            {!a && canCheckIn(shift) && row.staff.userId && <Button size="sm" disabled={busy} onClick={() => checkIn(shift, row)}>Vào ca</Button>}
                            {a?.checkInTime && !a.checkOutTime && !shift.lockedAt && <Button size="sm" onClick={() => setModal({ type: 'checkout', shift, row })}>Ra ca</Button>}
                            {editable && <Button size="sm" variant="outline" onClick={() => setModal({ type: 'correct', shift, row })}>Sửa công</Button>}
                            {!!a?.history?.length && <Button size="sm" variant="outline" onClick={() => setModal({ type: 'history', row })}>Lịch sử</Button>}
                        </div></td>
                    </tr>;
                })}</tbody>
            </table></div>}
        </article>)}
        <RequestsPanel manager userId={user._id} onChange={() => reload(true)} />
        {['checkout', 'correct'].includes(modal?.type) && <AttendanceEditor shift={modal.shift} row={modal.row} checkout={modal.type === 'checkout'} onClose={() => setModal(null)} onSaved={() => reload(true)} />}
        {['finish', 'lock', 'reopen', 'period'].includes(modal?.type) && <ReasonDialog
            title={{ finish: 'Kết thúc ca', lock: 'Duyệt và chốt công', reopen: 'Mở chốt công', period: 'Duyệt và chốt kỳ' }[modal.type]}
            onClose={() => setModal(null)} onSubmit={async reason => {
                if (modal.type === 'period') await Axios.post('/api/attendance/close-period', { ...modal.range, reason });
                else if (modal.type === 'finish') await Axios.post('/api/shift/' + modal.shift._id + '/finish', { reason });
                else await Axios.post('/api/shift/' + modal.shift._id + '/review', { action: modal.type, reason });
                toast.success('Đã cập nhật trạng thái công'); await reload(true);
            }}>
            <p className="text-sm">{modal.type === 'finish' ? 'Nhân viên chưa có công sẽ được ghi nhận vắng. Phải xử lý các phiên thiếu giờ ra trước khi kết thúc.' :
                modal.type === 'reopen' ? 'Công sẽ trở lại trạng thái chờ duyệt; thay đổi sẽ được lưu lịch sử.' :
                    'Xác nhận đã đối soát giờ thực tế, giờ nghỉ và các bất thường. Sau khi chốt, công được khóa và đưa vào thống kê hiệu suất.'}</p>
        </ReasonDialog>}
        {modal?.type === 'history' && <Modal title="Lịch sử điều chỉnh công" onClose={() => setModal(null)}>
            <ul className="space-y-3">{[...modal.row.attendance.history].reverse().map((item, index) => <li key={item._id || index} className="rounded border p-3 text-sm">
                <p>{formatTime(item.at)} · {item.actor?.name || 'Người thực hiện trước đây'} · {item.reason}</p>
                {item.before && <p>Trước: {formatTime(item.before.checkInTime)} → {formatTime(item.before.checkOutTime)} · {item.before.workingHours || 0} giờ</p>}
                {item.after && <p>Sau: {formatTime(item.after.checkInTime)} → {formatTime(item.after.checkOutTime)} · {item.after.workingHours || 0} giờ</p>}
            </li>)}</ul>
        </Modal>}
    </section>;
}
