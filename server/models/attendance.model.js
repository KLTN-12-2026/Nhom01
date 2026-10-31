import mongoose from 'mongoose';
const ref = model => ({ type: mongoose.Schema.Types.ObjectId, ref: model });
const schema = new mongoose.Schema({
    userId: { ...ref('user'), required: true },
    shiftId: { ...ref('shift'), required: true },
    checkInTime: Date,
    checkOutTime: Date,
    breakMinutes: { type: Number, default: 0, min: 0 },
    workingHours: { type: Number, default: 0, min: 0 },
    lateMinutes: { type: Number, default: 0, min: 0 },
    earlyLeaveMinutes: { type: Number, default: 0, min: 0 },
    overtimeMinutes: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['on_time', 'late', 'early_leave', 'absent'], default: 'on_time' },
    reviewStatus: { type: String, enum: ['pending', 'approved'], default: 'pending' },
    checkedInBy: ref('user'),
    checkedOutBy: ref('user'),
    reviewedBy: ref('user'),
    reviewedAt: Date,
    notes: { type: String, maxlength: 2000 },
    history: [{
        actor: ref('user'), at: { type: Date, default: Date.now },
        reason: String, before: mongoose.Schema.Types.Mixed, after: mongoose.Schema.Types.Mixed,
    }],
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ userId: 1, shiftId: 1 }, { unique: true });
schema.index({ checkInTime: 1 });
schema.pre('validate', function () {
    if (this.status === 'absent') {
        if (this.checkInTime || this.checkOutTime || this.workingHours) throw new Error('Bản ghi vắng mặt không được có giờ công');
        return;
    }
    if (!this.checkInTime) throw new Error('Thiếu giờ vào');
    if (this.checkOutTime) {
        const minutes = (this.checkOutTime - this.checkInTime) / 60000;
        if (minutes <= 0 || minutes > 1440 || this.breakMinutes > minutes) throw new Error('Khoảng giờ công không hợp lệ');
        this.workingHours = Math.round((minutes - this.breakMinutes) / 60 * 100) / 100;
    } else this.workingHours = 0;
});
export default mongoose.model('attendance', schema);
