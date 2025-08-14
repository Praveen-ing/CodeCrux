// backend/routes/favoritesRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware.js'); // Changed from 'protect'
const {
    getFavoriteProblems,
    addProblemToFavorites,
    removeProblemFromFavorites,
    getFavoriteContests,
    addContestToFavorites,
    removeContestFromFavorites,
} = require('../controllers/favoritesController.js');

// --- Problem Favorites Routes ---
router.get('/problems', authenticateToken, getFavoriteProblems); // Changed
router.post('/problems', authenticateToken, addProblemToFavorites); // Changed
router.delete('/problems/:platform/:problemId', authenticateToken, removeProblemFromFavorites); // Changed

// --- Contest Favorites Routes ---
router.get('/contests', authenticateToken, getFavoriteContests); // Changed
router.post('/contests', authenticateToken, addContestToFavorites); // Changed
router.delete('/contests/:identifier', authenticateToken, removeContestFromFavorites); // Changed

module.exports = router;