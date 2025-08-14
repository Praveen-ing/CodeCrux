// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware.js'); // Changed from 'protect'
const { getUserDashboardStats } = require('../controllers/dashController.js');

router.get('/stats', authenticateToken, getUserDashboardStats); // Changed from 'protect'

module.exports = router;