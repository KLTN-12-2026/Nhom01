import mongoose from "mongoose";

const performanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        required: [true, "User ID is required"],
    },
    date: {
        type: Date,
        required: [true, "Date is required"],
    },
    role: {
        type: String,
        enum: ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'],
        required: true,
    },
    metrics: {
        ordersHandled: {
            type: Number,
            default: 0,
        },
        dishesCooked: {
            type: Number,
            default: 0,
        },
        workingHours: {
            type: Number,
            default: 0,
        },
        customerRating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
    },
    notes: {
        type: String,
    },
}, {
    timestamps: true
});

// Index for efficient queries
performanceSchema.index({ userId: 1, date: 1 }, { unique: true });
performanceSchema.index({ date: 1 });

const PerformanceModel = mongoose.model("performance", performanceSchema);

export default PerformanceModel;
