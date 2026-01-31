const TicketModel = require("../models/TicketModel");
const EventModel = require("../models/EventModel");
const PaymentModel = require("../models/PaymentModel");
const UserModel = require("../models/UserModel");
const { generateAccessKey, generateQRCode } = require("../utils/qrCodeService");
const path = require("path");
const fs = require("fs");

// Return only relative path (no base URL) - client constructs full URL from API_BASE_URL
const toImagePath = (val) => {
  if (!val || val === "") return null;
  if (val.startsWith("http://") || val.startsWith("https://")) {
    try {
      return new URL(val).pathname;
    } catch {
      const i = val.indexOf("/uploads");
      return i !== -1 ? val.substring(i) : val;
    }
  }
  return val.startsWith("/") ? val : `/${val}`;
};

// Build map eventId -> joinedUsers for ticket event objects
const getJoinedUsersMap = async (eventIds) => {
  if (!eventIds || eventIds.length === 0) return {};
  const ids = eventIds.map((id) => (id && id._id ? id._id : id));
  const usersWhoJoined = await UserModel.find({ joinedEvents: { $in: ids } })
    .select("fullName username profileImage joinedEvents")
    .lean();
  const map = {};
  ids.forEach((id) => (map[id.toString()] = []));
  for (const user of usersWhoJoined) {
    const userInfo = {
      _id: user._id,
      fullName: user.fullName || user.username || "User",
      name: user.fullName || user.username || "User",
      profileImageUrl: toImagePath(user.profileImage) || null,
    };
    (user.joinedEvents || []).forEach((eid) => {
      const eidStr = eid.toString();
      if (map[eidStr]) map[eidStr].push(userInfo);
    });
  }
  return map;
};

// ==================== CREATE TICKET ====================
const createTicket = async (req, res) => {
  try {
    const { eventId, username, email, phone } = req.body;
    const userId = req.userId;

    // Validate event exists and is approved
    const event = await EventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Event is not approved yet",
      });
    }

    // Check if event date is in the past
    const eventDate = new Date(event.date);
    if (eventDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot create ticket for past events",
      });
    }

    // Generate unique accessKey (ticket #) immediately
    let accessKey = generateAccessKey();
    let existingTicket = await TicketModel.findOne({ accessKey });
    
    // Ensure uniqueness (very rare collision, but handle it)
    while (existingTicket) {
      accessKey = generateAccessKey();
      existingTicket = await TicketModel.findOne({ accessKey });
    }

    // Generate QR code for the accessKey
    let qrCodeUrl = "";
    try {
      qrCodeUrl = await generateQRCode(accessKey);
      console.log('✅ QR code generated:', qrCodeUrl);
    } catch (qrError) {
      console.error('⚠️ Failed to generate QR code:', qrError);
      // Don't fail ticket creation if QR generation fails
    }

    // Create ticket with status = pending_payment, accessKey, and qrCodeUrl
    const ticket = new TicketModel({
      userId,
      eventId,
      organizerId: event.createdBy, // Save organizerId from event
      username,
      email,
      phone,
      status: "pending_payment",
      accessKey: accessKey, // Generate ticket # immediately
      qrCodeUrl: qrCodeUrl, // Store QR code URL
    });

    await ticket.save();

    // Add event to user's joinedEvents if not already present
    const user = await UserModel.findById(userId);
    if (user) {
      // Convert to strings for comparison
      const joinedEventIds = user.joinedEvents.map((id) => id.toString());
      const eventIdStr = eventId.toString();
      
      if (!joinedEventIds.includes(eventIdStr)) {
        user.joinedEvents.push(eventId);
        await user.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully. Please submit payment.",
      ticket: {
        id: ticket._id,
        eventId: ticket.eventId,
        username: ticket.username,
        email: ticket.email,
        phone: ticket.phone,
        status: ticket.status,
        accessKey: ticket.accessKey,
        qrCodeUrl: qrCodeUrl || null, // Path only - client constructs full URL
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating ticket",
      error: error.message,
    });
  }
};

