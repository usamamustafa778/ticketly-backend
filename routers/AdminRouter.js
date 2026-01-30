const express = require("express");
const { getPendingEvents, approveEvent } = require("../controllers/EventController");
const { getAllTickets, updateTicketStatus, deleteTicket } = require("../controllers/TicketController");
const { verifyToken, requireAdmin } = require("../middleware/AuthMiddleware");

const router = express.Router();

// ==================== ADMIN ROUTES ====================
router.get("/events/pending", verifyToken, requireAdmin, getPendingEvents); // Get pending events (Admin only)
router.put("/events/:id/approve", verifyToken, requireAdmin, approveEvent); // Approve event (Admin only)
router.get("/tickets", verifyToken, requireAdmin, getAllTickets); // Get all tickets (Admin only)
router.put("/tickets/:ticketId/status", verifyToken, updateTicketStatus); // Update ticket status (Admin or event owner)
router.delete("/tickets/:ticketId", verifyToken, requireAdmin, deleteTicket); // Delete ticket (Admin only)

module.exports = router;

