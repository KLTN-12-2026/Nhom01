import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    addItemsToTableOrder,
    getCurrentTableOrder,
    checkoutTableOrder,
    cancelTableOrder,
    getAllActiveTableOrders,
    staffAddItemsToTableOrder,
    endTableOrder,
    confirmTableOrderPayment,
    getKitchenItems,
    updateKitchenItemStatus,
    getCustomerActiveDishes
} from '../controllers/tableOrder.controller.js';

const tableOrderRouter = Router();

// Table app / QR scan
tableOrderRouter.post('/add-items', auth, addItemsToTableOrder);
tableOrderRouter.get('/current', auth, getCurrentTableOrder);
tableOrderRouter.post('/checkout', auth, checkoutTableOrder);
tableOrderRouter.post('/cancel', auth, cancelTableOrder);

// Staff operations (Waiter / Cashier / Manager)
tableOrderRouter.get('/all-active', auth, getAllActiveTableOrders);
tableOrderRouter.post('/staff-add-items', auth, staffAddItemsToTableOrder);
tableOrderRouter.post('/end-order', auth, endTableOrder);
tableOrderRouter.post('/confirm-payment', auth, confirmTableOrderPayment);

// Kitchen operations (Chef / Manager)
tableOrderRouter.get('/kitchen/items', auth, getKitchenItems);
tableOrderRouter.put('/kitchen/item-status', auth, updateKitchenItemStatus);

// Customer dish tracking
tableOrderRouter.get('/customer/active-dishes', auth, getCustomerActiveDishes);

export default tableOrderRouter;
