// backend/controllers/problemListController.js
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Problem = require('../models/problemList.js');      // Path if models/ is sibling to controllers/
const SolvedProblem = require('../models/solvedProblem.js'); // Path if models/ is sibling to controllers/
const User = require('../models/user.js');                // Path if models/ is sibling to controllers/
const { cleanPlatformName } = require('../src/services/clistService.js'); // Path to service

// @desc    Get problems with advanced filtering and pagination
// @route   GET /api/problems
// @access  Public (optional auth for user-specific status)
const getProblems = asyncHandler(async (req, res) => {
    console.log('--- getProblems controller hit ---');
    console.log('Request Query Params:', req.query);

    const {
        page = 1,
        limit = 20,
        search = '',
        difficulty = '',
        platform = '',
        tags = '',
        status = '',
        sortBy = 'createdAt', // Default sort by creation date
        sortOrder = 'desc'   // Default to newest first
    } = req.query;

    const userId = req.user?.id; // Get user ID if authenticated by optionalAuth
    const pageNumber = Math.max(1, parseInt(page));
    const limitNumber = parseInt(limit) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
            { title: searchRegex },
            { problemId: searchRegex }
        ];
    }

    if (difficulty && difficulty.toLowerCase() !== 'all') {
        if (difficulty.endsWith('+')) {
            const baseDifficulty = parseInt(difficulty.slice(0, -1));
            if (!isNaN(baseDifficulty)) {
                filter.difficulty = { $gte: String(baseDifficulty) };
            }
        } else if (!isNaN(parseInt(difficulty))) {
            filter.difficulty = String(difficulty);
        } else {
            filter.difficulty = difficulty;
        }
    }

    if (platform && platform.toLowerCase() !== 'all') {
        const cleanedPlatform = cleanPlatformName(platform); // Assuming cleanPlatformName handles casing
        filter.platform = new RegExp(`^${cleanedPlatform}$`, 'i');
    }

    if (tags && tags.trim()) {
        const tagArray = tags.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        if (tagArray.length > 0) {
            // Find problems that have ALL specified tags (case-insensitive)
            filter.tags = { $all: tagArray.map(tag => new RegExp(`^${tag}$`, 'i')) };
        }
    }

    const sort = {};
    const validSortFields = ['title', 'platform', 'difficulty', 'problemId', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    sort[sortField] = sortDirection;

    console.log('Initial filter before status:', JSON.stringify(filter, null, 2));
    console.log('Sort being applied:', sort);

    // Apply status filtering if userId and status are provided
    if (userId && status) {
        const solvedProblemsForUser = await SolvedProblem.find({ userId }).select('platform problemId -_id').lean();
        const solvedProblemKeys = solvedProblemsForUser.map(sp => `${cleanPlatformName(sp.platform)}-${sp.problemId}`); // Ensure platform is cleaned for comparison

        if (status === 'solved') {
            console.log('Filtering for SOLVED problems.');
            if (solvedProblemKeys.length === 0) {
                // User has no solved problems, so return none for "solved" filter
                filter._id = new mongoose.Types.ObjectId(0); // Impossible match
            } else {
                // This $expr approach for solved is complex and might be inefficient.
                // A better way might be to get _ids of problems that match the filter *and* are solved.
                // However, sticking to modifying the main filter for now:
                // We need problems whose (platform-problemId) concat is IN solvedProblemKeys
                // This usually requires an aggregation pipeline for optimal performance with $concat for matching.
                // For a simpler filter (less optimal but works with find):
                const solvedConditions = solvedProblemsForUser.map(sp => ({
                    platform: new RegExp(`^${cleanPlatformName(sp.platform)}$`, 'i'),
                    problemId: sp.problemId
                }));
                filter.$or = (filter.$or || []).concat(solvedConditions); // This OR might conflict with search OR
                // To combine correctly:
                if (filter.$or && solvedConditions.length > 0) {
                    filter.$and = (filter.$and || []);
                    filter.$and.push({ $or: filter.$or }); // Existing search OR
                    filter.$and.push({ $or: solvedConditions }); // Solved problems OR
                    delete filter.$or; // Remove top-level $or
                } else if (solvedConditions.length > 0) {
                    filter.$or = solvedConditions;
                }

            }
        } else if (status === 'unsolved') {
            console.log('Filtering for UNSOLVED problems.');
            if (solvedProblemKeys.length > 0) {
                // We need problems whose (platform-problemId) concat is NOT IN solvedProblemKeys.
                // Using $nor with individual platform/problemId pairs:
                const unsolvedConditions = solvedProblemsForUser.map(sp => ({
                    platform: new RegExp(`^${cleanPlatformName(sp.platform)}$`, 'i'),
                    problemId: sp.problemId
                }));
                filter.$nor = unsolvedConditions;
            }
            // If no solved problems, all problems are effectively unsolved for this user (no change to filter needed)
        }
    }

    console.log('Final filter being applied:', JSON.stringify(filter, null, 2));

    const totalProblems = await Problem.countDocuments(filter);
    console.log('Total problems matching filters:', totalProblems);

    let problems = await Problem.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNumber)
        .lean(); // Use .lean() for faster, plain JS objects

    console.log(`Retrieved ${problems.length} problems for page ${pageNumber}.`);

    // Augment problems with user-specific solved and favorite status if user is logged in
    if (userId && problems.length > 0) {
        const user = await User.findById(userId).select('favoriteProblems').lean(); // Only fetch favorites here, solved is handled by filter or can be re-checked
        const solvedProblemKeysSet = new Set(); // Re-populate for accurate current page status
        if (status !== 'unsolved') { // If not explicitly unsolved, check solved status
            const solvedProblemsForUser = await SolvedProblem.find({ userId }).select('platform problemId -_id').lean();
            solvedProblemsForUser.forEach(sp => solvedProblemKeysSet.add(`${cleanPlatformName(sp.platform)}-${sp.problemId}`));
        }

        const favoriteProblemKeysSet = new Set();
        if (user && user.favoriteProblems) {
            user.favoriteProblems.forEach(fav => favoriteProblemKeysSet.add(`${cleanPlatformName(fav.platform)}-${fav.problemId}`));
        }

        problems = problems.map(p => ({
            ...p,
            platform: cleanPlatformName(p.platform), // Clean platform name for display
            isSolvedByCurrentUser: status === 'solved' || (userId && solvedProblemKeysSet.has(`${cleanPlatformName(p.platform)}-${p.problemId}`)),
            isFavoritedByCurrentUser: userId && favoriteProblemKeysSet.has(`${cleanPlatformName(p.platform)}-${p.problemId}`),
            __v: undefined // Remove version key
        }));
    } else {
        problems = problems.map(p => ({
            ...p,
            platform: cleanPlatformName(p.platform),
            isSolvedByCurrentUser: false,
            isFavoritedByCurrentUser: false,
            __v: undefined
        }));
    }

    const totalPages = Math.ceil(totalProblems / limitNumber);
    const responsePayload = {
        // Keeping the flat structure for pagination fields as your frontend expects
        data: problems,
        currentPage: pageNumber,
        totalPages,
        totalProblems,
        // More detailed pagination and filter info (optional, but good for robust APIs)
        /*
        pagination: {
            currentPage: pageNumber,
            totalPages,
            totalProblems,
            problemsPerPage: limitNumber,
            hasNextPage: pageNumber < totalPages,
            hasPrevPage: pageNumber > 1
        },
        filtersApplied: { search, difficulty, platform, tags, status, sortBy, sortOrder }
        */
    };

    console.log(`Returning ${problems.length} problems (Page ${pageNumber}/${totalPages})`);
    res.json(responsePayload);

});

