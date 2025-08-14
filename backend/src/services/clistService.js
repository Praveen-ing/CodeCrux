// backend/src/services/clistService.js
const axios = require('axios');
const Problem = require('../../models/problemList.js'); // Ensure this path is correct
const he = require('he');

const CLIST_USERNAME = process.env.CLIST_USERNAME;
const CLIST_API_KEY = process.env.CLIST_API_KEY;
const CLIST_BASE_URL = 'https://clist.by/api/v4';

console.log('--- clistService.js Module Initial Load ---');
console.log('CLIST_USERNAME from process.env at module load:', CLIST_USERNAME);
console.log('CLIST_API_KEY from process.env at module load (is it defined?):', CLIST_API_KEY ? 'Defined' : 'UNDEFINED or EMPTY');
if (CLIST_API_KEY) {
    console.log('CLIST_API_KEY (first 5 chars at module load):', CLIST_API_KEY.substring(0, 5) + '...');
}
if (!CLIST_USERNAME || !CLIST_API_KEY) {
    console.warn('WARNING: CLIST_USERNAME or CLIST_API_KEY was not found in process.env when clistService.js module was loaded. This will likely cause API authentication failures.');
}
console.log('------------------------------------------');

const PLATFORM_RESOURCE_MAP = {
    'Codeforces': 1,
    'LeetCode': 93,
    'AtCoder': 92,
    'CodeChef': 2,
    'GeeksforGeeks': 102,
    'HackerRank': 65,
    'TopCoder': 12,
    'SPOJ': 15,
    'UVa': 16,
    'HackerEarth': 103,
};

const cleanPlatformName = (platformName) => {
    if (!platformName) return 'Unknown';
    const cleaned = platformName
        .replace(/\([^)]*\)/g, '')
        .replace(/[0-9]+/g, '')
        .replace(/[^a-zA-Z\s]/g, '')
        .trim()
        .split(' ')[0];
    return cleaned || platformName;
};

async function fetchAndStoreAllProblemsFromClist(platformName) {
    console.log(`--- Debugging fetchAndStoreAllProblemsFromClist for ${platformName} ---`);
    console.log('Using module-scoped CLIST_USERNAME:', CLIST_USERNAME);
    console.log('Using module-scoped CLIST_API_KEY (is it defined?):', CLIST_API_KEY ? 'Defined' : 'UNDEFINED or EMPTY');
    if (CLIST_API_KEY) {
        console.log('Using module-scoped CLIST_API_KEY (first 5 chars):', CLIST_API_KEY.substring(0, 5) + '...');
    }

    if (!CLIST_USERNAME || !CLIST_API_KEY) {
        console.error('CRITICAL ERROR in fetchAndStoreAllProblemsFromClist: CLIST_USERNAME or CLIST_API_KEY is missing from module scope. API calls will fail.');
        return { success: false, message: 'CLIST credentials missing (checked in function).' };
    }

    const resourceId = PLATFORM_RESOURCE_MAP[platformName];
    if (!resourceId) {
        console.warn(`No CLIST resource ID mapped for platform: ${platformName}`);
        return { success: false, message: `No CLIST resource ID for ${platformName}.` };
    }

    console.log(`Starting to fetch ALL problems for ${platformName} (Resource ID: ${resourceId}) from CLIST...`);

    try {
        const headers = {
            'Authorization': `ApiKey ${CLIST_USERNAME}:${CLIST_API_KEY}`,
        };
        console.log('Constructed Authorization Header (key partially masked):',
            headers.Authorization.replace(CLIST_API_KEY, CLIST_API_KEY ? CLIST_API_KEY.substring(0,5) + '...' : 'INVALID_KEY') // Added check for CLIST_API_KEY
        );
        console.log('-------------------------------------------------------------');

        let allProblems = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            console.log(`Workspaceing problems for ${platformName} - Offset: ${offset}, Limit: ${limit}`);
            const response = await axios.get(`${CLIST_BASE_URL}/problem/`, {
                headers,
                params: { resource_id: resourceId, limit: limit, offset: offset, order_by: 'id' }
            });

            if (!response.data || !response.data.objects) {
                console.error(`No problem data received from CLIST for ${platformName}:`, response.data);
                break;
            }
            const problems = response.data.objects;
            allProblems.push(...problems);
            console.log(`Workspaceed ${problems.length} problems for ${platformName} (Total so far: ${allProblems.length})`);

            if (problems.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
                await new Promise(resolve => setTimeout(resolve, 6000)); // 6-second delay
            }
        }
        console.log(`Total problems fetched for ${platformName}: ${allProblems.length}`);
        // ... (rest of processing logic: newProblemsCount, updatedProblemsCount, etc.)
        let newProblemsCount = 0;
        let updatedProblemsCount = 0;
        let skippedProblemsCount = 0;

        for (const clistProblem of allProblems) {
            if (!clistProblem.name || !clistProblem.url || !clistProblem.key) {
                skippedProblemsCount++;
                continue;
            }
            const cleanedPlatform = cleanPlatformName(platformName);
            const problemData = {
                problemId: clistProblem.key,
                platform: cleanedPlatform,
                title: he.decode(clistProblem.name),
                url: clistProblem.url,
                difficulty: clistProblem.rating ? String(clistProblem.rating) : (clistProblem.difficulty || 'N/A'),
                tags: Array.isArray(clistProblem.tags) ? clistProblem.tags.map(tag => he.decode(tag)) : [],
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
                if (dbError.code === 11000) console.warn(`Duplicate problem: ${problemData.platform}-${problemData.problemId}`);
                else console.error(`DB error for ${problemData.platform}-${problemData.problemId}:`, dbError.message);
            }
        }
        console.log(`CLIST Sync for ${platformName} Complete: New: ${newProblemsCount}, Updated: ${updatedProblemsCount}, Skipped: ${skippedProblemsCount}, Total: ${allProblems.length}`);
        return { success: true, platform: cleanedPlatform, new: newProblemsCount, updated: updatedProblemsCount, total: allProblems.length, skipped: skippedProblemsCount };

    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`Error fetching or processing CLIST problems for ${platformName}:`, errorMessage);
        return { success: false, platform: platformName, message: errorMessage };
    }
}

