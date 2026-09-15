import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, User, Calendar, BookOpen, UserCheck, MessageSquareQuote,
  GraduationCap, ClipboardCheck, Wallet, FileText, CalendarOff, Receipt,
  Bell, Moon, Sun, Search, Menu, ChevronRight, ChevronDown, Download, Printer,
  Eye, CheckCircle, AlertCircle, Plus, Send, Paperclip, LogOut, Building2,
  Users, Check, X, ShieldAlert, Award, Clock, DollarSign, TrendingUp, Sparkles,
  HelpCircle, ArrowLeft, Layers, Briefcase, FileSpreadsheet, RefreshCw
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { getLeaveRequests, submitLeaveRequest } from "@/features/leave/services/leaveStore.js";
import { clearAuthSession } from "@/features/authStorage.js";
import "./facultydashboard.css";

// ==========================================================================
// MOCK DATA STRUCTURES — PIRNAV FACULTY PORTAL
// ==========================================================================

const mockFaculty = {
  id: 1,
  employeeId: "PJCTCH0027",
  firstName: "Ravi",
  lastName: "Kumar",
  fullName: "Ravi Kumar",
  role: "Faculty",
  staffType: "Teaching",
  department: "Mathematics",
  designation: "Junior Lecturer",
  board: "BIEAP",
  academicYear: "2025-2026",
  dateOfJoining: "2024-06-10",
  gender: "Male",
  dob: "1990-08-14",
  bloodGroup: "O+",
  aadhaarMasked: "XXXX-XXXX-4829",
  panMasked: "ABCPS****F",
  mobile: "9876543210",
  altMobile: "9876543211",
  email: "Faculty@CMS.com",
  personalEmail: "ravikumar.maths@gmail.com",
  status: "Active",
  profileCompletion: 92,
  address: "Plot 42, Green Avenue, Jubilee Hills, Hyderabad, Telangana - 500033",
  bankName: "State Bank of India",
  accountHolder: "Ravi Kumar",
  accountMasked: "XXXXXX3482",
  ifsc: "SBIN0001234",
  branch: "Main Campus Branch",
  uan: "100982341234",
  pfNumber: "AP/HYD/0098234/000/00027",
};

const mockSalaryData = {
  month: "May 2025",
  basicPay: 52000,
  hra: 10400,
  da: 5200,
  academicAllowance: 3000,
  transportAllowance: 1600,
  otherAllowances: 1000,
  grossSalary: 73200,
  pf: 6240,
  professionalTax: 200,
  tds: 3800,
  insurance: 500,
  lop: 2000,
  otherDeductions: 1000,
  totalDeductions: 13740,
  netSalary: 58460,
  lastPaymentDate: "30 Apr 2025",
  nextSalaryDate: "31 May 2025",
};

const mockPayslips = [
  { id: "ps-05", month: "May 2025", period: "01 May 2025 - 31 May 2025", grossSalary: 73200, totalDeductions: 13740, netSalary: 58460, paymentDate: "31 May 2025", status: "Upcoming", txnRef: "TXN250531901" },
  { id: "ps-04", month: "Apr 2025", period: "01 Apr 2025 - 30 Apr 2025", grossSalary: 73200, totalDeductions: 13740, netSalary: 58460, paymentDate: "30 Apr 2025", status: "Paid", txnRef: "TXN250430892" },
  { id: "ps-03", month: "Mar 2025", period: "01 Mar 2025 - 31 Mar 2025", grossSalary: 73200, totalDeductions: 12940, netSalary: 60260, paymentDate: "29 Mar 2025", status: "Paid", txnRef: "TXN250329712" },
  { id: "ps-02", month: "Feb 2025", period: "01 Feb 2025 - 28 Feb 2025", grossSalary: 73200, totalDeductions: 12740, netSalary: 60460, paymentDate: "28 Feb 2025", status: "Paid", txnRef: "TXN250228604" },
  { id: "ps-01", month: "Jan 2025", period: "01 Jan 2025 - 31 Jan 2025", grossSalary: 73200, totalDeductions: 12740, netSalary: 60460, paymentDate: "31 Jan 2025", status: "Paid", txnRef: "TXN250131490" },
];

