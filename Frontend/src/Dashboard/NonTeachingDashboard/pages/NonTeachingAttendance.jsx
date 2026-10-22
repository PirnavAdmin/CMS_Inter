import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

export default function NonTeachingAttendance() {
  const [logs, setLogs] = useState(() => nonTeachingService.getAttendanceLogs());
  const [summary] = useState(() => nonTeachingService.getAttendanceSummary());
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchDate, setSearchDate] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchStatus =
        statusFilter === "all" ||
        log.status.toLowerCase().replace(/\s+/g, "") === statusFilter.toLowerCase().replace(/\s+/g, "");
      const matchDate = !searchDate || log.date.includes(searchDate);
      return matchStatus && matchDate;
    });
  }, [logs, statusFilter, searchDate]);

  return (
    <>
      {toastMessage && (
        <div className="cms-toast-banner cms-toast-success" role="alert" style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* KPI Cards Strip */}
      <section className="nts-kpi-grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        <div className="nts-kpi nts-kpi-green">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><UserCheck size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Monthly Rate</span>
              <span className="nts-kpi-val">{summary.attendanceRate}%</span>
            </div>
          </div>
          <span className="nts-kpi-sub">October 2026</span>
        </div>

        <div className="nts-kpi nts-kpi-blue">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><CheckCircle2 size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Present Days</span>
              <span className="nts-kpi-val">{summary.presentDays} Days</span>
            </div>
          </div>
          <span className="nts-kpi-sub">On-time compliance: 96%</span>
        </div>

        <div className="nts-kpi nts-kpi-orange">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><Clock size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Late Arrivals</span>
              <span className="nts-kpi-val">{summary.lateDays} Day</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Within grace period</span>
        </div>

        <div className="nts-kpi nts-kpi-amber">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><AlertCircle size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Absences</span>
              <span className="nts-kpi-val">{summary.absentDays} Day</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Adjusted with leave</span>
        </div>

        <div className="nts-kpi nts-kpi-purple">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon"><CalendarDays size={18} /></div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Total Hours</span>
              <span className="nts-kpi-val">{summary.totalWorkingHours}</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Regular working shift</span>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="nts-tabs-strip">
            {["all", "present", "late", "absent", "holiday", "weeklyoff"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`nts-tab-btn ${statusFilter === tab ? "active" : ""}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab === "weeklyoff" ? "Weekly Off" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="nts-search-box">
            <Calendar size={14} style={{ color: "var(--nts-muted)" }} />
            <input
              type="text"
              placeholder="Filter by date (YYYY-MM-DD)..."
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--nts-muted)", fontWeight: 600 }}>
          Showing {filteredLogs.length} of {logs.length} records
        </div>
      </section>

      {/* Attendance History Table Card */}
      <section className="nts-card">
        <div className="nts-card-head">
          <h3><FileSpreadsheet size={16} style={{ color: "var(--nts-primary)" }} /> October 2026 Daily Attendance Logs</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="nts-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Working Hours</th>
                <th>Attendance Status</th>
                <th>Biometric Remarks / Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const normStatus = log.status.toLowerCase().replace(/\s+/g, "-");
                return (
                  <tr key={log.date}>
                    <td style={{ fontWeight: 700 }}>{log.date}</td>
                    <td>{log.day}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{log.checkIn}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{log.checkOut}</td>
                    <td>{log.hours}</td>
                    <td>
                      <span className={`nts-status-badge ${normStatus}`}>
                        {log.status === "Present" && <CheckCircle2 size={12} />}
                        {log.status === "Late" && <Clock size={12} />}
                        {log.status === "Absent" && <AlertCircle size={12} />}
                        {log.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--nts-muted)", fontSize: 12 }}>{log.remarks}</td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--nts-muted)" }}>
                    No attendance logs match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
