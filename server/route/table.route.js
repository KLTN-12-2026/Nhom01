import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roleAuth.js";
import {
    createTableController,
    getAllTablesController,
    getTableByIdController,
    updateTableController,
    deleteTableController,
    updateTableStatusController,
    getAvailableTablesController
} from "../controllers/table.controller.js";
import {
    generateQRCodeController,
    getQRCodeController
} from "../controllers/tableQR.controller.js";

const tableRouter = Router();

tableRouter.post('/create', auth, requireRole('MANAGER'), createTableController);
tableRouter.get('/get-all', getAllTablesController);
tableRouter.get('/get/:id', getTableByIdController);
tableRouter.put('/update', auth, requireRole('MANAGER'), updateTableController);
tableRouter.delete('/delete', auth, requireRole('MANAGER'), deleteTableController);
tableRouter.patch('/update-status', auth, requireRole('MANAGER', 'WAITER'), updateTableStatusController);
tableRouter.get('/available', getAvailableTablesController);

// QR Code routes
tableRouter.post('/generate-qr', auth, requireRole('MANAGER'), generateQRCodeController);
tableRouter.get('/qr/:id', getQRCodeController);

export default tableRouter;
