import { Router } from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleAuth.js';
import {
    addVoucerController, bulkDeleteVouchersController,
    bulkUpdateVouchersStatusController, deleteVoucherController,
    getAllVoucherController, updateVoucherController,
    getAvailableVouchersController,
    applyVoucherController,
    getBestVoucherController,
    getVoucherOverviewController,
    getTopVouchersController,
    getUsageTrendController
} from '../controllers/voucher.controller.js';

const voucherRouter = Router()

voucherRouter.post('/add-voucher', auth, requireRole('MANAGER'), addVoucerController)
voucherRouter.get('/get-all-voucher', getAllVoucherController)
voucherRouter.put('/update-voucher', auth, requireRole('MANAGER'), updateVoucherController)
voucherRouter.delete('/delete-voucher', auth, requireRole('MANAGER'), deleteVoucherController)
voucherRouter.delete('/bulk-delete-vouchers', auth, requireRole('MANAGER'), bulkDeleteVouchersController)
voucherRouter.put('/bulk-update-vouchers-status', auth, requireRole('MANAGER'), bulkUpdateVouchersStatusController)

// Get available vouchers for checkout
voucherRouter.post('/available', getAvailableVouchersController)

// Apply a voucher
voucherRouter.post('/apply', applyVoucherController)

// Get best voucher combination
voucherRouter.post('/best', getBestVoucherController)

// Analytics routes (Manager only)
voucherRouter.get('/analytics/overview', auth, requireRole('MANAGER'), getVoucherOverviewController)
voucherRouter.get('/analytics/top-vouchers', auth, requireRole('MANAGER'), getTopVouchersController)
voucherRouter.get('/analytics/usage-trend', auth, requireRole('MANAGER'), getUsageTrendController)

export default voucherRouter
