/**
 * Check ticket QR code URLs in database
 * Run with: node check-tickets.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TicketModel = require('./models/TicketModel');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketly';

async function checkTickets() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    const tickets = await TicketModel.find({}).limit(10);
    console.log(`Found ${tickets.length} ticket(s)\n`);
    console.log('='.repeat(80));

    for (const ticket of tickets) {
      console.log(`\n🎫 Ticket ID: ${ticket._id}`);
      console.log(`   AccessKey: ${ticket.accessKey || 'NOT SET'}`);
      console.log(`   QR Code URL: ${ticket.qrCodeUrl || 'NOT SET'}`);
      console.log(`   Status: ${ticket.status}`);
      
      if (ticket.qrCodeUrl) {
        // Check if file exists
        const fileName = path.basename(ticket.qrCodeUrl);
        const filePath = path.join(__dirname, 'uploads', 'qrcodes', fileName);
        const exists = fs.existsSync(filePath);
        console.log(`   File exists: ${exists ? '✅ YES' : '❌ NO'}`);
        
        if (exists) {
          const stats = fs.statSync(filePath);
          console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    await mongoose.disconnect();
    console.log('\n✅ Done');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

checkTickets();

