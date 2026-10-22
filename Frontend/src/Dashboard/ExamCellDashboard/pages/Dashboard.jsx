import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Info,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { examCellBase } from "../navigation.js";
import examImage from "@/assets/dashboard-3d/create-exam.png";
import timetableImage from "@/assets/sidebar-3d/timetable.png";
import marksImage from "@/assets/sidebar-3d/marks-evaluation.png";
import resultsImage from "@/assets/sidebar-3d/results.png";
import attendanceImage from "@/assets/dashboard-3d/mark-attendance.png";
import certificateImage from "@/assets/sidebar-3d/certificates.png";
import promotionImage from "@/assets/sidebar-3d/promotion.png";
import reportsImage from "@/assets/sidebar-3d/reports-analytics.png";
import clockImage from "@/assets/settings-3d/attendance-timing.png";
import verifyImage from "@/assets/settings-3d/audit-logs.png";
import "@/components/pages/DashboardPage.css";

export const payload = (response) => response?.data?.data ?? response?.data ?? response;
export const records = (response) => {
  const data = payload(response);
  return Array.isArray(data) ? data : data?.items || data?.records || data?.evaluations || data?.students || data?.results || [];
};
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function formattedTimestamp(date = new Date()) {
  const dateStr = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
  return `${dateStr}, ${timeStr}`;
}

function greetingForHour(hour) {
  if (hour < 12) return { message: "Good Morning", icon: "🌅" };
  if (hour < 17) return { message: "Good Afternoon", icon: "☀️" };
  return { message: "Good Evening", icon: "🌙" };
}

function displayDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(date).slice(0, 10);
  }
}

function formatNumber(value) {
  if (value === undefined || value === null || value === "") return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (/approved|ready|completed|issued|published|active/i.test(s)) return "green";
  if (/scheduled|verified/i.test(s)) return "blue";
  if (/reject|cancel|absent/i.test(s)) return "red";
  if (/draft|pending|requested/i.test(s)) return "orange";
  return "violet";
}

function KpiCard({ label, value, icon, tone, loading, subtext = "View details", to, trend = "Active" }) {
  const content = (
    <article className={`dashboard-kpi dashboard-kpi-${tone} ${to ? "dashboard-kpi-clickable" : ""}`} style={to ? { cursor: "pointer" } : {}}>
      <div className="dashboard-kpi-top">
        <span className="dashboard-kpi-icon">
          <img src={icon} alt="" aria-hidden="true" />
        </span>
        <div className="dashboard-kpi-title-wrap">
          <span className="dashboard-kpi-label">{label}</span>
          <div className="dashboard-kpi-value-row">
            <strong className="dashboard-kpi-value">{loading ? "…" : formatNumber(value)}</strong>
            <span className="dashboard-kpi-trend">{trend}</span>
          </div>
          <span className="dashboard-kpi-subtext">{subtext}</span>
        </div>
      </div>
    </article>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {content}
      </Link>
    );
  }
  return content;
}

