const EventModel = require("../models/EventModel");
const UserModel = require("../models/UserModel");

// Normalize image to relative path for DB storage (never store full URLs)
const normalizeImageToRelativePath = (imageInput) => {
  if (!imageInput || imageInput === "") return "";
  if (imageInput.startsWith("/uploads/")) return imageInput;
  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    try {
      const url = new URL(imageInput);
      return url.pathname;
    } catch {
      return imageInput;
    }
  }
  return imageInput.startsWith("/") ? imageInput : `/${imageInput}`;
};

// Return only relative path for imageUrl (no base URL) - client constructs full URL from API_BASE_URL
const formatEventImage = (imagePath) => {
  if (!imagePath || imagePath === "") return { imageUrl: null };

  // Extract path from full URL if stored (legacy), otherwise use as path
  let path = imagePath;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    try {
      path = new URL(imagePath).pathname;
    } catch {
      const i = imagePath.indexOf("/uploads");
      path = i !== -1 ? imagePath.substring(i) : imagePath;
    }
  } else if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  return { imageUrl: path };
};

// ==================== CREATE EVENT ====================
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      image,
      email,
      phone,
      ticketPrice,
      totalTickets,
    } = req.body;

    // Store only relative path in DB (never full URLs)
    const imagePathToStore = normalizeImageToRelativePath(image);

    // Create event with status = "pending" (phone and totalTickets are optional)
    const event = new EventModel({
      title,
      description,
      date,
      time,
      location,
      image: imagePathToStore,
      email,
      phone: phone || "",
      ticketPrice,
      totalTickets: totalTickets ?? 0,
      status: "pending",
      createdBy: req.userId,
    });

    await event.save();

    // Add event to user's createdEvents array
    const user = await UserModel.findById(req.userId);
    if (user) {
      // Convert to strings for comparison
      const createdEventIds = user.createdEvents.map((id) => id.toString());
      const eventIdStr = event._id.toString();

      if (!createdEventIds.includes(eventIdStr)) {
        user.createdEvents.push(event._id);
        await user.save();
      }
    }

    const eventImage = formatEventImage(event.image);

    return res.status(201).json({
      success: true,
      message: "Your request has been sent. We will contact you shortly.",
      event: {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        imageUrl: eventImage.imageUrl,
        email: event.email,
        phone: event.phone,
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        status: event.status,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error.message,
    });
  }
};

// Return only relative path (no base URL) - client constructs full URL from API_BASE_URL
const formatProfileImageUrl = (profileImage) => {
  if (!profileImage || profileImage === "") return null;
  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
    try {
      return new URL(profileImage).pathname;
    } catch {
      const i = profileImage.indexOf("/uploads");
      return i !== -1 ? profileImage.substring(i) : profileImage;
    }
  }
  return profileImage.startsWith("/") ? profileImage : `/${profileImage}`;
};

