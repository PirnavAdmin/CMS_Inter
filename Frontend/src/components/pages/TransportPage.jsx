import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bus,
  CalendarClock,
  CheckCircle,
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
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, FormModal, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import apiEndpoints from "@/api/apiEndpoints.js";
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
  { id: "maintenance-reports", label: "Maintenance Reports" },
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const TABLE_PAGE_SIZE = 5;
const today = new Date("2026-09-15T00:00:00");

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

function exportRows(filename, rows, columns) {
  const header = columns.map((column) => column.label).join(",");
  const body = rows.map((row) =>
    columns
      .map((column) => {
        const value = typeof column.value === "function" ? column.value(row) : row[column.key];
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function Toolbar({ query, onQuery, filters, onAdd, onExport, onPrint, addLabel = "Add Record", className = "" }) {
  return (
    <div className={`cms-transport-toolbar ${className}`.trim()}>
      <label className="cms-transport-search app-search-field">
        <Search className="app-search-field__icon" size={16} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search transport records..." />
      </label>
      {filters ? <div className="cms-transport-filters">{filters}</div> : null}
      <div className="cms-transport-toolbar-actions">
        {onPrint ? (
          <button type="button" className="cms-btn cms-btn-ghost" title="Print / PDF Export" onClick={onPrint}>
            <Printer size={16} /> Print / PDF
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
  addLabel,
  toolbarClassName,
  tableClassName,
}) {
  const [page, setPage] = useState(1);
  const filterKey = JSON.stringify(filterValues);
  const visibleRows = rows.filter((row) => textMatch(row, query)).filter((row) => (rowFilter ? rowFilter(row) : true));
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = visibleRows.slice((currentPage - 1) * TABLE_PAGE_SIZE, currentPage * TABLE_PAGE_SIZE);

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
        <select className="app-select"
          value={filterValues[filter.name] || "All"}
          onChange={(event) => onFilterChange?.(filter.name, event.target.value)}
        >
          {filter.options.map((option) => {
            const normalized = option && typeof option === "object" ? option : { value: option, label: option };
            return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>;
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
          onExport={() => exportRows(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, visibleRows, columns)}
          onPrint={onPrint || (() => window.print())}
          className={toolbarClassName}
        />
        <div className="cms-table-wrap">
          <table className={`cms-table cms-transport-table ${tableClassName || ""}`.trim()}>
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length ? paginatedRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.strong ? "cms-strong" : ""}>
                      {column.badge ? <StatusBadge value={row[column.key]} /> : column.currency ? formatCurrency(row[column.key]) : column.value ? column.value(row) : row[column.key]}
                    </td>
                  ))}
                  <td>
                    <div className="cms-transport-actions">
                      {onView ? <button type="button" className="cms-action-btn" title="View details" onClick={() => onView(row)}><Eye size={15} /></button> : null}
                      {onEdit ? <button type="button" className="cms-action-btn" title="Edit" onClick={() => onEdit(row)}><Edit3 size={15} /></button> : null}
                      {onDelete ? <button type="button" className="cms-action-btn danger" title="Delete" onClick={() => onDelete(row)}><Trash2 size={15} /></button> : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={columns.length + 1} className="cms-transport-empty">No records found.</td>
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
          <span>Select Driver from Non-Teaching Staff <b>*</b></span>
          <select className="app-select" value={values.staffId} disabled={isSaving} onChange={(event) => selectStaffDriver(event.target.value)}>
            <option value="">Select Driver</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.driverName} ({driver.employeeId})</option>)}
          </select>
        </label>
        <label className="cms-field">
          <span>Driver Full Name <b>*</b></span>
          <input value={values.driverName} readOnly />
        </label>
        <label className="cms-field">
          <span>Employee ID <b>*</b></span>
          <input value={values.employeeId} readOnly />
        </label>
        <label className="cms-field">
          <span>Mobile Number <b>*</b></span>
          <input value={values.mobileNumber} readOnly />
        </label>
        <label className="cms-field">
          <span>Email</span>
          <input value={values.email} readOnly />
        </label>
        <label className="cms-field">
          <span>Commercial License No <b>*</b></span>
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
          <select className="app-select" value={values.status} disabled={isSaving} onChange={(event) => update("status", event.target.value)}>
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
      onClose={isSaving ? () => {} : onCancel}
      footer={<><button type="button" className="cms-btn cms-btn-ghost" disabled={isSaving} onClick={onCancel}>Cancel</button><button type="button" className="cms-btn cms-btn-primary" disabled={isSaving} onClick={submit}>{isSaving ? <span className="cms-transport-action-loading"><i aria-hidden="true" />Adding...</span> : "Save"}</button></>}
    >
      <div className="cms-form-grid cols-3">
        <label className="cms-field full">
          <span>Select Non-Teaching Staff <b>*</b></span>
          <select className="app-select" value={values.staffId} disabled={isSaving} onChange={(event) => selectStaff(event.target.value)}>
            <option value="">Select Non-Teaching Staff</option>
            {staff.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.employeeId})</option>)}
          </select>
        </label>
        <label className="cms-field"><span>Employee ID <b>*</b></span><input value={values.employeeId} readOnly /></label>
        <label className="cms-field"><span>Attendant Name <b>*</b></span><input value={values.attendantName} readOnly /></label>
        <label className="cms-field"><span>Mobile Number <b>*</b></span><input value={values.mobileNumber} readOnly /></label>
        <label className="cms-field"><span>Gender <b>*</b></span><input value={values.gender} readOnly /></label>
        <label className="cms-field"><span>Status</span><select className="app-select" value={values.status} disabled={isSaving} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}><option value="Active">Active</option><option value="On Leave">On Leave</option><option value="Inactive">Inactive</option></select></label>
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
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.Items)) return data.Items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.data?.items)) return data.data.items;
  if (Array.isArray(data.data?.Items)) return data.data.Items;
  return [];
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