// ==================== GET MY TICKETS ====================
const getMyTickets = async (req, res) => {
  try {
    const userId = req.userId;

    const tickets = await TicketModel.find({ userId })
      .populate("eventId", "title description date time location image ticketPrice")
      .populate("organizerId", "fullName username email phone")
      .sort({ createdAt: -1 });

    // Get joinedUsers for all events in this ticket list
    const eventIds = [...new Set(tickets.map((t) => t.eventId).filter(Boolean))];
    const joinedUsersMap = await getJoinedUsersMap(eventIds);

    const formattedTickets = tickets.map((ticket) => {
      // Return paths only - client constructs full URLs
      const paymentScreenshotUrl = toImagePath(ticket.paymentScreenshotUrl);
      const qrCodeUrl = toImagePath(ticket.qrCodeUrl);

      // Format event image URLs and attach joinedUsers
      const eventIdStr = ticket.eventId && (ticket.eventId._id || ticket.eventId).toString();
      const joinedUsers = joinedUsersMap[eventIdStr] || [];
      let formattedEvent = ticket.eventId;
      if (ticket.eventId && ticket.eventId.image !== undefined) {
        formattedEvent = {
          ...ticket.eventId.toObject ? ticket.eventId.toObject() : ticket.eventId,
          imageUrl: toImagePath(ticket.eventId.image),
          joinedUsers,
          joinedCount: joinedUsers.length,
        };
      } else if (ticket.eventId) {
        formattedEvent = {
          ...ticket.eventId.toObject ? ticket.eventId.toObject() : ticket.eventId,
          joinedUsers,
          joinedCount: joinedUsers.length,
        };
      }

      return {
        id: ticket._id,
        event: formattedEvent,
        organizer: ticket.organizerId,
        username: ticket.username,
        email: ticket.email,
        phone: ticket.phone,
        status: ticket.status,
        accessKey: ticket.accessKey,
        qrCodeUrl: qrCodeUrl,
        paymentScreenshotUrl: paymentScreenshotUrl,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedTickets.length,
      tickets: formattedTickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching tickets",
      error: error.message,
    });
  }
};

// ==================== GET TICKET BY ID (ROLE-BASED) ====================
const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId;
    const user = req.user;

    const ticket = await TicketModel.findById(ticketId)
      .populate({
        path: "eventId",
        populate: {
          path: "createdBy",
          select: "fullName username email phone"
        }
      })
      .populate("organizerId", "fullName username email phone")
      .populate("userId", "fullName username email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const paymentScreenshotUrl = toImagePath(ticket.paymentScreenshotUrl);
    const qrCodeUrl = toImagePath(ticket.qrCodeUrl);

    // Joined users for this event
    const eventIdForJoined = ticket.eventId && (ticket.eventId._id || ticket.eventId);
    const joinedUsersMapSingle = eventIdForJoined ? await getJoinedUsersMap([eventIdForJoined]) : {};
    const joinedUsers = eventIdForJoined ? (joinedUsersMapSingle[eventIdForJoined.toString()] || []) : [];

    // Format event image URLs and attach joinedUsers
    let formattedEvent = ticket.eventId;
    if (ticket.eventId && ticket.eventId.image !== undefined) {
      formattedEvent = {
        ...ticket.eventId.toObject ? ticket.eventId.toObject() : ticket.eventId,
        imageUrl: toImagePath(ticket.eventId.image),
        joinedUsers,
        joinedCount: joinedUsers.length,
      };
    } else if (ticket.eventId) {
      formattedEvent = {
        ...ticket.eventId.toObject ? ticket.eventId.toObject() : ticket.eventId,
        joinedUsers,
        joinedCount: joinedUsers.length,
      };
    }

    // Role-based access control
    const isAdmin = user && user.role === "admin";
    const isOrganizer = user && (user.role === "organizer" || user.role === "admin");
    const isOwner = ticket.userId._id.toString() === userId;
    const isEventOrganizer = ticket.organizerId._id.toString() === userId;

    // Build base ticket object
    const baseTicket = {
      id: ticket._id,
      event: formattedEvent,
      organizer: ticket.organizerId,
      username: ticket.username,
      email: ticket.email,
      phone: ticket.phone,
      status: ticket.status,
      accessKey: ticket.accessKey,
      qrCodeUrl: qrCodeUrl,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };

    // Add payment screenshot URL if available
    if (paymentScreenshotUrl) {
      baseTicket.paymentScreenshotUrl = paymentScreenshotUrl;
    }

    // Admin can see all tickets
    if (isAdmin) {
      return res.status(200).json({
        success: true,
        ticket: {
          ...baseTicket,
          user: ticket.userId,
        },
      });
    }

    // Organizer can see tickets for their own events
    if (isOrganizer && isEventOrganizer) {
      return res.status(200).json({
        success: true,
        ticket: {
          ...baseTicket,
          user: ticket.userId,
        },
      });
    }

    // User can see their own ticket
    if (isOwner) {
      return res.status(200).json({
        success: true,
        ticket: baseTicket,
      });
    }

    // Access denied
    return res.status(403).json({
      success: false,
      message: "Access denied. You don't have permission to view this ticket.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching ticket",
      error: error.message,
    });
  }
};

