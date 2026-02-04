const express = require("express");
const multer = require("multer");
const passport = require("../config/passport");
const {
  signup,
  login,
  verifyOtp,
  googleCallback,
  refreshToken,
  getUserProfile,
  getAllUsers,
  updateUser,
  updateUserByAdmin,
  deleteUser,
  deleteUserByAdmin,
  uploadProfileImage,
  uploadCoverImage,
} = require("../controllers/AuthController");
const {
  signupValidation,
  loginValidation,
  updateUserValidation,
  verifyOtpValidation,
  refreshTokenValidation,
  updateUserByAdminValidation,
} = require("../middleware/AuthValidation");
const { verifyToken, requireAdmin } = require("../middleware/AuthMiddleware");
const uploadProfile = require("../config/multerProfile");

const router = express.Router();

// Multer error handler middleware for profile uploads
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

// ==================== PUBLIC ROUTES ====================
router.post("/signup", signupValidation, signup);
router.post("/login", loginValidation, login);
router.post("/verify-otp", verifyOtpValidation, verifyOtp);
router.post("/refresh-token", refreshTokenValidation, refreshToken); // Refresh access token using refresh token

// ==================== GOOGLE OAUTH ROUTES ====================
// Middleware to check if Google OAuth is configured
const checkGoogleOAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.",
    });
  }
  next();
};

router.get("/google", checkGoogleOAuth, passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", checkGoogleOAuth, passport.authenticate("google", { session: false }), googleCallback);

// ==================== PROTECTED ROUTES (Require Authentication) ====================
router.get("/profile", verifyToken, getUserProfile); // Get logged-in user profile
router.post(
  "/upload-profile-image",
  verifyToken,
  uploadProfile.single("image"),
  handleMulterError,
  uploadProfileImage
); // Upload profile image (All authenticated users)
router.post(
  "/upload-cover-image",
  verifyToken,
  uploadProfile.single("image"),
  handleMulterError,
  uploadCoverImage
); // Upload cover image (All authenticated users)
router.get("/users", verifyToken, requireAdmin, getAllUsers); // Get all users (Admin only)
router.put("/update", verifyToken, updateUserValidation, updateUser); // Update own profile (User)
router.put("/update/:userId", verifyToken, requireAdmin, updateUserByAdminValidation, updateUserByAdmin); // Update any user (Admin only)
router.delete("/delete", verifyToken, deleteUser); // Delete own account
router.delete("/delete/:userId", verifyToken, requireAdmin, deleteUserByAdmin); // Delete user by admin

module.exports = router;
