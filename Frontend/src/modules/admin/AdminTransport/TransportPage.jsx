import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bus,
  Calendar,
  CalendarClock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  FileText,
  MapPin,
  Phone,
  PieChart,
  Plus,
  Printer,
  RefreshCw,
  Route,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { ConfirmDialog, FormModal, Modal, SkeletonTable, StatusBadge, Toast } from "@/shared/components/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import apiEndpoints from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { getAllTransportPages, scopeTransportRecords, scopeTransportReport, transportValue } from "./transportContext.js";
import { normalizeDriver } from "@/modules/transport-manager/data/transportManagerModel.js";
import "./TransportPage.css";

const sectionTabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "setup", label: "Setup", icon: Route },
  { id: "operations", label: "Operations", icon: Bus },
  { id: "reports", label: "Reports", icon: Download },
];

const setupTabs = [
  { id: "routes", label: "Route Management" },
  { id: "pickupPoints", label: "Pickup Points" },
  { id: "vehicles", label: "Vehicle Management" },
  { id: "drivers", label: "Driver Management" },
  { id: "attendants", label: "Bus Attendants" },
];

const operationTabs = [
  { id: "vehicleAssignments", label: "Vehicle Assignment" },
  { id: "studentAssignments", label: "Student Transport" },
  { id: "trips", label: "Vehicle Trips" },
  { id: "gps", label: "GPS Tracking" },
  { id: "maintenance", label: "Maintenance" },
];

const reportTabs = [
  { id: "transport-dashboard-report", label: "Transport Dashboard" },
  { id: "trip-reports", label: "Trip Reports" },
  { id: "vehicle-reports", label: "Vehicle Reports" },
  { id: "driver-reports", label: "Driver Reports" },
  { id: "route-reports", label: "Route Reports" },
  { id: "student-transport-reports", label: "Student Transport Reports" },
  { id: "pickup-wise-reports", label: "Pickup-wise Reports" },
  { id: "seat-occupancy-reports", label: "Seat Occupancy" },
  { id: "maintenance-reports", label: "Maintenance Reports" },
  { id: "monthly-cost-reports", label: "Monthly Cost" },
];

const reportDefinitions = {
  "transport-dashboard-report": { endpoint: apiEndpoints.transport.reports.dashboard, type: "dashboard", filename: "transport-dashboard" },
  "trip-reports": { endpoint: apiEndpoints.transport.reports.trips, type: "trips", filename: "transport-trips" },
  "vehicle-reports": { endpoint: apiEndpoints.transport.reports.vehicles, type: "vehicles", filename: "transport-vehicles" },
  "driver-reports": { endpoint: apiEndpoints.transport.reports.drivers, type: "drivers", filename: "transport-drivers" },
  "route-reports": { endpoint: apiEndpoints.transport.reports.routes, type: "routes", filename: "transport-routes" },
  "student-transport-reports": { endpoint: apiEndpoints.transport.reports.students, type: "students", filename: "transport-students" },
  "pickup-wise-reports": { endpoint: apiEndpoints.transport.reports.pickupWise, type: "pickup-wise", filename: "transport-pickup-wise" },
  "seat-occupancy-reports": { endpoint: apiEndpoints.transport.reports.seatOccupancy, type: "seat-occupancy", filename: "transport-seat-occupancy" },
  "maintenance-reports": { endpoint: apiEndpoints.transport.reports.maintenance, type: "maintenance", filename: "transport-maintenance" },
  "monthly-cost-reports": { endpoint: apiEndpoints.transport.reports.monthlyCost, type: "monthly-cost", filename: "transport-monthly-cost" },
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const TABLE_PAGE_SIZE = 5;
const today = new Date();
today.setHours(0, 0, 0, 0);

function formatCurrency(value) {
  return currency.format(Number(value) || 0);
}

function daysUntil(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 9999;
  return Math.ceil((date - today) / 86400000);
}

function textMatch(row, query) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(q));
}

function makeId(prefix, rows) {
  return `${prefix}-${String(rows.length + 1).padStart(3, "0")}`;
}

function getStudentTransportAssignmentId(record = {}) {
  const id = record.studentTransportAssignmentId
    ?? record.StudentTransportAssignmentId
    ?? record.studentAssignmentId
    ?? record.StudentAssignmentId
    ?? record.assignmentId
    ?? record.AssignmentId
    ?? record.id
    ?? record.Id;

  return id === undefined || id === null || String(id).trim() === "" ? null : id;
}

function getColumnValue(row, column) {
  let value = typeof column.value === "function" ? column.value(row) : row[column.key];
  if (column.currency) value = formatCurrency(value);
  if (value && typeof value === "object" && value.props) value = value.props.children;
  if (Array.isArray(value)) value = value.map((item) => item?.props?.children ?? item).join(" ");
  return value == null ? "" : String(value);
}

