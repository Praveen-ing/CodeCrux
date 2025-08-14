import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar"; // Assuming Navbar is still here per your code
import StreakCard from "../../components/StreakCard/StreakCard";
import { fetchDailyChallengeAPI, markDailyChallengeSolvedAPI } from "../../api/apiService";
import { useAuth } from "../../context/AuthContext";
import { Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import "./DailyChallenge.css";
const DailyChallengePage = () => {
  const [dailyInfo, setDailyInfo] = useState({
    challenge: null,
    streak: 0, // Initial value
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userInfo, refreshUserProfile } = useAuth();

  const loadDailyData = async () => {
    if (!userInfo) {
      setError("Please log in to view the daily challenge.");
      setLoading(false);
      setDailyInfo({ challenge: null, streak: 0 }); // Reset on logout
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await fetchDailyChallengeAPI(); // This calls GET /api/daily-challenge
      
      // THE FIX IS HERE:
      setDailyInfo({
        challenge: response.data.challenge,
        streak: response.data.currentStreak !== undefined ? response.data.currentStreak : 0, // Use currentStreak
      });

    } catch (err) {
      console.error("Error fetching daily challenge in loadDailyData:", err);
      setError(err.response?.data?.message || "Failed to load daily challenge.");
      // Optionally reset parts of dailyInfo on error, e.g.,
      // setDailyInfo(prev => ({ ...prev, challenge: null, streak: prev.streak })); // Keep streak if challenge fails to load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyData();
  }, [userInfo]); // Reload if user logs in/out

  const handleSolve = async () => {
    if (!dailyInfo.challenge || dailyInfo.challenge.completed) return;
    setIsSubmitting(true);
    setError(null);
    console.log("[DailyChallengePage] Starting handleSolve for challenge:", dailyInfo.challenge.title);

    try {
      console.log("[DailyChallengePage] Calling markDailyChallengeSolvedAPI...");
      const response = await markDailyChallengeSolvedAPI(); // This calls POST /api/daily-challenge/solve
      console.log("[DailyChallengePage] markDailyChallengeSolvedAPI response:", response.data);

      // This setDailyInfo is likely correct and sets streak to 1 from response.data.currentStreak
      setDailyInfo(prevInfo => ({
        ...prevInfo,
        challenge: response.data.dailyChallenge, // Ensure this key matches API response
        streak: response.data.currentStreak !== undefined ? response.data.currentStreak : 0,
      }));
      
      await refreshUserProfile(); // This triggers the useEffect above, which calls loadDailyData again
    } catch (err) {
      console.error("Error marking challenge as solved:", err);
      setError(err.response?.data?.message || "Failed to mark as solved.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 0.95 },
  };

  return (
    <>
      {/* If Navbar is part of App.jsx layout, remove it from here */}
      {/* <Navbar />  */}
      <motion.div
        className="daily-challenge-page-main"
        variants={pageVariants}
        initial="initial"
        animate="in"
        exit="out"
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <div className="daily-challenge-container">
          <h1 className="page-title">Daily Challenge</h1>
          {loading && (
            <div className="loading-state">
              <Loader2 size={48} className="spinner-icon" />
              <p>Loading your challenge...</p>
            </div>
          )}
          {error && !loading && (
            <div className="error-message">
              <AlertTriangle size={32} /> {error}
            </div>
          )}
          {!loading && !error && userInfo && dailyInfo.challenge && (
            <StreakCard
              streakCount={dailyInfo.streak}
              problem={dailyInfo.challenge}
              onSolve={handleSolve}
              isSolved={dailyInfo.challenge.completed}
              isLoading={isSubmitting}
            />
          )}
          {!loading && !error && !userInfo && (
            <p className="info-message">Please log in to see your daily challenge.</p>
          )}
           {!loading && !error && userInfo && !dailyInfo.challenge && (
            <p className="info-message">No daily challenge available at the moment. Try refreshing or check back later!</p>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default DailyChallengePage;
