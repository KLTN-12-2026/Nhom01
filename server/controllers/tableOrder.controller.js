import TableOrderModel from '../models/tableOrder.model.js';
import TableModel from '../models/table.model.js';
import ProductModel from '../models/product.model.js';
import OrderModel from '../models/order.model.js';
import CartProductModel from '../models/cartProduct.model.js';
import UserModel from '../models/user.model.js';
import NotificationModel from '../models/notification.model.js';
import mongoose from 'mongoose';
import { getUniquePaymentCode } from "./order.controller.js";
import { generateVietQR } from '../config/sepay.js';
import { emitKitchenNewOrder, emitDishReady, emitTableOrderUpdated, emitNotification } from '../socket/appSocket.js';

// Helper to check staff permission (Waiters, Cashiers, Managers)
const isStaff = (role) => ['MANAGER', 'WAITER', 'CASHIER'].includes(role);

// 1. Add items to table order (from Table tablet / QR scan)
export async function addItemsToTableOrder(request, response) {
    try {
        const userId = request.userId;
        const { items, tableNumber } = request.body;

        if (!items || items.length === 0) {
            return response.status(400).json({
                message: 'Vui lòng chọn món',
                error: true,
                success: false
            });
        }

        const user = await UserModel.findById(userId);
        if (!user || user.role !== 'TABLE') {
            return response.status(403).json({
                message: 'Chỉ tài khoản bàn mới có thể gọi món qua API này',
                error: true,
                success: false
            });
        }

        const tableId = user.linkedTableId;
        const actualTableNumber = tableNumber || user.email.split('_')[1]?.split('@')[0]?.toUpperCase() || 'BÀN';

        let tableOrder = await TableOrderModel.findOne({
            tableId: tableId,
            status: { $in: ['active', 'ending'] }
        });

        const itemsToAdd = [];
        let subTotal = 0;

        for (const item of items) {
            const product = await ProductModel.findById(item.productId);
            if (!product) {
                return response.status(404).json({
                    message: `Không tìm thấy sản phẩm`,
                    error: true,
                    success: false
                });
            }

            const itemTotal = product.price * item.quantity;
            subTotal += itemTotal;

            itemsToAdd.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                status: 'pending',
                notes: item.notes || '',
                addedAt: new Date()
            });
        }

        if (tableOrder) {
            tableOrder.items.push(...itemsToAdd);
            tableOrder.subTotal += subTotal;
            tableOrder.total = tableOrder.subTotal;
            await tableOrder.save();
        } else {
            tableOrder = await TableOrderModel.create({
                tableId: tableId,
                tableNumber: actualTableNumber,
                items: itemsToAdd,
                subTotal: subTotal,
                total: subTotal,
                status: 'active'
            });
            // Update table status to occupied
            if (tableId) {
                await TableModel.findByIdAndUpdate(tableId, { status: 'occupied' });
            }
        }

        await CartProductModel.deleteMany({ userId: userId });

        // Realtime notifications to Kitchen and Staff
        emitKitchenNewOrder({
            tableNumber: actualTableNumber,
            items: itemsToAdd,
            orderId: tableOrder._id
        });
        emitTableOrderUpdated(tableOrder);

        // Save notification for Chef
        await NotificationModel.create({
            title: `Bàn ${actualTableNumber} vừa gọi món!`,
            message: `Khách tại Bàn ${actualTableNumber} vừa gọi thêm ${itemsToAdd.length} món mới.`,
            type: 'NEW_ORDER',
            targetRole: 'CHEF',
            metadata: { tableNumber: actualTableNumber, orderId: tableOrder._id }
        });

        return response.status(200).json({
            message: 'Đã thêm món vào đơn bàn',
            error: false,
            success: true,
            data: {
                tableOrder: tableOrder,
                itemsAdded: itemsToAdd.length
            }
        });

    } catch (error) {
        console.error('Error adding items to table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi thêm món',
            error: true,
            success: false
        });
    }
}

