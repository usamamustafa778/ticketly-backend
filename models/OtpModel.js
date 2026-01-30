const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  tempToken: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => Date.now() + 10 * 60 * 1000, // 10 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete expired OTPs after 10 minutes
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpModel = mongoose.model("Otp", OtpSchema);
module.exports = OtpModel;

