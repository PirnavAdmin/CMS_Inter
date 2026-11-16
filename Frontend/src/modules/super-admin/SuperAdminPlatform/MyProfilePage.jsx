import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  User,
  Mail,
  Shield,
  Building2,
  Clock,
  Calendar,
  Lock,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Sun,
  Moon,
  Monitor,
  Bell,
  Globe,
  ChevronDown,
  RefreshCw,
  Pencil,
  Camera,
  Crown,
  Wrench,
  Users,
  SlidersHorizontal
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import superAdminApi from "@/api/superAdminApi.js";
import { isValidSuperAdminEmail, isStrongSuperAdminPassword } from "../superAdminValidation.js";
import profileIllustration from "@/assets/settings-3d/roles-permissions.png";
import "./MyProfilePage.css";

// ── helpers ────────────────────────────────────────────────────────────────
const formatExpiry = (ms) => {
  if (!ms) return "09 Nov 2026, 03:11 PM";
  try {
    const d = new Date(ms);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "09 Nov 2026, 03:11 PM";
  }
};

const getInitials = (name = "") => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0] || "SA").slice(0, 2).toUpperCase();
};

// ── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  return (
    <div className={`mpp-toast mpp-toast-${type}`}>
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{msg}</span>
      <button type="button" className="mpp-toast-close" onClick={onClose}>
        <X size={13} />
      </button>
    </div>
  );
}

