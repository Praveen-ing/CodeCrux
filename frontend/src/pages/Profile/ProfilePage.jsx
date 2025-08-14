// src/pages/Profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { updateUserProfile } from '../../api/apiService.js';
import { User, Mail, Edit3, KeyRound, Save, AlertCircle, Loader2, CalendarCheck2, BarChartBig, CheckCircle } from 'lucide-react'; // CheckCircle is already here
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import './ProfilePage.css';

const ProfilePage = () => {
  const { userInfo, refreshUserProfile, loading: authLoading, error: authContextError, setError: setAuthContextError } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // This log is helpful for confirming userInfo structure
  console.log("[ProfilePage] Rendering with userInfo from context:", userInfo); 

  useEffect(() => {
    if (userInfo) {
      setFormData({
        username: userInfo.username || '',
        email: userInfo.email || '',
        password: '', 
        confirmPassword: '',
      });
    }
    if(setAuthContextError) {
        setAuthContextError(null);
    }
  }, [userInfo, setAuthContextError]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    if(setAuthContextError) {
        setAuthContextError(null);
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setLocalError('New password must be at least 6 characters long.');
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {};
      if (formData.username !== userInfo.username) {
        updateData.username = formData.username;
      }
      if (formData.email !== userInfo.email) {
        updateData.email = formData.email;
      }
      if (formData.password) {
        updateData.password = formData.password;
      }

      if (Object.keys(updateData).length === 0) {
        setSuccessMessage("No changes to save.");
        setIsEditing(false);
        setIsUpdating(false);
        return;
      }
      
      // ACTUAL API CALL (ensure this is correctly implemented in your apiService)
      await updateUserProfile(updateData); 
      // Remove the alert if the API call is implemented:
      // alert("Profile update functionality needs actual backend API call. Simulating success for now.");

      await refreshUserProfile(); 
      setSuccessMessage('Profile updated successfully!');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      setIsEditing(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update profile.';
      setLocalError(errorMsg);
      console.error("Profile Update Error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading && !userInfo) {
    return (
      <div className="profile-page-container container loading-state">
        <Loader2 size={48} className="spinner-icon" />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="profile-page-container container error-message">
        <AlertCircle size={32} /> Please log in to view your profile.
      </div>
    );
  }

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      className="profile-page-container container"
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      transition={{ duration: 0.4 }}
    >
      <h1 className="page-title"><User size={32} /> Your Profile</h1>

      {authContextError && !localError && !successMessage && (
          <div className="error-message global-error"><AlertCircle size={18}/> {authContextError}</div>
      )}
      {localError && <div className="error-message"><AlertCircle size={18}/> {localError}</div>}
      {successMessage && <div className="success-message"><CheckCircle size={18}/> {successMessage}</div>}

      <div className="profile-details-card">
        <div className="profile-header">
          <h2>Account Information</h2>
          {!isEditing && (
            <button 
              onClick={() => { 
                setIsEditing(true); 
                setLocalError(''); 
                setSuccessMessage(''); 
                setFormData({
                  username: userInfo.username || '',
                  email: userInfo.email || '',
                  password: '',
                  confirmPassword: '',
                });
              }} 
              className="btn btn-secondary edit-profile-btn"
            >
              <Edit3 size={16} /> Edit Profile
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="profile-info">
            <p><strong><User size={18} /> Username:</strong> {userInfo.username}</p>
            <p><strong><Mail size={18} /> Email:</strong> {userInfo.email}</p>
            <p><strong><CalendarCheck2 size={18} /> Joined:</strong> {userInfo.createdAt ? format(new Date(userInfo.createdAt), 'MMMM dd, yyyy') : 'N/A'}</p>
            <p><strong><BarChartBig size={18} /> Current Streak:</strong> {userInfo.currentStreak || 0} days</p>
            {/* MODIFICATION: Add this line for total problems solved */}
            <p><strong><CheckCircle size={18} /> Problems Solved:</strong> {userInfo.solvedProblemsCount !== undefined ? userInfo.solvedProblemsCount : 'N/A'}</p>
            {/* You can also display favoriteProblemsCount and favoriteContestsCount if available in userInfo */}
            {/* <p><strong><Star size={18} /> Favorite Problems:</strong> {userInfo.favoriteProblemsCount !== undefined ? userInfo.favoriteProblemsCount : 'N/A'}</p> */}
            {/* <p><strong><Trophy size={18} /> Favorite Contests:</strong> {userInfo.favoriteContestsCount !== undefined ? userInfo.favoriteContestsCount : 'N/A'}</p> */}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-edit-form">
            {/* ... rest of your form ... */}
            <div className="form-group">
              <label htmlFor="username"><User size={16} /> Username</label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                disabled={isUpdating}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email"><Mail size={16} /> Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                disabled={isUpdating}
              />
            </div>
            <p className="password-change-info">Leave password fields blank to keep your current password.</p>
            <div className="form-group">
              <label htmlFor="password"><KeyRound size={16} /> New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="Enter new password (min. 6 chars)"
                value={formData.password}
                onChange={handleChange}
                disabled={isUpdating}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword"><KeyRound size={16} /> Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isUpdating}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary save-changes-btn" disabled={isUpdating}>
                {isUpdating ? <Loader2 size={18} className="spinner-icon" /> : <><Save size={16} /> Save Changes</>}
              </button>
              <button 
                type="button" 
                onClick={() => { 
                  setIsEditing(false); 
                  setLocalError(''); 
                  setSuccessMessage(''); 
                  setFormData({
                    username: userInfo.username || '',
                    email: userInfo.email || '',
                    password: '',
                    confirmPassword: '',
                  });
                }} 
                className="btn btn-secondary cancel-edit-btn" 
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
};

export default ProfilePage;