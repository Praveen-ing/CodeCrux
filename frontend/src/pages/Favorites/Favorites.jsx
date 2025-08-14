// frontend/src/pages/Favorites/Favorites.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate }
from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  fetchFavoriteProblemsAPI, // CORRECTED
  removeProblemFromFavoritesAPI, // CORRECTED
  fetchFavoriteContestsAPI, // CORRECTED
  removeContestFromFavoritesAPI // CORRECTED
} from '../../api/apiService'; // Adjust path if needed
import { Star, Trash2, ExternalLink, CalendarDays, AlertTriangle, Loader2 } from 'lucide-react';
import './Favorites.css'; // Ensure this CSS file exists and is styled

const FavoritesPage = () => {
  const { userInfo, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [favoriteProblems, setFavoriteProblems] = useState([]);
  const [favoriteContests, setFavoriteContests] = useState([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(true);
  const [isLoadingContests, setIsLoadingContests] = useState(true);
  const [errorProblems, setErrorProblems] = useState(null);
  const [errorContests, setErrorContests] = useState(null);

  const fetchFavProblems = useCallback(async () => {
    if (!userInfo) {
      setIsLoadingProblems(false);
      setFavoriteProblems([]);
      return;
    }
    setIsLoadingProblems(true);
    setErrorProblems(null);
    try {
      const response = await fetchFavoriteProblemsAPI(); // CORRECTED
      setFavoriteProblems(response.data || []);
    } catch (err) {
      console.error("Error fetching favorite problems:", err);
      setErrorProblems(err.response?.data?.message || 'Failed to fetch favorite problems.');
      setFavoriteProblems([]);
    } finally {
      setIsLoadingProblems(false);
    }
  }, [userInfo]);

  const fetchFavContests = useCallback(async () => {
    if (!userInfo) {
      setIsLoadingContests(false);
      setFavoriteContests([]);
      return;
    }
    setIsLoadingContests(true);
    setErrorContests(null);
    try {
      const response = await fetchFavoriteContestsAPI(); // CORRECTED
      setFavoriteContests(response.data || []);
    } catch (err) {
      console.error("Error fetching favorite contests:", err);
      setErrorContests(err.response?.data?.message || 'Failed to fetch favorite contests.');
      setFavoriteContests([]);
    } finally {
      setIsLoadingContests(false);
    }
  }, [userInfo]);

  useEffect(() => {
    if (!authLoading) { // Only fetch if auth state is resolved
      fetchFavProblems();
      fetchFavContests();
    }
  }, [authLoading, userInfo, fetchFavProblems, fetchFavContests]);


  const handleRemoveProblem = async (platform, problemId) => {
    if (!window.confirm("Are you sure you want to remove this problem from favorites?")) return;
    try {
      await removeProblemFromFavoritesAPI(platform, problemId); // CORRECTED
      setFavoriteProblems(prev => prev.filter(p => !(p.platform === platform && p.problemId === problemId)));
    } catch (err) {
      console.error("Error removing favorite problem:", err);
      alert(err.response?.data?.message || "Could not remove problem from favorites.");
    }
  };

  const handleRemoveContest = async (identifier) => {
    if (!window.confirm("Are you sure you want to remove this contest from favorites?")) return;
    try {
      await removeContestFromFavoritesAPI(identifier); // CORRECTED
      setFavoriteContests(prev => prev.filter(c => c.identifier !== identifier));
    } catch (err) {
      console.error("Error removing favorite contest:", err);
      alert(err.response?.data?.message || "Could not remove contest from favorites.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateString; // Fallback to original string if date is invalid
    }
  };


  if (authLoading) {
    return (
      <div className="favorites-page-loading">
        <Loader2 size={48} className="spinner-icon" />
        <p>Loading your favorites...</p>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="favorites-page-login-prompt">
        <h1>My Favorites</h1>
        <p>Please log in to view and manage your favorites.</p>
        <button onClick={() => navigate('/login')} className="login-button-fav">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="favorites-header">
        <Star size={32} />
        <h1>My Favorites</h1>
      </div>

      {/* Favorite Problems Section */}
      <section className="favorites-section">
        <h2>Favorite Problems</h2>
        {isLoadingProblems && (
            <div className="loading-state-section"><Loader2 size={28} className="spinner-icon" /> Loading favorite problems...</div>
        )}
        {errorProblems && !isLoadingProblems && (
            <div className="error-message-section"><AlertTriangle size={24} /> {errorProblems}</div>
        )}
        {!isLoadingProblems && !errorProblems && favoriteProblems.length === 0 && (
          <p className="no-favorites-message">No favorite problems added yet. Find problems you like and star them!</p>
        )}
        {!isLoadingProblems && !errorProblems && favoriteProblems.length > 0 && (
          <div className="favorites-grid">
            {favoriteProblems.map((problem) => (
              <div className="favorite-card problem-card-fav" key={`${problem.platform}-${problem.problemId}`}>
                <div className="fav-card-header">
                  <h3 className="fav-title">{problem.title}</h3>
                  <span className={`platform-badge platform-${problem.platform?.toLowerCase()}`}>{problem.platform}</span>
                </div>
                <div className="fav-meta">
                  {problem.difficulty && <span>Difficulty: <span className={`difficulty-badge difficulty-${problem.difficulty?.toLowerCase().replace('+', 'plus')}`}>{problem.difficulty}</span></span>}
                </div>
                {/* {problem.tags && problem.tags.length > 0 && (
                  <div className="fav-tags">
                    {problem.tags.map((tag, i) => (
                      <span className="tag" key={i}>{tag}</span>
                    ))}
                  </div>
                )} */}
                <div className="fav-actions">
                  {problem.url && problem.url !== '#' && (
                    <a href={problem.url} target="_blank" rel="noopener noreferrer" className="action-btn view-btn">
                      <ExternalLink size={16} /> View
                    </a>
                  )}
                  <button onClick={() => handleRemoveProblem(problem.platform, problem.problemId)} className="action-btn remove-btn">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Favorite Contests Section */}
      <section className="favorites-section">
        <h2>Favorite Contests</h2>
        {isLoadingContests && (
            <div className="loading-state-section"><Loader2 size={28} className="spinner-icon" /> Loading favorite contests...</div>
        )}
        {errorContests && !isLoadingContests && (
            <div className="error-message-section"><AlertTriangle size={24} /> {errorContests}</div>
        )}
        {!isLoadingContests && !errorContests && favoriteContests.length === 0 && (
          <p className="no-favorites-message">No favorite contests added yet. Find contests and star them!</p>
        )}
        {!isLoadingContests && !errorContests && favoriteContests.length > 0 && (
          <div className="favorites-grid">
            {favoriteContests.map((contest) => (
              <div className="favorite-card contest-card-fav" key={contest.identifier}>
                 <div className="fav-card-header">
                    <h3 className="fav-title">{contest.title}</h3>
                    <span className={`platform-badge platform-${contest.platform?.toLowerCase()}`}>{contest.platform}</span>
                </div>
                <div className="fav-meta">
                  {contest.startTime && <span><CalendarDays size={14}/> Starts: {formatDate(contest.startTime)}</span>}
                  {/* Add duration if available and needed */}
                </div>
                <div className="fav-actions">
                  {contest.url && contest.url !== '#' && (
                    <a href={contest.url} target="_blank" rel="noopener noreferrer" className="action-btn view-btn">
                      <ExternalLink size={16} /> View
                    </a>
                  )}
                  <button onClick={() => handleRemoveContest(contest.identifier)} className="action-btn remove-btn">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FavoritesPage;
