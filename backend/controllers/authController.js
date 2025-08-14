// backend/controllers/authController.js
import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import jwt from 'jsonwebtoken';

const JWT_EXPIRATION_TIME = process.env.JWT_EXPIRATION || '30d';

// Helper function to generate JWT
const generateToken = (id) => {
  // Ensure JWT_SECRET is available
  if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    throw new Error('Server configuration error: JWT secret missing.'); // This will lead to a 500 if not caught before
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRATION_TIME,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  console.log('--- registerUser Controller Invoked ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Registration attempt with req.body:', req.body);

  // CORRECTED: Destructure username, email, password
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Please provide all required fields: username, email, password');
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  const userExistsByEmail = await User.findOne({ email: email.toLowerCase() }); // Normalize email
  if (userExistsByEmail) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  const userExistsByUsername = await User.findOne({ username }); // Now username is defined
  if (userExistsByUsername) {
    res.status(400);
    throw new Error('User with this username already exists');
  }

  // Now username is defined
  const user = await User.create({ username, email: email.toLowerCase(), password });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      currentStreak: user.currentStreak,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data received during creation');
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  console.log('--- loginUser Controller Invoked ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Login attempt with req.body:', req.body);
  console.log('Is JWT_SECRET defined?', !!process.env.JWT_SECRET);

  // CORRECTED: Expect 'email' from req.body as per your logs { email: '...', password: '...' }
  const { email, password } = req.body;

  // CORRECTED: Check 'email' variable
  if (!email || !password) {
    console.error('[Login Error] Missing email or password in req.body');
    res.status(400);
    throw new Error('Please provide email and password'); // Updated error message
  }

  // CORRECTED: Use 'email' in the User.findOne query, assuming login is by email for now
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  /*
  // If you intend to support login by EITHER email OR username in the future:
  // 1. Your frontend would need to send a single field, e.g., { identifier: "user@example.com", password: "..." }
  //    OR { identifier: "some_username", password: "..." }
  // 2. Then you would destructure it: const { identifier, password } = req.body;
  // 3. And your query would be:
  //    const user = await User.findOne({
  //      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
  //    }).select('+password');
  // For now, the code above uses the 'email' field directly as sent by your frontend.
  */

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      currentStreak: user.currentStreak,
      lastProblemSolvedDate: user.lastProblemSolvedDate,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid credentials');
  }
});

// @desc    Get current user's profile (Handles /api/auth/me)
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  console.log('--- getUserProfile Controller Invoked ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request User (req.user) for profile:', req.user);

  const user = await User.findById(req.user.id || req.user._id).select('-password');

  if (user) {
    res.json({
      id: user._id,
      _id: user._id,
      username: user.username,
      email: user.email,
      currentStreak: user.currentStreak || 0,
      lastProblemSolvedDate: user.lastProblemSolvedDate,
      dailyChallenge: user.dailyChallenge,
      favoriteContestsCount: user.favoriteContests?.length || 0,
      favoriteProblemsCount: user.favoriteProblems?.length || 0,
      solvedProblemsCount: user.solvedProblems?.length || 0,
      createdAt: user.createdAt,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  console.log('--- updateUserProfile Controller Invoked ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request User (req.user) for update:', req.user);
  console.log('Update profile with req.body:', req.body);

  const user = await User.findById(req.user.id || req.user._id);

  if (user) {
    if (req.body.username && req.body.username !== user.username) {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        res.status(400);
        throw new Error('Username already taken');
      }
      user.username = req.body.username;
    }
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        res.status(400);
        throw new Error('Email already in use');
      }
      user.email = req.body.email.toLowerCase();
    }

    if (req.body.password) {
      if (req.body.password.length < 6) {
        res.status(400);
        throw new Error('New password must be at least 6 characters long');
      }
      user.password = req.body.password; // Password will be hashed by the pre-save hook in userSchema
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      currentStreak: updatedUser.currentStreak,
      token: generateToken(updatedUser._id), // Re-issue token
    });
  } else {
    res.status(404);
    throw new Error('User not found for update');
  }
});

export { registerUser, loginUser, getUserProfile, updateUserProfile };