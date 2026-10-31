import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { Button } from '../components/shifts/WorkflowButton';
import { Field, Modal, ReasonDialog, RequestsPanel, Feedback } from '../components/shifts/WorkflowShared';
import { useWorkflowData } from '../hooks/useWorkflowData';
import { today, addDays, formatDate, formatTime, roles, roleLabels, shiftLabels, statusLabels, actionLabels, canEdit, fieldClass } from '../utils/shiftTime';

function ShiftEditor({ shift, onClose, onSaved }) {
    const [form, setForm] = useState(shift ? { ...shift, date: shift.date.slice(0, 10) } : {
        date: addDays(today(), 1), shiftType: 'morning', startTime: '06:00', endTime: '14:00',
        maxStaff: 10, breakMinutes: 0, notes: '', requirements: {}, repeatCount: 1, repeatEveryDays: 7,
    });
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const change = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    async function save(event) {
        event.preventDefault(); if (busy) return; setBusy(true);
        try {
            const payload = {
                date: form.date, shiftType: form.shiftType, startTime: form.startTime, endTime: form.endTime,
                maxStaff: Number(form.maxStaff), breakMinutes: Number(form.breakMinutes || 0),
                notes: form.notes, requirements: form.requirements, reason, version: shift?.__v,
                repeatCount: Number(form.repeatCount || 1), repeatEveryDays: Number(form.repeatEveryDays || 7),
            };
            if (shift) await Axios.put('/api/shift/update/' + shift._id, payload);
            else await Axios.post('/api/shift/create', payload);
            toast.success(shift ? 'Đã cập nhật ca' : 'Đã tạo lịch nháp');
            await onSaved(form.date); onClose();
        } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
    }
    return <Modal title={shift ? 'Sửa ca làm việc' : 'Tạo lịch nháp'} onClose={busy ? () => {} : onClose}>
        <form className="space-y-4" onSubmit={save}>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Ngày bắt đầu ca"><input type="date" className={fieldClass} required value={form.date} onChange={e => change('date', e.target.value)} /></Field>
                <Field label="Loại ca"><select className={fieldClass} value={form.shiftType} onChange={e => {
                    const defaults = { morning: ['06:00', '14:00'], afternoon: ['14:00', '22:00'], evening: ['22:00', '06:00'] };
                    setForm(prev => ({ ...prev, shiftType: e.target.value, startTime: defaults[e.target.value][0], endTime: defaults[e.target.value][1] }));
                }}>{Object.entries(shiftLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
                <Field label="Giờ bắt đầu"><input type="time" className={fieldClass} required value={form.startTime} onChange={e => change('startTime', e.target.value)} /></Field>
                <Field label="Giờ kết thúc"><input type="time" className={fieldClass} required value={form.endTime} onChange={e => change('endTime', e.target.value)} /></Field>
                <Field label="Số người tối đa"><input type="number" min="1" max="200" className={fieldClass} required value={form.maxStaff} onChange={e => change('maxStaff', e.target.value)} /></Field>
                <Field label="Nghỉ mặc định (phút)"><input type="number" min="0" max="480" className={fieldClass} required value={form.breakMinutes || 0} onChange={e => change('breakMinutes', e.target.value)} /></Field>
            </div>
            <p className="text-xs text-muted-foreground">Giờ kết thúc nhỏ hơn giờ bắt đầu được tính sang ngày hôm sau. Ca tối đa 16 giờ.</p>
            <fieldset className="rounded border p-3"><legend className="px-1 text-sm">Nhân sự tối thiểu theo vị trí</legend>
                <div className="grid grid-cols-2 gap-3">{roles.map(role => <Field key={role} label={roleLabels[role]}>
                    <input type="number" min="0" max="200" className={fieldClass} value={form.requirements?.[role] || 0}
                        onChange={e => change('requirements', { ...form.requirements, [role]: Number(e.target.value) })} />
                </Field>)}</div>
            </fieldset>
            {!shift && <div className="grid grid-cols-2 gap-3">
                <Field label="Số lần tạo (bao gồm lần đầu)"><input className={fieldClass} type="number" min="1" max="12" required value={form.repeatCount} onChange={e => change('repeatCount', e.target.value)} /></Field>
                <Field label="Lặp lại"><select className={fieldClass} value={form.repeatEveryDays} onChange={e => change('repeatEveryDays', e.target.value)}><option value="7">Mỗi tuần</option><option value="1">Mỗi ngày</option></select></Field>
            </div>}
            <Field label="Ghi chú ca"><textarea className={fieldClass} maxLength={2000} value={form.notes || ''} onChange={e => change('notes', e.target.value)} /></Field>
            {shift && <Field label="Lý do sửa"><textarea className={fieldClass} minLength={3} maxLength={1000} required value={reason} onChange={e => setReason(e.target.value)} /></Field>}
            <Button disabled={busy}>{busy ? 'Đang lưu…' : shift ? 'Lưu thay đổi' : 'Tạo lịch nháp'}</Button>
        </form>
    </Modal>;
}
function AssignEditor({ shift, employees, onClose, onSaved }) {
    const [selected, setSelected] = useState('');
    const [busy, setBusy] = useState(false);
    const available = employees.filter(e => e.employeeStatus === 'active' && e.status === 'Active' && !shift.assignedStaff.some(s => s.userId?._id === e._id));
    return <Modal title="Phân công nhân viên" onClose={busy ? () => {} : onClose}>
        <form className="space-y-4" onSubmit={async e => {
            e.preventDefault(); if (busy) return; setBusy(true);
            try {
                const person = available.find(p => p._id === selected);
                if (!person) throw new Error('Vui lòng chọn nhân viên');
                await Axios.post('/api/shift/assign', { shiftId: shift._id, userId: selected, role: person.role });
                toast.success('Đã phân công'); await onSaved(); onClose();
            } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
        }}>
            <Field label="Nhân viên và vị trí"><select className={fieldClass} required value={selected} onChange={e => setSelected(e.target.value)}>
                <option value="">Chọn nhân viên</option>{available.map(e => <option key={e._id} value={e._id}>{e.name} · {roleLabels[e.role] || 'Quản lý'}</option>)}
            </select></Field>
            <p className="text-sm text-muted-foreground">Hệ thống kiểm tra trùng lịch khi lưu. Vai trò lấy từ hồ sơ nhân viên.</p>
            <Button disabled={busy || !selected}>{busy ? 'Đang lưu…' : 'Phân công'}</Button>
        </form>
    </Modal>;
}
function CopyEditor({ sourceStart, onClose, onSaved }) {
    const [source, setSource] = useState(sourceStart);
    const [target, setTarget] = useState(addDays(sourceStart, 7));
    const [busy, setBusy] = useState(false);
    return <Modal title="Sao chép 7 ngày lịch" onClose={busy ? () => {} : onClose}>
        <form className="space-y-4" onSubmit={async e => {
            e.preventDefault(); if (busy) return; setBusy(true);
            try {
                const result = await Axios.post('/api/shift/copy-week', { sourceStart: source, targetStart: target });
                toast.success('Đã sao chép ' + result.data.data.length + ' ca thành lịch nháp');
                await onSaved(target); onClose();
            } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
        }}>
            <Field label="Ngày đầu của 7 ngày nguồn"><input type="date" className={fieldClass} required value={source} onChange={e => setSource(e.target.value)} /></Field>
            <Field label="Ngày đầu của 7 ngày đích"><input type="date" className={fieldClass} required value={target} onChange={e => setTarget(e.target.value)} /></Field>
            <p className="text-sm">Sao chép giờ, định biên và nhân sự. Mọi ca mới ở trạng thái nháp; nếu có xung đột, toàn bộ thao tác sẽ được hủy.</p>
            <Button disabled={busy}>{busy ? 'Đang sao chép…' : 'Sao chép'}</Button>
        </form>
    </Modal>;
}
export default function ShiftManagementPage() {
    const user = useSelector(state => state.user);
    const manager = user?.role === 'MANAGER';
    const [range, setRange] = useState({ startDate: today(), endDate: addDays(today(), 6) });
    const [filter, setFilter] = useState('');
    const [modal, setModal] = useState(null);
    const [busy, setBusy] = useState(false);
    const loader = useCallback(async () => {
        const [shifts, employees] = await Promise.all([
            Axios.get('/api/shift/date', { params: range }), Axios.get('/api/employee/all'),
        ]);
        return { shifts: shifts.data.data, employees: employees.data.data };
    }, [range]);
    const { data, loading, error, reload } = useWorkflowData(loader, manager);
    async function saved(day) {
        if (day && (day < range.startDate || day > range.endDate)) setRange({ startDate: day, endDate: addDays(day, 6) });
        else await reload(true);
    }
    async function publish(shift) {
        if (busy) return; setBusy(true);
        try { await Axios.post('/api/shift/' + shift._id + '/publish'); toast.success('Đã công bố và gửi thông báo'); await reload(true); }
        catch (error) { AxiosToastError(error); } finally { setBusy(false); }
    }
    if (!manager) return <p className="p-6">Bạn không có quyền quản lý ca.</p>;
    return <section className="mx-auto grid max-w-6xl gap-4 p-3">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-5">
            <div><h1 className="text-xl font-bold">Quản lý ca làm việc</h1><p className="text-sm text-muted-foreground">Lập lịch, công bố và điều chỉnh nhân sự · Giờ Việt Nam</p></div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setModal({ type: 'create' })}>Tạo lịch nháp</Button>
                <Button variant="outline" onClick={() => setModal({ type: 'copy' })}>Sao chép tuần</Button>
                <Button asChild variant="outline"><Link to="/dashboard/attendance-management">Chấm công / đối soát</Link></Button>
            </div>
        </header>
        <div className="grid gap-3 rounded border bg-card p-4 sm:grid-cols-3">
            <Field label="Từ ngày"><input className={fieldClass} type="date" required value={range.startDate} onChange={e => setRange({ ...range, startDate: e.target.value })} /></Field>
            <Field label="Đến ngày (tối đa 93 ngày)"><input className={fieldClass} type="date" required value={range.endDate} onChange={e => setRange({ ...range, endDate: e.target.value })} /></Field>
            <Field label="Trạng thái"><select className={fieldClass} value={filter} onChange={e => setFilter(e.target.value)}><option value="">Tất cả</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        </div>
        <Feedback loading={loading} error={error} reload={reload} />
        {data?.shifts?.filter(s => !filter || s.status === filter).length === 0 && <p className="p-6 text-center">Không có ca phù hợp.</p>}
        {(data?.shifts || []).filter(s => !filter || s.status === filter).map(shift => <article key={shift._id} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-semibold">{shiftLabels[shift.shiftType]} · {formatDate(shift.date)} · {shift.startTime}–{shift.endTime}{shift.endTime < shift.startTime ? ' (+1 ngày)' : ''}</h2>
                    <p className="text-sm">{statusLabels[shift.status]}{shift.lockedAt ? ' · Đã chốt công' : ''}{shift.overdue ? ' · Đã hết giờ, cần đối soát' : ''}</p>
                    <p className="text-sm text-muted-foreground">{shift.assignedStaff.length}/{shift.maxStaff} người · {shift.assignedStaff.filter(s => s.confirmed).length} đã xác nhận · Nghỉ {shift.breakMinutes || 0} phút</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canEdit(shift) && <>
                        <Button size="sm" variant="outline" onClick={() => setModal({ type: 'edit', shift })}>Sửa ca</Button>
                        <Button size="sm" variant="outline" disabled={shift.assignedStaff.length >= shift.maxStaff} onClick={() => setModal({ type: 'assign', shift })}>Thêm nhân viên</Button>
                        {shift.status === 'draft' && <Button size="sm" disabled={busy} onClick={() => publish(shift)}>Công bố</Button>}
                    </>}
                    {['draft', 'scheduled'].includes(shift.status) && <Button size="sm" variant="destructive" onClick={() => setModal({ type: 'cancel', shift })}>Hủy ca</Button>}
                    <Button size="sm" variant="outline" onClick={() => setModal({ type: 'history', shift })}>Lịch sử</Button>
                </div>
            </div>
            {!!shift.notes && <p className="text-sm">{shift.notes}</p>}
            {!!shift.cancellationReason && <p className="text-sm text-red-700">Lý do hủy: {shift.cancellationReason}</p>}
            {shift.status !== 'cancelled' && (shift.shortages?.length > 0 || shift.warnings?.length > 0) &&
                <div className="rounded border border-amber-400 p-2 text-sm" role="status">{[...(shift.shortages || []), ...(shift.warnings || [])].map((message, i) => <p key={i}>{message}</p>)}</div>}
            <ul className="flex flex-wrap gap-2">{shift.assignedStaff.map(staff => <li key={staff._id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                <span>{staff.userId?.name || 'Nhân viên không còn tồn tại'} · {roleLabels[staff.role]} · {staff.confirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</span>
                {canEdit(shift) && <button className="text-red-700 underline" onClick={() => setModal({ type: 'remove', shift, staff })}>Gỡ</button>}
            </li>)}</ul>
        </article>)}
        <RequestsPanel manager userId={user._id} onChange={() => reload(true)} />
        {(modal?.type === 'create' || modal?.type === 'edit') && <ShiftEditor shift={modal.shift} onClose={() => setModal(null)} onSaved={saved} />}
        {modal?.type === 'assign' && <AssignEditor shift={modal.shift} employees={data?.employees || []} onClose={() => setModal(null)} onSaved={() => reload(true)} />}
        {modal?.type === 'copy' && <CopyEditor sourceStart={range.startDate} onClose={() => setModal(null)} onSaved={saved} />}
        {['cancel', 'remove'].includes(modal?.type) && <ReasonDialog title={modal.type === 'cancel' ? 'Hủy ca làm' : 'Gỡ nhân viên khỏi ca'} onClose={() => setModal(null)} onSubmit={async reason => {
            if (modal.type === 'cancel') await Axios.post('/api/shift/' + modal.shift._id + '/cancel', { reason });
            else await Axios.post('/api/shift/unassign', { shiftId: modal.shift._id, userId: modal.staff.userId?._id, assignmentId: modal.staff._id, reason });
            toast.success('Đã cập nhật'); await reload(true);
        }}><p className="text-sm">Nhân viên sẽ nhận thông báo. Lịch sử được giữ lại để đối soát.</p></ReasonDialog>}
        {modal?.type === 'history' && <Modal title="Lịch sử thay đổi ca" onClose={() => setModal(null)}>
            <ul className="space-y-3">{[...(modal.shift.history || [])].reverse().map((item, i) => <li key={item._id || i} className="rounded border p-3 text-sm">
                <p>{formatTime(item.at)} · {actionLabels[item.action] || item.action} · {item.actor?.name || 'Người thực hiện trước đây'}</p><p>{item.reason}</p>
                {item.before && <p className="text-xs text-muted-foreground">Trước: {formatDate(item.before.date)} {item.before.startTime}–{item.before.endTime}, {item.before.assignedStaff?.length || 0} người</p>}
                {item.after && <p className="text-xs text-muted-foreground">Sau: {formatDate(item.after.date)} {item.after.startTime}–{item.after.endTime}, {item.after.assignedStaff?.length || 0} người</p>}
            </li>)}</ul>{!modal.shift.history?.length && <p>Ca cũ chưa có lịch sử thay đổi.</p>}
        </Modal>}
    </section>;
}
