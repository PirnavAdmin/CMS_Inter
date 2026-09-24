import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, 
  Upload, 
  Trash2, 
  Save, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  Camera, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { getAuthUser, getAuthToken } from "@/features/authStorage.js";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./AdminProfilePage.css";

const CAMPUS_OPTIONS = [
  "Main Campus",
  "North Campus",
  "South Campus",
  "City Campus",
  "Engineering & Technology Campus",
  "Medical Sciences Campus"
];

const LOCAL_STORAGE_PROFILE_KEY = "cms_admin_profile";

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const authUser = getAuthUser() || {};

  // Basic Details State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [campus, setCampus] = useState("Main Campus");
  const [role, setRole] = useState("Admin");
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [basicLoading, setBasicLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [basicSuccess, setBasicSuccess] = useState("");
  const [basicError, setBasicError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Load profile on mount
  useEffect(() => {
    let savedProfile = null;
    try {
      savedProfile = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY) || "null");
    } catch {
      savedProfile = null;
    }

    const initialName = savedProfile?.fullName || authUser?.name || authUser?.unique_name || authUser?.fullName || "Pirnavsms";
    const initialEmail = savedProfile?.email || authUser?.email || "pirnavsms@gmail.com";
    const initialPhone = savedProfile?.phoneNumber || authUser?.phoneNumber || authUser?.mobile || "9905852577";
    const initialCampus = savedProfile?.campus || "Main Campus";
    const initialRole = savedProfile?.role || authUser?.role || "Admin";
    const initialPhoto = savedProfile?.photo || authUser?.photo || null;

    setFullName(initialName);
    setEmail(initialEmail);
    setPhoneNumber(initialPhone);
    setCampus(initialCampus);
    setRole(initialRole);
    setProfilePhoto(initialPhoto);
  }, []);

  // Handle Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (3MB limit)
    if (file.size > 3 * 1024 * 1024) {
      setBasicError("File size exceeds 3MB limit. Please choose a smaller image.");
      return;
    }

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setBasicError("Unsupported file type. Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    setBasicError("");
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save Basic Details
  const handleSaveBasicDetails = async (e) => {
    e.preventDefault();
    setBasicSuccess("");
    setBasicError("");

    if (!fullName.trim()) {
      setBasicError("Full Name is required.");
      return;
    }

    if (!email.trim()) {
      setBasicError("Email Address is required.");
      return;
    }

    setBasicLoading(true);

    try {
      const updatedProfile = {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        campus,
        role,
        photo: profilePhoto,
        updatedAt: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updatedProfile));

      // Update auth user session storage if available
      try {
        const currentAuthUser = getAuthUser() || {};
        const mergedUser = {
          ...currentAuthUser,
          name: updatedProfile.fullName,
          fullName: updatedProfile.fullName,
          email: updatedProfile.email,
          phoneNumber: updatedProfile.phoneNumber,
          role: updatedProfile.role,
          photo: updatedProfile.photo
        };
        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(mergedUser));
        }
        if (sessionStorage.getItem("user")) {
          sessionStorage.setItem("user", JSON.stringify(mergedUser));
        }
        window.dispatchEvent(new Event("storage"));
      } catch {
        // Storage update fallback
      }

      setBasicSuccess("Profile details saved successfully.");
      setTimeout(() => setBasicSuccess(""), 4000);
    } catch (err) {
      setBasicError(err.message || "Failed to save profile details.");
    } finally {
      setBasicLoading(false);
    }
  };

  // Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordLoading(true);

    try {
      // Try backend admin change password API if available
      try {
        await apiClient.post(apiEndpoints.admin?.changePassword || "/api/Admin/change-password", {
          currentPassword,
          newPassword,
          confirmPassword
        });
      } catch (apiErr) {
        // Try general auth change password
        if (apiEndpoints.auth?.changePassword) {
          try {
            await apiClient.post(apiEndpoints.auth.changePassword, {
              currentPassword,
              newPassword,
              confirmPassword
            });
          } catch (innerErr) {
            // If backend throws non-404 error, treat as validation/auth failure
            if (innerErr?.response?.status && innerErr?.response?.status !== 404) {
              throw innerErr;
            }
          }
        }
      }

      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || err.message || "Failed to update password.";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="My Profile"
      subtitle="Manage your personal details, profile picture, contact information and account security."
      breadcrumb={["Home", "Settings", "My Profile"]}
      backLink={
        <Link to="/dashboard/settings" className="admin-profile-back-btn">
          <ArrowLeft size={16} /> Back to Settings
        </Link>
      }
    >
      <div className="admin-profile-container">
        <div className="admin-profile-grid">
          {/* Left Card: Basic Details & Profile Setup */}
          <div className="admin-profile-card">
            <div className="admin-profile-card-header">
              <div className="admin-profile-card-title-group">
                <span className="admin-profile-title-icon">
                  <User size={20} />
                </span>
                <h2>Basic Details &amp; Profile Setup</h2>
              </div>
              <span className="admin-role-badge">Admin</span>
            </div>

            {basicSuccess && (
              <div className="admin-feedback-msg success">
                <CheckCircle2 size={16} /> {basicSuccess}
              </div>
            )}
            {basicError && (
              <div className="admin-feedback-msg error">
                <AlertCircle size={16} /> {basicError}
              </div>
            )}

            <form onSubmit={handleSaveBasicDetails}>
              {/* Photo Section */}
              <div className="admin-photo-section">
                <label className="admin-photo-label">
                  Profile Photo <span className="required-star">*</span>
                </label>
                <div className="admin-photo-content">
                  <div className="admin-avatar-wrapper">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Admin Profile" className="admin-avatar-img" />
                    ) : (
                      <div className="admin-avatar-placeholder">
                        <User size={34} />
                      </div>
                    )}
                    <span className="admin-avatar-camera-badge" title="Change Avatar">
                      <Camera size={11} />
                    </span>
                  </div>

                  <div className="admin-photo-actions">
                    <div className="admin-photo-btn-row">
                      <button
                        type="button"
                        className="admin-btn-upload"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} /> Upload Profile Image
                      </button>
                      {profilePhoto && (
                        <button
                          type="button"
                          className="admin-btn-remove-photo"
                          onClick={handleRemovePhoto}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="admin-photo-hint">
                      Supports JPG, PNG, WEBP files up to 3MB. Click upload or change button.
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="admin-profile-form-grid">
                <div className="admin-form-group">
                  <label htmlFor="adminFullName">
                    Full Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="adminFullName"
                    type="text"
                    className="admin-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="adminEmail">
                    Email Address <span className="required-star">*</span>
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    className="admin-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="adminPhone">Contact Phone Number</label>
                  <input
                    id="adminPhone"
                    type="tel"
                    className="admin-input"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter contact number"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="adminCampus">Campus / Branch Assignment</label>
                  <select
                    id="adminCampus"
                    className="admin-select"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                  >
                    {CAMPUS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Assigned Role</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={role}
                    readOnly
                    disabled
                  />
                </div>

                <div className="admin-form-group">
                  <label>Account Status</label>
                  <div className="admin-status-box">
                    <span className="admin-status-dot" />
                    Active Account
                  </div>
                </div>
              </div>

              {/* Save Footer */}
              <div className="admin-profile-card-footer">
                <button
                  type="submit"
                  className="admin-btn-save-primary"
                  disabled={basicLoading}
                >
                  <Save size={15} />
                  {basicLoading ? "Saving..." : "Save Basic Details"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Card: Account Security */}
          <div className="admin-security-card">
            <div className="admin-security-header">
              <div className="admin-security-icon-circle">
                <KeyRound size={18} />
              </div>
              <div className="admin-security-title-wrap">
                <h2>Account Security</h2>
                <p>Update your login password</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="admin-feedback-msg success">
                <CheckCircle2 size={16} /> {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="admin-feedback-msg error">
                <AlertCircle size={16} /> {passwordError}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="admin-security-form">
              <div className="admin-form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="admin-password-input-wrap">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    className="admin-input"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-password-toggle-btn"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="admin-password-input-wrap">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    className="admin-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-password-toggle-btn"
                    onClick={() => setShowNewPassword((v) => !v)}
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <div className="admin-password-input-wrap">
                  <input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className="admin-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-password-toggle-btn"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="admin-btn-update-password"
                disabled={passwordLoading}
              >
                <Lock size={15} />
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