// @desc    Mark problem as solved
// @route   POST /api/problems/solve
// @access  Private
// backend/controllers/problemListController.js
// ...
const markProblemSolved = asyncHandler(async (req, res) => {
    console.log('--- markProblemSolved Controller Invoked ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request User (req.user):', req.user);
    console.log('Request Body (req.body):', req.body);

    const { problemId, platform, title } = req.body;
    const userId = req.user?.id;
    console.log('Extracted userId:', userId);

    if (!userId) {
        console.error('[ERROR] userId is missing. User may not be properly authenticated.');
        res.status(401);
        throw new Error('User authentication failed or user ID is missing. Cannot mark problem as solved.');
    }

    if (!problemId || !platform) {
        res.status(400);
        throw new Error('Problem ID and platform are required');
    }

    const cleanedPlatform = cleanPlatformName(platform);
    console.log(`Checking existing solved for: userId=${userId}, problemId=${problemId}, platform=${cleanedPlatform}`);

    const existingSolvedInCollection = await SolvedProblem.findOne({
        userId,
        problemId,
        platform: cleanedPlatform
    });

    if (existingSolvedInCollection) {
        console.log('Problem already marked as solved in SolvedProblem collection for this user.');
        // Optionally, you could also ensure it's in the user.solvedProblems array here if it's not,
        // but for now, let's assume if it's in SolvedProblem collection, it's considered handled.
        return res.status(200).json({ success: true, message: 'Problem already marked as solved' });
    }

    console.log(`Attempting to save new SolvedProblem with: userId=${userId}, problemId=${problemId}, platform=${cleanedPlatform}, title=${title || 'N/A'}`);

    const solvedAtDate = new Date(); // Use a consistent date for both entries

    // 1. Save to the separate SolvedProblem collection (for detailed records/history)
    const newSolvedProblemEntry = new SolvedProblem({
        userId,
        problemId,
        platform: cleanedPlatform,
        title: title || 'N/A',
        solvedAt: solvedAtDate
    });

    try {
        await newSolvedProblemEntry.save();
        console.log('New SolvedProblem entry saved successfully to SolvedProblem collection.');

        // 2. ALSO update the User document's solvedProblems array for dashboard count
        const user = await User.findById(userId);
        if (!user) {
            // This is unlikely if userId was valid for SolvedProblem, but good to check
            console.error(`User not found with ID: ${userId} when trying to update user.solvedProblems array.`);
            // Continue to send success as the main operation (SolvedProblem entry) succeeded
            // but log this inconsistency.
        } else {
            // Check if this specific problem entry is already in user.solvedProblems to avoid duplicates
            const problemAlreadyInUserArray = user.solvedProblems.some(
                sp => sp.problemId === problemId && sp.platform === cleanedPlatform && sp.userId && sp.userId.equals(userId)
            );

            if (!problemAlreadyInUserArray) {
                // What you push here should match the expected structure in your User model's solvedProblems array.
                // Assuming it stores objects similar to what SolvedProblem stores, or at least problemId and platform.
                // For the example, let's assume it stores objects with problemId, platform, title, and solvedAt.
                user.solvedProblems.push({
                    problemId: problemId,
                    platform: cleanedPlatform,
                    title: title || 'N/A', // Or whatever your User schema expects
                    solvedAt: solvedAtDate, // Consistent timestamp
                    // Add other fields if your User.solvedProblems array elements have them
                });
                await user.save(); // Save the updated user document
                console.log(`User document (userId: ${userId}) updated with new entry in solvedProblems array.`);
            } else {
                console.log(`Problem (id: ${problemId}, platform: ${cleanedPlatform}) already present in user.solvedProblems array for userId: ${userId}.`);
            }
        }
        res.status(201).json({ success: true, message: 'Problem marked as solved successfully and user stats updated.' });

    } catch (dbError) {
        console.error('Database error in markProblemSolved:', dbError);
        res.status(500);
        throw new Error(dbError.message || 'Failed to save solved problem to database.');
    }
});

