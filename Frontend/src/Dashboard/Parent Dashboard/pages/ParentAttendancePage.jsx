import { useState, useMemo, useEffect } from "react";
import { CalendarCheck, Users, CheckCircle2, XCircle, AlertCircle, Clock, Filter, Eye, ChevronRight, Calendar } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, subjectAttendanceData, recentAttendanceLogs } from "../parentData.js";
import { Modal } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

const MONTH_NAMES = {
  "01": "January",
  "02": "February",
  "03": "March",
  "04": "April",
  "05": "May",
  "06": "June",
  "07": "July",
  "08": "August",
  "09": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

export default function ParentAttendancePage() {
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    dataKey,
    currentAcademicYear,
  } = useParentPortal();

  const [selectedSubjectModal, setSelectedSubjectModal] = useState(null);
  const [selectedYear, setSelectedYear] = useState(() => (currentAcademicYear.startsWith("2024") ? "2024" : currentAcademicYear.startsWith("2025") ? "2025" : "2026"));
  const [selectedMonth, setSelectedMonth] = useState("09");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (currentAcademicYear.startsWith("2024")) {
      setSelectedYear("2024");
    } else if (currentAcademicYear.startsWith("2025")) {
      setSelectedYear("2025");
    } else {
      setSelectedYear("2026");
    }
  }, [currentAcademicYear]);

  const isCurrentYear = currentAcademicYear === "2026-2027";
  const subjects = child ? (subjectAttendanceData[dataKey] || (isCurrentYear ? subjectAttendanceData[child.id] : [])) || [] : [];

  const handleSelectChild = (id) => {
    setActiveChildId(id);
  };

  // Dynamically generate / retrieve full logs for any chosen Month and Year
  const generatedLogs = useMemo(() => {
    if (!child || subjects.length === 0) return [];
    const yearNum = parseInt(selectedYear, 10);
    const monthsToProcess =
      selectedMonth === "all"
        ? ["09", "08", "07", "06", "05", "04", "03", "02", "01", "12", "11", "10"]
        : [selectedMonth];

    const childLogs = recentAttendanceLogs[dataKey] || (isCurrentYear ? recentAttendanceLogs[child.id] : []) || [];
    const allLogs = [];

    monthsToProcess.forEach((mStr) => {
      const monthNum = parseInt(mStr, 10);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

      for (let d = daysInMonth; d >= 1; d--) {
        const dStr = String(d).padStart(2, "0");
        const dateStr = `${yearNum}-${mStr}-${dStr}`;
        const dateObj = new Date(yearNum, monthNum - 1, d);
        const dayOfWeek = dateObj.getDay();
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

        // Check if pre-existing in static logs
        const existing = childLogs.find((l) => l.date === dateStr);
        if (existing) {
          allLogs.push(existing);
          continue;
        }

        // Sunday
        if (dayOfWeek === 0) {
          allLogs.push({
            date: dateStr,
            day: dayName,
            status: "Holiday",
            timeIn: "—",
            timeOut: "—",
            remark: "Sunday Holiday",
          });
          continue;
        }

        // Second Saturday
        if (dayOfWeek === 6 && d >= 8 && d <= 14) {
          allLogs.push({
            date: dateStr,
            day: dayName,
            status: "Holiday",
            timeIn: "—",
            timeOut: "—",
            remark: "Second Saturday Holiday",
          });
          continue;
        }

        // Future dates relative to Sep 22, 2026
        const isFuture = yearNum > 2026 || (yearNum === 2026 && (monthNum > 9 || (monthNum === 9 && d > 22)));
        if (isFuture) {
          allLogs.push({
            date: dateStr,
            day: dayName,
            status: "Upcoming",
            timeIn: "—",
            timeOut: "—",
            remark: "Scheduled Academic Day",
          });
          continue;
        }

        // Deterministic weekday pattern
        const seed = (yearNum * 7 + monthNum * 13 + d * 17 + (child.id === "stu-001" ? 3 : 7)) % 100;
        const isSaturday = dayOfWeek === 6;

        if (seed < 8) {
          allLogs.push({
            date: dateStr,
            day: dayName,
            status: "Absent",
            timeIn: "—",
            timeOut: "—",
            remark: seed < 4 ? "Approved Medical Leave" : "Informed Personal Leave",
          });
        } else {
          const minute = 40 + (seed % 15);
          const timeIn = `08:${minute < 10 ? "0" + minute : minute} AM`;
          const timeOut = isSaturday ? "12:45 PM" : "03:45 PM";
          const remark = isSaturday ? "Half Day (Saturday)" : "On time";
          allLogs.push({
            date: dateStr,
            day: dayName,
            status: "Present",
            timeIn,
            timeOut,
            remark,
          });
        }
      }
    });

    return allLogs;
  }, [selectedYear, selectedMonth, child?.id, dataKey]);

  const displayedLogs = useMemo(() => {
    if (filterStatus === "all") return generatedLogs;
    return generatedLogs.filter((l) => l.status === filterStatus);
  }, [generatedLogs, filterStatus]);

  const monthStats = useMemo(() => {
    const workingDays = generatedLogs.filter((l) => l.status === "Present" || l.status === "Absent");
    const presentCount = generatedLogs.filter((l) => l.status === "Present").length;
    const absentCount = generatedLogs.filter((l) => l.status === "Absent").length;
    const rate = workingDays.length > 0 ? ((presentCount / workingDays.length) * 100).toFixed(1) : "100.0";
    return {
      working: workingDays.length,
      present: presentCount,
      absent: absentCount,
      rate,
    };
  }, [generatedLogs]);

  if (availableChildren.length === 0 || !child) {
    return (
      <DashboardLayout
        title="Attendance"
        subtitle="Attendance Register"
        breadcrumb={["Parent Portal", "Attendance"]}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <Users size={48} style={{ color: "var(--cms-muted)", margin: "0 auto 16px" }} />
            <h3>No Children Associated</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              No enrolled student records were found linked to your parent account.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Attendance"
      subtitle={`Overall attendance: ${child.attendance.overall}% (${child.attendance.status}) • ${child.name} (${child.group})`}
      breadcrumb={["Parent Portal", "Attendance"]}
    >
      <div className="parent-dashboard-wrapper">
        {/* Child Switcher */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>{child.name} ({child.group})</h2>
              <p>Attendance Register • Academic Year {child.academicYear} • Class In-Charge: {child.mentor}</p>
            </div>
          </div>
          <div className="parent-child-switch-buttons">
            {availableChildren.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`parent-child-switch-btn ${child.id === c.id ? "is-active" : ""}`}
                onClick={() => handleSelectChild(c.id)}
              >
                <Users size={14} /> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Stat Cards */}
        <div className="parent-stat-grid">
          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap green">
              <CalendarCheck size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Overall Attendance</div>
              <div className="parent-stat-value" style={{ color: "var(--cms-green)" }}>{child.attendance.overall}%</div>
              <div className="parent-stat-subtext">Status: <strong>{child.attendance.status}</strong></div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap">
              <CheckCircle2 size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Present Days</div>
              <div className="parent-stat-value">{child.attendance.presentDays} Days</div>
              <div className="parent-stat-subtext">Out of {child.attendance.totalWorkingDays} working days</div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap amber">
              <XCircle size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Absent / Leave Days</div>
              <div className="parent-stat-value">{child.attendance.absentDays} Days</div>
              <div className="parent-stat-subtext">Approved leaves counted</div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap">
              <Clock size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Minimum Required</div>
              <div className="parent-stat-value">75%</div>
              <div className="parent-stat-subtext" style={{ color: "var(--cms-green)" }}>Satisfies exam eligibility</div>
            </div>
          </div>
        </div>

        {/* Subject-Wise Attendance Breakdown */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <CalendarCheck size={18} /> Subject-Wise Attendance Breakdown
            </h3>
            <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Total Enrolled: {subjects.length} Subjects</span>
          </div>
          <div className="parent-card-body" style={{ padding: 0 }}>
            <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
              <table className="parent-timetable-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Faculty</th>
                    <th>Total Classes</th>
                    <th>Attended</th>
                    <th>Percentage</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length > 0 ? (
                    subjects.map((sub) => (
                      <tr key={sub.code}>
                        <td>
                          <strong>{sub.subject}</strong>
                          <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{sub.code}</div>
                        </td>
                        <td>{sub.faculty}</td>
                        <td>{sub.total}</td>
                        <td style={{ fontWeight: 600, color: "var(--cms-green)" }}>{sub.present}</td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontWeight: 700 }}>{sub.percentage}%</span>
                          </div>
                          <div className="parent-progress-bar-wrap" style={{ marginTop: 0 }}>
                            <div
                              className={`parent-progress-bar-fill ${sub.percentage >= 95 ? "green" : sub.percentage >= 85 ? "" : "amber"}`}
                              style={{ width: `${sub.percentage}%` }}
                            />
                          </div>
                        </td>
                        <td>
                          <span className={`cms-badge ${sub.percentage >= 90 ? "cms-badge-active" : "cms-badge-warn"}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="cms-btn cms-btn-sm cms-btn-outline"
                            onClick={() => setSelectedSubjectModal(sub)}
                          >
                            <Eye size={13} /> View Logs
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                        No subject-wise attendance recorded for Academic Year {currentAcademicYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Daily Attendance Logs */}
        <div className="parent-card">
          <div
            className="parent-card-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h3 className="parent-card-title">
              <Clock size={18} /> Daily Attendance Logs
            </h3>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={15} color="var(--cms-primary-dark)" />
                <label htmlFor="att-year-select" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cms-muted)" }}>
                  Year:
                </label>
                <select
                  id="att-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="cms-select"
                  style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600 }}
                >
                  <option value="2026">2026 (Current)</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label htmlFor="att-month-select" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cms-muted)" }}>
                  Month:
                </label>
                <select
                  id="att-month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="cms-select"
                  style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600 }}
                >
                  <option value="all">All Months</option>
                  <option value="09">September</option>
                  <option value="08">August</option>
                  <option value="07">July</option>
                  <option value="06">June</option>
                  <option value="05">May</option>
                  <option value="04">April</option>
                  <option value="03">March</option>
                  <option value="02">February</option>
                  <option value="01">January</option>
                  <option value="12">December</option>
                  <option value="11">November</option>
                  <option value="10">October</option>
                </select>
              </div>

              <select
                id="att-status-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="cms-select"
                style={{ padding: "6px 12px", fontSize: 13 }}
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="Present">Present Only</option>
                <option value="Absent">Absent Only</option>
              </select>

              {(() => {
                const defaultY = currentAcademicYear.startsWith("2024") ? "2024" : currentAcademicYear.startsWith("2025") ? "2025" : "2026";
                return (selectedYear !== defaultY || selectedMonth !== "09" || filterStatus !== "all") ? (
                  <button
                    type="button"
                    className="cms-btn cms-btn-sm cms-btn-outline"
                    onClick={() => {
                      setSelectedYear(defaultY);
                      setSelectedMonth("09");
                      setFilterStatus("all");
                    }}
                    style={{ fontSize: 12, padding: "5px 10px" }}
                  >
                    Current Month
                  </button>
                ) : null;
              })()}
            </div>
          </div>

          {/* Monthly Attendance Summary Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 18px",
              background: "var(--cms-surface)",
              borderBottom: "1px solid var(--cms-border)",
              fontSize: 13,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "var(--cms-muted)" }}>Period:</span>
              <strong>{selectedMonth === "all" ? `Full Year ${selectedYear}` : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`}</strong>
              <span className="cms-badge cms-badge-active" style={{ fontSize: 11 }}>
                {displayedLogs.length} Days Displayed
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span>
                Working Days: <strong>{monthStats.working}</strong>
              </span>
              <span>
                Present: <strong style={{ color: "var(--cms-green)" }}>{monthStats.present}</strong>
              </span>
              <span>
                Absent: <strong style={{ color: "var(--cms-red)" }}>{monthStats.absent}</strong>
              </span>
              <span>
                Rate: <strong style={{ color: "var(--cms-primary-dark)", fontSize: 14 }}>{monthStats.rate}%</strong>
              </span>
            </div>
          </div>

          <div className="parent-card-body" style={{ padding: 0 }}>
            <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
              <table className="parent-timetable-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 30, color: "var(--cms-muted)" }}>
                        No attendance logs found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((log, idx) => (
                      <tr key={`${log.date}-${idx}`}>
                        <td><strong>{log.date}</strong></td>
                        <td>{log.day}</td>
                        <td>{log.timeIn}</td>
                        <td>{log.timeOut}</td>
                        <td>
                          <span
                            className={`cms-badge ${
                              log.status === "Present"
                                ? "cms-badge-active"
                                : log.status === "Absent"
                                ? "cms-badge-danger"
                                : log.status === "Upcoming"
                                ? "cms-badge-warn"
                                : ""
                            }`}
                            style={
                              log.status === "Holiday"
                                ? { background: "var(--cms-bg)", color: "var(--cms-muted)", border: "1px solid var(--cms-border)" }
                                : {}
                            }
                          >
                            {log.status}
                          </span>
                        </td>
                        <td style={{ color: "var(--cms-muted)" }}>{log.remark}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Subject Attendance Detail Modal */}
        {selectedSubjectModal && (
          <Modal
            title={`Attendance Details — ${selectedSubjectModal.subject} (${selectedSubjectModal.code})`}
            onClose={() => setSelectedSubjectModal(null)}
            size="md"
            footer={
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedSubjectModal(null)}>
                Close
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: 14, background: "var(--cms-bg)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Subject Faculty:</span>
                  <strong>{selectedSubjectModal.faculty}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Classes Conducted:</span>
                  <strong>{selectedSubjectModal.total} Sessions</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Sessions Attended:</span>
                  <strong style={{ color: "var(--cms-green)" }}>{selectedSubjectModal.present} Sessions</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Sessions Missed:</span>
                  <strong style={{ color: "var(--cms-red)" }}>{selectedSubjectModal.absent} Sessions</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--cms-border)", paddingTop: 8 }}>
                  <span>Attendance Percentage:</span>
                  <strong style={{ fontSize: 16, color: "var(--cms-primary-dark)" }}>{selectedSubjectModal.percentage}%</strong>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--cms-muted)", margin: 0 }}>
                Student maintains an attendance above the statutory board requirement of 75%. No condonation fee or deficit attendance applies.
              </p>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
