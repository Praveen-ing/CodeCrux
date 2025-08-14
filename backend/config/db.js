// backend/config/db.js
const mongoose = require('mongoose');
// require('dotenv').config(); // Usually configured in your main server.js or when running scripts

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // No deprecated options needed for Mongoose v6+ / MongoDB Driver v4+
    });
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;