export default function Dashboard() {
  const { selectedCampus, selectedCampusId } = useCampusContext();
  const { selectedBoard, selectedAcademicYear, selectedBoardId, selectedAcademicYearId } = useAcademicContext();

  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(() => formattedTimestamp());
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = {
      campusId: selectedCampusId,
      boardId: selectedBoardId,
      academicYearId: selectedAcademicYearId,
      pageNumber: 1,
      pageSize: 1000,
    };

    const requests = {
      exams: () => api.get(apiEndpoints.examinations.getAll, { params }),
      evaluations: () => api.post(apiEndpoints.evaluations.search, params),
      results: () => api.get("/api/v1/results/dashboard", { params }),
      attendance: () => api.get(apiEndpoints.attendance.studentAdminDaily, {
        params: { ...params, date: today(), attendanceDate: today(), fromDate: today(), toDate: today() },
      }),
      certificates: () => api.get("/api/v1/certificates", { params: { ...params, status: "Requested" } }),
      certificateStats: () => api.get("/api/v1/certificates/workflow-stats", { params }),
      promotions: () => api.get(apiEndpoints.promotions.eligible, { params }),
    };

    Promise.all(
      Object.entries(requests).map(async ([key, request]) => {
        try {
          const response = await request();
          return [key, payload(response), null];
        } catch (error) {
          return [key, null, getApiErrorMessage(error) || "Unable to load this section."];
        }
      })
    ).then(async (responses) => {
      const values = Object.fromEntries(responses.map(([key, value]) => [key, value]));
      const failures = Object.fromEntries(responses.filter(([, , error]) => error).map(([key, , error]) => [key, error]));

      const completed = records(values.exams).filter((exam) => /completed/i.test(String(exam.status || "")));
      const readiness = await Promise.all(
        completed.map(async (exam) => {
          try {
            const response = await api.get("/api/v1/results/readiness", {
              params: {
                ...params,
                examId: exam.examinationId || exam.id,
                academicLevelId: exam.academicLevelId,
                groupId: exam.groupId,
                programId: exam.programId,
              },
            });
            return { ...exam, ...payload(response) };
          } catch {
            failures.readiness = "Readiness could not be loaded for all completed examinations.";
            return null;
          }
        })
      );

      values.readyExams = readiness.filter((exam) => exam?.canGenerateResults === true);

      if (active) {
        setData(values);
        setErrors(failures);
        setLoading(false);
        setLastUpdated(formattedTimestamp());
      }
    });

    return () => {
      active = false;
    };
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId, refresh]);

  const exams = records(data.exams)
    .filter((exam) => !/cancel/i.test(exam.status || ""))
    .sort((a, b) => String(b.startDate || "").localeCompare(String(a.startDate || "")));

  const evaluations = records(data.evaluations);
  const evaluationStatus = (row) =>
    row.evaluationStatus ||
    ({ 1: "SUBMITTED", 2: "VERIFIED", 3: "APPROVED", 4: "REJECTED" }[row.status] ?? row.status ?? "SUBMITTED");
  const pending = evaluations.filter((row) =>
    /draft|submitted|verified|not started|rejected/i.test(String(evaluationStatus(row) || ""))
  );
  const marked = records(data.attendance).filter((row) => row.isAttendanceMarked);
  const certificates = records(data.certificates).filter((row) => /^requested$/i.test(String(row.status || "")));
  const readyExams = data.readyExams || [];
  const certCount = data.certificateStats?.requestedCount ?? certificates.length;
  const promoCount = data.promotions?.totalCount ?? records(data.promotions).length;

  const kpis = [
    {
      label: "Upcoming Exams",
      value: errors.exams ? null : exams.length,
      icon: examImage,
      tone: "orange",
      trend: "Active",
      subtext: "Scheduled examinations",
      to: `${examCellBase}/exams`,
    },
    {
      label: "Marks Pending",
      value: errors.evaluations ? null : pending.length,
      icon: marksImage,
      tone: "violet",
      trend: "Pending",
      subtext: "Evaluation in progress",
      to: `${examCellBase}/marks-entry`,
    },
    {
      label: "Results Ready",
      value: errors.readiness || errors.exams ? null : readyExams.length,
      icon: resultsImage,
      tone: "blue",
      trend: "Ready",
      subtext: "Ready for publication",
      to: `${examCellBase}/results`,
    },
    {
      label: "Today's Attendance",
      value: errors.attendance ? null : marked.length,
      icon: attendanceImage,
      tone: "green",
      trend: "Marked",
      subtext: "Sessions marked today",
      to: `${examCellBase}/attendance`,
    },
    {
      label: "Pending Certificates",
      value: certCount,
      icon: certificateImage,
      tone: "cyan",
      trend: "Requested",
      subtext: "Student requests",
      to: `${examCellBase}/certificates`,
    },
    {
      label: "Promotion Pending",
      value: errors.promotions ? null : promoCount,
      icon: promotionImage,
      tone: "violet",
      trend: "Eligible",
      subtext: "Next level promotions",
      to: `${examCellBase}/promotions`,
    },
  ];

  const quickActions = [
    { label: "Examination", to: `${examCellBase}/exams`, icon: examImage, tone: "orange" },
    { label: "Time Table", to: `${examCellBase}/exam-timetable`, icon: timetableImage, tone: "cyan" },
    { label: "Marks Entry", to: `${examCellBase}/marks-entry`, icon: marksImage, tone: "violet" },
    { label: "Marks Verification", to: `${examCellBase}/marks-verification`, icon: verifyImage, tone: "blue" },
    { label: "Results", to: `${examCellBase}/results`, icon: resultsImage, tone: "blue" },
    { label: "Attendance", to: `${examCellBase}/attendance`, icon: attendanceImage, tone: "green" },
    { label: "My Attendance", to: `${examCellBase}/check-in-out`, icon: attendanceImage, tone: "green" },
    { label: "Certificates", to: `${examCellBase}/certificates`, icon: certificateImage, tone: "orange" },
    { label: "Promotions", to: `${examCellBase}/promotions`, icon: promotionImage, tone: "violet" },
    { label: "Exam Reports", to: `${examCellBase}/reports`, icon: reportsImage, tone: "cyan" },
  ];

  const greeting = greetingForHour(currentHour);

  return (
    <DashboardLayout title={null} subtitle={null} actions={null} breadcrumb={["Overview"]}>
      <main className="dashboard-page">
        {/* Top Header Bar & Control Panel (Exact Admin Styling) */}
        <div className="dashboard-header-bar">
          <div className="dashboard-greeting-wrap">
            <h1 className="dashboard-greeting-title">
              <span className="dashboard-greeting-emoji">{greeting.icon}</span> {greeting.message}, Exam Cell!
            </h1>
            <p className="dashboard-greeting-sub">Manage examinations, marks, results and student operations.</p>
          </div>
          <div className="dashboard-header-controls">
            <div className="dashboard-last-updated-badge">
              <Clock size={14} />
              <span>
                Last updated <strong>{lastUpdated}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Global Context Viewing Banner (Exact Admin Styling) */}
        <div className="dashboard-viewing-banner">
          <Info size={16} className="dashboard-banner-icon" />
          <span>
            You are viewing data for {selectedCampus?.name ? <><strong>{selectedCampus.name}</strong> • </> : null}
            <strong>{selectedBoard?.name || selectedBoard?.code || "Board of Intermediate Education"}</strong> •{" "}
            <strong>Academic Year {selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "2026–2027"}</strong>. Change Campus, Board or Academic Year to view corresponding records.
          </span>
        </div>

        {/* 6 Exam Cell KPI Metric Cards in Admin Card Dimensions & Styles */}
        <section className="dashboard-kpi-grid" aria-label="Exam Cell metrics" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} loading={loading} />
          ))}
        </section>

        {/* Quick Actions Row with 3D Icons & Admin Tones */}
        <nav className="dashboard-quick-actions" aria-label="Quick Actions">
          <h2>Quick Actions</h2>
          <div className="dashboard-quick-actions-list" style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}>
            {quickActions.map(({ label, to, icon, tone }) => (
              <Link key={label} to={to} className={`dashboard-quick-action tone-${tone}`}>
                <span className="dashboard-quick-action-icon">
                  <img src={icon} alt="" aria-hidden="true" />
                </span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* 4 Authentic Exam Cell Data Cards in 2x2 Grid (Exact Admin Card Style) */}
        <section
          className="dashboard-grid-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "14px",
            alignItems: "stretch",
          }}
          aria-label="Operations Overview"
        >
          {/* Card 1: Upcoming Examinations */}
          <article className="dashboard-card">
            <header className="dashboard-card-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src={examImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Upcoming Examinations ({exams.length})
              </h3>
              <Link to={`${examCellBase}/exams`} className="dashboard-view-link">
                View All <ChevronRight size={14} />
              </Link>
            </header>
            <div className="dashboard-card-body" style={{ padding: 0 }}>
              {errors.exams ? (
                <div className="dashboard-card-error">
                  <AlertTriangle size={18} className="dashboard-error-icon" />
                  <span>{errors.exams}</span>
                  <button type="button" className="dashboard-retry-btn" onClick={() => setRefresh((r) => r + 1)}>
                    <RotateCcw size={13} /> Retry
                  </button>
                </div>
              ) : exams.length === 0 ? (
                <div className="dashboard-card-empty">
                  <Info size={18} className="dashboard-empty-icon" />
                  <span>{loading ? "Loading examinations..." : "No upcoming examinations scheduled."}</span>
                </div>
              ) : (
                <div className="cms-table-wrap">
                  <table className="cms-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Academic Level</th>
                        <th>Group</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.slice(0, 5).map((row, idx) => {
                        const tone = statusTone(row.status);
                        return (
                          <tr key={row.id || row.examinationId || idx}>
                            <td className="cms-strong">{row.examName || row.name}</td>
                            <td>{row.academicLevelName || row.academicLevel || "—"}</td>
                            <td>{row.groupName || row.group || "—"}</td>
                            <td>{displayDate(row.startDate)}</td>
                            <td>{displayDate(row.endDate)}</td>
                            <td>
                              <span className={`exam-type-pill pill-${tone}`}>
                                {row.status || "Scheduled"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>

          {/* Card 2: Marks Entry Progress */}
          <article className="dashboard-card">
            <header className="dashboard-card-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src={marksImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Marks Entry Progress ({evaluations.length})
              </h3>
              <Link to={`${examCellBase}/marks-verification`} className="dashboard-view-link">
                View All <ChevronRight size={14} />
              </Link>
            </header>
            <div className="dashboard-card-body" style={{ padding: 0 }}>
              {errors.evaluations ? (
                <div className="dashboard-card-error">
                  <AlertTriangle size={18} className="dashboard-error-icon" />
                  <span>{errors.evaluations}</span>
                  <button type="button" className="dashboard-retry-btn" onClick={() => setRefresh((r) => r + 1)}>
                    <RotateCcw size={13} /> Retry
                  </button>
                </div>
              ) : evaluations.length === 0 ? (
                <div className="dashboard-card-empty">
                  <Info size={18} className="dashboard-empty-icon" />
                  <span>{loading ? "Loading marks progress..." : "No marks evaluations pending."}</span>
                </div>
              ) : (
                <div className="cms-table-wrap">
                  <table className="cms-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Subject</th>
                        <th>Section</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.slice(0, 5).map((row, idx) => {
                        const st = evaluationStatus(row);
                        const tone = statusTone(st);
                        return (
                          <tr key={row.id || row.evaluationId || idx}>
                            <td className="cms-strong">{row.examName || row.examinationName || "Quarterly Exam"}</td>
                            <td>{row.subjectName || "—"}</td>
                            <td>{row.sectionName || "—"}</td>
                            <td>
                              <span className={`exam-type-pill pill-${tone}`}>
                                {st}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>

          {/* Card 3: Results Ready for Processing */}
          <article className="dashboard-card">
            <header className="dashboard-card-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src={resultsImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Results Ready for Processing ({readyExams.length})
              </h3>
              <Link to={`${examCellBase}/publish-results`} className="dashboard-view-link">
                View All <ChevronRight size={14} />
              </Link>
            </header>
            <div className="dashboard-card-body" style={{ padding: 0 }}>
              {errors.readiness || errors.exams ? (
                <div className="dashboard-card-error">
                  <AlertTriangle size={18} className="dashboard-error-icon" />
                  <span>{errors.readiness || errors.exams}</span>
                  <button type="button" className="dashboard-retry-btn" onClick={() => setRefresh((r) => r + 1)}>
                    <RotateCcw size={13} /> Retry
                  </button>
                </div>
              ) : readyExams.length === 0 ? (
                <div className="dashboard-card-empty">
                  <Info size={18} className="dashboard-empty-icon" />
                  <span>{loading ? "Checking results readiness..." : "No examination results ready for publishing."}</span>
                </div>
              ) : (
                <div className="cms-table-wrap">
                  <table className="cms-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Group</th>
                        <th>Approved Evaluations</th>
                        <th>Eligible Students</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readyExams.slice(0, 5).map((row, idx) => (
                        <tr key={row.id || row.examinationId || idx}>
                          <td className="cms-strong">{row.examinationName || row.examName || "—"}</td>
                          <td>{row.groupName || "—"}</td>
                          <td>
                            <span className="exam-type-pill pill-green">
                              {row.approvedEvaluationCount ?? 0} Approved
                            </span>
                          </td>
                          <td>{row.totalEligibleStudents ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>

          {/* Card 4: Pending Certificate Requests */}
          <article className="dashboard-card">
            <header className="dashboard-card-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <img src={certificateImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Pending Certificate Requests ({certificates.length})
              </h3>
              <Link to={`${examCellBase}/certificates`} className="dashboard-view-link">
                View All <ChevronRight size={14} />
              </Link>
            </header>
            <div className="dashboard-card-body" style={{ padding: 0 }}>
              {errors.certificates ? (
                <div className="dashboard-card-error">
                  <AlertTriangle size={18} className="dashboard-error-icon" />
                  <span>{errors.certificates}</span>
                  <button type="button" className="dashboard-retry-btn" onClick={() => setRefresh((r) => r + 1)}>
                    <RotateCcw size={13} /> Retry
                  </button>
                </div>
              ) : certificates.length === 0 ? (
                <div className="dashboard-card-empty">
                  <Info size={18} className="dashboard-empty-icon" />
                  <span>{loading ? "Loading certificate requests..." : "No pending certificate requests."}</span>
                </div>
              ) : (
                <div className="cms-table-wrap">
                  <table className="cms-table" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Certificate Type</th>
                        <th>Requested Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.slice(0, 5).map((row, idx) => {
                        const tone = statusTone(row.status);
                        return (
                          <tr key={row.id || row.certificateId || idx}>
                            <td className="cms-strong">{row.studentName || "Student"}</td>
                            <td>{row.certificateType || row.type || "Bonafide"}</td>
                            <td>{displayDate(row.requestDate || row.requestedDate)}</td>
                            <td>
                              <span className={`exam-type-pill pill-${tone}`}>
                                {row.status || "Requested"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>
        </section>
      </main>
    </DashboardLayout>
  );
}
