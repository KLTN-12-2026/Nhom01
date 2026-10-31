import mongoose from 'mongoose';

const tableOrderSchema = new mongoose.Schema({
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'table',
        required: true
    },
    tableNumber: {
        type: String,
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        status: {
            type: String,
            enum: ['pending', 'cooking', 'done', 'served'],
            default: 'pending'
        },
        notes: {
            type: String,
            default: ''
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        cookedAt: {
            type: Date,
            default: null
        },
        servedAt: {
            type: Date,
            default: null
        }
    }],
    subTotal: {
        type: Number,
        required: true,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'ending', 'paid', 'cancelled'],
        default: 'active'
    },
    endedAt: {
        type: Date,
        default: null
    },
    endedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    paymentQrUrl: {
        type: String,
        default: ""
    },
    paidAt: {
        type: Date,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'online', 'qr', null],
        default: null
    },
    paymentId: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Index for faster queries
tableOrderSchema.index({ tableId: 1, status: 1 });
tableOrderSchema.index({ tableNumber: 1, status: 1 });

const TableOrderModel = mongoose.model('tableOrder', tableOrderSchema);

export default TableOrderModel;
