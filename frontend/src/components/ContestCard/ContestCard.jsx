// frontend/src/components/ContestCard/ContestCard.jsx

import React from "react";
import { format } from "date-fns";
import { ExternalLink, CalendarPlus, Star, Clock, Info, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import "./ContestCard.css";

const formatDateTimeForGoogleCalendar = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().replace(/-|:|\.\d{3}/g, '');
};

const ContestCard = ({ contest, onFavoriteToggle, isFavorite }) => {

    let { title, platform, platformIcon, startTime, endTime, durationSeconds, url } = contest;

    // Map platform to icon if not provided
    if (!platformIcon) {
        const platformIconMap = {
            'AtCoder': '/icons/atcoder.svg',
            'CodeChef': '/icons/codechef.svg',
            // Add more mappings as needed
        };
        platformIcon = platformIconMap[platform] || null;
    }

    const handleAddToCalendar = () => {
        const gCalStartTime = formatDateTimeForGoogleCalendar(startTime);
        const gCalEndTime = formatDateTimeForGoogleCalendar(endTime);
        const details = `Platform: ${platform}\nLink: ${url}`;
        const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${gCalStartTime}/${gCalEndTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(platform)}`;
        window.open(googleCalendarUrl, '_blank');
    };

    const formattedStartTime = startTime ? format(new Date(startTime), "d MMM yyyy, h:mm a") : "N/A";

    let durationDisplay = "N/A";
    if (durationSeconds) {
        const h = Math.floor(durationSeconds / 3600);
        const m = Math.floor((durationSeconds % 3600) / 60);
        durationDisplay = `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim();
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring" } },
    };

    return (
        <motion.div className="contest-card" variants={itemVariants}>
            <div className="platform-info">
                {platformIcon ? (
                    <img src={platformIcon} alt={platform} className="platform-icon" />
                ) : (
                    <ShieldAlert size={32} className="platform-icon-default" />
                )}
                <span className="platform-name">{platform || 'Unknown'}</span>
            </div>

            <div className="contest-details">
                <h3 className="contest-title">{title}</h3>
                <div className="contest-meta">
                    <span className="meta-item">
                        <CalendarPlus size={14} />
                        {formattedStartTime}
                    </span>
                    <span className="meta-item">
                        <Clock size={14} />
                        {durationDisplay}
                    </span>
                    <a href={url || '#'} target="_blank" rel="noopener noreferrer" className={`meta-item link ${!url ? 'disabled' : ''}`}>
                        <Info size={14} />
                        Contest Details
                    </a>
                </div>
            </div>

            <div className="contest-actions">
                <button onClick={handleAddToCalendar} className="action-btn calendar-btn" aria-label="Add to Google Calendar">
                    <CalendarPlus size={20} />
                </button>
                {onFavoriteToggle && (
                    <button
                        onClick={() => onFavoriteToggle(contest)}
                        className={`action-btn favorite-btn ${isFavorite ? "favorited" : ""}`}
                        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        <Star size={20} />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default ContestCard;