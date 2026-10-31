import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    sendNotification,
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notification.controller.js";

const notificationRouter = Router();

notificationRouter.post("/send", auth, sendNotification);
notificationRouter.get("/my", auth, getMyNotifications);
notificationRouter.put("/read/:id", auth, markAsRead);
notificationRouter.put("/read-all", auth, markAllAsRead);
notificationRouter.delete("/delete/:id", auth, deleteNotification);

export default notificationRouter;
