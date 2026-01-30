require("dotenv").config();
const mongoose = require("mongoose");
const TicketModel = require("../models/TicketModel");
const { generateAccessKey } = require("../utils/qrCodeService");

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Migrate tickets without accessKey
const migrateTickets = async () => {
  try {
    console.log("🔄 Starting ticket migration...");

    // Find all tickets without accessKey
    const ticketsWithoutAccessKey = await TicketModel.find({
      $or: [{ accessKey: null }, { accessKey: { $exists: false } }],
    });

    console.log(`📊 Found ${ticketsWithoutAccessKey.length} tickets without accessKey`);

    if (ticketsWithoutAccessKey.length === 0) {
      console.log("✅ All tickets already have accessKey. Nothing to migrate.");
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const ticket of ticketsWithoutAccessKey) {
      try {
        // Generate unique accessKey
        let accessKey = generateAccessKey();
        let existingTicket = await TicketModel.findOne({ accessKey });

        // Ensure uniqueness
        while (existingTicket) {
          accessKey = generateAccessKey();
          existingTicket = await TicketModel.findOne({ accessKey });
        }

        // Update ticket
        ticket.accessKey = accessKey;
        await ticket.save();

        updatedCount++;
        console.log(`✅ Updated ticket ${ticket._id} with accessKey: ${accessKey}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating ticket ${ticket._id}:`, error.message);
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   ✅ Successfully updated: ${updatedCount} tickets`);
    console.log(`   ❌ Errors: ${errorCount} tickets`);
    console.log("✅ Migration completed!");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

// Run migration
connectDB().then(() => {
  migrateTickets();
});

