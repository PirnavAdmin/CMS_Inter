import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import {
  getCollegeCodeSeriesSettings,
  formatCollegeCode,
  incrementCollegeCodeSequence,
} from "../superAdminNumberSeries.js";
import {
  Check, ChevronRight, ChevronLeft,
  Building2, Layers, UserCheck, ShieldCheck,
  AlertCircle, MapPin, Mail, Phone, Hash, BookOpen,
  User, Lock, Home, Loader2, CheckCircle2, Sparkles,
  GraduationCap, Bed, ClipboardCheck, Bus, Coins, Users,
  Eye, EyeOff, Info, Wand2, Pencil,
} from "lucide-react";
import collegeBuildingImg from "@/assets/college-illustration.png";
import modulesServerImg from "@/assets/modules-server-illustration.png";
import adminShieldImg from "@/assets/admin-shield-illustration.png";
import activateBadgeImg from "@/assets/activate-badge-illustration.png";
import "./RegisterCollegePage.css";

/* ─── Constants ─── */
const COLLEGE_TYPES = [
  "Junior College", "Degree College", "Engineering College",
  "Medical College", "Pharmacy College", "Law College",
  "Arts & Science College", "Commerce College", "Polytechnic",
  "ITI", "Post Graduate College", "Research Institute", "Other",
];

const POPULAR_COLLEGE_TYPES = [
  "Junior College", "Degree College", "Engineering College", "Medical College",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
  "Chandigarh", "Andaman & Nicobar", "Lakshadweep",
];

