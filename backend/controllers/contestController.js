// backend/controllers/contestController.js (COMMONJS VERSION)
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Contest = require('../models/contest.js');
const { fetchUpcomingContestsFromClist } = require('../utils/apiFetcher.js');

const CACHE_DURATION_MINUTES = 60;
// MODIFIED: Use the clean platform names that apiFetcher provides.
const ALLOWED_PLATFORMS = ['LeetCode', 'Codeforces', 'CodeChef', 'GeeksForGeeks', 'AtCoder'];


// Define ALL your functions first:

const getContests = asyncHandler(async (req, res) => {
    const { platform, showPast = 'false', limit = 100, page = 1, forceRefresh = 'false' } = req.query;
    const shouldShowPast = showPast === 'true';
    const queryLimit = Math.min(parseInt(limit, 10) || 100, 200);
    const skipAmount = (Math.max(parseInt(page, 10) || 1, 1) - 1) * queryLimit;
    const shouldForceRefresh = forceRefresh === 'true';

    // MODIFIED: This is the primary query object for filtering contests.
    const dbQuery = {
        // Use a case-insensitive regex to match against the allowed platforms.
        platform: { $in: ALLOWED_PLATFORMS.map(p => new RegExp(`^${p}$`, 'i')) }
    };

    if (!shouldShowPast) {
        dbQuery.endTime = { $gte: new Date() };
    }

    // This allows for filtering by a specific platform (e.g., ?platform=leetcode)
    if (platform) {
        dbQuery.platform = { $regex: new RegExp(`^${platform}$`, 'i') };
    }


    console.log(`[ContestCtrl] Effective parameters: platform='${platform}', showPast=${shouldShowPast}, limit=${queryLimit}, page=${page}, forceRefresh=${shouldForceRefresh}`);

    let contestsFromDB = await Contest.find(dbQuery)
        .sort({ startTime: shouldShowPast ? -1 : 1 })
        .skip(skipAmount)
        .limit(queryLimit)
        .lean();

    const now = new Date();
    const isCacheConsideredStale = !contestsFromDB.length || contestsFromDB.some(c =>
        c.apiSource === 'clist.by' &&
        (!c.lastFetchedFromApiAt || (now - new Date(c.lastFetchedFromApiAt)) / (1000 * 60) > CACHE_DURATION_MINUTES)
    );

    if (shouldForceRefresh || (!contestsFromDB.length && !shouldShowPast) || (isCacheConsideredStale && !shouldShowPast)) {
        console.log('[ContestCtrl] Condition met to fetch from Clist.by. Calling apiFetcher...');
        const apiContests = await fetchUpcomingContestsFromClist({ limit: 200 });

        if (apiContests && apiContests.length > 0) {
            console.log(`[ContestCtrl] Received ${apiContests.length} contests from apiFetcher.`);
            
            // MODIFIED: Filter operations to only include allowed platforms (case-insensitive check).
            const operations = apiContests.map(apiContest => {
                if (!apiContest.platform || !ALLOWED_PLATFORMS.some(p => p.toLowerCase() === apiContest.platform.toLowerCase())) {
                    console.warn(`[ContestCtrl] SKIPPING DB op for ClistID: ${apiContest.id}, Title: ${apiContest.title} because platform '${apiContest.platform}' is not allowed.`);
                    return null; // Skip this operation
                }
                const contestDataFromApi = {
                    title: apiContest.title,
                    platform: apiContest.platform,
                    platformIcon: apiContest.platformIcon,
                    startTime: new Date(apiContest.startTime),
                    endTime: new Date(apiContest.endTime),
                    durationSeconds: apiContest.durationSeconds,
                    url: apiContest.url,
                    description: apiContest.description || '',
                    apiSource: 'clist.by',
                    lastFetchedFromApiAt: new Date(),
                    clistId: apiContest.id,
                };
                return {
                    updateOne: {
                        filter: { clistId: apiContest.id },
                        update: { $set: contestDataFromApi },
                        upsert: true,
                    },
                };
            }).filter(op => op !== null);


            if (operations.length > 0) {
                try {
                    console.log(`[ContestCtrl] Attempting to bulkWrite ${operations.length} operations to DB...`);
                    await Contest.bulkWrite(operations);
                    console.log(`[ContestCtrl] Synced/Updated contests from Clist.by with DB.`);
                } catch (bulkWriteError) {
                    console.error("[ContestCtrl] Error during bulkWrite:", bulkWriteError);
                    if (bulkWriteError.writeErrors) {
                        bulkWriteError.writeErrors.forEach(err => console.error("BulkWrite Sub-error:", err.errmsg));
                    }
                }
            } else {
                console.log("[ContestCtrl] No valid operations to bulkWrite after filtering.");
            }

            contestsFromDB = await Contest.find(dbQuery)
                .sort({ startTime: shouldShowPast ? -1 : 1 })
                .skip(skipAmount)
                .limit(queryLimit)
                .lean();
        } else {
            console.log('[ContestCtrl] apiFetcher returned no contests or an empty array.');
        }
    }
    const totalContests = await Contest.countDocuments(dbQuery);

    res.status(200).json({
        contests: contestsFromDB,
        currentPage: Math.max(parseInt(page, 10) || 1, 1),
        totalPages: Math.ceil(totalContests / queryLimit),
        totalContests
    });
});