// ...

// @desc    Add a new problem
// @route   POST /api/problems/add
// @access  Private/Admin
const addProblem = asyncHandler(async (req, res) => {
    const { problemId, platform, title, url, difficulty, tags } = req.body;

    if (!problemId || !platform || !title || !url) {
        res.status(400);
        throw new Error('Please provide problemId, platform, title, and url');
    }

    const cleanedPlatform = cleanPlatformName(platform);
    const problemExists = await Problem.findOne({ problemId, platform: cleanedPlatform });

    if (problemExists) {
        res.status(400);
        throw new Error(`Problem with ID '${problemId}' on platform '${cleanedPlatform}' already exists`);
    }

    const problem = new Problem({
        problemId,
        platform: cleanedPlatform,
        title,
        url,
        difficulty,
        tags: tags || [],
    });

    const createdProblem = await problem.save();
    res.status(201).json(createdProblem);
});

// @desc    Seed database with sample problems
// @route   POST /api/problems/seed
// @access  Private/Admin
const seedProblems = asyncHandler(async (req, res) => {
    const numberOfProblems = parseInt(req.query.count) || 20;
    const createdProblems = [];

    const platforms = ['Codeforces', 'LeetCode', 'AtCoder', 'GeeksforGeeks', 'CodeChef', 'HackerRank'];
    const difficulties = ['Easy', 'Medium', 'Hard', '800', '1000', '1200', '1400', '1600', '1800', '2000+', '2200', '2400'];
    const commonTags = ['arrays', 'strings', 'dp', 'graphs', 'trees', 'math', 'greedy', 'sorting', 'searching', 'two pointers', 'implementation', 'constructive algorithms', 'binary search', 'bit manipulation', 'number theory', 'data structures', 'combinatorics', 'geometry'];

    for (let i = 0; i < numberOfProblems; i++) {
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
        const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        const numTags = Math.floor(Math.random() * 4); // 0 to 3 tags
        let problemTags = [];
        if (numTags > 0) {
            const shuffledTags = [...commonTags].sort(() => 0.5 - Math.random()); // Create a copy before shuffling
            problemTags = shuffledTags.slice(0, numTags);
        }

        const problemData = {
            problemId: `${randomPlatform.slice(0, 2).toUpperCase()}${Date.now().toString().slice(-4) + i + Math.random().toString(16).slice(2, 6)}`, // More unique problemId
            platform: cleanPlatformName(randomPlatform),
            title: `Seeded ${randomPlatform} Problem ${i + 1} (${randomDifficulty})`,
            url: `https://example.com/problem/${randomPlatform.toLowerCase()}/${Date.now().toString().slice(-5) + i + Math.random().toString(16).slice(2, 6)}`,
            difficulty: randomDifficulty,
            tags: problemTags,
        };

        try {
            const existingProblem = await Problem.findOne({ problemId: problemData.problemId, platform: problemData.platform });
            if (!existingProblem) {
                const problem = new Problem(problemData);
                const created = await problem.save();
                createdProblems.push(created);
            }
        } catch (error) {
            console.warn(`Could not seed problem: ${problemData.title}`, error.message);
        }
    }
    if (createdProblems.length > 0) {
        res.status(201).json({ message: `${createdProblems.length} problems seeded successfully.`, data: createdProblems });
    } else {
        res.status(200).json({ message: "No new problems were seeded (they may already exist or an error occurred)." });
    }
});

