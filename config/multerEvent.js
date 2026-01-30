const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads", "events");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: event_timestamp_random.extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `event_${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  // Check MIME type first
  if (file.mimetype && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  // Fallback: Check file extension if MIME type is missing (can happen with React Native)
  // This is a safety check - Multer should have MIME type, but React Native sometimes sends it incorrectly
  const ext = path.extname(file.originalname || "").toLowerCase();
  const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  
  if (ext && allowedExts.includes(ext)) {
    // Log warning but allow the file
    console.warn(`⚠️  MIME type missing for file ${file.originalname}, but extension ${ext} is allowed`);
    cb(null, true);
    return;
  }

  // Reject if neither MIME type nor extension is valid
  console.error(`❌ Invalid file type: ${file.mimetype || "unknown"} / ${ext || "no extension"}`);
  cb(
    new Error(
      "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
    ),
    false
  );
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

module.exports = upload;
