import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bus,
  Route as RouteIcon,
  Users,
  UserCheck,
  CheckCircle,
  Wrench,
  FileText,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Eye,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useTransportManager } from "../TransportManagerContext.jsx";
import TransportManagerModal from "../components/TransportManagerModal.jsx";
import TransportManagerSkeleton, { TransportManagerDashboardSkeleton } from "../components/TransportManagerSkeleton.jsx";
import "../styles/TransportManagerHome.css";

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

function TripStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  let badgeClass = "tm-trip-badge--completed";
  if (s.includes("running") || s.includes("transit") || s.includes("active") || s.includes("started")) {
    badgeClass = "tm-trip-badge--running";
  } else if (s.includes("pending") || s.includes("scheduled")) {
    badgeClass = "tm-trip-badge--pending";
  } else if (s.includes("delay") || s.includes("cancel")) {
    badgeClass = "tm-trip-badge--delayed";
  }
  return <span className={`tm-trip-badge ${badgeClass}`}>{status || "Scheduled"}</span>;
}

export default function TransportManagerHome() {
  const navigate = useNavigate();
  const {
    vehicles,
    drivers,
    assignments,
    maintenance,
    routes,
    pickupPoints,
    attendants,
    trips,
    studentAssignments,
    dashboardMetrics,
    loading,
    refreshAll,
  } = useTransportManager();

  const [selectedTrip, setSelectedTrip] = useState(null);

  // Date calculation helper
  const daysUntil = (dateString) => {
    if (!dateString) return 9999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 9999;
    return Math.ceil((date - today) / 86400000);
  };

  // Overall summary metrics
  const summary = useMemo(() => {
    const activeVehicles = vehicles.filter((v) => v.status === "Active" || v.status === true || v.status === "Operational");
    const activeDrivers = drivers.filter((d) => d.status === "Active" || d.status === true);
    const activeRoutes = routes.filter((r) => r.status === "Active" || r.status === true);
    const activeStudents = studentAssignments.filter((s) => s.status === "Active" || s.status === true);

    const expiringDocs = vehicles.filter((v) =>
      [v.insuranceExpiry, v.pollutionExpiry, v.fitnessExpiry].some((date) => daysUntil(date) <= 45 && daysUntil(date) >= 0)
    );
    const expiringLicenses = drivers.filter((d) => daysUntil(d.licenseExpiryDate) <= 45 && daysUntil(d.licenseExpiryDate) >= 0);

    const totalCapacity = vehicles.reduce((tot, v) => tot + (Number(v.capacity) || 0), 0);
    const totalAssigned = activeStudents.length;

    return {
      totalVehicles: vehicles.length,
      activeVehicles: activeVehicles.length,
      maintenanceVehicles: vehicles.filter((v) => v.status === "Maintenance" || v.status === "Under Maintenance").length,
      totalDrivers: drivers.length,
      activeDrivers: activeDrivers.length,
      totalAttendants: attendants.length,
      activeRoutes: routes.length,
      activeStudents: activeStudents.length,
      expiringDocs: expiringDocs.length,
      expiringLicenses: expiringLicenses.length,
      expiringLicenseDrivers: expiringLicenses,
      utilization: totalCapacity ? Math.round((totalAssigned / totalCapacity) * 100) : 0,
    };
  }, [vehicles, drivers, routes, attendants, studentAssignments, dashboardMetrics]);

  // Operational status metrics for Today's Transport Status
  const transportStatusMetrics = useMemo(() => {
    const morningRunning = trips.filter((t) => t.tripType === "Morning" && (t.status === "Running" || t.status === "In Transit")).length;
    const morningCompleted = trips.filter((t) => t.tripType === "Morning" && t.status === "Completed").length;
    const eveningPending = trips.filter((t) => t.tripType === "Evening" && t.status !== "Completed").length;
    const delayedTrips = trips.filter((t) => ["Delayed", "Cancelled"].includes(t.status)).length;

    return [
      { label: "ACTIVE VEHICLES", value: summary.activeVehicles, tone: "blue" },
      { label: "MORNING RUNNING", value: morningRunning, tone: "green" },
      { label: "MORNING COMPLETED", value: morningCompleted, tone: "blue" },
      { label: "EVENING PENDING", value: eveningPending, tone: "amber" },
      { label: "DELAYED TRIPS", value: delayedTrips, tone: "muted" },
      { label: "UNDER MAINTENANCE", value: summary.maintenanceVehicles, tone: "red" },
    ];
  }, [trips, summary]);

  // Vehicle Seat Occupancy Helper
  const getVehicleOccupancy = (vehicle) => {
    const assigned = studentAssignments.filter(
      (s) => (s.vehicleId === vehicle.id || String(s.vehicleId) === String(vehicle.id) || s.vehicleNumber === vehicle.vehicleNumber) && (s.status === "Active" || s.status === true)
    ).length;
    const capacity = Number(vehicle.capacity) || 40;
    const percent = capacity > 0 ? Math.round((assigned / capacity) * 100) : 0;
    return { assigned, capacity, percent };
  };

  // Find assignment helper for a trip
  const findTripAssignment = (trip) => {
    return assignments.find(
      (a) => a.id === trip.assignmentId || a.vehicleNumber === trip.vehicleNumber || a.vehicleId === trip.vehicleId
    );
  };

  if (loading && !vehicles.length && !trips.length) {
    return <TransportManagerDashboardSkeleton />;
  }

  return (
    <div className="tm-home cms-transport-page cms-transport-stack">
      {/* Header without any tabs */}
      <div className="tm-header-row">
        <div>
          <h1 className="tm-header-title">
            Dashboard
          </h1>
          <p className="tm-header-subtitle">
            Manage transport routes, vehicles, assignments, trips, GPS and reports.
          </p>
        </div>
        <button
          type="button"
          className="tm-sync-btn"
          title="Sync Live Data with Backend"
          onClick={refreshAll}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "tm-spin" : ""} />
          <span>{loading ? "Syncing..." : "Sync Live Data"}</span>
        </button>
      </div>

      {/* 8 Stat Cards in 4x2 Grid */}
      <div className="cms-transport-stat-grid">
        <StatCard
          icon={Bus}
          label="Total Vehicles"
          value={summary.totalVehicles}
          hint={`(${summary.activeVehicles} Active)`}
          tone="blue"
        />
        <StatCard
          icon={RouteIcon}
          label="Active Routes"
          value={summary.activeRoutes}
          hint={`${pickupPoints.length} pickup points`}
          tone="green"
        />
        <StatCard
          icon={Users}
          label="Total Drivers"
          value={summary.totalDrivers}
          hint={`(${summary.activeDrivers} Active)`}
          tone="blue"
        />
        <StatCard
          icon={UserCheck}
          label="Total Bus Attendants"
          value={summary.totalAttendants}
          tone="violet"
        />
        <StatCard
          icon={CheckCircle}
          label="Students Using Transport"
          value={summary.activeStudents}
          hint={`${summary.utilization}% capacity used`}
          tone="green"
        />
        <StatCard
          icon={Wrench}
          label="Vehicles Under Maintenance"
          value={summary.maintenanceVehicles}
          tone="amber"
        />
        <StatCard
          icon={FileText}
          label="Expiring Vehicle Documents"
          value={summary.expiringDocs}
          tone="red"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expiring Driver Licenses"
          value={summary.expiringLicenses}
          tone="red"
        />
      </div>

      {/* Regulatory Compliance Warning */}
      {(summary.expiringDocs > 0 || summary.expiringLicenses > 0) && (
        <div className="cms-transport-warning">
          <AlertTriangle size={18} />
          <span>
            <strong>Regulatory Compliance Warning</strong> {summary.expiringDocs} vehicle document(s) and{" "}
            {summary.expiringLicenses} driver license(s) expiring soon.
            {summary.expiringLicenseDrivers?.length
              ? ` Drivers: ${summary.expiringLicenseDrivers.map((d) => `${d.driverName} (${d.licenseExpiryDate})`).join(", ")}.`
              : ""}
          </span>
          <em>Action Required</em>
        </div>
      )}

      {/* Today's Transport Status Card */}
      <div className="cms-card">
        <div className="cms-card-head cms-transport-status-head">
          <div>
            <h2>Today's Transport Status</h2>
            <p>Current trip activity and assignment readiness from live operations.</p>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary cms-transport-open-ops"
            onClick={() => navigate("/transport-manager/operations")}
          >
            Open Transport Operations <ArrowRight size={15} />
          </button>
        </div>
        <div className="cms-card-body">
          {/* 6 Metric Badges */}
          <div className="cms-transport-status-metrics">
            {transportStatusMetrics.map((metric) => (
              <div key={metric.label} className={`cms-transport-status-metric tone-${metric.tone}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          {/* Trips List in 2-column layout */}
          <div className="cms-transport-trip-list">
            {trips.length === 0 ? (
              <div className="cms-transport-empty" style={{ padding: "1.5rem", textAlign: "center", gridColumn: "1 / -1" }}>
                No vehicle trip activity recorded today.
              </div>
            ) : (
              trips.map((trip, tripIndex) => {
                const assignment = findTripAssignment(trip);
                const vehicleNumber = trip.vehicleNumber || assignment?.vehicleNumber || "Vehicle";
                const routeName = trip.routeName || assignment?.routeName || "Route";
                const tripType = trip.tripType || (trip.startTime ? "Morning" : "Evening");
                const driverName = trip.driverName || assignment?.driverName || "-";
                const attendantName = trip.attendantName || assignment?.attendantName || "-";

                return (
                  <div key={`${trip.id || tripIndex}-${tripIndex}`} className="cms-transport-trip">
                    <span className="cms-transport-trip-info">
                      <strong>{vehicleNumber}</strong>
                      <small>{routeName} - {tripType}</small>
                      <small>Driver: {driverName} &middot; Attendant: {attendantName}</small>
                    </span>
                    <span className="cms-transport-trip-actions">
                      <TripStatusBadge status={trip.status} />
                      <button
                        type="button"
                        className="cms-transport-details-btn"
                        onClick={() => setSelectedTrip({ ...trip, vehicleNumber, routeName, tripType, driverName, attendantName })}
                      >
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

      {/* Two-Column Analytics Grid */}
      <div className="cms-transport-two-col">
        {/* Left Column: Vehicle Seat Occupancy Matrix */}
        <div className="cms-card">
          <div className="cms-card-head">
            <h2><BarChart3 size={20} /> Vehicle Seat Occupancy Matrix</h2>
          </div>
          <div className="cms-card-body">
            <div className="cms-transport-occupancy">
              {vehicles.length === 0 ? (
                <p className="cms-transport-empty" style={{ margin: "1rem 0" }}>
                  No vehicles registered yet.
                </p>
              ) : (
                vehicles.map((vehicle, vehicleIndex) => {
                  const { assigned, capacity, percent } = getVehicleOccupancy(vehicle);
                  return (
                    <div key={`${vehicle.id || vehicleIndex}-${vehicleIndex}`}>
                      <span>
                        <strong>{vehicle.vehicleNumber} ({vehicle.vehicleType || "Bus"})</strong>
                        <small>{assigned} / {capacity} Seats ({percent}%)</small>
                      </span>
                      <div className="cms-transport-progress">
                        <i style={{ width: `${Math.min(percent, 100)}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Route-wise Student Distribution */}
        <div className="cms-card">
          <div className="cms-card-head">
            <h2><PieChart size={20} /> Route-wise Student Distribution</h2>
          </div>
          <div className="cms-card-body">
            <div className="cms-transport-route-distribution">
              {routes.length === 0 ? (
                <p className="cms-transport-empty" style={{ margin: "1rem 0" }}>
                  No transport routes registered yet.
                </p>
              ) : (
                routes.map((route, routeIndex) => {
                  const studentCount = studentAssignments.filter(
                    (s) =>
                      (s.routeId === route.id || String(s.routeId) === String(route.id) || s.routeName === route.routeName) &&
                      (s.status === "Active" || s.status === true)
                  ).length;

                  return (
                    <div key={`${route.id || routeIndex}-${routeIndex}`}>
                      <span>
                        <strong>{route.routeName}</strong>
                        <small>{route.routeCode || "ROUTE"} &bull; {route.totalDistanceKm || route.distanceKm || 0} KM</small>
                      </span>
                      <em>{studentCount} Student{studentCount === 1 ? "" : "s"}</em>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TransportManagerModal
          isOpen={Boolean(selectedTrip)}
          title={`Trip Details - ${selectedTrip.vehicleNumber}`}
          onClose={() => setSelectedTrip(null)}
        >
          <div className="tm-trip-details-grid">
            <div className="tm-trip-details-item">
              <label>Vehicle Number</label>
              <span>{selectedTrip.vehicleNumber}</span>
            </div>
            <div className="tm-trip-details-item">
              <label>Route</label>
              <span>{selectedTrip.routeName}</span>
            </div>
            <div className="tm-trip-details-item">
              <label>Trip Shift</label>
              <span>{selectedTrip.tripType}</span>
            </div>
            <div className="tm-trip-details-item">
              <label>Trip Date</label>
              <span>{selectedTrip.tripDate || "Today"}</span>
            </div>
            <div className="tm-trip-details-item">
              <label>Driver</label>
              <span>{selectedTrip.driverName}</span>
            </div>
            <div className="tm-trip-details-item">
              <label>Attendant</label>
              <span>{selectedTrip.attendantName}</span>
            </div>
            <div className="tm-trip-details-item">
              <label>Scheduled Timing</label>
              <span>{selectedTrip.startTime || "07:00 AM"} - {selectedTrip.endTime || "08:30 AM"}</span>
            </div>
            <div className="tm-trip-details-item">
              <label>Status</label>
              <span>{selectedTrip.status || "Running"}</span>
            </div>
          </div>
        </TransportManagerModal>
      )}
    </div>
  );
}