// ==================== GET ALL APPROVED EVENTS (PUBLIC) ====================
const getApprovedEvents = async (req, res) => {
  try {
    // Return ONLY approved events with limited fields for explore page
    const events = await EventModel.find({ status: "approved" })
      .select(
        "title description date time location image ticketPrice totalTickets createdAt createdBy"
      )
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName username email")
      .lean();

    const eventIds = events.map((e) => e._id);

    // Users who joined any of these events (joinedEvents stores event IDs)
    const usersWhoJoined = await UserModel.find({ joinedEvents: { $in: eventIds } })
      .select("fullName username profileImage joinedEvents")
      .lean();

    const joinedByEventId = {};
    eventIds.forEach((id) => (joinedByEventId[id.toString()] = []));
    for (const user of usersWhoJoined) {
      const profileImageUrl = formatProfileImageUrl(user.profileImage);
      const userInfo = {
        _id: user._id,
        fullName: user.fullName || user.username || "User",
        name: user.fullName || user.username || "User",
        profileImageUrl: profileImageUrl || null,
      };
      const joinedIds = (user.joinedEvents || []).map((id) => id.toString());
      joinedIds.forEach((eid) => {
        if (joinedByEventId[eid]) joinedByEventId[eid].push(userInfo);
      });
    }

    // Format image URLs (both relative and full URL) and attach joinedUsers
    const formattedEvents = events.map((event) => {
      const joinedUsers = joinedByEventId[event._id.toString()] || [];
      try {
        const eventImage = formatEventImage(event.image || "");
        return {
          _id: event._id,
          title: event.title,
          description: event.description || "",
          date: event.date,
          time: event.time,
          location: event.location,
          imageUrl: eventImage.imageUrl,
          ticketPrice: event.ticketPrice,
          totalTickets: event.totalTickets,
          createdAt: event.createdAt,
          createdBy: event.createdBy || null,
          joinedUsers,
          joinedCount: joinedUsers.length,
        };
      } catch (formatError) {
        console.error("Error formatting event:", formatError);
        return {
          _id: event._id,
          title: event.title,
          description: event.description || "",
          date: event.date,
          time: event.time,
          location: event.location,
          image: null,
          imageUrl: null,
          ticketPrice: event.ticketPrice,
          totalTickets: event.totalTickets,
          createdAt: event.createdAt,
          createdBy: event.createdBy || null,
          joinedUsers,
          joinedCount: joinedUsers.length,
        };
      }
    });

    return res.status(200).json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents,
    });
  } catch (error) {
    console.error("Error in getApprovedEvents:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching events",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};

// ==================== GET MY EVENTS ====================
const getMyEvents = async (req, res) => {
  try {
    // Return events created by logged-in user (include status for profile view)
    const events = await EventModel.find({ createdBy: req.userId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName username email");

    const eventIds = events.map((e) => e._id);
    const usersWhoJoined = await UserModel.find({ joinedEvents: { $in: eventIds } })
      .select("fullName username profileImage joinedEvents")
      .lean();
    const joinedByEventId = {};
    eventIds.forEach((id) => (joinedByEventId[id.toString()] = []));
    for (const user of usersWhoJoined) {
      const userInfo = {
        _id: user._id,
        fullName: user.fullName || user.username || "User",
        name: user.fullName || user.username || "User",
        profileImageUrl: formatProfileImageUrl(user.profileImage) || null,
      };
      (user.joinedEvents || []).forEach((eid) => {
        const eidStr = eid.toString();
        if (joinedByEventId[eidStr]) joinedByEventId[eidStr].push(userInfo);
      });
    }

    const formattedEvents = events.map((event) => {
      const eventImage = formatEventImage(event.image);
      const joinedUsers = joinedByEventId[event._id.toString()] || [];
      return {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
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

    return res.status(200).json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching your events",
      error: error.message,
    });
  }
};

// ==================== GET EVENT BY ID (PUBLIC) ====================
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || null; // Optional: from optional auth

    const event = await EventModel.findById(id).populate(
      "createdBy",
      "fullName username email role"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Users who joined this event
    const usersWhoJoined = await UserModel.find({ joinedEvents: event._id })
      .select("fullName username profileImage")
      .lean();
    const joinedUsers = usersWhoJoined.map((u) => ({
      _id: u._id,
      fullName: u.fullName || u.username || "User",
      name: u.fullName || u.username || "User",
      profileImageUrl: formatProfileImageUrl(u.profileImage) || null,
    }));

    // Like count: users who liked this event
    const likeCount = await UserModel.countDocuments({ likedEvents: event._id });

    // isLiked: whether current user has liked (when authenticated)
    let isLiked = false;
    if (userId) {
      const user = await UserModel.findById(userId).select("likedEvents").lean();
      if (user && user.likedEvents && user.likedEvents.some((eid) => eid.toString() === event._id.toString())) {
        isLiked = true;
      }
    }

    // Format event image URLs
    const eventImage = formatEventImage(event.image);

    // Public endpoint - anyone can view any event by ID
    return res.status(200).json({
      success: true,
      event: {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
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
        likeCount,
        isLiked,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching event",
      error: error.message,
    });
  }
};

// ==================== LIKE EVENT ====================
const likeEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await EventModel.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const eventIdStr = event._id.toString();
    const likedIds = (user.likedEvents || []).map((eid) => eid.toString());
    if (likedIds.includes(eventIdStr)) {
      return res.status(200).json({ success: true, message: "Already liked", liked: true });
    }

    user.likedEvents = user.likedEvents || [];
    user.likedEvents.push(event._id);
    await user.save();

    const likeCount = await UserModel.countDocuments({ likedEvents: event._id });
    return res.status(200).json({
      success: true,
      message: "Event liked",
      liked: true,
      likeCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UNLIKE EVENT ====================
const unlikeEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await EventModel.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const eventIdStr = event._id.toString();
    user.likedEvents = (user.likedEvents || []).filter((eid) => eid.toString() !== eventIdStr);
    await user.save();

    const likeCount = await UserModel.countDocuments({ likedEvents: event._id });
    return res.status(200).json({
      success: true,
      message: "Event unliked",
      liked: false,
      likeCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UPDATE EVENT ====================
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      date,
      time,
      location,
      image,
      email,
      phone,
      ticketPrice,
      totalTickets,
    } = req.body;

    const event = await EventModel.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is owner or admin
    const user = await UserModel.findById(req.userId);
    const isOwner = event.createdBy.toString() === req.userId;
    const isAdmin = user && user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only event owner or admin can update this event.",
      });
    }

    // Update fields - normalize image to relative path for storage
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (date) updateData.date = date;
    if (time) updateData.time = time;
    if (location) updateData.location = location;
    if (image !== undefined) updateData.image = normalizeImageToRelativePath(image);
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (ticketPrice !== undefined) updateData.ticketPrice = ticketPrice;
    if (totalTickets !== undefined) updateData.totalTickets = totalTickets;

    const updatedEvent = await EventModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("createdBy", "fullName username email");

    // Format event image URLs
    const eventImage = formatEventImage(updatedEvent.image);

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: {
        id: updatedEvent._id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        date: updatedEvent.date,
        time: updatedEvent.time,
        location: updatedEvent.location,
        imageUrl: eventImage.imageUrl,
        email: updatedEvent.email,
        phone: updatedEvent.phone,
        ticketPrice: updatedEvent.ticketPrice,
        totalTickets: updatedEvent.totalTickets,
        status: updatedEvent.status,
        createdBy: updatedEvent.createdBy,
        createdAt: updatedEvent.createdAt,
        updatedAt: updatedEvent.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating event",
      error: error.message,
    });
  }
};

// ==================== DELETE EVENT ====================
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EventModel.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is owner or admin
    const user = await UserModel.findById(req.userId);
    const isOwner = event.createdBy.toString() === req.userId;
    const isAdmin = user && user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only event owner or admin can delete this event.",
      });
    }

    // Hard delete
    await EventModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting event",
      error: error.message,
    });
  }
};

