import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Lock,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import generalSettingsIcon from "@/assets/sidebar-3d/general-settings.svg";
import { useTransportManager } from "../TransportManagerContext.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "../styles/TransportManagerSettings.css";

export default function TransportManagerSettings() {
  const { showToast = () => {}, profile = {} } = useTransportManager();
  const effectiveStaffId = profile.staffId || profile.id || 1125;
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("password"); // "password" | "preferences"

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Live Password Criteria & Strength Feedback
  const newPwd = passwordForm.newPassword || "";
  const pwdCriteria = {
    minLength: newPwd.length >= 6,
    hasUpper: /[A-Z]/.test(newPwd),
    hasNumber: /[0-9]/.test(newPwd),
    hasSpecial: /[^A-Za-z0-9]/.test(newPwd),
  };
  const metCount = Object.values(pwdCriteria).filter(Boolean).length;

  const strengthLabel =
    newPwd.length === 0
      ? ""
      : metCount <= 1
      ? "Weak"
      : metCount <= 3
      ? "Medium"
      : "Strong";

  const strengthColor =
    metCount <= 1 ? "#ef4444" : metCount <= 3 ? "#f59e0b" : "#16a34a";

  const strengthPercent = (metCount / 4) * 100;

  const confirmPwd = passwordForm.confirmPassword || "";
  const isConfirmEntered = confirmPwd.length > 0;
  const isPasswordsMatch = isConfirmEntered && newPwd === confirmPwd;

  // General Preferences State with LocalStorage persistence
  const PREF_STORAGE_KEY = "tm_settings_preferences";
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(PREF_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not read tm_settings_preferences:", e);
    }
    return {
      fitnessAlerts: true,
      unassignedReminders: true,
      routeDispatchAlerts: true,
      autoLogoutTimeout: "30",
    };
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Load Settings from Backend API
  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await apiClient.get(apiEndpoints.faculty.settings);
      const data = res?.data?.data || res?.data;
      if (data?.preferences) {
        setPreferences((prev) => ({
          ...prev,
          emailAlerts: data.preferences.emailAlerts ?? prev.emailAlerts ?? true,
          smsAlerts: data.preferences.smsAlerts ?? prev.smsAlerts ?? false,
          autoLogoutTimeout: String(data.preferences.autoLogoutTimeout || prev.autoLogoutTimeout || "30"),
        }));
      }
    } catch (err) {
      console.warn("Could not load staff settings from server:", err?.message || err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Escape key listener to close modal
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !savingPassword && !savingPreferences) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, savingPassword, savingPreferences]);

  const handleOpenModal = (tab = "password") => {
    setActiveTab(tab);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError("");
    setPasswordSuccess(false);
    setModalOpen(true);
    loadSettings();
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (!pwdCriteria.hasUpper) {
      setPasswordError("New password must contain at least one uppercase letter (A-Z).");
      return;
    }
    if (!pwdCriteria.hasNumber) {
      setPasswordError("New password must contain at least one number (0-9).");
      return;
    }
    if (!pwdCriteria.hasSpecial) {
      setPasswordError("New password must contain at least one special symbol (e.g. !@#$%^&*).");
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError("New password cannot be the same as your current password.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const payload = {
        staffId: effectiveStaffId,
        id: effectiveStaffId,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      };

      try {
        await apiClient.post(apiEndpoints.faculty.changePassword, payload);
      } catch (staffErr) {
        // Fallback to Auth change password endpoint if staff endpoint returns 404 or fails
        try {
          await apiClient.post(apiEndpoints.auth.changePassword, payload);
        } catch (authErr) {
          if (authErr?.response?.status && [400, 401, 403].includes(authErr.response.status)) {
            throw authErr;
          }
          if (staffErr?.response?.status && [400, 401, 403].includes(staffErr.response.status)) {
            throw staffErr;
          }
        }
      }

      try {
        localStorage.setItem("tm_user_password", passwordForm.newPassword);
      } catch (err) {
        console.warn("Could not save password locally:", err);
      }
      setSavingPassword(false);
      setPasswordSuccess(true);
      showToast("Password updated successfully!", "success");
      setTimeout(() => {
        setModalOpen(false);
        setPasswordSuccess(false);
      }, 1200);
    } catch (err) {
      setSavingPassword(false);
      const msg = getApiErrorMessage(err) || "Failed to update password.";
      setPasswordError(msg);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPreferences(true);
    try {
      await apiClient.put(apiEndpoints.faculty.updatePreferences, {
        emailAlerts: !!preferences.emailAlerts,
        smsAlerts: !!preferences.smsAlerts,
        autoLogoutTimeout: String(preferences.autoLogoutTimeout || "30"),
      });
    } catch (err) {
      console.warn("Could not save preferences to server:", err);
    }
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(preferences));
    } catch (err) {
      console.warn("Could not save preferences:", err);
    }
    setSavingPreferences(false);
    showToast("General preferences saved successfully!", "success");
    setModalOpen(false);
  };

  return (
    <div className="tm-settings-container faculty-settings-container">
      {/* Page Header matching Reference 2 */}
      <div className="cms-page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your transport account, profile settings, password, and general preferences.</p>
        </div>
      </div>

      {/* Settings Grid with Single "General Settings" Card matching Reference 2 */}
      <div className="faculty-settings-grid">
        <article className="faculty-settings-card is-featured">
          <div>
            <div className="faculty-settings-card-header">
              <div className="faculty-settings-card-icon">
                <img
                  className="faculty-settings-card-image"
                  src={generalSettingsIcon}
                  alt=""
                  aria-hidden="true"
                />
              </div>
              <h3>General Settings</h3>
            </div>
            <p>
              Manage personal profile details, contact information, update account password, and security preferences.
            </p>
          </div>
          <div className="faculty-settings-card-footer">
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => handleOpenModal("password")}
            >
              Manage General Settings <ArrowRight size={14} />
            </button>
          </div>
        </article>
      </div>

      {/* Interactive Management Modal matching Reference 3 */}
      {modalOpen && (
        <div className="faculty-settings-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="faculty-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-settings-modal-head">
              <h2>
                <ShieldCheck size={20} className="faculty-settings-shield-icon" />
                General Settings Management
              </h2>
              <button
                type="button"
                className="faculty-settings-modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs inside modal matching Reference 3 */}
            <div className="faculty-settings-tabs" role="tablist" aria-label="General settings">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "password"}
                className={`faculty-settings-tab-btn ${activeTab === "password" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("password");
                  setPasswordError("");
                  setPasswordSuccess(false);
                }}
              >
                <Lock size={15} /> Reset / Change Password
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "preferences"}
                className={`faculty-settings-tab-btn ${activeTab === "preferences" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("preferences");
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
              >
                <Bell size={15} /> General Preferences
              </button>
            </div>

            {/* Tab 1: Reset / Change Password matching Reference 3 */}
            {activeTab === "password" && (
              <form onSubmit={handleUpdatePassword}>
                <div className="faculty-settings-modal-body">
                  {passwordError && (
                    <div className="faculty-settings-alert error">
                      <AlertCircle size={16} /> {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="faculty-settings-alert success">
                      <CheckCircle2 size={16} /> Password updated successfully!
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="faculty-settings-field">
                      <label>Current Password</label>
                      <div className="faculty-settings-password-wrap">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Enter current password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                          }
                          required
                          disabled={savingPassword}
                        />
                        <button
                          type="button"
                          className="faculty-settings-password-toggle"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="faculty-settings-field">
                      <label>New Password</label>
                      <div className="faculty-settings-password-wrap">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password (min. 6 characters)"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                          }
                          required
                          disabled={savingPassword}
                        />
                        <button
                          type="button"
                          className="faculty-settings-password-toggle"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {newPwd.length > 0 ? (
                        <div className="faculty-password-strength-box">
                          <div className="faculty-password-strength-label">
                            <span>Password Strength</span>
                            <span style={{ color: strengthColor, fontWeight: 700 }}>
                              {strengthLabel}
                            </span>
                          </div>
                          <div className="faculty-password-strength-bar-bg">
                            <div
                              className="faculty-password-strength-bar-fill"
                              style={{ width: `${strengthPercent}%`, backgroundColor: strengthColor }}
                            />
                          </div>
                          <div className="faculty-password-criteria-list">
                            <span className={`faculty-password-criteria-item ${pwdCriteria.minLength ? "met" : ""}`}>
                              {pwdCriteria.minLength ? "✓" : "○"} Min. 6 chars
                            </span>
                            <span className={`faculty-password-criteria-item ${pwdCriteria.hasUpper ? "met" : ""}`}>
                              {pwdCriteria.hasUpper ? "✓" : "○"} 1 Uppercase (A-Z)
                            </span>
                            <span className={`faculty-password-criteria-item ${pwdCriteria.hasNumber ? "met" : ""}`}>
                              {pwdCriteria.hasNumber ? "✓" : "○"} 1 Number (0-9)
                            </span>
                            <span className={`faculty-password-criteria-item ${pwdCriteria.hasSpecial ? "met" : ""}`}>
                              {pwdCriteria.hasSpecial ? "✓" : "○"} 1 Symbol (!@#$)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="faculty-settings-hint">
                          Include uppercase letters, numbers, and symbols for high strength.
                        </span>
                      )}
                    </div>

                    <div className="faculty-settings-field">
                      <label>Confirm New Password</label>
                      <div className="faculty-settings-password-wrap">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                          }
                          required
                          disabled={savingPassword}
                        />
                        <button
                          type="button"
                          className="faculty-settings-password-toggle"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {isConfirmEntered && (
                        <div style={{ marginTop: 4 }}>
                          {isPasswordsMatch ? (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#16a34a",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              ✓ Passwords match
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#dc2626",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              ✕ Passwords do not match
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="faculty-settings-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setModalOpen(false)}
                    disabled={savingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: General Preferences */}
            {activeTab === "preferences" && (
              <form onSubmit={handleSavePreferences}>
                <div className="faculty-settings-modal-body">
                  <div className="faculty-settings-switch-row">
                    <div className="faculty-settings-switch-info">
                      <h4>Vehicle Fitness &amp; Insurance Alerts</h4>
                      <p>Receive advance warnings for fitness and insurance certificates expiring within 30 days.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.fitnessAlerts}
                      onChange={(e) =>
                        setPreferences({ ...preferences, fitnessAlerts: e.target.checked })
                      }
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                        accentColor: "var(--cms-primary, #6f8400)",
                      }}
                      disabled={savingPreferences}
                    />
                  </div>

                  <div className="faculty-settings-switch-row">
                    <div className="faculty-settings-switch-info">
                      <h4>Unassigned Vehicle &amp; Driver Reminders</h4>
                      <p>Highlight active buses and routes operating without an assigned driver or attendant.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.unassignedReminders}
                      onChange={(e) =>
                        setPreferences({ ...preferences, unassignedReminders: e.target.checked })
                      }
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                        accentColor: "var(--cms-primary, #6f8400)",
                      }}
                      disabled={savingPreferences}
                    />
                  </div>

                  <div className="faculty-settings-switch-row">
                    <div className="faculty-settings-switch-info">
                      <h4>Daily Route Dispatch Alerts</h4>
                      <p>Receive notifications for schedule changes, trip dispatches, and emergency maintenance notices.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.routeDispatchAlerts}
                      onChange={(e) =>
                        setPreferences({ ...preferences, routeDispatchAlerts: e.target.checked })
                      }
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                        accentColor: "var(--cms-primary, #6f8400)",
                      }}
                      disabled={savingPreferences}
                    />
                  </div>

                  <div className="faculty-settings-field" style={{ marginTop: 14 }}>
                    <label>Auto Logout Session Timeout</label>
                    <select
                      value={preferences.autoLogoutTimeout}
                      onChange={(e) =>
                        setPreferences({ ...preferences, autoLogoutTimeout: e.target.value })
                      }
                      disabled={savingPreferences}
                      style={{ maxWidth: 260 }}
                    >
                      <option value="15">15 minutes of inactivity</option>
                      <option value="30">30 minutes of inactivity</option>
                      <option value="60">60 minutes of inactivity</option>
                      <option value="120">2 hours of inactivity</option>
                    </select>
                  </div>
                </div>

                <div className="faculty-settings-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setModalOpen(false)}
                    disabled={savingPreferences}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary"
                    disabled={savingPreferences}
                  >
                    {savingPreferences ? "Saving Preferences..." : "Save Preferences"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
