// src/components/ProblemCard/ProblemCard.jsx
import React from "react";
import { ExternalLink, Tag, Star, ShieldQuestion, CheckCircle } from "lucide-react"; // Added CheckCircle
import { motion } from "framer-motion";
import "./ProblemCard.css"; // Ensure this path is correct

const ProblemCard = ({ problem, onFavoriteToggle, isFavorite, onMarkSolved, isSolved }) => {
  // **Error Fix: Check if 'problem' prop is defined before destructuring**
  if (!problem) {
    // You can return null, a loading indicator, or an error message placeholder
    // depending on how you want to handle this case.
    // Returning null will simply not render the card if problem data is missing.
    console.warn("ProblemCard rendered with undefined 'problem' prop.");
    return null;
  }

  // Now it's safe to destructure
  const { title, platform, difficulty, tags, url, problemId } = problem;
  // isSolved might also come from the problem object itself if fetched that way,
  // or passed as a separate prop as currently designed.

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <motion.div
      className={`problem-card-item ${isSolved ? 'solved' : ''}`}
      variants={itemVariants}
      whileHover={{ y: -5, boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }} // Enhanced hover
    >
      <div className="problem-card-header">
        {/* You can add platform-specific icons here if you have them */}
        <ShieldQuestion size={24} className="platform-icon-default" />
        <h3 className="problem-title" title={title}>
          {title ? (title.length > 60 ? title.substring(0, 57) + "..." : title) : "Untitled Problem"}
        </h3>
        {onFavoriteToggle && ( // Only show fav button if handler is provided
          <button
            onClick={() => onFavoriteToggle(problem)} // Pass the whole problem object
            className={`favorite-btn ${isFavorite ? "favorited" : ""}`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            title={isFavorite ? "Unfavorite" : "Favorite"}
          >
            <Star size={20} />
          </button>
        )}
      </div>

      <p className="problem-detail">
        <strong>Platform:</strong> {platform || "N/A"}
      </p>
      <p className="problem-detail">
        <strong>Difficulty:</strong>
        <span className={`difficulty-badge difficulty-${(difficulty || 'unknown').toString().toLowerCase().replace(/\s+/g, '-')}`}>
          {difficulty || "N/A"}
        </span>
      </p>

      {tags && tags.length > 0 && (
        <div className="problem-tags">
          <strong>Tags:</strong>
          {tags.slice(0, 3).map((tag, index) => ( // Show max 3-4 tags for brevity
            <span key={`${problemId}-tag-${index}`} className="tag">
              <Tag size={14} /> {tag}
            </span>
          ))}
          {tags.length > 3 && <span className="tag more-tags">...</span>}
        </div>
      )}

      <div className="problem-card-actions">
        {onMarkSolved && !isSolved && ( // Show "Mark Solved" only if handler exists and not solved
            <button onClick={() => onMarkSolved(problem)} className="btn btn-success mark-solved-btn">
                <CheckCircle size={16} /> Mark Solved
            </button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary solve-now-btn">
          <ExternalLink size={16} /> Solve Now
        </a>
      </div>
      {isSolved && <div className="solved-indicator"><CheckCircle size={14}/> Solved</div>}
    </motion.div>
  );
};

export default ProblemCard;
