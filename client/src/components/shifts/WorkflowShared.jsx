import { cloneElement, isValidElement, useCallback, useId, useState } from 'react';
import { useWorkflowData } from '../../hooks/useWorkflowData';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import { Button } from './WorkflowButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { fieldClass, formatDate, formatTime, requestLabels, requestStatuses } from '../../utils/shiftTime';

export function Field({ label, children }) {
    const generatedId = useId();
    const id = (isValidElement(children) && children.props.id) || generatedId;
    return <div className="grid min-w-0 gap-1 text-sm"><label htmlFor={id} className="font-medium">{label}</label>{isValidElement(children) ? cloneElement(children, { id }) : children}</div>;
}
export function Modal({ title, children, onClose }) {
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>{title}</DialogTitle>
                <DialogDescription>Ngày giờ hiển thị theo múi giờ Việt Nam.</DialogDescription>
            </DialogHeader>{children}
        </DialogContent>
    </Dialog>;
}
export function ReasonDialog({ title, children, onSubmit, onClose }) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    return <Modal title={title} onClose={busy ? () => {} : onClose}>
        <form className="space-y-4" onSubmit={async e => {
            e.preventDefault(); if (busy) return; setBusy(true);
            try { await onSubmit(reason); onClose(); } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
        }}>
            {children}
            <Field label="Lý do / ghi chú đối soát"><textarea className={fieldClass} value={reason} onChange={e => setReason(e.target.value)} minLength={3} maxLength={1000} required /></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Đóng</Button>
                <Button disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button></div>
        </form>
    </Modal>;
}
export function Feedback({ loading, error, reload }) {
    if (error) return <div role="alert" className="rounded border border-red-300 p-3 text-red-700">{error} <Button variant="outline" onClick={() => reload()}>Thử lại</Button></div>;
    return loading ? <p role="status" className="p-3 text-sm">Đang tải dữ liệu…</p> : null;
}
export function ShiftInbox() {
    const loader = useCallback(async () => (await Axios.get('/api/shift/notifications')).data.data, []);
    const { data, loading, error, reload } = useWorkflowData(loader);
    const [busy, setBusy] = useState(false);
    return <details className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer font-semibold">Thông báo ca làm {data?.unread ? '(' + data.unread + ' chưa đọc)' : ''}</summary>
        <Feedback loading={loading} error={error} reload={reload} />
        {data?.unread > 0 && <Button className="my-2" variant="outline" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await Axios.post('/api/shift/notifications/all/read'); await reload(true); }
            catch (error) { AxiosToastError(error); } finally { setBusy(false); }
        }}>Đánh dấu đã đọc</Button>}
        <ul className="max-h-64 space-y-2 overflow-y-auto pt-3">{(data?.items || []).map(item =>
            <li key={item._id} className={'rounded border p-2 text-sm ' + (!item.readAt ? 'border-blue-400' : '')}>
                <p>{item.message}</p><time className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</time>
            </li>)}</ul>
        {data?.items?.length === 0 && <p className="pt-3 text-sm">Chưa có thông báo.</p>}
    </details>;
}
export function RequestsPanel({ manager = false, userId, onChange }) {
    const [status, setStatus] = useState('pending');
    const [selected, setSelected] = useState(null);
    const [busy, setBusy] = useState(false);
    const loader = useCallback(async () => (await Axios.get('/api/shift/requests', { params: status ? { status } : {} })).data.data, [status]);
    const { data, loading, error, reload } = useWorkflowData(loader);
    async function respond(request, action, reason) {
        await Axios.post('/api/shift/requests/' + request._id + '/respond', { action, reason });
        await reload(true);
        if (onChange) await onChange();
    }
    async function quick(request, action) {
        if (busy) return;
        setBusy(true);
        try { await respond(request, action); } catch (error) { AxiosToastError(error); } finally { setBusy(false); }
    }
    return <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Yêu cầu nghỉ / thay ca / sửa công</h2>
            <select aria-label="Lọc trạng thái yêu cầu" className={fieldClass + ' max-w-48'} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">Tất cả (200 gần nhất)</option>{Object.entries(requestStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
        </div>
        <Feedback loading={loading} error={error} reload={reload} />
        {data?.length === 0 && <p className="text-sm text-muted-foreground">Không có yêu cầu.</p>}
        {(data || []).map(request => <article key={request._id} className="space-y-2 rounded border p-3 text-sm">
            <p className="font-medium">{requestLabels[request.type]} · {request.userId?.name || 'Nhân viên'} · {formatDate(request.shiftId?.date)} {request.shiftId?.startTime}–{request.shiftId?.endTime}</p>
            <p>{request.reason}</p>
            {request.targetUserId && <p>Người thay: {request.targetUserId.name} · {request.targetAccepted ? 'Đã đồng ý' : 'Chưa đồng ý'}</p>}
            {request.type === 'correction' && <p>Đề nghị: {formatTime(request.proposed?.checkInTime)} → {formatTime(request.proposed?.checkOutTime)} · nghỉ {request.proposed?.breakMinutes || 0} phút</p>}
            <p>{requestStatuses[request.status]}{request.reviewNote ? ' · ' + request.reviewNote : ''}</p>
            {request.status === 'pending' && <div className="flex flex-wrap gap-2">
                {manager && <><Button size="sm" disabled={request.type === 'swap' && !request.targetAccepted} onClick={() => setSelected({ request, action: 'approve' })}>Duyệt</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelected({ request, action: 'reject' })}>Từ chối</Button></>}
                {request.targetUserId?._id === userId && !request.targetAccepted && <>
                    <Button size="sm" disabled={busy} onClick={() => quick(request, 'accept')}>Đồng ý nhận ca</Button>
                    <Button size="sm" disabled={busy} variant="outline" onClick={() => quick(request, 'decline')}>Không nhận</Button></>}
                {request.userId?._id === userId && <Button size="sm" variant="outline" disabled={busy} onClick={() => quick(request, 'cancel')}>Rút yêu cầu</Button>}
            </div>}
        </article>)}
        {selected && <ReasonDialog title={selected.action === 'approve' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'} onClose={() => setSelected(null)}
            onSubmit={reason => respond(selected.request, selected.action, reason)}>
            <p className="text-sm">Duyệt xin nghỉ có thể làm ca thiếu nhân sự. Hãy kiểm tra định biên sau khi duyệt.</p>
        </ReasonDialog>}
    </section>;
}
