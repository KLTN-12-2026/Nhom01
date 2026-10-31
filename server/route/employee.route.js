import { Router } from "express";
import auth from "../middleware/auth.js";
import requireRole from "../middleware/roleAuth.js";
import {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeesByRole
} from "../controllers/employee.controller.js";

const employeeRouter = Router();

// Get all employees (Manager only)
employeeRouter.get('/all', auth, requireRole('MANAGER'), getAllEmployees);

// Get employee by ID (Manager only)
employeeRouter.get('/:id', auth, requireRole('MANAGER'), getEmployeeById);

// Create new employee (Manager only)
employeeRouter.post('/create', auth, requireRole('MANAGER'), createEmployee);

// Update employee (Manager only)
employeeRouter.put('/update/:id', auth, requireRole('MANAGER'), updateEmployee);

// Delete employee (Manager only)
employeeRouter.delete('/delete/:id', auth, requireRole('MANAGER'), deleteEmployee);

// Get employees by role (Manager only)
employeeRouter.get('/role/:role', auth, requireRole('MANAGER'), getEmployeesByRole);

export default employeeRouter;
