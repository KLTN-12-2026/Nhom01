import { generateVietQR } from "../config/sepay.js";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import mongoose from "mongoose";
import CartProductModel from './../models/cartProduct.model.js';
import { updateProductStock } from "../utils/productStockUpdater.js";
import { calculatePointsFromOrder, calculateUsablePoints } from "../utils/pointsUtils.js";
import VoucherModel from "../models/voucher.model.js";
import BookingModel from "../models/booking.model.js";
import sendEmail from "../config/sendEmail.js";
import bookingEmailTemplate from "../utils/bookingEmailTemplate.js";
import bookingWithPreOrderEmailTemplate from "../utils/bookingWithPreOrderEmailTemplate.js";
import orderEmailTemplate from "../utils/orderEmailTemplate.js";
import PerformanceModel from "../models/performance.model.js";

export async function CashOnDeliveryOrderController(request, response) {
    const maxRetries = 3;
    let retryCount = 0;
    let session;

    while (retryCount < maxRetries) {
        session = await mongoose.startSession();

        try {
            const result = await session.withTransaction(async () => {
                const userId = request.userId;
                const { list_items, totalAmt, addressId, customerContact, subTotalAmt, pointsToUse = 0, voucherCode, freeShippingVoucherCode, orderType = 'dine_in' } = request.body;

                // Validate input based on order type
                if (!list_items?.length || !subTotalAmt || !totalAmt) {
                    throw new Error("Vui lòng điền đầy đủ các trường bắt buộc.");
                }

                // For pre-orders, require either addressId or customerContact
                if (orderType === 'pre_order') {
                    if (!addressId && !customerContact) {
                        throw new Error("Vui lòng cung cấp thông tin liên hệ hoặc địa chỉ.");
                    }
                    if (customerContact && (!customerContact.name || !customerContact.email || !customerContact.phone)) {
                        throw new Error("Vui lòng điền đầy đủ thông tin liên hệ (tên, email, số điện thoại).");
                    }
                }


                const user = await UserModel.findById(userId).session(session);
                if (!user) {
                    throw new Error('Người dùng không tồn tại');
                }

                // Validate vouchers
                let regularVoucher = null;
                let freeShippingVoucher = null;
                let discountAmount = 0;
                let shippingCost = 30000; // From CheckoutPage.jsx
                const now = new Date();

                // Validate regular voucher
                if (voucherCode) {
                    regularVoucher = await VoucherModel.findOne({
                        code: voucherCode,
                        isActive: true,
                        startDate: { $lte: now },
                        endDate: { $gte: now },
                        $or: [
                            { usageLimit: null },
                            { $expr: { $gt: ['$usageLimit', '$usageCount'] } }
                        ],
                        usersUsed: { $nin: [userId] }
                    }).session(session);

                    if (!regularVoucher) {
                        throw new Error('Mã voucher giảm giá không hợp lệ hoặc đã hết hạn');
                    }

                    if (subTotalAmt < regularVoucher.minOrderValue) {
                        throw new Error(`Đơn hàng phải có giá trị tối thiểu ${regularVoucher.minOrderValue} để sử dụng voucher này`);
                    }

                    // Validate products/categories if not applyForAllProducts
                    if (!regularVoucher.applyForAllProducts) {
                        const productIds = list_items.map(item => item.productId._id.toString());
                        const isValidProducts = regularVoucher.products.length === 0 || productIds.some(id => regularVoucher.products.includes(id));
                        const isValidCategories = regularVoucher.categories.length === 0 || list_items.some(item => regularVoucher.categories.includes(item.productId.category));
                        if (!isValidProducts && !isValidCategories) {
                            throw new Error('Voucher này không áp dụng cho sản phẩm trong giỏ hàng');
                        }
                    }

                    if (regularVoucher.discountType === 'percentage') {
                        discountAmount = (subTotalAmt * regularVoucher.discountValue) / 100;
                        if (regularVoucher.maxDiscount && discountAmount > regularVoucher.maxDiscount) {
                            discountAmount = regularVoucher.maxDiscount;
                        }
                    } else if (regularVoucher.discountType === 'fixed') {
                        discountAmount = regularVoucher.discountValue;
                    }
                }

                // Validate free shipping voucher
                if (freeShippingVoucherCode) {
                    freeShippingVoucher = await VoucherModel.findOne({
                        code: freeShippingVoucherCode,
                        isActive: true,
                        startDate: { $lte: now },
                        endDate: { $gte: now },
                        isFreeShipping: true,
                        $or: [
                            { usageLimit: null },
                            { $expr: { $gt: ['$usageLimit', '$usageCount'] } }
                        ],
                        usersUsed: { $nin: [userId] }
                    }).session(session);

                    if (!freeShippingVoucher) {
                        throw new Error('Mã voucher miễn phí vận chuyển không hợp lệ hoặc đã hết hạn');
                    }

                    if (subTotalAmt < freeShippingVoucher.minOrderValue) {
                        throw new Error(`Đơn hàng phải có giá trị tối thiểu ${freeShippingVoucher.minOrderValue} để sử dụng voucher miễn phí vận chuyển`);
                    }

                    // Validate products/categories if not applyForAllProducts
                    if (!freeShippingVoucher.applyForAllProducts) {
                        const productIds = list_items.map(item => item.productId._id.toString());
                        const isValidProducts = freeShippingVoucher.products.length === 0 || productIds.some(id => freeShippingVoucher.products.includes(id));
                        const isValidCategories = freeShippingVoucher.categories.length === 0 || list_items.some(item => freeShippingVoucher.categories.includes(item.productId.category));
                        if (!isValidProducts && !isValidCategories) {
                            throw new Error('Voucher miễn phí vận chuyển này không áp dụng cho sản phẩm trong giỏ hàng');
                        }
                    }

                    shippingCost = 0;
                }

                // Validate list_items
                for (const item of list_items) {
                    if (!item.productId?._id || !item.quantity || !item.productId.price) {
                        throw new Error('Thông tin sản phẩm không hợp lệ');
                    }
                }

                // Create the order
                const orderItems = list_items.map(item => {
                    const itemSubTotal = item.productId.price * item.quantity;
                    let itemTotal = itemSubTotal * (1 - (item.productId.discount || 0) / 100);
                    if (discountAmount > 0) {
                        const itemDiscount = (itemSubTotal / subTotalAmt) * discountAmount;
                        itemTotal -= itemDiscount;
                    }
                    if (shippingCost === 0) {
                        itemTotal = itemSubTotal * (1 - (item.productId.discount || 0) / 100);
                    }
                    return {
                        userId,
                        orderId: `ORD-${new mongoose.Types.ObjectId()}`,
                        productId: item.productId._id,
                        product_details: {
                            name: item.productId.name,
                            image: item.productId.image
                        },
                        quantity: item.quantity,
                        payment_status: 'Đang chờ thanh toán',
                        delivery_address: addressId || null,
                        customerContact: customerContact || null,
                        subTotalAmt: itemSubTotal,
                        totalAmt: itemTotal,
                        status: 'pending',
                        // Restaurant specific fields
                        tableNumber: request.body.tableNumber || null,
                        orderType: request.body.orderType || 'dine_in',
                        // Voucher information
                        voucherCode: regularVoucher?.code || null,
                        voucherDiscount: discountAmount,
                        voucherType: regularVoucher?.discountType || null,
                        voucherId: regularVoucher?._id || null,
                        // For backward compatibility
                        voucherApplied: [
                            regularVoucher ? {
                                code: regularVoucher.code,
                                discountType: regularVoucher.discountType,
                                discountValue: discountAmount,
                                isFreeShipping: false
                            } : null,
                            freeShippingVoucher ? {
                                code: freeShippingVoucher.code,
                                discountType: 'free_shipping',
                                discountValue: 0,
                                isFreeShipping: true
                            } : null
                        ].filter(Boolean)
                    };
                });

                const newOrders = await OrderModel.insertMany(orderItems, { session });
                const newOrderIds = newOrders.map(order => order._id);

                // Update product stock
                const stockUpdateResult = await updateProductStock(newOrderIds, session);
                if (!stockUpdateResult.success) {
                    throw new Error(stockUpdateResult.message);
                }

                // Update vouchers
                if (regularVoucher) {
                    await VoucherModel.findOneAndUpdate(
                        { code: regularVoucher.code },
                        {
                            $inc: { usageCount: 1 },
                            $push: { usersUsed: userId },
                            $set: {
                                isActive: regularVoucher.usageLimit ? regularVoucher.usageCount + 1 < regularVoucher.usageLimit : regularVoucher.isActive
                            }
                        },
                        { session }
                    );
                }
                if (freeShippingVoucher) {
                    await VoucherModel.findOneAndUpdate(
                        { code: freeShippingVoucher.code },
                        {
                            $inc: { usageCount: 1 },
                            $push: { usersUsed: userId },
                            $set: {
                                isActive: freeShippingVoucher.usageLimit ? freeShippingVoucher.usageCount + 1 < freeShippingVoucher.usageLimit : freeShippingVoucher.isActive
                            }
                        },
                        { session }
                    );
                }

                // Calculate points earned from this order
                const finalTotalAmt = orderItems.reduce((sum, item) => sum + item.totalAmt, 0) + shippingCost;
                const pointsEarned = calculatePointsFromOrder(finalTotalAmt);

                // Update user points
                let pointsChange = pointsEarned;
                if (pointsToUse > 0) {
                    pointsChange -= pointsToUse;
                }

                if (pointsChange !== 0) {
                    await UserModel.findByIdAndUpdate(userId,
                        { $inc: { rewardsPoint: pointsChange } },
                        { session }
                    );
                }

                // Clear cart items
                const cartItemIds = list_items.map(item => item._id);
                await CartProductModel.deleteMany({ _id: { $in: cartItemIds } }, { session });

                return {
                    success: true,
                    data: {
                        message: 'Đặt hàng thành công',
                        orders: newOrders,
                        pointsEarned,
                        pointsUsed: pointsToUse,
                        voucherApplied: {
                            regular: regularVoucher ? {
                                code: regularVoucher.code,
                                discountType: regularVoucher.discountType,
                                discountValue: discountAmount,
                                isFreeShipping: false
                            } : null,
                            freeShipping: freeShippingVoucher ? {
                                code: freeShippingVoucher.code,
                                discountType: 'free_shipping',
                                discountValue: 0,
                                isFreeShipping: true
                            } : null
                        },
                        userEmail: user.email // Return email for notification
                    }
                };
            });

            // Send email notification
            if (result?.data?.orders?.length > 0 && result?.data?.userEmail) {
                try {
                    // Populate delivery address for email template
                    const populatedOrders = await OrderModel.find({ _id: { $in: result.data.orders.map(o => o._id) } });

                    await sendEmail({
                        sendTo: result.data.userEmail,
                        subject: "Xác nhận đơn hàng -RestoHub Restaurant",
                        html: orderEmailTemplate(populatedOrders)
                    });
                } catch (emailError) {
                    console.error("Failed to send COD order confirmation email:", emailError);
                }
            }

            return response.status(200).json({
                message: 'Đặt hàng thành công',
                error: false,
                success: true,
                data: result?.data
            });

        } catch (error) {
            console.error('Error in transaction:', error);

            if (error.errorLabels?.includes('TransientTransactionError') || error.code === 112 || error.code === 251) {
                retryCount++;
                console.warn(`Transient error detected, retrying (${retryCount}/${maxRetries})...`);
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
                    continue;
                }
            }

            let errorMessage = 'Có lỗi xảy ra khi xử lý đơn hàng';
            if (error.message.includes('Người dùng không tồn tại')) {
                errorMessage = 'Người dùng không tồn tại';
            } else if (error.message.includes('Số điểm không đủ')) {
                errorMessage = 'Số điểm không đủ để sử dụng';
            } else if (error.message.includes('Mã voucher')) {
                errorMessage = error.message;
            } else if (error.message.includes('Đơn hàng phải có giá trị tối thiểu')) {
                errorMessage = error.message;
            } else if (error.message.includes('Thông tin sản phẩm không hợp lệ')) {
                errorMessage = error.message;
            } else if (error.message.includes('Voucher này không áp dụng')) {
                errorMessage = error.message;
            } else if (error.name === 'CastError') {
                errorMessage = 'Dữ liệu voucher không hợp lệ';
            }

            return response.status(400).json({
                message: errorMessage,
                error: true,
                success: false,
                errorDetails: error.name === 'CastError' ? { path: error.path, value: error.value } : undefined
            });
        } finally {
            if (session) {
                await session.endSession().catch(endSessionError => {
                    console.error('Error ending session:', endSessionError);
                });
            }
        }
    }

    return response.status(500).json({
        message: 'Không thể hoàn tất đơn hàng do xung đột dữ liệu. Vui lòng thử lại sau.',
        error: true,
        success: false
    });
}

