// backend/models/problemList.js
const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  problemId: {
    type: String,
    required: [true, 'Problem ID is required.'],
    trim: true,
  },
  platform: {
    type: String,
    required: [true, 'Platform is required.'],
    trim: true,
    enum: {
      values: ['Codeforces', 'LeetCode', 'AtCoder', 'GeeksforGeeks', 'HackerRank', 'CodeChef', 'TopCoder', 'SPOJ', 'UVa', 'HackerEarth', 'Other'],
      message: '{VALUE} is not a supported platform.'
    },
  },
  title: {
    type: String,
    required: [true, 'Problem title is required.'],
    trim: true,
  },
  url: {
    type: String,
    required: [true, 'Problem URL is required.'],
    trim: true,
  },
  difficulty: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
  indexes: [{ fields: { problemId: 1, platform: 1 }, unique: true, name: 'problem_platform_idx' }]
});

const Problem = mongoose.model('Problem', problemSchema);

module.exports = Problem;