// ==================== GET TICKETS BY EVENT (ORGANIZER ONLY) ====================
const getTicketsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.userId;

    // Verify event exists
    const event = await EventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Verify organizer owns the event
    if (event.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view tickets for your own events.",
      });
    }

    const tickets = await TicketModel.find({ eventId })
      .populate("userId", "fullName username email")
      .sort({ createdAt: -1 });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

    const formattedTickets = tickets.map((ticket) => {
      // Build payment screenshot URL if exists
      let paymentScreenshotUrl = null;
      if (ticket.paymentScreenshotUrl) {
        paymentScreenshotUrl = ticket.paymentScreenshotUrl.startsWith("http")
          ? ticket.paymentScreenshotUrl
          : `${baseUrl}${ticket.paymentScreenshotUrl}`;
      }

      return {
        id: ticket._id,
        user: ticket.userId,
        username: ticket.username,
        email: ticket.email,
        phone: ticket.phone,
        status: ticket.status,
        accessKey: ticket.accessKey,
        qrCodeUrl: ticket.qrCodeUrl,
        paymentScreenshotUrl: paymentScreenshotUrl,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedTickets.length,
      tickets: formattedTickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching tickets",
      error: error.message,
    });
  }
};

// Helper: mark ticket expired if event date is in the past
const markExpiredIfEventPast = async (ticket) => {
  if (!ticket || !ticket.eventId || !ticket.eventId.date) return ticket;
  const eventDate = new Date(ticket.eventId.date);
  const now = new Date();

  if (
    eventDate < now &&
    ticket.status !== "used" &&
    ticket.status !== "cancelled" &&
    ticket.status !== "expired"
  ) {
    ticket.status = "expired";
    await ticket.save();
  }

  return ticket;
};

// ==================== SCAN TICKET / ENTRY VALIDATION ====================
const scanTicket = async (req, res) => {
  try {
    const { accessKey } = req.body;

    if (!accessKey) {
      return res.status(400).json({
        success: false,
        message: "Access key is required",
      });
    }

    // Find ticket by accessKey
    const ticket = await TicketModel.findOne({ accessKey })
      .populate("eventId", "title date time location")
      .populate("userId", "fullName username email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Invalid access key. Ticket not found.",
      });
    }

    // Auto-expire if event date has passed
    await markExpiredIfEventPast(ticket);

    if (ticket.status === "expired") {
      return res.status(400).json({
        success: false,
        message: "Event has ended. This ticket is expired.",
        ticket: {
          id: ticket._id,
          status: ticket.status,
          event: ticket.eventId,
        },
      });
    }

    // Check if ticket is confirmed
    if (ticket.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: `Ticket is not confirmed. Current status: ${ticket.status}`,
        ticket: {
          id: ticket._id,
          status: ticket.status,
        },
      });
    }

    // Check if ticket is already used
    if (ticket.status === "used") {
      return res.status(400).json({
        success: false,
        message: "Ticket has already been used",
        ticket: {
          id: ticket._id,
          status: ticket.status,
          event: ticket.eventId,
        },
      });
    }

    // Update ticket status to used
    ticket.status = "used";
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket validated successfully. Entry granted.",
      ticket: {
        id: ticket._id,
        event: ticket.eventId,
        user: ticket.userId,
        username: ticket.username,
        status: ticket.status,
        scannedAt: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error scanning ticket",
      error: error.message,
    });
  }
};

