const asyncHandler = require('express-async-handler');
// Correct the path based on your structure (controllers -> src -> services)
const { fetchAndStoreAllProblemsFromClist, PLATFORM_RESOURCE_MAP } = require('../src/services/clistService.js');

// @desc    Run a sync operation to populate/update problems from all platforms using CList
// @route   POST /api/sync/problems
// @access  Private (should be Admin only in production)
const syncAllProblems = asyncHandler(async (req, res) => {
    console.log('--- [SYNC CONTROLLER] Starting Full Problem Database Sync ---');
    
    const results = {};
    const platformsToSync = Object.keys(PLATFORM_RESOURCE_MAP);

    console.log(`[SYNC CONTROLLER] Platforms to sync: ${platformsToSync.join(', ')}`);

    // We run this sequentially to be kind to the API
    for (const platformName of platformsToSync) {
        console.log(`\n[SYNC CONTROLLER] ------ Syncing ${platformName}... ------`);
        try {
            const result = await fetchAndStoreAllProblemsFromClist(platformName);
            results[platformName] = result;
            console.log(`[SYNC CONTROLLER] ------ Finished Syncing ${platformName} ------`);
        } catch (error) {
            console.error(`[SYNC CONTROLLER] A critical error occurred while syncing ${platformName}:`, error);
            results[platformName] = { success: false, message: error.message };
        }
    }

    console.log('\n--- [SYNC CONTROLLER] Full Problem Database Sync Finished ---');
    res.status(200).json({
        message: 'Sync process completed.',
        summary: results
    });
});

module.exports = { syncAllProblems };