// @desc    Get platform statistics (problem counts, difficulties)
// @route   GET /api/problems/stats
// @access  Public
const getPlatformStats = asyncHandler(async (req, res) => {
    const stats = await Problem.aggregate([
        {
            $group: {
                _id: '$platform',
                count: { $sum: 1 },
                difficulties: { $addToSet: '$difficulty' }
            }
        },
        {
            $project: {
                platform: { $ifNull: ['$_id', 'Unknown'] },
                count: 1,
                difficulties: {
                    $filter: {
                        input: '$difficulties',
                        cond: { $ne: ['$$this', null] } // Remove null difficulties
                    }
                },
                _id: 0 // Exclude the default _id field from group stage
            }
        },
        { $sort: { count: -1 } }
    ]);

    const cleanedStats = stats.map(stat => ({
        ...stat,
        platform: cleanPlatformName(stat.platform)
    }));

    const totalProblemsInDB = await Problem.countDocuments();

    res.json({
        success: true,
        data: {
            platforms: cleanedStats,
            totalProblemsInDB,
            totalPlatforms: cleanedStats.length
        }
    });
});


// @desc    Get total problem count (for debugging or quick stats)
// @route   GET /api/problems/total-count (Example of a new specific route if needed)
// @access  Public
const getTotalProblemsCount = asyncHandler(async (req, res) => {
    const totalCount = await Problem.countDocuments();
    const platformCounts = await Problem.aggregate([
        {
            $group: {
                _id: '$platform',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    res.json({
        success: true,
        data: {
            totalProblems: totalCount,
            platformBreakdown: platformCounts.map(p => ({ platform: cleanPlatformName(p._id), count: p.count }))
        }
    });
});


module.exports = {
    getProblems,
    markProblemSolved,
    addProblem,
    seedProblems,
    getPlatformStats,
    getTotalProblemsCount
};