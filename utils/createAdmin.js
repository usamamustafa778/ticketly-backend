const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");

// Hardcoded Admin credentials
const ADMIN_EMAIL = "hamzaaliabbasi046@gmail.com";
const ADMIN_PASSWORD = "Wish@123"; // Change this in production!
const ADMIN_NAME = "Admin";

const createAdmin = async () => {
  try {
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
      console.log(
        "✅ Existing user updated to admin with hardcoded password"
      );
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
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
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log("   ⚠️  Please change the password after first login!");
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  }
};

module.exports = createAdmin;

