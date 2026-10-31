import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { Button } from '../components/shifts/WorkflowButton';
import { Field, Modal, Feedback, RequestsPanel, ShiftInbox } from '../components/shifts/WorkflowShared';
import ShiftRegisterModal from '../components/shifts/ShiftRegisterModal';
import { useWorkflowData } from '../hooks/useWorkflowData';
import { today, monthRange, formatDate, formatTime, shiftLabels, statusLabels, requestLabels, canEdit, localInput, instant, fieldClass } from '../utils/shiftTime';

function RequestEditor({ shift, attendance, onClose, onSaved }) {
    const future = canEdit(shift);
    const [type, setType] = useState(future ? 'leave' : 'correction');
    const [reason, setReason] = useState('');
    const [target, setTarget] = useState('');
    const [entered, setEntered] = useState(localInput(attendance?.checkInTime || shift.startAt));
    const [left, setLeft] = useState(localInput(attendance?.checkOutTime || new Date(Math.min(Date.now(), +new Date(shift.endAt)))));
    const [breaks, setBreaks] = useState(attendance?.breakMinutes ?? shift.breakMinutes ?? 0);
    const [busy, setBusy] = useState(false);
    const loader = useCallback(async () => (await Axios.get('/api/shift/' + shift._id + '/replacements')).data.data, [shift._id]);
    const { data, loading, error, reload } = useWorkflowData(loader, type === 'swap');
    return <Modal title="Gửi yêu cầu điều chỉnh" onClose={busy ? () => {} : onClose}>
        <form className="space-y-4" onSubmit={async event => {
            event.preventDefault(); if (busy) return; setBusy(true);
            try {
                await Axios.post('/api/shift/' + shift._id + '/requests', {
                    type, reason, targetUserId: type === 'swap' ? target : undefined,
                    ...(type === 'correction' ? { checkInTime: instant(entered), checkOutTime: instant(left), breakMinutes: Number(breaks) } : {}),
                });
                toast.success('Đã gửi yêu cầu cho quản lý'); await onSaved(); onClose();
            } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
        }}>
            <p>{formatDate(shift.date)} · {shift.startTime}–{shift.endTime}</p>
            <Field label="Loại yêu cầu"><select className={fieldClass} value={type} onChange={e => setType(e.target.value)}>
                {(future ? ['leave', 'swap'] : ['correction']).map(key => <option key={key} value={key}>{requestLabels[key]}</option>)}
            </select></Field>
            {type === 'swap' && <>
                <Feedback loading={loading} error={error} reload={reload} />
                <Field label="Người nhận ca thay"><select className={fieldClass} required value={target} onChange={e => setTarget(e.target.value)}>
                    <option value="">Chọn nhân viên cùng vị trí</option>{(data || []).map(person => <option key={person._id} value={person._id}>{person.name} · {person.employeeId}</option>)}
                </select></Field>
                <p className="text-sm text-muted-foreground">Người thay phải đồng ý trước khi quản lý duyệt. Lịch gốc giữ nguyên trong thời gian chờ.</p>
            </>}
            {type === 'correction' && <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Giờ vào thực tế"><input className={fieldClass} type="datetime-local" required value={entered} onChange={e => setEntered(e.target.value)} /></Field>
                <Field label="Giờ ra thực tế"><input className={fieldClass} type="datetime-local" required value={left} onChange={e => setLeft(e.target.value)} /></Field>
                <Field label="Nghỉ thực tế (phút)"><input className={fieldClass} type="number" min="0" max="480" required value={breaks} onChange={e => setBreaks(e.target.value)} /></Field>
            </div>}
            <Field label="Lý do"><textarea className={fieldClass} minLength={3} maxLength={1000} required value={reason} onChange={e => setReason(e.target.value)} /></Field>
            <Button disabled={busy || (type === 'swap' && !target)}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</Button>
        </form>
    </Modal>;
}
export default function MyShiftsPage() {
    const user = useSelector(state => state.user);
    const staff = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'].includes(user?.role);
    const [month, setMonth] = useState(today().slice(0, 7));
    const [selected, setSelected] = useState(null);
    const [request, setRequest] = useState(null);
    const [openRegisterModal, setOpenRegisterModal] = useState(false);
    const [busy, setBusy] = useState(false);
    const [requestVersion, setRequestVersion] = useState(0);
    const loader = useCallback(async () => {
        const params = monthRange(month);
        const [shifts, records] = await Promise.all([
            Axios.get('/api/shift/employee/' + user._id, { params }),
            Axios.get('/api/attendance/employee/' + user._id, { params }),
        ]);
        return { shifts: shifts.data.data, records: records.data.data };
    }, [month, user?._id]);
    const { data, loading, error, reload } = useWorkflowData(loader, staff && !!month && !!user?._id);
    const range = monthRange(month || today().slice(0, 7));
    const firstWeekday = new Date(range.startDate + 'T00:00:00Z').getUTCDay();
    const days = Number(range.endDate.slice(-2));
    const selectedShift = data?.shifts.find(s => s._id === selected);
    const recordFor = shift => data?.records.attendances.find(a => a.shiftId?._id === shift._id);
    async function confirm(shift) {
        if (busy) return; setBusy(true);
        try { await Axios.post('/api/shift/' + shift._id + '/confirm'); toast.success('Đã xác nhận lịch'); await reload(true); }
        catch (error) { AxiosToastError(error); } finally { setBusy(false); }
    }
    if (!staff) return <p className="p-6">Chức năng dành cho nhân viên.</p>;
    return <section className="mx-auto grid max-w-6xl gap-4 p-3">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground">Ca làm của tôi</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Xem lịch làm việc, đăng ký nhận ca mở, xác nhận ca và theo dõi bảng chấm công
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 bg-muted/50 px-3.5 py-1.5 rounded-xl border border-border">
                    <span className="text-xs font-bold text-muted-foreground">Tháng:</span>
                    <input
                        type="month"
                        className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        value={month}
                        required
                        onChange={e => { if (e.target.value) setMonth(e.target.value); }}
                    />
                </div>
                <Button
                    onClick={() => setOpenRegisterModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm shadow-orange-600/20"
                >
                    + Đăng ký ca làm
                </Button>
            </div>
        </header>
        <ShiftInbox />
        <Feedback loading={loading} error={error} reload={reload} />
        <div className="grid gap-2 sm:hidden" aria-label="Danh sách ca trong tháng">
            {(data?.shifts || []).map(shift => <button key={shift._id} onClick={() => setSelected(shift._id)}
                className="space-y-1 rounded-xl border border-border bg-card p-4 text-left shadow-sm hover:border-orange-500/50 transition-colors">
                <strong className={shift.status === 'cancelled' ? 'line-through text-muted-foreground' : 'text-foreground'}>{formatDate(shift.date)} · {shiftLabels[shift.shiftType]}</strong>
                <p className="text-sm font-semibold text-orange-600">{shift.startTime}–{shift.endTime}{shift.endTime < shift.startTime ? ' (+1 ngày)' : ''}</p>
                <p className="text-xs text-muted-foreground">{statusLabels[shift.status]}{shift.lockedAt ? ' · Đã chốt công' : ''}</p>
            </button>)}
            {data?.shifts.length === 0 && <p className="rounded-xl border border-border bg-card p-6 text-sm text-center text-muted-foreground">Không có ca trong tháng này.</p>}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm sm:block">
            <div className="grid min-w-[650px] grid-cols-7">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => <div key={day} className="border-b border-border p-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/20">{day}</div>)}
                {Array.from({ length: firstWeekday }, (_, i) => <div key={'empty-' + i} className="min-h-24 border-b border-r border-border/60 bg-muted/20" />)}
                {Array.from({ length: days }, (_, i) => {
                    const day = month + '-' + String(i + 1).padStart(2, '0');
                    const shifts = (data?.shifts || []).filter(s => s.date.slice(0, 10) === day);
                    return <div key={day} className={'min-h-28 space-y-1.5 border-b border-r border-border/60 p-2.5 transition-colors ' + (day === today() ? 'bg-orange-500/5 ring-1 ring-inset ring-orange-500/40' : '')}>
                        <div className="flex items-center justify-between">
                            <span className={'text-xs font-bold ' + (day === today() ? 'text-orange-600 px-1.5 py-0.5 rounded-full bg-orange-500/15' : 'text-foreground')}>{i + 1}</span>
                            {day === today() && <span className="text-[10px] font-bold text-orange-600">Hôm nay</span>}
                        </div>
                        {shifts.map(shift => <button key={shift._id} onClick={() => setSelected(shift._id)}
                            className={'block w-full rounded-lg border p-1.5 text-left text-xs transition-transform hover:scale-[1.02] ' + (shift.status === 'cancelled' ? 'opacity-50 line-through border-border' : 'border-orange-500/40 bg-orange-500/10 text-foreground')}>
                            <strong className="text-orange-700 dark:text-orange-300 font-bold">{shiftLabels[shift.shiftType]}</strong><br />
                            <span className="text-[11px] font-semibold">{shift.startTime}–{shift.endTime}</span><br />
                            <span className="text-[10px] text-muted-foreground">{statusLabels[shift.status]}</span>
                        </button>)}
                    </div>;
                })}
            </div>
        </div>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <h2 className="font-bold text-base text-foreground">Bảng Tổng Hợp Giờ Công Trong Tháng</h2>
                <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                    Đã ghi nhận: <strong className="text-foreground">{data?.records.totalHours || 0}h</strong> · Đã duyệt: <strong className="text-green-600">{data?.records.approvedHours || 0}h</strong>
                </span>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm">
                <thead><tr className="border-b border-border text-muted-foreground font-semibold"><th className="p-2.5">Ngày ca</th><th>Giờ vào</th><th>Giờ ra</th><th>Giờ công</th><th>Tình trạng</th></tr></thead>
                <tbody className="divide-y divide-border/60">{(data?.records.attendances || []).map(a => <tr key={a._id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 font-bold text-foreground">{formatDate(a.shiftId?.date)}</td><td>{formatTime(a.checkInTime)}</td><td>{formatTime(a.checkOutTime)}</td><td className="font-bold text-orange-600">{a.workingHours || 0}h</td>
                    <td><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${a.reviewStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>{a.status === 'absent' ? 'Vắng mặt' : !a.checkOutTime ? 'Đang làm' : 'Đã ra ca'} · {a.reviewStatus === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}</span></td>
                </tr>)}</tbody>
            </table></div>
            {!data?.records.attendances?.length && <p className="text-xs text-muted-foreground py-4 text-center">Chưa có công trong tháng này.</p>}
        </section>
        <RequestsPanel key={requestVersion} userId={user._id} onChange={() => reload(true)} />
        {selectedShift && <Modal title="Chi tiết ca làm" onClose={() => setSelected(null)}>
            <p className="font-medium">{shiftLabels[selectedShift.shiftType]} · {formatDate(selectedShift.date)}</p>
            <p>{formatTime(selectedShift.startAt)} → {formatTime(selectedShift.endAt)}</p>
            <p>{statusLabels[selectedShift.status]}{selectedShift.lockedAt ? ' · Đã chốt công' : ''}</p>
            {selectedShift.notes && <p>{selectedShift.notes}</p>}
            {selectedShift.cancellationReason && <p>Lý do hủy: {selectedShift.cancellationReason}</p>}
            {recordFor(selectedShift) && <p>Giờ công: {recordFor(selectedShift).workingHours || 0} · Muộn: {recordFor(selectedShift).lateMinutes || 0} phút · Về sớm: {recordFor(selectedShift).earlyLeaveMinutes || 0} phút</p>}
            <div className="flex flex-wrap gap-2">
                {canEdit(selectedShift) && selectedShift.status === 'scheduled' && !selectedShift.assignedStaff.find(s => s.userId?._id === user._id)?.confirmed &&
                    <Button disabled={busy} onClick={() => confirm(selectedShift)}>Xác nhận lịch</Button>}
                {selectedShift.status !== 'cancelled' && !selectedShift.lockedAt && <Button variant="outline" onClick={() => {
                    setRequest({ shift: selectedShift, attendance: recordFor(selectedShift) }); setSelected(null);
                }}>{canEdit(selectedShift) ? 'Xin nghỉ / nhờ thay ca' : 'Yêu cầu sửa công'}</Button>}
            </div>
            <p className="text-sm text-muted-foreground">Quản lý thực hiện check-in/check-out. Công đã chốt cần quản lý mở lại trước khi sửa.</p>
        </Modal>}
        {request && <RequestEditor shift={request.shift} attendance={request.attendance} onClose={() => setRequest(null)} onSaved={async () => {
            setRequestVersion(v => v + 1); await reload(true);
        }} />}
        <ShiftRegisterModal
            open={openRegisterModal}
            onClose={() => setOpenRegisterModal(false)}
            onRegistered={async () => {
                setRequestVersion(v => v + 1);
                await reload(true);
            }}
        />
    </section>;
}
