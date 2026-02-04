const express = require("express");
const { getUserProfileById, followUser, unfollowUser } = require("../controllers/AuthController");
const { verifyToken, optionalVerifyToken } = require("../middleware/AuthMiddleware");

const router = express.Router();

// Public route - optional auth for isFollowing
router.get("/:userId/profile", optionalVerifyToken, getUserProfileById);

// Follow / Unfollow - auth required
router.post("/:userId/follow", verifyToken, followUser);
router.delete("/:userId/follow", verifyToken, unfollowUser);

module.exports = router;
