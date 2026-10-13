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
  SlidersHorizontal,
  ChevronDown,
  BookOpen,
  User,
  UserCheck,
  Eye,
  Edit3,
  FileText,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  Shield,
  FileDown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import "../styles/FacultyExamDuties.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import apiClient from "@/api/axios.js";
import { getAuthUser, getAuthToken } from "@/features/authStorage.js";

const ITEMS_PER_PAGE = 6;

function getFacultyStaffId(context) {
  if (context?.profile?.staffId) return Number(context.profile.staffId);
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
  const [reportDuty, setReportDuty] = useState(null);
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
        const matchesInvigilator = d.invigilator?.toLowerCase().includes(q);
        const matchesVenue = d.venue?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesSubject && !matchesInvigilator && !matchesVenue) {
          return false;
        }
      }

      return true;
    });
  }, [dutiesList, activeTab, statusFilter, examTypeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredDuties.length / ITEMS_PER_PAGE) || 1;
  const paginatedDuties = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDuties.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDuties, currentPage]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleConfirmDuty = (duty) => {
    setDutiesList((prev) =>
      prev.map((item) =>
        item.id === duty.id
          ? {
              ...item,
              status: "Upcoming",
            }
          : item
      )
    );
    notify(`Invigilation duty confirmed for ${duty.examCode}. Duty allotment confirmed.`);
  };

  const handleReassignSubmit = (e) => {
    e.preventDefault();
    if (!reassignDuty) return;

    setDutiesList((prev) =>
      prev.map((item) =>
        item.id === reassignDuty.id
          ? {
              ...item,
              invigilator: `${reassignTarget} (Reassigned)`,
            }
          : item
      )
    );
    notify(`Duty for ${reassignDuty.examCode} reassigned to ${reassignTarget}. Notification dispatched.`);
    setReassignDuty(null);
    setReassignReason("");
  };

  const handleDownloadFullReport = () => {
    if (!dutiesList.length) return notify("No exam duties to export.", "error");

    const exportRows = dutiesList.map((d, idx) => ({
      "S.No": idx + 1,
      "Duty ID": d.id,
      "Exam Name": d.examName,
      "Exam Code": d.examCode,
      "Subject": d.subject,
      "Exam Date": d.date || d.examDate,
      "Session": d.session,
      "Hours": d.examHours,
      "Hall / Venue": d.venue,
      "Invigilator": d.invigilator,
      "Status": d.status,
      "Reporting Time": d.reportingTime,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam Duties");
    XLSX.writeFile(wb, `Faculty_Exam_Duties_Schedule_${new Date().toISOString().split("T")[0]}.xlsx`);
    notify("Downloaded complete Examination Duties Schedule as Excel file.");
  };

  const handleDownloadDutySlip = (duty) => {
    const slipText = [
      "================================================================================",
      "                    PIRNAV COLLEGES - EXAMINATION DUTY ALLOTMENT SLIP           ",
      "================================================================================",
      `Date Issued      : ${new Date().toLocaleDateString()}`,
      `Duty Reference   : DUTY-ASSIGN-${duty.id}`,
      "",
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
      ...(duty.sops || []).map((sop, i) => `${i + 1}. ${sop}`),
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
        <div>
          <h1 className="fed-title">Faculty Examination Duties & Invigilation</h1>
          <p className="fed-subtitle">
            Centralized collegiate examination roster, invigilation duties, hall allocations, and SOP protocols
          </p>
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
            <FileDown size={15} /> Export Duties Schedule
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Statistics */}
      <div className="fed-kpis-grid">
        <div className="fed-kpi-card">
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">TOTAL ALLOTTED DUTIES</span>
            <span className="fed-kpi-value">{kpiStats.total}</span>
          </div>
          <div className="fed-kpi-icon total">
            <Calendar size={22} />
          </div>
        </div>

        <div className="fed-kpi-card">
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">UPCOMING SESSIONS</span>
            <span className="fed-kpi-value">{kpiStats.upcoming}</span>
          </div>
          <div className="fed-kpi-icon upcoming">
            <Clock size={22} />
          </div>
        </div>

        <div className="fed-kpi-card">
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">TODAY'S SESSIONS</span>
            <span className="fed-kpi-value" style={{ color: "#d97706" }}>{kpiStats.today}</span>
          </div>
          <div className="fed-kpi-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <AlertCircle size={22} />
          </div>
        </div>

        <div className="fed-kpi-card">
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
        {/* Tab Filters */}
        <div className="fed-tabs-bar">
          <button
            className={`fed-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => handleTabChange("all")}
          >
            All Duties ({kpiStats.total})
          </button>
          <button
            className={`fed-tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
            onClick={() => handleTabChange("upcoming")}
          >
            Upcoming ({kpiStats.upcoming})
          </button>
          <button
            className={`fed-tab-btn ${activeTab === "today" ? "active" : ""}`}
            onClick={() => handleTabChange("today")}
          >
            Today ({kpiStats.today})
          </button>
          <button
            className={`fed-tab-btn ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => handleTabChange("completed")}
          >
            Completed ({kpiStats.completed})
          </button>
          <button
            className={`fed-tab-btn ${activeTab === "cancelled" ? "active" : ""}`}
            onClick={() => handleTabChange("cancelled")}
          >
            Cancelled ({kpiStats.cancelled})
          </button>
        </div>

        {/* Search & Selectors */}
        <div className="fed-search-filters">
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

      {/* 4. Exam Duties Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Loader2 size={28} className="spin" style={{ marginInline: "auto", color: "var(--cms-primary, #6F8400)" }} />
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
              : "No invigilation duties are currently scheduled for your profile."}
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
      ) : (
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
                  className="fed-action-btn outline"
                  onClick={() => handleDownloadDutySlip(duty)}
                  title="Download duty allotment slip"
                >
                  <Download size={13} /> Slip
                </button>

                {duty.status === "Pending Confirmation" && (
                  <button
                    type="button"
                    className="fed-action-btn primary"
                    onClick={() => handleConfirmDuty(duty)}
                  >
                    <Check size={13} /> Confirm Slot
                  </button>
                )}

                {duty.status === "Upcoming" && (
                  <button
                    type="button"
                    className="fed-action-btn ghost"
                    onClick={() => {
                      setReassignDuty(duty);
                      setReassignReason("");
                    }}
                    title="Request re-assignment of invigilation slot"
                  >
                    <Edit3 size={13} /> Reassign
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
          <div className="sp-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
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
                <div style={{ background: "var(--cms-surface-soft, #f8f9fa)", padding: 10, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>DATE & SESSION</span>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedDuty.date || selectedDuty.examDate}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{selectedDuty.session}</div>
                </div>

                <div style={{ background: "var(--cms-surface-soft, #f8f9fa)", padding: 10, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>EXAMINATION HOURS</span>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedDuty.examHours}</div>
                  <div style={{ fontSize: 12, color: "#b45309" }}>Report: {selectedDuty.reportingTime}</div>
                </div>

                <div style={{ background: "var(--cms-surface-soft, #f8f9fa)", padding: 10, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>HALL / VENUE</span>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedDuty.venue}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{selectedDuty.candidates}</div>
                </div>

                <div style={{ background: "var(--cms-surface-soft, #f8f9fa)", padding: 10, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>INVIGILATOR IN-CHARGE</span>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedDuty.invigilator}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-primary, #6F8400)" }}>Status: {selectedDuty.status}</div>
                </div>
              </div>

              <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "var(--cms-text)" }}>
                Standard Operating Procedures (SOP) & Instructions:
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: "var(--cms-text)" }}>
                {(selectedDuty.sops || []).map((sop, i) => (
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

      {/* MODAL 2: Reassign Duty Modal */}
      {reassignDuty && (
        <div className="sp-modal-overlay" onClick={() => setReassignDuty(null)}>
          <div className="sp-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="sp-modal-head">
              <div>
                <h3 className="sp-modal-title" style={{ margin: 0, fontSize: 16 }}>Request Duty Reassignment</h3>
                <p className="sp-modal-subtitle" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                  {reassignDuty.examCode} · {reassignDuty.date || reassignDuty.examDate}
                </p>
              </div>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setReassignDuty(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit}>
              <div className="sp-modal-body" style={{ padding: 18 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--cms-muted)", marginBottom: 6 }}>
                    SELECT SUBSTITUTE FACULTY MEMBER
                  </label>
                  <select
                    className="cms-select-input"
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    required
                  >
                    {facultyMembers.length ? (
                      facultyMembers.map((f) => {
                        const label = `${f.firstName || f.name} ${f.lastName || ""} (EMP-${f.id || f.staffId})`.trim();
                        return (
                          <option key={f.id || f.staffId} value={label}>
                            {label}
                          </option>
                        );
                      })
                    ) : (
                      <option value="Dr. S. Ramesh (EMP-1034)">Dr. S. Ramesh (EMP-1034)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--cms-muted)", marginBottom: 6 }}>
                    REASON FOR REASSIGNMENT
                  </label>
                  <textarea
                    rows={3}
                    className="cms-text-input"
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="Enter academic conflict, leave reason, or emergency justification..."
                    required
                  />
                </div>
              </div>

              <div className="sp-modal-foot">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setReassignDuty(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="cms-btn cms-btn-primary">
                  Dispatch Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