export const pricewithDiscount = (price, dis = 1) => {
    const discountAmount = Math.ceil((Number(price) * Number(dis)) / 100);
    const actualPrice = Number(price) - Number(discountAmount);
    return actualPrice;
}

export async function getUniquePaymentCode() {
    let code;
    let exists = true;
    while (exists) {
        code = 'RSH' + Math.floor(100000 + Math.random() * 900000); // RSH123456
        const orderExists = await OrderModel.findOne({ paymentId: code });
        const bookingExists = await BookingModel.findOne({ paymentIntentId: code });
        if (!orderExists && !bookingExists) {
            exists = false;
        }
    }
    return code;
}

export async function paymentController(request, response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = request.userId;
        const { list_items, totalAmt, addressId, customerContact, subTotalAmt, pointsToUse = 0, voucherCode, freeShippingVoucherCode, orderType = 'dine_in' } = request.body;

        // Validate input based on order type
        if (!list_items?.length || !subTotalAmt || !totalAmt) {
            return response.status(400).json({
                message: "Vui lòng điền đầy đủ các trường bắt buộc.",
                error: true,
                success: false
            });
        }

        // For pre-orders, require either addressId or customerContact
        if (orderType === 'pre_order') {
            if (!addressId && !customerContact) {
                return response.status(400).json({
                    message: "Vui lòng cung cấp thông tin liên hệ hoặc địa chỉ.",
                    error: true,
                    success: false
                });
            }
            if (customerContact && (!customerContact.name || !customerContact.email || !customerContact.phone)) {
                return response.status(400).json({
                    message: "Vui lòng điền đầy đủ thông tin liên hệ (tên, email, số điện thoại).",
                    error: true,
                    success: false
                });
            }
        }

        const user = await UserModel.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return response.status(404).json({
                message: "Không tìm thấy User",
                error: true,
                success: false
            });
        }

        // Validate vouchers
        let regularVoucher = null;
        let freeShippingVoucher = null;
        let discountAmount = 0;
        let shippingCost = 30000; // Default shipping cost
        const now = new Date();

        // Validate regular voucher
        if (voucherCode) {
            regularVoucher = await VoucherModel.findOne({
                code: voucherCode,
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
                $or: [
                    { usageLimit: null },
                    { $expr: { $gt: ['$usageLimit', '$usageCount'] } }
                ],
                usersUsed: { $nin: [userId] }
            }).session(session);

            if (!regularVoucher) {
                await session.abortTransaction();
                session.endSession();
                return response.status(400).json({
                    message: 'Mã voucher giảm giá không hợp lệ hoặc đã hết hạn',
                    error: true,
                    success: false
                });
            }

            if (subTotalAmt < regularVoucher.minOrderValue) {
                await session.abortTransaction();
                session.endSession();
                return response.status(400).json({
                    message: `Đơn hàng phải có giá trị tối thiểu ${regularVoucher.minOrderValue} để sử dụng voucher này`,
                    error: true,
                    success: false
                });
            }

            // Validate products/categories if not applyForAllProducts
            if (!regularVoucher.applyForAllProducts) {
                const productIds = list_items.map(item => item.productId._id.toString());
                const isValidProducts = regularVoucher.products.length === 0 ||
                    productIds.some(id => regularVoucher.products.includes(id));
                const isValidCategories = regularVoucher.categories.length === 0 ||
                    list_items.some(item => regularVoucher.categories.includes(item.productId.category));

                if (!isValidProducts && !isValidCategories) {
                    await session.abortTransaction();
                    session.endSession();
                    return response.status(400).json({
                        message: 'Voucher này không áp dụng cho sản phẩm trong giỏ hàng',
                        error: true,
                        success: false
                    });
                }
            }

            if (regularVoucher.discountType === 'percentage') {
                discountAmount = (subTotalAmt * regularVoucher.discountValue) / 100;
                if (regularVoucher.maxDiscount && discountAmount > regularVoucher.maxDiscount) {
                    discountAmount = regularVoucher.maxDiscount;
                }
            } else if (regularVoucher.discountType === 'fixed') {
                discountAmount = regularVoucher.discountValue;
            }
        }

        // Validate free shipping voucher
        if (freeShippingVoucherCode) {
            freeShippingVoucher = await VoucherModel.findOne({
                code: freeShippingVoucherCode,
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
                isFreeShipping: true,
                $or: [
                    { usageLimit: null },
                    { $expr: { $gt: ['$usageLimit', '$usageCount'] } }
                ],
                usersUsed: { $nin: [userId] }
            }).session(session);

            if (!freeShippingVoucher) {
                await session.abortTransaction();
                session.endSession();
                return response.status(400).json({
                    message: 'Mã voucher miễn phí vận chuyển không hợp lệ hoặc đã hết hạn',
                    error: true,
                    success: false
                });
            }

            if (subTotalAmt < freeShippingVoucher.minOrderValue) {
                await session.abortTransaction();
                session.endSession();
                return response.status(400).json({
                    message: `Đơn hàng phải có giá trị tối thiểu ${freeShippingVoucher.minOrderValue} để sử dụng voucher miễn phí vận chuyển`,
                    error: true,
                    success: false
                });
            }

            // Validate products/categories if not applyForAllProducts
            if (!freeShippingVoucher.applyForAllProducts) {
                const productIds = list_items.map(item => item.productId._id.toString());
                const isValidProducts = freeShippingVoucher.products.length === 0 ||
                    productIds.some(id => freeShippingVoucher.products.includes(id));
                const isValidCategories = freeShippingVoucher.categories.length === 0 ||
                    list_items.some(item => freeShippingVoucher.categories.includes(item.productId.category));

                if (!isValidProducts && !isValidCategories) {
                    await session.abortTransaction();
                    session.endSession();
                    return response.status(400).json({
                        message: 'Voucher miễn phí vận chuyển này không áp dụng cho sản phẩm trong giỏ hàng',
                        error: true,
                        success: false
                    });
                }
            }

            shippingCost = 0;
        }

        // Calculate final amount after applying vouchers
        let finalTotal = totalAmt;
        if (discountAmount > 0) {
            finalTotal = Math.max(0, finalTotal - discountAmount);
        }
        if (shippingCost === 0) {
            finalTotal = Math.max(0, finalTotal - 30000); // Subtract default shipping cost if free shipping
        }

        // Handle case where total amount is 0 after using points and vouchers
        if (finalTotal === 0) {
            const session = await mongoose.startSession();
            try {
                const result = await session.withTransaction(async () => {
                    // Calculate item totals with discounts
                    const orderItems = list_items.map(item => {
                        const itemSubTotal = item.productId.price * item.quantity;
                        let itemTotal = itemSubTotal * (1 - (item.productId.discount || 0) / 100);

                        // Apply voucher discount proportionally to each item
                        if (discountAmount > 0) {
                            const itemDiscount = (itemSubTotal / subTotalAmt) * discountAmount;
                            itemTotal -= itemDiscount;
                        }

                        // If free shipping, don't include shipping cost in item total
                        if (shippingCost === 0) {
                            itemTotal = itemSubTotal * (1 - (item.productId.discount || 0) / 100);
                        }

                        return {
                            userId,
                            orderId: `ORD-${new mongoose.Types.ObjectId()}`,
                            productId: item.productId._id,
                            product_details: {
                                name: item.productId.name,
                                image: item.productId.image
                            },
                            quantity: item.quantity,
                            payment_status: 'Đã thanh toán', // Paid with points
                            delivery_address: addressId || null,
                            customerContact: customerContact || null,
                            subTotalAmt: itemSubTotal,
                            totalAmt: Math.max(0, itemTotal),
                            status: 'pending',
                            // Voucher information
                            voucherCode: regularVoucher?.code || null,
                            voucherDiscount: discountAmount,
                            voucherType: regularVoucher?.discountType || null,
                            voucherId: regularVoucher?._id || null,
                            // For backward compatibility
                            voucherApplied: [
                                regularVoucher ? {
                                    code: regularVoucher.code,
                                    discountType: regularVoucher.discountType,
                                    discountValue: discountAmount,
                                    isFreeShipping: false
                                } : null,
                                freeShippingVoucher ? {
                                    code: freeShippingVoucher.code,
                                    discountType: 'free_shipping',
                                    discountValue: 0,
                                    isFreeShipping: true
                                } : null
                            ].filter(Boolean)
                        };
                    });

                    const newOrders = await OrderModel.insertMany(orderItems, { session });
                    const newOrderIds = newOrders.map(order => order._id);

                    // Update voucher usage
                    const updatePromises = [];
                    if (regularVoucher) {
                        updatePromises.push(
                            VoucherModel.findByIdAndUpdate(
                                regularVoucher._id,
                                {
                                    $inc: { usageCount: 1 },
                                    $addToSet: { usedBy: userId }
                                },
                                { session }
                            )
                        );
                    }
                    if (freeShippingVoucher) {
                        updatePromises.push(
                            VoucherModel.findByIdAndUpdate(
                                freeShippingVoucher._id,
                                {
                                    $inc: { usageCount: 1 },
                                    $addToSet: { usedBy: userId }
                                },
                                { session }
                            )
                        );
                    }
                    await Promise.all(updatePromises);

                    // Update product stock
                    const stockUpdateResult = await updateProductStock(newOrderIds, session);
                    if (!stockUpdateResult.success) {
                        throw new Error(stockUpdateResult.message);
                    }

                    await UserModel.findByIdAndUpdate(userId,
                        { $inc: { rewardsPoint: -pointsToUse } },
                        { session }
                    );

                    const cartItemIds = list_items.map(item => item._id);
                    await CartProductModel.deleteMany({ _id: { $in: cartItemIds } }, { session });

                    // Commit the transaction
                    await session.commitTransaction();
                    session.endSession();

                    return response.status(200).json({
                        message: 'Đặt hàng thành công',
                        error: false,
                        success: true,
                        data: {
                            message: 'Đặt hàng thành công bằng điểm thưởng',
                            orders: newOrders,
                            pointsUsed: pointsToUse,
                            voucherCode: regularVoucher?.code,
                            freeShippingVoucherCode: freeShippingVoucher?.code
                        },
                        isFreeOrder: true
                    });
                });

                // If we get here, the transaction was already committed
                return;

            } catch (error) {
                console.error('Error in zero-amount order transaction:', error);
                return response.status(500).json({ message: 'Lỗi khi xử lý đơn hàng miễn phí', error: true, success: false });
            } finally {
                await session.endSession();
            }
        }

        const paymentCode = await getUniquePaymentCode();

        // Tạo order tạm thời
        const tempOrder = await OrderModel.insertMany(
            list_items.map((el, index) => {
                const quantity = Number(el.quantity) || 1;
                const price = Number(el.productId.price) || 0;
                const subTotal = price * quantity;

                return {
                    userId,
                    orderId: `TEMP-${new mongoose.Types.ObjectId()}`,
                    productId: el.productId._id,
                    product_details: {
                        name: el.productId.name || 'Sản phẩm không tên',
                        image: Array.isArray(el.productId.image) ? el.productId.image : [el.productId.image || '']
                    },
                    quantity: quantity,
                    paymentId: paymentCode,
                    payment_status: 'Chờ thanh toán',
                    delivery_address: addressId || null,
                    customerContact: customerContact || null,
                    subTotalAmt: subTotal,
                    totalAmt: subTotal,
                    status: 'pending',
                    isTemporary: true,
                    voucherCode: regularVoucher?.code || undefined,
                    freeShippingVoucherCode: freeShippingVoucher?.code || undefined,
                    points_used: index === 0 ? pointsToUse : 0,
                    tableNumber: orderType === 'dine_in' ? request.body.tableNumber : null,
                    orderType: orderType,
                    paymentAmount: Math.round(finalTotal)
                };
            }),
            { session }
        );

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Return SePay payment details
        const checkoutUrl = `/payment/sepay?paymentId=${paymentCode}`;
        return response.status(200).json({
            id: paymentCode,
            url: checkoutUrl,
            checkoutUrl: checkoutUrl,
            amount: Math.round(finalTotal),
            memo: paymentCode,
            data: {
                url: checkoutUrl
            }
        });

    } catch (error) {
        // If there's an error, abort any open transaction
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error('Error in payment controller:', error);
        return response.status(500).json({
            message: error.message || "Lỗi Server",
            error: true,
            success: false
        });
    } finally {
        // Always end the session
        if (session.inTransaction()) {
            await session.endSession();
        }
    }
}