/* 6 Primary ERP Modules (Image 1 & Image 5 Reference) */
const ERP_MODULES_CONFIG = [
  {
    id: "Academic",
    name: "Academic Management",
    desc: "Courses, classes, sections, subjects",
    icon: GraduationCap,
    iconColor: "#7c3aed",
    bgColor: "#f5f3ff",
  },
  {
    id: "Hostel",
    name: "Hostel Management",
    desc: "Hostel, rooms, allotment, mess",
    icon: Bed,
    iconColor: "#6366f1",
    bgColor: "#eef2ff",
  },
  {
    id: "Exams",
    name: "Examination & Results",
    desc: "Exams, marks, results, hall tickets",
    icon: ClipboardCheck,
    iconColor: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
  {
    id: "Transport",
    name: "Transport Management",
    desc: "Routes, vehicles, students, tracking",
    icon: Bus,
    iconColor: "#7c3aed",
    bgColor: "#f5f3ff",
  },
  {
    id: "Fees",
    name: "Accounts & Fees",
    desc: "Fee collection, receipts, concessions",
    icon: Coins,
    iconColor: "#d97706",
    bgColor: "#fffbeb",
  },
  {
    id: "Payroll",
    name: "Payroll Management",
    desc: "Staff payroll, salary, deductions",
    icon: Users,
    iconColor: "#4f46e5",
    bgColor: "#eef2ff",
  },
];

const SUBSCRIPTION_PLANS = [
  { name: "Free", price: 0, limit: 25 },
  { name: "Basic", price: 1499, limit: 100 },
  { name: "Standard", price: 2999, limit: 300 },
  { name: "Premium", price: 5999, limit: 1000 },
  { name: "Enterprise", price: 12999, limit: 5000 },
];

/* Fast offline fallback for common Indian pincodes */
function getLocalPincodeInfo(pin) {
  const p = String(pin).trim();
  const exactMap = {
    "500081": { city: "Hyderabad", state: "Telangana" },
    "500001": { city: "Hyderabad", state: "Telangana" },
    "500032": { city: "Hyderabad", state: "Telangana" },
    "500072": { city: "Hyderabad", state: "Telangana" },
    "500084": { city: "Hyderabad", state: "Telangana" },
    "500034": { city: "Hyderabad", state: "Telangana" },
    "560001": { city: "Bengaluru", state: "Karnataka" },
    "560100": { city: "Bengaluru", state: "Karnataka" },
    "400001": { city: "Mumbai", state: "Maharashtra" },
    "411001": { city: "Pune", state: "Maharashtra" },
    "110001": { city: "New Delhi", state: "Delhi" },
    "600001": { city: "Chennai", state: "Tamil Nadu" },
    "700001": { city: "Kolkata", state: "West Bengal" },
    "520001": { city: "Vijayawada", state: "Andhra Pradesh" },
    "530001": { city: "Visakhapatnam", state: "Andhra Pradesh" },
  };
  if (exactMap[p]) return exactMap[p];

  const prefix2 = parseInt(p.substring(0, 2), 10);
  const prefix3 = parseInt(p.substring(0, 3), 10);

  if (prefix3 >= 500 && prefix3 <= 509) return { city: "Hyderabad", state: "Telangana" };
  if (prefix2 === 50) return { city: "Warangal", state: "Telangana" };
  if (prefix2 >= 51 && prefix2 <= 53) return { city: "Vijayawada", state: "Andhra Pradesh" };
  if (prefix3 >= 560 && prefix3 <= 562) return { city: "Bengaluru", state: "Karnataka" };
  if (prefix2 >= 56 && prefix2 <= 59) return { city: "Bengaluru", state: "Karnataka" };
  if (prefix3 >= 400 && prefix3 <= 402) return { city: "Mumbai", state: "Maharashtra" };
  if (prefix2 >= 40 && prefix2 <= 44) return { city: "Pune", state: "Maharashtra" };
  if (prefix2 === 11) return { city: "New Delhi", state: "Delhi" };
  if (prefix2 >= 12 && prefix2 <= 13) return { city: "Gurugram", state: "Haryana" };
  if (prefix2 >= 14 && prefix2 <= 16) return { city: "Chandigarh", state: "Punjab" };
  if (prefix2 === 17) return { city: "Shimla", state: "Himachal Pradesh" };
  if (prefix2 >= 18 && prefix2 <= 19) return { city: "Srinagar", state: "Jammu & Kashmir" };
  if (prefix2 >= 20 && prefix2 <= 28) return { city: "Noida", state: "Uttar Pradesh" };
  if (prefix2 >= 30 && prefix2 <= 34) return { city: "Jaipur", state: "Rajasthan" };
  if (prefix2 >= 36 && prefix2 <= 39) return { city: "Ahmedabad", state: "Gujarat" };
  if (prefix2 >= 45 && prefix2 <= 48) return { city: "Indore", state: "Madhya Pradesh" };
  if (prefix2 === 49) return { city: "Raipur", state: "Chhattisgarh" };
  if (prefix3 >= 600 && prefix3 <= 603) return { city: "Chennai", state: "Tamil Nadu" };
  if (prefix2 >= 60 && prefix2 <= 64) return { city: "Coimbatore", state: "Tamil Nadu" };
  if (prefix2 >= 67 && prefix2 <= 69) return { city: "Kochi", state: "Kerala" };
  if (prefix3 >= 700 && prefix3 <= 703) return { city: "Kolkata", state: "West Bengal" };
  if (prefix2 >= 70 && prefix2 <= 74) return { city: "Kolkata", state: "West Bengal" };
  if (prefix2 >= 75 && prefix2 <= 77) return { city: "Bhubaneswar", state: "Odisha" };
  if (prefix2 >= 78 && prefix2 <= 79) return { city: "Guwahati", state: "Assam" };
  if (prefix2 >= 80 && prefix2 <= 85) return { city: "Patna", state: "Bihar" };

  return null;
}

const STEPS = [
  { num: 1, label: "College Profile", icon: Building2 },
  { num: 2, label: "Plan & Modules", icon: Layers },
  { num: 3, label: "College Admin", icon: UserCheck },
  { num: 4, label: "Review & Activate", icon: ShieldCheck },
];

/* ─── Field with leading icon & optional badge ─── */
function Field({ label, required, icon: Icon, badge, fullWidth, children }) {
  return (
    <div className={`rcf-field ${fullWidth ? "rcf-field-full" : ""}`}>
      <div className="rcf-label-row">
        <label className="rcf-label">
          {label} {required && <span className="rcf-req">*</span>}
        </label>
        {badge}
      </div>
      <div className="rcf-input-row">
        {Icon && <Icon size={15} className="rcf-input-icon" />}
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
export default function RegisterCollegePage() {
  const navigate = useNavigate();
  const { data, update } = useSuperAdmin();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ── Step 1 State: Profile ── */
  const [profile, setProfile] = useState({
    name: "",
    code: "",
    codeAuto: true,
    collegeType: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    email: "",
    phone: "",
  });

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [pincodeMsg, setPincodeMsg] = useState("");
  const [autoFilled, setAutoFilled] = useState({ city: false, state: false });

  /* ── Step 2 State: Plan & Modules (Image 5 Reference) ── */
  const [planConfig, setPlanConfig] = useState({
    plan: "Standard",
    accountLimit: 300,
    modules: ["Academic", "Hostel", "Exams", "Transport", "Fees"], // 5 of 6 enabled
  });

  /* ── Step 3 State: Primary College Admin (Anti-autofill, starts empty) ── */
  const [adminConfig, setAdminConfig] = useState({
    adminName: "",
    adminEmail: "",
    adminUsername: "",
    adminUsernameTouched: false,
    adminPhone: "",
    adminPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* ── Helpers ── */
  const pp = (key, val) => setProfile((p) => ({ ...p, [key]: val }));

  // Initialize code from user-configured College Code Series
  useEffect(() => {
    const seriesConf = getCollegeCodeSeriesSettings();
    const baseCount = Math.max(Number(seriesConf.currentSequence) || 0, data?.colleges?.length || 14);
    const initialCode = formatCollegeCode(seriesConf, baseCount + 1);
    setProfile((prev) => ({ ...prev, code: prev.code || initialCode }));
  }, [data?.colleges?.length]);

  /* Smart auto-code generation for Step 1 */
  const handleCollegeNameChange = (val) => {
    setProfile((prev) => {
      let nextCode = prev.code;
      if (prev.codeAuto) {
        const words = val.trim().split(/\s+/).filter(Boolean);
        const acronym = words.length >= 2 ? words.map((w) => w[0]).join("").toUpperCase() : val.trim().slice(0, 4).toUpperCase();
        const seriesConf = getCollegeCodeSeriesSettings();
        const baseCount = Math.max(Number(seriesConf.currentSequence) || 0, data?.colleges?.length || 14);
        nextCode = formatCollegeCode(seriesConf, baseCount + 1, acronym || seriesConf.prefix);
        return { ...prev, name: val, code: nextCode };
      }
      return { ...prev, name: val };
    });
  };

  /* Pincode Auto-fetch */
  const handlePincodeChange = async (val) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    pp("pincode", cleaned);

    if (cleaned.length < 6) {
      setPincodeStatus(null);
      setPincodeMsg("");
      return;
    }

    setPincodeLoading(true);
    setPincodeMsg("Fetching city and state...");

    const localInfo = getLocalPincodeInfo(cleaned);
    let resolvedCity = localInfo?.city || "";
    let resolvedState = localInfo?.state || "";

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
      const dataJson = await res.json();
      if (Array.isArray(dataJson) && dataJson[0]?.Status === "Success" && dataJson[0]?.PostOffice?.length > 0) {
        const po = dataJson[0].PostOffice[0];
        const district = po.District || po.Division || po.Block || po.Name || "";
        const stateName = po.State || "";

        if (district) resolvedCity = district;
        if (stateName) {
          const matchedState = INDIAN_STATES.find(
            (s) => s.toLowerCase() === stateName.toLowerCase()
          );
          resolvedState = matchedState || stateName;
        }
      }
    } catch {
      // Offline fallback
    }

    if (resolvedCity || resolvedState) {
      setProfile((prev) => ({
        ...prev,
        city: resolvedCity || prev.city,
        state: resolvedState || prev.state,
      }));
      setAutoFilled({
        city: Boolean(resolvedCity),
        state: Boolean(resolvedState),
      });
      setPincodeStatus("success");
      setPincodeMsg(`Auto-detected: ${resolvedCity ? resolvedCity + ", " : ""}${resolvedState}`);
    } else {
      setPincodeStatus("error");
      setPincodeMsg("Pincode not recognized. Please fill City and State manually.");
    }

    setPincodeLoading(false);
  };

  /* Step 2 Plan Selection */
  const handlePlanSelect = (planName) => {
    const p = SUBSCRIPTION_PLANS.find((pl) => pl.name === planName) || { name: planName, limit: 100 };
    setPlanConfig((prev) => ({
      ...prev,
      plan: p.name,
      accountLimit: p.limit,
    }));
  };

  /* Step 2 Toggle Module */
  const toggleModule = (id) => {
    setPlanConfig((prev) => {
      const exists = prev.modules.includes(id);
      const next = exists
        ? prev.modules.filter((m) => m !== id)
        : [...prev.modules, id];
      return { ...prev, modules: next };
    });
  };

  /* Step 3 Admin Name Auto-suggests Username */
  const handleAdminNameChange = (val) => {
    setAdminConfig((prev) => {
      const cleanName = val.trim().toLowerCase();
      const suggestedUser = cleanName ? cleanName.replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".") : "";
      return {
        ...prev,
        adminName: val,
        adminUsername: prev.adminUsernameTouched ? prev.adminUsername : suggestedUser,
      };
    });
  };

  /* Generate Secure Password for Admin */
  const handleGeneratePassword = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pwd = `Admin@${randomNum}!`;
    setAdminConfig((prev) => ({
      ...prev,
      adminPassword: pwd,
      confirmPassword: pwd,
    }));
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  /* ── Dynamic Checklist for Step 1 ── */
  const step1Requirements = useMemo(
    () => [
      { label: "College basic details", done: Boolean(profile.name.trim() && profile.code.trim()) },
      { label: "College type selected", done: Boolean(profile.collegeType) },
      { label: "Location & address details", done: Boolean(profile.address.trim()) },
      { label: "City, state & pincode", done: Boolean(profile.pincode.length === 6 && profile.city && profile.state) },
      { label: "Official contact information", done: Boolean(profile.email.trim() && profile.phone.trim()) },
    ],
    [profile]
  );

  const step1CompletedCount = useMemo(
    () => step1Requirements.filter((r) => r.done).length,
    [step1Requirements]
  );

  /* ── Validation ── */
  const v1 = () => {
    if (!profile.name.trim()) return "College Name is required.";
    if (!profile.code.trim()) return "Registration Code is required.";
    if (!profile.collegeType) return "Please select a College Type.";
    if (!profile.address.trim()) return "Address is required.";
    if (!profile.pincode.trim() || profile.pincode.length !== 6)
      return "Please enter a valid 6-digit Pincode.";
    if (!profile.city.trim()) return "City is required.";
    if (!profile.state) return "State is required.";
    if (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
      return "A valid Official Email is required.";
    if (!profile.phone.trim()) return "Contact Number is required.";
    return null;
  };

  const v2 = () => {
    if (planConfig.modules.length === 0) return "Please enable at least one ERP module.";
    if (!planConfig.accountLimit || planConfig.accountLimit < 1) return "Please specify Max Account Capacity.";
    return null;
  };

  const v3 = () => {
    if (!adminConfig.adminName.trim()) return "Admin Full Name is required.";
    if (!adminConfig.adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminConfig.adminEmail))
      return "A valid Official Email is required.";
    if (!adminConfig.adminUsername.trim()) return "Username is required.";
    if (adminConfig.adminUsername.trim().length < 3) return "Username must be at least 3 characters.";
    if (!adminConfig.adminPhone.trim()) return "Mobile Number is required.";
    if (!adminConfig.adminPassword) return "Initial Password is required.";
    if (adminConfig.adminPassword.length < 6) return "Password must be at least 6 characters.";
    if (adminConfig.adminPassword !== adminConfig.confirmPassword)
      return "Passwords do not match. Please verify Confirm Password.";
    return null;
  };

  const handleNext = () => {
    setError("");
    if (step === 1) { const e = v1(); if (e) { setError(e); return; } }
    if (step === 2) { const e = v2(); if (e) { setError(e); return; } }
    if (step === 3) { const e = v3(); if (e) { setError(e); return; } }
    setStep((s) => Math.min(s + 1, 4));
  };

  const handlePrev = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setError(""); setSubmitting(true);
    const payload = {
      name: profile.name.trim(),
      code: profile.code.trim().toUpperCase(),
      email: profile.email.trim().toLowerCase(),
      phone: profile.phone.trim(),
      address: [profile.address, profile.city, profile.state, profile.pincode].filter(Boolean).join(", "),
      city: profile.city.trim(),
      state: profile.state,
      pincode: profile.pincode.trim(),
      collegeType: profile.collegeType,
      admin: adminConfig.adminName.trim(),
      adminEmail: adminConfig.adminEmail.trim().toLowerCase(),
      adminUsername: adminConfig.adminUsername.trim(),
      adminPhone: adminConfig.adminPhone.trim(),
      adminPassword: adminConfig.adminPassword,
      plan: planConfig.plan,
      accountLimit: Number(planConfig.accountLimit),
      modules: planConfig.modules,
      status: "Active",
    };

    try {
      const ok = await update("Registered new college", null, { module: "Colleges", actionType: "Create", payload });
      if (ok) {
        try {
          incrementCollegeCodeSequence();
        } catch (err) {
          console.warn("Failed to increment college code sequence:", err);
        }
        navigate("/super-admin/college-management");
      }
      else setError("Failed to register college. Please verify details and try again.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ═══ RENDER ═══ */
  return (
    <div className="rcf-page">

      {/* ── Breadcrumb ── */}
      <nav className="rcf-breadcrumb">
        <button type="button" onClick={() => navigate("/super-admin/college-management")}>
          <Home size={13} /> College Management
        </button>
        <span className="rcf-bc-sep">›</span>
        <span>Register New College</span>
      </nav>

      {/* ── Page Header ── */}
      <div className="rcf-page-header">
        <div className="rcf-page-header-icon">
          <Building2 size={28} />
        </div>
        <div>
          <h1>Register New College</h1>
          <p>Add a new college to your organisation in a few simple steps.</p>
        </div>
      </div>

      {/* ── Stepper (Interactive) ── */}
      <div className="rcf-stepper-bar">
        {STEPS.map((s, i) => {
          const done = step > s.num;
          const active = step === s.num;
          const clickable = s.num < step;
          return (
            <div
              key={s.num}
              className={`rcf-step ${active ? "is-active" : ""} ${done ? "is-done" : ""} ${clickable ? "is-clickable" : ""}`}
              onClick={() => { if (clickable) setStep(s.num); }}
              title={clickable ? `Go back to ${s.label}` : ""}
            >
              <div className="rcf-step-bubble">
                {done ? <Check size={13} strokeWidth={3} /> : <span>{s.num}</span>}
              </div>
              <span className="rcf-step-label">{s.label}</span>
              {i < STEPS.length - 1 && (
                <div className="rcf-connector">
                  <div className="rcf-connector-fill" style={{ width: done ? "100%" : "0%" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="rcf-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════
         STEP 1: College Profile (Interactive)
         ══════════════════════════════════════════ */}
      {step === 1 && (
        <div className="rcf-step-layout">
          <div className="rcf-card">
            <div className="rcf-card-head">
              <div className="rcf-card-head-icon">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="rcf-card-title">Step 1: <span>College Profile</span></h2>
                <p className="rcf-card-sub">Enter the basic details of the college.</p>
              </div>
            </div>

            <div className="rcf-grid">
              {/* College Name */}
              <Field
                label="College Name"
                required
                icon={Building2}
                badge={profile.name.trim() ? <span className="rcf-auto-badge rcf-auto-success"><Check size={10} strokeWidth={3} /> Valid</span> : null}
              >
                <input
                  type="text"
                  placeholder="e.g. ABC Degree College"
                  value={profile.name}
                  onChange={(e) => handleCollegeNameChange(e.target.value)}
                  autoComplete="off"
                />
              </Field>

              {/* Registration Code */}
              <Field
                label="Registration Code"
                required
                icon={Hash}
                badge={
                  profile.code ? (
                    <span className="rcf-auto-badge rcf-auto-success">
                      <Sparkles size={10} /> {profile.codeAuto ? "Auto-suggested" : "Custom"}
                    </span>
                  ) : null
                }
              >
                <input
                  type="text"
                  placeholder="e.g. ABCDC01"
                  value={profile.code}
                  onChange={(e) => setProfile((p) => ({ ...p, code: e.target.value.toUpperCase(), codeAuto: false }))}
                  autoComplete="off"
                />
              </Field>

              {/* College Type with Quick Click Pills */}
              <div className="rcf-field rcf-field-full">
                <div className="rcf-label-row">
                  <label className="rcf-label">
                    College Type <span className="rcf-req">*</span>
                  </label>
                  {profile.collegeType && (
                    <span className="rcf-auto-badge rcf-auto-success">
                      <Check size={10} strokeWidth={3} /> Selected
                    </span>
                  )}
                </div>
                <div className="rcf-input-row">
                  <BookOpen size={15} className="rcf-input-icon" />
                  <select
                    value={profile.collegeType}
                    onChange={(e) => pp("collegeType", e.target.value)}
                  >
                    <option value="">Select college type...</option>
                    {COLLEGE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="rcf-quick-types-row">
                  <span className="rcf-quick-types-label">Quick select:</span>
                  {POPULAR_COLLEGE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`rcf-type-pill ${profile.collegeType === t ? "is-active" : ""}`}
                      onClick={() => pp("collegeType", t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <Field label="Address" required icon={MapPin} fullWidth>
                <input
                  type="text"
                  placeholder="e.g. Madhapur, Main Campus Road"
                  value={profile.address}
                  onChange={(e) => pp("address", e.target.value)}
                  autoComplete="off"
                />
              </Field>

              {/* PINCODE placed BEFORE City & State */}
              <Field
                label="Pincode"
                required
                icon={Hash}
                badge={
                  pincodeLoading ? (
                    <span className="rcf-auto-badge rcf-auto-loading">
                      <Loader2 size={10} className="rcf-spin" /> Fetching...
                    </span>
                  ) : pincodeStatus === "success" ? (
                    <span className="rcf-auto-badge rcf-auto-success">
                      <Sparkles size={10} /> Auto-detected
                    </span>
                  ) : null
                }
              >
                <div className="rcf-pin-box">
                  <input
                    type="text"
                    placeholder="e.g. 500081"
                    maxLength={6}
                    value={profile.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    className={pincodeStatus === "success" ? "is-valid" : ""}
                    autoComplete="off"
                  />
                  {pincodeLoading && (
                    <Loader2 size={15} className="rcf-spin rcf-pin-trailing" />
                  )}
                  {!pincodeLoading && pincodeStatus === "success" && (
                    <CheckCircle2 size={16} className="rcf-pin-trailing rcf-trailing-green" />
                  )}
                </div>
              </Field>

              {/* City (Auto-filled) */}
              <Field
                label="City"
                required
                icon={Building2}
                badge={
                  autoFilled.city ? (
                    <span className="rcf-auto-badge rcf-auto-success">
                      <Check size={10} strokeWidth={3} /> Auto-filled
                    </span>
                  ) : null
                }
              >
                <input
                  type="text"
                  placeholder="e.g. Hyderabad"
                  value={profile.city}
                  onChange={(e) => {
                    pp("city", e.target.value);
                    if (autoFilled.city) setAutoFilled((a) => ({ ...a, city: false }));
                  }}
                  className={autoFilled.city ? "is-autofilled" : ""}
                  autoComplete="off"
                />
              </Field>

              {/* State (Auto-filled) */}
              <Field
                label="State"
                required
                icon={MapPin}
                badge={
                  autoFilled.state ? (
                    <span className="rcf-auto-badge rcf-auto-success">
                      <Check size={10} strokeWidth={3} /> Auto-filled
                    </span>
                  ) : null
                }
              >
                <select
                  value={profile.state}
                  onChange={(e) => {
                    pp("state", e.target.value);
                    if (autoFilled.state) setAutoFilled((a) => ({ ...a, state: false }));
                  }}
                  className={autoFilled.state ? "is-autofilled" : ""}
                >
                  <option value="">Select state...</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              {/* Official Email */}
              <Field label="Official Email" required icon={Mail}>
                <input
                  type="email"
                  placeholder="info@abcdegree.ac.in"
                  value={profile.email}
                  onChange={(e) => pp("email", e.target.value)}
                  autoComplete="off"
                />
              </Field>

              {/* Contact Number */}
              <Field label="Contact Number" required icon={Phone} fullWidth>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={profile.phone}
                  onChange={(e) => pp("phone", e.target.value)}
                  autoComplete="off"
                />
              </Field>
            </div>

            {pincodeMsg && (
              <div className={`rcf-pin-status-banner ${pincodeStatus === "error" ? "is-err" : "is-ok"}`}>
                {pincodeStatus === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                <span>{pincodeMsg}</span>
              </div>
            )}
          </div>

          {/* Interactive Aside Card for Step 1 */}
          <aside className="rcf-aside">
            <div className="rcf-aside-visual">
              <img
                src={collegeBuildingImg}
                alt="College Illustration"
                className="rcf-aside-img"
              />
            </div>
            <div className="rcf-aside-body">
              {/* Live Preview Card */}
              <div className="rcf-live-preview-box">
                <span className="rcf-live-tag">LIVE PREVIEW</span>
                <strong className="rcf-live-college-title">
                  {profile.name.trim() || "College Name"}
                </strong>
                <div className="rcf-live-badges">
                  <span className="rcf-live-badge-code">
                    {profile.code.trim() || "CODE"}
                  </span>
                  <span className="rcf-live-badge-type">
                    {profile.collegeType || "College Type"}
                  </span>
                </div>
                <div className="rcf-live-loc-text">
                  📍 {[profile.city, profile.state].filter(Boolean).join(", ") || "City, State"}
                </div>
              </div>

              {/* Live Progress Indicator */}
              <div className="rcf-progress-wrap">
                <div className="rcf-progress-head">
                  <span>Profile Progress</span>
                  <strong>{Math.round((step1CompletedCount / step1Requirements.length) * 100)}%</strong>
                </div>
                <div className="rcf-progress-track">
                  <div
                    className="rcf-progress-fill"
                    style={{ width: `${(step1CompletedCount / step1Requirements.length) * 100}%` }}
                  />
                </div>
              </div>

              <ul className="rcf-checklist">
                {step1Requirements.map((item) => (
                  <li key={item.label} className={item.done ? "is-checked" : ""}>
                    <span className={`rcf-check-dot ${item.done ? "is-done" : ""}`}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* ══════════════════════════════════════════
         STEP 2: Module Configuration (Image 1 & Image 5 Reference)
         ══════════════════════════════════════════ */}
      {step === 2 && (
        <div className="rcf-step-layout">
          <div className="rcf-card">
            <div className="rcf-card-head">
              <div className="rcf-card-head-icon">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="rcf-card-title">Step 2: <span>Module Configuration</span></h2>
                <p className="rcf-card-sub">Select a subscription plan and enable the required ERP modules for this college.</p>
              </div>
            </div>

            {/* Subscription Plans Section */}
            <div className="rcf-section-block">
              <div className="rcf-section-head">
                <h3 className="rcf-section-title">Subscription Plans</h3>
                <p className="rcf-section-sub">Choose a subscription plan for this college.</p>
              </div>

              <div className="rcf-plan-grid">
                {SUBSCRIPTION_PLANS.slice(0, 4).map((p) => {
                  const sel = planConfig.plan === p.name;
                  return (
                    <div
                      key={p.name}
                      className={`rcf-plan-card ${sel ? "is-sel" : ""}`}
                      onClick={() => handlePlanSelect(p.name)}
                    >
                      <div className="rcf-plan-top">
                        <strong>{p.name}</strong>
                        {sel && (
                          <span className="rcf-plan-tick">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div className="rcf-plan-price">
                        {p.price > 0 ? `₹${p.price.toLocaleString("en-IN")}` : "₹0"}
                        <small>/mo</small>
                      </div>
                      <div className="rcf-plan-cap">Up to {p.limit.toLocaleString("en-IN")} accounts</div>
                    </div>
                  );
                })}
              </div>

              {/* Max Account Capacity Row */}
              <div className="rcf-capacity-row">
                <label className="rcf-capacity-label">Max Account Capacity</label>
                <div className="rcf-capacity-input-wrap">
                  <Users size={16} className="rcf-capacity-icon" />
                  <input
                    type="number"
                    min="5"
                    max="50000"
                    value={planConfig.accountLimit}
                    onChange={(e) => setPlanConfig({ ...planConfig, accountLimit: Number(e.target.value) })}
                    className="rcf-capacity-input"
                  />
                </div>
              </div>
            </div>

            {/* ERP Modules Section with iOS style toggles */}
            <div className="rcf-section-block" style={{ marginTop: 20 }}>
              <div className="rcf-section-head">
                <h3 className="rcf-section-title">ERP Modules</h3>
                <p className="rcf-section-sub">Enable or disable the modules for this college.</p>
              </div>

              <div className="rcf-modules-toggle-grid">
                {ERP_MODULES_CONFIG.map((mod) => {
                  const isOn = planConfig.modules.includes(mod.id);
                  const IconComp = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      className={`rcf-mod-toggle-card ${isOn ? "is-active" : ""}`}
                      onClick={() => toggleModule(mod.id)}
                    >
                      <div
                        className="rcf-mod-icon-wrap"
                        style={{ color: mod.iconColor, background: mod.bgColor }}
                      >
                        <IconComp size={20} />
                      </div>
                      <div className="rcf-mod-meta">
                        <strong className="rcf-mod-name">{mod.name}</strong>
                        <span className="rcf-mod-desc">{mod.desc}</span>
                      </div>
                      <div className={`rcf-ios-toggle ${isOn ? "is-on" : ""}`}>
                        <span className="rcf-ios-knob" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Aside Card for Step 2 */}
          <aside className="rcf-aside">
            <div className="rcf-aside-visual">
              <img
                src={modulesServerImg}
                alt="Module Configuration"
                className="rcf-aside-img"
              />
            </div>
            <div className="rcf-aside-body">
              <div className="rcf-module-access-head">
                <Layers size={18} className="rcf-aside-head-icon" />
                <h3>Module Access</h3>
              </div>

              {/* Big Highlight Counter Box */}
              <div className="rcf-module-counter-box">
                <span className="rcf-counter-big">
                  {planConfig.modules.length} of {ERP_MODULES_CONFIG.length}
                </span>
                <span className="rcf-counter-sub">Modules Enabled</span>
              </div>

              {/* Dynamic Live Status Checklist */}
              <ul className="rcf-checklist rcf-module-checklist">
                {ERP_MODULES_CONFIG.map((m) => {
                  const enabled = planConfig.modules.includes(m.id);
                  return (
                    <li key={m.id} className={enabled ? "is-checked" : "is-disabled"}>
                      <span className={`rcf-check-dot ${enabled ? "is-done" : "is-muted"}`}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span>{m.name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* ══════════════════════════════════════════
         STEP 3: Primary College Admin (Anti-Autofill + Image 4)
         ══════════════════════════════════════════ */}
      {step === 3 && (
        <div className="rcf-step-layout">
          <div className="rcf-card">
            {/* Hidden Trap Inputs to absorb browser autofill */}
            <input type="text" name="fake_admin_username_trap" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
            <input type="password" name="fake_admin_password_trap" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

            {/* Header: Step 3: Primary College Admin */}
            <div className="rcf-card-head">
              <div className="rcf-card-head-icon">
                <UserCheck size={20} />
              </div>
              <div>
                <h2 className="rcf-card-title">Step 3: <span>Primary College Admin</span></h2>
                <p className="rcf-card-sub">Create the primary College Admin account for this college.</p>
              </div>
            </div>

            <div className="rcf-grid">
              {/* Row 1: Admin Full Name & Official Email */}
              <Field label="Admin Full Name" required icon={User}>
                <input
                  type="text"
                  name="cms_college_admin_fullname"
                  placeholder="e.g. Ramesh Kumar"
                  value={adminConfig.adminName}
                  onChange={(e) => handleAdminNameChange(e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <Field label="Official Email" required icon={Mail}>
                <input
                  type="email"
                  name="cms_college_admin_official_email"
                  placeholder="e.g. ramesh@abcdegree.ac.in"
                  value={adminConfig.adminEmail}
                  onChange={(e) => setAdminConfig({ ...adminConfig, adminEmail: e.target.value })}
                  autoComplete="off"
                />
              </Field>

              {/* Row 2: Username & Mobile Number */}
              <Field
                label="Username"
                required
                icon={User}
                badge={
                  adminConfig.adminUsername ? (
                    <span className="rcf-auto-badge rcf-auto-success">
                      <Sparkles size={10} /> Valid
                    </span>
                  ) : null
                }
              >
                <input
                  type="text"
                  name="cms_college_admin_account_user"
                  placeholder="e.g. ramesh.abc"
                  value={adminConfig.adminUsername}
                  onChange={(e) => setAdminConfig({
                    ...adminConfig,
                    adminUsername: e.target.value,
                    adminUsernameTouched: true,
                  })}
                  autoComplete="off"
                />
              </Field>

              <Field label="Mobile Number" required icon={Phone}>
                <input
                  type="tel"
                  name="cms_college_admin_phone_number"
                  placeholder="e.g. +91 98765 43210"
                  value={adminConfig.adminPhone}
                  onChange={(e) => setAdminConfig({ ...adminConfig, adminPhone: e.target.value })}
                  autoComplete="off"
                />
              </Field>

              {/* Row 3: Initial Password with Quick Generate & Visibility */}
              <Field
                label="Initial Password"
                required
                icon={Lock}
                badge={
                  <button
                    type="button"
                    className="rcf-gen-pwd-pill"
                    onClick={handleGeneratePassword}
                  >
                    <Wand2 size={11} /> Generate
                  </button>
                }
              >
                <div className="rcf-pw-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="cms_college_admin_initial_password"
                    placeholder="••••••••"
                    value={adminConfig.adminPassword}
                    onChange={(e) => setAdminConfig({ ...adminConfig, adminPassword: e.target.value })}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="rcf-pw-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>

              {/* Confirm Password */}
              <Field
                label="Confirm Password"
                required
                icon={Lock}
                badge={
                  adminConfig.confirmPassword && adminConfig.adminPassword === adminConfig.confirmPassword ? (
                    <span className="rcf-auto-badge rcf-auto-success">
                      <Check size={10} strokeWidth={3} /> Matches
                    </span>
                  ) : null
                }
              >
                <div className="rcf-pw-input-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="cms_college_admin_confirm_password"
                    placeholder="••••••••"
                    value={adminConfig.confirmPassword}
                    onChange={(e) => setAdminConfig({ ...adminConfig, confirmPassword: e.target.value })}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="rcf-pw-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>

            {/* Information Notice Box (Image 4) */}
            <div className="rcf-admin-info-box">
              <Info size={18} className="rcf-admin-info-icon" />
              <span>
                These credentials will be used by the College Admin to log in and manage their college
                (including campuses, principals, staff, students, and all academic operations).
              </span>
            </div>
          </div>

          {/* Aside Card for Step 3 */}
          <aside className="rcf-aside">
            <div className="rcf-aside-visual">
              <img
                src={adminShieldImg}
                alt="College Admin"
                className="rcf-aside-img"
              />
            </div>
            <div className="rcf-aside-body">
              {/* Admin Live Preview Box */}
              <div className="rcf-live-preview-box">
                <span className="rcf-live-tag">ADMIN ACCOUNT</span>
                <strong className="rcf-live-college-title">
                  {adminConfig.adminName.trim() || "Admin Full Name"}
                </strong>
                <div className="rcf-live-badges">
                  <span className="rcf-live-badge-code">
                    @{adminConfig.adminUsername.trim() || "username"}
                  </span>
                </div>
                <div className="rcf-live-loc-text">
                  📧 {adminConfig.adminEmail.trim() || "admin@college.edu"}
                </div>
              </div>

              <ul className="rcf-checklist" style={{ marginTop: 14 }}>
                <li className={adminConfig.adminName.trim() && adminConfig.adminEmail.trim() ? "is-checked" : ""}>
                  <span className={`rcf-check-dot ${adminConfig.adminName.trim() && adminConfig.adminEmail.trim() ? "is-done" : ""}`}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span>Create primary admin account</span>
                </li>
                <li className="is-checked">
                  <span className="rcf-check-dot is-done">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span>Assign to this college</span>
                </li>
                <li className={adminConfig.adminPassword && adminConfig.adminPassword === adminConfig.confirmPassword ? "is-checked" : ""}>
                  <span className={`rcf-check-dot ${adminConfig.adminPassword && adminConfig.adminPassword === adminConfig.confirmPassword ? "is-done" : ""}`}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span>Can manage campuses, principals, staff and students</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* ══════════════════════════════════════════
         STEP 4: Review & Activate (Image Reference: media_1794053748924_b2676060)
         ══════════════════════════════════════════ */}
      {step === 4 && (
        <div className="rcf-step-layout">
          {/* Main 2-column Review Grid */}
          <div className="rcf-review-sections-grid">
            {/* Left Column in Content Area: College Profile + Primary College Admin */}
            <div className="rcf-rev-col-left">
              {/* Card 1: College Profile */}
              <div className="rcf-card rcf-rev-card">
                <div className="rcf-rev-card-head">
                  <div className="rcf-rev-head-left">
                    <div className="rcf-rev-icon-wrap">
                      <Building2 size={18} />
                    </div>
                    <h3 className="rcf-rev-title">College Profile</h3>
                  </div>
                  <button
                    type="button"
                    className="rcf-rev-edit-btn"
                    onClick={() => setStep(1)}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>

                <div className="rcf-rev-rows">
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">College Name</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{profile.name || "—"}</strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Registration Code</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{profile.code || "—"}</strong>
                  </div>
                  {/* Note: NO Trust / Society per explicit rule */}
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">College Type</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{profile.collegeType || "—"}</strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Address</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{profile.address || "—"}</strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">City / State / Pincode</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">
                      {[profile.city, profile.state].filter(Boolean).join(", ")}
                      {profile.pincode ? ` - ${profile.pincode}` : ""}
                    </strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Official Email</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{profile.email || "—"}</strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Contact Number</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{profile.phone || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Primary College Admin (Positioned on Left Side) */}
              <div className="rcf-card rcf-rev-card">
                <div className="rcf-rev-card-head">
                  <div className="rcf-rev-head-left">
                    <div className="rcf-rev-icon-wrap">
                      <UserCheck size={18} />
                    </div>
                    <h3 className="rcf-rev-title">Primary College Admin</h3>
                  </div>
                  <button
                    type="button"
                    className="rcf-rev-edit-btn"
                    onClick={() => setStep(3)}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>

                <div className="rcf-rev-rows">
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Admin Name</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{adminConfig.adminName || "—"}</strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Username</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{adminConfig.adminUsername || "—"}</strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Email</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{adminConfig.adminEmail || "—"}</strong>
                  </div>
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Mobile</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">{adminConfig.adminPhone || "—"}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column in Content Area: Enabled Modules */}
            <div className="rcf-rev-col-right">
              {/* Card 3: Enabled Modules */}
              <div className="rcf-card rcf-rev-card">
                <div className="rcf-rev-card-head">
                  <div className="rcf-rev-head-left">
                    <div className="rcf-rev-icon-wrap">
                      <Layers size={18} />
                    </div>
                    <h3 className="rcf-rev-title">Enabled Modules</h3>
                  </div>
                  <button
                    type="button"
                    className="rcf-rev-edit-btn"
                    onClick={() => setStep(2)}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>

                <div className="rcf-rev-modules-list">
                  {ERP_MODULES_CONFIG.map((m) => {
                    const enabled = planConfig.modules.includes(m.id);
                    return (
                      <div key={m.id} className={`rcf-rev-mod-row ${enabled ? "is-enabled" : "is-disabled"}`}>
                        <span className={`rcf-rev-mod-dot ${enabled ? "is-done" : "is-muted"}`}>
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span className="rcf-rev-mod-name">
                          {m.name} {enabled ? "" : "(Disabled)"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="rcf-rev-plan-summary">
                  <div className="rcf-rev-item">
                    <span className="rcf-rev-label">Plan & Capacity</span>
                    <span className="rcf-rev-colon">:</span>
                    <strong className="rcf-rev-val">
                      {planConfig.plan} (Up to {planConfig.accountLimit.toLocaleString("en-IN")} accounts)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aside Panel for Step 4 (Ribbon Badge + Activate College) */}
          <aside className="rcf-aside">
            <div className="rcf-aside-visual">
              <img
                src={activateBadgeImg}
                alt="Activate College"
                className="rcf-aside-img rcf-aside-badge-img"
              />
            </div>
            <div className="rcf-aside-body">
              <h3 className="rcf-activate-aside-title">Activate College</h3>
              <p className="rcf-activate-aside-desc">
                The college will be created with the selected modules and the College Admin will get access immediately.
              </p>
              <ul className="rcf-checklist">
                <li className="is-checked">
                  <span className="rcf-check-dot is-done"><Check size={11} strokeWidth={3} /></span>
                  <span>Create college record</span>
                </li>
                <li className="is-checked">
                  <span className="rcf-check-dot is-done"><Check size={11} strokeWidth={3} /></span>
                  <span>Enable selected modules</span>
                </li>
                <li className="is-checked">
                  <span className="rcf-check-dot is-done"><Check size={11} strokeWidth={3} /></span>
                  <span>Activate College Admin</span>
                </li>
                <li className="is-checked">
                  <span className="rcf-check-dot is-done"><Check size={11} strokeWidth={3} /></span>
                  <span>Make it operational</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* ── Footer Navigation ── */}
      <div className="rcf-footer">
        {step === 1 ? (
          <button type="button" className="rcf-btn-cancel" onClick={() => navigate("/super-admin/college-management")} disabled={submitting}>
            Cancel
          </button>
        ) : (
          <button type="button" className="rcf-btn-back" onClick={handlePrev} disabled={submitting}>
            <ChevronLeft size={16} /> Back to Step {step - 1}
          </button>
        )}

        {step < 4 ? (
          <button type="button" className="rcf-btn-next" onClick={handleNext}>
            Continue to Step {step + 1} <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="rcf-btn-submit rcf-btn-activate"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Check size={16} strokeWidth={3} /> {submitting ? "Activating College..." : "Activate College"}
          </button>
        )}
      </div>

    </div>
  );
}
