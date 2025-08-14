// frontend/src/api/apiService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    // console.log('[apiService Interceptor] Intercepting request to:', config.url); // Keep for debugging if needed
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const { token } = JSON.parse(userInfo);
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        console.error("Error parsing userInfo from localStorage", e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Auth Service ---
export const loginUser = (credentials) => apiClient.post('/auth/login', credentials);
export const registerUser = (userData) => apiClient.post('/auth/register', userData);
export const getUserProfile = () => apiClient.get('/auth/me');

// ADD THIS FUNCTION:
export const updateUserProfile = (profileData) => apiClient.put('/auth/profile', profileData);

// --- Contest Service ---
export const fetchContestsAPI = (params) => apiClient.get('/contests', { params });

// --- Dashboard Service ---
export const fetchUserDashboardStatsAPI = () => apiClient.get('/dashboard/stats');

// --- Daily Challenge Service ---
export const fetchDailyChallengeAPI = () => apiClient.get('/daily-challenge');
export const markDailyChallengeSolvedAPI = () => apiClient.post('/daily-challenge/solve');

// --- Problem Service ---
export const fetchProblemsAPI = (params) => apiClient.get('/problem-list', { params });
export const markProblemSolvedAPI = (problemData) => apiClient.post('/problem-list/solve', problemData);

// --- Favorites Service ---
export const fetchFavoriteProblemsAPI = () => apiClient.get('/favorites/problems');
export const addProblemToFavoritesAPI = (problemData) => apiClient.post('/favorites/problems', problemData);
export const removeProblemFromFavoritesAPI = (platform, problemId) => apiClient.delete(`/favorites/problems/${platform}/${encodeURIComponent(problemId)}`);

export const fetchFavoriteContestsAPI = () => apiClient.get('/favorites/contests');
export const addContestToFavoritesAPI = (contestData) => apiClient.post('/favorites/contests', contestData);
export const removeContestFromFavoritesAPI = (identifier) => apiClient.delete(`/favorites/contests/${identifier}`);

export default apiClient;