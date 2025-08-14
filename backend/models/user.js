// backend/models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dailyChallengeStatusSchema = new mongoose.Schema({
  problemId: { type: String, required: true },
  platform: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  difficulty: { type: String },
  tags: [{ type: String }],
  suggestedAt: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { _id: false });

const favoriteProblemSchema = new mongoose.Schema({
  problemId: { type: String, required: true },
  platform: { type: String, required: true },
  title: { type: String, required: true },
  // You might want to add url, difficulty, tags here too for quick display
  url: { type: String },
  difficulty: {type: String },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const favoriteContestSchema = new mongoose.Schema({
  // Use clistId if from clist.by, otherwise mongoId for manually added contests
  identifier: { type: String, required: true }, // This can store clistId or mongoId
  title: { type: String, required: true },
  platform: { type: String, required: true },
  startTime: { type: Date, required: true },
  url: { type: String, required: true },
  apiSource: {type: String }, // e.g., 'clist.by', 'manual'
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  solvedProblems: [{
    problemId: { type: String, required: true },
    platform: { type: String, required: true },
    title: { type: String },
    solvedAt: { type: Date, default: Date.now }
  }],
  favoriteProblems: [favoriteProblemSchema], // Using the defined schema
  favoriteContests: [favoriteContestSchema], // ADDED: Using the defined schema
  dailyChallenge: dailyChallengeStatusSchema,
  currentStreak: {
    type: Number,
    default: 0
  },
  lastProblemSolvedDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, username: this.username },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
