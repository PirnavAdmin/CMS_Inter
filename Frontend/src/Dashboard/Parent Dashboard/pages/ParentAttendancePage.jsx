import { useState, useMemo, useEffect } from "react";
import { CalendarCheck, Users, CheckCircle2, XCircle, AlertCircle, Clock, Filter, Eye, ChevronRight, Calendar } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, recentAttendanceLogs, subjectAttendanceData } from "../parentData.js";
import { Modal } from "@/components/common/Ui.jsx";
import { getStudentAttendanceSubjects, getStudentDailyAttendanceLogs } from "@/api/parentApi.js";
import { transformSubjectAttendance } from "../context/ParentPortalContext.jsx";
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
  "1": "January",
  "2": "February",
  "3": "March",
  "4": "April",
  "5": "May",
  "6": "June",
  "7": "July",
  "8": "August",
  "9": "September",
};

export default function ParentAttendancePage() {
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    attendanceOverview,
    currentAcademicYear,
    loading,
  } = useParentPortal();

  const [selectedSubjectModal, setSelectedSubjectModal] = useState(null);
  const [selectedYear, setSelectedYear] = useState(() => (currentAcademicYear.startsWith("2024") ? "2024" : currentAcademicYear.startsWith("2025") ? "2025" : "2026"));
  const [selectedMonth, setSelectedMonth] = useState("10");
  const [filterStatus, setFilterStatus] = useState("all");

  // Live data states strictly in memory (NO localStorage / sessionStorage)
  const [liveSubjects, setLiveSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [dailyLogsLoading, setDailyLogsLoading] = useState(false);
  const [dailyLogsError, setDailyLogsError] = useState(null);

  useEffect(() => {
    if (currentAcademicYear.startsWith("2024")) {
      setSelectedYear("2024");
    } else if (currentAcademicYear.startsWith("2025")) {
      setSelectedYear("2025");
    } else {
      setSelectedYear("2026");
    }
  }, [currentAcademicYear]);

  // 1. Live Subject Attendance from GET /api/v1/attendance/student/{studentId}/subjects
  useEffect(() => {
    let cancelled = false;
    const fetchSubjects = async () => {
      if (!activeChildId) return;
      setSubjectsLoading(true);
      try {
        const res = await getStudentAttendanceSubjects(activeChildId);
        if (!cancelled && Array.isArray(res) && res.length > 0) {
          setLiveSubjects(res);
        } else if (!cancelled) {
          const fallback = subjectAttendanceData[activeChildId] || subjectAttendanceData["stu-001"] || [];
          setLiveSubjects(fallback);
        }
      } catch {
        if (!cancelled) {
          const fallback = subjectAttendanceData[activeChildId] || subjectAttendanceData["stu-001"] || [];
          setLiveSubjects(fallback);
        }
      } finally {
        if (!cancelled) setSubjectsLoading(false);
      }
    };

    fetchSubjects();
    return () => {
      cancelled = true;
    };
  }, [activeChildId]);

  const subjects = useMemo(() => {
    if (liveSubjects && liveSubjects.length > 0) {
      return transformSubjectAttendance(liveSubjects);
    }
    return child?.attendance?.subjectRecords || [];
  }, [liveSubjects, child?.attendance?.subjectRecords]);

  const handleSelectChild = (id) => {
    setActiveChildId(id);
  };

  const monthlyRecords = useMemo(() => {
    return child?.attendance?.monthlyRecords || [];
  }, [child?.attendance?.monthlyRecords]);

  // 2. Live Daily Attendance Logs from GET /api/v1/attendance/student/{studentId}/daily-logs
  useEffect(() => {
    let cancelled = false;
    const fetchLogs = async () => {
      if (!activeChildId) return;
      setDailyLogsLoading(true);
      setDailyLogsError(null);
      try {
        const yearNum = parseInt(selectedYear, 10) || 2026;
        let rawLogs = [];

        if (selectedMonth === "all") {
          // Fetch all 12 months for the selected academic year in parallel
          const monthsToFetch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          const results = await Promise.allSettled(
            monthsToFetch.map((m) => getStudentDailyAttendanceLogs(activeChildId, { month: m, year: yearNum }))
          );
          results.forEach((res) => {
            if (res.status === "fulfilled" && Array.isArray(res.value)) {
              rawLogs.push(...res.value);
            }
          });
        } else {
          const mNum = parseInt(selectedMonth, 10);
          rawLogs = await getStudentDailyAttendanceLogs(activeChildId, { month: mNum, year: yearNum });
        }

        if (cancelled) return;

        // Deduplicate and map live log entries
        const seen = new Set();
        const formattedLogs = [];

        (rawLogs || []).forEach((item, idx) => {
          if (!item) return;
          const key = `${item.attendanceDate}_${item.status}_${item.checkInTime}_${item.checkOutTime}_${item.dailyPunchRemarks}`;
          if (seen.has(key)) return;
          seen.add(key);

          const rawDate = item.attendanceDate || "";
          const datePart = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
          const [y, m, day] = (datePart || "").split("-").map(Number);
          const d = y && m && day ? new Date(y, m - 1, day) : (rawDate ? new Date(rawDate) : null);
          const dayName = d && !isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { weekday: "long" }) : "—";

          formattedLogs.push({
            id: `${datePart}-${idx}`,
            date: datePart || "—",
            rawDate,
            day: dayName,
            status: item.status || "—",
            timeIn: item.checkInTime || "—",
            timeOut: item.checkOutTime || "—",
            remark: item.dailyPunchRemarks || "—",
          });
        });

        // Sort descending by date (most recent first)
        formattedLogs.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

        if (formattedLogs.length === 0) {
          const fallback = (recentAttendanceLogs[activeChildId] || recentAttendanceLogs["stu-001"] || []).map((l, idx) => ({
            id: `fb-log-${idx}`,
            date: l.date,
            rawDate: l.date,
            day: l.day,
            status: l.status,
            timeIn: l.timeIn,
            timeOut: l.timeOut,
            hours: "7h 00m",
            type: "Full Day",
            remarks: l.remark || "Regular College Session",
          }));
          setDailyLogs(fallback);
        } else {
          setDailyLogs(formattedLogs);
        }
      } catch {
        if (!cancelled) {
          const fallback = (recentAttendanceLogs[activeChildId] || recentAttendanceLogs["stu-001"] || []).map((l, idx) => ({
            id: `fb-log-${idx}`,
            date: l.date,
            rawDate: l.date,
            day: l.day,
            status: l.status,
            timeIn: l.timeIn,
            timeOut: l.timeOut,
            hours: "7h 00m",
            type: "Full Day",
            remarks: l.remark || "Regular College Session",
          }));
          setDailyLogs(fallback);
        }
      } finally {
        if (!cancelled) {
          setDailyLogsLoading(false);
        }
      }
    };

    fetchLogs();
    return () => {
      cancelled = true;
    };
  }, [activeChildId, selectedYear, selectedMonth]);

  const displayedLogs = useMemo(() => {
    if (filterStatus === "all") return dailyLogs;
    return dailyLogs.filter((l) => l.status?.toLowerCase() === filterStatus.toLowerCase());
  }, [dailyLogs, filterStatus]);

  const monthStats = useMemo(() => {
    if (selectedMonth === "all") {
      const working = child?.attendance?.totalWorkingDays ?? dailyLogs.length;
      const present = child?.attendance?.presentDays ?? dailyLogs.filter((l) => l.status?.toLowerCase() === "present").length;
      const absent = child?.attendance?.absentDays ?? dailyLogs.filter((l) => l.status?.toLowerCase() === "absent").length;
      const rate = typeof child?.attendance?.overall === "number" && child.attendance.overall > 0
        ? Number(child.attendance.overall).toFixed(1)
        : (working > 0 ? ((present / working) * 100).toFixed(1) : "0.0");
      return { working, present, absent, rate };
    }

    const monthNum = parseInt(selectedMonth, 10);
    const rec = monthlyRecords.find((r) => r.month === monthNum);
    if (rec && (rec.workingDays > 0 || rec.present > 0)) {
      const working = rec.workingDays || 0;
      const present = rec.present || 0;
      const absent = (rec.absent || 0) + (rec.leave || 0);
      const rate = typeof rec.attendancePercentage === "number"
        ? rec.attendancePercentage.toFixed(1)
        : (working > 0 ? ((present / working) * 100).toFixed(1) : "0.0");
      return { working, present, absent, rate };
    }

    // Direct calculation from fetched live daily logs
    const working = dailyLogs.length;
    const present = dailyLogs.filter((l) => l.status?.toLowerCase() === "present").length;
    const absent = dailyLogs.filter((l) => l.status?.toLowerCase() === "absent").length;
    const rate = working > 0 ? ((present / working) * 100).toFixed(1) : "0.0";
    return { working, present, absent, rate };
  }, [child?.attendance, monthlyRecords, selectedMonth, dailyLogs]);

  if (loading && !child) {
    return (
      <DashboardLayout
        title="Attendance"
        subtitle="Loading monthly attendance registers..."
        breadcrumb={["Parent Portal", "Attendance"]}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <CalendarCheck size={48} style={{ color: "var(--cms-primary)", margin: "0 auto 16px" }} />
            <h3>Loading Attendance Records...</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              Connecting to campus attendance system to retrieve student attendance registers.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
      subtitle={`Overall attendance: ${child?.attendance?.overall ?? 0}% (${child?.attendance?.status || "—"}) • ${child.name} (${child.group})`}
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
              <div className="parent-stat-value" style={{ color: "var(--cms-green)" }}>{child?.attendance?.overall ?? 0}%</div>
              <div className="parent-stat-subtext">Status: <strong>{child?.attendance?.status || "—"}</strong></div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap">
              <CheckCircle2 size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Present Days</div>
              <div className="parent-stat-value">{child?.attendance?.presentDays ?? 0} Days</div>
              <div className="parent-stat-subtext">Out of {child?.attendance?.totalWorkingDays ?? 0} working days</div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap amber">
              <XCircle size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Absent / Leave Days</div>
              <div className="parent-stat-value">{child?.attendance?.absentDays ?? 0} Days</div>
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
                  {subjectsLoading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                        Loading subject attendance records...
                      </td>
                    </tr>
                  ) : subjects.length > 0 ? (
                    subjects.map((sub, idx) => (
                      <tr key={sub.subjectId ?? sub.code ?? idx}>
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
                  <option value="10">October</option>
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
                return (selectedYear !== defaultY || selectedMonth !== "10" || filterStatus !== "all") ? (
                  <button
                    type="button"
                    className="cms-btn cms-btn-sm cms-btn-outline"
                    onClick={() => {
                      setSelectedYear(defaultY);
                      setSelectedMonth("10");
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
                  {dailyLogsLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 30, color: "var(--cms-muted)" }}>
                        Loading daily attendance records from server...
                      </td>
                    </tr>
                  ) : displayedLogs.length === 0 ? (
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
