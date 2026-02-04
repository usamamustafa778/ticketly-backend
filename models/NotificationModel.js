const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "event_reminder",
      "ticket_purchased",
      "new_follower",
      "event_liked",
      "event_joined",
      "event_update",
      "event_approved",
      "event_cancelled",
    ],
  },
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  title: {
    type: String,
    trim: true,
    default: "",
  },
  body: {
    type: String,
    trim: true,
    default: "",
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    default: null,
  },
  actorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  extra: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

const NotificationModel = mongoose.model("Notification", NotificationSchema);
module.exports = NotificationModel;
