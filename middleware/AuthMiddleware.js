const jwt = require("jsonwebtoken");
const UserModel = require("../models/UserModel");

const verifyToken = (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not configured in environment variables");
      return res.status(500).json({
        message: "Server configuration error. JWT_SECRET not set.",
        success: false,
      });
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
        success: false,
      });
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.split(" ")[1] 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
        success: false,
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        message: "Invalid token. Token payload is invalid.",
        success: false,
      });
    }

    req.userId = decoded.userId; // Attach user ID to request
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please login again.",
        success: false,
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token. Please login again.",
        success: false,
      });
    }

    // Log unexpected errors for debugging
    console.error("Token verification error:", error.name, error.message);
    
    return res.status(401).json({
      message: "Invalid token.",
      success: false,
    });
  }
};

// Optional auth: attach userId if valid token present, but never reject
const optionalVerifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    const token = authHeader.split(" ")[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.userId) {
      req.userId = decoded.userId;
    }
    next();
  } catch {
    next(); // Ignore token errors - treat as unauthenticated
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found please signup first",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    req.user = user; // Attach user object to request
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Middleware to check if user is organizer
const requireOrganizer = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "organizer" && user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Organizer role required.",
      });
    }

    req.user = user; // Attach user object to request
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Middleware to attach user to request (for role-based access)
const attachUser = async (req, res, next) => {
  try {
    if (req.userId) {
      const user = await UserModel.findById(req.userId);
      req.user = user;
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { verifyToken, optionalVerifyToken, requireAdmin, requireOrganizer, attachUser };
