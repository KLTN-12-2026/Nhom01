import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChefHat,
    Clock,
    CheckCircle2,
    Flame,
    RefreshCw,
    Volume2,
    VolumeX,
    Timer,
    Filter
} from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

// Image component with fallback to avoid broken image icons
function DishImage({ src, alt }) {
    const [imgError, setImgError] = useState(false);

    if (!src || imgError) {
        return (
            <div className="w-16 h-16 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-2xl shrink-0 select-none shadow-xs">
                🍲
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            onError={() => setImgError(true)}
            className="w-16 h-16 rounded-xl object-cover border border-border shrink-0 shadow-xs"
        />
    );
}

export default function KitchenPage() {
    const user = useSelector((state) => state.user);
    const [kitchenItems, setKitchenItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTable, setSelectedTable] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [updatingItemId, setUpdatingItemId] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const playChime = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } catch (e) {}
    };

    const fetchKitchenItems = useCallback(async () => {
        try {
            setLoading(true);
            const res = await Axios({
                ...SummaryApi.get_kitchen_items
            });
            if (res.data.success) {
                setKitchenItems(res.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching kitchen items:', error);
            toast.error('Không thể tải danh sách món bếp');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKitchenItems();

        const socket = getSocket();
        if (!socket.connected) socket.connect();

        const handleNewKitchenOrder = (data) => {
            if (soundEnabled) playChime();
            toast(`🍳 Món mới cần nấu từ Bàn ${data?.tableNumber || ''}!`, {
                icon: '👨‍🍳',
                duration: 5000
            });
            fetchKitchenItems();
        };

        const handleTableOrderUpdate = () => {
            fetchKitchenItems();
        };

        socket.on('kitchen:new_order', handleNewKitchenOrder);
        socket.on('table_order:updated', handleTableOrderUpdate);

        // Auto refresh every 20 seconds
        const timer = setInterval(fetchKitchenItems, 20000);

        return () => {
            socket.off('kitchen:new_order', handleNewKitchenOrder);
            socket.off('table_order:updated', handleTableOrderUpdate);
            clearInterval(timer);
        };
    }, [fetchKitchenItems, soundEnabled]);

    const handleUpdateStatus = async (orderId, itemId, newStatus, dishName, tableNumber) => {
        try {
            setUpdatingItemId(itemId);
            const res = await Axios({
                ...SummaryApi.update_kitchen_item_status,
                data: {
                    orderId,
                    itemId,
                    status: newStatus
                }
            });

            if (res.data.success) {
                if (newStatus === 'done') {
                    if (soundEnabled) playChime();
                    toast.success(`Đã hoàn tất món "${dishName}" (Bàn ${tableNumber})! Đã báo phục vụ bưng món.`, {
                        icon: '🚀'
                    });
                } else if (newStatus === 'cooking') {
                    toast.success(`Bắt đầu nấu món "${dishName}"`);
                }

                // Update local state immediately
                setKitchenItems((prev) =>
                    prev.map((item) =>
                        item.itemId === itemId ? { ...item, status: newStatus } : item
                    )
                );
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(error.response?.data?.message || 'Lỗi cập nhật trạng thái món');
        } finally {
            setUpdatingItemId(null);
        }
    };

    // Extract unique tables
    const uniqueTables = Array.from(new Set(kitchenItems.map((i) => i.tableNumber))).filter(Boolean);

    // Filter items
    const filteredItems = kitchenItems.filter((item) => {
        if (selectedTable !== 'ALL' && item.tableNumber !== selectedTable) return false;
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        return true;
    });

    const pendingCount = kitchenItems.filter((i) => i.status === 'pending').length;
    const cookingCount = kitchenItems.filter((i) => i.status === 'cooking').length;
    const doneCount = kitchenItems.filter((i) => i.status === 'done').length;

    // Helper to calculate raw wait minutes
    const getWaitMinutes = (addedAt) => {
        if (!addedAt) return 0;
        const diffMs = Date.now() - new Date(addedAt).getTime();
        return Math.max(0, Math.floor(diffMs / 60000));
    };

    // Format human-friendly elapsed time without overflowing long numbers
    const formatWaitTime = (addedAt) => {
        const mins = getWaitMinutes(addedAt);
        if (mins < 1) return 'Vừa gọi';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        if (hours < 24) {
            return remMins > 0 ? `${hours}h ${remMins}p trước` : `${hours} giờ trước`;
        }
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    // Format badge text for late items
    const formatWaitBadge = (addedAt) => {
        const mins = getWaitMinutes(addedAt);
        if (mins < 60) return `Chờ > ${mins}p`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Chờ > ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Chờ > ${days} ngày`;
    };

    // Format order time (today vs older dates)
    const formatAddedTime = (addedAt) => {
        if (!addedAt) return '';
        const d = new Date(addedAt);
        const now = new Date();
        const isToday =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();

        const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (isToday) return timeStr;
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        return `${dateStr} ${timeStr}`;
    };

    return (
        <section className="container mx-auto grid gap-6 max-w-7xl pb-10">
            {/* Header */}
            <Card className="p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-border/80 shadow-xs bg-card rounded-xl">
                <CardHeader className="p-0 space-y-1">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2.5 text-foreground">
                        <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                            <ChefHat className="h-6 w-6" />
                        </span>
                        Màn Hình Quản Lý Bếp (Kitchen Display System)
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                        Đầu bếp theo dõi danh sách món gọi từ các bàn và bấm hoàn tất để tự động gửi chuông tới phục vụ
                    </CardDescription>
                </CardHeader>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`h-9 text-xs font-semibold flex items-center gap-1.5 rounded-xl cursor-pointer ${
                            soundEnabled ? 'text-foreground' : 'text-red-500 border-red-500/30'
                        }`}
                        title={soundEnabled ? 'Tắt âm báo khi có món mới' : 'Bật âm báo khi có món mới'}
                    >
                        {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        {soundEnabled ? 'Âm báo BẬT' : 'Âm báo TẮT'}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchKitchenItems}
                        disabled={loading}
                        className="h-9 text-xs font-semibold flex items-center gap-1.5 rounded-xl cursor-pointer"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
                        Làm mới
                    </Button>
                </div>
            </Card>

            {/* Metric counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                    onClick={() => setStatusFilter(statusFilter === 'pending' ? 'ALL' : 'pending')}
                    className={`rounded-xl p-5 sm:p-6 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                        statusFilter === 'pending'
                            ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                            : 'bg-card border-border/80 hover:border-amber-500/50 hover:shadow-sm'
                    }`}
                >
                    <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-[11px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">
                            Chờ chế biến
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                            {pendingCount} món
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            Bếp chưa bắt đầu nấu
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={24} />
                    </div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'cooking' ? 'ALL' : 'cooking')}
                    className={`rounded-xl p-5 sm:p-6 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                        statusFilter === 'cooking'
                            ? 'bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/30 shadow-md'
                            : 'bg-card border-border/80 hover:border-orange-500/50 hover:shadow-sm'
                    }`}
                >
                    <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-[11px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">
                            Đang nấu trên chảo
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                            {cookingCount} món
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            Đầu bếp đang xử lý
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                        <Flame size={24} />
                    </div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'done' ? 'ALL' : 'done')}
                    className={`rounded-xl p-5 sm:p-6 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                        statusFilter === 'done'
                            ? 'bg-green-500/15 border-green-500 ring-2 ring-green-500/30 shadow-md'
                            : 'bg-card border-border/80 hover:border-green-500/50 hover:shadow-sm'
                    }`}
                >
                    <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-[11px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">
                            Đã nấu xong (Done)
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-green-600 tracking-tight">
                            {doneCount} món
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            Đang chờ phục vụ bưng ra bàn
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-xl border border-border/80 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                        <Filter size={13} /> Lọc trạng thái:
                    </span>
                    {[
                        { key: 'ALL', label: 'Tất cả', count: kitchenItems.length },
                        { key: 'pending', label: 'Chờ làm', count: pendingCount },
                        { key: 'cooking', label: 'Đang nấu', count: cookingCount },
                        { key: 'done', label: 'Đã xong', count: doneCount }
                    ].map((tab) => {
                        const isActive = statusFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`inline-flex items-center gap-1.5 rounded-full text-xs h-7 px-3 font-semibold transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-border/70'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isActive
                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">Lọc theo bàn:</span>
                    <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="h-8.5 rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="ALL">Tất cả bàn ({uniqueTables.length})</option>
                        {uniqueTables.map((tbl) => (
                            <option key={tbl} value={tbl}>
                                Bàn {tbl}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Dishes Grid */}
            {filteredItems.length === 0 ? (
                <Card className="py-16 px-4 text-center text-muted-foreground border-dashed rounded-xl bg-card/50">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-2 opacity-80" />
                    <p className="text-base font-bold text-foreground">Hiện không có món nào cần xử lý!</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                        Các món gọi mới từ thực khách hoặc nhân viên phục vụ sẽ xuất hiện tại đây theo thời gian thực.
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => {
                        const isUpdating = updatingItemId === item.itemId;
                        const waitMins = getWaitMinutes(item.addedAt);
                        const isLate = waitMins >= 15 && item.status !== 'done';

                        return (
                            <div
                                key={item.itemId}
                                className={`rounded-xl border shadow-xs hover:shadow-md p-5 sm:p-6 flex flex-col justify-between transition-all bg-card ${
                                    isLate
                                        ? 'border-red-500/80 ring-2 ring-red-500/20 shadow-red-500/10'
                                        : item.status === 'pending'
                                        ? 'border-amber-400/80 bg-amber-500/5'
                                        : item.status === 'cooking'
                                        ? 'border-orange-500/80 bg-orange-500/5'
                                        : 'border-green-500/80 bg-green-500/5'
                                }`}
                            >
                                <div className="space-y-4">
                                    {/* Card Header: Table + Status */}
                                    <div className="flex items-center justify-between gap-3 pb-1">
                                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                            <span className="font-black text-sm px-3 py-1 rounded-xl bg-foreground text-background shrink-0 shadow-xs">
                                                BÀN {item.tableNumber}
                                            </span>
                                            {isLate && (
                                                <Badge variant="destructive" className="text-[10px] font-bold animate-pulse shrink-0 px-2 py-0.5">
                                                    {formatWaitBadge(item.addedAt)}
                                                </Badge>
                                            )}
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={`text-xs font-bold shrink-0 px-2.5 py-1 ${
                                                item.status === 'pending'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                                                    : item.status === 'cooking'
                                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300 border-green-300'
                                            }`}
                                        >
                                            {item.status === 'pending' && '⏳ Chờ chế biến'}
                                            {item.status === 'cooking' && '🔥 Đang nấu'}
                                            {item.status === 'done' && '✅ Đã hoàn tất'}
                                        </Badge>
                                    </div>

                                    {/* Dish Information */}
                                    <div className="flex items-start gap-3.5 py-1">
                                        <DishImage src={item.image?.[0]} alt={item.name} />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-sm sm:text-base text-foreground line-clamp-1" title={item.name}>
                                                {item.name}
                                            </h4>
                                            <div className="text-xl font-black text-orange-600 mt-1">
                                                x {item.quantity}
                                            </div>
                                            {item.notes && (
                                                <div className="text-xs text-amber-600 dark:text-amber-400 font-bold italic mt-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 break-words">
                                                    Ghi chú: {item.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Order Timestamp & Wait timer */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={13} className="shrink-0" />
                                            <span>Gọi lúc: {formatAddedTime(item.addedAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-semibold">
                                            <Timer size={13} className="shrink-0" />
                                            <span>{formatWaitTime(item.addedAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-border/60 mt-4">
                                    {item.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-2 rounded-xl shadow-xs cursor-pointer text-sm"
                                            disabled={isUpdating}
                                            onClick={() =>
                                                handleUpdateStatus(
                                                    item.orderId,
                                                    item.itemId,
                                                    'cooking',
                                                    item.name,
                                                    item.tableNumber
                                                )
                                            }
                                        >
                                            <Flame size={18} /> Bắt đầu nấu
                                        </Button>
                                    )}

                                    {item.status === 'cooking' && (
                                        <Button
                                            size="sm"
                                            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 font-black text-sm shadow-md shadow-green-600/25 tracking-wide rounded-xl cursor-pointer"
                                            disabled={isUpdating}
                                            onClick={() =>
                                                handleUpdateStatus(
                                                    item.orderId,
                                                    item.itemId,
                                                    'done',
                                                    item.name,
                                                    item.tableNumber
                                                )
                                            }
                                        >
                                            <CheckCircle2 size={19} /> XONG MÓN (DONE)
                                        </Button>
                                    )}

                                    {item.status === 'done' && (
                                        <div className="w-full text-center py-2.5 text-xs text-green-600 dark:text-green-400 font-bold bg-green-500/10 rounded-xl border border-green-500/30 flex items-center justify-center gap-1.5">
                                            <CheckCircle2 size={16} /> Đã gửi thông báo cho phục vụ bưng món
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
