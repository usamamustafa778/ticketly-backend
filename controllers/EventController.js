const mongoose = require("mongoose");
const EventModel = require("../models/EventModel");
const UserModel = require("../models/UserModel");
const TicketModel = require("../models/TicketModel");
const { createNotification, createNotificationForMany } = require("../utils/notificationService");

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
      gender,
      category,
      ticketPrice,
      totalTickets,
      ticketTheme,
    } = req.body;

    // Store only relative path in DB (never full URLs)
    const imagePathToStore = normalizeImageToRelativePath(image);

    const eventData = {
      title,
      description,
      date,
      time,
      location,
      image: imagePathToStore,
      email,
      phone: phone || "",
      gender: gender || "all",
      category: (category && String(category).trim()) ? String(category).trim().toLowerCase() : "other",
      ticketPrice,
      totalTickets: totalTickets ?? 0,
      status: "pending",
      createdBy: req.userId,
      ...(ticketTheme && typeof ticketTheme === "object" && { ticketTheme }),
    };

    const event = new EventModel(eventData);

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

    const eventPayload = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      imageUrl: eventImage.imageUrl,
      email: event.email,
      phone: event.phone,
      gender: event.gender,
      category: event.category || "other",
      ticketPrice: event.ticketPrice,
      totalTickets: event.totalTickets,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
    if (event.ticketTheme) eventPayload.ticketTheme = event.ticketTheme;

    return res.status(201).json({
      success: true,
      message: "Your request has been sent. We will contact you shortly.",
      event: eventPayload,
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

const formatCreatedByWithProfileImage = (cb) => {
  if (!cb) return null;
  const profileImageUrl = formatProfileImageUrl(cb.profileImage) || null;
  return {
    _id: cb._id,
    id: cb._id,
    fullName: cb.fullName,
    username: cb.username,
    email: cb.email,
    profileImageUrl,
  };
};

// ==================== GET ALL APPROVED EVENTS (PUBLIC + OPTIONAL PERSONALIZATION) ====================
const getApprovedEvents = async (req, res) => {
  try {
    // Fail fast with a clear message when DB is not connected (common local issue)
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message:
          "Database not connected. Check MONGO_URI in .env and that MongoDB is running.",
      });
    }
    const userId = req.userId || null;

    // Return ONLY approved events with limited fields for explore page / home feed
    const events = await EventModel.find({ status: "approved" })
      .select(
        "title description date time location image category gender ticketTheme ticketPrice totalTickets createdAt createdBy"
      )
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName username email profileImage")
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

    // Pre-compute ticket counts per event to expose remainingTickets
    const ticketCounts = await TicketModel.aggregate([
      { $match: { eventId: { $in: eventIds }, status: { $nin: ["cancelled", "expired"] } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);
    const ticketCountByEventId = {};
    ticketCounts.forEach((t) => {
      ticketCountByEventId[t._id.toString()] = t.count;
    });

    // Format image URLs (both relative and full URL), attach joinedUsers and remainingTickets
    const formattedEvents = events.map((event) => {
      const joinedUsers = joinedByEventId[event._id.toString()] || [];
      try {
        const soldCount = ticketCountByEventId[event._id.toString()] || 0;
        const remainingTickets =
          event.totalTickets && event.totalTickets > 0
            ? Math.max(0, event.totalTickets - soldCount)
            : null;
        const eventImage = formatEventImage(event.image || "");
        const out = {
          _id: event._id,
          title: event.title,
          description: event.description || "",
          date: event.date,
          time: event.time,
          location: event.location,
          imageUrl: eventImage.imageUrl,
          gender: event.gender,
          category: event.category || "other",
          ticketPrice: event.ticketPrice,
          totalTickets: event.totalTickets,
          remainingTickets,
          ticketTheme: event.ticketTheme || null,
          createdAt: event.createdAt,
          createdBy: formatCreatedByWithProfileImage(event.createdBy),
          joinedUsers,
          joinedCount: joinedUsers.length,
        };
        if (event.ticketTheme) out.ticketTheme = event.ticketTheme;
        return out;
      } catch (formatError) {
        console.error("Error formatting event:", formatError);
        const fallback = {
          _id: event._id,
          title: event.title,
          description: event.description || "",
          date: event.date,
          time: event.time,
          location: event.location,
          image: null,
          imageUrl: null,
          gender: event.gender,
          category: event.category || "other",
          ticketPrice: event.ticketPrice,
          totalTickets: event.totalTickets,
          ticketTheme: event.ticketTheme || null,
          createdAt: event.createdAt,
          createdBy: formatCreatedByWithProfileImage(event.createdBy),
          joinedUsers,
          joinedCount: joinedUsers.length,
        };
        if (event.ticketTheme) fallback.ticketTheme = event.ticketTheme;
        return fallback;
      }
    });

    // ==================== OPTIONAL: PERSONALIZED FOLLOWING FEED + SUGGESTED ACCOUNTS ====================
    let suggestedData = null;

    if (userId) {
      try {
        const user = await UserModel.findById(userId)
          .select("following likedEvents joinedEvents")
          .lean();

        if (user) {
          const followingIds = (user.following || []).map((id) => id.toString());
          const likedEventIds = (user.likedEvents || []).map((id) => id.toString());
          const joinedEventIds = (user.joinedEvents || []).map((id) => id.toString());

          // Events created by people the user follows (for Following tab)
          const followingEvents = formattedEvents.filter((event) => {
            const creatorId = event.createdBy?._id || event.createdBy?.id;
            if (!creatorId) return false;
            return followingIds.includes(creatorId.toString());
          });

          // Build interest categories from liked + joined events
          const interestEventIdSet = new Set(
            [...likedEventIds, ...joinedEventIds].map((id) => id.toString())
          );
          const interestCategoriesSet = new Set();
          events.forEach((e) => {
            if (interestEventIdSet.has(e._id.toString()) && e.category) {
              interestCategoriesSet.add(String(e.category).toLowerCase());
            }
          });

          // Collect candidate organizers (creators of approved events)
          const creatorIdSet = new Set();
          const eventsByCreatorId = {};
          events.forEach((e) => {
            const cb = e.createdBy;
            const cid = cb && (cb._id || cb.id);
            if (!cid) return;
            const cidStr = cid.toString();
            creatorIdSet.add(cidStr);
            if (!eventsByCreatorId[cidStr]) eventsByCreatorId[cidStr] = [];
            eventsByCreatorId[cidStr].push(e);
          });

          const creatorIds = Array.from(creatorIdSet).filter(
            (cid) => cid !== userId.toString() && !followingIds.includes(cid)
          );

          let suggestedAccounts = [];

          if (creatorIds.length > 0) {
            const creators = await UserModel.find({ _id: { $in: creatorIds } })
              .select("fullName username profileImage followers role")
              .lean();

            const followingIdSet = new Set(followingIds);

            const scoreAndAccounts = creators.map((creator) => {
              const cid = creator._id.toString();
              const creatorEvents = eventsByCreatorId[cid] || [];
              const creatorCategories = new Set(
                creatorEvents
                  .map((e) => (e.category ? String(e.category).toLowerCase() : null))
                  .filter(Boolean)
              );

              // Compute simple scores / reason types
              const followers = creator.followers || [];
              const followerIds = followers.map((id) => id.toString());
              const followerCount = followerIds.length;

              const hasInterestOverlap = Array.from(creatorCategories).some((cat) =>
                interestCategoriesSet.has(cat)
              );
              const socialProofCount = followerIds.filter((fid) =>
                followingIdSet.has(fid)
              ).length;

              let reasonType = "curated";
              let reasonLabel = "Ticketly pick";
              let score = 0;

              if (hasInterestOverlap && interestCategoriesSet.size > 0) {
                reasonType = "interest";
                reasonLabel = "Matches your interests";
                score += 30;
              }

              if (socialProofCount > 0) {
                reasonType = "social_proof";
                reasonLabel = "Followed by people you follow";
                score += 40 + Math.min(socialProofCount, 5);
              }

              if (followerCount > 0) {
                // Treat higher follower count as "trending"
                if (score === 0) {
                  reasonType = "trending";
                  reasonLabel = "Trending this week";
                }
                score += Math.min(followerCount, 50);
              }

              // If still zero score (very new account), keep curated label
              if (score === 0) score = 10;

              const profileImageUrl = formatProfileImageUrl(creator.profileImage) || null;

              return {
                score,
                account: {
                  _id: creator._id,
                  id: creator._id,
                  fullName: creator.fullName || creator.username || "User",
                  username: creator.username,
                  profileImageUrl,
                  reasonType,
                  reasonLabel,
                },
              };
            });

            // Sort by score descending and take top 6
            suggestedAccounts = scoreAndAccounts
              .sort((a, b) => b.score - a.score)
              .slice(0, 6)
              .map((item) => item.account);
          }

          suggestedData = {
            events: followingEvents,
            suggestedAccounts,
          };
        }
      } catch (personalizationError) {
        console.error("Error computing suggestedData in getApprovedEvents:", personalizationError);
      }
    }

    return res.status(200).json({
      success: true,
      count: formattedEvents.length,
      events: formattedEvents,
      suggestedData,
    });
  } catch (error) {
    console.error("Error in getApprovedEvents:", error);
    const isDev = process.env.NODE_ENV === "development";
    return res.status(500).json({
      success: false,
      message: isDev ? error.message : "Error fetching events",
      error: isDev ? error.message : "Internal server error",
    });
  }
};

// ==================== GET MY EVENTS ====================
const getMyEvents = async (req, res) => {
  try {
    // Return events created by logged-in user (include status for profile view)
    const events = await EventModel.find({ createdBy: req.userId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName username email profileImage");

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
      const out = {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        imageUrl: eventImage.imageUrl,
        email: event.email,
        phone: event.phone,
        gender: event.gender,
        category: event.category || "other",
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        status: event.status,
        ticketTheme: event.ticketTheme || null,
        createdBy: formatCreatedByWithProfileImage(event.createdBy),
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        joinedUsers,
        joinedCount: joinedUsers.length,
      };
      if (event.ticketTheme) out.ticketTheme = event.ticketTheme;
      return out;
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
      "fullName username email role profileImage"
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

    // Compute remainingTickets for this event
    let remainingTickets = null;
    if (event.totalTickets && event.totalTickets > 0) {
      const soldCount = await TicketModel.countDocuments({
        eventId: event._id,
        status: { $nin: ["cancelled", "expired"] },
      });
      remainingTickets = Math.max(0, event.totalTickets - soldCount);
    }

    // Format event image URLs
    const eventImage = formatEventImage(event.image);

    const eventPayload = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      imageUrl: eventImage.imageUrl,
      email: event.email,
      phone: event.phone,
      gender: event.gender,
      category: event.category || "other",
      ticketPrice: event.ticketPrice,
      totalTickets: event.totalTickets,
      remainingTickets,
      status: event.status,
      createdBy: formatCreatedByWithProfileImage(event.createdBy),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      joinedUsers,
      joinedCount: joinedUsers.length,
      likeCount,
      isLiked,
    };
    if (event.ticketTheme) eventPayload.ticketTheme = event.ticketTheme;

    return res.status(200).json({
      success: true,
      event: eventPayload,
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

    // Notify organizer: "Jane liked your event Concert X."
    const actorName = user.fullName || user.name || user.username || "Someone";
    const eventTitle = event.title || "your event";
    createNotification({
      recipient: event.createdBy,
      type: "event_liked",
      title: `${actorName} liked your event ${eventTitle}.`,
      body: "",
      eventId: event._id,
      actorUserId: userId,
    }).catch(() => {});

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
      gender,
      category,
      ticketPrice,
      totalTickets,
      ticketTheme,
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
    if (gender !== undefined) updateData.gender = gender;
    if (category !== undefined) updateData.category = (category && String(category).trim()) ? String(category).trim().toLowerCase() : "other";
    if (ticketPrice !== undefined) updateData.ticketPrice = ticketPrice;
    if (totalTickets !== undefined) updateData.totalTickets = totalTickets;
    if (ticketTheme !== undefined) updateData.ticketTheme = ticketTheme;

    const updatedEvent = await EventModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("createdBy", "fullName username email profileImage");

    // Notify all users who joined: "Concert X was updated: new date."
    const joinedUsers = await UserModel.find({ joinedEvents: id }).select("_id").lean();
    const recipientIds = joinedUsers.map((u) => u._id).filter((uid) => uid && uid.toString() !== req.userId);
    if (recipientIds.length > 0) {
      const eventTitle = updatedEvent.title || "Event";
      createNotificationForMany(recipientIds, {
        type: "event_update",
        title: `${eventTitle} was updated.`,
        body: "Check the event for new date, time, or venue.",
        eventId: updatedEvent._id,
        actorUserId: req.userId,
      }).catch(() => {});
    }

    // Format event image URLs
    const eventImage = formatEventImage(updatedEvent.image);

    const eventPayload = {
      id: updatedEvent._id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      date: updatedEvent.date,
      time: updatedEvent.time,
      location: updatedEvent.location,
      imageUrl: eventImage.imageUrl,
      email: updatedEvent.email,
      phone: updatedEvent.phone,
      gender: updatedEvent.gender,
      category: updatedEvent.category || "other",
      ticketPrice: updatedEvent.ticketPrice,
      totalTickets: updatedEvent.totalTickets,
      status: updatedEvent.status,
      createdBy: formatCreatedByWithProfileImage(updatedEvent.createdBy),
      createdAt: updatedEvent.createdAt,
      updatedAt: updatedEvent.updatedAt,
    };
    if (updatedEvent.ticketTheme) eventPayload.ticketTheme = updatedEvent.ticketTheme;

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: eventPayload,
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

    // Notify all users who joined: event cancelled
    const joinedUsers = await UserModel.find({ joinedEvents: id }).select("_id").lean();
    const recipientIds = joinedUsers.map((u) => u._id).filter(Boolean);
    const eventTitle = event.title || "Event";
    if (recipientIds.length > 0) {
      createNotificationForMany(recipientIds, {
        type: "event_cancelled",
        title: `${eventTitle} has been cancelled.`,
        body: "The organizer has cancelled this event.",
        eventId: event._id,
        actorUserId: req.userId,
      }).catch(() => {});
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
      .populate("createdBy", "fullName username email phone profileImage");

    const formattedEvents = events.map((event) => {
      const eventImage = formatEventImage(event.image);
      const out = {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        imageUrl: eventImage.imageUrl,
        email: event.email,
        phone: event.phone,
        gender: event.gender,
        category: event.category || "other",
        ticketPrice: event.ticketPrice,
        totalTickets: event.totalTickets,
        status: event.status,
        ticketTheme: event.ticketTheme || null,
        createdBy: formatCreatedByWithProfileImage(event.createdBy),
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
      if (event.ticketTheme) out.ticketTheme = event.ticketTheme;
      return out;
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

    // Notify organizer: "Your event Concert X is now live."
    const organizerId = event.createdBy._id || event.createdBy;
    const eventTitle = event.title || "Your event";
    createNotification({
      recipient: organizerId,
      type: "event_approved",
      title: `Your event ${eventTitle} is now live.`,
      body: "",
      eventId: event._id,
    }).catch(() => {});

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
