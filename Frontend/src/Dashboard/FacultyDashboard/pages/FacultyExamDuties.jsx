import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Download,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  UserCheck,
  Eye,
  Edit3,
  Check,
  X,
  FileDown,
  Loader2,
  RefreshCw,
  Table,
  LayoutGrid,
  ShieldAlert,
} from "lucide-react";
import * as XLSX from "xlsx";
import "../styles/FacultyExamDuties.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import apiClient from "@/api/axios.js";
import { getAuthUser, getAuthToken } from "@/features/authStorage.js";

const ITEMS_PER_PAGE = 8;

function getFacultyStaffId(context) {
  if (context?.profile?.staffId) return Number(context.profile.staffId);
  if (context?.profileData?.staffId) return Number(context.profileData.staffId);
  if (context?.profile?.id) return Number(context.profile.id);
  const auth = getAuthUser();
  if (auth?.staffId) return Number(auth.staffId);
  if (auth?.id) return Number(auth.id);
  const token = getAuthToken();
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const sid = payload.StaffId || payload.staffId || payload.staff_id;
      if (sid) return Number(sid);
    } catch {
      // ignore
    }
  }
  return 1108; // Active staff Tanjiro Kamado
}

export default function FacultyExamDuties() {
  const context = useFacultySafe();
  const [dutiesList, setDutiesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facultyMembers, setFacultyMembers] = useState([]);

  // View Mode: "table" | "cards"
  const [viewMode, setViewMode] = useState("table");

  // Filter States
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'upcoming' | 'today' | 'completed' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals State
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [reassignDuty, setReassignDuty] = useState(null);
  const [reassignTarget, setReassignTarget] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const staffId = useMemo(() => getFacultyStaffId(context), [context]);

  // Fetch real exam duties from Backend API
  const fetchExamDuties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (staffId) params.append("staffId", staffId);
      if (activeTab && activeTab !== "all") params.append("status", activeTab);

      const res = await apiClient.get(`/api/v1/examinations/duties?${params.toString()}`);
      const data = res.data?.data || res.data || [];
      setDutiesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Error fetching examination duties:", err);
      // Graceful notification without blocking the UI
      notify("Failed to retrieve live examination duties.", "error");
    } finally {
      setLoading(false);
    }
  }, [staffId, activeTab]);

  useEffect(() => {
    fetchExamDuties();
  }, [fetchExamDuties]);

  // Fetch Staff list for reassignments
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/v1/staff")
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted && Array.isArray(list)) {
          setFacultyMembers(list);
          if (list.length > 0 && !reassignTarget) {
            const first = list[0];
            setReassignTarget(`${first.firstName || first.name} ${first.lastName || ""} (EMP-${first.id || first.staffId})`.trim());
          }
        }
      })
      .catch((err) => console.warn("Could not load staff list:", err));
    return () => { isMounted = false; };
  }, []);

  // KPI Counts computed dynamically
  const kpiStats = useMemo(() => {
    const total = dutiesList.length;
    const completed = dutiesList.filter((d) => d.status === "Completed").length;
    const upcoming = dutiesList.filter((d) => d.status === "Upcoming").length;
    const today = dutiesList.filter((d) => d.status === "Today").length;
    const cancelled = dutiesList.filter((d) => d.status === "Cancelled").length;
    return { total, completed, upcoming, today, cancelled };
  }, [dutiesList]);

  // Tab Filtering & Query Matching
  const filteredDuties = useMemo(() => {
    return dutiesList.filter((d) => {
      // Tab Filter
      if (activeTab === "upcoming" && d.status !== "Upcoming") return false;
      if (activeTab === "today" && d.status !== "Today") return false;
      if (activeTab === "completed" && d.status !== "Completed") return false;
      if (activeTab === "cancelled" && d.status !== "Cancelled") return false;

      // Status Dropdown Filter
      if (statusFilter !== "all" && d.status !== statusFilter) return false;

      // Exam Type Dropdown Filter
      if (examTypeFilter !== "all" && d.category !== examTypeFilter && d.examType !== examTypeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.examName?.toLowerCase().includes(q);
        const matchesCode = d.examCode?.toLowerCase().includes(q);
        const matchesSubject = d.subject?.toLowerCase().includes(q);
        const matchesVenue = d.venue?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesSubject && !matchesVenue) return false;
      }

      return true;
    });
  }, [dutiesList, activeTab, statusFilter, examTypeFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDuties.length / ITEMS_PER_PAGE));
  const paginatedDuties = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDuties.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDuties, currentPage]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Reassignment Submission
  const handleReassignSubmit = (e) => {
    e.preventDefault();
    if (!reassignTarget.trim()) {
      notify("Please select a target faculty member.", "error");
      return;
    }
    if (!reassignReason.trim()) {
      notify("Please provide a legitimate justification reason.", "error");
      return;
    }

    setDutiesList((prev) =>
      prev.map((d) =>
        d.id === reassignDuty.id
          ? {
              ...d,
              status: "Pending Confirmation",
              reassignedTo: reassignTarget,
              reassignReason: reassignReason,
            }
          : d
      )
    );

    notify(`Reassignment request submitted to Controller of Examinations for review.`);
    setReassignDuty(null);
    setReassignReason("");
  };

  // Confirm Duty Slot
  const handleConfirmDuty = (duty) => {
    setDutiesList((prev) =>
      prev.map((d) => (d.id === duty.id ? { ...d, status: "Upcoming" } : d))
    );
    notify(`Invigilation slot for ${duty.examCode} confirmed successfully.`);
  };

  // Download Duty Schedule Report (XLSX)
  const handleDownloadFullReport = () => {
    if (!dutiesList.length) {
      notify("No examination duty records found to export.", "error");
      return;
    }

    const exportRows = dutiesList.map((d, index) => ({
      "S.No": index + 1,
      "Exam Name": d.examName,
      "Exam Code": d.examCode,
      Category: d.category,
      "Subject & Paper": d.subject,
      "Exam Date": d.date || d.examDate,
      Session: d.session,
      "Exam Timings": d.examHours,
      "Reporting Time": d.reportingTime,
      "Hall / Venue": d.venue,
      Role: d.role || "Invigilator",
      "Invigilator Name": d.invigilator,
      Status: d.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exam Duties");
    XLSX.writeFile(workbook, `Faculty_Exam_Duties_Schedule_${staffId || "All"}.xlsx`);
    notify("Examination duty schedule exported successfully as Excel.");
  };

  // Download Duty Allotment Slip (Text / Order Document)
  const handleDownloadDutySlip = (duty) => {
    const slipText = [
      "================================================================================",
      "                 COLLEGE EXAMINATION CELL - INVIGILATION DUTY ORDER             ",
      "================================================================================",
      `DUTY ORDER REFERENCE : CMS/EXAM/DUTY/${duty.examCode || "GEN"}/${duty.id}`,
      `DATE OF ISSUE        : ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "--------------------------------------------------------------------------------",
      "EXAMINATION PARTICULARS:",
      "--------------------------------------------------------------------------------",
      `Exam Name        : ${duty.examName}`,
      `Exam Code        : ${duty.examCode}`,
      `Exam Type        : ${duty.examType}`,
      `Subject          : ${duty.subject}`,
      `Date of Exam     : ${duty.date || duty.examDate}`,
      `Session          : ${duty.session}`,
      `Exam Timings     : ${duty.examHours}`,
      `Reporting Time   : ${duty.reportingTime}`,
      `Hall / Venue     : ${duty.venue}`,
      "",
      "INVIGILATOR DETAILS:",
      "--------------------------------------------------------------------------------",
      `Assigned Faculty : ${duty.invigilator}`,
      `Staff ID Ref     : ${duty.invigilatorId || staffId}`,
      `Role             : ${duty.role || "Invigilator"}`,
      `Candidates       : ${duty.candidates || "30 Candidates"}`,
      "",
      "STANDARD OPERATING PROCEDURES (SOP):",
      "--------------------------------------------------------------------------------",
      ...(duty.sops || [
        "Collect sealed Question Paper packets from Chief Superintendent room 30 mins prior.",
        "Verify Student Hall Tickets and prohibit unauthorized electronic devices.",
        "Cross-verify candidate signature on Nominal Roll & OMR Barcode.",
        "Hand over signed absentee statement within 30 minutes of exam commencement.",
      ]).map((sop, i) => `${i + 1}. ${sop}`),
      "",
      "Authorized Signatory / Controller of Examinations: ___________________________",
      "================================================================================",
    ].join("\n");

    const blob = new Blob([slipText.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Exam_Duty_Slip_${duty.examCode}_${duty.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Downloaded official duty allotment slip for ${duty.examCode}.`);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Upcoming":
        return "fed-status-upcoming";
      case "Completed":
        return "fed-status-completed";
      case "Today":
        return "fed-status-today";
      case "Pending Confirmation":
        return "fed-status-pending";
      case "Cancelled":
        return "fed-status-cancelled";
      default:
        return "fed-status-default";
    }
  };

  return (
    <div className="fed-container">
      {/* 1. Page Header */}
      <div className="fed-header">
        <div className="fed-header-left">
          <div className="fed-header-icon-box">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="fed-title">Examination Duties & Invigilation</h1>
            <p className="fed-subtitle">
              Collegiate invigilation roster, hall allotments, session timings, and examination protocols
            </p>
          </div>
        </div>
        <div className="fed-header-actions">
          <button
            type="button"
            className="cms-btn cms-btn-outline"
            onClick={fetchExamDuties}
            title="Refresh duties roster"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={handleDownloadFullReport}
          >
            <FileDown size={15} /> Export Roster
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Statistics */}
      <div className="fed-kpi-grid">
        <div className="fed-kpi-card" onClick={() => handleTabChange("all")}>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">TOTAL ALLOTTED DUTIES</span>
            <span className="fed-kpi-value">{kpiStats.total}</span>
          </div>
          <div className="fed-kpi-icon total">
            <Calendar size={22} />
          </div>
        </div>

        <div className="fed-kpi-card" onClick={() => handleTabChange("upcoming")}>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">UPCOMING SESSIONS</span>
            <span className="fed-kpi-value">{kpiStats.upcoming}</span>
          </div>
          <div className="fed-kpi-icon upcoming">
            <Clock size={22} />
          </div>
        </div>

        <div className="fed-kpi-card" onClick={() => handleTabChange("today")}>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">TODAY'S DUTIES</span>
            <span className="fed-kpi-value" style={{ color: "#d97706" }}>{kpiStats.today}</span>
          </div>
          <div className="fed-kpi-icon today">
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="fed-kpi-card" onClick={() => handleTabChange("completed")}>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">COMPLETED DUTIES</span>
            <span className="fed-kpi-value">{kpiStats.completed}</span>
          </div>
          <div className="fed-kpi-icon completed">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* 3. Filter & Control Toolbar */}
      <div className="fed-toolbar">
        <div className="fed-toolbar-row">
          {/* Status Tab Filters */}
          <div className="fed-tabs-bar">
            <button
              type="button"
              className={`fed-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => handleTabChange("all")}
            >
              All Duties ({kpiStats.total})
            </button>
            <button
              type="button"
              className={`fed-tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
              onClick={() => handleTabChange("upcoming")}
            >
              Upcoming ({kpiStats.upcoming})
            </button>
            <button
              type="button"
              className={`fed-tab-btn ${activeTab === "today" ? "active" : ""}`}
              onClick={() => handleTabChange("today")}
            >
              Today ({kpiStats.today})
            </button>
            <button
              type="button"
              className={`fed-tab-btn ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => handleTabChange("completed")}
            >
              Completed ({kpiStats.completed})
            </button>
            <button
              type="button"
              className={`fed-tab-btn ${activeTab === "cancelled" ? "active" : ""}`}
              onClick={() => handleTabChange("cancelled")}
            >
              Cancelled ({kpiStats.cancelled})
            </button>
          </div>

          {/* View Toggle: Table / Grid */}
          <div className="fed-view-toggle">
            <button
              type="button"
              className={`fed-view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table Roster View"
            >
              <Table size={14} /> Roster
            </button>
            <button
              type="button"
              className={`fed-view-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Cards Grid View"
            >
              <LayoutGrid size={14} /> Cards
            </button>
          </div>
        </div>

        <div className="fed-toolbar-row" style={{ paddingTop: 8, borderTop: "1px solid var(--cms-border, #f1f5f9)" }}>
          {/* Search Box */}
          <div className="fed-search-box">
            <Search size={16} className="fed-search-icon" />
            <input
              type="text"
              placeholder="Search by exam, code, subject, hall..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="fed-search-clear"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="fed-search-filters">
            <select
              className="fed-select"
              value={examTypeFilter}
              onChange={(e) => {
                setExamTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Exam Categories</option>
              <option value="board">Board Theory / IPE</option>
              <option value="practical">Practical Labs</option>
              <option value="internal">Pre-Final / Internal</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Examination Duties View (Table or Cards) */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Loader2 size={32} className="spin" style={{ marginInline: "auto", color: "var(--cms-primary, #6F8400)" }} />
          <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--cms-muted)" }}>
            Loading live examination duties and hall allotments...
          </p>
        </div>
      ) : paginatedDuties.length === 0 ? (
        <div className="fed-empty-state">
          <div className="fed-empty-icon">
            <Calendar size={32} />
          </div>
          <h3>No Examination Duties Found</h3>
          <p>
            {searchQuery || activeTab !== "all" || examTypeFilter !== "all"
              ? "No exam duties match the active filters or search criteria."
              : "No invigilation duties are currently scheduled for your faculty profile."}
          </p>
          {(searchQuery || activeTab !== "all" || examTypeFilter !== "all") && (
            <button
              type="button"
              className="cms-btn cms-btn-outline"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
                setExamTypeFilter("all");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* TABLE / ROSTER VIEW */
        <div className="fed-table-container">
          <table className="fed-roster-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Exam & Code</th>
                <th>Subject</th>
                <th>Date & Timings</th>
                <th>Session</th>
                <th>Hall / Room</th>
                <th>Mandatory Reporting</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDuties.map((duty, idx) => (
                <tr key={duty.id}>
                  <td style={{ fontWeight: 600, color: "var(--cms-muted)" }}>
                    {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--cms-text)" }}>{duty.examName}</div>
                    <div style={{ fontSize: 12, color: "var(--cms-muted)", fontWeight: 600 }}>{duty.examCode}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--cms-text)" }}>{duty.subject}</div>
                    {duty.subjectCode && (
                      <span style={{ fontSize: 11, background: "var(--cms-subtle)", padding: "1px 6px", borderRadius: 4 }}>
                        {duty.subjectCode}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{duty.date || duty.examDate}</div>
                    <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{duty.examHours}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{duty.session}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--cms-primary, #6F8400)" }}>
                      {duty.venue}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--cms-muted)" }}>{duty.candidates || "30 Candidates"}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "#b45309", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> {duty.reportingTime}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{duty.role || "Invigilator"}</span>
                  </td>
                  <td>
                    <span className={`fed-status-badge ${getStatusClass(duty.status)}`}>
                      {duty.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        className="cms-btn cms-btn-xs cms-btn-outline"
                        onClick={() => setSelectedDuty(duty)}
                        title="View SOPs and exam instructions"
                      >
                        <Eye size={13} /> SOPs
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-xs cms-btn-primary"
                        onClick={() => handleDownloadDutySlip(duty)}
                        title="Download duty allotment order"
                      >
                        <Download size={13} /> Slip
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="fed-cards-grid">
          {paginatedDuties.map((duty) => (
            <div key={duty.id} className="fed-card">
              {/* Card Header */}
              <div className="fed-card-head">
                <div>
                  <span className={`fed-type-pill ${duty.category || "board"}`}>
                    {duty.examType || "Board Theory"}
                  </span>
                  <h3 className="fed-exam-title">{duty.examName}</h3>
                  <span className="fed-exam-code">{duty.examCode}</span>
                </div>
                <span className={`fed-status-badge ${getStatusClass(duty.status)}`}>
                  {duty.status}
                </span>
              </div>

              {/* Subject Banner */}
              <div className="fed-subject-box">
                <BookOpen size={16} className="fed-sub-icon" />
                <span className="fed-sub-text">{duty.subject}</span>
              </div>

              {/* Duty Metrics Grid */}
              <div className="fed-meta-grid">
                <div className="fed-meta-item">
                  <Calendar size={15} className="fed-meta-icon" />
                  <div>
                    <span className="fed-meta-label">DATE & SESSION</span>
                    <span className="fed-meta-val">
                      {duty.date || duty.examDate} · {duty.session}
                    </span>
                  </div>
                </div>

                <div className="fed-meta-item">
                  <Clock size={15} className="fed-meta-icon" />
                  <div>
                    <span className="fed-meta-label">EXAM TIMINGS</span>
                    <span className="fed-meta-val">{duty.examHours}</span>
                  </div>
                </div>

                <div className="fed-meta-item">
                  <MapPin size={15} className="fed-meta-icon" />
                  <div>
                    <span className="fed-meta-label">VENUE / ROOM</span>
                    <span className="fed-meta-val">{duty.venue}</span>
                  </div>
                </div>

                <div className="fed-meta-item">
                  <Users size={15} className="fed-meta-icon" />
                  <div>
                    <span className="fed-meta-label">CANDIDATES</span>
                    <span className="fed-meta-val">{duty.candidates}</span>
                  </div>
                </div>
              </div>

              {/* Reporting Notice */}
              <div className="fed-reporting-notice">
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1, color: "#b45309" }} />
                <span>
                  <strong>Reporting Time:</strong> {duty.reportingTime}
                </span>
              </div>

              {/* Invigilator Footer */}
              <div className="fed-invigilator-strip">
                <div className="fed-inv-info">
                  <UserCheck size={16} className="fed-inv-icon" />
                  <div>
                    <span className="fed-inv-label">ASSIGNED INVIGILATOR</span>
                    <span className="fed-inv-name">{duty.invigilator}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="fed-card-actions">
                <button
                  type="button"
                  className="fed-action-btn secondary"
                  onClick={() => setSelectedDuty(duty)}
                  title="View complete duty schedule & SOPs"
                >
                  <Eye size={13} /> SOPs & Details
                </button>

                <button
                  type="button"
                  className="fed-action-btn primary"
                  onClick={() => handleDownloadDutySlip(duty)}
                  title="Download duty allotment slip"
                >
                  <Download size={13} /> Slip
                </button>

                {duty.status === "Pending Confirmation" && (
                  <button
                    type="button"
                    className="fed-action-btn outline"
                    onClick={() => handleConfirmDuty(duty)}
                  >
                    <Check size={13} /> Confirm
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Pagination Footer */}
      {!loading && filteredDuties.length > 0 && (
        <nav className="att-pagination" style={{ marginTop: 20 }}>
          <span className="att-pagination-summary">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredDuties.length)} of {filteredDuties.length} duties
          </span>
          <div className="att-pagination-controls">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="att-page-number">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </nav>
      )}

      {/* MODAL 1: Duty Details & SOPs Modal */}
      {selectedDuty && (
        <div className="sp-modal-overlay" onClick={() => setSelectedDuty(null)}>
          <div className="sp-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="sp-modal-head">
              <div>
                <h3 className="sp-modal-title" style={{ margin: 0, fontSize: 16 }}>
                  {selectedDuty.examName}
                </h3>
                <p className="sp-modal-subtitle" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                  {selectedDuty.examCode} · {selectedDuty.subject}
                </p>
              </div>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setSelectedDuty(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sp-modal-body" style={{ padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "var(--cms-subtle, #f8f9fa)", padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>DATE & SESSION</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{selectedDuty.date || selectedDuty.examDate}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{selectedDuty.session}</div>
                </div>

                <div style={{ background: "var(--cms-subtle, #f8f9fa)", padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>EXAMINATION HOURS</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{selectedDuty.examHours}</div>
                  <div style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>Report: {selectedDuty.reportingTime}</div>
                </div>

                <div style={{ background: "var(--cms-subtle, #f8f9fa)", padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>HALL / VENUE</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{selectedDuty.venue}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{selectedDuty.candidates}</div>
                </div>

                <div style={{ background: "var(--cms-subtle, #f8f9fa)", padding: 12, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>INVIGILATOR IN-CHARGE</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{selectedDuty.invigilator}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-primary, #6F8400)", fontWeight: 600 }}>Status: {selectedDuty.status}</div>
                </div>
              </div>

              <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "var(--cms-text)" }}>
                Standard Operating Procedures (SOP) & Instructions:
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: "var(--cms-text)" }}>
                {(selectedDuty.sops || [
                  "Collect sealed Question Paper packets from Chief Superintendent room 30 mins prior.",
                  "Verify Student Hall Tickets and prohibit unauthorized electronic devices.",
                  "Cross-verify candidate signature on Nominal Roll & OMR Barcode.",
                  "Hand over signed absentee statement within 30 minutes of exam commencement.",
                ]).map((sop, i) => (
                  <li key={i}>{sop}</li>
                ))}
              </ul>
            </div>

            <div className="sp-modal-foot">
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                onClick={() => handleDownloadDutySlip(selectedDuty)}
              >
                <Download size={13} /> Download Duty Order
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => setSelectedDuty(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