export default function TransportPage() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [activeSetupTab, setActiveSetupTab] = useState("routes");
  const [activeOperationTab, setActiveOperationTab] = useState("vehicleAssignments");
  const [activeReportTab, setActiveReportTab] = useState("transport-dashboard-report");
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
  const [toast, setToast] = useState("");
  const [formConfig, setFormConfig] = useState(null);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddAttendantOpen, setIsAddAttendantOpen] = useState(false);
  const [detailConfig, setDetailConfig] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverStaffRecords, setDriverStaffRecords] = useState({});
  const [nonTeachingStaff, setNonTeachingStaff] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [vehicleAssignments, setVehicleAssignments] = useState([]);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [gpsSnapshots, setGpsSnapshots] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);

  const fetchTransportData = async () => {
    setIsLoading(true);
    try {
      const driverListUrl = `${apiEndpoints.faculty.list}?PageNumber=1&PageSize=1000`;
      if (import.meta.env.DEV) {
        console.log("Transport Driver Staff API Request:", { url: driverListUrl, method: "GET" });
      }
      const [
        routesRes,
        pickupsRes,
        vehiclesRes,
        staffRes,
        attendantsRes,
        assignmentsRes,
        tripsRes,
        gpsRes,
        maintenanceRes,
        studentRes,
        dashboardRes,
      ] = await Promise.allSettled([
        apiClient.get(`${apiEndpoints.transport.routes}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.pickupPoints}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.vehicles}?PageNumber=1&PageSize=1000`),
        apiClient.get(driverListUrl),
        apiClient.get(`${apiEndpoints.transport.attendants}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.vehicleAssignments}?PageNumber=1&PageSize=1000`),
        apiClient.get(apiEndpoints.transport.trips),
        apiClient.get(apiEndpoints.transport.gps),
        apiClient.get(apiEndpoints.transport.maintenance),
        apiClient.get(`${apiEndpoints.transport.studentAssignments}?PageNumber=1&PageSize=1000`),
        apiClient.get(apiEndpoints.transport.dashboard),
      ]);

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

      if (routesRes.status === "fulfilled" && routesRes.value?.data) {
        const items = extractList(routesRes.value.data);
        setRoutes(
          items.map((r) => ({
            id: r.routeId || r.id,
            routeCode: r.routeCode || "",
            routeName: r.routeName || "",
            routeStart: r.startLocation || r.routeStart || "",
            routeEnd: r.endLocation || r.routeEnd || "",
            totalDistanceKm: Number(r.distanceKm || r.totalDistanceKm || r.distance || 0),
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

      if (pickupsRes.status === "fulfilled" && pickupsRes.value?.data) {
        const items = extractList(pickupsRes.value.data);
        setPickupPoints(
          items.map((p) => ({
            id: p.pickupPointId || p.id,
            routeId: p.routeId,
            routeName: p.routeName || "",
            pickupName: p.pickupPointName || p.stopName || p.pickupName || "",
            landmark: p.landmark || p.stopAddress || "",
            sequenceNumber: p.sequenceNo || p.sequenceNumber || p.stopOrder || 1,
            pickupTime: p.pickupTime ? String(p.pickupTime).substring(0, 5) : "07:30",
            dropTime: p.dropTime ? String(p.dropTime).substring(0, 5) : "16:15",
            distanceKm: Number(p.distanceFromStart || p.distanceFromSchool || p.distanceKm || 0),
            monthlyFee: Number(p.monthlyFee || 0),
            status: p.status === true || p.status === 1 || p.status === "Active" ? "Active" : "Inactive",
          }))
        );
      }

      if (vehiclesRes.status === "fulfilled" && vehiclesRes.value?.data) {
        const items = extractList(vehiclesRes.value.data);
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
        const items = extractList(staffRes.value.data);
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
        const items = extractList(attendantsRes.value.data);
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

      if (assignmentsRes.status === "fulfilled" && assignmentsRes.value?.data) {
        const items = extractList(assignmentsRes.value.data);
        setVehicleAssignments(
          items.map((va) => ({
            id: va.assignmentId || va.id,
            routeId: va.routeId,
            routeName: va.routeName || va.route || "",
            vehicleId: va.vehicleId,
            vehicleNumber: va.vehicleNumber || va.busNumber || "",
            driverId: va.driverId,
            driverName: va.driverName || va.driver || "",
            attendantId: va.attendantId,
            attendantName: va.attendantName || va.attendant || "Unassigned",
            morningTripTime: va.morningTripTime || "07:00 AM",
            eveningTripTime: va.eveningTripTime || "03:45 PM",
            effectiveFrom: va.effectiveFrom ? String(va.effectiveFrom).split("T")[0] : "",
            status: va.status === true || va.status === 1 || va.status === "Active" ? "Active" : "Inactive",
          }))
        );
      }

      if (tripsRes.status === "fulfilled" && tripsRes.value?.data) {
        const tripsData = tripsRes.value.data?.data?.trips || tripsRes.value.data?.data || extractList(tripsRes.value.data);
        if (Array.isArray(tripsData)) {
          setTrips(
            tripsData.map((t) => ({
              id: t.tripId || t.id,
              assignmentId: t.assignmentId,
              vehicleId: t.vehicleId,
              vehicleNumber: t.vehicleNumber || t.busNumber || "",
              routeId: t.routeId,
              routeName: t.routeName || "",
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
        const gpsData = Array.isArray(gpsRes.value.data?.data)
          ? gpsRes.value.data.data
          : extractList(gpsRes.value.data);
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
        const items = extractList(maintenanceRes.value.data);
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
            status: m.status || (m.statusBool ? "Completed" : "Scheduled"),
            notes: m.remarks || m.notes || "",
          }))
        );
      }

      if (studentRes.status === "fulfilled" && studentRes.value?.data) {
        const items = extractList(studentRes.value.data);
        setStudentAssignments(
          items.map((s) => ({
            id: s.assignmentId || s.id,
            studentName: s.studentName || "Student",
            admissionNo: s.admissionNo || "",
            routeId: s.routeId,
            routeName: s.routeName || "",
            pickupPointName: s.pickupPointName || s.pickupPoint || "",
            vehicleNumber: s.vehicleNumber || "Unassigned",
            vehicleId: s.vehicleId || 1,
            feePlan: s.feePlan || "Annual",
            monthlyFee: Number(s.monthlyFee || 1200),
            annualFee: Number(s.annualFee || (s.monthlyFee ? s.monthlyFee * 10 : 12000)),
            status: s.status === true || s.status === 1 || s.status === "Active" ? "Active" : "Inactive",
          }))
        );
      }

      if (dashboardRes.status === "fulfilled" && dashboardRes.value?.data?.data?.summary) {
        setDashboardMetrics(dashboardRes.value.data.data.summary);
      }
    } catch (err) {
      console.error("Error fetching transport data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, []);

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

  const findRoute = (id) => routes.find((route) => route.id === id);
  const findVehicle = (id) => vehicles.find((vehicle) => vehicle.id === id);
  const findDriver = (id) => drivers.find((driver) => driver.id === id);
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

  const openForm = (key, title, fields, record = null) => {
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
      : record;
    setFormConfig({ key, title, fields, record: formRecord });
  };

  const saveForm = async (values) => {
    if (isFormSubmitting || !formConfig) return;
    const { key, record } = formConfig;
    const isEdit = Boolean(record?.id);
    const numericId = isEdit ? Number(String(record.id).replace(/[^\d]/g, "")) || record.id : null;

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
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.routeById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.routes, payload);
        }
      } else if (key === "pickupPoints") {
        const payload = {
          routeId: Number(values.routeId),
          pickupPointName: values.pickupName,
          landmark: values.landmark || "Main Landmark",
          sequenceNo: Number(values.sequenceNumber) || 1,
          pickupTime: values.pickupTime ? (values.pickupTime.length === 5 ? `${values.pickupTime}:00` : values.pickupTime) : "07:30:00",
          dropTime: values.dropTime ? (values.dropTime.length === 5 ? `${values.dropTime}:00` : values.dropTime) : "16:15:00",
          distanceFromStart: Number(values.distanceKm) || 0,
          monthlyFee: Number(values.monthlyFee) || 1200,
          status: values.status === "Active",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.pickupPointById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.pickupPoints, payload);
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
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.vehicleById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.vehicles, payload);
        }
      } else if (key === "drivers") {
        if (isEdit) {
          const staffRecord = driverStaffRecords[String(record.id)];
          if (!staffRecord) throw new Error("The staff driver record could not be found. Refresh the list and try again.");

          const departmentSpecific = {
            ...readDepartmentSpecific(staffRecord),
            licenseNumber: values.licenseNumber,
            licenseExpiry: values.licenseExpiryDate || null,
          };
          const payload = {
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
          };
          await apiClient.put(apiEndpoints.faculty.update(record.id), payload);
        } else {
          throw new Error("Drivers are managed in Non-Teaching Staff. Create new drivers under Staff (Role: Driver).");
        }
      } else if (key === "attendants") {
        const payload = {
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
          status: values.status === "Active",
        };
        if (isEdit) {
          await apiClient.put(apiEndpoints.transport.vehicleAssignmentById(numericId), payload);
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
          await apiClient.put(apiEndpoints.transport.maintenanceById(numericId), payload);
        } else {
          await apiClient.post(apiEndpoints.transport.maintenance, payload);
        }
      }

      await fetchTransportData();
      setFormConfig(null);
      setToast(isEdit ? "Transport record updated successfully." : "Transport record added successfully.");
    } catch (err) {
      console.error("API error saving transport record:", err);
      setToast(`Error saving record: ${getApiErrorMessage(err)}`);
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
      };
      if (import.meta.env.DEV) console.log("Transport Driver POST Payload:", payload);
      const response = await apiClient.post(apiEndpoints.transport.drivers, payload);
      if (import.meta.env.DEV) console.log("Transport Driver API Response:", response?.data, response?.status);
      setIsAddDriverOpen(false);
      await fetchTransportData();
      setToast("Transport driver added successfully.");
    } catch (err) {
      console.error("Transport Driver API Error:", {
        url: apiEndpoints.transport.drivers,
        method: "POST",
        status: err?.response?.status,
        response: err?.response?.data,
        error: err,
      });
      setToast(`Error adding driver: ${getApiErrorMessage(err)}`);
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
      };
      await apiClient.post(apiEndpoints.transport.attendants, payload);
      setIsAddAttendantOpen(false);
      await fetchTransportData();
      setToast("Bus attendant added successfully.");
    } catch (err) {
      console.error("API error saving transport attendant:", err);
      setToast(`Error adding attendant: ${getApiErrorMessage(err)}`);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const requestDelete = (key, row, label) => {
    setDeleteConfig({ key, row, label });
  };

  const confirmDelete = async () => {
    if (isDeleteSubmitting || !deleteConfig) return;
    const { key, row } = deleteConfig;
    const numericId = Number(String(row.id).replace(/[^\d]/g, "")) || row.id;

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
      if (key === "studentAssignments") {
        const refreshedAssignments = await apiClient.get(`${apiEndpoints.transport.studentAssignments}?PageNumber=1&PageSize=1000`);
        const recordStillExists = extractList(refreshedAssignments.data)
          .some((assignment) => String(assignment.assignmentId || assignment.id) === String(numericId));
        if (recordStillExists) {
          throw new Error("The backend reported success, but the Student Transport assignment was not deleted.");
        }
      }
      await fetchTransportData();
      setDeleteConfig(null);
      setToast("Transport record deleted successfully.");
    } catch (err) {
      console.error("API error deleting transport record:", err);
      setToast(`Error deleting record: ${getApiErrorMessage(err)}`);
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
    { key: "studentName", label: "Student & Class", strong: true, value: (row) => `${row.studentName} (${row.admissionNo || ""})` },
    { key: "admissionNo", label: "Adm No" },
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
      rows: routes,
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
      rows: pickupPoints,
      fields: pickupFields,
      addLabel: "Add Pickup",
      columns: [
        { key: "pickupName", label: "Pickup", strong: true },
        { key: "routeId", label: "Route", value: (row) => findRoute(row.routeId)?.routeName || row.routeName || "-" },
        { key: "sequenceNumber", label: "Seq" },
        { key: "pickupTime", label: "Pickup" },
        { key: "dropTime", label: "Drop" },
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
      subtitle: "Fetched automatically from Non-Teaching Staff (Role: Driver). Update transport licenses and contact details.",
      rows: drivers,
      fields: driverFields,
      addLabel: "Add Driver",
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
      addLabel: "Add Attendant",
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
      rows: vehicleAssignments,
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
      addLabel: "Allot Transport",
      columns: studentTransportReportColumns,
    },
    trips: {
      title: "Vehicle Trips",
      subtitle: "Track daily morning and evening trip movement.",
      rows: trips,
      fields: tripFields,
      addLabel: "Add Trip",
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

  const openTripDetails = (trip) => {
    setDetailConfig({ title: "Trip Details", row: getTripDetailRow(trip) });
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
        onAdd={key === "drivers" ? () => setIsAddDriverOpen(true) : key === "attendants" ? () => setIsAddAttendantOpen(true) : config.addLabel && config.fields ? () => openForm(key, config.addLabel, config.fields) : undefined}
        onEdit={config.fields ? (row) => openForm(key, `Edit ${config.title}`, config.fields, row) : undefined}
        onDelete={(row) => requestDelete(key, row, config.title)}
        onView={(row) => setDetailConfig({ title: config.title, row })}
        toolbarClassName={key === "vehicles" ? "cms-transport-vehicle-toolbar" : undefined}
        tableClassName={key === "drivers" ? "cms-transport-driver-table" : undefined}
      />
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
          <span><strong>Regulatory Compliance Warning</strong> {summary.expiringDocs} vehicle document(s) and {summary.expiringLicenses} driver license(s) expiring soon.</span>
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
                trips.map((trip) => {
                  const assignment = findAssignment(trip.assignmentId);
                  return (
                    <div key={trip.id} className="cms-transport-trip">
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
                vehicles.map((vehicle) => {
                  const { assigned, capacity, percent } = getVehicleOccupancy(vehicle);
                  return (
                    <div key={vehicle.id}>
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
                routes.map((route) => {
                  const students = studentAssignments.filter((student) => student.routeId === route.id && student.status === "Active").length;
                  return (
                    <div key={route.id}>
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
        gpsSnapshots.map((snapshot) => (
          <div key={snapshot.id} className="cms-transport-gps-card">
            <div>
              <strong>{snapshot.vehicleNumber}</strong>
              <StatusBadge value={snapshot.status} />
            </div>
            <p>{snapshot.routeName}</p>
            <InfoGrid
              items={[
                { label: "Speed", value: `${snapshot.speed} km/h` },
                { label: "Next Stop", value: snapshot.nextStop },
                { label: "Last Sync", value: snapshot.lastUpdated },
                { label: "Coordinates", value: `${snapshot.latitude}, ${snapshot.longitude}` },
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
    const totalTransportRevenue = studentAssignments.reduce((total, item) => total + (Number(item.annualFee) || 0), 0);
    const activeMaintenanceCost = maintenance.reduce((total, item) => total + (Number(item.cost) || 0), 0);
    const reportRows = activeReportTab === "student-transport-reports"
      ? studentAssignments
      : activeReportTab === "route-reports"
        ? routes
        : activeReportTab === "vehicle-reports"
          ? vehicles
          : activeReportTab === "driver-reports"
            ? drivers
            : activeReportTab === "maintenance-reports"
            ? maintenance
            : activeReportTab === "trip-reports"
              ? trips
              : vehicleAssignments;
    const reportColumns = activeReportTab === "student-transport-reports"
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
              : tableConfigs.vehicleAssignments.columns;
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
    };
    const matchesReportRoute = (row) => {
      if (reportFilters.route === "All") return true;
      const route = findRoute(reportFilters.route);
      const assignment = findAssignment(row.assignmentId);
      return (
        row.id === reportFilters.route ||
        row.routeId === reportFilters.route ||
        assignment?.routeId === reportFilters.route ||
        row.routeName === route?.routeName ||
        row.routeName === route?.routeCode
      );
    };
    const matchesReportVehicle = (row) => {
      if (reportFilters.vehicle === "All") return true;
      const vehicle = findVehicle(reportFilters.vehicle);
      const assignment = findAssignment(row.assignmentId);
      return (
        row.id === reportFilters.vehicle ||
        row.vehicleId === reportFilters.vehicle ||
        assignment?.vehicleId === reportFilters.vehicle ||
        row.vehicleNumber === vehicle?.vehicleNumber ||
        row.registrationNumber === vehicle?.registrationNumber
      );
    };
    const matchesReportStatus = (row) => reportFilters.status === "All" || row.status === reportFilters.status;
    const filterReportRow = (row) => {
      const filters = reportFilterFields[activeReportTab] || [];
      const needsRoute = filters.some((filter) => filter.name === "route");
      const needsVehicle = filters.some((filter) => filter.name === "vehicle");
      const needsStatus = filters.some((filter) => filter.name === "status");
      return (
        (!needsRoute || matchesReportRoute(row)) &&
        (!needsVehicle || matchesReportVehicle(row)) &&
        (!needsStatus || matchesReportStatus(row))
      );
    };
    const needsCompactReportToolbar = activeReportTab === "trip-reports" || activeReportTab === "student-transport-reports";

    return (
      <div className="cms-transport-stack">
        <TransportTabs
          tabs={reportTabs}
          active={activeReportTab}
          onChange={(tab) => {
            setActiveReportTab(tab);
            setQuery("");
            setReportFilters({ route: "All", vehicle: "All", status: "All" });
          }}
          compact
        />
        {activeReportTab === "transport-dashboard-report" ? (
          <div className="cms-transport-stat-grid">
            <StatCard icon={IndianRupee} label="Annual Transport Fee" value={formatCurrency(totalTransportRevenue)} hint="from active assignments" tone="green" />
            <StatCard icon={Wrench} label="Maintenance Cost" value={formatCurrency(activeMaintenanceCost)} hint="logged fleet service costs" tone="amber" />
            <StatCard icon={Bus} label="Fleet Capacity" value={formatNumber(vehicles.reduce((total, vehicle) => total + Number(vehicle.capacity || 0), 0))} hint="total seats" tone="blue" />
            <StatCard icon={UserCheck} label="Drivers & Attendants" value={drivers.length + attendants.length} hint="staff profiles" tone="violet" />
          </div>
        ) : null}
        <TableSection
          title="Transport Report"
          subtitle="Live transport report data derived from fleet records."
          rows={reportRows}
          columns={reportColumns}
          query={query}
          onQuery={setQuery}
          filters={reportFilterFields[activeReportTab]}
          filterValues={reportFilters}
          onFilterChange={(name, value) => setReportFilters((current) => ({ ...current, [name]: value }))}
          rowFilter={filterReportRow}
          toolbarClassName={`cms-transport-report-toolbar${needsCompactReportToolbar ? " cms-transport-report-toolbar-compact" : ""}`}
          onExport={() => exportRows("transport-report.csv", reportRows.filter((row) => textMatch(row, query)), reportColumns)}
        />
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

      {formConfig ? (
        <FormModal
          title={formConfig.title}
          fields={formConfig.fields}
          initial={formConfig.record || {}}
          columns={formConfig.key === "routes" ? 2 : 3}
          className={formConfig.key === "pickupPoints" ? "cms-transport-pickup-modal" : ""}
          onCancel={() => { if (!isFormSubmitting) setFormConfig(null); }}
          onSave={saveForm}
          awaitSave
          savingLabel={<span className="cms-transport-action-loading"><i aria-hidden="true" />{formConfig.record?.id ? "Updating..." : "Adding..."}</span>}
        />
      ) : null}

      {isAddDriverOpen ? (
        <AddDriverModal
          drivers={drivers}
          isSaving={isFormSubmitting}
          onCancel={() => { if (!isFormSubmitting) setIsAddDriverOpen(false); }}
          onSave={saveNewDriver}
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

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
