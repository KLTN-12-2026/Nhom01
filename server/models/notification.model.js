import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['ANNOUNCEMENT', 'DISH_DONE', 'NEW_ORDER', 'SHIFT', 'PAYMENT', 'GENERAL'],
        default: 'GENERAL'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null // null means broadcast / targetRole
    },
    targetRole: {
        type: String,
        enum: ['ALL', 'ALL_STAFF', 'STAFF', 'WAITER', 'CASHIER', 'CHEF', 'MANAGER', 'USER'],
        default: 'ALL'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }]
}, {
    timestamps: true
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ targetRole: 1, createdAt: -1 });

const NotificationModel = mongoose.model('notification', notificationSchema);

export default NotificationModel;
