import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Bell,
    Check,
    Trash2,
    RefreshCw,
    ChefHat,
    Calendar,
    Megaphone,
    CreditCard,
    CheckCheck,
    Utensils,
    Inbox
} from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { formatTime } from '../utils/shiftTime';

export default function NotificationsPage() {
    const user = useSelector((state) => state.user);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('ALL');

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await Axios({
                ...SummaryApi.get_my_notifications
            });
            if (res.data.success) {
                setNotifications(res.data.data.items || []);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            toast.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAllRead = async () => {
        try {
            await Axios({ ...SummaryApi.mark_all_notifications_read });
            setNotifications((prev) =>
                prev.map((n) => ({
                    ...n,
                    readBy: [...(n.readBy || []), user._id]
                }))
            );
            toast.success('Đã đánh dấu tất cả là đã đọc');
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const markOneRead = async (id) => {
        try {
            await Axios({
                url: SummaryApi.mark_notification_read.url.replace(':id', id),
                method: SummaryApi.mark_notification_read.method
            });
            setNotifications((prev) =>
                prev.map((n) =>
                    n._id === id
                        ? {
                              ...n,
                              readBy: [...(n.readBy || []), user._id]
                          }
                        : n
                )
            );
        } catch (error) {
            console.error(error);
        }
    };

    const deleteNotif = async (id) => {
        try {
            await Axios({
                url: SummaryApi.delete_notification.url.replace(':id', id),
                method: SummaryApi.delete_notification.method
            });
            setNotifications((prev) => prev.filter((n) => n._id !== id));
            toast.success('Đã xóa thông báo');
        } catch (error) {
            console.error(error);
            toast.error('Không thể xóa thông báo');
        }
    };

    const getTabsForRole = (role) => {
        if (role === 'USER') {
            return [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ANNOUNCEMENT', label: 'Thông báo từ Nhà hàng', icon: Megaphone },
                { key: 'PAYMENT', label: 'Đơn hàng & Hóa đơn', icon: CreditCard }
            ];
        }
        if (role === 'CHEF') {
            return [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'KITCHEN', label: 'Món mới vào bếp', icon: ChefHat },
                { key: 'SHIFT', label: 'Lịch ca làm việc', icon: Calendar },
                { key: 'ANNOUNCEMENT', label: 'Thông báo Quản lý', icon: Megaphone }
            ];
        }
        if (['WAITER', 'CASHIER'].includes(role)) {
            return [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'KITCHEN', label: 'Món ăn hoàn tất', icon: Utensils },
                { key: 'PAYMENT', label: 'Hóa đơn & Thu tiền', icon: CreditCard },
                { key: 'SHIFT', label: 'Lịch ca làm việc', icon: Calendar },
                { key: 'ANNOUNCEMENT', label: 'Thông báo Quản lý', icon: Megaphone }
            ];
        }
        // ADMIN & MANAGER
        return [
            { key: 'ALL', label: 'Tất cả' },
            { key: 'KITCHEN', label: 'Bếp & Món ăn', icon: ChefHat },
            { key: 'ANNOUNCEMENT', label: 'Thông báo Quản lý', icon: Megaphone },
            { key: 'PAYMENT', label: 'Thanh toán & Hóa đơn', icon: CreditCard },
            { key: 'SHIFT', label: 'Lịch ca làm', icon: Calendar }
        ];
    };

    const roleTabs = getTabsForRole(user?.role);

    const filteredList = notifications.filter((item) => {
        // Strict role-level visibility guard
        if (user?.role === 'USER') {
            if (['SHIFT', 'DISH_DONE', 'NEW_ORDER'].includes(item.type)) return false;
        } else if (user?.role === 'CHEF') {
            if (['DISH_DONE', 'PAYMENT'].includes(item.type)) return false;
        } else if (['WAITER', 'CASHIER'].includes(user?.role)) {
            if (item.type === 'NEW_ORDER') return false;
        }

        if (filter === 'ALL') return true;
        if (filter === 'KITCHEN') {
            if (user?.role === 'CHEF') return item.type === 'NEW_ORDER';
            if (['WAITER', 'CASHIER'].includes(user?.role)) return item.type === 'DISH_DONE';
            return ['DISH_DONE', 'NEW_ORDER'].includes(item.type);
        }
        if (filter === 'ANNOUNCEMENT') return item.type === 'ANNOUNCEMENT' || item.type === 'GENERAL';
        if (filter === 'SHIFT') return item.type === 'SHIFT';
        if (filter === 'PAYMENT') return item.type === 'PAYMENT';
        return true;
    });

    const unreadCount = filteredList.filter(
        (n) => !n.readBy?.some((id) => String(id) === String(user._id))
    ).length;

    const isManager = user?.role === 'MANAGER';

    const getTypeIcon = (type) => {
        switch (type) {
            case 'DISH_DONE':
                return <Utensils size={18} className="text-green-600" />;
            case 'NEW_ORDER':
                return <ChefHat size={18} className="text-amber-600" />;
            case 'PAYMENT':
                return <CreditCard size={18} className="text-blue-600" />;
            case 'SHIFT':
                return <Calendar size={18} className="text-purple-600" />;
            default:
                return <Megaphone size={18} className="text-orange-600" />;
        }
    };

    return (
        <section className="container mx-auto grid gap-5 max-w-5xl">
            {/* Header Card */}
            <Card className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-border shadow-sm bg-card">
                <CardHeader className="p-0">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2.5 text-foreground">
                        <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                            <Bell className="h-6 w-6" />
                        </span>
                        Hộp Thông Báo
                        {unreadCount > 0 && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 border border-orange-500/20">
                                {unreadCount} chưa đọc
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {user?.role === 'USER'
                            ? 'Theo dõi trạng thái đơn hàng, hóa đơn thanh toán và các chương trình từ nhà hàng'
                            : user?.role === 'CHEF'
                            ? 'Món mới cần chế biến vào bếp, lịch ca làm việc và các thông báo nội bộ'
                            : ['WAITER', 'CASHIER'].includes(user?.role)
                            ? 'Món ăn hoàn tất cần bưng ra bàn, hóa đơn thanh toán và lịch ca làm việc'
                            : 'Toàn bộ thông báo hệ thống, ca làm, món ăn và thông báo nhân sự'}
                    </CardDescription>
                </CardHeader>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchNotifications}
                        disabled={loading}
                        className="h-9 text-xs font-semibold flex items-center gap-1.5"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
                        Làm mới
                    </Button>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllRead}
                            className="h-9 text-xs font-semibold text-green-600 hover:text-green-700 flex items-center gap-1.5 border-green-500/30"
                        >
                            <CheckCheck size={15} /> Đã đọc hết
                        </Button>
                    )}
                </div>
            </Card>

            {/* Filter Tabs strictly by role */}
            <div className="flex flex-wrap gap-2">
                {roleTabs.map((tab) => (
                    <Button
                        key={tab.key}
                        variant={filter === tab.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(tab.key)}
                        className={`rounded-full text-xs h-8 px-3.5 font-bold transition-all ${
                            filter === tab.key
                                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                                : 'hover:border-orange-500/50'
                        }`}
                    >
                        {tab.icon && <tab.icon className="mr-1.5 h-3.5 w-3.5" />}
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Notifications List */}
            <Card className="border border-border shadow-sm overflow-hidden bg-card">
                <CardContent className="p-0 divide-y divide-border/60">
                    {filteredList.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground space-y-2">
                            <Inbox className="mx-auto h-12 w-12 text-muted-foreground/30 mb-1" />
                            <p className="text-sm font-bold text-foreground">Không có thông báo nào trong danh mục này</p>
                            <p className="text-xs text-muted-foreground">
                                Các thông báo mới sẽ xuất hiện tại đây ngay khi có hoạt động phát sinh.
                            </p>
                        </div>
                    ) : (
                        filteredList.map((item) => {
                            const isRead = item.readBy?.some((id) => String(id) === String(user._id));
                            return (
                                <div
                                    key={item._id}
                                    onClick={() => !isRead && markOneRead(item._id)}
                                    className={`p-4 sm:p-5 transition-all flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/30 ${
                                        !isRead
                                            ? 'bg-orange-500/5 font-medium border-l-4 border-l-orange-500'
                                            : 'opacity-85'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                            {getTypeIcon(item.type)}
                                        </div>

                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        item.type === 'DISH_DONE'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                                                            : item.type === 'NEW_ORDER'
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                            : item.type === 'PAYMENT'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                            : item.type === 'SHIFT'
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                                            : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                                    }`}
                                                >
                                                    {item.type === 'DISH_DONE'
                                                        ? '🍽️ Món hoàn tất'
                                                        : item.type === 'NEW_ORDER'
                                                        ? '👨‍🍳 Đơn mới'
                                                        : item.type === 'PAYMENT'
                                                        ? '💳 Thanh toán'
                                                        : item.type === 'SHIFT'
                                                        ? '📅 Ca làm'
                                                        : '📢 Quản lý'}
                                                </span>

                                                {item.sender?.name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Từ: <strong className="text-foreground">{item.sender.name}</strong>
                                                    </span>
                                                )}

                                                <span className="text-xs text-muted-foreground">
                                                    · {formatTime(item.createdAt)}
                                                </span>
                                            </div>

                                            <h3 className="text-sm sm:text-base font-bold text-foreground">
                                                {item.title}
                                            </h3>

                                            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                                                {item.message}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                        {!isRead && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markOneRead(item._id);
                                                }}
                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10 rounded-lg"
                                                title="Đánh dấu đã đọc"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {isManager && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotif(item._id);
                                                }}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                title="Xóa thông báo"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </section>
    );
}