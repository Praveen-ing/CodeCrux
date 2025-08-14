// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.js'); // Adjust path if your User model is elsewhere
const asyncHandler = require('express-async-handler'); // Good for handling errors in async middleware

// Middleware to protect routes - requires a valid token
// backend/middleware/authMiddleware.js
const authenticateToken = asyncHandler(async (req, res, next) => {
    let token;
    console.log(`[AuthMiddleware] Path: ${req.method} ${req.path} - authenticateToken executing`); // Log method and path
    // Log the entire authorization header if it exists
    if (req.headers.authorization) {
        console.log('[AuthMiddleware] Received req.headers.authorization:', req.headers.authorization);
    } else {
        console.warn('[AuthMiddleware] req.headers.authorization is MISSING.');
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        console.log('[AuthMiddleware] Authorization header found and starts with Bearer.');
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('[AuthMiddleware] Extracted token (first 10 chars):', token ? token.substring(0,10)+"..." : "EMPTY_TOKEN_STRING_AFTER_BEARER_SPLIT");

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[AuthMiddleware] Token decoded. User ID from token:', decoded.id || decoded._id);

            req.user = await User.findById(decoded.id || decoded._id).select('-password');

            if (!req.user) {
                console.warn('[AuthMiddleware] User not found in DB for decoded token ID.');
                res.status(401);
                throw new Error('Not authorized, user not found for token');
            }
            console.log('[AuthMiddleware] User authenticated and set to req.user:', req.user.username);
            next();
            return; // Exit middleware
        } catch (error) {
            console.error('[AuthMiddleware] Token verification or user lookup failed:', error.message);
            res.status(401);
            // Pass error to Express error handler or ensure response is sent
            throw new Error('Not authorized, token failed or processing error');
        }
    } else {
        // This block is executed if the Authorization header is missing or malformed
        console.warn('[AuthMiddleware] Authorization header MISSING or does NOT start with "Bearer ".');
    }

    // This check is hit if the above 'if' condition was false OR if token extraction somehow failed to assign 'token'
    if (!token) {
        console.error('[AuthMiddleware] Final check: `token` variable is still not set. Throwing "no token provided" error.');
        res.status(401);
        throw new Error('Not authorized, no token provided');
    }
});

// Middleware for optional authentication - proceeds even if no token or invalid token, but sets req.user if valid
const optionalAuth = asyncHandler(async (req, res, next) => {
    let token;
    console.log("Middleware: optionalAuth executing");

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id || decoded._id).select('-password');
            // If req.user is not found, it will be null, which is fine for optional auth
            console.log("OptionalAuth: User set from token:", req.user ? req.user.id : 'null');
        } catch (error) {
            // Token is present but invalid, or other error.
            // For optional auth, we ignore this error and proceed without setting req.user.
            console.log("OptionalAuth: Invalid token or error, proceeding without user. Error:", error.message);
            req.user = null; // Explicitly set to null or undefined
        }
    } else {
        console.log("OptionalAuth: No token provided, proceeding without user.");
        req.user = null; // Ensure req.user is null if no token
    }
    next();
});

// Middleware to check for admin privileges - must be used AFTER authenticateToken
const admin = (req, res, next) => {
    console.log("Middleware: admin executing");
    if (req.user && req.user.isAdmin) { // Assuming your User model has an 'isAdmin' boolean field
        next();
    } else {
        res.status(403); // Forbidden
        throw new Error('Not authorized as an admin');
    }
};

module.exports = {
    authenticateToken, // Changed from 'protect' to match common usage and your route import
    optionalAuth,
    admin
};