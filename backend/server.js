// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const contestRoutes = require('./routes/contestRoutes');
const dailyChallengeRoutes = require('./routes/dailyChallengeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const problemListRoutes = require('./routes/problemListRoutes');

// Create an Express app
const app = express();

// Middleware
app.use(express.json());  // Parse JSON requests
// Allow CORS only for specific domains (for production)
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 'https://yourfrontenddomain.com' : '*', // change with your frontend URL
  credentials: true,
};
app.use(cors(corsOptions));

// MongoDB connection
const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit process with failure
  }
};

// Connect to MongoDB
connectToDB();

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/daily-challenge', dailyChallengeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/problem-list', problemListRoutes);
app.use('/api/sync', require('./routes/syncRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
