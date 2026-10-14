import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import "../styles/FacultyExamDuties.css";
import { useFacultySafe } from "../FacultyContext.jsx";

// Comprehensive mock exam duties conforming to BIEAP / Collegiate standards
const INITIAL_EXAM_DUTIES = [
  {
    id: 1,
    examName: "BIEAP IPE Board Theory Examination 2026",
    examCode: "BIEAP-IPE-2026",
    category: "board",
    examType: "Board Theory",
    role: "Invigilator",
    status: "Upcoming",
    subject: "Mathematics Paper I-A",
    date: "25 Sep 2026",
    session: "Morning Session",
    examHours: "09:00 AM – 12:00 PM",
    venue: "Physics Central Lab — Room 102",
    invigilator: "Dr. S. Ramesh (EMP-1034)",
    reportingTime: "08:15 AM (Mandatory 45 mins prior)",
    candidates: "30 Candidates (HT: 2601001 – 2601030)",
    totalEnrolled: 30,
    present: 30,
    absent: 0,
    sops: [
      "Collect sealed Question Paper packets from Chief Superintendent room.",
      "Verify Student Hall Tickets and prohibit unauthorized gadgets / smart watches.",
      "Cross-verify candidate signature on Nominal Roll & OMR Barcode.",
      "Hand over signed absentee statement within 30 minutes of start.",
    ],
  },
  {
    id: 2,
    examName: "BIEAP Intermediate Practical Examination 2026",
    examCode: "PRAC-PHY-2026",
    category: "practical",
    examType: "Practical Lab",
    role: "Invigilator",
    status: "Completed",
    subject: "Physics Practical Lab • Batch 01",
    date: "28 Sep 2026",
    session: "Morning Session",
    examHours: "09:00 AM – 12:00 PM",
    venue: "Physics Central Lab — Room 102",
    invigilator: "Prof. K. Srinivas (EMP-0652)",
    reportingTime: "08:30 AM",
    candidates: "25 Candidates",
    totalEnrolled: 25,
    present: 24,
    absent: 1,
    sops: [
      "Verify laboratory apparatus calibration and experiment chits.",
      "Conduct viva-voce and evaluate student lab records / observations.",
      "Enter practical marks directly on BIEAP Confidential portal.",
    ],
  },
  {
    id: 3,
    examName: "College Pre-Final Examination 2026",
    examCode: "PRE-FINAL-2026",
    category: "internal",
    examType: "Pre-Final / Internal",
    role: "Invigilator",
    status: "Today",
    subject: "MPC & BiPC Common Session",
    date: "02 Oct 2026",
    session: "Afternoon Session",
    examHours: "02:00 PM – 05:00 PM",
    venue: "Auditorium Hall A",
    invigilator: "Dr. L. Kavitha (EMP-0789)",
    reportingTime: "01:15 PM",
    candidates: "60 Students",
    totalEnrolled: 60,
    present: 58,
    absent: 2,
    sops: [
      "Oversee hall invigilators and manage extra main answer booklets.",
      "Maintain exam decorum and check for unauthorized paper slips.",
    ],
  },
  {
    id: 4,
    examName: "Unit Test II Central Evaluation Camp",
    examCode: "UT-II-EVAL",
    category: "internal",
    examType: "Central Evaluation Camp",
    role: "Invigilator",
    status: "Upcoming",
    subject: "Mathematics II-A (Calculus & Vectors)",
    date: "15 Sep 2026",
    session: "Full Day Evaluation Camp",
    examHours: "10:00 AM – 04:30 PM",
    venue: "Central Evaluation Cell — Room 305",
    invigilator: "Mr. P. Naveen (EMP-0921)",
    reportingTime: "09:45 AM",
    candidates: "90 Answer Scripts",
    totalEnrolled: 90,
    present: 90,
    absent: 0,
    sops: [
      "Follow scheme of valuation and sample answer keys strictly.",
      "Total marks re-verification before bundle closure.",
    ],
  },
  {
    id: 5,
    examName: "Semester End Examination 2026",
    examCode: "SEM-2026-04",
    category: "board",
    examType: "Board Theory",
    role: "Invigilator",
    status: "Pending Confirmation",
    subject: "Computer Networks",
    date: "10 Oct 2026",
    session: "Morning Session",
    examHours: "09:00 AM – 12:00 PM",
    venue: "Block B — Room 201",
    invigilator: "— (Awaiting Confirmation)",
    reportingTime: "08:15 AM",
    candidates: "45 Students",
    totalEnrolled: 45,
    present: 0,
    absent: 0,
    sops: [
      "Accept duty assignment on portal to confirm invigilation slot.",
      "Collect hall register and answer sheet bundles 30 mins before bell.",
    ],
  },
  {
    id: 6,
    examName: "Internal Assessment Test",
    examCode: "IAT-DS-2026",
    category: "internal",
    examType: "Pre-Final / Internal",
    role: "Invigilator",
    status: "Completed",
    subject: "Data Structures",
    date: "12 Sep 2026",
    session: "Forenoon Session",
    examHours: "10:00 AM – 11:30 AM",
    venue: "Computer Lab — Room 204",
    invigilator: "Mrs. S. Deepthi (EMP-0678)",
    reportingTime: "09:40 AM",
    candidates: "35 Students",
    totalEnrolled: 35,
    present: 35,
    absent: 0,
    sops: [
      "Ensure proper seating spacing and invigilate terminal access.",
      "Collect question papers and rough sheets after completion.",
    ],
  },
  {
    id: 7,
    examName: "BIEAP Chemistry Theory Examination 2026",
    examCode: "BIEAP-CHM-2026",
    category: "board",
    examType: "Board Theory",
    role: "Invigilator",
    status: "Upcoming",
    subject: "Chemistry Paper I",
    date: "18 Oct 2026",
    session: "Morning Session",
    examHours: "09:00 AM – 12:00 PM",
    venue: "Science Block — Hall 105",
    invigilator: "Dr. M. Varun (EMP-1102)",
    reportingTime: "08:15 AM",
    candidates: "32 Candidates",
    totalEnrolled: 32,
    present: 32,
    absent: 0,
    sops: [
      "Inspect chemical safety gear and verify hall ticket roll barcodes.",
      "Submit attendance sheet promptly to the exam cell.",
    ],
  },
  {
    id: 8,
    examName: "BIEAP English Paper I Theory Examination 2026",
    examCode: "BIEAP-ENG-2026",
    category: "board",
    examType: "Board Theory",
    role: "Invigilator",
    status: "Upcoming",
    subject: "English General",
    date: "22 Oct 2026",
    session: "Morning Session",
    examHours: "09:00 AM – 12:00 PM",
    venue: "Main Block — Hall 202",
    invigilator: "Dr. Ananya Rao (EMP-1042)",
    reportingTime: "08:15 AM",
    candidates: "28 Candidates",
    totalEnrolled: 28,
    present: 28,
    absent: 0,
    sops: [
      "Verify student handwriting sample and roll index on scripts.",
      "Prohibit leaving examination room in the first 60 minutes.",
    ],
  },
];

