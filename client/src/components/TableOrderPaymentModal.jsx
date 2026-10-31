import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle2, Copy, DollarSign, Wallet, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

export default function TableOrderPaymentModal({ open, onClose, orderData, onPaymentConfirmed }) {
    const [confirming, setConfirming] = useState(false);
    const [copied, setCopied] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('qr'); // 'qr' or 'cash'
    const [cashReceived, setCashReceived] = useState('');

    if (!orderData) return null;

    const qrUrl = orderData.paymentQrUrl || (orderData.data?.qrUrl);
    const paymentCode = orderData.paymentId || (orderData.data?.paymentCode);
    const total = Number(orderData.total || (orderData.data?.total) || 0);
    const tableNumber = orderData.tableNumber || (orderData.data?.tableNumber);
    const orderId = orderData._id || (orderData.data?.tableOrder?._id);

    const cashNum = Number(cashReceived) || 0;
    const changeAmount = Math.max(0, cashNum - total);

    const handleConfirmPayment = async (method = paymentMethod) => {
        try {
            setConfirming(true);
            const res = await Axios({
                ...SummaryApi.confirm_table_payment,
                data: {
                    orderId: orderId,
                    paymentMethod: method
                }
            });

            if (res.data.success) {
                toast.success(`Đã xác nhận thanh toán thành công cho Bàn ${tableNumber}!`);
                onPaymentConfirmed && onPaymentConfirmed();
                onClose();
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            toast.error(error.response?.data?.message || 'Không thể xác nhận thanh toán');
        } finally {
            setConfirming(false);
        }
    };

    const copyCode = () => {
        if (paymentCode) {
            navigator.clipboard.writeText(paymentCode);
            setCopied(true);
            toast.success('Đã sao chép mã thanh toán!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const setQuickCash = (amount) => {
        setCashReceived(String(amount));
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-md p-6 overflow-hidden">
                <DialogHeader className="text-center pb-2">
                    <DialogTitle className="text-xl font-black flex items-center justify-center gap-2">
                        <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
                            <QrCode className="h-5 w-5" />
                        </span>
                        Thanh Toán Bàn {tableNumber}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Xác nhận thanh toán đơn gọi món tại bàn sau khi khách hoàn tất dùng bữa
                    </DialogDescription>
                </DialogHeader>

                {/* Amount Highlight */}
                <div className="text-center bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 w-full py-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Tổng tiền cần thanh toán
                    </span>
                    <div className="text-3xl font-black text-orange-600 tracking-tight mt-0.5">
                        {total.toLocaleString('vi-VN')} đ
                    </div>
                </div>

                {/* Method Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('qr')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            paymentMethod === 'qr'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <QrCode size={15} /> Chuyển khoản VietQR
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            paymentMethod === 'cash'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <DollarSign size={15} /> Tiền mặt tại bàn
                    </button>
                </div>

                {/* Content according to tab */}
                {paymentMethod === 'qr' ? (
                    <div className="flex flex-col items-center justify-center space-y-3.5 py-1">
                        {/* QR Code container */}
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200">
                            {qrUrl ? (
                                <img
                                    src={qrUrl}
                                    alt="VietQR Payment Code"
                                    className="w-56 h-56 object-contain rounded-lg"
                                />
                            ) : (
                                <div className="w-56 h-56 bg-gray-50 flex items-center justify-center text-xs text-gray-400 rounded-lg border border-dashed">
                                    Đang khởi tạo mã VietQR...
                                </div>
                            )}
                        </div>

                        {/* Payment code memo */}
                        {paymentCode && (
                            <div className="flex items-center justify-between w-full bg-muted/50 px-3.5 py-2 rounded-xl text-xs border border-border">
                                <span className="text-muted-foreground">
                                    Nội dung CK: <strong className="text-foreground">{paymentCode}</strong>
                                </span>
                                <button
                                    onClick={copyCode}
                                    className="text-orange-600 hover:underline flex items-center gap-1 font-bold text-[11px]"
                                >
                                    <Copy size={12} /> {copied ? 'Đã sao chép' : 'Sao chép'}
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground text-center">
                            <ShieldCheck size={14} className="text-green-600 shrink-0" />
                            <span>Quét được bằng mọi App Ngân hàng (MB, VCB, ACB, Techcom, MoMo...)</span>
                        </div>
                    </div>
                ) : (
                    /* Cash Calculator Mode */
                    <div className="space-y-3.5 py-2">
                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">
                                Số tiền khách đưa (VNĐ):
                            </label>
                            <input
                                type="number"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                                placeholder={`Nhập số tiền (VD: ${total.toLocaleString('vi-VN')})`}
                                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        {/* Quick preset chips */}
                        <div className="flex flex-wrap gap-1.5">
                            {[total, Math.ceil(total / 100000) * 100000, 200000, 500000, 1000000]
                                .filter((amt, idx, arr) => amt >= total && arr.indexOf(amt) === idx)
                                .map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setQuickCash(amt)}
                                        className="text-xs bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-lg font-semibold border border-border"
                                    >
                                        {amt.toLocaleString('vi-VN')} đ
                                    </button>
                                ))}
                        </div>

                        {/* Calculated Change */}
                        <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Tiền thừa thối lại:
                            </span>
                            <span className="text-base font-black text-green-600">
                                {cashNum >= total
                                    ? `${changeAmount.toLocaleString('vi-VN')} đ`
                                    : '---'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Dialog Footer Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={confirming}
                        className="text-xs h-10 font-semibold"
                    >
                        Đóng lại
                    </Button>
                    <Button
                        onClick={() => handleConfirmPayment(paymentMethod)}
                        disabled={confirming || (paymentMethod === 'cash' && cashNum > 0 && cashNum < total)}
                        className="text-xs h-10 bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-green-600/20"
                    >
                        <CheckCircle2 size={16} />
                        {confirming ? 'Đang xác nhận…' : 'Xác nhận đã thanh toán'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}