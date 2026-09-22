import React, { useState, useMemo } from "react";
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
import { tripLogs, driverProfile } from "../data/driverMockData.js";

export default function DriverReportsPage() {
  const [filterType, setFilterType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = useMemo(() => {
    return tripLogs.filter((log) => {
      const matchType = filterType === "All" || log.tripType.toLowerCase().includes(filterType.toLowerCase());
      const matchSearch =
        log.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.driverNotes.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [filterType, searchTerm]);

  const totalDistanceCovered = useMemo(() => {
    return tripLogs.reduce((sum, item) => sum + item.distanceKm, 0);
  }, []);

  const totalFuelAdded = useMemo(() => {
    return tripLogs.reduce((sum, item) => sum + item.fuelAddedLiters, 0);
  }, []);

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
      log.id,
      `"${log.date}"`,
      `"${log.tripType}"`,
      `"${log.route}"`,
      log.startTime,
      log.endTime,
      log.startKm,
      log.endKm,
      log.distanceKm,
      log.fuelAddedLiters,
      log.studentsTransported,
      log.attendanceRate,
      log.status,
      `"${log.driverNotes}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `driver_trip_report_${driverProfile.employeeId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dp-page-container">
      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <FileBarChart2 size={14} /> Audit & Operational Reports
          </div>
          <h1 className="dp-page-title">Transport Reports & Trip Logs</h1>
          <p className="dp-page-subtitle">
            Review trip logs, fuel consumption, and student transport attendance history.
          </p>
        </div>
        <div className="dp-header-actions">
          <button
            type="button"
            className="dp-btn dp-btn-outline"
            onClick={handlePrint}
          >
            <Printer size={16} /> Print Logbook
          </button>
          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={handleExportCSV}
          >
            <Download size={16} /> Export CSV Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dp-stat-grid-4">
        <DriverStatCard
          icon={FileBarChart2}
          title="Total Logged Trips"
          value={`${tripLogs.length}`}
          subtitle="This billing period"
          tone="primary"
        />
        <DriverStatCard
          icon={Gauge}
          title="Cumulative Distance"
          value={`${totalDistanceCovered} KM`}
          subtitle="Assigned vehicle PC-101"
          tone="success"
        />
        <DriverStatCard
          icon={Fuel}
          title="Total Fuel Refueled"
          value={`${totalFuelAdded} Liters`}
          subtitle="Avg: 4.8 km/L efficiency"
          tone="warning"
        />
        <DriverStatCard
          icon={Users}
          title="Avg Attendance Rate"
          value="98.4%"
          subtitle="Safe passenger completion"
          tone="purple"
        />
      </div>

      {/* Trip Logbook Table Card */}
      <div className="dp-card">
        <div className="dp-card-head">
          <div className="dp-flex-col">
            <h3>Trip History Logbook</h3>
            <p>Verified entries recorded by driver and depot supervisor</p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="dp-table-controls">
          <div className="dp-search-box">
            <Search size={16} className="dp-search-icon" />
            <input
              type="text"
              placeholder="Search by date, trip ID, or driver notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dp-input-search"
            />
          </div>

          <div className="dp-filter-group">
            <div className="dp-select-wrapper">
              <Filter size={14} className="dp-select-icon" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="dp-select"
              >
                <option value="All">All Trip Types</option>
                <option value="Morning">Morning Trips</option>
                <option value="Evening">Evening Trips</option>
              </select>
            </div>
          </div>
        </div>

        <div className="dp-card-body p-0">
          <div className="dp-table-responsive">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Date</th>
                  <th>Trip Type</th>
                  <th>Start / End Time</th>
                  <th>Odometer Run</th>
                  <th>Distance</th>
                  <th>Fuel Added</th>
                  <th>Passengers</th>
                  <th>Attendance</th>
                  <th>Status</th>
                  <th>Driver Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <code>{log.id}</code>
                    </td>
                    <td>
                      <strong>{log.date}</strong>
                    </td>
                    <td>
                      <span className="dp-trip-type-chip">{log.tripType}</span>
                    </td>
                    <td>
                      <span className="dp-text-muted">
                        {log.startTime} – {log.endTime}
                      </span>
                    </td>
                    <td>
                      <span className="dp-text-muted">
                        {log.startKm} → {log.endKm}
                      </span>
                    </td>
                    <td>
                      <strong>{log.distanceKm} km</strong>
                    </td>
                    <td>
                      {log.fuelAddedLiters > 0 ? (
                        <span className="dp-fuel-chip">{log.fuelAddedLiters} L</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className="dp-student-count-chip">{log.studentsTransported}</span>
                    </td>
                    <td>
                      <span className="dp-badge dp-badge-success">{log.attendanceRate}</span>
                    </td>
                    <td>
                      <DriverStatusBadge status={log.status} />
                    </td>
                    <td>
                      <span className="dp-notes-text">{log.driverNotes}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

