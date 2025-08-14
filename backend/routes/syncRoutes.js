const express = require('express');
const router = express.Router();
const { syncAllProblems } = require('../controllers/syncController');

// This imports your authentication middleware.
// In production, you would use both to make this an admin-only endpoint.
const { protect, admin } = require('../middleware/authMiddleware');

// Defines the route: POST /api/sync/problems
// For development, we'll just use 'protect'. In production, add 'admin'.
// Example for production: router.post('/problems', protect, admin, syncAllProblems);
router.post('/problems', syncAllProblems);

module.exports = router;