// ==================== GET ALL TICKETS (ADMIN ONLY) ====================
const getAllTickets = async (req, res) => {
  try {
    const { status, eventId, userId, page = 1, limit = 20 } = req.query;

    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (eventId) {
      filter.eventId = eventId;
    }
    if (userId) {
      filter.userId = userId;
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await TicketModel.countDocuments(filter);

    // Fetch tickets with pagination and sorting
    const tickets = await TicketModel.find(filter)
      .populate("userId", "name fullName email")
      .populate("eventId", "title date")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Auto-expire where needed
    await Promise.all(tickets.map((t) => markExpiredIfEventPast(t)));

    // Get base URL for payment screenshots
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

    // Format response
    const formattedTickets = tickets.map((ticket) => {
      // Build payment screenshot URL if exists
      let paymentScreenshotUrl = null;
      if (ticket.paymentScreenshotUrl) {
        paymentScreenshotUrl = ticket.paymentScreenshotUrl.startsWith("http")
          ? ticket.paymentScreenshotUrl
          : `${baseUrl}${ticket.paymentScreenshotUrl}`;
      }

      return {
        ticketId: ticket._id,
        status: ticket.status,
        accessKey: ticket.accessKey || null,
        paymentScreenshotUrl: paymentScreenshotUrl,
        createdAt: ticket.createdAt,
        user: ticket.userId
          ? {
              id: ticket.userId._id,
              name: ticket.userId.name || ticket.userId.fullName || "N/A",
              email: ticket.userId.email,
            }
          : null,
        event: ticket.eventId
          ? {
              id: ticket.eventId._id,
              title: ticket.eventId.title,
              date: ticket.eventId.date,
            }
          : null,
      };
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      count: formattedTickets.length,
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalCount,
      data: formattedTickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching tickets",
      error: error.message,
    });
  }
};

// ==================== UPDATE TICKET STATUS (ADMIN & EVENT OWNER) ====================
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const ticket = await TicketModel.findById(ticketId)
      .populate("eventId", "title date createdBy")
      .populate("userId", "fullName email")
      .populate("organizerId", "fullName email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const user = await UserModel.findById(req.userId);
    const isAdmin = user && user.role === "admin";
    const isOwner =
      ticket.organizerId &&
      ticket.organizerId._id.toString() === req.userId.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only admin or event owner can update ticket status.",
      });
    }

    // Determine allowed statuses based on role
    const adminAllowedStatuses = [
      "pending_payment",
      "payment_in_review",
      "confirmed",
      "used",
      "cancelled",
      "expired",
    ];
    const ownerAllowedStatuses = ["confirmed", "used"];
    const allowedStatuses = isAdmin ? adminAllowedStatuses : ownerAllowedStatuses;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status for your role. Allowed values: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    // Auto-expire if event is in the past (overrides requested status)
    if (ticket.eventId && ticket.eventId.date) {
      const eventDate = new Date(ticket.eventId.date);
      const now = new Date();
      if (
        eventDate < now &&
        ticket.status !== "used" &&
        ticket.status !== "cancelled"
      ) {
        ticket.status = "expired";
        await ticket.save();

        return res.status(200).json({
          success: true,
          message: "Event has ended. Ticket marked as expired.",
          ticket: {
            id: ticket._id,
            status: ticket.status,
            user: ticket.userId,
            event: ticket.eventId,
            updatedAt: ticket.updatedAt,
          },
        });
      }
    }

    ticket.status = status;
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      ticket: {
        id: ticket._id,
        status: ticket.status,
        user: ticket.userId,
        event: ticket.eventId,
        updatedAt: ticket.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating ticket status",
      error: error.message,
    });
  }
};