// 2. Staff adds items / places order for customer table (Nhân viên đặt món / thêm món cho khách)
export async function staffAddItemsToTableOrder(request, response) {
    try {
        const staffUserId = request.userId;
        const staffUser = await UserModel.findById(staffUserId);

        if (!staffUser || !isStaff(staffUser.role)) {
            return response.status(403).json({
                message: 'Chỉ nhân viên (phục vụ, thu ngân, quản lý) mới có thể đặt món cho khách',
                error: true,
                success: false
            });
        }

        const { tableNumber, tableId, items } = request.body;

        if (!tableNumber && !tableId) {
            return response.status(400).json({
                message: 'Vui lòng cung cấp số bàn',
                error: true,
                success: false
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return response.status(400).json({
                message: 'Vui lòng chọn ít nhất một món ăn',
                error: true,
                success: false
            });
        }

        // Find table
        let targetTable = null;
        if (tableId && mongoose.isValidObjectId(tableId)) {
            targetTable = await TableModel.findById(tableId);
        }
        if (!targetTable && tableNumber) {
            targetTable = await TableModel.findOne({ tableNumber: tableNumber.toUpperCase().trim() });
        }

        const actualTableNumber = (targetTable?.tableNumber || tableNumber).toUpperCase().trim();
        const actualTableId = targetTable?._id || new mongoose.Types.ObjectId();

        // Update table to occupied
        if (targetTable) {
            targetTable.status = 'occupied';
            await targetTable.save();
        }

        // Find existing active table order
        let tableOrder = await TableOrderModel.findOne({
            $or: [
                { tableId: actualTableId, status: { $in: ['active', 'ending'] } },
                { tableNumber: actualTableNumber, status: { $in: ['active', 'ending'] } }
            ]
        });

        const itemsToAdd = [];
        let addedSubTotal = 0;

        for (const item of items) {
            const product = await ProductModel.findById(item.productId);
            if (!product) {
                return response.status(404).json({
                    message: `Không tìm thấy sản phẩm ${item.productId}`,
                    error: true,
                    success: false
                });
            }

            const itemQty = Number(item.quantity) || 1;
            const itemPrice = product.price;
            addedSubTotal += itemPrice * itemQty;

            itemsToAdd.push({
                productId: product._id,
                name: product.name,
                price: itemPrice,
                quantity: itemQty,
                status: 'pending',
                notes: item.notes || '',
                addedAt: new Date()
            });
        }

        if (tableOrder) {
            tableOrder.items.push(...itemsToAdd);
            tableOrder.subTotal += addedSubTotal;
            tableOrder.total = tableOrder.subTotal;
            // If it was ending and more food added, reactivate
            tableOrder.status = 'active';
            await tableOrder.save();
        } else {
            tableOrder = await TableOrderModel.create({
                tableId: actualTableId,
                tableNumber: actualTableNumber,
                items: itemsToAdd,
                subTotal: addedSubTotal,
                total: addedSubTotal,
                status: 'active'
            });
        }

        // Notify Kitchen
        emitKitchenNewOrder({
            tableNumber: actualTableNumber,
            items: itemsToAdd,
            orderId: tableOrder._id
        });
        emitTableOrderUpdated(tableOrder);

        // Create persistent notification for Chef
        const chefNotification = await NotificationModel.create({
            title: `Bàn ${actualTableNumber} có món mới!`,
            message: `Nhân viên ${staffUser.name} vừa thêm ${itemsToAdd.length} món cho Bàn ${actualTableNumber}.`,
            type: 'NEW_ORDER',
            targetRole: 'CHEF',
            metadata: { tableNumber: actualTableNumber, orderId: tableOrder._id }
        });
        emitNotification(chefNotification);

        return response.status(200).json({
            message: `Đã thêm ${itemsToAdd.length} món vào Bàn ${actualTableNumber}`,
            error: false,
            success: true,
            data: tableOrder
        });

    } catch (error) {
        console.error('Error in staffAddItemsToTableOrder:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi nhân viên thêm món',
            error: true,
            success: false
        });
    }
}

// 3. Staff ends table order (Bấm kết thúc đơn hàng -> Tạo mã QR thanh toán)
export async function endTableOrder(request, response) {
    try {
        const staffUserId = request.userId;
        const staffUser = await UserModel.findById(staffUserId);

        if (!staffUser || !isStaff(staffUser.role)) {
            return response.status(403).json({
                message: 'Chỉ nhân viên mới có quyền kết thúc đơn hàng',
                error: true,
                success: false
            });
        }

        const { orderId } = request.body;
        if (!orderId) {
            return response.status(400).json({
                message: 'Vui lòng cung cấp mã đơn hàng bàn',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findById(orderId).populate('items.productId', 'name image price');
        if (!tableOrder) {
            return response.status(404).json({
                message: 'Không tìm thấy đơn hàng bàn',
                error: true,
                success: false
            });
        }

        if (tableOrder.status === 'paid') {
            return response.status(400).json({
                message: 'Đơn hàng này đã được thanh toán hoàn tất trước đó',
                error: true,
                success: false
            });
        }

        // Generate unique payment code
        const paymentCode = await getUniquePaymentCode();

        // Generate VietQR URL
        const qrUrl = generateVietQR(tableOrder.total, paymentCode);

        // Update tableOrder
        tableOrder.status = 'ending';
        tableOrder.endedAt = new Date();
        tableOrder.endedBy = staffUserId;
        tableOrder.paymentId = paymentCode;
        tableOrder.paymentQrUrl = qrUrl;
        tableOrder.paymentMethod = 'qr';
        await tableOrder.save();

        emitTableOrderUpdated(tableOrder);

        return response.status(200).json({
            message: `Đã kết thúc đơn Bàn ${tableOrder.tableNumber}. Vui lòng đưa mã QR cho khách thanh toán.`,
            error: false,
            success: true,
            data: {
                tableOrder,
                qrUrl,
                paymentCode,
                total: tableOrder.total,
                tableNumber: tableOrder.tableNumber
            }
        });

    } catch (error) {
        console.error('Error ending table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi kết thúc đơn hàng',
            error: true,
            success: false
        });
    }
}

// 4. Staff confirms customer payment (Xác nhận thanh toán của khách)
export async function confirmTableOrderPayment(request, response) {
    try {
        const staffUserId = request.userId;
        const staffUser = await UserModel.findById(staffUserId);

        if (!staffUser || !isStaff(staffUser.role)) {
            return response.status(403).json({
                message: 'Chỉ nhân viên mới có quyền xác nhận thanh toán',
                error: true,
                success: false
            });
        }

        const { orderId, paymentMethod = 'qr' } = request.body;
        if (!orderId) {
            return response.status(400).json({
                message: 'Vui lòng cung cấp mã đơn hàng bàn',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findById(orderId);
        if (!tableOrder) {
            return response.status(404).json({
                message: 'Không tìm thấy đơn hàng bàn',
                error: true,
                success: false
            });
        }

        if (tableOrder.status === 'paid') {
            return response.status(400).json({
                message: 'Đơn hàng này đã được xác nhận thanh toán rồi',
                error: true,
                success: false
            });
        }

        // Mark tableOrder as paid
        tableOrder.status = 'paid';
        tableOrder.paidAt = new Date();
        tableOrder.paymentMethod = paymentMethod;
        await tableOrder.save();

        // Release Table
        if (tableOrder.tableId) {
            await TableModel.findByIdAndUpdate(tableOrder.tableId, { status: 'available' });
        } else if (tableOrder.tableNumber) {
            await TableModel.findOneAndUpdate({ tableNumber: tableOrder.tableNumber }, { status: 'available' });
        }

        // Insert into OrderModel for permanent record keeping
        const orderRecords = tableOrder.items.map(item => ({
            userId: staffUserId, // recorded by staff
            orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productId: item.productId,
            product_details: {
                name: item.name,
                image: []
            },
            quantity: item.quantity,
            payment_status: 'Đã thanh toán',
            paymentId: tableOrder.paymentId || `PAY-${Date.now()}`,
            subTotalAmt: item.price * item.quantity,
            totalAmt: item.price * item.quantity,
            status: 'delivered',
            isPaid: true,
            paidAt: new Date(),
            tableNumber: tableOrder.tableNumber,
            orderType: 'dine_in'
        }));

        try {
            await OrderModel.insertMany(orderRecords);
        } catch (saveOrderErr) {
            console.error('Note: Error saving permanent order records:', saveOrderErr.message);
        }

        emitTableOrderUpdated(tableOrder);

        // Create internal notification for restaurant staff
        const paymentNotification = await NotificationModel.create({
            title: `Bàn ${tableOrder.tableNumber} đã thanh toán!`,
            message: `Đơn hàng Bàn ${tableOrder.tableNumber} đã hoàn tất thanh toán (${tableOrder.total.toLocaleString('vi-VN')}đ) bởi nhân viên ${staffUser.name}.`,
            type: 'PAYMENT',
            targetRole: 'ALL_STAFF',
            metadata: { tableNumber: tableOrder.tableNumber, total: tableOrder.total }
        });
        emitNotification(paymentNotification);

        return response.status(200).json({
            message: `Xác nhận thanh toán thành công cho Bàn ${tableOrder.tableNumber}!`,
            error: false,
            success: true,
            data: tableOrder
        });

    } catch (error) {
        console.error('Error confirming table payment:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi xác nhận thanh toán',
            error: true,
            success: false
        });
    }
}

// 5. Kitchen: Get list of dishes to cook (Màn hình bếp cho Đầu bếp)
export async function getKitchenItems(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || !['MANAGER', 'CHEF'].includes(user.role)) {
            return response.status(403).json({
                message: 'Chỉ đầu bếp và quản lý mới có quyền xem màn hình bếp',
                error: true,
                success: false
            });
        }

        // Find active and ending table orders
        const activeOrders = await TableOrderModel.find({
            status: { $in: ['active', 'ending'] }
        }).sort({ createdAt: 1 }).populate('items.productId', 'name image price category');

        // Flatten items with their parent table info
        const kitchenItems = [];
        for (const order of activeOrders) {
            for (const item of order.items) {
                kitchenItems.push({
                    itemId: item._id,
                    orderId: order._id,
                    tableNumber: order.tableNumber,
                    tableId: order.tableId,
                    productId: item.productId?._id || item.productId,
                    name: item.name,
                    image: item.productId?.image || [],
                    price: item.price,
                    quantity: item.quantity,
                    status: item.status || 'pending',
                    notes: item.notes || '',
                    addedAt: item.addedAt,
                    cookedAt: item.cookedAt,
                    servedAt: item.servedAt,
                    orderCreatedAt: order.createdAt
                });
            }
        }

        // Sort: pending & cooking first, then done, then served
        const statusPriority = { pending: 1, cooking: 2, done: 3, served: 4 };
        kitchenItems.sort((a, b) => {
            const priorityDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.addedAt) - new Date(b.addedAt);
        });

        return response.status(200).json({
            message: 'Lấy danh sách món bếp thành công',
            error: false,
            success: true,
            data: kitchenItems
        });

    } catch (error) {
        console.error('Error getting kitchen items:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi lấy danh sách món',
            error: true,
            success: false
        });
    }
}

// 6. Kitchen: Chef updates dish status (Nút Done gửi thông báo tới phục vụ)
export async function updateKitchenItemStatus(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || !['MANAGER', 'CHEF', 'WAITER'].includes(user.role)) {
            return response.status(403).json({
                message: 'Không có quyền cập nhật trạng thái món ăn',
                error: true,
                success: false
            });
        }

        const { orderId, itemId, status } = request.body;

        if (!orderId || !itemId || !status) {
            return response.status(400).json({
                message: 'Vui lòng cung cấp đầy đủ orderId, itemId và status',
                error: true,
                success: false
            });
        }

        if (!['pending', 'cooking', 'done', 'served'].includes(status)) {
            return response.status(400).json({
                message: 'Trạng thái món không hợp lệ',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findById(orderId);
        if (!tableOrder) {
            return response.status(404).json({
                message: 'Không tìm thấy đơn hàng bàn',
                error: true,
                success: false
            });
        }

        const item = tableOrder.items.id(itemId);
        if (!item) {
            return response.status(404).json({
                message: 'Không tìm thấy món ăn trong đơn',
                error: true,
                success: false
            });
        }

        item.status = status;
        if (status === 'done') {
            item.cookedAt = new Date();
        } else if (status === 'served') {
            item.servedAt = new Date();
        }

        await tableOrder.save();

        // If status changed to 'done', alert Waiters / Staff to pick up the dish!
        if (status === 'done') {
            const alertMessage = `Món "${item.name}" (SL: ${item.quantity}) của Bàn ${tableOrder.tableNumber} đã hoàn tất! Vui lòng lấy món phục vụ cho khách.`;
            
            // Create notification document
            const newNotif = await NotificationModel.create({
                title: `Món ăn đã xong · Bàn ${tableOrder.tableNumber}`,
                message: alertMessage,
                type: 'DISH_DONE',
                sender: userId,
                targetRole: 'STAFF',
                metadata: {
                    tableNumber: tableOrder.tableNumber,
                    dishName: item.name,
                    quantity: item.quantity,
                    orderId: tableOrder._id,
                    itemId: item._id
                }
            });

            // Emit dish ready event to waiters and staff
            emitDishReady({
                tableNumber: tableOrder.tableNumber,
                dishName: item.name,
                quantity: item.quantity,
                orderId: tableOrder._id,
                itemId: item._id,
                message: alertMessage,
                notificationId: newNotif._id
            });
            emitNotification(newNotif);
        }

        emitTableOrderUpdated(tableOrder);

        return response.status(200).json({
            message: `Cập nhật trạng thái món "${item.name}" thành ${status} thành công`,
            error: false,
            success: true,
            data: {
                itemId: item._id,
                orderId: tableOrder._id,
                status: item.status,
                cookedAt: item.cookedAt,
                servedAt: item.servedAt
            }
        });

    } catch (error) {
        console.error('Error updating kitchen item status:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi cập nhật trạng thái món',
            error: true,
            success: false
        });
    }
}

// 7. Customer / Table: Get active dishes & tracking status
export async function getCustomerActiveDishes(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        let query = {};
        if (user && user.role === 'TABLE') {
            query = { tableId: user.linkedTableId, status: { $in: ['active', 'ending'] } };
        } else {
            // For registered customer, check if linked to a table order or query recent active orders
            query = { status: { $in: ['active', 'ending'] } };
        }

        const tableOrder = await TableOrderModel.findOne(query)
            .sort({ updatedAt: -1 })
            .populate('items.productId', 'name image price');

        return response.status(200).json({
            message: 'Lấy trạng thái món đã đặt thành công',
            error: false,
            success: true,
            data: tableOrder
        });
    } catch (error) {
        console.error('Error getting customer active dishes:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi lấy món đã đặt',
            error: true,
            success: false
        });
    }
}

