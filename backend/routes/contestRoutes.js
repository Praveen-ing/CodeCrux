// backend/routes/contestRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions from the (now CommonJS) contestController
const {
    getContests,
    syncContestsWithClist,
    createManualContest,
    getContestByMongoId,
    updateManualContest,
    deleteManualContest,
} = require('../controllers/contestController.js'); // Adjust path if your controller is elsewhere

// Import middleware for authentication and admin checks
const { authenticateToken, admin } = require('../middleware/authMiddleware.js');

/* --- Public Routes --- */

// GET all upcoming or ongoing contests
// Route: GET /api/contests
// Access: Public
// Uses the getContests function from contestController.js
router.get('/', getContests);

// GET a specific contest by its MongoDB ID
// Route: GET /api/contests/:id
// Access: Public
// Uses the getContestByMongoId function from contestController.js
router.get('/:id', getContestByMongoId);


/* --- Admin Protected Routes --- */

// POST to create a new contest manually
// Route: POST /api/contests
// Access: Admin Only (requires authentication and admin privileges)
// Uses the createManualContest function from contestController.js
router.post('/', authenticateToken, admin, createManualContest);

// PUT to update an existing contest by its MongoDB ID
// Route: PUT /api/contests/:id
// Access: Admin Only
// Uses the updateManualContest function from contestController.js
router.put('/:id', authenticateToken, admin, updateManualContest);

// DELETE a contest by its MongoDB ID
// Route: DELETE /api/contests/:id
// Access: Admin Only
// Uses the deleteManualContest function from contestController.js
router.delete('/:id', authenticateToken, admin, deleteManualContest);

// POST to trigger a synchronization of contests from Clist.by with the local database
// Route: POST /api/contests/sync
// Access: Admin Only
// Uses the syncContestsWithClist function from contestController.js
router.post('/sync', authenticateToken, admin, syncContestsWithClist);


module.exports = router; // Export the router for use in server.js