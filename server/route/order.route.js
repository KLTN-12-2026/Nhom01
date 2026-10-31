import express from 'express';
import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import requireRole from '../middleware/roleAuth.js';
import {
    CashOnDeliveryOrderController,
    getOrderDetailsController,
    paymentController,
    getAllOrdersController,
    updateOrderStatusController,
    handleSePayWebhook,
    getPaymentStatusController,
    getPaymentDetailsController
} from '../controllers/order.controller.js';
import { cleanupCancelledPayment, cleanupByIds } from '../controllers/cancelPayment.controller.js';

const orderRouter = Router();

orderRouter.post('/cash-on-delivery', auth, CashOnDeliveryOrderController);
orderRouter.post('/checkout', auth, paymentController);
orderRouter.post('/sepay-webhook', handleSePayWebhook);
orderRouter.get('/payment-status/:paymentId', getPaymentStatusController);
orderRouter.get('/payment-details/:paymentId', getPaymentDetailsController);
orderRouter.get('/webhook-test', auth, admin, (req, res) => {
    console.log('=== WEBHOOK TEST ENDPOINT CALLED ===');
    res.json({ message: 'Webhook endpoint is working', timestamp: new Date() });
});
orderRouter.get('/order-list', auth, getOrderDetailsController);
orderRouter.get('/all-orders', auth, getAllOrdersController);
// Cleanup cancelled payments
orderRouter.post('/cleanup-cancelled', auth, cleanupCancelledPayment);
orderRouter.post('/cleanup-by-ids', auth, admin, cleanupByIds);
// Update order status
orderRouter.put('/update-status/:orderId', auth, requireRole('MANAGER', 'CASHIER'), (req, res, next) => {
    console.log('Update status route hit:', {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        body: req.body,
        user: req.userId
    });
    next();
}, updateOrderStatusController);

export default orderRouter;