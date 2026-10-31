import mongoose from 'mongoose';
const ref = model => ({ type: mongoose.Schema.Types.ObjectId, ref: model });
const requestSchema = new mongoose.Schema({
    shiftId: { ...ref('shift'), required: true },
    userId: { ...ref('user'), required: true },
    type: { type: String, enum: ['leave', 'swap', 'correction', 'register'], required: true },
    targetUserId: ref('user'),
    targetAccepted: { type: Boolean, default: false },
    reason: { type: String, required: true, maxlength: 1000 },
    proposed: { checkInTime: Date, checkOutTime: Date, breakMinutes: Number },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reviewedBy: ref('user'),
    reviewedAt: Date,
    reviewNote: String,
}, { timestamps: true });
requestSchema.index({ shiftId: 1, userId: 1, status: 1 });
const notificationSchema = new mongoose.Schema({
    userId: { ...ref('user'), required: true },
    shiftId: ref('shift'),
    message: { type: String, required: true },
    readAt: Date,
}, { timestamps: true });
notificationSchema.index({ userId: 1, createdAt: -1 });
export const ShiftRequest = mongoose.model('shiftRequest', requestSchema);
export const ShiftNotification = mongoose.model('shiftNotification', notificationSchema);
// Serializes workflow writes across processes, inside the same transaction as the data.
export const WorkflowLock = mongoose.model('shiftWorkflowLock', new mongoose.Schema({
    _id: String, version: { type: Number, default: 0 },
}));
