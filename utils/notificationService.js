const NotificationModel = require("../models/NotificationModel");

/**
 * Create a notification. Fire-and-forget: does not throw to caller.
 * @param {Object} options
 * @param {string} options.recipient - User ID who receives the notification
 * @param {string} options.type - event_reminder | ticket_purchased | new_follower | event_liked | event_joined | event_update | event_approved | event_cancelled
 * @param {string} [options.title] - Short title
 * @param {string} [options.body] - Optional body text
 * @param {string} [options.eventId] - Event ID when relevant
 * @param {string} [options.actorUserId] - User ID who triggered (e.g. who liked, who joined)
 * @param {Object} [options.extra] - Any extra data
 */
async function createNotification(options) {
  const { recipient, type, title = "", body = "", eventId = null, actorUserId = null, extra = null } = options;
  if (!recipient || !type) return;
  try {
    await NotificationModel.create({
      recipient,
      type,
      title: title || "",
      body: body || "",
      eventId: eventId || undefined,
      actorUserId: actorUserId || undefined,
      extra: extra || undefined,
    });
  } catch (err) {
    console.error("notificationService.createNotification error:", err.message);
  }
}

/**
 * Create notifications for multiple recipients (e.g. all users who joined an event).
 */
async function createNotificationForMany(recipientIds, options) {
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) return;
  const { type, title = "", body = "", eventId = null, actorUserId = null, extra = null } = options;
  try {
    const docs = recipientIds.map((recipient) => ({
      recipient,
      type,
      title: title || "",
      body: body || "",
      eventId: eventId || undefined,
      actorUserId: actorUserId || undefined,
      extra: extra || undefined,
    }));
    await NotificationModel.insertMany(docs);
  } catch (err) {
    console.error("notificationService.createNotificationForMany error:", err.message);
  }
}

module.exports = { createNotification, createNotificationForMany };
