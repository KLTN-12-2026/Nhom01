import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roleAuth.js";
import {
    createTableAccountController,
    loginViaQRController,
    getTableSessionController,
    logoutTableController
} from "../controllers/tableAuth.controller.js";

const tableAuthRouter = Router();

// Public routes
tableAuthRouter.post('/login-qr', loginViaQRController);

// Protected routes (require authentication)
tableAuthRouter.post('/create-account', auth, requireRole('MANAGER'), createTableAccountController);
tableAuthRouter.get('/session', auth, getTableSessionController);
tableAuthRouter.post('/logout', auth, logoutTableController);

export default tableAuthRouter;
