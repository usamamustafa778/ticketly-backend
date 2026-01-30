const mongoose = require("mongoose");

const RefreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for automatic cleanup of expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster lookups
RefreshTokenSchema.index({ userId: 1, token: 1 });

const RefreshTokenModel = mongoose.model("RefreshToken", RefreshTokenSchema);
module.exports = RefreshTokenModel;

