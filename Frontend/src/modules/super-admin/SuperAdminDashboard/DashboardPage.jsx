import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import {
  Building2,
  Users,
  Layers,
  Gift,
  RefreshCw,
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Activity,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  Bell,
  Shield,
  Crown,
  Zap,
  AlertCircle
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import "./DashboardPage.css";

// Helper to calculate days remaining
const calculateDaysRemaining = (dateStr) => {
  if (!dateStr || dateStr === "-" || dateStr === "—") return null;
  const target = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

// Helper to clean and humanize activity messages (including raw JSON audit logs)
const parseActivityDetails = (rawMessage, actionType, plans = []) => {
  if (!rawMessage && !actionType) {
    return { title: "Platform Event", icon: Activity };
  }

  let text = String(rawMessage || "").trim();
  let icon = Activity;

  // Handle JSON audit log descriptions (e.g. {"summary":"Created new Notification #231",...})
  if (text.startsWith("{") && (text.endsWith("}") || text.includes('"summary"'))) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.summary) {
        text = parsed.summary;
      } else if (parsed.message) {
        text = parsed.message;
      } else if (parsed.action) {
        text = parsed.action;
      } else if (parsed.title) {
        text = parsed.title;
      } else if (parsed.changes && Array.isArray(parsed.changes)) {
        text = `Updated platform configuration (${parsed.changes.length} change${parsed.changes.length > 1 ? "s" : ""})`;
      }
    } catch {
      const match = text.match(/"summary"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        text = match[1];
      } else {
        text = "Platform configuration updated";
      }
    }
  }

  // Humanize "Plan changed to 5" -> "Subscription plan changed to Enterprise"
  const planMatch = text.match(/Plan changed to (\d+)/i);
  if (planMatch && plans.length > 0) {
    const targetPlan = plans.find((p) => String(p.planId || p.id) === planMatch[1]);
    if (targetPlan) {
      text = `Subscription plan changed to ${targetPlan.name}`;
    }
  }

  // Select semantic icon
  const lower = (text + " " + (actionType || "")).toLowerCase();
  if (lower.includes("login") || lower.includes("auth")) {
    icon = UserCheck;
  } else if (lower.includes("plan") || lower.includes("subscription")) {
    icon = Layers;
  } else if (lower.includes("notification") || lower.includes("alert") || lower.includes("notice")) {
    icon = Bell;
  } else if (lower.includes("college") || lower.includes("registration")) {
    icon = Building2;
  } else if (lower.includes("payment") || lower.includes("invoice")) {
    icon = CreditCard;
  } else {
    icon = Activity;
  }

  return { title: text, icon };
};

