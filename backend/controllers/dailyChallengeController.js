// backend/controllers/dailyChallengeController.js
const asyncHandler = require('express-async-handler'); // Assuming you use this for error handling
const User = require('../models/user.js'); // Adjust path if needed
const Problem = require('../models/problemList.js'); // <-- IMPORT YOUR PROBLEM MODEL
const getTodayMidnightUTC = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};
// --- Placeholder for your actual problem fetching utility ---
// This is highly dependent on the APIs of the platforms you want to use.
// Helper to get today's date at midnight UTC for consistent daily checks

const fetchProblemsFromPlatform = async (platform, criteria) => {
  console.log(`Fetching problems from LOCAL DB for ${platform} with criteria:`, criteria);

  const query = { platform: platform };

  if (criteria.difficulty) {
    query.difficulty = criteria.difficulty; // Ensure 'difficulty' field exists and matches in your Problem model
  }
  if (criteria.tags) { // criteria.tags in your controller is a single randomTag
    query.tags = { $in: [criteria.tags] };
  }

  try {
    // Fetch a sample of problems matching the criteria
    // You might want to add more sophisticated querying or random sampling here
    // For instance, if you have many problems, fetching all and then slicing might be inefficient.
    // Consider using aggregation for random sampling if your dataset is large:
    // Problem.aggregate([ { $match: query }, { $sample: { size: criteria.limit || 20 } } ]);
    const problems = await Problem.find(query)
      .limit(criteria.limit || 30) // Fetch a candidate pool
      .lean(); // Use .lean() for faster, plain JS objects

    if (!problems || problems.length === 0) {
      console.log(`No problems found in DB for ${platform} matching criteria:`, query);
      return [];
    }

    console.log(`Found ${problems.length} problem(s) in DB for ${platform} matching criteria.`);
    // Ensure the returned object structure matches what the rest of the controller expects
    // (problemId, title, platform, url, difficulty, tags)
    return problems.map(p => ({
        problemId: p.problemId,
        title: p.title,         // This will be the ACTUAL title from your DB
        platform: p.platform,
        url: p.url,
        difficulty: String(p.difficulty || 'N/A'), // Ensure difficulty is a string
        tags: p.tags || []
    }));
  } catch (error) {
    console.error(`Error fetching problems from DB for ${platform}:`, error);
    return [];
  }
};
// --- End of MODIFIED fetchProblemsFromPlatform ---
const getDailyChallenge = asyncHandler(async (req, res) => {
  let user;
  try {
    user = await User.findById(req.user.id).populate('solvedProblems');
  } catch (err) {
    console.error('ERROR: Failed to fetch user:', err);
    res.status(500);
    return res.json({ message: 'Failed to fetch user', error: err.message });
  }
  console.log('DEBUG: User ID:', req.user.id);
  console.log('DEBUG: User solvedProblems:', user.solvedProblems ? user.solvedProblems.length : 0);
  if (!user) {
    console.error('ERROR: User not found for ID:', req.user.id);
    res.status(404);
    return res.json({ message: 'User not found' });
  }

  const todayUTC = getTodayMidnightUTC();
  console.log('DEBUG: Today UTC:', todayUTC);

  if (
    user.dailyChallenge &&
    user.dailyChallenge.suggestedAt &&
    new Date(user.dailyChallenge.suggestedAt).setUTCHours(0, 0, 0, 0) === todayUTC.getTime()
  ) {
    console.log('DEBUG: Challenge already assigned for today:', user.dailyChallenge);
    return res.json({
      message: user.dailyChallenge.completed
        ? "Today's challenge already completed!"
        : "Today's challenge already suggested.",
      challenge: user.dailyChallenge,
      currentStreak: user.currentStreak || 0,
    });
  }

  const platformsToTry = ['Codeforces']; // Ensure this matches 'platform' field in your Problem model
  let suggestedProblem = null;
  const preferredDifficulty = ['800', '900', '1000', '1100', '1200', '1300', '1400', '1500']; // Example
  const problemTags = ['implementation', 'math', 'greedy', 'constructive algorithms', 'strings', 'data structures', 'sortings', 'binary search', 'dp', 'graphs', 'trees']; // Example

  // Create a set of solved problem identifiers for quick lookup
  const solvedProblemKeys = new Set(
    (user.solvedProblems || []).map(sp => `${sp.platform.toLowerCase()}-${sp.problemId}`)
  );
  console.log('DEBUG: Solved problem keys:', Array.from(solvedProblemKeys));

  // Try to find a new problem
  try {
    outerLoop: for (const platform of platformsToTry) {
      for (const diff of preferredDifficulty) { // Iterate through difficulties
        const randomTag = problemTags[Math.floor(Math.random() * problemTags.length)];
        console.log(`DEBUG: Trying platform=${platform}, difficulty=${diff}, tag=${randomTag}`);
        const problemsFromDB = await fetchProblemsFromPlatform(platform, {
          difficulty: diff,
          tags: randomTag,
          limit: 20,
        });
        console.log('DEBUG: Problems fetched:', problemsFromDB.length);

        if (problemsFromDB && problemsFromDB.length > 0) {
          const unsolvedProblems = problemsFromDB.filter(p =>
            !solvedProblemKeys.has(`${p.platform.toLowerCase()}-${p.problemId}`) &&
            !(user.dailyChallenge && user.dailyChallenge.problemId === p.problemId &&
              user.dailyChallenge.platform.toLowerCase() === p.platform.toLowerCase() && !user.dailyChallenge.completed)
          );
          console.log('DEBUG: Unsolved problems found:', unsolvedProblems.length);

          if (unsolvedProblems.length > 0) {
            suggestedProblem = unsolvedProblems[Math.floor(Math.random() * unsolvedProblems.length)];
            console.log('DEBUG: Suggested problem:', suggestedProblem);
            break outerLoop;
          }
        }
      }
    }
  } catch (err) {
    console.error('ERROR: Problem selection failed:', err);
    res.status(500);
    return res.json({ message: 'Problem selection failed', error: err.message });
  }

  if (!suggestedProblem) {
    suggestedProblem = { // Fallback, as you have
      problemId: `fallback-${todayUTC.toISOString().slice(0, 10)}-${Math.random().toString(36).substring(2, 7)}`,
      title: 'Solve any practice problem from your favorite platform today!',
      platform: 'General',
      difficulty: 'Varies',
      url: '#',
      tags: [],
    };
  }

  user.dailyChallenge = {
    problemId: suggestedProblem.problemId,
    platform: suggestedProblem.platform,
    title: suggestedProblem.title, // This will now be the actual title
    url: suggestedProblem.url,
    difficulty: suggestedProblem.difficulty,
    tags: suggestedProblem.tags || [],
    suggestedAt: new Date(),
    completed: false,
    completedAt: null,
  };

  // Streak reset logic:
  // If lastProblemSolvedDate is set and is before yesterday (UTC), reset streak.
  // This check ensures that if a user misses a day, their streak resets when they next request a challenge.
  if (user.lastProblemSolvedDate) {
    const lastSolvedDayUTC = new Date(user.lastProblemSolvedDate);
    lastSolvedDayUTC.setUTCHours(0, 0, 0, 0);

    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);

    if (lastSolvedDayUTC.getTime() < yesterdayUTC.getTime()) {
      user.currentStreak = 0; // Reset streak if a day (or more) was missed
    }
  } else if (user.currentStreak > 0) {
    // This case handles if a streak exists but lastProblemSolvedDate is somehow null (should be rare).
    user.currentStreak = 0;
  }
  // Note: Streak is incremented only when a daily challenge is SOLVED.

  await user.save();

  res.status(201).json({ // 201 because a new daily challenge resource is effectively assigned/created for the user
    message: 'New daily challenge assigned!',
    challenge: user.dailyChallenge,
    currentStreak: user.currentStreak || 0,
  });
});