const syncContestsWithClist = asyncHandler(async (req, res) => {
    console.log('[ContestCtrl] Admin sync initiated with Clist.by...');
    const apiContests = await fetchUpcomingContestsFromClist({ limit: 250 });

    if (apiContests && apiContests.length > 0) {
        // MODIFIED: Ensure this filter also uses the correct, case-insensitive check.
        const validApiContests = apiContests.filter(apiContest => {
            const isPlatformAllowed = apiContest.platform && ALLOWED_PLATFORMS.some(p => p.toLowerCase() === apiContest.platform.toLowerCase());
            if (!isPlatformAllowed) {
                console.warn(`[ContestCtrl-Sync] SKIPPING ClistID: ${apiContest.id}, Title: ${apiContest.title} because apiContest.platform is '${apiContest.platform}'.`);
                return false; // Filter out this contest
            }
            return true;
        });

        if (validApiContests.length === 0) {
            const message = 'No valid contests with allowed platform data fetched from Clist.by for sync.';
            console.log(`[ContestCtrl-Sync] ${message}`);
            res.status(200).json({ message });
            return;
        }
        
        const operations = validApiContests.map(apiContest => {
            const contestDataFromApi = {
                title: apiContest.title,
                platform: apiContest.platform,
                platformIcon: apiContest.platformIcon,
                startTime: new Date(apiContest.startTime),
                endTime: new Date(apiContest.endTime),
                durationSeconds: apiContest.durationSeconds,
                url: apiContest.url,
                description: apiContest.description || '',
                apiSource: 'clist.by',
                lastFetchedFromApiAt: new Date(),
                clistId: apiContest.id,
            };
            return {
                updateOne: {
                    filter: { clistId: apiContest.id },
                    update: { $set: contestDataFromApi },
                    upsert: true,
                },
            };
        });
        
        try {
            const result = await Contest.bulkWrite(operations);
            const message = `Sync completed. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}. Total valid contests processed: ${validApiContests.length}.`;
            console.log(`[ContestCtrl-Sync] ${message}`);
            res.status(200).json({ message, details: result });
        } catch (bulkWriteError) {
            console.error("[ContestCtrl-Sync] Error during bulkWrite:", bulkWriteError);
            if (bulkWriteError.writeErrors) {
                bulkWriteError.writeErrors.forEach(err => console.error("BulkWrite Sub-error (Sync):", err.errmsg));
            }
            res.status(500).json({ message: "Error during database sync." });
        }
    } else {
        const message = 'No new contests fetched from Clist.by or API error during sync.';
        console.log(`[ContestCtrl-Sync] ${message}`);
        res.status(200).json({ message });
    }
});

const createManualContest = asyncHandler(async (req, res) => {
    const { title, platform, startTime, endTime, url, description, platformIcon, clistId } = req.body;

    if (!title || !platform || !startTime || !endTime || !url) {
        res.status(400);
        throw new Error('Please provide title, platform, start time, end time, and URL');
    }

    if (clistId) {
        const existingContest = await Contest.findOne({ clistId });
        if (existingContest) {
            res.status(400);
            throw new Error(`Contest with Clist ID ${clistId} already exists.`);
        }
    }

    const contest = new Contest({
        title,
        platform,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        durationSeconds: (new Date(endTime) - new Date(startTime)) / 1000,
        url,
        description,
        platformIcon,
        clistId: clistId || null,
        apiSource: 'manual',
    });

    const createdContest = await contest.save();
    res.status(201).json(createdContest);
});

const getContestByMongoId = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400); throw new Error('Invalid Contest ID format');
    }
    const contest = await Contest.findById(req.params.id).lean();
    if (contest) {
        res.status(200).json(contest);
    } else {
        res.status(404); throw new Error('Contest not found');
    }
});

const updateManualContest = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400); throw new Error('Invalid Contest ID format');
    }
    const contest = await Contest.findById(req.params.id);

    if (contest) {
        const updatableFields = ['title', 'platform', 'platformIcon', 'url', 'description', 'clistId'];
        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) contest[field] = req.body[field];
        });
        if (req.body.startTime) contest.startTime = new Date(req.body.startTime);
        if (req.body.endTime) contest.endTime = new Date(req.body.endTime);

        if (req.body.startTime || req.body.endTime) {
            contest.durationSeconds = (new Date(contest.endTime) - new Date(contest.startTime)) / 1000;
        } else if (req.body.durationSeconds !== undefined) {
            contest.durationSeconds = req.body.durationSeconds;
        }

        const updatedContest = await contest.save();
        res.status(200).json(updatedContest);
    } else {
        res.status(404); throw new Error('Contest not found for update');
    }
});

const deleteManualContest = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400); throw new Error('Invalid Contest ID format');
    }
    const contest = await Contest.findById(req.params.id);
    if (contest) {
        await contest.deleteOne();
        res.status(200).json({ message: 'Contest removed successfully' });
    } else {
        res.status(404); throw new Error('Contest not found for deletion');
    }
});

// Export all functions for use in contestRoutes.js
// This block should be at the VERY END of the file, after all function declarations.
module.exports = {
    getContests,
    syncContestsWithClist,
    createManualContest,
    getContestByMongoId,
    updateManualContest,
    deleteManualContest,
};