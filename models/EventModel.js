const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    trim: true,
    default: "",
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  gender: {
    type: String,
    enum: ["male", "female", "all"],
    default: "all",
  },
  ticketPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalTickets: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ["pending", "approved"],
    default: "pending",
  },
  ticketTheme: {
    gradientStart: { type: String },
    gradientEnd: { type: String },
    primaryTextColor: { type: String },
    accentColor: { type: String },
    brandColor: { type: String },
    gradientDirection: { type: String },
    backgroundElement: { type: String },
    patternWeight: { type: String },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
EventSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
EventSchema.index({ status: 1, createdAt: -1 });
EventSchema.index({ createdBy: 1 });
EventSchema.index({ date: 1 });

const EventModel = mongoose.model("Event", EventSchema);
module.exports = EventModel;

