let ioInstance = null;

export function initAppSocket(io) {
    ioInstance = io;

    io.on("connection", (socket) => {
        // User registers their identity to join personal & role rooms
        socket.on("user:register", ({ userId, role }) => {
            if (userId) {
                socket.join(`user:${userId}`);
            }
            if (role) {
                socket.join(`role:${role}`);
                // Combine WAITER and CASHIER into STAFF room as well
                if (['WAITER', 'CASHIER'].includes(role)) {
                    socket.join('role:STAFF');
                }
                if (role === 'MANAGER') {
                    socket.join('role:MANAGEMENT');
                }
                // Only restaurant staff and management join all_staff (exclude USER)
                if (['MANAGER', 'WAITER', 'CASHIER', 'CHEF'].includes(role)) {
                    socket.join('all_staff');
                }
            }
        });

        // Table join room
        socket.on("table:join", ({ tableNumber, tableId }) => {
            if (tableNumber) socket.join(`table:${tableNumber}`);
            if (tableId) socket.join(`tableId:${tableId}`);
        });
    });
}

export function getIO() {
    return ioInstance;
}

export function emitNotification(notification) {
    if (!ioInstance) return;

    // Handle recipient whether it's a populated object or a raw ObjectId/string
    const recipientId = notification.recipient?._id
        ? String(notification.recipient._id)
        : (notification.recipient ? String(notification.recipient) : null);

    if (recipientId) {
        // Direct to specific user
        ioInstance.to(`user:${recipientId}`).emit("notification:new", notification);
        // Also inform sender if different
        const senderId = notification.sender?._id
            ? String(notification.sender._id)
            : (notification.sender ? String(notification.sender) : null);
        if (senderId && senderId !== recipientId) {
            ioInstance.to(`user:${senderId}`).emit("notification:sent", notification);
        }
    } else if (notification.targetRole) {
        if (notification.targetRole === 'ALL') {
            ioInstance.emit("notification:new", notification);
        } else if (notification.targetRole === 'ALL_STAFF') {
            ioInstance.to("all_staff").emit("notification:new", notification);
        } else if (notification.targetRole === 'STAFF') {
            ioInstance.to("role:STAFF").to("role:WAITER").to("role:CASHIER").to("role:MANAGEMENT").emit("notification:new", notification);
        } else if (notification.targetRole === 'CHEF') {
            ioInstance.to("role:CHEF").to("role:MANAGEMENT").emit("notification:new", notification);
        } else {
            ioInstance.to(`role:${notification.targetRole}`).emit("notification:new", notification);
        }
    } else {
        ioInstance.emit("notification:new", notification);
    }
}

export function emitKitchenNewOrder(orderData) {
    if (!ioInstance) return;
    ioInstance.to("role:CHEF").to("role:MANAGER").emit("kitchen:new_order", orderData);
}

export function emitDishReady(dishData) {
    if (!ioInstance) return;
    ioInstance.to("role:STAFF").to("role:WAITER").to("role:CASHIER").to("role:MANAGER").emit("dish:ready", dishData);
}

export function emitTableOrderUpdated(orderData) {
    if (!ioInstance) return;
    ioInstance.emit("table_order:updated", orderData);
    if (orderData?.tableNumber) {
        ioInstance.to(`table:${orderData.tableNumber}`).emit("table:order_status", orderData);
    }
}