async function getTotalProblemsCount(platformName) {
    console.log(`--- Debugging getTotalProblemsCount for ${platformName} ---`);
    console.log('Using module-scoped CLIST_USERNAME:', CLIST_USERNAME);
    console.log('Using module-scoped CLIST_API_KEY (is it defined?):', CLIST_API_KEY ? 'Defined' : 'UNDEFINED or EMPTY');
    if (CLIST_API_KEY) {
        console.log('Using module-scoped CLIST_API_KEY (first 5 chars):', CLIST_API_KEY.substring(0, 5) + '...');
    }

    if (!CLIST_USERNAME || !CLIST_API_KEY) {
        console.error('CRITICAL ERROR in getTotalProblemsCount: CLIST_USERNAME or CLIST_API_KEY is missing from module scope. API calls will fail.');
        return 0;
    }

    const resourceId = PLATFORM_RESOURCE_MAP[platformName];
    if (!resourceId) {
        console.warn(`No CLIST resource ID mapped for platform (in getTotalProblemsCount): ${platformName}`);
        return 0;
    }

    try {
        const headers = {
            'Authorization': `ApiKey ${CLIST_USERNAME}:${CLIST_API_KEY}`,
        };
        console.log('Constructed Authorization Header (key partially masked):',
            headers.Authorization.replace(CLIST_API_KEY, CLIST_API_KEY ? CLIST_API_KEY.substring(0,5) + '...' : 'INVALID_KEY') // Added check for CLIST_API_KEY
        );
        console.log('-----------------------------------------------------');

        const response = await axios.get(`${CLIST_BASE_URL}/problem/`, {
            headers,
            params: {
                resource_id: resourceId,
                limit: 1,
                offset: 0,
            }
        });

        // Log the meta object to see what CList is returning
        console.log(`Full response.data.meta for ${platformName} (in getTotalProblemsCount):`, JSON.stringify(response.data?.meta, null, 2));
        
        return response.data?.meta?.total_count || 0;

    } catch (error) {
        console.error(`Error getting total count for ${platformName}:`, error.message);
        if (error.response) {
            console.error(`Error response data for ${platformName} (getTotalProblemsCount):`, JSON.stringify(error.response.data, null, 2));
            console.error(`Error response status for ${platformName} (getTotalProblemsCount):`, error.response.status);
        }
        return 0;
    }
}

module.exports = {
    fetchAndStoreAllProblemsFromClist,
    PLATFORM_RESOURCE_MAP,
    getTotalProblemsCount,
    cleanPlatformName
};