export async function getOrderDetailsController(request, response) {
    try {
        const userId = request.userId;
        const orderlist = await OrderModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('userId', 'name mobile email')
            .populate({
                path: 'voucherId',
                select: 'code name description discountType discountValue minOrderValue maxDiscount startDate endDate',
                model: 'voucher'
            });

        return response.json({
            message: "Danh sách đơn hàng của bạn",
            data: orderlist,
            error: false,
            success: true
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Lỗi Server",
            error: true,
            success: false
        });
    }
}

export async function updateOrderStatusController(request, response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const orderId = request.params.orderId;
        const { status } = request.body;

        console.log('Updating order status:', { orderId, status }); // Debug log
        const userId = request.userId;

        if (!orderId || !status) {
            return response.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (orderId, status)'
            });
        }

        // Only the verified payment webhook can mark an online payment as paid.
        // Manual payment confirmation is restricted to cash-on-delivery orders.
        if (!['Đã thanh toán', 'Đã hủy'].includes(status)) {
            return response.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }
        const existingOrder = await OrderModel.findById(orderId).session(session);
        if (!existingOrder) {
            return response.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }
        if (status === 'Đã thanh toán' && existingOrder.paymentId) {
            return response.status(403).json({ success: false, message: 'Thanh toán trực tuyến phải được xác nhận qua webhook' });
        }
        if (existingOrder.payment_status === 'Đã thanh toán' && status !== 'Đã thanh toán') {
            return response.status(409).json({ success: false, message: 'Không thể thay đổi trạng thái thanh toán đã xác nhận' });
        }
        if (existingOrder.payment_status === status) {
            return response.status(200).json({ success: true, message: 'Trạng thái không thay đổi', data: existingOrder });
        }

        const updateData = {
            payment_status: status,
            status: status === 'Đã thanh toán' ? 'processing' : 'pending'
        };

        // If status is being updated to 'Đã hủy', set the cancelledAt timestamp and save cancelReason
        if (status === 'Đã hủy') {
            updateData.status = 'cancelled';
            updateData.cancelledAt = new Date();

            if (request.body.cancelReason) {
                updateData.cancelReason = request.body.cancelReason;
            }
        }

        // Find and update the order
        const order = await OrderModel.findOneAndUpdate(
            { _id: orderId },
            { $set: updateData },
            { new: true, session }
        );

        if (!order) {
            await session.abortTransaction();
            return response.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // If status is updated to 'Đã thanh toán', add points to user
        if (status === 'Đã thanh toán') {
            const pointsEarned = Math.floor(order.totalAmt / 100); // 1 point per 100 VND

            await UserModel.findByIdAndUpdate(
                order.userId,
                {
                    $inc: { points: pointsEarned },
                    $push: {
                        pointHistory: {
                            points: pointsEarned,
                            type: 'earn',
                            orderId: order._id,
                            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
                        }
                    }
                },
                { session }
            );
        }

        // Update performance metrics for WAITER when order is completed
        if (status === 'Đã thanh toán' && userId) {
            const user = await UserModel.findById(userId).session(session);

            if (user && user.role === 'WAITER') {
                // Get today's date at midnight
                const performanceDate = new Date();
                performanceDate.setHours(0, 0, 0, 0);

                // Find or create performance record for today
                let performance = await PerformanceModel.findOne({
                    userId,
                    date: performanceDate
                }).session(session);

                if (!performance) {
                    performance = new PerformanceModel({
                        userId,
                        date: performanceDate,
                        role: user.role,
                        metrics: {
                            ordersHandled: 0,
                            dishesCooked: 0,
                            workingHours: 0,
                            customerRating: 0
                        }
                    });
                }

                // Increment orders handled
                performance.metrics.ordersHandled += 1;
                await performance.save({ session });

                // Also update user's overall stats
                await UserModel.findByIdAndUpdate(
                    userId,
                    { $inc: { 'performanceStats.ordersHandled': 1 } },
                    { session }
                );
            }
        }

        await session.commitTransaction();

        response.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công',
            data: order
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error updating order status:', error);
        response.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi cập nhật trạng thái đơn hàng'
        });
    } finally {
        session.endSession();
    }
}