// ==================== UPDATE TICKET STATUS BY ACCESS KEY (ORGANIZER ONLY) ====================
const updateTicketStatusByAccessKey = async (req, res) => {
  try {
    const { accessKey } = req.body;
    const { status } = req.body;
    const userId = req.userId;

    // Find ticket by accessKey
    const ticket = await TicketModel.findOne({ accessKey })
      .populate("eventId", "title date createdBy")
      .populate("userId", "fullName email username")
      .populate("organizerId", "fullName email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found. Invalid ticket number.",
      });
    }

    // Verify user is organizer
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isAdmin = user.role === "admin";
    const isOrganizer = user.role === "organizer" || user.role === "admin";

    if (!isOrganizer) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only organizers can update ticket status.",
      });
    }

    // Verify organizer owns the event (unless admin)
    if (!isAdmin) {
      const eventOrganizerId = ticket.eventId?.createdBy?.toString() || ticket.organizerId?._id?.toString();
      if (eventOrganizerId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only update tickets for your own events.",
        });
      }
    }

    // Validate status transitions
    const currentStatus = ticket.status;

    // Check if ticket is already used
    if (currentStatus === "used") {
      return res.status(400).json({
        success: false,
        message: `Cannot update ticket status. This ticket has already been used and cannot be cancelled.`,
        currentStatus: currentStatus,
      });
    }

    // Check if ticket is already cancelled
    if (currentStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot update ticket status. This ticket has been cancelled and cannot be marked as used.`,
        currentStatus: currentStatus,
      });
    }

    // Check if current status is "confirmed" (user said "submitted" but code uses "confirmed")
    if (currentStatus !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: `Cannot update ticket status. Only tickets with "confirmed" (submitted) status can be updated. Current status: ${currentStatus}`,
        currentStatus: currentStatus,
      });
    }

    // Validate new status (only "used" or "cancelled" allowed)
    const allowedStatuses = ["used", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    // Update ticket status
    ticket.status = status;
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status} successfully`,
      ticket: {
        id: ticket._id,
        accessKey: ticket.accessKey,
        status: ticket.status,
        user: ticket.userId,
        event: ticket.eventId,
        updatedAt: ticket.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating ticket status",
      error: error.message,
    });
  }
};

// ==================== DELETE TICKET ====================
const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId;

    // Find ticket
    const ticket = await TicketModel.findById(ticketId)
      .populate("eventId", "title date createdBy")
      .populate("userId", "fullName email")
      .populate("organizerId", "fullName email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Check user role
    const user = await UserModel.findById(userId);
    const isAdmin = user && user.role === "admin";
    const isOwner = ticket.userId._id.toString() === userId.toString();

    // Authorization check
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own tickets.",
      });
    }

    // Admin can delete any ticket
    // Users can only delete their own tickets if status is pending_payment or payment_in_review
    if (!isAdmin) {
      const allowedStatuses = ["pending_payment", "payment_in_review"];
      if (!allowedStatuses.includes(ticket.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete ticket. Tickets with status "${ticket.status}" cannot be deleted. Only tickets with status "pending_payment" or "payment_in_review" can be deleted.`,
        });
      }
    }

    // Delete related payment records and screenshot files
    const payments = await PaymentModel.find({ ticketId: ticket._id });
    
    for (const payment of payments) {
      // Delete payment screenshot file if exists
      if (payment.screenshotUrl) {
        try {
          const screenshotPath = path.join(
            __dirname,
            "..",
            payment.screenshotUrl.startsWith('/') 
              ? payment.screenshotUrl.substring(1) 
              : payment.screenshotUrl
          );
          
          if (fs.existsSync(screenshotPath)) {
            fs.unlinkSync(screenshotPath);
            console.log('✅ Deleted payment screenshot:', screenshotPath);
          }
        } catch (deleteError) {
          // Log but don't fail the request if file deletion fails
          console.warn('⚠️ Failed to delete payment screenshot:', deleteError.message);
        }
      }
      
      // Delete payment record
      await PaymentModel.findByIdAndDelete(payment._id);
    }

    // Delete ticket
    await TicketModel.findByIdAndDelete(ticketId);

    console.log('✅ Ticket deleted:', {
      ticketId: ticket._id.toString(),
      deletedBy: isAdmin ? 'admin' : 'user',
      userId: userId,
      status: ticket.status,
    });

    return res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
      deletedTicket: {
        id: ticket._id,
        status: ticket.status,
        event: ticket.eventId?.title || 'N/A',
        user: ticket.userId?.fullName || 'N/A',
      },
    });
  } catch (error) {
    console.error('❌ Error deleting ticket:', {
      message: error.message,
      ticketId: req.params?.ticketId,
      userId: req.userId,
    });
    return res.status(500).json({
      success: false,
      message: "Error deleting ticket",
      error: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  getTicketsByEvent,
  scanTicket,
  getAllTickets,
  updateTicketStatus,
  updateTicketStatusByAccessKey,
  deleteTicket,
};
