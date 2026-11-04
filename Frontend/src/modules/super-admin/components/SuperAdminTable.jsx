import { useEffect, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { Pagination, SkeletonRow } from "@/shared/components/Ui.jsx";
import "./SuperAdminTable.css";

export default function SuperAdminTable({ title, columns, rows, action, toolbar, filterKey = "", searchPlaceholder = "Search records…", loading = false, error = "" }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filterKey]);
  const filtered = rows.filter((row) => Object.values(row).some((value) => typeof value !== "object" && String(value ?? "").toLowerCase().includes(search.trim().toLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(page, pages);
  const start = (current - 1) * 5;
  return <section className="cms-card sa-table-card">
    <header className="sa-section-head"><h2>{title}</h2>{action}</header>
    <div className="cms-toolbar sa-table-toolbar"><label className="cms-search sa-search"><Search size={17}/><input type="search" aria-label={`Search ${title}`} placeholder={searchPlaceholder} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></label>{toolbar}</div>
    {error ? <div className="sa-table-error" role="alert">{error}</div> : null}
    <div className="cms-table-wrap"><table className="cms-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>
      {loading ? Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={columns.length}/>) : filtered.slice(start, start + 5).map((row) => <tr key={row.id || row.name}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}</tr>)}
      {!loading && !filtered.length ? <tr><td colSpan={columns.length} className="sa-empty"><SearchX size={24}/><strong>{search || filterKey ? "No matching records" : "No records available"}</strong><span>{search || filterKey ? "Try another search or adjust your filters." : "Records will appear here when they are available."}</span></td></tr> : null}
    </tbody></table></div>
    <Pagination currentPage={current} totalRecords={filtered.length} pageSize={5} onPageChange={setPage} className="sa-pagination"/>
  </section>;
}

export function SuperAdminBadge({ value }) {
  const normalized = String(value || "").toLowerCase();
  const variant = /^(active|paid|premium|approved|enabled|success|renewed|read)$/.test(normalized) ? "active" : /^(pending|partial|expiring soon|unread|renewal|account limit)$/.test(normalized) ? "warn" : /^(suspended|failed|failure|due|expired|cancelled|system alerts)$/.test(normalized) ? "danger" : "inactive";
  return <span className={`cms-badge cms-badge-${variant}`}>{value}</span>;
}