export async function getAllOrdersController(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        // Allow MANAGER, WAITER, CASHIER to access
        const allowedRoles = ['MANAGER', 'WAITER', 'CASHIER'];
        if (!allowedRoles.includes(user?.role)) {
            return response.status(403).json({
                message: "Bạn không có quyền truy cập",
                error: true,
                success: false
            });
        }

        const { search, status, startDate, endDate } = request.query;
        let query = {};

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { 'userId.name': { $regex: search, $options: 'i' } },
                { 'userId.mobile': { $regex: search, $options: 'i' } },
                { 'product_details.name': { $regex: search, $options: 'i' } },
                { payment_status: { $regex: search, $options: 'i' } },
                { 'delivery_address.city': { $regex: search, $options: 'i' } },
            ];
        }

        if (status) {
            query.payment_status = status;
        }

        if (startDate) {
            query.createdAt = { $gte: new Date(startDate) };
        }

        if (endDate) {
            query.createdAt = {
                ...query.createdAt,
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            };
        }

        const orderlist = await OrderModel.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'name mobile email');

        return response.json({
            message: "Tất cả đơn hàng",
            data: orderlist,
            error: false,
            success: true
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || "Lỗi Server",
            error: true,
            success: false
        });
    }
}

export async function handleSePayWebhook(request, response) {
    try {
        const authHeader = request.headers['authorization'];
        if (!authHeader || authHeader !== `Apikey ${process.env.SEPAY_API_KEY}`) {
            return response.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id, gateway, transactionDate, accountNumber, subAccount, code, content, transferType, transferAmount, referenceCode } = request.body;

        if (transferType !== 'in') {
            return response.status(200).json({ success: true, message: 'Not an incoming transaction' });
        }

        let paymentCode = code;
        if (!paymentCode && content) {
            const match = content.match(/RSH\d+/i);
            if (match) {
                paymentCode = match[0].toUpperCase();
            }
        }
        if (paymentCode) {
            paymentCode = paymentCode.toUpperCase();
        }

        if (!paymentCode) {
            return response.status(400).json({ success: false, message: 'Payment code not found in transaction' });
        }

        const dbSession = await mongoose.startSession();
        let emailData = null;

        try {
            await dbSession.withTransaction(async () => {
                // 1. Check for Booking with Pre-order
                const booking = await BookingModel.findOne({ paymentIntentId: paymentCode }).session(dbSession);
                const order = await OrderModel.findOne({ paymentId: paymentCode }).session(dbSession);

                if (booking && order) {
                    if (!booking.depositPaid) {
                        booking.depositPaid = true;
                        booking.status = 'confirmed';
                        await booking.save({ session: dbSession });
                    }

                    if (order.payment_status !== 'Đã thanh toán') {
                        order.payment_status = 'Đã thanh toán';
                        order.invoice_receipt = id.toString();
                        await order.save({ session: dbSession });
                    }

                    if (order.userId) {
                        const pointsEarned = calculatePointsFromOrder(order.totalAmt);
                        await UserModel.findByIdAndUpdate(
                            order.userId,
                            { $inc: { rewardsPoint: pointsEarned } },
                            { session: dbSession }
                        );
                    }

                    emailData = {
                        type: 'booking_with_preorder',
                        booking,
                        order
                    };
                    return;
                }

                // 2. Check for Booking Deposit Only
                if (booking && !order) {
                    if (!booking.depositPaid) {
                        booking.depositPaid = true;
                        booking.status = 'confirmed';
                        await booking.save({ session: dbSession });
                    }

                    emailData = {
                        type: 'booking_deposit',
                        booking
                    };
                    return;
                }

                // 3. Check for Table Order (Dine-in)
                const TableOrderModel = (await import('../models/tableOrder.model.js')).default;
                const tableOrder = await TableOrderModel.findOne({ paymentId: paymentCode }).session(dbSession);
                if (tableOrder) {
                    if (tableOrder.status === 'paid') {
                        console.log(`Table order ${tableOrder._id} already processed`);
                        return;
                    }

                    const tableUser = await UserModel.findOne({ linkedTableId: tableOrder.tableId, role: 'TABLE' }).session(dbSession);
                    const tableUserId = tableUser ? tableUser._id : null;

                    const orderItems = tableOrder.items.map(item => ({
                        userId: tableUserId,
                        orderId: `ORD-${new mongoose.Types.ObjectId()}`,
                        productId: item.productId._id || item.productId,
                        product_details: {
                            name: item.name,
                            image: item.productId?.image || []
                        },
                        quantity: item.quantity,
                        payment_status: 'Đã thanh toán',
                        delivery_address: null,
                        customerContact: null,
                        subTotalAmt: item.price * item.quantity,
                        totalAmt: item.price * item.quantity,
                        status: 'pending',
                        tableNumber: tableOrder.tableNumber,
                        orderType: 'dine_in',
                        paymentId: paymentCode,
                        invoice_receipt: id.toString()
                    }));

                    await OrderModel.insertMany(orderItems, { session: dbSession });

                    tableOrder.status = 'paid';
                    tableOrder.paymentMethod = 'online';
                    tableOrder.paidAt = new Date();
                    await tableOrder.save({ session: dbSession });

                    if (tableUserId) {
                        await CartProductModel.deleteMany({ userId: tableUserId }, { session: dbSession });
                    }

                    console.log(`✅ Table order ${tableOrder._id} processed successfully via SePay`);
                    return;
                }

                // 4. Standard orders
                const orders = await OrderModel.find({ paymentId: paymentCode, payment_status: 'Chờ thanh toán' }).session(dbSession);
                if (orders && orders.length > 0) {
                    const orderIds = orders.map(o => o._id);
                    const pointsToUse = orders[0].points_used || 0;
                    const userId = orders[0].userId;

                    await OrderModel.updateMany(
                        { _id: { $in: orderIds } },
                        { payment_status: 'Đã thanh toán', invoice_receipt: id.toString() },
                        { session: dbSession }
                    );

                    const stockUpdateResult = await updateProductStock(orderIds, dbSession);
                    if (!stockUpdateResult.success) {
                        throw new Error(`Failed to update product stock: ${stockUpdateResult.message}`);
                    }

                    const pointsEarned = calculatePointsFromOrder(Number(transferAmount));
                    const pointsChange = pointsEarned - pointsToUse;

                    if (pointsChange !== 0 && userId) {
                        await UserModel.findByIdAndUpdate(userId,
                            { $inc: { rewardsPoint: pointsChange } },
                            { session: dbSession }
                        );
                    }

                    const voucherCode = orders[0].voucherCode;
                    const freeShippingVoucherCode = orders[0].freeShippingVoucherCode;

                    if (voucherCode) {
                        await VoucherModel.findOneAndUpdate(
                            { code: voucherCode },
                            {
                                $inc: { usageCount: 1 },
                                $addToSet: { usersUsed: userId }
                            },
                            { session: dbSession }
                        );
                    }

                    if (freeShippingVoucherCode) {
                        await VoucherModel.findOneAndUpdate(
                            { code: freeShippingVoucherCode },
                            {
                                $inc: { usageCount: 1 },
                                $addToSet: { usersUsed: userId }
                            },
                            { session: dbSession }
                        );
                    }

                    emailData = {
                        type: 'standard_order',
                        orders,
                        userId
                    };
                }
            });
        } catch (error) {
            console.error('SePay webhook transaction failed:', error);
            return response.status(500).json({ success: false, error: error.message });
        } finally {
            await dbSession.endSession();
        }

        if (emailData) {
            try {
                if (emailData.type === 'booking_deposit' && emailData.booking.email) {
                    await sendEmail({
                        sendTo: emailData.booking.email,
                        subject: "Xác nhận đặt bàn & Thanh toán cọc thành công -RestoHub Restaurant",
                        html: bookingEmailTemplate(emailData.booking)
                    });
                } else if (emailData.type === 'booking_with_preorder' && emailData.booking.email) {
                    await sendEmail({
                        sendTo: emailData.booking.email,
                        subject: "Xác nhận đặt bàn & Món ăn -RestoHub Restaurant",
                        html: bookingWithPreOrderEmailTemplate(emailData.booking, emailData.order)
                    });
                } else if (emailData.type === 'standard_order' && emailData.userId) {
                    const user = await UserModel.findById(emailData.userId);
                    if (user && user.email) {
                        await sendEmail({
                            sendTo: user.email,
                            subject: "Xác nhận đơn hàng -RestoHub Restaurant",
                            html: orderEmailTemplate(emailData.orders)
                        });
                    }
                }
            } catch (emailError) {
                console.error("Failed to send SePay confirmation email:", emailError);
            }
        }

        return response.status(200).json({ success: true });
    } catch (error) {
        console.error('SePay webhook outer error:', error);
        return response.status(500).json({ success: false, error: error.message });
    }
}

