import React, { useState, useMemo, useEffect } from "react";
import {
  ClipboardList,
  Search,
  RotateCw,
  RotateCcw,
  Download,
  Calendar,
  User,
  Plus,
  Pencil,
  LogIn,
  Settings,
  Bell,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Building2,
  FileText,
  Award,
  Globe,
  Wallet,
  BookOpen,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
  CreditCard
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import superAdminApi from "@/api/superAdminApi.js";
import auditIllustration from "@/assets/settings-3d/audit-logs.png";
import SuperAdminPagination from "../components/SuperAdminPagination.jsx";
import "./AuditLogsPage.css";

// Helper to clean & parse JSON activity descriptions into human-readable text
const cleanActivityDetails = (raw) => {
  if (!raw) return "Platform action recorded";
  const str = String(raw).trim();
  if (str.startsWith("{") && (str.endsWith("}") || str.includes('"summary"'))) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.summary) return parsed.summary;
      if (parsed.message) return parsed.message;
      if (parsed.title) return parsed.title;
      if (parsed.action) return parsed.action;
      if (parsed.changes && Array.isArray(parsed.changes)) {
        return `Updated configuration (${parsed.changes.length} change${parsed.changes.length > 1 ? "s" : ""})`;
      }
    } catch {
      const match = str.match(/"summary"\s*:\s*"([^"]+)"/);
      if (match && match[1]) return match[1];
    }
  }

  // Handle common system text
  if (/^Plan changed to (\d+)/i.test(str)) {
    return "Subscription plan tier updated";
  }
  return str;
};

// Map module string to appropriate icon component
const getModuleIcon = (moduleName) => {
  const m = String(moduleName || "").toLowerCase();
  if (m.includes("calendar") || m.includes("academic")) return Calendar;
  if (m.includes("certificate")) return Award;
  if (m.includes("reimbursement") || m.includes("expense") || m.includes("payment")) return Wallet;
  if (m.includes("subscription") || m.includes("plan")) return Layers;
  if (m.includes("notification") || m.includes("alert")) return Bell;
  if (m.includes("college") || m.includes("campus")) return Building2;
  if (m.includes("user") || m.includes("admin") || m.includes("role")) return Users;
  if (m.includes("exam") || m.includes("timetable")) return BookOpen;
  return Globe;
};



