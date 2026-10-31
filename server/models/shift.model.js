import mongoose from 'mongoose';
import { validateShift } from '../utils/shiftTime.js';

const ref = (model) => ({ type: mongoose.Schema.Types.ObjectId, ref: model });
const shiftSchema = new mongoose.Schema({
    shiftType: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    assignedStaff: [{
        userId: { ...ref('user'), required: true },
        role: { type: String, enum: ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'], required: true },
        confirmed: { type: Boolean, default: false },
        confirmedAt: Date,
    }],
    maxStaff: { type: Number, default: 10, min: 1, max: 200 },
    breakMinutes: { type: Number, default: 0, min: 0, max: 480 },
    requirements: {
        MANAGER: { type: Number, default: 0, min: 0 },
        WAITER: { type: Number, default: 0, min: 0 },
        CHEF: { type: Number, default: 0, min: 0 },
        CASHIER: { type: Number, default: 0, min: 0 },
    },
    notes: { type: String, maxlength: 2000 },
    createdBy: { ...ref('user'), required: true },
    status: { type: String, enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'], default: 'draft' },
    publishedAt: Date,
    lockedAt: Date,
    lockedBy: ref('user'),
    cancellationReason: String,
    history: [{
        actor: ref('user'),
        action: String,
        reason: String,
        at: { type: Date, default: Date.now },
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
    }],
}, { timestamps: true, optimisticConcurrency: true });
shiftSchema.index({ date: 1, shiftType: 1 });
shiftSchema.index({ 'assignedStaff.userId': 1, date: 1 });
shiftSchema.pre('validate', function () { validateShift(this); });
export default mongoose.model('shift', shiftSchema);
