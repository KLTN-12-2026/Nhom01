import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    createBookingController,
    getAllBookingsController,
    getBookingByIdController,
    updateBookingController,
    cancelBookingController,
    confirmBookingController,
    getAvailableTablesForBookingController,
    getCustomerBookingsController,
    createBookingPaymentSession,
    getBookingReportData
} from "../controllers/booking.controller.js";
import {
    createBookingWithPreOrder,
    getBookingWithPreOrder,
    createBookingWithPreOrderPayment
} from "../controllers/bookingWithPreOrder.controller.js";

const bookingRouter = Router();

bookingRouter.post('/create', createBookingController);
bookingRouter.get('/get-all', auth, getAllBookingsController);
bookingRouter.get('/get/:id', getBookingByIdController);
bookingRouter.put('/update', auth, updateBookingController);
bookingRouter.delete('/cancel', cancelBookingController);
bookingRouter.patch('/confirm', auth, confirmBookingController);
bookingRouter.post('/available-tables', getAvailableTablesForBookingController);
bookingRouter.post('/customer-bookings', getCustomerBookingsController);
bookingRouter.post('/create-payment-session', createBookingPaymentSession);

// Booking with pre-order routes
bookingRouter.post('/create-with-preorder', createBookingWithPreOrder);
bookingRouter.get('/get-with-preorder/:id', getBookingWithPreOrder);
bookingRouter.post('/create-preorder-payment-session', createBookingWithPreOrderPayment);

// Report route
bookingRouter.get('/report', auth, getBookingReportData);

export default bookingRouter;
