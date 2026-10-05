import { useMemo, useState } from "react";
import { ArrowLeft, Download, Eye, FileDown, Filter, Search, ShieldAlert, ShieldCheck, UserCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import "./AuditLogsPage.css";

const MOCK_AUDIT_LOGS = [
  { id: "AUD-20261005-001", time: "05 Oct 2026, 10:23 AM", actor: "Anitha Rao", role: "Administrator", action: "Updated salary structure", module: "Payroll", target: "English Faculty Structure", severity: "Info", status: "Success", ip: "103.81.24.19", device: "Chrome · Windows", details: "Updated HRA from ₹6,000 to ₹6,500 and published the structure." },
  { id: "AUD-20261005-002", time: "05 Oct 2026, 10:17 AM", actor: "P. Sreenivas", role: "Accounts Officer", action: "Exported fee collection report", module: "Reports", target: "Fee Collection · Sep 2026", severity: "Info", status: "Success", ip: "103.81.24.31", device: "Edge · Windows", details: "Downloaded the collection report in Excel format." },
  { id: "AUD-20261005-003", time: "05 Oct 2026, 10:04 AM", actor: "System", role: "Security", action: "Blocked login attempt", module: "Authentication", target: "admin@college.edu", severity: "Warning", status: "Blocked", ip: "185.220.101.7", device: "Unknown device", details: "Five unsuccessful password attempts triggered temporary account protection." },
  { id: "AUD-20261005-004", time: "05 Oct 2026, 09:51 AM", actor: "Lakshmi Devi", role: "HOD", action: "Approved leave request", module: "Leave Management", target: "MNT0030 · Peneti Rajesh", severity: "Info", status: "Success", ip: "103.81.24.42", device: "Chrome · Android", details: "Approved casual leave for 07 Oct 2026." },
  { id: "AUD-20261005-005", time: "05 Oct 2026, 09:38 AM", actor: "Ravi Kumar", role: "Administrator", action: "Changed role permissions", module: "Roles & Permissions", target: "Bus Driver", severity: "Critical", status: "Success", ip: "103.81.24.19", device: "Chrome · Windows", details: "Granted access to Driver Dashboard, Trips, GPS, and Student Attendance." },
  { id: "AUD-20261005-006", time: "05 Oct 2026, 09:20 AM", actor: "System", role: "Scheduler", action: "Generated daily attendance summary", module: "Attendance", target: "Main Campus", severity: "Info", status: "Success", ip: "Internal", device: "Automated job", details: "Created the daily student and staff attendance summary." },
  { id: "AUD-20261005-007", time: "05 Oct 2026, 09:05 AM", actor: "Meera Shah", role: "Admission Officer", action: "Modified student record", module: "Students", target: "STU-2026-0142 · Aditi Sharma", severity: "Warning", status: "Success", ip: "103.81.24.37", device: "Chrome · Windows", details: "Updated guardian mobile number and residential address." },
  { id: "AUD-20261005-008", time: "05 Oct 2026, 08:42 AM", actor: "System", role: "Security", action: "Password reset completed", module: "Authentication", target: "MNT0030 · Peneti Rajesh", severity: "Info", status: "Success", ip: "103.81.24.58", device: "Chrome · Android", details: "Temporary password was replaced during first login." },
];

const severityClass = (value) => `audit-severity audit-severity-${value.toLowerCase()}`;

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("All modules");
  const [severity, setSeverity] = useState("All severity");
  const [selected, setSelected] = useState(null);

  const logs = useMemo(() => MOCK_AUDIT_LOGS.filter((log) => {
    const text = `${log.id} ${log.actor} ${log.action} ${log.module} ${log.target}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) &&
      (module === "All modules" || log.module === module) &&
      (severity === "All severity" || log.severity === severity);
  }), [query, module, severity]);

  const exportCsv = () => {
    const rows = [["Log ID", "Timestamp", "Actor", "Role", "Action", "Module", "Target", "Severity", "Status", "IP Address"]]
      .concat(logs.map((log) => [log.id, log.time, log.actor, log.role, log.action, log.module, log.target, log.severity, log.status, log.ip]));
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "audit-logs-preview.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const stats = [
    { label: "Events today", value: MOCK_AUDIT_LOGS.length, icon: ShieldCheck, tone: "green" },
    { label: "Security alerts", value: MOCK_AUDIT_LOGS.filter((log) => log.severity !== "Info").length, icon: ShieldAlert, tone: "amber" },
    { label: "Active administrators", value: 4, icon: UserCheck, tone: "blue" },
  ];

  return <DashboardLayout title="Audit Logs" subtitle="Review system activity, security events, and administrative changes." breadcrumb={["Home", "Settings", "Audit Logs"]}>
    <main className="audit-logs-page">
      <div className="audit-page-actions">
        <button type="button" className="cms-back-link audit-back" onClick={() => navigate("/dashboard/settings")}><ArrowLeft size={14} /> Back to Settings</button>
        <button type="button" className="cms-btn cms-btn-primary" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      <section className="audit-stat-grid">
        {stats.map(({ label, value, icon: Icon, tone }) => <article className={`audit-stat audit-stat-${tone}`} key={label}><Icon size={18} /><div><span>{label}</span><strong>{value}</strong></div></article>)}
      </section>

      <section className="audit-log-panel">
        <div className="audit-panel-head"><div><h2>Activity trail</h2><p>Mock preview data · records include actor, source, result, and affected entity.</p></div><span>{logs.length} events</span></div>
        <div className="audit-filters">
          <label className="audit-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity, user, record, or ID..." /></label>
          <label><Filter size={14} /><select value={module} onChange={(event) => setModule(event.target.value)}><option>All modules</option>{[...new Set(MOCK_AUDIT_LOGS.map((log) => log.module))].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>All severity</option><option>Info</option><option>Warning</option><option>Critical</option></select></label>
        </div>
        <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Activity</th><th>Module</th><th>Severity</th><th>Result</th><th aria-label="View details" /></tr></thead><tbody>
          {logs.map((log) => <tr key={log.id}><td><strong>{log.time}</strong><small>{log.id}</small></td><td><strong>{log.actor}</strong><small>{log.role}</small></td><td><strong>{log.action}</strong><small>{log.target}</small></td><td>{log.module}</td><td><span className={severityClass(log.severity)}>{log.severity}</span></td><td><span className={`audit-status audit-status-${log.status.toLowerCase()}`}>{log.status}</span></td><td><button type="button" className="audit-view-button" onClick={() => setSelected(log)} aria-label={`View ${log.id}`}><Eye size={15} /></button></td></tr>)}
          {!logs.length && <tr><td className="audit-empty" colSpan="7">No events match the selected filters.</td></tr>}
        </tbody></table></div>
      </section>

      {selected && <div className="audit-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><section className="audit-detail-modal" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" onMouseDown={(event) => event.stopPropagation()}><button className="audit-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button><span className={severityClass(selected.severity)}>{selected.severity} event</span><h2 id="audit-detail-title">{selected.action}</h2><p>{selected.details}</p><dl><div><dt>Event ID</dt><dd>{selected.id}</dd></div><div><dt>Timestamp</dt><dd>{selected.time}</dd></div><div><dt>Actor</dt><dd>{selected.actor} · {selected.role}</dd></div><div><dt>Source</dt><dd>{selected.ip} · {selected.device}</dd></div><div><dt>Affected record</dt><dd>{selected.target}</dd></div><div><dt>Result</dt><dd>{selected.status}</dd></div></dl><button type="button" className="cms-btn cms-btn-ghost" onClick={() => setSelected(null)}><FileDown size={14} /> Close details</button></section></div>}
  </main></DashboardLayout>;
}
