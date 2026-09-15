import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  RefreshCw,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";

const TODAY = new Date().toISOString().slice(0, 10);

const MOCK_LEVEL_SUMMARIES = [
  { id: "lvl-1", name: "1st Year", total: 622, present: 590, absent: 22, late: 10, leave: 0, percentage: 94.8 },
  { id: "lvl-2", name: "2nd Year", total: 626, present: 586, absent: 30, late: 10, leave: 0, percentage: 93.6 },
];

const MOCK_GROUP_SUMMARIES = [
  { id: "grp-mpc", name: "MPC", level: "1st Year", total: 310, present: 295, absent: 10, late: 5, leave: 0, percentage: 95.1, color: "#2563eb" },
  { id: "grp-bipc", name: "BIPC", level: "1st Year", total: 250, present: 235, absent: 10, late: 5, leave: 0, percentage: 94.0, color: "#7c3aed" },
  { id: "grp-cec", name: "CEC", level: "1st Year", total: 180, present: 166, absent: 10, late: 4, leave: 0, percentage: 92.2, color: "#f59e0b" },
  { id: "grp-mec", name: "MEC", level: "2nd Year", total: 160, present: 150, absent: 7, late: 3, leave: 0, percentage: 93.8, color: "#16a34a" },
  { id: "grp-hec", name: "HEC", level: "2nd Year", total: 120, present: 110, absent: 7, late: 3, leave: 0, percentage: 91.7, color: "#e11d48" },
];

const MOCK_SECTION_SUMMARIES = [
  { id: "sec-mpc-a", name: "Section A", groupName: "MPC", levelName: "1st Year", classTeacher: "K. Venkatesh", total: 52, present: 50, absent: 1, late: 1, leave: 0, percentage: 96.2 },
  { id: "sec-mpc-b", name: "Section B", groupName: "MPC", levelName: "1st Year", classTeacher: "S. Anitha", total: 48, present: 45, absent: 2, late: 1, leave: 0, percentage: 93.8 },
  { id: "sec-bipc-a", name: "Section A", groupName: "BIPC", levelName: "1st Year", classTeacher: "P. Rajesh", total: 60, present: 57, absent: 2, late: 1, leave: 0, percentage: 95.0 },
  { id: "sec-cec-a", name: "Section A", groupName: "CEC", levelName: "1st Year", classTeacher: "M. Lakshmi", total: 58, present: 54, absent: 3, late: 1, leave: 0, percentage: 93.1 },
];

