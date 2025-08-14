// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar/Navbar.jsx';
import AuthPage from './pages/Auth/AuthPage.jsx'; // Assuming path is pages/Auth/AuthPage.jsx
import DashboardPage from './pages/Dashboard/Dashboard.jsx';
import ProblemListPage from './pages/ProblemList/ProblemList.jsx';
import DailyChallengePage from './pages/DailyChallenge/DailyChallenge.jsx';
import FavoritesPage from './pages/Favorites/Favorites.jsx';
import ContestsPage from './pages/Contests/Contests.jsx';
import ProfilePage from './pages/Profile/ProfilePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import './App.css';

const AppContent = () => {
  const location = useLocation();
  const noNavRoutes = ['/', '/login', '/register'];
  const showNavbar = !noNavRoutes.includes(location.pathname);

  return (
    <div className="app-wrapper">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? "main-content-area" : "main-content-full-page"}>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />

          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/problems" element={<ProblemListPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/daily-challenge" element={<ProtectedRoute><DailyChallengePage /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="*" element={
            <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px', color: 'white' }}>
              <h1>404 - Page Not Found</h1>
              <p>Sorry, the page you are looking for does not exist.</p>
              <Link to="/dashboard" style={{ color: '#1abc9c', textDecoration: 'underline' }}>Go to Dashboard</Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;