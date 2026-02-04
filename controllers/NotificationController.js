const NotificationModel = require("../models/NotificationModel");

const list = async (req, res) => {
  try {
    const userId = req.userId;
    const { read, page = 1, limit = 20 } = req.query;
    const skip =
      (Math.max(1, parseInt(page, 10)) - 1) *
      Math.min(50, Math.max(1, parseInt(limit, 10)));
    const perPage = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const filter = { recipient: userId };
    if (read === "true") filter.read = true;
    else if (read === "false") filter.read = false;

    const [notifications, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate("eventId", "title image date time location")
        .populate("actorUserId", "fullName username profileImage")
        .lean(),
      NotificationModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      pagination: { page: Math.floor(skip / perPage) + 1, limit: perPage, total },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const unreadCount = async (req, res) => {
  try {
    const count = await NotificationModel.countDocuments({
      recipient: req.userId,
      read: false,
    });
    return res.status(200).json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await NotificationModel.findOne({
      _id: id,
      recipient: req.userId,
    });
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    notification.read = true;
    notification.readAt = notification.readAt || new Date();
    await notification.save();
    return res.status(200).json({ success: true, notification });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const result = await NotificationModel.updateMany(
      { recipient: req.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  list,
  unreadCount,
  markAsRead,
  markAllAsRead,
};