const MOCK_STUDENTS = [
  {
    id: "101",
    rollNumber: "2026-MPC-001",
    admissionNumber: "ADM-2026-101",
    name: "Aarav Sharma",
    level: "1st Year",
    group: "MPC",
    section: "Section A",
    status: "Present",
    inTime: "08:42 AM",
    outTime: "04:15 PM",
    markedAt: "08:45 AM",
    markedBy: "K. Venkatesh (Class Teacher)",
    remarks: "On time",
  },
  {
    id: "102",
    rollNumber: "2026-MPC-002",
    admissionNumber: "ADM-2026-102",
    name: "Bhavya Reddy",
    level: "1st Year",
    group: "MPC",
    section: "Section A",
    status: "Present",
    inTime: "08:44 AM",
    outTime: "04:15 PM",
    markedAt: "08:45 AM",
    markedBy: "K. Venkatesh (Class Teacher)",
    remarks: "",
  },
  {
    id: "103",
    rollNumber: "2026-MPC-003",
    admissionNumber: "ADM-2026-103",
    name: "Charan Kumar",
    level: "1st Year",
    group: "MPC",
    section: "Section A",
    status: "Absent",
    inTime: "—",
    outTime: "—",
    markedAt: "09:00 AM",
    markedBy: "K. Venkatesh (Class Teacher)",
    remarks: "Informed via phone call",
  },
  {
    id: "104",
    rollNumber: "2026-MPC-004",
    admissionNumber: "ADM-2026-104",
    name: "Deepika Rao",
    level: "1st Year",
    group: "MPC",
    section: "Section A",
    status: "Late",
    inTime: "09:12 AM",
    outTime: "04:15 PM",
    markedAt: "09:15 AM",
    markedBy: "K. Venkatesh (Class Teacher)",
    remarks: "Bus delay",
  },
  {
    id: "105",
    rollNumber: "2026-MPC-005",
    admissionNumber: "ADM-2026-105",
    name: "Eshwar Varma",
    level: "1st Year",
    group: "MPC",
    section: "Section A",
    status: "On Leave",
    inTime: "—",
    outTime: "—",
    markedAt: "08:30 AM",
    markedBy: "Admin Office",
    remarks: "Medical leave approved",
  },
  {
    id: "106",
    rollNumber: "2026-BIPC-001",
    admissionNumber: "ADM-2026-106",
    name: "Farhan Ahmed",
    level: "1st Year",
    group: "BIPC",
    section: "Section A",
    status: "Present",
    inTime: "08:38 AM",
    outTime: "04:15 PM",
    markedAt: "08:45 AM",
    markedBy: "P. Rajesh",
    remarks: "",
  },
  {
    id: "107",
    rollNumber: "2026-BIPC-002",
    admissionNumber: "ADM-2026-107",
    name: "Gautami Nair",
    level: "1st Year",
    group: "BIPC",
    section: "Section A",
    status: "Present",
    inTime: "08:40 AM",
    outTime: "04:15 PM",
    markedAt: "08:45 AM",
    markedBy: "P. Rajesh",
    remarks: "",
  },
  {
    id: "108",
    rollNumber: "2026-CEC-001",
    admissionNumber: "ADM-2026-108",
    name: "Harish Gupta",
    level: "1st Year",
    group: "CEC",
    section: "Section A",
    status: "Absent",
    inTime: "—",
    outTime: "—",
    markedAt: "09:05 AM",
    markedBy: "M. Lakshmi",
    remarks: "Unexcused absence",
  },
  {
    id: "109",
    rollNumber: "2026-MEC-001",
    admissionNumber: "ADM-2026-109",
    name: "Ishita Roy",
    level: "2nd Year",
    group: "MEC",
    section: "Section A",
    status: "Present",
    inTime: "08:41 AM",
    outTime: "04:15 PM",
    markedAt: "08:45 AM",
    markedBy: "S. Rao",
    remarks: "",
  },
  {
    id: "110",
    rollNumber: "2026-HEC-001",
    admissionNumber: "ADM-2026-110",
    name: "Jaya Prakash",
    level: "2nd Year",
    group: "HEC",
    section: "Section A",
    status: "Not Marked",
    inTime: "—",
    outTime: "—",
    markedAt: "—",
    markedBy: "—",
    remarks: "Pending entry",
  },
];

function statusClass(status) {
  switch (status) {
    case "Present": return "badge-present";
    case "Absent": return "badge-absent";
    case "Late": return "badge-late";
    case "On Leave": return "badge-leave";
    default: return "badge-not-marked";
  }
}

