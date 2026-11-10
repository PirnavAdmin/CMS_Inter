import React from "react";
import "./SuperAdminPagination.css";

export default function SuperAdminPagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  rowsPerPage = 5,
  onPageChange,
  onRowsPerPageChange,
  rowsOptions = [5, 10, 20, 50],
  unit = "records",
  className = "",
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startRecord = totalRecords > 0 ? (safeCurrentPage - 1) * rowsPerPage + 1 : 0;
  const endRecord = totalRecords > 0 ? Math.min(safeCurrentPage * rowsPerPage, totalRecords) : 0;

  return (
    <footer className={`sa-pagination-container ${className}`}>
      <div className="sa-pagination-info-left">
        {totalRecords > 0 ? (
          <span>
            Showing <strong>{startRecord}-{endRecord}</strong> of{" "}
            <strong>{totalRecords}</strong> {unit}
          </span>
        ) : (
          <span>Showing 0 of 0 {unit}</span>
        )}
      </div>

      <div className="sa-pagination-controls-right">
        {onRowsPerPageChange && (
          <div className="sa-pagination-rows-wrap">
            <label htmlFor="sa-rows-select" className="sa-pagination-rows-label">
              Rows per page:
            </label>
            <select
              id="sa-rows-select"
              value={rowsPerPage}
              onChange={(e) => {
                onRowsPerPageChange(Number(e.target.value));
                if (onPageChange) onPageChange(1);
              }}
              className="sa-pagination-rows-select"
            >
              {rowsOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sa-pagination-buttons-group">
          <button
            type="button"
            className="sa-pagination-btn"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange && onPageChange(safeCurrentPage - 1)}
            aria-label="Previous Page"
          >
            Previous
          </button>

          <span className="sa-pagination-page-indicator">
            Page {safeCurrentPage} of {safeTotalPages}
          </span>

          <button
            type="button"
            className="sa-pagination-btn"
            disabled={safeCurrentPage >= safeTotalPages}
            onClick={() => onPageChange && onPageChange(safeCurrentPage + 1)}
            aria-label="Next Page"
          >
            Next
          </button>
        </div>
      </div>
    </footer>
  );
}

