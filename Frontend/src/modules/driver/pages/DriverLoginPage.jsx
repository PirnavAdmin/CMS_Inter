import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Bus, ShieldCheck, AlertCircle, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import pirnavLogo from "@/assets/pirnav-colleges-logo.png";
import { loginUser } from "@/modules/auth/authService.js";
import { saveAuthSession, clearAuthSession } from "@/modules/auth/authStorage.js";

export default function DriverLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("penetirajesh123@gmail.com");
  const [password, setPassword] = useState("Password@123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      clearAuthSession();
      const result = await loginUser({ emailOrMobile: cleanEmail, password: cleanPassword });
      if (!result?.token) {
        throw new Error("Authentication succeeded but no access token was returned.");
      }

      saveAuthSession({ token: result.token, user: result.user, role: result.user.role }, rememberMe);

      if (onLoginSuccess) {
        onLoginSuccess(result);
      } else {
        navigate("/driver", { replace: true });
      }
    } catch (err) {
      console.error("Driver login error:", err);
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Invalid credentials. Please verify your email and password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("penetirajesh123@gmail.com");
    setPassword("Password@123");
    setErrorMessage("");
  };

  return (
    <div className="dp-login-page">
      <div className="dp-login-backdrop-shapes">
        <div className="dp-shape dp-shape-1" />
        <div className="dp-shape dp-shape-2" />
        <div className="dp-shape dp-shape-3" />
      </div>

      <div className="dp-login-container">
        {/* Header branding */}
        <div className="dp-login-branding">
          <img src={pirnavLogo} alt="Pirnav College Logo" className="dp-login-logo" />
          <div className="dp-login-tag-group">
            <span className="dp-login-badge">
              <Bus size={14} /> Transport Portal
            </span>
            <span className="dp-login-subbadge">Pirnav College</span>
          </div>
          <h1 className="dp-login-title">Driver Portal</h1>
          <p className="dp-login-subtitle">
            Sign in with your transport staff credentials to access your dashboard.
          </p>
        </div>

        {/* Card */}
        <div className="dp-login-card">
          {errorMessage && (
            <div className="dp-alert dp-alert-danger" role="alert">
              <AlertCircle size={16} className="dp-alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="dp-login-form">
            <div className="dp-form-field">
              <label htmlFor="driver-email">
                <span>Email Address / Mobile</span>
              </label>
              <div className="dp-input-icon-wrap">
                <Mail size={16} className="dp-field-icon" />
                <input
                  id="driver-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. penetirajesh123@gmail.com"
                  className="dp-input-field"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="dp-form-field">
              <div className="dp-form-field-header">
                <label htmlFor="driver-password">Password</label>
              </div>
              <div className="dp-input-icon-wrap">
                <Lock size={16} className="dp-field-icon" />
                <input
                  id="driver-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="dp-input-field"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="dp-input-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="dp-form-row">
              <label className="dp-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this terminal</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="dp-btn dp-btn-primary dp-btn-block dp-btn-submit"
            >
              {isLoading ? (
                <span>Authenticating terminal...</span>
              ) : (
                <>
                  <KeyRound size={16} /> Sign In to Transport Portal
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill button */}
          <div className="dp-demo-pill-wrap">
            <button
              type="button"
              className="dp-demo-pill"
              onClick={fillDemoCredentials}
            >
              <Sparkles size={13} /> Fill Demo Driver Credentials
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="dp-login-footer">
          <ShieldCheck size={14} />
          <span>Pirnav College Unified Campus Access • Transport Security Protocol</span>
        </div>
      </div>
    </div>
  );
}
