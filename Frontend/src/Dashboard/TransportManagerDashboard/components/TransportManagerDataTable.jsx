import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import TransportManagerEmptyState from "./TransportManagerEmptyState.jsx";
import TransportManagerSkeleton from "./TransportManagerSkeleton.jsx";

export default function TransportManagerDataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = "No records found",
  emptySubtitle = "There are no entries to display matching the current criteria.",
  searchable = true,
  searchPlaceholder = "Search records...",
  searchKeys = [],
  pageSize = 10,
  rowKey = (row, index) => row.id || index,
  onRowClick,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((row) => {
      if (searchKeys.length > 0) {
        return searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(term));
      }
      return Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchKeys]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="tm-data-table-container">
      {searchable && (
        <div className="tm-data-table__toolbar">
          <div className="tm-data-table__search">
            <Search size={16} className="tm-data-table__search-icon" />
            <input
              type="text"
              className="tm-data-table__search-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="tm-data-table__counts">
            Showing {filteredData.length} {filteredData.length === 1 ? "record" : "records"}
          </div>
        </div>
      )}

      <div className="tm-data-table__wrapper">
        <table className="tm-data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.className || ""}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "2rem" }}>
                  <TransportManagerSkeleton rows={4} />
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "2rem" }}>
                  <TransportManagerEmptyState title={emptyTitle} subtitle={emptySubtitle} />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? "tm-data-table__row--clickable" : ""}
                >
                  {columns.map((col, colIdx) => (
                    <td key={col.key || colIdx} className={col.cellClassName || ""}>
                      {col.render ? col.render(row, index) : row[col.key] ?? "--"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && !loading && (
        <div className="tm-data-table__pagination">
          <span className="tm-data-table__page-info">
            Page {currentPage} of {totalPages}
          </span>
          <div className="tm-data-table__page-actions">
            <button
              type="button"
              className="tm-btn tm-btn--secondary tm-btn--sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              type="button"
              className="tm-btn tm-btn--secondary tm-btn--sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
