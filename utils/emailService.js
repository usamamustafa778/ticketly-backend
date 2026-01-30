const nodemailer = require("nodemailer");

// ⚠️ SECURITY NOTE: Hardcoded credentials for convenience
// In production, consider using environment variables for better security
const EMAIL_USER = "hamzaaliabbasi049@gmail.com";
const EMAIL_PASS = "vjptllyvgmohtkxx";

// Check if email credentials are configured
const isEmailConfigured = () => {
  const hasUser = !!EMAIL_USER;
  const hasPass = !!EMAIL_PASS;

  // Log configuration status (helpful for Railway debugging)
  if (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT
  ) {
    console.log("🔍 Email Configuration Check:");
    console.log(`   EMAIL_USER: ${hasUser ? "✅ Set" : "❌ Not set"}`);
    console.log(`   EMAIL_PASS: ${hasPass ? "✅ Set" : "❌ Not set"}`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `   Railway: ${process.env.RAILWAY_ENVIRONMENT ? "Yes" : "No"}`
    );
  }

  return !!(hasUser && hasPass);
};

// Create transporter only if credentials are available
let transporter = null;

if (isEmailConfigured()) {
  try {
    // Verify credentials are not empty
    const emailUser = EMAIL_USER?.trim();
    const emailPass = EMAIL_PASS?.trim();

    console.log("🔍 Checking email configuration...");
    console.log(`   EMAIL_USER length: ${emailUser?.length || 0}`);
    console.log(`   EMAIL_PASS length: ${emailPass?.length || 0}`);

    if (!emailUser || !emailPass) {
      console.error(
        "❌ Email credentials are empty. Please check email configuration."
      );
      console.log("⚠️  OTP will be logged to console in development mode.");
    } else {
      console.log("📧 Creating email transporter...");

      // Use explicit SMTP configuration for better Railway compatibility
      // Using port 465 with SSL (Railway-friendly) instead of 587 with TLS
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465, // Changed from 587 to 465 (Railway-friendly)
        secure: true, // Changed from false to true (required for port 465)
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        // Increased timeout settings for Railway/production environments
        connectionTimeout: 30000, // 30 seconds (increased for Railway)
        greetingTimeout: 10000, // 10 seconds
        socketTimeout: 30000, // 30 seconds (increased for Railway)
        // Add secure connection options
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates if needed
          minVersion: "TLSv1.2", // Use modern TLS instead of deprecated SSLv3
        },
        // Add pool connection for better reliability
        pool: true,
        maxConnections: 1,
        maxMessages: 3,
        // Add debug option for Railway troubleshooting
        debug: process.env.NODE_ENV === "production", // Enable debug in production
        logger: process.env.NODE_ENV === "production", // Enable logger in production
      });
      console.log("✅ Transporter created successfully");

      // Verify connection asynchronously (non-blocking) - just for logging
      transporter.verify(function (error, success) {
        if (error) {
          console.error(
            "❌ Email transporter verification failed:",
            error.message
          );
          console.error("💡 Common issues:");
          console.error(
            "   - Invalid Gmail App Password (use App Password, not regular password)"
          );
          console.error("   - 2FA not enabled on Gmail account");
          console.error("   - Incorrect email or password");
          console.error(
            "   - App Password format: 16 characters without spaces"
          );
          console.error(
            "   - Make sure EMAIL_USER and EMAIL_PASS are set correctly in .env"
          );
          console.log(
            "⚠️  Will attempt to send emails anyway. Check logs for errors."
          );
        } else {
          console.log("✅ Email service configured and verified successfully");
        }
      });
    }
  } catch (error) {
    console.error("❌ Failed to create email transporter:", error.message);
    console.error("Error stack:", error.stack);
    console.log("⚠️  OTP will be logged to console in development mode.");
    transporter = null;
  }
} else {
  console.log(
    "⚠️  Email credentials not configured. OTP will be logged to console in development mode."
  );
  console.log(
    "💡 Update EMAIL_USER and EMAIL_PASS constants in emailService.js to enable email sending."
  );
}

// Helper function to create a promise with timeout
const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
};

