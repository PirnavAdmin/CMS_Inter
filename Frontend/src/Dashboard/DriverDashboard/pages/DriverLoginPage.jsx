import React, { useState } from "react";
import { Lock, Mail, Bus, ShieldCheck, AlertCircle, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import pirnavLogo from "@/assets/pirnav-colleges-logo.png";

export default function DriverLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("Driver@CMS.com");
  const [password, setPassword] = useState("Driver@123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (cleanEmail === "Driver@CMS.com" && cleanPassword === "Driver@123") {
      const sessionData = {
        email: cleanEmail,
        role: "Driver",
        name: "Ramesh Kumar",
        employeeId: "EMP001",
        busNumber: "PC-101",
        loginTime: new Date().toISOString(),
      };
      sessionStorage.setItem("pjc-driver-session", JSON.stringify(sessionData));
      if (rememberMe) {
        localStorage.setItem("pjc-driver-remember", "true");
      }
      if (onLoginSuccess) {
        onLoginSuccess(sessionData);
      }
    } else {
      setErrorMessage("Invalid driver credentials. Please check your email and password.");
    }
  };

  const fillDemoCredentials = () => {
    setEmail("Driver@CMS.com");
    setPassword("Driver@123");
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
            Sign in to access your transport dashboard.
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
                <span>Email Address</span>
              </label>
              <div className="dp-input-icon-wrap">
                <Mail size={16} className="dp-field-icon" />
                <input
                  id="driver-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. Driver@CMS.com"
                  className="dp-input-field"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="dp-form-field">
              <div className="dp-field-label-row">
                <label htmlFor="driver-password">
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  className="dp-forgot-link"
                  onClick={() => alert("Please contact the Transport Department Office to reset your password.")}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="dp-input-icon-wrap">
                <Lock size={16} className="dp-field-icon" />
                <input
                  id="driver-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="dp-input-field"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="dp-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="dp-form-options">
              <label className="dp-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              className="dp-btn dp-btn-primary dp-btn-lg dp-btn-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <KeyRound size={17} />
                  <span>Login to Driver Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Box */}
          <div className="dp-demo-creds-box">
            <div className="dp-demo-creds-head">
              <div className="dp-flex-row gap-1">
                <Sparkles size={14} className="dp-text-primary" />
                <strong>Driver Demo Credentials</strong>
              </div>
              <button
                type="button"
                className="dp-demo-autofill-btn"
                onClick={fillDemoCredentials}
              >
                Auto-fill
              </button>
            </div>
            <div className="dp-demo-creds-grid">
              <div className="dp-demo-row">
                <small>Email:</small>
                <code>Driver@CMS.com</code>
              </div>
              <div className="dp-demo-row">
                <small>Password:</small>
                <code>Driver@123</code>
              </div>
            </div>
            <p className="dp-demo-note">
              <ShieldCheck size={12} /> These demo credentials allow full testing of the Driver transport module.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="dp-login-footer">
          <p>© {new Date().getFullYear()} Pirnav College Transport Management System</p>
        </div>
      </div>
    </div>
  );
}

