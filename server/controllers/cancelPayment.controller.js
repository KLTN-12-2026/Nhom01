import OrderModel from '../models/order.model.js';
import BookingModel from '../models/booking.model.js';

// Clean up cancelled payment - delete pending orders/bookings
export async function cleanupCancelledPayment(request, response) {
    try {
        const { sessionId } = request.body;
        const userId = request.userId;

        if (!userId) {
            return response.status(401).json({
                message: "Yêu cầu xác thực",
                error: true,
                success: false
            });
        }

        if (!sessionId) {
            return response.status(400).json({
                message: "Session ID is required",
                error: true,
                success: false
            });
        }

        // Find orders with this session ID that are still pending
        const pendingOrders = await OrderModel.find({
            $or: [
                { invoice_receipt: sessionId },
                { paymentId: sessionId }
            ],
            payment_status: { $in: ['pending', 'Chờ thanh toán'] },
            userId
        });

        // Find bookings with this session ID that are still pending
        const pendingBookings = await BookingModel.find({
            paymentIntentId: sessionId,
            depositPaid: false,
            status: 'pending',
            userId
        });

        // Delete pending orders
        if (pendingOrders.length > 0) {
            const orderIds = pendingOrders.map(o => o._id);
            await OrderModel.deleteMany({ _id: { $in: orderIds } });
            console.log(`Deleted ${orderIds.length} cancelled orders`);
        }

        // Delete pending bookings
        if (pendingBookings.length > 0) {
            const bookingIds = pendingBookings.map(b => b._id);
            await BookingModel.deleteMany({ _id: { $in: bookingIds } });
            console.log(`Deleted ${bookingIds.length} cancelled bookings`);
        }

        return response.status(200).json({
            message: "Cleanup completed",
            data: {
                ordersDeleted: pendingOrders.length,
                bookingsDeleted: pendingBookings.length
            },
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

// Alternative: Clean up by order/booking IDs from metadata
export async function cleanupByIds(request, response) {
    try {
        const { orderIds, bookingIds } = request.body;

        let ordersDeleted = 0;
        let bookingsDeleted = 0;

        // Delete orders if provided
        if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
            const result = await OrderModel.deleteMany({
                _id: { $in: orderIds },
                payment_status: { $in: ['pending', 'Chờ thanh toán'] }
            });
            ordersDeleted = result.deletedCount;
            console.log(`Deleted ${ordersDeleted} cancelled orders`);
        }

        // Delete bookings if provided
        if (bookingIds && Array.isArray(bookingIds) && bookingIds.length > 0) {
            const result = await BookingModel.deleteMany({
                _id: { $in: bookingIds },
                depositPaid: false,
                status: 'pending'
            });
            bookingsDeleted = result.deletedCount;
            console.log(`Deleted ${bookingsDeleted} cancelled bookings`);
        }

        return response.status(200).json({
            message: "Cleanup completed",
            data: {
                ordersDeleted,
                bookingsDeleted
            },
            error: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}
