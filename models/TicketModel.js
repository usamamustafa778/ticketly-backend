const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
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
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending_payment", "payment_in_review", "confirmed", "used", "cancelled", "expired"],
    default: "pending_payment",
  },
  accessKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  qrCodeUrl: {
    type: String,
    trim: true,
    default: "",
  },
  paymentScreenshotUrl: {
    type: String,
    trim: true,
    default: "",
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
TicketSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries (accessKey already has unique index via schema)
TicketSchema.index({ userId: 1, createdAt: -1 });
TicketSchema.index({ eventId: 1 });
TicketSchema.index({ organizerId: 1 });
TicketSchema.index({ status: 1 });

const TicketModel = mongoose.model("Ticket", TicketSchema);
module.exports = TicketModel;
