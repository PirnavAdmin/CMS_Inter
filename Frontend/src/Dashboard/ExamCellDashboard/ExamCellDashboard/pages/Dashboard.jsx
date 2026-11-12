import { Skeleton } from "@/shared/components/Skeleton.jsx";
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
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { examCellBase } from "../navigation.js";
import examImage from "@/assets/dashboard-3d/create-exam.png";
import marksImage from "@/assets/sidebar-3d/marks-evaluation.png";
import resultsImage from "@/assets/sidebar-3d/results.png";
import attendanceImage from "@/assets/dashboard-3d/mark-attendance.png";
import certificateImage from "@/assets/sidebar-3d/certificates.png";
import promotionImage from "@/assets/sidebar-3d/promotion.png";
import reportsImage from "@/assets/sidebar-3d/reports-analytics.png";
import clockImage from "@/assets/settings-3d/attendance-timing.png";
import verifyImage from "@/assets/settings-3d/audit-logs.png";
import "@/modules/admin/AdminDashboard/DashboardPage.css";
import { normalizeStudentStatus } from "@/modules/admin/AdminAttendance/dashboardStudentAttendance.js";

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

function CustomDonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    const dotColor = data.payload?.color || data.color || "#22a447";
    return (
      <div className="dashboard-custom-donut-tooltip">
        <span className="tooltip-dot" style={{ backgroundColor: dotColor }} />
        <span className="tooltip-name">{data.name}:</span>
        <span className="tooltip-val">{formatNumber(data.value)}</span>
      </div>
    );
  }
  return null;
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (/approved|ready|completed|issued|published|active/i.test(s)) return "green";
  if (/scheduled|verified/i.test(s)) return "blue";
  if (/reject|cancel|absent/i.test(s)) return "red";
  if (/draft|pending|requested/i.test(s)) return "orange";
  return "violet";
}