// 8. Get current table order (Existing)
export async function getCurrentTableOrder(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || user.role !== 'TABLE') {
            return response.status(403).json({
                message: 'Chỉ tài khoản bàn mới có thể xem đơn',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findOne({
            tableId: user.linkedTableId,
            status: { $in: ['active', 'ending'] }
        }).populate('items.productId', 'name image price');

        if (!tableOrder) {
            return response.status(200).json({
                message: 'Chưa có món nào được gọi',
                error: false,
                success: true,
                data: null
            });
        }

        return response.status(200).json({
            message: 'Lấy đơn hàng thành công',
            error: false,
            success: true,
            data: tableOrder
        });

    } catch (error) {
        console.error('Error getting table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi lấy đơn hàng',
            error: true,
            success: false
        });
    }
}

// 9. Checkout table order (Existing, for Table account)
export async function checkoutTableOrder(request, response) {
    try {
        const userId = request.userId;
        const { paymentMethod } = request.body;

        if (!paymentMethod || !['cash', 'online', 'qr'].includes(paymentMethod)) {
            return response.status(400).json({
                message: 'Vui lòng chọn phương thức thanh toán',
                error: true,
                success: false
            });
        }

        const user = await UserModel.findById(userId);
        if (!user || user.role !== 'TABLE') {
            return response.status(403).json({
                message: 'Chỉ tài khoản bàn mới có thể thanh toán',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findOne({
            tableId: user.linkedTableId,
            status: { $in: ['active', 'ending'] }
        }).populate('items.productId', 'name image');

        if (!tableOrder || tableOrder.items.length === 0) {
            return response.status(404).json({
                message: 'Không có đơn hàng nào để thanh toán',
                error: true,
                success: false
            });
        }

        if (paymentMethod === 'cash') {
            tableOrder.status = 'ending';
            tableOrder.paymentMethod = 'cash';
            await tableOrder.save();

            emitTableOrderUpdated(tableOrder);

            // Notify staff
            const notif = await NotificationModel.create({
                title: `Bàn ${tableOrder.tableNumber} yêu cầu thanh toán tiền mặt`,
                message: `Khách tại Bàn ${tableOrder.tableNumber} yêu cầu thanh toán tiền mặt (${tableOrder.total.toLocaleString('vi-VN')}đ).`,
                type: 'PAYMENT',
                targetRole: 'STAFF',
                metadata: { tableNumber: tableOrder.tableNumber, orderId: tableOrder._id }
            });
            emitNotification(notif);

            return response.status(200).json({
                message: 'Yêu cầu thanh toán tiền mặt đã được gửi tới nhân viên',
                error: false,
                success: true,
                data: {
                    totalPaid: tableOrder.total,
                    paymentMethod: 'cash'
                }
            });

        } else {
            const paymentCode = await getUniquePaymentCode();
            const qrUrl = generateVietQR(tableOrder.total, paymentCode);
            tableOrder.paymentId = paymentCode;
            tableOrder.paymentQrUrl = qrUrl;
            tableOrder.status = 'ending';
            await tableOrder.save();

            emitTableOrderUpdated(tableOrder);

            const checkoutUrl = `/payment/sepay?paymentId=${paymentCode}`;

            return response.status(200).json({
                message: 'Tạo phiên thanh toán thành công',
                error: false,
                success: true,
                data: {
                    checkoutUrl: checkoutUrl,
                    sessionId: paymentCode,
                    qrUrl: qrUrl
                }
            });
        }

    } catch (error) {
        console.error('Error checkout table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi thanh toán',
            error: true,
            success: false
        });
    }
}

// 10. Cancel table order (Existing)
export async function cancelTableOrder(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || (!['TABLE', 'MANAGER', 'WAITER'].includes(user.role))) {
            return response.status(403).json({
                message: 'Không có quyền hủy đơn',
                error: true,
                success: false
            });
        }

        const tableOrder = await TableOrderModel.findOne({
            tableId: user.linkedTableId || request.body.tableId,
            status: { $in: ['active', 'ending'] }
        });

        if (!tableOrder) {
            return response.status(404).json({
                message: 'Không tìm thấy đơn hàng',
                error: true,
                success: false
            });
        }

        tableOrder.status = 'cancelled';
        await tableOrder.save();

        if (tableOrder.tableId) {
            await TableModel.findByIdAndUpdate(tableOrder.tableId, { status: 'available' });
        }

        emitTableOrderUpdated(tableOrder);

        return response.status(200).json({
            message: 'Đã hủy đơn hàng',
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error cancelling table order:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi hủy đơn',
            error: true,
            success: false
        });
    }
}

// 11. Get all active and ending table orders (For Staff & Managers)
export async function getAllActiveTableOrders(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || !['MANAGER', 'WAITER', 'CASHIER', 'CHEF'].includes(user.role)) {
            return response.status(403).json({
                message: 'Không có quyền truy cập',
                error: true,
                success: false
            });
        }

        const tableOrders = await TableOrderModel.find({
            status: { $in: ['active', 'ending'] }
        }).sort({ updatedAt: -1 }).populate('items.productId', 'name image price');

        return response.status(200).json({
            message: 'Lấy danh sách đơn hàng thành công',
            error: false,
            success: true,
            data: tableOrders
        });

    } catch (error) {
        console.error('Error getting all table orders:', error);
        return response.status(500).json({
            message: error.message || 'Lỗi khi lấy danh sách đơn hàng',
            error: true,
            success: false
        });
    }
}
