/**
 * Migration script to add QR codes to existing tickets
 * Run with: node migrate-add-qr-codes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TicketModel = require('./models/TicketModel');
const { generateQRCode } = require('./utils/qrCodeService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketly';

console.log('🔄 Starting QR Code Migration');
console.log('='.repeat(60));

async function migrateQRCodes() {
  try {
    // Connect to database
    console.log('\n📡 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');

    // Find all tickets without QR codes
    console.log('\n🔍 Finding tickets without QR codes...');
    const ticketsWithoutQR = await TicketModel.find({
      $or: [
        { qrCodeUrl: { $exists: false } },
        { qrCodeUrl: null },
        { qrCodeUrl: '' }
      ],
      accessKey: { $exists: true, $ne: null }
    });

    console.log(`Found ${ticketsWithoutQR.length} ticket(s) without QR codes`);

    if (ticketsWithoutQR.length === 0) {
      console.log('\n✅ All tickets already have QR codes!');
      await mongoose.disconnect();
      return;
    }

    // Generate QR codes for each ticket
    console.log('\n🎫 Generating QR codes...\n');
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < ticketsWithoutQR.length; i++) {
      const ticket = ticketsWithoutQR[i];
      console.log(`[${i + 1}/${ticketsWithoutQR.length}] Processing ticket:`, ticket._id.toString());
      console.log(`   AccessKey: ${ticket.accessKey}`);
      
      try {
        // Generate QR code
        const qrCodeUrl = await generateQRCode(ticket.accessKey);
        
        // Update ticket with QR code URL
        ticket.qrCodeUrl = qrCodeUrl;
        await ticket.save();
        
        console.log(`   ✅ QR code generated: ${qrCodeUrl}\n`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        failCount++;
      }
    }

    // Summary
    console.log('='.repeat(60));
    console.log('\n📊 Migration Summary:');
    console.log(`   Total tickets processed: ${ticketsWithoutQR.length}`);
    console.log(`   ✅ Successfully generated: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);

    // Verify
    console.log('\n🔍 Verification:');
    const ticketsWithQR = await TicketModel.countDocuments({
      qrCodeUrl: { $exists: true, $ne: null, $ne: '' }
    });
    const totalTickets = await TicketModel.countDocuments({});
    console.log(`   Tickets with QR codes: ${ticketsWithQR}/${totalTickets}`);

    console.log('\n✅ Migration completed!');
    
    await mongoose.disconnect();
    console.log('✅ Database disconnected');
    
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    process.exit(1);
  }
}

migrateQRCodes();

