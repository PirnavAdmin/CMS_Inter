import { useState } from "react";
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
  Navigation,
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
  transportFeeConfigs,
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
  { id: "setup", label: "Setup Masters", icon: Route },
  { id: "operations", label: "Operations", icon: Bus },
  { id: "reports", label: "Reports", icon: Download },
  { id: "portals", label: "Portals", icon: Users },
];

const setupTabs = [
  { id: "routes", label: "Routes" },
  { id: "pickupPoints", label: "Pickup Points" },
  { id: "vehicles", label: "Vehicles" },
  { id: "drivers", label: "Drivers" },
  { id: "attendants", label: "Attendants" },
  { id: "feeConfigs", label: "Fee Config" },
];

const operationTabs = [
  { id: "vehicleAssignments", label: "Vehicle Assignment" },
  { id: "studentAssignments", label: "Student Assignment" },
  { id: "trips", label: "Vehicle Trips" },
  { id: "gps", label: "GPS Tracking" },
  { id: "maintenance", label: "Maintenance" },
];

const reportTabs = [
  { id: "summary", label: "Summary" },
  { id: "students", label: "Students" },
  { id: "routes", label: "Routes" },
  { id: "vehicles", label: "Vehicles" },
  { id: "maintenance", label: "Maintenance" },
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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

function Toolbar({ query, onQuery, onAdd, onExport, addLabel = "Add Record" }) {
  return (
    <div className="cms-transport-toolbar">
      <label className="cms-transport-search">
        <Search size={16} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search transport records..." />
      </label>
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

function TableSection({ title, subtitle, rows, columns, query, onQuery, onAdd, onEdit, onDelete, onView, addLabel }) {
  const visibleRows = rows.filter((row) => textMatch(row, query));

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
          addLabel={addLabel}
          onAdd={onAdd}
          onExport={() => exportRows(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, visibleRows, columns)}
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
              {visibleRows.length ? visibleRows.map((row) => (
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
  const [activeReportTab, setActiveReportTab] = useState("summary");
  const [query, setQuery] = useState("");
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
  const [studentAssignments, setStudentAssignments] = useState(transportStudentAssignments);
  const [trips, setTrips] = useState(transportTrips);
  const [maintenance, setMaintenance] = useState(transportMaintenance);
  const [feeConfigs, setFeeConfigs] = useState(transportFeeConfigs);
  const [gpsSnapshots] = useState(transportGpsSnapshots);

  const routeOptions = routes.map((route) => ({ value: route.id, label: route.routeName }));
  const vehicleOptions = vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.vehicleNumber }));
  const driverOptions = drivers.map((driver) => ({ value: driver.id, label: driver.driverName }));
  const attendantOptions = attendants.map((attendant) => ({ value: attendant.id, label: attendant.attendantName }));
  const pickupOptions = pickupPoints.map((point) => ({ value: point.id, label: `${point.pickupName} (${point.distanceKm} km)` }));

  const dataMap = {
    routes: { rows: routes, setRows: setRoutes, prefix: "TR" },
    pickupPoints: { rows: pickupPoints, setRows: setPickupPoints, prefix: "TP" },
    vehicles: { rows: vehicles, setRows: setVehicles, prefix: "TV" },
    drivers: { rows: drivers, setRows: setDrivers, prefix: "TD" },
    attendants: { rows: attendants, setRows: setAttendants, prefix: "TA" },
    vehicleAssignments: { rows: vehicleAssignments, setRows: setVehicleAssignments, prefix: "TVA" },
    studentAssignments: { rows: studentAssignments, setRows: setStudentAssignments, prefix: "TSA" },
    trips: { rows: trips, setRows: setTrips, prefix: "TT" },
    maintenance: { rows: maintenance, setRows: setMaintenance, prefix: "TM" },
    feeConfigs: { rows: feeConfigs, setRows: setFeeConfigs, prefix: "TFC" },
  };

  const findRoute = (id) => routes.find((route) => route.id === id);
  const findVehicle = (id) => vehicles.find((vehicle) => vehicle.id === id);
  const findDriver = (id) => drivers.find((driver) => driver.id === id);
  const findAttendant = (id) => attendants.find((attendant) => attendant.id === id);
  const findPickup = (id) => pickupPoints.find((point) => point.id === id);

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
    if (key === "studentAssignments") {
      const route = findRoute(record.routeId);
      const pickup = findPickup(record.pickupPointId);
      const vehicle = findVehicle(record.vehicleId);
      const monthlyFee = Number(record.monthlyFee) || 0;
      return {
        ...record,
        monthlyFee,
        annualFee: Number(record.annualFee) || monthlyFee * 12,
        routeName: route?.routeName || record.routeName,
        pickupPointName: pickup?.pickupName || record.pickupPointName,
        vehicleNumber: vehicle?.vehicleNumber || record.vehicleNumber,
      };
    }
    if (key === "maintenance") {
      const vehicle = findVehicle(record.vehicleId);
      return { ...record, vehicleNumber: vehicle?.vehicleNumber || record.vehicleNumber };
    }
    if (key === "feeConfigs") {
      const route = findRoute(record.routeId);
      return { ...record, routeName: route?.routeName || record.routeName };
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
    { name: "routeCode", label: "Route Code", required: true },
    { name: "routeName", label: "Route Name", required: true },
    { name: "routeStart", label: "Start Point", required: true },
    { name: "routeEnd", label: "End Point", required: true },
    { name: "totalDistanceKm", label: "Distance (km)", type: "number", min: 0, required: true },
    { name: "estimatedTimeMinutes", label: "Estimated Time (min)", type: "number", min: 0 },
    { name: "minBaseFare", label: "Base Fare", type: "number", min: 0 },
    { name: "ratePerKm", label: "Rate / km", type: "number", min: 0 },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
    { name: "description", label: "Description", type: "textarea", full: true },
  ];

  const pickupFields = [
    { name: "routeId", label: "Route", type: "select", options: routeOptions, required: true },
    { name: "pickupName", label: "Pickup Point", required: true },
    { name: "area", label: "Area", required: true },
    { name: "landmark", label: "Landmark" },
    { name: "sequenceNumber", label: "Sequence", type: "number", min: 1, required: true },
    { name: "pickupTime", label: "Pickup Time", type: "time", required: true },
    { name: "dropTime", label: "Drop Time", type: "time", required: true },
    { name: "distanceKm", label: "Distance (km)", type: "number", min: 0, required: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ];

  const vehicleFields = [
    { name: "vehicleNumber", label: "Vehicle Number", required: true },
    { name: "registrationNumber", label: "Registration No.", required: true },
    { name: "vehicleType", label: "Vehicle Type", type: "select", options: ["Bus", "Mini Bus", "Van"], required: true },
    { name: "capacity", label: "Capacity", type: "number", min: 1, required: true },
    { name: "isAC", label: "AC Vehicle", type: "checkbox", placeholder: "Air conditioned" },
    { name: "insuranceExpiry", label: "Insurance Expiry", type: "date" },
    { name: "pollutionExpiry", label: "Pollution Expiry", type: "date" },
    { name: "fitnessExpiry", label: "Fitness Expiry", type: "date" },
    { name: "gpsDeviceId", label: "GPS Device ID" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Maintenance"], required: true },
  ];

  const driverFields = [
    { name: "employeeId", label: "Employee ID", required: true },
    { name: "driverName", label: "Driver Name", required: true },
    { name: "mobileNumber", label: "Mobile", type: "tel", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "licenseNumber", label: "License No.", required: true },
    { name: "licenseExpiryDate", label: "License Expiry", type: "date" },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
    { name: "address", label: "Address", type: "textarea", full: true },
  ];

  const attendantFields = [
    { name: "employeeId", label: "Employee ID", required: true },
    { name: "attendantName", label: "Attendant Name", required: true },
    { name: "mobileNumber", label: "Mobile", type: "tel", required: true },
    { name: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Other"], required: true },
    { name: "branch", label: "Branch", required: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ];

  const assignmentFields = [
    { name: "vehicleId", label: "Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "routeId", label: "Route", type: "select", options: routeOptions, required: true },
    { name: "driverId", label: "Driver", type: "select", options: driverOptions, required: true },
    { name: "attendantId", label: "Attendant", type: "select", options: attendantOptions, required: true },
    { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Morning & Evening"], required: true },
    { name: "effectiveFrom", label: "Effective From", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Maintenance"], required: true },
  ];

  const studentAssignmentFields = [
    { name: "studentName", label: "Student Name", required: true },
    { name: "admissionNo", label: "Admission No.", required: true },
    { name: "group", label: "Group", required: true },
    { name: "section", label: "Section", required: true },
    { name: "routeId", label: "Route", type: "select", options: routeOptions, required: true },
    { name: "pickupPointId", label: "Pickup Point", type: "select", options: pickupOptions, required: true },
    { name: "vehicleId", label: "Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "feePlan", label: "Fee Plan", type: "select", options: ["Monthly", "Quarterly", "Half Yearly", "Annual"], required: true },
    { name: "monthlyFee", label: "Monthly Fee", type: "number", min: 0, required: true },
    { name: "guardianPhone", label: "Guardian Phone", type: "tel" },
    { name: "effectiveFrom", label: "Effective From", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true },
  ];

  const tripFields = [
    { name: "assignmentId", label: "Assignment", type: "select", options: vehicleAssignments.map((item) => ({ value: item.id, label: `${item.vehicleNumber} - ${item.routeName}` })), required: true },
    { name: "vehicleNumber", label: "Vehicle No.", required: true },
    { name: "routeName", label: "Route", required: true },
    { name: "driverName", label: "Driver", required: true },
    { name: "tripType", label: "Trip Type", type: "select", options: ["Morning", "Evening"], required: true },
    { name: "tripDate", label: "Trip Date", type: "date", required: true },
    { name: "startTime", label: "Start Time", type: "time" },
    { name: "endTime", label: "End Time", type: "time" },
    { name: "studentsPresent", label: "Students Present", type: "number", min: 0 },
    { name: "status", label: "Status", type: "select", options: ["Pending", "Running", "Completed", "Cancelled"], required: true },
    { name: "remarks", label: "Remarks", type: "textarea", full: true },
  ];

  const maintenanceFields = [
    { name: "vehicleId", label: "Vehicle", type: "select", options: vehicleOptions, required: true },
    { name: "category", label: "Service Type", required: true },
    { name: "serviceDate", label: "Service Date", type: "date", required: true },
    { name: "nextDueDate", label: "Next Due Date", type: "date" },
    { name: "cost", label: "Cost", type: "number", min: 0 },
    { name: "vendor", label: "Vendor" },
    { name: "status", label: "Status", type: "select", options: ["Scheduled", "In Progress", "Completed"], required: true },
    { name: "notes", label: "Notes", type: "textarea", full: true },
  ];

  const feeFields = [
    { name: "routeId", label: "Route", type: "select", options: routeOptions, required: true },
    { name: "minDistanceKm", label: "Minimum Distance", type: "number", min: 0, required: true },
    { name: "baseFare", label: "Base Fare", type: "number", min: 0, required: true },
    { name: "ratePerKm", label: "Rate Per Km", type: "number", min: 0, required: true },
    { name: "acSurcharge", label: "AC Surcharge", type: "number", min: 0 },
    { name: "billingCycle", label: "Billing Cycle", type: "select", options: ["Monthly", "Quarterly", "Half Yearly", "Annual"], required: true },
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
    feeConfigs: {
      title: "Transport Fee Configuration",
      subtitle: "Configure route-wise base fares and kilometer rates.",
      rows: feeConfigs,
      fields: feeFields,
      addLabel: "Add Fee Rule",
      columns: [
        { key: "routeName", label: "Route", strong: true },
        { key: "minDistanceKm", label: "Min Distance", value: (row) => `${row.minDistanceKm} km` },
        { key: "baseFare", label: "Base Fare", currency: true },
        { key: "ratePerKm", label: "Rate/km", currency: true },
        { key: "acSurcharge", label: "AC Surcharge", currency: true },
        { key: "billingCycle", label: "Cycle" },
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
        { key: "vehicleNumber", label: "Vehicle", strong: true },
        { key: "routeName", label: "Route" },
        { key: "driverName", label: "Driver" },
        { key: "attendantName", label: "Attendant" },
        { key: "shift", label: "Shift" },
        { key: "effectiveFrom", label: "From" },
        { key: "status", label: "Status", badge: true },
      ],
    },
    studentAssignments: {
      title: "Student Transport Assignment",
      subtitle: "Assign students to routes, pickup points, vehicles and fee plans.",
      rows: studentAssignments,
      fields: studentAssignmentFields,
      addLabel: "Assign Student",
      columns: [
        { key: "admissionNo", label: "Admission No.", strong: true },
        { key: "studentName", label: "Student" },
        { key: "routeName", label: "Route" },
        { key: "pickupPointName", label: "Pickup" },
        { key: "vehicleNumber", label: "Vehicle" },
        { key: "monthlyFee", label: "Monthly Fee", currency: true },
        { key: "status", label: "Status", badge: true },
      ],
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
        { key: "vehicleNumber", label: "Vehicle", strong: true },
        { key: "category", label: "Service" },
        { key: "serviceDate", label: "Service Date" },
        { key: "nextDueDate", label: "Next Due" },
        { key: "vendor", label: "Vendor" },
        { key: "cost", label: "Cost", currency: true },
        { key: "status", label: "Status", badge: true },
      ],
    },
  };

  const renderTable = (key) => {
    const config = tableConfigs[key];
    return (
      <TableSection
        {...config}
        query={query}
        onQuery={setQuery}
        onAdd={() => openForm(key, config.addLabel, config.fields)}
        onEdit={(row) => openForm(key, `Edit ${config.title}`, config.fields, row)}
        onDelete={(row) => requestDelete(key, row, config.title)}
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
    const reportRows = activeReportTab === "students"
      ? studentAssignments
      : activeReportTab === "routes"
        ? routes
        : activeReportTab === "vehicles"
          ? vehicles
          : activeReportTab === "maintenance"
            ? maintenance
            : vehicleAssignments;
    const reportColumns = activeReportTab === "students"
      ? tableConfigs.studentAssignments.columns
      : activeReportTab === "routes"
        ? tableConfigs.routes.columns
        : activeReportTab === "vehicles"
          ? tableConfigs.vehicles.columns
          : activeReportTab === "maintenance"
            ? tableConfigs.maintenance.columns
            : tableConfigs.vehicleAssignments.columns;

    return (
      <div className="cms-transport-stack">
        <TransportTabs tabs={reportTabs} active={activeReportTab} onChange={setActiveReportTab} compact />
        <div className="cms-transport-stat-grid">
          <StatCard icon={IndianRupee} label="Annual Transport Fee" value={formatCurrency(totalTransportRevenue)} hint="from active assignments" tone="green" />
          <StatCard icon={Wrench} label="Maintenance Cost" value={formatCurrency(activeMaintenanceCost)} hint="current mock logs" tone="amber" />
          <StatCard icon={Bus} label="Fleet Capacity" value={formatNumber(vehicles.reduce((total, vehicle) => total + Number(vehicle.capacity || 0), 0))} hint="total seats" tone="blue" />
          <StatCard icon={UserCheck} label="Drivers & Attendants" value={drivers.length + attendants.length} hint="staff profiles" tone="violet" />
        </div>
        <TableSection
          title="Transport Report"
          subtitle="Mock report data derived from the selected transport records."
          rows={reportRows}
          columns={reportColumns}
          query={query}
          onQuery={setQuery}
          onExport={() => exportRows("transport-report.csv", reportRows.filter((row) => textMatch(row, query)), reportColumns)}
        />
      </div>
    );
  };

  const renderPortals = () => {
    const driver = drivers[0];
    const assignment = vehicleAssignments.find((item) => item.driverId === driver?.id);
    const assignedStudents = studentAssignments.filter((student) => student.vehicleId === assignment?.vehicleId);
    const parentStudent = studentAssignments[0];
    const parentDriver = drivers.find((item) => item.driverName === assignment?.driverName) || driver;

    return (
      <div className="cms-transport-two-col">
        <div className="cms-card">
          <div className="cms-card-head">
            <div>
              <h2>Driver Transport Portal</h2>
              <p>Mock driver view for assigned bus, stops and students.</p>
            </div>
          </div>
          <div className="cms-card-body">
            <InfoGrid
              items={[
                { label: "Driver", value: driver?.driverName },
                { label: "Vehicle", value: assignment?.vehicleNumber },
                { label: "Route", value: assignment?.routeName },
                { label: "Shift", value: assignment?.shift },
              ]}
            />
            <div className="cms-table-wrap cms-transport-portal-table">
              <table className="cms-table">
                <thead><tr><th>Student</th><th>Pickup</th><th>Guardian</th><th>Status</th></tr></thead>
                <tbody>
                  {assignedStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="cms-strong">{student.studentName}</td>
                      <td>{student.pickupPointName}</td>
                      <td>{student.guardianPhone}</td>
                      <td><StatusBadge value={student.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="cms-card">
          <div className="cms-card-head">
            <div>
              <h2>Parent Bus Information</h2>
              <p>Mock parent view of ward route, driver and bus movement.</p>
            </div>
          </div>
          <div className="cms-card-body">
            <InfoGrid
              items={[
                { label: "Student", value: parentStudent?.studentName },
                { label: "Admission No.", value: parentStudent?.admissionNo },
                { label: "Vehicle", value: parentStudent?.vehicleNumber },
                { label: "Pickup", value: parentStudent?.pickupPointName },
                { label: "Route", value: parentStudent?.routeName },
                { label: "Driver Contact", value: parentDriver?.mobileNumber },
              ]}
            />
            <div className="cms-transport-parent-track">
              <Navigation size={18} />
              <span>Live bus status: {gpsSnapshots[0]?.status} near {gpsSnapshots[0]?.nextStop}</span>
            </div>
          </div>
        </div>
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
      return (
        <div className="cms-transport-stack">
          <TransportTabs tabs={operationTabs} active={activeOperationTab} onChange={(tab) => { setActiveOperationTab(tab); setQuery(""); }} compact />
          {activeOperationTab === "gps" ? (
            <div className="cms-card">
              <div className="cms-card-head">
                <div>
                  <h2>GPS Tracking</h2>
                  <p>Mock live location status for active transport vehicles.</p>
                </div>
              </div>
              <div className="cms-card-body">{renderGpsCards()}</div>
            </div>
          ) : renderTable(activeOperationTab)}
        </div>
      );
    }
    if (activeSection === "reports") return renderReports();
    return renderPortals();
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
