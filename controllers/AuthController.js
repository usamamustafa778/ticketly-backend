const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserModel = require("../models/UserModel");
const OtpModel = require("../models/OtpModel");
const RefreshTokenModel = require("../models/RefreshTokenModel");
const TicketModel = require("../models/TicketModel");
const EventModel = require("../models/EventModel");
const { sendOtpEmail, isEmailConfigured } = require("../utils/emailService");

// ==================== HELPER: Generate Access & Refresh Tokens ====================
const generateTokens = async (userId) => {
  // Generate Access Token (short-lived: 15 minutes)
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });

  // Generate Refresh Token (long-lived: 7 days)
  const refreshToken = crypto.randomBytes(64).toString("hex");

  // Save refresh token to database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await RefreshTokenModel.create({
    userId,
    token: refreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

// ==================== SIGNUP ====================
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists",
        success: false,
      });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new UserModel({
      fullName: name,
      name: name,
      username: email.split("@")[0],
      email,
      password: hashedPassword,
      authProvider: "local",
      role: "user",
      isVerified: false,
    });
    await user.save();

    res.status(201).json({
      message: "User created successfully!",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message,
    });
  }
};

// ==================== LOGIN (STEP 1: Send OTP) ====================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found please signup first",
      });
    }

    // Check if user is using local auth
    if (user.authProvider !== "local") {
      return res.status(400).json({
        success: false,
        message: `Please login with ${user.authProvider}`,
      });
    }

    // Check if user has password
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Password not set. Please reset your password.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // If user is verified, skip OTP and login directly
    if (user.isVerified) {
      // Generate Access Token and Refresh Token
      const { accessToken, refreshToken } = await generateTokens(user._id);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          fullName: user.fullName || user.name,
          username: user.username,
          email: user.email,
          authProvider: user.authProvider,
          role: user.role,
          isVerified: user.isVerified,
          createdEvents: user.createdEvents || [],
          joinedEvents: user.joinedEvents || [],
          likedEvents: user.likedEvents || [],
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    }

    // User is not verified, proceed with OTP flow
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const tempToken = crypto.randomBytes(32).toString("hex");

    // Save OTP to database
    await OtpModel.findOneAndUpdate(
      { email },
      {
        email,
        otp,
        tempToken,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      },
      { upsert: true, new: true }
    );

    // Send OTP via email asynchronously (non-blocking)
    // This prevents timeout issues on Railway or slow network connections
    sendOtpEmail(email, otp)
      .then((success) => {
        if (success) {
          console.log(`✅ OTP email sent successfully to ${email}`);
        } else {
          console.error(`❌ Failed to send OTP email to ${email}`);
          console.log("📧 OTP is still available in database for verification");
          console.log(`   Email: ${email}`);
          console.log(`   OTP: ${otp}`);
        }
      })
      .catch((error) => {
        // Log error but don't block the response
        console.error(
          "⚠️  Failed to send OTP email in background:",
          error.message
        );
        console.error("Error stack:", error.stack);
        console.log("📧 OTP is still available in database for verification");
        console.log(`   Email: ${email}`);
        console.log(`   OTP: ${otp}`);
      });

    // Check if email is configured for response message
    const emailMessage = isEmailConfigured()
      ? "OTP sent to your email"
      : "OTP logged to console (development mode). Check server logs.";

    const response = {
      success: true,
      message: emailMessage,
      otpRequired: true,
      tempToken,
    };

    // Only include OTP in response if email is NOT configured (dev mode)
    if (!isEmailConfigured() && process.env.NODE_ENV !== "production") {
      response.devMode = true;
      response.otp = otp; // Only in dev mode when email not configured
    }

    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ==================== OTP VERIFY (STEP 2: Verify OTP & Login) ====================
