/**
 * Event reminders: 1 day and 1 hour before event.
 * Run via cron every hour, e.g.:
 *   0 * * * * cd /path/to/ticketly-backend && node scripts/send-event-reminders.js
 *
 * Requires: .env with MONGO_URI
 */
require("dotenv").config();
const mongoose = require("mongoose");
const EventModel = require("../models/EventModel");
const UserModel = require("../models/UserModel");
const { createNotification } = require("../utils/notificationService");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not set. Exiting.");
  process.exit(1);
}

/** Parse event.time (e.g. "8:00 PM", "20:00") to hours and minutes; default to noon. */
function parseTimeToHoursMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return { hours: 12, minutes: 0 };
  const s = timeStr.trim().toLowerCase();
  const pm = s.includes("pm");
  const am = s.includes("am");
  const match = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return { hours: 12, minutes: 0 };
  let h = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  return { hours: h, minutes };
}

/** Get event start as Date (date + time). */
function getEventStart(event) {
  const d = new Date(event.date);
  const { hours, minutes } = parseTimeToHoursMinutes(event.time);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function run() {
  await mongoose.connect(MONGO_URI);
  const now = new Date();

  // Windows: 50min–70min from now (1h reminder), 23h–25h from now (1 day reminder)
  const oneHourStart = new Date(now.getTime() + 50 * 60 * 1000);
  const oneHourEnd = new Date(now.getTime() + 70 * 60 * 1000);
  const oneDayStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const oneDayEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const events = await EventModel.find({ status: "approved" })
    .select("title date time _id")
    .lean();

  let sent1h = 0;
  let sent1d = 0;

  for (const event of events) {
    const eventStart = getEventStart(event);
    const eventTitle = event.title || "Event";
    const timeStr = event.time ? ` at ${event.time}` : "";

    // 1 hour reminder
    if (eventStart >= oneHourStart && eventStart <= oneHourEnd) {
      const users = await UserModel.find({ joinedEvents: event._id }).select("_id").lean();
      for (const u of users) {
        await createNotification({
          recipient: u._id,
          type: "event_reminder",
          title: `Your event ${eventTitle} is in 1 hour${timeStr}.`,
          body: "",
          eventId: event._id,
        });
        sent1h++;
      }
    }

    // 1 day reminder
    if (eventStart >= oneDayStart && eventStart <= oneDayEnd) {
      const users = await UserModel.find({ joinedEvents: event._id }).select("_id").lean();
      for (const u of users) {
        await createNotification({
          recipient: u._id,
          type: "event_reminder",
          title: `Your event ${eventTitle} is tomorrow${timeStr}.`,
          body: "",
          eventId: event._id,
        });
        sent1d++;
      }
    }
  }

  console.log(`Event reminders sent: 1h=${sent1h}, 1d=${sent1d}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
