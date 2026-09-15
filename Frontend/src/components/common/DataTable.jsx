import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Printer, FileSpreadsheet, FileText, ChevronDown, Download } from "lucide-react";
import Search3DIcon from "./Search3DIcon.jsx";
import { StatusBadge, Loader } from "./Ui.jsx";

const PAGE_SIZE = 5;

const textValue = (value) => {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const escapePrintHtml = (value) => textValue(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const safeFileName = (value) => String(value || "records")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "records";

export default function DataTable({
  columns = [],
  rows,
  data,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onPrint,
  onSearchChange,
  addLabel = "Add New",
  title,
  searchPlaceholder,
  toolbarExtra,
  emptyMessage,
  paginationCurrentOnly = false,
  enableExport = true,
  enablePdfExport = false,
  enableTablePrint = true,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);

  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const hasActions = useMemo(() => Boolean(onView || onPrint || onEdit || onDelete), [onView, onPrint, onEdit, onDelete]);
  const colCount = useMemo(() => safeColumns.length + (hasActions ? 1 : 0), [safeColumns.length, hasActions]);

  const effectiveRows = useMemo(() => {
    if (Array.isArray(rows)) return rows;
    if (Array.isArray(data)) return data;
    return [];
  }, [rows, data]);

  useEffect(() => {
    if (!onSearchChange) return undefined;
    const timer = setTimeout(() => onSearchChange(query), 300);
    return () => clearTimeout(timer);
  }, [onSearchChange, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (onSearchChange || !q) return effectiveRows;
    return effectiveRows.filter((r) =>
      r && typeof r === "object" && Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [effectiveRows, query, onSearchChange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const exportExcel = async () => {
    const exportColumns = safeColumns.filter((column) => column.exportable !== false);
    const exportData = filtered.map((row) => Object.fromEntries(
      exportColumns.map((column) => [column.label, textValue(row[column.key])]),
    ));
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
    XLSX.writeFile(workbook, `${safeFileName(title)}.xlsx`);
    setExportOpen(false);
  };

  const printRows = () => {
    setExportOpen(false);
    const printableColumns = safeColumns.filter((column) => column.printable !== false);
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) return;
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${escapePrintHtml(title || "Records")}</title><style>
      @page{size:auto;margin:0}html,body{margin:0;padding:0}body{font-family:"Segoe UI",Arial,sans-serif;color:#0f172a}
      .print-page{padding:12mm}h1{font-size:20px;margin:0 0 18px}
      table{width:100%;border-collapse:collapse}th,td{padding:9px 10px;border:1px solid #dbe3ea;text-align:left;font-size:12px}
      th{background:#f3f7f8;text-transform:uppercase;letter-spacing:.06em;font-size:10px}tr:nth-child(even) td{background:#fafcfc}
      @media print{h1{font-size:18px}}
    </style></head><body><main class="print-page"><h1>${escapePrintHtml(title || "Records")}</h1><table><thead><tr>${printableColumns.map((column) => `<th>${escapePrintHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${filtered.map((row) => `<tr>${printableColumns.map((column) => `<td>${escapePrintHtml(row[column.key])}</td>`).join("")}</tr>`).join("")}</tbody></table></main><script>window.addEventListener('load',()=>{document.title='${escapePrintHtml(title || "Records")}';window.focus();window.print();});</script></body></html>`);
    popup.document.close();
  };

  const exportPdf = async () => {
    const exportColumns = safeColumns.filter((column) => column.exportable !== false);
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const document = new jsPDF({
      orientation: exportColumns.length > 5 ? "landscape" : "portrait",
      unit: "pt",
      format: "a4",
    });
    const exportDate = new Date();
    document.setFontSize(16);
    document.text(title || "Records", 36, 38);
    document.setFontSize(9);
    document.setTextColor(88, 97, 84);
    document.text(`Exported ${exportDate.toLocaleString()}`, 36, 54);
    autoTable(document, {
      startY: 68,
      head: [exportColumns.map((column) => column.label)],
      body: filtered.map((row) => exportColumns.map((column) => textValue(row[column.key]))),
      styles: { fontSize: 8, cellPadding: 5, textColor: [28, 36, 22] },
      headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [247, 248, 239] },
      margin: { left: 28, right: 28 },
    });
    document.save(`${safeFileName(title)}-${exportDate.toISOString().slice(0, 10)}.pdf`);
    setExportOpen(false);
  };

  return (
    <div className="cms-card">
      <div className="cms-toolbar">
        <div className="cms-search">
          <Search3DIcon size={16} />
          <input
            value={query}
            placeholder={searchPlaceholder || `Search ${title || "records"}...`}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="cms-toolbar-right">
          {toolbarExtra}
          {enableExport ? (
            <div
              className="cms-export-control"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setExportOpen(false);
              }}
            >
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                onClick={() => setExportOpen((open) => !open)}
              >
                <Download size={15} /> Export <ChevronDown size={14} />
              </button>
              {exportOpen ? (
                <div className="cms-export-menu" role="menu">
                  <button type="button" role="menuitem" onClick={exportExcel}>
                    <FileSpreadsheet size={15} /> Export Excel
                  </button>
                  {enablePdfExport ? (
                    <button type="button" role="menuitem" onClick={exportPdf}>
                      <FileText size={15} /> Export PDF
                    </button>
                  ) : null}
                  {enableTablePrint ? (
                    <button type="button" role="menuitem" onClick={printRows}>
                      <Printer size={15} /> Print table
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {onAdd ? (
            <button className="cms-btn cms-btn-primary" onClick={onAdd}>
              <Plus size={16} /> {addLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              {safeColumns.map((c, i) => (
                <th key={c.key || c.label || i}>{c.label}</th>
              ))}
              {hasActions ? <th className="cms-actions-heading">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount}><Loader /></td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <div className="cms-empty">{emptyMessage || "No records found for your search."}</div>
                </td>
              </tr>
            ) : (
              pageRows.map((row, rIdx) => (
                <tr key={row?.id || row?.key || `row-${rIdx}`}>
                  {safeColumns.map((c, cIdx) => (
                    <td key={c.key || c.label || cIdx} className={c.strong ? "cms-strong" : ""}>
                      {c.badge ? (
                        <StatusBadge value={row?.[c.key]} />
                      ) : c.render ? (
                        (() => {
                          try {
                            return c.render(row || {}, rIdx);
                          } catch (err) {
                            console.warn("DataTable cell render failed:", err);
                            return String(row?.[c.key] ?? "—");
                          }
                        })()
                      ) : (
                        String(row?.[c.key] ?? "—")
                      )}
                    </td>
                  ))}
                  {hasActions ? (
                    <td>
                      <div className="cms-actions">
                        {onView ? (
                          <button className="cms-action-btn view" title="View" aria-label="View record" onClick={() => onView(row)}>
                            <Eye size={15} />
                          </button>
                        ) : null}
                        {onPrint ? (
                          <button className="cms-action-btn print" title="Print" aria-label="Print record" onClick={() => onPrint(row)}>
                            <Printer size={15} />
                          </button>
                        ) : null}
                        {onEdit ? (
                          <button className="cms-action-btn edit" title="Edit" aria-label="Edit record" onClick={() => onEdit(row)}>
                            <Pencil size={15} />
                          </button>
                        ) : null}
                        {onDelete ? (
                          <button className="cms-action-btn danger" title="Delete" aria-label="Delete record" onClick={() => onDelete(row)}>
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="cms-pagination">
        <span className="cms-page-info">
          Showing {filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1}-
          {Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length} records
        </span>
        <button className="cms-page-btn" disabled={current === 1} onClick={() => setPage(current - 1)}>
          Prev
        </button>
        {paginationCurrentOnly ? (
          <button className="cms-page-btn is-active" aria-current="page">
            {current}
          </button>
        ) : (
          Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`cms-page-btn ${current === i + 1 ? "is-active" : ""}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))
        )}
        <button className="cms-page-btn" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
