// backend/src/scripts/populateProblems.js
const dotenv = require('dotenv');
// CONFIGURE DOTENV IMMEDIATELY AND AT THE VERY TOP
const envPath = require('path').resolve(__dirname, '../../.env');
console.log(`Attempting to load .env file from: ${envPath}`);
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
    console.error('ERROR loading .env file:', dotenvResult.error);
} else {
    console.log('.env file loaded successfully. Parsed content (keys only):', Object.keys(dotenvResult.parsed || {}));
    // For deeper debugging, temporarily log the critical values right after loading
    // console.log('CLIST_USERNAME directly after dotenv.config:', process.env.CLIST_USERNAME);
    // console.log('CLIST_API_KEY directly after dotenv.config (first 5):', process.env.CLIST_API_KEY ? process.env.CLIST_API_KEY.substring(0,5) : 'NOT LOADED');
}

const mongoose = require('mongoose'); // Now other requires can follow
const connectDB = require('../../config/db.js'); // Ensure this path is correct
const { fetchAndStoreCodeforcesProblems } = require('../services/codeforcesService.js');
const { fetchAndStoreAllProblemsFromClist, PLATFORM_RESOURCE_MAP } = require('../services/clistService.js');
// Removed getTotalProblemsCount from import as it's no longer used here after commenting out the loop

connectDB();

const populateAllProblems = async () => {
    try {
        console.log('🚀 Starting comprehensive problem population process...');
        console.log('===============================================');

        const totalStartTime = Date.now();
        const results = {
            platforms: [],
            totalProblems: 0, // This will track problems processed from fetchAndStoreAllProblemsFromClist
            totalNew: 0,
            totalUpdated: 0,
            errors: []
        };

        // Get total counts first for reporting - THIS SECTION IS NOW COMMENTED OUT
        /*
        console.log('📊 Checking total problem counts for each platform (with delays)...');
        for (const platformName of Object.keys(PLATFORM_RESOURCE_MAP)) {
            const count = await getTotalProblemsCount(platformName); // getTotalProblemsCount would need to be imported if this is re-enabled
            console.log(`${platformName}: ~${count} problems available`);
            if (Object.keys(PLATFORM_RESOURCE_MAP)[Object.keys(PLATFORM_RESOURCE_MAP).length - 1] !== platformName) {
                 console.log(`⏳ Waiting 6 seconds before checking next platform's count...`);
                 await new Promise(resolve => setTimeout(resolve, 6000));
            }
        }
        console.log('===============================================');
        */

        // Fetch from Codeforces (using your existing service)
        console.log('🔄 Fetching problems from Codeforces...');
        try {
            const codeforcesResult = await fetchAndStoreCodeforcesProblems();
            results.platforms.push({
                name: 'Codeforces',
                success: true,
                new: codeforcesResult?.new || 0,
                updated: codeforcesResult?.updated || 0,
                total: (codeforcesResult?.new || 0) + (codeforcesResult?.updated || 0) // Total processed in this run for this platform
            });
            console.log('✅ Codeforces sync completed');
        } catch (error) {
            console.error('❌ Codeforces sync failed:', error.message);
            results.errors.push(`Codeforces: ${error.message}`);
            results.platforms.push({ name: 'Codeforces', success: false, message: error.message });
        }
        
        console.log('⏳ Waiting a moment before starting CLIST platforms...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Short delay after Codeforces

        // Fetch from other platforms via CLIST
        const clistPlatformsToFetch = [
            'LeetCode',
            'AtCoder',
            'CodeChef',
            'GeeksforGeeks',
            'HackerRank',
            'TopCoder',
            'SPOJ',
            'UVa',
            'HackerEarth'
        ];

        for (const platformName of clistPlatformsToFetch) {
            if (PLATFORM_RESOURCE_MAP[platformName]) {
                console.log(`🔄 Fetching ALL problems from ${platformName}...`);
                const startTime = Date.now();

                try {
                    const result = await fetchAndStoreAllProblemsFromClist(platformName); // This function has internal pagination delays
                    const endTime = Date.now();
                    const duration = ((endTime - startTime) / 1000).toFixed(2);

                    if (result.success) {
                        results.platforms.push({
                            name: result.platform,
                            success: true,
                            new: result.new,
                            updated: result.updated,
                            total: result.total, // Total problems fetched/processed in this run for this platform
                            skipped: result.skipped,
                            duration: `${duration}s`
                        });

                        results.totalNew += result.new;
                        results.totalUpdated += result.updated;
                        // results.totalProblems += result.total; // Summing total problems processed across platforms
                    } else {
                        console.error(`❌ ${platformName} sync failed: ${result.message}`);
                        results.errors.push(`${platformName}: ${result.message}`);
                        results.platforms.push({ name: platformName, success: false, message: result.message, new:0, updated:0, total:0, skipped:0 });
                    }
                } catch (error) {
                    console.error(`❌ ${platformName} sync encountered an unhandled error:`, error.message);
                    results.errors.push(`${platformName}: ${error.message}`);
                    results.platforms.push({ name: platformName, success: false, message: error.message, new:0, updated:0, total:0, skipped:0 });
                }

                if (clistPlatformsToFetch[clistPlatformsToFetch.length - 1] !== platformName) {
                    console.log(`⏳ Waiting 6 seconds before fetching next CLIST platform...`);
                    await new Promise(resolve => setTimeout(resolve, 6000));
                }
            } else {
                console.warn(`⚠️  Skipping ${platformName} - not configured in PLATFORM_RESOURCE_MAP`);
            }
        }

        const totalEndTime = Date.now();
        const totalDuration = ((totalEndTime - totalStartTime) / 1000 / 60).toFixed(2);
        
        // Recalculate totalProblems based on successful fetches
        results.totalProblems = results.platforms.reduce((acc, p) => acc + (p.total || 0), 0);


        console.log('\n🎉 PROBLEM POPULATION COMPLETE!');
        console.log('===============================================');
        console.log(`⏱️  Total Duration: ${totalDuration} minutes`);
        console.log(`📊 Overall Statistics (from this run):`);
        console.log(`   • Total New Problems Added/Upserted: ${results.totalNew}`);
        console.log(`   • Total Problems Updated: ${results.totalUpdated}`);
        console.log(`   • Total Problems Processed from APIs this run: ${results.totalProblems}`);

        console.log('\n📋 Platform Breakdown:');
        results.platforms.forEach(platform => {
            if (platform.success) {
                console.log(`   ✅ ${platform.name}: ${platform.new} new, ${platform.updated} updated (Fetched in run: ${platform.total}, Skipped by service: ${platform.skipped || 0}). Duration: ${platform.duration || 'N/A'}`);
            } else {
                console.log(`   ❌ ${platform.name}: Failed or no data. Message: ${platform.message || 'No specific error message.'}`);
            }
        });

        if (results.errors.length > 0) {
            console.log('\n❌ Errors Encountered During Sync:');
            results.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
        }

        console.log('\n🔍 Next Steps:');
        console.log('   • Check your database for the imported problems');
        console.log('   • Test your frontend problem list with pagination');
        console.log('   • Consider setting up a cron job to run this script periodically');

        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error during problem population script:', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => {
    console.log('\n🛑 Process interrupted. Cleaning up...');
    mongoose.connection.close(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});

console.log('🏁 Starting problem population script...');
populateAllProblems();