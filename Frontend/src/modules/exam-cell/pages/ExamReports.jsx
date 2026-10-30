import { SkeletonDashboard } from "@/shared/components/Skeleton.jsx";
import React, { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  BarChart2,
  Award,
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Search,
  Printer,
} from "lucide-react";
import * as XLSX from "xlsx";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import DashboardLayout from "../layout/ExamCellPageLayout.jsx";
import { getModuleState, saveModuleState } from "../statePersistence.js";
import { Toast, Pagination } from "@/shared/components/Ui.jsx";
import "@/modules/admin/AdminExaminations/ExaminationPage.css";
import "./ExamReports.css";

const REPORT_PAGE_SIZE = 10;

const printExamReport = (exam, analytics, allRanks) => {
  if (!exam || !analytics) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to print report.");
    return;
  }

  const examName = exam.examName || exam.name || "Examination Report";
  const academicLevel = exam.academicLevelName || exam.academicLevel || "General";
  const groupName = exam.groupName || "All Groups";
  const total = analytics.totalStudents ?? allRanks.length;
  const passed = analytics.passed ?? allRanks.filter((r) => r.result === "PASS").length;
  const failed = analytics.failed ?? allRanks.filter((r) => r.result !== "PASS").length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Examination Performance & Merit Report - ${examName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { margin: 0 0 4px; font-size: 20px; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 0 0 4px; font-size: 14px; color: #334155; font-weight: 600; }
    .header p { margin: 0; font-size: 11px; color: #64748b; }
    .kpi-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; }
    .kpi-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .kpi-val { font-size: 18px; font-weight: 700; color: #0f172a; }
    .section-title { font-size: 13px; font-weight: 700; color: #0f766e; margin: 16px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 700; color: #334155; }
    td { border: 1px solid #cbd5e1; padding: 5px 8px; }
    .text-center { text-align: center; }
    .badge-pass { color: #16a34a; font-weight: 700; }
    .badge-fail { color: #dc2626; font-weight: 700; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; page-break-inside: avoid; }
    .sig-col { text-align: center; width: 180px; }
    .sig-line { border-top: 1px solid #475569; margin-top: 40px; padding-top: 6px; font-weight: 600; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>COLLEGE EXAMINATION CELL</h1>
    <h2>EXAMINATION PERFORMANCE & MERIT REPORT</h2>
    <p>Examination: <strong>${examName}</strong> | Group: <strong>${groupName}</strong> | Level: <strong>${academicLevel}</strong></p>
  </div>

  <div class="kpi-row">
    <div class="kpi-box"><div class="kpi-title">Total Students</div><div class="kpi-val">${total}</div></div>
    <div class="kpi-box"><div class="kpi-title">Passed</div><div class="kpi-val" style="color: #16a34a">${passed}</div></div>
    <div class="kpi-box"><div class="kpi-title">Failed</div><div class="kpi-val" style="color: #dc2626">${failed}</div></div>
    <div class="kpi-box"><div class="kpi-title">Pass Percentage</div><div class="kpi-val" style="color: #0f766e">${passRate}%</div></div>
  </div>

  ${analytics.subjectPerformance && analytics.subjectPerformance.length > 0 ? `
    <div class="section-title">Subject Performance Analytics</div>
    <table>
      <thead>
        <tr>
          <th>Subject Name</th>
          <th class="text-center">Candidates</th>
          <th class="text-center">Average Score</th>
          <th class="text-center">Highest Score</th>
          <th class="text-center">Lowest Score</th>
          <th class="text-center">Pass %</th>
        </tr>
      </thead>
      <tbody>
        ${analytics.subjectPerformance.map(s => `
          <tr>
            <td>${s.subjectName || "—"}</td>
            <td class="text-center">${s.students ?? "—"}</td>
            <td class="text-center">${s.average ?? "—"}</td>
            <td class="text-center" style="color: #16a34a; font-weight: 700;">${s.highest ?? "—"}</td>
            <td class="text-center" style="color: #dc2626;">${s.lowest ?? "—"}</td>
            <td class="text-center" style="font-weight: 700;">${s.passPercentage ?? "—"}%</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : ""}

  <div class="section-title">Student Merit & Rank List (Total Records: ${allRanks.length})</div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 50px;">Rank</th>
        <th>Student Name</th>
        <th>Roll Number</th>
        <th>Section</th>
        <th class="text-center">Total Marks</th>
        <th class="text-center">Percentage</th>
        <th class="text-center">Result</th>
      </tr>
    </thead>
    <tbody>
      ${allRanks.length === 0 ? `<tr><td colspan="7" class="text-center">No ranked student records.</td></tr>` : 
        allRanks.map(r => `
          <tr>
            <td class="text-center" style="font-weight: 700;">${r.rank}</td>
            <td><strong>${r.studentName || r.student || "—"}</strong></td>
            <td>${r.rollNumber || r.rollNo || "—"}</td>
            <td>${r.sectionName || r.section || "—"}</td>
            <td class="text-center">${r.totalMarks ?? r.total ?? "—"}</td>
            <td class="text-center" style="font-weight: 700;">${r.percentage}%</td>
            <td class="text-center ${r.result === "PASS" ? "badge-pass" : "badge-fail"}">${r.result}</td>
          </tr>
        `).join("")}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-col"><div class="sig-line">Exam Cell In-charge</div></div>
    <div class="sig-col"><div class="sig-line">Controller of Examinations</div></div>
    <div class="sig-col"><div class="sig-line">Principal / Director</div></div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  <\/script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

const unwrapRecords = (res) => {
  if (!res) return [];
  const payload = res.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function ExamReports() {
  const { selectedCampusId: campusId } = useCampusContext();
  const { selectedBoardId: boardId, selectedAcademicYearId: academicYearId } = useAcademicContext();

  const savedReportState = useMemo(() => getModuleState("exam_reports", {}), []);

  const [exams, setExams] = useState([]);
  const [examId, setExamIdState] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("examId")) return p.get("examId");
    }
    return savedReportState?.examId || "";
  });

  const setExamId = (val) => {
    setExamIdState(val);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (val) {
          url.searchParams.set("examId", String(val));
        } else {
          url.searchParams.delete("examId");
        }
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {}
    }
  };

  useEffect(() => {
    if (examId && typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("examId") !== String(examId)) {
          url.searchParams.set("examId", String(examId));
          window.history.replaceState(window.history.state, "", url.toString());
        }
      } catch {}
    }
  }, [examId]);
  const [analytics, setAnalytics] = useState(null);
  const [ranks, setRanks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState(() => savedReportState?.searchTerm || "");
  const [reportPage, setReportPage] = useState(() => savedReportState?.reportPage || 1);

  useEffect(() => {
    saveModuleState("exam_reports", {
      examId,
      searchTerm,
      reportPage,
    });
  }, [examId, searchTerm, reportPage]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const selectedExam = useMemo(() => {
    return exams.find((e) => String(e.examinationId || e.id) === String(examId)) || null;
  }, [exams, examId]);

  // Load Examinations
  useEffect(() => {
    let active = true;
    api
      .get(apiEndpoints.examinations.getAll, {
        params: { campusId, boardId, academicYearId, pageSize: 1000 },
      })
      .then((res) => {
        if (!active) return;
        let list = unwrapRecords(res);
        if (list.length === 0) {
          api
            .get(apiEndpoints.examinations.getAll, { params: { campusId, pageSize: 1000 } })
            .then((fb) => {
              if (active) {
                const fbList = unwrapRecords(fb);
                setExams(fbList);
                if (fbList.length > 0 && !examId) setExamId(String(fbList[0].examinationId || fbList[0].id));
              }
            })
            .catch(() => {});
        } else {
          setExams(list);
          if (list.length > 0 && !examId) setExamId(String(list[0].examinationId || list[0].id));
        }
      })
      .catch((err) => {
        if (active) showToast(getApiErrorMessage(err) || "Failed to load examinations.", "error");
      });

    return () => {
      active = false;
    };
  }, [campusId, boardId, academicYearId]);

  // Load Reports when examId changes or form submitted
  const handleLoadReports = async (e) => {
    const isManualClick = Boolean(e && (e.preventDefault || e.nativeEvent || e.isTrusted || e === true));
    if (e && e.preventDefault) e.preventDefault();
    if (!examId) {
      if (isManualClick) showToast("Please select an examination first.", "warning");
      return;
    }

    setBusy(true);
    const params = {
      campusId,
      boardId,
      academicYearId,
      examinationId: examId,
      examId,
      groupId: selectedExam?.groupId,
      academicLevelId: selectedExam?.academicLevelId,
      programId: selectedExam?.programId,
    };

    try {
      const [analyticsRes, ranksRes] = await Promise.all([
        api.get("/api/v1/results/analytics", { params }).catch(() => null),
        api.get("/api/v1/results/rank-list", { params }).catch(() => null),
      ]);

      const loadedAnalytics = analyticsRes?.data?.data ?? analyticsRes?.data ?? null;
      let loadedRanks = ranksRes ? unwrapRecords(ranksRes) : [];

      const hasRealAnalytics = loadedAnalytics && Number(loadedAnalytics.totalStudents) > 0;
      const hasRealRanks = Array.isArray(loadedRanks) && loadedRanks.length > 0;

      let finalRanks = loadedRanks;
      let finalAnalytics = loadedAnalytics;

      if (!hasRealAnalytics) {
        const total = finalRanks.length;
        const passed = finalRanks.filter((r) => String(r.result).toUpperCase() === "PASS").length;
        const failed = total - passed;
        const passPercentage = total > 0 ? Math.round((passed / total) * 100) : 0;
        const avg = total > 0 ? Number((finalRanks.reduce((s, r) => s + (Number(r.percentage) || 0), 0) / total).toFixed(1)) : 0;
        finalAnalytics = {
          totalStudents: total,
          passed,
          failed,
          passPercentage,
          averagePercentage: avg,
          highestPercentage: finalRanks[0]?.percentage || 0,
        };
      }

      setAnalytics(finalAnalytics);
      setRanks(finalRanks);

      if (isManualClick) {
        showToast("Examination analytics and rank list loaded successfully!");
      }
    } catch (err) {
      if (isManualClick) {
        showToast(getApiErrorMessage(err) || "Failed to load examination reports.", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (examId) {
      handleLoadReports();
    }
  }, [examId]);

  // Export Excel
  const handleExportExcel = () => {
    if (!analytics || ranks.length === 0) {
      showToast("No report data available to export.", "warning");
      return;
    }

    const data = ranks.map((r) => ({
      Rank: r.rank,
      "Roll Number": r.rollNumber || r.rollNo || "—",
      "Student Name": r.studentName || r.student || "—",
      Section: r.sectionName || r.section || "—",
      "Total Marks": r.totalMarks ?? r.total ?? "—",
      Percentage: `${r.percentage}%`,
      Result: r.result,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rank List");
    const filename = `Exam_Rank_List_${selectedExam?.examName ? selectedExam.examName.replace(/\s+/g, "_") : "Report"}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast("Rank list report exported to Excel!");
  };

  // Filtered ranks based on search query
  const filteredRanks = useMemo(() => {
    if (!searchTerm) return ranks;
    const term = searchTerm.toLowerCase();
    return ranks.filter((r) => {
      const name = String(r.studentName || "").toLowerCase();
      const roll = String(r.rollNumber || "").toLowerCase();
      const sec = String(r.sectionName || "").toLowerCase();
      return name.includes(term) || roll.includes(term) || sec.includes(term);
    });
  }, [ranks, searchTerm]);

  useEffect(() => {
    setReportPage(1);
  }, [examId, searchTerm]);

  const pagedRanks = useMemo(() => {
    const start = (reportPage - 1) * REPORT_PAGE_SIZE;
    return filteredRanks.slice(start, start + REPORT_PAGE_SIZE);
  }, [filteredRanks, reportPage]);

  return (
    <DashboardLayout
      title="Exam Reports"
      subtitle="Comprehensive performance analytics, subject score distribution and student rank lists."
      breadcrumb={["Examinations", "Reports"]}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* FILTER & EXAMINATION SELECTOR */}
      <div className="cms-card exam-toolbar" style={{ marginBottom: "20px" }}>
        <form onSubmit={handleLoadReports} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <label className="cms-label" style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "6px", display: "block" }}>
              Select Examination <span style={{ color: "var(--cms-danger, #ef4444)" }}>*</span>
            </label>
            <select
              className="cms-input"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              style={{ width: "100%", height: "40px" }}
            >
              <option value="">-- Choose Examination --</option>
              {exams.map((ex) => (
                <option key={ex.examinationId || ex.id} value={ex.examinationId || ex.id}>
                  {ex.examName || ex.name} · {ex.groupName || "All Groups"} · {ex.academicLevelName || ex.academicLevel || "General"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginTop: "22px" }}>
            <button
              type="submit"
              className="cms-btn cms-btn-primary"
              disabled={busy || !examId}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {busy ? <RefreshCw size={15} className="cms-spin" /> : <BarChart2 size={15} />}
              <span>{busy ? "Loading..." : "Refresh Report"}</span>
            </button>

            <button
              type="button"
              className="cms-btn cms-btn-secondary"
              onClick={handleExportExcel}
              disabled={!analytics || ranks.length === 0}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              className="cms-btn cms-btn-secondary"
              onClick={() => printExamReport(selectedExam, analytics, ranks)}
              disabled={!analytics}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Printer size={15} />
              <span>Print Report</span>
            </button>
          </div>
        </form>
      </div>

      {busy && <SkeletonDashboard cards={4} tableColumns={7} />}
      {!busy && analytics && (
        <>
          {/* KPI METRIC CARDS */}
          <div className="ec-reports-kpi-grid">
            <article className="ec-report-kpi-card tone-blue">
              <div className="ec-kpi-icon">
                <Users size={22} />
              </div>
              <div className="ec-kpi-info">
                <span className="ec-kpi-label">TOTAL STUDENTS</span>
                <div className="ec-kpi-val">{analytics.totalStudents ?? ranks.length}</div>
              </div>
            </article>

            <article className="ec-report-kpi-card tone-green">
              <div className="ec-kpi-icon">
                <CheckCircle2 size={22} />
              </div>
              <div className="ec-kpi-info">
                <span className="ec-kpi-label">PASSED STUDENTS</span>
                <div className="ec-kpi-val">{analytics.passed ?? ranks.filter((r) => r.result === "PASS").length}</div>
              </div>
            </article>

            <article className="ec-report-kpi-card tone-red">
              <div className="ec-kpi-icon">
                <XCircle size={22} />
              </div>
              <div className="ec-kpi-info">
                <span className="ec-kpi-label">FAILED STUDENTS</span>
                <div className="ec-kpi-val">{analytics.failed ?? ranks.filter((r) => r.result === "FAIL").length}</div>
              </div>
            </article>

            <article className="ec-report-kpi-card tone-purple">
              <div className="ec-kpi-icon">
                <TrendingUp size={22} />
              </div>
              <div className="ec-kpi-info">
                <span className="ec-kpi-label">PASS PERCENTAGE</span>
                <div className="ec-kpi-val">{analytics.passPercentage ?? 0}%</div>
              </div>
            </article>

            <article className="ec-report-kpi-card tone-amber">
              <div className="ec-kpi-icon">
                <Award size={22} />
              </div>
              <div className="ec-kpi-info">
                <span className="ec-kpi-label">AVERAGE SCORE</span>
                <div className="ec-kpi-val">{analytics.averagePercentage ?? 0}%</div>
              </div>
            </article>
          </div>

          {/* STUDENT RANK LIST TABLE */}
          <div className="cms-card" style={{ marginBottom: "20px" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--cms-border, rgba(0,0,0,0.06))", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--cms-text, #1A2114)" }}>
                  Student Merit & Rank List
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--cms-muted, #64748b)" }}>
                  Rankings based on total aggregated examination scores
                </span>
              </div>
              <div style={{ width: "260px" }}>
                <div className="exam-search" style={{ margin: 0, width: "100%" }}>
                  <input
                    className="cms-input"
                    type="text"
                    placeholder="Search by student or roll no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ height: "36px" }}
                  />
                </div>
              </div>
            </div>

            <div className="cms-table-responsive" style={{ overflowX: "auto" }}>
              <table className="cms-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "center", width: "80px", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>RANK</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>STUDENT NAME</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>ROLL NUMBER</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>SECTION / BATCH</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>TOTAL MARKS</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>PERCENTAGE</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRanks.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "30px 16px", color: "var(--cms-muted, #64748b)" }}>
                        No ranked records available.
                      </td>
                    </tr>
                  ) : (
                    pagedRanks.map((row) => (
                      <tr key={row.studentId || row.rollNumber} style={{ borderBottom: "1px solid var(--cms-border, rgba(0,0,0,0.05))" }}>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: row.rank === 1 ? "#fbbf24" : row.rank === 2 ? "#94a3b8" : row.rank === 3 ? "#d97706" : "rgba(0,0,0,0.05)",
                              color: row.rank <= 3 ? "#ffffff" : "var(--cms-text, #1A2114)",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                            }}
                          >
                            {row.rank}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--cms-text, #1A2114)" }}>
                          {row.studentName || row.student}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#2563eb", fontWeight: 600 }}>
                          {row.rollNumber || row.rollNo || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--cms-muted, #64748b)" }}>
                          {row.sectionName || row.section || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>
                          {row.totalMarks ?? row.total ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#16a34a" }}>
                          {row.percentage}%
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "10px", background: row.result === "PASS" ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)", color: row.result === "PASS" ? "#16a34a" : "#dc2626", fontSize: "0.76rem", fontWeight: 700 }}>
                            {row.result}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: "12px 20px" }}>
              <Pagination
                currentPage={reportPage}
                totalRecords={filteredRanks.length}
                pageSize={REPORT_PAGE_SIZE}
                onPageChange={setReportPage}
                unit="students"
              />
            </div>
          </div>

          {/* SUBJECT PERFORMANCE TABLE */}
          <div className="cms-card">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--cms-border, rgba(0,0,0,0.06))" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--cms-text, #1A2114)" }}>
                Subject Performance Analytics
              </h3>
              <span style={{ fontSize: "0.82rem", color: "var(--cms-muted, #64748b)" }}>
                Class averages, highest scores, and pass percentages by subject
              </span>
            </div>

            <div className="cms-table-responsive" style={{ overflowX: "auto" }}>
              <table className="cms-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>SUBJECT NAME</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>CANDIDATES</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>AVERAGE SCORE</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>HIGHEST SCORE</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>LOWEST SCORE</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 700, color: "var(--cms-muted, #64748b)" }}>PASS PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.subjectPerformance || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "30px 16px", color: "var(--cms-muted, #64748b)" }}>
                        No subject performance data available.
                      </td>
                    </tr>
                  ) : (
                    (analytics.subjectPerformance || []).map((row, index) => (
                      <tr key={row.subjectId || index} style={{ borderBottom: "1px solid var(--cms-border, rgba(0,0,0,0.05))" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--cms-text, #1A2114)" }}>
                          {row.subjectName || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          {row.students ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>
                          {row.average ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#16a34a" }}>
                          {row.highest ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#dc2626" }}>
                          {row.lowest ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700 }}>
                          {row.passPercentage ?? "—"}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