// @desc    Mark daily challenge as solved and update streak
// @route   POST /api/daily-challenge/solve
// @access  Private
const solveDailyChallenge = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const todayUTC = getTodayMidnightUTC();

  if (!user.dailyChallenge || !user.dailyChallenge.problemId) {
    res.status(400);
    throw new Error('No daily challenge assigned to solve.');
  }

  // Ensure the challenge being marked as solved is indeed today's challenge
  if (
    !user.dailyChallenge.suggestedAt ||
    new Date(user.dailyChallenge.suggestedAt).setUTCHours(0, 0, 0, 0) !== todayUTC.getTime()
  ) {
    res.status(400);
    throw new Error(
      "This daily challenge is not for today. Please get or refresh today's challenge first."
    );
  }

  if (user.dailyChallenge.completed) {
    return res.status(400).json({ message: "Today's challenge has already been marked as completed."});
  }

  // Mark the daily challenge as completed
  user.dailyChallenge.completed = true;
  const completionTime = new Date(); // Capture exact completion time
  user.dailyChallenge.completedAt = completionTime;

  // Add to user's general solvedProblems list if it's a specific problem and not already there
  if (user.dailyChallenge.platform !== 'General') {
    const alreadySolvedGeneral = user.solvedProblems.some(sp =>
        sp.problemId === user.dailyChallenge.problemId &&
        sp.platform.toLowerCase() === user.dailyChallenge.platform.toLowerCase()
    );
    if (!alreadySolvedGeneral) {
      user.solvedProblems.push({
        problemId: user.dailyChallenge.problemId,
        platform: user.dailyChallenge.platform,
        title: user.dailyChallenge.title,
        // You might want to store url and difficulty in solvedProblems too
        // url: user.dailyChallenge.url,
        // difficulty: user.dailyChallenge.difficulty,
        solvedAt: completionTime,
      });
    }
  }

  // Streak Update Logic
  if (user.lastProblemSolvedDate) {
    const lastSolvedDayUTC = new Date(user.lastProblemSolvedDate);
    lastSolvedDayUTC.setUTCHours(0, 0, 0, 0); // Normalize to start of the day UTC

    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1); // Start of yesterday UTC

    if (lastSolvedDayUTC.getTime() === todayUTC.getTime()) {
      // Already solved a problem today (could be another problem, or this daily challenge marked earlier if logic allowed re-marking).
      // Streak is maintained. No increment here as it's based on distinct days of solving the daily.
    } else if (lastSolvedDayUTC.getTime() === yesterdayUTC.getTime()) {
      user.currentStreak = (user.currentStreak || 0) + 1; // Solved daily challenge on consecutive days
    } else {
      // Missed one or more days between last solve and today's daily solve
      user.currentStreak = 1; // New streak starts at 1
    }
  } else {
    // No previous solve date recorded (or streak was 0), this is the first daily problem solved for streak purposes
    user.currentStreak = 1;
  }
  // Update the lastProblemSolvedDate to today (specifically, the completion time of this challenge)
  // This date is crucial for the next day's streak calculation.
  user.lastProblemSolvedDate = completionTime;

  await user.save();

  res.json({
    message: 'Daily challenge successfully marked as solved! Streak updated.',
    currentStreak: user.currentStreak,
    dailyChallenge: user.dailyChallenge, // Send back the updated challenge object
  });
});

module.exports = {
  getDailyChallenge,
  solveDailyChallenge,
};
