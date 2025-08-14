// backend/routes/dailyChallengeRoutes.js
const express = require('express');
const router = express.Router();
// Import the 'authenticateToken' middleware
const { authenticateToken } = require('../middleware/authMiddleware.js'); // Changed from 'protect'
const { getDailyChallenge, solveDailyChallenge } = require('../controllers/dailyChallengeController.js');
const Problem = require('../models/problemList.js');

// TEMPORARY: Debug route to check Codeforces problems count
router.get('/debug/codeforces-count', async (req, res) => {
  try {
    const count = await Problem.countDocuments({ platform: 'Codeforces' });
    res.json({ platform: 'Codeforces', count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY: Route to reset dailyChallenge for authenticated user
router.post('/debug/reset-daily', authenticateToken, async (req, res) => {
  try {
    const user = await require('../models/user.js').findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.dailyChallenge = undefined;
    await user.save();
    res.json({ message: 'Daily challenge reset for user.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, getDailyChallenge); // Changed from 'protect'
router.post('/solve', authenticateToken, solveDailyChallenge); // Changed from 'protect'

// Example for admin route, use authenticateToken and potentially an 'admin' middleware
// const { admin } = require('../middleware/authMiddleware.js'); // You would also import admin
// const DailyChallenge = require('../models/dailyChallenge');
// router.post('/admin-create', authenticateToken, admin, async (req, res) => { // Changed from 'protect'
//     const { title, description } = req.body;
//     try {
//         const todayUTC = new Date();
//         todayUTC.setUTCHours(0,0,0,0);
//         const newChallenge = new DailyChallenge({ title, description, date: todayUTC });
//         await newChallenge.save();
//         res.status(201).json(newChallenge);
//     } catch (error) {
//         console.error("Error creating admin daily challenge:", error);
//         res.status(500).json({ message: 'Error creating daily challenge' });
//     }
// });

module.exports = router;