const verifyOtp = async (req, res) => {
  try {
    const { otp, tempToken } = req.body;

    if (!otp || !tempToken) {
      return res.status(400).json({
        success: false,
        message: "OTP and tempToken are required",
      });
    }

    // Find OTP record
    const otpRecord = await OtpModel.findOne({ tempToken });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < Date.now()) {
      await OtpModel.deleteOne({ tempToken });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Find user by email
    const user = await UserModel.findOne({ email: otpRecord.email });
    if (!user) {
      await OtpModel.deleteOne({ tempToken });
      return res.status(404).json({
        success: false,
        message: "Email not found please signup first",
      });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Delete OTP record
    await OtpModel.deleteOne({ tempToken });

    // Generate Access Token and Refresh Token
    const { accessToken, refreshToken } = await generateTokens(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName || user.name,
        username: user.username,
        email: user.email,
        authProvider: user.authProvider,
        role: user.role,
        isVerified: user.isVerified,
        createdEvents: user.createdEvents || [],
        joinedEvents: user.joinedEvents || [],
        likedEvents: user.likedEvents || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GOOGLE OAUTH CALLBACK ====================
const googleCallback = async (req, res) => {
  try {
    const user = req.user; // From passport

    if (!user) {
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/login?error=authentication_failed`
      );
    }

    // Generate Access Token and Refresh Token
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&success=true`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/login?error=server_error`);
  }
};

// ==================== REFRESH TOKEN ====================
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Find refresh token in database
    const refreshTokenRecord = await RefreshTokenModel.findOne({
      token,
    }).populate("userId");

    if (!refreshTokenRecord) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Check if refresh token is expired
    if (refreshTokenRecord.expiresAt < new Date()) {
      await RefreshTokenModel.deleteOne({ token });
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired. Please login again.",
      });
    }

    // Check if user still exists
    if (!refreshTokenRecord.userId) {
      await RefreshTokenModel.deleteOne({ token });
      return res.status(404).json({
        success: false,
        message: "Email not found please signup first",
      });
    }

    // Delete old refresh token (one-time use)
    await RefreshTokenModel.deleteOne({ token });

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
      refreshTokenRecord.userId._id
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== GET USER PROFILE ====================
const getUserProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found please signup first",
      });
    }

    // Populate createdEvents
    const createdEvents = await EventModel.find({
      _id: { $in: user.createdEvents || [] },
    })
      .populate("createdBy", "fullName username email")
      .sort({ createdAt: -1 });

    // Populate likedEvents
    const likedEvents = await EventModel.find({
      _id: { $in: user.likedEvents || [] },
    })
      .populate("createdBy", "fullName username email")
      .sort({ createdAt: -1 });

    // Get joinedEvents with their tickets
    const joinedEventIds = user.joinedEvents || [];
    
    // Fetch all events in parallel
    const events = await EventModel.find({
      _id: { $in: joinedEventIds },
    })
      .populate("createdBy", "fullName username email")
      .sort({ createdAt: -1 });

    // Fetch all tickets for this user and these events in parallel
    const allTickets = await TicketModel.find({
      userId: req.userId,
      eventId: { $in: joinedEventIds },
    }).sort({ createdAt: -1 });

    // Group tickets by eventId
    const ticketsByEventId = {};
    allTickets.forEach((ticket) => {
      const eventIdStr = ticket.eventId.toString();
      if (!ticketsByEventId[eventIdStr]) {
        ticketsByEventId[eventIdStr] = [];
      }
      ticketsByEventId[eventIdStr].push({
        id: ticket._id,
        eventId: ticket.eventId,
        username: ticket.username,
        email: ticket.email,
        phone: ticket.phone,
        status: ticket.status,
        accessKey: ticket.accessKey,
        qrCodeUrl: ticket.qrCodeUrl,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      });
    });

    // Get base URL for profile image (use same baseUrl for event images)
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

    // Helper to format user profile image URL for joinedUsers
    const formatProfileImageUrl = (profileImage) => {
      if (!profileImage || profileImage === "") return null;
      if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) return profileImage;
      return profileImage.startsWith("/") ? `${baseUrl}${profileImage}` : `${baseUrl}/${profileImage}`;
    };

    // Build joinedUsers list per event (for created, joined, and liked events)
    const allProfileEventIds = [
      ...(createdEvents.map((e) => e._id)),
      ...(events.map((e) => e._id)),
      ...(likedEvents.map((e) => e._id)),
    ];
    const usersWhoJoined = await UserModel.find({ joinedEvents: { $in: allProfileEventIds } })
      .select("fullName username profileImage joinedEvents")
      .lean();
    const joinedByEventId = {};
    allProfileEventIds.forEach((id) => (joinedByEventId[id.toString()] = []));
    for (const u of usersWhoJoined) {
      const profileImageUrl = formatProfileImageUrl(u.profileImage);
      const userInfo = {
        _id: u._id,
        fullName: u.fullName || u.username || "User",
        name: u.fullName || u.username || "User",
        profileImageUrl: profileImageUrl || null,
      };
      const joinedIds = (u.joinedEvents || []).map((id) => id.toString());
      joinedIds.forEach((eid) => {
        if (joinedByEventId[eid]) joinedByEventId[eid].push(userInfo);
      });
    }

    // Helper function to format event image URLs (use same baseUrl as profile images)
    const formatEventImage = (imagePath) => {
      if (!imagePath || imagePath === "") {
        return {
          image: null,
          imageUrl: null,
        };
      }

      // If it's already a full URL, extract the relative path and reconstruct with current baseUrl
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        try {
          const url = new URL(imagePath);
          const relativePath = url.pathname;
          // Reconstruct URL using current baseUrl (same as profile images)
          return {
            image: relativePath,
            imageUrl: `${baseUrl}${relativePath}`,
          };
        } catch {
          // If URL parsing fails, treat as relative path
          return {
            image: imagePath,
            imageUrl: `${baseUrl}${imagePath}`,
          };
        }
      }

      // If it's a relative path (starts with /uploads/), construct full URL using same baseUrl as profile
      if (imagePath.startsWith("/uploads/")) {
        return {
          image: imagePath,
          imageUrl: `${baseUrl}${imagePath}`,
        };
      }

      // Otherwise return as is (could be external URL or empty)
      return {
        image: imagePath,
        imageUrl: imagePath,
      };
    };

    // Format joinedEvents with their tickets (include joinedUsers from backend)
    const joinedEventsData = events.map((event) => {
      const eventIdStr = event._id.toString();
      const eventImage = formatEventImage(event.image);
      const joinedUsers = joinedByEventId[eventIdStr] || [];
      const formattedEvent = {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        image: eventImage.image,
        imageUrl: eventImage.imageUrl,
        email: event.email,
        phone: event.phone,
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        status: event.status,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        joinedUsers,
        joinedCount: joinedUsers.length,
      };

      return {
        event: formattedEvent,
        tickets: ticketsByEventId[eventIdStr] || [],
      };
    });

    // Format createdEvents (include joinedUsers from backend)
    const formattedCreatedEvents = createdEvents.map((event) => {
      const eventImage = formatEventImage(event.image);
      const joinedUsers = joinedByEventId[event._id.toString()] || [];
      return {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        image: eventImage.image,
        imageUrl: eventImage.imageUrl,
        email: event.email,
        phone: event.phone,
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        status: event.status,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        joinedUsers,
        joinedCount: joinedUsers.length,
      };
    });

    // Format likedEvents (include joinedUsers from backend)
    const formattedLikedEvents = likedEvents.map((event) => {
      const eventImage = formatEventImage(event.image);
      const joinedUsers = joinedByEventId[event._id.toString()] || [];
      return {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        image: eventImage.image,
        imageUrl: eventImage.imageUrl,
        email: event.email,
        phone: event.phone,
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        status: event.status,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        joinedUsers,
        joinedCount: joinedUsers.length,
      };
    });

    const profileImageUrl = user.profileImage
      ? user.profileImage.startsWith("http")
        ? user.profileImage
        : `${baseUrl}${user.profileImage}`
      : null;

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName || user.name,
        username: user.username,
        email: user.email,
        authProvider: user.authProvider,
        role: user.role,
        isVerified: user.isVerified,
        profileImage: user.profileImage || null,
        profileImageUrl: profileImageUrl,
        createdEvents: formattedCreatedEvents,
        joinedEvents: joinedEventsData,
        likedEvents: formattedLikedEvents,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET ALL USERS (Admin Only) ====================
const getAllUsers = async (req, res) => {
  try {
    // This endpoint is protected by requireAdmin middleware
    // Only admin can access this endpoint
    const users = await UserModel.find().select("-password");
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

    const formattedUsers = users.map((user) => {
      const profileImageUrl = user.profileImage
        ? user.profileImage.startsWith("http")
          ? user.profileImage
          : `${baseUrl}${user.profileImage}`
        : null;

      return {
        id: user._id,
        fullName: user.fullName || user.name,
        username: user.username,
        email: user.email,
        authProvider: user.authProvider,
        role: user.role,
        isVerified: user.isVerified,
        profileImage: user.profileImage || null,
        profileImageUrl: profileImageUrl,
        createdEvents: user.createdEvents || [],
        joinedEvents: user.joinedEvents || [],
        likedEvents: user.likedEvents || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return res.status(200).json({ success: true, users: formattedUsers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UPDATE USER (Self Update) ====================
const updateUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const updateData = {};

    // Only update fields that are provided
    if (name) {
      updateData.name = name;
      updateData.fullName = name;
    }

    if (email) {
      // Check if email is already taken by another user
      const existingUser = await UserModel.findOne({
        email,
        _id: { $ne: req.userId },
      });
      if (existingUser) {
        return res.status(409).json({
          message: "Email already in use",
          success: false,
        });
      }
      updateData.email = email;
      // If email is being updated, mark as unverified
      updateData.isVerified = false;
    }

    if (password) {
      // Hash password if provided
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "Email not found please signup first",
        success: false,
      });
    }

    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
    const profileImageUrl = updatedUser.profileImage
      ? updatedUser.profileImage.startsWith("http")
        ? updatedUser.profileImage
        : `${baseUrl}${updatedUser.profileImage}`
      : null;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName || updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        authProvider: updatedUser.authProvider,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        profileImage: updatedUser.profileImage || null,
        profileImageUrl: profileImageUrl,
        createdEvents: updatedUser.createdEvents || [],
        joinedEvents: updatedUser.joinedEvents || [],
        likedEvents: updatedUser.likedEvents || [],
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UPDATE USER BY ADMIN ====================
const updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params; // User ID to update
    const { name, email, password, role, isVerified } = req.body;
    const updateData = {};

    // Check if target user exists
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Email not found please signup first",
      });
    }

    // Get current user (admin)
    const currentUser = await UserModel.findById(req.userId);

    // Prevent non-admin from updating admin
    if (targetUser.role === "admin" && currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admin can update admin users.",
      });
    }

    // Prevent non-admin from setting admin role
    if (role === "admin" && currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admin can assign admin role.",
      });
    }

    // Only update fields that are provided
    if (name) {
      updateData.name = name;
      updateData.fullName = name;
    }

    if (email) {
      // Check if email is already taken by another user
      const existingUser = await UserModel.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(409).json({
          message: "Email already in use",
          success: false,
        });
      }
      updateData.email = email;
      // If email is being updated, mark as unverified
      updateData.isVerified = false;
    }

    if (password) {
      // Hash password if provided
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Admin can update role
    if (role !== undefined) {
      if (!["user", "admin", "organizer"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be 'user', 'admin', or 'organizer'",
        });
      }
      updateData.role = role;
    }

    // Admin can update verification status
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "Email not found please signup first",
        success: false,
      });
    }

    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
    const profileImageUrl = updatedUser.profileImage
      ? updatedUser.profileImage.startsWith("http")
        ? updatedUser.profileImage
        : `${baseUrl}${updatedUser.profileImage}`
      : null;

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName || updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        authProvider: updatedUser.authProvider,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        profileImage: updatedUser.profileImage || null,
        profileImageUrl: profileImageUrl,
        createdEvents: updatedUser.createdEvents || [],
        joinedEvents: updatedUser.joinedEvents || [],
        likedEvents: updatedUser.likedEvents || [],
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== DELETE USER ====================
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await UserModel.findByIdAndDelete(req.userId);

    if (!deletedUser) {
      return res.status(404).json({
        message: "Email not found please signup first",
        success: false,
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UPLOAD PROFILE IMAGE ====================
const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.userId;

    // Enhanced logging for debugging
    console.log("========================================");
    console.log("📤 Profile image upload request received");
    console.log("========================================");
    console.log("User ID:", userId);
    console.log("Headers:", {
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
      authorization: req.headers["authorization"] ? "Present" : "Missing",
    });
    console.log("File received:", req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
    } : "No file");
    console.log("Body keys:", Object.keys(req.body || {}));
    console.log("========================================");

    if (!req.file) {
      console.error("❌ No file in request");
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        success: false,
        message: "Profile image is required. Please select an image file.",
      });
    }

    // Find user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      const fs = require("fs");
      const path = require("path");
      const oldImagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "profiles",
        path.basename(user.profileImage)
      );
      
      // Check if file exists before deleting
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (error) {
          console.error("Error deleting old profile image:", error);
          // Continue even if deletion fails
        }
      }
    }

    // Create profile image URL (relative path)
    const profileImageUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user profile image
    user.profileImage = profileImageUrl;
    await user.save();

    // Get base URL for full image URL
    // Construct from request if BASE_URL not set (handles both HTTP and HTTPS)
    let baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      const protocol = req.protocol || "http";
      const host = req.get("host") || `localhost:${process.env.PORT || 5001}`;
      baseUrl = `${protocol}://${host}`;
    }
    const fullImageUrl = `${baseUrl}${profileImageUrl}`;

    console.log("✅ Profile image uploaded successfully:");
    console.log("  - Filename:", req.file.filename);
    console.log("  - Original name:", req.file.originalname);
    console.log("  - MIME type:", req.file.mimetype);
    console.log("  - Size:", req.file.size, "bytes");
    console.log("  - Full URL:", fullImageUrl);
    console.log("  - User ID:", userId);

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      profileImage: profileImageUrl,
      profileImageUrl: fullImageUrl,
      user: {
        id: user._id,
        fullName: user.fullName || user.name,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Error uploading profile image:", {
      message: error.message,
      stack: error.stack,
      userId: req.userId,
    });
    return res.status(500).json({
      success: false,
      message: "Error uploading profile image. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
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
  uploadProfileImage,
};
