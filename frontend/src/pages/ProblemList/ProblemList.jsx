// frontend/src/pages/ProblemList/ProblemList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
    fetchProblemsAPI,
    markProblemSolvedAPI,
    addProblemToFavoritesAPI,
    removeProblemFromFavoritesAPI
} from '../../api/apiService';
import { useAuth } from '../../context/AuthContext';
import './ProblemList.css';
import {
    Filter, Search, ListChecks, CheckCircle, ExternalLink,
    ChevronDown, ChevronUp, Star, StarOff, Loader2, Info, AlertTriangle,
    ChevronLeft, ChevronRight, MoreHorizontal
} from 'lucide-react';

const PROBLEMS_PER_PAGE = 20; // Fixed 20 problems per page

const ProblemListPage = () => {
    const [problems, setProblems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userInfo } = useAuth();

    // Filter states
    const [searchTermInput, setSearchTermInput] = useState(searchParams.get('search') || '');
    const [difficultyInput, setDifficultyInput] = useState(searchParams.get('difficulty') || '');
    const [platformInput, setPlatformInput] = useState(searchParams.get('platform') || '');
    const [tagsInput, setTagsInput] = useState(searchParams.get('tags')?.split(',').filter(Boolean) || []);
    const initialStatus = userInfo && !searchParams.get('status') ? '' : (searchParams.get('status') || ''); // Changed default to show all
    const [statusInput, setStatusInput] = useState(initialStatus);
    const [showFilters, setShowFilters] = useState(true);

    // Pagination states
    const [totalProblems, setTotalProblems] = useState(0);
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [totalPages, setTotalPages] = useState(0);

    const availableDifficulties = ['All', 'Easy', 'Medium', 'Hard', '800', '900', '1000', '1100', '1200', '1300', '1400', '1500', '1600', '1700', '1800', '1900', '2000', '2100', '2200', '2300', '2400', '2500', '2600+'];
    const availablePlatforms = ['All', 'Codeforces', 'LeetCode', 'AtCoder', 'GeeksforGeeks', 'HackerRank', 'CodeChef', 'HackerEarth', 'SPOJ', 'TopCoder'];
    const availableTags = ['arrays', 'strings', 'dp', 'graphs', 'trees', 'math', 'greedy', 'sorting', 'searching', 'two pointers', 'implementation', 'constructive algorithms', 'binary search', 'bit manipulation', 'number theory', 'geometry', 'combinatorics', 'data structures', 'brute force', 'dfs and similar'];

    const fetchProblems = useCallback(async (filtersForAPI) => {
        setIsLoading(true);
        setError(null);
        console.log("Fetching problems with filters:", filtersForAPI);
        try {
            const response = await fetchProblemsAPI(filtersForAPI);
            console.log("API Response:", response.data);
            setProblems(response.data.data || []);
            setTotalProblems(response.data.totalProblems || 0);
            setCurrentPage(response.data.currentPage || 1);
            setTotalPages(response.data.totalPages || 0);
        } catch (err) {
            console.error("Error fetching problems:", err);
            setError(err.response?.data?.message || 'Failed to fetch problems. Please try again.');
            setProblems([]);
            setTotalProblems(0);
            setTotalPages(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log("searchParams changed:", searchParams.toString());
        const currentPageFromParams = parseInt(searchParams.get('page') || '1');
        const currentSearchTerm = searchParams.get('search') || '';
        const currentDifficulty = searchParams.get('difficulty') || '';
        const currentPlatform = searchParams.get('platform') || '';
        const currentTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
        const currentStatus = searchParams.get('status') || '';

        // Update local input states
        setSearchTermInput(currentSearchTerm);
        setDifficultyInput(currentDifficulty);
        setPlatformInput(currentPlatform);
        setTagsInput(currentTags);
        setStatusInput(currentStatus);
        setCurrentPage(currentPageFromParams);

        const paramsForAPI = { page: currentPageFromParams, limit: PROBLEMS_PER_PAGE };
        if (currentSearchTerm) paramsForAPI.search = currentSearchTerm;
        if (currentDifficulty && currentDifficulty !== 'All') paramsForAPI.difficulty = currentDifficulty;
        if (currentPlatform && currentPlatform !== 'All') paramsForAPI.platform = currentPlatform;
        if (currentTags.length > 0) paramsForAPI.tags = currentTags.join(',');
        if (currentStatus) paramsForAPI.status = currentStatus;

        fetchProblems(paramsForAPI);
    }, [searchParams, fetchProblems, userInfo]);

    const handleApplyFilters = () => {
        const newParams = { page: '1' }; // Reset to page 1 when filters change
        if (searchTermInput) newParams.search = searchTermInput;
        if (difficultyInput && difficultyInput !== 'All') newParams.difficulty = difficultyInput;
        if (platformInput && platformInput !== 'All') newParams.platform = platformInput;
        if (tagsInput.length > 0) newParams.tags = tagsInput.join(',');
        if (statusInput) newParams.status = statusInput;
        setSearchParams(newParams, { replace: true });
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('page', String(newPage));
            setSearchParams(newParams);
            // Scroll to top when page changes
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleTagInputChange = (tag) => {
        setTagsInput(prevTags =>
            prevTags.includes(tag) ? prevTags.filter(t => t !== tag) : [...prevTags, tag]
        );
    };

    const handleMarkAsSolved = async (problemId, problemPlatform) => {
        if (!userInfo) {
            navigate('/login', { state: { from: location } });
            return;
        }
        try {
            const problemToMark = problems.find(p => p.problemId === problemId && p.platform === problemPlatform);
            await markProblemSolvedAPI({ problemId, platform: problemPlatform, title: problemToMark?.title });
            
            // Optimistically update UI
            setProblems(prev => prev.map(p =>
                (p.problemId === problemId && p.platform === problemPlatform) ? { ...p, isSolvedByCurrentUser: true } : p
            ));
            
            // If status is 'unsolved', refetch to remove it from list
            if (statusInput === 'unsolved') {
                const currentFilters = Object.fromEntries(searchParams.entries());
                fetchProblems({ ...currentFilters, page: currentPage, limit: PROBLEMS_PER_PAGE });
            }
        } catch (err) {
            console.error("Error marking problem as solved:", err);
            alert(err.response?.data?.message || "Could not mark as solved.");
        }
    };

    const handleToggleFavorite = async (problem) => {
        if (!userInfo) {
            navigate('/login', { state: { from: location } });
            return;
        }
        const problemDetails = {
            problemId: problem.problemId,
            platform: problem.platform,
            title: problem.title,
            url: problem.url,
            difficulty: problem.difficulty
        };

        try {
            if (problem.isFavoritedByCurrentUser) {
                await removeProblemFromFavoritesAPI(problem.platform, problem.problemId);
                setProblems(prev => prev.map(p =>
                    (p.problemId === problem.problemId && p.platform === problem.platform) ? { ...p, isFavoritedByCurrentUser: false } : p
                ));
            } else {
                await addProblemToFavoritesAPI(problemDetails);
                setProblems(prev => prev.map(p =>
                    (p.problemId === problem.problemId && p.platform === problem.platform) ? { ...p, isFavoritedByCurrentUser: true } : p
                ));
            }
        } catch (err) {
            console.error("Error toggling favorite:", err);
            alert(err.response?.data?.message || "Could not update favorite status.");
        }
    };

    // Pagination helper function
    const getPageNumbers = () => {
        const delta = 2; // Number of pages to show on each side of current page
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    const clearAllFilters = () => {
        setSearchTermInput('');
        setDifficultyInput('');
        setPlatformInput('');
        setTagsInput([]);
        setStatusInput('');
        setSearchParams({ page: '1' }, { replace: true });
    };

    const getStatusText = () => {
        if (statusInput === 'solved') return 'Solved Problems';
        if (statusInput === 'unsolved') return 'Unsolved Problems';
        return 'All Problems';
    };

    const getDifficultyColor = (difficulty) => {
        const difficultyLower = difficulty?.toLowerCase();
        if (difficultyLower === 'easy') return 'difficulty-easy';
        if (difficultyLower === 'medium') return 'difficulty-medium';
        if (difficultyLower === 'hard') return 'difficulty-hard';
        
        // Handle Codeforces rating-based difficulties
        const rating = parseInt(difficulty);
        if (!isNaN(rating)) {
            if (rating <= 1200) return 'difficulty-easy';
            if (rating <= 1600) return 'difficulty-medium';
            return 'difficulty-hard';
        }
        
        return 'difficulty-unknown';
    };

    console.log("Rendering ProblemList:", { isLoading, error, problemsCount: problems.length, totalProblems, currentPage, totalPages });

    return (
        <div className="problem-list-page">
            <header className="problem-list-header">
                <h1>
                    {getStatusText()}
                    {totalProblems > 0 && (
                        <span className="problem-count-info">
                            - Page {currentPage} of {totalPages} ({totalProblems} total problems)
                        </span>
                    )}
                </h1>
                <div className="header-actions">
                    <button className="clear-filters-btn" onClick={clearAllFilters}>
                        Clear All Filters
                    </button>
                    <button className="toggle-filters-btn" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={20} />
                        {showFilters ? 'Hide' : 'Show'} Filters
                        {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </header>

            {showFilters && (
                <div className="filters-container">
                    <div className="filter-row">
                        <div className="filter-group search-filter">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search problems by name or ID..."
                                value={searchTermInput}
                                onChange={(e) => setSearchTermInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
                            />
                        </div>
                        <div className="filter-group">
                            <label htmlFor="difficulty">Difficulty:</label>
                            <select id="difficulty" value={difficultyInput} onChange={(e) => setDifficultyInput(e.target.value)}>
                                {availableDifficulties.map(d => <option key={d} value={d === 'All' ? '' : d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="platform">Platform:</label>
                            <select id="platform" value={platformInput} onChange={(e) => setPlatformInput(e.target.value)}>
                                {availablePlatforms.map(p => <option key={p} value={p === 'All' ? '' : p}>{p}</option>)}
                            </select>
                        </div>
                        {userInfo && (
                            <div className="filter-group">
                                <label htmlFor="status">Status:</label>
                                <select id="status" value={statusInput} onChange={(e) => setStatusInput(e.target.value)}>
                                    <option value="">All</option>
                                    <option value="solved">Solved</option>
                                    <option value="unsolved">Unsolved</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="filter-group tags-filter">
                        <label>Tags:</label>
                        <div className="tags-options">
                            {availableTags.map(tag => (
                                <button
                                    key={tag}
                                    className={`tag-btn ${tagsInput.includes(tag) ? 'active' : ''}`}
                                    onClick={() => handleTagInputChange(tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="filter-actions">
                        <button className="apply-filters-btn" onClick={handleApplyFilters}>
                            Apply Filters
                        </button>
                        <button className="clear-filters-btn secondary" onClick={clearAllFilters}>
                            Clear All
                        </button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="loading-problems">
                    <Loader2 size={32} className="spinner-icon" />
                    Loading problems...
                </div>
            )}

            {error && (
                <div className="error-problems">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {!isLoading && !error && problems.length === 0 && (
                <div className="no-problems-found">
                    <Info size={24} />
                    <h3>No problems found</h3>
                    {totalProblems === 0 ? (
                        <p>No problems match your current filters.</p>
                    ) : (
                        <p>Try adjusting your filters or go to a different page.</p>
                    )}
                    <button onClick={clearAllFilters} className="clear-filters-btn">
                        Clear All Filters
                    </button>
                </div>
            )}

            {!isLoading && !error && problems.length > 0 && (
                <>
                    {/* Improved Pagination Controls - Top */}
                    {totalPages > 1 && (
                        <div className="pagination-controls top">
                            <div className="pagination-info">
                                Showing {((currentPage - 1) * PROBLEMS_PER_PAGE) + 1} - {Math.min(currentPage * PROBLEMS_PER_PAGE, totalProblems)} of {totalProblems} problems
                            </div>
                            <div className="pagination-buttons">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="pagination-btn"
                                >
                                    <ChevronLeft size={18} /> Previous
                                </button>

                                {getPageNumbers().map((pageNum, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                                        disabled={pageNum === '...'}
                                        className={`pagination-btn ${pageNum === currentPage ? 'active' : ''} ${pageNum === '...' ? 'dots' : ''}`}
                                    >
                                        {pageNum === '...' ? <MoreHorizontal size={16} /> : pageNum}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="pagination-btn"
                                >
                                    Next <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="problems-list-view">
                        <div className="problem-list-row header-row">
                            <div className="problem-list-status-col">Status</div>
                            <div className="problem-list-title-col">Title</div>
                            <div className="problem-list-platform-col">Platform</div>
                            <div className="problem-list-difficulty-col">Difficulty</div>
                            <div className="problem-list-tags-col">Tags</div>
                            <div className="problem-list-actions-col">Actions</div>
                        </div>
                        {problems.map((problem) => (
                            <div key={`${problem.platform}-${problem.problemId}`} className={`problem-list-row ${problem.isSolvedByCurrentUser ? 'solved' : ''}`}>
                                <div className="problem-list-status-col">
                                    {problem.isSolvedByCurrentUser ? (
                                        <CheckCircle size={20} className="solved-icon" title="Solved" />
                                    ) : (
                                        <div className="unsolved-icon" title="Unsolved"></div>
                                    )}
                                </div>
                                <div className="problem-list-title-col">
                                    <a
                                        href={problem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="problem-title-link"
                                    >
                                        {problem.title}
                                        <ExternalLink size={14} className="external-link-icon" />
                                    </a>
                                    <div className="problem-id">{problem.problemId}</div>
                                </div>
                                <div className="problem-list-platform-col">
                                    <span className={`platform-badge platform-${problem.platform?.toLowerCase()}`}>
                                        {problem.platform}
                                    </span>
                                </div>
                                <div className="problem-list-difficulty-col">
                                    <span className={`difficulty-badge ${getDifficultyColor(problem.difficulty)}`}>
                                        {problem.difficulty}
                                    </span>
                                </div>
                                <div className="problem-list-tags-col">
                                    <div className="tags-container">
                                        {problem.tags?.slice(0, 3).map((tag, index) => (
                                            <span key={index} className="tag-badge">
                                                {tag}
                                            </span>
                                        ))}
                                        {problem.tags?.length > 3 && (
                                            <span className="tag-badge more-tags">
                                                +{problem.tags.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="problem-list-actions-col">
                                    {userInfo && (
                                        <div className="problem-actions">
                                            {!problem.isSolvedByCurrentUser && (
                                                <button
                                                    onClick={() => handleMarkAsSolved(problem.problemId, problem.platform)}
                                                    className="action-btn solve-btn"
                                                    title="Mark as solved"
                                                >
                                                    <ListChecks size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleToggleFavorite(problem)}
                                                className={`action-btn favorite-btn ${problem.isFavoritedByCurrentUser ? 'favorited' : ''}`}
                                                title={problem.isFavoritedByCurrentUser ? "Remove from favorites" : "Add to favorites"}
                                            >
                                                {problem.isFavoritedByCurrentUser ? (
                                                    <Star size={16} className="star-filled" />
                                                ) : (
                                                    <StarOff size={16} />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Improved Pagination Controls - Bottom */}
                    {totalPages > 1 && (
                        <div className="pagination-controls bottom">
                            <div className="pagination-info">
                                Showing {((currentPage - 1) * PROBLEMS_PER_PAGE) + 1} - {Math.min(currentPage * PROBLEMS_PER_PAGE, totalProblems)} of {totalProblems} problems
                            </div>
                            <div className="pagination-buttons">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="pagination-btn"
                                >
                                    <ChevronLeft size={18} /> Previous
                                </button>

                                {getPageNumbers().map((pageNum, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                                        disabled={pageNum === '...'}
                                        className={`pagination-btn ${pageNum === currentPage ? 'active' : ''} ${pageNum === '...' ? 'dots' : ''}`}
                                    >
                                        {pageNum === '...' ? <MoreHorizontal size={16} /> : pageNum}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="pagination-btn"
                                >
                                    Next <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProblemListPage;