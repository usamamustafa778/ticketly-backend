const PaymentModel = require("../models/PaymentModel");
const TicketModel = require("../models/TicketModel");
const EventModel = require("../models/EventModel");
const UserModel = require("../models/UserModel");
const { generateQRCode, generateAccessKey } = require("../utils/qrCodeService");
const path = require("path");
const fs = require("fs");

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

// ==================== SUBMIT PAYMENT (SCREENSHOT UPLOAD) ====================
const submitPayment = async (req, res) => {
  try {
    // Extract ticketId and method from request body
    // With multipart/form-data, multer parses these into req.body
    const ticketId = req.body?.ticketId?.trim();
    const method = (req.body?.method || 'manual').trim();
    const userId = req.userId;

    // Validate ticketId is present
    if (!ticketId || typeof ticketId !== 'string' || ticketId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "ticketId is required and must be a valid string",
      });
    }

    // Validate screenshot file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Payment screenshot is required",
      });
    }

    // Fetch ticket and populate event (source of truth for amount)
    const ticket = await TicketModel.findById(ticketId).populate("eventId");
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Validate ticket belongs to user
    if (ticket.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This ticket does not belong to you.",
      });
    }

    // Validate event exists (handle both populated and unpopulated eventId)
    const eventId = ticket.eventId._id || ticket.eventId;
    if (!eventId) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Derive amount from event.ticketPrice (source of truth)
    // eventId is populated, so access ticketPrice directly
    const event = ticket.eventId;
    const amount = (event && typeof event.ticketPrice === 'number')
      ? event.ticketPrice
      : 0; // Allow 0-priced (free) events to submit payments/screenhots; admin will verify manually

    // Idempotency check: reject if ticket status is already confirmed or used (allow updates when in_review)
    if (["confirmed", "used"].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be submitted. Ticket status is already: ${ticket.status}`,
      });
    }

    // Validate ticket status is pending_payment or payment_in_review (allow updates)
    if (!["pending_payment", "payment_in_review"].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be submitted. Ticket status is: ${ticket.status}`,
      });
    }

    // Auto-delete old payment screenshot if exists
    const existingPayment = await PaymentModel.findOne({ ticketId: ticket._id });
    if (existingPayment && existingPayment.screenshotUrl) {
      try {
        // Construct full file path (screenshotUrl is relative like /uploads/payments/filename.jpg)
        const oldScreenshotPath = path.join(
          __dirname,
          "..",
          existingPayment.screenshotUrl.startsWith('/') 
            ? existingPayment.screenshotUrl.substring(1) 
            : existingPayment.screenshotUrl
        );
        
        // Check if file exists before deleting
        if (fs.existsSync(oldScreenshotPath)) {
          fs.unlinkSync(oldScreenshotPath);
        }
      } catch (deleteError) {
        // Log but don't fail the request if old file deletion fails
        console.warn('⚠️ Failed to delete old screenshot:', deleteError.message);
      }
    }

    const screenshotUrl = `/uploads/payments/${req.file.filename}`;

    // If existing payment found, update it; otherwise create new
    let payment;
    if (existingPayment) {
      // Update existing payment record
      existingPayment.amount = amount;
      existingPayment.method = method || "manual";
      existingPayment.screenshotUrl = screenshotUrl;
      existingPayment.status = "pending";
      existingPayment.updatedAt = new Date();
      await existingPayment.save();
      payment = existingPayment;
    } else {
      // Create new payment record
      payment = new PaymentModel({
        ticketId: ticket._id,
        userId,
        eventId: eventId, // Use the extracted eventId
        amount,
        method: method || "manual",
        screenshotUrl,
        status: "pending",
      });
      await payment.save();
    }

    ticket.status = "payment_in_review";
    ticket.paymentScreenshotUrl = screenshotUrl;
    await ticket.save();

    // Minimal professional log
    console.log('💳 Payment submitted:', {
      ticketId: ticket._id.toString(),
      amount,
      status: 'payment_in_review',
    });

    return res.status(201).json({
      success: true,
      message: "Payment screenshot uploaded successfully. Your ticket is now in review. Our team will verify your payment within 24-48 hours. You can update the screenshot until verification is complete.",
      payment: {
        id: payment._id,
        ticketId: payment.ticketId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        screenshotUrl: payment.screenshotUrl,
        createdAt: payment.createdAt,
      },
      ticket: {
        id: ticket._id,
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error('❌ Payment submission error:', {
      message: error.message,
      ticketId: req.body?.ticketId,
      userId: req.userId,
    });
    return res.status(500).json({
      success: false,
      message: "Error submitting payment",
      error: error.message,
    });
  }
};

// ==================== ADMIN VERIFY PAYMENT ====================
const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, adminNote } = req.body; // action: "approve" or "reject"
    const adminId = req.userId;

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action is required and must be 'approve' or 'reject'",
      });
    }

    // Find payment
    const payment = await PaymentModel.findById(paymentId)
      .populate("ticketId")
      .populate("eventId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Payment has already been ${payment.status}`,
      });
    }

    // Update payment status
    payment.status = action === "approve" ? "approved" : "rejected";
    payment.adminNote = adminNote || "";
    payment.verifiedAt = new Date();
    payment.verifiedBy = adminId;

    await payment.save();

    // If approved, generate QR code from existing accessKey, update ticket status
    if (action === "approve") {
      const ticket = await TicketModel.findById(payment.ticketId);

      // Use existing accessKey (generated during ticket creation)
      // If for some reason it doesn't exist (old tickets), generate it
      let accessKey = ticket.accessKey;
      if (!accessKey) {
        accessKey = generateAccessKey();
        // Ensure uniqueness
        let existingTicket = await TicketModel.findOne({ accessKey });
        while (existingTicket) {
          accessKey = generateAccessKey();
          existingTicket = await TicketModel.findOne({ accessKey });
        }
        ticket.accessKey = accessKey;
      }

      // Generate QR code from the accessKey
      const qrCodeUrl = await generateQRCode(accessKey);

      // Update ticket
      ticket.qrCodeUrl = qrCodeUrl;
      ticket.status = "confirmed";
      await ticket.save();

      return res.status(200).json({
        success: true,
        message: "Payment approved. Ticket confirmed with QR code generated.",
        payment: {
          id: payment._id,
          status: payment.status,
          adminNote: payment.adminNote,
          screenshotUrl: toImagePath(payment.screenshotUrl),
          verifiedAt: payment.verifiedAt,
        },
        ticket: {
          id: ticket._id,
          status: ticket.status,
          accessKey: ticket.accessKey,
          qrCodeUrl: ticket.qrCodeUrl,
        },
      });
    }

    // If rejected, update ticket status back to pending_payment and clear screenshot URL
    const ticket = await TicketModel.findById(payment.ticketId);
    ticket.status = "pending_payment";
    ticket.paymentScreenshotUrl = ""; // Clear screenshot URL on rejection
    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Payment rejected. Ticket status updated to pending_payment.",
      payment: {
        id: payment._id,
        status: payment.status,
        adminNote: payment.adminNote,
        screenshotUrl: toImagePath(payment.screenshotUrl),
        verifiedAt: payment.verifiedAt,
      },
      ticket: {
        id: ticket._id,
        status: ticket.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

// ==================== GET MY PAYMENTS ====================
const getMyPayments = async (req, res) => {
  try {
    const userId = req.userId;

    const payments = await PaymentModel.find({ userId })
      .populate("ticketId", "username email phone status accessKey qrCodeUrl")
      .populate("eventId", "title date time location ticketPrice")
      .sort({ createdAt: -1 });

    const formattedPayments = payments.map((payment) => {
      const screenshotUrl = toImagePath(payment.screenshotUrl);

      return {
        id: payment._id,
        ticket: payment.ticketId,
        event: payment.eventId,
        amount: payment.amount,
        method: payment.method,
        screenshotUrl: screenshotUrl,
        status: payment.status,
        adminNote: payment.adminNote,
        verifiedAt: payment.verifiedAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedPayments.length,
      payments: formattedPayments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
};

// ==================== GET PAYMENT BY ID ====================
const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.userId;

    const payment = await PaymentModel.findById(paymentId)
      .populate("ticketId")
      .populate("eventId")
      .populate("userId", "fullName username email")
      .populate("verifiedBy", "fullName username email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check access: user can see their own payments, admin can see all
    const user = await UserModel.findById(userId);
    const isAdmin = user && user.role === "admin";
    const isOwner = payment.userId._id.toString() === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own payments.",
      });
    }

    const screenshotUrl = toImagePath(payment.screenshotUrl);

    return res.status(200).json({
      success: true,
      payment: {
        id: payment._id,
        ticket: payment.ticketId,
        event: payment.eventId,
        user: payment.userId,
        amount: payment.amount,
        method: payment.method,
        screenshotUrl: screenshotUrl,
        status: payment.status,
        adminNote: payment.adminNote,
        verifiedAt: payment.verifiedAt,
        verifiedBy: payment.verifiedBy,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching payment",
      error: error.message,
    });
  }
};

// ==================== GET ALL PENDING PAYMENTS (ADMIN ONLY) ====================
const getPendingPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await PaymentModel.countDocuments({ status: "pending" });

    // Fetch pending payments with pagination
    const payments = await PaymentModel.find({ status: "pending" })
      .populate("ticketId", "username email phone status")
      .populate("eventId", "title date time location ticketPrice")
      .populate("userId", "fullName username email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formattedPayments = payments.map((payment) => {
      const screenshotUrl = toImagePath(payment.screenshotUrl);

      return {
        id: payment._id,
        ticket: payment.ticketId,
        event: payment.eventId,
        user: payment.userId,
        amount: payment.amount,
        method: payment.method,
        screenshotUrl: screenshotUrl,
        status: payment.status,
        createdAt: payment.createdAt,
      };
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      count: formattedPayments.length,
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalCount,
      payments: formattedPayments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching pending payments",
      error: error.message,
    });
  }
};

module.exports = {
  submitPayment,
  verifyPayment,
  getMyPayments,
  getPaymentById,
  getPendingPayments,
};
