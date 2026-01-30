const express = require("express");
const {
  createTicket,
  getMyTickets,
  getTicketById,
  scanTicket,
  deleteTicket,
  updateTicketStatusByAccessKey,
} = require("../controllers/TicketController");
const { verifyToken, attachUser, requireOrganizer } = require("../middleware/AuthMiddleware");
const {
  createTicketValidation,
  scanTicketValidation,
  updateTicketStatusByKeyValidation,
} = require("../middleware/TicketValidation");

const router = express.Router();

// ==================== TICKET ROUTES ====================
// IMPORTANT: Specific routes must come BEFORE parameterized routes (/:ticketId)
router.post("/", verifyToken, createTicketValidation, createTicket); // Create ticket (Auth required)
router.get("/my", verifyToken, getMyTickets); // Get my tickets (Auth required)
router.post("/scan", scanTicketValidation, scanTicket); // Scan ticket / Entry validation (Public endpoint for scanning)
router.put("/update-status-by-key", verifyToken, requireOrganizer, updateTicketStatusByKeyValidation, updateTicketStatusByAccessKey); // Update ticket status by accessKey (Organizer only)
router.get("/:ticketId", verifyToken, attachUser, getTicketById); // Get ticket by ID (Role-based)
router.delete("/:ticketId", verifyToken, deleteTicket); // Delete ticket (User can delete own tickets with restrictions, Admin can delete any)

module.exports = router;
