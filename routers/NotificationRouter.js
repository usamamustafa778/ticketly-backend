const express = require("express");
const { verifyToken } = require("../middleware/AuthMiddleware");
const {
  list,
  unreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/NotificationController");

const router = express.Router();

router.use(verifyToken);

router.get("/", list);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

module.exports = router;
