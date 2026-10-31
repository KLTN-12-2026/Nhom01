import BookingModel from "../models/booking.model.js";
import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import TableModel from "../models/table.model.js";
import UserModel from "../models/user.model.js";
import VoucherModel from "../models/voucher.model.js";
import { getUniquePaymentCode } from "./order.controller.js";

// Create booking with pre-order
export async function createBookingWithPreOrder(request, response) {
    try {
        const {
            // Booking info
            customerName,
            phone,
            email,
            tableId,
            numberOfGuests,
            bookingDate,
            bookingTime,
            specialRequests,
            // Pre-order info
            preOrderItems, // [{productId, quantity}]
            // Voucher
            voucherCode,
            // Payment
            depositAmount,
            userId
        } = request.body;

        // Validate required fields
        if (!customerName || !phone || !tableId || !numberOfGuests || !bookingDate || !bookingTime) {
            return response.status(400).json({
                message: "Vui lòng điền đầy đủ thông tin đặt bàn",
                error: true,
                success: false
            });
        }

        if (!preOrderItems || preOrderItems.length === 0) {
            return response.status(400).json({
                message: "Vui lòng chọn ít nhất một món ăn",
                error: true,
                success: false
            });
        }

        // 1. Validate table availability
        const table = await TableModel.findById(tableId);
        if (!table) {
            return response.status(404).json({
                message: "Bàn không tồn tại",
                error: true,
                success: false
            });
        }

        if (table.status !== 'available') {
            return response.status(400).json({
                message: "Bàn không khả dụng",
                error: true,
                success: false
            });
        }

        // 2. Validate and calculate pre-order total
        let preOrderTotal = 0;
        const validatedItems = [];

        for (const item of preOrderItems) {
            const product = await ProductModel.findById(item.productId);
            if (!product) {
                return response.status(404).json({
                    message: `Món ăn không tồn tại: ${item.productId}`,
                    error: true,
                    success: false
                });
            }

            if (product.stock < item.quantity) {
                return response.status(400).json({
                    message: `Món "${product.name}" không đủ số lượng`,
                    error: true,
                    success: false
                });
            }

            const itemPrice = product.price * (1 - (product.discount || 0) / 100);
            const itemTotal = itemPrice * item.quantity;
            preOrderTotal += itemTotal;

            validatedItems.push({
                productId: product._id,
                product_details: {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    discount: product.discount || 0,
                    image: Array.isArray(product.image) ? product.image[0] : product.image,
                    category: product.category
                },
                quantity: item.quantity
            });
        }

        // 3. Apply voucher if provided
        let voucherDiscount = 0;
        let appliedVoucher = null;

        if (voucherCode) {
            const voucher = await VoucherModel.findOne({
                code: voucherCode,
                isActive: true,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() }
            });

            if (voucher && voucher.usageLimit > voucher.usedCount) {
                if (preOrderTotal >= (voucher.minOrderValue || 0)) {
                    if (voucher.discountType === 'percentage') {
                        voucherDiscount = (preOrderTotal * voucher.discount) / 100;
                        if (voucher.maxDiscount > 0) {
                            voucherDiscount = Math.min(voucherDiscount, voucher.maxDiscount);
                        }
                    } else if (voucher.discountType === 'fixed') {
                        voucherDiscount = Math.min(voucher.discount, preOrderTotal);
                    }
                    appliedVoucher = voucher;
                }
            }
        }

        const finalPreOrderTotal = preOrderTotal - voucherDiscount;
        const totalPayment = depositAmount + finalPreOrderTotal;

        // 4. Create booking
        const booking = new BookingModel({
            customerName,
            phone,
            email,
            tableId,
            numberOfGuests,
            bookingDate,
            bookingTime,
            specialRequests,
            depositAmount,
            depositPaid: false, // Will be updated after payment
            hasPreOrder: true,
            preOrderTotal: finalPreOrderTotal,
            userId: userId || null,
            status: 'pending'
        });

        await booking.save();

        // 5. Create linked order
        const order = new OrderModel({
            userId: userId || null,
            orderId: `ORD-${Date.now()}`,
            productId: validatedItems[0].productId, // First product
            product_details: {
                name: validatedItems.map(item => item.product_details.name).join(', '),
                image: validatedItems.map(item => item.product_details.image)
            },
            quantity: validatedItems.reduce((sum, item) => sum + item.quantity, 0), // Total quantity
            totalAmt: finalPreOrderTotal,
            subTotalAmt: preOrderTotal,
            payment_status: 'pending',
            delivery_status: 'pending',
            orderType: 'pre_order',
            bookingId: booking._id,
            isPreOrder: true,
            customerContact: {
                name: customerName,
                email: email || null,
                phone: phone
            },
            invoice_receipt: ""
        });

        if (appliedVoucher) {
            order.voucherCode = appliedVoucher.code;
            order.voucherDiscount = voucherDiscount;
        }

        await order.save();

        // 6. Link order to booking
        booking.preOrderId = order._id;
        await booking.save();

        // 7. Update product stock
        for (const item of validatedItems) {
            await ProductModel.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: -item.quantity } }
            );
        }

        // 8. Update voucher usage
        if (appliedVoucher) {
            await VoucherModel.findByIdAndUpdate(
                appliedVoucher._id,
                { $inc: { usedCount: 1 } }
            );
        }

        return response.status(201).json({
            message: "Đặt bàn và món ăn thành công",
            data: {
                booking: booking,
                order: order,
                totalPayment: totalPayment,
                preOrderTotal: finalPreOrderTotal,
                depositAmount: depositAmount
            },
            error: false,
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

// Get booking with pre-order details
export async function getBookingWithPreOrder(request, response) {
    try {
        const { id } = request.params;

        const booking = await BookingModel.findById(id)
            .populate('tableId')
            .populate('preOrderId');

        if (!booking) {
            return response.status(404).json({
                message: "Không tìm thấy đặt bàn",
                error: true,
                success: false
            });
        }

        return response.status(200).json({
            message: "Lấy thông tin đặt bàn thành công",
            data: booking,
            error: false,
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

// Create payment session for booking with pre-order
export async function createBookingWithPreOrderPayment(request, response) {
    try {
        const {
            bookingId,
            orderId
        } = request.body;

        const booking = await BookingModel.findById(bookingId);
        const order = await OrderModel.findById(orderId);

        if (!booking || !order) {
            return response.status(404).json({
                message: "Không tìm thấy đặt bàn hoặc đơn hàng",
                error: true,
                success: false
            });
        }

        const totalAmount = booking.depositAmount + order.totalAmt;

        const paymentCode = await getUniquePaymentCode();

        // Save paymentCode in both booking and order
        booking.paymentIntentId = paymentCode;
        await booking.save();

        order.paymentId = paymentCode;
        await order.save();

        const checkoutUrl = `/payment/sepay?paymentId=${paymentCode}`;
        return response.status(200).json({
            message: "Tạo phiên thanh toán thành công",
            data: {
                id: paymentCode,
                url: checkoutUrl,
                checkoutUrl: checkoutUrl,
                amount: Math.round(totalAmount),
                memo: paymentCode
            },
            error: false,
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
