// backend/controllers/favoritesController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/user.js'); // Adjust path as needed
const Problem = require('../models/problemList.js'); // To fetch problem details if needed
const Contest = require('../models/contest.js'); // To fetch contest details if needed

// --- Problem Favorites ---

// @desc    Get all favorite problems for the logged-in user
// @route   GET /api/favorites/problems
// @access  Private
const getFavoriteProblems = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('favoriteProblems');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json(user.favoriteProblems || []);
});

// @desc    Add a problem to favorites
// @route   POST /api/favorites/problems
// @access  Private
const addProblemToFavorites = asyncHandler(async (req, res) => {
  const { problemId, platform, title, url, difficulty } = req.body; // Get details from request
  const userId = req.user.id;

  if (!problemId || !platform || !title) {
    res.status(400);
    throw new Error('Problem ID, platform, and title are required');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isAlreadyFavorited = user.favoriteProblems.some(
    (fav) => fav.problemId === problemId && fav.platform.toLowerCase() === platform.toLowerCase()
  );

  if (isAlreadyFavorited) {
    return res.status(400).json({ message: 'Problem already in favorites', favorites: user.favoriteProblems });
  }

  user.favoriteProblems.push({ problemId, platform, title, url, difficulty, addedAt: new Date() });
  await user.save();
  res.status(201).json(user.favoriteProblems);
});

// @desc    Remove a problem from favorites
// @route   DELETE /api/favorites/problems/:platform/:problemId
// @access  Private
const removeProblemFromFavorites = asyncHandler(async (req, res) => {
  const { platform, problemId } = req.params;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const initialLength = user.favoriteProblems.length;
  user.favoriteProblems = user.favoriteProblems.filter(
    (fav) => !(fav.problemId === problemId && fav.platform.toLowerCase() === platform.toLowerCase())
  );

  if (user.favoriteProblems.length === initialLength) {
    return res.status(404).json({ message: 'Favorite problem not found' });
  }

  await user.save();
  res.status(200).json({ message: 'Problem removed from favorites', favorites: user.favoriteProblems });
});

// --- Contest Favorites ---

// @desc    Get all favorite contests for the logged-in user
// @route   GET /api/favorites/contests
// @access  Private
const getFavoriteContests = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('favoriteContests');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json(user.favoriteContests || []);
});

// @desc    Add a contest to favorites
// @route   POST /api/favorites/contests
// @access  Private
const addContestToFavorites = asyncHandler(async (req, res) => {
  // Expecting clistId (if from clist) or mongoId (if manual) as 'identifier'
  const { identifier, title, platform, startTime, url, apiSource } = req.body;
  const userId = req.user.id;

  if (!identifier || !title || !platform || !startTime || !url) {
    res.status(400);
    throw new Error('Contest identifier, title, platform, startTime, and URL are required');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isAlreadyFavorited = user.favoriteContests.some(
    (fav) => fav.identifier === identifier
  );

  if (isAlreadyFavorited) {
    return res.status(400).json({ message: 'Contest already in favorites', favorites: user.favoriteContests });
  }

  user.favoriteContests.push({ identifier, title, platform, startTime, url, apiSource, addedAt: new Date() });
  await user.save();
  res.status(201).json(user.favoriteContests);
});

// @desc    Remove a contest from favorites
// @route   DELETE /api/favorites/contests/:identifier
// @access  Private
const removeContestFromFavorites = asyncHandler(async (req, res) => {
  const { identifier } = req.params; // Identifier can be clistId or mongoId
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const initialLength = user.favoriteContests.length;
  user.favoriteContests = user.favoriteContests.filter(
    (fav) => fav.identifier !== identifier
  );

  if (user.favoriteContests.length === initialLength) {
    return res.status(404).json({ message: 'Favorite contest not found' });
  }

  await user.save();
  res.status(200).json({ message: 'Contest removed from favorites', favorites: user.favoriteContests });
});

module.exports = {
  getFavoriteProblems,
  addProblemToFavorites,
  removeProblemFromFavorites,
  getFavoriteContests,
  addContestToFavorites,
  removeContestFromFavorites,
};