export default function AuditLogsPage() {
  const { data, refresh } = useSuperAdmin?.() || { data: {} };
  const colleges = data?.colleges || [];
  const rawActivities = data?.activities || [];

  // Filter States
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'logins' | 'config' | 'data' | 'notifications'
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedModule, setSelectedModule] = useState("All");
  const [selectedAction, setSelectedAction] = useState("All");
  const [selectedCollege, setSelectedCollege] = useState("All");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh?.();
      showToast("Audit logs refreshed successfully!");
    } catch {
      showToast("Refreshed audit logs.");
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedModule("All");
    setSelectedAction("All");
    setSelectedCollege("All");
    setCurrentPage(1);
    showToast("Filters reset to default.");
  };

  // Build sanitized audit logs list from REAL DB data only
  const combinedLogs = useMemo(() => {
    if (!rawActivities || rawActivities.length === 0) return [];

    return rawActivities.map((a, idx) => {
      const id = a.id || `DB-${a.auditLogId || idx}`;

      const rawAction = String(a.actionType || a.action || "").trim();
      let normalizedAction = "Created";
      const lowerAct = (rawAction + " " + (a.message || "")).toLowerCase();
      if (lowerAct.includes("login") || lowerAct.includes("auth")) normalizedAction = "Login";
      else if (lowerAct.includes("update") || lowerAct.includes("edit") || lowerAct.includes("saved")) normalizedAction = "Updated";
      else if (lowerAct.includes("change") || lowerAct.includes("switch")) normalizedAction = "Changed";
      else if (lowerAct.includes("notification") || lowerAct.includes("broadcast") || lowerAct.includes("alert")) normalizedAction = "Notification";
      else if (lowerAct.includes("delete") || lowerAct.includes("remove") || lowerAct.includes("cancel")) normalizedAction = "Deleted";
      else if (lowerAct.includes("create") || lowerAct.includes("add") || lowerAct.includes("register")) normalizedAction = "Created";

      // Detect Module
      let mod = a.module || a.entityName || "Platform";
      if (mod === "Platform" && lowerAct.includes("notification")) mod = "Notifications";
      if (mod === "Platform" && lowerAct.includes("plan")) mod = "Subscriptions";
      if (mod === "Platform" && lowerAct.includes("calendar")) mod = "Academic Calendar";

      // Detect College
      let col = a.college || a.collegeName || "All Colleges";
      if (col === "Platform Global" || col === "-" || col === "—") col = "All Colleges";

      // Detect User & Role
      let user = a.performedBy || a.userName || "Super Administrator";
      let role = a.role || (user.includes("ADM") ? "College Admin" : "Super Admin");
      if (lowerAct.includes("system") || user.toLowerCase() === "system") {
        user = "System";
        role = "System";
      }

      return {
        id,
        at: a.at || a.createdAt || "",
        userName: user,
        userRole: role,
        action: normalizedAction,
        module: mod,
        college: col,
        details: cleanActivityDetails(a.message || a.details || a.description)
      };
    }).sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [rawActivities]);

  // List of distinct modules for dropdown
  const availableModules = useMemo(() => {
    const set = new Set();
    combinedLogs.forEach((l) => {
      if (l.module && l.module !== "—" && l.module !== "-") set.add(l.module);
    });
    return Array.from(set).sort();
  }, [combinedLogs]);

  // Filtered logs based on Tabs and Filter Controls
  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((item) => {
      // 1. Tab filter
      if (activeTab === "logins" && item.action !== "Login") return false;
      if (activeTab === "config" && !["Changed", "Updated"].includes(item.action)) return false;
      if (activeTab === "data" && !["Created", "Deleted"].includes(item.action)) return false;
      if (activeTab === "notifications" && item.action !== "Notification") return false;

      // 2. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          item.details.toLowerCase().includes(q) ||
          item.userName.toLowerCase().includes(q) ||
          item.module.toLowerCase().includes(q) ||
          item.college.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 3. Date range filter
      if (fromDate) {
        const itemDate = String(item.at).slice(0, 10);
        if (itemDate < fromDate) return false;
      }
      if (toDate) {
        const itemDate = String(item.at).slice(0, 10);
        if (itemDate > toDate) return false;
      }

      // 4. Module filter
      if (selectedModule !== "All" && item.module !== selectedModule) return false;

      // 5. Action filter
      if (selectedAction !== "All" && item.action.toLowerCase() !== selectedAction.toLowerCase()) return false;

      // 6. College filter
      if (selectedCollege !== "All" && item.college !== selectedCollege) return false;

      return true;
    });
  }, [combinedLogs, activeTab, searchTerm, fromDate, toDate, selectedModule, selectedAction, selectedCollege]);

  // Pagination calculation
  const totalRecords = filteredLogs.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + rowsPerPage);

  // Keep currentPage in valid range when filters change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Format date-time for display
  const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === "-" || dateStr === "—") return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    } catch {
      return String(dateStr);
    }
  };

  // CSV Export
  const handleExport = () => {
    try {
      const headers = ["Index,Date_Time,User,Role,Action,Module,College,Details"];
      const rows = filteredLogs.map((log, i) => {
        const dt = `"${formatDateTime(log.at)}"`;
        const u = `"${log.userName}"`;
        const r = `"${log.userRole}"`;
        const a = `"${log.action}"`;
        const m = `"${log.module}"`;
        const c = `"${log.college}"`;
        const d = `"${log.details.replace(/"/g, '""')}"`;
        return `${i + 1},${dt},${u},${r},${a},${m},${c},${d}`;
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Platform_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Audit logs exported to CSV.");
    } catch (err) {
      showToast("Export failed.");
    }
  };

  return (
    <div className="sal-page-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="sal-toast">
          <CheckCircle2 size={16} color="#4ade80" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── BREADCRUMB ── */}
      <nav className="sal-breadcrumb">
        <span>Platform Management</span>
        <ChevronRight size={13} className="sal-bc-sep" />
        <span className="sal-bc-active">Audit Logs</span>
      </nav>

      {/* ── HEADER BANNER ── */}
      <header className="sal-header-card">
        <div className="sal-header-left">
          <div className="sal-title-icon">
            <ClipboardList size={22} />
          </div>
          <div className="sal-header-text">
            <h1 className="sal-header-title">Audit Logs</h1>
            <p className="sal-header-desc">
              Track and monitor all important activities across the platform, including logins, configuration changes and data updates.
            </p>
          </div>
        </div>

        <div className="sal-header-illustration-box">
          <img
            src={auditIllustration}
            alt="Audit Logs"
            className="sal-header-illustration"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      </header>

      {/* ── TABS BAR & ACTIONS ── */}
      <div className="sal-tabs-bar">
        <div className="sal-tabs-left">
          <button
            type="button"
            className={`sal-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          >
            <ClipboardList size={14} />
            <span>All Activities</span>
          </button>
          <button
            type="button"
            className={`sal-tab-btn ${activeTab === "logins" ? "active" : ""}`}
            onClick={() => { setActiveTab("logins"); setCurrentPage(1); }}
          >
            <User size={14} />
            <span>Logins</span>
          </button>
          <button
            type="button"
            className={`sal-tab-btn ${activeTab === "config" ? "active" : ""}`}
            onClick={() => { setActiveTab("config"); setCurrentPage(1); }}
          >
            <Settings size={14} />
            <span>Configuration</span>
          </button>
          <button
            type="button"
            className={`sal-tab-btn ${activeTab === "data" ? "active" : ""}`}
            onClick={() => { setActiveTab("data"); setCurrentPage(1); }}
          >
            <Layers size={14} />
            <span>Data Changes</span>
          </button>
          <button
            type="button"
            className={`sal-tab-btn ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => { setActiveTab("notifications"); setCurrentPage(1); }}
          >
            <Bell size={14} />
            <span>Notifications</span>
          </button>
        </div>

        <div className="sal-actions-right">
          <button type="button" className="sal-btn-export" onClick={handleExport} title="Export filtered records to CSV">
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            type="button"
            className="sal-btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh logs from database"
          >
            <RotateCw size={14} className={refreshing ? "sal-spinning" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── FILTER CONTROLS BAR ── */}
      <div className="sal-filter-card">
        {/* Search Input */}
        <div className="sal-search-wrap">
          <Search size={15} className="sal-search-icon" />
          <input
            type="text"
            className="sal-search-input"
            placeholder="Search by activity, user, message..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          {searchTerm && (
            <button type="button" className="sal-search-clear" onClick={() => setSearchTerm("")}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Date Range: From & To */}
        <div className="sal-filter-group">
          <span className="sal-filter-label">Date Range</span>
          <div className="sal-date-inputs">
            <div className="sal-date-box">
              <span className="sal-date-sub">From</span>
              <input
                type="date"
                className="sal-date-input"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="sal-date-box">
              <span className="sal-date-sub">To</span>
              <input
                type="date"
                className="sal-date-input"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* Module Filter */}
        <div className="sal-filter-group">
          <span className="sal-filter-label">Module</span>
          <div className="sal-select-wrap">
            <select
              className="sal-select"
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Modules</option>
              {availableModules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={13} className="sal-select-arrow" />
          </div>
        </div>

        {/* Action Filter */}
        <div className="sal-filter-group">
          <span className="sal-filter-label">Action</span>
          <div className="sal-select-wrap">
            <select
              className="sal-select"
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Actions</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Login">Login</option>
              <option value="Changed">Changed</option>
              <option value="Notification">Notification</option>
              <option value="Deleted">Deleted</option>
            </select>
            <ChevronDown size={13} className="sal-select-arrow" />
          </div>
        </div>

        {/* College Filter */}
        <div className="sal-filter-group">
          <span className="sal-filter-label">College</span>
          <div className="sal-select-wrap">
            <select
              className="sal-select"
              value={selectedCollege}
              onChange={(e) => { setSelectedCollege(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Colleges</option>
              {colleges.map((c) => (
                <option key={c.id || c.collegeId} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="sal-select-arrow" />
          </div>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className="sal-btn-reset"
          onClick={handleResetFilters}
          title="Reset all search & filter options"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      {/* ── AUDIT LOGS TABLE (WITHOUT IP ADDRESS COLUMN) ── */}
      <div className="sal-table-wrap">
        <table className="sal-table">
          <thead>
            <tr>
              <th className="sal-th-num">#</th>
              <th className="sal-th-datetime">Date & Time</th>
              <th className="sal-th-user">User / Role</th>
              <th className="sal-th-action">Action</th>
              <th className="sal-th-module">Module</th>
              <th className="sal-th-college">College</th>
              <th className="sal-th-details">Details</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="sal-empty-row">
                  <div className="sal-empty-state">
                    <ClipboardList size={30} className="sal-empty-icon" />
                    <span className="sal-empty-title">No audit records found</span>
                    <span className="sal-empty-desc">
                      Try clearing or adjusting your search filters to view activity logs.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLogs.map((item, idx) => {
                const ModuleIcon = getModuleIcon(item.module);
                const act = (item.action || "").toLowerCase();

                return (
                  <tr key={item.id || idx} className="sal-tr">
                    {/* 1. Row Index */}
                    <td className="sal-td-num">
                      {startIndex + idx + 1}
                    </td>

                    {/* 2. Date & Time */}
                    <td className="sal-td-datetime">
                      <div className="sal-datetime-pill">
                        <Calendar size={13} className="sal-cal-icon" />
                        <span>{formatDateTime(item.at)}</span>
                      </div>
                    </td>

                    {/* 3. User / Role */}
                    <td className="sal-td-user">
                      <div className="sal-user-cell">
                        <div className="sal-user-avatar">
                          <User size={13} />
                        </div>
                        <div className="sal-user-info">
                          <span className="sal-user-name" title={item.userName}>
                            {item.userName || "—"}
                          </span>
                          <span className="sal-user-role">
                            {item.userRole || "—"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Action Badge */}
                    <td className="sal-td-action">
                      {act === "created" && (
                        <span className="sal-action-badge created">
                          <Plus size={11} strokeWidth={2.5} />
                          <span>Created</span>
                        </span>
                      )}
                      {act === "updated" && (
                        <span className="sal-action-badge updated">
                          <Pencil size={11} />
                          <span>Updated</span>
                        </span>
                      )}
                      {act === "login" && (
                        <span className="sal-action-badge login">
                          <LogIn size={11} />
                          <span>Login</span>
                        </span>
                      )}
                      {act === "changed" && (
                        <span className="sal-action-badge changed">
                          <Settings size={11} />
                          <span>Changed</span>
                        </span>
                      )}
                      {act === "notification" && (
                        <span className="sal-action-badge notification">
                          <Bell size={11} />
                          <span>Notification</span>
                        </span>
                      )}
                      {act === "deleted" && (
                        <span className="sal-action-badge deleted">
                          <Trash2 size={11} />
                          <span>Deleted</span>
                        </span>
                      )}
                      {!["created", "updated", "login", "changed", "notification", "deleted"].includes(act) && (
                        <span className="sal-action-badge default">
                          <Activity size={11} />
                          <span>{item.action || "Event"}</span>
                        </span>
                      )}
                    </td>

                    {/* 5. Module */}
                    <td className="sal-td-module">
                      <div className="sal-module-cell">
                        <ModuleIcon size={14} className="sal-module-icon" />
                        <span className="sal-module-name">{item.module || "Platform"}</span>
                      </div>
                    </td>

                    {/* 6. College */}
                    <td className="sal-td-college">
                      {item.college === "All Colleges" || item.college === "Platform Global" ? (
                        <span className="sal-all-colleges-badge">
                          <Layers size={11} />
                          <span>All Colleges</span>
                        </span>
                      ) : (
                        <span className="sal-college-name" title={item.college}>
                          {item.college || "—"}
                        </span>
                      )}
                    </td>

                    {/* 7. Details (Clean, readable text, no raw JSON) */}
                    <td className="sal-td-details">
                      <span className="sal-details-text" title={item.details}>
                        {item.details || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION BAR ── */}
      <SuperAdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(r) => {
          setRowsPerPage(r);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
