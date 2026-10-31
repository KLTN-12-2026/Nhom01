import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import SupportChat from "../models/supportChat.model.js";
import { v4 as uuidv4 } from "uuid";

// admin socket id để broadcast notification
const adminSockets = new Set();

// Authenticate privileged socket actions from HTTP-only cookies or Socket.IO handshake auth.
async function authorizeAdmin(socket) {
    try {
        const cookie = socket.handshake.headers.cookie || "";
        const accessCookie = cookie.split(";").map(part => part.trim()).find(part => part.startsWith("accessToken="));
        const token = socket.handshake.auth?.token || (accessCookie ? decodeURIComponent(accessCookie.slice("accessToken=".length)) : null);
        if (!token || !process.env.SECRET_KEY_ACCESS_TOKEN) return false;
        const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);
        const user = await UserModel.findById(decoded.id || decoded._id).select("role");
        return Boolean(user && user.role === "MANAGER");
    } catch {
        return false;
    }
}

export function registerSupportChatSocket(io) {
    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // ─── CUSTOMER ────────────────────────────────────────────────────────
        // Khách hàng tham gia (hoặc tiếp tục) hội thoại
        socket.on("customer:join", async ({ conversationId, customerName, customerId }) => {
            try {
                let conversationIdToUse = conversationId;

                // Tạo conversation mới nếu chưa có
                if (!conversationIdToUse) {
                    conversationIdToUse = uuidv4();
                    await SupportChat.create({
                        conversationId: conversationIdToUse,
                        customerName: customerName || "Khách vãng lai",
                        customerId: customerId || null,
                        messages: [],
                    });
                    console.log(`[Socket] New conversation: ${conversationIdToUse}`);
                }

                socket.join(conversationIdToUse);
                socket.conversationId = conversationIdToUse;
                socket.customerName = customerName;

                // Gửi lại conversationId và lịch sử chat cho client
                const chat = await SupportChat.findOne({ conversationId: conversationIdToUse });
                socket.emit("conversation:joined", {
                    conversationId: conversationIdToUse,
                    messages: chat?.messages || [],
                    status: chat?.status || "open",
                });

                // Notify admin có conversation mới
                io.to("admin_room").emit("admin:newConversation", {
                    conversationId: conversationIdToUse,
                    customerName: customerName || "Khách vãng lai",
                    lastMessage: "",
                });
            } catch (err) {
                console.error("[Socket] customer:join error:", err);
                socket.emit("error", { message: "Không thể kết nối hỗ trợ" });
            }
        });

        // Khách hàng gửi tin nhắn
        socket.on("customer:message", async ({ conversationId, text, senderName }) => {
            try {
                if (!text?.trim() || !conversationId) return;

                const newMsg = {
                    sender: socket.id,
                    senderName: senderName || "Khách",
                    senderRole: "customer",
                    text: text.trim(),
                    createdAt: new Date(),
                };

                const chat = await SupportChat.findOneAndUpdate(
                    { conversationId, status: "open" },
                    {
                        $push: { messages: newMsg },
                        $inc: { unreadByAdmin: 1 },
                        lastMessage: text.trim(),
                        lastMessageAt: new Date(),
                    },
                    { new: true }
                );

                if (!chat) {
                    socket.emit("error", { message: "Hội thoại đã đóng hoặc không tồn tại" });
                    return;
                }

                const savedMsg = chat.messages[chat.messages.length - 1];
                // Broadcast cho cả room (admin + customer)
                io.to(conversationId).emit("message:new", savedMsg);
                // Notify admin panel về tin nhắn mới
                io.to("admin_room").emit("admin:messageNotification", {
                    conversationId,
                    customerName: chat.customerName,
                    lastMessage: text.trim(),
                    unreadByAdmin: chat.unreadByAdmin,
                });
            } catch (err) {
                console.error("[Socket] customer:message error:", err);
            }
        });

        // ─── ADMIN ───────────────────────────────────────────────────────────
        // Admin join room quản lý
        socket.on("admin:join", async ({ adminName } = {}) => {
            if (!await authorizeAdmin(socket)) return socket.emit("error", { message: "Không có quyền quản trị" });
            socket.join("admin_room");
            adminSockets.add(socket.id);
            socket.isAdmin = true;
            socket.adminName = adminName || "Admin";
            console.log(`[Socket] Admin joined: ${socket.id}`);
            socket.emit("admin:joined", { message: "Đã kết nối admin panel" });
        });

        // Admin join vào 1 conversation cụ thể để reply
        socket.on("admin:joinConversation", async ({ conversationId }) => {
            if (!await authorizeAdmin(socket)) return socket.emit("error", { message: "Không có quyền quản trị" });
            if (!conversationId) return;
            socket.join(conversationId);
            socket.currentConversationId = conversationId;
        });

        // Admin gửi tin nhắn
        socket.on("admin:message", async ({ conversationId, text, adminName }) => {
            try {
                if (!text?.trim() || !conversationId) return;
                if (!await authorizeAdmin(socket)) return socket.emit("error", { message: "Không có quyền quản trị" });

                const newMsg = {
                    sender: socket.id,
                    senderName: adminName || "Admin",
                    senderRole: "admin",
                    text: text.trim(),
                    createdAt: new Date(),
                };

                const chat = await SupportChat.findOneAndUpdate(
                    { conversationId, status: "open" },
                    {
                        $push: { messages: newMsg },
                        lastMessage: text.trim(),
                        lastMessageAt: new Date(),
                    },
                    { new: true }
                );

                if (!chat) {
                    socket.emit("error", { message: "Hội thoại đã đóng hoặc không tồn tại" });
                    return;
                }

                const savedMsg = chat.messages[chat.messages.length - 1];
                io.to(conversationId).emit("message:new", savedMsg);
            } catch (err) {
                console.error("[Socket] admin:message error:", err);
            }
        });

        // Admin đóng ticket qua socket
        socket.on("admin:closeConversation", async ({ conversationId }) => {
            try {
                if (!await authorizeAdmin(socket)) return socket.emit("error", { message: "Không có quyền quản trị" });
                await SupportChat.findOneAndUpdate({ conversationId }, { status: "closed" });
                io.to(conversationId).emit("conversation:closed");
                console.log(`[Socket] Conversation closed: ${conversationId}`);
            } catch (err) {
                console.error("[Socket] admin:closeConversation error:", err);
            }
        });

        // ─── DISCONNECT ──────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            adminSockets.delete(socket.id);
            console.log(`[Socket] Disconnected: ${socket.id}`);
        });
    });
}