// ── Edit Profile Modal ──────────────────────────────────────────────────────
function EditProfileModal({ currentName, currentEmail, onClose, onSave }) {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (cleanName.length < 2 || cleanName.length > 100) { setError("Name must be between 2 and 100 characters."); return; }
    if (!isValidSuperAdminEmail(cleanEmail)) { setError("Enter a valid email address."); return; }
    if (saving) return;
    setSaving(true);
    setTimeout(() => {
      onSave({ name: cleanName, email: cleanEmail.toLowerCase() });
      setSaving(false);
      onClose();
    }, 400);
  };

  return (
    <div className="mpp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mpp-modal">
        <div className="mpp-modal-header">
          <div className="mpp-modal-title-row">
            <div className="mpp-modal-icon">
              <Pencil size={18} />
            </div>
            <div>
              <h3 className="mpp-modal-title">Edit Profile Information</h3>
              <p className="mpp-modal-sub">Update your platform administrator details</p>
            </div>
          </div>
          <button type="button" className="mpp-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className="mpp-modal-body" onSubmit={handleSubmit}>
          {error && <div className="mpp-modal-error" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}
          <div className="mpp-field-group">
            <label className="mpp-field-label">Full Name</label>
            <div className="mpp-input-wrap">
              <User size={14} className="mpp-input-icon" />
              <input
                type="text"
                className="mpp-input"
                value={name}
                minLength={2}
                maxLength={100}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                required
              />
            </div>
          </div>

          <div className="mpp-field-group">
            <label className="mpp-field-label">Official Email Address</label>
            <div className="mpp-input-wrap">
              <Mail size={14} className="mpp-input-icon" />
              <input
                type="email"
                className="mpp-input"
                value={email}
                maxLength={254}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
              />
            </div>
          </div>

          <div className="mpp-modal-footer">
            <button type="button" className="mpp-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="mpp-btn-save" disabled={saving}>
              {saving ? <RefreshCw size={13} className="mpp-spin" /> : <CheckCircle2 size={13} />}
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Change Password Modal ───────────────────────────────────────────────────
function ChangePasswordModal({ onClose, onSuccess }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = (() => {
    if (!next) return 0;
    let s = 0;
    if (next.length >= 8) s++;
    if (/[A-Z]/.test(next)) s++;
    if (/[0-9]/.test(next)) s++;
    if (/[^A-Za-z0-9]/.test(next)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!current.trim()) { setError("Current password is required."); return; }
    if (!isStrongSuperAdminPassword(next)) { setError("New password must be at least 8 characters and include uppercase, lowercase, number, and special character."); return; }
    if (loading) return;
    if (next !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await superAdminApi.changePassword(current, next);
      onSuccess("Password changed successfully!");
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to change password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mpp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mpp-modal">
        <div className="mpp-modal-header">
          <div className="mpp-modal-title-row">
            <div className="mpp-modal-icon"><Lock size={18} /></div>
            <div>
              <h3 className="mpp-modal-title">Change Password</h3>
              <p className="mpp-modal-sub">Update your Super Admin account password</p>
            </div>
          </div>
          <button type="button" className="mpp-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form className="mpp-modal-body" onSubmit={handleSubmit}>
          {error && (
            <div className="mpp-modal-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="mpp-field-group">
            <label className="mpp-field-label">Current Password</label>
            <div className="mpp-input-wrap">
              <Lock size={14} className="mpp-input-icon" />
              <input
                type={showCurrent ? "text" : "password"}
                className="mpp-input"
                placeholder="Enter current password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="mpp-eye-btn" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="mpp-field-group">
            <label className="mpp-field-label">New Password</label>
            <div className="mpp-input-wrap">
              <Lock size={14} className="mpp-input-icon" />
              <input
                type={showNext ? "text" : "password"}
                className="mpp-input"
                placeholder="Minimum 8 characters"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className="mpp-eye-btn" onClick={() => setShowNext(!showNext)}>
                {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {next && (
              <div className="mpp-strength-bar">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="mpp-strength-seg"
                    style={{ background: i <= strength ? strengthColor : "#e5e7eb" }}
                  />
                ))}
                <span className="mpp-strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mpp-field-group">
            <label className="mpp-field-label">Confirm New Password</label>
            <div className="mpp-input-wrap">
              <Lock size={14} className="mpp-input-icon" />
              <input
                type={showConfirm ? "text" : "password"}
                className="mpp-input"
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" className="mpp-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {confirm && next && (
              <span className={`mpp-match-hint ${next === confirm ? "ok" : "err"}`}>
                {next === confirm ? <><CheckCircle2 size={12} /> Passwords match</> : <><AlertCircle size={12} /> Passwords do not match</>}
              </span>
            )}
          </div>

          <div className="mpp-modal-footer">
            <button type="button" className="mpp-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="mpp-btn-save" disabled={loading}>
              {loading ? <RefreshCw size={13} className="mpp-spin" /> : <Lock size={13} />}
              <span>{loading ? "Updating…" : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────────
function ProfileSettingsModal({ type, email, expiry, onClose }) {
  const details = {
    twoFactor: ["Two-Factor Authentication", "Two-factor authentication is enabled", "Your account currently reports 2FA as enabled. Contact your platform administrator if you need to change the authentication method."],
    sessions: ["Active Sessions", "This device", `Signed in as ${email}. Session expires ${expiry}.`],
    notifications: ["Notification Settings", "Email notifications", "Notification delivery preferences are managed by your platform settings. Review platform-wide notification rules in Global Settings."],
  }[type];
  if (!details) return null;

  return (
    <div className="mpp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="mpp-modal mpp-settings-modal" role="dialog" aria-modal="true" aria-labelledby="mpp-settings-title">
        <header className="mpp-modal-header">
          <div className="mpp-modal-title-row">
            <div className="mpp-modal-icon"><Shield size={18} /></div>
            <div>
              <h3 className="mpp-modal-title" id="mpp-settings-title">{details[0]}</h3>
              <p className="mpp-modal-sub">Review settings for your platform account.</p>
            </div>
          </div>
          <button type="button" className="mpp-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>
        <div className="mpp-modal-body mpp-settings-modal-body">
          <div className="mpp-settings-summary"><strong>{details[1]}</strong><p>{details[2]}</p></div>
          <div className="mpp-modal-footer"><button type="button" className="mpp-btn-save" onClick={onClose}>Done</button></div>
        </div>
      </section>
    </div>
  );
}

export default function MyProfilePage() {
  const { session } = useSuperAdmin?.() || {};

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeProfilePanel, setActiveProfilePanel] = useState(null);
  const [photoMode, setPhotoMode] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem("sa-profile-photo") || "");
  const [photoCandidate, setPhotoCandidate] = useState("");
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef(null);

  // Custom user overrides if edited
  const [customName, setCustomName] = useState(null);
  const [customEmail, setCustomEmail] = useState(null);

  // Theme preference
  const [theme, setTheme] = useState(() => localStorage.getItem("sa-theme") || "light");
  // Language preference
  const [language, setLanguage] = useState(() => localStorage.getItem("sa-language") || "English");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getProfile();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Resolve display values
  const displayName = customName || profile?.name || session?.name || "Super Administrator";
  const displayEmail = customEmail || profile?.email || session?.email || "superadmin.pirnav@gmail.com";
  const displayRole = "SuperAdmin · Platform scope";
  const displayTenant = "Platform";
  const displaySession = "Backend-authenticated account";
  const displayExpiry = formatExpiry(session?.expiresAt);
  const initials = getInitials(displayName);

  const handleProfileSave = ({ name, email }) => {
    setCustomName(name);
    setCustomEmail(email);
    showToast("Profile details updated successfully!");
  };

  const handleThemeChange = (val) => {
    setTheme(val);
    localStorage.setItem("sa-theme", val);
    document.documentElement.setAttribute(
      "data-theme",
      val === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : val
    );
    showToast(`Theme changed to ${val}`);
  };

  const handleLanguageChange = (e) => {
    const val = e.target.value;
    setLanguage(val);
    localStorage.setItem("sa-language", val);
    showToast(`Language set to ${val}`);
  };

  const closePhotoModal = () => {
    if (photoCandidate.startsWith("blob:")) URL.revokeObjectURL(photoCandidate);
    setPhotoCandidate("");
    setPhotoError("");
    setPhotoMode(null);
  };

  const selectProfilePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file to continue.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Photo file size cannot exceed 5 MB.");
      return;
    }
    if (photoCandidate.startsWith("blob:")) URL.revokeObjectURL(photoCandidate);
    setPhotoCandidate(URL.createObjectURL(file));
    setPhotoError("");
    setPhotoMode("preview");
  };

  const saveProfilePhoto = async () => {
    if (!photoCandidate) return;
    try {
      const image = new Image();
      image.src = photoCandidate;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Unable to read this image. Choose another photo."));
      });
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo editing is unavailable in this browser.");
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(image,
        (image.naturalWidth - cropSize) / 2,
        (image.naturalHeight - cropSize) / 2,
        cropSize,
        cropSize,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const result = canvas.toDataURL("image/jpeg", 0.86);
      localStorage.setItem("sa-profile-photo", result);
      setProfilePhoto(result);
      closePhotoModal();
      showToast("Profile photo saved in this browser.");
    } catch (error) {
      setPhotoError(error.message || "Unable to save this photo.");
    }
  };

  return (
    <div className="mpp-page">
      {/* Toast Notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          currentName={displayName}
          currentEmail={displayEmail}
          onClose={() => setShowEditModal(false)}
          onSave={handleProfileSave}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      {activeProfilePanel && (
        <ProfileSettingsModal
          type={activeProfilePanel}
          email={displayEmail}
          expiry={displayExpiry}
          onClose={() => setActiveProfilePanel(null)}
        />
      )}

      <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={selectProfilePhoto} />
      {photoMode && (
        <div className="mpp-modal-overlay" onClick={(event) => event.target === event.currentTarget && closePhotoModal()}>
          <section className="mpp-modal mpp-photo-modal" role="dialog" aria-modal="true" aria-labelledby="mpp-photo-title">
            <header className="mpp-modal-header">
              <div className="mpp-modal-title-row">
                <div className="mpp-modal-icon"><Camera size={18} /></div>
                <div>
                  <h3 className="mpp-modal-title" id="mpp-photo-title">{photoMode === "preview" ? "Preview Profile Photo" : photoMode === "view" ? "Profile Photo" : "Update Profile Photo"}</h3>
                  <p className="mpp-modal-sub">Choose a photo for your Super Admin profile.</p>
                </div>
              </div>
              <button type="button" className="mpp-modal-close" onClick={closePhotoModal} aria-label="Close"><X size={16} /></button>
            </header>
            <div className="mpp-modal-body mpp-photo-modal-body">
              {photoMode === "menu" && <>
                <div className="mpp-photo-preview">{profilePhoto ? <img src={profilePhoto} alt="Current profile" /> : <span>{initials}</span>}</div>
                <div className="mpp-photo-menu">
                  <button type="button" disabled={!profilePhoto} onClick={() => setPhotoMode("view")}><Eye size={17} />View photo</button>
                  <button type="button" onClick={() => photoInputRef.current?.click()}><Camera size={17} />Upload photo</button>
                  <button type="button" className="is-danger" disabled={!profilePhoto} onClick={() => { localStorage.removeItem("sa-profile-photo"); setProfilePhoto(""); closePhotoModal(); showToast("Profile photo removed from this browser."); }}><X size={17} />Remove photo</button>
                </div>
              </>}
              {photoMode === "view" && <img className="mpp-photo-large-preview" src={profilePhoto} alt="Super Admin profile" />}
              {photoMode === "preview" && photoCandidate && <>
                <p className="mpp-photo-help">Preview the centered square crop. JPG, PNG, WEBP or GIF · Maximum 5 MB.</p>
                <div className="mpp-photo-preview is-large"><img src={photoCandidate} alt="Selected profile preview" /></div>
                <button type="button" className="mpp-photo-change" onClick={() => photoInputRef.current?.click()}>Choose a different photo</button>
              </>}
              {photoError && <p className="mpp-photo-error" role="alert">{photoError}</p>}
            </div>
            <footer className="mpp-modal-footer mpp-photo-modal-footer">
              {photoMode === "view" && <button type="button" className="mpp-btn-cancel" onClick={() => setPhotoMode("menu")}>Back</button>}
              {photoMode === "preview" && <>
                <button type="button" className="mpp-btn-cancel" onClick={() => { if (photoCandidate.startsWith("blob:")) URL.revokeObjectURL(photoCandidate); setPhotoCandidate(""); setPhotoMode("menu"); setPhotoError(""); }}>Cancel</button>
                <button type="button" className="mpp-btn-save" onClick={saveProfilePhoto}>Save Photo</button>
              </>}
              {photoMode === "menu" && <button type="button" className="mpp-btn-cancel" onClick={closePhotoModal}>Close</button>}
            </footer>
          </section>
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <nav className="mpp-breadcrumb">
        <span>Platform Management</span>
        <ChevronRight size={13} className="mpp-bc-sep" />
        <span className="mpp-bc-active">My Profile</span>
      </nav>

      {/* ── HEADER BANNER ── */}
      <div className="mpp-header-card">
        <div className="mpp-header-left">
          <div className="mpp-header-icon">
            <ThreeDIcon name="staff-management" size={34} />
          </div>
          <div className="mpp-header-text">
            <h1 className="mpp-page-title">My Profile</h1>
            <p className="mpp-page-desc">
              View and manage your account details, security, and platform preferences.
            </p>
          </div>
        </div>

        {/* ── TOP RIGHT 3D INTERACTIVE ILLUSTRATION ── */}
        <div
          className="mpp-header-illustration-wrap"
          title="Super Admin Identity & Platform Management"
        >
          <img
            src={profileIllustration}
            alt="Platform Management & Roles"
            className="mpp-header-3d-img"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      </div>

      {/* ── 3-COLUMN LAYOUT: Equal length Left & Middle Cards ── */}
      <div className="mpp-grid">

        {/* ── 1. LEFT: EQUAL LENGTH PROFILE CARD ── */}
        <div className="mpp-profile-card">
          <div className="mpp-profile-wash" />
          
          <div className="mpp-profile-content">
            {/* Large Olive Green Avatar with Camera Button */}
            <div className="mpp-avatar-wrap">
              <div className="mpp-avatar-circle">
                {profilePhoto ? <img src={profilePhoto} alt="Super Admin profile" /> : <span className="mpp-avatar-initials">{initials}</span>}
              </div>
              <button
                type="button"
                className="mpp-camera-badge"
                title="Change Profile Photo"
                onClick={() => setPhotoMode("menu")}
              >
                <Camera size={13} />
              </button>
            </div>

            {/* Administrator Name */}
            <h2 className="mpp-profile-name" title={displayName}>
              {displayName}
            </h2>

            {/* Super Admin Crown Pill Badge */}
            <div className="mpp-profile-badge-wrap">
              <span className="mpp-crown-badge">
                <Crown size={12} className="mpp-crown-icon" />
                <span>Super Admin</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. MIDDLE: EQUAL LENGTH ACCOUNT INFORMATION CARD ── */}
        <div className="mpp-info-card">
          <div className="mpp-info-header">
            <div className="mpp-info-title-row">
              <Users size={17} className="mpp-info-icon" />
              <span className="mpp-info-title">Account Information</span>
            </div>
            <button
              type="button"
              className="mpp-edit-profile-btn"
              onClick={() => setShowEditModal(true)}
              title="Edit Profile"
            >
              <Pencil size={13} />
              <span>Edit Profile</span>
            </button>
          </div>

          {loading ? (
            <div className="mpp-loading">
              <RefreshCw size={20} className="mpp-spin" />
              <span>Loading details…</span>
            </div>
          ) : (
            <div className="mpp-info-rows">
              {/* Row 1: Email */}
              <div className="mpp-info-row">
                <div className="mpp-info-label">
                  <Mail size={15} className="mpp-row-icon" />
                  <span>Email</span>
                </div>
                <div className="mpp-info-value">{displayEmail}</div>
              </div>

              {/* Row 2: Role */}
              <div className="mpp-info-row">
                <div className="mpp-info-label">
                  <User size={15} className="mpp-row-icon" />
                  <span>Role</span>
                </div>
                <div className="mpp-info-value">{displayRole}</div>
              </div>

              {/* Row 3: Tenant */}
              <div className="mpp-info-row">
                <div className="mpp-info-label">
                  <Building2 size={15} className="mpp-row-icon" />
                  <span>Tenant</span>
                </div>
                <div className="mpp-info-value">{displayTenant}</div>
              </div>

              {/* Row 4: Session */}
              <div className="mpp-info-row">
                <div className="mpp-info-label">
                  <Wrench size={15} className="mpp-row-icon" />
                  <span>Session</span>
                </div>
                <div className="mpp-info-value">{displaySession}</div>
              </div>

              {/* Row 5: Expires */}
              <div className="mpp-info-row">
                <div className="mpp-info-label">
                  <Calendar size={15} className="mpp-row-icon" />
                  <span>Expires</span>
                </div>
                <div className="mpp-info-value">{displayExpiry}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. RIGHT: SECURITY & PREFERENCES STACK ── */}
        <div className="mpp-right-col">

          {/* Security Card */}
          <div className="mpp-security-card">
            <div className="mpp-section-header">
              <Shield size={15} className="mpp-section-icon" />
              <span className="mpp-section-title">Security</span>
            </div>

            {/* Change Password row */}
            <button
              type="button"
              className="mpp-security-row"
              onClick={() => setShowPasswordModal(true)}
            >
              <div className="mpp-sec-left">
                <Lock size={15} className="mpp-sec-icon" />
                <span className="mpp-sec-label">Change Password</span>
              </div>
              <ChevronRight size={15} className="mpp-sec-arrow" />
            </button>

            {/* 2FA row */}
            <button type="button" className="mpp-security-row" onClick={() => setActiveProfilePanel("twoFactor")}>
              <div className="mpp-sec-left">
                <Shield size={15} className="mpp-sec-icon" />
                <span className="mpp-sec-label">Two-Factor Authentication (2FA)</span>
              </div>
              <div className="mpp-sec-right">
                <span className="mpp-2fa-badge">Enabled</span>
                <ChevronRight size={15} className="mpp-sec-arrow" />
              </div>
            </button>

            {/* Active Sessions row */}
            <button type="button" className="mpp-security-row" onClick={() => setActiveProfilePanel("sessions")}>
              <div className="mpp-sec-left">
                <Clock size={15} className="mpp-sec-icon" />
                <span className="mpp-sec-label">Active Sessions</span>
              </div>
              <div className="mpp-sec-right">
                <span className="mpp-session-count">1</span>
                <ChevronRight size={15} className="mpp-sec-arrow" />
              </div>
            </button>
          </div>

          {/* Preferences Card */}
          <div className="mpp-prefs-card">
            <div className="mpp-section-header">
              <SlidersHorizontal size={15} className="mpp-section-icon" />
              <span className="mpp-section-title">Preferences</span>
            </div>

            {/* Notification Settings */}
            <button type="button" className="mpp-pref-row mpp-pref-row-button" onClick={() => setActiveProfilePanel("notifications")}>
              <div className="mpp-pref-left">
                <Bell size={14} className="mpp-pref-icon" />
                <span className="mpp-pref-label">Notification Settings</span>
              </div>
              <ChevronRight size={15} className="mpp-pref-arrow" />
            </button>

            {/* Language */}
            <div className="mpp-pref-row">
              <div className="mpp-pref-left">
                <Globe size={14} className="mpp-pref-icon" />
                <span className="mpp-pref-label">Language</span>
              </div>
              <div className="mpp-lang-select-wrap">
                <select
                  className="mpp-lang-select"
                  value={language}
                  onChange={handleLanguageChange}
                >
                  <option value="English">English</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                </select>
                <ChevronDown size={12} className="mpp-lang-arrow" />
              </div>
            </div>

            {/* Theme */}
            <div className="mpp-pref-row mpp-theme-row">
              <div className="mpp-pref-left">
                <Moon size={14} className="mpp-pref-icon" />
                <span className="mpp-pref-label">Theme</span>
              </div>
              <div className="mpp-theme-btns">
                <button
                  type="button"
                  className={`mpp-theme-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => handleThemeChange("light")}
                >
                  <Sun size={12} />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  className={`mpp-theme-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => handleThemeChange("dark")}
                >
                  <Moon size={12} />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  className={`mpp-theme-btn ${theme === "system" ? "active" : ""}`}
                  onClick={() => handleThemeChange("system")}
                >
                  <Monitor size={12} />
                  <span>System</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
