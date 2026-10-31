import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    orderId: {
        type: String,
        default: null
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    reply: {
        comment: {
            type: String,
            default: null
        },
        repliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null
        },
        repliedAt: {
            type: Date,
            default: null
        }
    }
}, {
    timestamps: true
});

reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, productId: 1 });

const ReviewModel = mongoose.model('review', reviewSchema);

export default ReviewModel;
