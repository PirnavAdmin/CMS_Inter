import React, { useState } from "react";
import { ArrowRight, Lock, Bell, CheckCircle2, AlertCircle, X, ShieldCheck } from "lucide-react";
import generalSettingsIcon from "@/assets/sidebar-3d/general-settings.svg";
import { useFaculty } from "../FacultyContext.jsx";
import "../styles/FacultySettings.css";

export default function FacultySettings() {
  const { notify } = useFaculty();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("password"); // "password" | "preferences"

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // General Preferences State
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    smsAlerts: false,
    timetableReminder: true,
    autoLogoutTimeout: "30",
  });

  const handleOpenModal = (tab = "password") => {
    setActiveTab(tab);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordError("");
    setPasswordSuccess(false);
    setModalOpen(true);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    // Success simulation
    setPasswordSuccess(true);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    notify("Password changed successfully!", "success");
    setTimeout(() => {
      setModalOpen(false);
      setPasswordSuccess(false);
    }, 1200);
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    notify("General preferences saved successfully!", "success");
    setModalOpen(false);
  };

  return (
    <div className="faculty-settings-container">
      {/* Page Header */}
      <div className="cms-page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your faculty account, password, and general preferences.</p>
        </div>
      </div>

      {/* Settings Grid with Single "General Settings" Card */}
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
              Manage account password, login security credentials, and system notification preferences.
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

      {/* Interactive Management Modal */}
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

            {/* Navigation Tabs inside modal */}
            <div className="faculty-settings-tabs" role="tablist" aria-label="General settings">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "password"}
                className={`faculty-settings-tab-btn ${activeTab === "password" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("password");
                  setPasswordError("");
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
                  setPasswordError("");
                }}
              >
                <Bell size={15} /> General Preferences
              </button>
            </div>

            {/* Tab 2: Reset / Change Password */}
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
                      <input
                        type="password"
                        placeholder="Enter current password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="faculty-settings-field">
                      <label>New Password</label>
                      <input
                        type="password"
                        placeholder="Enter new password (min. 6 characters)"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                      />
                      <span className="faculty-settings-hint">
                        Include uppercase letters, numbers, and symbols for high strength.
                      </span>
                    </div>
                    <div className="faculty-settings-field">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter new password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="faculty-settings-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="cms-btn cms-btn-primary">
                    Update Password
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: General Preferences */}
            {activeTab === "preferences" && (
              <form onSubmit={handleSavePreferences}>
                <div className="faculty-settings-modal-body">
                  <div className="faculty-settings-switch-row">
                    <div className="faculty-settings-switch-info">
                      <h4>Email Attendance Alerts</h4>
                      <p>Receive daily student absent roll-call confirmation emails.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailAlerts}
                      onChange={(e) => setPreferences({ ...preferences, emailAlerts: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--cms-primary, #6f8400)" }}
                    />
                  </div>

                  <div className="faculty-settings-switch-row">
                    <div className="faculty-settings-switch-info">
                      <h4>SMS Urgent Alerts</h4>
                      <p>Receive SMS for urgent administrative and exam duty notices.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.smsAlerts}
                      onChange={(e) => setPreferences({ ...preferences, smsAlerts: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--cms-primary, #6f8400)" }}
                    />
                  </div>

                  <div className="faculty-settings-switch-row">
                    <div className="faculty-settings-switch-info">
                      <h4>Timetable Slot Reminders</h4>
                      <p>Send advance 15-minute reminders before lecture commencement.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.timetableReminder}
                      onChange={(e) => setPreferences({ ...preferences, timetableReminder: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--cms-primary, #6f8400)" }}
                    />
                  </div>

                  <div className="faculty-settings-field" style={{ marginTop: 12 }}>
                    <label>Auto-Logout Inactivity Duration</label>
                    <select
                      value={preferences.autoLogoutTimeout}
                      onChange={(e) => setPreferences({ ...preferences, autoLogoutTimeout: e.target.value })}
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes (Recommended)</option>
                      <option value="60">1 Hour</option>
                      <option value="120">2 Hours</option>
                    </select>
                  </div>
                </div>
                <div className="faculty-settings-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="cms-btn cms-btn-primary">
                    Save Preferences
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
