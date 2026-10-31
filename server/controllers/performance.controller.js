import PerformanceModel from "../models/performance.model.js";
import UserModel from "../models/user.model.js";
import { approvedHours, objectId } from '../services/shiftWorkflow.js';
import { ownOrManager } from '../middleware/shiftAccess.js';

/**
 * Get employee performance stats
 */
export const getPerformanceStats = async (req, res) => {
    try {
        const { employeeId } = req.params;
        ownOrManager(req, objectId(employeeId));
        const { startDate, endDate } = req.query;

        const query = { userId: employeeId };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const performances = await PerformanceModel.find(query).sort({ date: -1 });

        // Calculate aggregated stats
        const stats = performances.reduce((acc, perf) => {
            acc.totalOrdersHandled += perf.metrics.ordersHandled || 0;
            acc.totalDishesCooked += perf.metrics.dishesCooked || 0;
            acc.totalWorkingHours += perf.metrics.workingHours || 0;
            acc.ratingCount += perf.metrics.customerRating ? 1 : 0;
            acc.ratingSum += perf.metrics.customerRating || 0;
            return acc;
        }, {
            totalOrdersHandled: 0,
            totalDishesCooked: 0,
            totalWorkingHours: 0,
            ratingCount: 0,
            ratingSum: 0
        });

        stats.totalWorkingHours = (await approvedHours(employeeId, startDate, endDate))[employeeId] || 0;

        stats.averageRating = stats.ratingCount > 0
            ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10
            : 0;

        return res.status(200).json({
            message: "Lấy thống kê hiệu suất thành công",
            data: {
                performances,
                summary: stats
            },
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

/**
 * Get team performance (Manager/Admin only)
 */
export const getTeamPerformance = async (req, res) => {
    try {
        const { role, startDate, endDate } = req.query;

        // Get all employees
        const employeeQuery = {
            role: { $in: ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'] }
        };
        if (role) {
            employeeQuery.role = role;
        }

        const employees = await UserModel.find(employeeQuery)
            .select('name email role employeeId performanceStats');

        // Get performance data for date range
        const perfQuery = {};
        if (startDate && endDate) {
            perfQuery.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const performances = await PerformanceModel.find(perfQuery);

        const hours = await approvedHours(null, startDate, endDate);

        // Map performance to employees
        const teamPerformance = employees.map(emp => {
            const empPerfs = performances.filter(
                p => p.userId.toString() === emp._id.toString()
            );

            const stats = empPerfs.reduce((acc, perf) => {
                acc.ordersHandled += perf.metrics.ordersHandled || 0;
                acc.dishesCooked += perf.metrics.dishesCooked || 0;
                acc.workingHours += perf.metrics.workingHours || 0;
                return acc;
            }, {
                ordersHandled: 0,
                dishesCooked: 0,
                workingHours: 0
            });

            return {
                employee: {
                    _id: emp._id,
                    name: emp.name,
                    email: emp.email,
                    role: emp.role,
                    employeeId: emp.employeeId
                },
                performance: { ...stats, workingHours: hours[String(emp._id)] || 0 },
                overallStats: { ...(emp.performanceStats.toObject?.() || emp.performanceStats), totalWorkingHours: hours[String(emp._id)] || 0 }
            };
        });

        return res.status(200).json({
            message: "Lấy hiệu suất team thành công",
            data: teamPerformance,
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

/**
 * Update performance metrics (auto-called from order/dish completion)
 */
export const updatePerformanceMetrics = async (req, res) => {
    try {
        const { userId, date, role, metrics } = req.body;

        if (!userId || !date || !role || !metrics) {
            return res.status(400).json({
                message: "Thiếu thông tin cần thiết",
                error: true,
                success: false
            });
        }

        const performanceDate = new Date(date);
        performanceDate.setHours(0, 0, 0, 0);

        // Find or create performance record for the day
        let performance = await PerformanceModel.findOne({
            userId,
            date: performanceDate
        });

        if (!performance) {
            performance = new PerformanceModel({
                userId,
                date: performanceDate,
                role,
                metrics: {
                    ordersHandled: 0,
                    dishesCooked: 0,
                    workingHours: 0,
                    customerRating: 0
                }
            });
        }

        // Update metrics
        if (metrics.ordersHandled) {
            performance.metrics.ordersHandled += metrics.ordersHandled;
        }
        if (metrics.dishesCooked) {
            performance.metrics.dishesCooked += metrics.dishesCooked;
        }
        // Working hours are read from approved Attendance records only.
        if (metrics.customerRating) {
            // Average rating
            const currentRating = performance.metrics.customerRating || 0;
            performance.metrics.customerRating = (currentRating + metrics.customerRating) / 2;
        }

        await performance.save();

        // Update user's overall stats
        const updateFields = {};
        if (metrics.ordersHandled) {
            updateFields['performanceStats.ordersHandled'] = metrics.ordersHandled;
        }
        if (metrics.dishesCooked) {
            updateFields['performanceStats.dishesCooked'] = metrics.dishesCooked;
        }

        if (Object.keys(updateFields).length > 0) {
            await UserModel.findByIdAndUpdate(
                userId,
                { $inc: updateFields }
            );
        }

        return res.status(200).json({
            message: "Cập nhật hiệu suất thành công",
            data: performance,
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Lỗi server",
            error: true,
            success: false
        });
    }
};

export default {
    getPerformanceStats,
    getTeamPerformance,
    updatePerformanceMetrics
};
