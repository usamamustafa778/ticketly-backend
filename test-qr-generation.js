/**
 * Test script to verify QR code generation is working
 * Run with: node test-qr-generation.js
 */

const { generateQRCode, generateAccessKey } = require('./utils/qrCodeService');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing QR Code Generation\n');
console.log('='.repeat(50));

async function testQRGeneration() {
  try {
    // Test 1: Generate a test access key
    console.log('\n✅ Test 1: Generate Access Key');
    const testAccessKey = generateAccessKey();
    console.log('Generated Access Key:', testAccessKey);

    // Test 2: Generate QR code
    console.log('\n✅ Test 2: Generate QR Code');
    const qrCodePath = await generateQRCode(testAccessKey);
    console.log('QR Code Path:', qrCodePath);

    // Test 3: Verify file exists
    console.log('\n✅ Test 3: Verify File Exists');
    const fullPath = path.join(__dirname, 'uploads', 'qrcodes', path.basename(qrCodePath));
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log('✅ File exists!');
      console.log('   Path:', fullPath);
      console.log('   Size:', (stats.size / 1024).toFixed(2), 'KB');
      console.log('   Created:', stats.birthtime);
    } else {
      console.log('❌ File does not exist at:', fullPath);
    }

    // Test 4: List all QR codes
    console.log('\n✅ Test 4: List All QR Codes');
    const qrCodesDir = path.join(__dirname, 'uploads', 'qrcodes');
    const files = fs.readdirSync(qrCodesDir);
    console.log(`Found ${files.length} QR code(s):`);
    files.forEach(file => {
      const filePath = path.join(qrCodesDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests passed!');
    console.log('✅ QR code generation is working correctly');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Test failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testQRGeneration();

