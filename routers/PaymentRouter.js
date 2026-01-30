const express = require("express");
const multer = require("multer");
const {
  submitPayment,
  verifyPayment,
  getMyPayments,
  getPaymentById,
  getPendingPayments,
} = require("../controllers/PaymentController");
const { verifyToken, requireAdmin } = require("../middleware/AuthMiddleware");
const {
  submitPaymentValidation,
  verifyPaymentValidation,
} = require("../middleware/TicketValidation");
const upload = require("../config/multer");

const router = express.Router();

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
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
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

// ==================== PAYMENT ROUTES ====================
router.post(
  "/",
  verifyToken,
  upload.single("screenshot"),
  handleMulterError,
  submitPaymentValidation,
  submitPayment
); // Submit payment with screenshot (Auth required, multipart/form-data)
router.get("/my", verifyToken, getMyPayments); // Get my payments (Auth required)
router.get("/pending", verifyToken, requireAdmin, getPendingPayments); // Get all pending payments (Admin only)
router.get("/:paymentId", verifyToken, getPaymentById); // Get payment by ID (User: own payments, Admin: all)
router.put(
  "/:paymentId/verify",
  verifyToken,
  requireAdmin,
  verifyPaymentValidation,
  verifyPayment
); // Admin verify payment (Admin only)

module.exports = router;
