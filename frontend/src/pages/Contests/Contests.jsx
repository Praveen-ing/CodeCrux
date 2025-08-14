// frontend/src/pages/Contests/ContestsPage.jsx

import React, { useEffect, useState, useMemo } from 'react';
import { fetchContestsAPI, addContestToFavoritesAPI, removeContestFromFavoritesAPI, fetchFavoriteContestsAPI } from '../../api/apiService';
import ContestCard from '../../components/ContestCard/ContestCard';
import { CalendarDays, AlertTriangle, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import './Contests.css';

const ContestsPage = () => {
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [favoriteContestIdentifiers, setFavoriteContestIdentifiers] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const { userInfo } = useAuth();

    useEffect(() => {
        const loadContests = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetchContestsAPI({ limit: 100 });
                setContests(response.data.contests || []);
            } catch (err) {
                console.error('Error fetching contests:', err);
                setError(err.response?.data?.message || 'Failed to fetch contests. Please try again.');
                setContests([]);
            } finally {
                setLoading(false);
            }
        };
        loadContests();
    }, []);

    useEffect(() => {
        const loadFavoriteContests = async () => {
            if (!userInfo) return;
            try {
                const response = await fetchFavoriteContestsAPI();
                // FIX: The backend uses 'identifier' to store favorites
                const identifiers = new Set(response.data.map(fav => fav.identifier));
                setFavoriteContestIdentifiers(identifiers);
            } catch (err) {
                console.error("Failed to load favorite contests:", err);
            }
        };

        if (userInfo) {
            loadFavoriteContests();
        } else {
            setFavoriteContestIdentifiers(new Set());
        }
    }, [userInfo]);

    const handleFavoriteToggle = async (contest) => {
        if (!userInfo) {
            alert("Please log in to manage favorites.");
            return;
        }
        
        // Use clistId if it exists, otherwise use the MongoDB _id
        const identifier = contest.clistId || contest._id;
        
        if (!identifier) {
            console.error("Contest has no identifiable ID for favoriting:", contest);
            alert("Cannot favorite this contest: missing unique identifier.");
            return;
        }

        try {
            if (favoriteContestIdentifiers.has(identifier)) {
                // The DELETE request correctly uses the identifier in the URL
                await removeContestFromFavoritesAPI(identifier);
                setFavoriteContestIdentifiers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(identifier);
                    return newSet;
                });
            } else {
                // FIX: Construct the exact payload the backend controller expects
                await addContestToFavoritesAPI({
                    identifier: identifier,
                    title: contest.title,
                    platform: contest.platform,
                    startTime: contest.startTime,
                    url: contest.url,
                    apiSource: contest.apiSource || 'clist.by' // Ensure apiSource is sent
                });
                setFavoriteContestIdentifiers(prev => new Set(prev).add(identifier));
            }
        } catch (err) {
            console.error("Error toggling favorite contest:", err);
            // The alert now shows the actual error message from the backend if available
            alert(err.response?.data?.message || "Something went wrong!");
        }
    };

    const filteredContests = useMemo(() => {
        if (!searchTerm) return contests;
        return contests.filter(c =>
            c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.platform.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contests, searchTerm]);

    const pageVariants = {
        initial: { opacity: 0, y: 20 },
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -20 },
    };

    const listVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
    };

    return (
        <motion.div
            className="contests-page-main container"
            variants={pageVariants}
            initial="initial"
            animate="in"
            exit="out"
            transition={{ duration: 0.4 }}
        >
            <div className="page-header">
                <h1 className="page-title"><CalendarDays size={32} /> Upcoming Contests</h1>
                <div className="search-container">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Filter by name or platform..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading && <div className="loading-state"><Loader2 size={48} className="spinner-icon" /><p>Loading contests...</p></div>}
            {error && !loading && <div className="error-message"><AlertTriangle size={32} /> {error}</div>}
            {!loading && !error && filteredContests.length === 0 && (
                <div className="no-contests">
                    {searchTerm ? `No contests found matching "${searchTerm}".` : "No upcoming contests found. Check back soon!"}
                </div>
            )}
            {!loading && !error && filteredContests.length > 0 && (
                <motion.div className="contests-list-layout" variants={listVariants} initial="hidden" animate="visible">
                    {filteredContests.map((contest) => (
                        <ContestCard
                            key={contest.clistId || contest._id}
                            contest={contest}
                            onFavoriteToggle={userInfo ? handleFavoriteToggle : null}
                            isFavorite={favoriteContestIdentifiers.has(contest.clistId || contest._id)}
                        />
                    ))}
                </motion.div>
            )}
        </motion.div>
    );
};

export default ContestsPage;