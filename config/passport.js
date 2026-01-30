const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const UserModel = require("../models/UserModel");

// Google OAuth Strategy - Only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || "http://localhost:5001"}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists by googleId
          let user = await UserModel.findOne({ googleId: profile.id });

          if (user) {
            // User exists, return user
            return done(null, user);
          }

          // Check if user exists by email (in case they signed up with email first)
          user = await UserModel.findOne({ email: profile.emails[0].value });

          if (user) {
            // Update existing user with Google ID
            user.googleId = profile.id;
            user.authProvider = "google";
            user.isVerified = true;
            if (!user.fullName) user.fullName = profile.displayName;
            await user.save();
            return done(null, user);
          }

          // Create new user
          const newUser = new UserModel({
            fullName: profile.displayName,
            name: profile.displayName.split(" ")[0] || profile.displayName,
            username: profile.emails[0].value.split("@")[0],
            email: profile.emails[0].value,
            googleId: profile.id,
            authProvider: "google",
            role: "user",
            isVerified: true,
          });

          await newUser.save();
          return done(null, newUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log("✅ Google OAuth strategy initialized");
} else {
  console.log("⚠️  Google OAuth credentials not found. Google login will be disabled.");
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

