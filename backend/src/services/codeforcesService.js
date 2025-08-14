// backend/src/services/codeforcesService.js
const axios = require('axios');
const Problem = require('../../models/problemList.js'); // Or '../../models/problemList.js'
const he = require('he'); // For decoding HTML entities in titles/tags

// Helper function to construct problem URL
const getCodeforcesProblemURL = (contestId, index) => {
    if (contestId && contestId < 10000) { // Typical contest problems
        return `https://codeforces.com/problemset/problem/${contestId}/${index}`;
    }
    // For gym problems or other formats, the URL structure might differ
    // This might need more sophisticated logic if you include gym problems
    return `https://codeforces.com/problem/${contestId}/${index}`;
};

async function fetchAndStoreCodeforcesProblems() {
    console.log('Attempting to fetch problems from Codeforces...');
    try {
        // 1. Fetch raw problem data from Codeforces API
        // This endpoint gives a list of all problems along with their statistics
        const response = await axios.get('https://codeforces.com/api/problemset.problems');

        if (response.data.status !== 'OK') {
            console.error('Codeforces API did not return OK status:', response.data.comment);
            return { success: false, message: response.data.comment || 'Failed to fetch from Codeforces API.' };
        }

        const rawProblems = response.data.result.problems;
        // const rawProblemStatistics = response.data.result.problemStatistics; // Statistics might be useful for solved counts, etc.

        console.log(`Workspaceed ${rawProblems.length} raw problem entries from Codeforces.`);
        let newProblemsCount = 0;
        let updatedProblemsCount = 0;

        // 2. Transform and save each problem
        for (const rawProblem of rawProblems) {
            if (!rawProblem.contestId || !rawProblem.index || !rawProblem.name) {
                console.warn('Skipping raw problem due to missing essential fields:', rawProblem);
                continue;
            }

            const problemData = {
                problemId: `${rawProblem.contestId}${rawProblem.index}`, // Unique ID for Codeforces
                platform: 'Codeforces',
                title: he.decode(rawProblem.name), // Decode HTML entities like &quot;
                url: getCodeforcesProblemURL(rawProblem.contestId, rawProblem.index),
                difficulty: rawProblem.rating ? String(rawProblem.rating) : undefined,
                tags: rawProblem.tags.map(tag => he.decode(tag)), // Decode tags as well
            };

            try {
                const result = await Problem.updateOne(
                    { problemId: problemData.problemId, platform: problemData.platform },
                    { $set: problemData },
                    { upsert: true, runValidators: true } // runValidators ensures schema rules are checked on update
                );

                if (result.upsertedCount > 0) {
                    newProblemsCount++;
                } else if (result.modifiedCount > 0) {
                    updatedProblemsCount++;
                }
            } catch (dbError) {
                if (dbError.code === 11000) { // Duplicate key error
                    // This might happen if another process inserted it, or rarely due to race conditions if not handled properly
                    console.warn(`Attempted to insert duplicate problem: ${problemData.platform}-${problemData.problemId}. It likely already exists.`);
                } else {
                    console.error(`Database error for problem ${problemData.platform}-${problemData.problemId}:`, dbError.message);
                }
                // Continue to next problem even if one fails to save, or implement more robust retry/error logging
            }
        }

        console.log(`Codeforces Sync Complete: ${newProblemsCount} new problems added, ${updatedProblemsCount} problems updated.`);
        return { success: true, new: newProblemsCount, updated: updatedProblemsCount };

    } catch (error) {
        console.error('Error fetching or processing Codeforces problems:', error.response ? error.response.data : error.message);
        // If error.response exists, it's likely an axios error with details from the server
        // Otherwise, it could be a network issue or a bug in the processing logic
        return { success: false, message: error.message };
    }
}

module.exports = { fetchAndStoreCodeforcesProblems };