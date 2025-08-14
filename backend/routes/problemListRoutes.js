// backend/src/routes/problemListRoutes.js
const express = require('express');
const router = express.Router();

// Assuming your controller exports these functions:
// getProblems, getPlatformStats (you'll need to create this), markProblemSolved, addProblem, seedProblems
const {
    getProblems,
    // getPlatformStats, // You'll need to implement and export this from your controller
    markProblemSolved,
    addProblem,          // Added this based on previous controller logic
    seedProblems         // Added this based on previous controller logic
} = require('../controllers/problemListController.js');

// Assuming your auth middleware exports these:
const { authenticateToken, optionalAuth, admin } = require('../middleware/authMiddleware.js'); // Corrected line
// --- Primary Problem Routes ---

// GET /api/problems - Get problems with filtering and pagination
// Uses optionalAuth: works for both logged-in (to use status filter) and anonymous users
router.get('/', optionalAuth, getProblems);

// POST /api/problems/solve - Mark a problem as solved (requires authentication)
// Changed from '/mark-solved' to align with typical API naming and controller function
router.post('/solve', authenticateToken, markProblemSolved);

// --- Admin/Utility Problem Routes ---

// POST /api/problems/add - Add a new problem (typically admin only)
router.post('/add', authenticateToken, admin, addProblem); // Protected with admin middleware

// POST /api/problems/seed - Seed database with problems (admin or for development)
router.post('/seed', authenticateToken, admin, seedProblems); // Protected with admin middleware, adjust count via query param ?count=50

// --- Aggregate Data Routes ---

// GET /api/problems/stats - Placeholder for platform statistics
// You would need to implement the getPlatformStats controller function
// router.get('/stats', getPlatformStats);
// Example:
router.get('/stats', (req, res) => {
    res.status(501).json({ message: 'Platform statistics endpoint not yet implemented.' });
});


// GET /api/problems/platforms - Get list of available platforms
router.get('/platforms', async (req, res) => {
    try {
        const Problem = require('../models/problemList.js'); // Ensure path is correct
        // Conceptual: cleanPlatformName would ideally be in a shared utility or the service
        // For now, let's define a simple version here or assume it's in clistService.js
        const { cleanPlatformName } = require('../services/clistService.js'); // Assuming it's here

        const platforms = await Problem.distinct('platform');
        const cleanedPlatforms = platforms
            .map(p => cleanPlatformName(p)) // Use the imported or defined function
            .filter(p => p && p !== 'Unknown' && p !== 'Other') // Filter out generic/unknowns
            .sort();

        res.json({
            success: true,
            data: cleanedPlatforms
        });
    } catch (error) {
        console.error("Error fetching platforms:", error);
        res.status(500).json({
            success: false,
            message: 'Error fetching platforms'
        });
    }
});

// GET /api/problems/difficulties - Get list of available difficulties
router.get('/difficulties', async (req, res) => {
    try {
        const Problem = require('../models/problemList.js'); // Ensure path is correct

        const difficulties = await Problem.distinct('difficulty');
        const cleanedDifficulties = difficulties
            .filter(d => d && d.trim() !== '' && d.toLowerCase() !== 'n/a') // Filter out empty or N/A
            .sort((a, b) => {
                // Custom sort for difficulties
                const order = ['Easy', 'Medium', 'Hard']; // Case-insensitive check
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();

                const aIndex = order.findIndex(o => o.toLowerCase() === aLower);
                const bIndex = order.findIndex(o => o.toLowerCase() === bLower);

                if (aIndex !== -1 && bIndex !== -1) { // Both are in 'Easy', 'Medium', 'Hard'
                    return aIndex - bIndex;
                } else if (aIndex !== -1) { // Only 'a' is E/M/H, so it comes first
                    return -1;
                } else if (bIndex !== -1) { // Only 'b' is E/M/H, so it comes first
                    return 1;
                } else {
                    // For numeric difficulties (e.g., "800", "1200", "2000+"), sort numerically
                    const parseDifficulty = (s) => {
                        if (s.endsWith('+')) return parseInt(s.slice(0, -1)) || Infinity;
                        return parseInt(s) || Infinity; // Treat non-numeric as very large for sorting
                    };
                    const aNum = parseDifficulty(a);
                    const bNum = parseDifficulty(b);

                    if (aNum !== Infinity && bNum !== Infinity) {
                         return aNum - bNum;
                    } else if (aNum !== Infinity) {
                        return -1; // Numeric before non-numeric that resolved to Infinity
                    } else if (bNum !== Infinity) {
                        return 1; // Non-numeric after numeric
                    }
                    return a.localeCompare(b); // Fallback to string compare
                }
            });

        res.json({
            success: true,
            data: cleanedDifficulties
        });
    } catch (error) {
        console.error("Error fetching difficulties:", error);
        res.status(500).json({
            success: false,
            message: 'Error fetching difficulties'
        });
    }
});


module.exports = router; // Export the router