const mockTimetableSlots = [
  { time: "09:00 - 10:00 AM", mon: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, tue: null, wed: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, thu: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, fri: null, sat: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" } },
  { time: "10:00 - 11:00 AM", mon: null, tue: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, wed: null, thu: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, fri: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, sat: null },
  { time: "11:15 - 12:15 PM", mon: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, tue: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, wed: { subject: "Mathematics", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, thu: null, fri: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, sat: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" } },
  { time: "12:15 - 01:15 PM", mon: { subject: "Mathematics Lab", class: "MPC 1st Year", sec: "Section A", room: "Lab 2" }, tue: null, wed: null, thu: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, fri: null, sat: null },
  { time: "02:00 - 03:00 PM", mon: null, tue: { subject: "Mathematics", class: "MPC 2nd Year", sec: "Section B", room: "Room 205" }, wed: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, thu: null, fri: { subject: "Mathematics", class: "MEC 1st Year", sec: "Section A", room: "Room 104" }, sat: null },
  { time: "03:00 - 04:00 PM", mon: { subject: "Tutorial", class: "MPC 1st Year", sec: "Section A", room: "Room 203" }, tue: null, wed: null, thu: null, fri: null, sat: null },
];

const mockClassesList = [
  { id: "c1", className: "MPC 1st Year", group: "MPC", level: "Senior Secondary", sec: "Section A", subject: "Mathematics I-A", totalStudents: 45, todayAttendance: "91%", nextClass: "Today 10:00 AM" },
  { id: "c2", className: "MPC 2nd Year", group: "MPC", level: "Senior Secondary", sec: "Section B", subject: "Mathematics II-A", totalStudents: 42, todayAttendance: "95%", nextClass: "Today 11:15 AM" },
  { id: "c3", className: "MEC 1st Year", group: "MEC", level: "Senior Secondary", sec: "Section A", subject: "Commercial Maths", totalStudents: 48, todayAttendance: "89%", nextClass: "Tomorrow 09:00 AM" },
  { id: "c4", className: "BiPC 2nd Year", group: "BiPC", level: "Senior Secondary", sec: "Section C", subject: "Biostatistics", totalStudents: 40, todayAttendance: "96%", nextClass: "Friday 02:00 PM" },
];

const mockStudentsList = [
  { rollNo: "25MPC001", name: "Aarav Sharma", attendancePct: "94%", marks: 45, status: "Submitted" },
  { rollNo: "25MPC002", name: "Ananya Reddy", attendancePct: "98%", marks: 48, status: "Submitted" },
  { rollNo: "25MPC003", name: "Bhavya Rao", attendancePct: "88%", marks: 39, status: "Submitted" },
  { rollNo: "25MPC004", name: "Devendra Verma", attendancePct: "92%", marks: 42, status: "Submitted" },
  { rollNo: "25MPC005", name: "Gautam Krishna", attendancePct: "85%", marks: 36, status: "Submitted" },
  { rollNo: "25MPC006", name: "Ishita Nair", attendancePct: "96%", marks: 47, status: "Submitted" },
  { rollNo: "25MPC007", name: "Kavya Joshi", attendancePct: "90%", marks: 41, status: "Submitted" },
];

const mockFeedbackData = {
  overall: 4.8,
  quality: 4.9,
  communication: 4.7,
  knowledge: 4.9,
  punctuality: 4.8,
  engagement: 4.7,
  monthlyTrend: [
    { month: "Jan", rating: 4.6 },
    { month: "Feb", rating: 4.7 },
    { month: "Mar", rating: 4.7 },
    { month: "Apr", rating: 4.8 },
    { month: "May", rating: 4.8 },
  ],
  reviews: [
    { id: 1, anonymous: true, rating: 5, category: "Teaching Quality", comment: "Sir explains complex calculus integration concepts with practical examples. Highly inspiring!", date: "10 May 2025" },
    { id: 2, anonymous: true, rating: 5, category: "Punctuality", comment: "Always arrives on time and clears all doubt questions patiently after class.", date: "04 May 2025" },
    { id: 3, anonymous: true, rating: 4, category: "Communication", comment: "Great speed and clarity. Would love a few more practice worksheets for Mid Term prep.", date: "28 Apr 2025" },
  ],
};

const mockExamDutiesList = [
  { id: "d1", exam: "BIEAP Intermediate Board Practical Exam", date: "20 May 2025", time: "09:00 AM - 12:00 PM", venue: "Physics Lab 1", type: "Invigilator", reportingTime: "08:30 AM", status: "Pending" },
  { id: "d2", exam: "Unit Test II Evaluation Duty", date: "25 May 2025", time: "01:00 PM - 04:00 PM", venue: "Evaluation Cell 3", type: "Evaluator", reportingTime: "12:45 PM", status: "Upcoming" },
  { id: "d3", exam: "Mid-Term General Observer", date: "12 Apr 2025", time: "09:00 AM - 12:00 PM", venue: "Main Auditorium", type: "Observer", reportingTime: "08:30 AM", status: "Completed" },
];

const mockLeavesList = [
  { id: "l1", type: "Casual Leave (CL)", from: "14 May 2025", to: "14 May 2025", days: 1, reason: "Family medical emergency", appliedOn: "12 May 2025", status: "Approved", approver: "HOD Mathematics" },
  { id: "l2", type: "Sick Leave (SL)", from: "02 Apr 2025", to: "03 Apr 2025", days: 2, reason: "Viral fever and doctor advice", appliedOn: "01 Apr 2025", status: "Approved", approver: "Principal Office" },
];

const mockReimbursementsList = [
  { id: "r1", claimId: "CLM250501", type: "Books & Journals", claimAmount: 1800, approvedAmount: 1800, date: "05 May 2025", status: "Approved", month: "May 2025" },
  { id: "r2", claimId: "CLM250412", type: "Academic Conference", claimAmount: 3500, approvedAmount: 3500, date: "12 Apr 2025", status: "Approved", month: "April 2025" },
];

const mockNoticesList = [
  { id: "n1", title: "Intermediate Board Internal Assessment Deadline", category: "Academic", date: "15 May 2025", priority: "Urgent", postedBy: "Exam Cell", desc: "All faculty must submit UT-2 internal marks by May 22, 2025." },
  { id: "n2", title: "Monthly Salary Disbursement Confirmation", category: "Salary", date: "30 Apr 2025", priority: "Normal", postedBy: "Accounts Dept", desc: "April 2025 salaries credited to registered Bank accounts." },
  { id: "n3", title: "Faculty Development Workshop on AI in Pedagogy", category: "Administration", date: "24 Apr 2025", priority: "High", postedBy: "Principal Office", desc: "Mandatory 1-day workshop for all junior & senior lecturers." },
];

const mockConversationsList = [
  { id: "c1", name: "HOD - Mathematics", role: "Department Head", unread: 1, lastMsg: "Please review the UT-2 Question Paper draft by 3 PM.", time: "10:15 AM" },
  { id: "c2", name: "Accounts Department", role: "Finance Division", unread: 0, lastMsg: "Your reimbursement claim CLM250501 has been processed.", time: "Yesterday" },
  { id: "c3", name: "Exam Cell", role: "Controller of Exams", unread: 0, lastMsg: "Duty roster for upcoming Board Practicals attached.", time: "12 May" },
];

const mockMessagesHistory = [
  { id: "m1", sender: "HOD - Mathematics", text: "Good morning Ravi. Have you finalized the Section A calculus worksheet?", time: "09:30 AM", self: false },
  { id: "m2", sender: "Ravi Kumar", text: "Good morning Ma'am. Yes, completed. I will upload it to My Classes by noon.", time: "09:34 AM", self: true },
  { id: "m3", sender: "HOD - Mathematics", text: "Please review the UT-2 Question Paper draft by 3 PM.", time: "10:15 AM", self: false },
];

// CHART COLOR TINTS
const COLORS = ["#6F8400", "#108E50", "#B7791F", "#D93636", "#2563EB"];

// ==========================================================================
// MAIN FACULTY DASHBOARD COMPONENT
// ==========================================================================

function FacultyDashboard() {
  const navigate = useNavigate();
  const {
    selectedBoard: globalBoard,
    selectedAcademicYear: globalYear,
    setSelectedBoard: setGlobalBoard,
    setSelectedAcademicYear: setGlobalYear,
  } = useAcademicContext();

  // Navigation & View States
  const [activeModule, setActiveModule] = useState("dashboard");
  const [selectedBoard, setSelectedBoardState] = useState(globalBoard?.code || globalBoard?.name || "BIEAP");
  const [selectedYear, setSelectedYearState] = useState(globalYear?.code || globalYear?.label || "2025-2026");

  useEffect(() => {
    if (globalBoard) setSelectedBoardState(globalBoard.code || globalBoard.name || "BIEAP");
  }, [globalBoard]);

  useEffect(() => {
    if (globalYear) setSelectedYearState(globalYear.code || globalYear.label || "2025-2026");
  }, [globalYear]);

  const setSelectedBoard = (val) => {
    setSelectedBoardState(val);
    setGlobalBoard(val);
  };

  const setSelectedYear = (val) => {
    setSelectedYearState(val);
    setGlobalYear(val);
  };

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [profileTab, setProfileTab] = useState("basic");

  // Detail Modal States
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);

  // Dynamic Interactive Local States
  const [attendanceState, setAttendanceState] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState("2025-05-16");
  const [attendanceSection, setAttendanceSection] = useState("c1");
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  useEffect(() => {
    if (activeModule === "attendance") {
      setIsAttendanceLoading(true);
      import('@/api/attendanceService.js').then(({ attendanceService }) => {
        attendanceService.getFacultySubjectAttendance({ date: attendanceDate, sectionId: attendanceSection === "c1" ? 1 : 2 })
          .then(res => {
            const data = res?.data?.data || res?.data || res || [];
            if (Array.isArray(data) && data.length > 0) {
              setAttendanceState(data.map(s => ({
                studentId: s.studentId || s.id,
                rollNo: s.rollNo || s.rollNumber || "N/A",
                name: s.studentName || s.name || "Unknown",
                status: s.status || s.morningStatus || "Present"
              })));
            } else {
              setAttendanceState(mockStudentsList.map((s) => ({ ...s, status: "Present", studentId: s.id || s.rollNo })));
            }
          })
          .catch(() => {
            setAttendanceState(mockStudentsList.map((s) => ({ ...s, status: "Present", studentId: s.id || s.rollNo })));
          })
          .finally(() => setIsAttendanceLoading(false));
      });
    }
  }, [activeModule, attendanceDate, attendanceSection]);
  const [marksState, setMarksState] = useState(mockStudentsList);
  const [examDutiesState, setExamDutiesState] = useState(mockExamDutiesList);
  const [leavesState, setLeavesState] = useState(() => getLeaveRequests().filter((leave) => leave.staffId === mockFaculty.employeeId));
  const [reimbursementsState, setReimbursementsState] = useState(mockReimbursementsList);
  const [messagesState, setMessagesState] = useState(mockMessagesHistory);
  const [newMessageText, setNewMessageText] = useState("");

  // Leave Form Local State
  const [leaveForm, setLeaveForm] = useState({
    type: "Casual Leave (CL)",
    from: "2025-05-20",
    to: "2025-05-20",
    days: 1,
    reason: "",
  });

  // Reimbursement Form Local State
  const [reimbForm, setReimbForm] = useState({
    type: "Books & Journals",
    amount: 1500,
    desc: "",
  });

  // Auto Toast helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    getLeaveRequests().then((data) => {
      if (isMounted) setLeavesState(data.filter((leave) => leave.staffId === mockFaculty.employeeId));
    }).catch(err => console.error(err));
    return () => { isMounted = false; };
  }, []);

  // Logout Handler
  const handleLogout = () => {
    try {
      clearAuthSession();
    } catch {
      /* storage unavailable */
    }
    showToast("Logging out of Faculty Portal...");
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 400);
  };

  // Nav Switcher
  const handleNavClick = (moduleName) => {
    setActiveModule(moduleName);
    setIsSidebarOpen(false);
    setIsProfileDropdownOpen(false);
  };

  // ------------------------------------------------------------------------
  // REUSABLE INTERNAL COMPONENTS
  // ------------------------------------------------------------------------

  const renderStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    let badgeClass = "paid";
    if (s.includes("pending") || s.includes("upcoming") || s.includes("draft") || s.includes("late")) {
      badgeClass = "pending";
    } else if (s.includes("rejected") || s.includes("absent")) {
      badgeClass = "rejected";
    }
    return <span className={`faculty-badge ${badgeClass}`}>{status}</span>;
  };

  const renderHeader = (title, subtitle, actions = null) => (
    <div className="faculty-page-header">
      <div className="faculty-page-title-group">
        <h1>{title}</h1>
        {subtitle ? <p className="faculty-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="faculty-page-actions">{actions}</div> : null}
    </div>
  );

  // Donut Chart Data
  const chartData = [
    { name: "Net Salary (Take Home)", value: mockSalaryData.netSalary },
    { name: "Total Deductions", value: mockSalaryData.totalDeductions },
  ];

  // ------------------------------------------------------------------------
  // SCREEN 1 — FACULTY DASHBOARD VIEW
  // ------------------------------------------------------------------------
  const renderDashboardView = () => (
    <div>
      {renderHeader(
        "Faculty Dashboard",
        `Welcome back, ${mockFaculty.fullName}! Have a great day.`,
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--faculty-card-bg)", padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--faculty-border)", fontSize: "12px", fontWeight: 700 }}>
          <Calendar size={14} style={{ color: "var(--faculty-primary)" }} />
          <span>Today: 16 May 2025, Friday</span>
        </div>
      )}

      {/* TOP 4 SALARY KPI CARDS */}
      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card tint-green" onClick={() => handleNavClick("salary")}>
          <div className="faculty-kpi-icon"><Wallet size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Basic Pay (Monthly)</span>
            <span className="faculty-kpi-value">₹{mockSalaryData.basicPay.toLocaleString("en-IN")}</span>
            <span className="faculty-kpi-sub">Fixed component</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-blue" onClick={() => handleNavClick("salary")}>
          <div className="faculty-kpi-icon"><DollarSign size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Net Salary (This Month)</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-success)" }}>
              ₹{mockSalaryData.netSalary.toLocaleString("en-IN")}
            </span>
            <span className="faculty-kpi-sub">After all deductions</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-orange" onClick={() => handleNavClick("payslips")}>
          <div className="faculty-kpi-icon"><CheckCircle size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Last Payment Date</span>
            <span className="faculty-kpi-value" style={{ fontSize: "17px" }}>{mockSalaryData.lastPaymentDate}</span>
            <span className="faculty-kpi-sub">Salary credited</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-purple" onClick={() => handleNavClick("payslips")}>
          <div className="faculty-kpi-icon"><Clock size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Next Salary Date</span>
            <span className="faculty-kpi-value" style={{ fontSize: "17px" }}>{mockSalaryData.nextSalaryDate}</span>
            <span className="faculty-kpi-sub">Expected credit date</span>
          </div>
        </div>
      </div>

      {/* ADDITIONAL FACULTY KPI METRICS */}
      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card" onClick={() => handleNavClick("timetable")}>
          <div className="faculty-kpi-icon"><BookOpen size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Today's Classes</span>
            <span className="faculty-kpi-value">4 Classes</span>
            <span className="faculty-kpi-sub">Next at 10:00 AM</span>
          </div>
        </div>

        <div className="faculty-kpi-card" onClick={() => handleNavClick("attendance")}>
          <div className="faculty-kpi-icon"><UserCheck size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Attendance This Month</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-primary)" }}>96%</span>
            <span className="faculty-kpi-sub">Avg Class Present Rate</span>
          </div>
        </div>

        <div className="faculty-kpi-card" onClick={() => handleNavClick("marks")}>
          <div className="faculty-kpi-icon"><ClipboardCheck size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Pending Marks Entry</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-warning)" }}>2 Units</span>
            <span className="faculty-kpi-sub">UT-2 Internal Marks</span>
          </div>
        </div>

        <div className="faculty-kpi-card" onClick={() => handleNavClick("leave")}>
          <div className="faculty-kpi-icon"><CalendarOff size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Leave Balance</span>
            <span className="faculty-kpi-value">8 Days</span>
            <span className="faculty-kpi-sub">4 CL • 3 SL • 1 EL</span>
          </div>
        </div>
      </div>

      {/* SALARY OVERVIEW PANEL */}
      <div className="faculty-card">
        <div className="faculty-card-header">
          <h3 className="faculty-card-title"><Wallet size={16} /> Salary Overview (May 2025)</h3>
          <span className="faculty-card-link" onClick={() => handleNavClick("salary")}>
            View Full Salary Details <ChevronRight size={14} />
          </span>
        </div>

        <div className="faculty-salary-overview-grid">
          {/* DONUT CHART */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", height: 180, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} dataKey="value" stroke="none">
                    <Cell fill="#6F8400" />
                    <Cell fill="#D93636" />
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <span style={{ fontSize: "10px", color: "var(--faculty-muted)", textTransform: "uppercase", fontWeight: 700 }}>Net Pay</span>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--faculty-success)" }}>₹58,460</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: 600, marginTop: "8px" }}>
              <span style={{ color: "#6F8400" }}>● Take Home (80%)</span>
              <span style={{ color: "#D93636" }}>● Deductions (20%)</span>
            </div>
          </div>

          {/* EARNINGS COLUMN */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--faculty-primary)", marginBottom: "8px" }}>Monthly Earnings Breakdown</div>
            <div className="faculty-breakdown-list">
              <div className="faculty-breakdown-item"><span>Basic Pay</span><strong>₹52,000</strong></div>
              <div className="faculty-breakdown-item"><span>HRA (House Rent)</span><span>₹10,400</span></div>
              <div className="faculty-breakdown-item"><span>Dearness Allowance (DA)</span><span>₹5,200</span></div>
              <div className="faculty-breakdown-item"><span>Academic Allowance</span><span>₹3,000</span></div>
              <div className="faculty-breakdown-item"><span>Transport Allowance</span><span>₹1,600</span></div>
              <div className="faculty-breakdown-item"><span>Other Allowances</span><span>₹1,000</span></div>
              <div className="faculty-breakdown-item total">
                <span>Gross Salary</span>
                <strong style={{ color: "var(--faculty-primary-dark)" }}>₹73,200</strong>
              </div>
            </div>
          </div>

          {/* DEDUCTIONS COLUMN */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--faculty-danger)", marginBottom: "8px" }}>Monthly Deductions Breakdown</div>
            <div className="faculty-breakdown-list">
              <div className="faculty-breakdown-item"><span>PF Contribution (12%)</span><span>₹6,240</span></div>
              <div className="faculty-breakdown-item"><span>Professional Tax (PT)</span><span>₹200</span></div>
              <div className="faculty-breakdown-item"><span>Income Tax (TDS)</span><span>₹3,800</span></div>
              <div className="faculty-breakdown-item"><span>Group Insurance</span><span>₹500</span></div>
              <div className="faculty-breakdown-item"><span>LOP (1 Day)</span><span>₹2,000</span></div>
              <div className="faculty-breakdown-item"><span>Other Deductions</span><span>₹1,000</span></div>
              <div className="faculty-breakdown-item total">
                <span>Total Deductions</span>
                <strong style={{ color: "var(--faculty-danger)" }}>₹13,740</strong>
              </div>
            </div>
          </div>
        </div>

        {/* NET SALARY FORMULA BANNER */}
        <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--faculty-primary-soft)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>
            <span>Formula: </span>
            <strong style={{ color: "var(--faculty-text)" }}>Net Salary = Gross Salary (₹73,200) - Total Deductions (₹13,740)</strong>
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--faculty-success)" }}>
            Net Monthly Outflow: ₹58,460
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="faculty-quick-bar">
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--faculty-text)" }}>Quick Actions:</span>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("salary")}><Wallet size={13} /> Salary Details</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("payslips")}><FileText size={13} /> All Payslips</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("timetable")}><Calendar size={13} /> My Timetable</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("attendance")}><UserCheck size={13} /> Mark Attendance</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("marks")}><ClipboardCheck size={13} /> Enter Marks</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("leave")}><CalendarOff size={13} /> Apply Leave</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("reimbursements")}><Receipt size={13} /> Reimbursements</button>
        <button type="button" className="faculty-btn faculty-btn-ghost" onClick={() => handleNavClick("notices")}><Bell size={13} /> Notices</button>
      </div>

      {/* LATEST PAYSLIP & UPCOMING DATES GRID */}
      <div className="faculty-form-grid-2" style={{ marginBottom: "20px" }}>
        {/* LATEST PAYSLIP CARD */}
        <div className="faculty-card" style={{ marginBottom: 0 }}>
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><FileText size={16} /> Latest Payslip</h3>
            <span className="faculty-card-link" onClick={() => handleNavClick("payslips")}>View All Payslips →</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--faculty-subtle)", padding: "14px", borderRadius: "10px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800 }}>April 2025 Payslip</div>
              <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>Paid on: 30 Apr 2025</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--faculty-success)" }}>₹58,460</div>
              {renderStatusBadge("Paid")}
            </div>
          </div>
          <button
            type="button"
            className="faculty-btn faculty-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              setSelectedPayslip(mockPayslips[1]);
              handleNavClick("payslips");
            }}
          >
            <Eye size={14} /> View & Print April Payslip
          </button>
        </div>

        {/* UPCOMING SALARY DATES CARD */}
        <div className="faculty-card" style={{ marginBottom: 0 }}>
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><Clock size={16} /> Upcoming Salary Dates</h3>
          </div>
          <div className="faculty-breakdown-list">
            <div className="faculty-breakdown-item">
              <div>
                <strong>Salary for May 2025</strong>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Expected Disbursement</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>31 May 2025</span>
                <div>{renderStatusBadge("Upcoming")}</div>
              </div>
            </div>

            <div className="faculty-breakdown-item">
              <div>
                <strong>Salary for Jun 2025</strong>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Expected Disbursement</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>30 Jun 2025</span>
                <div>{renderStatusBadge("Upcoming")}</div>
              </div>
            </div>

            <div className="faculty-breakdown-item">
              <div>
                <strong>Salary for Jul 2025</strong>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Expected Disbursement</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>31 Jul 2025</span>
                <div>{renderStatusBadge("Upcoming")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT PAYSLIPS TABLE */}
      <div className="faculty-card">
        <div className="faculty-card-header">
          <h3 className="faculty-card-title"><FileSpreadsheet size={16} /> Recent Salary Payslips History</h3>
        </div>
        <div className="faculty-table-wrap">
          <table className="faculty-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Gross Salary</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockPayslips.map((ps) => (
                <tr key={ps.id}>
                  <td><strong>{ps.month}</strong></td>
                  <td>₹{ps.grossSalary.toLocaleString("en-IN")}</td>
                  <td style={{ color: "var(--faculty-danger)" }}>₹{ps.totalDeductions.toLocaleString("en-IN")}</td>
                  <td><strong style={{ color: "var(--faculty-success)" }}>₹{ps.netSalary.toLocaleString("en-IN")}</strong></td>
                  <td>{ps.paymentDate}</td>
                  <td>{renderStatusBadge(ps.status)}</td>
                  <td>
                    <button
                      type="button"
                      className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                      onClick={() => {
                        setSelectedPayslip(ps);
                        handleNavClick("payslips");
                      }}
                    >
                      <Eye size={12} /> View Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HELP CARD */}
      <div className="faculty-card" style={{ background: "var(--faculty-primary-soft)", border: "1px dashed var(--faculty-primary)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "var(--faculty-primary-dark)" }}>Need Help with Salary or Tax Deductions?</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--faculty-muted)" }}>
              For any salary structure queries, PF updates, or TDS tax declarations, please contact the Accounts Department.
            </p>
          </div>
          <button
            type="button"
            className="faculty-btn faculty-btn-primary"
            onClick={() => showToast("Accounts Department contact details: accounts@pirnavcollege.edu | Ext: 402")}
          >
            <HelpCircle size={14} /> Contact Accounts
          </button>
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 2 — MY PROFILE VIEW
  // ------------------------------------------------------------------------
  const renderProfileView = () => {
    return (
      <div>
        {renderHeader("My Profile", "View and manage your faculty profile information.")}

        {/* HEADER PROFILE CARD */}
        <div className="faculty-card" style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div className="faculty-avatar" style={{ width: "70px", height: "70px", fontSize: "24px" }}>
            RK
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>{mockFaculty.fullName}</h2>
              {renderStatusBadge("Active")}
            </div>
            <div style={{ fontSize: "13px", color: "var(--faculty-muted)", marginTop: "4px" }}>
              Employee ID: <strong>{mockFaculty.employeeId}</strong> • {mockFaculty.designation} ({mockFaculty.department} Dept)
            </div>
            <div style={{ fontSize: "12px", color: "var(--faculty-muted)", marginTop: "2px" }}>
              Joined: {mockFaculty.dateOfJoining} • Email: {mockFaculty.email}
            </div>
          </div>
          <div style={{ background: "var(--faculty-subtle)", padding: "12px 18px", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--faculty-muted)", fontWeight: 700 }}>PROFILE COMPLETION</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--faculty-primary)" }}>{mockFaculty.profileCompletion}%</div>
          </div>
        </div>

        {/* PROFILE TABS NAVBAR */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "16px" }}>
          {[
            { id: "basic", label: "Basic Info" },
            { id: "contact", label: "Contact Details" },
            { id: "pro", label: "Professional Details" },
            { id: "qual", label: "Qualifications" },
            { id: "exp", label: "Experience" },
            { id: "docs", label: "Documents" },
            { id: "bank", label: "Bank Details" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`faculty-btn ${profileTab === tab.id ? "faculty-btn-primary" : "faculty-btn-ghost"}`}
              style={{ padding: "6px 14px", fontSize: "12px" }}
              onClick={() => setProfileTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT PANELS */}
        <div className="faculty-card">
          {profileTab === "basic" && (
            <div className="faculty-form-grid-3">
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Employee ID</span><div><strong>{mockFaculty.employeeId}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Full Name</span><div><strong>{mockFaculty.fullName}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Gender</span><div><strong>{mockFaculty.gender}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Date of Birth</span><div><strong>{mockFaculty.dob}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Blood Group</span><div><strong>{mockFaculty.bloodGroup}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Department</span><div><strong>{mockFaculty.department}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Designation</span><div><strong>{mockFaculty.designation}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Date of Joining</span><div><strong>{mockFaculty.dateOfJoining}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Aadhaar Number</span><div><strong>{mockFaculty.aadhaarMasked}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>PAN Card</span><div><strong>{mockFaculty.panMasked}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Employment Type</span><div><strong>Permanent Full-Time</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Status</span><div>{renderStatusBadge("Active")}</div></div>
            </div>
          )}

          {profileTab === "contact" && (
            <div className="faculty-form-grid-2">
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Official Mobile</span><div><strong>+91 {mockFaculty.mobile}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Alternate Mobile</span><div><strong>+91 {mockFaculty.altMobile}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>College Email</span><div><strong>{mockFaculty.email}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Personal Email</span><div><strong>{mockFaculty.personalEmail}</strong></div></div>
              <div style={{ gridColumn: "span 2" }}><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Residential Address</span><div><strong>{mockFaculty.address}</strong></div></div>
            </div>
          )}

          {profileTab === "pro" && (
            <div className="faculty-form-grid-3">
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Subjects Can Teach</span><div><strong>Mathematics, Statistics</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Specialization</span><div><strong>Calculus & Algebra</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Class Teacher</span><div><strong>MPC 1st Year Sec A</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Max Weekly Workload</span><div><strong>20 Hours / Week</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Research Interest</span><div><strong>Applied Differential Equations</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Memberships</span><div><strong>AMTI, IMS Life Member</strong></div></div>
            </div>
          )}

          {profileTab === "qual" && (
            <div className="faculty-table-wrap">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Degree</th>
                    <th>Specialization</th>
                    <th>University / Board</th>
                    <th>Year</th>
                    <th>CGPA / %</th>
                    <th>Document</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>M.Sc Mathematics</strong></td>
                    <td>Pure & Applied Maths</td>
                    <td>Osmania University</td>
                    <td>2018</td>
                    <td>8.8 CGPA</td>
                    <td>{renderStatusBadge("Verified")}</td>
                  </tr>
                  <tr>
                    <td><strong>B.Ed Education</strong></td>
                    <td>Mathematics Pedagogy</td>
                    <td>Kakatiya University</td>
                    <td>2019</td>
                    <td>82.4%</td>
                    <td>{renderStatusBadge("Verified")}</td>
                  </tr>
                  <tr>
                    <td><strong>CSIR NET Qualified</strong></td>
                    <td>Mathematical Sciences</td>
                    <td>NTA / CSIR</td>
                    <td>2020</td>
                    <td>AIR 142</td>
                    <td>{renderStatusBadge("Verified")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {profileTab === "exp" && (
            <div className="faculty-table-wrap">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Designation</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Total Exp</th>
                    <th>Document</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Sri Chaitanya Junior College</strong></td>
                    <td>Lecturer Mathematics</td>
                    <td>Jul 2021</td>
                    <td>May 2024</td>
                    <td>2 Years 11 Months</td>
                    <td>{renderStatusBadge("Verified")}</td>
                  </tr>
                  <tr>
                    <td><strong>PIRNAV College</strong></td>
                    <td>Junior Lecturer</td>
                    <td>Jun 2024</td>
                    <td>Present</td>
                    <td>1 Year</td>
                    <td>{renderStatusBadge("Active")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {profileTab === "docs" && (
            <div className="faculty-form-grid-3">
              {[
                { name: "Aadhaar Card Copy", status: "Verified" },
                { name: "PAN Card Copy", status: "Verified" },
                { name: "M.Sc Degree Certificate", status: "Verified" },
                { name: "NET Qualification Certificate", status: "Verified" },
                { name: "Relieving & Exp Letter", status: "Verified" },
                { name: "Recent Passport Photo", status: "Uploaded" },
              ].map((doc) => (
                <div key={doc.name} style={{ padding: "12px", border: "1px solid var(--faculty-border)", borderRadius: "10px", background: "var(--faculty-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "13px" }}>{doc.name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>PDF Document</div>
                  </div>
                  {renderStatusBadge(doc.status)}
                </div>
              ))}
            </div>
          )}

          {profileTab === "bank" && (
            <div className="faculty-form-grid-3">
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Bank Name</span><div><strong>{mockFaculty.bankName}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Account Holder</span><div><strong>{mockFaculty.accountHolder}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Account Number</span><div><strong>{mockFaculty.accountMasked}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>IFSC Code</span><div><strong>{mockFaculty.ifsc}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Branch</span><div><strong>{mockFaculty.branch}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>UAN Number</span><div><strong>{mockFaculty.uan}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>PF Number</span><div><strong>{mockFaculty.pfNumber}</strong></div></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 3 — MY TIMETABLE VIEW
  // ------------------------------------------------------------------------
  const renderTimetableView = () => (
    <div>
      {renderHeader("My Timetable", "View your weekly teaching schedule.")}

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 700 }}>Board:</span>
          <select value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--faculty-border)", fontSize: "12px" }}>
            <option value="BIEAP">BIEAP</option>
            <option value="TSBIE">TSBIE</option>
            <option value="CBSE">CBSE</option>
          </select>

          <span style={{ fontSize: "12px", fontWeight: 700, marginLeft: "8px" }}>Academic Year:</span>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--faculty-border)", fontSize: "12px" }}>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
          </select>
        </div>

        <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>
          Total Assigned Teaching Workload: <strong>18 Hours / Week</strong>
        </div>
      </div>

      <div className="faculty-card" style={{ padding: "14px" }}>
        <div className="faculty-timetable-grid">
          <div style={{ fontWeight: 800, fontSize: "12px", color: "var(--faculty-muted)", padding: "10px" }}>TIME</div>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
            <div key={d} style={{ fontWeight: 800, fontSize: "12px", color: "var(--faculty-primary-dark)", padding: "10px", textAlign: "center" }}>{d}</div>
          ))}

          {mockTimetableSlots.map((row, idx) => (
            <React.Fragment key={idx}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--faculty-muted)", padding: "10px 4px", display: "flex", alignItems: "center" }}>
                {row.time}
              </div>
              {["mon", "tue", "wed", "thu", "fri", "sat"].map((dayKey) => {
                const slot = row[dayKey];
                return (
                  <div key={dayKey} className={`faculty-timetable-cell ${slot ? "class-slot" : ""}`}>
                    {slot ? (
                      <div>
                        <strong style={{ color: "var(--faculty-primary-dark)" }}>{slot.subject}</strong>
                        <div style={{ fontSize: "11px", fontWeight: 600 }}>{slot.class} ({slot.sec})</div>
                        <div style={{ fontSize: "10px", color: "var(--faculty-muted)" }}>{slot.room}</div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--faculty-border)", fontSize: "10px" }}>Free Slot</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 4 — MY CLASSES VIEW
  // ------------------------------------------------------------------------
  const renderClassesView = () => (
    <div>
      {renderHeader("My Classes", "Manage your assigned class sections and student rosters.")}

      <div className="faculty-form-grid-2" style={{ marginBottom: "20px" }}>
        {mockClassesList.map((cls) => (
          <div key={cls.id} className="faculty-card" style={{ marginBottom: 0 }}>
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><BookOpen size={16} /> {cls.className} ({cls.sec})</h3>
              <span className="faculty-badge active">{cls.group}</span>
            </div>
            <div className="faculty-breakdown-list" style={{ marginBottom: "14px" }}>
              <div className="faculty-breakdown-item"><span>Subject</span><strong>{cls.subject}</strong></div>
              <div className="faculty-breakdown-item"><span>Academic Level</span><span>{cls.level}</span></div>
              <div className="faculty-breakdown-item"><span>Total Students</span><strong>{cls.totalStudents} Students</strong></div>
              <div className="faculty-breakdown-item"><span>Today's Attendance</span><strong style={{ color: "var(--faculty-success)" }}>{cls.todayAttendance}</strong></div>
              <div className="faculty-breakdown-item"><span>Next Class</span><span>{cls.nextClass}</span></div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="faculty-btn faculty-btn-primary faculty-btn-sm"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setSelectedClassDetail(cls)}
              >
                <Users size={12} /> View Roster
              </button>
              <button
                type="button"
                className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => handleNavClick("attendance")}
              >
                <UserCheck size={12} /> Attendance
              </button>
              <button
                type="button"
                className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => handleNavClick("marks")}
              >
                <ClipboardCheck size={12} /> Marks
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedClassDetail && (
        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><Users size={16} /> Student Roster — {selectedClassDetail.className} ({selectedClassDetail.sec})</h3>
            <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => setSelectedClassDetail(null)}>Close Roster</button>
          </div>
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Attendance %</th>
                  <th>Internal Marks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockStudentsList.map((s) => (
                  <tr key={s.rollNo}>
                    <td><strong>{s.rollNo}</strong></td>
                    <td>{s.name}</td>
                    <td><strong style={{ color: "var(--faculty-success)" }}>{s.attendancePct}</strong></td>
                    <td>{s.marks} / 50</td>
                    <td>{renderStatusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 5 — ATTENDANCE VIEW
  // ------------------------------------------------------------------------
  const renderAttendanceView = () => {
    const handleToggleAllPresent = () => {
      setAttendanceState((prev) => prev.map((s) => ({ ...s, status: "Present" })));
      showToast("All students marked Present.");
    };

    const handleSaveAttendance = () => {
      import('@/api/attendanceService.js').then(({ attendanceService }) => {
        const payload = attendanceState.map(s => ({
          studentId: s.studentId || 1, // Fallback if missing
          attendanceDate: attendanceDate,
          morningStatus: s.status === "Present" ? 1 : s.status === "Absent" ? 2 : 3,
          afternoonStatus: s.status === "Present" ? 1 : s.status === "Absent" ? 2 : 3,
        }));
        attendanceService.saveFacultySubjectAttendance(payload).then(() => {
          showToast("Attendance saved successfully!");
        }).catch(() => {
          showToast("Attendance saved (mock)!");
        });
      });
    };

    return (
      <div>
        {renderHeader("Student Attendance", "Mark and review attendance for your assigned classes.")}

        <div className="faculty-card" style={{ marginBottom: "16px" }}>
          <div className="faculty-form-grid-3">
            <div className="faculty-form-group">
              <label>Select Date</label>
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>
            <div className="faculty-form-group">
              <label>Class Section</label>
              <select value={attendanceSection} onChange={(e) => setAttendanceSection(e.target.value)}>
                <option value="c1">MPC 1st Year — Section A</option>
                <option value="c2">MPC 2nd Year — Section B</option>
              </select>
            </div>
            <div className="faculty-form-group">
              <label>Subject</label>
              <input type="text" value="Mathematics I-A" readOnly />
            </div>
          </div>
        </div>

        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><UserCheck size={16} /> Mark Attendance Roster ({attendanceDate})</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={handleToggleAllPresent} disabled={isAttendanceLoading}>Mark All Present</button>
              <button type="button" className="faculty-btn faculty-btn-primary faculty-btn-sm" onClick={handleSaveAttendance} disabled={isAttendanceLoading}>{isAttendanceLoading ? "Loading..." : "Save Attendance"}</button>
            </div>
          </div>

          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Status Toggle</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceState.map((st, idx) => (
                  <tr key={st.rollNo}>
                    <td><strong>{st.rollNo}</strong></td>
                    <td>{st.name}</td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        {["Present", "Absent", "Late"].map((stt) => (
                          <label key={stt} style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                              type="radio"
                              name={`att-${st.rollNo}`}
                              checked={st.status === stt}
                              onChange={() => {
                                const copy = [...attendanceState];
                                copy[idx].status = stt;
                                setAttendanceState(copy);
                              }}
                            />
                            <span style={{ fontWeight: st.status === stt ? 700 : 400 }}>{stt}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        style={{ padding: "3px 8px", fontSize: "12px", border: "1px solid var(--faculty-border)", borderRadius: "6px" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 6 — STUDENT FEEDBACK VIEW
  // ------------------------------------------------------------------------
  const renderStudentFeedbackView = () => (
    <div>
      {renderHeader("Student Feedback", "Review student evaluation scores and anonymous feedback comments.")}

      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card tint-green">
          <div className="faculty-kpi-icon"><Award size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Overall Rating</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-primary-dark)" }}>4.8 / 5.0</span>
            <span className="faculty-kpi-sub">Top 5% Faculty</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><BookOpen size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Teaching Quality</span>
            <span className="faculty-kpi-value">4.9 / 5</span>
            <span className="faculty-kpi-sub">Clarity & Examples</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><Clock size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Punctuality</span>
            <span className="faculty-kpi-value">4.8 / 5</span>
            <span className="faculty-kpi-sub">Class Timing</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><Users size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Student Engagement</span>
            <span className="faculty-kpi-value">4.7 / 5</span>
            <span className="faculty-kpi-sub">Interactive Session</span>
          </div>
        </div>
      </div>

      <div className="faculty-card">
        <div className="faculty-card-header">
          <h3 className="faculty-card-title"><MessageSquareQuote size={16} /> Recent Student Feedback Reviews</h3>
        </div>
        <div className="faculty-form-grid-2">
          {mockFeedbackData.reviews.map((rev) => (
            <div key={rev.id} style={{ padding: "14px", border: "1px solid var(--faculty-border)", borderRadius: "10px", background: "var(--faculty-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <strong style={{ fontSize: "13px" }}>{rev.anonymous ? "Anonymous Student" : "Student"}</strong>
                <span style={{ color: "var(--faculty-warning)", fontWeight: 700 }}>★ {rev.rating}.0 / 5.0</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--faculty-text)", margin: "0 0 8px 0" }}>"{rev.comment}"</p>
              <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>
                Category: <strong>{rev.category}</strong> • Date: {rev.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 7 — INTERNAL MARKS VIEW
  // ------------------------------------------------------------------------
  const renderInternalMarksView = () => {
    const handleMarksChange = (idx, val) => {
      const num = Number(val);
      if (num < 0 || num > 50) {
        showToast("Validation Error: Marks must be between 0 and 50.");
        return;
      }
      const copy = [...marksState];
      copy[idx].marks = num;
      setMarksState(copy);
    };

    const handleSaveMarks = () => {
      showToast("Internal Marks submitted successfully!");
    };

    return (
      <div>
        {renderHeader("Internal Marks", "Enter and submit internal test assessment marks.")}

        <div className="faculty-card" style={{ marginBottom: "16px" }}>
          <div className="faculty-form-grid-3">
            <div className="faculty-form-group">
              <label>Class & Section</label>
              <select defaultValue="MPC 1st Year Sec A">
                <option value="MPC 1st Year Sec A">MPC 1st Year — Sec A</option>
                <option value="MPC 2nd Year Sec B">MPC 2nd Year — Sec B</option>
              </select>
            </div>
            <div className="faculty-form-group">
              <label>Assessment Type</label>
              <select defaultValue="Unit Test 2">
                <option value="Unit Test 1">Unit Test 1</option>
                <option value="Unit Test 2">Unit Test 2</option>
                <option value="Mid Term">Mid Term Exam</option>
              </select>
            </div>
            <div className="faculty-form-group">
              <label>Max Marks</label>
              <input type="number" value={50} readOnly />
            </div>
          </div>
        </div>

        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><ClipboardCheck size={16} /> Unit Test 2 Marks Entry (Max 50)</h3>
            <button type="button" className="faculty-btn faculty-btn-primary faculty-btn-sm" onClick={handleSaveMarks}>
              Submit Marks
            </button>
          </div>

          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Max Marks</th>
                  <th>Marks Obtained</th>
                  <th>Percentage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {marksState.map((st, idx) => (
                  <tr key={st.rollNo}>
                    <td><strong>{st.rollNo}</strong></td>
                    <td>{st.name}</td>
                    <td>50</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={st.marks}
                        onChange={(e) => handleMarksChange(idx, e.target.value)}
                        style={{ width: "80px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--faculty-border)", fontSize: "13px", fontWeight: 700 }}
                      />
                    </td>
                    <td><strong>{Math.round((st.marks / 50) * 100)}%</strong></td>
                    <td>{renderStatusBadge(st.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 8 — EXAM DUTIES VIEW
  // ------------------------------------------------------------------------
  const renderExamDutiesView = () => {
    const handleConfirmDuty = (dutyId) => {
      setExamDutiesState((prev) =>
        prev.map((d) => (d.id === dutyId ? { ...d, status: "Confirmed" } : d))
      );
      showToast("Exam Duty confirmed successfully!");
    };

    return (
      <div>
        {renderHeader("Exam Duties", "Review assigned invigilation and evaluation duties.")}

        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title"><GraduationCap size={16} /> Assigned Examination Duties</h3>
          </div>
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Venue</th>
                  <th>Duty Type</th>
                  <th>Reporting</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {examDutiesState.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.exam}</strong></td>
                    <td>{d.date}</td>
                    <td>{d.time}</td>
                    <td>{d.venue}</td>
                    <td><span className="faculty-badge active">{d.type}</span></td>
                    <td>{d.reportingTime}</td>
                    <td>{renderStatusBadge(d.status)}</td>
                    <td>
                      {d.status === "Pending" ? (
                        <button
                          type="button"
                          className="faculty-btn faculty-btn-primary faculty-btn-sm"
                          onClick={() => handleConfirmDuty(d.id)}
                        >
                          Confirm Duty
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Confirmed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 9 — SALARY DETAILS VIEW
  // ------------------------------------------------------------------------
  const renderSalaryDetailsView = () => (
    <div>
      {renderHeader("Salary Details", "View your salary structure, monthly earnings and statutory deductions.")}

      {/* STRUCTURE HEADER BANNER */}
      <div className="faculty-card" style={{ background: "var(--faculty-subtle)", borderLeft: "4px solid var(--faculty-primary)" }}>
        <div className="faculty-form-grid-3">
          <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Current Structure</span><div><strong>Junior Lecturer Structure Grade A</strong></div></div>
          <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Effective From</span><div><strong>01 Apr 2025</strong></div></div>
          <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Payment Mode</span><div><strong>Bank Transfer (SBI)</strong></div></div>
        </div>
      </div>

      <div className="faculty-kpi-grid">
        <div className="faculty-kpi-card tint-green">
          <div className="faculty-kpi-icon"><Wallet size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Basic Pay</span>
            <span className="faculty-kpi-value">₹52,000</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><DollarSign size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Gross Salary</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-primary-dark)" }}>₹73,200</span>
          </div>
        </div>

        <div className="faculty-kpi-card">
          <div className="faculty-kpi-icon"><TrendingUp size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Total Deductions</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-danger)" }}>₹13,740</span>
          </div>
        </div>

        <div className="faculty-kpi-card tint-blue">
          <div className="faculty-kpi-icon"><CheckCircle size={20} /></div>
          <div className="faculty-kpi-content">
            <span className="faculty-kpi-label">Net Salary</span>
            <span className="faculty-kpi-value" style={{ color: "var(--faculty-success)" }}>₹58,460</span>
          </div>
        </div>
      </div>

      <div className="faculty-form-grid-2">
        {/* EARNINGS */}
        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title" style={{ color: "var(--faculty-primary)" }}>Full Monthly Earnings</h3>
          </div>
          <div className="faculty-breakdown-list">
            <div className="faculty-breakdown-item"><span>Basic Pay</span><strong>₹52,000</strong></div>
            <div className="faculty-breakdown-item"><span>HRA (House Rent Allowance)</span><span>₹10,400</span></div>
            <div className="faculty-breakdown-item"><span>Dearness Allowance (DA)</span><span>₹5,200</span></div>
            <div className="faculty-breakdown-item"><span>Academic / Research Allowance</span><span>₹3,000</span></div>
            <div className="faculty-breakdown-item"><span>Transport Allowance</span><span>₹1,600</span></div>
            <div className="faculty-breakdown-item"><span>Other Allowances</span><span>₹1,000</span></div>
            <div className="faculty-breakdown-item total"><span>Gross Earnings</span><strong style={{ color: "var(--faculty-primary-dark)" }}>₹73,200</strong></div>
          </div>
        </div>

        {/* DEDUCTIONS */}
        <div className="faculty-card">
          <div className="faculty-card-header">
            <h3 className="faculty-card-title" style={{ color: "var(--faculty-danger)" }}>Full Monthly Deductions</h3>
          </div>
          <div className="faculty-breakdown-list">
            <div className="faculty-breakdown-item"><span>Provident Fund (PF @ 12%)</span><span>₹6,240</span></div>
            <div className="faculty-breakdown-item"><span>Professional Tax (PT)</span><span>₹200</span></div>
            <div className="faculty-breakdown-item"><span>Income Tax (TDS)</span><span>₹3,800</span></div>
            <div className="faculty-breakdown-item"><span>Group Insurance</span><span>₹500</span></div>
            <div className="faculty-breakdown-item"><span>Loss of Pay (1 Day)</span><span>₹2,000</span></div>
            <div className="faculty-breakdown-item"><span>Other Deductions</span><span>₹1,000</span></div>
            <div className="faculty-breakdown-item total"><span>Total Deductions</span><strong style={{ color: "var(--faculty-danger)" }}>₹13,740</strong></div>
          </div>
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 10 — PAYSLIPS VIEW & PREVIEW
  // ------------------------------------------------------------------------
  const renderPayslipsView = () => {
    if (selectedPayslip) {
      return (
        <div>
          <button
            type="button"
            className="faculty-btn faculty-btn-ghost"
            style={{ marginBottom: "16px" }}
            onClick={() => setSelectedPayslip(null)}
          >
            <ArrowLeft size={14} /> Back to All Payslips
          </button>

          <div className="faculty-payslip-paper">
            <div className="faculty-payslip-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "var(--faculty-primary-dark)" }}>PIRNAV COLLEGE MANAGEMENT SYSTEM</h2>
                <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>Official Monthly Faculty Salary Voucher</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--faculty-primary)" }}>SALARY SLIP</div>
                <div style={{ fontSize: "12px", color: "var(--faculty-muted)" }}>Period: {selectedPayslip.month}</div>
              </div>
            </div>

            <div className="faculty-form-grid-3" style={{ background: "var(--faculty-subtle)", padding: "12px", borderRadius: "10px", marginBottom: "20px" }}>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Employee Name</span><div><strong>{mockFaculty.fullName}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Employee ID</span><div><strong>{mockFaculty.employeeId}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Designation</span><div><strong>{mockFaculty.designation}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Department</span><div><strong>{mockFaculty.department}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Bank Account</span><div><strong>{mockFaculty.accountMasked}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Txn Reference</span><div><strong>{selectedPayslip.txnRef}</strong></div></div>
            </div>

            <div className="faculty-form-grid-2">
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--faculty-primary)", marginBottom: "8px" }}>Earnings</div>
                <div className="faculty-breakdown-list">
                  <div className="faculty-breakdown-item"><span>Basic Pay</span><span>₹52,000</span></div>
                  <div className="faculty-breakdown-item"><span>HRA</span><span>₹10,400</span></div>
                  <div className="faculty-breakdown-item"><span>DA</span><span>₹5,200</span></div>
                  <div className="faculty-breakdown-item"><span>Allowances</span><span>₹5,600</span></div>
                  <div className="faculty-breakdown-item total"><span>Gross Earnings</span><strong>₹{selectedPayslip.grossSalary.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--faculty-danger)", marginBottom: "8px" }}>Deductions</div>
                <div className="faculty-breakdown-list">
                  <div className="faculty-breakdown-item"><span>PF Contribution</span><span>₹6,240</span></div>
                  <div className="faculty-breakdown-item"><span>Income Tax (TDS)</span><span>₹3,800</span></div>
                  <div className="faculty-breakdown-item"><span>PT & Insurance</span><span>₹700</span></div>
                  <div className="faculty-breakdown-item"><span>Other Deductions</span><span>₹3,000</span></div>
                  <div className="faculty-breakdown-item total"><span>Total Deductions</span><strong style={{ color: "var(--faculty-danger)" }}>₹{selectedPayslip.totalDeductions.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "2px solid var(--faculty-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)", textTransform: "uppercase" }}>NET AMOUNT REMITTED</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--faculty-success)" }}>₹{selectedPayslip.netSalary.toLocaleString("en-IN")}</div>
                <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>Fifty Eight Thousand Four Hundred Sixty Rupees Only</div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="faculty-btn faculty-btn-primary" onClick={() => window.print()}>
                  <Printer size={14} /> Print Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        {renderHeader("My Payslips", "View, print and download monthly payslips.")}

        <div className="faculty-card">
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockPayslips.map((ps) => (
                  <tr key={ps.id}>
                    <td><strong>{ps.month}</strong></td>
                    <td>₹{ps.grossSalary.toLocaleString("en-IN")}</td>
                    <td style={{ color: "var(--faculty-danger)" }}>₹{ps.totalDeductions.toLocaleString("en-IN")}</td>
                    <td><strong style={{ color: "var(--faculty-success)" }}>₹{ps.netSalary.toLocaleString("en-IN")}</strong></td>
                    <td>{ps.paymentDate}</td>
                    <td>{renderStatusBadge(ps.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="faculty-btn faculty-btn-primary faculty-btn-sm"
                          onClick={() => setSelectedPayslip(ps)}
                        >
                          <Eye size={12} /> View Slip
                        </button>
                        <button
                          type="button"
                          className="faculty-btn faculty-btn-ghost faculty-btn-sm"
                          onClick={() => showToast(`Downloaded ${ps.month} Payslip PDF!`)}
                        >
                          <Download size={12} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 11 — LEAVE REQUESTS VIEW
  // ------------------------------------------------------------------------
  const renderLeaveRequestsView = () => {
    const handleLeaveSubmit = (e) => {
      e.preventDefault();
      if (!leaveForm.reason.trim()) {
        showToast("Please enter a reason for leave application.");
        return;
      }
      const start = new Date(`${leaveForm.from}T00:00:00`);
      const end = new Date(`${leaveForm.to}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        showToast("Choose a valid leave date range.");
        return;
      }
      const requestedDays = Math.floor((end - start) / 86400000) + 1;
      const newLeave = submitLeaveRequest({
        staffId: mockFaculty.employeeId,
        staffName: mockFaculty.fullName,
        department: mockFaculty.department,
        staffType: "Teaching Staff",
        leaveType: leaveForm.type.replace(/ \([A-Z]+\)/, ""),
        fromDate: leaveForm.from,
        toDate: leaveForm.to,
        days: requestedDays,
        reason: leaveForm.reason,
      });
      setLeavesState((current) => [newLeave, ...current]);
      showToast("Leave request submitted successfully!");
      setLeaveForm({ ...leaveForm, reason: "" });
    };

    return (
      <div>
        {renderHeader("Leave Requests", "Apply for leave and track approval status.")}

        <div className="faculty-kpi-grid">
          <div className="faculty-kpi-card tint-green">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Casual Leave (CL)</span>
              <span className="faculty-kpi-value">4 / 8 Days</span>
            </div>
          </div>
          <div className="faculty-kpi-card tint-blue">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Sick Leave (SL)</span>
              <span className="faculty-kpi-value">3 / 6 Days</span>
            </div>
          </div>
          <div className="faculty-kpi-card tint-orange">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Earned Leave (EL)</span>
              <span className="faculty-kpi-value">1 / 4 Days</span>
            </div>
          </div>
          <div className="faculty-kpi-card tint-purple">
            <div className="faculty-kpi-content">
              <span className="faculty-kpi-label">Loss of Pay (LOP)</span>
              <span className="faculty-kpi-value">1 Day</span>
            </div>
          </div>
        </div>

        <div className="faculty-form-grid-2">
          {/* LEAVE FORM */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><CalendarOff size={16} /> Apply New Leave</h3>
            </div>
            <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="faculty-form-group">
                <label>Leave Type *</label>
                <select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                  <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                  <option value="Sick Leave (SL)">Sick Leave (SL)</option>
                  <option value="Earned Leave (EL)">Earned Leave (EL)</option>
                </select>
              </div>

              <div className="faculty-form-grid-2">
                <div className="faculty-form-group">
                  <label>From Date *</label>
                  <input type="date" value={leaveForm.from} onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })} />
                </div>
                <div className="faculty-form-group">
                  <label>To Date *</label>
                  <input type="date" value={leaveForm.to} onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })} />
                </div>
              </div>

              <div className="faculty-form-group">
                <label>Reason *</label>
                <textarea
                  rows="3"
                  placeholder="Enter reason for leave..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                />
              </div>

              <button type="submit" className="faculty-btn faculty-btn-primary">
                Submit Leave Application
              </button>
            </form>
          </div>

          {/* LEAVE HISTORY TABLE */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><Clock size={16} /> Leave History & Approvals</h3>
            </div>
            <div className="faculty-table-wrap">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leavesState.map((l) => (
                    <tr key={l.id}>
                      <td><strong>{l.leaveType}</strong></td>
                      <td>{l.fromDate}</td>
                      <td>{l.days} Day(s)</td>
                      <td>{renderStatusBadge(l.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 12 — REIMBURSEMENTS VIEW
  // ------------------------------------------------------------------------
  const renderReimbursementsView = () => {
    const handleReimbSubmit = (e) => {
      e.preventDefault();
      if (!reimbForm.amount) return;
      const newClaim = {
        id: `r-${Date.now()}`,
        claimId: `CLM${Math.floor(100000 + Math.random() * 900000)}`,
        type: reimbForm.type,
        claimAmount: Number(reimbForm.amount),
        approvedAmount: Number(reimbForm.amount),
        date: "Today",
        status: "Pending",
        month: "May 2025",
      };
      setReimbursementsState([newClaim, ...reimbursementsState]);
      showToast("Reimbursement claim submitted!");
      setReimbForm({ ...reimbForm, amount: 1500, desc: "" });
    };

    return (
      <div>
        {renderHeader("Reimbursements", "Apply for expense claims and view settlement history.")}

        <div className="faculty-form-grid-2">
          {/* CLAIM FORM */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><Receipt size={16} /> Apply for Reimbursement</h3>
            </div>
            <form onSubmit={handleReimbSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="faculty-form-group">
                <label>Reimbursement Category *</label>
                <select value={reimbForm.type} onChange={(e) => setReimbForm({ ...reimbForm, type: e.target.value })}>
                  <option value="Books & Journals">Books & Journals</option>
                  <option value="Academic Conference">Academic Conference</option>
                  <option value="Official Travel / Fuel">Official Travel / Fuel</option>
                  <option value="Internet Allowance">Internet Allowance</option>
                </select>
              </div>

              <div className="faculty-form-group">
                <label>Claim Amount (₹) *</label>
                <input
                  type="number"
                  value={reimbForm.amount}
                  onChange={(e) => setReimbForm({ ...reimbForm, amount: e.target.value })}
                />
              </div>

              <div className="faculty-form-group">
                <label>Description & Purpose</label>
                <textarea
                  rows="2"
                  placeholder="Enter details of expense..."
                  value={reimbForm.desc}
                  onChange={(e) => setReimbForm({ ...reimbForm, desc: e.target.value })}
                />
              </div>

              <button type="submit" className="faculty-btn faculty-btn-primary">
                Submit Reimbursement Claim
              </button>
            </form>
          </div>

          {/* CLAIM HISTORY TABLE */}
          <div className="faculty-card">
            <div className="faculty-card-header">
              <h3 className="faculty-card-title"><FileText size={16} /> Reimbursement Claims History</h3>
            </div>
            <div className="faculty-table-wrap">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursementsState.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.claimId}</strong></td>
                      <td>{r.type}</td>
                      <td>₹{r.claimAmount.toLocaleString("en-IN")}</td>
                      <td>{renderStatusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // SCREEN 13 — NOTICES VIEW
  // ------------------------------------------------------------------------
  const renderNoticesView = () => (
    <div>
      {renderHeader("College Notices", "Official announcements and circulars.")}

      <div className="faculty-form-grid-2">
        {mockNoticesList.map((n) => (
          <div key={n.id} className="faculty-card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span className="faculty-badge active">{n.category}</span>
              <span style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>{n.date}</span>
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 6px 0", color: "var(--faculty-text)" }}>{n.title}</h3>
            <p style={{ fontSize: "12px", color: "var(--faculty-muted)", margin: "0 0 10px 0", lineHeight: 1.5 }}>{n.desc}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
              <span>Posted by: <strong>{n.postedBy}</strong></span>
              <button type="button" className="faculty-btn faculty-btn-ghost faculty-btn-sm" onClick={() => showToast(`Opening Notice: ${n.title}`)}>
                Read Circular
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ------------------------------------------------------------------------
  // SCREEN 14 — MESSAGES VIEW
  // ------------------------------------------------------------------------
  const renderMessagesView = () => {
    const handleSendMessage = (e) => {
      e.preventDefault();
      if (!newMessageText.trim()) return;
      const newMsg = {
        id: `m-${Date.now()}`,
        sender: "Ravi Kumar",
        text: newMessageText,
        time: "Just now",
        self: true,
      };
      setMessagesState([...messagesState, newMsg]);
      setNewMessageText("");
    };

    return (
      <div>
        {renderHeader("Faculty Messages", "Internal communication with HOD and administration.")}

        <div className="faculty-card" style={{ padding: 0, overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr", height: "500px" }}>
          {/* CONVERSATION LIST */}
          <div style={{ borderRight: "1px solid var(--faculty-border)", background: "var(--faculty-subtle)" }}>
            <div style={{ padding: "14px", fontWeight: 800, borderBottom: "1px solid var(--faculty-border)", fontSize: "13px" }}>
              Conversations
            </div>
            <div>
              {mockConversationsList.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--faculty-border)",
                    background: i === 0 ? "var(--faculty-surface)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <strong style={{ fontSize: "13px" }}>{c.name}</strong>
                    <span style={{ fontSize: "10px", color: "var(--faculty-muted)" }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--faculty-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.lastMsg}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHAT MESSAGES */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "14px", borderBottom: "1px solid var(--faculty-border)", fontWeight: 800, fontSize: "13px" }}>
              Chat with HOD - Mathematics
            </div>
            <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {messagesState.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.self ? "flex-end" : "flex-start",
                    maxWidth: "70%",
                    background: m.self ? "var(--faculty-primary)" : "var(--faculty-subtle)",
                    color: m.self ? "#ffffff" : "var(--faculty-text)",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    fontSize: "13px",
                  }}
                >
                  <div>{m.text}</div>
                  <div style={{ fontSize: "10px", opacity: 0.8, textAlign: "right", marginTop: "4px" }}>{m.time}</div>
                </div>
              ))}
            </div>

            {/* COMPOSER */}
            <form onSubmit={handleSendMessage} style={{ padding: "12px", borderTop: "1px solid var(--faculty-border)", display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--faculty-border)", fontSize: "13px" }}
              />
              <button type="submit" className="faculty-btn faculty-btn-primary">
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------------
  // RENDER DYNAMIC MODULE CONTENT
  // ------------------------------------------------------------------------
  const renderModuleContent = () => {
    switch (activeModule) {
      case "dashboard": return renderDashboardView();
      case "profile": return renderProfileView();
      case "timetable": return renderTimetableView();
      case "classes": return renderClassesView();
      case "attendance": return renderAttendanceView();
      case "feedback": return renderStudentFeedbackView();
      case "marks": return renderInternalMarksView();
      case "exam-duties": return renderExamDutiesView();
      case "salary": return renderSalaryDetailsView();
      case "payslips": return renderPayslipsView();
      case "leave": return renderLeaveRequestsView();
      case "reimbursements": return renderReimbursementsView();
      case "notices": return renderNoticesView();
      case "messages": return renderMessagesView();
      default: return renderDashboardView();
    }
  };

  // ------------------------------------------------------------------------
  // MAIN RETURN JSX
  // ------------------------------------------------------------------------
  return (
    <div className={`faculty-dashboard ${isDarkMode ? "is-dark" : ""}`}>
      <div className="faculty-shell">
        {/* SIDEBAR NAVIGATION */}
        <aside className={`faculty-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="faculty-sidebar-header">
            <div className="faculty-logo-icon">P</div>
            <div className="faculty-logo-text">
              <span className="faculty-logo-title">PIRNAV</span>
              <span className="faculty-logo-sub">Faculty Portal</span>
            </div>
          </div>

          <div className="faculty-sidebar-nav">
            <div>
              <div className="faculty-nav-group-title">Faculty Portal</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "dashboard" ? "active" : ""}`} onClick={() => handleNavClick("dashboard")}>
                    <LayoutDashboard size={16} /> Dashboard
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "profile" ? "active" : ""}`} onClick={() => handleNavClick("profile")}>
                    <User size={16} /> My Profile
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Academics</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "timetable" ? "active" : ""}`} onClick={() => handleNavClick("timetable")}>
                    <Calendar size={16} /> My Timetable
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "classes" ? "active" : ""}`} onClick={() => handleNavClick("classes")}>
                    <BookOpen size={16} /> My Classes
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "attendance" ? "active" : ""}`} onClick={() => handleNavClick("attendance")}>
                    <UserCheck size={16} /> Attendance
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "feedback" ? "active" : ""}`} onClick={() => handleNavClick("feedback")}>
                    <MessageSquareQuote size={16} /> Student Feedback
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Exam & Marks</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "marks" ? "active" : ""}`} onClick={() => handleNavClick("marks")}>
                    <ClipboardCheck size={16} /> Internal Marks
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "exam-duties" ? "active" : ""}`} onClick={() => handleNavClick("exam-duties")}>
                    <GraduationCap size={16} /> Exam Duties
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Payroll & Salary</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "salary" ? "active" : ""}`} onClick={() => handleNavClick("salary")}>
                    <Wallet size={16} /> Salary Details
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "payslips" ? "active" : ""}`} onClick={() => handleNavClick("payslips")}>
                    <FileText size={16} /> Payslips
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Requests</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "leave" ? "active" : ""}`} onClick={() => handleNavClick("leave")}>
                    <CalendarOff size={16} /> Leave Requests
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "reimbursements" ? "active" : ""}`} onClick={() => handleNavClick("reimbursements")}>
                    <Receipt size={16} /> Reimbursements
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="faculty-nav-group-title">Communication</div>
              <ul className="faculty-nav-list">
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "notices" ? "active" : ""}`} onClick={() => handleNavClick("notices")}>
                    <Bell size={16} /> Notices
                  </button>
                </li>
                <li className="faculty-nav-item">
                  <button className={`faculty-nav-btn ${activeModule === "messages" ? "active" : ""}`} onClick={() => handleNavClick("messages")}>
                    <Send size={16} /> Messages
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="faculty-sidebar-footer">
            <button className="faculty-nav-btn" style={{ color: "var(--faculty-danger)" }} onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <div className="faculty-main">
          {/* TOP NAVBAR */}
          <header className="faculty-navbar">
            <div className="faculty-nav-left">
              <button type="button" className="faculty-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu size={20} />
              </button>

              <div className="faculty-search-box">
                <Search3DIcon size={15} />
                <input
                  type="text"
                  placeholder="Search classes, students, notices, payslips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="faculty-nav-right">
              {/* BOARD SELECTOR */}
              <div className="faculty-select-pill">
                <span>Board:</span>
                <select value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value)}>
                  <option value="BIEAP">BIEAP</option>
                  <option value="TSBIE">TSBIE</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="NIOS">NIOS</option>
                </select>
              </div>

              {/* ACADEMIC YEAR SELECTOR */}
              <div className="faculty-select-pill">
                <span>Year:</span>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </div>

              {/* DARK MODE TOGGLE */}
              <button
                type="button"
                className="faculty-icon-btn"
                title="Toggle Dark Mode"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* NOTIFICATION BELL */}
              <button
                type="button"
                className="faculty-icon-btn"
                title="Notifications"
                onClick={() => handleNavClick("notices")}
              >
                <Bell size={17} />
                <span className="faculty-badge-dot" />
              </button>

              {/* FACULTY PROFILE DROPDOWN */}
              <div style={{ position: "relative" }}>
                <div className="faculty-user-menu" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}>
                  <div className="faculty-avatar">RK</div>
                  <div className="faculty-user-info">
                    <span className="faculty-user-name">{mockFaculty.fullName}</span>
                    <span className="faculty-user-role">{mockFaculty.designation}</span>
                  </div>
                  <ChevronDown size={14} style={{ color: "var(--faculty-muted)", marginLeft: "2px" }} />
                </div>

                {isProfileDropdownOpen && (
                  <div className="faculty-user-dropdown-menu">
                    <div className="faculty-dropdown-header">
                      <div className="faculty-avatar" style={{ width: "32px", height: "32px", fontSize: "12px" }}>RK</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>{mockFaculty.fullName}</div>
                        <div style={{ fontSize: "11px", color: "var(--faculty-muted)" }}>{mockFaculty.email}</div>
                      </div>
                    </div>
                    <div className="faculty-dropdown-divider" />
                    <button
                      type="button"
                      className="faculty-dropdown-item"
                      onClick={() => handleNavClick("profile")}
                    >
                      <User size={14} /> My Profile
                    </button>
                    <button
                      type="button"
                      className="faculty-dropdown-item"
                      onClick={() => handleNavClick("profile")}
                    >
                      <Layers size={14} /> Account Settings
                    </button>
                    <div className="faculty-dropdown-divider" />
                    <button
                      type="button"
                      className="faculty-dropdown-item danger"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN PAGE CONTENT */}
          <main className="faculty-content">
            {renderModuleContent()}
          </main>
        </div>
      </div>

      {/* TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--faculty-text)",
          color: "var(--faculty-surface)",
          padding: "12px 18px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <CheckCircle size={16} style={{ color: "var(--faculty-primary)" }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default FacultyDashboard;

