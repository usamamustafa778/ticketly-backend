const express = require("express");
const multer = require("multer");
const {
  createEvent,
  getApprovedEvents,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  uploadEventImage,
  likeEvent,
  unlikeEvent,
} = require("../controllers/EventController");
const { getTicketsByEvent } = require("../controllers/TicketController");
const {
  createEventValidation,
  updateEventValidation,
} = require("../middleware/EventValidation");
const {
  verifyToken,
  optionalVerifyToken,
  requireOrganizer,
} = require("../middleware/AuthMiddleware");
const uploadEvent = require("../config/multerEvent");

const router = express.Router();

// Middleware to log upload requests before multer processes them
const logUploadRequest = (req, res, next) => {
  if (req.path === "/upload-image") {
    console.log("📤 Upload request received (before multer):");
    console.log("  - Method:", req.method);
    console.log("  - Path:", req.path);
    console.log("  - Content-Type:", req.headers["content-type"]);
    console.log("  - Content-Length:", req.headers["content-length"]);
    console.log("  - Has body:", !!req.body);
  }
  next();
};

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.log("❌ Multer Error:", {
      code: err.code,
      field: err.field,
      message: err.message,
    });
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    console.log("❌ Multer Processing Error:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

// ==================== PUBLIC ROUTES ====================
// Get all approved events (Public). When Authorization header is present,
// optionalVerifyToken will attach req.userId so the controller can return
// personalized data (e.g. following feed + suggestions) without requiring auth.
router.get("/", optionalVerifyToken, getApprovedEvents);

// ==================== AUTHENTICATED ROUTES ====================
// IMPORTANT: Specific routes must come before parameterized routes to avoid route conflicts
// Upload image route - must be before any /:id routes
// Route path: POST /api/events/upload-image
router.post(
  "/upload-image",
  verifyToken,
  logUploadRequest,
  uploadEvent.single("image"),
  handleMulterError,
  uploadEventImage
); // Upload event image (Auth required)
router.post("/", verifyToken, createEventValidation, createEvent); // Create event
router.get("/my", verifyToken, getMyEvents); // Get my events
router.get(
  "/:eventId/tickets",
  verifyToken,
  requireOrganizer,
  getTicketsByEvent
); // Get tickets by event (Organizer only) - Must be before /:id

// ==================== PUBLIC ROUTES (Order matters - must be last) ====================
router.get("/:id", optionalVerifyToken, getEventById); // Get event by ID (public, optional auth for isLiked)
router.put("/:id", verifyToken, updateEventValidation, updateEvent); // Update event (owner or admin only)
router.delete("/:id", verifyToken, deleteEvent); // Delete event (owner or admin only)

// Like/Unlike (Auth required)
router.post("/:id/like", verifyToken, likeEvent);
router.post("/:id/unlike", verifyToken, unlikeEvent);

module.exports = router;
