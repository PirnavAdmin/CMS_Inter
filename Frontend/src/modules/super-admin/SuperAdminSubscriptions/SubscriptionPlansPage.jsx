import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  CreditCard,
  Gift,
  Layers,
  Star,
  Crown,
  Building2,
  Check,
  X,
  Plus,
  Eye,
  Pencil,
  MoreVertical,
  Scale,
  LayoutGrid,
  List,
  Users,
  Coins,
  Boxes,
  CheckCircle2,
  Copy,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { Modal } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import "./SubscriptionPlansPage.css";

// All platform features for the comparison matrix
const ALL_FEATURES_LIST = [
  { category: "Core Modules", name: "Student & Staff Management" },
  { category: "Core Modules", name: "Attendance Tracking" },
  { category: "Core Modules", name: "Fee Collection & Invoicing" },
  { category: "Academics", name: "Examinations & Grading" },
  { category: "Academics", name: "Timetable Management" },
  { category: "Campus Facilities", name: "Hostel Management" },
  { category: "Campus Facilities", name: "Transport & GPS Bus Tracking" },
  { category: "Campus Facilities", name: "Library & Book Catalog" },
  { category: "Analytics & Scalability", name: "Basic & Custom Reports" },
  { category: "Analytics & Scalability", name: "Multi-campus Architecture" },
  { category: "Analytics & Scalability", name: "Dedicated Custom Modules" }
];