// ==================== GET PENDING EVENTS (ADMIN ONLY) ====================
const getPendingEvents = async (req, res) => {
  try {
    // Return all pending events
    const events = await EventModel.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName username email phone");

    const formattedEvents = events.map((event) => {
      const eventImage = formatEventImage(event.image);
      return {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        imageUrl: eventImage.imageUrl,
        email: event.email,
        phone: event.phone,
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        status: event.status,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching pending events",
      error: error.message,
    });
  }
};

// ==================== APPROVE EVENT (ADMIN ONLY) ====================
const approveEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await EventModel.findById(id).populate("createdBy");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Event is already approved",
      });
    }

    // Update event status to "approved"
    event.status = "approved";
    await event.save();

    // Update user role to "organizer" if not already admin
    const creator = await UserModel.findById(event.createdBy._id);
    if (creator && creator.role !== "admin") {
      creator.role = "organizer";
      await creator.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "Event approved successfully. Creator has been assigned organizer role.",
      event: {
        id: event._id,
        title: event.title,
        status: event.status,
        createdBy: {
          id: creator._id,
          fullName: creator.fullName,
          email: creator.email,
          role: creator.role,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error approving event",
      error: error.message,
    });
  }
};

// ==================== UPLOAD EVENT IMAGE ====================
const uploadEventImage = async (req, res) => {
  try {
    // Log request details for debugging
    console.log("========================================");
    console.log("Upload image request received");
    console.log("========================================");
    console.log("Headers:", {
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
      authorization: req.headers["authorization"] ? "Present" : "Missing",
    });
    console.log("File:", req.file);
    console.log("Files:", req.files);
    console.log("Body:", req.body);
    console.log("Body keys:", Object.keys(req.body || {}));
    console.log("Body.image:", req.body?.image);
    console.log("Request method:", req.method);
    console.log("Request URL:", req.originalUrl);
    console.log("========================================");

    if (!req.file) {
      console.error("❌ No file in request");
      console.error("Multer received body:", JSON.stringify(req.body, null, 2));
      console.error("Multer fieldname 'image':", req.body?.image);
      console.error("Request headers content-type:", req.headers["content-type"]);
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please select an image file.",
      });
    }

    // Return only relative path - client constructs full URL from API_BASE_URL
    const imagePath = `/uploads/events/${req.file.filename}`;

    console.log("✅ Image uploaded successfully:");
    console.log("  - Filename:", req.file.filename);
    console.log("  - Path:", imagePath);
    console.log("========================================");

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: imagePath,
    });
  } catch (error) {
    console.error("❌ Error uploading event image:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      userId: req.userId,
    });
    console.log("========================================");
    return res.status(500).json({
      success: false,
      message: "Error uploading image. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createEvent,
  getApprovedEvents,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getPendingEvents,
  approveEvent,
  uploadEventImage,
  likeEvent,
  unlikeEvent,
};
