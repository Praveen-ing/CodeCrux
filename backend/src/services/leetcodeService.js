const axios = require('axios');
const Problem = require('../../models/problemList.js');
const he = require('he');

// A popular unofficial LeetCode API
const LEETCODE_API_URL = 'https://alfa-leetcode-api.onrender.com/problems';

// Helper to map LeetCode API difficulty to our format
const mapDifficulty = (difficulty) => {
    switch (difficulty) {
        case 'Easy':
            return '800'; // Example mapping, adjust as you see fit
        case 'Medium':
            return '1400';
        case 'Hard':
            return '2000';
        default:
            return '1200'; // Default for unknown
    }
};

async function fetchAndStoreLeetCodeProblems() {
    console.log('Attempting to fetch problems from LeetCode...');
    try {
        const response = await axios.get(LEETCODE_API_URL, {
            params: {
                limit: 2000 // Fetch a large number of problems
            }
        });

        if (!response.data || !response.data.problemsetQuestionList) {
            console.error('LeetCode API did not return expected data structure.');
            return { success: false, message: 'Invalid data structure from LeetCode API.' };
        }

        const rawProblems = response.data.problemsetQuestionList;
        console.log(`Fetched ${rawProblems.length} raw problem entries from LeetCode.`);

        let newProblemsCount = 0;
        let updatedProblemsCount = 0;

        for (const rawProblem of rawProblems) {
            if (!rawProblem.titleSlug || !rawProblem.title) {
                console.warn('Skipping raw LeetCode problem due to missing titleSlug or title:', rawProblem);
                continue;
            }

            const problemData = {
                problemId: rawProblem.frontendQuestionId, // LeetCode's display ID
                platform: 'LeetCode',
                title: he.decode(rawProblem.title),
                url: `https://leetcode.com/problems/${rawProblem.titleSlug}/`,
                difficulty: mapDifficulty(rawProblem.difficulty),
                tags: rawProblem.topicTags.map(tag => he.decode(tag.name)),
            };

            try {
                const result = await Problem.updateOne(
                    { problemId: problemData.problemId, platform: problemData.platform },
                    { $set: problemData },
                    { upsert: true, runValidators: true }
                );

                if (result.upsertedCount > 0) newProblemsCount++;
                else if (result.modifiedCount > 0) updatedProblemsCount++;
            } catch (dbError) {
                console.error(`Database error for LeetCode problem ${problemData.problemId}:`, dbError.message);
            }
        }

        console.log(`LeetCode Sync Complete: ${newProblemsCount} new problems added, ${updatedProblemsCount} problems updated.`);
        return { success: true, new: newProblemsCount, updated: updatedProblemsCount };

    } catch (error) {
        console.error('Error fetching or processing LeetCode problems:', error.response ? error.response.data : error.message);
        return { success: false, message: error.message };
    }
}

module.exports = { fetchAndStoreLeetCodeProblems };