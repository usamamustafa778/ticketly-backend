const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");

// Admin seeding credentials (set via environment variables)
// IMPORTANT: Never hardcode credentials in git.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

const createAdmin = async () => {
  try {
    if (!ADMIN_EMAIL.trim() || !ADMIN_PASSWORD.trim()) {
      console.log(
        "ℹ️  Admin seeding skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to enable)."
      );
      return;
    }

    // Check if admin already exists
    const existingAdmin = await UserModel.findOne({
      email: ADMIN_EMAIL,
    });

    if (existingAdmin) {
      // Update existing user to admin with hardcoded password
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      existingAdmin.role = "admin";
      existingAdmin.isVerified = true;
      existingAdmin.password = hashedPassword; // Update password to hardcoded one
      existingAdmin.fullName = ADMIN_NAME;
      existingAdmin.name = ADMIN_NAME;
      await existingAdmin.save();
      console.log("✅ Existing user updated to admin");
      console.log(`   Email: ${ADMIN_EMAIL}`);
      return;
    }

    // Create new admin
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = new UserModel({
      fullName: ADMIN_NAME,
      name: ADMIN_NAME,
      username: "admin",
      email: ADMIN_EMAIL,
      password: hashedPassword,
      authProvider: "local",
      role: "admin",
      isVerified: true,
    });

    await admin.save();
    console.log("✅ Admin created successfully");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log("   ⚠️  Please change the password after first login!");
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  }
};

module.exports = createAdmin;

