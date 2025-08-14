// backend/controllers/dashController.js
const User = require('../models/user.js'); // Adjust path as needed

// @desc    Get statistics for the authenticated user's dashboard
// @route   GET /api/dashboard/stats
// @access  Private
const getUserDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id; // User ID from the 'protect' middleware

    const user = await User.findById(userId).select('solvedProblems favoriteProblems currentStreak'); // Select only needed fields

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate stats
    // Note: For a real application, 'currentStreak' would ideally be calculated/updated
    // when a user solves a problem, not just fetched. This is a simplified fetch.
    const problemsSolvedCount = user.solvedProblems ? user.solvedProblems.length : 0;
    const favoritesCount = user.favoriteProblems ? user.favoriteProblems.length : 0;
    const currentStreak = user.currentStreak || 0; // Default to 0 if not set

    res.status(200).json({
      problemsSolved: problemsSolvedCount,
      favoritesCount: favoritesCount,
      currentStreak: currentStreak,
    });

  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    res.status(500).json({ message: 'Server error fetching dashboard statistics' });
  }
};

module.exports = {
  getUserDashboardStats,
  // Add other dashboard-related controller functions here if needed
};
