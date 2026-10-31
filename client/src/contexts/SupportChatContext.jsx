import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../utils/socket';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { toast } from 'react-hot-toast';

const SupportChatContext = createContext();

export const useSupportChat = () => useContext(SupportChatContext);

export const SupportChatProvider = ({ children }) => {
    const user = useSelector((state) => state.user);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastNotification, setLastNotification] = useState(null);
    const socketRef = useRef(null);

    const fetchUnreadCount = useCallback(async () => {
        if (user.role !== 'MANAGER') return;
        try {
            const res = await Axios({
                ...SummaryApi.get_support_conversations,
            });
            if (res.data?.success) {
                const total = res.data.data.reduce(
                    (sum, conv) => sum + (conv.unreadByAdmin || 0),
                    0
                );
                setUnreadCount(total);
            }
        } catch (error) {
            console.error('Error fetching unread support count:', error);
        }
    }, [user.role]);

    useEffect(() => {
        if (user.role !== 'MANAGER') return;

        fetchUnreadCount();

        const socket = getSocket();
        socketRef.current = socket;
        if (!socket.connected) socket.connect();

        socket.emit('admin:join', { adminName: user.name });

        socket.on(
            'admin:messageNotification',
            ({ customerName, lastMessage, conversationId }) => {
                // Update total unread count (this logic is simplified, better fetch or precise tracking)
                // But since we get the single unreadByAdmin for that conv, we can't easily sync total
                // without knowing the previous unread count for THAT conv.
                // So we re-fetch to be safe and accurate across sessions.
                fetchUnreadCount();

                setLastNotification({
                    customerName,
                    lastMessage,
                    conversationId,
                });

                // Show toast if not on the chat page
                if (window.location.pathname !== '/dashboard/support-chat') {
                    toast.success(
                        `Tin nhắn mới từ ${customerName}: "${lastMessage}"`,
                        {
                            duration: 4000,
                            icon: '💬',
                        }
                    );
                }
            }
        );

        socket.on('admin:newConversation', () => {
            fetchUnreadCount();
        });

        return () => {
            socket.off('admin:messageNotification');
            socket.off('admin:newConversation');
        };
    }, [user.role, user.name, fetchUnreadCount]);

    const markAllReadForConv = (count) => {
        setUnreadCount((prev) => Math.max(0, prev - count));
    };

    return (
        <SupportChatContext.Provider
            value={{
                unreadCount,
                lastNotification,
                fetchUnreadCount,
                markAllReadForConv,
            }}
        >
            {children}
        </SupportChatContext.Provider>
    );
};
