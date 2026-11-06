import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  User,
  Lock,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import generalSettingsIcon from "@/assets/sidebar-3d/general-settings.svg";
import ThemeSettingsCard from "@/shared/components/ThemeSettingsCard.jsx";
import apiClient, { getApiErrorMessage } from "../../../api/apiClient.js";
import { unwrapDriverData } from "../data/driverData.js";
import { useDriverData } from "../DriverDataContext.jsx";
import "./DriverSettingsPage.css";

const base = "/api/v1/transport/driver/settings";
const emptyPassword = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function DriverSettingsPage() {
  const { driverProfile, refresh, applySavedPreferences } = useDriverData();

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "password" | "preferences"

  // Profile Form State
  const [profile, setProfile] = useState({
    fullName: "",
    mobile: "",
    personalEmail: "",
    address: "",
  });
  const [readOnlyProfile, setReadOnlyProfile] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // Password Form State
  const [passwordForm, setPasswordForm] = useState(emptyPassword);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  // Live Password Criteria & Strength
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

  // Preferences State
  const [preferences, setPreferences] = useState({
    emailAttendanceAlerts: true,
    smsUrgentAlerts: false,
    tripReminders: true,
    autoLogoutMinutes: 30,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefMsg, setPrefMsg] = useState("");
  const [prefErr, setPrefErr] = useState("");

  // Load Initial Settings
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get(base)
      .then(unwrapDriverData)
      .then((data) => {
        if (!isMounted) return;
        if (data.profile) {
          setProfile({
            fullName: data.profile.fullName || driverProfile?.name || "PENETI RAJESH",
            mobile: data.profile.mobile || driverProfile?.mobile || "9283572983",
            personalEmail: data.profile.personalEmail || driverProfile?.email || "penetirajesh123@gmail.com",
            address: data.profile.address || driverProfile?.address || "",
          });
          setReadOnlyProfile(data.profile);
        } else {
          setProfile({
            fullName: driverProfile?.name || "PENETI RAJESH",
            mobile: driverProfile?.mobile || "9283572983",
            personalEmail: driverProfile?.email || "penetirajesh123@gmail.com",
            address: driverProfile?.address || "",
          });
        }
        if (data.preferences) {
          setPreferences({
            ...data.preferences,
            autoLogoutMinutes: Number(data.preferences.autoLogoutMinutes) || 30,
          });
          applySavedPreferences?.(data.preferences);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setProfile({
          fullName: driverProfile?.name || "PENETI RAJESH",
          mobile: driverProfile?.mobile || "9283572983",
          personalEmail: driverProfile?.email || "penetirajesh123@gmail.com",
          address: driverProfile?.address || "",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [driverProfile, applySavedPreferences]);

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    setProfileErr("");
    try {
      const res = await apiClient.put(`${base}/profile`, {
        fullName: profile.fullName.trim(),
        mobile: profile.mobile.trim(),
        personalEmail: profile.personalEmail.trim(),
        address: profile.address.trim(),
      });
      unwrapDriverData(res);
      setProfileMsg("Profile information updated successfully!");
      await refresh?.();
    } catch (err) {
      setProfileErr(getApiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Password Handler
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordErr("");

    if (passwordForm.newPassword.length < 6) {
      setPasswordErr("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErr("New password and confirm password do not match.");
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordErr("New password cannot be the same as current password.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await apiClient.post(`${base}/change-password`, passwordForm);
      unwrapDriverData(res);
      setPasswordMsg("Password changed successfully!");
      setPasswordForm(emptyPassword);
    } catch (err) {
      setPasswordErr(getApiErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  // Save Preferences Handler
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefMsg("");
    setPrefErr("");
    try {
      const res = await apiClient.put(`${base}/preferences`, preferences);
      unwrapDriverData(res);
      setPrefMsg("Preferences saved successfully!");
      applySavedPreferences?.(preferences);
    } catch (err) {
      setPrefErr(getApiErrorMessage(err));
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleOpenModal = (tabName = "profile") => {
    setActiveTab(tabName);
    setProfileMsg("");
    setProfileErr("");
    setPasswordMsg("");
    setPasswordErr("");
    setPrefMsg("");
    setPrefErr("");
    setModalOpen(true);
  };

  return (
    <div className="dp-page-container dp-settings">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <h1 className="dp-page-title">Settings</h1>
          <p className="dp-page-subtitle">
            Manage your driver account, profile settings, password, and preferences.
          </p>
        </div>
      </div>

      {/* Settings Grid with Featured "General Settings" Card and Theme Card */}
      <div className="faculty-settings-grid">
        {/* General Settings Featured Card */}
        <article className="faculty-settings-card is-featured">
          <div className="faculty-settings-card-body">
            <div className="faculty-settings-card-header">
              <div className="faculty-settings-card-icon">
                <img
                  className="faculty-settings-card-image"
                  src={generalSettingsIcon}
                  alt="General Settings"
                  aria-hidden="true"
                />
              </div>
              <h3>General Settings</h3>
            </div>
            <p>
              Manage personal profile details, contact information, update account password, and notification preferences.
            </p>
          </div>
          <div className="faculty-settings-card-footer">
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => handleOpenModal("profile")}
            >
              Manage General Settings <ArrowRight size={14} />
            </button>
          </div>
        </article>

        {/* Theme Settings Card */}
        <ThemeSettingsCard />
      </div>

      {/* Interactive Management Modal with the 3 Tabs */}
      {modalOpen && (
        <div className="faculty-settings-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="faculty-settings-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
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

            {/* Modal Tabs */}
            <div className="faculty-settings-tabs" role="tablist" aria-label="General settings tabs">
              <button
                type="button"
                role="tab"
                className={`faculty-settings-tab-btn ${activeTab === "profile" ? "is-active" : ""}`}
                onClick={() => handleOpenModal("profile")}
              >
                <User size={15} />
                Profile Settings
              </button>
              <button
                type="button"
                role="tab"
                className={`faculty-settings-tab-btn ${activeTab === "password" ? "is-active" : ""}`}
                onClick={() => handleOpenModal("password")}
              >
                <Lock size={15} />
                Reset / Change Password
              </button>
              <button
                type="button"
                role="tab"
                className={`faculty-settings-tab-btn ${activeTab === "preferences" ? "is-active" : ""}`}
                onClick={() => handleOpenModal("preferences")}
              >
                <Bell size={15} />
                General Preferences
              </button>
            </div>

            {/* TAB 1: PROFILE SETTINGS */}
            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile}>
                <div className="faculty-settings-modal-body">
                  {profileMsg && (
                    <div className="faculty-settings-alert success">
                      <CheckCircle2 size={16} /> {profileMsg}
                    </div>
                  )}
                  {profileErr && (
                    <div className="faculty-settings-alert error">
                      <AlertCircle size={16} /> {profileErr}
                    </div>
                  )}

                  <div className="dp-settings-profile-form">
                    <div className="dp-settings-field">
                      <label>Full Name</label>
                      <input
                        type="text"
                        required
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="dp-settings-field">
                      <label>Employee ID</label>
                      <input
                        type="text"
                        value={readOnlyProfile.employeeId ?? driverProfile?.employeeId ?? "MNT0030"}
                        disabled
                      />
                      <small>Assigned by college administrator</small>
                    </div>
                    <div className="dp-settings-field">
                      <label>Designation</label>
                      <input
                        type="text"
                        value={readOnlyProfile.designation ?? driverProfile?.role ?? "Bus Driver"}
                        disabled
                      />
                    </div>
                    <div className="dp-settings-field">
                      <label>Mobile Number</label>
                      <input
                        type="tel"
                        value={profile.mobile}
                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="dp-settings-field dp-settings-col-full">
                      <label>Personal Email</label>
                      <input
                        type="email"
                        value={profile.personalEmail}
                        onChange={(e) => setProfile({ ...profile, personalEmail: e.target.value })}
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="dp-settings-field dp-settings-col-full">
                      <label>Residential Address</label>
                      <textarea
                        rows="2"
                        value={profile.address}
                        placeholder="Enter complete residential address"
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        disabled={savingProfile}
                      />
                    </div>
                  </div>
                </div>

                <div className="faculty-settings-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setModalOpen(false)}
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="cms-btn cms-btn-primary" disabled={savingProfile}>
                    {savingProfile ? (
                      <>
                        <Loader2 size={14} className="sp-spin" /> Saving...
                      </>
                    ) : (
                      "Save Profile Changes"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: CHANGE PASSWORD */}
            {activeTab === "password" && (
              <form onSubmit={handleSavePassword}>
                <div className="faculty-settings-modal-body">
                  {passwordMsg && (
                    <div className="faculty-settings-alert success">
                      <CheckCircle2 size={16} /> {passwordMsg}
                    </div>
                  )}
                  {passwordErr && (
                    <div className="faculty-settings-alert error">
                      <AlertCircle size={16} /> {passwordErr}
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
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          required
                          disabled={savingPassword}
                        />
                        <button
                          type="button"
                          className="faculty-settings-password-toggle"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          aria-label={showCurrentPassword ? "Hide password" : "Show password"}
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
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          required
                          disabled={savingPassword}
                        />
                        <button
                          type="button"
                          className="faculty-settings-password-toggle"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {newPwd.length > 0 ? (
                        <div className="faculty-password-strength-box">
                          <div className="faculty-password-strength-label">
                            <span>Password Strength</span>
                            <span style={{ color: strengthColor, fontWeight: 700 }}>{strengthLabel}</span>
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
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          required
                          disabled={savingPassword}
                        />
                        <button
                          type="button"
                          className="faculty-settings-password-toggle"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {isConfirmEntered && (
                        <div style={{ marginTop: 4 }}>
                          {isPasswordsMatch ? (
                            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              ✓ Passwords match
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
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
                  <button type="submit" className="cms-btn cms-btn-primary" disabled={savingPassword}>
                    {savingPassword ? (
                      <>
                        <Loader2 size={14} className="sp-spin" /> Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: GENERAL PREFERENCES */}
            {activeTab === "preferences" && (
              <form onSubmit={handleSavePreferences}>
                <div className="faculty-settings-modal-body">
                  {prefMsg && (
                    <div className="faculty-settings-alert success">
                      <CheckCircle2 size={16} /> {prefMsg}
                    </div>
                  )}
                  {prefErr && (
                    <div className="faculty-settings-alert error">
                      <AlertCircle size={16} /> {prefErr}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label className="dp-settings-pref-toggle">
                      <span>
                        <strong>Email Trip & Student Alerts</strong>
                        <small>Receive daily notifications on route student updates.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={!!preferences.emailAttendanceAlerts}
                        onChange={(e) =>
                          setPreferences({ ...preferences, emailAttendanceAlerts: e.target.checked })
                        }
                        disabled={savingPrefs}
                      />
                    </label>

                    <label className="dp-settings-pref-toggle">
                      <span>
                        <strong>SMS Urgent Dispatch Notices</strong>
                        <small>Receive urgent SMS for route detours or vehicle maintenance.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={!!preferences.smsUrgentAlerts}
                        onChange={(e) =>
                          setPreferences({ ...preferences, smsUrgentAlerts: e.target.checked })
                        }
                        disabled={savingPrefs}
                      />
                    </label>

                    <label className="dp-settings-pref-toggle">
                      <span>
                        <strong>Trip Schedule Reminders</strong>
                        <small>Send advance 15-minute reminders before trip commencement.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={!!preferences.tripReminders}
                        onChange={(e) =>
                          setPreferences({ ...preferences, tripReminders: e.target.checked })
                        }
                        disabled={savingPrefs}
                      />
                    </label>

                    <div className="faculty-settings-field" style={{ marginTop: 6 }}>
                      <label>Auto-Logout Inactivity Duration</label>
                      <select
                        value={preferences.autoLogoutMinutes}
                        onChange={(e) =>
                          setPreferences({ ...preferences, autoLogoutMinutes: Number(e.target.value) })
                        }
                        disabled={savingPrefs}
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={30}>30 Minutes (Recommended)</option>
                        <option value={60}>60 Minutes</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="faculty-settings-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setModalOpen(false)}
                    disabled={savingPrefs}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="cms-btn cms-btn-primary" disabled={savingPrefs}>
                    {savingPrefs ? (
                      <>
                        <Loader2 size={14} className="sp-spin" /> Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
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
