import SupportChat from "../models/supportChat.model.js";

// Admin: lấy tất cả conversations, mới nhất trước
export async function getConversations(req, res) {
    try {
        const conversations = await SupportChat.find()
            .select("-messages")
            .sort({ lastMessageAt: -1 });
        return res.json({ success: true, data: conversations, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}

// Lấy 1 conversation kèm messages
export async function getConversationById(req, res) {
    try {
        const chat = await SupportChat.findOne({ conversationId: req.params.id });
        if (!chat) return res.status(404).json({ success: false, message: "Không tìm thấy", error: true });
        return res.json({ success: true, data: chat, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}

// Admin: đóng ticket
export async function closeConversation(req, res) {
    try {
        const chat = await SupportChat.findOneAndUpdate(
            { conversationId: req.params.id },
            { status: "closed" },
            { new: true }
        );
        if (!chat) return res.status(404).json({ success: false, message: "Không tìm thấy", error: true });
        return res.json({ success: true, data: chat, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}

// Admin: đánh dấu đã đọc
export async function markAsRead(req, res) {
    try {
        await SupportChat.findOneAndUpdate(
            { conversationId: req.params.id },
            { unreadByAdmin: 0 }
        );
        return res.json({ success: true, error: false });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: true });
    }
}