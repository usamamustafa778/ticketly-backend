// Load environment variables FIRST before any other imports
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/ErrorHandler");
const AuthRouter = require("./routers/AuthRouter");
const UsersRouter = require("./routers/UsersRouter");
const EventRouter = require("./routers/EventRouter");
const AdminRouter = require("./routers/AdminRouter");
const TicketRouter = require("./routers/TicketRouter");
const PaymentRouter = require("./routers/PaymentRouter");
const app = express();

// ✅ Enable CORS for frontend and dashboard - must be before other middleware
// Get allowed origins from environment variable or use defaults
const getAllowedOrigins = () => {
  const origins = [];

  // Add Vercel dashboard URL
  origins.push("https://ticketly-dashboard.vercel.app");
  
  // Add Vercel website URL
  origins.push("https://ticketly-website.vercel.app");

  // If FRONTEND_URL is set, add it (supports comma-separated list for multiple domains)
  if (process.env.FRONTEND_URL) {
    const frontendUrls = process.env.FRONTEND_URL.split(",").map((url) =>
      url.trim()
    );
    origins.push(...frontendUrls);
  }

  return origins;
};

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or curl requests)
      if (!origin) {
        console.log("✅ CORS: Allowing request with no origin");
        return callback(null, true);
      }

      // Always allow localhost and 127.0.0.1 for development (any port)
      // This includes Next.js dev server (3000, 8081, etc.) and React Native web
      const localhostPattern = /^http:\/\/localhost(:\d+)?$/;
      const localhostIPPattern = /^http:\/\/127\.0\.0\.1(:\d+)?$/;
      
      if (localhostPattern.test(origin) || localhostIPPattern.test(origin)) {
        console.log(`✅ CORS: Allowing localhost origin: ${origin}`);
        return callback(null, true);
      }

      // Also allow http://localhost without port (defaults to port 80)
      if (origin === "http://localhost" || origin === "http://127.0.0.1") {
        console.log(`✅ CORS: Allowing localhost origin (no port): ${origin}`);
        return callback(null, true);
      }
      
      // Allow Vercel preview deployments (any subdomain)
      if (origin.includes("vercel.app")) {
        console.log(`✅ CORS: Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }

      // Check against allowed origins (includes Vercel dashboard and FRONTEND_URL)
      if (allowedOrigins.length > 0) {
        // Check exact match
        if (allowedOrigins.includes(origin)) {
          console.log(`✅ CORS: Allowing exact match: ${origin}`);
          return callback(null, true);
        }
        // Also check if origin starts with any allowed origin (for subdomains/paths)
        const isAllowed = allowedOrigins.some((allowedOrigin) =>
          origin.startsWith(allowedOrigin)
        );
        if (isAllowed) {
          console.log(`✅ CORS: Allowing origin (starts with allowed): ${origin}`);
          return callback(null, true);
        }
        // If origin doesn't match, deny
        console.warn(
          `❌ CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(
            ", "
          )}`
        );
        return callback(new Error("Not allowed by CORS"));
      }

      // If no FRONTEND_URL is set, allow all origins (for development/testing)
      // In production, you should set FRONTEND_URL for security
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "⚠️  WARNING: FRONTEND_URL not set in production. Allowing all origins."
        );
      }
      console.log(`✅ CORS: Allowing origin (no restrictions): ${origin}`);
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Add cache-control headers to prevent browser caching of API responses
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Connect Database
connectDB();

// Routes
app.use("/api/auth", AuthRouter);
app.use("/api/users", UsersRouter);
app.use("/api/events", EventRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/tickets", TicketRouter);
app.use("/api/payments", PaymentRouter);
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

// Error Handler Middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
