import { Router } from "express";
import auth from "../middleware/auth.js";
import { staffOnly } from "../middleware/shiftAccess.js";
import requireRole from "../middleware/roleAuth.js";
import {
    getPerformanceStats,
    getTeamPerformance,
    updatePerformanceMetrics
} from "../controllers/performance.controller.js";

const performanceRouter = Router();
performanceRouter.use(auth, staffOnly);

// Get employee performance stats (Employee can view own, Manager can view all)
performanceRouter.get('/employee/:employeeId', auth, getPerformanceStats);

// Get team performance (Manager only)
performanceRouter.get('/team', auth, requireRole('MANAGER'), getTeamPerformance);

// Update performance metrics (System/Internal use)
performanceRouter.post('/update', auth, requireRole('MANAGER'), updatePerformanceMetrics);

export default performanceRouter;
