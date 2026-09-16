import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bus,
  CalendarClock,
  Download,
  Edit3,
  Eye,
  IndianRupee,
  MapPin,
  Plus,
  Route,
  Search,
  Trash2,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, FormModal, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import {
  transportBusAttendants,
  transportDrivers,
  transportGpsSnapshots,
  transportMaintenance,
  transportPickupPoints,
  transportRoutes,
  transportStudentAssignments,
  transportTrips,
  transportVehicleAssignments,
  transportVehicles,
} from "@/data/mockData.js";
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

function Toolbar({ query, onQuery, filters, onAdd, onExport, addLabel = "Add Record", className = "" }) {
  return (
    <div className={`cms-transport-toolbar ${className}`.trim()}>
      <label className="cms-transport-search">
        <Search size={16} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search transport records..." />
      </label>
      {filters ? <div className="cms-transport-filters">{filters}</div> : null}
      <div className="cms-transport-toolbar-actions">
        {onExport ? (
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onExport}>
            <Download size={16} /> Export
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
  addLabel,
  toolbarClassName,
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
        <select
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
          className={toolbarClassName}
        />
        <div className="cms-table-wrap">
          <table className="cms-table cms-transport-table">
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
  const [detailConfig, setDetailConfig] = useState(null);
  const [deleteConfig, setDeleteConfig] = useState(null);

  const [routes, setRoutes] = useState(transportRoutes);
  const [pickupPoints, setPickupPoints] = useState(transportPickupPoints);
  const [vehicles, setVehicles] = useState(transportVehicles);
  const [drivers, setDrivers] = useState(transportDrivers);
  const [attendants, setAttendants] = useState(transportBusAttendants);
  const [vehicleAssignments, setVehicleAssignments] = useState(transportVehicleAssignments);
  const [studentAssignments] = useState(transportStudentAssignments);
  const [trips] = useState(transportTrips);
  const [maintenance, setMaintenance] = useState(transportMaintenance);
  const [gpsSnapshots] = useState(transportGpsSnapshots);

  const routeOptions = routes.map((route) => ({ value: route.id, label: route.routeName }));
  const vehicleOptions = vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.vehicleNumber }));
  const driverOptions = drivers.map((driver) => ({ value: driver.id, label: driver.driverName }));
  const attendantOptions = attendants.map((attendant) => ({ value: attendant.id, label: attendant.attendantName }));

  const dataMap = {
    routes: { rows: routes, setRows: setRoutes, prefix: "TR" },
    pickupPoints: { rows: pickupPoints, setRows: setPickupPoints, prefix: "TP" },
    vehicles: { rows: vehicles, setRows: setVehicles, prefix: "TV" },
    drivers: { rows: drivers, setRows: setDrivers, prefix: "TD" },
    attendants: { rows: attendants, setRows: setAttendants, prefix: "TA" },
    vehicleAssignments: { rows: vehicleAssignments, setRows: setVehicleAssignments, prefix: "TVA" },
    maintenance: { rows: maintenance, setRows: setMaintenance, prefix: "TM" },
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
      activeVehicles: activeVehicles.length,
      maintenanceVehicles: vehicles.filter((vehicle) => vehicle.status === "Maintenance").length,
      activeRoutes: routes.filter((route) => route.status === "Active").length,
      activeStudents: activeStudents.length,
      runningTrips: trips.filter((trip) => trip.status === "Running").length,
      completedTrips: trips.filter((trip) => trip.status === "Completed").length,
      expiringDocs: expiringDocs.length,
      expiringLicenses: expiringLicenses.length,
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
    if (key === "maintenance") {
      const vehicle = findVehicle(record.vehicleId);
      return { ...record, vehicleNumber: vehicle?.vehicleNumber || record.vehicleNumber };
    }
    return record;
  };

  const openForm = (key, title, fields, record = null) => {
    setFormConfig({ key, title, fields, record });
  };

  const saveForm = (values) => {
    const { key, record } = formConfig;
    const store = dataMap[key];
    const nextRecord = enrichRecord(key, { ...record, ...values, id: record?.id || makeId(store.prefix, store.rows) });
    store.setRows((current) => {
      if (record?.id) return current.map((item) => (item.id === record.id ? nextRecord : item));
      return [nextRecord, ...current];
    });
    setFormConfig(null);
    setToast(record?.id ? "Transport record updated." : "Transport record added.");
  };

  const requestDelete = (key, row, label) => {
    setDeleteConfig({ key, row, label });
  };

  const confirmDelete = () => {
    const store = dataMap[deleteConfig.key];
    store.setRows((current) => current.filter((item) => item.id !== deleteConfig.row.id));
    setDeleteConfig(null);
    setToast("Transport record deleted.");
  };

  const routeFields = [
    { name: "routeCode", label: "Route Code (Unique)", required: true, placeholder: "e.g. R-NORTH-101" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
    { name: "routeName", label: "Route Name", required: true, placeholder: "Enter route name..." },
    { name: "routeStart", label: "Route Start", placeholder: "Enter route start location..." },
    { name: "routeEnd", label: "Route End", placeholder: "Enter route end location..." },
    { name: "totalDistanceKm", label: "Total Distance (KM)", type: "number", min: 0, placeholder: "e.g. 18.5" },
    { name: "estimatedTimeMinutes", label: "Est Time (Minutes)", type: "number", min: 0, placeholder: "e.g. 45" },
    { name: "minDistanceKm", label: "Min Range (KM)", type: "number", min: 0, placeholder: "e.g. 5" },
    { name: "minBaseFare", label: "Non-AC Base Fare (₹)", type: "number", min: 0, placeholder: "e.g. 1000" },
    { name: "ratePerKm", label: "Non-AC Rate/Addl KM", type: "number", min: 0, placeholder: "e.g. 100" },
    { name: "acMinBaseFare", label: "AC Base Fare (₹)", type: "number", min: 0, placeholder: "e.g. 1200" },
    { name: "acRatePerKm", label: "AC Rate/Addl KM (₹)", type: "number", min: 0, placeholder: "e.g. 150" },
    { name: "description", label: "Description", type: "textarea", full: true, placeholder: "Enter route description..." },
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
      subtitle: "Maintain driver contact details, license details and assignment readiness.",
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
    trips: {
      title: "Vehicle Trips",
      subtitle: "Track daily morning and evening trip movement.",
      rows: trips,
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
  };

  const filterSetupRow = (key, row) => {
    const selected = setupFilters[key];
    if (!selected || selected === "All") return true;
    if (key === "pickupPoints") return String(row.routeId) === String(selected);
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

  const studentTransportReportColumns = [
    { key: "studentName", label: "Student & Class", strong: true, value: (row) => `${row.studentName} (${row.group || "-"} ${row.section || ""})` },
    { key: "admissionNo", label: "Adm No" },
    { key: "routeName", label: "Transit Route" },
    { key: "pickupPointName", label: "Pickup Point" },
    { key: "vehicleNumber", label: "Assigned Vehicle" },
    { key: "feePlan", label: "Fee Plan" },
    { key: "monthlyFee", label: "Fee Amount", currency: true },
    { key: "status", label: "Status", badge: true },
  ];

  const renderTable = (key) => {
    const config = tableConfigs[key];
    const isTripsTable = key === "trips";
    const isSetupFilterTable = Boolean(setupTableFilters[key]);
    return (
      <TableSection
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
        onAdd={!isTripsTable ? () => openForm(key, config.addLabel, config.fields) : undefined}
        onEdit={!isTripsTable ? (row) => openForm(key, `Edit ${config.title}`, config.fields, row) : undefined}
        onDelete={!isTripsTable ? (row) => requestDelete(key, row, config.title) : undefined}
        onView={(row) => setDetailConfig({ title: config.title, row })}
      />
    );
  };

  const renderDashboard = () => (
    <div className="cms-transport-stack">
      <div className="cms-transport-stat-grid">
        <StatCard icon={Bus} label="Active Vehicles" value={summary.activeVehicles} hint={`${summary.maintenanceVehicles} under maintenance`} tone="blue" />
        <StatCard icon={Route} label="Active Routes" value={summary.activeRoutes} hint={`${pickupPoints.length} pickup points`} tone="green" />
        <StatCard icon={Users} label="Assigned Students" value={summary.activeStudents} hint={`${summary.utilization}% capacity used`} tone="violet" />
        <StatCard icon={CalendarClock} label="Today's Trips" value={summary.completedTrips + summary.runningTrips} hint={`${summary.runningTrips} running now`} tone="amber" />
      </div>

      {(summary.expiringDocs || summary.expiringLicenses) ? (
        <div className="cms-transport-warning">
          <AlertTriangle size={18} />
          <span>{summary.expiringDocs} vehicle document set(s) and {summary.expiringLicenses} driver license(s) need review within the next 45 days.</span>
        </div>
      ) : null}

      <div className="cms-transport-two-col">
        <div className="cms-card">
          <div className="cms-card-head"><h2>Today's Transport Status</h2></div>
          <div className="cms-card-body">
            <div className="cms-transport-trip-list">
              {trips.map((trip) => (
                <button key={trip.id} type="button" className="cms-transport-trip" onClick={() => setDetailConfig({ title: "Trip Details", row: trip })}>
                  <span>
                    <strong>{trip.vehicleNumber}</strong>
                    <small>{trip.routeName} - {trip.tripType}</small>
                  </span>
                  <StatusBadge value={trip.status} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cms-card">
          <div className="cms-card-head"><h2>Route Occupancy</h2></div>
          <div className="cms-card-body">
            <div className="cms-transport-occupancy">
              {vehicleAssignments.map((assignment) => {
                const capacity = findVehicle(assignment.vehicleId)?.capacity || 0;
                const assigned = studentAssignments.filter((student) => student.vehicleId === assignment.vehicleId && student.status === "Active").length;
                const percent = capacity ? Math.round((assigned / capacity) * 100) : 0;
                return (
                  <div key={assignment.id}>
                    <span><strong>{assignment.routeName}</strong><small>{assigned}/{capacity} seats</small></span>
                    <div className="cms-transport-progress"><i style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-card-head"><h2>Live GPS Snapshot</h2></div>
        <div className="cms-card-body">
          {renderGpsCards()}
        </div>
      </div>
    </div>
  );

  const renderGpsCards = () => (
    <div className="cms-transport-gps-grid">
      {gpsSnapshots.map((snapshot) => (
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
      ))}
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
            <StatCard icon={Wrench} label="Maintenance Cost" value={formatCurrency(activeMaintenanceCost)} hint="current mock logs" tone="amber" />
            <StatCard icon={Bus} label="Fleet Capacity" value={formatNumber(vehicles.reduce((total, vehicle) => total + Number(vehicle.capacity || 0), 0))} hint="total seats" tone="blue" />
            <StatCard icon={UserCheck} label="Drivers & Attendants" value={drivers.length + attendants.length} hint="staff profiles" tone="violet" />
          </div>
        ) : null}
        <TableSection
          title="Transport Report"
          subtitle="Mock report data derived from the selected transport records."
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
                  <p>Mock live location status for active transport vehicles.</p>
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
        <TransportTabs active={activeSection} tabs={sectionTabs} onChange={(tab) => { setActiveSection(tab); setQuery(""); }} />
        {renderActiveSection()}
      </div>

      {formConfig ? (
        <FormModal
          title={formConfig.title}
          fields={formConfig.fields}
          initial={formConfig.record || {}}
          columns={3}
          onCancel={() => setFormConfig(null)}
          onSave={saveForm}
        />
      ) : null}

      {detailConfig ? (
        <Modal title={detailConfig.title} onClose={() => setDetailConfig(null)}>
          <InfoGrid
            items={Object.entries(detailConfig.row).map(([key, value]) => ({
              label: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
              value: typeof value === "boolean" ? (value ? "Yes" : "No") : String(value ?? "-"),
            }))}
          />
        </Modal>
      ) : null}

      {deleteConfig ? (
        <ConfirmDialog
          danger
          title="Delete transport record"
          message={`Delete this ${deleteConfig.label.toLowerCase()} record? This only updates the current mock data view.`}
          onCancel={() => setDeleteConfig(null)}
          onConfirm={confirmDelete}
          confirmLabel="Delete"
        />
      ) : null}

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
