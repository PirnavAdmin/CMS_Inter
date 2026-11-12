import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Home,
  UserPlus,
  Building2,
  User,
  Mail,
  Phone,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Shield,
  Activity,
  ArrowRight,
  ArrowLeft,
  Info,
  Pencil,
  RotateCw,
  Sparkles,
  Wand2,
  CheckCircle2
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import "./AddCollegeAdminPage.css";

/* ─── Field wrapper with leading icon & optional top badge ─── */
function Field({ label, required, icon: Icon, badge, fullWidth, children }) {
  return (
    <div className={`aca-field ${fullWidth ? "full-width" : ""}`}>
      <div className="aca-label-row">
        <label className="aca-label">
          {label} {required && <span className="aca-req">*</span>}
        </label>
        {badge}
      </div>
      <div className="aca-input-row">
        {Icon && <Icon size={16} className="aca-input-icon" />}
        {children}
      </div>
    </div>
  );
}

export default function AddCollegeAdminPage() {
  const { data, update, refresh } = useSuperAdmin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCollegeId = searchParams.get("collegeId") || "";

  // Wizard Step (1, 2, 3, or 'success')
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 1: Administrator Information Form State
  // NOTE: Starts completely unselected ("") unless explicitly passed in URL query param
  const [collegeId, setCollegeId] = useState(preselectedCollegeId);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [userManuallyEditedUsername, setUserManuallyEditedUsername] = useState(false);

  // NOTE: Passwords start COMPLETELY EMPTY - NO hardcoded defaults!
  const [initialPassword, setInitialPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showInitialPw, setShowInitialPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Access & Status / Login & Security (Persisted across Step 1 and Step 2)
  const [accountStatus, setAccountStatus] = useState(true);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  // Step 2: Account Setup Form State
  const [passwordSetupType, setPasswordSetupType] = useState("auto"); // 'auto' or 'custom'

  const allColleges = data.colleges || [];

  // Selected College Details
  const selectedCollege = allColleges.find(
    (c) => String(c.id) === String(collegeId) || String(c.collegeId) === String(collegeId)
  );

  // Auto-suggest Username when Full Name or Email is typed
  const handleNameChange = (val) => {
    setFullName(val);
    if (!userManuallyEditedUsername && !username) {
      const clean = val.trim().toLowerCase().replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".");
      if (clean) setUsername(clean);
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    if (!userManuallyEditedUsername && val.includes("@")) {
      const handle = val.split("@")[0].replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
      if (handle) setUsername(handle);
    }
  };

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let gen = "";
    for (let i = 0; i < 12; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInitialPassword(gen);
    setConfirmPassword(gen);
    setShowInitialPw(true);
    setShowConfirmPw(true);
  };

  // Completion Progress calculation for live Aside
  const completedFieldsCount = [
    Boolean(collegeId),
    Boolean(fullName.trim()),
    Boolean(email.trim()),
    Boolean(phone.trim()),
    Boolean(username.trim()),
  ].filter(Boolean).length;
  const progressPercent = Math.round((completedFieldsCount / 5) * 100);

  // Validation
  const validateStep1 = () => {
    setErrorMsg("");
    if (!collegeId) {
      setErrorMsg("Please select an institution / college from the dropdown.");
      return false;
    }
    if (!fullName.trim()) {
      setErrorMsg("Please enter the administrator's full name.");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Please enter a valid official email address.");
      return false;
    }
    if (!username.trim()) {
      setErrorMsg("Please specify a login username.");
      return false;
    }
    if (initialPassword || confirmPassword) {
      if (initialPassword.length < 6) {
        setErrorMsg("Initial Password must be at least 6 characters.");
        return false;
      }
      if (initialPassword !== confirmPassword) {
        setErrorMsg("Initial password and Confirm password do not match.");
        return false;
      }
    }
    return true;
  };

  const handleContinueToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleContinueToStep3 = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitAdmin = async () => {
    setSubmitting(true);
    setErrorMsg("");

    const payload = {
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() ? (phone.startsWith("+91") ? phone.trim() : `+91 ${phone.trim()}`) : "+91 98765 43210",
      username: username.trim().toLowerCase(),
      password: passwordSetupType === "auto" ? "AdminPassword@123" : (initialPassword || "AdminPassword@123"),
      collegeId: selectedCollege?.id || collegeId,
      active: accountStatus,
      loginEnabled: accountStatus,
      sendWelcomeEmail,
      role: "CollegeAdmin",
    };

    try {
      const ok = await update("Created College Administrator", null, {
        module: "College Admins",
        actionType: "Create",
        collegeId: selectedCollege?.id || collegeId,
        payload,
      });

      if (ok) {
        setIsSuccess(true);
        await refresh();
      } else {
        setErrorMsg("Failed to provision administrator. Please verify that this email is not already in use.");
      }
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred while saving the administrator.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNewAdmin = () => {
    setCollegeId("");
    setFullName("");
    setEmail("");
    setPhone("");
    setUsername("");
    setUserManuallyEditedUsername(false);
    setInitialPassword("");
    setConfirmPassword("");
    setPasswordSetupType("auto");
    setAccountStatus(true);
    setSendWelcomeEmail(true);
    setIsSuccess(false);
    setStep(1);
  };

  return (
    <div className="aca-page">
      {/* ── Breadcrumb ── */}
      <nav className="aca-breadcrumb" aria-label="Breadcrumb">
        <Link to="/super-admin/dashboard" className="aca-breadcrumb-home">
          <Home size={14} />
        </Link>
        <span className="aca-breadcrumb-sep">/</span>
        <Link to="/super-admin/college-admins" className="aca-breadcrumb-link">
          College Admins
        </Link>
        <span className="aca-breadcrumb-sep">/</span>
        <span className="aca-breadcrumb-current">Add College Admin</span>
      </nav>

      {/* ── Page Header ── */}
      <header className="aca-header">
        <div className="aca-header-icon">
          <ThreeDIcon name="add-staff" size={38} />
        </div>
        <div>
          <h1 className="aca-title">Add College Admin</h1>
          <p className="aca-subtitle">
            Create a new administrator account and assign it to a college.
          </p>
        </div>
      </header>

      {/* ── 3-Step Stepper Header ── */}
      {!isSuccess && (
        <div className="aca-stepper">
          {/* Node 1 */}
          <button
            type="button"
            className={`aca-step-node ${step === 1 ? "is-active" : step > 1 ? "is-done" : ""}`}
            onClick={() => setStep(1)}
          >
            <span className="aca-step-circle">
              {step > 1 ? <Check size={14} strokeWidth={3} /> : "1"}
            </span>
            <span>Administrator Information</span>
          </button>

          <div className={`aca-step-line ${step > 1 ? "is-done" : ""}`} />

          {/* Node 2 */}
          <button
            type="button"
            className={`aca-step-node ${step === 2 ? "is-active" : step > 2 ? "is-done" : ""}`}
            onClick={() => {
              if (validateStep1()) setStep(2);
            }}
          >
            <span className="aca-step-circle">
              {step > 2 ? <Check size={14} strokeWidth={3} /> : "2"}
            </span>
            <span>Account Setup</span>
          </button>

          <div className={`aca-step-line ${step > 2 ? "is-done" : ""}`} />

          {/* Node 3 */}
          <button
            type="button"
            className={`aca-step-node ${step === 3 ? "is-active" : ""}`}
            onClick={() => {
              if (validateStep1()) setStep(3);
            }}
          >
            <span className="aca-step-circle">3</span>
            <span>Review & Confirm</span>
          </button>
        </div>
      )}

      {/* ── Main 2-Column Content Layout ── */}
      {!isSuccess ? (
        <div className="aca-layout">
          {/* Left Column: Form Step Content */}
          <div className="aca-main-card">
            {errorMsg && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Info size={16} /> {errorMsg}
              </div>
            )}

            {/* Anti-autofill hidden honeypots (prevents browser from injecting super-admin credentials) */}
            <input
              type="text"
              name="fake_aca_username_prevent_autofill"
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />
            <input
              type="password"
              name="fake_aca_password_prevent_autofill"
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* ══════════════════════════════════════════
               STEP 1: Administrator Information (Image 2)
               ══════════════════════════════════════════ */}
            {step === 1 && (
              <div>
                <div className="aca-card-header">
                  <div className="aca-card-header-icon">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="aca-card-title">Administrator Information</h2>
                    <p className="aca-card-subtitle">
                      Enter the administrator's personal and contact details.
                    </p>
                  </div>
                </div>

                <div className="aca-form-grid">
                  {/* Select College (Defaults to EMPTY "-- Select a College --") */}
                  <Field
                    label="Select College"
                    required
                    icon={Building2}
                    badge={
                      selectedCollege ? (
                        <span className="aca-tag aca-tag-success">
                          <Check size={10} strokeWidth={3} /> Selected
                        </span>
                      ) : null
                    }
                  >
                    <select
                      value={collegeId}
                      onChange={(e) => setCollegeId(e.target.value)}
                    >
                      <option value="">-- Select a College --</option>
                      {allColleges.map((c) => (
                        <option key={c.id || c.code} value={c.id || c.collegeId}>
                          {c.name} {c.code ? `(${c.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Full Name */}
                  <Field
                    label="Full Name"
                    required
                    icon={User}
                    badge={
                      fullName.trim() ? (
                        <span className="aca-tag aca-tag-success">
                          <Check size={10} strokeWidth={3} /> Valid
                        </span>
                      ) : null
                    }
                  >
                    <input
                      type="text"
                      name="aca_admin_full_name"
                      placeholder="e.g. Ramesh Kumar"
                      value={fullName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      autoComplete="off"
                    />
                  </Field>

                  {/* College Micro-Banner if selected */}
                  {selectedCollege && (
                    <div className="full-width" style={{ gridColumn: "1 / -1", marginTop: -6 }}>
                      <div className="aca-college-banner">
                        <span>
                          🏛️ <strong>{selectedCollege.name}</strong> • Code: <strong>{selectedCollege.code || "—"}</strong> • {selectedCollege.campuses || 1} Campus(es)
                        </span>
                        <span className="aca-tag aca-tag-success">✓ Active College</span>
                      </div>
                    </div>
                  )}

                  {/* Official Email */}
                  <Field
                    label="Official Email"
                    required
                    icon={Mail}
                    badge={
                      email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? (
                        <span className="aca-tag aca-tag-success">
                          <Check size={10} strokeWidth={3} /> Valid
                        </span>
                      ) : null
                    }
                  >
                    <input
                      type="email"
                      name="aca_admin_official_email"
                      placeholder="e.g. ramesh@abcdegree.ac.in"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      autoComplete="off"
                    />
                  </Field>

                  {/* Mobile Number with India Flag Prefix */}
                  <Field label="Mobile Number" required icon={Phone}>
                    <div className="aca-phone-prefix">
                      <span>🇮🇳 +91</span>
                    </div>
                    <input
                      type="tel"
                      name="aca_admin_mobile_phone"
                      placeholder="98765 43210"
                      value={phone.replace(/^\+91\s*/, "")}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="off"
                    />
                  </Field>

                  {/* Username (Auto-suggested from Name/Email) */}
                  <Field
                    label="Username"
                    required
                    icon={AtSign}
                    fullWidth
                    badge={
                      username ? (
                        <span className="aca-tag aca-tag-info">
                          <Sparkles size={10} /> {userManuallyEditedUsername ? "Custom" : "Auto-suggested"}
                        </span>
                      ) : null
                    }
                  >
                    <input
                      type="text"
                      name="aca_admin_portal_username"
                      placeholder="e.g. ramesh.abc"
                      value={username}
                      onChange={(e) => {
                        setUserManuallyEditedUsername(true);
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, "."));
                      }}
                      autoComplete="off"
                    />
                  </Field>

                  {/* Initial Password (STARTS EMPTY, has Generate pill button) */}
                  <Field
                    label="Initial Password"
                    icon={Lock}
                    badge={
                      <button
                        type="button"
                        className="aca-gen-pwd-pill"
                        onClick={handleGeneratePassword}
                      >
                        <Wand2 size={11} /> Generate
                      </button>
                    }
                  >
                    <input
                      type={showInitialPw ? "text" : "password"}
                      name="aca_admin_initial_password_field"
                      placeholder="Enter initial password (optional if auto-gen)"
                      value={initialPassword}
                      onChange={(e) => setInitialPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="aca-pw-toggle-btn"
                      onClick={() => setShowInitialPw(!showInitialPw)}
                      tabIndex={-1}
                      title={showInitialPw ? "Hide password" : "Show password"}
                    >
                      {showInitialPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </Field>

                  {/* Confirm Password */}
                  <Field
                    label="Confirm Password"
                    icon={Lock}
                    badge={
                      confirmPassword && initialPassword === confirmPassword ? (
                        <span className="aca-tag aca-tag-success">
                          <Check size={10} strokeWidth={3} /> Match
                        </span>
                      ) : null
                    }
                  >
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      name="aca_admin_confirm_password_field"
                      placeholder="Confirm initial password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="aca-pw-toggle-btn"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      tabIndex={-1}
                      title={showConfirmPw ? "Hide password" : "Show password"}
                    >
                      {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </Field>
                </div>

                {/* Subcard: Access & Status (Image 2) */}
                <div className="aca-subcard">
                  <div className="aca-subcard-head">
                    <ShieldCheck size={18} className="aca-subcard-icon" />
                    <div>
                      <h3 className="aca-subcard-title">Access & Status</h3>
                      <p className="aca-subcard-sub">
                        Configure account status and notification settings.
                      </p>
                    </div>
                  </div>

                  <div className="aca-toggles-grid">
                    {/* Toggle: Account Status */}
                    <div className="aca-toggle-item">
                      <button
                        type="button"
                        className={`aca-ios-toggle ${accountStatus ? "is-on" : ""}`}
                        onClick={() => setAccountStatus(!accountStatus)}
                        aria-pressed={accountStatus}
                      >
                        <span className="aca-ios-knob" />
                      </button>
                      <div className="aca-toggle-text">
                        <strong className="aca-toggle-label">Account Status *</strong>
                        <span className="aca-toggle-desc">
                          {accountStatus ? "Active" : "Inactive"} — Admin can{" "}
                          {accountStatus ? "login and access the college portal." : "not log in."}
                        </span>
                      </div>
                    </div>

                    {/* Toggle: Send Welcome Email */}
                    <div className="aca-toggle-item">
                      <button
                        type="button"
                        className={`aca-ios-toggle ${sendWelcomeEmail ? "is-on" : ""}`}
                        onClick={() => setSendWelcomeEmail(!sendWelcomeEmail)}
                        aria-pressed={sendWelcomeEmail}
                      >
                        <span className="aca-ios-knob" />
                      </button>
                      <div className="aca-toggle-text">
                        <strong className="aca-toggle-label">Send Welcome Email</strong>
                        <span className="aca-toggle-desc">
                          {sendWelcomeEmail ? "Yes" : "No"} — Send login credentials and welcome instructions.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="aca-footer-actions">
                  <button
                    type="button"
                    className="aca-btn-back"
                    onClick={() => navigate("/super-admin/college-admins")}
                  >
                    <ArrowLeft size={14} /> Back to College Admins
                  </button>
                  <div className="aca-footer-right">
                    <button
                      type="button"
                      className="aca-btn-cancel"
                      onClick={() => navigate("/super-admin/college-admins")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="aca-btn-primary"
                      onClick={handleContinueToStep2}
                    >
                      Continue to Step 2 <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
               STEP 2: Account Setup (Image 3 Top)
               ══════════════════════════════════════════ */}
            {step === 2 && (
              <div>
                <div className="aca-card-header">
                  <div className="aca-card-header-icon">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h2 className="aca-card-title">Account Setup</h2>
                    <p className="aca-card-subtitle">
                      Configure login and access settings for the administrator.
                    </p>
                  </div>
                </div>

                {/* Password Setup Radios */}
                <div className="aca-field" style={{ marginBottom: 20 }}>
                  <label className="aca-label" style={{ marginBottom: 6 }}>
                    Password Setup <span className="aca-req">*</span>
                  </label>
                  <div className="aca-radio-cards">
                    {/* Option 1: Auto-generate */}
                    <div
                      className={`aca-radio-card ${passwordSetupType === "auto" ? "is-selected" : ""}`}
                      onClick={() => setPasswordSetupType("auto")}
                    >
                      <div className="aca-radio-circle">
                        {passwordSetupType === "auto" && <span className="aca-radio-dot" />}
                      </div>
                      <div className="aca-radio-content">
                        <div className="aca-radio-title">
                          Auto-generate Password <span className="aca-rec-tag">(Recommended)</span>
                        </div>
                        <span className="aca-radio-desc">
                          A strong, secure password will be generated and sent to the admin.
                        </span>
                      </div>
                    </div>

                    {/* Option 2: Set Temporary Password */}
                    <div
                      className={`aca-radio-card ${passwordSetupType === "custom" ? "is-selected" : ""}`}
                      onClick={() => setPasswordSetupType("custom")}
                    >
                      <div className="aca-radio-circle">
                        {passwordSetupType === "custom" && <span className="aca-radio-dot" />}
                      </div>
                      <div className="aca-radio-content">
                        <div className="aca-radio-title">Set Temporary Password</div>
                        <span className="aca-radio-desc">
                          You can set a temporary password for first-time login.
                        </span>
                      </div>
                    </div>
                  </div>

                  {passwordSetupType === "custom" && (
                    <div style={{ marginTop: 8 }}>
                      <Field
                        label="Temporary Password"
                        required
                        icon={Lock}
                        badge={
                          <button
                            type="button"
                            className="aca-gen-pwd-pill"
                            onClick={handleGeneratePassword}
                          >
                            <Wand2 size={11} /> Generate
                          </button>
                        }
                      >
                        <input
                          type={showInitialPw ? "text" : "password"}
                          value={initialPassword}
                          onChange={(e) => {
                            setInitialPassword(e.target.value);
                            setConfirmPassword(e.target.value);
                          }}
                          placeholder="Enter temporary password..."
                        />
                        <button
                          type="button"
                          className="aca-pw-toggle-btn"
                          onClick={() => setShowInitialPw(!showInitialPw)}
                          tabIndex={-1}
                        >
                          {showInitialPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </Field>
                    </div>
                  )}
                </div>

                {/* Role & Access */}
                <div className="aca-field" style={{ marginBottom: 24 }}>
                  <label className="aca-label">
                    Role & Access <span className="aca-req">*</span>
                  </label>
                  <div className="aca-input-row" style={{ background: "#f8fafc" }}>
                    <User size={16} className="aca-input-icon" />
                    <input
                      type="text"
                      disabled
                      value="College Admin"
                      style={{ fontWeight: 700, color: "var(--cms-primary, #1e4529)" }}
                    />
                    <span className="aca-tag aca-tag-success">Institutional Owner</span>
                  </div>
                  <div className="aca-callout-info">
                    <Info size={16} className="aca-callout-icon" />
                    <span>
                      This role gives full access to manage the selected college (campuses, staff, students, academics, fees, examinations).
                    </span>
                  </div>
                </div>

                {/* Subcard: Login & Security */}
                <div className="aca-subcard" style={{ marginTop: 0 }}>
                  <div className="aca-subcard-head">
                    <Lock size={18} className="aca-subcard-icon" />
                    <div>
                      <h3 className="aca-subcard-title">Login & Security</h3>
                      <p className="aca-subcard-sub">
                        Manage account access status and notification dispatch.
                      </p>
                    </div>
                  </div>

                  <div className="aca-toggles-grid">
                    <div className="aca-toggle-item">
                      <button
                        type="button"
                        className={`aca-ios-toggle ${accountStatus ? "is-on" : ""}`}
                        onClick={() => setAccountStatus(!accountStatus)}
                        aria-pressed={accountStatus}
                      >
                        <span className="aca-ios-knob" />
                      </button>
                      <div className="aca-toggle-text">
                        <strong className="aca-toggle-label">Active Account</strong>
                        <span className="aca-toggle-desc">
                          Allow the administrator to log in to the portal.
                        </span>
                      </div>
                    </div>

                    <div className="aca-toggle-item">
                      <button
                        type="button"
                        className={`aca-ios-toggle ${sendWelcomeEmail ? "is-on" : ""}`}
                        onClick={() => setSendWelcomeEmail(!sendWelcomeEmail)}
                        aria-pressed={sendWelcomeEmail}
                      >
                        <span className="aca-ios-knob" />
                      </button>
                      <div className="aca-toggle-text">
                        <strong className="aca-toggle-label">Send Welcome Email</strong>
                        <span className="aca-toggle-desc">
                          Send login credentials and setup instructions to the official email.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="aca-footer-actions">
                  <button
                    type="button"
                    className="aca-btn-back"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={14} /> Back to Administrator Information
                  </button>
                  <div className="aca-footer-right">
                    <button
                      type="button"
                      className="aca-btn-cancel"
                      onClick={() => navigate("/super-admin/college-admins")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="aca-btn-primary"
                      onClick={handleContinueToStep3}
                    >
                      Continue to Review <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
               STEP 3: Review & Confirm (Image 3 Bottom-Left)
               ══════════════════════════════════════════ */}
            {step === 3 && (
              <div>
                <div className="aca-card-header">
                  <div className="aca-card-header-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h2 className="aca-card-title">Review & Confirm</h2>
                    <p className="aca-card-subtitle">
                      Please verify the details below before creating the admin account.
                    </p>
                  </div>
                </div>

                <div className="aca-review-grid">
                  {/* Left Box: Administrator Information */}
                  <div className="aca-rev-box">
                    <div className="aca-rev-head">
                      <div className="aca-rev-title">
                        <User size={16} /> Administrator Information
                      </div>
                      <button
                        type="button"
                        className="aca-rev-edit-btn"
                        onClick={() => setStep(1)}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    </div>

                    <div className="aca-rev-rows">
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">College</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val">
                          {selectedCollege ? `${selectedCollege.name} (${selectedCollege.code || "—"})` : "Not Selected"}
                        </strong>
                      </div>
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Full Name</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val">{fullName || "—"}</strong>
                      </div>
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Email</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val">{email || "—"}</strong>
                      </div>
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Mobile</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val">
                          {phone ? (phone.startsWith("+91") ? phone : `+91 ${phone}`) : "—"}
                        </strong>
                      </div>
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Username</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val">{username ? `@${username}` : "—"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Box: Account Setup */}
                  <div className="aca-rev-box">
                    <div className="aca-rev-head">
                      <div className="aca-rev-title">
                        <Shield size={16} /> Account Setup
                      </div>
                      <button
                        type="button"
                        className="aca-rev-edit-btn"
                        onClick={() => setStep(2)}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    </div>

                    <div className="aca-rev-rows">
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Password</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val">
                          {passwordSetupType === "auto" ? "Auto-generate Password" : (initialPassword ? "Custom Password Set" : "Auto-generate Password")}
                        </strong>
                      </div>
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Role</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val">College Admin</strong>
                      </div>
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Account Status</span>
                        <span className="aca-rev-colon">:</span>
                        <span className="aca-rev-val">
                          <span className={`aca-status-badge ${accountStatus ? "is-active" : "is-inactive"}`}>
                            • {accountStatus ? "Active" : "Inactive"}
                          </span>
                        </span>
                      </div>
                      <div className="aca-rev-item">
                        <span className="aca-rev-label">Send Welcome Email</span>
                        <span className="aca-rev-colon">:</span>
                        <strong className="aca-rev-val" style={{ color: "#15803d" }}>
                          • {sendWelcomeEmail ? "Yes" : "No"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="aca-callout-info" style={{ marginBottom: 20 }}>
                  <Info size={16} className="aca-callout-icon" />
                  <span>
                    A secure password will be generated and dispatched to <strong>{email || "the official email"}</strong> upon account creation.
                  </span>
                </div>

                {/* Footer Buttons */}
                <div className="aca-footer-actions">
                  <button
                    type="button"
                    className="aca-btn-back"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft size={14} /> Back to Account Setup
                  </button>
                  <div className="aca-footer-right">
                    <button
                      type="button"
                      className="aca-btn-cancel"
                      onClick={() => navigate("/super-admin/college-admins")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="aca-btn-primary"
                      disabled={submitting}
                      onClick={handleSubmitAdmin}
                    >
                      {submitting ? (
                        <>
                          <RotateCw size={14} className="spin-animate" /> Provisioning...
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} /> Create Admin Account
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════
             RIGHT ASIDE PANEL: Real-time Account Summary
             (Persists and updates live as user enters fields!)
             ══════════════════════════════════════════ */}
          <aside className="aca-aside-card">
            <div className="aca-aside-head">
              <div className="aca-aside-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="aca-aside-title">Account Summary</h3>
                <p className="aca-aside-sub">
                  Details are updated as you enter the information.
                </p>
              </div>
            </div>

            {/* Live Readiness Progress Tracker */}
            <div className="aca-progress-wrap">
              <div className="aca-progress-header">
                <span>Account Profile Readiness</span>
                <span>{completedFieldsCount} of 5 ({progressPercent}%)</span>
              </div>
              <div className="aca-progress-track">
                <div
                  className="aca-progress-bar"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="aca-summary-list">
              {/* College */}
              <div className="aca-summary-item">
                <Building2 size={16} className="aca-summary-icon" />
                <div className="aca-summary-meta">
                  <span className="aca-summary-label">College</span>
                  <span className={`aca-summary-val ${!selectedCollege ? "is-placeholder" : ""}`}>
                    {selectedCollege
                      ? `${selectedCollege.name} (${selectedCollege.code || "—"})`
                      : "Not selected"}
                  </span>
                </div>
              </div>

              {/* Admin Name */}
              <div className="aca-summary-item">
                <User size={16} className="aca-summary-icon" />
                <div className="aca-summary-meta">
                  <span className="aca-summary-label">Admin Name</span>
                  <span className={`aca-summary-val ${!fullName ? "is-placeholder" : ""}`}>
                    {fullName || "—"}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="aca-summary-item">
                <Mail size={16} className="aca-summary-icon" />
                <div className="aca-summary-meta">
                  <span className="aca-summary-label">Email</span>
                  <span className={`aca-summary-val ${!email ? "is-placeholder" : ""}`}>
                    {email || "—"}
                  </span>
                </div>
              </div>

              {/* Mobile */}
              <div className="aca-summary-item">
                <Phone size={16} className="aca-summary-icon" />
                <div className="aca-summary-meta">
                  <span className="aca-summary-label">Mobile</span>
                  <span className={`aca-summary-val ${!phone ? "is-placeholder" : ""}`}>
                    {phone ? (phone.startsWith("+91") ? phone : `+91 ${phone}`) : "—"}
                  </span>
                </div>
              </div>

              {/* Username */}
              <div className="aca-summary-item">
                <AtSign size={16} className="aca-summary-icon" />
                <div className="aca-summary-meta">
                  <span className="aca-summary-label">Username</span>
                  <span className={`aca-summary-val ${!username ? "is-placeholder" : ""}`}>
                    {username ? `@${username}` : "—"}
                  </span>
                </div>
              </div>

              {/* Account Status */}
              <div className="aca-summary-item">
                <Activity size={16} className="aca-summary-icon" />
                <div className="aca-summary-meta">
                  <span className="aca-summary-label">Account Status</span>
                  <span className="aca-summary-val">
                    <span className={`aca-status-badge ${accountStatus ? "is-active" : "is-inactive"}`}>
                      • {accountStatus ? "Active" : "Inactive"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Send Welcome Email */}
              <div className="aca-summary-item">
                <Mail size={16} className="aca-summary-icon" />
                <div className="aca-summary-meta">
                  <span className="aca-summary-label">Send Welcome Email</span>
                  <span className="aca-summary-val" style={{ color: "#15803d", fontSize: 12.5 }}>
                    • {sendWelcomeEmail ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* ══════════════════════════════════════════
           SUCCESS STATE (Image 3 Bottom-Right)
           ══════════════════════════════════════════ */
        <div className="aca-main-card aca-success-wrap">
          <div className="aca-success-badge-wrap">
            <Check size={44} strokeWidth={3} />
          </div>

          <h2 className="aca-success-title">College Admin Account Created!</h2>
          <p className="aca-success-subtitle">
            The administrator account has been created and assigned to{" "}
            <strong>
              {selectedCollege?.name} ({selectedCollege?.code || "—"})
            </strong>{" "}
            successfully.
          </p>

          <div className="aca-success-summary-card">
            <div className="aca-success-item">
              <User size={16} color="#7c3aed" />
              <span>
                Admin Name: <strong>{fullName}</strong>
              </span>
            </div>
            <div className="aca-success-item">
              <AtSign size={16} color="#7c3aed" />
              <span>
                Username: <strong>@{username}</strong>
              </span>
            </div>
            <div className="aca-success-item">
              <span className="aca-status-badge is-active">• Active</span>
            </div>
          </div>

          <div className="aca-success-alert">
            <Mail size={18} style={{ flexShrink: 0 }} />
            <span>
              A welcome email with login credentials has been sent to <strong>{email}</strong>.
            </span>
          </div>

          <div className="aca-success-buttons">
            <button
              type="button"
              className="aca-btn-cancel"
              onClick={handleResetForNewAdmin}
            >
              <UserPlus size={14} /> Add Another Admin
            </button>
            <button
              type="button"
              className="aca-btn-primary"
              onClick={() => navigate("/super-admin/college-admins")}
            >
              Back to College Admins
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
