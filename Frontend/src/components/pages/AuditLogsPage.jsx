import { Pagination as AdminPagination } from "../common/Ui.jsx";
import PaginatedTable from "../common/PaginatedTable.jsx";
import { useState, useEffect } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Eye,
  FileDown,
  FileText,
  Filter,
  Globe,
  HardDrive,
  Layers,
  Network,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { getAuditLogs, getRelatedAuditLogs } from "@/api/auditLogApi";
import "./AuditLogsPage.css";

const severityClass = (value) => "audit-severity audit-severity-" + (value || "info").toLowerCase();

const getTodayDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const shiftDate = (dateStr, days) => {
  if (!dateStr) return getTodayDate();
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setDate(target.getDate() + days);
  const nextY = target.getFullYear();
  const nextM = String(target.getMonth() + 1).padStart(2, "0");
  const nextD = String(target.getDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

/**
 * Convert backend UTC ISO timestamps into the user's local timezone (e.g. IST).
 */
const formatLocalTime = (isoOrUtcStr) => {
  if (!isoOrUtcStr) return "";
  try {
    let str = String(isoOrUtcStr).trim();
    if (str.includes("T") && !str.endsWith("Z") && !str.includes("+") && !str.includes("-", 10)) {
      str += "Z";
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return isoOrUtcStr;
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
    return isoOrUtcStr;
  }
};

const getPageNumbers = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
};

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("All modules");
  const [severity, setSeverity] = useState("All severity");
  const [role, setRole] = useState("All roles");
  const [status, setStatus] = useState("All status");
  const [activeCard, setActiveCard] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Related events state for correlation investigation
  const [relatedLogs, setRelatedLogs] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Daily date filter (defaults to today)
  const [date, setDate] = useState(() => getTodayDate());
  const [isRange, setIsRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Configurable pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);

  const [logs, setLogs] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [moduleList, setModuleList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        let fDate = undefined;
        let tDate = undefined;

        if (isRange) {
          fDate = fromDate || undefined;
          tDate = toDate || undefined;
        } else if (date) {
          fDate = date;
          tDate = date;
        }

        const params = {
          query: query || undefined,
          module: module !== "All modules" ? module : undefined,
          severity: severity !== "All severity" ? severity : undefined,
          role: role !== "All roles" ? role : undefined,
          status: status !== "All status" ? status : undefined,
          fromDate: fDate,
          toDate: tDate,
          pageNumber: page,
          pageSize: pageSize
        };

        const res = await getAuditLogs(params);
        if (res.data.success) {
          setLogs(res.data.records);
          setStatsData(res.data.stats);
          setTotal(res.data.total || 0);
          if (moduleList.length === 0 && res.data.modules) {
             setModuleList(res.data.modules);
          }
        }
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timeoutId);
  }, [query, module, severity, role, status, date, isRange, fromDate, toDate, page, pageSize]);

  // Load related events when modal opens with a correlation ID
  useEffect(() => {
    if (selected?.correlationId) {
      setLoadingRelated(true);
      getRelatedAuditLogs(selected.correlationId)
        .then((res) => {
          if (res.data.success && res.data.records) {
            setRelatedLogs(res.data.records.filter((r) => r.auditLogId !== selected.auditLogId));
          } else {
            setRelatedLogs([]);
          }
        })
        .catch(() => setRelatedLogs([]))
        .finally(() => setLoadingRelated(false));
    } else {
      setRelatedLogs([]);
    }
  }, [selected]);

  const handleCardClick = (cardType) => {
    if (cardType === "today") {
      if (activeCard === "today" && date === getTodayDate() && !isRange) {
        setActiveCard(null);
        setDate("");
      } else {
        setActiveCard("today");
        setIsRange(false);
        setDate(getTodayDate());
        setFromDate("");
        setToDate("");
        setSeverity("All severity");
        setModule("All modules");
        setRole("All roles");
        setStatus("All status");
        setQuery("");
      }
      setPage(1);
    } else if (cardType === "failed") {
      if (activeCard === "failed") {
        setActiveCard(null);
        setStatus("All status");
      } else {
        setActiveCard("failed");
        setStatus("Failed");
        setSeverity("All severity");
      }
      setPage(1);
    } else if (cardType === "security") {
      if (activeCard === "security") {
        setActiveCard(null);
        setSeverity("All severity");
      } else {
        setActiveCard("security");
        setSeverity("Security alerts");
        setStatus("All status");
      }
      setPage(1);
    } else if (cardType === "users") {
      if (activeCard === "users") {
        setActiveCard(null);
        setRole("All roles");
      } else {
        setActiveCard("users");
        setRole("All roles");
        setStatus("All status");
      }
      setPage(1);
    } else if (cardType === "devices") {
      if (activeCard === "devices") {
        setActiveCard(null);
        setQuery("");
      } else {
        setActiveCard("devices");
        setQuery("device");
      }
      setPage(1);
    } else if (cardType === "ips") {
      if (activeCard === "ips") {
        setActiveCard(null);
      } else {
        setActiveCard("ips");
      }
      setPage(1);
    }
  };

  /**
   * Sanitizes cells to neutralize CSV Formula Injection (CWE-1236)
   */
  const sanitizeCsvValue = (val) => {
    let str = String(val ?? "");
    if (str.length > 0 && ["=", "+", "-", "@", "\t", "\r"].includes(str[0])) {
      str = "'" + str;
    }
    return '"' + str.replaceAll('"', '""') + '"';
  };

  const exportCsv = () => {
    const headers = [
      "Log ID",
      "Timestamp (UTC)",
      "Actor",
      "User ID",
      "Role",
      "Action",
      "Module",
      "Target",
      "Severity",
      "Status",
      "IP Address",
      "Remote IP",
      "IP Source",
      "Device",
      "Correlation ID",
      "Duration (ms)"
    ];

    const rows = [headers].concat(
      logs.map((log) => [
        log.id,
        formatLocalTime(log.createdAt || log.time),
        log.actor,
        log.userId ?? "",
        log.role ?? "",
        log.action,
        log.module,
        log.target,
        log.severity,
        log.status,
        log.ip ?? "",
        log.remoteIpAddress ?? "",
        log.ipSource ?? "",
        log.device ?? "",
        log.correlationId ?? "",
        log.durationMs != null ? Math.round(log.durationMs) : ""
      ])
    );

    const csvContent = rows
      .map((row) => row.map(sanitizeCsvValue).join(","))
      .join("\n");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8" }));
    const dateSuffix = isRange && fromDate && toDate ? `${fromDate}_to_${toDate}` : (date || "all");
    link.download = `audit-logs-${dateSuffix}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // The 6 required summary metric cards
  const stats = [
    {
      type: "today",
      label: "Events today",
      value: statsData?.eventsToday || 0,
      icon: ShieldCheck,
      tone: "green",
      hint: "Filter today's events"
    },
    {
      type: "failed",
      label: "Failed operations",
      value: statsData?.failedOperationsToday || 0,
      icon: ShieldAlert,
      tone: "red",
      hint: "Filter failed & forbidden operations"
    },
    {
      type: "security",
      label: "Security alerts",
      value: statsData?.securityAlertsToday || statsData?.securityAlerts || 0,
      icon: Shield,
      tone: "amber",
      hint: "Filter security alerts & warnings"
    },
    {
      type: "users",
      label: "Active users",
      value: statsData?.activeUsersToday || 0,
      icon: Users,
      tone: "indigo",
      hint: "Authenticated user accounts active today"
    },
    {
      type: "devices",
      label: "Registered devices",
      value: statsData?.registeredDevicesToday || 0,
      icon: Layers,
      tone: "purple",
      hint: "Observed device clients today"
    },
    {
      type: "ips",
      label: "Distinct public IPs",
      value: statsData?.distinctPublicIpsToday || 0,
      icon: Globe,
      tone: "teal",
      hint: "Distinct routable client networks observed"
    }
  ];

  const dateDescription = activeCard === "today"
    ? `Live audit data for Today (${formatDisplayDate(getTodayDate())}) · filtered from top card.`
    : activeCard === "failed"
    ? "Filtered to show failed operations, unauthorized access, and forbidden attempts."
    : activeCard === "security"
    ? "Filtered to show security alerts (warnings and critical security events)."
    : activeCard === "users"
    ? "Showing audit records generated by authenticated user sessions."
    : isRange && fromDate && toDate
    ? `Live audit data from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}.`
    : date
    ? `Live audit data for ${date === getTodayDate() ? "Today (" + formatDisplayDate(date) + ")" : formatDisplayDate(date)}.`
    : "Live audit data across all dates · records include actor, network provenance, diffs, and outcome.";

  return (
    <DashboardLayout title="Audit Logs" subtitle="Review system activity, security events, network provenance, and administrative changes." breadcrumb={["Home", "Settings", "Audit Logs"]}>
      <main className="audit-logs-page">
        <div className="audit-page-actions">
          <button type="button" className="cms-back-link audit-back" onClick={() => navigate("/dashboard/settings")}>
            <ArrowLeft size={14} /> Back to Settings
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => setShowAdminModal(true)}
              title="View administrators active today"
            >
              <UserCheck size={14} /> Active Admins ({statsData?.activeAdministrators || 0})
            </button>
            <button type="button" className="cms-btn cms-btn-primary" onClick={exportCsv} disabled={loading || !logs.length}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <section className="audit-stat-grid" aria-label="Audit summary metrics">
          {stats.map(({ type, label, value, icon: Icon, tone, hint }) => {
            const isActive = activeCard === type;
            return (
              <div
                key={type}
                className={`audit-stat audit-stat-${tone} ${isActive ? "is-active" : ""}`}
                onClick={() => handleCardClick(type)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(type);
                  }
                }}
                title={isActive ? "Click to clear active filter" : hint}
              >
                <div className="audit-stat-icon-wrap">
                  <Icon size={18} />
                </div>
                <div className="audit-stat-content">
                  <div className="audit-stat-header">
                    <span>{label}</span>
                    {isActive ? (
                      <span className="audit-stat-active-badge">Active</span>
                    ) : (
                      <span className="audit-stat-click-hint">Filter</span>
                    )}
                  </div>
                  <strong>{value}</strong>
                  <span className="audit-stat-footer-text">
                    {isActive ? "Click to reset" : hint}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {activeCard && (
          <div className={`audit-active-filter-bar audit-active-filter-${activeCard}`}>
            <div className="audit-active-filter-info">
              <span className="audit-active-filter-label">Filtered by:</span>
              <strong>
                {activeCard === "today" && `Events Today (${statsData?.eventsToday || 0})`}
                {activeCard === "failed" && `Failed Operations (${statsData?.failedOperationsToday || 0})`}
                {activeCard === "security" && `Security Alerts (${statsData?.securityAlertsToday || statsData?.securityAlerts || 0})`}
                {activeCard === "users" && `Active Users (${statsData?.activeUsersToday || 0})`}
                {activeCard === "devices" && `Registered Devices (${statsData?.registeredDevicesToday || 0})`}
                {activeCard === "ips" && `Distinct Public IPs (${statsData?.distinctPublicIpsToday || 0})`}
              </strong>
              <span>— showing matching records below</span>
            </div>
            <div className="audit-active-filter-actions">
              <button
                type="button"
                className="audit-clear-filter-btn"
                onClick={() => {
                  if (activeCard === "security") setSeverity("All severity");
                  if (activeCard === "failed") setStatus("All status");
                  setActiveCard(null);
                  setPage(1);
                }}
              >
                <X size={13} /> Clear filter
              </button>
            </div>
          </div>
        )}

        <section className="audit-log-panel">
          <div className="audit-panel-head">
            <div>
              <h2>Activity trail</h2>
              <p>{dateDescription}</p>
            </div>
            <span>{loading ? "Loading..." : `${total} event${total === 1 ? "" : "s"}`}</span>
          </div>

          <div className="audit-filters">
            <label className="audit-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                placeholder="Search activity, actor, target, IP, or correlation ID..."
              />
            </label>

            {!isRange ? (
              <div className="audit-date-nav-group">
                <button
                  type="button"
                  className="audit-nav-step-btn"
                  onClick={() => {
                    const base = date || getTodayDate();
                    setDate(shiftDate(base, -1));
                    setPage(1);
                  }}
                  title="Previous day"
                  aria-label="Previous day"
                >
                  <ChevronLeft size={15} />
                </button>

                <label className="audit-date-picker" title="Filter by date">
                  <Calendar size={14} />
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => { setDate(event.target.value); setPage(1); }}
                    aria-label="Filter by date"
                  />
                  {date && (
                    <button
                      type="button"
                      className="audit-date-clear-btn"
                      onClick={() => { setDate(""); setPage(1); }}
                      title="Clear date (Show all dates)"
                      aria-label="Clear date"
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  className="audit-nav-step-btn"
                  onClick={() => {
                    const base = date || getTodayDate();
                    setDate(shiftDate(base, 1));
                    setPage(1);
                  }}
                  disabled={date >= getTodayDate()}
                  title="Next day"
                  aria-label="Next day"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : (
              <div className="audit-range-group">
                <label className="audit-date-picker" title="From date">
                  <Calendar size={14} />
                  <span className="audit-date-sublabel">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => { setFromDate(event.target.value); setPage(1); }}
                    aria-label="From date"
                  />
                  {fromDate && (
                    <button
                      type="button"
                      className="audit-date-clear-btn"
                      onClick={() => { setFromDate(""); setPage(1); }}
                      title="Clear from date"
                      aria-label="Clear from date"
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>

                <label className="audit-date-picker" title="To date">
                  <span className="audit-date-sublabel">To:</span>
                  <input
                    type="date"
                    min={fromDate || undefined}
                    value={toDate}
                    onChange={(event) => { setToDate(event.target.value); setPage(1); }}
                    aria-label="To date"
                  />
                  {toDate && (
                    <button
                      type="button"
                      className="audit-date-clear-btn"
                      onClick={() => { setToDate(""); setPage(1); }}
                      title="Clear to date"
                      aria-label="Clear to date"
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
              </div>
            )}

            <div className="audit-date-quick-actions">
              <button
                type="button"
                className={`audit-quick-btn ${date === getTodayDate() && !isRange ? "is-active" : ""}`}
                onClick={() => {
                  setIsRange(false);
                  setDate(getTodayDate());
                  setPage(1);
                }}
                title="Jump to today"
              >
                Today
              </button>

              <button
                type="button"
                className={`audit-quick-btn ${!date && !isRange ? "is-active" : ""}`}
                onClick={() => {
                  setIsRange(false);
                  setDate("");
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
                title="Show all activity logs across all dates"
              >
                All Dates
              </button>

              <button
                type="button"
                className={`audit-quick-btn ${isRange ? "is-active" : ""}`}
                onClick={() => {
                  const nextRange = !isRange;
                  setIsRange(nextRange);
                  if (nextRange) {
                    setFromDate(date || getTodayDate());
                    setToDate(date || getTodayDate());
                  } else {
                    setDate(fromDate || getTodayDate());
                  }
                  setPage(1);
                }}
                title={isRange ? "Switch to single day" : "Switch to date range"}
              >
                {isRange ? "Single Day" : "Date Range"}
              </button>
            </div>

            <label className="audit-select-filter">
              <Filter size={14} />
              <select
                value={module}
                onChange={(event) => { setModule(event.target.value); setPage(1); }}
              >
                <option>All modules</option>
                {moduleList.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>

            <label className="audit-select-filter">
              <select
                value={severity}
                onChange={(event) => {
                  setSeverity(event.target.value);
                  if (activeCard === "security" && event.target.value !== "Security alerts") {
                    setActiveCard(null);
                  }
                  setPage(1);
                }}
              >
                <option>All severity</option>
                <option>Security alerts</option>
                <option>Info</option>
                <option>Warning</option>
                <option>Critical</option>
              </select>
            </label>

            <label className="audit-select-filter">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  if (activeCard === "failed" && event.target.value !== "Failed") {
                    setActiveCard(null);
                  }
                  setPage(1);
                }}
              >
                <option>All status</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
                <option value="Forbidden">Forbidden</option>
                <option value="Unauthorized">Unauthorized</option>
                <option value="ServerError">Server Error</option>
              </select>
            </label>

            <label className="audit-select-filter">
              <UserCheck size={14} />
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by role"
              >
                <option>All roles</option>
                <option>Administrator</option>
                <option>Super Admin</option>
                <option>Faculty</option>
                <option>Staff</option>
                <option>Student</option>
              </select>
            </label>
          </div>

          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Activity</th>
                  <th>Module</th>
                  <th>Outcome</th>
                  <th>IP & Provenance</th>
                  <th aria-label="View details" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{formatLocalTime(log.createdAt || log.time)}</strong>
                      <small>{log.id}</small>
                    </td>
                    <td>
                      <strong>{log.actor}</strong>
                      <small>{log.role || log.actorType || "System"}</small>
                    </td>
                    <td className="audit-activity-col">
                      <div className="audit-activity-headline" title={log.details || log.action}>
                        {log.details || log.action}
                      </div>
                      <div className="audit-activity-badges">
                        <span className="audit-target-chip">{log.target}</span>
                        {log.changes && log.changes.length > 0 && (
                          <span
                            className="audit-diff-chip"
                            title={log.changes.map((c) => `${c.field}: ${c.oldValue ?? "none"} → ${c.newValue ?? "none"}`).join(", ")}
                          >
                            <ArrowRight size={11} /> {log.changes.length} field{log.changes.length === 1 ? "" : "s"} modified
                          </span>
                        )}
                        {log.correlationId && (
                          <span className="audit-target-chip" title={`Correlation: ${log.correlationId}`}>
                            corr:{log.correlationId.substring(0, 6)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{log.module}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className={"audit-status audit-status-" + (log.status || "success").toLowerCase()}>
                          {log.status || "Success"}
                        </span>
                        <span className={severityClass(log.severity)} style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {log.severity || "Info"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{log.ip || "Unknown"}</strong>
                      <small>{log.ipSource || "DirectConnection"}</small>
                    </td>
                    <td>
                      <button type="button" className="audit-view-button" onClick={() => setSelected(log)} aria-label={"View " + log.id}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && !logs.length && (
                  <tr>
                    <td className="audit-empty" colSpan="7">
                      No events match the selected filters{date ? ` for ${formatDisplayDate(date)}` : ""}.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td className="audit-empty" colSpan="7">Loading audit trail...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination currentPage={page} totalRecords={total} pageSize={5} onPageChange={setPage} />
        </section>

        {showAdminModal && (
          <div className="audit-modal-backdrop" role="presentation" onMouseDown={() => setShowAdminModal(false)}>
            <section
              className="audit-detail-modal audit-admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="active-admin-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="audit-modal-header">
                <div className="audit-modal-title-group">
                  <div className="audit-modal-tags">
                    <span className="audit-severity audit-severity-info">Administrator Activity</span>
                    <span className="audit-id-badge">Today</span>
                  </div>
                  <h2 id="active-admin-title">Active Administrators Today</h2>
                  <p className="audit-modal-subdesc">
                    Administrators who have performed authenticated operations or logged in today.
                  </p>
                </div>
                <button
                  className="audit-modal-close"
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="audit-admin-list">
                {statsData?.administrators && statsData.administrators.length > 0 ? (
                  statsData.administrators.map((admin, idx) => (
                    <article key={admin.userName || idx} className="audit-admin-card">
                      <div className="audit-admin-avatar">
                        <UserCheck size={20} />
                      </div>
                      <div className="audit-admin-details">
                        <div className="audit-admin-name-row">
                          <strong>{admin.userName}</strong>
                          <span className="audit-target-chip">{admin.role || "Administrator"}</span>
                        </div>
                        <div className="audit-admin-meta-row">
                          <span><strong>{admin.actionCount}</strong> action{admin.actionCount === 1 ? "" : "s"} today</span>
                          <span>·</span>
                          <span>Last active: <strong>{formatLocalTime(admin.lastActive)}</strong></span>
                        </div>
                        {admin.lastIp && (
                          <div className="audit-admin-ip-row">
                            <small>IP: <code>{admin.lastIp}</code></small>
                            {admin.lastAction && <small>· Action: {admin.lastAction}</small>}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="cms-btn cms-btn-primary audit-admin-filter-btn"
                        onClick={() => {
                          setQuery(admin.userName);
                          setRole("Administrator");
                          setShowAdminModal(false);
                          setPage(1);
                        }}
                      >
                        View Activity
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="audit-admin-empty">
                    <UserCheck size={28} />
                    <p>No administrators currently recorded as active today.</p>
                  </div>
                )}
              </div>

              <div className="audit-modal-footer">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setShowAdminModal(false)}>
                  Close
                </button>
              </div>
            </section>
          </div>
        )}

        {selected && (
          <div className="audit-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
            <section className="audit-detail-modal" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="audit-modal-header">
                <div className="audit-modal-title-group">
                  <div className="audit-modal-tags">
                    <span className={severityClass(selected.severity)}>{selected.severity || "Info"} event</span>
                    <span className={"audit-status audit-status-" + (selected.status || "success").toLowerCase()}>{selected.status || "Success"}</span>
                    <span className="audit-id-badge">{selected.id}</span>
                  </div>
                  <h2 id="audit-detail-title">{selected.action}</h2>
                </div>
                <button className="audit-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              {selected.details && (
                <div className="audit-narrative-card">
                  <Activity size={18} className="audit-narrative-icon" />
                  <div>
                    <span className="audit-narrative-label">Activity Narrative</span>
                    <p className="audit-narrative-text">{selected.details}</p>
                  </div>
                </div>
              )}

              {/* 1. Actor & Identity */}
              <div className="audit-modal-section-title">
                <Users size={14} /> Actor & Identity
              </div>
              <dl className="audit-meta-grid">
                <div><dt>Actor</dt><dd>{selected.actor} <span className="audit-actor-role">({selected.role || "Unknown"})</span></dd></div>
                <div><dt>User ID</dt><dd>{selected.userId != null ? `#${selected.userId}` : "None (System/Background)"}</dd></div>
                <div><dt>Staff ID</dt><dd>{selected.staffId != null ? `#${selected.staffId}` : "None"}</dd></div>
                <div><dt>Actor Classification</dt><dd>{selected.actorType || "User"}</dd></div>
              </dl>

              {/* 2. Network Provenance */}
              <div className="audit-modal-section-title">
                <Network size={14} /> Network Provenance & IP Verification
              </div>
              <dl className="audit-meta-grid">
                <div>
                  <dt>Effective IP Address</dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <code>{selected.ip || "Unknown"}</code>
                    {selected.ip && (
                      <button
                        type="button"
                        className="audit-copy-tag"
                        onClick={() => {
                          navigator.clipboard.writeText(selected.ip);
                          setCopiedIp(true);
                          setTimeout(() => setCopiedIp(false), 1500);
                        }}
                      >
                        {copiedIp ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedIp ? "Copied" : "Copy"}</span>
                      </button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Connection Socket IP</dt>
                  <dd><code>{selected.remoteIpAddress || selected.ip || "Unknown"}</code></dd>
                </div>
                <div>
                  <dt>Trusted Forwarded IP</dt>
                  <dd>{selected.forwardedClientIp ? <code>{selected.forwardedClientIp}</code> : <span className="audit-actor-role">None (Direct Connection)</span>}</dd>
                </div>
                <div>
                  <dt>IP Source & Confidence</dt>
                  <dd>
                    <span className={`audit-badge-provenance ${selected.ipSource === "TrustedProxy" ? "audit-badge-trusted" : "audit-badge-direct"}`}>
                      {selected.ipSource || "DirectConnection"} · {selected.ipConfidence || "DirectlyObserved"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Local Laptop IP</dt>
                  <dd><span className="audit-actor-role">Unavailable (Standard Web Client)</span></dd>
                </div>
                <div>
                  <dt>Network Gateway IP</dt>
                  <dd><span className="audit-actor-role">Unavailable (Standard Web Client)</span></dd>
                </div>
              </dl>

              {/* 3. Device & Client Environment */}
              <div className="audit-modal-section-title">
                <Smartphone size={14} /> Device & Client Environment
              </div>
              <dl className="audit-meta-grid">
                <div><dt>Registered Device ID</dt><dd>{selected.deviceId ? <code>{selected.deviceId}</code> : <span className="audit-actor-role">Unregistered Browser Session</span>}</dd></div>
                <div><dt>Session ID</dt><dd>{selected.sessionId ? <code>{selected.sessionId}</code> : <span className="audit-actor-role">Standard Session</span>}</dd></div>
                <div style={{ gridColumn: "span 2" }}>
                  <dt>User Agent / Browser</dt>
                  <dd className="audit-device-val">{selected.device || "Unknown"}</dd>
                </div>
              </dl>

              {/* 4. Request Metadata */}
              <div className="audit-modal-section-title">
                <Server size={14} /> Request & Correlation Trace
              </div>
              <dl className="audit-meta-grid">
                <div><dt>HTTP Method & Status</dt><dd>{selected.requestMethod || "N/A"} · {selected.httpStatusCode != null ? `HTTP ${selected.httpStatusCode}` : "Handled"}</dd></div>
                <div><dt>Route Template</dt><dd>{selected.routeTemplate || selected.target || "N/A"}</dd></div>
                <div><dt>Duration (Latency)</dt><dd>{selected.durationMs != null ? `${Math.round(selected.durationMs)} ms` : "N/A"}</dd></div>
                <div><dt>Correlation ID</dt><dd>{selected.correlationId ? <code>{selected.correlationId}</code> : "N/A"}</dd></div>
              </dl>

              {/* 5. Correlated Events */}
              {selected.correlationId && (
                <div className="audit-section-block">
                  <div className="audit-section-head">
                    <Activity size={15} />
                    <h3>Correlated Operations in Same Request ({relatedLogs.length})</h3>
                  </div>
                  {loadingRelated ? (
                    <small>Loading correlated events...</small>
                  ) : relatedLogs.length > 0 ? (
                    <div className="audit-related-list">
                      {relatedLogs.map((rel) => (
                        <div key={rel.id} className="audit-related-item">
                          <div>
                            <strong>{rel.action}</strong> · <span>{rel.module} / {rel.target}</span>
                          </div>
                          <div>
                            <span className={"audit-status audit-status-" + (rel.status || "success").toLowerCase()}>
                              {rel.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <small className="audit-actor-role">No additional operations were dispatched under this correlation ID.</small>
                  )}
                </div>
              )}

              {/* 6. Property Changes */}
              {selected.changes && selected.changes.length > 0 && (
                <div className="audit-section-block">
                  <div className="audit-section-head">
                    <Layers size={15} />
                    <h3>Property Changes ({selected.changes.length})</h3>
                  </div>
                  <div className="audit-diff-table-wrap">
                    <PaginatedTable className="audit-diff-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Previous Value</th>
                          <th>New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.changes.map((change, idx) => (
                          <tr key={`diff-${idx}`}>
                            <td className="audit-diff-field">{change.field}</td>
                            <td className="audit-diff-old">
                              {change.oldValue != null && change.oldValue !== "" ? (
                                <code>{change.oldValue}</code>
                              ) : (
                                <span className="audit-empty-val">None</span>
                              )}
                            </td>
                            <td className="audit-diff-new">
                              {change.newValue != null && change.newValue !== "" ? (
                                <code>{change.newValue}</code>
                              ) : (
                                <span className="audit-empty-val">None</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </PaginatedTable>
                  </div>
                </div>
              )}

              {/* 7. Submitted User Input */}
              {selected.userInput && Object.keys(selected.userInput).length > 0 && (
                <div className="audit-section-block">
                  <div className="audit-section-head">
                    <FileText size={15} />
                    <h3>Submitted Parameters (Sanitized)</h3>
                    <button
                      type="button"
                      className="audit-copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selected.userInput, null, 2));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      title="Copy payload to clipboard"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied ? "Copied!" : "Copy JSON"}</span>
                    </button>
                  </div>
                  <div className="audit-user-input-box">
                    <pre className="audit-json-pre">
                      {JSON.stringify(selected.userInput, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="audit-modal-footer">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setSelected(null)}>
                  Close details
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
