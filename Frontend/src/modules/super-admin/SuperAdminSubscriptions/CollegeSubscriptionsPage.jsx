import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
  Calendar,
  Layers,
  CalendarClock,
  AlertTriangle,
  Search,
  RotateCw,
  List,
  LayoutGrid,
  ChevronRight,
  X,
  Plus,
  Download,
  Eye,
  Clock,
  Pencil,
  MoreVertical,
  Check,
  CheckCircle2,
  Shield,
  Crown,
  Gift,
  Zap,
  TrendingUp,
  CreditCard,
  FileText,
  BarChart2,
  RefreshCw,
  ExternalLink,
  Users
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import SuperAdminPagination from "../components/SuperAdminPagination.jsx";
import "./CollegeSubscriptionsPage.css";

const getDaysRemaining = (dateStr) => {
  if (!dateStr || dateStr === "-") return null;
  const target = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const getPlanIcon = (name) => {
  const n = String(name || "").toLowerCase();
  if (n.includes("free")) return Gift;
  if (n.includes("basic")) return Shield;
  if (n.includes("standard")) return Zap;
  if (n.includes("premium")) return Crown;
  if (n.includes("enterprise")) return Building2;
  return Layers;
};

export default function CollegeSubscriptionsPage() {
  const { data, update, refresh } = useSuperAdmin();
  const navigate = useNavigate();

  // Dynamic plans directly from DB plans
  const availablePlans = useMemo(() => {
    if (data?.plans && data.plans.length > 0) {
      return data.plans.map((p) => ({
        id: p.planId || p.id,
        name: p.name,
        price: Number(p.price) > 0 ? `₹${Number(p.price).toLocaleString("en-IN")} / mo` : "₹0 / mo",
        limit: p.limit != null ? Number(p.limit) : "—",
        icon: getPlanIcon(p.name),
      }));
    }
    return [
      { name: "Free", price: "₹0 / mo", limit: 25, icon: Gift },
      { name: "Basic", price: "₹1,499 / mo", limit: 100, icon: Shield },
      { name: "Standard", price: "₹2,999 / mo", limit: 300, icon: Zap },
      { name: "Premium", price: "₹5,999 / mo", limit: 1000, icon: Crown },
      { name: "Enterprise", price: "₹12,999 / mo", limit: 5000, icon: TrendingUp },
    ];
  }, [data?.plans]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [presetTab, setPresetTab] = useState("all"); // 'all', 'active', 'expiring', 'expired', 'free'
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'

  // Sorting - default newest records at the top

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modals & Drawers
  const [detailSub, setDetailSub] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [assignModal, setAssignModal] = useState(false);
  const [assignCollegeId, setAssignCollegeId] = useState("");
  const [assignCycle, setAssignCycle] = useState("annual");
  const [renewModalSub, setRenewModalSub] = useState(null);
  const [renewPeriod, setRenewPeriod] = useState("1year");
  const [editPlanSub, setEditPlanSub] = useState(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState("Standard");
  const [confirm, setConfirm] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Floating Popover Menu
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close floating popovers on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      if (activeMenuId) setActiveMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeMenuId]);

  // Strictly real DB data from provider
  const allColleges = data.colleges || [];

  const subscriptions = useMemo(() => {
    const subsList = data.subscriptions || [];
    const collegesList = data.colleges || [];

    const subsByCollegeId = new Map();
    subsList.forEach((s) => {
      if (s.collegeId != null) {
        subsByCollegeId.set(String(s.collegeId), s);
      }
    });

    if (collegesList.length > 0) {
      return collegesList.map((c, i) => {
        const rawCid = String(c.collegeId || c.id || "");
        const cidNum = rawCid.replace(/^COL-0*/, "") || rawCid;
        const matchedSub =
          subsByCollegeId.get(String(c.collegeId)) ||
          subsByCollegeId.get(String(c.id)) ||
          subsByCollegeId.get(cidNum) ||
          subsList.find((s) => s.code && c.code && s.code.toLowerCase() === c.code.toLowerCase()) ||
          subsList.find((s) => s.name && c.name && s.name.toLowerCase() === c.name.toLowerCase());

        const hasSubRecord = Boolean(matchedSub && matchedSub.plan && matchedSub.plan !== "-" && matchedSub.plan !== "—");

        const planName = hasSubRecord ? matchedSub.plan : (c.plan && c.plan !== "-" && c.plan !== "—" && c.plan !== "Free" ? c.plan : "—");
        const limit = hasSubRecord
          ? (matchedSub.accountLimit != null && matchedSub.accountLimit !== "-" ? matchedSub.accountLimit : "—")
          : "—";
        const active = Number(matchedSub?.activeAccounts ?? c.activeAccounts ?? c.students ?? 0);

        const rawStart = hasSubRecord && matchedSub?.startDate && matchedSub.startDate !== "-" && matchedSub.startDate !== "—"
          ? matchedSub.startDate
          : null;
        const rawRenewal = hasSubRecord && matchedSub?.renewalDate && matchedSub.renewalDate !== "-" && matchedSub.renewalDate !== "—"
          ? matchedSub.renewalDate
          : null;
        const rawStatus = hasSubRecord && matchedSub?.status && matchedSub.status !== "-" && matchedSub.status !== "—"
          ? matchedSub.status
          : "—";

        const days = rawRenewal ? getDaysRemaining(rawRenewal) : null;

        let computedStatus = rawStatus;
        if (hasSubRecord) {
          if (days != null && days < 0) {
            computedStatus = "Expired";
          } else if (days != null && days >= 0 && days <= 30) {
            computedStatus = "Expiring Soon";
          } else if (rawStatus && rawStatus !== "—") {
            computedStatus = rawStatus;
          } else {
            computedStatus = "Active";
          }
        }

        return {
          id: matchedSub?.id || (matchedSub?.subscriptionId ? `SUB-${matchedSub.subscriptionId}` : `SUB-${c.collegeId || c.id || i + 1}`),
          subscriptionId: matchedSub?.subscriptionId || null,
          collegeId: c.collegeId || c.id,
          collegeName: c.name || matchedSub?.collegeName || "—",
          collegeCode: c.code || matchedSub?.collegeCode || "—",
          plan: planName,
          planHistory: matchedSub?.planHistory || matchedSub?.subscriptionHistory || matchedSub?.history || [],
          activeAccounts: active,
          accountLimit: limit,
          startDate: rawStart ? rawStart.slice(0, 10) : "—",
          renewalDate: rawRenewal ? rawRenewal.slice(0, 10) : "—",
          status: computedStatus,
          daysRemaining: days,
          modules: matchedSub?.modules || c.modules || [],
        };
      });
    }

    return subsList.map((s, i) => {
      const planName = s.plan && s.plan !== "-" && s.plan !== "—" ? s.plan : "—";
      const limit = s.accountLimit != null && s.accountLimit !== "-" && s.accountLimit !== "—" ? s.accountLimit : "—";
      const active = s.activeAccounts != null && s.activeAccounts !== "-" ? s.activeAccounts : 0;
      const rawStart = s.startDate && s.startDate !== "-" && s.startDate !== "—" ? s.startDate : null;
      const rawRenewal = s.renewalDate && s.renewalDate !== "-" && s.renewalDate !== "—" ? s.renewalDate : null;
      const rawStatus = s.status && s.status !== "-" && s.status !== "—" ? s.status : "—";
      const days = rawRenewal ? getDaysRemaining(rawRenewal) : null;

      let computedStatus = rawStatus;
      if (planName !== "—") {
        if (days != null && days < 0) {
          computedStatus = "Expired";
        } else if (days != null && days >= 0 && days <= 30) {
          computedStatus = "Expiring Soon";
        } else if (rawStatus && rawStatus !== "—") {
          computedStatus = rawStatus;
        } else {
          computedStatus = "Active";
        }
      }

      return {
        id: s.id || `SUB-${s.subscriptionId || i + 1}`,
        subscriptionId: s.subscriptionId || null,
        collegeId: s.collegeId,
        collegeName: s.collegeName || s.name || "—",
        collegeCode: s.collegeCode || s.code || "—",
        plan: planName,
        planHistory: s.planHistory || s.subscriptionHistory || s.history || [],
        activeAccounts: active,
        accountLimit: limit,
        startDate: rawStart ? rawStart.slice(0, 10) : "—",
        renewalDate: rawRenewal ? rawRenewal.slice(0, 10) : "—",
        status: computedStatus,
        daysRemaining: days,
        modules: s.modules || [],
      };
    });
  }, [data.subscriptions, data.colleges]);

  const getPlanHistory = (row) => {
    const directHistory = Array.isArray(row.planHistory) ? row.planHistory : [];
    const collegeKey = String(row.collegeId ?? "").replace(/^COL-0*/i, "").toLowerCase();
    const collegeName = String(row.collegeName ?? "").trim().toLowerCase();
    const auditHistory = (data.activities || []).filter((entry) => {
      const description = `${entry.module || ""} ${entry.actionType || ""} ${entry.message || ""}`.toLowerCase();
      if (!/plan|subscription|renew/.test(description)) return false;
      const entryId = String(entry.collegeId ?? "").replace(/^COL-0*/i, "").toLowerCase();
      const entryCollege = String(entry.collegeName || entry.college || "").trim().toLowerCase();
      return (collegeKey && entryId === collegeKey) ||
        (collegeName && (entryCollege === collegeName || entryCollege.includes(collegeName)));
    });
    return [...directHistory, ...auditHistory]
      .sort((a, b) => new Date(b.at || b.date || b.createdAt || 0) - new Date(a.at || a.date || a.createdAt || 0))
      .slice(0, 2);
  };

  // KPI Calculations strictly from real DB records
  const totalCollegesCount = allColleges.length;
  const activeSubsCount = subscriptions.filter((s) => s.status === "Active" || s.status === "Expiring Soon").length;
  const expiringSoonCount = subscriptions.filter((s) => s.status === "Expiring Soon" || (s.daysRemaining != null && s.daysRemaining >= 0 && s.daysRemaining <= 30 && s.plan !== "—")).length;
  const expiredCount = subscriptions.filter((s) => s.status === "Expired" || (s.daysRemaining != null && s.daysRemaining < 0 && s.plan !== "—")).length;
  const freeTierCount = subscriptions.filter((s) => (s.plan || "").toLowerCase() === "free").length;

  // Filtered & Sorted Records
  const filteredRows = useMemo(() => {
    return subscriptions
      .filter((row) => {
        // Search query
        const query = searchTerm.trim().toLowerCase();
        const matchesQuery =
          !query ||
          row.collegeName?.toLowerCase().includes(query) ||
          row.collegeCode?.toLowerCase().includes(query) ||
          row.plan?.toLowerCase().includes(query);

        // Preset Tab Filter
        let matchesPreset = true;
        if (presetTab === "active") {
          matchesPreset = row.status === "Active" || row.status === "Expiring Soon";
        } else if (presetTab === "expiring") {
          matchesPreset = row.status === "Expiring Soon" || (row.daysRemaining != null && row.daysRemaining >= 0 && row.daysRemaining <= 30 && row.plan !== "—");
        } else if (presetTab === "expired") {
          matchesPreset = row.status === "Expired" || (row.daysRemaining != null && row.daysRemaining < 0 && row.plan !== "—");
        } else if (presetTab === "free") {
          matchesPreset = (row.plan || "").toLowerCase() === "free";
        }

        // Expiry Date Filter
        let matchesExpiry = true;
        if (expiryFilter) {
          matchesExpiry = row.renewalDate?.includes(expiryFilter);
        }

        return matchesQuery && matchesPreset && matchesExpiry;
      })
  }, [subscriptions, searchTerm, presetTab, expiryFilter]);

  // Pagination
  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  // Actions
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Subscription data refreshed!", "info");
    }, 400);
  };

  const handleExportCSV = () => {
    const headers = ["Index,College Name,College Code,Plan,Active Accounts,Account Limit,Start Date,Renewal Date,Status\n"];
    const rows = subscriptions.map((s, idx) =>
      `"${idx + 1}","${s.collegeName}","${s.collegeCode}","${s.plan}","${s.activeAccounts}","${s.accountLimit}","${s.startDate}","${s.renewalDate}","${s.status}"\n`
    );
    const blob = new Blob([headers.concat(rows).join("")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `college_subscriptions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Subscriptions exported to CSV successfully!", "success");
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignCollegeId) {
      showToast("Please choose a college to assign.", "warning");
      return;
    }
    setIsSubmitting(true);
    const ok = await update("Assigned college subscription", null, {
      module: "Subscriptions",
      actionType: "Assign",
      collegeId: assignCollegeId,
      plan: selectedNewPlan,
      cycle: assignCycle,
    });
    setIsSubmitting(false);
    if (ok) {
      showToast(`Assigned ${selectedNewPlan} plan successfully!`, "success");
      setAssignModal(false);
      setAssignCollegeId("");
      await refresh();
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewModalSub) return;
    const daysToAdd = renewPeriod === "30days" ? 30 : renewPeriod === "90days" ? 90 : 365;
    setIsSubmitting(true);
    const ok = await update("Renewed subscription", null, {
      module: "Subscriptions",
      actionType: "Renew",
      collegeId: renewModalSub.collegeId,
      extensionDays: daysToAdd,
    });
    setIsSubmitting(false);
    if (ok) {
      showToast(`Renewed subscription for ${renewModalSub.collegeName}!`, "success");
      setRenewModalSub(null);
      await refresh();
    }
  };

  const handleSavePlanChange = async (e) => {
    e.preventDefault();
    if (!editPlanSub) return;
    setIsSubmitting(true);
    const ok = await update("Changed college plan", null, {
      module: "Subscriptions",
      actionType: "Plan change",
      collegeId: editPlanSub.collegeId,
      plan: selectedNewPlan,
    });
    setIsSubmitting(false);
    if (ok) {
      showToast(`Plan for ${editPlanSub.collegeName} updated to ${selectedNewPlan}!`, "success");
      setEditPlanSub(null);
      await refresh();
    }
  };

  const handleCancelSubscription = (sub) => {
    setConfirm({
      title: "Cancel Subscription?",
      message: `Are you sure you want to cancel the paid plan for "${sub.collegeName}"? They will be downgraded to the Free tier.`,
      run: async () => {
        const ok = await update("Cancelled subscription", null, {
          module: "Subscriptions",
          actionType: "Cancel",
          collegeId: sub.collegeId,
        });
        if (ok) {
          showToast(`${sub.collegeName} subscription cancelled.`, "info");
          await refresh();
        }
      },
    });
  };

  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (expiryFilter ? 1 : 0) +
    (presetTab !== "all" ? 1 : 0);

  const handleResetAllFilters = () => {
    setSearchTerm("");
    setExpiryFilter("");
    setPresetTab("all");
    setPage(1);
    showToast("All filters cleared", "info");
  };

  // Helper for plan badge styling
  const getPlanBadge = (plan = "") => {
    const p = String(plan || "").toLowerCase();
    if (p.includes("premium")) return { icon: Crown, class: "premium" };
    if (p.includes("standard")) return { icon: Zap, class: "standard" };
    if (p.includes("enterprise")) return { icon: Building2, class: "enterprise" };
    if (p.includes("basic")) return { icon: Shield, class: "basic" };
    if (p.includes("free")) return { icon: Gift, class: "free" };
    return { icon: Layers, class: "none" };
  };

  return (
    <div className="csp-page">
      {/* ── Breadcrumb ── */}
      <nav className="csp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/super-admin/dashboard" className="csp-breadcrumb-home">
          <Building2 size={13} /> Platform Workspace
        </Link>
        <span className="csp-breadcrumb-sep">&gt;</span>
        <span className="csp-breadcrumb-muted">Subscriptions</span>
        <span className="csp-breadcrumb-sep">&gt;</span>
        <span className="csp-breadcrumb-current">College Subscriptions</span>
      </nav>

      {/* ── Page Header ── */}
      <header className="csp-header">
        <div className="csp-header-left">
          <div className="csp-header-icon">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="csp-title">College Subscriptions</h1>
            <p className="csp-subtitle">
              Manage college subscriptions, plans, active accounts and renewals across the platform.
            </p>
          </div>
        </div>
        <div className="csp-header-actions">
          <button
            type="button"
            className="csp-export-btn"
            onClick={handleExportCSV}
          >
            <Download size={15} /> Export
          </button>
          <button
            type="button"
            className="csp-assign-btn"
            onClick={() => setAssignModal(true)}
          >
            <Plus size={16} /> Assign / Update Subscription
          </button>
        </div>
      </header>

      {/* ── 4 KPI Summary Cards (Image 1 Reference) ── */}
      <section className="csp-kpi-grid">
        {/* Card 1: Total Colleges */}
        <article
          className={`csp-kpi-card tone-purple ${presetTab === "all" ? "is-selected-kpi" : ""}`}
          style={{ cursor: "pointer" }}
          title="Click to view all colleges"
          onClick={() => {
            setPresetTab("all");
            setPage(1);
          }}
        >
          <div className="csp-kpi-left">
            <div className="csp-kpi-icon-wrap">
              <Building2 size={16} />
            </div>
            <div className="csp-kpi-meta">
              <span className="csp-kpi-label">Total Colleges</span>
              <div className="csp-kpi-num-row">
                <strong className="csp-kpi-num">{totalCollegesCount}</strong>
              </div>
            </div>
          </div>
          <div className="csp-sparkline-wrap">
            <svg width="44" height="20" viewBox="0 0 60 26">
              <path
                d="M 2 19 C 14 10, 26 24, 38 12 C 45 4, 52 14, 58 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>

        {/* Card 2: Active Subscriptions */}
        <article
          className={`csp-kpi-card tone-green ${presetTab === "active" ? "is-selected-kpi" : ""}`}
          style={{ cursor: "pointer" }}
          title="Click to filter active subscriptions"
          onClick={() => {
            setPresetTab("active");
            setPage(1);
          }}
        >
          <div className="csp-kpi-left">
            <div className="csp-kpi-icon-wrap">
              <Layers size={16} />
            </div>
            <div className="csp-kpi-meta">
              <span className="csp-kpi-label">Active Subscriptions</span>
              <div className="csp-kpi-num-row">
                <strong className="csp-kpi-num">{activeSubsCount}</strong>
              </div>
              <span className="csp-kpi-badge">↑ +12%</span>
            </div>
          </div>
          <div className="csp-sparkline-wrap">
            <svg width="44" height="20" viewBox="0 0 60 26">
              <path
                d="M 2 20 C 16 18, 28 8, 42 16 C 48 20, 52 10, 58 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>

        {/* Card 3: Expiring in 30 Days */}
        <article
          className={`csp-kpi-card tone-orange ${presetTab === "expiring" ? "is-selected-kpi" : ""}`}
          style={{ cursor: "pointer" }}
          title="Click to filter subscriptions expiring in 30 days"
          onClick={() => {
            setPresetTab("expiring");
            setPage(1);
          }}
        >
          <div className="csp-kpi-left">
            <div className="csp-kpi-icon-wrap">
              <CalendarClock size={16} />
            </div>
            <div className="csp-kpi-meta">
              <span className="csp-kpi-label">Expiring in 30 Days</span>
              <div className="csp-kpi-num-row">
                <strong className="csp-kpi-num">{expiringSoonCount}</strong>
              </div>
            </div>
          </div>
          <div className="csp-sparkline-wrap">
            <svg width="44" height="20" viewBox="0 0 60 26">
              <path
                d="M 2 18 C 16 12, 30 22, 44 14 C 50 10, 54 18, 58 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>

        {/* Card 4: Expired Subscriptions */}
        <article
          className={`csp-kpi-card tone-red ${presetTab === "expired" ? "is-selected-kpi" : ""}`}
          style={{ cursor: "pointer" }}
          title="Click to filter expired subscriptions"
          onClick={() => {
            setPresetTab("expired");
            setPage(1);
          }}
        >
          <div className="csp-kpi-left">
            <div className="csp-kpi-icon-wrap">
              <AlertTriangle size={16} />
            </div>
            <div className="csp-kpi-meta">
              <span className="csp-kpi-label">Expired Subscriptions</span>
              <div className="csp-kpi-num-row">
                <strong className="csp-kpi-num">{expiredCount}</strong>
              </div>
            </div>
          </div>
          <div className="csp-sparkline-wrap">
            <svg width="44" height="20" viewBox="0 0 60 26">
              <path
                d="M 2 14 C 18 20, 32 10, 46 18 C 52 22, 54 12, 58 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>
      </section>

      {/* ── Search & Filter Toolbar (Image 1 Reference) ── */}
      <div className="csp-toolbar-container">
        <div className="csp-toolbar">
          <div className="csp-toolbar-left">
            {/* Search Input with Clear Button */}
            <div className="csp-search-wrap">
              <Search size={16} className="csp-search-icon" />
              <input
                type="text"
                placeholder="Search by college name or code..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="csp-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="csp-search-clear"
                  title="Clear search"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="csp-toolbar-filters">
              {/* Expiry Date Filter */}
              <div className="csp-filter-field">
                <span className="csp-filter-label">Expiry</span>
                <div className="csp-date-field">
                  <Calendar size={13} className="csp-date-icon" />
                  <input
                    type="text"
                    placeholder="Select date range"
                    value={expiryFilter}
                    onChange={(e) => {
                      setExpiryFilter(e.target.value);
                      setPage(1);
                    }}
                    className="csp-date-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="csp-toolbar-actions">
            {/* Refresh Button */}
            <button
              type="button"
              className="csp-icon-btn"
              title="Refresh Data"
              onClick={handleRefresh}
            >
              <RotateCw size={15} className={isRefreshing ? "spin-animate" : ""} />
            </button>

            {/* View Switcher: List vs Grid */}
            <div className="csp-view-switcher">
              <button
                type="button"
                className={`csp-view-btn ${viewMode === "list" ? "is-active" : ""}`}
                title="List View"
                onClick={() => setViewMode("list")}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className={`csp-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                title="Grid View"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Active Filter Chips Bar ── */}
        {(activeFiltersCount > 0 || searchTerm) && (
          <div className="csp-active-chips-bar">
            <span className="csp-chips-label">Active Filters:</span>
            {searchTerm && (
              <span className="csp-chip">
                Search: <strong>"{searchTerm}"</strong>
                <button type="button" onClick={() => setSearchTerm("")}>
                  <X size={12} />
                </button>
              </span>
            )}
            {presetTab !== "all" && (
              <span className="csp-chip">
                Tab: <strong>{presetTab === "expiring" ? "Expiring in 30 Days" : presetTab === "active" ? "Active" : presetTab === "expired" ? "Expired" : presetTab === "free" ? "Free Tier" : presetTab}</strong>
                <button type="button" onClick={() => setPresetTab("all")}>
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              className="csp-clear-all-chip"
              onClick={handleResetAllFilters}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── Table View (Image 1 Exact Layout) ── */}
      <div className="csp-table-card">
        {viewMode === "list" ? (
          <div className="csp-table-wrap">
            <table className="csp-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>#</th>
                  <th>College</th>
                  <th>Plan</th>
                  <th>Active Accounts</th>
                  <th>Account Limit</th>
                  <th>Start Date</th>
                  <th>Renewal Date</th>
                  <th>Subscription Status</th>
                  <th style={{ textAlign: "center", width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => {
                  const planBadge = getPlanBadge(row.plan);
                  const PlanIcon = planBadge.icon;
                  const rowId = row.id || idx;
                  const planHistory = getPlanHistory(row);

                  // Status styling
                  const statusClass =
                    row.status === "Active"
                      ? "is-active"
                      : row.status === "Free"
                      ? "is-free"
                      : row.status === "Expiring Soon"
                      ? "is-expiring"
                      : row.status === "Expired"
                      ? "is-expired"
                      : row.status === "Inactive"
                      ? "is-inactive"
                      : "is-none";

                  return (
                    <tr key={rowId}>
                      <td className="csp-cell-index">{startIndex + idx + 1}</td>
                      <td>
                        <div className="csp-cell-college">
                          <div className="csp-college-icon">
                            <Building2 size={16} />
                          </div>
                          <div className="csp-college-meta">
                            <span className="csp-college-title">{row.collegeName}</span>
                            <span className="csp-college-code">{row.collegeCode}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="csp-plan-cell">
                          {row.plan !== "—" ? (
                            <span
                              className={`csp-plan-pill ${planBadge.class}`}
                              title={`Current plan: ${row.plan}`}
                            >
                              <PlanIcon size={13} />
                              <span>{row.plan}</span>
                            </span>
                          ) : (
                            <span
                              className="csp-plan-pill none"
                            >
                              <span>—</span>
                            </span>
                          )}
                          <div className="csp-plan-history" aria-label="Plan history">
                            {planHistory.length ? planHistory.map((entry, historyIndex) => {
                              const historyDate = entry.at || entry.date || entry.createdAt;
                              const change = entry.previousPlan && entry.newPlan
                                ? `${entry.previousPlan} → ${entry.newPlan}`
                                : entry.plan || entry.actionType || entry.message || "Plan updated";
                              return <span key={entry.id || entry.auditLogId || `${rowId}-history-${historyIndex}`}>
                                {change}{historyDate ? ` · ${new Date(historyDate).toLocaleDateString("en-IN")}` : ""}
                              </span>;
                            }) : <span>{/^\d{4}-\d{2}-\d{2}$/.test(row.startDate) ? `Started ${row.startDate}` : "No plan history recorded"}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {row.activeAccounts !== "—" ? (
                          <span className="csp-accounts-val">
                            <Users size={14} className="csp-accounts-icon" />
                            <span>{typeof row.activeAccounts === "number" ? row.activeAccounts.toLocaleString("en-IN") : row.activeAccounts}</span>
                          </span>
                        ) : (
                          <span className="csp-dash-cell">—</span>
                        )}
                      </td>
                      <td>
                        {row.accountLimit !== "—" ? (
                          <span className="csp-limit-val">
                            {typeof row.accountLimit === "number" ? row.accountLimit.toLocaleString("en-IN") : row.accountLimit}
                          </span>
                        ) : (
                          <span className="csp-dash-cell">—</span>
                        )}
                      </td>
                      <td>
                        {row.startDate !== "—" ? (
                          <span className="csp-date-val">
                            <Calendar size={13} className="csp-purple-icon" />
                            <span>{row.startDate}</span>
                          </span>
                        ) : (
                          <span className="csp-dash-cell">—</span>
                        )}
                      </td>
                      <td>
                        {row.renewalDate !== "—" ? (
                          <span className="csp-date-val">
                            <Calendar size={13} className="csp-purple-icon" />
                            <span>{row.renewalDate}</span>
                          </span>
                        ) : (
                          <span className="csp-dash-cell">—</span>
                        )}
                      </td>
                      <td>
                        {row.status !== "—" ? (
                          <span
                            className={`csp-status-pill ${statusClass}`}
                            title={`Status: ${row.status}. Click for details.`}
                            onClick={() => {
                              setDetailSub(row);
                              setDrawerTab("overview");
                            }}
                          >
                            <span className="csp-status-dot" />
                            {row.status}
                          </span>
                        ) : (
                          <span className="csp-dash-cell">—</span>
                        )}
                      </td>
                      <td>
                        <div className="csp-actions-group">
                          {/* 1. View Button (Soft Blue Pill) */}
                          <button
                            type="button"
                            className="csp-action-btn view"
                            title="View Subscription Details"
                            onClick={() => {
                              setDetailSub(row);
                              setDrawerTab("overview");
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* 2. Renew Button (Soft Amber Pill) */}
                          <button
                            type="button"
                            className="csp-action-btn renew"
                            title="Renew / Extend Subscription"
                            onClick={() => {
                              setRenewModalSub(row);
                              setRenewPeriod("1year");
                            }}
                          >
                            <Clock size={15} />
                          </button>

                          {/* 3. Edit Plan Button (Soft Green Pill) */}
                          <button
                            type="button"
                            className="csp-action-btn edit"
                            title="Change Subscription Plan"
                            onClick={() => {
                              setEditPlanSub(row);
                              setSelectedNewPlan(row.plan);
                            }}
                          >
                            <Pencil size={14} />
                          </button>

                          {/* 4. More Options Button (Soft Purple Pill) */}
                          <div className="csp-more-wrap">
                            <button
                              type="button"
                              className={`csp-action-btn more ${activeMenuId === rowId ? "is-open" : ""}`}
                              title="More Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === rowId ? null : rowId);
                              }}
                            >
                              <MoreVertical size={15} />
                            </button>

                            {/* Floating Popover Menu */}
                            {activeMenuId === rowId && (
                              <div className="csp-more-popover" onClick={(e) => e.stopPropagation()}>
                                <div className="csp-popover-header">
                                  <span className="csp-popover-name">{row.collegeName}</span>
                                  <span className="csp-popover-sub">Plan: {row.plan} • {row.status}</span>
                                </div>
                                <div className="csp-popover-divider" />
                                <button
                                  type="button"
                                  className="csp-popover-item"
                                  onClick={() => {
                                    setDetailSub(row);
                                    setDrawerTab("usage");
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <BarChart2 size={14} className="text-purple" />
                                  <span>Track Account Usage</span>
                                </button>
                                <button
                                  type="button"
                                  className="csp-popover-item"
                                  onClick={() => {
                                    navigate("/super-admin/payments-invoices");
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <CreditCard size={14} className="text-indigo" />
                                  <span>View Billing Invoices</span>
                                </button>
                                <div className="csp-popover-divider" />
                                <button
                                  type="button"
                                  className="csp-popover-item"
                                  onClick={() => {
                                    handleCancelSubscription(row);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <X size={14} className="text-red" />
                                  <span>Downgrade to Free</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!paginatedRows.length && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px" }}>
                      <p style={{ margin: 0, fontWeight: 700, color: "var(--cms-muted)" }}>
                        No college subscriptions found.
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--cms-muted)" }}>
                        Try clearing search or filters to see all subscriptions.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, padding: 18 }}>
            {paginatedRows.map((row) => {
              const planBadge = getPlanBadge(row.plan);
              const PlanIcon = planBadge.icon;
              const percentage = Math.round((row.activeAccounts / row.accountLimit) * 100);

              return (
                <article
                  key={row.id}
                  style={{
                    background: "var(--cms-surface)",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 14,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    boxShadow: "var(--cms-shadow)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="csp-college-icon">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <strong style={{ fontSize: 13.5, color: "var(--cms-text)" }}>{row.collegeName}</strong>
                        <div style={{ fontSize: 11, color: "var(--cms-muted)" }}>{row.collegeCode}</div>
                      </div>
                    </div>
                    <span className={`csp-plan-pill ${planBadge.class}`}>
                      <PlanIcon size={12} /> {row.plan}
                    </span>
                  </div>

                  {/* Capacity Progress */}
                  <div style={{ background: "var(--cms-subtle)", padding: 10, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                      <span>Account Usage</span>
                      <span>{row.activeAccounts} / {row.accountLimit} ({percentage}%)</span>
                    </div>
                    <div className="csp-progress-bar-wrap">
                      <div
                        className={`csp-progress-fill ${percentage >= 90 ? "red" : percentage >= 70 ? "orange" : "green"}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--cms-muted)" }}>
                    <span>Renewal: <strong>{row.renewalDate}</strong></span>
                    <span className={`csp-status-pill ${row.status === "Active" ? "is-active" : row.status === "Free" ? "is-free" : row.status === "Expiring Soon" ? "is-expiring" : "is-expired"}`}>
                      {row.status}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, paddingTop: 6, borderTop: "1px solid var(--cms-border)" }}>
                    <button
                      type="button"
                      className="csp-action-btn view"
                      title="View Details"
                      onClick={() => {
                        setDetailSub(row);
                        setDrawerTab("overview");
                      }}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      className="csp-action-btn renew"
                      title="Renew"
                      onClick={() => setRenewModalSub(row)}
                    >
                      <Clock size={14} />
                    </button>
                    <button
                      type="button"
                      className="csp-action-btn edit"
                      title="Change Plan"
                      onClick={() => {
                        setEditPlanSub(row);
                        setSelectedNewPlan(row.plan);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── Standardized Super Admin Pagination ── */}
        <SuperAdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsOptions={[5, 10, 20]}
          unit="subscriptions"
        />
      </div>

      {/* ── BOTTOM KEY ACTIONS PANEL (Left to Right Full Width) ── */}
      <section className="csp-key-actions-container">
        <div className="csp-key-actions-header">
          <span className="csp-key-actions-title">Key Actions</span>
          <span className="csp-key-actions-subtitle">Quick shortcuts for platform subscription management</span>
        </div>
        <div className="csp-key-actions-grid">
          {/* Action 1: Assign / Update */}
          <button
            type="button"
            className="csp-key-action-btn green"
            onClick={() => setAssignModal(true)}
          >
            <div className="csp-key-action-icon">
              <CheckCircle2 size={19} />
            </div>
            <div className="csp-key-action-text-wrap">
              <span className="csp-key-action-title-text">Assign / Update Subscription</span>
              <span className="csp-key-action-desc-text">Configure plans &amp; account limits</span>
            </div>
          </button>

          {/* Action 2: Renew */}
          <button
            type="button"
            className="csp-key-action-btn purple"
            onClick={() => {
              if (subscriptions.length) {
                setRenewModalSub(subscriptions[0]);
              }
            }}
          >
            <div className="csp-key-action-icon">
              <RefreshCw size={19} />
            </div>
            <div className="csp-key-action-text-wrap">
              <span className="csp-key-action-title-text">Renew Subscription</span>
              <span className="csp-key-action-desc-text">Extend validity for 30d, 90d or 1yr</span>
            </div>
          </button>

          {/* Action 3: Track Usage */}
          <button
            type="button"
            className="csp-key-action-btn blue"
            onClick={() => {
              if (subscriptions.length) {
                setDetailSub(subscriptions[0]);
                setDrawerTab("usage");
              }
            }}
          >
            <div className="csp-key-action-icon">
              <BarChart2 size={19} />
            </div>
            <div className="csp-key-action-text-wrap">
              <span className="csp-key-action-title-text">Track Usage &amp; Limits</span>
              <span className="csp-key-action-desc-text">Monitor active accounts &amp; capacity</span>
            </div>
          </button>

          {/* Action 4: View Invoices */}
          <button
            type="button"
            className="csp-key-action-btn indigo"
            onClick={() => navigate("/super-admin/payments-invoices")}
          >
            <div className="csp-key-action-icon">
              <FileText size={19} />
            </div>
            <div className="csp-key-action-text-wrap">
              <span className="csp-key-action-title-text">View Invoices</span>
              <span className="csp-key-action-desc-text">Access billing history &amp; receipts</span>
            </div>
          </button>
        </div>
      </section>

      {/* ── SLIDE-OVER SUBSCRIPTION DETAIL DRAWER ── */}
      {detailSub && (
        <div className="csp-drawer-overlay" onClick={() => setDetailSub(null)}>
          <aside className="csp-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="csp-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="csp-college-icon" style={{ width: 44, height: 44 }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--cms-text)" }}>
                    {detailSub.collegeName}
                  </h2>
                  <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                    Code: {detailSub.collegeCode} • {detailSub.plan} Plan
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="csp-drawer-close"
                onClick={() => setDetailSub(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="csp-drawer-tabs">
              <button
                type="button"
                className={`csp-drawer-tab ${drawerTab === "overview" ? "is-active" : ""}`}
                onClick={() => setDrawerTab("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={`csp-drawer-tab ${drawerTab === "usage" ? "is-active" : ""}`}
                onClick={() => setDrawerTab("usage")}
              >
                Usage &amp; Limits
              </button>
              <button
                type="button"
                className={`csp-drawer-tab ${drawerTab === "modules" ? "is-active" : ""}`}
                onClick={() => setDrawerTab("modules")}
              >
                Included Modules
              </button>
            </div>

            <div className="csp-drawer-body">
              {drawerTab === "overview" && (
                <>
                  <div className="csp-drawer-card">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cms-muted)", textTransform: "uppercase" }}>
                      Subscription Plan
                    </span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className={`csp-plan-pill ${getPlanBadge(detailSub.plan).class}`}>
                        {detailSub.plan} Plan
                      </span>
                      <button
                        type="button"
                        className="csp-preset-pill"
                        style={{ padding: "4px 10px", fontSize: 11.5 }}
                        onClick={() => {
                          setEditPlanSub(detailSub);
                          setSelectedNewPlan(detailSub.plan);
                        }}
                      >
                        <Pencil size={11} /> Change Plan
                      </button>
                    </div>
                  </div>

                  <div className="csp-drawer-card">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cms-muted)", textTransform: "uppercase" }}>
                      Billing &amp; Validity
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--cms-muted)" }}>Start Date</span>
                        <div style={{ fontWeight: 700, color: "var(--cms-text)", marginTop: 2 }}>{detailSub.startDate}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "var(--cms-muted)" }}>Renewal Date</span>
                        <div style={{ fontWeight: 700, color: "var(--cms-text)", marginTop: 2 }}>{detailSub.renewalDate}</div>
                      </div>
                    </div>
                  </div>

                  <div className="csp-drawer-card">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cms-muted)", textTransform: "uppercase" }}>
                      Subscription Actions
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="csp-assign-btn"
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => {
                          setRenewModalSub(detailSub);
                          setRenewPeriod("1year");
                        }}
                      >
                        <Clock size={14} /> Renew Subscription
                      </button>
                      <button
                        type="button"
                        className="csp-export-btn"
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => handleCancelSubscription(detailSub)}
                      >
                        Cancel Plan
                      </button>
                    </div>
                  </div>
                </>
              )}

              {drawerTab === "usage" && (
                <div className="csp-drawer-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cms-muted)", textTransform: "uppercase" }}>
                    Account Capacity
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                    <strong style={{ fontSize: 24, color: "var(--cms-text)" }}>{detailSub.activeAccounts}</strong>
                    <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>/ {detailSub.accountLimit} Allowed Accounts</span>
                  </div>
                  <div className="csp-progress-bar-wrap" style={{ height: 10, marginTop: 8 }}>
                    <div
                      className="csp-progress-fill green"
                      style={{ width: `${Math.min(100, (detailSub.activeAccounts / detailSub.accountLimit) * 100)}%` }}
                    />
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--cms-muted)" }}>
                    Available logins remaining: <strong>{Math.max(0, detailSub.accountLimit - detailSub.activeAccounts)}</strong>
                  </p>
                </div>
              )}

              {drawerTab === "modules" && (
                <div className="csp-drawer-card">
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cms-muted)", textTransform: "uppercase" }}>
                    Included Feature Modules
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    {(detailSub.modules || ["Academic Management", "Examinations", "Attendance", "Fees", "Staff"]).map((mod, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cms-text)" }}>
                        <CheckCircle2 size={14} color="#16a34a" />
                        <span>{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── ASSIGN / UPDATE SUBSCRIPTION MODAL ── */}
      {assignModal && (
        <Modal
          title="Assign / Update College Subscription"
          onClose={() => setAssignModal(false)}
        >
          <form onSubmit={handleAssignSubmit}>
            <div className="csp-modal-field">
              <label>Select College *</label>
              <select
                className="csp-modal-select"
                value={assignCollegeId}
                onChange={(e) => setAssignCollegeId(e.target.value)}
                required
              >
                <option value="">-- Choose College --</option>
                {allColleges.map((s) => (
                  <option key={s.collegeId || s.id} value={s.collegeId || s.id}>
                    {s.name || s.collegeName} ({s.code || s.collegeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="csp-modal-field">
              <label>Subscription Tier *</label>
              <div className="csp-plans-picker-grid">
                {availablePlans.map((p) => {
                  const PIcon = p.icon;
                  return (
                    <div
                      key={p.name}
                      className={`csp-plan-option-card ${selectedNewPlan === p.name ? "is-selected" : ""}`}
                      onClick={() => setSelectedNewPlan(p.name)}
                    >
                      <PIcon size={18} color={selectedNewPlan === p.name ? "#16a34a" : "var(--cms-muted)"} />
                      <div className="csp-plan-option-name">{p.name}</div>
                      <div className="csp-plan-option-price">{p.price}</div>
                      <div className="csp-plan-option-limit">Up to {p.limit} accounts</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="csp-modal-field">
              <label>Billing Cycle *</label>
              <select
                className="csp-modal-select"
                value={assignCycle}
                onChange={(e) => setAssignCycle(e.target.value)}
              >
                <option value="annual">Annual (12 Months - Recommended)</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (3 Months)</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setAssignModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Activating..." : "Activate Subscription"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── RENEW SUBSCRIPTION MODAL ── */}
      {renewModalSub && (
        <Modal
          title={`Renew Subscription: ${renewModalSub.collegeName}`}
          onClose={() => setRenewModalSub(null)}
        >
          <form onSubmit={handleRenewSubmit}>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--cms-muted)" }}>
              Current renewal date: <strong>{renewModalSub.renewalDate}</strong> ({renewModalSub.plan} Plan)
            </p>

            <div className="csp-modal-field">
              <label>Choose Extension Period *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className={`csp-preset-pill ${renewPeriod === "30days" ? "is-active" : ""}`}
                  style={{ justifyContent: "center", padding: "10px" }}
                  onClick={() => setRenewPeriod("30days")}
                >
                  + 30 Days
                </button>
                <button
                  type="button"
                  className={`csp-preset-pill ${renewPeriod === "90days" ? "is-active" : ""}`}
                  style={{ justifyContent: "center", padding: "10px" }}
                  onClick={() => setRenewPeriod("90days")}
                >
                  + 90 Days
                </button>
                <button
                  type="button"
                  className={`csp-preset-pill ${renewPeriod === "1year" ? "is-active" : ""}`}
                  style={{ justifyContent: "center", padding: "10px" }}
                  onClick={() => setRenewPeriod("1year")}
                >
                  + 1 Year (12 Mos)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setRenewModalSub(null)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Extending..." : "Confirm & Extend"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── EDIT PLAN MODAL ── */}
      {editPlanSub && (
        <Modal
          title={`Change Plan for ${editPlanSub.collegeName}`}
          onClose={() => setEditPlanSub(null)}
        >
          <form onSubmit={handleSavePlanChange}>
            <div className="csp-modal-field">
              <label>Select New Plan *</label>
              <div className="csp-plans-picker-grid">
                {availablePlans.map((p) => {
                  const PIcon = p.icon;
                  return (
                    <div
                      key={p.name}
                      className={`csp-plan-option-card ${selectedNewPlan === p.name ? "is-selected" : ""}`}
                      onClick={() => setSelectedNewPlan(p.name)}
                    >
                      <PIcon size={18} color={selectedNewPlan === p.name ? "#16a34a" : "var(--cms-muted)"} />
                      <div className="csp-plan-option-name">{p.name}</div>
                      <div className="csp-plan-option-price">{p.price}</div>
                      <div className="csp-plan-option-limit">Up to {p.limit} accounts</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setEditPlanSub(null)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Plan"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirmation Dialog ── */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.run();
            setConfirm(null);
          }}
        />
      )}

      {/* ── Interactive Toast Notification ── */}
      {toast && (
        <div className={`csp-toast ${toast.type}`}>
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
          <button
            type="button"
            className="csp-toast-close"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
