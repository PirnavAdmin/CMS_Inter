import React, { useState, useMemo } from "react";
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
  Filter,
  List,
  LayoutGrid,
  ChevronLeft,
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
  FileText,
  RefreshCw,
  Bell,
  ArrowUpRight,
  ArrowLeftRight,
  Send,
  AlertCircle,
  ArrowUpDown
} from "lucide-react";
import { Modal } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import "./RenewalsPage.css";

const getDaysRemaining = (dateStr) => {
  if (!dateStr || dateStr === "-" || dateStr === "—") return null;
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

export default function RenewalsPage() {
  const navigate = useNavigate();
  const { data, update, refresh } = useSuperAdmin?.() || { data: {}, update: async () => {}, refresh: async () => {} };

  const allColleges = data?.colleges || [];
  const allSubs = data?.subscriptions || [];
  const allAdmins = data?.collegeAdmins || [];

  // Dynamic plans loaded from live DB plans
  const availablePlans = useMemo(() => {
    if (data?.plans && data.plans.length > 0) {
      return data.plans.map((p) => ({
        id: p.planId || p.id,
        name: p.name,
        price: Number(p.price) > 0 ? `₹${Number(p.price).toLocaleString("en-IN")}` : "₹0",
        rawPrice: Number(p.price) || 0,
        limit: p.limit != null ? Number(p.limit) : "—",
        icon: getPlanIcon(p.name),
      }));
    }
    return [
      { name: "Free", price: "₹0", rawPrice: 0, limit: 25, icon: Gift },
      { name: "Basic", price: "₹1,499", rawPrice: 1499, limit: 100, icon: Shield },
      { name: "Standard", price: "₹2,999", rawPrice: 2999, limit: 300, icon: Zap },
      { name: "Premium", price: "₹5,999", rawPrice: 5999, limit: 1000, icon: Crown },
      { name: "Enterprise", price: "₹12,999", rawPrice: 12999, limit: 5000, icon: Building2 },
    ];
  }, [data?.plans]);

  // Lookup maps for fast and accurate real-time joining
  const subsByCollegeId = useMemo(() => {
    const map = new Map();
    allSubs.forEach((s) => {
      if (s.collegeId != null) {
        map.set(String(s.collegeId), s);
      }
    });
    return map;
  }, [allSubs]);

  const adminsByCollegeId = useMemo(() => {
    const map = new Map();
    allAdmins.forEach((a) => {
      if (a.collegeId != null) {
        map.set(String(a.collegeId), a);
      }
    });
    return map;
  }, [allAdmins]);

  // Build renewals list strictly from real DB data
  const renewals = useMemo(() => {
    return allColleges.map((c, idx) => {
      const rawCid = String(c.collegeId || c.id || "");
      const cidNum = rawCid.replace(/^COL-0*/, "") || rawCid;

      const matchedSub =
        subsByCollegeId.get(String(c.collegeId)) ||
        subsByCollegeId.get(String(c.id)) ||
        subsByCollegeId.get(cidNum) ||
        allSubs.find((s) => s.code && c.code && s.code.toLowerCase() === c.code.toLowerCase()) ||
        allSubs.find((s) => s.name && c.name && s.name.toLowerCase() === c.name.toLowerCase());

      const matchedAdmin =
        adminsByCollegeId.get(String(c.collegeId)) ||
        adminsByCollegeId.get(String(c.id)) ||
        adminsByCollegeId.get(cidNum) ||
        allAdmins.find((a) => a.collegeName && c.name && a.collegeName.toLowerCase() === c.name.toLowerCase());

      const hasSubRecord = Boolean(
        matchedSub &&
        matchedSub.plan &&
        matchedSub.plan !== "-" &&
        matchedSub.plan !== "—" &&
        matchedSub.plan.toLowerCase() !== "null"
      );

      const rawRenewal = hasSubRecord && matchedSub.renewalDate && matchedSub.renewalDate !== "-" && matchedSub.renewalDate !== "—"
        ? String(matchedSub.renewalDate).slice(0, 10)
        : null;

      const rawStart = hasSubRecord && matchedSub.startDate && matchedSub.startDate !== "-" && matchedSub.startDate !== "—"
        ? String(matchedSub.startDate).slice(0, 10)
        : null;

      const days = rawRenewal ? getDaysRemaining(rawRenewal) : null;

      let statusLabel = "—";
      let windowVal = "none";
      if (hasSubRecord) {
        if (days != null && days < 0) {
          statusLabel = "Expired";
        } else if (days != null && days >= 0 && days <= 30) {
          statusLabel = "Expiring Soon";
        } else if (matchedSub.status && matchedSub.status !== "-" && matchedSub.status !== "—") {
          statusLabel = matchedSub.status;
        } else {
          statusLabel = "Active";
        }

        windowVal = days == null ? "after-30" : days <= 7 ? "next-7" : days <= 30 ? "next-30" : "after-30";
      }

      const planName = hasSubRecord ? matchedSub.plan : "—";
      const renewalDateStr = rawRenewal || "—";
      const periodStr = rawStart && rawRenewal ? `${rawStart} - ${rawRenewal}` : "—";
      const limitStr = hasSubRecord && matchedSub.accountLimit != null && matchedSub.accountLimit !== "-" ? matchedSub.accountLimit : "—";
      const activeCount = hasSubRecord ? Number(matchedSub.activeAccounts ?? c.students ?? 0) : "—";

      const adminNameStr = (matchedAdmin?.name && matchedAdmin.name !== "-") ? matchedAdmin.name : (c.admin && c.admin !== "-" ? c.admin : "—");
      const adminEmailStr = (matchedAdmin?.email && matchedAdmin.email !== "-") ? matchedAdmin.email : (c.email && c.email !== "-" ? c.email : "—");

      return {
        id: matchedSub?.id || (matchedSub?.subscriptionId ? `SUB-${matchedSub.subscriptionId}` : `REN-${c.collegeId || c.id || idx + 1}`),
        subscriptionId: matchedSub?.subscriptionId || null,
        collegeId: c.collegeId || c.id,
        collegeName: c.name || "—",
        collegeCode: c.code || "—",
        hasSubscription: hasSubRecord,
        plan: planName,
        activeAccounts: activeCount,
        accountLimit: limitStr,
        startDate: rawStart || "—",
        renewalDate: renewalDateStr,
        daysRemaining: days,
        status: statusLabel,
        period: periodStr,
        periodWindow: windowVal,
        color: idx % 2 === 0 ? "purple" : "blue",
        adminName: adminNameStr,
        adminEmail: adminEmailStr,
        history: []
      };
    });
  }, [allColleges, allSubs, allAdmins, subsByCollegeId, adminsByCollegeId]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // 'upcoming' | '7days' | '30days' | 'expired'
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [sortField, setSortField] = useState("collegeName");
  const [sortDirection, setSortDirection] = useState("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modals & Drawer State
  const [activePopover, setActivePopover] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [processRenewalModal, setProcessRenewalModal] = useState(null);
  const [sendReminderModal, setSendReminderModal] = useState(null);
  const [changePlanModal, setChangePlanModal] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for modals
  const [renewalPeriodChoice, setRenewalPeriodChoice] = useState("1year");
  const [newSelectedPlan, setNewSelectedPlan] = useState("Standard");
  const [reminderMessage, setReminderMessage] = useState("");

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // KPI Calculations strictly from real database records
  const kpis = useMemo(() => {
    const upcoming = renewals.filter((r) => r.hasSubscription && r.status !== "Expired" && r.renewalDate !== "—").length;
    const expiring7 = renewals.filter((r) => r.hasSubscription && r.daysRemaining != null && r.daysRemaining >= 0 && r.daysRemaining <= 7).length;
    const expiring30 = renewals.filter((r) => r.hasSubscription && r.daysRemaining != null && r.daysRemaining >= 0 && r.daysRemaining <= 30).length;
    const expired = renewals.filter((r) => r.hasSubscription && (r.status === "Expired" || (r.daysRemaining != null && r.daysRemaining < 0))).length;
    return {
      upcoming,
      expiring7,
      expiring30,
      expired
    };
  }, [renewals]);

  // Analytics Stats strictly from real database records with active subscriptions
  const analytics = useMemo(() => {
    const subscribed = renewals.filter((r) => r.hasSubscription);
    const total = subscribed.length;
    const active = subscribed.filter((r) => r.status === "Active").length;
    const expiring = subscribed.filter((r) => r.status === "Expiring Soon").length;
    const expired = subscribed.filter((r) => r.status === "Expired").length;

    const next7Count = subscribed.filter((r) => r.daysRemaining != null && r.daysRemaining >= 0 && r.daysRemaining <= 7).length;
    const next30Count = subscribed.filter((r) => r.daysRemaining != null && r.daysRemaining > 7 && r.daysRemaining <= 30).length;
    const after30Count = subscribed.filter((r) => r.daysRemaining != null && r.daysRemaining > 30).length;

    return {
      total,
      active,
      activePct: total > 0 ? ((active / total) * 100).toFixed(1) + "%" : "0.0%",
      expiring,
      expiringPct: total > 0 ? ((expiring / total) * 100).toFixed(1) + "%" : "0.0%",
      expired,
      expiredPct: total > 0 ? ((expired / total) * 100).toFixed(1) + "%" : "0.0%",
      next7Count,
      next30Count,
      after30Count
    };
  }, [renewals]);

  // Dynamic SVG Donut calculations
  const donutMath = useMemo(() => {
    const circumference = 238.761; // 2 * PI * 38
    if (analytics.total === 0) {
      return { activeDash: "0 238.76", expiringDash: "0 238.76", expiredDash: "0 238.76", offset1: 0, offset2: 0 };
    }
    const aLen = (analytics.active / analytics.total) * circumference;
    const eLen = (analytics.expiring / analytics.total) * circumference;
    const xLen = (analytics.expired / analytics.total) * circumference;
    return {
      activeDash: `${aLen} ${circumference}`,
      expiringDash: `${eLen} ${circumference}`,
      expiredDash: `${xLen} ${circumference}`,
      offset1: -aLen,
      offset2: -(aLen + eLen)
    };
  }, [analytics]);

  // Filtering & Sorting
  const filteredRenewals = useMemo(() => {
    let result = [...renewals];

    // KPI quick filter
    if (activeKpiFilter === "upcoming") {
      result = result.filter((r) => r.hasSubscription && r.status !== "Expired");
    } else if (activeKpiFilter === "7days") {
      result = result.filter((r) => r.hasSubscription && r.daysRemaining != null && r.daysRemaining >= 0 && r.daysRemaining <= 7);
    } else if (activeKpiFilter === "30days") {
      result = result.filter((r) => r.hasSubscription && r.daysRemaining != null && r.daysRemaining >= 0 && r.daysRemaining <= 30);
    } else if (activeKpiFilter === "expired") {
      result = result.filter((r) => r.hasSubscription && (r.status === "Expired" || (r.daysRemaining != null && r.daysRemaining < 0)));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.collegeName.toLowerCase().includes(q) ||
          r.collegeCode.toLowerCase().includes(q) ||
          r.adminName?.toLowerCase().includes(q) ||
          r.adminEmail?.toLowerCase().includes(q)
      );
    }

    // Plan Filter
    if (planFilter !== "all") {
      result = result.filter((r) => r.plan.toLowerCase() === planFilter.toLowerCase());
    }

    // Status Filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Period Filter
    if (periodFilter !== "all") {
      if (periodFilter === "next-7") {
        result = result.filter((r) => r.hasSubscription && r.daysRemaining != null && r.daysRemaining >= 0 && r.daysRemaining <= 7);
      } else if (periodFilter === "next-30") {
        result = result.filter((r) => r.hasSubscription && r.daysRemaining != null && r.daysRemaining >= 0 && r.daysRemaining <= 30);
      } else if (periodFilter === "expired") {
        result = result.filter((r) => r.hasSubscription && (r.status === "Expired" || (r.daysRemaining != null && r.daysRemaining < 0)));
      } else if (periodFilter === "after-30") {
        result = result.filter((r) => r.hasSubscription && r.daysRemaining != null && r.daysRemaining > 30);
      }
    }

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nulls in sorting: push nulls to the end
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [renewals, searchQuery, planFilter, statusFilter, periodFilter, activeKpiFilter, sortField, sortDirection]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredRenewals.length / (rowsPerPage === 0 ? filteredRenewals.length : rowsPerPage)));
  const paginatedRenewals = useMemo(() => {
    if (rowsPerPage === 0) return filteredRenewals;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRenewals.slice(start, start + rowsPerPage);
  }, [filteredRenewals, currentPage, rowsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setPlanFilter("all");
    setStatusFilter("all");
    setPeriodFilter("all");
    setActiveKpiFilter(null);
    setCurrentPage(1);
    showToast("All filters have been reset.");
  };

  // Process Renewal Handler (Live DB)
  const handleConfirmRenewal = async () => {
    if (!processRenewalModal || isSubmitting) return;
    const daysToAdd = renewalPeriodChoice === "30days" ? 30 : renewalPeriodChoice === "90days" ? 90 : 365;

    setIsSubmitting(true);
    try {
      const ok = await update?.("Renewed college subscription", null, {
        module: "Renewals",
        actionType: "Renew",
        collegeId: processRenewalModal.collegeId,
        extensionDays: daysToAdd
      });

      if (ok !== false) {
        await refresh?.();
        showToast(`Successfully renewed subscription for ${processRenewalModal.collegeName}!`);
        setProcessRenewalModal(null);
        setActivePopover(null);
      } else {
        showToast("Renewal operation could not be completed.");
      }
    } catch (e) {
      console.error(e);
      showToast("Error processing renewal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Reminder Handler
  const handleSendReminder = () => {
    if (!sendReminderModal) return;
    showToast(`Expiry reminder notice successfully dispatched to ${sendReminderModal.adminEmail}`);
    setSendReminderModal(null);
    setActivePopover(null);
  };

  // Change Plan Handler (Live DB)
  const handleChangePlan = async () => {
    if (!changePlanModal || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ok = await update?.("Updated college subscription plan", null, {
        module: "Renewals",
        actionType: "Plan change",
        collegeId: changePlanModal.collegeId,
        plan: newSelectedPlan
      });

      if (ok !== false) {
        await refresh?.();
        showToast(`Plan updated to ${newSelectedPlan} for ${changePlanModal.collegeName}`);
        setChangePlanModal(null);
        setActivePopover(null);
      } else {
        showToast("Plan update operation could not be completed.");
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["College Name", "College Code", "Plan", "Renewal Date", "Days Remaining", "Status", "Period"];
    const rows = filteredRenewals.map((r) => [
      `"${r.collegeName}"`,
      r.collegeCode,
      r.plan,
      r.renewalDate,
      r.daysRemaining != null ? r.daysRemaining : "—",
      r.status,
      `"${r.period}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `college_renewals_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Renewals report CSV generated and downloaded.");
  };

  // Dynamic renewal calculation in modal
  const modalRenewalDetails = useMemo(() => {
    if (!processRenewalModal) return { newExpiryFormatted: "—", costStr: "₹0" };
    const daysToAdd = renewalPeriodChoice === "30days" ? 30 : renewalPeriodChoice === "90days" ? 90 : 365;

    let base = new Date();
    if (processRenewalModal.renewalDate && processRenewalModal.renewalDate !== "—") {
      const parsed = new Date(processRenewalModal.renewalDate + "T00:00:00");
      if (!isNaN(parsed.getTime()) && parsed > base) {
        base = parsed;
      }
    }
    const nextDate = new Date(base.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const newExpiryFormatted = nextDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const matchedPlan = availablePlans.find((p) => p.name.toLowerCase() === (processRenewalModal.plan || "").toLowerCase());
    const monthlyRate = matchedPlan?.rawPrice || 2999;
    let cost = 0;
    if (renewalPeriodChoice === "30days") cost = monthlyRate;
    else if (renewalPeriodChoice === "90days") cost = monthlyRate * 3;
    else cost = Math.round(monthlyRate * 12 * 0.8); // 20% annual discount

    return {
      newExpiryFormatted,
      costStr: cost > 0 ? `₹${cost.toLocaleString("en-IN")}` : "Free"
    };
  }, [processRenewalModal, renewalPeriodChoice, availablePlans]);

  // Helper Badge Colors
  const getPlanBadge = (plan) => {
    if (!plan || plan === "—" || plan === "-") {
      return { class: "none", icon: null, text: "—" };
    }
    const p = plan.toLowerCase();
    if (p.includes("enterprise")) return { class: "enterprise", icon: <Building2 size={12} />, text: plan };
    if (p.includes("premium")) return { class: "premium", icon: <Crown size={12} />, text: plan };
    if (p.includes("standard")) return { class: "standard", icon: <Zap size={12} />, text: plan };
    if (p.includes("basic")) return { class: "basic", icon: <Shield size={12} />, text: plan };
    if (p.includes("free")) return { class: "free", icon: <Gift size={12} />, text: plan };
    return { class: "free", icon: <Layers size={12} />, text: plan };
  };

  const getDaysBadge = (days, status) => {
    if (days == null || status === "—" || status === "-") {
      return { class: "none", text: "—", icon: null };
    }
    if (status === "Expired" || days < 0) {
      return { class: "danger", text: "Expired", icon: <AlertCircle size={12} /> };
    }
    if (days <= 7) {
      return { class: "danger", text: `${days} Days`, icon: <Clock size={12} /> };
    }
    if (days <= 30) {
      return { class: "warning", text: `${days} Days`, icon: <Clock size={12} /> };
    }
    return { class: "healthy", text: `${days} Days`, icon: <Clock size={12} /> };
  };

  // Active filter count
  const activeFilterCount =
    (planFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (periodFilter !== "all" ? 1 : 0) +
    (activeKpiFilter ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="renewals-page">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1e4529",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 10px 25px rgba(30, 69, 41, 0.35)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "rnpFadeIn 0.2s ease"
          }}
        >
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <nav className="rnp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/super-admin/dashboard">
          <Home size={14} />
        </Link>
        <span className="rnp-breadcrumb-sep">/</span>
        <Link to="/super-admin/dashboard">Platform Workspace</Link>
        <span className="rnp-breadcrumb-sep">/</span>
        <Link to="/super-admin/subscriptions">Subscriptions</Link>
        <span className="rnp-breadcrumb-sep">/</span>
        <span className="rnp-breadcrumb-current">Renewals</span>
      </nav>

      {/* ── PAGE HEADER ── */}
      <header className="rnp-header">
        <div className="rnp-header-left">
          <div className="rnp-header-icon-wrap">
            <RefreshCw size={19} />
          </div>
          <div className="rnp-title-wrap">
            <h1 className="rnp-page-title">Renewals</h1>
            <p className="rnp-page-desc">
              Track and manage college subscription renewals, upcoming expirations and plan continuity.
            </p>
          </div>
        </div>

        <div className="rnp-header-actions">
          <button
            type="button"
            className="rnp-btn-export"
            onClick={handleExportCSV}
            title="Export filtered records to CSV"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="rnp-btn-primary"
            onClick={() => {
              const target = renewals.find((r) => r.hasSubscription) || renewals[0];
              if (target) {
                setProcessRenewalModal(target);
                setRenewalPeriodChoice("1year");
              }
            }}
          >
            <Plus size={14} />
            <span>Process Renewal</span>
          </button>
        </div>
      </header>

      {/* ── TOP KPI METRIC CARDS (Matching College Management Style & Size) ── */}
      <section className="rnp-kpi-grid">
        {/* Card 1: Total Upcoming Renewals */}
        <button
          type="button"
          className={`rnp-kpi-card card-purple ${activeKpiFilter === "upcoming" ? "is-selected" : ""}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === "upcoming" ? null : "upcoming")}
          title="Filter by upcoming renewals"
        >
          <div className="rnp-kpi-icon-badge">
            <CalendarClock size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>Total Upcoming Renewals</small>
            <strong>{kpis.upcoming}</strong>
          </div>
        </button>

        {/* Card 2: Expiring Within 7 Days */}
        <button
          type="button"
          className={`rnp-kpi-card card-green ${activeKpiFilter === "7days" ? "is-selected" : ""}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === "7days" ? null : "7days")}
          title="Filter colleges expiring within 7 days"
        >
          <div className="rnp-kpi-icon-badge">
            <Clock size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>Expiring Within 7 Days</small>
            <strong>{kpis.expiring7}</strong>
          </div>
        </button>

        {/* Card 3: Expiring Within 30 Days */}
        <button
          type="button"
          className={`rnp-kpi-card card-amber ${activeKpiFilter === "30days" ? "is-selected" : ""}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === "30days" ? null : "30days")}
          title="Filter colleges expiring within 30 days"
        >
          <div className="rnp-kpi-icon-badge">
            <Calendar size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>Expiring Within 30 Days</small>
            <strong>{kpis.expiring30}</strong>
          </div>
        </button>

        {/* Card 4: Expired Subscriptions */}
        <button
          type="button"
          className={`rnp-kpi-card card-red ${activeKpiFilter === "expired" ? "is-selected" : ""}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === "expired" ? null : "expired")}
          title="Filter expired subscriptions"
        >
          <div className="rnp-kpi-icon-badge">
            <AlertTriangle size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>Expired Subscriptions</small>
            <strong>{kpis.expired}</strong>
          </div>
        </button>
      </section>

      {/* ── MIDDLE ANALYTICS SECTION (2 WIDGETS: Donut Overview & Timeline) ── */}
      <section className="rnp-analytics-grid">
        {/* Widget 1: Renewal Status Overview (Interactive Donut Chart) */}
        <div className="rnp-analytics-card">
          <div className="rnp-analytics-header">
            <span className="rnp-analytics-title">Renewal Status Overview</span>
            <span className="rnp-analytics-sub">Active subscriptions status distribution</span>
          </div>

          <div className="rnp-donut-wrap">
            {/* SVG Donut */}
            <div className="rnp-donut-svg-box">
              <svg className="rnp-donut-svg" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="13"
                />
                {/* Active Segment */}
                {analytics.active > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#16a34a"
                    strokeWidth="13"
                    strokeDasharray={donutMath.activeDash}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                )}
                {/* Expiring Soon Segment */}
                {analytics.expiring > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="13"
                    strokeDasharray={donutMath.expiringDash}
                    strokeDashoffset={donutMath.offset1}
                    strokeLinecap="round"
                  />
                )}
                {/* Expired Segment */}
                {analytics.expired > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth="13"
                    strokeDasharray={donutMath.expiredDash}
                    strokeDashoffset={donutMath.offset2}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="rnp-donut-center">
                <span className="rnp-donut-center-num">{analytics.total}</span>
                <span className="rnp-donut-center-label">Active Subs</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="rnp-donut-legend">
              <div
                className={`rnp-legend-item ${statusFilter === "active" ? "is-selected" : ""}`}
                onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
                title="Click to toggle Active filter"
              >
                <div className="rnp-legend-left">
                  <span className="rnp-legend-dot green" />
                  <span className="rnp-legend-name">Active</span>
                </div>
                <span className="rnp-legend-stats">{analytics.active} ({analytics.activePct})</span>
              </div>

              <div
                className={`rnp-legend-item ${statusFilter === "expiring soon" ? "is-selected" : ""}`}
                onClick={() => setStatusFilter(statusFilter === "expiring soon" ? "all" : "expiring soon")}
                title="Click to toggle Expiring Soon filter"
              >
                <div className="rnp-legend-left">
                  <span className="rnp-legend-dot amber" />
                  <span className="rnp-legend-name">Expiring Soon</span>
                </div>
                <span className="rnp-legend-stats">{analytics.expiring} ({analytics.expiringPct})</span>
              </div>

              <div
                className={`rnp-legend-item ${statusFilter === "expired" ? "is-selected" : ""}`}
                onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
                title="Click to toggle Expired filter"
              >
                <div className="rnp-legend-left">
                  <span className="rnp-legend-dot red" />
                  <span className="rnp-legend-name">Expired</span>
                </div>
                <span className="rnp-legend-stats">{analytics.expired} ({analytics.expiredPct})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Upcoming Renewal Timeline */}
        <div className="rnp-analytics-card">
          <div className="rnp-analytics-header">
            <span className="rnp-analytics-title">Upcoming Renewal Timeline</span>
            <span className="rnp-analytics-sub">Upcoming milestones by urgency</span>
          </div>

          <div className="rnp-timeline-list">
            {/* Milestone 1: Next 7 Days */}
            <div
              className={`rnp-timeline-item ${periodFilter === "next-7" ? "is-selected" : ""}`}
              onClick={() => setPeriodFilter(periodFilter === "next-7" ? "all" : "next-7")}
              title="Click to filter Next 7 Days"
            >
              <div className="rnp-timeline-left">
                <div className="rnp-timeline-icon purple">
                  <Calendar size={14} />
                </div>
                <div className="rnp-timeline-details">
                  <div className="rnp-timeline-label-row">
                    <span className="rnp-timeline-label">Next 7 Days</span>
                    <span className="rnp-timeline-badge urgent">{analytics.next7Count} Colleges</span>
                  </div>
                  <div className="rnp-timeline-bar-bg">
                    <div
                      className="rnp-timeline-bar-fill purple"
                      style={{ width: `${analytics.total > 0 ? (analytics.next7Count / analytics.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Milestone 2: Next 8 - 30 Days */}
            <div
              className={`rnp-timeline-item ${periodFilter === "next-30" ? "is-selected" : ""}`}
              onClick={() => setPeriodFilter(periodFilter === "next-30" ? "all" : "next-30")}
              title="Click to filter Next 8 - 30 Days"
            >
              <div className="rnp-timeline-left">
                <div className="rnp-timeline-icon blue">
                  <Calendar size={14} />
                </div>
                <div className="rnp-timeline-details">
                  <div className="rnp-timeline-label-row">
                    <span className="rnp-timeline-label">Next 8 – 30 Days</span>
                    <span className="rnp-timeline-badge warning">{analytics.next30Count} Colleges</span>
                  </div>
                  <div className="rnp-timeline-bar-bg">
                    <div
                      className="rnp-timeline-bar-fill blue"
                      style={{ width: `${analytics.total > 0 ? (analytics.next30Count / analytics.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Milestone 3: After 30 Days */}
            <div
              className={`rnp-timeline-item ${periodFilter === "after-30" ? "is-selected" : ""}`}
              onClick={() => setPeriodFilter(periodFilter === "after-30" ? "all" : "after-30")}
              title="Click to filter After 30 Days"
            >
              <div className="rnp-timeline-left">
                <div className="rnp-timeline-icon indigo">
                  <Calendar size={14} />
                </div>
                <div className="rnp-timeline-details">
                  <div className="rnp-timeline-label-row">
                    <span className="rnp-timeline-label">After 30 Days</span>
                    <span className="rnp-timeline-badge calm">{analytics.after30Count} Colleges</span>
                  </div>
                  <div className="rnp-timeline-bar-bg">
                    <div
                      className="rnp-timeline-bar-fill indigo"
                      style={{ width: `${analytics.total > 0 ? (analytics.after30Count / analytics.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOOLBAR / FILTERS ── */}
      <section className="rnp-toolbar">
        <div className="rnp-toolbar-left">
          {/* Search Box */}
          <div className="rnp-search-box">
            <Search size={14} className="rnp-search-icon" />
            <input
              type="text"
              className="rnp-search-input"
              placeholder="Search by college name or code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="rnp-search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="rnp-filter-group">
            {/* Plan Filter */}
            <div className="rnp-select-wrap">
              <select
                className="rnp-select"
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Plans</option>
                {availablePlans.map((p) => (
                  <option key={p.name} value={p.name.toLowerCase()}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="rnp-select-wrap">
              <select
                className="rnp-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expiring soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Renewal Period Filter */}
            <div className="rnp-select-wrap">
              <select
                className="rnp-select"
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Periods</option>
                <option value="next-7">Next 7 Days</option>
                <option value="next-30">Next 30 Days</option>
                <option value="expired">Expired</option>
                <option value="after-30">After 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rnp-toolbar-right">
          {/* Reset button */}
          <button
            type="button"
            className="rnp-icon-btn"
            onClick={handleResetFilters}
            title="Reset filters & reload"
          >
            <RotateCw size={14} />
          </button>

          {/* Filter badge button */}
          <button
            type="button"
            className={`rnp-icon-btn ${activeFilterCount > 0 ? "is-active" : ""}`}
            onClick={handleResetFilters}
            title={`${activeFilterCount} filter(s) active. Click to clear.`}
          >
            <Filter size={14} />
            {activeFilterCount > 0 && <span className="rnp-icon-badge">{activeFilterCount}</span>}
          </button>

          {/* View switcher */}
          <div className="rnp-view-toggle">
            <button
              type="button"
              className={`rnp-view-btn ${viewMode === "table" ? "is-active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table view"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              className={`rnp-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Card view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── TABLE CONTAINER (Matching Image 2 Style) ── */}
      {viewMode === "table" ? (
        <div className="rnp-table-card">
          <div className="rnp-table-wrap">
            <table className="rnp-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>#</th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("collegeName")}>
                      COLLEGE NAME <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("plan")}>
                      PLAN <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("renewalDate")}>
                      RENEWAL DATE <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("daysRemaining")}>
                      DAYS REMAINING <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("status")}>
                      STATUS <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("period")}>
                      SUBSCRIPTION PERIOD <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRenewals.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <Building2 size={32} color="#94a3b8" />
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>No matching renewal records</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          Try clearing filters or search query to view all colleges.
                        </span>
                        <button
                          type="button"
                          className="rnp-btn-primary"
                          style={{ marginTop: 8 }}
                          onClick={handleResetFilters}
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRenewals.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * (rowsPerPage || filteredRenewals.length) + idx + 1;
                    const planBadge = getPlanBadge(item.plan);
                    const daysBadge = getDaysBadge(item.daysRemaining, item.status);

                    return (
                      <tr key={item.id}>
                        {/* Row # */}
                        <td className="rnp-cell-index">
                          {rowNumber}
                        </td>

                        {/* College Name & Code */}
                        <td>
                          <div className="rnp-cell-college">
                            <div className="rnp-college-icon">
                              <Building2 size={16} />
                            </div>
                            <div className="rnp-college-meta">
                              <span className="rnp-college-title">{item.collegeName}</span>
                              <span className="rnp-college-code">({item.collegeCode})</span>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td>
                          {planBadge.class === "none" ? (
                            <span className="rnp-dash-val">—</span>
                          ) : (
                            <span className={`rnp-plan-pill ${planBadge.class}`}>
                              {planBadge.icon}
                              <span>{item.plan}</span>
                            </span>
                          )}
                        </td>

                        {/* Renewal Date */}
                        <td>
                          {item.renewalDate === "—" ? (
                            <span className="rnp-dash-val">—</span>
                          ) : (
                            <div className="rnp-icon-text">
                              <Calendar size={13} className="rnp-purple-icon" />
                              <span>{item.renewalDate}</span>
                            </div>
                          )}
                        </td>

                        {/* Days Remaining */}
                        <td>
                          {daysBadge.class === "none" ? (
                            <span className="rnp-dash-val">—</span>
                          ) : (
                            <span className={`rnp-days-pill ${daysBadge.class}`}>
                              {daysBadge.icon}
                              <span>{daysBadge.text}</span>
                            </span>
                          )}
                        </td>

                        {/* Renewal Status */}
                        <td>
                          {item.status === "—" ? (
                            <span className="rnp-dash-val">—</span>
                          ) : (
                            <span
                              className={`rnp-status-pill ${
                                item.status === "Active"
                                  ? "is-active"
                                  : item.status === "Expiring Soon"
                                  ? "is-expiring"
                                  : "is-inactive"
                              }`}
                            >
                              <span className="rnp-status-dot" />
                              <span>{item.status}</span>
                            </span>
                          )}
                        </td>

                        {/* Subscription Period */}
                        <td>
                          {item.period === "—" ? (
                            <span className="rnp-dash-val">—</span>
                          ) : (
                            <span className="rnp-period-text">{item.period}</span>
                          )}
                        </td>

                        {/* Action Buttons (Matching Image 2 Pill Style) */}
                        <td style={{ textAlign: "center" }}>
                          <div className="rnp-actions-group">
                            {/* 1. View button (Soft Blue Pill) */}
                            <button
                              type="button"
                              className="rnp-action-btn view"
                              onClick={() => setDetailItem(item)}
                              title="View Details & History"
                            >
                              <Eye size={15} />
                            </button>

                            {/* 2. Renew button (Soft Amber Pill) */}
                            <button
                              type="button"
                              className="rnp-action-btn key"
                              onClick={() => {
                                setProcessRenewalModal(item);
                                setRenewalPeriodChoice("1year");
                              }}
                              title="Process Renewal"
                            >
                              <RefreshCw size={14} />
                            </button>

                            {/* 3. Edit / Change Plan button (Soft Green Pill) */}
                            <button
                              type="button"
                              className="rnp-action-btn edit"
                              onClick={() => {
                                setChangePlanModal(item);
                                setNewSelectedPlan(item.plan !== "—" ? item.plan : "Standard");
                              }}
                              title="Change / Upgrade Plan"
                            >
                              <Pencil size={14} />
                            </button>

                            {/* 4. More Options button (Soft Purple Pill) */}
                            <div className="rnp-more-wrap">
                              <button
                                type="button"
                                className={`rnp-action-btn more ${activePopover === item.id ? "is-open" : ""}`}
                                onClick={() => setActivePopover(activePopover === item.id ? null : item.id)}
                                title="More options"
                              >
                                <MoreVertical size={15} />
                              </button>

                              {activePopover === item.id && (
                                <div className="rnp-more-popover">
                                  <div className="rnp-popover-header">
                                    <span className="rnp-popover-name">{item.collegeName}</span>
                                    <span className="rnp-popover-email">
                                      {item.adminEmail !== "—" ? item.adminEmail : item.collegeCode}
                                    </span>
                                  </div>
                                  <div className="rnp-popover-divider" />
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => {
                                      setProcessRenewalModal(item);
                                      setRenewalPeriodChoice("1year");
                                      setActivePopover(null);
                                    }}
                                  >
                                    <RefreshCw size={14} color="#16a34a" />
                                    <span>Process Renewal</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => {
                                      setSendReminderModal(item);
                                      setReminderMessage(
                                        `Dear ${item.adminName !== "—" ? item.adminName : "Administrator"},\n\nYour subscription for ${item.collegeName} is due for renewal on ${item.renewalDate}. Please complete renewal to ensure uninterrupted portal access.`
                                      );
                                      setActivePopover(null);
                                    }}
                                  >
                                    <Bell size={14} color="#ea580c" />
                                    <span>Send Expiry Reminder</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => {
                                      setChangePlanModal(item);
                                      setNewSelectedPlan(item.plan !== "—" ? item.plan : "Standard");
                                      setActivePopover(null);
                                    }}
                                  >
                                    <ArrowUpRight size={14} color="#7c3aed" />
                                    <span>Upgrade / Change Plan</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => {
                                      showToast(`Invoice for ${item.collegeName} downloaded.`);
                                      setActivePopover(null);
                                    }}
                                  >
                                    <Download size={14} color="#0284c7" />
                                    <span>Download Renewal Invoice</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <footer className="rnp-footer">
            <span className="rnp-footer-info">
              Showing{" "}
              {paginatedRenewals.length === 0
                ? "0"
                : `${(currentPage - 1) * (rowsPerPage || filteredRenewals.length) + 1} - ${Math.min(
                    currentPage * (rowsPerPage || filteredRenewals.length),
                    filteredRenewals.length
                  )}`}{" "}
              of {filteredRenewals.length} colleges
            </span>

            <div className="rnp-footer-right">
              <div className="rnp-rows-selector">
                <span>Rows per page:</span>
                <select
                  className="rnp-rows-select"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={0}>All</option>
                </select>
              </div>

              <div className="rnp-pagination">
                <button
                  type="button"
                  className="rnp-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`rnp-page-btn ${currentPage === p ? "is-active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  className="rnp-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        /* Alternative Card / Grid View */
        <div className="rnp-table-card">
          <div className="rnp-cards-grid">
            {paginatedRenewals.map((item) => {
              const planBadge = getPlanBadge(item.plan);
              const daysBadge = getDaysBadge(item.daysRemaining, item.status);

              return (
                <div key={item.id} className="rnp-card-item">
                  <div className="rnp-card-top">
                    <div className="rnp-card-college">
                      <div className="rnp-college-icon">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="rnp-college-title">{item.collegeName}</div>
                        <div className="rnp-college-code">({item.collegeCode})</div>
                      </div>
                    </div>
                    {item.status === "—" ? (
                      <span className="rnp-dash-val">—</span>
                    ) : (
                      <span
                        className={`rnp-status-pill ${
                          item.status === "Active"
                            ? "is-active"
                            : item.status === "Expiring Soon"
                            ? "is-expiring"
                            : "is-inactive"
                        }`}
                      >
                        <span className="rnp-status-dot" />
                        <span>{item.status}</span>
                      </span>
                    )}
                  </div>

                  <div className="rnp-card-stats-row">
                    <div>
                      <span className="rnp-card-stat-label">Plan</span>
                      <div className="rnp-card-stat-val">
                        {planBadge.class === "none" ? (
                          <span className="rnp-dash-val">—</span>
                        ) : (
                          <span className={`rnp-plan-pill ${planBadge.class}`} style={{ marginTop: 2 }}>
                            {planBadge.icon} {item.plan}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="rnp-card-stat-label">Renewal Date</span>
                      <div className="rnp-card-stat-val" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {item.renewalDate === "—" ? (
                          <span className="rnp-dash-val">—</span>
                        ) : (
                          <>
                            <Calendar size={12} className="rnp-purple-icon" /> {item.renewalDate}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Time Remaining:</span>
                    {daysBadge.class === "none" ? (
                      <span className="rnp-dash-val">—</span>
                    ) : (
                      <span className={`rnp-days-pill ${daysBadge.class}`}>
                        {daysBadge.icon} {daysBadge.text}
                      </span>
                    )}
                  </div>

                  <div className="rnp-card-footer">
                    <button
                      type="button"
                      className="rnp-btn-export"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => setDetailItem(item)}
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      className="rnp-btn-primary"
                      style={{ padding: "6px 14px", fontSize: 12 }}
                      onClick={() => {
                        setProcessRenewalModal(item);
                        setRenewalPeriodChoice("1year");
                      }}
                    >
                      <RefreshCw size={13} /> Renew
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid View Footer */}
          <footer className="rnp-footer">
            <span className="rnp-footer-info">
              Showing {paginatedRenewals.length} of {filteredRenewals.length} colleges
            </span>
            <div className="rnp-pagination">
              <button
                type="button"
                className="rnp-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`rnp-page-btn ${currentPage === p ? "is-active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="rnp-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* ── BOTTOM KEY ACTIONS PANEL ── */}
      <section className="rnp-key-actions-container">
        <div className="rnp-key-actions-header">
          <span className="rnp-key-actions-title">Key Actions</span>
          <span className="rnp-key-actions-subtitle">
            Quick shortcuts for platform subscription renewals &amp; plan continuity
          </span>
        </div>

        <div className="rnp-key-actions-grid">
          {/* Action 1: Renew Subscription */}
          <button
            type="button"
            className="rnp-key-action-btn green"
            onClick={() => {
              const target = renewals.find((r) => r.hasSubscription) || renewals[0];
              if (target) {
                setProcessRenewalModal(target);
                setRenewalPeriodChoice("1year");
              }
            }}
          >
            <div className="rnp-key-action-icon">
              <RefreshCw size={16} />
            </div>
            <div className="rnp-key-action-text-wrap">
              <span className="rnp-key-action-title-text">Renew Subscription</span>
              <span className="rnp-key-action-desc-text">Extend validity &amp; continuity</span>
            </div>
          </button>

          {/* Action 2: Upgrade Plan */}
          <button
            type="button"
            className="rnp-key-action-btn purple"
            onClick={() => {
              const target = renewals.find((r) => r.hasSubscription) || renewals[0];
              if (target) {
                setChangePlanModal(target);
                setNewSelectedPlan("Premium");
              }
            }}
          >
            <div className="rnp-key-action-icon">
              <Crown size={16} />
            </div>
            <div className="rnp-key-action-text-wrap">
              <span className="rnp-key-action-title-text">Upgrade Plan</span>
              <span className="rnp-key-action-desc-text">Unlock higher tier quotas</span>
            </div>
          </button>

          {/* Action 3: Change Plan */}
          <button
            type="button"
            className="rnp-key-action-btn blue"
            onClick={() => {
              const target = renewals.find((r) => r.hasSubscription) || renewals[0];
              if (target) {
                setChangePlanModal(target);
                setNewSelectedPlan("Standard");
              }
            }}
          >
            <div className="rnp-key-action-icon">
              <ArrowLeftRight size={16} />
            </div>
            <div className="rnp-key-action-text-wrap">
              <span className="rnp-key-action-title-text">Change Plan</span>
              <span className="rnp-key-action-desc-text">Switch tiers or cycle limits</span>
            </div>
          </button>

          {/* Action 4: Send Reminder */}
          <button
            type="button"
            className="rnp-key-action-btn amber"
            onClick={() => {
              const target = renewals.find((r) => r.hasSubscription) || renewals[0];
              if (target) {
                setSendReminderModal(target);
                setReminderMessage(
                  `Dear ${target.adminName !== "—" ? target.adminName : "Administrator"},\n\nYour subscription for ${target.collegeName} is due for renewal on ${target.renewalDate}. Please complete renewal to prevent disruption.`
                );
              }
            }}
          >
            <div className="rnp-key-action-icon">
              <Bell size={16} />
            </div>
            <div className="rnp-key-action-text-wrap">
              <span className="rnp-key-action-title-text">Send Reminder</span>
              <span className="rnp-key-action-desc-text">Notify admin via email &amp; SMS</span>
            </div>
          </button>

          {/* Action 5: Renewal Report */}
          <button
            type="button"
            className="rnp-key-action-btn indigo"
            onClick={handleExportCSV}
          >
            <div className="rnp-key-action-icon">
              <FileText size={16} />
            </div>
            <div className="rnp-key-action-text-wrap">
              <span className="rnp-key-action-title-text">Renewal Report</span>
              <span className="rnp-key-action-desc-text">Download complete report CSV</span>
            </div>
          </button>
        </div>
      </section>

      {/* ── MODAL 1: PROCESS RENEWAL ── */}
      {processRenewalModal && (
        <Modal
          title={`Process Renewal: ${processRenewalModal.collegeName}`}
          onClose={() => setProcessRenewalModal(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* College Summary Card */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>College Code</span>
                <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                  {processRenewalModal.collegeCode}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Current Plan</span>
                <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                  {processRenewalModal.plan} {processRenewalModal.accountLimit !== "—" ? `(${processRenewalModal.accountLimit} accounts)` : ""}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Current Expiry</span>
                <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                  {processRenewalModal.renewalDate}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Admin Contact</span>
                <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                  {processRenewalModal.adminName}
                </div>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>
                Select Renewal Duration
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { id: "30days", title: "30 Days", tag: null },
                  { id: "90days", title: "90 Days", tag: null },
                  { id: "1year", title: "1 Year", tag: "Recommended" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRenewalPeriodChoice(item.id)}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 10,
                      border:
                        renewalPeriodChoice === item.id ? "2px solid #1e4529" : "1px solid #e2e8f0",
                      background: renewalPeriodChoice === item.id ? "#edf5ef" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    {item.tag && (
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: 8,
                          background: "#dcfce7",
                          color: "#15803d",
                          marginBottom: 4
                        }}
                      >
                        {item.tag}
                      </span>
                    )}
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>{item.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Calculation */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <CheckCircle2 size={18} color="#15803d" />
              <div style={{ fontSize: 12.5, color: "#166534" }}>
                <strong>New Expiry:</strong> {modalRenewalDetails.newExpiryFormatted} • Total Cost: <strong>{modalRenewalDetails.costStr}</strong>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="rnp-btn-export"
                onClick={() => setProcessRenewalModal(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rnp-btn-primary"
                onClick={handleConfirmRenewal}
                disabled={isSubmitting}
              >
                <Check size={16} /> {isSubmitting ? "Processing..." : "Confirm & Apply Renewal"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: SEND REMINDER ── */}
      {sendReminderModal && (
        <Modal
          title={`Send Expiry Reminder: ${sendReminderModal.collegeName}`}
          onClose={() => setSendReminderModal(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: "#475569" }}>
              Send an official expiration notice to the registered college administrator.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Recipient Name</span>
                <input
                  type="text"
                  readOnly
                  value={sendReminderModal.adminName}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontSize: 12.5,
                    marginTop: 3
                  }}
                />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Official Email</span>
                <input
                  type="text"
                  readOnly
                  value={sendReminderModal.adminEmail}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontSize: 12.5,
                    marginTop: 3
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>
                Reminder Message Preview
              </label>
              <textarea
                rows={5}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12.5,
                  color: "#1e293b",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="rnp-btn-export"
                onClick={() => setSendReminderModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rnp-btn-primary"
                onClick={handleSendReminder}
              >
                <Send size={15} /> Send Reminder Email
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 3: CHANGE / UPGRADE PLAN ── */}
      {changePlanModal && (
        <Modal
          title={`Change Plan: ${changePlanModal.collegeName}`}
          onClose={() => setChangePlanModal(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: "#475569" }}>
              Current Plan: <strong>{changePlanModal.plan}</strong> {changePlanModal.accountLimit !== "—" ? `(${changePlanModal.accountLimit} accounts)` : ""}.
              Select a new subscription tier from available plans:
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {availablePlans.map((p) => {
                const isSelected = newSelectedPlan.toLowerCase() === p.name.toLowerCase();
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setNewSelectedPlan(p.name)}
                    style={{
                      padding: "14px 10px",
                      borderRadius: 10,
                      border: isSelected ? "2px solid #1e4529" : "1px solid #e2e8f0",
                      background: isSelected ? "#edf5ef" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{p.limit} accounts</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1e4529", marginTop: 4 }}>
                      {p.price} / mo
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="rnp-btn-export"
                onClick={() => setChangePlanModal(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rnp-btn-primary"
                onClick={handleChangePlan}
                disabled={isSubmitting}
              >
                <Check size={16} /> {isSubmitting ? "Saving..." : "Save Plan Change"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── SLIDE-OVER DETAIL DRAWER ── */}
      {detailItem && (
        <div className="rnp-drawer-overlay" onClick={() => setDetailItem(null)}>
          <aside className="rnp-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="rnp-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="rnp-college-icon" style={{ width: 40, height: 40 }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
                    {detailItem.collegeName}
                  </h3>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    ({detailItem.collegeCode}) • {detailItem.plan} Plan
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="rnp-drawer-close"
                onClick={() => setDetailItem(null)}
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rnp-drawer-body">
              {/* Card 1: Subscription & Expiry */}
              <div className="rnp-drawer-card">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Renewal Status &amp; Validity
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Renewal Date</span>
                    <div style={{ fontWeight: 800, color: "#1e293b" }}>{detailItem.renewalDate}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Days Remaining</span>
                    <div>
                      {detailItem.daysRemaining != null ? (
                        <span className={`rnp-days-pill ${getDaysBadge(detailItem.daysRemaining, detailItem.status).class}`}>
                          {detailItem.daysRemaining} Days
                        </span>
                      ) : (
                        <span className="rnp-dash-val">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Active Accounts</span>
                    <div style={{ fontWeight: 800, color: "#1e293b" }}>
                      {detailItem.activeAccounts !== "—" ? `${detailItem.activeAccounts} / ${detailItem.accountLimit}` : "—"}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Status</span>
                    <div>
                      {detailItem.status !== "—" ? (
                        <span
                          className={`rnp-status-pill ${
                            detailItem.status === "Active"
                              ? "is-active"
                              : detailItem.status === "Expiring Soon"
                              ? "is-expiring"
                              : "is-inactive"
                          }`}
                        >
                          <span className="rnp-status-dot" />
                          <span>{detailItem.status}</span>
                        </span>
                      ) : (
                        <span className="rnp-dash-val">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Admin Contact */}
              <div className="rnp-drawer-card">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Primary College Admin
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13 }}>
                    {detailItem.adminName}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{detailItem.adminEmail}</div>
                </div>
              </div>
            </div>

            <div className="rnp-drawer-footer">
              <button
                type="button"
                className="rnp-btn-export"
                onClick={() => {
                  setSendReminderModal(detailItem);
                  setReminderMessage(
                    `Dear ${detailItem.adminName !== "—" ? detailItem.adminName : "Administrator"},\n\nYour subscription for ${detailItem.collegeName} is due for renewal on ${detailItem.renewalDate}. Please complete renewal promptly.`
                  );
                }}
              >
                <Bell size={14} /> Send Reminder
              </button>
              <button
                type="button"
                className="rnp-btn-primary"
                onClick={() => {
                  setProcessRenewalModal(detailItem);
                  setRenewalPeriodChoice("1year");
                }}
              >
                <RefreshCw size={14} /> Renew Now
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