function KpiCard({ label, value, icon, tone, loading, error, subtext = "View details", to, trend = "Active" }) {
  const isError = Boolean(error);
  const displayTrend = isError ? "Restricted" : trend;
  const displaySubtext = isError
    ? (String(error).includes("403") || /permission|denied|restrict/i.test(String(error)) ? "Access restricted" : "Unable to load")
    : subtext;

  const content = (
    <article className={`dashboard-kpi dashboard-kpi-${tone} ${to ? "dashboard-kpi-clickable" : ""}`} style={to ? { cursor: "pointer" } : {}}>
      <div className="dashboard-kpi-top">
        <span className="dashboard-kpi-icon">
          <img src={icon} alt="" aria-hidden="true" />
        </span>
        <div className="dashboard-kpi-title-wrap">
          <span className="dashboard-kpi-label">{label}</span>
          <div className="dashboard-kpi-value-row">
            <strong className="dashboard-kpi-value">{loading ? <Skeleton style={{ width: 72, height: 28 }} /> : isError ? "—" : formatNumber(value)}</strong>
            <span className="dashboard-kpi-trend">{displayTrend}</span>
          </div>
          <span className="dashboard-kpi-subtext">{displaySubtext}</span>
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

// In-memory module cache to prevent flickering / constant reloads when switching tabs
let examCellDashboardCache = null;
let examCellLastFetchedAt = 0;

export default function Dashboard() {
  const { selectedCampus, selectedCampusId } = useCampusContext();
  const {
    selectedBoard,
    selectedAcademicYear,
    selectedBoardId,
    selectedAcademicYearId,
    academicYears,
    setSelectedAcademicYear,
  } = useAcademicContext();

  const [data, setData] = useState(() => examCellDashboardCache?.data || {});
  const [errors, setErrors] = useState(() => examCellDashboardCache?.errors || {});
  const [loading, setLoading] = useState(() => !examCellDashboardCache);
  const [refresh, setRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(() => examCellDashboardCache?.lastUpdated || formattedTimestamp());
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  // Resolve matching active academic year for the selected board
  const effectiveAcademicYear = useMemo(() => {
    const boardYears = (academicYears || []).filter((y) => {
      const yBoard = y.boardId ?? y.BoardId;
      return !yBoard || String(yBoard) === String(selectedBoardId || 1);
    });

    const currentId = String(
      selectedAcademicYearId ?? selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId ?? ""
    );

    // 1. If currentId is a valid ID in boardYears and not the stale/dummy 1
    if (currentId && currentId !== "1") {
      const match = boardYears.find((y) => String(y.id || y.academicYearId) === currentId);
      if (match) return match;
    }

    // 2. Match by year name (e.g. "2026-2027")
    const currentName = String(
      selectedAcademicYear?.name ||
      selectedAcademicYear?.academicYearName ||
      selectedAcademicYear?.label ||
      selectedAcademicYear?.code ||
      ""
    ).trim().toLowerCase();

    if (currentName && currentName !== "1") {
      const match = boardYears.find(
        (y) => String(y.name || y.code || "").trim().toLowerCase() === currentName
      );
      if (match) return match;
    }

    // 3. Active year in boardYears (preferring 2026-2027)
    const active =
      boardYears.find((y) => y.isActive !== false && String(y.name || y.code || "").includes("2026-2027")) ||
      boardYears.find((y) => y.isActive !== false);
    if (active) return active;

    // 4. First board year if available
    if (boardYears.length > 0) return boardYears[0];

    // 5. Default fallback for Board 1 (BIEAP 2026-2027 has ID 9)
    return { id: 9, academicYearId: 9, name: "2026-2027" };
  }, [academicYears, selectedBoardId, selectedAcademicYearId, selectedAcademicYear]);

  // Synchronize AcademicContext if selectedAcademicYear was unassigned or stale
  useEffect(() => {
    if (
      effectiveAcademicYear &&
      typeof setSelectedAcademicYear === "function" &&
      String(selectedAcademicYearId) !== String(effectiveAcademicYear.id || effectiveAcademicYear.academicYearId)
    ) {
      setSelectedAcademicYear(effectiveAcademicYear);
    }
  }, [effectiveAcademicYear, selectedAcademicYearId, setSelectedAcademicYear]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const effectiveYearId = Number(effectiveAcademicYear?.id || effectiveAcademicYear?.academicYearId || 9);

  useEffect(() => {
    let active = true;
    const campusKey = Number(selectedCampusId) || 1;
    const boardKey = Number(selectedBoardId) || 1;
    const yearKey = effectiveYearId;

    const isSameContext =
      examCellDashboardCache &&
      examCellDashboardCache.campusId === campusKey &&
      examCellDashboardCache.boardId === boardKey &&
      examCellDashboardCache.yearId === yearKey;

    const isFresh = isSameContext && Date.now() - examCellLastFetchedAt < 60_000;

    // Only set loading if there is no cached data to avoid flashing/reloading
    if (!isSameContext || !examCellDashboardCache) {
      setLoading(true);
    } else if (isFresh && refresh === 0) {
      // Data is already fresh for this module - do not re-fetch on tab switches
      return;
    }

    const params = {
      campusId: campusKey,
      boardId: boardKey,
      academicYearId: yearKey,
      pageNumber: 1,
      pageSize: 1000,
    };

    const requests = {
      exams: () => api.get(apiEndpoints.examinations.getAll, { params }),
      evaluations: async () => {
        try {
          return await api.post(apiEndpoints.evaluations.search, params);
        } catch {
          try {
            return await api.get("/api/v1/faculty/evaluations", { params });
          } catch {
            return [];
          }
        }
      },
      results: () => api.get("/api/v1/results/dashboard", { params }),
      attendance: async () => {
        try {
          const res = await api.get(apiEndpoints.attendance.studentAdminDaily, {
            params: { ...params, date: today(), attendanceDate: today(), fromDate: today(), toDate: today() },
          });
          const raw = payload(res);
          const rows = Array.isArray(raw) ? raw : (raw?.items || raw?.$values || []);
          if (Array.isArray(rows) && rows.length > 0) return rows;
          return raw;
        } catch {
          try {
            return await api.get(apiEndpoints.dashboard.studentAttendance, {
              params: { campusId: params.campusId, boardId: params.boardId, academicYearId: params.academicYearId, viewBy: "Overall" },
            });
          } catch {
            return { presentCount: 0, totalStudents: 0 };
          }
        }
      },
      certificates: () => api.get("/api/v1/certificates", { params: { ...params, status: "Requested" } }),
      certificateStats: () => api.get("/api/v1/certificates/workflow-stats", { params }),
      promotions: () => api.get(apiEndpoints.promotions.eligible, { params, silent: true, skipErrorLog: true }),
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
      values.exams = records(values.exams);
      const failures = Object.fromEntries(responses.filter(([, , error]) => error).map(([key, , error]) => [key, error]));

      if (failures.evaluations && /format|submitted/i.test(failures.evaluations)) {
        delete failures.evaluations;
      }

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
        const updatedTime = formattedTimestamp();
        setLastUpdated(updatedTime);

        examCellDashboardCache = {
          data: values,
          errors: failures,
          campusId: campusKey,
          boardId: boardKey,
          yearId: yearKey,
          lastUpdated: updatedTime,
        };
        examCellLastFetchedAt = Date.now();
      }
    });

    return () => {
      active = false;
    };
  }, [selectedCampusId, selectedBoardId, effectiveYearId, refresh]);

  const todayStr = today();
  const rawExams = records(data.exams);
  const seenExamIds = new Set();
  const allBackendExams = [];
  for (const item of rawExams) {
    const id = String(item.examinationId ?? item.examId ?? item.id ?? "");
    if (id && !seenExamIds.has(id)) {
      seenExamIds.add(id);
      allBackendExams.push(item);
    } else if (!id) {
      allBackendExams.push(item);
    }
  }

  const upcomingExams = allBackendExams
    .filter((exam) => {
      if (exam.isActive === false) return false;
      const st = String(exam.status || "").toLowerCase();
      if (/cancel|archive|deleted/i.test(st)) return false;
      if (/complete|finish|evaluated/i.test(st) || exam.isCompleted === true) return false;
      const sDate = String(exam.startDate || "").slice(0, 10);
      if (!sDate) return false;
      return sDate >= todayStr;
    })
    .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")));

  const exams = upcomingExams;

  const evaluations = records(data.evaluations);
  const evaluationStatus = (row) =>
    row.evaluationStatus ||
    ({ 1: "SUBMITTED", 2: "VERIFIED", 3: "APPROVED", 4: "REJECTED" }[row.status] ?? row.status ?? "SUBMITTED");
  const pending = evaluations.filter((row) =>
    /draft|submitted|verified|not started|rejected/i.test(String(evaluationStatus(row) || ""))
  );

  const studentAttData = useMemo(() => {
    const raw = payload(data.attendance) || {};
    let total = 0;
    let marked = 0;
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let percentage = 0;

    if (Array.isArray(raw)) {
      total = raw.length;
      raw.forEach((row) => {
        const morning = normalizeStudentStatus(row.morningStatus ?? row.status);
        const afternoon = normalizeStudentStatus(row.afternoonStatus ?? row.status);
        const isMarked =
          Boolean(row.isAttendanceMarked) ||
          (morning !== null && morning !== undefined) ||
          (afternoon !== null && afternoon !== undefined);
        if (isMarked) {
          marked++;
          if (
            morning === "Half Day" ||
            afternoon === "Half Day" ||
            (morning === "Present" && afternoon === "Absent") ||
            (afternoon === "Present" && morning === "Absent") ||
            Number(row.status) === 4
          ) {
            halfDay++;
          } else if (morning === "Present" || afternoon === "Present" || Number(row.status) === 1) {
            present++;
          } else if (morning === "Absent" || afternoon === "Absent" || Number(row.status) === 2) {
            absent++;
          }
        }
      });
      percentage = marked > 0 && total > 0 ? Number((((present + 0.5 * halfDay) / total) * 100).toFixed(1)) : 0;
    } else {
      total = Number(raw.totalStudents ?? raw.total ?? raw.totalCount ?? 0);
      marked = Number(
        raw.markedStudents ??
          raw.markedCount ??
          ((raw.presentCount ?? raw.present ?? 0) + (raw.absentCount ?? raw.absent ?? 0) + (raw.halfDayCount ?? raw.halfDay ?? 0))
      );
      present = Number(raw.presentCount ?? raw.present ?? 0);
      absent = Number(raw.absentCount ?? raw.absent ?? 0);
      halfDay = Number(raw.halfDayCount ?? raw.halfDay ?? raw.lateCount ?? raw.late ?? 0);
      percentage =
        raw.attendancePercentage ??
        raw.percentage ??
        (marked > 0 && total > 0 ? Number((((present + 0.5 * halfDay) / total) * 100).toFixed(1)) : 0);
    }

    const hasMarkedRecords = marked > 0 || present + absent + halfDay > 0;
    const chartData = hasMarkedRecords
      ? [
          { name: "Present", value: present, color: "#22a447" },
          { name: "Absent", value: absent, color: "#ef4444" },
          { name: "Half-day", value: halfDay, color: "#f59e0b" },
        ]
      : [{ name: "Not marked today", value: total || 1, color: "#cbd5e1" }];

    return {
      total,
      marked,
      present,
      absent,
      halfDay,
      percentage: Number(percentage || 0).toFixed(1).replace(/\.0$/, ""),
      hasMarkedRecords,
      chartData,
    };
  }, [data.attendance]);

  const certificates = records(data.certificates).filter((row) => /^requested$/i.test(String(row.status || "")));
  const readyExams = data.readyExams || [];
  const certCount = errors.certificates ? null : (certificates.length || data.certificateStats?.generatedCount || 0);
  const promoCount = data.promotions?.totalCount ?? records(data.promotions).length;

  const kpis = [
    {
      label: "Upcoming Exams",
      value: errors.exams ? null : exams.length,
      error: errors.exams,
      icon: examImage,
      tone: "orange",
      trend: "Active",
      subtext: exams.length > 0 ? `${exams.length} upcoming examinations` : "No upcoming examinations",
      to: `${examCellBase}/exams`,
    },
    {
      label: "Marks Pending",
      value: pending.length,
      error: null,
      icon: marksImage,
      tone: "violet",
      trend: pending.length > 0 ? "Pending" : "Active",
      subtext: pending.length > 0 ? `${pending.length} pending evaluations` : "All marks up to date",
      to: `${examCellBase}/marks-entry`,
    },
    {
      label: "Results Ready",
      value: errors.readiness || errors.exams ? null : readyExams.length,
      error: errors.readiness || errors.exams,
      icon: resultsImage,
      tone: "blue",
      trend: "Ready",
      subtext: "Ready for publication",
      to: `${examCellBase}/results`,
    },
    {
      label: "Today's Attendance",
      value: studentAttData.present,
      error: errors.attendance,
      icon: attendanceImage,
      tone: "green",
      trend: studentAttData.total > 0 ? `${studentAttData.percentage}% Marked` : "Active",
      subtext: studentAttData.present > 0 ? `${studentAttData.present} students present` : "Attendance records active",
      to: `${examCellBase}/attendance`,
    },
    {
      label: "Pending Certificates",
      value: certCount,
      error: errors.certificates,
      icon: certificateImage,
      tone: "cyan",
      trend: "Requested",
      subtext: "Student requests",
      to: `${examCellBase}/certificates`,
    },
    {
      label: "Promotion Pending",
      value: errors.promotions ? null : promoCount,
      error: errors.promotions,
      icon: promotionImage,
      tone: "violet",
      trend: errors.promotions ? "Restricted" : "Eligible",
      subtext: errors.promotions ? "Access restricted" : "Next level promotions",
      to: `${examCellBase}/promotions`,
    },
  ];

  const quickActions = [
    { label: "Examination", to: `${examCellBase}/exams`, icon: examImage, tone: "orange" },
    { label: "Marks Entry", to: `${examCellBase}/marks-entry`, icon: marksImage, tone: "violet" },
    { label: "Marks Verification", to: `${examCellBase}/marks-verification`, icon: verifyImage, tone: "blue" },
    { label: "Results", to: `${examCellBase}/results`, icon: resultsImage, tone: "emerald" },
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
          <div
            className="dashboard-quick-actions-list"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
              gap: "6px",
              width: "100%",
              alignItems: "center",
            }}
          >
            {quickActions.map(({ label, to, icon, tone }) => (
              <Link
                key={label}
                to={to}
                className={`dashboard-quick-action tone-${tone}`}
                style={{ padding: "5px 6px", whiteSpace: "nowrap" }}
              >
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
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "12px", fontWeight: 800, color: "var(--cms-text)" }}>
                <img src={examImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Upcoming Examinations ({exams.length})
              </h2>
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
                  <span>{loading ? <Skeleton style={{ width: "100%", maxWidth: 180, height: 16 }} /> : "No upcoming examinations scheduled."}</span>
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
            <div className="dashboard-card-footer" style={{ marginTop: "auto" }}>
              <Link to={`${examCellBase}/exams`} className="dashboard-footer-btn">
                View All Examinations <ChevronRight size={14} />
              </Link>
            </div>
          </article>

          {/* Card 2: Marks Entry Progress */}
          <article className="dashboard-card">
            <header className="dashboard-card-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "12px", fontWeight: 800, color: "var(--cms-text)" }}>
                <img src={marksImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Marks Entry Progress ({evaluations.length})
              </h2>
              <Link to={`${examCellBase}/marks-verification`} className="dashboard-view-link">
                View All <ChevronRight size={14} />
              </Link>
            </header>
            <div className="dashboard-card-body" style={{ padding: 0 }}>
              {errors.evaluations && !/format|submitted/i.test(errors.evaluations) ? (
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
                  <span>{loading ? <Skeleton style={{ width: "100%", maxWidth: 180, height: 16 }} /> : "No marks evaluations pending."}</span>
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
            <div className="dashboard-card-footer" style={{ marginTop: "auto" }}>
              <Link to={`${examCellBase}/marks-verification`} className="dashboard-footer-btn">
                View All Evaluations <ChevronRight size={14} />
              </Link>
            </div>
          </article>

          {/* Card 3: Students Attendance Overview (Today) */}
          <article className="dashboard-card dashboard-attendance-today-card">
            <header className="dashboard-card-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "12px", fontWeight: 800, color: "var(--cms-text)" }}>
                <img src={attendanceImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Students Attendance Overview (Today)
              </h2>
              <Link to={`${examCellBase}/attendance`} className="dashboard-view-link">
                View All <ChevronRight size={14} />
              </Link>
            </header>

            {loading ? (
              <div className="dashboard-card-loading" style={{ padding: "16px 12px" }}>
                <Skeleton style={{ width: "100%", height: 18, marginBottom: 8 }} />
                <Skeleton style={{ width: "70%", height: 14 }} />
              </div>
            ) : errors.attendance ? (
              <div className="dashboard-card-error">
                <AlertTriangle size={18} className="dashboard-error-icon" />
                <span>{errors.attendance}</span>
                <button type="button" className="dashboard-retry-btn" onClick={() => setRefresh((r) => r + 1)}>
                  <RotateCcw size={13} /> Retry
                </button>
              </div>
            ) : (
              <div className="dashboard-card-body dashboard-attendance-body">
                {studentAttData.total === 0 ? (
                  <div className="dashboard-card-empty">
                    <Info size={18} className="dashboard-empty-icon" />
                    <span>No student attendance data available for today.</span>
                  </div>
                ) : (
                  <>
                    {/* Donut Chart & Side Status Legend (Centered Together) */}
                    <div className="dashboard-attendance-donut-row">
                      <div className="dashboard-donut-chart-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={
                                studentAttData.chartData.some((d) => d.value > 0)
                                  ? studentAttData.chartData.filter((d) => d.value > 0)
                                  : [{ name: "Not marked today", value: 1, color: "#cbd5e1" }]
                              }
                              dataKey="value"
                              nameKey="name"
                              innerRadius="65%"
                              outerRadius="90%"
                              paddingAngle={studentAttData.chartData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                              stroke="var(--cms-surface)"
                              strokeWidth={2}
                            >
                              {(studentAttData.chartData.some((d) => d.value > 0)
                                ? studentAttData.chartData.filter((d) => d.value > 0)
                                : [{ name: "Not marked today", value: 1, color: "#cbd5e1" }]
                              ).map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={studentAttData.total > 0 ? <CustomDonutTooltip /> : () => null}
                              wrapperStyle={{ pointerEvents: "none", zIndex: 100 }}
                              allowEscapeViewBox={{ x: true, y: true }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="dashboard-donut-center">
                          <strong>{studentAttData.percentage ?? 0}%</strong>
                          <span>{studentAttData.hasMarkedRecords ? "Attendance" : "Not Marked"}</span>
                        </div>
                      </div>

                      <div className="dashboard-attendance-legend-vertical">
                        <div className="legend-item">
                          <span className="legend-label">
                            <span className="dot dot-present" /> Present
                          </span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-label">
                            <span className="dot dot-absent" /> Absent
                          </span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-label">
                            <span className="dot dot-halfday" /> Half-day
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5 Summary KPI Chips */}
                    <div className="dashboard-attendance-kpi-row">
                      <Link to={`${examCellBase}/attendance`} className="att-kpi-chip">
                        <small>Total Students</small>
                        <strong>{formatNumber(studentAttData.total)}</strong>
                      </Link>
                      <Link to={`${examCellBase}/attendance`} className="att-kpi-chip text-present">
                        <small>Present</small>
                        <strong>{formatNumber(studentAttData.present)}</strong>
                      </Link>
                      <Link to={`${examCellBase}/attendance`} className="att-kpi-chip text-absent">
                        <small>Absent</small>
                        <strong>{formatNumber(studentAttData.absent)}</strong>
                      </Link>
                      <Link to={`${examCellBase}/attendance`} className="att-kpi-chip text-halfday text-late">
                        <small>Half-day</small>
                        <strong>{formatNumber(studentAttData.halfDay)}</strong>
                      </Link>
                      <Link to={`${examCellBase}/attendance`} className="att-kpi-chip">
                        <small>Attendance</small>
                        <strong>{formatNumber(studentAttData.percentage)}%</strong>
                      </Link>
                    </div>
                  </>
                )}

                {/* Footer */}
                <div className="dashboard-card-footer" style={{ marginTop: "auto" }}>
                  <Link to={`${examCellBase}/attendance`} className="dashboard-footer-btn">
                    View Attendance Details <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </article>

          {/* Card 4: Pending Certificate Requests */}
          <article className="dashboard-card">
            <header className="dashboard-card-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "12px", fontWeight: 800, color: "var(--cms-text)" }}>
                <img src={certificateImage} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                Pending Certificate Requests ({certificates.length})
              </h2>
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
                  <span>{loading ? <Skeleton style={{ width: "100%", maxWidth: 180, height: 16 }} /> : "No pending certificate requests."}</span>
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
            <div className="dashboard-card-footer" style={{ marginTop: "auto" }}>
              <Link to={`${examCellBase}/certificates`} className="dashboard-footer-btn">
                View All Certificates <ChevronRight size={14} />
              </Link>
            </div>
          </article>
        </section>
      </main>
    </DashboardLayout>
  );
}