export default function SubscriptionPlansPage() {
  const navigate = useNavigate();
  const { data, update } = useSuperAdmin?.() || { data: {}, update: () => {} };
  const dbColleges = data?.colleges || [];

  const iconTypes = { Free: "gift", Basic: "layers", Standard: "star", Premium: "crown", Enterprise: "building" };
  const iconColors = { Free: "green", Basic: "blue", Standard: "amber", Premium: "purple", Enterprise: "teal" };

  const plans = useMemo(() => {
    return (data?.plans || []).map((p) => {
      const enrolled = dbColleges.filter((c) => (c.plan || "").toLowerCase() === (p.name || "").toLowerCase());
      return {
        id: p.planId || p.id,
        planId: p.planId,
        name: p.name || "—",
        iconType: iconTypes[p.name] || "layers",
        iconColor: iconColors[p.name] || "green",
        status: p.active !== false ? "Active" : "Inactive",
        price: p.price != null && p.price !== "-" ? Number(p.price) : 0,
        duration: p.durationDays != null && p.durationDays !== "-" ? Number(p.durationDays) : 30,
        accounts: p.limit != null && p.limit !== "-" ? Number(p.limit) : "—",
        popular: (p.name || "").toLowerCase() === "premium",
        includesTitle: p.name === "Free" ? "Core Features" : "Included Features",
        features: Array.isArray(p.modules) && p.modules.length > 0 ? p.modules : [],
        enrolledCount: enrolled.length,
        enrolledColleges: enrolled.map((c) => ({
          name: c.name,
          code: c.code || "—",
          active: c.activeAccounts != null && c.activeAccounts !== "-" ? c.activeAccounts : "—"
        }))
      };
    });
  }, [data?.plans, dbColleges]);

  const savePlans = (newPlans) => {
    // updates dispatched via SuperAdminProvider
  };
  // UI States
  const [activeTab, setActiveTab] = useState("management"); // 'management' | 'compare'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [activePopover, setActivePopover] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Modals
  const [editPlanModal, setEditPlanModal] = useState(null);
  const [viewPlanModal, setViewPlanModal] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Edit form state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState(0);
  const [formDuration, setFormDuration] = useState(30);
  const [formAccounts, setFormAccounts] = useState(100);
  const [formPopular, setFormPopular] = useState(false);
  const [formStatus, setFormStatus] = useState("Active");
  const [formFeatures, setFormFeatures] = useState([]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Open Edit Modal
  const handleOpenEdit = (plan) => {
    setEditPlanModal(plan);
    setIsCreatingNew(false);
    setFormName(plan.name);
    setFormPrice(plan.price);
    setFormDuration(plan.duration);
    setFormAccounts(plan.accounts);
    setFormPopular(plan.popular || false);
    setFormStatus(plan.status || "Active");
    setFormFeatures([...plan.features]);
    setActivePopover(null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsCreatingNew(true);
    setEditPlanModal({ id: "plan-" + Date.now() });
    setFormName("");
    setFormPrice(1999);
    setFormDuration(30);
    setFormAccounts(250);
    setFormPopular(false);
    setFormStatus("Active");
    setFormFeatures(["Attendance", "Fees", "Staff", "Students"]);
  };

  // Save Plan
  const handleSavePlan = (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Please enter a valid plan name.");
      return;
    }

    if (isCreatingNew) {
      const newPlan = {
        id: "plan-" + Date.now(),
        name: formName.trim(),
        iconType: "star",
        iconColor: "green",
        status: formStatus,
        price: Number(formPrice),
        duration: Number(formDuration),
        accounts: Number(formAccounts),
        popular: formPopular,
        includesTitle: "Custom Features",
        features: formFeatures,
        enrolledCount: 0,
        enrolledColleges: []
      };
      savePlans([...plans, newPlan]);
      showToast(`Plan "${newPlan.name}" created successfully!`);
    } else {
      const updated = plans.map((p) => {
        if (p.id === editPlanModal.id) {
          return {
            ...p,
            name: formName.trim(),
            price: Number(formPrice),
            duration: Number(formDuration),
            accounts: Number(formAccounts),
            popular: formPopular,
            status: formStatus,
            features: formFeatures
          };
        }
        return p;
      });
      savePlans(updated);
      showToast(`Plan "${formName.trim()}" updated successfully!`);
    }

    setEditPlanModal(null);
  };

  // Duplicate Plan
  const handleDuplicatePlan = (plan) => {
    const duplicated = {
      ...plan,
      id: "plan-" + Date.now(),
      name: `${plan.name} (Copy)`,
      popular: false,
      enrolledCount: 0,
      enrolledColleges: []
    };
    savePlans([...plans, duplicated]);
    setActivePopover(null);
    showToast(`Duplicated "${plan.name}" plan.`);
  };

  // Toggle Active / Inactive
  const handleToggleStatus = (plan) => {
    const nextStatus = plan.status === "Active" ? "Inactive" : "Active";
    const updated = plans.map((p) => (p.id === plan.id ? { ...p, status: nextStatus } : p));
    savePlans(updated);
    setActivePopover(null);
    showToast(`Plan "${plan.name}" status set to ${nextStatus}.`);
  };

  const getPlanIcon = (type) => {
    switch (type) {
      case "gift":
        return <Gift size={16} />;
      case "layers":
        return <Layers size={16} />;
      case "star":
        return <Star size={16} />;
      case "crown":
        return <Crown size={16} />;
      case "building":
        return <Building2 size={16} />;
      default:
        return <CreditCard size={16} />;
    }
  };

  // Feature support helper for compare table
  const planHasFeature = (planName, featureName) => {
    if (planName === "Enterprise") return true;
    if (planName === "Premium") {
      return !featureName.includes("Multi-campus") && !featureName.includes("Custom Modules");
    }
    if (planName === "Standard") {
      return (
        featureName.includes("Student") ||
        featureName.includes("Attendance") ||
        featureName.includes("Fee") ||
        featureName.includes("Exam") ||
        featureName.includes("Timetable") ||
        featureName.includes("Hostel") ||
        featureName.includes("Transport")
      );
    }
    if (planName === "Basic") {
      return (
        featureName.includes("Student") ||
        featureName.includes("Attendance") ||
        featureName.includes("Fee") ||
        featureName.includes("Exam") ||
        featureName.includes("Timetable")
      );
    }
    // Free
    return (
      featureName.includes("Student") ||
      featureName.includes("Attendance") ||
      featureName.includes("Fee")
    );
  };

  return (
    <div className="plans-page">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1e4529",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 700,
            boxShadow: "0 8px 20px rgba(30, 69, 41, 0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <CheckCircle2 size={16} color="#4ade80" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <nav className="spp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/super-admin/dashboard">Platform Workspace</Link>
        <span className="spp-breadcrumb-sep">&gt;</span>
        <Link to="/super-admin/subscriptions">Subscriptions</Link>
        <span className="spp-breadcrumb-sep">&gt;</span>
        <span className="spp-breadcrumb-current">Subscription Plans</span>
      </nav>

      {/* ── TOP HERO BANNER (Faithful to Image) ── */}
      <header className="spp-hero-banner">
        <div className="spp-hero-left">
          <div className="spp-hero-title-wrap">
            <h1 className="spp-hero-title">Subscription Plans</h1>
            <p className="spp-hero-desc">
              Create, customize and manage subscription packages for your colleges. Define pricing, account limits and module access.
            </p>
          </div>

          <div className="spp-hero-badges">
            {/* Badge 1: Manage Pricing */}
            <div className="spp-hero-badge">
              <div className="spp-hero-badge-icon gold">
                <Coins size={16} />
              </div>
              <div className="spp-hero-badge-text">
                <span className="spp-hero-badge-title">Manage Pricing</span>
                <span className="spp-hero-badge-sub">Set plan price &amp; duration</span>
              </div>
            </div>

            {/* Badge 2: Control Access */}
            <div className="spp-hero-badge">
              <div className="spp-hero-badge-icon green">
                <Users size={16} />
              </div>
              <div className="spp-hero-badge-text">
                <span className="spp-hero-badge-title">Control Access</span>
                <span className="spp-hero-badge-sub">Define account limits</span>
              </div>
            </div>

            {/* Badge 3: Assign Modules */}
            <div className="spp-hero-badge">
              <div className="spp-hero-badge-icon teal">
                <Boxes size={16} />
              </div>
              <div className="spp-hero-badge-text">
                <span className="spp-hero-badge-title">Assign Modules</span>
                <span className="spp-hero-badge-sub">Choose available features</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Illustration: Laptop with Crown and Leaves */}
        <div className="spp-hero-right">
          <svg className="spp-hero-svg" viewBox="0 0 170 115" fill="none">
            {/* Background glowing foliage leaves */}
            <path d="M 12 70 C 10 40, 35 25, 48 38 C 40 55, 30 75, 12 70 Z" fill="#bbf7d0" opacity="0.6" />
            <path d="M 158 70 C 160 40, 135 25, 122 38 C 130 55, 140 75, 158 70 Z" fill="#bbf7d0" opacity="0.6" />
            <path d="M 30 90 C 25 65, 50 55, 60 70 C 50 82, 42 92, 30 90 Z" fill="#86efac" opacity="0.7" />
            <path d="M 140 90 C 145 65, 120 55, 110 70 C 120 82, 128 92, 140 90 Z" fill="#86efac" opacity="0.7" />

            {/* Laptop Base */}
            <rect x="25" y="96" width="120" height="7" rx="3.5" fill="#1e4529" />
            <rect x="65" y="96" width="40" height="3" rx="1.5" fill="#15803d" />

            {/* Laptop Screen Body */}
            <rect x="36" y="24" width="98" height="72" rx="7" fill="#1e4529" stroke="#166534" strokeWidth="2" />
            {/* Screen Inner White Glass */}
            <rect x="42" y="30" width="86" height="60" rx="4" fill="#ffffff" />

            {/* Screen Contents: Card with Crown */}
            <rect x="47" y="36" width="34" height="48" rx="3" fill="#f8fafc" stroke="#e2e8f0" />
            <line x1="52" y1="42" x2="74" y2="42" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="52" y1="48" x2="68" y2="48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            <line x1="52" y1="54" x2="72" y2="54" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

            <rect x="88" y="36" width="35" height="48" rx="3" fill="#edf5ef" stroke="#bbf7d0" />
            {/* Golden Crown on Screen */}
            <path d="M 98 48 L 101 43 L 105 46 L 109 43 L 112 48 Z" fill="#eab308" />
            <rect x="98" y="49" width="14" height="2" fill="#ca8a04" />
            <line x1="93" y1="58" x2="118" y2="58" stroke="#86efac" strokeWidth="2" strokeLinecap="round" />
            <line x1="96" y1="64" x2="115" y2="64" stroke="#86efac" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </header>

      {/* ── CONTROLS ROW ── */}
      <section className="spp-controls-row">
        {/* Tab Switcher */}
        <div className="spp-tabs">
          <button
            type="button"
            className={`spp-tab-btn ${activeTab === "management" ? "is-active" : ""}`}
            onClick={() => setActiveTab("management")}
          >
            <LayoutGrid size={15} />
            <span>Plan Management</span>
          </button>

          <button
            type="button"
            className={`spp-tab-btn ${activeTab === "compare" ? "is-active" : ""}`}
            onClick={() => setActiveTab("compare")}
          >
            <Scale size={15} />
            <span>Compare Plans</span>
          </button>
        </div>

        {/* View Toggle & Create Action */}
        <div className="spp-actions-right">
          {activeTab === "management" && (
            <div className="spp-view-toggle">
              <button
                type="button"
                className={`spp-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Card View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`spp-view-btn ${viewMode === "list" ? "is-active" : ""}`}
                onClick={() => setViewMode("list")}
                title="Table View"
              >
                <List size={15} />
              </button>
            </div>
          )}

          <button
            type="button"
            className="spp-btn-create"
            onClick={handleOpenCreate}
            title="Create a new subscription plan"
          >
            <Plus size={15} />
            <span>Create Plan</span>
          </button>
        </div>
      </section>

      {/* ── TAB 1: PLAN MANAGEMENT ── */}
      {activeTab === "management" ? (
        viewMode === "grid" ? (
          /* 5 Plan Cards Grid */
          <section className="spp-plans-grid">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`spp-plan-card ${plan.popular ? "is-popular" : ""}`}
              >
                {/* Popular Badge */}
                {plan.popular && <span className="spp-popular-badge">Popular</span>}

                {/* Card Head */}
                <div className="spp-card-head">
                  <div className={`spp-card-icon ${plan.iconColor || "green"}`}>
                    {getPlanIcon(plan.iconType)}
                  </div>
                  <span className="spp-card-plan-name">{plan.name}</span>
                </div>

                {/* Status Pill */}
                <span className={`spp-status-pill ${plan.status === "Active" ? "active" : "inactive"}`}>
                  <span className="spp-status-dot" />
                  <span>{plan.status}</span>
                </span>

                {/* Price */}
                <div className="spp-price-box">
                  <span className="spp-price-val">₹{plan.price.toLocaleString("en-IN")}</span>
                  <span className="spp-price-duration">/ {plan.duration || 30} days</span>
                </div>

                {/* Accounts info */}
                <div className="spp-accounts-info">
                  <Users size={13} className="spp-accounts-icon" />
                  <span>{plan.accounts.toLocaleString("en-IN")} active accounts</span>
                </div>

                {/* Features Checklist */}
                <div className="spp-features-box">
                  <span className="spp-features-title">
                    <span style={{ fontSize: 10 }}>↓</span> {plan.includesTitle || "Included Features"}
                  </span>
                  <ul className="spp-features-list">
                    {plan.features.map((feat) => (
                      <li key={feat} className="spp-feature-item">
                        <Check size={13} className="spp-feature-check" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Footer Actions */}
                <div className="spp-card-footer">
                  <button
                    type="button"
                    className="spp-card-action-btn"
                    onClick={() => setViewPlanModal(plan)}
                    title="View plan details & subscribers"
                  >
                    <Eye size={12} />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    className="spp-card-action-btn"
                    onClick={() => handleOpenEdit(plan)}
                    title="Edit plan configuration"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>

                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="spp-card-more-btn"
                      onClick={() => setActivePopover(activePopover === plan.id ? null : plan.id)}
                      title="More options"
                    >
                      <MoreVertical size={13} />
                    </button>

                    {activePopover === plan.id && (
                      <div className="spp-popover">
                        <button
                          type="button"
                          className="spp-popover-item"
                          onClick={() => handleDuplicatePlan(plan)}
                        >
                          <Copy size={13} color="#0284c7" />
                          <span>Duplicate Plan</span>
                        </button>
                        <button
                          type="button"
                          className="spp-popover-item"
                          onClick={() => handleToggleStatus(plan)}
                        >
                          <ToggleLeft size={13} color="#ea580c" />
                          <span>
                            {plan.status === "Active" ? "Deactivate" : "Activate"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="spp-popover-item"
                          onClick={() => {
                            setViewPlanModal(plan);
                            setActivePopover(null);
                          }}
                        >
                          <Users size={13} color="#16a34a" />
                          <span>View Subscribers ({plan.enrolledCount || 0})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          /* Table View */
          <section className="spp-compare-wrap">
            <table className="spp-list-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Price &amp; Duration</th>
                  <th>Account Limit</th>
                  <th>Features Included</th>
                  <th>Status</th>
                  <th>Enrolled Colleges</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className={`spp-card-icon ${p.iconColor || "green"}`} style={{ width: 28, height: 28 }}>
                          {getPlanIcon(p.iconType)}
                        </div>
                        <div>
                          <strong style={{ color: "#1e293b", fontSize: 13 }}>{p.name}</strong>
                          {p.popular && (
                            <span
                              style={{
                                marginLeft: 6,
                                background: "#ede9fe",
                                color: "#7c3aed",
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "1px 6px",
                                borderRadius: 10
                              }}
                            >
                              Popular
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: "#1e293b" }}>₹{p.price.toLocaleString("en-IN")}</strong>
                      <span style={{ fontSize: 11, color: "#64748b" }}> / {p.duration} days</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#1e293b" }}>
                        {p.accounts.toLocaleString("en-IN")}
                      </span>{" "}
                      accounts
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 260 }}>
                        {p.features.map((f) => (
                          <span
                            key={f}
                            style={{
                              background: "#f1f5f9",
                              color: "#334155",
                              fontSize: 10.5,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4
                            }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`spp-status-pill ${p.status === "Active" ? "active" : "inactive"}`}>
                        <span className="spp-status-dot" />
                        <span>{p.status}</span>
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "#1e4529" }}>{p.enrolledCount || 0}</strong> colleges
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button
                          type="button"
                          className="spp-card-action-btn"
                          onClick={() => setViewPlanModal(p)}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          className="spp-card-action-btn"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      ) : (
        /* ── TAB 2: COMPARE PLANS MATRIX ── */
        <section className="spp-compare-wrap">
          <div className="spp-compare-scroll">
            <table className="spp-compare-table">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Feature / Capability</th>
                  {plans.map((p) => (
                    <th key={p.id} style={{ textAlign: "center", minWidth: 120 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1e293b" }}>
                        {p.name}
                      </div>
                      <div style={{ color: "#1e4529", fontWeight: 700, fontSize: 12, marginTop: 2 }}>
                        ₹{p.price.toLocaleString("en-IN")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* General Row: Accounts Limit */}
                <tr className="spp-compare-cat-row">
                  <td colSpan={plans.length + 1}>Account Quotas &amp; Limits</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Active User Accounts</td>
                  {plans.map((p) => (
                    <td key={p.id} style={{ textAlign: "center", fontWeight: 700, color: "#1e293b" }}>
                      Up to {p.accounts.toLocaleString("en-IN")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Validity Cycle</td>
                  {plans.map((p) => (
                    <td key={p.id} style={{ textAlign: "center", color: "#64748b" }}>
                      {p.duration} Days
                    </td>
                  ))}
                </tr>

                {/* Modules breakdown */}
                <tr className="spp-compare-cat-row">
                  <td colSpan={plans.length + 1}>Included Modules &amp; Platform Access</td>
                </tr>
                {ALL_FEATURES_LIST.map((feat, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 500, color: "#334155" }}>{feat.name}</td>
                    {plans.map((p) => {
                      const has = planHasFeature(p.name, feat.name);
                      return (
                        <td key={p.id} style={{ textAlign: "center" }}>
                          {has ? (
                            <Check size={16} className="spp-check-icon" />
                          ) : (
                            <X size={15} className="spp-cross-icon" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL 1: CREATE / EDIT PLAN ── */}
      {editPlanModal && (
        <Modal
          title={isCreatingNew ? "Create New Subscription Plan" : `Edit Plan: ${editPlanModal.name}`}
          onClose={() => setEditPlanModal(null)}
        >
          <form onSubmit={handleSavePlan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard, Growth, Enterprise"
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
                  Plan Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
                  Price (₹) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
                  Duration (Days) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 3 }}>
                  Account Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formAccounts}
                  onChange={(e) => setFormAccounts(e.target.value)}
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Popular toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
              <input
                type="checkbox"
                id="popularToggle"
                checked={formPopular}
                onChange={(e) => setFormPopular(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="popularToggle" style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", cursor: "pointer" }}>
                Feature as "Popular" badge on plan cards
              </label>
            </div>

            {/* Included features list */}
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                Included Modules &amp; Feature Capabilities
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                  padding: "10px",
                  borderRadius: 8,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  maxHeight: 180,
                  overflowY: "auto"
                }}
              >
                {[
                  "Attendance",
                  "Fees",
                  "Staff",
                  "Students",
                  "Examinations",
                  "Timetable",
                  "Hostel",
                  "Transport",
                  "Library",
                  "Reports",
                  "Multi-campus",
                  "Advanced Reports",
                  "Custom Modules"
                ].map((feat) => {
                  const checked = formFeatures.includes(feat);
                  return (
                    <label
                      key={feat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 11.5,
                        color: "#334155",
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormFeatures([...formFeatures, feat]);
                          } else {
                            setFormFeatures(formFeatures.filter((f) => f !== feat));
                          }
                        }}
                      />
                      <span>{feat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="spp-card-action-btn"
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => setEditPlanModal(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="spp-btn-create"
                style={{ padding: "6px 16px", fontSize: 12 }}
              >
                <Check size={14} /> Save Plan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 2: VIEW PLAN DETAILS & SUBSCRIBERS ── */}
      {viewPlanModal && (
        <Modal
          title={`Plan Details: ${viewPlanModal.name}`}
          onClose={() => setViewPlanModal(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Top specs card */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 8,
                background: "#edf5ef",
                border: "1px solid #bbf7d0"
              }}
            >
              <div>
                <span style={{ fontSize: 10.5, color: "#166534", fontWeight: 600 }}>PRICE / DURATION</span>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1e4529" }}>
                  ₹{viewPlanModal.price.toLocaleString("en-IN")}{" "}
                  <small style={{ fontSize: 11, fontWeight: 500 }}>/ {viewPlanModal.duration}d</small>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: "#166534", fontWeight: 600 }}>ACCOUNT CAPACITY</span>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1e4529" }}>
                  {viewPlanModal.accounts.toLocaleString("en-IN")} accounts
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10.5, color: "#166534", fontWeight: 600 }}>SUBSCRIBED COLLEGES</span>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1e4529" }}>
                  {viewPlanModal.enrolledCount || 0} colleges
                </div>
              </div>
            </div>

            {/* Included features */}
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1e293b", display: "block", marginBottom: 6 }}>
                Included Capabilities ({viewPlanModal.features.length})
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {viewPlanModal.features.map((f) => (
                  <span
                    key={f}
                    style={{
                      background: "#f1f5f9",
                      color: "#1e293b",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600
                    }}
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Subscribed colleges list */}
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1e293b", display: "block", marginBottom: 6 }}>
                Enrolled Colleges
              </span>
              {viewPlanModal.enrolledColleges && viewPlanModal.enrolledColleges.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {viewPlanModal.enrolledColleges.map((col, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        borderRadius: 6,
                        background: "#f8fafc",
                        border: "1px solid #f1f5f9",
                        fontSize: 12
                      }}
                    >
                      <div>
                        <strong style={{ color: "#1e293b" }}>{col.name}</strong>{" "}
                        <span style={{ color: "#64748b", fontSize: 11 }}>({col.code})</span>
                      </div>
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>
                        {col.active} active accounts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "14px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                  No colleges are currently subscribed to this tier.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button
                type="button"
                className="spp-card-action-btn"
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => setViewPlanModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="spp-btn-create"
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => {
                  setViewPlanModal(null);
                  handleOpenEdit(viewPlanModal);
                }}
              >
                <Pencil size={12} /> Edit This Plan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
