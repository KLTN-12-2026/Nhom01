import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/shifts/WorkflowButton';
import { Field } from '@/components/shifts/WorkflowShared';
import { today, addDays, formatDate, shiftLabels, fieldClass } from '@/utils/shiftTime';
import Axios from '@/utils/Axios';
import AxiosToastError from '@/utils/AxiosToastError';
import toast from 'react-hot-toast';
import { CalendarPlus, Users, Clock, CheckCircle2, ChevronRight, ArrowLeft, Sparkles, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ShiftRegisterModal({ open, onClose, onRegistered }) {
    const user = useSelector((state) => state.user);
    const [startDate, setStartDate] = useState(today());
    const [endDate, setEndDate] = useState(addDays(today(), 14));
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [reason, setReason] = useState('Em xin đăng ký tham gia ca làm việc này');
    const [submitting, setSubmitting] = useState(false);
    const [shiftTypeFilter, setShiftTypeFilter] = useState('ALL');

    const quickReasons = [
        'Em xin đăng ký tham gia ca làm việc này',
        'Em rảnh khung giờ này, muốn tăng thêm ca và giờ công',
        'Đăng ký hỗ trợ ca cao điểm cuối tuần'
    ];

    const fetchAvailableShifts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await Axios.get('/api/shift/date', {
                params: { startDate, endDate }
            });
            if (res.data.success) {
                // Filter shifts where user is NOT yet assigned and status is scheduled or draft
                const available = (res.data.data || []).filter((shift) => {
                    const isAlreadyAssigned = shift.assignedStaff?.some(
                        (s) => s.userId?._id === user._id || s.userId === user._id
                    );
                    const isNotFull = (shift.assignedStaff?.length || 0) < shift.maxStaff;
                    const isUpcoming = new Date(shift.date) >= new Date(today() + 'T00:00:00Z');
                    return !isAlreadyAssigned && isNotFull && isUpcoming && shift.status !== 'cancelled';
                });
                setShifts(available);
            }
        } catch (error) {
            console.error('Error fetching available shifts:', error);
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, user?._id]);

    useEffect(() => {
        if (open) {
            fetchAvailableShifts();
        }
    }, [open, fetchAvailableShifts]);

    const handleSubmitRegistration = async (e) => {
        e.preventDefault();
        if (!selectedShift) return;

        try {
            setSubmitting(true);
            const res = await Axios.post(`/api/shift/${selectedShift._id}/requests`, {
                type: 'register',
                reason: reason.trim()
            });

            if (res.data.success) {
                toast.success('Đã gửi yêu cầu đăng ký ca tới Quản lý xét duyệt!');
                setSelectedShift(null);
                onRegistered && onRegistered();
                onClose();
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    const filteredShifts = shifts.filter((s) => {
        if (shiftTypeFilter !== 'ALL' && s.shiftType !== shiftTypeFilter) return false;
        return true;
    });

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-6 rounded-xl">
                <DialogHeader className="pb-2 border-b border-border">
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600">
                            <CalendarPlus className="h-5 w-5" />
                        </span>
                        Đăng Ký Nhận Ca Làm Việc
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Chọn các ca làm việc còn trống nhân sự trong 2 tuần tới để gửi yêu cầu Quản lý duyệt
                    </DialogDescription>
                </DialogHeader>

                {!selectedShift ? (
                    <div className="space-y-4 pt-2">
                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-xl border border-border text-xs">
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                                <span className="font-bold text-muted-foreground mr-1 flex items-center gap-1">
                                    <Filter size={12} /> Ca:
                                </span>
                                {['ALL', 'morning', 'afternoon', 'evening', 'full'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setShiftTypeFilter(t)}
                                        className={`px-2.5 py-1 rounded-full font-bold transition-all ${
                                            shiftTypeFilter === t
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {t === 'ALL' ? 'Tất cả' : shiftLabels[t] || t}
                                    </button>
                                ))}
                            </div>

                            <span className="text-[11px] font-bold text-orange-600 shrink-0">
                                {filteredShifts.length} ca còn chỗ
                            </span>
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-xs text-muted-foreground">
                                Đang kiểm tra danh sách ca trống...
                            </div>
                        ) : filteredShifts.length === 0 ? (
                            <div className="py-14 text-center text-muted-foreground border border-dashed rounded-xl p-6">
                                <CalendarPlus className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                                <p className="text-sm font-bold text-foreground">
                                    Hiện không có ca làm mở nào còn trống trong khung thời gian này.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Bạn hãy kiểm tra lại sau hoặc liên hệ Quản lý để mở thêm ca mới.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                                {filteredShifts.map((shift) => {
                                    const currentStaff = shift.assignedStaff?.length || 0;
                                    const maxStaff = shift.maxStaff || 10;
                                    const vacancyLeft = Math.max(0, maxStaff - currentStaff);

                                    return (
                                        <div
                                            key={shift._id}
                                            onClick={() => setSelectedShift(shift)}
                                            className="p-3.5 rounded-xl border border-border bg-card hover:border-orange-500/80 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group"
                                        >
                                            <div className="space-y-1.5 min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-sm text-foreground">
                                                        {formatDate(shift.date)}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-orange-500/10 text-orange-600 font-bold text-[11px]"
                                                    >
                                                        {shiftLabels[shift.shiftType] || shift.shiftType}
                                                    </Badge>
                                                    <span className="text-[11px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                                                        Còn {vacancyLeft} chỗ
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1 font-semibold text-foreground/80">
                                                        <Clock size={12} /> {shift.startTime} – {shift.endTime}
                                                    </span>
                                                    {shift.notes && (
                                                        <span className="truncate">· {shift.notes}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8 px-3 rounded-xl shrink-0 flex items-center gap-1 shadow-sm transition-transform group-hover:scale-105"
                                            >
                                                Đăng ký <ChevronRight size={13} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Step 2: Confirm registration with reason */
                    <form onSubmit={handleSubmitRegistration} className="space-y-4 pt-3 animate-in fade-in duration-150">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 text-xs sm:text-sm space-y-1">
                            <div className="font-black text-orange-600 text-sm">
                                {formatDate(selectedShift.date)} · {shiftLabels[selectedShift.shiftType]}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1 font-semibold">
                                <Clock size={13} /> Khung giờ: {selectedShift.startTime} – {selectedShift.endTime}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1">
                                <Sparkles size={12} className="text-orange-500" /> Chọn nhanh lý do đăng ký:
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {quickReasons.map((r, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setReason(r)}
                                        className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-lg border border-border font-medium text-left"
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">
                                Lời nhắn gửi Quản lý <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className={`${fieldClass} rounded-2xl text-xs`}
                                rows={3}
                                required
                                minLength={3}
                                maxLength={500}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Nhập lời nhắn hoặc ghi chú cho quản lý khi duyệt ca..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedShift(null)}
                                disabled={submitting}
                                className="rounded-xl text-xs h-9 font-semibold"
                            >
                                <ArrowLeft size={13} className="mr-1" /> Quay lại chọn ca
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs h-9 px-5 shadow-sm"
                            >
                                {submitting ? 'Đang gửi…' : 'Xác nhận gửi đăng ký'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}