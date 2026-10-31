import { Router } from "express";
import {
    getConversations,
    getConversationById,
    closeConversation,
    markAsRead,
} from "../controllers/supportChat.controller.js";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roleAuth.js";

const supportChatRouter = Router();

supportChatRouter.get("/conversations", auth, requireRole('MANAGER'), getConversations);
supportChatRouter.get("/conversations/:id", auth, requireRole('MANAGER'), getConversationById);
supportChatRouter.patch("/conversations/:id/close", auth, requireRole('MANAGER'), closeConversation);
supportChatRouter.patch("/conversations/:id/read", auth, requireRole('MANAGER'), markAsRead);

export default supportChatRouter;