const ITEMS_PER_PAGE = 6;

const AVAILABLE_FACULTY = [
  "Dr. S. Ramesh (EMP-1034)",
  "Prof. K. Srinivas (EMP-0652)",
  "Dr. L. Kavitha (EMP-0789)",
  "Mr. P. Naveen (EMP-0921)",
  "Mrs. S. Deepthi (EMP-0678)",
  "Dr. M. Varun (EMP-1102)",
  "Dr. Ananya Rao (EMP-1042)",
];

export default function FacultyExamDuties() {
  const context = useFacultySafe();
  const [dutiesList, setDutiesList] = useState(INITIAL_EXAM_DUTIES);

  // Filter States
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'upcoming' | 'today' | 'completed' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals State
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [reassignDuty, setReassignDuty] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(AVAILABLE_FACULTY[0]);
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

  // KPI Counts computed dynamically
  const kpiStats = useMemo(() => {
    const total = dutiesList.length;
    const completed = dutiesList.filter((d) => d.status === "Completed").length;
    const upcoming = dutiesList.filter((d) => d.status === "Upcoming").length;
    const pending = dutiesList.filter((d) => d.status === "Pending Confirmation").length;
    return { total, completed, upcoming, pending };
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
      if (examTypeFilter !== "all" && d.examType !== examTypeFilter) return false;

      // Date Range Filter (simplified logic for demonstration)
      if (dateRangeFilter === "today" && d.status !== "Today") return false;
      if (dateRangeFilter === "upcoming" && d.status !== "Upcoming") return false;
      if (dateRangeFilter === "past" && d.status !== "Completed") return false;

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
  }, [dutiesList, activeTab, statusFilter, examTypeFilter, dateRangeFilter, searchQuery]);

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
              invigilator: "Dr. Ananya Rao (EMP-1042) [Confirmed]",
            }
          : item
      )
    );
    notify(`Invigilation duty confirmed for ${duty.examCode}. Duty allotment slip generated.`);
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
    notify(
      `Duty for ${reassignDuty.examCode} reassigned to ${reassignTarget}. Notification dispatched.`
    );
    setReassignDuty(null);
    setReassignReason("");
  };

  const handleDownloadFullReport = () => {
    notify("Downloading complete Examination Duties Schedule & Order Dossier (PDF)...");
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
        return "fed-status-upcoming";
    }
  };

  return (
    <div className="fed-container">
      {/* ---------------- Top Header ---------------- */}
      <header className="fed-header">
        <div className="fed-header-left">
          <div className="fed-header-icon-box">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="fed-title">Exam Duties</h1>
            <p className="fed-subtitle">
              View your assigned invigilation duties and examination responsibilities.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="fed-download-btn"
          onClick={handleDownloadFullReport}
          title="Export all invigilation duties as report"
        >
          <Download size={15} />
          <span>Download Duty Report</span>
        </button>
      </header>

      {/* ---------------- Category Filter Tabs (Pills) ---------------- */}
      <nav className="fed-tabs-row" aria-label="Duty Category Filter">
        {[
          { key: "all", label: "All Duties" },
          { key: "upcoming", label: "Upcoming" },
          { key: "today", label: "Today" },
          { key: "completed", label: "Completed" },
          { key: "cancelled", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`fed-tab-pill ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ---------------- 4 KPI Stat Cards ---------------- */}
      <section className="fed-kpi-grid" aria-label="Examination Duty Metrics">
        {/* Card 1: Total Duties */}
        <article
          className="fed-kpi-card fed-kpi-blue"
          onClick={() => handleTabChange("all")}
          title="Filter All Duties"
        >
          <div className="fed-kpi-icon-wrap">
            <Users size={20} />
          </div>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">Total Duties</span>
            <span className="fed-kpi-val">{kpiStats.total}</span>
            <span className="fed-kpi-subtext">Assigned invigilation duties</span>
          </div>
        </article>

        {/* Card 2: Completed */}
        <article
          className="fed-kpi-card fed-kpi-green"
          onClick={() => handleTabChange("completed")}
          title="Filter Completed Duties"
        >
          <div className="fed-kpi-icon-wrap">
            <CheckCircle2 size={20} />
          </div>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">Completed</span>
            <span className="fed-kpi-val">{kpiStats.completed}</span>
            <span className="fed-kpi-subtext">Duties completed</span>
          </div>
        </article>

        {/* Card 3: Upcoming */}
        <article
          className="fed-kpi-card fed-kpi-amber"
          onClick={() => handleTabChange("upcoming")}
          title="Filter Upcoming Duties"
        >
          <div className="fed-kpi-icon-wrap">
            <Clock size={20} />
          </div>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">Upcoming</span>
            <span className="fed-kpi-val">{kpiStats.upcoming}</span>
            <span className="fed-kpi-subtext">Duties upcoming</span>
          </div>
        </article>

        {/* Card 4: Pending Confirmation */}
        <article
          className="fed-kpi-card fed-kpi-red"
          onClick={() => {
            setStatusFilter("Pending Confirmation");
            setActiveTab("all");
            setCurrentPage(1);
          }}
          title="Filter Pending Confirmation"
        >
          <div className="fed-kpi-icon-wrap">
            <AlertCircle size={20} />
          </div>
          <div className="fed-kpi-info">
            <span className="fed-kpi-label">Pending Confirmation</span>
            <span className="fed-kpi-val">{kpiStats.pending}</span>
            <span className="fed-kpi-subtext">Awaiting confirmation</span>
          </div>
        </article>
      </section>

      {/* ---------------- Filter & Search Toolbar ---------------- */}
      <section className="fed-filters-row">
        {/* Search */}
        <div className="fed-search-wrap">
          <Search size={16} className="fed-search-icon" />
          <input
            type="text"
            className="fed-search-input"
            placeholder="Search by exam name, subject, invigilator..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Date Range Dropdown */}
        <div className="fed-select-group">
          <label className="fed-select-label">Date Range</label>
          <div className="fed-select-wrap">
            <select
              className="fed-select-input"
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="upcoming">Upcoming (30 Days)</option>
              <option value="past">Past Examination Dates</option>
            </select>
            <ChevronDown size={14} className="fed-select-caret" />
          </div>
        </div>

        {/* Exam Type Dropdown */}
        <div className="fed-select-group">
          <label className="fed-select-label">Exam Type</label>
          <div className="fed-select-wrap">
            <select
              className="fed-select-input"
              value={examTypeFilter}
              onChange={(e) => {
                setExamTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Types</option>
              <option value="Board Theory">Board Theory</option>
              <option value="Practical Lab">Practical Lab</option>
              <option value="Pre-Final / Internal">Pre-Final / Internal</option>
              <option value="Central Evaluation Camp">Evaluation Camp</option>
            </select>
            <ChevronDown size={14} className="fed-select-caret" />
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="fed-select-group">
          <label className="fed-select-label">Status</label>
          <div className="fed-select-wrap">
            <select
              className="fed-select-input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Today">Today</option>
              <option value="Completed">Completed</option>
              <option value="Pending Confirmation">Pending Confirmation</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDown size={14} className="fed-select-caret" />
          </div>
        </div>

        {/* Reset / Filters Button */}
        <button
          type="button"
          className="fed-filter-btn"
          onClick={() => {
            setSearchQuery("");
            setDateRangeFilter("all");
            setExamTypeFilter("all");
            setStatusFilter("all");
            setActiveTab("all");
            setCurrentPage(1);
          }}
          title="Reset all filters"
        >
          <SlidersHorizontal size={14} />
          <span>Filters</span>
        </button>
      </section>

      {/* ---------------- 3-Column Duty Cards Grid ---------------- */}
      {paginatedDuties.length === 0 ? (
        <div className="fed-empty-state">
          <div className="fed-empty-icon">
            <Calendar size={26} />
          </div>
          <h3 className="fed-empty-title">No Exam Duties Found</h3>
          <p className="fed-empty-desc">
            No invigilation records matched your current query or category filter. Try clearing filters
            or selecting "All Duties".
          </p>
          <button
            type="button"
            className="fed-download-btn"
            style={{ marginTop: 8 }}
            onClick={() => {
              setSearchQuery("");
              setDateRangeFilter("all");
              setExamTypeFilter("all");
              setStatusFilter("all");
              setActiveTab("all");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <section className="fed-cards-grid" aria-label="Duty Cards">
          {paginatedDuties.map((duty) => (
            <article key={duty.id} className="fed-card">
              <div>
                {/* Top Badges Row */}
                <div className="fed-card-top-row">
                  <span className="fed-role-badge">
                    <UserCheck size={12} />
                    <span>{duty.role}</span>
                  </span>
                  <span className={`fed-status-badge ${getStatusClass(duty.status)}`}>
                    <span className="fed-status-dot" />
                    <span>{duty.status}</span>
                  </span>
                </div>

                {/* Exam Title */}
                <h2 className="fed-card-title" title={duty.examName}>
                  {duty.examName}
                </h2>

                {/* Metadata Items */}
                <div className="fed-card-details">
                  <div className="fed-detail-item">
                    <BookOpen size={14} className="fed-detail-icon" />
                    <span className="fed-detail-text">
                      <strong>{duty.subject}</strong> • Code: {duty.examCode}
                    </span>
                  </div>

                  <div className="fed-detail-item">
                    <Calendar size={14} className="fed-detail-icon" />
                    <span className="fed-detail-text">
                      Date & Session: <strong>{duty.date}</strong> ({duty.session})
                    </span>
                  </div>

                  <div className="fed-detail-item">
                    <Clock size={14} className="fed-detail-icon" />
                    <span className="fed-detail-text">
                      Exam Hours: <strong>{duty.examHours}</strong>
                    </span>
                  </div>

                  <div className="fed-detail-item">
                    <MapPin size={14} className="fed-detail-icon" />
                    <span className="fed-detail-text">
                      Venue: <strong>{duty.venue}</strong>
                    </span>
                  </div>

                  <div className="fed-detail-item">
                    <User size={14} className="fed-detail-icon" />
                    <span className="fed-detail-text">
                      Invigilator:{" "}
                      {duty.invigilator.includes("Awaiting") ? (
                        <span className="fed-text-awaiting">{duty.invigilator}</span>
                      ) : (
                        <strong>{duty.invigilator}</strong>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <footer className="fed-card-actions">
                {duty.status === "Pending Confirmation" ? (
                  <>
                    <button
                      type="button"
                      className="fed-action-btn fed-action-btn-primary"
                      onClick={() => handleConfirmDuty(duty)}
                    >
                      <Check size={14} />
                      <span>Confirm Duty</span>
                    </button>
                    <button
                      type="button"
                      className="fed-action-btn fed-action-btn-outline"
                      onClick={() => setSelectedDuty(duty)}
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                  </>
                ) : duty.status === "Completed" ? (
                  <>
                    <button
                      type="button"
                      className="fed-action-btn fed-action-btn-outline"
                      onClick={() => setSelectedDuty(duty)}
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                    <button
                      type="button"
                      className="fed-action-btn fed-action-btn-outline"
                      onClick={() => setReportDuty(duty)}
                    >
                      <FileText size={13} />
                      <span>View Report</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="fed-action-btn fed-action-btn-outline"
                      onClick={() => setSelectedDuty(duty)}
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                    <button
                      type="button"
                      className="fed-action-btn fed-action-btn-outline"
                      onClick={() => setReassignDuty(duty)}
                    >
                      <Edit3 size={13} />
                      <span>Reassign</span>
                    </button>
                  </>
                )}
              </footer>
            </article>
          ))}
        </section>
      )}

      {/* ---------------- Pagination Footer ---------------- */}
      <footer className="fed-pagination-row">
        <span>
          Showing {paginatedDuties.length} of {filteredDuties.length} duties
        </span>
        <div className="fed-pagination-controls">
          <button
            type="button"
            className="fed-page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              type="button"
              className={`fed-page-btn ${currentPage === num ? "active" : ""}`}
              onClick={() => setCurrentPage(num)}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="fed-page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next Page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </footer>

      {/* ---------------- View Details Modal ---------------- */}
      {selectedDuty && (
        <div
          className="fed-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setSelectedDuty(null)}
        >
          <div className="fed-modal-card" role="dialog" aria-modal="true">
            <div className="fed-modal-head">
              <div>
                <h3>{selectedDuty.examName}</h3>
                <small style={{ color: "var(--cms-muted)", fontSize: 11 }}>
                  Exam Code: {selectedDuty.examCode} • Category: {selectedDuty.examType}
                </small>
              </div>
              <button
                type="button"
                className="fed-modal-close-btn"
                onClick={() => setSelectedDuty(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="fed-modal-body">
              <div className="fed-modal-grid">
                <div className="fed-modal-info-item">
                  <small>Subject & Paper</small>
                  <span>{selectedDuty.subject}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Duty Role</small>
                  <span>{selectedDuty.role}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Date & Session</small>
                  <span>
                    {selectedDuty.date} ({selectedDuty.session})
                  </span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Exam Hours</small>
                  <span>{selectedDuty.examHours}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Reporting Time</small>
                  <span style={{ color: "#dc2626" }}>{selectedDuty.reportingTime}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Examination Hall / Venue</small>
                  <span>{selectedDuty.venue}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Registered Candidates</small>
                  <span>{selectedDuty.candidates}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Assigned Invigilator</small>
                  <span>{selectedDuty.invigilator}</span>
                </div>
              </div>

              {/* Standard Operating Procedures & Guidelines */}
              {selectedDuty.sops && (
                <div
                  style={{
                    background: "var(--cms-subtle, #f8fafc)",
                    border: "1px solid var(--cms-border, #e2e8f0)",
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <strong
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: "var(--cms-text, #1e293b)",
                      marginBottom: 8,
                    }}
                  >
                    <Shield size={14} color="#2563eb" />
                    Mandatory Invigilation SOPs & Protocols:
                  </strong>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 12,
                      color: "var(--cms-muted, #475569)",
                      lineHeight: 1.55,
                    }}
                  >
                    {selectedDuty.sops.map((sop, idx) => (
                      <li key={idx}>{sop}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="fed-modal-foot">
              <button
                type="button"
                className="fed-action-btn fed-action-btn-outline"
                onClick={() => {
                  notify(`Allotment order for ${selectedDuty.examCode} downloaded.`);
                }}
              >
                <FileDown size={14} /> Download Duty Order
              </button>
              <button
                type="button"
                className="fed-action-btn fed-action-btn-primary"
                onClick={() => setSelectedDuty(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Reassign Duty Modal ---------------- */}
      {reassignDuty && (
        <div
          className="fed-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setReassignDuty(null)}
        >
          <div className="fed-modal-card" style={{ maxWidth: 480 }}>
            <div className="fed-modal-head">
              <div>
                <h3>Reassign Duty</h3>
                <small style={{ color: "var(--cms-muted)", fontSize: 11 }}>
                  {reassignDuty.examName} ({reassignDuty.date})
                </small>
              </div>
              <button
                type="button"
                className="fed-modal-close-btn"
                onClick={() => setReassignDuty(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit}>
              <div className="fed-modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-text)" }}>
                    Select Substitute Colleague
                  </label>
                  <select
                    className="fed-select-input"
                    style={{ width: "100%", height: 40 }}
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    required
                  >
                    {AVAILABLE_FACULTY.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-text)" }}>
                    Reason for Reassignment Request
                  </label>
                  <textarea
                    rows={3}
                    className="fed-search-input"
                    style={{
                      height: "auto",
                      padding: "8px 10px",
                      borderRadius: 8,
                      resize: "vertical",
                    }}
                    placeholder="Provide medical urgency, academic collision, or official leave reason..."
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="fed-modal-foot">
                <button
                  type="button"
                  className="fed-action-btn fed-action-btn-outline"
                  onClick={() => setReassignDuty(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="fed-action-btn fed-action-btn-primary">
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- View Report Modal (Completed) ---------------- */}
      {reportDuty && (
        <div
          className="fed-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setReportDuty(null)}
        >
          <div className="fed-modal-card" style={{ maxWidth: 540 }}>
            <div className="fed-modal-head">
              <div>
                <h3>Examination Duty Completion Dossier</h3>
                <small style={{ color: "var(--cms-muted)", fontSize: 11 }}>
                  {reportDuty.examName} • {reportDuty.date}
                </small>
              </div>
              <button
                type="button"
                className="fed-modal-close-btn"
                onClick={() => setReportDuty(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="fed-modal-body">
              <div className="fed-modal-grid">
                <div className="fed-modal-info-item">
                  <small>Subject Code</small>
                  <span>{reportDuty.examCode}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Exam Venue</small>
                  <span>{reportDuty.venue}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Invigilator in Charge</small>
                  <span>{reportDuty.invigilator}</span>
                </div>
                <div className="fed-modal-info-item">
                  <small>Chief Superintendent Stamp</small>
                  <span style={{ color: "#16a34a" }}>Verified & Stamped</span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "#eff6ff",
                    border: "1px solid #dbeafe",
                  }}
                >
                  <small style={{ color: "#2563eb", fontWeight: 700, fontSize: 11 }}>
                    Total Enrolled
                  </small>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a" }}>
                    {reportDuty.totalEnrolled || 30}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "#f0fdf4",
                    border: "1px solid #dcfce7",
                  }}
                >
                  <small style={{ color: "#16a34a", fontWeight: 700, fontSize: 11 }}>
                    Present Candidates
                  </small>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#14532d" }}>
                    {reportDuty.present || 30}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "#fffbeb",
                    border: "1px solid #fef3c7",
                  }}
                >
                  <small style={{ color: "#d97706", fontWeight: 700, fontSize: 11 }}>
                    Absentees
                  </small>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#78350f" }}>
                    {reportDuty.absent || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="fed-modal-foot">
              <button
                type="button"
                className="fed-action-btn fed-action-btn-outline"
                onClick={() => {
                  notify(`Duty completion certificate for ${reportDuty.examCode} printed.`);
                }}
              >
                <Printer size={14} /> Print Summary
              </button>
              <button
                type="button"
                className="fed-action-btn fed-action-btn-primary"
                onClick={() => setReportDuty(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Fallback Toast Notification ---------------- */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1e293b",
            color: "#ffffff",
            padding: "12px 18px",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toast.type === "error" ? (
            <AlertCircle size={16} color="#ef4444" />
          ) : (
            <CheckCircle2 size={16} color="#22c55e" />
          )}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
