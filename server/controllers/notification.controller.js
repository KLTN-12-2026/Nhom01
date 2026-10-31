import NotificationModel from "../models/notification.model.js";
import UserModel from "../models/user.model.js";
import { emitNotification } from "../socket/appSocket.js";

// Manager sends notification/announcement
export async function sendNotification(request, response) {
    try {
        const userId = request.userId;
        const sender = await UserModel.findById(userId);

        if (!sender || sender.role !== 'MANAGER') {
            return response.status(403).json({
                message: "Chỉ quản lý mới có quyền tạo thông báo",
                error: true,
                success: false
            });
        }

        const { title, message, targetRole = 'ALL', recipientId = null, type = 'ANNOUNCEMENT' } = request.body;

        if (!title || !message) {
            return response.status(400).json({
                message: "Vui lòng nhập tiêu đề và nội dung thông báo",
                error: true,
                success: false
            });
        }

        let targetRoleToSave = targetRole;
        if (recipientId) {
            const recipientUser = await UserModel.findById(recipientId);
            if (!recipientUser) {
                return response.status(404).json({
                    message: "Không tìm thấy nhân viên nhận thông báo",
                    error: true,
                    success: false
                });
            }
            targetRoleToSave = recipientUser.role;
        }

        let notificationData = {
            title,
            message,
            type,
            sender: userId,
            targetRole: targetRoleToSave,
            recipient: recipientId || null,
            readBy: []
        };

        const newNotification = await NotificationModel.create(notificationData);
        const populatedNotification = await NotificationModel.findById(newNotification._id)
            .populate('sender', 'name role avatar')
            .populate('recipient', 'name role email');

        // Emit realtime socket event
        emitNotification(populatedNotification);

        return response.status(200).json({
            message: "Gửi thông báo thành công",
            error: false,
            success: true,
            data: populatedNotification
        });
    } catch (error) {
        console.error("Error sending notification:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi gửi thông báo",
            error: true,
            success: false
        });
    }
}

// Helper to build strict role-based notification query
export function buildNotificationQuery(user) {
    const userId = user._id;

    if (user.role === 'USER') {
        // Khách hàng CHỈ nhận:
        // 1. Thông báo gửi đích danh cho mình (recipient === userId)
        // 2. Thông báo chung toàn hệ thống/khách hàng (targetRole: ALL/USER)
        // TUYỆT ĐỐI KHÔNG nhận thông báo nội bộ: SHIFT, DISH_DONE, NEW_ORDER
        return {
            $and: [
                {
                    $or: [
                        { recipient: userId },
                        { targetRole: { $in: ['ALL', 'USER'] }, recipient: null }
                    ]
                },
                {
                    type: { $nin: ['SHIFT', 'DISH_DONE', 'NEW_ORDER'] }
                }
            ]
        };
    }

    if (user.role === 'CHEF') {
        // Đầu bếp nhận: Đơn mới vào bếp, ca làm của mình, thông báo từ quản lý
        return {
            $and: [
                {
                    $or: [
                        { recipient: userId },
                        { targetRole: { $in: ['ALL', 'ALL_STAFF', 'CHEF'] }, recipient: null }
                    ]
                },
                {
                    type: { $in: ['NEW_ORDER', 'SHIFT', 'ANNOUNCEMENT', 'GENERAL'] }
                }
            ]
        };
    }

    if (['WAITER', 'CASHIER'].includes(user.role)) {
        // Phục vụ & Thu ngân nhận: Món hoàn tất bưng ra khách, hóa đơn thanh toán, ca làm, thông báo quản lý
        return {
            $and: [
                {
                    $or: [
                        { recipient: userId },
                        { targetRole: { $in: ['ALL', 'ALL_STAFF', 'STAFF', 'WAITER', 'CASHIER', user.role] }, recipient: null }
                    ]
                },
                {
                    type: { $in: ['DISH_DONE', 'PAYMENT', 'SHIFT', 'ANNOUNCEMENT', 'GENERAL'] }
                }
            ]
        };
    }

    // MANAGER thấy toàn bộ thông báo (bao gồm thông báo do mình gửi đi)
    return {
        $or: [
            { sender: userId },
            { recipient: userId },
            { targetRole: { $in: ['ALL', 'ALL_STAFF', 'STAFF', 'WAITER', 'CASHIER', 'CHEF', 'MANAGER'] } }
        ]
    };
}

// Get notifications for current user
export async function getMyNotifications(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user) {
            return response.status(401).json({
                message: "Người dùng không tồn tại",
                error: true,
                success: false
            });
        }

        const query = buildNotificationQuery(user);

        const notifications = await NotificationModel.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('sender', 'name role avatar')
            .populate('recipient', 'name role email');

        // Calculate unread count
        const unreadCount = notifications.filter(n => !n.readBy.some(id => String(id) === String(userId))).length;

        return response.status(200).json({
            message: "Lấy thông báo thành công",
            error: false,
            success: true,
            data: {
                items: notifications,
                unreadCount
            }
        });
    } catch (error) {
        console.error("Error getting notifications:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi lấy thông báo",
            error: true,
            success: false
        });
    }
}

// Mark single notification as read
export async function markAsRead(request, response) {
    try {
        const userId = request.userId;
        const { id } = request.params;

        await NotificationModel.findByIdAndUpdate(id, {
            $addToSet: { readBy: userId }
        });

        return response.status(200).json({
            message: "Đã đánh dấu đã đọc",
            error: false,
            success: true
        });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return response.status(500).json({
            message: error.message || "Lỗi cập nhật thông báo",
            error: true,
            success: false
        });
    }
}

// Mark all notifications as read
export async function markAllAsRead(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user) {
            return response.status(401).json({
                message: "Không tìm thấy người dùng",
                error: true,
                success: false
            });
        }

        const query = buildNotificationQuery(user);

        await NotificationModel.updateMany({
            ...query,
            readBy: { $ne: userId }
        }, {
            $addToSet: { readBy: userId }
        });

        return response.status(200).json({
            message: "Đã đánh dấu tất cả thông báo là đã đọc",
            error: false,
            success: true
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        return response.status(500).json({
            message: error.message || "Lỗi cập nhật thông báo",
            error: true,
            success: false
        });
    }
}

// Delete notification (Manager)
export async function deleteNotification(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || user.role !== 'MANAGER') {
            return response.status(403).json({
                message: "Không có quyền xóa thông báo",
                error: true,
                success: false
            });
        }

        const { id } = request.params;
        await NotificationModel.findByIdAndDelete(id);

        return response.status(200).json({
            message: "Đã xóa thông báo",
            error: false,
            success: true
        });
    } catch (error) {
        console.error("Error deleting notification:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi xóa thông báo",
            error: true,
            success: false
        });
    }
}
