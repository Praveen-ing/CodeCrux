// backend/utils/apiFetcher.js
const axios = require('axios');

const CLIST_BASE_URL = 'https://clist.by/api/v4';

const clistApiHeaders = {
    'Authorization': `ApiKey ${process.env.CLIST_USERNAME}:${process.env.CLIST_API_KEY}`
};

const cleanPlatformName = (rawName) => {
    if (!rawName) return null;
    const nameMap = {
        'codeforces.com': 'Codeforces',
        'atcoder.jp': 'AtCoder',
        'codechef.com': 'CodeChef',
        'leetcode.com': 'LeetCode',
        'geeksforgeeks.org': 'GeeksForGeeks',
        'hackerrank.com': 'HackerRank',
        'hackerearth.com': 'HackerEarth',
    };
    return nameMap[rawName.toLowerCase()] || rawName;
};

// FIX: Updated this function with correct icon URLs
const getPlatformIcon = (platformName, resourceIcon) => {
    // Priority 1: Use the icon directly from the API if it exists
    if (resourceIcon) return resourceIcon;

    // Priority 2: Use our manually curated list of high-quality icons
    const iconMap = {
        'Codeforces': 'https://codeforces.org/favicon.ico',
        'AtCoder': 'https://assets.atcoder.jp/images/favicon.ico', // More stable URL
        'CodeChef': 'https://cdn.codechef.com/images/cc-logo.svg', // New SVG logo
        'LeetCode': 'https://leetcode.com/favicon.ico',
        'GeeksForGeeks': 'https://media.geeksforgeeks.org/wp-content/cdn-uploads/gfg_favicon.png',
    };
    return iconMap[platformName] || null;
};

const fetchUpcomingContestsFromClist = async (filters = {}) => {
    try {
        const defaultParams = {
            end__gt: new Date().toISOString(),
            order_by: 'start',
            limit: 100,
            format: 'json',
        };
        const params = { ...defaultParams, ...filters };

        const response = await axios.get(`${CLIST_BASE_URL}/contest/`, { headers: clistApiHeaders, params });

        if (response.data && response.data.objects) {
            return response.data.objects.map(contest => {
                const mappedPlatform = contest.resource ? cleanPlatformName(contest.resource) : 'Unknown Platform';

                return {
                    id: contest.id,
                    clistId: contest.id, // Explicitly add clistId for frontend use
                    title: contest.event,
                    url: contest.href,
                    platform: mappedPlatform,
                    platformIcon: getPlatformIcon(mappedPlatform, contest.icon),
                    startTime: contest.start,
                    endTime: contest.end,
                    durationSeconds: contest.duration,
                    apiSource: 'clist.by', // Add apiSource to every contest object
                    description: null,
                };
            });
        }
        return [];
    } catch (error) {
        console.error('[apiFetcher] Error fetching from Clist.by:', error.message);
        return [];
    }
};

module.exports = {
    fetchUpcomingContestsFromClist
};