export default function DetailedStudentAttendance({ initialViewBy = "all" }) {
  const navigate = useNavigate();

  // Filters
  const [date, setDate] = useState(TODAY);
  const [selectedBoard, setSelectedBoard] = useState("BIEAP");
  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Drill-down view level: "level" | "group" | "section" | "student"
  const [drillLevel, setDrillLevel] = useState(() => {
    if (initialViewBy === "academic-level") return "level";
    if (initialViewBy === "group") return "group";
    if (initialViewBy === "section") return "section";
    return "level";
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

  // Filter hierarchy handlers
  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    setSelectedGroup("");
    setSelectedSection("");
    if (lvl) {
      setDrillLevel("group");
    } else {
      setDrillLevel("level");
    }
  };

  const handleGroupChange = (grp) => {
    setSelectedGroup(grp);
    setSelectedSection("");
    if (grp) {
      setDrillLevel("section");
    } else if (selectedLevel) {
      setDrillLevel("group");
    } else {
      setDrillLevel("level");
    }
  };

  const handleSectionChange = (sec) => {
    setSelectedSection(sec);
    if (sec) {
      setDrillLevel("student");
    } else if (selectedGroup) {
      setDrillLevel("section");
    } else if (selectedLevel) {
      setDrillLevel("group");
    } else {
      setDrillLevel("level");
    }
  };

  // Breadcrumb click handlers
  const navigateBreadcrumb = (target) => {
    if (target === "all") {
      setSelectedLevel("");
      setSelectedGroup("");
      setSelectedSection("");
      setDrillLevel("level");
    } else if (target === "level") {
      setSelectedGroup("");
      setSelectedSection("");
      setDrillLevel("group");
    } else if (target === "group") {
      setSelectedSection("");
      setDrillLevel("section");
    }
  };

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    return MOCK_STUDENTS.filter((st) => {
      if (selectedLevel && st.level !== selectedLevel) return false;
      if (selectedGroup && st.group !== selectedGroup) return false;
      if (selectedSection && st.section !== selectedSection) return false;
      if (selectedStatus !== "All" && st.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchRoll = st.rollNumber.toLowerCase().includes(q);
        const matchAdm = st.admissionNumber.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchAdm) return false;
      }
      return true;
    });
  }, [selectedLevel, selectedGroup, selectedSection, selectedStatus, searchQuery]);

  // Overall Statistics calculated from filtered list
  const stats = useMemo(() => {
    const total = 1248;
    const present = 1176;
    const absent = 52;
    const late = 20;
    const leave = 0;
    const pct = ((present / total) * 100).toFixed(1);
    return { total, present, absent, late, leave, pct };
  }, []);

  return (
    <div className="detailed-attendance-container">
      {/* Top Header Card */}
      <div className="detailed-att-header-card">
        <div className="detailed-att-title-row">
          <div>
            <h1 className="detailed-att-title">Student Attendance Details</h1>
            <p className="detailed-att-subtitle">
              Comprehensive drill-down attendance analysis by level, group, section, and student.
            </p>
          </div>
          <div className="detailed-att-header-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 300);
              }}
            >
              <RefreshCw size={14} className={loading ? "dashboard-spin" : ""} /> Refresh
            </button>
            <Link to="/dashboard/attendance/student" className="cms-btn cms-btn-primary">
              Mark Attendance
            </Link>
          </div>
        </div>

        {/* Scoped Filter Bar */}
        <div className="detailed-att-filters-grid">
          <div className="att-filter-item">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="att-filter-item">
            <label>Board</label>
            <select value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value)}>
              <option value="BIEAP">BIEAP</option>
              <option value="CBSE">CBSE</option>
            </select>
          </div>
          <div className="att-filter-item">
            <label>Academic Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="2026-2027">2026–2027</option>
              <option value="2025-2026">2025–2026</option>
            </select>
          </div>
          <div className="att-filter-item">
            <label>Academic Level</label>
            <select value={selectedLevel} onChange={(e) => handleLevelChange(e.target.value)}>
              <option value="">All Levels</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
            </select>
          </div>
          <div className="att-filter-item">
            <label>Group</label>
            <select value={selectedGroup} onChange={(e) => handleGroupChange(e.target.value)}>
              <option value="">All Groups</option>
              <option value="MPC">MPC</option>
              <option value="BIPC">BIPC</option>
              <option value="CEC">CEC</option>
              <option value="MEC">MEC</option>
              <option value="HEC">HEC</option>
            </select>
          </div>
          <div className="att-filter-item">
            <label>Section</label>
            <select value={selectedSection} onChange={(e) => handleSectionChange(e.target.value)}>
              <option value="">All Sections</option>
              <option value="Section A">Section A</option>
              <option value="Section B">Section B</option>
            </select>
          </div>
          <div className="att-filter-item">
            <label>Attendance Status</label>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="On Leave">On Leave</option>
              <option value="Not Marked">Not Marked</option>
            </select>
          </div>
          <div className="att-filter-item search-filter">
            <label>Search Student</label>
            <div className="att-search-input-wrap">
              <Search3DIcon size={14} className="att-search-icon" />
              <input
                type="text"
                placeholder="Search Name, Admission No, Roll No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="att-search-clear" onClick={() => setSearchQuery("")}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="detailed-att-kpi-strip">
        <div className="kpi-strip-card">
          <span>Total Students</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="kpi-strip-card text-present">
          <span>Present</span>
          <strong>{stats.present}</strong>
        </div>
        <div className="kpi-strip-card text-absent">
          <span>Absent</span>
          <strong>{stats.absent}</strong>
        </div>
        <div className="kpi-strip-card text-late">
          <span>Late</span>
          <strong>{stats.late}</strong>
        </div>
        <div className="kpi-strip-card text-primary">
          <span>Overall Attendance</span>
          <strong>{stats.pct}%</strong>
        </div>
      </div>

      {/* Breadcrumb Trail */}
      <nav className="detailed-att-breadcrumbs" aria-label="Drill-down path">
        <button
          type="button"
          className={`crumb-btn ${!selectedLevel ? "crumb-active" : ""}`}
          onClick={() => navigateBreadcrumb("all")}
        >
          All Students
        </button>
        {selectedLevel && (
          <>
            <ChevronRight size={14} className="crumb-sep" />
            <button
              type="button"
              className={`crumb-btn ${selectedLevel && !selectedGroup ? "crumb-active" : ""}`}
              onClick={() => navigateBreadcrumb("level")}
            >
              {selectedLevel}
            </button>
          </>
        )}
        {selectedGroup && (
          <>
            <ChevronRight size={14} className="crumb-sep" />
            <button
              type="button"
              className={`crumb-btn ${selectedGroup && !selectedSection ? "crumb-active" : ""}`}
              onClick={() => navigateBreadcrumb("group")}
            >
              {selectedGroup}
            </button>
          </>
        )}
        {selectedSection && (
          <>
            <ChevronRight size={14} className="crumb-sep" />
            <span className="crumb-btn crumb-active">{selectedSection}</span>
          </>
        )}
      </nav>

      {/* Main Content Body */}
      {loading ? (
        <div className="detailed-att-loading">
          <span className="dashboard-spinner" />
          <span>Loading attendance records...</span>
        </div>
      ) : error ? (
        <div className="detailed-att-error">
          <AlertTriangle size={24} className="error-icon" />
          <p>{error}</p>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => setError("")}>
            <RefreshCw size={14} /> Retry Loading
          </button>
        </div>
      ) : (
        <div className="detailed-att-body-content">
          {/* Level 1: Academic Level Summary Cards */}
          {drillLevel === "level" && (
            <div className="drill-grid">
              {MOCK_LEVEL_SUMMARIES.map((lvl) => (
                <div key={lvl.id} className="drill-card">
                  <div className="drill-card-head">
                    <h3>{lvl.name}</h3>
                    <span className="drill-pct-badge">{lvl.percentage}%</span>
                  </div>
                  <div className="att-progress-bar">
                    <div className="att-progress-fill" style={{ width: `${lvl.percentage}%`, backgroundColor: "#22a447" }} />
                  </div>
                  <div className="drill-metrics-grid">
                    <div><small>Total</small><strong>{lvl.total}</strong></div>
                    <div><small>Present</small><strong className="text-present">{lvl.present}</strong></div>
                    <div><small>Absent</small><strong className="text-absent">{lvl.absent}</strong></div>
                    <div><small>Late</small><strong className="text-late">{lvl.late}</strong></div>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost drill-action-btn"
                    onClick={() => handleLevelChange(lvl.name)}
                  >
                    View Groups <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Level 2: Group Summary Cards */}
          {drillLevel === "group" && (
            <div className="drill-grid">
              {MOCK_GROUP_SUMMARIES.filter((g) => !selectedLevel || g.level === selectedLevel).map((grp) => (
                <div key={grp.id} className="drill-card">
                  <div className="drill-card-head">
                    <h3 style={{ color: grp.color }}>{grp.name}</h3>
                    <span className="drill-pct-badge">{grp.percentage}%</span>
                  </div>
                  <div className="att-progress-bar">
                    <div className="att-progress-fill" style={{ width: `${grp.percentage}%`, backgroundColor: grp.color || "#22a447" }} />
                  </div>
                  <div className="drill-metrics-grid">
                    <div><small>Total</small><strong>{grp.total}</strong></div>
                    <div><small>Present</small><strong className="text-present">{grp.present}</strong></div>
                    <div><small>Absent</small><strong className="text-absent">{grp.absent}</strong></div>
                    <div><small>Late</small><strong className="text-late">{grp.late}</strong></div>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost drill-action-btn"
                    onClick={() => handleGroupChange(grp.name)}
                  >
                    View Sections <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Level 3: Section Summary Cards */}
          {drillLevel === "section" && (
            <div className="drill-grid">
              {MOCK_SECTION_SUMMARIES.filter((s) => !selectedGroup || s.groupName === selectedGroup).map((sec) => (
                <div key={sec.id} className="drill-card">
                  <div className="drill-card-head">
                    <div>
                      <h3>{sec.groupName} - {sec.name}</h3>
                      <small className="class-teacher-label">Class Teacher: {sec.classTeacher}</small>
                    </div>
                    <span className="drill-pct-badge">{sec.percentage}%</span>
                  </div>
                  <div className="att-progress-bar">
                    <div className="att-progress-fill" style={{ width: `${sec.percentage}%`, backgroundColor: "#22a447" }} />
                  </div>
                  <div className="drill-metrics-grid">
                    <div><small>Total</small><strong>{sec.total}</strong></div>
                    <div><small>Present</small><strong className="text-present">{sec.present}</strong></div>
                    <div><small>Absent</small><strong className="text-absent">{sec.absent}</strong></div>
                    <div><small>Late</small><strong className="text-late">{sec.late}</strong></div>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost drill-action-btn"
                    onClick={() => handleSectionChange(sec.name)}
                  >
                    View Students <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Level 4: Individual Student Table */}
          {(drillLevel === "student" || searchQuery || selectedStatus !== "All") && (
            <div className="detailed-att-table-wrap">
              {filteredStudents.length === 0 ? (
                <div className="detailed-att-empty">
                  <Users size={36} className="empty-icon" />
                  <h3>No student records found</h3>
                  <p>Try adjusting your search query or filters above to view student attendance.</p>
                  <Link to="/dashboard/attendance/student" className="cms-btn cms-btn-primary empty-action-btn">
                    Mark Attendance
                  </Link>
                </div>
              ) : (
                <table className="cms-table detailed-att-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Level</th>
                      <th>Group</th>
                      <th>Section</th>
                      <th>Status</th>
                      <th>In Time</th>
                      <th>Out Time</th>
                      <th>Marked At</th>
                      <th>Marked By</th>
                      <th>Remarks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st) => (
                      <tr key={st.id}>
                        <td><strong>{st.rollNumber}</strong></td>
                        <td>{st.admissionNumber}</td>
                        <td>
                          <Link to={`/dashboard/students/${st.id}`} className="student-name-link">
                            {st.name}
                          </Link>
                        </td>
                        <td>{st.level}</td>
                        <td><span className="group-badge">{st.group}</span></td>
                        <td>{st.section}</td>
                        <td>
                          <span className={`att-status-pill ${statusClass(st.status)}`}>
                            {st.status}
                          </span>
                        </td>
                        <td>{st.inTime}</td>
                        <td>{st.outTime}</td>
                        <td>{st.markedAt}</td>
                        <td><small>{st.markedBy}</small></td>
                        <td>{st.remarks || "—"}</td>
                        <td>
                          <div className="att-table-actions">
                            <Link to={`/dashboard/students/${st.id}`} className="att-action-icon-btn" title="View Profile">
                              <Eye size={14} />
                            </Link>
                            <button
                              type="button"
                              className="att-action-icon-btn"
                              title="View Attendance History"
                              onClick={() => setSelectedStudentHistory(st)}
                            >
                              <History size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Attendance History Modal */}
      {selectedStudentHistory && (
        <div className="detailed-att-modal-overlay" onClick={() => setSelectedStudentHistory(null)}>
          <div className="detailed-att-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Student Attendance History</h2>
                <p>
                  <strong>{selectedStudentHistory.name}</strong> • {selectedStudentHistory.rollNumber} ({selectedStudentHistory.group} - {selectedStudentHistory.section})
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedStudentHistory(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-summary-strip">
              <div className="mod-sum-item">
                <small>30-Day Attendance</small>
                <strong>92.0%</strong>
              </div>
              <div className="mod-sum-item text-present">
                <small>Present Days</small>
                <strong>23</strong>
              </div>
              <div className="mod-sum-item text-absent">
                <small>Absent Days</small>
                <strong>2</strong>
              </div>
              <div className="mod-sum-item text-late">
                <small>Late Days</small>
                <strong>1</strong>
              </div>
              <div className="mod-sum-item text-leave">
                <small>On Leave</small>
                <strong>1</strong>
              </div>
            </div>

            <div className="modal-history-list">
              <h3>Recent Attendance History</h3>
              <div className="history-records-table-wrap">
                <table className="cms-table history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>In Time</th>
                      <th>Out Time</th>
                      <th>Marked By</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Today ({date})</td>
                      <td><span className={`att-status-pill ${statusClass(selectedStudentHistory.status)}`}>{selectedStudentHistory.status}</span></td>
                      <td>{selectedStudentHistory.inTime}</td>
                      <td>{selectedStudentHistory.outTime}</td>
                      <td>{selectedStudentHistory.markedBy}</td>
                      <td>{selectedStudentHistory.remarks || "—"}</td>
                    </tr>
                    <tr>
                      <td>Yesterday</td>
                      <td><span className="att-status-pill badge-present">Present</span></td>
                      <td>08:40 AM</td>
                      <td>04:15 PM</td>
                      <td>K. Venkatesh</td>
                      <td>—</td>
                    </tr>
                    <tr>
                      <td>2 days ago</td>
                      <td><span className="att-status-pill badge-present">Present</span></td>
                      <td>08:42 AM</td>
                      <td>04:15 PM</td>
                      <td>K. Venkatesh</td>
                      <td>—</td>
                    </tr>
                    <tr>
                      <td>3 days ago</td>
                      <td><span className="att-status-pill badge-late">Late</span></td>
                      <td>09:10 AM</td>
                      <td>04:15 PM</td>
                      <td>K. Venkatesh</td>
                      <td>Late arrival noted</td>
                    </tr>
                    <tr>
                      <td>4 days ago</td>
                      <td><span className="att-status-pill badge-absent">Absent</span></td>
                      <td>—</td>
                      <td>—</td>
                      <td>K. Venkatesh</td>
                      <td>Medical absence</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setSelectedStudentHistory(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

