const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
      // Check for unique username if it's being changed
      if (req.body.username && req.body.username !== user.username) {
          const existingUser = await User.findOne({ username: req.body.username });
          if (existingUser && existingUser._id.toString() !== user._id.toString()) {
              res.status(400);
              throw new Error('Username already taken');
          }
          user.username = req.body.username;
      }
      // Check for unique email if it's being changed
      if (req.body.email && req.body.email.toLowerCase() !== user.email) {
          const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
          if (existingUser && existingUser._id.toString() !== user._id.toString()) {
              res.status(400);
              throw new Error('Email already in use');
          }
          user.email = req.body.email.toLowerCase();
      }

      if (req.body.password) {
          if (req.body.password.length < 6) {
              res.status(400);
              throw new Error('New password must be at least 6 characters long');
          }
          user.password = req.body.password; // Pre-save hook will hash
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        token: generateToken(updatedUser._id), // Re-issue token as user details might have changed
        currentStreak: user.currentStreak || 0, // <--- ***** ADD THIS LINE *****

      });
    } else {
      res.status(404);
      throw new Error('User not found for update');
    }
  });

  export { registerUser, loginUser, getUserProfile, updateUserProfile };