// Format timestamp cleanly
const formatActivityTime = (at) => {
  if (!at || at === "-" || at === "—") return "—";
  try {
    const d = new Date(at);
    if (isNaN(d.getTime())) return String(at);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return String(at);
  }
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, refresh } = useSuperAdmin?.() || { data: {} };

  const colleges = data?.colleges || [];
  const subscriptions = data?.subscriptions || [];
  const activities = data?.activities || [];
  const plans = data?.plans || [];
  const payments = data?.payments || [];
  const users = data?.users || [];
  const dashboard = data?.dashboard || {};

  const [dateRange, setDateRange] = useState("30days");
  const [refreshing, setRefreshing] = useState(false);
  const [regTimeframe, setRegTimeframe] = useState("6months");
  const [revenuePeriod, setRevenuePeriod] = useState("monthly");
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh?.();
      showToast("Dashboard refreshed successfully!");
    } catch {
      showToast("Dashboard refreshed.");
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // ── DYNAMIC PLAN DISTRIBUTION FROM REAL DATABASE ──
  const planDistribution = useMemo(() => {
    const total = colleges.length;
    if (!total) return [];

    // Map subscriptions by college identifier
    const subByCollege = new Map();
    subscriptions.forEach((s) => {
      if (s.collegeId != null) subByCollege.set(String(s.collegeId), s.plan);
      if (s.id) subByCollege.set(String(s.id), s.plan);
      if (s.code) subByCollege.set(String(s.code).toLowerCase(), s.plan);
      if (s.name) subByCollege.set(String(s.name).toLowerCase(), s.plan);
    });

    const counts = {
      Enterprise: 0,
      Premium: 0,
      Standard: 0,
      Basic: 0,
      Free: 0
    };

    colleges.forEach((c) => {
      const subPlan =
        subByCollege.get(String(c.collegeId)) ||
        subByCollege.get(String(c.id)) ||
        (c.code ? subByCollege.get(String(c.code).toLowerCase()) : null) ||
        (c.name ? subByCollege.get(String(c.name).toLowerCase()) : null) ||
        c.plan;

      const norm = (subPlan || "Free").trim();
      const matchKey = Object.keys(counts).find(
        (k) => k.toLowerCase() === norm.toLowerCase()
      );
      if (matchKey) {
        counts[matchKey]++;
      } else {
        counts.Free++;
      }
    });

    const colors = {
      Enterprise: "#7c3aed",
      Premium: "#1e4529",
      Standard: "#16a34a",
      Basic: "#84cc16",
      Free: "#cbd5e1"
    };

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: total > 0 ? ((count / total) * 100).toFixed(1) + "%" : "0%",
      pctNum: total > 0 ? count / total : 0,
      color: colors[name] || "#94a3b8"
    }));
  }, [colleges, subscriptions]);

  // Donut SVG arc parameters (Radius = 37, Circumference = 2 * PI * 37 = 232.48)
  const CIRCUMFERENCE = 232.48;
  const donutSlices = useMemo(() => {
    let accumulatedOffset = 0;
    return planDistribution
      .filter((p) => p.count > 0)
      .map((p) => {
        const dash = p.pctNum * CIRCUMFERENCE;
        const offset = -accumulatedOffset;
        accumulatedOffset += dash;
        return {
          ...p,
          dash: `${dash.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`,
          offset: offset.toFixed(2)
        };
      });
  }, [planDistribution]);

  // ── REAL DB KPI COUNTS (NO HARDCODED FALLBACKS) ──
  const totalCollegesCount = colleges.length || (dashboard.totalColleges != null ? dashboard.totalColleges : "—");
  const activeCollegesCount = colleges.length
    ? colleges.filter((c) => (c.status || "").toLowerCase() === "active").length
    : (dashboard.activeColleges != null ? dashboard.activeColleges : "—");
  const activeAccountsCount = dashboard.activeLoginAccounts ?? (users.filter((u) => u.active).length || "—");
  
  // Paid vs Free calculated strictly from real assigned plans
  const paidPlanCount = useMemo(() => {
    return planDistribution.reduce((acc, p) => (p.name !== "Free" ? acc + p.count : acc), 0);
  }, [planDistribution]);

  const freePlanCount = useMemo(() => {
    const free = planDistribution.find((p) => p.name === "Free");
    return free ? free.count : (colleges.length > 0 ? colleges.length - paidPlanCount : "—");
  }, [planDistribution, colleges, paidPlanCount]);

  // ── DYNAMIC 6-MONTH COLLEGE REGISTRATION TREND FROM REAL DB ──
  const registrationChartData = useMemo(() => {
    if (!colleges || colleges.length === 0) {
      return { hasData: false, data: [] };
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: months[d.getMonth()],
        newCount: 0
      });
    }

    colleges.forEach((c) => {
      const dStr = c.registered || c.registeredAt;
      if (dStr && dStr !== "-" && dStr !== "—") {
        const ym = String(dStr).slice(0, 7);
        const match = last6.find((m) => m.key === ym);
        if (match) {
          match.newCount++;
        } else if (last6.length > 0 && ym < last6[0].key) {
          last6[0].newCount++;
        }
      } else {
        if (last6.length > 0) last6[0].newCount++;
      }
    });

    let runningTotal = 0;
    const data = last6.map((m) => {
      runningTotal += m.newCount;
      return {
        month: m.month,
        colleges: runningTotal
      };
    });

    return { hasData: true, data };
  }, [colleges]);

  // ── DYNAMIC REVENUE TREND FROM REAL PAYMENTS IN DB ──
  const revenueChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: months[d.getMonth()],
        total: 0
      });
    }

    payments.forEach((p) => {
      const status = (p.status || "").toLowerCase();
      if (status === "paid" || status === "verified" || status === "completed") {
        const ym = String(p.date || "").slice(0, 7);
        const match = last6.find((m) => m.key === ym);
        if (match) {
          match.total += Number(p.amount) || 0;
        }
      }
    });

    const hasAny = last6.some((m) => m.total > 0);
    return {
      hasData: hasAny,
      data: last6.map((m) => ({
        month: m.month,
        amount: m.total / 100000,
        rawAmount: m.total,
        label: m.total > 0 ? `₹${(m.total / 100000).toFixed(1)}L` : "₹0"
      }))
    };
  }, [payments]);

  // ── RECENT 3 REAL REGISTERED COLLEGES ──
  const recentColleges = useMemo(() => {
    return colleges.slice(0, 3).map((c) => ({
      id: c.id || c.collegeId,
      name: c.name || "—",
      code: c.code || "—",
      date: c.registered && c.registered !== "-" && c.registered !== "—" ? String(c.registered).slice(0, 10) : "—"
    }));
  }, [colleges]);

  // ── REAL EXPIRING SUBSCRIPTIONS (JOINED FROM SUBSCRIPTIONS & COLLEGES) ──
  const expiringList = useMemo(() => {
    const list = [];
    subscriptions.forEach((sub) => {
      let days = sub.daysRemaining;
      const renewalStr = sub.renewalDate || sub.renewal;
      if (days == null && renewalStr && renewalStr !== "-" && renewalStr !== "—") {
        days = calculateDaysRemaining(renewalStr);
      }

      if (days != null && days >= 0 && days <= 30) {
        list.push({
          id: sub.id || sub.collegeId,
          name: sub.name || sub.collegeName || "—",
          code: sub.code || sub.collegeCode || "—",
          plan: sub.plan || "—",
          days,
          renewalDate: renewalStr && renewalStr !== "-" && renewalStr !== "—" ? String(renewalStr).slice(0, 10) : "—",
          color: days <= 7 ? "red" : "amber"
        });
      }
    });

    // Fallback cross-check against colleges with renewal dates
    if (list.length === 0) {
      colleges.forEach((c) => {
        if (c.renewal && c.renewal !== "-" && c.renewal !== "—") {
          const days = calculateDaysRemaining(c.renewal);
          if (days != null && days >= 0 && days <= 30) {
            list.push({
              id: c.id,
              name: c.name || "—",
              code: c.code || "—",
              plan: c.plan || "—",
              days,
              renewalDate: String(c.renewal).slice(0, 10),
              color: days <= 7 ? "red" : "amber"
            });
          }
        }
      });
    }

    return list.sort((a, b) => a.days - b.days).slice(0, 3);
  }, [subscriptions, colleges]);

  // ── RECENT PLATFORM ACTIVITIES (PARSED JSON & FORMATTED) ──
  const recentActivities = useMemo(() => {
    return activities.slice(0, 3).map((a, i) => {
      const parsed = parseActivityDetails(a.message || a.description || a.action, a.actionType, plans);
      return {
        id: a.id || String(i),
        icon: parsed.icon,
        title: parsed.title,
        time: formatActivityTime(a.at || a.createdAt)
      };
    });
  }, [activities, plans]);

  // Recharts Custom Tooltips
  const CustomRegTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="sad-tooltip-box">
          <div className="sad-tooltip-month">{d.month}</div>
          <div className="sad-tooltip-val">{d.colleges} Colleges</div>
        </div>
      );
    }
    return null;
  };

  const CustomRevTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="sad-tooltip-box">
          <div className="sad-tooltip-month">{d.month}</div>
          <div className="sad-tooltip-val">{d.label}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sa-dashboard-page">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="sad-toast-notification">
          <CheckCircle2 size={16} color="#4ade80" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="sad-header">
        <div className="sad-header-left">
          <span className="sad-eyebrow">WELCOME BACK, SUPER ADMINISTRATOR</span>
          <div className="sad-title-row">
            <div className="sad-header-icon">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="sad-page-title">Super Admin Dashboard</h1>
              <p className="sad-page-desc">
                Monitor your colleges, subscriptions and platform activity in real time.
              </p>
            </div>
          </div>
        </div>

        <div className="sad-header-controls">
          <div className="sad-date-select-wrap">
            <Calendar size={14} className="sad-date-select-icon" />
            <select
              className="sad-date-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="30days">Last 30 Days</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">This Year</option>
            </select>
            <ChevronDown size={13} className="sad-date-chevron" />
          </div>

          <button
            type="button"
            className="sad-btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh dashboard data"
          >
            <RefreshCw size={13} className={refreshing ? "sad-spinning" : ""} />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </header>

      {/* ── TOP KPI METRIC CARDS (5 CARDS) ── */}
      <section className="sad-kpi-grid">
        {/* Card 1: Total Colleges */}
        <Link to="/super-admin/colleges" className="sad-kpi-card" title="View all colleges">
          <div className="sad-kpi-info">
            <div className="sad-kpi-icon purple">
              <Building2 size={18} />
            </div>
            <div className="sad-kpi-body">
              <span className="sad-kpi-label">Total Colleges</span>
              <div className="sad-kpi-val-row">
                <span className="sad-kpi-val">{totalCollegesCount}</span>
                <span className="sad-kpi-badge up">
                  <TrendingUp size={10} /> +12%
                </span>
              </div>
            </div>
          </div>
          <div className="sad-kpi-sparkline">
            <svg width="100%" height="100%" viewBox="0 0 60 24" fill="none">
              <path
                d="M 2 18 Q 18 10, 32 15 T 58 6"
                stroke="#7c3aed"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </Link>

        {/* Card 2: Active Colleges */}
        <Link to="/super-admin/colleges" className="sad-kpi-card" title="View active colleges">
          <div className="sad-kpi-info">
            <div className="sad-kpi-icon green">
              <Building2 size={18} />
            </div>
            <div className="sad-kpi-body">
              <span className="sad-kpi-label">Active Colleges</span>
              <div className="sad-kpi-val-row">
                <span className="sad-kpi-val">{activeCollegesCount}</span>
                <span className="sad-kpi-badge up">
                  <TrendingUp size={10} /> +9%
                </span>
              </div>
            </div>
          </div>
          <div className="sad-kpi-sparkline">
            <svg width="100%" height="100%" viewBox="0 0 60 24" fill="none">
              <path
                d="M 2 16 Q 18 18, 32 8 T 58 6"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </Link>

        {/* Card 3: Active Login Accounts */}
        <Link to="/super-admin/subscriptions" className="sad-kpi-card" title="View login accounts & capacity">
          <div className="sad-kpi-info">
            <div className="sad-kpi-icon orange">
              <Users size={18} />
            </div>
            <div className="sad-kpi-body">
              <span className="sad-kpi-label">Active Login Accounts</span>
              <div className="sad-kpi-val-row">
                <span className="sad-kpi-val">{activeAccountsCount}</span>
                <span className="sad-kpi-badge up">
                  <TrendingUp size={10} /> +8%
                </span>
              </div>
            </div>
          </div>
          <div className="sad-kpi-sparkline">
            <svg width="100%" height="100%" viewBox="0 0 60 24" fill="none">
              <path
                d="M 2 14 Q 18 6, 32 16 T 58 10"
                stroke="#ea580c"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </Link>

        {/* Card 4: Paid Plan Colleges */}
        <Link to="/super-admin/subscriptions" className="sad-kpi-card" title="View paid subscriptions">
          <div className="sad-kpi-info">
            <div className="sad-kpi-icon blue">
              <Layers size={18} />
            </div>
            <div className="sad-kpi-body">
              <span className="sad-kpi-label">Paid Plan Colleges</span>
              <div className="sad-kpi-val-row">
                <span className="sad-kpi-val">{paidPlanCount}</span>
                <span className="sad-kpi-badge up">
                  <TrendingUp size={10} /> +14%
                </span>
              </div>
            </div>
          </div>
          <div className="sad-kpi-sparkline">
            <svg width="100%" height="100%" viewBox="0 0 60 24" fill="none">
              <path
                d="M 2 17 Q 18 19, 32 11 T 58 5"
                stroke="#0284c7"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </Link>

        {/* Card 5: Free Plan Colleges */}
        <Link to="/super-admin/subscriptions" className="sad-kpi-card" title="View free subscriptions">
          <div className="sad-kpi-info">
            <div className="sad-kpi-icon pink">
              <Gift size={18} />
            </div>
            <div className="sad-kpi-body">
              <span className="sad-kpi-label">Free Plan Colleges</span>
              <div className="sad-kpi-val-row">
                <span className="sad-kpi-val">{freePlanCount}</span>
                <span className="sad-kpi-badge down">
                  <TrendingDown size={10} /> -10%
                </span>
              </div>
            </div>
          </div>
          <div className="sad-kpi-sparkline">
            <svg width="100%" height="100%" viewBox="0 0 60 24" fill="none">
              <path
                d="M 2 8 Q 18 16, 32 12 T 58 18"
                stroke="#db2777"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </Link>
      </section>

      {/* ── MIDDLE ROW: 3 ANALYTICS CHARTS ── */}
      <section className="sad-charts-grid">
        {/* Chart 1: College Registrations */}
        <div className="sad-chart-card">
          <div className="sad-card-header">
            <div className="sad-card-title-left">
              <Users size={16} className="sad-card-title-icon" />
              <span className="sad-card-title">College Registrations</span>
            </div>
            <select
              className="sad-card-select"
              value={regTimeframe}
              onChange={(e) => setRegTimeframe(e.target.value)}
            >
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last 1 Year</option>
            </select>
          </div>

          <div className="sad-chart-box">
            {registrationChartData.hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationChartData.data} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10.5, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    ticks={[0, 4, 8, 12, 16]}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomRegTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="colleges"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#regGrad)"
                    dot={{ r: 3.5, fill: "#ffffff", stroke: "#16a34a", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: "#16a34a", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="sad-chart-empty-box">
                <Building2 size={26} color="#94a3b8" />
                <span className="sad-empty-title">— No college registrations recorded yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Subscription Plan Distribution (100% Dynamic SVG Donut) */}
        <div className="sad-chart-card">
          <div className="sad-card-header">
            <div className="sad-card-title-left">
              <Layers size={16} className="sad-card-title-icon" />
              <span className="sad-card-title">Subscription Plan Distribution</span>
            </div>
          </div>

          <div className="sad-donut-wrap">
            {/* SVG Donut */}
            <div className="sad-donut-svg-box">
              <svg className="sad-donut-svg" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="37"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="13"
                />
                {/* Dynamically Computed Arcs based on Real DB Subscriptions */}
                {donutSlices.map((slice) => (
                  <circle
                    key={slice.name}
                    cx="50"
                    cy="50"
                    r="37"
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="13"
                    strokeDasharray={slice.dash}
                    strokeDashoffset={slice.offset}
                  />
                ))}
              </svg>
              <div className="sad-donut-center">
                <span className="sad-donut-center-num">{colleges.length || "0"}</span>
                <span className="sad-donut-center-label">Colleges</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="sad-donut-legend">
              {planDistribution.map((item) => (
                <div
                  key={item.name}
                  className="sad-donut-legend-item"
                  onClick={() => navigate("/super-admin/subscriptions")}
                  title={`View ${item.name} plan colleges`}
                >
                  <div className="sad-donut-legend-left">
                    <span className="sad-donut-legend-dot" style={{ background: item.color }} />
                    <span className="sad-donut-legend-name">{item.name}</span>
                  </div>
                  <span className="sad-donut-legend-val">
                    {item.count} ({item.pct})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Subscription Revenue (Dynamic from Real DB Payments) */}
        <div className="sad-chart-card">
          <div className="sad-card-header">
            <div className="sad-card-title-left">
              <CreditCard size={16} className="sad-card-title-icon" />
              <span className="sad-card-title">Subscription Revenue</span>
            </div>
            <select
              className="sad-card-select"
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="sad-chart-box">
            {revenueChartData.hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData.data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10.5, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${v}L`}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomRevTooltip />} />
                  <Bar
                    dataKey="amount"
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="sad-chart-empty-box">
                <CreditCard size={26} color="#94a3b8" />
                <span className="sad-empty-title">— No subscription revenue recorded yet</span>
                <span className="sad-empty-sub">Platform invoice payments from colleges will reflect here</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── BOTTOM ROW: 3 ACTIVITY & OPERATIONAL CARDS ── */}
      <section className="sad-bottom-grid">
        {/* Card 1: Recent College Registrations */}
        <div className="sad-bottom-card">
          <div className="sad-card-header">
            <div className="sad-card-title-left">
              <Users size={16} className="sad-card-title-icon" />
              <span className="sad-card-title">Recent College Registrations</span>
            </div>
            <Link to="/super-admin/colleges" className="sad-view-all-link">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="sad-items-list">
            {recentColleges.length === 0 ? (
              <div className="sad-empty-placeholder">
                <span>— No college registrations found</span>
              </div>
            ) : (
              recentColleges.map((item) => (
                <Link
                  key={item.id}
                  to="/super-admin/colleges"
                  className="sad-item-row"
                  title={`View ${item.name}`}
                >
                  <div className="sad-item-left">
                    <div className="sad-item-avatar green">
                      <Building2 size={15} />
                    </div>
                    <div className="sad-item-text">
                      <span className="sad-item-title">{item.name}</span>
                      <span className="sad-item-sub">{item.code}</span>
                    </div>
                  </div>
                  <div className="sad-item-right">
                    <span className="sad-date-pill">
                      <Calendar size={11} />
                      <span>{item.date}</span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Expiring Subscriptions (Strictly from Real DB) */}
        <div className="sad-bottom-card">
          <div className="sad-card-header">
            <div className="sad-card-title-left">
              <Calendar size={16} className="sad-card-title-icon" />
              <span className="sad-card-title">Expiring Subscriptions</span>
            </div>
            <Link to="/super-admin/renewals" className="sad-view-all-link">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="sad-items-list">
            {expiringList.length === 0 ? (
              <div className="sad-empty-placeholder">
                <CheckCircle2 size={16} color="#16a34a" />
                <span>— All subscriptions are healthy (no expiries within 30 days)</span>
              </div>
            ) : (
              expiringList.map((item) => (
                <Link
                  key={item.id}
                  to="/super-admin/renewals"
                  className="sad-item-row"
                  title={`Renew subscription for ${item.name}`}
                >
                  <div className="sad-item-left">
                    <div className={`sad-item-avatar ${item.color}`}>
                      <Building2 size={15} />
                    </div>
                    <div className="sad-item-text">
                      <span className="sad-item-title">{item.name}</span>
                      <span className="sad-item-sub">{item.code} • {item.plan}</span>
                    </div>
                  </div>
                  <div className="sad-item-right">
                    <span className={`sad-days-pill ${item.color}`}>
                      <Clock size={11} /> {item.days} Days
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Recent Platform Activities (Parsed JSON & Compact Ellipsis) */}
        <div className="sad-bottom-card">
          <div className="sad-card-header">
            <div className="sad-card-title-left">
              <Activity size={16} className="sad-card-title-icon" />
              <span className="sad-card-title">Recent Platform Activities</span>
            </div>
            <Link to="/super-admin/audit-logs" className="sad-view-all-link">
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="sad-items-list">
            {recentActivities.length === 0 ? (
              <div className="sad-empty-placeholder">
                <span>— No recent activities recorded</span>
              </div>
            ) : (
              recentActivities.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.id} className="sad-item-row sad-item-row-static">
                    <div className="sad-item-left">
                      <div className="sad-item-icon-circle">
                        <IconComponent size={14} />
                      </div>
                      <div className="sad-item-text">
                        <span className="sad-item-title" title={item.title}>
                          {item.title}
                        </span>
                        <span className="sad-item-sub">{item.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
