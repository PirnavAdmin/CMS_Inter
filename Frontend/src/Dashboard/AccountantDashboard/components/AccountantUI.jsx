import { AlertCircle, RefreshCw, Search } from "lucide-react";

export function FeeNotice({ children, error = false }) {
  return <div className={`cms-alert ${error ? "cms-alert-error" : ""}`} role={error ? "alert" : "status"}><AlertCircle size={16} /> {children}</div>;
}

export function FeeLoadState({ state }) {
  if (state.loading) return <div className="accountant-fee-loading" role="status"><RefreshCw size={16} /> Loading fee data...</div>;
  if (!state.error) return null;
  return <FeeNotice error>{state.error} <button type="button" className="cms-btn cms-btn-ghost cms-fee-mini-btn" onClick={state.reload}><RefreshCw size={14} /> Retry</button></FeeNotice>;
}

export function FeeCard({ title, subtitle, action, className = "", bodyClass = "", children }) {
  return <section className={`cms-card ${className}`}><header className="cms-card-head"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{action}</header><div className={`cms-card-body ${bodyClass}`}>{children}</div></section>;
}

export function FeeBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const tone = ["active", "paid", "success", "completed"].includes(key) ? "cms-badge-active"
    : key === "due" ? "cms-badge-info" : ["overdue", "failed"].includes(key) ? "cms-badge-danger"
      : ["due", "pending", "partial"].includes(key) ? "cms-badge-warn" : "cms-badge-inactive";
  return <span className={`cms-badge ${tone}`}>{status || "-"}</span>;
}

export function FeeTable({ rows, columns, className = "", empty = "No records available.", loading = false, error = "" }) {
  return <div className="cms-table-wrap"><table className={`cms-table cms-fee-table ${className}`}><thead><tr>{columns.map((column) => <th key={column.label} className={column.num ? "num" : ""}>{column.label}</th>)}</tr></thead><tbody>
    {loading ? Array.from({ length: 5 }, (_, index) => <tr key={index} aria-hidden="true">{columns.map((column) => <td key={column.label}><span className="accountant-fee-skeleton" /></td>)}</tr>)
      : error ? <tr><td colSpan={columns.length} className="cms-fee-empty-row" role="alert">{error}</td></tr>
        : rows.length ? rows.map((row, index) => <tr key={row.studentFeeId ?? row.feeTypeId ?? row.feeStructureId ?? row.id ?? index}>{columns.map((column) => <td key={column.label} className={column.num ? "num" : ""}>{column.value(row) ?? "-"}</td>)}</tr>)
          : <tr><td colSpan={columns.length} className="cms-fee-empty-row">{empty}</td></tr>}
  </tbody></table></div>;
}

export function FeePagination({ page, onPage }) {
  return <nav className="cms-fee-pagination" aria-label="Table pagination"><span className="cms-fee-pagination-info" aria-live="polite">Showing {page.start}-{page.end} of {page.total} records</span><div className="cms-fee-pagination-actions">
    <button type="button" className="cms-btn cms-btn-ghost cms-fee-mini-btn" disabled={page.current <= 1} onClick={() => onPage(page.current - 1)}>Previous</button>
    <span className="cms-btn cms-btn-primary cms-fee-mini-btn" aria-current="page" aria-label={`Page ${page.current} of ${page.pages}`}>{page.current}</span>
    <span className="accountant-fee-page-count">of {page.pages}</span>
    <button type="button" className="cms-btn cms-btn-ghost cms-fee-mini-btn" disabled={page.current >= page.pages} onClick={() => onPage(page.current + 1)}>Next</button>
  </div></nav>;
}

export function FeeSearch({ value, onChange, label = "Search fee records" }) {
  return <div className="cms-fee-search"><Search size={15} /><input aria-label={label} placeholder={label === "Search fee ledger" ? "Search by student name or admission number" : label} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

export function FeeFilter({ label, value, options, onChange }) {
  return <label className="cms-fee-filter"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}

export function FeeTabs({ items, value, onChange, label, secondary = false }) {
  return <nav className={`cms-fee-tabs ${secondary ? "cms-fee-subtabs" : ""}`} aria-label={label}>{items.map(([key, title]) => <button key={key} type="button" className={`cms-fee-tab ${key === value ? "is-active" : ""}`} aria-current={key === value ? "page" : undefined} onClick={() => onChange(key)}>{title}</button>)}</nav>;
}

export function PageState({ loading, error, onRetry }) {
  if (loading) return <div className="sp-api-state">Loading finance data...</div>;
  if (error) return <div className="sp-api-state is-error"><AlertCircle size={15} /> {error} {onRetry ? <button type="button" className="sp-btn" onClick={onRetry}><RefreshCw size={14} /> Retry</button> : null}</div>;
  return null;
}

