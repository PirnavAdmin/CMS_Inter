import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FileBarChart2,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Gauge,
  Fuel,
  Users,
} from "lucide-react";
import DriverStatCard from "../components/DriverStatCard.jsx";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import { getReports, getProfile } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";
import { useDriverData } from "../DriverDataContext.jsx";
import { unwrapDriverData, formatTime12Hour } from "../data/driverData.js";

export default function DriverReportsPage() {
  const [filterType, setFilterType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [tripLogs, setTripLogs] = useState([]);
  const { driverProfile: contextProfile } = useDriverData();
  const [driverProfile, setDriverProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        if (!hasLoadedOnce.current) {
          setLoading(true);
        }
        const results = await Promise.allSettled([
          getReports().then(unwrapDriverData),
          getProfile().then(unwrapDriverData),
        ]);

        if (!isMounted) return;

        const [reportsRes, profileRes] = results;

        let rData = reportsRes.status === "fulfilled" ? reportsRes.value : [];
        if (rData && !Array.isArray(rData)) {
          rData = rData.tripLogs || rData.data || rData.reports || [];
        }

        const pData = profileRes.status === "fulfilled" ? profileRes.value?.profile || profileRes.value || {} : contextProfile || {};

        setTripLogs(Array.isArray(rData) ? rData : []);
        setDriverProfile(pData);
        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || err.message || "Failed to load reports");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [contextProfile]);

  const filteredLogs = useMemo(() => {
    return tripLogs.filter((log) => {
      const matchType =
        filterType === "All" ||
        (log.tripType && log.tripType.toLowerCase().includes(filterType.toLowerCase()));
      const matchSearch =
        (log.date && log.date.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.id && log.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.driverNotes && log.driverNotes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [filterType, searchTerm, tripLogs]);

  const totalDistanceCovered = useMemo(() => {
    return tripLogs.reduce((sum, item) => sum + (Number(item.distanceKm) || 0), 0);
  }, [tripLogs]);

  const totalFuelAdded = useMemo(() => {
    return tripLogs.reduce((sum, item) => sum + (Number(item.fuelAddedLiters) || 0), 0);
  }, [tripLogs]);

  const handleExportCSV = () => {
    const headers = [
      "Trip ID",
      "Date",
      "Trip Type",
      "Route",
      "Start Time",
      "End Time",
      "Start Odometer (KM)",
      "End Odometer (KM)",
      "Distance (KM)",
      "Fuel Added (L)",
      "Students Transported",
      "Attendance %",
      "Status",
      "Notes",
    ];

    const rows = filteredLogs.map((log) => [
      log.id || "",
      `"${log.date || ""}"`,
      `"${log.tripType || ""}"`,
      `"${log.route || ""}"`,
      log.startTime || "",
      log.endTime || "",
      log.startKm || 0,
      log.endKm || 0,
      log.distanceKm || 0,
      log.fuelAddedLiters || 0,
      log.studentsTransported || 0,
      log.attendanceRate || "",
      log.status || "",
      `"${log.driverNotes || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Driver_Trip_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="dp-page-container">
        <SkeletonPage variant="table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dp-page-container">
        <div className="dp-page-header">
          <div className="dp-header-main">
            <h1 className="dp-page-title text-red-500">Error Loading Reports</h1>
            <p className="dp-page-subtitle">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dp-page-container dp-reports-page">
      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <FileBarChart2 size={14} /> Operational Logs & Analytics
          </div>
          <h1 className="dp-page-title">Trip Reports & History</h1>
          <p className="dp-page-subtitle">View and export historical transport logs and vehicle metrics.</p>
        </div>
        <div className="dp-header-actions">
          <button type="button" className="dp-btn dp-btn-outline" onClick={handlePrint}>
            <Printer size={16} /> Print Report
          </button>
          <button type="button" className="dp-btn dp-btn-primary" onClick={handleExportCSV}>
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>

      {/* Driver & Bus Overview Strip */}
      <div className="dp-reports-summary-strip">
        <div className="dp-rss-item">
          <small>Assigned Driver</small>
          <strong>{driverProfile?.driverName || driverProfile?.name || contextProfile?.name || "PENETI RAJESH"}</strong>
          <span>Emp ID: {driverProfile?.employeeId || contextProfile?.employeeId || "MNT0030"}</span>
        </div>
        <div className="dp-rss-item">
          <small>Assigned Bus</small>
          <strong>{driverProfile?.assignedVehicle || contextProfile?.assignedVehicle || "AP39AU2653"}</strong>
          <span>{driverProfile?.vehicleModel || contextProfile?.vehicleModel || "Transport Van"}</span>
        </div>
        <div className="dp-rss-item">
          <small>Primary Route</small>
          <strong>{driverProfile?.assignedRoute || contextProfile?.assignedRoute || "Habsiguda"}</strong>
          <span>Code: {driverProfile?.routeCode || "HABSIGUDA_1"}</span>
        </div>
        <div className="dp-rss-item">
          <small>Reporting Month</small>
          <strong>November 2026</strong>
          <span>Academic Year 2026-27</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dp-stat-grid-4">
        <DriverStatCard
          icon={Gauge}
          title="Total KM Covered"
          value={`${totalDistanceCovered.toFixed(1)} km`}
          subtitle="Assigned route runs"
          tone="primary"
        />
        <DriverStatCard
          icon={CheckCircle2}
          title="Completed Trips"
          value={String(tripLogs.length)}
          subtitle="Total recorded trips"
          tone="success"
        />
        <DriverStatCard
          icon={Fuel}
          title="Fuel Added"
          value={`${totalFuelAdded.toFixed(1)} L`}
          subtitle="Refueled volume logged"
          tone="purple"
        />
        <DriverStatCard
          icon={Users}
          title="Average Attendance"
          value="98.5%"
          subtitle="Passenger pickup reliability"
          tone="blue"
        />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="dp-card dp-filter-card">
        <div className="dp-card-body">
          <div className="dp-reports-toolbar">
            <div className="dp-search-wrap">
              <Search size={16} className="dp-search-icon" />
              <input
                type="text"
                placeholder="Search by Trip ID, route, date, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dp-input-field dp-search-input"
              />
            </div>

            <div className="dp-filter-pills">
              <span className="dp-filter-label">
                <Filter size={14} /> Trip Type:
              </span>
              {["All", "Morning", "Evening"].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`dp-pill-btn ${filterType === type ? "is-active" : ""}`}
                  onClick={() => setFilterType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="dp-card">
        <div className="dp-card-head">
          <div className="dp-flex-col">
            <h3>Trip Operation Ledger ({filteredLogs.length} Records)</h3>
            <p>Chronological breakdown of recorded bus trips</p>
          </div>
        </div>

        <div className="dp-card-body p-0">
          <div className="dp-table-responsive">
            <table className="dp-table dp-reports-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Route</th>
                  <th>Run Time</th>
                  <th>Distance</th>
                  <th>Fuel</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong className="dp-text-primary">{log.id}</strong>
                      </td>
                      <td>
                        <span className="dp-date-cell">
                          <Calendar size={13} /> {log.date}
                        </span>
                      </td>
                      <td>
                        <span className={`dp-type-chip is-${String(log.tripType).toLowerCase()}`}>
                          {log.tripType}
                        </span>
                      </td>
                      <td>
                        <strong>{log.route}</strong>
                      </td>
                      <td>
                        <span className="dp-time-cell">
                          <Clock size={13} /> {formatTime12Hour(log.startTime)} - {formatTime12Hour(log.endTime)}
                        </span>
                      </td>
                      <td>
                        <strong>{log.distanceKm} km</strong>
                      </td>
                      <td>{log.fuelAddedLiters > 0 ? `${log.fuelAddedLiters} L` : "--"}</td>
                      <td>
                        <span className="dp-student-count-chip">
                          <Users size={12} /> {log.studentsTransported}
                        </span>
                      </td>
                      <td>
                        <DriverStatusBadge status={log.status} />
                      </td>
                      <td>
                        <small className="dp-text-muted">{log.driverNotes || "Standard run"}</small>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-gray-500">
                      No trip records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
