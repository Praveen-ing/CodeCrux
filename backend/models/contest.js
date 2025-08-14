// backend/models/contest.js

const mongoose = require('mongoose'); // Use CommonJS require

const contestSchema = new mongoose.Schema({
    clistId: { // ID from Clist.by, used for syncing and preventing duplicates
        type: Number,
        // unique and sparse index is defined below, not here
    },
    title: {
        type: String,
        required: [true, 'Contest title is required.'], // Added custom error message
        trim: true,
    },
    platform: { // e.g., "Codeforces", "AtCoder" - standardized from Clist.by or manual input
        type: String,
        required: [true, 'Contest platform is required.'],
        trim: true,
    },
    platformIcon: { // URL to the platform's icon, primarily from Clist.by
        type: String,
        trim: true,
    },
    startTime: {
        type: Date,
        required: [true, 'Contest start time is required.'],
    },
    endTime: {
        type: Date,
        required: [true, 'Contest end time is required.'],
    },
    durationSeconds: { // Duration in seconds, can be calculated or from API
        type: Number,
    },
    url: { // Direct link to the contest page
        type: String,
        required: [true, 'Contest URL is required.'],
        trim: true,
    },
    description: { // Optional description
        type: String,
        trim: true,
    },
    apiSource: { // To track if it was fetched from 'clist.by' or added 'manual'
        type: String,
        enum: ['clist.by', 'manual', 'other_api'], // Allowed sources
        default: 'manual',
    },
    lastFetchedFromApiAt: { // Timestamp of when it was last synced from an API
        type: Date,
    },
    // You can add more fields as needed, e.g.:
    // isRated: Boolean,
    // type: String, // e.g., 'ICPC', ' individuale'
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt Mongoose timestamps
});

// Index for faster querying by start time, crucial for fetching upcoming contests
contestSchema.index({ startTime: 1 });
// Index for querying by platform
contestSchema.index({ platform: 1 });
// Index for clistId if you frequently query or update by it
if (contestSchema.paths.clistId) { // Check if clistId path exists to avoid error if removed
    contestSchema.index({ clistId: 1 }, { unique: true, sparse: true }); // Re-ensure unique & sparse if needed
}


// Pre-save hook to calculate durationSeconds if not provided and startTime/endTime exist
contestSchema.pre('save', function(next) {
    if (this.startTime && this.endTime && (this.isModified('startTime') || this.isModified('endTime'))) {
        if (this.durationSeconds === undefined || this.durationSeconds === null) {
             this.durationSeconds = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
        }
    }
    next();
});


// Create the Mongoose model from the schema
const Contest = mongoose.model('Contest', contestSchema);

// Export the model using CommonJS
module.exports = Contest;