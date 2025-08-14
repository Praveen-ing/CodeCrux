import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // Assuming AuthContext is in src/context
import { Home, ListChecks, CalendarDays, Star, UserCircle, LogIn, LogOut, UserPlus, BarChart3, ShieldQuestion } from "lucide-react";
import "./Navbar.css";

const Navbar = () => {
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar-main">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <ListChecks size={28} />
          <span>CP Hub</span>
        </Link>
        <div className="navbar-links">
          <Link to="/contests"><CalendarDays size={18} /> Contests</Link>
          <Link to="/problems"><ShieldQuestion size={18} /> Problems</Link>
          {userInfo && <Link to="/daily-challenge"><CalendarDays size={18} /> Daily</Link>}
          {userInfo && <Link to="/dashboard"><BarChart3 size={18} /> Dashboard</Link>}
          {userInfo && <Link to="/favorites"><Star size={18} /> Favorites</Link>}
        </div>
        <div className="navbar-auth-links">
          {userInfo ? (
            <>
              <Link to="/profile" className="navbar-user-link">
                <UserCircle size={20} /> {userInfo.username}
              </Link>
              <button onClick={handleLogout} className="navbar-button logout">
                <LogOut size={18} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-button login">
                <LogIn size={18} /> Login
              </Link>
              <Link to="/register" className="navbar-button register">
                <UserPlus size={18} /> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
