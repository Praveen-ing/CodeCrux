// src/pages/Dashboard/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Adjust path if needed
import { fetchUserDashboardStatsAPI } from '../../api/apiService.js'; // Adjust path if needed
import './Dashboard.css'; // Make sure this CSS file exists and is styled

// Placeholder icons (consider using a library like lucide-react)
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const QuestionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="17.5" r=".5"></circle></svg>;


const Dashboard = () => {
  const { userInfo, loading: authLoading } = useAuth(); // Assuming AuthContext provides authLoading state
  const navigate = useNavigate();

  const [userStats, setUserStats] = useState({
    problemsSolved: 0,
    favoritesCount: 0,
    currentStreak: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    const loadUserStats = async () => {
      // Only fetch stats if user is authenticated and userInfo is available
      if (userInfo && userInfo.token) {
        setIsLoadingStats(true);
        setStatsError(null);
        try {
          const response = await fetchUserDashboardStatsAPI();
          setUserStats({
            problemsSolved: response.data.problemsSolved || 0,
            favoritesCount: response.data.favoritesCount || 0,
            currentStreak: response.data.currentStreak || 0,
          });
        } catch (error) {
          console.error("Failed to fetch user dashboard stats:", error);
          setStatsError("Could not load your statistics.");
          // Optionally set stats to default or keep previous on error
          setUserStats({ problemsSolved: 0, favoritesCount: 0, currentStreak: 0 });
        } finally {
          setIsLoadingStats(false);
        }
      } else if (!authLoading) { // If auth is not loading and there's no user info
        setIsLoadingStats(false); // Stop loading stats
        setUserStats({ problemsSolved: 0, favoritesCount: 0, currentStreak: 0 }); // Reset stats
      }
    };

    // Don't run if auth is still loading
    if (!authLoading) {
        loadUserStats();
    }

  }, [userInfo, authLoading]); // Re-fetch if userInfo or authLoading state changes

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Show loading spinner while AuthContext is determining auth state
  if (authLoading) {
    return (
        <div className="dashboard-page">
            <div className="dashboard-container" style={{textAlign: 'center', padding: '2rem'}}>
                <p>Loading dashboard...</p> {/* Or a spinner component */}
            </div>
        </div>
    );
  }

  // If not authenticated after auth check, prompt to login
  if (!userInfo) {
    return (
        <div className="dashboard-page">
            <div className="dashboard-container" style={{textAlign: 'center', padding: '2rem'}}>
                <p>Please log in to view your dashboard.</p>
                <button className="action-button primary" style={{marginTop: '1rem'}} onClick={() => navigate('/login')}>Go to Login</button>
            </div>
        </div>
    );
  }

  // Authenticated user view
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <h2 className="dashboard-welcome">
          Welcome back, <span className="dashboard-username">{userInfo.username || 'User'}</span>!
        </h2>

        {statsError && <p className="dashboard-error-message" style={{color: 'red', marginBottom: '1rem'}}>{statsError}</p>}

        <div className="dashboard-stats-grid">
          <div className="stat-box">
            <h3 className="stat-title">Problems Solved</h3>
            <p className="stat-value">{isLoadingStats ? '...' : userStats.problemsSolved}</p>
          </div>
          <div className="stat-box">
            <h3 className="stat-title">Favourites</h3>
            <p className="stat-value">{isLoadingStats ? '...' : userStats.favoritesCount}</p>
          </div>
          <div className="stat-box">
            <h3 className="stat-title">Current Streak</h3>
            <p className="stat-value">{isLoadingStats ? '...' : `${userStats.currentStreak} days`}</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <button
            className="action-button primary"
            onClick={() => handleNavigation('/daily-challenge')}
          >
            <CalendarIcon /> Go to Daily Challenge
          </button>
          <button
            className="action-button secondary"
            onClick={() => handleNavigation('/contests')}
          >
            <ListIcon /> View Contests
          </button>
          <button
            className="action-button tertiary"
            onClick={() => handleNavigation('/problems?filter=unsolved')} // Example for a potential filter
          >
            <QuestionIcon/> Unsolved Problems
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
