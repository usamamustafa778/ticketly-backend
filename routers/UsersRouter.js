const express = require("express");
const { getUserProfileById } = require("../controllers/AuthController");

const router = express.Router();

// Public route - no auth required
router.get("/:userId/profile", getUserProfileById);

module.exports = router;
