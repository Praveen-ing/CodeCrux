// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
// Ensure this path is correct and getUserProfile, loginUser, registerUser are exported
import { getUserProfile as fetchUserProfileAPI, loginUser as loginAPI, registerUser as registerAPI } from '../api/apiService.js';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true); // Start true to handle initial check
  const [error, setError] = useState(null);

  useEffect(() => {
    const attemptAutoLogin = async () => {
      console.log("[AuthContext] Attempting auto-login...");
      const storedUserInfo = localStorage.getItem('userInfo'); // Correctly declared
      if (storedUserInfo) {
        let parsedInfo;
        try {
          parsedInfo = JSON.parse(storedUserInfo);
          // Temporarily set user info to allow API call with token (interceptor reads from localStorage)
          // setUserInfo(parsedInfo); // This immediate setUserInfo can be removed if interceptor solely relies on localStorage
                                   // and freshUserInfo is set after API call. However, it's not strictly harmful.

          console.log("[AuthContext] attemptAutoLogin: Calling fetchUserProfileAPI...");
          const response = await fetchUserProfileAPI(); // This now calls /auth/me
          
          // Preserve token from initial storage if backend profile doesn't send it
          const freshUserInfo = { ...response.data, token: parsedInfo.token || response.data.token }; 
          
          console.log("[AuthContext] attemptAutoLogin: Fetched fresh user info:", freshUserInfo);
          setUserInfo(freshUserInfo);
          localStorage.setItem('userInfo', JSON.stringify(freshUserInfo));
        } catch (err) {
          console.error("[AuthContext] attemptAutoLogin: Session validation or parsing failed.", err.message || err);
          localStorage.removeItem('userInfo');
          setUserInfo(null); // Clear user info on failure
          setError("Session expired or invalid. Please log in again."); // Set a user-friendly error
        }
      } else {
        console.log("[AuthContext] attemptAutoLogin: No stored user info found in localStorage.");
      }
      setLoading(false);
    };

    attemptAutoLogin();
  }, []); // Empty dependency array ensures this runs once on mount

  const refreshUserProfile = async () => {
    console.log("[AuthContext] Attempting to refresh user profile...");
    const storedUserInfoFromStorage = localStorage.getItem('userInfo'); // Renamed to avoid confusion with state `userInfo`
    let currentToken = null;

    if (storedUserInfoFromStorage) {
      try {
        currentToken = JSON.parse(storedUserInfoFromStorage).token;
      } catch (e) {
        console.error("[AuthContext] refreshUserProfile: Error parsing stored token from localStorage", e);
      }
    }

    // Fallback to token from current state if not in localStorage (e.g., if localStorage was cleared but state not yet updated)
    if (!currentToken && userInfo && userInfo.token) {
        console.log("[AuthContext] refreshUserProfile: Using token from current userInfo state as fallback.");
        currentToken = userInfo.token;
    }

    if (!currentToken) {
      console.warn("[AuthContext] refreshUserProfile: No token available (checked localStorage and current state).");
      // setError("Unable to refresh profile: Not authenticated."); // Optionally set an error
      return; // Cannot refresh without a token
    }

    try {
      // setLoading(true); // Optional: manage loading state during refresh
      console.log("[AuthContext] refreshUserProfile: Calling fetchUserProfileAPI (backend /auth/me)...");
      const response = await fetchUserProfileAPI(); 
      console.log("[AuthContext] refreshUserProfile: Data received from fetchUserProfileAPI (/auth/me):", response.data);

      // Ensure token is preserved. Prioritize new token from response, then existing context token, then currentToken from storage.
      const freshUserInfo = {
        ...response.data,
        token: response.data.token || currentToken // Use currentToken as it's the one validated for this call
      };
      console.log("[AuthContext] refreshUserProfile: Preparing to set new userInfo:", freshUserInfo);

      setUserInfo(freshUserInfo);
      localStorage.setItem('userInfo', JSON.stringify(freshUserInfo));
      console.log("[AuthContext] refreshUserProfile: User profile refreshed. New streak should be:", freshUserInfo.currentStreak);
      setError(null); // Clear previous auth errors on successful refresh
    } catch (err) {
      console.error("[AuthContext] refreshUserProfile: Failed.", err.response?.data?.message || err.message, err);
      setError(err.response?.data?.message || "Failed to refresh profile. Please try logging in again.");
      // Potentially logout user if refresh fails due to critical auth issues (e.g., token definitively invalid)
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log("[AuthContext] refreshUserProfile: Auth error during refresh, logging out.");
        logout(); // Call logout if token is rejected
      }
    } finally {
      // setLoading(false); // Reset loading state if you used it
    }
  };

  const login = async (credentials) => {
    console.log("[AuthContext] Attempting login...");
    try {
      setError(null);
      const { data } = await loginAPI(credentials);
      console.log("[AuthContext] Login successful, user data received:", data);
      setUserInfo(data); 
      localStorage.setItem('userInfo', JSON.stringify(data));
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      console.error("[AuthContext] Login error:", errorMessage, err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (userData) => {
    console.log("[AuthContext] Attempting registration...");
    try {
      setError(null);
      const { data } = await registerAPI(userData);
      console.log("[AuthContext] Registration successful, user data received:", data);
      // Assuming backend returns user object + token upon successful registration and auto-logins:
      setUserInfo(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      console.error("[AuthContext] Registration error:", errorMessage, err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    console.log("[AuthContext] User logging out.");
    setUserInfo(null);
    localStorage.removeItem('userInfo');
    setError(null); // Clear any errors on logout
    // Navigation should be handled by components observing userInfo
  };
  
  // Function to manually set error from other parts of the app if needed
  const setGlobalAuthError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <AuthContext.Provider value={{ 
        userInfo, 
        loading, 
        error, 
        login, 
        register, 
        logout, 
        setError: setGlobalAuthError, 
        refreshUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
