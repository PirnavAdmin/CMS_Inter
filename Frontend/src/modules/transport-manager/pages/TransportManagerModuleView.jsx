import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTransportNavigation, useTransportRouteValue, validTransportPage } from "../TransportManagerContext.jsx";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bus,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  IndianRupee,
  MapPin,
  PieChart,
  Plus,
  Printer,
  RefreshCw,
  Route,
  Search,
  Trash2,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { ConfirmDialog, FormModal, Modal, SkeletonTable, StatusBadge, Toast } from "@/shared/components/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import apiEndpoints from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useTransportManagerSafe } from "../TransportManagerContext.jsx";
import "@/modules/admin/AdminTransport/TransportPage.css";

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

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
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
  const candidates = [
    record.id,
    record.assignmentId,
    record.AssignmentId,
    record.studentAssignmentId,
    record.StudentAssignmentId,
    record.transportAssignmentId,
    record.TransportAssignmentId,
  ];
  const id = candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
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
  }).slice(0, 9);
  if (!keys.length) return fallback;
  return keys.map((key) => ({
    key,
    label: key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
  }));
}

function TransportTabs({ tabs, active, onChange, compact = false }) {
  return (
    <div className={`cms-transport-tabs ${compact ? "is-compact" : ""}`.trim()}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={`cms-transport-tab ${active === tab.id ? "is-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
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
  const navigation = useTransportNavigation();
  const [page, setPage] = useTransportRouteValue(navigation, "page", 1, validTransportPage);
  const hasRowActions = Boolean(onView || onEdit || onDelete);
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
                  {hasRowActions ? (
                    <td>
                      <div className="cms-transport-actions">
                        {onView ? <button type="button" className="cms-action-btn" title="View details" onClick={() => onView(row)}><Eye size={15} /></button> : null}
                        {onEdit ? <button type="button" className="cms-action-btn" title="Edit" onClick={() => onEdit(row)}><Edit3 size={15} /></button> : null}
                        {onDelete ? <button type="button" className="cms-action-btn danger" title="Delete" onClick={() => onDelete(row)}><Trash2 size={15} /></button> : null}
                      </div>
                    </td>
                  ) : null}
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
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="transport-pickup-label" htmlFor={`${field.name}-${point.key}`}>{field.label} {field.required && <span>*</span>}</label>
                      <input id={`${field.name}-${point.key}`} type={field.type} required={field.required} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? "any" : undefined} placeholder={field.placeholder} value={point[field.name]} onChange={(event) => updatePoint(point.key, field.name, event.target.value)} />
                    </div>
                  ))}
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

function AddDriverModal({ drivers, isSaving, onCancel, onSave }) {
  const [values, setValues] = useState({
    staffId: "",
    driverName: "",
    employeeId: "",
    mobileNumber: "",
    email: "",
    licenseNumber: "",
    licenseExpiryDate: "",
    address: "",
    status: "Active",
  });
  const [error, setError] = useState("");

  const update = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  const selectStaffDriver = (staffId) => {
    const driver = drivers.find((item) => String(item.id) === String(staffId));
    setError("");
    setValues((current) => ({
      ...current,
      staffId,
      driverName: driver?.driverName || "",
      employeeId: driver?.employeeId || "",
      mobileNumber: driver?.mobileNumber || "",
      email: driver?.email || "",
      address: driver?.address || "",
    }));
  };
  const submit = async () => {
    if (!values.staffId || !values.driverName || !values.employeeId || !values.mobileNumber || !values.licenseNumber) {
      setError("Select a driver and complete all required fields.");
      return;
    }
    await onSave(values);
  };

  return (
    <Modal
      title="Add Driver"
      className="cms-transport-add-driver-modal"
      onClose={isSaving ? () => {} : onCancel}
      footer={
        <>
          <button type="button" className="cms-btn cms-btn-ghost" disabled={isSaving} onClick={onCancel}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-primary" disabled={isSaving} onClick={submit}>
            {isSaving ? <span className="cms-transport-action-loading"><i aria-hidden="true" />Adding...</span> : "Save"}
          </button>
        </>
      }
    >
      <div className="cms-form-grid cols-3 cms-transport-add-driver-form">
        <label className="cms-field full">
          <span>Select Driver from Non-Teaching Staff <span className="required-star">*</span></span>
          <select value={values.staffId} disabled={isSaving} onChange={(event) => selectStaffDriver(event.target.value)}>
            <option value="">Select Driver</option>
            {drivers.map((driver, driverIndex) => <option key={`${driver.id}-${driverIndex}`} value={driver.id}>{driver.driverName} ({driver.employeeId})</option>)}
          </select>
        </label>
        <label className="cms-field">
          <span>Driver Full Name <span className="required-star">*</span></span>
          <input value={values.driverName} readOnly />
        </label>
        <label className="cms-field">
          <span>Employee ID <span className="required-star">*</span></span>
          <input value={values.employeeId} readOnly />
        </label>
        <label className="cms-field">
          <span>Mobile Number <span className="required-star">*</span></span>
          <input value={values.mobileNumber} readOnly />
        </label>
        <label className="cms-field">
          <span>Email</span>
          <input value={values.email} readOnly />
        </label>
        <label className="cms-field">
          <span>Commercial License No <span className="required-star">*</span></span>
          <input value={values.licenseNumber} disabled={isSaving} onChange={(event) => update("licenseNumber", event.target.value)} />
        </label>
        <label className="cms-field">
          <span>License Expiry Date</span>
          <input type="date" value={values.licenseExpiryDate} disabled={isSaving} onChange={(event) => update("licenseExpiryDate", event.target.value)} />
        </label>
        <label className="cms-field full">
          <span>Address</span>
          <textarea value={values.address} readOnly />
        </label>
        <label className="cms-field">
          <span>Status</span>
          <select value={values.status} disabled={isSaving} onChange={(event) => update("status", event.target.value)}>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        {error ? <p className="cms-error cms-transport-add-driver-error">{error}</p> : null}
      </div>
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
      footer={
        <>
          <button type="button" className="cms-btn cms-btn-ghost" disabled={isSaving} onClick={onCancel}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-primary" disabled={isSaving} onClick={submit}>{isSaving ? <span className="cms-transport-action-loading"><i aria-hidden="true" />Adding...</span> : "Save"}</button>
        </>
      }
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

function readReportMetric(payload, keys, fallback) {
  const value = unwrapReportPayload(payload);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const key = keys.find((candidate) => value[candidate] !== undefined && value[candidate] !== null);
  return key ? value[key] : fallback;
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

function isDriverStaffRecord(staff) {
  const personal = staff?.personal && typeof staff.personal === "object" ? staff.personal : {};
  const departmentSpecific = readDepartmentSpecific(staff);
  const customFields = readCustomFields(staff);
  const explicitDriverFlag = [staff?.isDriver, staff?.driver, departmentSpecific.isDriver, customFields.isDriver]
    .some((value) => value === true || value === 1 || String(value).toLowerCase() === "true");
  const driverFields = [
    staff?.role,
    staff?.roleName,
    staff?.roleCode,
    staff?.designation,
    staff?.designationName,
    staff?.designationCode,
    staff?.transportRole,
    personal.role,
    personal.roleName,
    personal.designation,
    personal.designationName,
    departmentSpecific.role,
    departmentSpecific.roleName,
    departmentSpecific.designation,
    departmentSpecific.designationName,
    customFields.role,
    customFields.roleName,
    customFields.designation,
    customFields.designationName,
  ];
  return explicitDriverFlag || driverFields.some((value) => /\bdriver\b/i.test(String(value || "").trim()));
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

export default function TransportManagerModuleView({ defaultSection = "setup", defaultSubTab }) {
  const navigation = useTransportNavigation();
  const searchParams = navigation.params;
  const setSearchParams = ({ tab }) => navigation.update({ tab, action: null, entity: null, id: null, page: null });
  const tmContext = useTransportManagerSafe();

  const academicContext = useAcademicContext?.() || {};
  const campusContext = useCampusContext?.() || {};

  const effectiveCampusId = tmContext?.effectiveCampusId ?? campusContext.selectedCampus?.id ?? campusContext.selectedCampusId ?? 1;
  const effectiveBoardId = tmContext?.effectiveBoardId ?? tmContext?.selectedBoardId ?? academicContext.selectedBoardId ?? 1;
  const effectiveAcademicYearId = tmContext?.effectiveAcademicYearId ?? academicContext.selectedAcademicYearId ?? 1;

  const activeSection = defaultSection;

  const activeSetupTab = searchParams.get("tab") && setupTabs.some((t) => t.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : (defaultSubTab && setupTabs.some((t) => t.id === defaultSubTab) ? defaultSubTab : "routes");

  const activeOperationTab = searchParams.get("tab") && operationTabs.some((t) => t.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : (defaultSubTab && operationTabs.some((t) => t.id === defaultSubTab) ? defaultSubTab : "vehicleAssignments");

  const activeReportTab = searchParams.get("tab") && reportTabs.some((t) => t.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : (defaultSubTab && reportTabs.some((t) => t.id === defaultSubTab) ? defaultSubTab : "transport-dashboard-report");

  const [query] = useTransportRouteValue(navigation, "q", "");
  const setQuery = (value) => navigation.update({ q: value, page: null });
  const [tripFilters, setTripFilters] = useTransportRouteValue(navigation, "tripFilters", { route: "All" });
  const [setupFilters, setSetupFilters] = useTransportRouteValue(navigation, "filters", {
    routes: "All",
    pickupPoints: "All",
    vehicles: "All",
    drivers: "All",
    attendants: "All",
  });
  const [reportFilters, setReportFilters] = useTransportRouteValue(navigation, "reportFilters", { route: "All", vehicle: "All", status: "All" });
  const [toast, setToast] = useState({ message: "", type: "success" });
  const lastErrorToastRef = useRef({ message: "", time: 0 });
  const [formConfig, setFormConfigState] = useState(null);
  const [isAddDriverOpen, setIsAddDriverOpenState] = useState(false);
  const [isAddAttendantOpen, setIsAddAttendantOpenState] = useState(false);
  const [detailConfig, setDetailConfigState] = useState(null);
  const [deleteConfig, setDeleteConfigState] = useState(null);
  const scope = [effectiveCampusId, effectiveBoardId, effectiveAcademicYearId].join(":");
  const [recordsReady, setRecordsReady] = useState(null);
  const requestSequence = useRef(0);
  const openedAction = useRef("");
  const closeAction = () => navigation.update({ action: null, entity: null, id: null, actionCampusId: null, actionBoardId: null, actionYearId: null });
  const routeAction = (action, entity, id = null) => navigation.update({ action, entity, id,
    actionCampusId: effectiveCampusId, actionBoardId: effectiveBoardId, actionYearId: effectiveAcademicYearId });
  const setFormConfig = (value) => { setFormConfigState(value); if (!value) closeAction(); };
  const setDetailConfig = (value) => { setDetailConfigState(value); if (!value) closeAction(); };
  const setDeleteConfig = (value) => { setDeleteConfigState(value); if (!value) closeAction(); };
  const setIsAddDriverOpen = (value) => value ? routeAction("add", "drivers") : (setIsAddDriverOpenState(false), closeAction());
  const setIsAddAttendantOpen = (value) => value ? routeAction("add", "attendants") : (setIsAddAttendantOpenState(false), closeAction());
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [routes, setRoutes] = useState(() => tmContext?.routes || []);
  const [pickupPoints, setPickupPoints] = useState(() => tmContext?.pickupPoints || []);
  const [vehicles, setVehicles] = useState(() => tmContext?.vehicles || []);
  const [drivers, setDrivers] = useState(() => tmContext?.drivers || []);
  const [driverStaffRecords, setDriverStaffRecords] = useState({});
  const [nonTeachingStaff, setNonTeachingStaff] = useState([]);
  const [attendants, setAttendants] = useState(() => tmContext?.attendants || []);
  const [vehicleAssignments, setVehicleAssignments] = useState(() => tmContext?.assignments || []);
  const [studentAssignments, setStudentAssignments] = useState(() => tmContext?.studentAssignments || []);
  const [trips, setTrips] = useState(() => tmContext?.trips || []);
  const [maintenance, setMaintenance] = useState(() => tmContext?.maintenance || []);
  const [gpsSnapshots, setGpsSnapshots] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState(() => tmContext?.dashboardMetrics || null);
  const [reportApiRows, setReportApiRows] = useState({});
  const [reportApiPayloads, setReportApiPayloads] = useState({});
  const [reportLoading, setReportLoading] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);

  useEffect(() => {
    if (tmContext) {
      if (tmContext.routes?.length) setRoutes(tmContext.routes);
      if (tmContext.pickupPoints?.length) setPickupPoints(tmContext.pickupPoints);
      if (tmContext.vehicles?.length) setVehicles(tmContext.vehicles);
      if (tmContext.drivers?.length) setDrivers(tmContext.drivers);
      if (tmContext.attendants?.length) setAttendants(tmContext.attendants);
      if (tmContext.assignments?.length) setVehicleAssignments(tmContext.assignments);
      if (tmContext.studentAssignments?.length) setStudentAssignments(tmContext.studentAssignments);
      if (tmContext.trips?.length) setTrips(tmContext.trips);
      if (tmContext.maintenance?.length) setMaintenance(tmContext.maintenance);
    }
  }, [
    tmContext,
    tmContext?.routes,
    tmContext?.pickupPoints,
    tmContext?.vehicles,
    tmContext?.drivers,
    tmContext?.attendants,
    tmContext?.assignments,
    tmContext?.studentAssignments,
    tmContext?.trips,
    tmContext?.maintenance,
  ]);

  const showToast = (message, type = "success") => setToast({ message, type });
  const preparePrint = (report) => {
    setPrintPayload(report);
    window.setTimeout(() => window.print(), 80);
  };
  const clearPrintPayload = () => setPrintPayload(null);
  useEffect(() => {
    window.addEventListener("afterprint", clearPrintPayload);
    return () => window.removeEventListener("afterprint", clearPrintPayload);
  }, []);

  const showErrorToast = (message) => {
    const normalizedMessage = String(message || "An unexpected server error occurred.");
    const now = Date.now();
    if (lastErrorToastRef.current.message === normalizedMessage && now - lastErrorToastRef.current.time < 3000) return;
    lastErrorToastRef.current = { message: normalizedMessage, time: now };
    showToast(normalizedMessage, "error");
  };

  const scoped = useCallback((items) => {
    if (!Array.isArray(items)) return [];
    if (typeof tmContext?.filterByScope === "function") {
      return tmContext.filterByScope(items);
    }
    return items.filter((item) => {
      if (!item) return false;
      const cId = item.campusId ?? item.CampusId;
      const bId = item.boardId ?? item.BoardId;
      const ayId = item.academicYearId ?? item.AcademicYearId;

      if (cId != null && String(cId) !== String(effectiveCampusId)) return false;
      if (bId != null && String(bId) !== String(effectiveBoardId)) return false;
      if (ayId != null && String(ayId) !== String(effectiveAcademicYearId)) return false;

      const cList = item.assignedCampusIds ?? item.assignedCampuses;
      if (Array.isArray(cList) && cList.length > 0) {
        if (!cList.some((c) => String(typeof c === "object" ? c.id || c.campusId : c) === String(effectiveCampusId))) return false;
      }

      const bList = item.assignedBoardIds ?? item.assignedBoards;
      if (Array.isArray(bList) && bList.length > 0) {
        if (!bList.some((b) => String(typeof b === "object" ? b.id || b.boardId : b) === String(effectiveBoardId))) return false;
      }

      return true;
    });
  }, [tmContext, effectiveCampusId, effectiveBoardId, effectiveAcademicYearId]);

  const fetchTransportData = async () => {
    const sequence = ++requestSequence.current;
    openedAction.current = "";
    setIsLoading(true);

    try {
      const commonParams = {
        campusId: effectiveCampusId,
        boardId: effectiveBoardId,
        academicYearId: effectiveAcademicYearId,
        CampusId: effectiveCampusId,
        BoardId: effectiveBoardId,
        AcademicYearId: effectiveAcademicYearId,
        PageNumber: 1,
        PageSize: 1000,
      };

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
      ] = await Promise.allSettled([
        apiClient.get(apiEndpoints.transport.routes, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.pickupPoints, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.lookups.pickupPoints, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.vehicles, { params: commonParams }),
        apiClient.get(apiEndpoints.faculty.list, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.drivers, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.attendants, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.vehicleAssignments, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.trips, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.gps, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.maintenance, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.studentAssignments, { params: commonParams }),
        apiClient.get(apiEndpoints.transport.dashboard, { params: commonParams }),
      ]);

      if (sequence !== requestSequence.current) return;
      setRecordsReady({ scope, entities: Object.fromEntries([
        ["routes", routesRes], ["pickupPoints", pickupsRes], ["vehicles", vehiclesRes],
        ["drivers", driversRes], ["attendants", attendantsRes], ["vehicleAssignments", assignmentsRes],
        ["studentAssignments", studentRes], ["trips", tripsRes], ["maintenance", maintenanceRes],
      ].map(([key, result]) => [key, result.status === "fulfilled"])) });
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
        const items = [...detailedItems, ...lookupItems];
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
        setNonTeachingStaff(
          items
            .filter((staff) => {
              const isNonTeaching = [staff.staffType, staff.facultyType].some((value) => /non[-\s]?teaching/i.test(String(value || "")));
              const isBusAttendant = [staff.role, staff.roleName, staff.designation, staff.designationName]
                .some((value) => String(value || "").trim().toLowerCase() === "bus attendant");
              return isNonTeaching && isBusAttendant;
            })
            .map((staff) => ({
              id: staff.staffId || staff.id || staff.facultyId,
              name: staff.fullName || staff.staffName || [staff.firstName, staff.middleName, staff.lastName].filter(Boolean).join(" "),
              employeeId: staff.employeeId || staff.empId || "",
              mobileNumber: staff.mobile || staff.mobileNumber || staff.phone || "",
              gender: staff.gender || "",
            })),
        );
        const driverStaff = items.filter(isDriverStaffRecord);
        setDriverStaffRecords(Object.fromEntries(driverStaff.map((staff) => [String(staff.staffId || staff.id || staff.facultyId), staff])));
        setDrivers(
          driverStaff
            .map((staff) => {
              const personal = staff.personal && typeof staff.personal === "object" ? staff.personal : {};
              const contact = staff.contact && typeof staff.contact === "object" ? staff.contact : {};
              const departmentSpecific = readDepartmentSpecific(staff);
              const customFields = readCustomFields(staff);
              return {
                id: staff.staffId || staff.id || staff.facultyId,
                driverName: staff.fullName || staff.staffName || [staff.firstName || personal.firstName, staff.middleName || personal.middleName, staff.lastName || personal.lastName].filter(Boolean).join(" "),
                employeeId: staff.employeeId || staff.empId || "",
                mobileNumber: staff.mobile || staff.mobileNumber || staff.phone || contact.primaryMobile || "",
                email: staff.email || contact.primaryEmail || "",
                licenseNumber: staff.drivingLicenseNumber || staff.driverLicenseNumber || departmentSpecific.drivingLicenseNumber || departmentSpecific.licenseNumber || customFields.drivingLicenseNumber || customFields.driverLicenseNumber || customFields.licenseNumber || staff.licenseNumber || staff.licenceNumber || "",
                licenseExpiryDate: String(staff.drivingLicenseExpiryDate || staff.driverLicenseExpiryDate || staff.licenseExpiryDate || departmentSpecific.drivingLicenseExpiryDate || departmentSpecific.licenseExpiry || customFields.drivingLicenseExpiryDate || customFields.driverLicenseExpiryDate || customFields.licenseExpiry || staff.licenceExpiry || "").split("T")[0],
                address: staff.currentAddress || staff.address || contact.currentAddress || "",
                experience: Number(staff.experienceYears ?? staff.drivingExperienceYears ?? departmentSpecific.experienceYears ?? customFields.experienceYears ?? staff.experience ?? 0),
                status: staff.status === true || staff.status === 1 || /^active$/i.test(String(staff.status || "")) ? "Active" : /^on leave$/i.test(String(staff.status || "")) ? "On Leave" : "Inactive",
              };
            })
        );
      }

      if (attendantsRes.status === "fulfilled" && attendantsRes.value?.data) {
        const items = scoped(extractList(attendantsRes.value.data));
        setAttendants(
          items.map((a) => ({
            id: a.attendantId || a.id,
            attendantName: a.attendantName || a.attendantFullName || a.fullName || a.name || "",
            employeeId: a.employeeId || a.attendantCode || "",
            mobileNumber: a.mobileNumber || a.phone || "",
            gender: a.gender || "Female",
            branch: a.branchName || a.branch || "Main Campus",
            status: a.status === true || a.status === 1 || a.status === "Active" ? "Active" : "Inactive",
          }))
        );
      }

      if (driversRes.status === "fulfilled" && driversRes.value?.data) {
        const items = scoped(extractList(driversRes.value.data));
        if (items.length) {
          setDrivers(items.map((driver) => {
            const transportDriverId = Number(driver.driverId) > 0 ? driver.driverId : null;
            const driverApiId = transportDriverId
              || driver.licenceNumber
              || driver.licenseNumber
              || driver.employeeId
              || driver.id;
            return {
              id: driverApiId,
              driverApiId,
              transportDriverId,
              driverName: driver.driverName || driver.name || "",
              employeeId: driver.employeeId || driver.empId || "",
              mobileNumber: driver.mobileNumber || driver.phone || "",
              email: driver.email || "",
              licenseNumber: driver.licenceNumber || driver.licenseNumber || "",
              licenseExpiryDate: String(driver.licenceExpiry || driver.licenseExpiryDate || "").split("T")[0],
              address: driver.address || "",
              experience: Number(driver.experience || 0),
              status: driver.status === true || driver.status === 1 || driver.status === "Active" ? "Active" : "Inactive",
            };
          }));
        }
      }

      if (assignmentsRes.status === "fulfilled" && assignmentsRes.value?.data) {
        const items = scoped(extractList(assignmentsRes.value.data));
        setVehicleAssignments(
          items.map((a) => ({
            id: a.vehicleAssignmentId || a.assignmentId || a.id,
            routeId: a.routeId,
            vehicleId: a.vehicleId,
            driverId: a.driverId,
            attendantId: a.attendantId,
            routeName: a.routeName || "",
            vehicleNumber: a.vehicleNumber || a.busNumber || "",
            driverName: a.driverName || "",
            attendantName: a.attendantName || "",
            morningTripTime: a.morningTripTime || a.morningTrip || "",
            eveningTripTime: a.eveningTripTime || a.eveningTrip || "",
            status: a.status === true || a.status === 1 || a.status === "Active" ? "Active" : "Inactive",
            effectiveFrom: a.effectiveFrom ? String(a.effectiveFrom).split("T")[0] : "",
          }))
        );
      }

      if (tripsRes.status === "fulfilled" && tripsRes.value?.data) {
        const items = scoped(extractList(tripsRes.value.data));
        if (items.length) {
          setTrips(
            items.map((t) => ({
              id: t.tripId || t.id,
              assignmentId: t.assignmentId || t.vehicleAssignmentId,
              vehicleId: t.vehicleId,
              vehicleNumber: t.vehicleNumber || t.busNumber || "",
              routeName: t.routeName || t.route || "",
              driverId: t.driverId,
              tripType: t.tripType || (t.startTime ? "Morning" : "Evening"),
              tripDate: t.tripDate ? String(t.tripDate).split("T")[0] : new Date().toISOString().split("T")[0],
              attendantId: t.attendantId,
              startTime: t.startTime || t.morningTripTime || t.morningTrip || "",
              endTime: t.endTime || t.eveningTripTime || t.eveningTrip || "",
              studentsPresent: t.studentsCount ?? t.studentsPresent ?? t.assignedStudents ?? "",
              status: t.status || t.tripStatus || "",
              driverName: t.driverName || t.driver || "",
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
              speed: parseInt(String(g.speed || "40").replace(/[^\d]/g, ""), 10) || 40,
              nextStop: g.nextStop || "Main Gate",
              lastUpdated: g.eta ? `ETA: ${g.eta}` : (g.gpsSignal || "Active"),
              latitude: g.latitude || "17.3850",
              longitude: g.longitude || "78.4867",
              status: g.tripStatus || "In Transit",
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
        const items = scoped(extractList(studentRes.value.data));
        setStudentAssignments(
          items.map((s) => ({
            id: getStudentTransportAssignmentId(s) || s.id,
            studentName: s.studentName || s.name || "",
            admissionNo: s.admissionNo || s.admissionNumber || "",
            routeName: s.routeName || s.route || "",
            pickupPointName: s.pickupPointName || s.pickupPoint || "",
            vehicleNumber: s.vehicleNumber || s.busNumber || "",
            feePlan: s.feePlan || s.plan || "Annual",
            monthlyFee: Number(s.monthlyFee || s.fee || 1200),
            status: s.status === true || s.status === 1 || s.status === "Active" ? "Active" : "Inactive",
            routeId: s.routeId,
            vehicleId: s.vehicleId,
            pickupPointId: s.pickupPointId,
          }))
        );
      }

      if (dashboardRes.status === "fulfilled" && dashboardRes.value?.data) {
        const payload = dashboardRes.value.data?.data ?? dashboardRes.value.data;
        setDashboardMetrics(payload);
      }
    } catch (err) {
      console.warn("Transport data fetch note:", err);
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCampusId, effectiveBoardId, effectiveAcademicYearId]);

  // Report sync
  useEffect(() => {
    if (activeSection !== "reports" || activeReportTab === "trip-reports") return undefined;
    const definition = reportDefinitions[activeReportTab];
    if (!definition) return undefined;
    let active = true;
    const params = {
      campusId: effectiveCampusId,
      boardId: effectiveBoardId,
      academicYearId: effectiveAcademicYearId,
      CampusId: effectiveCampusId,
      BoardId: effectiveBoardId,
      AcademicYearId: effectiveAcademicYearId,
      routeId: reportFilters.route !== "All" ? reportFilters.route : undefined,
      vehicleId: reportFilters.vehicle !== "All" ? reportFilters.vehicle : undefined,
      status: reportFilters.status !== "All" ? reportFilters.status : undefined,
    };
    setReportLoading(true);
    apiClient.get(definition.endpoint, { params })
      .then((response) => {
        if (!active) return;
        setReportApiPayloads((current) => ({ ...current, [activeReportTab]: response.data }));
        setReportApiRows((current) => ({ ...current, [activeReportTab]: scoped(reportRowsFromPayload(response.data)) }));
      })
      .catch((error) => {
        if (!active) return;
        showErrorToast(`${getApiErrorMessage(error) || "Unable to load this transport report."} Showing the currently loaded transport data where available.`);
      })
      .finally(() => active && setReportLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeSection,
    activeReportTab,
    effectiveCampusId,
    effectiveBoardId,
    effectiveAcademicYearId,
    reportFilters.route,
    reportFilters.vehicle,
    reportFilters.status,
    scoped,
  ]);

  const routeOptions = routes.map((route) => ({ value: route.id, label: route.routeName }));
  const vehicleOptions = vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.vehicleNumber }));
  const driverOptions = drivers.map((driver) => ({ value: driver.id, label: driver.driverName }));
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

  const findVehicle = (id) => vehicles.find((vehicle) => String(vehicle.id) === String(id));
  const findAssignment = (id) => vehicleAssignments.find((a) => String(a.id) === String(id));

  const openForm = (key, title, fields, record = null, restoring = false) => {
    if (!restoring) { routeAction(record ? "edit" : "add", key, record?.id); return; }
    const formRecord = key === "vehicles" && record
      ? {
          ...record,
          isAC: record.isAC === true || record.isAC === "AC" || record.isAC === "Yes",
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

  const openEditForm = (key, title, fields, record) => {
    openForm(key, title, fields, record);
  };

  const saveForm = async (values) => {
    if (isFormSubmitting || !formConfig) return;
    const { key, record } = formConfig;
    const isEdit = Boolean(record?.id);
    const numericId = isEdit
      ? key === "studentAssignments"
        ? getStudentTransportAssignmentId(record)
        : Number(String(record.id).replace(/[^\d]/g, "")) || record.id
      : null;

    setIsFormSubmitting(true);
    try {
      if (key === "routes") {
        const payload = {
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
          campusId: values.campusId || effectiveCampusId,
          boardId: values.boardId || effectiveBoardId,
          academicYearId: values.academicYearId || effectiveAcademicYearId,
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.routeById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.routes, payload);
        }
      } else if (key === "pickupPoints") {
        for (const pickupValues of values.pickupRows || [values]) {
          const payload = {
            routeId: Number(pickupValues.routeId),
            pickupPointName: pickupValues.pickupName,
            landmark: pickupValues.landmark || "Main Landmark",
            sequenceNo: Number(pickupValues.sequenceNumber) || 1,
            pickupTime: pickupValues.pickupTime ? (pickupValues.pickupTime.length === 5 ? `${pickupValues.pickupTime}:00` : pickupValues.pickupTime) : "07:30:00",
            dropTime: pickupValues.dropTime ? (pickupValues.dropTime.length === 5 ? `${pickupValues.dropTime}:00` : pickupValues.dropTime) : "16:15:00",
            distanceFromStart: Number(pickupValues.distanceKm) || 0,
            monthlyFee: Number(pickupValues.monthlyFee) || 1200,
            status: pickupValues.status === "Active",
            campusId: pickupValues.campusId || effectiveCampusId,
            boardId: pickupValues.boardId || effectiveBoardId,
            academicYearId: pickupValues.academicYearId || effectiveAcademicYearId,
          };
          if (isEdit) {
            await apiClient.put(apiEndpoints.transport.pickupPointById(numericId), payload);
          } else {
            await apiClient.post(apiEndpoints.transport.pickupPoints, payload);
          }
          if (!isEdit) values.onPickupSaved?.(pickupValues.key);
        }
      } else if (key === "vehicles") {
        const payload = {
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
          campusId: values.campusId || effectiveCampusId,
          boardId: values.boardId || effectiveBoardId,
          academicYearId: values.academicYearId || effectiveAcademicYearId,
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.vehicleById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.vehicles, payload);
        }
      } else if (key === "vehicleAssignments") {
        const payload = {
          routeId: Number(values.routeId),
          vehicleId: Number(values.vehicleId),
          driverId: Number(values.driverId),
          attendantId: values.attendantId ? Number(values.attendantId) : null,
          morningTripTime: values.morningTripTime || "07:30 AM",
          eveningTripTime: values.eveningTripTime || "04:30 PM",
          effectiveFrom: values.effectiveFrom ? `${values.effectiveFrom}T00:00:00` : new Date().toISOString(),
          status: values.status === "Active",
          campusId: values.campusId || effectiveCampusId,
          boardId: values.boardId || effectiveBoardId,
          academicYearId: values.academicYearId || effectiveAcademicYearId,
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.reassignVehicleAssignment(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.vehicleAssignments, payload);
        }
      } else if (key === "studentAssignments") {
        const payload = {
          studentId: Number(values.studentId) || (values.admissionNo ? parseInt(values.admissionNo.replace(/[^\d]/g, ""), 10) || 1 : 1),
          studentName: values.studentName,
          admissionNo: values.admissionNo,
          routeId: Number(values.routeId),
          pickupPointId: Number(values.pickupPointId) || null,
          pickupPointName: values.pickupPointName || "",
          vehicleId: Number(values.vehicleId),
          monthlyFee: Number(values.monthlyFee) || 1200,
          status: values.status === "Active",
          campusId: values.campusId || effectiveCampusId,
          boardId: values.boardId || effectiveBoardId,
          academicYearId: values.academicYearId || effectiveAcademicYearId,
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
          campusId: values.campusId || effectiveCampusId,
          boardId: values.boardId || effectiveBoardId,
          academicYearId: values.academicYearId || effectiveAcademicYearId,
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
          campusId: values.campusId || effectiveCampusId,
          boardId: values.boardId || effectiveBoardId,
          academicYearId: values.academicYearId || effectiveAcademicYearId,
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.maintenanceById(record.id), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.maintenance, payload);
        }
      }

      await fetchTransportData();
      tmContext?.refreshAll?.();
      setFormConfig(null);
      showToast(isEdit ? "Transport record updated successfully." : "Transport record added successfully.");
    } catch (err) {
      console.error("API error saving transport record:", err);
      showErrorToast(`Error saving record: ${getApiErrorMessage(err)}`);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const saveNewDriver = async (values) => {
    if (isFormSubmitting) return;
    setIsFormSubmitting(true);
    try {
      const payload = {
        driverName: values.driverName,
        employeeId: values.employeeId,
        mobileNumber: values.mobileNumber,
        email: values.email || "",
        licenceNumber: values.licenseNumber,
        licenceExpiry: values.licenseExpiryDate || null,
        address: values.address || "",
        status: values.status === "Active",
        campusId: values.campusId || effectiveCampusId,
        boardId: values.boardId || effectiveBoardId,
        academicYearId: values.academicYearId || effectiveAcademicYearId,
      };
      await apiClient.post(apiEndpoints.transport.drivers, payload);
      setIsAddDriverOpen(false);
      await fetchTransportData();
      tmContext?.refreshAll?.();
      showToast("Transport driver added successfully.");
    } catch (err) {
      console.error("Transport Driver API Error:", err);
      showErrorToast(`Error adding driver: ${getApiErrorMessage(err)}`);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const saveNewAttendant = async (values) => {
    if (isFormSubmitting) return;
    setIsFormSubmitting(true);
    try {
      const payload = {
        attendantName: values.attendantName,
        employeeId: values.employeeId,
        mobileNumber: values.mobileNumber,
        gender: values.gender,
        status: values.status === "Active",
        campusId: values.campusId || effectiveCampusId,
        boardId: values.boardId || effectiveBoardId,
        academicYearId: values.academicYearId || effectiveAcademicYearId,
      };
      await apiClient.post(apiEndpoints.transport.attendants, payload);
      setIsAddAttendantOpen(false);
      await fetchTransportData();
      tmContext?.refreshAll?.();
      showToast("Bus attendant added successfully.");
    } catch (err) {
      console.error("API error saving transport attendant:", err);
      showErrorToast(`Error adding attendant: ${getApiErrorMessage(err)}`);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const requestDelete = (key, row, label) => {
    routeAction("delete", key, row.id);
  };

  const openRecordDetails = async (key, row, title) => {
    routeAction("view", key, row.id);
  };

  const confirmDelete = async () => {
    if (isDeleteSubmitting || !deleteConfig) return;
    const { key, row } = deleteConfig;
    const numericId = key === "studentAssignments"
      ? getStudentTransportAssignmentId(row)
      : key === "drivers"
      ? row.transportDriverId || row.driverApiId || row.licenseNumber || row.employeeId || row.id
      : Number(String(row.id).replace(/[^\d]/g, "")) || row.id;

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
        deleteResponse = await apiClient.delete(apiEndpoints.transport.driverById(numericId));
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
      assertTransportDeleteSucceeded(deleteResponse);
      await fetchTransportData();
      tmContext?.refreshAll?.();
      setDeleteConfig(null);
      showToast("Transport record deleted successfully.");
    } catch (err) {
      console.error("API error deleting transport record:", err);
      showErrorToast(`Error deleting record: ${getApiErrorMessage(err)}`);
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  // Field configurations
  const routeFields = [
    { name: "routeCode", label: "Route Code (Unique)", required: true, placeholder: "e.g. R-NORTH-101" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
    { name: "routeName", label: "Route Name", required: true, placeholder: "Enter route name..." },
    { name: "routeStart", label: "Route Start", placeholder: "Enter route start location..." },
    { name: "routeEnd", label: "Route End", placeholder: "Enter route end location..." },
    { name: "totalDistanceKm", label: "Total Distance (KM)", type: "number", min: 0, placeholder: "e.g. 18.5" },
    { name: "estimatedTimeMinutes", label: "Est Time (Minutes)", type: "number", min: 0, placeholder: "e.g. 45" },
    { name: "minBaseFare", label: "Base Fare (₹)", type: "number", min: 0, placeholder: "e.g. 1000" },
    { name: "description", label: "Description / Notes", type: "textarea", full: true },
  ];

  const vehicleFields = [
    { name: "vehicleNumber", label: "Bus Number", required: true, placeholder: "e.g. TS09UB1234" },
    { name: "registrationNumber", label: "Registration No", required: true, placeholder: "e.g. AP-09-UB-1234" },
    { name: "vehicleType", label: "Model / Vehicle Type", type: "select", options: ["Bus", "Mini Bus", "Van"], required: true },
    { name: "capacity", label: "Capacity (Seats)", type: "number", min: 1, required: true },
    { name: "isAC", label: "AC Vehicle", type: "select", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
    { name: "status", label: "Status", type: "select", options: ["Active", "Maintenance", "Inactive"], required: true },
    { name: "insuranceExpiry", label: "Insurance Expiry", type: "date" },
    { name: "pollutionExpiry", label: "Pollution (PUC) Expiry", type: "date" },
    { name: "fitnessExpiry", label: "Fitness Expiry", type: "date" },
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

  const studentAssignmentFields = [
    { name: "studentName", label: "Student Full Name", required: true, readOnly: true },
    { name: "admissionNo", label: "Admission Number", required: true, readOnly: true },
    { name: "routeId", label: "Select Route", type: "select", options: routeOptions, required: true },
    { name: "pickupPointName", label: "Pickup Point Name", required: true },
    { name: "vehicleId", label: "Assigned Bus", type: "select", options: vehicleOptions },
    { name: "monthlyFee", label: "Monthly Fee (₹)", type: "number", min: 0, required: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ];

  const tripFields = [
    { name: "vehicleId", label: "Select Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "routeId", label: "Select Route", type: "select", options: routeOptions, required: true },
    { name: "driverId", label: "Select Driver", type: "select", options: driverOptions, required: true },
    { name: "attendantId", label: "Select Bus Attendant", type: "select", options: attendantOptions },
    { name: "tripType", label: "Trip Type", type: "select", options: ["Morning", "Evening"], required: true },
    { name: "tripDate", label: "Trip Date", type: "date", required: true },
    { name: "startTime", label: "Start Time", type: "time" },
    { name: "endTime", label: "End Time", type: "time" },
    { name: "studentsPresent", label: "Students Present", type: "number", min: 0 },
    { name: "status", label: "Status", type: "select", options: ["Scheduled", "Running", "Completed", "Delayed", "Cancelled"], required: true },
  ];

  // Table configs map
  const tableConfigs = {
    routes: {
      title: "Route Master",
      subtitle: "Manage transport route distance, timing and fare rules.",
      rows: routes,
      fields: routeFields,
      addLabel: "Add Route",
      columns: [
        { key: "routeCode", label: "CODE", strong: true },
        { key: "routeName", label: "ROUTE" },
        { key: "routeStart", label: "START" },
        { key: "routeEnd", label: "END" },
        { key: "totalDistanceKm", label: "DISTANCE", value: (r) => `${r.totalDistanceKm} km` },
        { key: "minBaseFare", label: "BASE FARE", currency: true },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
    pickupPoints: {
      title: "Pickup Point Master",
      subtitle: "Manage route sequence, pickup/drop timings and student stops.",
      rows: pickupPoints,
      addLabel: "Add Pickup Points",
      columns: [
        { key: "pickupName", label: "STOP NAME", strong: true },
        { key: "routeName", label: "ROUTE" },
        { key: "sequenceNumber", label: "SEQUENCE", value: (r) => `#${r.sequenceNumber}` },
        { key: "pickupTime", label: "PICKUP TIME", value: (r) => r.pickupTime || "-" },
        { key: "dropTime", label: "DROP TIME", value: (r) => r.dropTime || "-" },
        { key: "distanceKm", label: "DISTANCE", value: (r) => `${r.distanceKm} km` },
        { key: "monthlyFee", label: "MONTHLY FEE", currency: true },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
    vehicles: {
      title: "Fleet Master",
      subtitle: "Manage fleet inventory, seat capacity and regulatory documents.",
      rows: vehicles,
      fields: vehicleFields,
      addLabel: "Add Vehicle",
      columns: [
        { key: "vehicleNumber", label: "BUS NUMBER", strong: true },
        { key: "registrationNumber", label: "REGISTRATION" },
        { key: "vehicleType", label: "MODEL / TYPE" },
        { key: "capacity", label: "CAPACITY", value: (r) => `${r.capacity} Seats` },
        { key: "isAC", label: "AC", value: (r) => (r.isAC ? "AC" : "Non-AC") },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
    drivers: {
      title: "Driver Master",
      subtitle: "Manage driver licensing, expirations and duty allocations.",
      rows: drivers,
      addLabel: "Add Driver",
      columns: [
        { key: "employeeId", label: "EMPLOYEE ID", strong: true },
        { key: "driverName", label: "DRIVER" },
        { key: "mobileNumber", label: "MOBILE" },
        { key: "licenseNumber", label: "LICENSE" },
        { key: "licenseExpiryDate", label: "EXPIRY" },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
    attendants: {
      title: "Bus Attendant Master",
      subtitle: "Manage attendant allocation-ready profiles.",
      rows: attendants,
      addLabel: "Add Attendant",
      columns: [
        { key: "employeeId", label: "EMPLOYEE ID", strong: true },
        { key: "attendantName", label: "ATTENDANT" },
        { key: "mobileNumber", label: "MOBILE" },
        { key: "gender", label: "GENDER" },
        { key: "branch", label: "BRANCH" },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
    vehicleAssignments: {
      title: "Vehicle Assignment",
      subtitle: "Assign vehicles, drivers and attendants to active routes.",
      rows: vehicleAssignments,
      fields: assignmentFields,
      addLabel: "Add Assignment",
      columns: [
        { key: "vehicleNumber", label: "BUS NUMBER", strong: true },
        { key: "routeName", label: "ROUTE NAME" },
        { key: "driverName", label: "DRIVER NAME" },
        { key: "attendantName", label: "BUS ATTENDANT" },
        { key: "capacity", label: "CAPACITY", value: (row) => findVehicle(row.vehicleId)?.capacity || "-" },
        { key: "students", label: "STUDENTS", value: (row) => studentAssignments.filter((student) => String(student.vehicleId) === String(row.vehicleId)).length },
        { key: "morningTripTime", label: "MORNING TRIP", value: (row) => row.morningTripTime || "-" },
        { key: "eveningTripTime", label: "EVENING TRIP", value: (row) => row.eveningTripTime || "-" },
        { key: "status", label: "STATUS", badge: true },
        { key: "effectiveFrom", label: "EFFECTIVE DATE" },
      ],
    },
    studentAssignments: {
      title: "Student Transport Allotment",
      subtitle: "Manage student route allocations, pickup stops and transport fee plans.",
      rows: studentAssignments,
      fields: studentAssignmentFields,
      columns: [
        { key: "studentName", label: "STUDENT", strong: true },
        { key: "admissionNo", label: "ADMISSION NUMBER" },
        { key: "routeName", label: "TRANSIT ROUTE" },
        { key: "pickupPointName", label: "PICKUP POINT" },
        { key: "vehicleNumber", label: "ASSIGNED VEHICLE" },
        { key: "feePlan", label: "FEE PLAN" },
        { key: "monthlyFee", label: "FEE AMOUNT", currency: true },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
    trips: {
      title: "Vehicle Trips",
      subtitle: "Track daily morning and evening trip movement.",
      rows: trips,
      fields: tripFields,
      addLabel: "Add Trip",
      columns: [
        { key: "vehicleNumber", label: "VEHICLE", strong: true },
        { key: "routeName", label: "ROUTE" },
        { key: "tripType", label: "TRIP" },
        { key: "tripDate", label: "DATE" },
        { key: "startTime", label: "START" },
        { key: "endTime", label: "END" },
        { key: "studentsPresent", label: "STUDENTS" },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
    maintenance: {
      title: "Vehicle Maintenance",
      subtitle: "Maintain service logs, costs and next due dates.",
      rows: maintenance,
      fields: maintenanceFields,
      addLabel: "Add Service",
      columns: [
        { key: "vehicleNumber", label: "VEHICLE NUMBER", strong: true },
        { key: "category", label: "SERVICE TYPE" },
        { key: "serviceDate", label: "SERVICE DATE" },
        { key: "vendor", label: "VENDOR" },
        { key: "cost", label: "COST", currency: true },
        { key: "nextDueDate", label: "NEXT SERVICE DUE" },
        { key: "status", label: "STATUS", badge: true },
      ],
    },
  };

  const actionSignature = JSON.stringify([scope, activeSection, searchParams.get("tab"), searchParams.get("action"), searchParams.get("entity"), searchParams.get("id"), searchParams.get("actionCampusId"), searchParams.get("actionBoardId"), searchParams.get("actionYearId")]);
  useEffect(() => {
    if (openedAction.current === actionSignature) return;
    setFormConfigState(null); setDetailConfigState(null); setDeleteConfigState(null);
    setIsAddDriverOpenState(false); setIsAddAttendantOpenState(false);
    const action = searchParams.get("action");
    if (!action) { openedAction.current = actionSignature; return; }
    if (!recordsReady || recordsReady.scope !== scope || isLoading) return;
    const entity = searchParams.get("entity");
    const config = tableConfigs[entity];
    const activeEntity = activeSection === "setup" ? activeSetupTab : activeSection === "operations" ? activeOperationTab : null;
    const matchingScope = [["actionCampusId", effectiveCampusId], ["actionBoardId", effectiveBoardId], ["actionYearId", effectiveAcademicYearId]].every(([key, value]) => !searchParams.has(key) || searchParams.get(key) === String(value));
    openedAction.current = actionSignature;
    if (!matchingScope || entity !== activeEntity || !config || !["add", "edit", "view", "delete"].includes(action)) {
      showErrorToast("This transport action is not available in the selected context."); return;
    }
    if (!recordsReady.entities[entity]) { showErrorToast("Unable to restore this action because transport data could not be loaded. Sync Live Data to retry."); return; }
    if (action === "add" && config.addLabel) {
      if (entity === "drivers") setIsAddDriverOpenState(true);
      else if (entity === "attendants") setIsAddAttendantOpenState(true);
      else openForm(entity, config.addLabel, config.fields, null, true);
      return;
    }
    const row = config.rows.find(item => item.id != null && String(item.id) === searchParams.get("id"));
    if (!row) { showErrorToast("The requested transport record is unavailable in the selected context."); return; }
    if (action === "view") setDetailConfigState({ title: config.title, row });
    else if (action === "edit" && config.fields) openForm(entity, `Edit ${config.title}`, config.fields, row, true);
    else if (action === "delete") setDeleteConfigState({ key: entity, row, label: config.title });
    // Latest field options are read only when the URL action changes or its data arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionSignature, recordsReady, isLoading]);

  // Setup filters
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
        label: "Filter by Route",
        options: [
          { value: "All", label: "All Routes" },
          ...routes.map((route) => ({ value: route.id, label: route.routeName })),
        ],
      },
    ],
    vehicles: [
      {
        name: "vehicles",
        label: "Filter by Type",
        options: [
          { value: "All", label: "All Types" },
          { value: "Bus", label: "Bus" },
          { value: "Mini Bus", label: "Mini Bus" },
          { value: "Van", label: "Van" },
        ],
      },
    ],
    drivers: [
      {
        name: "drivers",
        label: "Filter by Status",
        options: [
          { value: "All", label: "All Statuses" },
          { value: "Active", label: "Active" },
          { value: "On Leave", label: "On Leave" },
          { value: "Inactive", label: "Inactive" },
        ],
      },
    ],
    attendants: [
      {
        name: "attendants",
        label: "Filter by Status",
        options: [
          { value: "All", label: "All Statuses" },
          { value: "Active", label: "Active" },
          { value: "On Leave", label: "On Leave" },
          { value: "Inactive", label: "Inactive" },
        ],
      },
    ],
  };

  const filterSetupRow = (key, row) => {
    const value = setupFilters[key];
    if (!value || value === "All") return true;
    if (key === "routes") return String(row.id) === String(value);
    if (key === "pickupPoints") return String(row.routeId) === String(value);
    if (key === "vehicles") return String(row.vehicleType) === String(value);
    if (key === "drivers" || key === "attendants") return String(row.status) === String(value);
    return true;
  };

  const renderTable = (key) => {
    const config = tableConfigs[key];
    if (!config) return null;
    return (
      <TableSection
        key={key}
        title={config.title}
        subtitle={config.subtitle}
        rows={config.rows}
        columns={config.columns}
        query={query}
        onQuery={setQuery}
        addLabel={config.addLabel}
        filters={setupTableFilters[key]}
        filterValues={setupFilters}
        onFilterChange={(name, val) => { setSetupFilters((current) => ({ ...current, [name]: val })); navigation.update({ page: null }); }}
        rowFilter={(row) => filterSetupRow(key, row)}
        printSection={activeSection === "setup" ? "Setup" : "Operations"}
        printSubsection={config.title}
        onPrint={preparePrint}
        onAdd={
          key === "pickupPoints"
            ? () => openForm("pickupPoints", "Add Pickup Points", null)
            : key === "drivers"
            ? () => setIsAddDriverOpen(true)
            : key === "attendants"
            ? () => setIsAddAttendantOpen(true)
            : config.addLabel && config.fields
            ? () => openForm(key, config.addLabel, config.fields)
            : undefined
        }
        onEdit={config.fields ? (row) => openEditForm(key, `Edit ${config.title}`, config.fields, row) : undefined}
        onDelete={(row) => requestDelete(key, row, config.title)}
        onView={(row) => openRecordDetails(key, row, config.title)}
      />
    );
  };

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
                { label: "Live Speed", value: `${snapshot.speed} km/h` },
                { label: "Next Stop", value: snapshot.nextStop },
                { label: "Telemetry", value: snapshot.lastUpdated },
                { label: "Coordinates", value: `${snapshot.latitude}, ${snapshot.longitude}` },
              ]}
            />
          </div>
        ))
      )}
    </div>
  );

  // Reports calculations
  const dashboardAnnualFee = useMemo(() => {
    return studentAssignments
      .filter((s) => s.status === "Active")
      .reduce((sum, s) => sum + (Number(s.monthlyFee) || 1200) * 11, 0) || 132000;
  }, [studentAssignments]);

  const dashboardMaintenanceCost = useMemo(() => {
    return maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0) || 2100;
  }, [maintenance]);

  const dashboardFleetCapacity = useMemo(() => {
    return vehicles.reduce((sum, v) => sum + (Number(v.capacity) || 0), 0) || 177;
  }, [vehicles]);

  const dashboardStaffCount = useMemo(() => {
    return drivers.length + attendants.length || 6;
  }, [drivers, attendants]);

  const reportDashboardRows = useMemo(() => [
    { metric: "Fleet Size", value: vehicles.length || 5, status: `${vehicles.length || 5} Active` },
    { metric: "Active Routes", value: routes.length || 4, status: "Configured" },
    { metric: "Active Drivers", value: drivers.length || 5, status: "Licensed Staff" },
    { metric: "Transport Students", value: studentAssignments.length || 10, status: "6% Occupancy" },
  ], [vehicles, routes, drivers, studentAssignments]);

  const reportDashboardColumns = [
    { key: "metric", label: "METRIC", strong: true },
    { key: "value", label: "VALUE" },
    { key: "status", label: "STATUS" },
  ];

  const reportRows = useMemo(() => {
    if (activeReportTab === "transport-dashboard-report") return reportDashboardRows;
    if (activeReportTab === "trip-reports") return trips;
    if (reportApiRows[activeReportTab]) return reportApiRows[activeReportTab];
    if (activeReportTab === "vehicle-reports") return vehicles;
    if (activeReportTab === "driver-reports") return drivers;
    if (activeReportTab === "route-reports") return routes;
    if (activeReportTab === "student-transport-reports") return studentAssignments;
    if (activeReportTab === "pickup-wise-reports") return pickupPoints;
    if (activeReportTab === "maintenance-reports") return maintenance;
    return [];
  }, [activeReportTab, reportDashboardRows, trips, reportApiRows, vehicles, drivers, routes, studentAssignments, pickupPoints, maintenance]);

  const reportColumns = useMemo(() => {
    if (activeReportTab === "transport-dashboard-report") return reportDashboardColumns;
    if (activeReportTab === "trip-reports") return tableConfigs.trips.columns;
    if (activeReportTab === "vehicle-reports") return tableConfigs.vehicles.columns;
    if (activeReportTab === "driver-reports") return tableConfigs.drivers.columns;
    if (activeReportTab === "route-reports") return tableConfigs.routes.columns;
    if (activeReportTab === "student-transport-reports") return tableConfigs.studentAssignments.columns;
    if (activeReportTab === "pickup-wise-reports") return tableConfigs.pickupPoints.columns;
    if (activeReportTab === "maintenance-reports") return tableConfigs.maintenance.columns;
    return reportColumnsFromRows(reportRows, reportDashboardColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReportTab, reportDashboardColumns, reportRows]);

  const reportFilterOptions = [
    {
      name: "route",
      label: "Route Filter",
      options: [{ value: "All", label: "All Routes" }, ...routes.map((r) => ({ value: r.id, label: r.routeName }))],
    },
    {
      name: "status",
      label: "Status Filter",
      options: [{ value: "All", label: "All Statuses" }, { value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }],
    },
  ];

  const renderReports = () => {
    return (
      <div className="cms-transport-stack">
        <ReportTabsNavigation
          tabs={reportTabs}
          active={activeReportTab}
          onChange={(tab) => {
            setSearchParams({ tab });
            setQuery("");
            setReportFilters({ route: "All", vehicle: "All", status: "All" });
          }}
        />

        {activeReportTab === "transport-dashboard-report" ? (
          <div className="cms-transport-stat-grid">
            <StatCard icon={IndianRupee} label="Annual Transport Fee" value={formatCurrency(dashboardAnnualFee)} hint="from active assignments" tone="green" />
            <StatCard icon={Wrench} label="Maintenance Cost" value={formatCurrency(dashboardMaintenanceCost)} hint="logged fleet service costs" tone="amber" />
            <StatCard icon={Bus} label="Fleet Capacity" value={formatNumber(dashboardFleetCapacity)} hint="total seats" tone="blue" />
            <StatCard icon={UserCheck} label="Drivers & Attendants" value={formatNumber(dashboardStaffCount)} hint="staff profiles" tone="violet" />
          </div>
        ) : null}

        {reportLoading ? <SkeletonTable columns={6} rows={5} /> : null}

        {!reportLoading ? (
          <TableSection
            title="Transport Report"
            subtitle="Live transport report data derived from fleet records."
            rows={reportRows}
            columns={reportColumns}
            query={query}
            onQuery={setQuery}
            filters={reportFilterOptions}
            filterValues={reportFilters}
            onFilterChange={(name, value) => { setReportFilters((current) => ({ ...current, [name]: value })); navigation.update({ page: null }); }}
            printSection="Reports"
            printSubsection={reportTabs.find((tab) => tab.id === activeReportTab)?.label || "Transport Report"}
            exportFilename={`transport-${activeReportTab}.csv`}
            onPrint={preparePrint}
            tableClassName="cms-transport-report-table"
            onPdfExport={async (report) => {
              try {
                await exportTablePdf(`transport-${activeReportTab}.pdf`, report);
              } catch (error) {
                showErrorToast(`Unable to export PDF: ${getApiErrorMessage(error)}`);
              }
            }}
          />
        ) : null}
      </div>
    );
  };

  const renderActiveSection = () => {
    if (activeSection === "setup") {
      return (
        <div className="cms-transport-stack">
          <TransportTabs
            tabs={setupTabs}
            active={activeSetupTab}
            onChange={(tab) => {
              setSearchParams({ tab });
              setQuery("");
            }}
            compact
          />
          {renderTable(activeSetupTab)}
        </div>
      );
    }

    if (activeSection === "operations") {
      const activeOperationsTab = operationTabs.some((tab) => tab.id === activeOperationTab) ? activeOperationTab : "vehicleAssignments";
      return (
        <div className="cms-transport-stack">
          <TransportTabs
            tabs={operationTabs}
            active={activeOperationsTab}
            onChange={(tab) => {
              setSearchParams({ tab });
              setQuery("");
            }}
            compact
          />
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
          ) : (
            renderTable(activeOperationsTab)
          )}
        </div>
      );
    }

    if (activeSection === "reports") {
      return renderReports();
    }

    return null;
  };

  const sectionMeta = {
    setup: {
      title: "Setup",
      subtitle: "Manage transport routes, pickup points, vehicles, drivers and attendants.",
    },
    operations: {
      title: "Operations",
      subtitle: "Assign vehicles, drivers, student allocations, trips and vehicle maintenance.",
    },
    reports: {
      title: "Reports",
      subtitle: "Live transport report data derived from fleet records.",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Manage transport routes, vehicles, assignments, trips, GPS and reports.",
    },
  };

  const currentMeta = sectionMeta[activeSection] || sectionMeta.setup;

  return (
    <div className="cms-transport-page" style={{ padding: "0.25rem 0" }}>
      {/* Module Title Header matching sidebar item */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: "var(--cms-text, #232a1e)" }}>
            {currentMeta.title}
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: "0.875rem", color: "var(--cms-muted, #727c65)" }}>
            {currentMeta.subtitle}
          </p>
        </div>
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

      {/* Render Active Sub-Tabs & Content */}
      {renderActiveSection()}

      {searchParams.get("action") && (!recordsReady || recordsReady.scope !== scope || isLoading) ? (
        <Modal title="Loading transport record" onClose={closeAction}><SkeletonTable columns={3} rows={3} /></Modal>
      ) : null}
      {/* Pickup Points Multi-Stop Modal */}
      {formConfig?.key === "pickupPoints" && !formConfig.record?.id ? (
        <AddPickupPointsModal
          routes={routes}
          pickupPoints={pickupPoints}
          isSaving={isFormSubmitting}
          onCancel={(hasSaved) => {
            if (!isFormSubmitting) {
              setFormConfig(null);
              if (hasSaved) fetchTransportData();
            }
          }}
          onSave={saveForm}
        />
      ) : formConfig ? (
        <FormModal
          title={formConfig.title}
          fields={formConfig.fields}
          initial={formConfig.record || {}}
          columns={formConfig.key === "routes" ? 2 : 3}
          className="cms-transport-form-modal"
          onCancel={() => { if (!isFormSubmitting) setFormConfig(null); }}
          onSave={saveForm}
          awaitSave
          savingLabel={<span className="cms-transport-action-loading"><i aria-hidden="true" />{formConfig.record?.id ? "Updating..." : "Adding..."}</span>}
        />
      ) : null}

      {/* Add Driver Modal */}
      {isAddDriverOpen ? (
        <AddDriverModal
          drivers={drivers}
          isSaving={isFormSubmitting}
          onCancel={() => { if (!isFormSubmitting) setIsAddDriverOpen(false); }}
          onSave={saveNewDriver}
        />
      ) : null}

      {/* Add Attendant Modal */}
      {isAddAttendantOpen ? (
        <AddAttendantModal
          staff={nonTeachingStaff}
          isSaving={isFormSubmitting}
          onCancel={() => { if (!isFormSubmitting) setIsAddAttendantOpen(false); }}
          onSave={saveNewAttendant}
        />
      ) : null}

      {/* View Details Modal */}
      {detailConfig ? (
        <Modal
          title={detailConfig.title}
          className="cms-transport-detail-modal"
          onClose={() => setDetailConfig(null)}
        >
          <TransportDetailTable row={detailConfig.row} />
        </Modal>
      ) : null}

      {/* Confirm Delete Dialog */}
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

      {/* Feedback Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {/* Print Root */}
      {printPayload ? createPortal(
        <div className="cms-transport-print-root">
          <header className="cms-transport-print-header">
            <strong>Pirnav College</strong>
            <h1>Transport Management</h1>
            <p>Current Section: {printPayload.section} / {printPayload.subsection}</p>
            {printPayload.subtitle ? <small>{printPayload.subtitle}</small> : null}
          </header>
          <div className="cms-transport-print-meta">
            {printPayload.query?.trim() ? <span>Search: {printPayload.query.trim()}</span> : null}
            {printPayload.filters?.map((filter) => <span key={filter.label}>{filter.label}: {filter.value}</span>)}
            <span>Matching records: {printPayload.rows.length}</span>
            <span>Screen page: {printPayload.page} of {printPayload.totalPages}</span>
          </div>
          <table>
            <thead>
              <tr>
                {printPayload.rows.length ? printPayload.columns.map((column) => <th key={column.key}>{column.label}</th>) : <th>Records</th>}
              </tr>
            </thead>
            <tbody>
              {printPayload.rows.length ? printPayload.rows.map((row, rowIndex) => (
                <tr key={`${row.id ?? "print-row"}-${rowIndex}`}>
                  {printPayload.columns.map((column) => <td key={column.key}>{getColumnValue(row, column)}</td>)}
                </tr>
              )) : (
                <tr><td>No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
