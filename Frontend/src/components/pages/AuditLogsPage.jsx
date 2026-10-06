import { useState, useEffect } from "react";
import { ArrowLeft, Download, Eye, FileDown, Filter, Search, ShieldAlert, ShieldCheck, UserCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { getAuditLogs } from "@/api/auditLogApi";
import "./AuditLogsPage.css";

const severityClass = (value) => "audit-severity audit-severity-" + (value || "info").toLowerCase();

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("All modules");
  const [severity, setSeverity] = useState("All severity");
  const [selected, setSelected] = useState(null);
  
  const [logs, setLogs] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [moduleList, setModuleList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = {
          query: query || undefined,
          module: module !== "All modules" ? module : undefined,
          severity: severity !== "All severity" ? severity : undefined
        };
        const res = await getAuditLogs(params);
        if (res.data.success) {
          setLogs(res.data.records);
          setStatsData(res.data.stats);
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
  }, [query, module, severity]);

  const exportCsv = () => {
    const rows = [["Log ID", "Timestamp", "Actor", "Role", "Action", "Module", "Target", "Severity", "Status", "IP Address"]]
      .concat(logs.map((log) => [log.id, log.time, log.actor, log.role, log.action, log.module, log.target, log.severity, log.status, log.ip]));
    const csv = rows.map((row) => row.map((value) => "\"" + String(value || "").replaceAll("\"", "\"\"") + "\"").join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "audit-logs-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const stats = [
    { label: "Events today", value: statsData?.eventsToday || 0, icon: ShieldCheck, tone: "green" },
    { label: "Security alerts", value: statsData?.securityAlerts || 0, icon: ShieldAlert, tone: "amber" },
    { label: "Active administrators", value: statsData?.activeAdministrators || 0, icon: UserCheck, tone: "blue" },
  ];

  return <DashboardLayout title="Audit Logs" subtitle="Review system activity, security events, and administrative changes." breadcrumb={["Home", "Settings", "Audit Logs"]}>
    <main className="audit-logs-page">
      <div className="audit-page-actions">
        <button type="button" className="cms-back-link audit-back" onClick={() => navigate("/dashboard/settings")}><ArrowLeft size={14} /> Back to Settings</button>
        <button type="button" className="cms-btn cms-btn-primary" onClick={exportCsv} disabled={loading || !logs.length}><Download size={14} /> Export CSV</button>
      </div>

      <section className="audit-stat-grid">
        {stats.map(({ label, value, icon: Icon, tone }) => <article className={"audit-stat audit-stat-" + tone} key={label}><Icon size={18} /><div><span>{label}</span><strong>{value}</strong></div></article>)}
      </section>

      <section className="audit-log-panel">
        <div className="audit-panel-head"><div><h2>Activity trail</h2><p>Live audit data · records include actor, source, result, and affected entity.</p></div><span>{loading ? "Loading..." : logs.length + " events"}</span></div>
        <div className="audit-filters">
          <label className="audit-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity, user, record, or ID..." /></label>
          <label><Filter size={14} /><select value={module} onChange={(event) => setModule(event.target.value)}><option>All modules</option>{moduleList.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>All severity</option><option>Info</option><option>Warning</option><option>Critical</option></select></label>
        </div>
        <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Activity</th><th>Module</th><th>Severity</th><th>Result</th><th aria-label="View details" /></tr></thead><tbody>
          {logs.map((log) => <tr key={log.id}><td><strong>{log.time}</strong><small>{log.id}</small></td><td><strong>{log.actor}</strong><small>{log.role || "Unknown"}</small></td><td><strong>{log.action}</strong><small>{log.target}</small></td><td>{log.module}</td><td><span className={severityClass(log.severity)}>{log.severity || "Info"}</span></td><td><span className={"audit-status audit-status-" + (log.status || "success").toLowerCase()}>{log.status || "Success"}</span></td><td><button type="button" className="audit-view-button" onClick={() => setSelected(log)} aria-label={"View " + log.id}><Eye size={15} /></button></td></tr>)}
          {!loading && !logs.length && <tr><td className="audit-empty" colSpan="7">No events match the selected filters.</td></tr>}
          {loading && <tr><td className="audit-empty" colSpan="7">Loading audit trail...</td></tr>}
        </tbody></table></div>
      </section>

      {selected && <div className="audit-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><section className="audit-detail-modal" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" onMouseDown={(event) => event.stopPropagation()}><button className="audit-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button><span className={severityClass(selected.severity)}>{selected.severity || "Info"} event</span><h2 id="audit-detail-title">{selected.action}</h2><p>{selected.details}</p><dl><div><dt>Event ID</dt><dd>{selected.id}</dd></div><div><dt>Timestamp</dt><dd>{selected.time}</dd></div><div><dt>Actor</dt><dd>{selected.actor} · {selected.role || "Unknown"}</dd></div><div><dt>Source</dt><dd>{selected.ip || "Unknown"} · {selected.device || "Unknown"}</dd></div><div><dt>Affected record</dt><dd>{selected.target}</dd></div><div><dt>Result</dt><dd>{selected.status || "Success"}</dd></div></dl><button type="button" className="cms-btn cms-btn-ghost" onClick={() => setSelected(null)}><FileDown size={14} /> Close details</button></section></div>}
  </main></DashboardLayout>;
}
