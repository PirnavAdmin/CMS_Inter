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
  Layers,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { getAuditLogs } from "@/api/auditLogApi";
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
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  // Daily date filter (defaults to today just like student/staff attendance)
  const [date, setDate] = useState(() => getTodayDate());
  const [isRange, setIsRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Configurable pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
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
  }, [query, module, severity, date, isRange, fromDate, toDate, page, pageSize]);

  const exportCsv = () => {
    const rows = [["Log ID", "Timestamp", "Actor", "Role", "Action", "Module", "Target", "Severity", "Status", "IP Address"]]
      .concat(logs.map((log) => [
        log.id,
        formatLocalTime(log.createdAt || log.time),
        log.actor,
        log.role,
        log.action,
        log.module,
        log.target,
        log.severity,
        log.status,
        log.ip
      ]));
    const csv = rows.map((row) => row.map((value) => "\"" + String(value || "").replaceAll("\"", "\"\"") + "\"").join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const dateSuffix = isRange && fromDate && toDate ? `${fromDate}_to_${toDate}` : (date || "all");
    link.download = `audit-logs-${dateSuffix}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const stats = [
    { label: "Events today", value: statsData?.eventsToday || 0, icon: ShieldCheck, tone: "green" },
    { label: "Security alerts", value: statsData?.securityAlerts || 0, icon: ShieldAlert, tone: "amber" },
    { label: "Active administrators", value: statsData?.activeAdministrators || 0, icon: UserCheck, tone: "blue" },
  ];

  const dateDescription = isRange && fromDate && toDate
    ? `Live audit data from ${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}.`
    : date
    ? `Live audit data for ${date === getTodayDate() ? "Today (" + formatDisplayDate(date) + ")" : formatDisplayDate(date)}.`
    : "Live audit data across all dates · records include actor, source, result, and affected entity.";

  return (
    <DashboardLayout title="Audit Logs" subtitle="Review system activity, security events, and administrative changes." breadcrumb={["Home", "Settings", "Audit Logs"]}>
      <main className="audit-logs-page">
        <div className="audit-page-actions">
          <button type="button" className="cms-back-link audit-back" onClick={() => navigate("/dashboard/settings")}>
            <ArrowLeft size={14} /> Back to Settings
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={exportCsv} disabled={loading || !logs.length}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <section className="audit-stat-grid">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <article className={"audit-stat audit-stat-" + tone} key={label}>
              <Icon size={18} />
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </section>

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
                placeholder="Search activity, user, record, or ID..."
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
                onChange={(event) => { setSeverity(event.target.value); setPage(1); }}
              >
                <option>All severity</option>
                <option>Info</option>
                <option>Warning</option>
                <option>Critical</option>
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
                  <th>Severity</th>
                  <th>Result</th>
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
                      <small>{log.role || "Unknown"}</small>
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
                      </div>
                    </td>
                    <td>{log.module}</td>
                    <td><span className={severityClass(log.severity)}>{log.severity || "Info"}</span></td>
                    <td><span className={"audit-status audit-status-" + (log.status || "success").toLowerCase()}>{log.status || "Success"}</span></td>
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

          <div className="audit-pagination">
            <div className="audit-pagination-info">
              <span>
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} events
              </span>
            </div>

            <div className="audit-pagination-controls">
              <div className="audit-page-size-wrap">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="audit-pagination-nav">
                <button
                  type="button"
                  className="audit-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  title="First page"
                  aria-label="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  className="audit-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                {getPageNumbers(page, totalPages).map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="audit-page-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      className={`audit-page-btn ${p === page ? "is-active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="audit-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  className="audit-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last page"
                  aria-label="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

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
                    <span className="audit-narrative-label">Activity Description</span>
                    <p className="audit-narrative-text">{selected.details}</p>
                  </div>
                </div>
              )}

              <dl className="audit-meta-grid">
                <div><dt>Timestamp</dt><dd>{formatLocalTime(selected.createdAt || selected.time)}</dd></div>
                <div><dt>Actor</dt><dd>{selected.actor} <span className="audit-actor-role">({selected.role || "Unknown"})</span></dd></div>
                <div><dt>Module</dt><dd>{selected.module}</dd></div>
                <div><dt>Affected record</dt><dd>{selected.target}</dd></div>
                <div><dt>IP Address</dt><dd>{selected.ip || "Unknown"}</dd></div>
                <div><dt>User Agent / Device</dt><dd className="audit-device-val">{selected.device || "Unknown"}</dd></div>
              </dl>

              {selected.changes && selected.changes.length > 0 && (
                <div className="audit-section-block">
                  <div className="audit-section-head">
                    <Layers size={15} />
                    <h3>Property Changes ({selected.changes.length})</h3>
                  </div>
                  <div className="audit-diff-table-wrap">
                    <table className="audit-diff-table">
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
                    </table>
                  </div>
                </div>
              )}

              {selected.userInput && Object.keys(selected.userInput).length > 0 && (
                <div className="audit-section-block">
                  <div className="audit-section-head">
                    <FileText size={15} />
                    <h3>Submitted User Input & Parameters</h3>
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
