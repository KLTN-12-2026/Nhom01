import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { getSocket } from '../utils/socket';
import {
    CreditCard,
    DollarSign,
    ShoppingBag,
    LogOut,
    X,
    RefreshCw,
    Utensils,
    Clock,
    CheckCircle2,
    Flame,
    AlertCircle,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

const TableOrderManagementPage = () => {
    const navigate = useNavigate();
    const user = useSelector((state) => state.user);
    const [tableOrder, setTableOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('online');

    useEffect(() => {
        if (!user || user.role !== 'TABLE') {
            toast.error('Vui lòng quét mã QR tại bàn để truy cập');
            navigate('/');
            return;
        }
        fetchTableOrder();

        const socket = getSocket();
        if (!socket.connected) socket.connect();
        const onUpdate = () => fetchTableOrder();
        socket.on('table_order:updated', onUpdate);
        socket.on('dish:ready', onUpdate);

        return () => {
            socket.off('table_order:updated', onUpdate);
            socket.off('dish:ready', onUpdate);
        };
    }, [user, navigate]);

    const fetchTableOrder = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_current_table_order,
            });

            if (response.data.success) {
                setTableOrder(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching table order:', error);
            toast.error('Không thể tải đơn hàng hiện tại');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (paymentMethod) => {
        if (!tableOrder || tableOrder.items.length === 0) {
            toast.error('Không có món nào để thanh toán');
            return;
        }

        try {
            setProcessing(true);
            const response = await Axios({
                ...SummaryApi.checkout_table_order,
                data: {
                    paymentMethod: paymentMethod || selectedPayment,
                },
            });

            if (response.data.success) {
                if ((paymentMethod || selectedPayment) === 'cash') {
                    toast.success(
                        'Đã gửi yêu cầu thanh toán tiền mặt! Nhân viên sẽ tới bàn phục vụ bạn.'
                    );
                    navigate('/table-menu');
                } else {
                    window.location.href = response.data.data.checkoutUrl;
                }
            }
        } catch (error) {
            console.error('Error checkout:', error);
            toast.error(
                error.response?.data?.message || 'Không thể thực hiện thanh toán'
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng tại bàn này không?')) {
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.cancel_table_order,
            });

            if (response.data.success) {
                toast.success('Đã hủy đơn hàng');
                navigate('/table-menu');
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast.error('Không thể hủy đơn hàng');
        }
    };

    const handleLogout = async () => {
        try {
            await Axios({
                ...SummaryApi.logoutTable,
            });
            toast.success('Đã thoát phiên gọi món tại bàn');
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const formatTimeStr = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-orange-500 border-t-transparent mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Đang tải thông tin đơn hàng tại bàn...</p>
            </div>
        );
    }

    if (!tableOrder || tableOrder.items.length === 0) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col">
                <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md px-4 py-3">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black">
                                <Utensils size={18} />
                            </div>
                            <div>
                                <h1 className="text-base font-bold leading-tight">Gọi Món Tại Bàn</h1>
                                <p className="text-xs text-muted-foreground">Bàn {user?.tableNumber || '---'}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-destructive h-8 px-2"
                        >
                            <LogOut size={16} className="mr-1" /> Thoát bàn
                        </Button>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-6">
                    <Card className="max-w-md w-full text-center p-8 border-dashed shadow-sm">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <ShoppingBag size={32} />
                        </div>
                        <h2 className="text-xl font-bold mb-1">Chưa có món nào được gọi</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Quý khách hãy khám phá thực đơn đa dạng và gọi món trực tiếp để nhà hàng phục vụ nhanh nhất!
                        </p>
                        <Button
                            onClick={() => navigate('/table-menu')}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 shadow-md shadow-orange-500/20"
                        >
                            <Utensils size={16} className="mr-2" /> Xem thực đơn & Gọi món
                        </Button>
                    </Card>
                </main>
            </div>
        );
    }

    const items = tableOrder.items || [];
    const doneItems = items.filter(i => i.status === 'done' || i.status === 'served').length;
    const progressPercent = items.length > 0 ? Math.round((doneItems / items.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-background text-foreground pb-28 md:pb-12">
            {/* Top Navigation */}
            <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/table-menu')}
                            className="h-8 w-8 rounded-lg"
                            title="Quay lại thực đơn"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black tracking-tight text-foreground">
                                    Bàn {tableOrder.tableNumber}
                                </h1>
                                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border border-orange-500/20 text-xs font-semibold">
                                    Đang phục vụ
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {items.length} món đã đặt · Cập nhật theo thời gian thực
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchTableOrder}
                            className="h-8 w-8 rounded-lg"
                            title="Tải lại đơn hàng"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                            title="Đăng xuất khỏi bàn"
                        >
                            <LogOut size={16} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-4">
                {/* Kitchen Progress Banner */}
                <Card className="overflow-hidden border border-border shadow-sm bg-gradient-to-br from-card to-muted/30">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                                <Flame size={15} className="text-orange-500" /> Tiến độ chế biến của Bếp
                            </span>
                            <span className="text-xs font-black text-orange-600">
                                {doneItems}/{items.length} món xong ({progressPercent}%)
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </Card>

                {/* Ordered Items List */}
                <Card className="border border-border shadow-sm overflow-hidden">
                    <CardHeader className="py-3 px-4 sm:px-6 bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <Utensils size={15} className="text-orange-500" /> Danh Sách Món Đã Gọi
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/table-menu')}
                            className="h-7 text-xs text-orange-600 hover:text-orange-700 font-bold"
                        >
                            + Gọi thêm món
                        </Button>
                    </CardHeader>

                    <CardContent className="p-0 divide-y divide-border/60">
                        {items.map((item, index) => {
                            const status = item.status || 'pending';
                            return (
                                <div
                                    key={index}
                                    className="p-4 sm:px-6 flex items-start justify-between gap-3 hover:bg-muted/10 transition-colors"
                                >
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-sm text-foreground">
                                                {item.name}
                                            </h3>
                                            <span className="text-xs font-extrabold text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">
                                                x{item.quantity}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{item.price?.toLocaleString('vi-VN')} đ / phần</span>
                                            {item.addedAt && (
                                                <>
                                                    <span>·</span>
                                                    <span className="flex items-center gap-0.5">
                                                        <Clock size={11} /> {formatTimeStr(item.addedAt)}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {item.notes && (
                                            <div className="text-[11px] text-amber-600 dark:text-amber-400 italic bg-amber-500/10 px-2 py-0.5 rounded w-fit">
                                                Ghi chú: {item.notes}
                                            </div>
                                        )}

                                        <div className="pt-0.5">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                    status === 'pending'
                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                        : status === 'cooking'
                                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                                        : status === 'done'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {status === 'pending' && <>⏳ Chờ bếp chuẩn bị</>}
                                                {status === 'cooking' && <>🔥 Đang chế biến</>}
                                                {status === 'done' && <>✅ Bếp đã nấu xong (Chờ bưng)</>}
                                                {status === 'served' && <>🍽️ Đã phục vụ tại bàn</>}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="font-extrabold text-sm sm:text-base text-foreground">
                                            {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Bill Breakdown */}
                <Card className="border border-border shadow-sm p-5 space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Tổng số món:</span>
                        <span className="font-semibold text-foreground">{items.length} món</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Trạng thái thanh toán:</span>
                        <Badge variant="outline" className="text-xs font-semibold">
                            Chưa thanh toán
                        </Badge>
                    </div>
                    <div className="border-t border-border pt-3 flex items-center justify-between">
                        <span className="text-base font-bold text-foreground">Tổng thanh toán:</span>
                        <span className="text-2xl font-black text-orange-600">
                            {tableOrder.total?.toLocaleString('vi-VN')} đ
                        </span>
                    </div>
                </Card>

                {/* Payment Selection Options */}
                <Card className="border border-border shadow-sm p-5 space-y-3">
                    <h3 className="font-bold text-sm text-foreground mb-1">
                        Phương thức thanh toán
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                            onClick={() => setSelectedPayment('online')}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                selectedPayment === 'online'
                                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                                    : 'border-border bg-card hover:border-muted-foreground/30'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <CreditCard size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs sm:text-sm">Chuyển khoản VietQR / Online</div>
                                <div className="text-[11px] text-muted-foreground">Quét mã ngân hàng (App Banking, MoMo)</div>
                            </div>
                        </div>

                        <div
                            onClick={() => setSelectedPayment('cash')}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                                selectedPayment === 'cash'
                                    ? 'border-green-600 bg-green-50/50 dark:bg-green-950/20 shadow-sm'
                                    : 'border-border bg-card hover:border-muted-foreground/30'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
                                <DollarSign size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs sm:text-sm">Tiền mặt tại quầy / tại bàn</div>
                                <div className="text-[11px] text-muted-foreground">Nhân viên tới thu tiền hoặc thanh toán tại quầy</div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                        <Button
                            onClick={() => handleCheckout(selectedPayment)}
                            disabled={processing}
                            className={`flex-1 font-bold h-11 text-white shadow-md ${
                                selectedPayment === 'online'
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                    : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                            }`}
                        >
                            {selectedPayment === 'online' ? (
                                <CreditCard size={18} className="mr-2" />
                            ) : (
                                <DollarSign size={18} className="mr-2" />
                            )}
                            {processing
                                ? 'Đang xử lý...'
                                : selectedPayment === 'online'
                                ? 'Thanh toán trực tuyến ngay'
                                : 'Xác nhận thanh toán tiền mặt'}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => navigate('/table-menu')}
                            className="font-semibold h-11 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                        >
                            <ShoppingBag size={16} className="mr-1.5" /> Tiếp tục gọi món
                        </Button>
                    </div>

                    <div className="pt-2 text-center">
                        <button
                            type="button"
                            onClick={handleCancelOrder}
                            className="text-xs text-muted-foreground hover:text-destructive underline transition-colors"
                        >
                            Hủy toàn bộ đơn hàng bàn này
                        </button>
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default TableOrderManagementPage;