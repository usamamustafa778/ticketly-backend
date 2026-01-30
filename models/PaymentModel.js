const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  method: {
    type: String,
    required: true,
    trim: true,
  },
  screenshotUrl: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  adminNote: {
    type: String,
    trim: true,
    default: "",
  },
  verifiedAt: {
    type: Date,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
PaymentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
PaymentSchema.index({ ticketId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ eventId: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

const PaymentModel = mongoose.model("Payment", PaymentSchema);
module.exports = PaymentModel;
