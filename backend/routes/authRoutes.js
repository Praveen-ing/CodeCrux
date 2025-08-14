// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
// const User = require('../models/user.js'); // No longer needed directly here for /me
// const jwt = require('jsonwebtoken'); // No longer needed directly here for /me

// Import your controller functions
const { registerUser, loginUser, getUserProfile, updateUserProfile } // Assuming these are in authController.js
          = require('../controllers/authController.js'); // Adjust path if necessary

const { authenticateToken } = require('../middleware/authMiddleware.js');

// Register a new user
// router.post('/register', async (req, res) => { ... }); // Keep your original register logic if not using controller
// OR use the controller:
router.post('/register', registerUser);


// Login user
// router.post('/login', async (req, res) => { ... }); // Keep your original login logic if not using controller
// OR use the controller:
router.post('/login', loginUser);


// Get authenticated user's profile
// THIS IS THE IMPORTANT CHANGE:
router.get('/me', authenticateToken, getUserProfile); // Use the controller function

// If you have an updateUserProfile route, it should also use its controller
 router.put('/profile', authenticateToken, updateUserProfile);


module.exports = router;