function exportRows(filename, rows, columns) {
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = columns.map((column) => quote(column.label)).join(",");
  const body = rows.map((row) =>
    columns
      .map((column) => quote(getColumnValue(row, column)))
      .join(","),
  );
  const blob = new Blob(["\ufeff", [header, ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportTablePdf(filename, report) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;
  const document = new jsPDF({ orientation: report.columns.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.text("Pirnav College", pageWidth / 2, 38, { align: "center" });
  document.setFontSize(13);
  document.text("Transport Management", pageWidth / 2, 58, { align: "center" });
  document.setFont("helvetica", "normal");
  document.setFontSize(11);
  document.text(`Current Section: ${report.section} / ${report.subsection}`, 40, 82);
  const filterText = report.filters.map(({ label, value }) => `${label}: ${value}`).filter(Boolean).join("  |  ");
  if (filterText) document.text(filterText, 40, 99, { maxWidth: pageWidth - 80 });
  const searchText = report.query.trim() ? `Search: ${report.query.trim()}` : "";
  if (searchText) document.text(searchText, 40, filterText ? 116 : 99, { maxWidth: pageWidth - 80 });
  const startY = filterText && searchText ? 132 : filterText || searchText ? 116 : 100;
  const body = report.rows.length
    ? report.rows.map((row) => report.columns.map((column) => getColumnValue(row, column)))
    : [["No records found."]];
  autoTable(document, {
    startY,
    head: [report.rows.length ? report.columns.map((column) => column.label) : ["Records"]],
    body,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5, lineColor: [210, 216, 196], lineWidth: 0.5, textColor: [35, 42, 30] },
    headStyles: { fillColor: [241, 244, 228], textColor: [44, 54, 31], fontStyle: "bold" },
    margin: { left: 40, right: 40 },
  });
  const pageCount = document.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setFontSize(8);
    document.text(`Matching records: ${report.rows.length}  |  Screen page: ${report.page} of ${report.totalPages}`, 40, document.internal.pageSize.getHeight() - 20);
  }
  document.save(filename);
}

function reportColumnsFromRows(rows, fallback) {
  if (!rows.length) return fallback;
  const keys = Object.keys(rows[0]).filter((key) => {
    const value = rows[0][key];
    return value == null || ["string", "number", "boolean"].includes(typeof value);
  });
  if (!keys.length) return fallback;
  return keys.map((key) => ({
    key,
    label: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
  }));
}

function TransportTabs({ tabs, active, onChange, compact = false }) {
  return (
    <div className={`cms-transport-tabs ${compact ? "is-compact" : ""}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button key={tab.id} type="button" className={`cms-transport-tab ${active === tab.id ? "is-active" : ""}`} onClick={() => onChange(tab.id)}>
            {Icon ? <Icon size={15} /> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = "blue" }) {
  return (
    <div className={`cms-transport-stat tone-${tone}`}>
      <span className="cms-transport-stat-icon">{Icon ? <Icon size={20} /> : null}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        {hint ? <em>{hint}</em> : null}
      </span>
    </div>
  );
}

function Toolbar({ query, onQuery, filters, onAdd, onExport, onPdfExport, onPrint, addLabel = "Add Record", className = "" }) {
  return (
    <div className={`cms-transport-toolbar ${className}`.trim()}>
      <label className="cms-transport-search">
        <Search size={16} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search transport records..." />
      </label>
      {filters ? <div className="cms-transport-filters">{filters}</div> : null}
      <div className="cms-transport-toolbar-actions">
        {onPrint ? (
          <button type="button" className="cms-btn cms-btn-ghost" title="Print report" onClick={onPrint}>
            <Printer size={16} /> Print
          </button>
        ) : null}
        {onPdfExport ? (
          <button type="button" className="cms-btn cms-btn-ghost" title="Export report to PDF" onClick={onPdfExport}>
            <Download size={16} /> Export PDF
          </button>
        ) : null}
        {onExport ? (
          <button type="button" className="cms-btn cms-btn-ghost" title="Export to CSV" onClick={onExport}>
            <Download size={16} /> Export CSV
          </button>
        ) : null}
        {onAdd ? (
          <button type="button" className="cms-btn cms-btn-primary" onClick={onAdd}>
            <Plus size={16} /> {addLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TableSection({
  title,
  subtitle,
  rows,
  columns,
  query,
  onQuery,
  filters,
  filterValues = {},
  onFilterChange,
  rowFilter,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onPrint,
  onExport,
  onPdfExport,
  addLabel,
  toolbarClassName,
  tableClassName,
  printSection = "Transport",
  printSubsection,
  exportFilename,
}) {
  const [page, setPage] = useState(1);
  const hasRowActions = Boolean(onView || onEdit || onDelete);
  const filterKey = JSON.stringify(filterValues);
  const visibleRows = rows.filter((row) => textMatch(row, query)).filter((row) => (rowFilter ? rowFilter(row) : true));
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = visibleRows.slice((currentPage - 1) * TABLE_PAGE_SIZE, currentPage * TABLE_PAGE_SIZE);
  const outputContext = {
    title,
    subtitle,
    section: printSection,
    subsection: printSubsection || title,
    rows: visibleRows,
    columns,
    query,
    filters: (filters || []).map((filter) => {
      const selectedValue = filterValues[filter.name] || (filter.type === "date" ? "" : "All");
      const selectedOption = filter.options?.find((option) => String(typeof option === "object" ? option.value : option) === String(selectedValue));
      const label = selectedOption && typeof selectedOption === "object" ? selectedOption.label : selectedOption ?? selectedValue;
      return { label: filter.label, value: label };
    }),
    page: currentPage,
    totalPages,
  };

  useEffect(() => {
    setPage(1);
  }, [query, filterKey, rows.length]);

  useEffect(() => {
    setPage((value) => Math.min(value, totalPages));
  }, [totalPages]);

  const filterControls = filters?.length ? filters.map((filter) => (
    <label key={filter.name} className="cms-transport-filter">
      <span>{filter.label}</span>
      {filter.type === "date" ? (
        <input
          type="date"
          value={filterValues[filter.name] || ""}
          onChange={(event) => onFilterChange?.(filter.name, event.target.value)}
        />
      ) : (
        <select
          value={filterValues[filter.name] || "All"}
          onChange={(event) => onFilterChange?.(filter.name, event.target.value)}
        >
          {filter.options.map((option, optionIndex) => {
            const normalized = option && typeof option === "object" ? option : { value: option, label: option };
            return <option key={`${normalized.value}-${optionIndex}`} value={normalized.value}>{normalized.label}</option>;
          })}
        </select>
      )}
    </label>
  )) : null;

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="cms-card-body">
        <Toolbar
          query={query}
          onQuery={onQuery}
          filters={filterControls}
          addLabel={addLabel}
          onAdd={onAdd}
          onExport={onExport || (() => exportRows(exportFilename || `transport-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`, visibleRows, columns))}
          onPrint={onPrint ? () => onPrint(outputContext) : () => window.print()}
          onPdfExport={onPdfExport ? () => onPdfExport(outputContext) : undefined}
          className={toolbarClassName}
        />
        <div className="cms-table-wrap">
          <table className={`cms-table cms-transport-table ${hasRowActions ? "has-actions" : ""} ${tableClassName || ""}`.trim()}>
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                {hasRowActions ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length ? paginatedRows.map((row, rowIndex) => (
                <tr key={`${row.id ?? "transport-row"}-${(currentPage - 1) * TABLE_PAGE_SIZE + rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.strong ? "cms-strong" : ""}>
                      {column.badge ? <StatusBadge value={row[column.key]} /> : column.currency ? formatCurrency(row[column.key]) : column.value ? column.value(row) : row[column.key]}
                    </td>
                  ))}
                  {hasRowActions ? <td>
                    <div className="cms-transport-actions">
                      {onView ? <button type="button" className="cms-action-btn" title="View details" onClick={() => onView(row)}><Eye size={15} /></button> : null}
                      {onEdit ? <button type="button" className="cms-action-btn" title="Edit" onClick={() => onEdit(row)}><Edit3 size={15} /></button> : null}
                      {onDelete ? <button type="button" className="cms-action-btn danger" title="Delete" onClick={() => onDelete(row)}><Trash2 size={15} /></button> : null}
                    </div>
                  </td> : null}
                </tr>
              )) : (
                <tr>
                  <td colSpan={columns.length + (hasRowActions ? 1 : 0)} className="cms-transport-empty">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visibleRows.length ? (
          <div className="cms-transport-pagination">
            <span>Page {currentPage} of {totalPages} - {visibleRows.length} record{visibleRows.length === 1 ? "" : "s"}</span>
            <div>
              <button type="button" className="cms-btn cms-btn-ghost" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
              <button type="button" className="cms-btn cms-btn-ghost" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AddPickupPointsModal({ routes, pickupPoints, isSaving, onCancel, onSave }) {
  const nextKey = useRef(1);
  const [routeId, setRouteId] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [savedPoints, setSavedPoints] = useState([]);
  const [error, setError] = useState("");
  const blankPoint = () => ({ key: nextKey.current++, pickupName: "", distanceKm: "", monthlyFee: "", pickupTime: "", dropTime: "", status: "Active" });
  const [points, setPoints] = useState(() => [blankPoint()]);
  const routeHistory = pickupPoints.filter((point) => routeId && String(point.routeId) === String(routeId));
  const history = [...routeHistory, ...savedPoints].sort((a, b) => Number(a.sequenceNumber) - Number(b.sequenceNumber));
  const firstSequence = Math.max(0, ...routeHistory.map((point) => Number(point.sequenceNumber) || 0)) + 1;
  const updatePoint = (key, name, value) => setPoints((current) => current.map((point) => point.key === key ? { ...point, [name]: value } : point));
  const submit = (event) => {
    event.preventDefault();
    if (isSaving || !points.length) return;
    const names = points.map((point) => point.pickupName.trim().toLowerCase());
    if (names.some((name) => !name) || new Set(names).size !== names.length) {
      setError("Enter a unique pickup point name for each stop.");
      return;
    }
    setError("");
    onSave({
      pickupRows: points.map((point, index) => ({ ...point, pickupName: point.pickupName.trim(), routeId, sequenceNumber: firstSequence + savedCount + index })),
      onPickupSaved: (key) => {
        const index = points.findIndex((point) => point.key === key);
        if (index >= 0) setSavedPoints((current) => [...current, { ...points[index], sequenceNumber: firstSequence + savedCount + index }]);
        setPoints((current) => current.filter((point) => point.key !== key));
        setSavedCount((count) => count + 1);
      },
    });
  };
  return (
    <Modal title="Add Pickup Points" className="cms-transport-form-modal cms-transport-multi-pickup-modal" onClose={() => { if (!isSaving) onCancel(savedCount > 0); }}>
      <form onSubmit={submit}>
        <fieldset disabled={isSaving} className="transport-pickup-fieldset">
          <label className="transport-pickup-label" htmlFor="transport-pickup-route">Select Route <span>*</span></label>
          <select id="transport-pickup-route" required value={routeId} disabled={savedCount > 0} onChange={(event) => setRouteId(event.target.value)}>
            <option value="">Select Route</option>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.routeName}{route.routeCode ? ` (${route.routeCode})` : ""}</option>)}
          </select>
          {routeId && (
            <section className="transport-pickup-history" aria-label="Pickup point history">
              <h4>Pickup Point History</h4>
              {history.length ? (
                <ol>
                  {history.map((point) => (
                    <li key={point.id ?? `saved-${point.key}`}>
                      <span className="transport-pickup-history-sequence">#{point.sequenceNumber}</span>
                      <div>
                        <strong>{point.pickupName}</strong>
                        <p>{point.distanceKm} km <span> · Pickup: {point.pickupTime || "--"} · Drop: {point.dropTime || "--"}</span></p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p>No pickup points added to this route yet.</p>}
            </section>
          )}
          <p className="transport-pickup-section-label">Pickup Points, Distances &amp; Timings <span>*</span></p>
          {error && <p role="alert" className="transport-pickup-error">{error}</p>}
          {savedCount > 0 && <p role="status">{savedCount} pickup point(s) saved. Only the remaining points will be submitted.</p>}
          <div className="transport-pickup-list">
            {points.map((point, index) => (
              <section className="transport-pickup-entry" key={point.key}>
                <div className="transport-pickup-entry-head">
                  <label className="transport-pickup-label" htmlFor={`pickup-name-${point.key}`}>Pickup Point Name #{firstSequence + savedCount + index} <span>*</span></label>
                  {points.length > 1 && <button type="button" className="cms-action-btn" aria-label={`Remove pickup point ${index + 1}`} onClick={() => setPoints((current) => current.filter((item) => item.key !== point.key))}><Trash2 size={15} /></button>}
                </div>
                <input id={`pickup-name-${point.key}`} required value={point.pickupName} placeholder="Enter pickup point name..." onChange={(event) => updatePoint(point.key, "pickupName", event.target.value)} />
                <div className="transport-pickup-entry-grid">
                  {[
                    { name: "distanceKm", label: "Distance (KM)", type: "number", required: true, placeholder: "e.g. 5.0" },
                    { name: "pickupTime", label: "Morning Pickup", type: "time" },
                    { name: "dropTime", label: "Evening Drop", type: "time" },
                    { name: "monthlyFee", label: "Monthly Fare", type: "number", required: true, placeholder: "e.g. 1500" },
                  ].map((field) => <div key={field.name}>
                    <label className="transport-pickup-label" htmlFor={`${field.name}-${point.key}`}>{field.label} {field.required && <span>*</span>}</label>
                    <input id={`${field.name}-${point.key}`} type={field.type} required={field.required} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? "any" : undefined} placeholder={field.placeholder} value={point[field.name]} onChange={(event) => updatePoint(point.key, field.name, event.target.value)} />
                  </div>)}
                  <div>
                    <label className="transport-pickup-label" htmlFor={`pickup-status-${point.key}`}>Status <span>*</span></label>
                    <select id={`pickup-status-${point.key}`} required value={point.status} onChange={(event) => updatePoint(point.key, "status", event.target.value)}><option>Active</option><option>Inactive</option></select>
                  </div>
                </div>
              </section>
            ))}
          </div>
          <button type="button" className="transport-pickup-add-field" onClick={() => setPoints((current) => [...current, blankPoint()])}><Plus size={16} /> Add Pickup Point Field</button>
        </fieldset>
        <div className="transport-pickup-footer">
          <button type="button" className="cms-btn cms-btn-ghost" disabled={isSaving} onClick={() => onCancel(savedCount > 0)}>Cancel</button>
          <button type="submit" className="cms-btn cms-btn-primary" disabled={isSaving || !points.length}>{isSaving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function AddAttendantModal({ staff, isSaving, onCancel, onSave }) {
  const [values, setValues] = useState({ staffId: "", employeeId: "", attendantName: "", mobileNumber: "", gender: "", status: "Active" });
  const [error, setError] = useState("");
  const selectStaff = (staffId) => {
    const selected = staff.find((item) => String(item.id) === String(staffId));
    setError("");
    setValues((current) => ({
      ...current,
      staffId,
      employeeId: selected?.employeeId || "",
      attendantName: selected?.name || "",
      mobileNumber: selected?.mobileNumber || "",
      gender: selected?.gender || "",
    }));
  };
  const submit = async () => {
    if (!values.staffId || !values.employeeId || !values.attendantName || !values.mobileNumber || !values.gender) {
      setError("Select a non-teaching staff member before saving.");
      return;
    }
    await onSave(values);
  };

  return (
    <Modal
      title="Add Bus Attendant"
      className="cms-transport-add-attendant-modal"
      onClose={isSaving ? () => {} : onCancel}
      footer={<><button type="button" className="cms-btn cms-btn-ghost" disabled={isSaving} onClick={onCancel}>Cancel</button><button type="button" className="cms-btn cms-btn-primary" disabled={isSaving} onClick={submit}>{isSaving ? <span className="cms-transport-action-loading"><i aria-hidden="true" />Adding...</span> : "Save"}</button></>}
    >
      <div className="cms-form-grid cols-3">
        <label className="cms-field full">
          <span>Select Non-Teaching Staff <span className="required-star">*</span></span>
          <select value={values.staffId} disabled={isSaving} onChange={(event) => selectStaff(event.target.value)}>
            <option value="">Select Non-Teaching Staff</option>
            {staff.map((member, memberIndex) => <option key={`${member.id}-${memberIndex}`} value={member.id}>{member.name} ({member.employeeId})</option>)}
          </select>
        </label>
        <label className="cms-field"><span>Employee ID <span className="required-star">*</span></span><input value={values.employeeId} readOnly /></label>
        <label className="cms-field"><span>Attendant Name <span className="required-star">*</span></span><input value={values.attendantName} readOnly /></label>
        <label className="cms-field"><span>Mobile Number <span className="required-star">*</span></span><input value={values.mobileNumber} readOnly /></label>
        <label className="cms-field"><span>Gender <span className="required-star">*</span></span><input value={values.gender} readOnly /></label>
        <label className="cms-field"><span>Status</span><select value={values.status} disabled={isSaving} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}><option value="Active">Active</option><option value="On Leave">On Leave</option><option value="Inactive">Inactive</option></select></label>
        {error ? <p className="cms-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="cms-transport-info-grid">
      {items.map((item) => (
        <span key={item.label}>
          <small>{item.label}</small>
          <strong>{item.value || "-"}</strong>
        </span>
      ))}
    </div>
  );
}

function TransportDetailTable({ row }) {
  return (
    <dl className="cms-transport-detail-table">
      {Object.entries(row).map(([key, value]) => {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
        const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "-");
        return (
          <div key={key} className="cms-transport-detail-row">
            <dt>{label}</dt>
            <dd>{key.toLowerCase() === "status" ? <StatusBadge value={displayValue} /> : displayValue}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function extractList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const listKeys = [
    "items", "Items", "records", "Records", "results", "Results", "trips", "vehicles",
    "drivers", "routes", "students", "pickupPoints", "assignments", "maintenance",
  ];
  for (const key of listKeys) {
    if (Array.isArray(data[key])) return data[key];
  }
  if (Array.isArray(data.data)) return data.data;
  if (data.data && typeof data.data === "object") {
    for (const key of listKeys) {
      if (Array.isArray(data.data[key])) return data.data[key];
    }
  }
  return [];
}

const staffRoleValues = (staff) => {
  const personal = staff?.personal && typeof staff.personal === "object" ? staff.personal : {};
  const department = staff?.departmentSpecific && typeof staff.departmentSpecific === "object"
    ? staff.departmentSpecific
    : (() => { try { return JSON.parse(staff?.departmentSpecificJson || "{}"); } catch { return {}; } })();
  const custom = staff?.customFields && typeof staff.customFields === "object"
    ? staff.customFields
    : (() => { try { return JSON.parse(staff?.customFieldsJson || "{}"); } catch { return {}; } })();
  return [
    staff?.role, staff?.roleName, staff?.roleCode, staff?.designation, staff?.designationName,
    staff?.designationCode, staff?.transportRole, personal.role, personal.roleName,
    personal.designation, personal.designationName, department.role, department.roleName,
    department.designation, department.designationName, custom.role, custom.roleName,
    custom.designation, custom.designationName,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
};

const isTransportStaffActive = (staff) => {
  const value = transportValue(staff, "status", "isActive", "active");
  return value == null || value === true || value === 1 || ["active", "true", "1"].includes(String(value).toLowerCase());
};
const isTransportAttendantStaff = (staff) => isTransportStaffActive(staff)
  && staffRoleValues(staff).some((value) => /\battendant\b/i.test(value));
const isDriverStaffRecord = (staff) => {
  const explicitFlag = [staff?.isDriver, staff?.driver]
    .some((value) => value === true || value === 1 || String(value).toLowerCase() === "true");
  return isTransportStaffActive(staff) && (explicitFlag || staffRoleValues(staff).some((value) => /\bdriver\b/i.test(value)));
};

function ReportTabsNavigation({ tabs, active, onChange }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const element = scrollRef.current;
    if (!element) return;
    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    setCanScrollLeft(element.scrollLeft > 2);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 2);
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    const activeTab = element?.querySelector(`[data-report-tab="${active}"]`);
    if (!element || !activeTab) return;

    const left = activeTab.offsetLeft;
    const right = left + activeTab.offsetWidth;
    if (left < element.scrollLeft) {
      element.scrollTo({ left: left - 8, behavior: "smooth" });
    } else if (right > element.scrollLeft + element.clientWidth) {
      element.scrollTo({ left: right - element.clientWidth + 8, behavior: "smooth" });
    }
    window.setTimeout(updateScrollState, 350);
  }, [active]);

  const scrollTabs = (direction) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(220, element.clientWidth * 0.7), behavior: "smooth" });
  };

  const handleWheel = (event) => {
    const element = scrollRef.current;
    if (!element || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const canMove = (event.deltaY < 0 && element.scrollLeft > 0)
      || (event.deltaY > 0 && element.scrollLeft < maxScrollLeft);
    if (!canMove) return;
    event.preventDefault();
    element.scrollLeft += event.deltaY;
  };

  return (
    <nav className="cms-transport-report-tabs-nav" aria-label="Transport report sections">
      <button
        type="button"
        className={`cms-transport-report-tabs-arrow is-left ${canScrollLeft ? "" : "is-hidden"}`}
        title="Scroll report tabs left"
        aria-label="Scroll report tabs left"
        disabled={!canScrollLeft}
        onClick={() => scrollTabs(-1)}
      >
        <ChevronLeft size={17} />
      </button>
      <div ref={scrollRef} className="cms-transport-report-tabs-scroll" onScroll={updateScrollState} onWheel={handleWheel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-report-tab={tab.id}
            className={`cms-transport-tab ${active === tab.id ? "is-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`cms-transport-report-tabs-arrow is-right ${canScrollRight ? "" : "is-hidden"}`}
        title="Scroll report tabs right"
        aria-label="Scroll report tabs right"
        disabled={!canScrollRight}
        onClick={() => scrollTabs(1)}
      >
        <ChevronRight size={17} />
      </button>
    </nav>
  );
}

function unwrapReportPayload(payload) {
  let value = payload;
  for (let depth = 0; depth < 3; depth += 1) {
    const nested = value?.data ?? value?.Data ?? value?.result ?? value?.Result;
    if (!nested || nested === value) break;
    value = nested;
  }
  return value;
}

function reportRowsFromPayload(payload) {
  const value = unwrapReportPayload(payload);
  const knownRows = extractList(value);
  if (knownRows.length || Array.isArray(value)) return knownRows;
  if (!value || typeof value !== "object") return [];

  const nestedRows = Object.values(value).find(Array.isArray);
  if (nestedRows) return nestedRows;

  return Object.entries(value)
    .filter(([key, item]) => !["success", "message", "statusCode", "timestamp"].includes(key) && (item == null || ["string", "number", "boolean"].includes(typeof item)))
    .map(([key, item]) => ({
      id: `report-metric-${key}`,
      name: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
      value: item ?? "-",
    }));
}

function normalizeMaintenanceStatus(item) {
  const completionFlag = item?.statusBool
    ?? item?.StatusBool
    ?? item?.isCompleted
    ?? item?.IsCompleted;
  if (completionFlag !== undefined && completionFlag !== null) {
    return completionFlag === true || completionFlag === 1 || String(completionFlag).toLowerCase() === "true"
      ? "Completed"
      : "Scheduled";
  }

  const status = item?.status ?? item?.Status;
  if (typeof status === "boolean" || status === 0 || status === 1 || /^(true|false)$/i.test(String(status))) {
    return status === true || status === 1 || String(status).toLowerCase() === "true" ? "Completed" : "Scheduled";
  }
  return status || "Scheduled";
}

function readDepartmentSpecific(staff) {
  if (staff?.departmentSpecific && typeof staff.departmentSpecific === "object") return staff.departmentSpecific;
  try {
    const value = JSON.parse(staff?.departmentSpecificJson || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function readCustomFields(staff) {
  if (staff?.customFields && typeof staff.customFields === "object") return staff.customFields;
  try {
    const value = JSON.parse(staff?.customFieldsJson || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function toTimeInputValue(value) {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minutes > 59) return "";

  if (period === "AM" && hours === 12) hours = 0;
  if (period === "PM" && hours < 12) hours += 12;
  if (hours > 23) return "";

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function assertTransportDeleteSucceeded(response) {
  const payload = response?.data;
  const message = String(payload?.message || payload?.Message || "").trim();
  const hasBackendFailureMessage = /\b(error|exception|failed|not found)\b/i.test(message);
  if (payload?.success === false || payload?.Success === false || Number(payload?.statusCode || payload?.StatusCode) >= 400 || hasBackendFailureMessage) {
    throw new Error(message || "The transport record could not be deleted.");
  }
}

export default function TransportPage() {
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const { selectedCampusId } = useCampusContext();
  const [params, setParams] = useSearchParams();
  const [remembered, setRemembered] = useState({ setup: "routes", operations: "vehicleAssignments", report: "transport-dashboard-report" });
  const section = sectionTabs.some((tab) => tab.id === params.get("tab")) ? params.get("tab") : "dashboard";
  const validSection = (tabs, fallback) => tabs.some((tab) => tab.id === params.get("section")) ? params.get("section") : fallback;
  const navigation = { section,
    setup: section === "setup" ? validSection(setupTabs, "routes") : remembered.setup,
    operations: section === "operations" ? validSection(operationTabs, "vehicleAssignments") : remembered.operations,
    report: section === "reports" ? validSection(reportTabs, "transport-dashboard-report") : remembered.report,
  };
  const pendingNavigation = useRef(null);
  const onNavigate = (key, value) => {
    const pending = pendingNavigation.current;
    const next = pending || new URLSearchParams(params);
    if (key === "action") {
      next.set("action", value.action); next.set("entity", value.entity);
      for (const [name, id] of Object.entries({ campusId: selectedCampusId, boardId: selectedBoardId, yearId: selectedAcademicYearId })) if (id) next.set(name, String(id));
      if (value.id != null && value.id !== "") next.set("id", String(value.id)); else next.delete("id");
    } else if (key === "closeAction") {
      ["action", "entity", "id"].forEach((name) => next.delete(name));
    } else {
      ["action", "entity", "id"].forEach((name) => next.delete(name));
      if (key === "section") {
        if (value === "dashboard") { next.delete("tab"); next.delete("section"); }
        else { next.set("tab", value); next.set("section", value === "setup" ? navigation.setup : value === "operations" ? navigation.operations : navigation.report); }
      } else {
        setRemembered((current) => ({ ...current, [key]: value }));
        next.set("tab", key === "report" ? "reports" : key); next.set("section", value);
      }
    }
    pendingNavigation.current = next;
    if (!pending) queueMicrotask(() => {
      const target = pendingNavigation.current; pendingNavigation.current = null;
      if (target && target.toString() !== params.toString()) setParams(target);
    });
  };
  return <TransportContextPage key={`${selectedCampusId || ''}:${selectedBoardId || ''}:${selectedAcademicYearId || ''}`} navigation={navigation} onNavigate={onNavigate} />;
}

function TransportContextPage({ navigation, onNavigate }) {
  const { selectedBoardId, selectedAcademicYearId, selectedAcademicYear } = useAcademicContext();
  const { selectedCampusId } = useCampusContext();
  const [actionParams] = useSearchParams();
  const actionQuery = actionParams.toString();
  const latestActionQuery = useRef(actionQuery);
  latestActionQuery.current = actionQuery;
  const restoredAction = useRef("");
  const actionLoaders = useRef({});
  const [recordsReady, setRecordsReady] = useState(false);
  const [restoringAction, setRestoringAction] = useState(false);
  const routeAction = (action, entity, row) => {
    if (action === "add" && entity === "attendants") {
      showToast("Attendants are managed in Staff Management. Assign them to routes using Vehicle Assignment.", "info");
      return;
    }
    const id = row ? (entity === "studentAssignments" ? getStudentTransportAssignmentId(row) : row.id) : null;
    if (row && (id == null || String(id).trim() === "")) { showErrorToast("The record has no stable identifier. Refresh the list and retry."); return; }
    onNavigate("action", { action, entity, id });
  };
  const closeAction = () => onNavigate("closeAction");
  const alive = useRef(true);
  const loadRequest = useRef({ id: 0, controller: null });
  const scopedRecords = useRef(null);
  const refreshRef = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; loadRequest.current.controller?.abort(); };
  }, []);
  const activeSection = navigation.section;
  const setActiveSection = (value) => onNavigate('section', value);
  const activeSetupTab = navigation.setup;
  const setActiveSetupTab = (value) => onNavigate('setup', value);
  const activeOperationTab = navigation.operations;
  const setActiveOperationTab = (value) => onNavigate('operations', value);
  const activeReportTab = navigation.report;
  const setActiveReportTab = (value) => onNavigate('report', value);
  const [query, setQuery] = useState("");
  const [tripFilters, setTripFilters] = useState({ route: "All" });
  const [setupFilters, setSetupFilters] = useState({
    routes: "All",
    pickupPoints: "All",
    vehicles: "All",
    drivers: "All",
    attendants: "All",
  });
  const [reportFilters, setReportFilters] = useState({ route: "All", vehicle: "All", status: "All" });
  const [toast, setToast] = useState({ message: "", type: "success" });
  const lastErrorToastRef = useRef({ message: "", time: 0 });
  const [formConfig, setFormConfigState] = useState(null);
  const setFormConfig = (value) => {
    if (latestActionQuery.current !== actionQuery) return;
    setFormConfigState(value);
    if (!value) closeAction();
  };
  const [isAddAttendantOpen, setIsAddAttendantOpenState] = useState(false);
  const setIsAddAttendantOpen = (open) => {
    if (open) routeAction("add", "attendants");
    else { setIsAddAttendantOpenState(false); closeAction(); }
  };
  const [detailConfig, setDetailConfigState] = useState(null);
  const setDetailConfig = (value) => {
    if (latestActionQuery.current !== actionQuery) return;
    setDetailConfigState(value);
    if (!value) closeAction();
  };
  const [deleteConfig, setDeleteConfigState] = useState(null);
  const setDeleteConfig = (value) => {
    if (latestActionQuery.current !== actionQuery) return;
    setDeleteConfigState(value);
    if (!value) closeAction();
  };
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverLoadError, setDriverLoadError] = useState("");
  const [driverStaffRecords, setDriverStaffRecords] = useState({});
  const [nonTeachingStaff, setNonTeachingStaff] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [vehicleAssignments, setVehicleAssignments] = useState([]);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripSearchQuery, setTripSearchQuery] = useState("");
  const [tripRouteFilter, setTripRouteFilter] = useState("All");
  const [selectedTripModal, setSelectedTripModal] = useState(null);
  const [tripModalTab, setTripModalTab] = useState("overview");
  const [tripStudentSearch, setTripStudentSearch] = useState("");
  const [maintenance, setMaintenance] = useState([]);
  const [gpsSnapshots, setGpsSnapshots] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [reportApiRows, setReportApiRows] = useState({});
  const [reportLoading, setReportLoading] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);
  const preparePrint = (report) => {
    setPrintPayload(report);
    window.setTimeout(() => window.print(), 80);
  };
  const clearPrintPayload = () => setPrintPayload(null);
  useEffect(() => {
    window.addEventListener("afterprint", clearPrintPayload);
    return () => window.removeEventListener("afterprint", clearPrintPayload);
  }, []);
  const showErrorToast = useCallback((message) => {
    const normalizedMessage = String(message || "An unexpected server error occurred.");
    const now = Date.now();
    if (lastErrorToastRef.current.message === normalizedMessage && now - lastErrorToastRef.current.time < 3000) return;
    lastErrorToastRef.current = { message: normalizedMessage, time: now };
    showToast(normalizedMessage, "error");
  }, [showToast]);

  const fetchTransportData = async () => {
    if (!alive.current) return;
    setIsLoading(true);
    if (!alive.current || !Number(selectedCampusId)) { setIsLoading(false); return; }
    loadRequest.current.controller?.abort();
    const request = { id: loadRequest.current.id + 1, controller: new AbortController() };
    loadRequest.current = request;
    const signal = request.controller.signal;
    const current = () => alive.current && loadRequest.current.id === request.id && !signal.aborted;
    const campusParams = { CampusId: Number(selectedCampusId) };
    const scoped = (items) => Array.isArray(items) ? items : [];
    try {
      const driverStaffParams = {
        CampusId: Number(selectedCampusId),
        Department: "Transport",
        Designation: "Driver",
        isDriver: true,
        PageSize: 100,
      };
      const driverParams = {
        CampusId: Number(selectedCampusId),
        boardId: Number(selectedBoardId) || undefined,
        academicYearId: Number(selectedAcademicYearId) || undefined,
        PageSize: 100,
      };
      if (import.meta.env.DEV) {
        console.log("Transport Driver Staff API Request:", { url: apiEndpoints.faculty.list, params: driverStaffParams });
      }
      const [
        routesRes,
        pickupsRes,
        pickupLookupsRes,
        vehiclesRes,
        staffRes,
        driversRes,
        attendantsRes,
        assignmentsRes,
        tripsRes,
        gpsRes,
        maintenanceRes,
        studentRes,
        dashboardRes,
        studentsRes,
      ] = await Promise.allSettled([
        getAllTransportPages(apiClient, apiEndpoints.transport.routes, campusParams, signal),
        getAllTransportPages(apiClient, apiEndpoints.transport.pickupPoints, campusParams, signal),
        Promise.resolve({ data: [] }), // Global lookup is not campus scoped; use scoped pickup records instead.
        getAllTransportPages(apiClient, apiEndpoints.transport.vehicles, campusParams, signal),
        getAllTransportPages(apiClient, apiEndpoints.faculty.list, driverStaffParams, signal),
        getAllTransportPages(apiClient, apiEndpoints.transport.drivers, driverParams, signal),
        getAllTransportPages(apiClient, apiEndpoints.transport.attendants, {}, signal),
        getAllTransportPages(apiClient, apiEndpoints.transport.vehicleAssignments, {}, signal),
        apiClient.get(apiEndpoints.transport.trips, { signal }),
        apiClient.get(apiEndpoints.transport.gps, { signal }),
        getAllTransportPages(apiClient, apiEndpoints.transport.maintenance, {}, signal),
        getAllTransportPages(apiClient, apiEndpoints.transport.studentAssignments, {}, signal),
        Promise.resolve({ data: null }), // Dashboard controller has no scope contract; derive counts below.
        Promise.resolve({ data: [] }), // Student transport relies strictly on student-assignments API without redundant bulk queries.
      ]);

      if (!current()) return;
      const driverResult = driversRes.status === "fulfilled" ? driversRes.value : null;
      const rawDriverItems = driverResult?.data ? extractList(driverResult.data) : [];
      const reportedDriverTotal = driverResult?.reportedTotal ?? driverResult?.data?.totalCount ?? 0;
      if (reportedDriverTotal > 0 && rawDriverItems.length === 0) {
        setDriverLoadError(
          `Data inconsistency: The driver API reported ${reportedDriverTotal} total record(s), but returned 0 items. Please verify database synchronization.`
        );
      } else if (driversRes.status === "rejected") {
        setDriverLoadError(getApiErrorMessage(driversRes.reason));
      } else {
        setDriverLoadError("");
      }
      const resultRows = (result) => result.status === 'fulfilled' ? extractList(result.value.data) : [];
      const records = scopeTransportRecords({
        routes: resultRows(routesRes), pickups: resultRows(pickupsRes), vehicles: resultRows(vehiclesRes),
        staff: resultRows(staffRes), drivers: resultRows(driversRes), attendants: resultRows(attendantsRes),
        assignments: resultRows(assignmentsRes), trips: resultRows(tripsRes), gps: resultRows(gpsRes),
        maintenance: resultRows(maintenanceRes), studentAssignments: resultRows(studentRes), students: resultRows(studentsRes),
      }, { campusId: selectedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId });
      // Resolve a student's vehicle through the existing assignment relation where the DTO omits VehicleId.
      records.studentAssignments = records.studentAssignments.map((row) => ({ ...row,
        vehicleId: row.vehicleId ?? records.assignments.find((assignment) => String(assignment.assignmentId ?? assignment.id) === String(row.vehicleAssignmentId))?.vehicleId,
      }));
      scopedRecords.current = records;
      [[routesRes, 'routes'], [pickupsRes, 'pickups'], [vehiclesRes, 'vehicles'], [staffRes, 'staff'],
       [driversRes, 'drivers'], [attendantsRes, 'attendants'], [assignmentsRes, 'assignments'], [tripsRes, 'trips'],
       [gpsRes, 'gps'], [maintenanceRes, 'maintenance'], [studentRes, 'studentAssignments']].forEach(([result, key]) => {
        if (result.status === 'fulfilled') result.value = { ...result.value, data: records[key] };
      });
      setRoutes([]); setPickupPoints([]); setVehicles([]); setDrivers([]); setDriverStaffRecords({}); setNonTeachingStaff([]);
      setAttendants([]); setVehicleAssignments([]); setStudentAssignments([]); setTrips([]); setMaintenance([]); setGpsSnapshots([]); setDashboardMetrics(null);

      const failedRequests = [
        routesRes, pickupsRes, pickupLookupsRes, vehiclesRes, staffRes, driversRes, attendantsRes,
        assignmentsRes, tripsRes, gpsRes, maintenanceRes, studentRes, dashboardRes, studentsRes,
      ].filter((result) => result.status === "rejected");
      if (failedRequests.length) {
        const reason = getApiErrorMessage(failedRequests[0].reason) || "Unable to refresh transport data.";
        showErrorToast(`${reason} Unavailable records are not included.`);
      } else {
        const incompleteRequest = [
          routesRes, pickupsRes, vehiclesRes, staffRes, driversRes, attendantsRes,
          assignmentsRes, maintenanceRes, studentRes, studentsRes,
        ].find((result) => result.status === "fulfilled" && result.value?.paginationIncomplete);
        if (incompleteRequest) {
          showErrorToast(`Transport data is partially loaded (${incompleteRequest.value.data.length} of ${incompleteRequest.value.reportedTotal} reported records). The backend returned an empty page.`);
        }
      }

      if (import.meta.env.DEV) {
        if (staffRes.status === "fulfilled") {
          console.log("Transport Driver Staff API Response:", staffRes.value?.data);
          console.log("Transport Driver Staff API Response Status:", staffRes.value?.status);
        } else {
          console.error("Transport Driver Staff API Error:", {
            url: driverListUrl,
            method: "GET",
            status: staffRes.reason?.response?.status,
            response: staffRes.reason?.response?.data,
            error: staffRes.reason,
          });
        }

        if (attendantsRes.status === "fulfilled") {
          console.log("Transport Bus Attendants Master API Response:", attendantsRes.value?.data);
          console.log("Transport Bus Attendants Master API Response Status:", attendantsRes.value?.status);
        } else {
          console.error("Transport Bus Attendants Master API Error:", {
            url: apiEndpoints.transport.attendants,
            method: "GET",
            status: attendantsRes.reason?.response?.status,
            response: attendantsRes.reason?.response?.data,
            error: attendantsRes.reason,
          });
        }
      }

      if (driversRes.status === "fulfilled" || staffRes.status === "fulfilled") {
        const staffItems = staffRes.status === "fulfilled" ? scoped(extractList(staffRes.value.data)) : [];
        const driverStaff = staffItems.filter(isDriverStaffRecord);
        const staffByIdMap = new Map();
        const staffByEmpMap = new Map();
        driverStaff.forEach((s) => {
          if (s.id != null) staffByIdMap.set(String(s.id), s);
          if (s.staffId != null) staffByIdMap.set(String(s.staffId), s);
          if (s.employeeId) staffByEmpMap.set(String(s.employeeId).toUpperCase(), s);
        });
        setDriverStaffRecords(Object.fromEntries(driverStaff.map((staff) => [
          transportValue(staff, "staffId", "id", "facultyId"), staff,
        ]).filter(([id]) => id != null && String(id).trim())));

        // Staff Management is the source of eligible driver staff. Keep any
        // linked transport profile as the operational record, and show staff
        // drivers without a transport profile as staff-sourced rows.
        const canonicalDrivers = driversRes.status === "fulfilled" ? scoped(extractList(driversRes.value.data)) : [];
        const transportDrivers = canonicalDrivers.map((driver) => {
          const rawDriverId = driver.driverId ?? driver.transportDriverId ?? (driver.staffId ? null : driver.id);
          const transportDriverId = rawDriverId != null ? Number(rawDriverId) : Number(driver.id);
          const staffId = driver.staffId != null ? Number(driver.staffId) : null;
          const empId = driver.employeeId ? String(driver.employeeId).toUpperCase() : "";
          const linkedStaff = (staffId != null && staffByIdMap.get(String(staffId))) ||
                              (empId && staffByEmpMap.get(empId)) || null;

          return {
            ...normalizeDriver(driver),
            ...driver,
            id: transportDriverId > 0 ? transportDriverId : (driver.driverId || driver.id),
            driverId: transportDriverId > 0 ? transportDriverId : (driver.driverId || driver.id),
            transportDriverId: transportDriverId > 0 ? transportDriverId : (driver.driverId || driver.id),
            staffId: staffId ?? (linkedStaff?.id ? Number(linkedStaff.id) : null),
            driverName: driver.driverName || (linkedStaff ? `${linkedStaff.firstName || ""} ${linkedStaff.lastName || ""}`.trim() : ""),
            employeeId: driver.employeeId || linkedStaff?.employeeId || "",
            mobileNumber: driver.mobileNumber || linkedStaff?.mobile || "",
            alternateMobileNumber: driver.alternateMobileNumber || linkedStaff?.alternateMobile || "",
            email: driver.email || linkedStaff?.email || "",
            licenseNumber: driver.licenseNumber || linkedStaff?.drivingLicenseNumber || "",
            licenseExpiryDate: driver.licenseExpiryDate || linkedStaff?.drivingLicenseExpiryDate || "",
            address: driver.address || linkedStaff?.currentAddress || "",
            experienceYears: Number(driver.experienceYears ?? driver.experience ?? linkedStaff?.drivingExperienceYears ?? 5),
            status: [true, 1, "Active"].includes(driver.status) ? "Active" : "Inactive",
          };
        }).filter((driver) => Number(driver.driverId) > 0);
        const linkedStaffIds = new Set(transportDrivers.map((driver) => String(driver.staffId ?? "")).filter(Boolean));
        const linkedEmployeeIds = new Set(transportDrivers.map((driver) => String(driver.employeeId || "").trim().toLowerCase()).filter(Boolean));
        const staffDriverRows = driverStaff
          .filter((staff) => !linkedStaffIds.has(String(transportValue(staff, "staffId", "id", "facultyId")))
            && !linkedEmployeeIds.has(String(transportValue(staff, "employeeId", "empId") || "").trim().toLowerCase()))
          .map((staff) => {
            const staffId = transportValue(staff, "staffId", "id", "facultyId");
            return {
              id: staffId,
              staffId,
              source: "staff",
              transportDriverId: null,
              driverName: transportValue(staff, "fullName", "staffName", "name")
                || [transportValue(staff, "firstName"), transportValue(staff, "middleName"), transportValue(staff, "lastName")].filter(Boolean).join(" "),
              employeeId: transportValue(staff, "employeeId", "empId") || "",
              mobileNumber: transportValue(staff, "mobile", "mobileNumber", "phone") || "",
              email: transportValue(staff, "email") || "",
              licenseNumber: transportValue(staff, "drivingLicenseNumber", "licenceNumber", "licenseNumber") || "",
              licenseExpiryDate: String(transportValue(staff, "drivingLicenseExpiryDate", "licenceExpiry", "licenseExpiryDate") || "").split("T")[0],
              address: transportValue(staff, "currentAddress", "address") || "",
              experienceYears: Number(transportValue(staff, "drivingExperienceYears", "experienceYears", "experience") || 0),
              status: "Active",
            };
          });
        setDrivers([...transportDrivers, ...staffDriverRows]);
      }

      if (routesRes.status === "fulfilled" && routesRes.value?.data) {
        const items = scoped(extractList(routesRes.value.data));
        setRoutes(
          items.map((r) => ({
            id: r.routeId || r.id,
            createdAt: r.createdAt ?? r.CreatedAt ?? r.createdOn ?? r.CreatedOn ?? r.createdDate ?? r.CreatedDate,
            routeCode: r.routeCode || "",
            routeName: r.routeName || "",
            routeStart: r.startLocation || r.routeStart || "",
            routeEnd: r.endLocation || r.routeEnd || "",
            totalDistanceKm: Number(r.distanceKm ?? r.DistanceKm ?? r.totalDistanceKm ?? r.distance ?? 0),
            estimatedTimeMinutes: Number(r.estimatedDurationMinutes || r.estimatedTimeMinutes || 30),
            minDistanceKm: Number(r.minRangeKm || r.minDistanceKm || 5),
            minBaseFare: Number(r.nonAcBaseFare || r.defaultMonthlyFee || r.minBaseFare || 1000),
            ratePerKm: Number(r.nonAcRatePerKm || r.ratePerKm || 100),
            acMinBaseFare: Number(r.acBaseFare || r.acMinBaseFare || 1200),
            acRatePerKm: Number(r.acRatePerKm || 150),
            description: r.description || "",
            status: [r.status, r.isActive, r.active].some((value) => value === "Active" || value === true || value === 1) ? "Active" : "Inactive",
          }))
        );
      }

      if ((pickupsRes.status === "fulfilled" && pickupsRes.value?.data) || (pickupLookupsRes.status === "fulfilled" && pickupLookupsRes.value?.data)) {
        const detailedItems = pickupsRes.status === "fulfilled" ? scoped(extractList(pickupsRes.value.data)) : [];
        const detailedIds = new Set(detailedItems.map((point) => String(point.pickupPointId || point.id)));
        const lookupItems = pickupLookupsRes.status === "fulfilled"
          ? extractList(pickupLookupsRes.value.data).filter((point) => !detailedIds.has(String(point.pickupPointId || point.id)))
          : [];
        // Lookup-only entries contain labels but can omit route and timing details.
        const items = await Promise.all([...detailedItems, ...lookupItems].map(async (point) => {
          const id = point.pickupPointId ?? point.PickupPointId ?? point.id;
          if (id == null || ((point.routeId ?? point.RouteId) != null
            && (point.pickupTime ?? point.PickupTime ?? point.morningPickupTime ?? point.MorningPickupTime) != null
            && (point.dropTime ?? point.DropTime ?? point.eveningDropTime ?? point.EveningDropTime) != null)) return point;
          try {
            const response = await apiClient.get(apiEndpoints.transport.pickupPointById(id), { signal });
            const payload = response.data?.data ?? response.data ?? {};
            return { ...point, ...(payload.pickupPoint ?? payload.PickupPoint ?? payload) };
          } catch {
            return point;
          }
        }));
        if (!current()) return;
        const routeItems = routesRes.status === "fulfilled" ? scoped(extractList(routesRes.value.data)) : routes;
        setPickupPoints(
          items.map((p) => ({
            id: p.pickupPointId ?? p.PickupPointId ?? p.id,
            createdAt: p.createdAt ?? p.CreatedAt ?? p.createdOn ?? p.CreatedOn ?? p.createdDate ?? p.CreatedDate,
            routeId: p.routeId ?? p.RouteId ?? "",
            routeName: p.routeName || p.RouteName || routeItems.find((route) => String(route.routeId ?? route.RouteId ?? route.id) === String(p.routeId ?? p.RouteId))?.routeName || "-",
            pickupName: p.pickupPointName || p.stopName || p.pickupName || "",
            landmark: p.landmark || p.stopAddress || "",
            sequenceNumber: p.sequenceNo ?? p.SequenceNo ?? p.sequenceNumber ?? p.SequenceNumber ?? p.stopOrder ?? 1,
            pickupTime: toTimeInputValue(p.pickupTime ?? p.PickupTime ?? p.morningPickupTime ?? p.MorningPickupTime),
            dropTime: toTimeInputValue(p.dropTime ?? p.DropTime ?? p.eveningDropTime ?? p.EveningDropTime),
            distanceKm: Number(p.distanceFromStart ?? p.DistanceFromStart ?? p.distanceFromSchool ?? p.DistanceFromSchool ?? p.distanceKm ?? 0),
            monthlyFee: Number(p.monthlyFee || 0),
            status: p.status == null || p.status === true || p.status === 1 || p.status === "Active" ? "Active" : "Inactive",
          }))
        );
      }

      if (vehiclesRes.status === "fulfilled" && vehiclesRes.value?.data) {
        const items = scoped(extractList(vehiclesRes.value.data));
        setVehicles(
          items.map((v) => ({
            id: v.vehicleId || v.id,
            vehicleNumber: v.vehicleNumber || "",
            registrationNumber: v.registrationNumber || v.vehicleRegistrationNo || "",
            vehicleType: v.vehicleType || "Bus",
            capacity: Number(v.capacity || 40),
            isAC: Boolean(v.isAC),
            gpsDeviceId: v.gpsDeviceId || "",
            chassisNumber: v.chassisNumber || "",
            engineNumber: v.engineNumber || "",
            insuranceExpiry: v.insuranceExpiry ? String(v.insuranceExpiry).split("T")[0] : "",
            pollutionExpiry: v.pollutionExpiry ? String(v.pollutionExpiry).split("T")[0] : "",
            fitnessExpiry: v.fitnessExpiry ? String(v.fitnessExpiry).split("T")[0] : "",
            status: v.status || "Active",
          }))
        );
      }

      if (staffRes.status === "fulfilled" && staffRes.value?.data) {
        const items = scoped(extractList(staffRes.value.data));
        const attendantStaff = items.filter(isTransportAttendantStaff);
        setNonTeachingStaff(
          attendantStaff
            .map((staff) => ({
              id: transportValue(staff, "staffId", "id", "facultyId"),
              name: transportValue(staff, "fullName", "staffName")
                || [transportValue(staff, "firstName"), transportValue(staff, "middleName"), transportValue(staff, "lastName")].filter(Boolean).join(" "),
              employeeId: transportValue(staff, "employeeId", "empId") || "",
              mobileNumber: transportValue(staff, "mobile", "mobileNumber", "phone") || "",
              gender: transportValue(staff, "gender") || "",
            })),
        );
      }



      if (attendantsRes.status === "fulfilled" || staffRes.status === "fulfilled") {
        const staffItems = staffRes.status === "fulfilled" ? scoped(extractList(staffRes.value.data)) : [];
        const staffMap = new Map();
        staffItems.forEach((s) => {
          const sId = transportValue(s, "staffId", "id", "facultyId");
          const eId = String(transportValue(s, "employeeId", "empId") || "").trim().toLowerCase();
          if (sId) staffMap.set(String(sId), s);
          if (eId) staffMap.set(eId, s);
        });
        const backendAttendants = attendantsRes.status === "fulfilled" ? scoped(extractList(attendantsRes.value.data)) : [];
        const attendantStaff = staffItems.filter(isTransportAttendantStaff);

        const attendantMap = new Map();
        backendAttendants.forEach((a) => {
          const sId = transportValue(a, "staffId");
          const eId = String(transportValue(a, "employeeId", "attendantCode") || "").trim().toLowerCase();
          const linked = (sId && staffMap.get(String(sId))) || (eId && staffMap.get(eId));
          const key = String(sId || eId || a.attendantId || a.id);
          attendantMap.set(key, {
            id: a.attendantId || a.id,
            staffId: a.staffId || linked?.staffId || linked?.id,
            attendantName: a.attendantName || a.attendantFullName || linked?.fullName || linked?.staffName || a.fullName || a.name || "",
            employeeId: a.employeeId || a.attendantCode || linked?.employeeId || "",
            mobileNumber: a.mobileNumber || a.phone || linked?.mobile || linked?.mobileNumber || "",
            gender: a.gender || linked?.gender || "Female",
            branch: a.branchName || a.branch || linked?.branch || "Main Campus",
            status: a.status === true || a.status === 1 || a.status === "Active" ? "Active" : "Inactive",
          });
        });

        attendantStaff.forEach((staff) => {
          const sId = transportValue(staff, "staffId", "id", "facultyId");
          const eId = String(transportValue(staff, "employeeId", "empId") || "").trim().toLowerCase();
          const key = String(sId || eId);
          if (!attendantMap.has(key)) {
            const name = transportValue(staff, "fullName", "staffName", "name")
              || [transportValue(staff, "firstName"), transportValue(staff, "middleName"), transportValue(staff, "lastName")].filter(Boolean).join(" ");
            attendantMap.set(key, {
              id: sId,
              staffId: sId,
              attendantName: name,
              employeeId: transportValue(staff, "employeeId", "empId") || "",
              mobileNumber: transportValue(staff, "mobile", "mobileNumber", "phone") || "",
              gender: transportValue(staff, "gender") || "Female",
              branch: transportValue(staff, "branchName", "branch", "campusName") || "Main Campus",
              status: [staff.status, staff.isActive].includes("Inactive") ? "Inactive" : "Active",
            });
          }
        });

        setAttendants(Array.from(attendantMap.values()));
      }

      if (assignmentsRes.status === "fulfilled" && assignmentsRes.value?.data) {
        const items = scoped(extractList(assignmentsRes.value.data));
        setVehicleAssignments(
          items.map((va) => ({
            id: va.assignmentId || va.id,
            routeId: va.routeId ?? va.RouteId ?? va.route?.routeId,
            routeName: va.routeName || va.RouteName || va.route?.routeName || (typeof va.route === "string" ? va.route : ""),
            vehicleId: va.vehicleId ?? va.VehicleId ?? va.vehicle?.vehicleId,
            vehicleNumber: va.vehicleNumber || va.VehicleNumber || va.busNumber || va.vehicle?.vehicleNumber || "",
            driverId: transportValue(va, "driverId", "driverStaffId", "staffId")
              ?? transportValue(va.driver, "driverId", "staffId", "id"),
            driverName: transportValue(va, "driverName", "driverFullName")
              || transportValue(va.driver, "driverName", "driverFullName", "fullName", "name")
              || (typeof va.driver === "string" ? va.driver : ""),
            attendantId: va.attendantId ?? va.AttendantId ?? va.busAttendantId,
            attendantName: va.attendantName || va.AttendantName || va.busAttendantName || (typeof va.attendant === "string" ? va.attendant : "") || "Unassigned",
            morningTripTime: va.morningTripTime || "07:00 AM",
            eveningTripTime: va.eveningTripTime || "03:45 PM",
            effectiveFrom: va.effectiveFrom ? String(va.effectiveFrom).split("T")[0] : "",
            status: va.status === true || va.status === 1 || va.status === "Active" ? "Active" : "Inactive",
          }))
        );
      }

      if (tripsRes.status === "fulfilled" && tripsRes.value?.data) {
        const tripsData = scoped(tripsRes.value.data?.data?.trips || tripsRes.value.data?.data || extractList(tripsRes.value.data));
        if (Array.isArray(tripsData)) {
          setTrips(
            tripsData.map((t) => ({
              id: t.tripId || t.id,
              assignmentId: t.assignmentId,
              vehicleId: t.vehicleId,
              vehicleNumber: t.vehicleNumber || t.busNumber || "",
              routeId: t.routeId,
              routeName: t.routeName || "",
              driverId: transportValue(t, "driverId", "driverStaffId", "staffId"),
              tripType: t.tripType || (t.startTime ? "Morning" : "Evening"),
              tripDate: t.tripDate ? String(t.tripDate).split("T")[0] : new Date().toISOString().split("T")[0],
              attendantId: t.attendantId,
              startTime: t.startTime || t.morningTripTime || t.morningTrip || "",
              endTime: t.endTime || t.eveningTripTime || t.eveningTrip || "",
              studentsPresent: t.studentsCount ?? t.studentsPresent ?? t.assignedStudents ?? "",
              status: t.status || t.tripStatus || "",
              driverName: transportValue(t, "driverName", "driverFullName")
                || transportValue(t.driver, "driverName", "fullName", "name")
                || (typeof t.driver === "string" ? t.driver : ""),
              attendantName: t.attendantName || t.attendant || "",
            }))
          );
        }
      }

      if (gpsRes.status === "fulfilled" && gpsRes.value?.data) {
        const gpsData = scoped(Array.isArray(gpsRes.value.data?.data)
          ? gpsRes.value.data.data
          : extractList(gpsRes.value.data));
        if (Array.isArray(gpsData)) {
          setGpsSnapshots(
            gpsData.map((g) => ({
              id: g.vehicleId || g.id,
              vehicleNumber: g.vehicleNumber || g.busNumber || "",
              routeName: g.routeName || g.route || "",
              speed: g.speed ?? null,
              nextStop: g.nextStop || "-",
              lastUpdated: g.eta ? `ETA: ${g.eta}` : (g.gpsSignal || g.gpsStatus || "-"),
              latitude: g.latitude ?? null,
              longitude: g.longitude ?? null,
              status: g.tripStatus || "Unknown",
            }))
          );
        }
      }

      if (maintenanceRes.status === "fulfilled" && maintenanceRes.value?.data) {
        const items = scoped(extractList(maintenanceRes.value.data));
        setMaintenance(
          items.map((m) => ({
            id: m.maintenanceId || m.id,
            vehicleId: m.vehicleId,
            vehicleNumber: m.vehicleNumber || m.busNumber || "",
            category: m.serviceType || m.category || "",
            serviceDate: m.serviceDate ? String(m.serviceDate).split("T")[0] : "",
            cost: Number(m.cost || 0),
            vendor: m.vendorCenter || m.vendor || "",
            nextDueDate: m.nextServiceDue ? String(m.nextServiceDue).split("T")[0] : (m.nextDueDate ? String(m.nextDueDate).split("T")[0] : ""),
            status: normalizeMaintenanceStatus(m),
            notes: m.remarks || m.notes || "",
          }))
        );
      }

      if (studentRes.status === "fulfilled" && studentRes.value?.data) {
        const studentItems = scoped(extractList(studentRes.value.data));
        const getAdmissionNumber = (student) => [
          student.admissionNo, student.AdmissionNo, student.admissionNumber, student.AdmissionNumber,
          student.student?.admissionNo, student.student?.admissionNumber,
        ].find((value) => value != null && String(value).trim() !== "") ?? "";
        if (!current()) return;
        setStudentAssignments(
          studentItems.map((s) => ({
            id: getStudentTransportAssignmentId(s),
            studentId: s.studentId, pickupPointId: s.pickupPointId, vehicleAssignmentId: s.vehicleAssignmentId,
            studentName: s.studentName || s.studentFullName || s.fullName || s.name || "Student",
            admissionNo: getAdmissionNumber(s),
            routeId: s.routeId,
            routeName: s.routeName || "",
            pickupPointName: s.pickupPointName || s.pickupPoint || "",
            vehicleNumber: s.vehicleNumber || s.VehicleNumber || s.assignedVehicleNumber || s.vehicle?.vehicleNumber || "Unassigned",
            vehicleId: s.vehicleId ?? s.VehicleId ?? s.assignedVehicleId ?? s.AssignedVehicleId ?? s.vehicle?.vehicleId ?? s.vehicle?.id ?? s.vehicleAssignment?.vehicleId ?? "",
            feePlan: s.feePlan || "Annual",
            monthlyFee: s.monthlyFee == null ? null : Number(s.monthlyFee),
            annualFee: s.annualFee == null ? null : Number(s.annualFee),
            status: s.status === true || s.status === 1 || s.status === "Active" ? "Active" : "Inactive",
          }))
        );
      }

      if (dashboardRes.status === "fulfilled" && dashboardRes.value?.data?.data?.summary) {
        setDashboardMetrics(dashboardRes.value.data.data.summary);
      }
    } catch (err) {
      if (!current()) return;
      console.error("Error fetching transport data:", err);
      showErrorToast(`${getApiErrorMessage(err) || "Unable to refresh transport data."} Showing the currently loaded transport data where available.`);
    } finally {
      if (current()) { setIsLoading(false); setRecordsReady(true); }
    }
  };

  refreshRef.current = fetchTransportData;
  useEffect(() => {
    refreshRef.current();
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId]);

  useEffect(() => {
    if (isLoading || !selectedCampusId || activeSection !== "reports") return undefined;
    const definition = reportDefinitions[activeReportTab];
    if (!definition) return undefined;
    let active = true;
    const request = new AbortController();
    const params = {
      campusId: selectedCampusId || undefined,
      routeId: reportFilters.route !== "All" ? reportFilters.route : undefined,
      vehicleId: reportFilters.vehicle !== "All" ? reportFilters.vehicle : undefined,
      status: reportFilters.status !== "All" ? reportFilters.status : undefined,
    };
    setReportApiRows((data) => { const next = { ...data }; delete next[activeReportTab]; return next; });
    setReportLoading(true);
    apiClient.get(definition.endpoint, { params, signal: request.signal })
      .then((response) => {
        if (!active) return;
        if (response.data?.success === false) throw new Error(response.data.message || "Unable to load this transport report.");
        const scoped = scopedRecords.current;
        if (!scoped) return;
        setReportApiRows((current) => ({ ...current, [activeReportTab]: scopeTransportReport(activeReportTab, reportRowsFromPayload(response.data), scoped, params) }));
      })
      .catch((error) => {
        if (!active) return;
        showErrorToast(getApiErrorMessage(error) || "Unable to load this transport report.");
      })
      .finally(() => active && setReportLoading(false));
    return () => { active = false; request.abort(); };
  }, [
    isLoading,
    activeSection,
    activeReportTab,
    selectedCampusId,
    selectedBoardId,
    selectedAcademicYearId,
    reportFilters.route,
    reportFilters.vehicle,
    reportFilters.status,
    showErrorToast,
  ]);

  const routeOptions = routes.map((route) => ({ value: route.id, label: route.routeName }));
  const vehicleOptions = vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.vehicleNumber }));
  const driverOptions = drivers
    .filter((driver) => Number(driver.transportDriverId ?? driver.driverId) > 0)
    .map((driver) => ({ value: driver.transportDriverId ?? driver.driverId, label: driver.driverName }));
  const attendantOptions = attendants.map((attendant) => ({ value: attendant.id, label: attendant.attendantName }));

  const dataMap = {
    routes: { rows: routes, setRows: setRoutes },
    pickupPoints: { rows: pickupPoints, setRows: setPickupPoints },
    vehicles: { rows: vehicles, setRows: setVehicles },
    drivers: { rows: drivers, setRows: setDrivers },
    attendants: { rows: attendants, setRows: setAttendants },
    vehicleAssignments: { rows: vehicleAssignments, setRows: setVehicleAssignments },
    studentAssignments: { rows: studentAssignments, setRows: setStudentAssignments },
    trips: { rows: trips, setRows: setTrips },
    maintenance: { rows: maintenance, setRows: setMaintenance },
  };

  const findRoute = (id) => routes.find((route) => route.id === id);
  const findVehicle = (id) => vehicles.find((vehicle) => vehicle.id === id);
  const driverIdentifiers = (record) => {
    const nested = record?.driver && typeof record.driver === "object" ? record.driver : {};
    return [record, nested].flatMap((source) =>
      ["driverId", "transportDriverId", "driverApiId", "driverStaffId", "staffId", ...(source === nested ? ["id"] : [])]
        .map((key) => transportValue(source, key)))
      .filter((value) => value != null && String(value).trim() !== "")
      .map((value) => String(value).trim());
  };
  const resolveDriverName = (record) => {
    const nested = record?.driver && typeof record.driver === "object" ? record.driver : {};
    const directName = transportValue(record, "driverName", "driverFullName", "assignedDriver", "assignedDriverName")
      || transportValue(nested, "driverName", "driverFullName", "fullName", "name")
      || (typeof record?.driver === "string" ? record.driver : "");
    if (directName && !/^(unassigned|unknown|n\/a|-)$/i.test(String(directName).trim())) return String(directName).trim();

    const identifiers = driverIdentifiers(record);
    if (!identifiers.length) return "";
    const matchesId = (candidate) => [
      ...driverIdentifiers(candidate),
      transportValue(candidate, "id"),
      transportValue(candidate, "facultyId"),
    ].some((value) => value != null && identifiers.includes(String(value)));
    const driver = drivers.find(matchesId);
    if (driver?.driverName) return driver.driverName;
    const staff = Object.values(driverStaffRecords).find(matchesId);
    if (!staff) return "";
    return transportValue(staff, "fullName", "staffName", "name")
      || [transportValue(staff, "firstName"), transportValue(staff, "middleName"), transportValue(staff, "lastName")].filter(Boolean).join(" ");
  };
  const findDriver = (id) => drivers.find((driver) => (
    [driver.id, driver.staffId, driver.driverApiId, driver.transportDriverId, driver.driverId]
      .some((driverId) => driverId != null && id != null && String(driverId).trim() === String(id).trim())
  ));
  const findAttendant = (id) => attendants.find((attendant) => attendant.id === id);
  const findAssignment = (id) => vehicleAssignments.find((assignment) => assignment.id === id);
  const summary = (() => {
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status === "Active");
    const activeStudents = studentAssignments.filter((student) => student.status === "Active");
    const expiringDocs = vehicles.filter((vehicle) =>
      [vehicle.insuranceExpiry, vehicle.pollutionExpiry, vehicle.fitnessExpiry].some((date) => daysUntil(date) <= 45),
    );
    const expiringLicenses = drivers.filter((driver) => daysUntil(driver.licenseExpiryDate) <= 45);
    const totalCapacity = vehicleAssignments.reduce((total, assignment) => total + (findVehicle(assignment.vehicleId)?.capacity || 0), 0);
    const totalAssigned = activeStudents.length;
    return {
      totalVehicles: dashboardMetrics?.totalVehicles ?? vehicles.length,
      activeVehicles: dashboardMetrics?.activeVehicles ?? activeVehicles.length,
      maintenanceVehicles: dashboardMetrics?.vehiclesUnderMaintenance ?? vehicles.filter((vehicle) => vehicle.status === "Maintenance").length,
      totalDrivers: dashboardMetrics?.totalDrivers ?? drivers.length,
      activeDrivers: dashboardMetrics?.activeDrivers ?? drivers.filter((driver) => driver.status === "Active").length,
      totalAttendants: dashboardMetrics?.totalBusAttendants ?? attendants.length,
      activeRoutes: dashboardMetrics?.activeRoutes ?? routes.filter((route) => route.status === "Active").length,
      activeStudents: dashboardMetrics?.studentsUsingTransport ?? activeStudents.length,
      runningTrips: trips.filter((trip) => trip.status === "Running").length,
      completedTrips: trips.filter((trip) => trip.status === "Completed").length,
      expiringDocs: dashboardMetrics?.expiringVehicleDocuments ?? expiringDocs.length,
      expiringLicenses: dashboardMetrics?.expiringDriverLicenses ?? expiringLicenses.length,
      expiringLicenseDrivers: expiringLicenses,
      utilization: totalCapacity ? Math.round((totalAssigned / totalCapacity) * 100) : 0,
    };
  })();

  const enrichRecord = (key, record) => {
    if (key === "pickupPoints") {
      const route = findRoute(record.routeId);
      return { ...record, routeName: route?.routeName || record.routeName };
    }
    if (key === "vehicleAssignments") {
      const route = findRoute(record.routeId);
      const vehicle = findVehicle(record.vehicleId);
      const driver = findDriver(record.driverId);
      const attendant = findAttendant(record.attendantId);
      return {
        ...record,
        routeName: route?.routeName || record.routeName,
        vehicleNumber: vehicle?.vehicleNumber || record.vehicleNumber,
        driverName: driver?.driverName || record.driverName,
        attendantName: attendant?.attendantName || record.attendantName,
      };
    }
    if (key === "studentAssignments") {
      const route = findRoute(record.routeId);
      const vehicle = findVehicle(record.vehicleId);
      return {
        ...record,
        routeName: route?.routeName || record.routeName,
        vehicleNumber: vehicle?.vehicleNumber || record.vehicleNumber,
      };
    }
    if (key === "trips") {
      const route = findRoute(record.routeId);
      const vehicle = findVehicle(record.vehicleId);
      const driver = findDriver(record.driverId);
      const attendant = findAttendant(record.attendantId);
      return {
        ...record,
        routeName: route?.routeName || record.routeName,
        vehicleNumber: vehicle?.vehicleNumber || record.vehicleNumber,
        driverName: driver?.driverName || record.driverName,
        attendantName: attendant?.attendantName || record.attendantName,
      };
    }
    if (key === "maintenance") {
      const vehicle = findVehicle(record.vehicleId);
      return { ...record, vehicleNumber: vehicle?.vehicleNumber || record.vehicleNumber };
    }
    return record;
  };

  const openForm = (key, title, fields, record = null, restoring = false) => {
    if (!restoring) { routeAction(record ? "edit" : "add", key, record); return; }
    if (latestActionQuery.current !== actionQuery) return;
    const formRecord = key === "trips" && record
      ? {
          ...record,
          vehicleId: record.vehicleId ?? vehicles.find((vehicle) => vehicle.vehicleNumber === record.vehicleNumber)?.id ?? "",
          routeId: record.routeId ?? routes.find((route) => route.routeName === record.routeName)?.id ?? "",
          driverId: record.driverId ?? drivers.find((driver) => driver.driverName === record.driverName)?.id ?? "",
          attendantId: record.attendantId ?? attendants.find((attendant) => attendant.attendantName === record.attendantName)?.id ?? "",
          startTime: toTimeInputValue(record.startTime),
          endTime: toTimeInputValue(record.endTime),
          studentsPresent: record.studentsPresent ?? "",
          status: record.status || "",
        }
      : key === "studentAssignments" && record
        ? {
            ...record,
            routeId: record.routeId ?? routes.find((route) => route.routeName === record.routeName)?.id ?? "",
            vehicleId: record.vehicleId || (
              vehicles.find((vehicle) => String(vehicle.vehicleNumber).trim().toLowerCase() === String(record.vehicleNumber || "").trim().toLowerCase())?.id
              ?? ""
            ),
          }
        : record;
    setFormConfig({ key, title, fields, record: formRecord });
  };

  const openEditForm = async (key, title, fields, record, restoring = false) => {
    if (!restoring) { routeAction("edit", key, record); return; }
    if (key === "pickupPoints") {
      const pickupPointId = Number(String(record.id).replace(/[^\d]/g, "")) || record.id;
      try {
        const response = await apiClient.get(apiEndpoints.transport.pickupPointById(pickupPointId));
        const payload = response.data?.data ?? response.data ?? {};
        const detail = payload.pickupPoint ?? payload.PickupPoint ?? payload;
        const routeName = detail.routeName ?? detail.RouteName ?? record.routeName;
        const routeId = detail.routeId
          ?? detail.RouteId
          ?? (record.routeId || undefined)
          ?? routes.find((route) => String(route.routeName).trim().toLowerCase() === String(routeName || "").trim().toLowerCase())?.id
          ?? "";
        const rawStatus = detail.status ?? detail.Status ?? detail.isActive ?? detail.IsActive;

        openForm(key, title, fields, {
          ...record,
          id: record.id,
          routeId,
          routeName,
          pickupName: detail.pickupPointName ?? detail.PickupPointName ?? detail.pickupName ?? detail.PickupName ?? detail.stopName ?? record.pickupName,
          landmark: detail.landmark ?? detail.Landmark ?? detail.stopAddress ?? record.landmark,
          sequenceNumber: detail.sequenceNo ?? detail.SequenceNo ?? detail.sequenceNumber ?? detail.SequenceNumber ?? detail.stopOrder ?? record.sequenceNumber,
          pickupTime: toTimeInputValue(detail.pickupTime ?? detail.PickupTime ?? detail.morningPickupTime ?? detail.MorningPickupTime ?? record.pickupTime),
          dropTime: toTimeInputValue(detail.dropTime ?? detail.DropTime ?? detail.eveningDropTime ?? detail.EveningDropTime ?? record.dropTime),
          distanceKm: detail.distanceFromStart ?? detail.DistanceFromStart ?? detail.distanceFromSchool ?? detail.DistanceFromSchool ?? detail.distanceKm ?? record.distanceKm,
          monthlyFee: detail.monthlyFee ?? detail.MonthlyFee ?? detail.monthlyFare ?? detail.MonthlyFare ?? record.monthlyFee,
          status: rawStatus === true || rawStatus === 1 || rawStatus === "Active" ? "Active" : rawStatus === false || rawStatus === 0 || rawStatus === "Inactive" ? "Inactive" : record.status,
        }, true);
      } catch (error) {
        openForm(key, title, fields, {
          ...record,
          pickupTime: toTimeInputValue(record.pickupTime),
          dropTime: toTimeInputValue(record.dropTime),
        }, true);
        showErrorToast(`Latest pickup-point details unavailable: ${getApiErrorMessage(error)}`);
      }
      return;
    }

    if (key !== "studentAssignments") {
      openForm(key, title, fields, record, true);
      return;
    }

    const assignmentId = getStudentTransportAssignmentId(record);
    if (assignmentId === null) {
      openForm(key, title, fields, record);
      showErrorToast("Student Transport assignment ID is unavailable. Refresh the list and try again.");
      return;
    }
    try {
      const response = await apiClient.get(apiEndpoints.transport.studentAssignmentById(assignmentId));
      const payload = response.data?.data ?? response.data ?? {};
      const detail = payload.studentAssignment ?? payload.assignment ?? payload;
      const linkedAssignmentId = detail.vehicleAssignmentId ?? detail.VehicleAssignmentId ?? detail.vehicleAssignment?.assignmentId;
      const linkedVehicleId = vehicleAssignments.find((assignment) => String(assignment.id) === String(linkedAssignmentId))?.vehicleId;
      const vehicleId = [
        detail.vehicleId,
        detail.VehicleId,
        detail.assignedVehicleId,
        detail.AssignedVehicleId,
        detail.vehicle?.vehicleId,
        detail.vehicle?.id,
        detail.vehicleAssignment?.vehicleId,
        linkedVehicleId,
        record.vehicleId,
      ].find((value) => value !== undefined && value !== null && String(value).trim() !== "");
      const vehicleNumber = detail.vehicleNumber
        ?? detail.VehicleNumber
        ?? detail.assignedVehicleNumber
        ?? detail.vehicle?.vehicleNumber
        ?? record.vehicleNumber;
      const resolvedVehicleId = vehicleId
        ?? vehicles.find((vehicle) => String(vehicle.vehicleNumber).trim().toLowerCase() === String(vehicleNumber || "").trim().toLowerCase())?.id
        ?? "";

      openForm(key, title, fields, {
        ...record,
        ...detail,
        id: record.id,
        studentName: detail.studentName ?? detail.StudentName ?? record.studentName,
        admissionNo: detail.admissionNo ?? detail.AdmissionNo ?? detail.admissionNumber ?? record.admissionNo,
        routeId: detail.routeId ?? detail.RouteId ?? record.routeId,
        pickupPointName: detail.pickupPointName ?? detail.PickupPointName ?? detail.pickupPoint ?? record.pickupPointName,
        vehicleId: resolvedVehicleId,
        vehicleNumber,
        monthlyFee: detail.monthlyFee ?? detail.MonthlyFee ?? record.monthlyFee,
        status: detail.status === true || detail.status === 1 || detail.Status === true || detail.Status === 1
          ? "Active"
          : typeof (detail.status ?? detail.Status) === "string"
            ? (detail.status ?? detail.Status)
            : record.status,
      }, true);
    } catch (error) {
      openForm(key, title, fields, record);
      showErrorToast(`Latest student transport details unavailable: ${getApiErrorMessage(error)}`);
    }
  };

  const saveForm = async (values) => {
    if (isFormSubmitting || !formConfig) return;
    const { key, record } = formConfig;
    const isEdit = Boolean(record?.id);
    const numericId = isEdit ? Number(String(record.id).replace(/[^\d]/g, "")) || record.id : null;

    setIsFormSubmitting(true);
    try {
      if (!alive.current || !selectedCampusId) throw new Error('Select a campus before saving transport records.');
      const requireOption = (items, value, label) => {
        if (!items.some((item) => String(item.id) === String(value))) throw new Error(`Select a valid ${label} from the current campus.`);
      };
      if (isEdit) requireOption(dataMap[key]?.rows || [], record.id, 'record');
      if (key === 'pickupPoints') for (const point of values.pickupRows || [values]) requireOption(routes, point.routeId, 'route');
      if (['vehicleAssignments', 'studentAssignments', 'trips'].includes(key)) requireOption(routes, values.routeId, 'route');
      if (['vehicleAssignments', 'studentAssignments', 'trips', 'maintenance'].includes(key)) requireOption(vehicles, values.vehicleId, 'vehicle');
      if (['vehicleAssignments', 'trips'].includes(key)) {
        requireOption(drivers, values.driverId, 'driver');
        if (values.attendantId) requireOption(attendants, values.attendantId, 'attendant');
      }
      if (key === 'studentAssignments') {
        const candidates = scopedRecords.current?.students || [];
        const admission = String(values.admissionNo || '').trim();
        const student = candidates.find((item) => String(transportValue(item, 'admissionNo', 'admissionNumber') || '').trim() === admission);
        if (!student || (values.studentId && String(transportValue(student, 'studentId', 'id')) !== String(values.studentId))) throw new Error('Select a student in the current campus, board and academic year.');
        const point = pickupPoints.find((item) => String(item.routeId) === String(values.routeId) && (values.pickupPointId ? String(item.id) === String(values.pickupPointId) : String(item.pickupName || '').trim().toLowerCase() === String(values.pickupPointName || '').trim().toLowerCase()));
        if (!point) throw new Error('Select a pickup point belonging to the selected route.');
        values = { ...values, studentId: transportValue(student, 'studentId', 'id'), pickupPointId: point.id,
          vehicleAssignmentId: vehicleAssignments.find((item) => String(item.vehicleId) === String(values.vehicleId) && String(item.routeId) === String(values.routeId))?.id };
      }
      if (key === "routes") {
        const payload = {
          campusId: Number(selectedCampusId),
          routeCode: values.routeCode || makeId("RT", routes),
          routeName: values.routeName || "Route",
          startLocation: values.routeStart || "Campus North",
          endLocation: values.routeEnd || "City Center",
          distanceKm: Number(values.totalDistanceKm) || 0,
          estimatedDurationMinutes: Number(values.estimatedTimeMinutes) || 30,
          nonAcBaseFare: Number(values.minBaseFare) || 1000,
          acBaseFare: Number(values.acMinBaseFare) || 1200,
          nonAcRatePerKm: Number(values.ratePerKm) || 100,
          acRatePerKm: Number(values.acRatePerKm) || 150,
          description: values.description || "",
          status: values.status === "Active",
          isActive: values.status === "Active",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.routeById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.routes, payload);
        }
      } else if (key === "pickupPoints") {
        for (const pickupValues of values.pickupRows || [values]) {
          if (!alive.current) return;
          const payload = {
            campusId: Number(selectedCampusId),
            routeId: Number(pickupValues.routeId),
            pickupPointName: pickupValues.pickupName,
            landmark: pickupValues.landmark || "Main Landmark",
            sequenceNo: Number(pickupValues.sequenceNumber) || 1,
            pickupTime: pickupValues.pickupTime ? (pickupValues.pickupTime.length === 5 ? `${pickupValues.pickupTime}:00` : pickupValues.pickupTime) : "07:30:00",
            dropTime: pickupValues.dropTime ? (pickupValues.dropTime.length === 5 ? `${pickupValues.dropTime}:00` : pickupValues.dropTime) : "16:15:00",
            distanceFromStart: Number(pickupValues.distanceKm) || 0,
            monthlyFee: Number(pickupValues.monthlyFee) || 1200,
            status: pickupValues.status === "Active",
          };
          if (isEdit) {
            await apiClient.put(apiEndpoints.transport.pickupPointById(numericId), payload);
          } else {
            const normalizedPickupName = String(payload.pickupPointName || "").trim().toLowerCase();
            let existingPickupPoints = pickupPoints;
            if (!existingPickupPoints.some((point) => String(point.routeId) === String(payload.routeId) && String(point.pickupName || "").trim().toLowerCase() === normalizedPickupName)) {
              const existingResponse = await apiClient.get(`${apiEndpoints.transport.lookups.pickupPoints}?routeId=${encodeURIComponent(payload.routeId)}`);
              existingPickupPoints = extractList(existingResponse.data).map((point) => ({
                routeId: point.routeId ?? point.RouteId ?? payload.routeId,
                pickupName: point.pickupPointName ?? point.PickupPointName ?? point.stopName ?? point.pickupName,
              }));
            }
            const duplicateExists = existingPickupPoints.some((point) =>
              String(point.routeId) === String(payload.routeId)
              && String(point.pickupName || "").trim().toLowerCase() === normalizedPickupName
            );
            if (duplicateExists) {
              throw new Error("Pickup point already exists for this route.");
            }
            await apiClient.post(apiEndpoints.transport.pickupPoints, payload);
          }
          if (!isEdit) values.onPickupSaved?.(pickupValues.key);
        }
      } else if (key === "vehicles") {
        const payload = {
          campusId: Number(selectedCampusId),
          vehicleNumber: values.vehicleNumber,
          registrationNumber: values.registrationNumber,
          vehicleName: values.vehicleNumber,
          vehicleType: values.vehicleType || "Bus",
          capacity: Number(values.capacity) || 40,
          isAC: Boolean(values.isAC),
          gpsDeviceId: values.gpsDeviceId || "",
          chassisNumber: values.chassisNumber || "",
          engineNumber: values.engineNumber || "",
          insuranceExpiry: values.insuranceExpiry || null,
          pollutionExpiry: values.pollutionExpiry || null,
          fitnessExpiry: values.fitnessExpiry || null,
          status: values.status === "Active",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.vehicleById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.vehicles, payload);
        }
      } else if (key === "drivers") {
        if (isEdit) {
          const staffRecord = record.source === "staff" ? (driverStaffRecords[String(record.id)]
            ?? Object.values(driverStaffRecords).find((staff) => String(staff.employeeId || staff.empId || "").trim().toLowerCase()
              === String(record.employeeId || values.employeeId || "").trim().toLowerCase())) : null;
          if (staffRecord) {
            const departmentSpecific = {
              ...readDepartmentSpecific(staffRecord),
              licenseNumber: values.licenseNumber,
              licenseExpiry: values.licenseExpiryDate || null,
            };
            await apiClient.put(apiEndpoints.faculty.update(staffRecord.staffId || staffRecord.id || staffRecord.facultyId), {
              ...staffRecord,
              fullName: values.driverName,
              employeeId: values.employeeId,
              mobile: values.mobileNumber,
              email: values.email || "",
              currentAddress: values.address || "",
              status: values.status,
              drivingLicenseNumber: values.licenseNumber,
              drivingLicenseExpiryDate: values.licenseExpiryDate || null,
              licenseExpiryDate: values.licenseExpiryDate || null,
              departmentSpecific,
              departmentSpecificJson: JSON.stringify(departmentSpecific),
            });
          } else {
            const driverApiId = record.transportDriverId || record.driverApiId || record.licenseNumber || record.employeeId || record.id;
            await apiClient.put(apiEndpoints.transport.driverById(driverApiId), {
              driverName: values.driverName,
              employeeId: values.employeeId,
              mobileNumber: values.mobileNumber,
              email: values.email || "",
              licenceNumber: values.licenseNumber,
              licenceExpiry: values.licenseExpiryDate || null,
              address: values.address || "",
              status: values.status === "Active",
            });
          }
        } else {
          throw new Error("Drivers are managed in Non-Teaching Staff. Create new drivers under Staff (Role: Driver).");
        }
      } else if (key === "attendants") {
        const payload = {
          staffId: record?.staffId ?? scopedRecords.current?.staff.find((staff) => String(staff.employeeId) === String(values.employeeId))?.staffId,
          attendantName: values.attendantName,
          employeeId: values.employeeId,
          mobileNumber: values.mobileNumber,
          gender: values.gender || "Female",
          status: values.status === "Active",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.attendantById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.attendants, payload);
        }
      } else if (key === "vehicleAssignments") {
        const payload = {
          routeId: Number(values.routeId),
          vehicleId: Number(values.vehicleId),
          driverId: Number(values.driverId),
          attendantId: values.attendantId ? Number(values.attendantId) : null,
          morningTripTime: values.morningTripTime || "07:00 AM",
          eveningTripTime: values.eveningTripTime || "03:45 PM",
          effectiveFrom: values.effectiveFrom ? `${values.effectiveFrom}T00:00:00` : new Date().toISOString(),
          shift: "Morning",
          academicYear: selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || null,
          status: values.status === "Active",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.reassignVehicleAssignment(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.vehicleAssignments, payload);
        }
      } else if (key === "studentAssignments") {
        const payload = {
          studentId: Number(values.studentId),
          studentName: values.studentName,
          admissionNo: values.admissionNo,
          routeId: Number(values.routeId),
          pickupPointId: Number(values.pickupPointId) || null,
          pickupPointName: values.pickupPointName || "",
          vehicleId: Number(values.vehicleId),
          ...(values.vehicleAssignmentId ? { vehicleAssignmentId: Number(values.vehicleAssignmentId) } : {}),
          monthlyFee: Number(values.monthlyFee) || 1200,
          status: values.status === "Active",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.studentAssignmentById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.studentAssignments, payload);
        }
      } else if (key === "trips") {
        const payload = {
          vehicleId: Number(values.vehicleId),
          routeId: Number(values.routeId),
          driverId: Number(values.driverId),
          attendantId: values.attendantId ? Number(values.attendantId) : null,
          morningTripTime: values.startTime || "07:00 AM",
          eveningTripTime: values.endTime || "03:45 PM",
          studentsCount: Number(values.studentsPresent) || 0,
          status: values.status || "Running",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.tripById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.trips, payload);
        }
      } else if (key === "maintenance") {
        const payload = {
          vehicleId: Number(values.vehicleId),
          serviceType: values.category || "General Maintenance",
          serviceDate: values.serviceDate ? `${values.serviceDate}T00:00:00` : new Date().toISOString(),
          cost: Number(values.cost) || 0,
          vendorCenter: values.vendor || "",
          nextServiceDue: values.nextDueDate ? `${values.nextDueDate}T00:00:00` : null,
          remarks: values.notes || "",
          status: values.status === "Completed",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.maintenanceById(record.id), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.maintenance, payload);
        }
      }

      if (!alive.current) return;
      await fetchTransportData();
      if (key === "maintenance" && isEdit) {
        setMaintenance((current) => current.map((item) => (
          String(item.id) === String(record.id)
            ? { ...item, status: values.status }
            : item
        )));
      }
      setFormConfig(null);
      showToast(isEdit ? "Transport record updated successfully." : "Transport record added successfully.");
    } catch (err) {
      console.error("API error saving transport record:", err);
      const backendDetails = err?.response?.data?.details ?? err?.response?.data?.Details;
      showErrorToast(`Error saving record: ${backendDetails || getApiErrorMessage(err)}`);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const saveNewAttendant = async (values) => {
    if (isFormSubmitting || !alive.current) return;
    setIsFormSubmitting(true);
    try {
      if (!nonTeachingStaff.some((staff) => String(staff.id) === String(values.staffId))) throw new Error("Select attendant staff from the current campus.");
      const payload = {
        staffId: Number(values.staffId),
        attendantName: values.attendantName,
        employeeId: values.employeeId,
        mobileNumber: values.mobileNumber,
        gender: values.gender,
        status: values.status === "Active",
      };
      await apiClient.post(apiEndpoints.transport.attendants, payload);
      setIsAddAttendantOpen(false);
      await fetchTransportData();
      showToast("Bus attendant added successfully.");
    } catch (err) {
      console.error("API error saving transport attendant:", err);
      showErrorToast(`Error adding attendant: ${getApiErrorMessage(err)}`);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const requestDelete = (key, row, label, restoring = false) => {
    if (!restoring) { routeAction("delete", key, row); return; }
    setDeleteConfig({ key, row, label });
  };

  const openRecordDetails = async (key, row, title, restoring = false) => {
    if (!restoring) { routeAction("view", key, row); return; }
    if (key === "trips") {
      setDetailConfig({ title, row: getTripDetailRow(row) });
      return;
    }
    const id = key === "studentAssignments"
      ? getStudentTransportAssignmentId(row)
      : key === "drivers"
      ? row.source === "staff" ? row.staffId ?? row.id : row.transportDriverId || row.driverApiId || row.licenseNumber || row.employeeId || row.id
      : Number(String(row.id).replace(/[^\d]/g, "")) || row.id;
    const detailEndpoints = {
      routes: apiEndpoints.transport.routeById,
      pickupPoints: apiEndpoints.transport.pickupPointById,
      vehicles: apiEndpoints.transport.vehicleById,
      drivers: row.source === "staff" ? apiEndpoints.faculty.getById : apiEndpoints.transport.driverById,
      attendants: apiEndpoints.transport.attendantById,
      vehicleAssignments: apiEndpoints.transport.vehicleAssignmentById,
      studentAssignments: apiEndpoints.transport.studentAssignmentById,
      maintenance: apiEndpoints.transport.maintenanceById,
    };
    const endpointFactory = detailEndpoints[key];
    if (!endpointFactory) {
      setDetailConfig({ title, row });
      return;
    }
    if (id === null || id === undefined || String(id).trim() === "") {
      setDetailConfig({ title, row });
      showErrorToast("Student Transport assignment ID is unavailable. Refresh the list and try again.");
      return;
    }
    try {
      const requests = [apiClient.get(endpointFactory(id))];
      if (key === "drivers" && row.source !== "staff") requests.push(apiClient.get(apiEndpoints.transport.driverDocuments(id)));
      const responses = await Promise.allSettled(requests);
      const detailResponse = responses[0].status === "fulfilled" ? responses[0].value.data : null;
      const detail = detailResponse?.data ?? detailResponse;
      const documents = key === "drivers" && responses[1]?.status === "fulfilled" ? extractList(responses[1].value.data) : [];
      setDetailConfig({ title, row: { ...row, ...(detail && typeof detail === "object" ? detail : {}), ...(key === "drivers" ? { documentCount: documents.length } : {}) } });
    } catch (error) {
      setDetailConfig({ title, row });
      showErrorToast(`Latest details unavailable: ${getApiErrorMessage(error)}`);
    }
  };

  const confirmDelete = async () => {
    if (isDeleteSubmitting || !deleteConfig) return;
    const { key, row } = deleteConfig;
    const staffIdToDelete = key === "drivers" && row.source === "staff"
      ? row.staffId ?? row.id
      : null;
    const numericId = key === "studentAssignments"
      ? getStudentTransportAssignmentId(row)
      : key === "drivers"
      ? row.transportDriverId || row.driverApiId || (row.source !== "staff" && (row.licenseNumber || row.employeeId || row.id))
      : Number(String(row.id).replace(/[^\d]/g, "")) || row.id;

    if ((key === "drivers" ? staffIdToDelete == null && numericId == null : numericId == null)
      || (key !== "drivers" && String(numericId).trim() === "")) {
      showErrorToast(key === "drivers"
        ? "Driver or linked staff ID is unavailable. Refresh the list and try again."
        : "Student Transport assignment ID is unavailable. Refresh the list and try again.");
      return;
    }

    setIsDeleteSubmitting(true);
    try {
      let deleteResponse;
      if (key === "routes") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.routeById(numericId));
      } else if (key === "pickupPoints") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.pickupPointById(numericId));
      } else if (key === "vehicles") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.vehicleById(numericId));
      } else if (key === "drivers") {
        if (row.source !== "staff" && numericId != null) {
          deleteResponse = await apiClient.delete(apiEndpoints.transport.driverById(numericId));
          assertTransportDeleteSucceeded(deleteResponse);
        }
        if (staffIdToDelete != null) {
          const staffDeleteResponse = await apiClient.delete(apiEndpoints.faculty.delete(staffIdToDelete));
          assertTransportDeleteSucceeded(staffDeleteResponse);
          const staffRecords = await getAllTransportPages(apiClient, apiEndpoints.faculty.list, {
            CampusId: Number(selectedCampusId),
          });
          const staffStillExists = extractList(staffRecords.data).some((staff) =>
            String(transportValue(staff, "staffId", "id", "facultyId")) === String(staffIdToDelete));
          if (staffStillExists) {
            throw new Error("The staff member is still present after the delete request.");
          }
        }
        if (row.source !== "staff" && row.transportDriverId != null) {
          const driverRecords = await getAllTransportPages(apiClient, apiEndpoints.transport.drivers, {
            CampusId: Number(selectedCampusId),
          });
          const driverStillExists = extractList(driverRecords.data).some((driver) =>
            String(transportValue(driver, "driverId")) === String(row.transportDriverId)
            || (row.staffId != null && String(transportValue(driver, "staffId")) === String(row.staffId)));
          if (driverStillExists) {
            throw new Error("The transport driver profile is still present after the delete request.");
          }
        }
      } else if (key === "attendants") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.attendantById(numericId));
      } else if (key === "vehicleAssignments") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.vehicleAssignmentById(numericId));
      } else if (key === "studentAssignments") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.studentAssignmentById(numericId));
      } else if (key === "trips") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.tripById(numericId));
      } else if (key === "maintenance") {
        deleteResponse = await apiClient.delete(apiEndpoints.transport.maintenanceById(numericId));
      }
      if (key === "trips") {
        // Legacy trip DELETE can return success:false even after deleting the
        // row. Verify the read-only list instead of trusting that flag/message.
        const refreshedTrips = await getAllTransportPages(apiClient, apiEndpoints.transport.trips, { PageSize: 1000 });
        const remainingTrips = extractList(refreshedTrips.data);
        if (remainingTrips.some((trip) => String(transportValue(trip, "tripId", "id")) === String(numericId))) {
          throw new Error("The trip is still present after the delete request. Please try again.");
        }
        setTrips((current) => current.filter((trip) => String(trip.id) !== String(numericId)));
        if (scopedRecords.current) scopedRecords.current.trips = scopedRecords.current.trips.filter((trip) => String(transportValue(trip, "tripId", "id")) !== String(numericId));
        setDeleteConfig(null);
        showToast("Trip deleted successfully.");
        return;
      }
      assertTransportDeleteSucceeded(deleteResponse);
      if (key === "studentAssignments") {
        const refreshedAssignments = await getAllTransportPages(apiClient, apiEndpoints.transport.studentAssignments);
        const recordStillExists = extractList(refreshedAssignments.data)
          .some((assignment) => String(getStudentTransportAssignmentId(assignment)) === String(numericId));
        if (recordStillExists) {
          throw new Error("The backend reported success, but the Student Transport assignment was not deleted.");
        }
      }
      await fetchTransportData();
      setDeleteConfig(null);
      showToast("Transport record deleted successfully.");
    } catch (err) {
      console.error("API error deleting transport record:", err);
      showErrorToast(`Error deleting record: ${getApiErrorMessage(err)}`);
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const routeFields = [
    { name: "routeCode", label: "Route Code (Unique)", required: true, placeholder: "e.g. R-NORTH-101" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
    { name: "routeName", label: "Route Name", required: true, placeholder: "Enter route name..." },
    { name: "routeStart", label: "Route Start", placeholder: "Enter route start location..." },
    { name: "routeEnd", label: "Route End", placeholder: "Enter route end location..." },
    { name: "totalDistanceKm", label: "Total Distance (KM)", type: "number", min: 0, placeholder: "e.g. 18.5" },
    { name: "estimatedTimeMinutes", label: "Est Time (Minutes)", type: "number", min: 0, placeholder: "e.g. 45" },
    {
      type: "group",
      name: "routeFareSlab",
      title: "Distance & Slab Rate Configuration",
      className: "cms-transport-route-slab",
      columns: 3,
      fields: [
        { name: "minDistanceKm", label: "Min Range (KM)", type: "number", min: 0, placeholder: "e.g. 5" },
        { name: "minBaseFare", label: "Non-AC Base Fare (\u20b9)", type: "number", min: 0, placeholder: "e.g. 1000" },
        { name: "ratePerKm", label: "Non-AC Rate/Addl KM", type: "number", min: 0, placeholder: "e.g. 100" },
        { name: "acMinBaseFare", label: "AC Base Fare (\u20b9)", type: "number", min: 0, placeholder: "e.g. 1200" },
        { name: "acRatePerKm", label: "AC Rate/Addl KM (\u20b9)", type: "number", min: 0, placeholder: "e.g. 150" },
      ],
    },
    { name: "description", label: "Description", full: true, placeholder: "Enter route description..." },
  ];

  const pickupFields = [
    { name: "routeId", label: "Select Route", type: "select", options: routeOptions, required: true },
    { name: "pickupName", label: "Pickup Point Name", required: true, placeholder: "Enter pickup point name..." },
    { name: "sequenceNumber", label: "Sequence Number", type: "number", min: 1, required: true, placeholder: "e.g. 1" },
    { name: "distanceKm", label: "Distance from School (KM)", type: "number", min: 0, required: true, placeholder: "e.g. 10.0" },
    { name: "monthlyFee", label: "Monthly Fare (Auto-Calculated)", type: "number", min: 0, required: true, placeholder: "e.g. 1500" },
    { name: "pickupTime", label: "Morning Pickup Time", type: "time" },
    { name: "dropTime", label: "Evening Drop Time", type: "time" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ];

  const vehicleFields = [
    { name: "vehicleNumber", label: "Vehicle Number", required: true, placeholder: "e.g. AP05DC0527" },
    { name: "registrationNumber", label: "Reg Number", required: true, placeholder: "e.g. REG-SC-2026-213243" },
    { name: "vehicleType", label: "Vehicle Type", type: "select", options: ["Bus", "Mini Bus", "Van"], required: true },
    { name: "isAC", label: "AC Specification", type: "checkbox", placeholder: "AC Vehicle" },
    { name: "capacity", label: "Seating Capacity", type: "number", min: 1, required: true, placeholder: "e.g. 40" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Maintenance", "Inactive"], required: true },
    { name: "chassisNumber", label: "Chassis Number", placeholder: "e.g. CH-88219-Z3" },
    { name: "engineNumber", label: "Engine Number", placeholder: "e.g. ENG-44102-M" },
    { name: "gpsDeviceId", label: "GPS Device ID", placeholder: "e.g. GPS-DEV-9003" },
    { name: "insuranceExpiry", label: "Insurance Expiry", type: "date" },
    { name: "pollutionExpiry", label: "Pollution (PUC) Expiry", type: "date" },
    { name: "fitnessExpiry", label: "Fitness Expiry", type: "date" },
  ];

  const driverFields = [
    { name: "driverName", label: "Driver Full Name", required: true },
    { name: "employeeId", label: "Employee ID", required: true, placeholder: "e.g. EMP-DRV-101" },
    { name: "mobileNumber", label: "Mobile Number", type: "tel", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "licenseNumber", label: "Commercial License No", required: true },
    { name: "licenseExpiryDate", label: "License Expiry Date", type: "date" },
    { name: "address", label: "Address", type: "textarea", full: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Inactive"], required: true },
  ];

  const attendantFields = [
    { name: "employeeId", label: "Employee ID", required: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Inactive"], required: true },
    { name: "attendantName", label: "Attendant Name", required: true },
    { name: "mobileNumber", label: "Mobile Number", type: "tel", required: true },
    { name: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Other"], required: true },
  ];

  const assignmentFields = [
    { name: "routeId", label: "Select Route", type: "select", options: routeOptions, required: true },
    { name: "vehicleId", label: "Select Active Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "driverId", label: "Select Licensed Driver", type: "select", options: driverOptions, required: true },
    { name: "attendantId", label: "Select Bus Attendant", type: "select", options: attendantOptions },
    { name: "morningTripTime", label: "Morning Trip Time", type: "time" },
    { name: "eveningTripTime", label: "Evening Trip Time", type: "time" },
    { name: "effectiveFrom", label: "Effective From Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ];

  const maintenanceFields = [
    { name: "vehicleId", label: "Select Fleet Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "category", label: "Service Type", required: true },
    { name: "serviceDate", label: "Service Date", type: "date", required: true },
    { name: "cost", label: "Cost (₹)", type: "number", min: 0, required: true },
    { name: "vendor", label: "Vendor Center" },
    { name: "nextDueDate", label: "Next Service Due", type: "date" },
    { name: "status", label: "Status", type: "select", options: ["Scheduled", "In Progress", "Completed"], required: true },
    { name: "notes", label: "Remarks", type: "textarea", full: true },
  ];

  const studentTransportReportColumns = [
    { key: "studentName", label: "Student", strong: true },
    { key: "admissionNo", label: "Admission Number" },
    { key: "routeName", label: "Transit Route" },
    { key: "pickupPointName", label: "Pickup Point" },
    { key: "vehicleNumber", label: "Assigned Vehicle" },
    { key: "feePlan", label: "Fee Plan" },
    { key: "monthlyFee", label: "Fee Amount", currency: true },
    { key: "status", label: "Status", badge: true },
  ];

  const tripFields = [
    { name: "vehicleId", label: "Select Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "routeId", label: "Select Route", type: "select", options: routeOptions, required: true },
    { name: "driverId", label: "Select Driver", type: "select", options: driverOptions, required: true },
    { name: "attendantId", label: "Select Bus Attendant", type: "select", options: attendantOptions },
    { name: "startTime", label: "Trip Start Time", type: "time" },
    { name: "endTime", label: "Trip End Time", type: "time" },
    { name: "studentsPresent", label: "Students Present", type: "number", min: 0 },
    { name: "status", label: "Status", type: "select", options: ["Running", "Completed", "Delayed", "Cancelled"], required: true },
  ];

  const studentAssignmentFields = [
    { name: "studentName", label: "Student Full Name", required: true, placeholder: "Enter student name..." },
    { name: "admissionNo", label: "Admission Number", required: true, placeholder: "e.g. ADM-2026-001" },
    { name: "routeId", label: "Select Route", type: "select", options: routeOptions, required: true },
    { name: "vehicleId", label: "Select Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "pickupPointName", label: "Pickup Point Name", placeholder: "e.g. Clock Tower Circle" },
    { name: "monthlyFee", label: "Monthly Fare (\u20b9)", type: "number", min: 0, placeholder: "e.g. 1500" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ];

  const tableConfigs = {
    routes: {
      title: "Route Master",
      subtitle: "Manage transport route distance, timing and fare rules.",
      rows: [...routes].reverse().sort((a, b) => {
        const aCreated = Date.parse(a.createdAt);
        const bCreated = Date.parse(b.createdAt);
        if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
          return bCreated - aCreated;
        }
        const aId = Number(a.id);
        const bId = Number(b.id);
        return Number.isFinite(aId) && Number.isFinite(bId) ? bId - aId : 0;
      }),
      fields: routeFields,
      addLabel: "Add Route",
      columns: [
        { key: "routeCode", label: "Code", strong: true },
        { key: "routeName", label: "Route" },
        { key: "routeStart", label: "Start" },
        { key: "routeEnd", label: "End" },
        { key: "totalDistanceKm", label: "Distance", value: (row) => `${row.totalDistanceKm} km` },
        { key: "minBaseFare", label: "Base Fare", currency: true },
        { key: "status", label: "Status", badge: true },
      ],
    },
    pickupPoints: {
      title: "Pickup Points",
      subtitle: "Maintain ordered pickup and drop timings route-wise.",
      rows: [...pickupPoints].reverse().sort((a, b) => {
        const aCreated = Date.parse(a.createdAt);
        const bCreated = Date.parse(b.createdAt);
        if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
          return bCreated - aCreated;
        }
        const aId = Number(a.id);
        const bId = Number(b.id);
        return Number.isFinite(aId) && Number.isFinite(bId) ? bId - aId : 0;
      }),
      fields: pickupFields,
      addLabel: "Add Pickup",
      columns: [
        { key: "pickupName", label: "Pickup", strong: true },
        { key: "routeId", label: "Route", value: (row) => findRoute(row.routeId)?.routeName || row.routeName || "-" },
        { key: "sequenceNumber", label: "Seq" },
        { key: "pickupTime", label: "Pickup", value: (row) => row.pickupTime || "-" },
        { key: "dropTime", label: "Drop", value: (row) => row.dropTime || "-" },
        { key: "distanceKm", label: "Distance", value: (row) => `${row.distanceKm} km` },
        { key: "status", label: "Status", badge: true },
      ],
    },
    vehicles: {
      title: "Vehicle Master",
      subtitle: "Track buses, vans, capacities, GPS IDs and document validity.",
      rows: vehicles,
      fields: vehicleFields,
      addLabel: "Add Vehicle",
      columns: [
        { key: "vehicleNumber", label: "Vehicle", strong: true },
        { key: "vehicleType", label: "Type" },
        { key: "capacity", label: "Capacity" },
        { key: "isAC", label: "AC", value: (row) => (row.isAC ? "Yes" : "No") },
        { key: "gpsDeviceId", label: "GPS Device" },
        { key: "insuranceExpiry", label: "Insurance" },
        { key: "status", label: "Status", badge: true },
      ],
    },
    drivers: {
      title: "Driver Master",
      subtitle: driverLoadError || "Drivers for the selected campus. Assign vehicles in Vehicle Assignment.",
      rows: drivers,
      fields: driverFields,
      addLabel: undefined,
      columns: [
        { key: "employeeId", label: "Employee ID", strong: true },
        { key: "driverName", label: "Driver" },
        { key: "mobileNumber", label: "Mobile" },
        { key: "licenseNumber", label: "License" },
        { key: "licenseExpiryDate", label: "Expiry" },
        { key: "status", label: "Status", badge: true },
      ],
    },
    attendants: {
      title: "Bus Attendant Master",
      subtitle: "Manage attendant allocation-ready profiles.",
      rows: attendants,
      fields: attendantFields,
      columns: [
        { key: "employeeId", label: "Employee ID", strong: true },
        { key: "attendantName", label: "Attendant" },
        { key: "mobileNumber", label: "Mobile" },
        { key: "gender", label: "Gender" },
        { key: "branch", label: "Branch" },
        { key: "status", label: "Status", badge: true },
      ],
    },
    vehicleAssignments: {
      title: "Vehicle Assignment",
      subtitle: "Assign vehicles, drivers and attendants to active routes.",
      rows: vehicleAssignments.map((assignment) => ({
        ...assignment,
        driverName: resolveDriverName(assignment),
      })),
      fields: assignmentFields,
      addLabel: "Add Assignment",
      columns: [
        { key: "vehicleNumber", label: "Bus Number", strong: true },
        { key: "routeName", label: "Route Name" },
        { key: "driverName", label: "Driver Name" },
        { key: "attendantName", label: "Bus Attendant" },
        { key: "capacity", label: "Capacity", value: (row) => findVehicle(row.vehicleId)?.capacity || "-" },
        { key: "students", label: "Students", value: (row) => studentAssignments.filter((student) => student.vehicleId === row.vehicleId).length },
        { key: "morningTripTime", label: "Morning Trip", value: (row) => row.morningTripTime || "-" },
        { key: "eveningTripTime", label: "Evening Trip", value: (row) => row.eveningTripTime || "-" },
        { key: "status", label: "Status", badge: true },
        { key: "effectiveFrom", label: "Effective Date" },
      ],
    },
    studentAssignments: {
      title: "Student Transport Allotment",
      subtitle: "Manage student route allocations, pickup stops and transport fee plans.",
      rows: studentAssignments,
      fields: studentAssignmentFields,
      columns: studentTransportReportColumns,
    },
    trips: {
      title: "Vehicle Trips",
      subtitle: "Track daily morning and evening trip movement.",
      rows: trips,
      fields: tripFields,
      columns: [
        { key: "vehicleNumber", label: "Vehicle", strong: true },
        { key: "routeName", label: "Route" },
        { key: "tripType", label: "Trip" },
        { key: "tripDate", label: "Date" },
        { key: "startTime", label: "Start" },
        { key: "endTime", label: "End" },
        { key: "studentsPresent", label: "Students" },
        { key: "status", label: "Status", badge: true },
      ],
    },
    maintenance: {
      title: "Vehicle Maintenance",
      subtitle: "Maintain service logs, costs and next due dates.",
      rows: maintenance,
      fields: maintenanceFields,
      addLabel: "Add Service",
      columns: [
        { key: "vehicleNumber", label: "Vehicle Number", strong: true },
        { key: "category", label: "Service Type" },
        { key: "serviceDate", label: "Service Date" },
        { key: "vendor", label: "Vendor" },
        { key: "cost", label: "Cost (₹)", currency: true },
        { key: "nextDueDate", label: "Next Service Due" },
        { key: "status", label: "Status", badge: true },
      ],
    },
  };

  const setupTableFilters = {
    routes: [
      {
        name: "routes",
        label: "Filter by Route",
        options: [
          { value: "All", label: "All Routes" },
          ...routes.map((route) => ({ value: route.id, label: `${route.routeName} (${route.routeCode})` })),
        ],
      },
    ],
    pickupPoints: [
      {
        name: "pickupPoints",
        label: "Filter by Pickup Point",
        options: [
          { value: "All", label: "All Pickup Points" },
          ...routes.map((route) => ({ value: route.id, label: `${route.routeName} (${route.routeCode})` })),
        ],
      },
    ],
    vehicles: [
      {
        name: "vehicles",
        label: "Filter by Vehicle",
        options: [
          { value: "All", label: "All Vehicles" },
          ...vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.vehicleNumber} (${vehicle.registrationNumber})` })),
        ],
      },
    ],
    drivers: [
      {
        name: "drivers",
        label: "Filter by Driver",
        options: [
          { value: "All", label: "All Drivers" },
          ...drivers.map((driver) => ({ value: driver.id, label: `${driver.driverName} (${driver.employeeId})` })),
        ],
      },
    ],
    attendants: [
      {
        name: "attendants",
        label: "Filter by Bus Attendant",
        options: [
          { value: "All", label: "All Bus Attendants" },
          ...attendants.map((attendant) => ({ value: attendant.id, label: `${attendant.attendantName} (${attendant.employeeId})` })),
        ],
      },
    ],
    studentAssignments: [
      {
        name: "studentAssignments",
        label: "Filter by Route",
        options: [
          { value: "All", label: "All Routes" },
          ...routes.map((route) => ({ value: route.id, label: `${route.routeName} (${route.routeCode})` })),
        ],
      },
    ],
  };

  const filterSetupRow = (key, row) => {
    const selected = setupFilters[key];
    if (!selected || selected === "All") return true;
    if (key === "pickupPoints" || key === "studentAssignments") return String(row.routeId) === String(selected);
    return String(row.id) === String(selected);
  };

  const tripFilterFields = [
    {
      name: "route",
      label: "Filter by Route",
      options: [
        { value: "All", label: "All Routes" },
        ...routes.map((route) => ({ value: route.id, label: `${route.routeName} (${route.routeCode})` })),
      ],
    },
  ];

  const filterTripRow = (trip) => {
    if (tripFilters.route === "All") return true;
    const assignment = vehicleAssignments.find((item) => item.id === trip.assignmentId);
    const route = routes.find((item) => item.id === tripFilters.route);
    return (
      assignment?.routeId === tripFilters.route ||
      trip.routeId === tripFilters.route ||
      trip.routeName === route?.routeName ||
      trip.routeName === route?.routeCode
    );
  };

  const openTransportOperations = () => {
    setActiveSection("operations");
    setActiveOperationTab("trips");
    setQuery("");
  };

  const getTripDetailRow = (trip) => {
    const assignment = findAssignment(trip.assignmentId);
    return {
      vehicleNumber: trip.vehicleNumber || assignment?.vehicleNumber || "-",
      routeName: trip.routeName || assignment?.routeName || "-",
      tripType: trip.tripType || "-",
      tripDate: trip.tripDate || "-",
      driver: trip.driverName || assignment?.driverName || "-",
      busAttendant: trip.attendantName || assignment?.attendantName || "-",
      startTime: trip.startTime || "-",
      endTime: trip.endTime || "-",
      studentsPresent: trip.studentsPresent ?? "-",
      status: trip.status || "-",
    };
  };

  const openTripDetails = async (trip, restoring = false) => {
    if (!restoring) { routeAction("details", "trips", trip); return; }
    const fallback = getTripDetailRow(trip);
    if (!trip.assignmentId) {
      setDetailConfig({ title: "Trip Details", row: fallback });
      return;
    }
    try {
      const response = await apiClient.get(apiEndpoints.transport.dashboardOperations(trip.assignmentId));
      const details = response.data?.data ?? response.data;
      setDetailConfig({ title: "Trip Details", row: details && typeof details === "object" ? { ...fallback, ...details } : fallback });
    } catch (error) {
      setDetailConfig({ title: "Trip Details", row: fallback });
      showErrorToast(`Live operation details unavailable: ${getApiErrorMessage(error)}`);
    }
  };

  const transportStatusMetrics = [
    { label: "Active Vehicles", value: summary.activeVehicles, tone: "blue" },
    { label: "Morning Running", value: trips.filter((trip) => trip.tripType === "Morning" && trip.status === "Running").length, tone: "green" },
    { label: "Morning Completed", value: trips.filter((trip) => trip.tripType === "Morning" && trip.status === "Completed").length, tone: "blue" },
    { label: "Evening Pending", value: trips.filter((trip) => trip.tripType === "Evening" && trip.status !== "Completed").length, tone: "amber" },
    { label: "Delayed Trips", value: trips.filter((trip) => ["Delayed", "Cancelled"].includes(trip.status)).length, tone: "muted" },
    { label: "Under Maintenance", value: summary.maintenanceVehicles, tone: "red" },
  ];

  const getVehicleOccupancy = (vehicle) => {
    const assigned = studentAssignments.filter((student) => student.vehicleId === vehicle.id && student.status === "Active").length;
    const capacity = Number(vehicle.capacity) || 0;
    const percent = capacity ? Math.round((assigned / capacity) * 100) : 0;
    return { assigned, capacity, percent };
  };

  actionLoaders.current = { add: openForm, edit: openEditForm, view: openRecordDetails, delete: requestDelete, details: openTripDetails };
  const action = actionParams.get("action") || "";
  const actionId = actionParams.get("id") || "";
  const actionEntity = actionParams.get("entity") || (activeSection === "setup" ? activeSetupTab : activeSection === "operations" ? activeOperationTab : "");
  useEffect(() => {
    if (restoredAction.current === actionQuery) return undefined;
    let current = true;
    setFormConfigState(null); setDetailConfigState(null); setDeleteConfigState(null);
    setIsAddAttendantOpenState(false); setRestoringAction(false);
    if (!action) { restoredAction.current = actionQuery; return undefined; }
    if (!recordsReady || isLoading) return undefined;
    if ([["campusId", selectedCampusId], ["boardId", selectedBoardId], ["yearId", selectedAcademicYearId]].some(([name, id]) => actionParams.get(name) && String(id || "") !== actionParams.get(name))) { restoredAction.current = actionQuery; showErrorToast("This transport action belongs to a different campus, board or academic year."); return undefined; }
    const config = tableConfigs[actionEntity];
    const validEntity = activeSection === "dashboard" ? actionEntity === "trips" && action === "details" : activeSection === "setup" ? actionEntity === activeSetupTab : activeSection === "operations" && actionEntity === activeOperationTab;
    if (!config || !validEntity || !["add", "edit", "view", "delete", "details"].includes(action) || (action !== "add" && (!actionId.trim() || actionId.length > 200 || Array.from(actionId).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)))) {
      restoredAction.current = actionQuery; showErrorToast("Invalid transport action or record identifier."); return undefined;
    }
    if (action === "add" && actionEntity === "drivers") {
      restoredAction.current = actionQuery;
      closeAction();
      showErrorToast("Drivers are managed in Staff Management. Use Vehicle Assignment to assign a vehicle.");
      return undefined;
    }
    const row = config.rows.find((item) => String(actionEntity === "studentAssignments" ? getStudentTransportAssignmentId(item) : item.id) === actionId);
    if (action !== "add" && !row) {
      restoredAction.current = actionQuery; showErrorToast("The transport record is unavailable in the current campus, board or academic year, or its API could not be loaded."); return undefined;
    }
    if ((action === "add" && !config.addLabel && !["drivers", "attendants"].includes(actionEntity)) || (["edit", "add"].includes(action) && !config.fields && !["drivers", "attendants"].includes(actionEntity)) || (action === "details" && actionEntity !== "trips")) {
      restoredAction.current = actionQuery; showErrorToast("This transport action is not available for this section."); return undefined;
    }
    restoredAction.current = actionQuery;
    setRestoringAction(true);
    const restore = async () => {
      if (action === "add") {
        if (actionEntity === "attendants") setIsAddAttendantOpenState(true);
        else actionLoaders.current.add(actionEntity, config.addLabel, config.fields, null, true);
      } else if (action === "edit") await actionLoaders.current.edit(actionEntity, `Edit ${config.title}`, config.fields, row, true);
      else if (action === "view") await actionLoaders.current.view(actionEntity, row, config.title, true);
      else if (action === "delete") actionLoaders.current.delete(actionEntity, row, config.title, true);
      else await actionLoaders.current.details(row, true);
    };
    restore().catch((error) => { if (current) showErrorToast(getApiErrorMessage(error) || "Unable to restore the transport screen."); })
      .finally(() => { if (current) setRestoringAction(false); });
    return () => { current = false; };
  // The saved list data resolves IDs; restoration calls only existing read/form handlers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionQuery, action, actionId, actionEntity, recordsReady, isLoading, activeSection, activeSetupTab, activeOperationTab]);

  const renderTable = (key) => {
    const config = tableConfigs[key];
    const isTripsTable = key === "trips";
    const isSetupFilterTable = Boolean(setupTableFilters[key]);
    return (
      <TableSection
        key={key}
        {...config}
        query={query}
        onQuery={setQuery}
        filters={isTripsTable ? tripFilterFields : setupTableFilters[key]}
        filterValues={isTripsTable ? tripFilters : isSetupFilterTable ? setupFilters : undefined}
        onFilterChange={
          isTripsTable
            ? (name, value) => setTripFilters((current) => ({ ...current, [name]: value }))
            : isSetupFilterTable
              ? (name, value) => setSetupFilters((current) => ({ ...current, [name]: value }))
              : undefined
        }
        rowFilter={isTripsTable ? filterTripRow : isSetupFilterTable ? (row) => filterSetupRow(key, row) : undefined}
        printSection={activeSection === "setup" ? "Setup" : "Operations"}
        printSubsection={setupTabs.concat(operationTabs).find((tab) => tab.id === key)?.label || config.title}
        onPrint={preparePrint}
        onAdd={key === "drivers" || key === "attendants" ? undefined : config.addLabel && config.fields ? () => openForm(key, config.addLabel, config.fields) : undefined}
        onEdit={config.fields ? (row) => openEditForm(key, `Edit ${config.title}`, config.fields, row) : undefined}
        onDelete={key === "drivers" ? undefined : (row) => requestDelete(key, row, config.title)}
        onView={(row) => openRecordDetails(key, row, config.title)}
        toolbarClassName={key === "vehicles" ? "cms-transport-vehicle-toolbar" : undefined}
        tableClassName={key === "drivers" ? "cms-transport-driver-table" : undefined}
      />
    );
  };

  const exportVehicleTripsCsv = () => {
    const headers = [
      "Vehicle Number",
      "Registration Number",
      "Route",
      "Commercial Driver",
      "Driver Phone",
      "Bus Attendant",
      "Attendant Phone",
      "Morning Trip Time",
      "Evening Trip Time",
      "Assigned Students",
      "Status",
    ];
    const rows = vehicleAssignments.map((va) => {
      const v = findVehicle(va.vehicleId);
      const d = findDriver(va.driverId);
      const a = findAttendant(va.attendantId);
      const students = studentAssignments.filter((s) => (
        (s.vehicleAssignmentId && String(s.vehicleAssignmentId) === String(va.id)) ||
        (s.vehicleId && String(s.vehicleId) === String(va.vehicleId)) ||
        (!s.vehicleId && !s.vehicleAssignmentId && s.routeId && String(s.routeId) === String(va.routeId))
      ));
      return [
        va.vehicleNumber || "",
        v?.registrationNumber || "",
        va.routeName || "",
        va.driverName || d?.driverName || "",
        d?.mobileNumber || d?.phone || "",
        va.attendantName || a?.attendantName || "",
        a?.mobileNumber || a?.phone || "",
        va.morningTripTime || "07:00 AM",
        va.eveningTripTime || "03:45 PM",
        students.length,
        va.status || "Active",
      ];
    });
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vehicle-trips-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderVehicleTripsView = () => {
    const runningVehiclesCount = vehicleAssignments.filter((va) => va.status === "Active").length;
    const completedTripsCount = trips.filter((t) => t.status === "Completed").length;
    const delayedTripsCount = trips.filter((t) => ["Delayed", "Cancelled"].includes(t.status)).length;
    const offlineGpsCount = vehicleAssignments.filter((va) => {
      const v = findVehicle(va.vehicleId);
      return !v?.gpsDeviceId;
    }).length;
    const activeMorningCount = vehicleAssignments.filter((va) => va.status === "Active" && Boolean(va.morningTripTime)).length;
    const activeEveningCount = vehicleAssignments.filter((va) => va.status === "Active" && Boolean(va.eveningTripTime)).length;

    const filteredAssignments = vehicleAssignments.filter((assignment) => {
      if (tripRouteFilter !== "All" && String(assignment.routeId) !== String(tripRouteFilter)) return false;
      if (!tripSearchQuery.trim()) return true;
      const q = tripSearchQuery.toLowerCase();
      const vehicle = findVehicle(assignment.vehicleId);
      const driver = findDriver(assignment.driverId);
      const attendant = findAttendant(assignment.attendantId);
      return (
        (assignment.vehicleNumber || "").toLowerCase().includes(q) ||
        (assignment.routeName || "").toLowerCase().includes(q) ||
        (assignment.driverName || driver?.driverName || "").toLowerCase().includes(q) ||
        (assignment.attendantName || attendant?.attendantName || "").toLowerCase().includes(q) ||
        (vehicle?.registrationNumber || "").toLowerCase().includes(q)
      );
    });

    const modalVehicle = selectedTripModal ? findVehicle(selectedTripModal.vehicleId) : null;
    const modalRoute = selectedTripModal ? findRoute(selectedTripModal.routeId) : null;
    const modalDriver = selectedTripModal ? findDriver(selectedTripModal.driverId) : null;
    const modalAttendant = selectedTripModal ? findAttendant(selectedTripModal.attendantId) : null;

    const isStudentAssignedToAssignment = (s, assignment, v) => (
      (s.vehicleAssignmentId && String(s.vehicleAssignmentId) === String(assignment?.id)) ||
      (s.vehicleId && (String(s.vehicleId) === String(assignment?.vehicleId) || String(s.vehicleId) === String(v?.id))) ||
      (s.vehicleNumber && assignment?.vehicleNumber && String(s.vehicleNumber).trim().toLowerCase() === String(assignment.vehicleNumber).trim().toLowerCase()) ||
      (!s.vehicleId && !s.vehicleAssignmentId && s.routeId && String(s.routeId) === String(assignment?.routeId))
    );

    const modalAssignedStudents = selectedTripModal
      ? studentAssignments.filter((s) => isStudentAssignedToAssignment(s, selectedTripModal, modalVehicle))
      : [];

    const modalRouteStops = selectedTripModal
      ? pickupPoints.filter((stop) => String(stop.routeId) === String(selectedTripModal.routeId))
      : [];

    const filteredModalStudents = modalAssignedStudents.filter((student) => {
      if (!tripStudentSearch.trim()) return true;
      const q = tripStudentSearch.toLowerCase();
      return (
        (student.studentName || "").toLowerCase().includes(q) ||
        (student.admissionNo || "").toLowerCase().includes(q) ||
        (student.pickupPointName || "").toLowerCase().includes(q)
      );
    });

    const modalDriverName = selectedTripModal ? (selectedTripModal.driverName || modalDriver?.driverName || "Unassigned") : "";
    const modalDriverPhone = modalDriver?.mobileNumber || modalDriver?.phone || "-";
    const modalAttendantName = selectedTripModal ? (selectedTripModal.attendantName || modalAttendant?.attendantName || "Unassigned") : "";
    const modalAttendantPhone = modalAttendant?.mobileNumber || modalAttendant?.phone || "-";

    return (
      <div className="cms-transport-trips-view">
        <div className="cms-transport-trips-head">
          <div className="cms-transport-trips-head-title">
            <Bus size={26} color="var(--cms-primary, #5d7000)" />
            <div>
              <h2>Vehicle Trips</h2>
              <p>Track daily morning and evening trip movement.</p>
            </div>
          </div>
          <div className="cms-transport-trips-head-actions">
            <span className="cms-transport-date-badge">
              <Calendar size={14} />
              {new Date().toLocaleDateString("en-GB")}
            </span>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={exportVehicleTripsCsv}
              title="Download vehicle trips as CSV"
            >
              <Download size={15} /> Download
            </button>
          </div>
        </div>

        <div className="cms-transport-trips-stat-grid">
          <div className="cms-transport-trips-stat-card tone-green">
            <small>Vehicles Running</small>
            <strong>{runningVehiclesCount}</strong>
          </div>
          <div className="cms-transport-trips-stat-card tone-blue">
            <small>Trips Completed</small>
            <strong>{completedTripsCount}</strong>
          </div>
          <div className="cms-transport-trips-stat-card tone-amber">
            <small>Delayed Trips</small>
            <strong>{delayedTripsCount}</strong>
          </div>
          <div className="cms-transport-trips-stat-card tone-red">
            <small>Offline GPS Devices</small>
            <strong>{offlineGpsCount}</strong>
          </div>
          <div className="cms-transport-trips-stat-card tone-blue">
            <small>Active Morning Trips</small>
            <strong>{activeMorningCount}</strong>
          </div>
          <div className="cms-transport-trips-stat-card tone-blue">
            <small>Active Evening Trips</small>
            <strong>{activeEveningCount}</strong>
          </div>
        </div>

        <div className="cms-transport-trips-toolbar">
          <div className="cms-transport-trips-search">
            <Search size={16} />
            <input
              placeholder="Search vehicle, route, driver..."
              value={tripSearchQuery}
              onChange={(e) => setTripSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="cms-transport-trips-route-select"
            value={tripRouteFilter}
            onChange={(e) => setTripRouteFilter(e.target.value)}
          >
            <option value="All">All Routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.routeName} ({r.routeCode || "Route"})
              </option>
            ))}
          </select>
          {(tripSearchQuery || tripRouteFilter !== "All") && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost cms-btn-sm"
              onClick={() => {
                setTripSearchQuery("");
                setTripRouteFilter("All");
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="cms-transport-trips-cards-grid">
          {filteredAssignments.length === 0 ? (
            <div className="cms-card cms-transport-trip-empty" style={{ gridColumn: "1 / -1" }}>
              {vehicleAssignments.length === 0
                ? "No vehicle assignments found. Vehicles and routes configured in Operations → Vehicle Assignment will appear here."
                : "No vehicles matching your search or route filter."}
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const vehicle = findVehicle(assignment.vehicleId);
              const driver = findDriver(assignment.driverId);
              const attendant = findAttendant(assignment.attendantId);
              const students = studentAssignments.filter((s) => isStudentAssignedToAssignment(s, assignment, vehicle));
              const hasGps = Boolean(vehicle?.gpsDeviceId);
              const isRunning = assignment.status === "Active";
              const regNo = vehicle?.registrationNumber || "-";
              const driverName = assignment.driverName || driver?.driverName || "Unassigned";
              const driverPhone = driver?.mobileNumber || driver?.phone || "-";
              const attendantName = assignment.attendantName || attendant?.attendantName || "Unassigned";
              const attendantPhone = attendant?.mobileNumber || attendant?.phone || "-";

              return (
                <div key={assignment.id} className="cms-transport-trip-card">
                  <div className="cms-transport-trip-card-head">
                    <div className="cms-transport-trip-veh-meta">
                      <div className="cms-transport-trip-veh-row">
                        <span className="cms-transport-trip-veh-tag">
                          {assignment.vehicleNumber || "Vehicle"}
                        </span>
                        <h3 className="cms-transport-trip-route-name">
                          {assignment.routeName || "Route"}
                        </h3>
                      </div>
                      <span className="cms-transport-trip-reg">Reg: {regNo}</span>
                    </div>
                    <div className="cms-transport-trip-badges">
                      <span className={`cms-transport-pill ${isRunning ? "pill-running" : "pill-inactive"}`}>
                        {isRunning ? "Running" : "Inactive"}
                      </span>
                      <span className={`cms-transport-pill ${hasGps ? "pill-gps-active" : "pill-gps-offline"}`}>
                        {hasGps ? "GPS Active" : "GPS Offline"}
                      </span>
                    </div>
                  </div>

                  <div className="cms-transport-trip-crew-box">
                    <div className="cms-transport-trip-crew-col">
                      <span className="cms-transport-trip-crew-label">
                        <Bus size={12} /> Commercial Driver
                      </span>
                      <span className="cms-transport-trip-crew-name" title={driverName}>
                        {driverName}
                      </span>
                      <span className="cms-transport-trip-crew-phone">
                        {driverPhone}
                      </span>
                    </div>
                    <div className="cms-transport-trip-crew-col">
                      <span className="cms-transport-trip-crew-label">
                        <UserCheck size={12} /> Bus Attendant
                      </span>
                      <span className="cms-transport-trip-crew-name" title={attendantName}>
                        {attendantName}
                      </span>
                      <span className="cms-transport-trip-crew-phone">
                        {attendantPhone}
                      </span>
                    </div>
                  </div>

                  <div className="cms-transport-trip-card-foot">
                    <button
                      type="button"
                      className="cms-transport-trip-student-pill"
                      style={{ cursor: "pointer", border: "none", background: "transparent", padding: 0, font: "inherit", color: "inherit", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      onClick={() => {
                        setSelectedTripModal(assignment);
                        setTripModalTab("students");
                        setTripStudentSearch("");
                      }}
                      title="Click to view assigned students"
                    >
                      <Users size={14} /> {students.length} Student{students.length === 1 ? "" : "s"} Assigned
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary cms-btn-sm"
                      onClick={() => {
                        setSelectedTripModal(assignment);
                        setTripModalTab("overview");
                        setTripStudentSearch("");
                      }}
                    >
                      <Eye size={14} /> View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {selectedTripModal && (
          <div
            className="cms-transport-trip-modal-overlay"
            onClick={() => setSelectedTripModal(null)}
          >
            <div
              className="cms-transport-trip-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cms-transport-trip-modal-banner">
                <div className="cms-transport-trip-modal-banner-top">
                  <div className="cms-transport-trip-modal-banner-veh">
                    <span className="cms-transport-trip-modal-veh-pill">
                      {selectedTripModal.vehicleNumber}
                    </span>
                    <span className="cms-transport-trip-modal-route-title">
                      {selectedTripModal.routeName}
                    </span>
                    <span className="cms-transport-trip-modal-status">
                      {selectedTripModal.status === "Active" ? "Running" : "Inactive"}
                    </span>
                    {selectedTripModal.effectiveFrom && (
                      <span className="cms-transport-trip-modal-effective">
                        Effective From: {selectedTripModal.effectiveFrom}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="cms-transport-trip-modal-close-btn"
                    onClick={() => setSelectedTripModal(null)}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="cms-transport-trip-modal-strip">
                  <div className="cms-transport-trip-modal-strip-item">
                    <small>Driver</small>
                    <strong title={`${modalDriverName} (${modalDriverPhone})`}>
                      {modalDriverName}
                    </strong>
                  </div>
                  <div className="cms-transport-trip-modal-strip-item">
                    <small>Bus Attendant</small>
                    <strong title={`${modalAttendantName} (${modalAttendantPhone})`}>
                      {modalAttendantName}
                    </strong>
                  </div>
                  <div className="cms-transport-trip-modal-strip-item">
                    <small>Morning Trip</small>
                    <strong>{selectedTripModal.morningTripTime || "07:00 AM"}</strong>
                  </div>
                  <div className="cms-transport-trip-modal-strip-item">
                    <small>Evening Trip</small>
                    <strong>{selectedTripModal.eveningTripTime || "03:45 PM"}</strong>
                  </div>
                  <div className="cms-transport-trip-modal-strip-item">
                    <small>Capacity</small>
                    <strong>{modalVehicle?.capacity || 40} Seats</strong>
                  </div>
                  <div className="cms-transport-trip-modal-strip-item">
                    <small>Assigned Students</small>
                    <strong>{modalAssignedStudents.length}</strong>
                  </div>
                </div>
              </div>

              <div className="cms-transport-trip-modal-tabs">
                <button
                  type="button"
                  className={`cms-transport-trip-modal-tab-btn ${tripModalTab === "overview" ? "is-active" : ""}`}
                  onClick={() => setTripModalTab("overview")}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={`cms-transport-trip-modal-tab-btn ${tripModalTab === "morning" ? "is-active" : ""}`}
                  onClick={() => setTripModalTab("morning")}
                >
                  Morning Trip
                </button>
                <button
                  type="button"
                  className={`cms-transport-trip-modal-tab-btn ${tripModalTab === "evening" ? "is-active" : ""}`}
                  onClick={() => setTripModalTab("evening")}
                >
                  Evening Trip
                </button>
                <button
                  type="button"
                  className={`cms-transport-trip-modal-tab-btn ${tripModalTab === "students" ? "is-active" : ""}`}
                  onClick={() => setTripModalTab("students")}
                >
                  Student List{" "}
                  <span className="cms-transport-trip-modal-tab-count">
                    {modalAssignedStudents.length}
                  </span>
                </button>
                <button
                  type="button"
                  className={`cms-transport-trip-modal-tab-btn ${tripModalTab === "history" ? "is-active" : ""}`}
                  onClick={() => setTripModalTab("history")}
                >
                  Trip History
                </button>
              </div>

              <div className="cms-transport-trip-modal-body">
                {tripModalTab === "overview" && (
                  <div className="cms-transport-trip-overview-grid">
                    <div className="cms-transport-trip-overview-col">
                      <div className="cms-transport-trip-overview-row">
                        <span>Vehicle Number:</span>
                        <strong>{selectedTripModal.vehicleNumber}</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Registration Number:</span>
                        <strong>{modalVehicle?.registrationNumber || "-"}</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Assigned Route:</span>
                        <strong>{selectedTripModal.routeName}</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Commercial Driver:</span>
                        <strong>{modalDriverName}</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Bus Attendant:</span>
                        <strong>{modalAttendantName}</strong>
                      </div>
                    </div>
                    <div className="cms-transport-trip-overview-col">
                      <div className="cms-transport-trip-overview-row">
                        <span>Total Pickup Points:</span>
                        <strong>{modalRouteStops.length} Configured Stops</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Total Assigned Students:</span>
                        <strong>{modalAssignedStudents.length} Enrolled</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Total Route Distance:</span>
                        <strong>{modalRoute?.totalDistanceKm ? `${modalRoute.totalDistanceKm} KM` : "-"}</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Estimated Trip Duration:</span>
                        <strong>{modalRoute?.estimatedTimeMinutes ? `${modalRoute.estimatedTimeMinutes} Minutes` : "-"}</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Morning Departure / Arrival:</span>
                        <strong>{selectedTripModal.morningTripTime || "07:00 AM"}</strong>
                      </div>
                      <div className="cms-transport-trip-overview-row">
                        <span>Evening Departure / Arrival:</span>
                        <strong>{selectedTripModal.eveningTripTime || "03:45 PM"}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {tripModalTab === "morning" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", padding: "14px", background: "var(--cms-bg, #f7f9f3)", borderRadius: "10px", border: "1px solid var(--cms-border, #dce2d0)" }}>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>SCHEDULED DEPARTURE</small>
                        <strong style={{ fontSize: "1rem" }}>{selectedTripModal.morningTripTime || "07:00 AM"}</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>ROUTE PATH</small>
                        <strong style={{ fontSize: "0.95rem" }}>{modalRoute?.routeStart || "Campus"} → {modalRoute?.routeEnd || modalRoute?.routeName || "Destination"}</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>COMMERCIAL DRIVER</small>
                        <strong style={{ fontSize: "0.95rem" }}>{modalDriverName} ({modalDriverPhone})</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>STATUS</small>
                        <span className="cms-transport-pill pill-running">Scheduled / Running</span>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: "700" }}>Configured Pickup Stops ({modalRouteStops.length})</h4>
                      {modalRouteStops.length === 0 ? (
                        <p style={{ color: "var(--cms-muted)", fontSize: "0.88rem" }}>No stops configured for this route.</p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table className="cms-table" style={{ width: "100%" }}>
                            <thead>
                              <tr>
                                <th style={{ width: "40px" }}>Stop</th>
                                <th>Stop Name</th>
                                <th>Pickup Time</th>
                                <th>Location / Landmark</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modalRouteStops.map((stop, sIdx) => (
                                <tr key={stop.id || sIdx}>
                                  <td><strong>{sIdx + 1}</strong></td>
                                  <td>{stop.pickupPointName || stop.pointName || "-"}</td>
                                  <td>{stop.pickupTime || stop.morningTime || "-"}</td>
                                  <td>{stop.location || stop.landmark || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tripModalTab === "evening" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", padding: "14px", background: "var(--cms-bg, #f7f9f3)", borderRadius: "10px", border: "1px solid var(--cms-border, #dce2d0)" }}>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>SCHEDULED DEPARTURE</small>
                        <strong style={{ fontSize: "1rem" }}>{selectedTripModal.eveningTripTime || "03:45 PM"}</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>RETURN ROUTE</small>
                        <strong style={{ fontSize: "0.95rem" }}>{modalRoute?.routeEnd || modalRoute?.routeName || "Destination"} → {modalRoute?.routeStart || "Campus"}</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>BUS ATTENDANT</small>
                        <strong style={{ fontSize: "0.95rem" }}>{modalAttendantName} ({modalAttendantPhone})</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--cms-muted, #737b68)", display: "block", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: "700" }}>STATUS</small>
                        <span className="cms-transport-pill pill-running">Scheduled / Running</span>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: "700" }}>Drop Off Stops ({modalRouteStops.length})</h4>
                      {modalRouteStops.length === 0 ? (
                        <p style={{ color: "var(--cms-muted)", fontSize: "0.88rem" }}>No stops configured for this route.</p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table className="cms-table" style={{ width: "100%" }}>
                            <thead>
                              <tr>
                                <th style={{ width: "40px" }}>Stop</th>
                                <th>Stop Name</th>
                                <th>Drop Time</th>
                                <th>Location / Landmark</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modalRouteStops.map((stop, sIdx) => (
                                <tr key={stop.id || sIdx}>
                                  <td><strong>{sIdx + 1}</strong></td>
                                  <td>{stop.pickupPointName || stop.pointName || "-"}</td>
                                  <td>{stop.dropTime || stop.eveningTime || "-"}</td>
                                  <td>{stop.location || stop.landmark || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tripModalTab === "students" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.92rem", fontWeight: "700", color: "var(--cms-text, #20251b)" }}>
                        Enrolled Students ({modalAssignedStudents.length})
                      </span>
                      <div className="cms-transport-search" style={{ maxWidth: "300px" }}>
                        <Search size={14} />
                        <input
                          placeholder="Search student by name or admission..."
                          value={tripStudentSearch}
                          onChange={(e) => setTripStudentSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    {filteredModalStudents.length === 0 ? (
                      <div className="cms-transport-trip-empty">
                        {modalAssignedStudents.length === 0
                          ? "No students currently assigned to this vehicle. Students assigned in Student Transport will automatically appear here."
                          : "No students matching your search."}
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table className="cms-table" style={{ width: "100%" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "40px" }}>#</th>
                              <th>Admission No</th>
                              <th>Student Name</th>
                              <th>Pickup Stop</th>
                              <th>Fee Plan</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredModalStudents.map((student, idx) => (
                              <tr key={student.id || student.studentId || idx}>
                                <td>{idx + 1}</td>
                                <td><strong>{student.admissionNo || "-"}</strong></td>
                                <td>{student.studentName || "-"}</td>
                                <td>{student.pickupPointName || "-"}</td>
                                <td>{student.feePlan || "-"}</td>
                                <td>
                                  <StatusBadge value={student.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tripModalTab === "history" && (
                  <div>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: "700" }}>Vehicle Trip Logs</h4>
                    {trips.filter((t) => String(t.vehicleId) === String(selectedTripModal.vehicleId) || String(t.assignmentId) === String(selectedTripModal.id)).length === 0 ? (
                      <div style={{ padding: "16px", background: "var(--cms-bg, #f7f9f3)", borderRadius: "8px", fontSize: "0.88rem", color: "var(--cms-muted, #737b68)", border: "1px solid var(--cms-border, #dce2d0)" }}>
                        No completed trip logs recorded in backend for this vehicle yet. Today's scheduled morning and evening runs are active.
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table className="cms-table" style={{ width: "100%" }}>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Trip Type</th>
                              <th>Start Time</th>
                              <th>End Time</th>
                              <th>Students Present</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trips
                              .filter((t) => String(t.vehicleId) === String(selectedTripModal.vehicleId) || String(t.assignmentId) === String(selectedTripModal.id))
                              .map((t, tIdx) => (
                                <tr key={t.id || tIdx}>
                                  <td>{t.tripDate || "-"}</td>
                                  <td>{t.tripType || "-"}</td>
                                  <td>{t.startTime || "-"}</td>
                                  <td>{t.endTime || "-"}</td>
                                  <td>{t.studentsPresent || "-"}</td>
                                  <td><StatusBadge value={t.status} /></td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="cms-transport-stack">
      <div className="cms-transport-stat-grid">
        <StatCard icon={Bus} label="Total Vehicles" value={summary.totalVehicles} hint={`(${summary.activeVehicles} Active)`} tone="blue" />
        <StatCard icon={Route} label="Active Routes" value={summary.activeRoutes} hint={`${pickupPoints.length} pickup points`} tone="green" />
        <StatCard icon={Users} label="Total Drivers" value={summary.totalDrivers} hint={`(${summary.activeDrivers} Active)`} tone="blue" />
        <StatCard icon={UserCheck} label="Total Bus Attendants" value={summary.totalAttendants} tone="violet" />
        <StatCard icon={CheckCircle} label="Students Using Transport" value={summary.activeStudents} hint={`${summary.utilization}% capacity used`} tone="green" />
        <StatCard icon={Wrench} label="Vehicles Under Maintenance" value={summary.maintenanceVehicles} tone="amber" />
        <StatCard icon={FileText} label="Expiring Vehicle Documents" value={summary.expiringDocs} tone="red" />
        <StatCard icon={AlertTriangle} label="Expiring Driver Licenses" value={summary.expiringLicenses} tone="red" />
      </div>

      {(summary.expiringDocs || summary.expiringLicenses) ? (
        <div className="cms-transport-warning">
          <AlertTriangle size={18} />
          <span><strong>Regulatory Compliance Warning</strong> {summary.expiringDocs} vehicle document(s) and {summary.expiringLicenses} driver license(s) expiring soon.
            {summary.expiringLicenseDrivers.length ? ` Drivers: ${summary.expiringLicenseDrivers.map((driver) => `${driver.driverName} (${driver.licenseExpiryDate})`).join(", ")}.` : ""}
          </span>
          <em>Action Required</em>
        </div>
      ) : null}

      <div className="cms-card">
          <div className="cms-card-head cms-transport-status-head">
            <div>
              <h2>Today's Transport Status</h2>
              <p>Current trip activity and assignment readiness from live operations.</p>
            </div>
            <button type="button" className="cms-btn cms-btn-primary cms-transport-open-ops" onClick={openTransportOperations}>
              Open Transport Operations <ArrowRight size={15} />
            </button>
          </div>
          <div className="cms-card-body">
            <div className="cms-transport-status-metrics">
              {transportStatusMetrics.map((metric) => (
                <div key={metric.label} className={`cms-transport-status-metric tone-${metric.tone}`}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
            <div className="cms-transport-trip-list">
              {trips.length === 0 ? (
                <div className="cms-transport-empty" style={{ padding: "1.5rem", textAlign: "center" }}>
                  No vehicle trip activity recorded today.
                </div>
              ) : (
                trips.map((trip, tripIndex) => {
                  const assignment = findAssignment(trip.assignmentId);
                  return (
                    <div key={`${trip.id}-${trip.tripDate}-${trip.tripType}-${tripIndex}`} className="cms-transport-trip">
                      <span className="cms-transport-trip-info">
                        <strong>{trip.vehicleNumber}</strong>
                        <small>{trip.routeName} - {trip.tripType}</small>
                        <small>Driver: {trip.driverName || assignment?.driverName || "-"} &middot; Attendant: {trip.attendantName || assignment?.attendantName || "-"}</small>
                      </span>
                      <span className="cms-transport-trip-actions">
                        <StatusBadge value={trip.status} />
                        <button type="button" className="cms-transport-details-btn" onClick={() => openTripDetails(trip)}>
                          <Eye size={14} /> Details
                        </button>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      </div>

      <div className="cms-transport-two-col">
        <div className="cms-card">
          <div className="cms-card-head"><h2><BarChart3 size={20} /> Vehicle Seat Occupancy Matrix</h2></div>
          <div className="cms-card-body">
            <div className="cms-transport-occupancy">
              {vehicles.length === 0 ? (
                <p className="cms-transport-empty" style={{ margin: "1rem 0" }}>No vehicles registered yet.</p>
              ) : (
                vehicles.map((vehicle, vehicleIndex) => {
                  const { assigned, capacity, percent } = getVehicleOccupancy(vehicle);
                  return (
                    <div key={`${vehicle.id}-${vehicleIndex}`}>
                      <span><strong>{vehicle.vehicleNumber} ({vehicle.vehicleType})</strong><small>{assigned} / {capacity} Seats ({percent}%)</small></span>
                      <div className="cms-transport-progress"><i style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="cms-card">
          <div className="cms-card-head"><h2><PieChart size={20} /> Route-wise Student Distribution</h2></div>
          <div className="cms-card-body">
            <div className="cms-transport-route-distribution">
              {routes.length === 0 ? (
                <p className="cms-transport-empty" style={{ margin: "1rem 0" }}>No transport routes registered yet.</p>
              ) : (
                routes.map((route, routeIndex) => {
                  const students = studentAssignments.filter((student) => student.routeId === route.id && student.status === "Active").length;
                  return (
                    <div key={`${route.id}-${routeIndex}`}>
                      <span>
                        <strong>{route.routeName}</strong>
                        <small>{route.routeCode} &bull; {route.totalDistanceKm} KM</small>
                      </span>
                      <em>{students} Student{students === 1 ? "" : "s"}</em>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGpsCards = () => (
    <div className="cms-transport-gps-grid">
      {gpsSnapshots.length === 0 ? (
        <div className="cms-transport-empty" style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center" }}>
          No active GPS vehicle tracking telemetry available.
        </div>
      ) : (
        gpsSnapshots.map((snapshot, snapshotIndex) => (
          <div key={`${snapshot.id}-${snapshotIndex}`} className="cms-transport-gps-card">
            <div>
              <strong>{snapshot.vehicleNumber}</strong>
              <StatusBadge value={snapshot.status} />
            </div>
            <p>{snapshot.routeName}</p>
            <InfoGrid
              items={[
                { label: "Speed", value: snapshot.speed == null ? "-" : `${snapshot.speed} km/h` },
                { label: "Next Stop", value: snapshot.nextStop },
                { label: "Last Sync", value: snapshot.lastUpdated },
                { label: "Coordinates", value: snapshot.latitude == null || snapshot.longitude == null ? "-" : `${snapshot.latitude}, ${snapshot.longitude}` },
              ]}
            />
            <div className="cms-transport-mapline">
              <span />
              <span />
              <span />
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderReports = () => {
    // Reports are read-only projections from their dedicated API, not master lists.
    const reportRows = reportApiRows[activeReportTab] ?? [];
    const fallbackReportColumns = activeReportTab === "student-transport-reports"
      ? studentTransportReportColumns
      : activeReportTab === "route-reports"
        ? tableConfigs.routes.columns
        : activeReportTab === "vehicle-reports"
          ? tableConfigs.vehicles.columns
          : activeReportTab === "driver-reports"
            ? tableConfigs.drivers.columns
            : activeReportTab === "maintenance-reports"
            ? tableConfigs.maintenance.columns
            : activeReportTab === "trip-reports"
              ? tableConfigs.trips.columns
              : activeReportTab === "transport-dashboard-report"
                ? tableConfigs.vehicleAssignments.columns
                : [{ key: "name", label: "Report Item" }, { key: "value", label: "Value" }];
    const excludedReportColumnKeys = activeReportTab === "student-transport-reports"
      ? new Set(["assignmentid", "id"])
      : activeReportTab === "pickup-wise-reports"
      ? new Set(["pickuppointid", "pickupid"])
      : activeReportTab === "seat-occupancy-reports"
      ? new Set(["vehicleid"])
      : activeReportTab === "maintenance-reports"
        ? new Set(["maintenanceid", "id"])
        : new Set();
    const reportColumns = reportColumnsFromRows(reportRows, fallbackReportColumns)
      .filter((column) => !excludedReportColumnKeys.has(String(column.key).replace(/[_-]/g, "").toLowerCase()));
    const filterOption = (value, label) => ({ value, label });
    const routeFilterOptions = [
      filterOption("All", "All Routes"),
      ...routes.map((route) => filterOption(route.id, `${route.routeName} (${route.routeCode})`)),
    ];
    const vehicleFilterOptions = [
      filterOption("All", "All Vehicles"),
      ...vehicles.map((vehicle) => filterOption(vehicle.id, `${vehicle.vehicleNumber} (${vehicle.registrationNumber})`)),
    ];
    const statusFilterOptions = [
      filterOption("All", "All Statuses"),
      ...Array.from(new Set(reportRows.map((row) => row.status).filter(Boolean))).map((status) => filterOption(status, status)),
    ];
    const reportFilterFields = {
      "transport-dashboard-report": [
        { name: "route", label: "Route Filter", options: routeFilterOptions },
        { name: "status", label: "Status Filter", options: statusFilterOptions },
      ],
      "trip-reports": [
        { name: "route", label: "Route Filter", options: routeFilterOptions },
        { name: "vehicle", label: "Vehicle Filter", options: vehicleFilterOptions },
        { name: "status", label: "Status Filter", options: statusFilterOptions },
      ],
      "vehicle-reports": [
        { name: "vehicle", label: "Vehicle Filter", options: vehicleFilterOptions },
        { name: "status", label: "Status Filter", options: statusFilterOptions },
      ],
      "driver-reports": [
        { name: "status", label: "Status Filter", options: statusFilterOptions },
      ],
      "route-reports": [
        { name: "route", label: "Route Filter", options: routeFilterOptions },
        { name: "status", label: "Status Filter", options: statusFilterOptions },
      ],
      "student-transport-reports": [
        { name: "route", label: "Route Filter", options: routeFilterOptions },
        { name: "vehicle", label: "Vehicle Filter", options: vehicleFilterOptions },
        { name: "status", label: "Status Filter", options: statusFilterOptions },
      ],
      "maintenance-reports": [
        { name: "vehicle", label: "Vehicle Filter", options: vehicleFilterOptions },
        { name: "status", label: "Status Filter", options: statusFilterOptions },
      ],
      "pickup-wise-reports": [
        { name: "route", label: "Route Filter", options: routeFilterOptions },
      ],
      "seat-occupancy-reports": [
        { name: "vehicle", label: "Vehicle Filter", options: vehicleFilterOptions },
      ],
      "monthly-cost-reports": [
        { name: "vehicle", label: "Vehicle Filter", options: vehicleFilterOptions },
      ],
    };
    const needsCompactReportToolbar = activeReportTab === "trip-reports" || activeReportTab === "student-transport-reports";
    const activeReportDefinition = reportDefinitions[activeReportTab];
    const reportFilename = activeReportDefinition?.filename || "transport-report";

    return (
      <div className="cms-transport-stack">
        <ReportTabsNavigation
          tabs={reportTabs}
          active={activeReportTab}
          onChange={(tab) => {
            setActiveReportTab(tab);
            setQuery("");
            setReportFilters({ route: "All", vehicle: "All", status: "All" });
          }}
        />
        {activeReportTab === "transport-dashboard-report" ? (
          <div className="cms-transport-stat-grid">
            {reportRows.map((row) => <StatCard key={row.metric} icon={BarChart3} label={row.metric} value={row.value} hint={row.status} tone="blue" />)}
          </div>
        ) : null}
        {reportLoading ? <SkeletonTable columns={6} rows={5} /> : null}
        {!reportLoading ? <TableSection
          title="Transport Report"
          subtitle="Live data from the selected transport report API."
          rows={reportRows}
          columns={reportColumns}
          query={query}
          onQuery={setQuery}
          filters={reportFilterFields[activeReportTab]}
          filterValues={reportFilters}
          onFilterChange={(name, value) => setReportFilters((current) => ({ ...current, [name]: value }))}
          printSection="Reports"
          printSubsection={reportTabs.find((tab) => tab.id === activeReportTab)?.label || "Transport Report"}
          exportFilename={`${reportFilename}.csv`}
          onPrint={preparePrint}
          toolbarClassName={`cms-transport-report-toolbar${needsCompactReportToolbar ? " cms-transport-report-toolbar-compact" : ""}`}
          tableClassName="cms-transport-report-table"
          onPdfExport={async (report) => {
            try { await exportTablePdf(`${reportFilename}.pdf`, report); }
            catch (error) { showErrorToast(`Unable to export PDF: ${getApiErrorMessage(error)}`); }
          }}
        /> : null}
      </div>
    );
  };

  const renderActiveSection = () => {
    if (activeSection === "dashboard") return renderDashboard();
    if (activeSection === "setup") {
      return (
        <div className="cms-transport-stack">
          <TransportTabs tabs={setupTabs} active={activeSetupTab} onChange={(tab) => { setActiveSetupTab(tab); setQuery(""); }} compact />
          {renderTable(activeSetupTab)}
        </div>
      );
    }
    if (activeSection === "operations") {
      const activeOperationsTab = operationTabs.some((tab) => tab.id === activeOperationTab) ? activeOperationTab : "vehicleAssignments";
      return (
        <div className="cms-transport-stack">
          <TransportTabs tabs={operationTabs} active={activeOperationsTab} onChange={(tab) => { setActiveOperationTab(tab); setQuery(""); }} compact />
          {activeOperationsTab === "gps" ? (
            <div className="cms-card">
              <div className="cms-card-head">
                <div>
                  <h2>GPS Tracking</h2>
                  <p>Real-time location status and telemetry for active transport vehicles.</p>
                </div>
              </div>
              <div className="cms-card-body">{renderGpsCards()}</div>
            </div>
          ) : activeOperationsTab === "trips" ? (
            renderVehicleTripsView()
          ) : renderTable(activeOperationsTab)}
        </div>
      );
    }
    if (activeSection === "reports") return renderReports();
    return renderDashboard();
  };

  return (
    <DashboardLayout
      title="Transport Management"
      subtitle="Manage transport routes, vehicles, assignments, trips, GPS and reports."
      breadcrumb={["Student"]}
    >
      <div className="cms-transport-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <TransportTabs active={activeSection} tabs={sectionTabs} onChange={(tab) => { setActiveSection(tab); setQuery(""); }} />
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
            title="Sync Live Data with Backend"
            onClick={fetchTransportData}
            disabled={isLoading}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
            <span>{isLoading ? "Syncing..." : "Sync Live Data"}</span>
          </button>
        </div>
        {renderActiveSection()}
      </div>

      {restoringAction && !formConfig && !detailConfig && !deleteConfig && !isAddAttendantOpen ? <Modal title="Loading transport record" onClose={closeAction}><SkeletonTable columns={3} rows={3} /></Modal> : null}
      {formConfig?.key === "pickupPoints" && !formConfig.record?.id ? (
        <AddPickupPointsModal
          routes={routes}
          pickupPoints={pickupPoints}
          isSaving={isFormSubmitting}
          onCancel={(hasSaved) => { if (!isFormSubmitting) { setFormConfig(null); if (hasSaved) fetchTransportData(); } }}
          onSave={saveForm}
        />
      ) : formConfig ? (
        <FormModal
          title={formConfig.title}
          fields={formConfig.fields}
          initial={formConfig.record || {}}
          columns={formConfig.key === "routes" ? 2 : 3}
          className={formConfig.key === "pickupPoints"
            ? "cms-transport-form-modal cms-transport-pickup-modal"
            : formConfig.key === "vehicles"
              ? "cms-transport-form-modal cms-transport-vehicle-modal"
              : "cms-transport-form-modal"}
          onCancel={() => { if (!isFormSubmitting) setFormConfig(null); }}
          onSave={saveForm}
          awaitSave
          savingLabel={<span className="cms-transport-action-loading"><i aria-hidden="true" />{formConfig.record?.id ? "Updating..." : "Adding..."}</span>}
        />
      ) : null}

      {isAddAttendantOpen ? (
        <AddAttendantModal
          staff={nonTeachingStaff}
          isSaving={isFormSubmitting}
          onCancel={() => { if (!isFormSubmitting) setIsAddAttendantOpen(false); }}
          onSave={saveNewAttendant}
        />
      ) : null}

      {detailConfig ? (
        <Modal
          title={detailConfig.title}
          className="cms-transport-detail-modal"
          onClose={() => setDetailConfig(null)}
        >
          <TransportDetailTable row={detailConfig.row} />
        </Modal>
      ) : null}

      {deleteConfig ? (
        <ConfirmDialog
          danger
          title="Delete transport record"
          message={`Are you sure you want to delete this ${deleteConfig.label.toLowerCase()} record?`}
          onCancel={() => { if (!isDeleteSubmitting) setDeleteConfig(null); }}
          onConfirm={confirmDelete}
          confirmLabel="Delete"
          loading={isDeleteSubmitting}
          loadingLabel={<span className="cms-transport-action-loading"><i aria-hidden="true" />Deleting...</span>}
        />
      ) : null}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
      {printPayload ? createPortal(
        <div className="cms-transport-print-root">
          <header className="cms-transport-print-header">
            <strong>Pirnav College</strong>
            <h1>Transport Management</h1>
            <p>Current Section: {printPayload.section} / {printPayload.subsection}</p>
            {printPayload.subtitle ? <small>{printPayload.subtitle}</small> : null}
          </header>
          <div className="cms-transport-print-meta">
            {printPayload.query.trim() ? <span>Search: {printPayload.query.trim()}</span> : null}
            {printPayload.filters.map((filter) => <span key={filter.label}>{filter.label}: {filter.value}</span>)}
            <span>Matching records: {printPayload.rows.length}</span>
            <span>Screen page: {printPayload.page} of {printPayload.totalPages}</span>
          </div>
          <table>
            <thead><tr>{printPayload.rows.length ? printPayload.columns.map((column) => <th key={column.key}>{column.label}</th>) : <th>Records</th>}</tr></thead>
            <tbody>
              {printPayload.rows.length ? printPayload.rows.map((row, rowIndex) => <tr key={`${row.id ?? "print-row"}-${rowIndex}`}>
                {printPayload.columns.map((column) => <td key={column.key}>{getColumnValue(row, column)}</td>)}
              </tr>) : <tr><td>No records found.</td></tr>}
            </tbody>
          </table>
        </div>,
        document.body,
      ) : null}
    </DashboardLayout>
  );
}
