const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 1000, default: "" },
    phone: { type: String, required: true, trim: true },
    tour: { type: String, required: true, trim: true, maxlength: 120 },
    peopleCount: { type: Number, min: 1, default: 1 },
    preferredDate: { type: String, trim: true, maxlength: 60, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    smsStatus: { type: String, enum: ["not_sent", "sent", "failed"], default: "not_sent" },
    smsError: { type: String, default: null },
    phoneVerified: { type: Boolean, default: false },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    managerNotified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
