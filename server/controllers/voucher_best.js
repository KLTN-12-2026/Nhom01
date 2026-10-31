import VoucherModel from '../models/voucher.model.js';

// ... existing functions ...

// Get best voucher combination for maximum savings
export const getBestVoucherController = async (req, res) => {
    try {
        const { orderAmount, productIds = [], cartItems = [], userId } = req.body;

        if (orderAmount === undefined || orderAmount === null) {
            return res.status(400).json({
                message: "Vui lòng cung cấp tổng giá trị đơn hàng",
                error: true,
                success: false
            });
        }

        const currentDate = new Date();
        const shippingCost = 30000; // Standard shipping cost

        // Calculate actual total
        let actualTotal = parseFloat(orderAmount);
        if (Array.isArray(cartItems) && cartItems.length > 0) {
            const calculatedTotal = cartItems.reduce((total, item) => {
                const product = item.productId || {};
                const price = product.discountPrice > 0 && product.discountPrice < product.price
                    ? product.discountPrice
                    : product.price;
                return total + (price * (item.quantity || 1));
            }, 0);
            actualTotal = Math.min(actualTotal, calculatedTotal);
        }

        // Find all applicable vouchers
        const vouchers = await VoucherModel.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
            $or: [
                { usageLimit: null },
                { $expr: { $gt: ['$usageLimit', '$usageCount'] } }
            ]
        });

        // Filter applicable vouchers
        const applicableVouchers = vouchers.filter(voucher => {
            // Check minimum order value
            if (actualTotal < voucher.minOrderValue) return false;

            // Check if user already used this voucher
            if (userId && voucher.usersUsed && voucher.usersUsed.includes(userId)) {
                return false;
            }

            // Check product applicability
            if (voucher.applyForAllProducts) return true;
            if (!voucher.products || voucher.products.length === 0) return true;

            return productIds.some(productId =>
                voucher.products.some(p => p.toString() === productId)
            );
        });

        // Separate into regular and free shipping vouchers
        const regularVouchers = applicableVouchers.filter(v => !v.isFreeShipping);
        const freeShippingVouchers = applicableVouchers.filter(v => v.isFreeShipping);

        // Calculate discount for each regular voucher
        const vouchersWithDiscount = regularVouchers.map(voucher => {
            let discount = 0;
            if (voucher.discountType === 'percentage') {
                const percentageDiscount = (actualTotal * voucher.discountValue) / 100;
                discount = voucher.maxDiscount
                    ? Math.min(percentageDiscount, voucher.maxDiscount)
                    : percentageDiscount;
            } else if (voucher.discountType === 'fixed') {
                discount = Math.min(voucher.discountValue, actualTotal);
            }

            return {
                ...voucher.toObject(),
                calculatedDiscount: Math.round(discount)
            };
        });

        // Sort by discount amount (highest first)
        vouchersWithDiscount.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount);

        // Find best combination
        let bestCombination = null;
        let maxSavings = 0;

        // Option 1: Best regular voucher only
        if (vouchersWithDiscount.length > 0) {
            const bestRegular = vouchersWithDiscount[0];
            if (bestRegular.calculatedDiscount > maxSavings) {
                maxSavings = bestRegular.calculatedDiscount;
                bestCombination = {
                    regular: bestRegular,
                    freeShipping: null,
                    totalSavings: bestRegular.calculatedDiscount
                };
            }
        }

        // Option 2: Best regular voucher + free shipping
        if (vouchersWithDiscount.length > 0 && freeShippingVouchers.length > 0) {
            const bestRegular = vouchersWithDiscount[0];
            const totalSavings = bestRegular.calculatedDiscount + shippingCost;

            if (totalSavings > maxSavings) {
                maxSavings = totalSavings;
                bestCombination = {
                    regular: bestRegular,
                    freeShipping: freeShippingVouchers[0].toObject(),
                    totalSavings: totalSavings
                };
            }
        }

        // Option 3: Free shipping only
        if (freeShippingVouchers.length > 0 && shippingCost > maxSavings) {
            maxSavings = shippingCost;
            bestCombination = {
                regular: null,
                freeShipping: freeShippingVouchers[0].toObject(),
                totalSavings: shippingCost
            };
        }

        // Prepare alternatives (top 3 other options)
        const alternatives = [];

        // Add top regular vouchers as alternatives
        for (let i = 1; i < Math.min(3, vouchersWithDiscount.length); i++) {
            alternatives.push({
                voucher: vouchersWithDiscount[i],
                savings: vouchersWithDiscount[i].calculatedDiscount,
                reason: `Giảm ${vouchersWithDiscount[i].calculatedDiscount.toLocaleString('vi-VN')}đ`
            });
        }

        return res.json({
            message: 'Tìm mã giảm giá tốt nhất thành công',
            data: {
                bestCombination,
                alternatives,
                currentOrderTotal: actualTotal,
                shippingCost
            },
            error: false,
            success: true
        });

    } catch (error) {
        console.error('Error finding best voucher:', error);
        return res.status(500).json({
            message: error.message || 'Có lỗi xảy ra khi tìm mã giảm giá tốt nhất',
            error: true,
            success: false
        });
    }
};
