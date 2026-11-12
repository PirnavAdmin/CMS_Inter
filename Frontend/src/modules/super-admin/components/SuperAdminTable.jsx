import { useEffect, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { SkeletonRow } from "@/shared/components/Ui.jsx";
import SuperAdminPagination from "./SuperAdminPagination.jsx";
import "./SuperAdminTable.css";

export default function SuperAdminTable({
  title,
  columns,
  rows = [],
  action,
  toolbar,
  filterKey = "",
  searchPlaceholder = "Search records…",
  loading = false,
  error = "",
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  // Sort newly added records on top by default
  const sorted = [...rows].sort((a, b) => {
    const idA = Number(a.id || a.userId || a.paymentId || a.auditLogId || a.notificationId || 0);
    const idB = Number(b.id || b.userId || b.paymentId || b.auditLogId || b.notificationId || 0);
    if (idA && idB && idA !== idB) return idB - idA;
    return 0;
  });

  const filtered = sorted.filter((row) =>
    Object.values(row).some(
      (value) =>
        typeof value !== "object" &&
        String(value ?? "").toLowerCase().includes(search.trim().toLowerCase())
    )
  );

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;

  return (
    <section className="cms-card sa-table-card">
      <header className="sa-section-head">
        <h2>{title}</h2>
        {action}
      </header>

      <div className="cms-toolbar sa-table-toolbar">
        <label className="cms-search sa-search">
          <Search size={17} />
          <input
            type="search"
            aria-label={`Search ${title}`}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        {toolbar}
      </div>

      {error ? (
        <div className="sa-table-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }, (_, index) => (
                <SkeletonRow key={index} columns={columns.length} />
              ))
            ) : filtered.slice(start, start + pageSize).map((row) => (
              <tr key={row.id || row.userId || row.name}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : (row[column.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && !filtered.length ? (
              <tr>
                <td colSpan={columns.length} className="sa-empty">
                  <SearchX size={24} />
                  <strong>
                    {search || filterKey ? "No matching records" : "No records available"}
                  </strong>
                  <span>
                    {search || filterKey
                      ? "Try another search or adjust your filters."
                      : "Records will appear here when they are available."}
                  </span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <SuperAdminPagination
        currentPage={current}
        totalPages={pages}
        totalRecords={filtered.length}
        rowsPerPage={pageSize}
        onPageChange={setPage}
        onRowsPerPageChange={setPageSize}
        rowsOptions={[5, 10, 20]}
        unit="records"
      />
    </section>
  );
}

export function SuperAdminBadge({ value }) {
  const normalized = String(value || "").toLowerCase();
  const variant = /^(active|paid|premium|approved|enabled|success|renewed|read)$/.test(normalized)
    ? "active"
    : /^(pending|partial|expiring soon|unread|renewal|account limit)$/.test(normalized)
    ? "warn"
    : /^(suspended|failed|failure|due|expired|cancelled|system alerts)$/.test(normalized)
    ? "danger"
    : "inactive";
  return <span className={`cms-badge cms-badge-${variant}`}>{value}</span>;
}
