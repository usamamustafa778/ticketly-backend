const mongoose = require("mongoose");
const createAdmin = require("../utils/createAdmin");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri || !/^mongodb(\+srv)?:\/\//i.test(uri)) {
      throw new Error(
        'MONGO_URI must start with "mongodb://" or "mongodb+srv://". Check your .env file.'
      );
    }
    // Add connection options for better error handling
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create admin after database connection
    await createAdmin();
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.error(
      `⚠️  Server will continue running, but database operations will fail.`
    );
    console.error(
      `💡 Make sure your IP is whitelisted in MongoDB Atlas: https://www.mongodb.com/docs/atlas/security-whitelist/`
    );
    // Don't exit - let the server continue running
    // The app can still respond to requests, but DB operations will fail
  }
};

module.exports = connectDB;
