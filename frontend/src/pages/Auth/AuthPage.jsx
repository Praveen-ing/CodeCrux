// frontend/src/pages/Auth/AuthPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import "./AuthPage.css";

const AuthPage = () => {
  const location = useLocation();
  const [currState, setCurrState] = useState(
    location.pathname === '/register' ? "Sign up" : "Login"
  );
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, error: authError, setError: setAuthError, userInfo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setCurrState(location.pathname === '/register' ? "Sign up" : "Login");
    setAuthError(null);
  }, [location.pathname, setAuthError]);

  useEffect(() => {
    if (userInfo) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [userInfo, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);

    if (currState === "Sign up" && !agreeTerms) {
      setAuthError("You must agree to the terms and conditions.");
      setIsLoading(false);
      return;
    }
    if (currState === "Sign up" && password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      if (currState === "Login") {
        // CORRECTED: Send 'email' key as expected by the backend
        await login({ email: email, password: password });
      } else { // Sign up
        await register({ username, email, password });
      }
      // Successful login/register will update userInfo, triggering useEffect for navigation
    } catch (err) {
      // AuthContext already sets the error, which is then displayed
      console.error(`AuthPage ${currState} Error:`, err.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleState = (newState) => {
    setCurrState(newState);
    setAuthError(null);
    // Optionally reset fields:
    // setEmail("");
    // setPassword("");
    // if (newState === "Sign up") setUsername("");
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        <div className="auth-header">
          <ShieldCheck size={48} className="auth-icon" />
          <h1>{currState === "Sign up" ? "Create Your CP Hub Account" : "Welcome Back to CP Hub"}</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{currState}</h2>

          {authError && (
            <div className="auth-error-message">
              <AlertCircle size={18} /> {authError}
            </div>
          )}

          {currState === "Sign up" && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                placeholder="Choose a username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={currState === "Sign up" ? 6 : undefined}
              disabled={isLoading}
            />
          </div>

          {currState === "Sign up" && (
            <div className="auth-terms">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
                disabled={isLoading}
              />
              <label htmlFor="terms">
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">terms of use</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.
              </label>
            </div>
          )}

          <button type="submit" className="btn auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <Loader2 size={20} className="auth-loading-spinner" />
            ) : currState === "Sign up" ? (
              <><UserPlus size={18}/> Create Account</>
            ) : (
              <><LogIn size={18}/> Login Now</>
            )}
          </button>

          <div className="auth-toggle">
            {currState === "Sign up" ? (
              <p>
                Already have an account?{" "}
                <span onClick={() => !isLoading && toggleState("Login")}>
                  Login here
                </span>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <span onClick={() => !isLoading && toggleState("Sign up")}>
                  Sign up
                </span>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;