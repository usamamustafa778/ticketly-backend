const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads", "qrcodes");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Generate QR code for ticket access key
 * @param {string} accessKey - Unique access key for the ticket
 * @returns {Promise<string>} - URL/path to the QR code image
 */
const generateQRCode = async (accessKey) => {
  try {
    console.log('🎫 Starting QR code generation for accessKey:', accessKey);
    
    const qrCodeFileName = `ticket_${accessKey}_${Date.now()}.png`;
    const qrCodePath = path.join(uploadsDir, qrCodeFileName);

    console.log('📁 QR code will be saved to:', qrCodePath);
    console.log('📂 Upload directory exists:', fs.existsSync(uploadsDir));

    // Generate QR code as PNG
    await QRCode.toFile(qrCodePath, accessKey, {
      errorCorrectionLevel: "H",
      type: "png",
      quality: 0.92,
      margin: 1,
      width: 500, // Add explicit width for better quality
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Verify file was created
    if (fs.existsSync(qrCodePath)) {
      const stats = fs.statSync(qrCodePath);
      console.log('✅ QR code generated successfully:', {
        path: qrCodePath,
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        accessKey: accessKey
      });
    } else {
      throw new Error('QR code file was not created');
    }

    // Return relative path (can be converted to URL in production)
    const relativePath = `/uploads/qrcodes/${qrCodeFileName}`;
    console.log('📤 Returning relative path:', relativePath);
    return relativePath;
  } catch (error) {
    console.error("❌ Error generating QR code:", {
      message: error.message,
      stack: error.stack,
      accessKey: accessKey
    });
    throw new Error("Failed to generate QR code: " + error.message);
  }
};

/**
 * Generate unique access key for ticket
 * @returns {string} - Unique access key
 */
const generateAccessKey = () => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const randomNum = Math.floor(Math.random() * 10000);
  return `TK-${timestamp}-${randomStr}-${randomNum}`.toUpperCase();
};

module.exports = { generateQRCode, generateAccessKey };
