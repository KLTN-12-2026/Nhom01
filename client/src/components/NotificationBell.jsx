import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
    Bell,
    Check,
    ExternalLink,
    Volume2,
    VolumeX,
    ChefHat,
    Utensils,
    CreditCard,
    Calendar,
    Megaphone,
    CheckCheck
} from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';
import { formatTime } from '../utils/shiftTime';

// Simple synthesized beep / chime using Web Audio API
function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        // AudioContext might be blocked until user gesture, ignore
    }
}

export default function NotificationBell() {
    const user = useSelector((state) => state.user);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' or 'UNREAD'
    const dropdownRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        if (!user?._id) return;
        try {
            const res = await Axios({
                ...SummaryApi.get_my_notifications
            });
            if (res.data.success) {
                setNotifications(res.data.data.items || []);
                setUnreadCount(res.data.data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Socket real-time listeners
    useEffect(() => {
        if (!user?._id) return;

        const socket = getSocket();
        if (!socket.connected) {
            socket.connect();
        }

        socket.emit('user:register', { userId: user._id, role: user.role });

        const handleNewNotification = (notification) => {
            // Strict role guard on incoming socket notification
            if (user.role === 'USER' && ['SHIFT', 'DISH_DONE', 'NEW_ORDER'].includes(notification.type)) {
                return;
            }
            if (user.role === 'CHEF' && ['DISH_DONE', 'PAYMENT'].includes(notification.type)) {
                return;
            }
            if (['WAITER', 'CASHIER'].includes(user.role) && notification.type === 'NEW_ORDER') {
                return;
            }

            if (soundEnabled) playNotificationSound();
            toast((t) => (
                <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-orange-600">🔔 {notification.title}</span>
                    <span className="text-foreground/80">{notification.message}</span>
                </div>
            ), { duration: 5000 });
            fetchNotifications();
        };

        const handleDishReady = (data) => {
            if (['WAITER', 'CASHIER', 'MANAGER'].includes(user.role)) {
                if (soundEnabled) playNotificationSound();
                toast.success(`🍽️ BÀN ${data.tableNumber}: Món "${data.dishName}" đã nấu xong! Vui lòng bưng ra phục vụ.`, {
                    duration: 7000,
                    icon: '🚀'
                });
                fetchNotifications();
            }
        };

        const handleKitchenNewOrder = (data) => {
            if (['CHEF', 'MANAGER'].includes(user.role)) {
                if (soundEnabled) playNotificationSound();
                toast(`🍳 Bàn ${data.tableNumber} vừa có món mới cần nấu!`, {
                    icon: '👨‍🍳',
                    duration: 6000
                });
                fetchNotifications();
            }
        };

        socket.on('notification:new', handleNewNotification);
        socket.on('dish:ready', handleDishReady);
        socket.on('kitchen:new_order', handleKitchenNewOrder);

        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('dish:ready', handleDishReady);
            socket.off('kitchen:new_order', handleKitchenNewOrder);
        };
    }, [user?._id, user?.role, soundEnabled, fetchNotifications]);

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = async () => {
        try {
            await Axios({ ...SummaryApi.mark_all_notifications_read });
            setUnreadCount(0);
            setNotifications((prev) =>
                prev.map((n) => ({
                    ...n,
                    readBy: [...(n.readBy || []), user._id]
                }))
            );
            toast.success('Đã đánh dấu tất cả là đã đọc');
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const markOneRead = async (id) => {
        try {
            await Axios({
                url: SummaryApi.mark_notification_read.url.replace(':id', id),
                method: SummaryApi.mark_notification_read.method
            });
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, readBy: [...(n.readBy || []), user._id] } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (error) {
            console.error('Error marking read:', error);
        }
    };

    if (!user?._id) return null;

    // Strict role-level filtering for dropdown list
    const displayNotifications = notifications.filter((item) => {
        if (user.role === 'USER') {
            return !['SHIFT', 'DISH_DONE', 'NEW_ORDER'].includes(item.type);
        }
        if (user.role === 'CHEF') {
            return !['DISH_DONE', 'PAYMENT'].includes(item.type);
        }
        if (['WAITER', 'CASHIER'].includes(user.role)) {
            return item.type !== 'NEW_ORDER';
        }
        return true;
    });

    const unreadNotifications = displayNotifications.filter(
        (n) => !n.readBy?.some((id) => String(id) === String(user._id))
    );

    const effectiveUnread = unreadNotifications.length;

    const listToShow = activeTab === 'UNREAD' ? unreadNotifications : displayNotifications;

    const getTypeIcon = (type) => {
        switch (type) {
            case 'DISH_DONE':
                return <Utensils size={14} className="text-green-600" />;
            case 'NEW_ORDER':
                return <ChefHat size={14} className="text-amber-600" />;
            case 'PAYMENT':
                return <CreditCard size={14} className="text-blue-600" />;
            case 'SHIFT':
                return <Calendar size={14} className="text-purple-600" />;
            default:
                return <Megaphone size={14} className="text-orange-600" />;
        }
    };

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                title="Hộp thông báo"
            >
                <Bell className="h-5 w-5" />
                {effectiveUnread > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow ring-2 ring-background">
                        {effectiveUnread > 9 ? '9+' : effectiveUnread}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden text-card-foreground animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">Thông báo</span>
                            {effectiveUnread > 0 && (
                                <span className="bg-red-500/15 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">
                                    {effectiveUnread} mới
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
                                title={soundEnabled ? 'Tắt âm báo' : 'Bật âm báo'}
                            >
                                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-red-400" />}
                            </button>
                            {effectiveUnread > 0 && (
                                <button
                                    type="button"
                                    onClick={markAllRead}
                                    className="text-xs text-orange-600 hover:underline flex items-center gap-1 font-bold pl-1"
                                    title="Đánh dấu tất cả là đã đọc"
                                >
                                    <CheckCheck size={14} /> Đã đọc hết
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex border-b border-border bg-muted/20 px-3 py-1.5 gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setActiveTab('ALL')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                activeTab === 'ALL'
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Tất cả ({displayNotifications.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('UNREAD')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                activeTab === 'UNREAD'
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Chưa đọc ({effectiveUnread})
                        </button>
                    </div>

                    {/* Notification Items List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                        {listToShow.length === 0 ? (
                            <div className="py-10 text-center text-xs text-muted-foreground space-y-1">
                                <Bell className="mx-auto h-6 w-6 text-muted-foreground/30 mb-1" />
                                <p className="font-semibold">Không có thông báo nào</p>
                            </div>
                        ) : (
                            listToShow.slice(0, 8).map((item) => {
                                const isRead = item.readBy?.some((id) => String(id) === String(user._id));
                                return (
                                    <div
                                        key={item._id}
                                        onClick={() => !isRead && markOneRead(item._id)}
                                        className={`p-3 text-xs cursor-pointer hover:bg-muted/40 transition-colors flex items-start gap-2.5 ${
                                            !isRead ? 'bg-orange-500/5 font-medium border-l-4 border-l-orange-500' : 'opacity-85'
                                        }`}
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                            {getTypeIcon(item.type)}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="font-bold text-[11px] text-foreground truncate">
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                    {formatTime(item.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                {item.message}
                                            </p>
                                        </div>

                                        {!isRead && (
                                            <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border p-2.5 bg-muted/20 text-center">
                        <Link
                            to="/dashboard/notifications"
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-orange-600 hover:underline font-bold inline-flex items-center gap-1"
                        >
                            Xem toàn bộ hộp thông báo <ExternalLink size={12} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}