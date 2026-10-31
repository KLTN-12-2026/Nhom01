import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: { type: String, required: true }, // userId or guestId
        senderName: { type: String, required: true },
        senderRole: { type: String, enum: ["customer", "admin"], required: true },
        text: { type: String, required: true },
    },
    { timestamps: true }
);

const supportChatSchema = new mongoose.Schema(
    {
        conversationId: { type: String, unique: true, required: true },
        customerName: { type: String, required: true },
        customerId: { type: String }, // null if guest
        messages: [messageSchema],
        status: { type: String, enum: ["open", "closed"], default: "open" },
        unreadByAdmin: { type: Number, default: 0 },
        lastMessage: { type: String, default: "" },
        lastMessageAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const SupportChat = mongoose.model("SupportChat", supportChatSchema);
export default SupportChat;