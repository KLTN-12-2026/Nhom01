import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/connectDB.js";
import userRouter from "./route/user.route.js";
import categoryRouter from "./route/category.route.js";
import subCategoryRouter from "./route/subCategory.route.js";
import uploadRouter from "./route/upload.route.js";
import productRouter from "./route/product.route.js";
import cartRouter from "./route/cart.route.js";
import orderRouter from './route/order.route.js';
import voucherRouter from './route/voucher.route.js';
import tableRouter from './route/table.route.js';
import bookingRouter from './route/booking.route.js';
import employeeRouter from './route/employee.route.js';
import shiftRouter from './route/shift.route.js';
import attendanceRouter from './route/attendance.route.js';
import performanceRouter from './route/performance.route.js';
import tableAuthRouter from './route/tableAuth.route.js';
import tableOrderRouter from './route/tableOrder.route.js';
import chatRouter from './route/chat.route.js';
import supportChatRouter from './route/supportChat.route.js';
import notificationRouter from './route/notification.route.js';
import reviewRouter from './route/review.route.js';
import { registerSupportChatSocket } from "./socket/supportChat.socket.js";
import { initAppSocket } from "./socket/appSocket.js";

const app = express();
const httpServer = http.createServer(app);

// Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
registerSupportChatSocket(io);
initAppSocket(io);

app.use(
    cors({
        credentials: true,
        origin: process.env.FRONTEND_URL,
    }),
);

app.use(express.json());

app.use(cookieParser());
app.use(morgan('dev'));
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    }),
);

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
    res.json({ message: "Server is running " + PORT });
});

app.use('/api/user', userRouter);
app.use('/api/category', categoryRouter);
app.use('/api/sub-category', subCategoryRouter);
app.use('/api/file', uploadRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/voucher', voucherRouter);
app.use('/api/table', tableRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/shift', shiftRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/table-auth', tableAuthRouter);
app.use('/api/table-order', tableOrderRouter);
app.use('/api/chat', chatRouter);
app.use('/api/support', supportChatRouter);
app.use('/api/notification', notificationRouter);
app.use('/api/review', reviewRouter);

connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log("Server is running", PORT);
    });
});