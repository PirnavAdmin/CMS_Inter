import React, { useState, useEffect } from "react";
import "./Reports.css";
import {
  getReportBoards,
  getReportAcademicYears,
  getReportAcademicLevels,
  getReportGroups,
  getReportSections,
  getReportsDashboard,
  getAdmissionsDetails,
  getAttendanceDetails,
  getFeeCollectionDetails,
  getDueFeesDetails,
  getExaminationsDetails,
  getResultsDetails,
  getStaffWorkloadDetails,
  getStudentStrengthDetails,
  getPassPercentageDetails,
  getToppersDetails,
  getAuditLogs,
  exportReportPdf,
  exportReportExcel
} from "../../api/reportApi";

const Reports = () => {
  // Active Tab: "reports" | "audit"
  const [activeTab, setActiveTab] = useState("reports");

  // Cascading Filter Dropdown Options
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sections, setSections] = useState([]);

  // Selected Filter State
  const [filters, setFilters] = useState({
    boardId: "",
    academicYearId: "",
    academicLevelId: "",
    groupId: "",
    sectionId: "",
    fromDate: "",
    toDate: ""
  });

  // Overview 10 Metrics Data
  const [overview, setOverview] = useState({
    admissions: 0,
    attendance: 0,
    feeCollection: 0,
    dueFees: 0,
    examinations: 0,
    resultsPublished: 0,
    facultyWorkload: 0,
    studentStrength: 0,
    passPercentage: 0,
    toppersIdentified: 0
  });

  // Selected Detail Report Metric ("admissions", "attendance", "fee-collection", etc.)
  const [selectedMetric, setSelectedMetric] = useState("admissions");
  const [detailData, setDetailData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Initial Load: Fetch dropdowns and overview dashboard
  useEffect(() => {
    loadFilterOptions();
    fetchDashboardMetrics();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [bRes, yRes] = await Promise.all([
        getReportBoards().catch(() => ({ data: [] })),
        getReportAcademicYears().catch(() => ({ data: [] }))
      ]);
      setBoards(Array.isArray(bRes.data) ? bRes.data : []);
      setAcademicYears(Array.isArray(yRes.data) ? yRes.data : []);

      // Load initial levels, groups, sections
      loadDependentFilters({});
    } catch (err) {
      console.error("Error loading filter options:", err);
    }
  };

  const loadDependentFilters = async (currentFilters) => {
    try {
      const [lRes, gRes, sRes] = await Promise.all([
        getReportAcademicLevels(currentFilters).catch(() => ({ data: [] })),
        getReportGroups(currentFilters).catch(() => ({ data: [] })),
        getReportSections(currentFilters).catch(() => ({ data: [] }))
      ]);
      setAcademicLevels(Array.isArray(lRes.data) ? lRes.data : []);
      setGroups(Array.isArray(gRes.data) ? gRes.data : []);
      setSections(Array.isArray(sRes.data) ? sRes.data : []);
    } catch (err) {
      console.error("Error loading dependent filters:", err);
    }
  };

  const handleFilterChange = (field, value) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);

    // If Board, Year, Level, or Group changes, cascade reload dependent dropdowns
    if (["boardId", "academicYearId", "academicLevelId", "groupId"].includes(field)) {
      loadDependentFilters(updated);
    }
  };

  const fetchDashboardMetrics = async (customFilters = filters) => {
    setLoading(true);
    try {
      const res = await getReportsDashboard(customFilters);
      if (res && res.data) {
        setOverview({
          admissions: res.data.admissions || 0,
          attendance: res.data.attendance || 0,
          feeCollection: res.data.feeCollection || 0,
          dueFees: res.data.dueFees || 0,
          examinations: res.data.examinations || 0,
          resultsPublished: res.data.resultsPublished || 0,
          facultyWorkload: res.data.facultyWorkload || 0,
          studentStrength: res.data.studentStrength || 0,
          passPercentage: res.data.passPercentage || 0,
          toppersIdentified: res.data.toppersIdentified || 0
        });
      }
      // Also fetch details for currently active card
      fetchDetailReport(selectedMetric, customFilters);
    } catch (err) {
      console.error("Error fetching dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailReport = async (metricKey, customFilters = filters) => {
    setDetailsLoading(true);
    try {
      let res;
      switch (metricKey) {
        case "admissions":
          res = await getAdmissionsDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "attendance":
          res = await getAttendanceDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "fee-collection":
          res = await getFeeCollectionDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "due-fees":
          res = await getDueFeesDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "examinations":
          res = await getExaminationsDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "results":
          res = await getResultsDetails(customFilters);
          setDetailData(res.data?.results || res.data || []);
          break;
        case "faculty-workload":
          res = await getStaffWorkloadDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "student-strength":
          res = await getStudentStrengthDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "pass-percentage":
          res = await getPassPercentageDetails(customFilters);
          setDetailData(res.data?.details || res.data || []);
          break;
        case "toppers":
          res = await getToppersDetails(customFilters);
          setDetailData(res.data?.toppers || res.data || []);
          break;
        default:
          setDetailData([]);
      }
    } catch (err) {
      console.error(`Error fetching detail report for ${metricKey}:`, err);
      setDetailData([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchAuditLogsList = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs(filters);
      setAuditLogs(Array.isArray(res.data) ? res.data : res.data?.logs || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === "audit") {
      fetchAuditLogsList();
    } else {
      fetchDashboardMetrics();
    }
  };

  const handleGenerateReport = () => {
    if (activeTab === "audit") {
      fetchAuditLogsList();
    } else {
      fetchDashboardMetrics();
    }
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      boardId: "",
      academicYearId: "",
      academicLevelId: "",
      groupId: "",
      sectionId: "",
      fromDate: "",
      toDate: ""
    };
    setFilters(emptyFilters);
    loadDependentFilters({});
    fetchDashboardMetrics(emptyFilters);
  };

  const handleMetricCardClick = (metricKey) => {
    setSelectedMetric(metricKey);
    fetchDetailReport(metricKey, filters);
  };

  const handleExport = async (type) => {
    try {
      const reportName = activeTab === "audit" ? "audit-logs" : selectedMetric;
      let res;
      if (type === "pdf") {
        res = await exportReportPdf(reportName, filters);
      } else {
        res = await exportReportExcel(reportName, filters);
      }
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportName}_Report.${type === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export to ${type.toUpperCase()} completed.`);
    }
  };

  // Card Definition List (10 Cards matching screenshot)
  const metricCards = [
    {
      key: "admissions",
      title: "Admissions",
      value: overview.admissions || "—",
      icon: "🎓",
      bg: "#eef2ff",
      color: "#4f46e5"
    },
    {
      key: "attendance",
      title: "Attendance",
      value: overview.attendance ? `${overview.attendance}%` : "—",
      icon: "📅",
      bg: "#f0fdf4",
      color: "#16a34a"
    },
    {
      key: "fee-collection",
      title: "Fee Collection",
      value: overview.feeCollection ? `₹${overview.feeCollection.toLocaleString()}` : "—",
      icon: "✉️",
      bg: "#f5f3ff",
      color: "#7c3aed"
    },
    {
      key: "due-fees",
      title: "Due Fees",
      value: overview.dueFees ? `₹${overview.dueFees.toLocaleString()}` : "—",
      icon: "⚠️",
      bg: "#fffbeb",
      color: "#d97706"
    },
    {
      key: "examinations",
      title: "Examinations",
      value: overview.examinations || "—",
      icon: "📄",
      bg: "#eff6ff",
      color: "#2563eb"
    },
    {
      key: "results",
      title: "Results Published",
      value: overview.resultsPublished || "—",
      icon: "🏅",
      bg: "#ecfdf5",
      color: "#059669"
    },
    {
      key: "faculty-workload",
      title: "Staff Workload",
      value: overview.facultyWorkload ? `${overview.facultyWorkload} hrs` : "—",
      icon: "💼",
      bg: "#faf5ff",
      color: "#9333ea"
    },
    {
      key: "student-strength",
      title: "Student Strength",
      value: overview.studentStrength || "—",
      icon: "👥",
      bg: "#f0f9ff",
      color: "#0284c7"
    },
    {
      key: "pass-percentage",
      title: "Pass Percentage",
      value: overview.passPercentage ? `${overview.passPercentage}%` : "—",
      icon: "%",
      bg: "#f0fdfa",
      color: "#0d9488"
    },
    {
      key: "toppers",
      title: "Toppers Identified",
      value: overview.toppersIdentified || "—",
      icon: "🏆",
      bg: "#fefce8",
      color: "#ca8a04"
    }
  ];

  return (
    <div className="reports-container">
      {/* Breadcrumbs */}
      <div className="reports-breadcrumb">
        Home <span>&gt;</span> Administration <span>&gt;</span> Reports &amp; Analytics
      </div>

      {/* Page Title */}
      <h1 className="reports-header-title">Reports &amp; Analytics</h1>
      <p className="reports-header-subtitle">
        Institution-wide insights across academics, fees and attendance.
      </p>

      {/* Pill Tab Switcher */}
      <div className="reports-tab-nav">
        <button
          className={`reports-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => handleTabSwitch("reports")}
        >
          Reports &amp; Analytics
        </button>
        <button
          className={`reports-tab-btn ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => handleTabSwitch("audit")}
        >
          Audit Logs
        </button>
      </div>

      {/* Filters Container */}
      <div className="reports-filter-card">
        <div className="reports-filter-grid">
          {/* Board */}
          <div className="reports-filter-group">
            <label className="reports-filter-label">
              Board <span className="required">*</span>
            </label>
            <select
              className="reports-filter-select"
              value={filters.boardId}
              onChange={(e) => handleFilterChange("boardId", e.target.value)}
            >
              <option value="">Select Board</option>
              {boards.map((b) => (
                <option key={b.id || b.boardId} value={b.id || b.boardId}>
                  {b.name || b.boardName}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div className="reports-filter-group">
            <label className="reports-filter-label">
              Academic Year <span className="required">*</span>
            </label>
            <select
              className="reports-filter-select"
              value={filters.academicYearId}
              onChange={(e) => handleFilterChange("academicYearId", e.target.value)}
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((y) => (
                <option key={y.id || y.academicYearId} value={y.id || y.academicYearId}>
                  {y.name || y.academicYearName}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Level */}
          <div className="reports-filter-group">
            <label className="reports-filter-label">
              Academic Level <span className="required">*</span>
            </label>
            <select
              className="reports-filter-select"
              value={filters.academicLevelId}
              onChange={(e) => handleFilterChange("academicLevelId", e.target.value)}
            >
              <option value="">Select Academic Level</option>
              {academicLevels.map((l) => (
                <option key={l.id || l.academicLevelId} value={l.id || l.academicLevelId}>
                  {l.name || l.levelName}
                </option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="reports-filter-group">
            <label className="reports-filter-label">
              Group <span className="required">*</span>
            </label>
            <select
              className="reports-filter-select"
              value={filters.groupId}
              onChange={(e) => handleFilterChange("groupId", e.target.value)}
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id || g.groupId} value={g.id || g.groupId}>
                  {g.name || g.groupName}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="reports-filter-group">
            <label className="reports-filter-label">
              Section <span className="required">*</span>
            </label>
            <select
              className="reports-filter-select"
              value={filters.sectionId}
              onChange={(e) => handleFilterChange("sectionId", e.target.value)}
            >
              <option value="">Select Section</option>
              {sections.map((s) => (
                <option key={s.id || s.sectionId} value={s.id || s.sectionId}>
                  {s.name || s.sectionName}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="reports-filter-group">
            <label className="reports-filter-label">
              From Date <span className="required">*</span>
            </label>
            <input
              type="date"
              className="reports-filter-input"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange("fromDate", e.target.value)}
            />
          </div>

          {/* To Date */}
          <div className="reports-filter-group">
            <label className="reports-filter-label">
              To Date <span className="required">*</span>
            </label>
            <input
              type="date"
              className="reports-filter-input"
              value={filters.toDate}
              onChange={(e) => handleFilterChange("toDate", e.target.value)}
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="reports-filter-actions">
          <button className="btn-generate" onClick={handleGenerateReport}>
            Generate Report
          </button>
          <button className="btn-reset" onClick={handleResetFilters}>
            Reset
          </button>
        </div>
      </div>

      {/* Main Tab View: Reports & Analytics */}
      {activeTab === "reports" && (
        <div className="reports-overview-section">
          {/* Section Heading */}
          <div className="overview-title-row">
            <h2 className="overview-heading">Reports Overview</h2>
            <p className="overview-subtext">Key institution-wide report metrics</p>
          </div>

          {/* 10 Overview Cards Grid */}
          <div className="reports-cards-grid">
            {metricCards.map((card) => {
              const isSelected = selectedMetric === card.key;
              const hasData = card.value !== "—" && card.value !== 0 && card.value !== "0";

              return (
                <div
                  key={card.key}
                  className={`report-metric-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleMetricCardClick(card.key)}
                >
                  <div className="card-top">
                    <div
                      className="card-icon-box"
                      style={{ backgroundColor: card.bg, color: card.color }}
                    >
                      {card.icon}
                    </div>
                    <div className="card-info">
                      <span className="card-label">{card.title}</span>
                      <span className="card-value">{card.value}</span>
                    </div>
                  </div>

                  <div className="card-bottom">
                    <span className="details-tag">Details</span>
                    <span className={`details-status ${hasData ? "" : "no-data"}`}>
                      {hasData ? "View details →" : "No backend data generated yet"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Data Table View */}
          <div className="detailed-report-container">
            <div className="details-header-row">
              <div className="details-title-group">
                <h3>
                  {metricCards.find((c) => c.key === selectedMetric)?.title || "Report"} Detailed View
                </h3>
                <p>Granular records and metrics for the selected category</p>
              </div>

              <div className="details-actions">
                <button className="btn-export-pdf" onClick={() => handleExport("pdf")}>
                  📄 Export PDF
                </button>
                <button className="btn-export-excel" onClick={() => handleExport("excel")}>
                  📊 Export Excel
                </button>
              </div>
            </div>

            {detailsLoading ? (
              <div className="reports-loading">
                <div className="spinner"></div>
                <p>Loading detailed records...</p>
              </div>
            ) : detailData.length === 0 ? (
              <div className="reports-empty">
                <p>No detail records found for current filters.</p>
              </div>
            ) : (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      {selectedMetric === "admissions" && (
                        <>
                          <th>Admission No</th>
                          <th>Student Name</th>
                          <th>Board</th>
                          <th>Group</th>
                          <th>Section</th>
                          <th>Admission Date</th>
                          <th>Status</th>
                        </>
                      )}
                      {selectedMetric === "attendance" && (
                        <>
                          <th>Date</th>
                          <th>Present</th>
                          <th>Absent</th>
                          <th>Late</th>
                          <th>Leave</th>
                          <th>Attendance %</th>
                        </>
                      )}
                      {selectedMetric === "fee-collection" && (
                        <>
                          <th>Student Name</th>
                          <th>Admission No</th>
                          <th>Paid Amount</th>
                          <th>Payment Date</th>
                          <th>Mode</th>
                          <th>Status</th>
                        </>
                      )}
                      {selectedMetric === "due-fees" && (
                        <>
                          <th>Admission No</th>
                          <th>Student Name</th>
                          <th>Total Fee</th>
                          <th>Paid Amount</th>
                          <th>Due Amount</th>
                          <th>Status</th>
                        </>
                      )}
                      {selectedMetric === "examinations" && (
                        <>
                          <th>Exam Name</th>
                          <th>Academic Year</th>
                          <th>Group</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Total Results</th>
                          <th>Status</th>
                        </>
                      )}
                      {selectedMetric === "results" && (
                        <>
                          <th>Student Name</th>
                          <th>Subject</th>
                          <th>Marks</th>
                          <th>Grade</th>
                          <th>Result</th>
                          <th>Published Date</th>
                        </>
                      )}
                      {selectedMetric === "faculty-workload" && (
                        <>
                          <th>Staff Member Name</th>
                          <th>Employee ID</th>
                          <th>Period Count</th>
                          <th>Hours / Week</th>
                        </>
                      )}
                      {selectedMetric === "student-strength" && (
                        <>
                          <th>Group</th>
                          <th>Section</th>
                          <th>Male</th>
                          <th>Female</th>
                          <th>Total Strength</th>
                        </>
                      )}
                      {selectedMetric === "pass-percentage" && (
                        <>
                          <th>Exam Name</th>
                          <th>Passed Students</th>
                          <th>Failed Students</th>
                          <th>Pass Percentage</th>
                        </>
                      )}
                      {selectedMetric === "toppers" && (
                        <>
                          <th>Rank</th>
                          <th>Student Name</th>
                          <th>Roll No</th>
                          <th>Group</th>
                          <th>Section</th>
                          <th>Total Marks</th>
                          <th>Percentage</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.map((row, idx) => (
                      <tr key={idx}>
                        {selectedMetric === "admissions" && (
                          <>
                            <td>{row.admissionNo || `ADM-${row.studentId || idx + 1}`}</td>
                            <td><strong>{row.studentName || row.name || "—"}</strong></td>
                            <td>{row.board || "—"}</td>
                            <td>{row.groupName || row.group || "—"}</td>
                            <td>{row.sectionName || row.section || "—"}</td>
                            <td>{row.admissionDate ? new Date(row.admissionDate).toLocaleDateString() : "—"}</td>
                            <td>
                              <span className={`badge ${row.isApproved ? "badge-success" : row.isRejected ? "badge-danger" : "badge-warning"}`}>
                                {row.isApproved ? "Approved" : row.isRejected ? "Rejected" : "Pending"}
                              </span>
                            </td>
                          </>
                        )}
                        {selectedMetric === "attendance" && (
                          <>
                            <td>{row.period || row.attendanceDate ? new Date(row.attendanceDate || row.period).toLocaleDateString() : `Day ${idx + 1}`}</td>
                            <td><span className="badge badge-success">{row.present || 0}</span></td>
                            <td><span className="badge badge-danger">{row.absent || 0}</span></td>
                            <td><span className="badge badge-warning">{row.late || 0}</span></td>
                            <td><span className="badge badge-info">{row.leave || 0}</span></td>
                            <td><strong>{row.attendancePercentage || 0}%</strong></td>
                          </>
                        )}
                        {selectedMetric === "fee-collection" && (
                          <>
                            <td><strong>{row.studentName || "—"}</strong></td>
                            <td>{row.admissionNo || "—"}</td>
                            <td><strong>₹{(row.paidAmount || row.collected || 0).toLocaleString()}</strong></td>
                            <td>{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : "—"}</td>
                            <td>{row.paymentMode || "Online"}</td>
                            <td><span className="badge badge-success">Collected</span></td>
                          </>
                        )}
                        {selectedMetric === "due-fees" && (
                          <>
                            <td>{row.admissionNo || "—"}</td>
                            <td><strong>{row.studentName || "—"}</strong></td>
                            <td>₹{(row.totalAmount || 0).toLocaleString()}</td>
                            <td>₹{(row.paidAmount || 0).toLocaleString()}</td>
                            <td style={{ color: "#dc2626", fontWeight: "bold" }}>₹{(row.dueAmount || 0).toLocaleString()}</td>
                            <td><span className="badge badge-danger">{row.feeStatus || "Due"}</span></td>
                          </>
                        )}
                        {selectedMetric === "examinations" && (
                          <>
                            <td><strong>{row.examName || "—"}</strong></td>
                            <td>{row.academicYear || "—"}</td>
                            <td>{row.groupName || "—"}</td>
                            <td>{row.startDate ? new Date(row.startDate).toLocaleDateString() : "—"}</td>
                            <td>{row.endDate ? new Date(row.endDate).toLocaleDateString() : "—"}</td>
                            <td>{row.resultCount || row.totalResults || 0}</td>
                            <td><span className="badge badge-success">Active</span></td>
                          </>
                        )}
                        {selectedMetric === "results" && (
                          <>
                            <td><strong>{row.studentName || "—"}</strong></td>
                            <td>{row.subjectName || "—"}</td>
                            <td>{row.totalMarks || 0}</td>
                            <td><span className="badge badge-info">{row.grade || "A"}</span></td>
                            <td>
                              <span className={`badge ${row.resultStatus?.toUpperCase() === "PASS" || row.resultStatus?.toUpperCase() === "PASSED" ? "badge-success" : "badge-danger"}`}>
                                {row.resultStatus || "Pass"}
                              </span>
                            </td>
                            <td>{row.publishedDate ? new Date(row.publishedDate).toLocaleDateString() : "—"}</td>
                          </>
                        )}
                        {selectedMetric === "faculty-workload" && (
                          <>
                            <td><strong>{row.facultyName || "—"}</strong></td>
                            <td>{row.facultyEmployeeId || `EMP-${row.facultyId || idx + 1}`}</td>
                            <td>{row.periodCount || row.periods || 0}</td>
                            <td><strong>{row.hoursPerWeek || row.hours || 0} hrs</strong></td>
                          </>
                        )}
                        {selectedMetric === "student-strength" && (
                          <>
                            <td><strong>{row.groupName || "—"}</strong></td>
                            <td>{row.sectionName || "—"}</td>
                            <td>{row.maleStudents || row.male || 0}</td>
                            <td>{row.femaleStudents || row.female || 0}</td>
                            <td><strong>{row.totalStudents || row.studentCount || 0}</strong></td>
                          </>
                        )}
                        {selectedMetric === "pass-percentage" && (
                          <>
                            <td><strong>{row.examName || "—"}</strong></td>
                            <td><span className="badge badge-success">{row.passed || row.passedStudents || 0}</span></td>
                            <td><span className="badge badge-danger">{row.failed || row.failedStudents || 0}</span></td>
                            <td><strong>{row.passPercentage || 0}%</strong></td>
                          </>
                        )}
                        {selectedMetric === "toppers" && (
                          <>
                            <td><span className="badge-rank">#{row.rank || idx + 1} 🏆</span></td>
                            <td><strong>{row.studentName || "—"}</strong></td>
                            <td>{row.rollNo || "—"}</td>
                            <td>{row.groupName || "—"}</td>
                            <td>{row.sectionName || "—"}</td>
                            <td>{row.totalMarks || 0}</td>
                            <td style={{ color: "#15803d", fontWeight: "bold" }}>{row.percentage || 0}%</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Tab View: Audit Logs */}
      {activeTab === "audit" && (
        <div className="detailed-report-container">
          <div className="details-header-row">
            <div className="details-title-group">
              <h3>Institution Audit Logs</h3>
              <p>Chronological audit trail of administrative and operational actions</p>
            </div>

            <div className="details-actions">
              <button className="btn-export-excel" onClick={() => handleExport("excel")}>
                📊 Export Audit Logs
              </button>
            </div>
          </div>

          {loading ? (
            <div className="reports-loading">
              <div className="spinner"></div>
              <p>Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="reports-empty">
              <p>No audit log events found for current date range.</p>
            </div>
          ) : (
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={log.auditLogId || idx}>
                      <td>#{log.auditLogId || idx + 1}</td>
                      <td><strong>{log.userName || "System"}</strong></td>
                      <td>
                        <span className={`badge ${log.action === "INSERT" || log.action === "CREATE" ? "badge-success" : log.action === "DELETE" ? "badge-danger" : "badge-info"}`}>
                          {log.action || "INFO"}
                        </span>
                      </td>
                      <td>{log.entityName || "General"}</td>
                      <td>{log.description || "—"}</td>
                      <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
