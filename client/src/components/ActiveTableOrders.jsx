import React, { useState } from 'react';
import Loading from '../components/Loading';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    QrCode,
    Plus,
    CheckCircle2,
    Clock,
    AlertCircle,
    Check,
    Utensils,
    DollarSign,
    Sparkles,
    Flame,
    Filter
} from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import TableOrderPaymentModal from './TableOrderPaymentModal';
import StaffAddOrderModal from './StaffAddOrderModal';
import toast from 'react-hot-toast';

const ActiveTableOrders = ({ orders = [], loading, onReload }) => {
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [openAddModal, setOpenAddModal] = useState(false);
    const [addModalTableNumber, setAddModalTableNumber] = useState('');
    const [endingOrderId, setEndingOrderId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, ENDING, READY

    if (loading && orders.length === 0) {
        return <Loading />;
    }

    // Handle end order: changes state to ending and generates QR
    const handleEndOrder = async (order) => {
        try {
            setEndingOrderId(order._id);
            const res = await Axios({
                ...SummaryApi.end_table_order,
                data: { orderId: order._id }
            });

            if (res.data.success) {
                toast.success(`Đã kết thúc đơn Bàn ${order.tableNumber}. Hiển thị mã QR thanh toán.`);
                setSelectedOrderForPayment(res.data.data);
                setOpenPaymentModal(true);
                onReload && onReload();
            }
        } catch (error) {
            console.error('Error ending order:', error);
            toast.error(error.response?.data?.message || 'Không thể kết thúc đơn hàng');
        } finally {
            setEndingOrderId(null);
        }
    };

    const handleOpenPayment = (order) => {
        setSelectedOrderForPayment(order);
        setOpenPaymentModal(true);
    };

    const handleOpenAddFood = (tableNumber) => {
        setAddModalTableNumber(tableNumber);
        setOpenAddModal(true);
    };

    // Mark item as served
    const handleMarkServed = async (orderId, itemId) => {
        try {
            await Axios({
                ...SummaryApi.update_kitchen_item_status,
                data: { orderId, itemId, status: 'served' }
            });
            toast.success('Đã xác nhận bưng món cho khách');
            onReload && onReload();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi cập nhật trạng thái phục vụ');
        }
    };

    const formatItemTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    // Filter orders
    const filteredOrders = orders.filter((order) => {
        const isEnding = order.status === 'ending';
        const readyDishesCount = order.items?.filter((i) => i.status === 'done').length || 0;

        if (statusFilter === 'ENDING') return isEnding;
        if (statusFilter === 'ACTIVE') return !isEnding;
        if (statusFilter === 'READY') return readyDishesCount > 0 && !isEnding;
        return true;
    });

    const totalActiveCount = orders.filter(o => o.status !== 'ending').length;
    const totalEndingCount = orders.filter(o => o.status === 'ending').length;
    const totalReadyCount = orders.filter(o => o.items?.some(i => i.status === 'done')).length;

    return (
        <div className="space-y-4">
            {/* Quick Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                        <Filter size={13} /> Lọc bàn:
                    </span>
                    <Button
                        size="sm"
                        variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('ALL')}
                        className="rounded-full text-xs h-7 px-3 font-semibold"
                    >
                        Tất cả ({orders.length})
                    </Button>
                    <Button
                        size="sm"
                        variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('ACTIVE')}
                        className="rounded-full text-xs h-7 px-3 font-semibold"
                    >
                        Đang dùng bữa ({totalActiveCount})
                    </Button>
                    <Button
                        size="sm"
                        variant={statusFilter === 'READY' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('READY')}
                        className={`rounded-full text-xs h-7 px-3 font-semibold ${
                            totalReadyCount > 0 && statusFilter !== 'READY' ? 'border-green-500/50 text-green-600 bg-green-500/10' : ''
                        }`}
                    >
                        🔔 Có món xong ({totalReadyCount})
                    </Button>
                    <Button
                        size="sm"
                        variant={statusFilter === 'ENDING' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('ENDING')}
                        className={`rounded-full text-xs h-7 px-3 font-semibold ${
                            totalEndingCount > 0 && statusFilter !== 'ENDING' ? 'border-purple-500/50 text-purple-600 bg-purple-500/10' : ''
                        }`}
                    >
                        💳 Chờ thanh toán ({totalEndingCount})
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                    Cập nhật tự động qua Socket
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrders.length === 0 ? (
                    <div className="col-span-full text-center py-14 text-muted-foreground bg-card border border-border rounded-2xl p-6">
                        <Utensils className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-base font-bold text-foreground">
                            {orders.length === 0
                                ? 'Hiện không có bàn nào đang hoạt động'
                                : 'Không có bàn nào phù hợp với bộ lọc hiện tại'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            Khi khách hàng quét mã QR hoặc nhân viên thêm món mới, bàn ăn sẽ tự động hiển thị tại đây.
                        </p>
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const isEnding = order.status === 'ending';
                        const isEndingBusy = endingOrderId === order._id;
                        const readyDishesCount = order.items?.filter((i) => i.status === 'done').length || 0;
                        const cookingDishesCount = order.items?.filter((i) => i.status === 'cooking').length || 0;

                        return (
                            <div
                                key={order._id}
                                className={`bg-card rounded-2xl shadow-sm overflow-hidden border transition-all flex flex-col justify-between ${
                                    isEnding
                                        ? 'border-purple-500 shadow-md shadow-purple-500/10'
                                        : readyDishesCount > 0
                                        ? 'border-green-500 shadow-md shadow-green-500/10 ring-1 ring-green-500/30'
                                        : 'border-border hover:border-orange-500/40 hover:shadow-md'
                                }`}
                            >
                                <div>
                                    {/* Card Header */}
                                    <div
                                        className={`px-4 py-3 text-white flex justify-between items-center ${
                                            isEnding
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                                                : readyDishesCount > 0
                                                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                                                : 'bg-gradient-to-r from-orange-500 to-amber-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-lg tracking-tight">
                                                Bàn {order.tableNumber}
                                            </h3>
                                            <Badge
                                                variant="secondary"
                                                className={`text-[11px] font-bold border-0 ${
                                                    isEnding
                                                        ? 'bg-white/20 text-white'
                                                        : readyDishesCount > 0
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-white/20 text-white'
                                                }`}
                                            >
                                                {isEnding ? 'Chờ thanh toán' : 'Đang dùng'}
                                            </Badge>
                                        </div>
                                        <span className="text-xs bg-black/25 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full font-bold">
                                            {order.items?.length || 0} món
                                        </span>
                                    </div>

                                    {/* Alert banner if dishes are ready for pickup */}
                                    {readyDishesCount > 0 && !isEnding && (
                                        <div className="bg-green-500/15 text-green-700 dark:text-green-300 px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-green-500/25 animate-pulse">
                                            <span className="flex items-center gap-1.5">
                                                <Sparkles size={14} className="text-green-600" />
                                                Có {readyDishesCount} món đã xong, vui lòng bưng ra bàn!
                                            </span>
                                        </div>
                                    )}

                                    {/* Items List */}
                                    <div className="p-4 max-h-72 overflow-y-auto divide-y divide-border/60">
                                        <ul className="space-y-3">
                                            {order.items?.map((item, index) => {
                                                const itemStatus = item.status || 'pending';
                                                return (
                                                    <li
                                                        key={item._id || index}
                                                        className="pt-2.5 first:pt-0 flex justify-between items-start gap-2"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-bold text-sm text-foreground truncate">
                                                                    {item.name}
                                                                </span>
                                                                <span className="font-extrabold text-xs text-orange-600 bg-orange-500/10 px-1 rounded">
                                                                    x{item.quantity}
                                                                </span>
                                                            </div>

                                                            {item.notes && (
                                                                <div className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                                                                    Ghi chú: {item.notes}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <span
                                                                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                                        itemStatus === 'pending'
                                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                                            : itemStatus === 'cooking'
                                                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                                                            : itemStatus === 'done'
                                                                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold ring-1 ring-green-500/40'
                                                                            : 'bg-muted text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {itemStatus === 'pending' && '⏳ Chờ chế biến'}
                                                                    {itemStatus === 'cooking' && '🔥 Đang nấu'}
                                                                    {itemStatus === 'done' && '✅ Bếp đã nấu xong'}
                                                                    {itemStatus === 'served' && '🍽️ Đã phục vụ'}
                                                                </span>

                                                                {itemStatus === 'done' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMarkServed(order._id, item._id)}
                                                                        className="text-[11px] text-green-600 hover:text-green-700 font-bold flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/30 transition-colors"
                                                                        title="Xác nhận đã bưng món tới bàn"
                                                                    >
                                                                        <Check size={12} /> Bưng món
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-right text-xs font-bold text-foreground whitespace-nowrap pl-2">
                                                            {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>

                                {/* Footer & Actions */}
                                <div>
                                    <div className="bg-muted/30 px-4 py-2.5 border-t border-border flex justify-between items-center">
                                        <span className="font-semibold text-xs text-muted-foreground">
                                            Tổng tiền bàn:
                                        </span>
                                        <span className="font-black text-lg text-orange-600">
                                            {order.total?.toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>

                                    <div className="p-3 bg-card border-t border-border flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenAddFood(order.tableNumber)}
                                            className="flex-1 text-xs h-9 font-semibold hover:border-orange-500 hover:text-orange-600"
                                        >
                                            <Plus size={14} className="mr-1 text-orange-600" /> Thêm món
                                        </Button>

                                        {!isEnding ? (
                                            <Button
                                                size="sm"
                                                onClick={() => handleEndOrder(order)}
                                                disabled={isEndingBusy}
                                                className="flex-1 text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm shadow-purple-600/20"
                                            >
                                                <QrCode size={14} className="mr-1" />
                                                {isEndingBusy ? 'Đang tạo QR…' : 'Kết thúc đơn'}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenPayment(order)}
                                                className="flex-1 text-xs h-9 bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm shadow-green-600/20"
                                            >
                                                <QrCode size={14} className="mr-1" /> Thu tiền & QR
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Payment Modal with VietQR */}
            <TableOrderPaymentModal
                open={openPaymentModal}
                onClose={() => setOpenPaymentModal(false)}
                orderData={selectedOrderForPayment}
                onPaymentConfirmed={onReload}
            />

            {/* Add Food for Customer Modal */}
            <StaffAddOrderModal
                open={openAddModal}
                onClose={() => setOpenAddModal(false)}
                defaultTableNumber={addModalTableNumber}
                onOrderAdded={onReload}
            />
        </div>
    );
};

export default ActiveTableOrders;