import bcryptjs from 'bcryptjs';
import UserModel from "../models/user.model.js";

/**
 * Get all employees (Manager only)
 */
export const getAllEmployees = async (req, res) => {
    try {
        const employees = await UserModel.find({
            role: { $in: ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'] }
        })
            .select('-password -refresh_token -forgot_password_otp')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Lấy danh sách nhân viên thành công",
            data: employees,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await UserModel.findById(id)
            .select('-password -refresh_token -forgot_password_otp');

        if (!employee) {
            return res.status(404).json({
                message: "Không tìm thấy nhân viên",
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: "Lấy thông tin nhân viên thành công",
            data: employee,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

/**
 * Create new employee (Admin/Manager only)
 */
/**
 * Create new employee (Admin/Manager only)
 */
export const createEmployee = async (req, res) => {
    try {
        const { name, email, password, mobile, role, position, hireDate, salary } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Vui lòng điền đầy đủ thông tin bắt buộc",
                error: true,
                success: false
            });
        }

        if (!['MANAGER', 'WAITER', 'CHEF', 'CASHIER'].includes(role)) {
            return res.status(400).json({
                message: "Vai trò không hợp lệ. Chỉ chấp nhận Quản lý, Phục vụ, Đầu bếp, Thu ngân",
                error: true,
                success: false
            });
        }

        // Check if email already exists
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Email đã tồn tại",
                error: true,
                success: false
            });
        }

        // Auto-generate employeeId
        let employeeId = 'EMP001'; // Default for first employee

        // Find the last employee by sorting employeeId in descending order
        const lastEmployee = await UserModel.findOne({
            employeeId: { $exists: true, $ne: null }
        }).sort({ employeeId: -1 });

        if (lastEmployee && lastEmployee.employeeId) {
            // Extract number from employeeId (e.g., "EMP005" -> 5)
            const lastNumber = parseInt(lastEmployee.employeeId.replace('EMP', ''));
            // Increment and format with leading zeros
            const nextNumber = lastNumber + 1;
            employeeId = `EMP${String(nextNumber).padStart(3, '0')}`;
        }

        // Hash password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // Create employee
        const employee = new UserModel({
            name,
            email,
            password: hashedPassword,
            mobile,
            role,
            employeeId, // Auto-generated
            position,
            hireDate: hireDate || new Date(),
            salary,
            employeeStatus: 'active',
            verify_email: true // Auto-verify for employees
        });

        await employee.save();

        // Remove sensitive data before sending response
        const employeeData = employee.toObject();
        delete employeeData.password;
        delete employeeData.refresh_token;

        return res.status(201).json({
            message: `Tạo nhân viên thành công với mã ${employeeId}`,
            data: employeeData,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

/**
 * Update employee information
 */
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated here
        delete updateData.password;
        delete updateData.refresh_token;
        delete updateData.forgot_password_otp;

        const employee = await UserModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -refresh_token -forgot_password_otp');

        if (!employee) {
            return res.status(404).json({
                message: "Không tìm thấy nhân viên",
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: "Cập nhật thông tin nhân viên thành công",
            data: employee,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

/**
 * Delete employee (soft delete - set status to inactive)
 */
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await UserModel.findByIdAndUpdate(id, { $set: { employeeStatus: 'inactive' } }, { new: true }).select('-password -refresh_token -forgot_password_otp');

        if (!employee) {
            return res.status(404).json({
                message: "Không tìm thấy nhân viên",
                error: true,
                success: false
            });
        }

        return res.status(200).json({
            message: "Đã ngừng hoạt động nhân viên và giữ lịch sử ca làm",
            data: employee,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

/**
 * Get employees by role
 */
export const getEmployeesByRole = async (req, res) => {
    try {
        const { role } = req.params;

        const employees = await UserModel.find({ role })
            .select('-password -refresh_token -forgot_password_otp')
            .sort({ name: 1 });

        return res.status(200).json({
            message: `Lấy danh sách ${role} thành công`,
            data: employees,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

export default {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeesByRole
};
