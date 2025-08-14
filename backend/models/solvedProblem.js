// backend/models/solvedProblem.js
const mongoose = require('mongoose');

const solvedProblemSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming your User model is named 'User'
        required: true,
    },
    problemId: { // The unique ID of the problem from the platform (e.g., "1A", "two-sum")
        type: String,
        required: true,
        trim: true,
    },
    platform: { // The platform name (e.g., "Codeforces", "LeetCode")
        type: String,
        required: true,
        trim: true,
    },
    title: { // Optional: Store the title of the problem when it was solved
        type: String,
        trim: true,
    },
    // Reference to the main Problem document (optional, but can be useful for consistency)
    // problemDBRef: {
    //    type: mongoose.Schema.Types.ObjectId,
    //    ref: 'Problem' // Refers to the 'Problem' model from problemList.js
    // },
    solvedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: { createdAt: 'solvedAt', updatedAt: false },
});

solvedProblemSchema.index({ userId: 1, platform: 1, problemId: 1 }, { unique: true });

const SolvedProblem = mongoose.model('SolvedProblem', solvedProblemSchema);

module.exports = SolvedProblem;