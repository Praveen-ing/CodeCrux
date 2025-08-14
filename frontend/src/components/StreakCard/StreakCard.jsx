import React from "react";
import { Flame, ExternalLink, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import "./StreakCard.css";

const StreakCard = ({ streakCount, problem, onSolve, isSolved, isLoading }) => {
    console.log("[StreakCard] Rendering. Props received - streakCount:", streakCount, "isSolved:", isSolved, "isLoading:", isLoading, "problem:", problem);

  return (
    <motion.div
      className={`streak-card-main ${isSolved ? 'solved-challenge' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="streak-header">
        <Flame size={36} className={`streak-flame ${streakCount > 0 ? 'active' : ''}`} />
        <div className="streak-count-display">
          <span className="count">{streakCount}</span>
          <span className="days-label">Day Streak</span>
        </div>
      </div>

      {problem && problem.title && problem.platform !== 'General' && (
        <div className="challenge-details">
          <h4>Today's Challenge:</h4>
          <p className="problem-title-streak">{problem.title}</p>
          <p className="problem-platform-streak">
            <strong>Platform:</strong> {problem.platform}
            {problem.difficulty && (
              <span className={`difficulty-badge difficulty-${(problem.difficulty).toLowerCase()}`}>
                {problem.difficulty}
              </span>
            )}
          </p>
          <a href={problem.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary problem-link-streak">
            <ExternalLink size={16} /> View Problem
          </a>
        </div>
      )}
       {problem && problem.platform === 'General' && (
         <div className="challenge-details general-challenge">
            <p>{problem.title}</p>
         </div>
       )}


      {!isSolved && problem && problem.platform !== 'General' && (
        <button onClick={onSolve} className="btn btn-success solve-button-streak" disabled={isLoading}>
          {isLoading ? "Submitting..." : <><CheckCircle size={18} /> Mark as Solved</>}
        </button>
      )}
      {isSolved && problem && (
         <p className="solved-message-streak"><CheckCircle size={20} /> Nicely done! See you tomorrow.</p>
      )}
      {!problem && !isLoading && (
        <p className="no-challenge-streak">No challenge assigned yet. Try refreshing!</p>
      )}
      {isLoading && !problem && (
        <p className="loading-challenge-streak">Fetching challenge...</p>
      )}
    </motion.div>
  );
};

export default StreakCard;

