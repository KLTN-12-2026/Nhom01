import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: "user"
    },
    orderId: {
        type: String,
        required: [true, "Provide orderId"],
        unique: true,
    },
    productId: {
        type: mongoose.Schema.ObjectId,
        ref: "product",
    },
    product_details: {
        name: String,
        image: Array,
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    paymentId: {
        type: String,
        default: "",
    },
    payment_status: {
        type: String,
        default: "",
    },
    // Customer contact information for pre-orders
    customerContact: {
        name: {
            type: String,
            default: null
        },
        email: {
            type: String,
            default: null
        },
        phone: {
            type: String,
            default: null
        }
    },
    // New fields for restaurant
    tableNumber: {
        type: String, // Can be number or string (e.g., "A1")
        default: null
    },
    orderType: {
        type: String,
        enum: ['dine_in', 'takeaway', 'pre_order'], // Removed 'delivery', added 'pre_order'
        default: 'dine_in'
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    deleted_at: {
        type: Date,
        default: null
    },
    deleted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    points_used: {
        type: Number,
        default: 0,
        min: 0
    },
    points_value: {
        type: Number,
        default: 0,
        min: 0
    },
    points_earned: {
        type: Number,
        default: 0,
        min: 0
    },
    points_rate: {
        type: Number,
        default: 100, // 1 point = 100 VND
        min: 1
    },
    points_expiry_date: {
        type: Date,
        default: function () {
            // Points expire after 1 year by default
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            return expiryDate;
        }
    },
    subTotalAmt: {
        type: Number,
        default: 0,
        required: false
    },
    totalAmt: {
        type: Number,
        default: 0,
        required: false
    },
    invoice_receipt: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    earnedPoints: {
        type: Number,
        default: 0
    },
    usedPoints: {
        type: Number,
        default: 0
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    paidAt: {
        type: Date
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    deliveredAt: {
        type: Date
    },
    cancelReason: {
        type: String,
        default: ""
    },
    cancelledAt: {
        type: Date
    },
    // Voucher information
    voucherCode: {
        type: String,
        default: null
    },
    voucherDiscount: {
        type: Number,
        default: 0
    },
    voucherType: {
        type: String,
        enum: [null, 'percentage', 'fixed', 'free_shipping'],
        default: null
    },
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'voucher',
        default: null
    },
    // Booking integration fields
    bookingId: {
        type: mongoose.Schema.ObjectId,
        ref: 'booking',
        default: null
    },
    isPreOrder: {
        type: Boolean,
        default: false
    },
    freeShippingVoucherCode: {
        type: String,
        default: null
    },
    isTemporary: {
        type: Boolean,
        default: false
    },
    paymentAmount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
})

// Add a post-save hook to update user's points when an order is saved/updated
orderSchema.post('save', async function (doc) {
    try {
        // Only process if the order has earnedPoints and is a new or updated document
        if (doc.earnedPoints > 0) {
            // Find the user and update their rewards points
            await mongoose.model('user').findByIdAndUpdate(
                doc.userId,
                {
                    $inc: { rewardsPoint: doc.earnedPoints },
                    $push: {
                        orderHistory: doc._id
                    }
                },
                { new: true, useFindAndModify: false }
            );

            console.log(`Added ${doc.earnedPoints} points to user ${doc.userId} for order ${doc._id}`);
        }
    } catch (error) {
        console.error('Error updating user points from order:', error);
    }
});

const OrderModel = mongoose.model("order", orderSchema);

export default OrderModel;