export async function getPaymentStatusController(request, response) {
    try {
        const { paymentId } = request.params;
        if (!paymentId) {
            return response.status(400).json({
                message: "Thiếu mã thanh toán",
                error: true,
                success: false
            });
        }

        const order = await OrderModel.findOne({ paymentId, payment_status: 'Đã thanh toán' });
        if (order) {
            return response.status(200).json({
                message: "Thanh toán thành công",
                isPaid: true,
                success: true
            });
        }

        const booking = await BookingModel.findOne({ paymentIntentId: paymentId, depositPaid: true });
        if (booking) {
            return response.status(200).json({
                message: "Thanh toán thành công",
                isPaid: true,
                success: true
            });
        }

        const TableOrderModel = (await import('../models/tableOrder.model.js')).default;
        const tableOrder = await TableOrderModel.findOne({ paymentId, status: 'paid' });
        if (tableOrder) {
            return response.status(200).json({
                message: "Thanh toán thành công",
                isPaid: true,
                success: true
            });
        }

        return response.status(200).json({
            message: "Chờ thanh toán",
            isPaid: false,
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

export function getTestAmount(amount) {
    if (amount > 9999 && amount < 100000) {
        return Math.round(amount / 10);
    } else if (amount >= 100000) {
        return Math.round(amount / 100);
    }
    return amount;
}

export async function getPaymentDetailsController(request, response) {
    try {
        const { paymentId } = request.params;
        if (!paymentId) {
            return response.status(400).json({
                message: "Thiếu mã thanh toán",
                error: true,
                success: false
            });
        }

        const booking = await BookingModel.findOne({ paymentIntentId: paymentId });
        if (booking) {
            const order = await OrderModel.findOne({ paymentId });
            let originalAmount = order ? (booking.depositAmount + order.totalAmt) : booking.depositAmount;
            const amount = getTestAmount(originalAmount);
            return response.status(200).json({
                success: true,
                error: false,
                data: {
                    paymentId,
                    amount,
                    originalAmount,
                    bankName: process.env.SEPAY_BANK_NAME || 'MB',
                    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
                    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
                    memo: paymentId,
                    isBooking: true,
                    bookingId: booking._id,
                    orderId: order ? order._id : null,
                    qrCode: `https://img.vietqr.io/image/${process.env.SEPAY_BANK_NAME || 'MB'}-${process.env.SEPAY_ACCOUNT_NUMBER}-compact2.jpg?amount=${Math.round(amount)}&addInfo=${paymentId}&accountName=${encodeURIComponent(process.env.SEPAY_ACCOUNT_NAME || '')}`
                }
            });
        }

        const orders = await OrderModel.find({ paymentId });
        if (orders && orders.length > 0) {
            let originalAmount = orders[0].paymentAmount || orders.reduce((sum, order) => sum + order.totalAmt, 0);
            const amount = getTestAmount(originalAmount);
            return response.status(200).json({
                success: true,
                error: false,
                data: {
                    paymentId,
                    amount,
                    originalAmount,
                    bankName: process.env.SEPAY_BANK_NAME || 'MB',
                    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
                    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
                    memo: paymentId,
                    qrCode: `https://img.vietqr.io/image/${process.env.SEPAY_BANK_NAME || 'MB'}-${process.env.SEPAY_ACCOUNT_NUMBER}-compact2.jpg?amount=${Math.round(amount)}&addInfo=${paymentId}&accountName=${encodeURIComponent(process.env.SEPAY_ACCOUNT_NAME || '')}`
                }
            });
        }

        const TableOrderModel = (await import('../models/tableOrder.model.js')).default;
        const tableOrder = await TableOrderModel.findOne({ paymentId });
        if (tableOrder) {
            let originalAmount = tableOrder.total;
            const amount = getTestAmount(originalAmount);
            return response.status(200).json({
                success: true,
                error: false,
                data: {
                    paymentId,
                    amount,
                    originalAmount,
                    bankName: process.env.SEPAY_BANK_NAME || 'MB',
                    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
                    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
                    memo: paymentId,
                    qrCode: `https://img.vietqr.io/image/${process.env.SEPAY_BANK_NAME || 'MB'}-${process.env.SEPAY_ACCOUNT_NUMBER}-compact2.jpg?amount=${Math.round(amount)}&addInfo=${paymentId}&accountName=${encodeURIComponent(process.env.SEPAY_ACCOUNT_NAME || '')}`
                }
            });
        }

        return response.status(404).json({
            message: "Không tìm thấy thông tin thanh toán cho mã này",
            error: true,
            success: false
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}