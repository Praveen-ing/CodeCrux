// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // Adjust path to your AuthContext
import { Loader2 } from 'lucide-react'; // Or your preferred loading spinner icon

const ProtectedRoute = ({ children }) => {
  const { userInfo, loading: authLoading } = useAuth(); // Get user info and loading state from AuthContext
  const location = useLocation(); // Get the current location

  // 1. Handle Authentication Loading State:
  // If the authentication status is still being determined (e.g., checking localStorage, validating token),
  // display a loading indicator to prevent premature redirects or rendering.
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 100px)', // Adjust height as needed (e.g., viewport height minus navbar)
        color: '#a0a0b0' // Match your theme's text color
      }}>
        <Loader2 size={48} style={{ animation: 'spin 1.5s linear infinite', color: '#4e8cff' }} />
        <p style={{ marginTop: '1rem' }}>Loading authentication...</p>
        {/* Ensure @keyframes spin is defined in your global CSS:
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        */}
      </div>
    );
  }

  // 2. Handle Unauthenticated User:
  // If authentication is done loading AND there is no userInfo (meaning user is not logged in),
  // redirect the user to the login page.
  if (!userInfo) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to in `state.from`. This allows you to redirect them back to the
    // intended page after they successfully log in.
    return <Navigate to="/login" state={{ from: location }} replace />;
    // `replace` prop ensures that the login page replaces the current entry in the history stack,
    // so the user doesn't go back to the protected route by pressing the back button after being redirected.
  }

  // 3. Handle Authenticated User:
  // If authentication is done loading AND userInfo exists (meaning user is logged in),
  // render the child components that this ProtectedRoute is wrapping.
  return children;
};

export default ProtectedRoute;