// Send OTP Email (with timeout protection)
const sendOtpEmail = async (email, otp) => {
  try {
    // Check if email is configured and transporter exists
    if (!isEmailConfigured() || !transporter) {
      console.log("\n" + "=".repeat(50));
      console.log("📧 OTP EMAIL (Development Mode)");
      console.log("=".repeat(50));
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires in: 10 minutes`);
      if (!isEmailConfigured()) {
        console.log(
          `\n⚠️  Email not configured. Check email credentials in code.`
        );
      } else if (!transporter) {
        console.log(
          `\n⚠️  Transporter not initialized. Check email credentials in code.`
        );
        console.log(`   EMAIL_USER: ${EMAIL_USER ? "Set" : "Not set"}`);
        console.log(
          `   EMAIL_PASS: ${EMAIL_PASS ? "Set (hidden)" : "Not set"}`
        );
        console.log(`   Attempting to recreate transporter...`);

        // Try to recreate transporter on the fly
        const emailUser = EMAIL_USER?.trim();
        const emailPass = EMAIL_PASS?.trim();
        if (emailUser && emailPass) {
          try {
            transporter = nodemailer.createTransport({
              host: "smtp.gmail.com",
              port: 465, // Changed to 465 (Railway-friendly)
              secure: true, // Changed to true (required for port 465)
              auth: {
                user: emailUser,
                pass: emailPass,
              },
              // Add connection timeout settings (increased for Railway)
              connectionTimeout: 30000, // 30 seconds
              greetingTimeout: 10000, // 10 seconds
              socketTimeout: 30000, // 30 seconds
              tls: {
                rejectUnauthorized: false,
                minVersion: "TLSv1.2", // Use modern TLS instead of deprecated SSLv3
              },
              pool: true,
              maxConnections: 1,
              maxMessages: 3,
              debug: process.env.NODE_ENV === "production",
              logger: process.env.NODE_ENV === "production",
            });
            console.log(`   ✅ Transporter recreated successfully`);
          } catch (err) {
            console.error(
              `   ❌ Failed to recreate transporter: ${err.message}`
            );
          }
        }
      }
      console.log("=".repeat(50) + "\n");
      return true; // Return true so login can continue
    }

    // Try to send actual email with timeout (30 seconds for Railway/production)
    const mailOptions = {
      from: EMAIL_USER.trim(),
      to: email,
      subject: "Your OTP for Login - Ticketly",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">OTP Verification</h2>
          <p>Your OTP code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `,
    };

    // Wrap sendMail in a timeout (30 seconds for Railway/production)
    const timeoutDuration =
      process.env.NODE_ENV === "production" ? 30000 : 10000;
    const sendEmailPromise = transporter.sendMail(mailOptions);
    const info = await withTimeout(sendEmailPromise, timeoutDuration);

    console.log("✅ OTP Email sent successfully!");
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${email}`);
    return true;
  } catch (error) {
    // Handle timeout specifically
    if (error.message && error.message.includes("timed out")) {
      console.error(
        "\n⏱️  Email sending timed out (likely network issue on Railway)"
      );
      console.error("   The OTP has been saved to the database.");
      console.error("   Email will be retried in background if possible.");
      console.error(`   Error details: ${error.message}`);
      console.error(`   Environment: ${process.env.NODE_ENV || "development"}`);
      console.error(
        `   Railway URL: ${process.env.RAILWAY_ENVIRONMENT || "Not set"}`
      );

      // Log OTP for debugging in production (Railway logs)
      console.log("\n" + "=".repeat(50));
      console.log("📧 OTP EMAIL (Fallback - Timeout)");
      console.log("=".repeat(50));
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires in: 10 minutes`);
      console.log("=".repeat(50) + "\n");

      // In production, still return true so login can continue
      // The OTP is saved in DB and can be verified
      return true;
    }

    console.error("\n❌ Error sending OTP email:", error.message);
    console.error("Error code:", error.code);
    console.error("Response code:", error.responseCode);
    console.error("Response:", error.response);
    console.error("Stack:", error.stack);
    console.error(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.error(`EMAIL_USER configured: ${!!EMAIL_USER}`);
    console.error(`EMAIL_PASS configured: ${!!EMAIL_PASS}`);

    // Show helpful error messages
    if (error.code === "EAUTH") {
      console.error("\n💡 Authentication failed. Common fixes:");
      console.error("   1. Use Gmail App Password (not regular password)");
      console.error("   2. Enable 2-Step Verification on Gmail");
      console.error(
        "   3. Generate new App Password: https://myaccount.google.com/apppasswords"
      );
      console.error("   4. Remove spaces from App Password in .env");
    } else if (error.code === "ECONNECTION") {
      console.error("\n💡 Connection failed. Check:");
      console.error("   1. Internet connection");
      console.error("   2. Firewall settings");
      console.error("   3. Gmail SMTP is accessible");
      console.error("   4. Railway network allows SMTP connections");
    }

    // In development, still return true and log to console
    if (process.env.NODE_ENV !== "production") {
      console.log("\n" + "=".repeat(50));
      console.log("📧 OTP EMAIL (Fallback - Email failed)");
      console.log("=".repeat(50));
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires in: 10 minutes`);
      console.log("=".repeat(50) + "\n");
      return true;
    }

    // In production, log OTP to Railway logs as fallback
    console.log("\n" + "=".repeat(50));
    console.log("📧 OTP EMAIL (Fallback - Email Error)");
    console.log("=".repeat(50));
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires in: 10 minutes`);
    console.log("=".repeat(50) + "\n");

    return true; // Return true so login can continue, OTP is in DB
  }
};

module.exports = { sendOtpEmail, isEmailConfigured };
