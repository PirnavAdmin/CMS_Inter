import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Save,
  Sun,
  Moon,
  FileSpreadsheet,
  Search,
  UserPlus,
  ClipboardCheck,
  LogOut,
  ArrowLeftRight,
  CheckCircle2,
  X,
  Clock,
  Building2,
  BedDouble,
  Users,
  Calendar,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import {
  ROOM_FLOOR_OPTIONS,
  INITIAL_ATTENDANCE_STUDENTS,
  createDefaultAttendanceMap,
  MONTHLY_ATTENDANCE_DATA,
} from "./data/hostelAttendanceData.js";
import {
  useHostelStore,
  updateHostelAttendanceStatus,
  updateAllHostelAttendanceStatus,
  saveHostelAttendanceLog,
} from "./data/hostelStore.js";
import "./HostelModule.css";

export default function HostelAttendanceRegister() {
  const navigate = useNavigate();

  const { blocks, attendanceRecords, attendanceStudents } = useHostelStore();

  // Navigation tab state (Hostel Attendance Register is active)
  const [topTab, setTopTab] = useState("attendance");

  // Attendance Mode: "morning" or "night"
  const [attendanceMode, setAttendanceMode] = useState("morning");

  // View Mode: "daily" or "monthly"
  const [viewMode, setViewMode] = useState("daily");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("2026-09-11");
  const [selectedHostel, setSelectedHostel] = useState("All Blocks");
  const [selectedRoomFloor, setSelectedRoomFloor] = useState("All Rooms");

  // Selected month for Monthly Attendance View
  const [selectedMonth, setSelectedMonth] = useState("September 2026");

  // Active records based on attendanceMode from unified store
  const activeRecords = attendanceRecords[attendanceMode] || {};

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Modals state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [editDetailForm, setEditDetailForm] = useState({
    status: "Present",
    inTime: "07:00 AM",
    outTime: "08:30 AM",
  });

  const studentList = attendanceStudents && attendanceStudents.length > 0
    ? attendanceStudents
    : INITIAL_ATTENDANCE_STUDENTS;

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return studentList.filter((st) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.id.toLowerCase().includes(q) ||
        st.roomBed.toLowerCase().includes(q) ||
        st.block.toLowerCase().includes(q) ||
        st.room.toLowerCase().includes(q);

      // 2. Hostel Block Filter
      const matchesHostel =
        selectedHostel === "All Blocks" || st.block === selectedHostel;

      // 3. Room / Floor Filter
      let matchesRoomFloor = true;
      if (selectedRoomFloor !== "All Rooms") {
        if (selectedRoomFloor.startsWith("Floor")) {
          matchesRoomFloor = st.floor === selectedRoomFloor;
        } else if (selectedRoomFloor.startsWith("Room")) {
          matchesRoomFloor = st.room === selectedRoomFloor;
        }
      }

      return matchesSearch && matchesHostel && matchesRoomFloor;
    });
  }, [studentList, searchQuery, selectedHostel, selectedRoomFloor]);

  // Dynamically calculate attendance summary counters from filtered students
  const summaryStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let halfDay = 0;

    filteredStudents.forEach((st) => {
      const record = activeRecords[st.id] || { status: "Present" };
      if (record.status === "Present") present++;
      else if (record.status === "Absent") absent++;
      else if (record.status === "Leave") leave++;
      else if (record.status === "Half Day") halfDay++;
    });

    return {
      total: filteredStudents.length,
      present,
      absent,
      leave,
      halfDay,
    };
  }, [filteredStudents, activeRecords]);

  // Bulk Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    const defaultIn = attendanceMode === "morning" ? "07:00 AM" : "08:00 PM";
    const defaultOut = attendanceMode === "morning" ? "08:30 AM" : "09:30 PM";
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredStudents.map((st) => st.id),
      "Present",
      defaultIn,
      defaultOut
    );
    showToast(`Marked ${filteredStudents.length} students as Present.`);
  };

  // Bulk Quick Action: Mark All Absent
  const handleMarkAllAbsent = () => {
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredStudents.map((st) => st.id),
      "Absent",
      "--",
      "--"
    );
    showToast(`Marked ${filteredStudents.length} students as Absent.`);
  };

  // Bulk Quick Action: Mark All Leave
  const handleMarkAllLeave = () => {
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredStudents.map((st) => st.id),
      "Leave",
      "--",
      "--"
    );
    showToast(`Marked ${filteredStudents.length} students as On Leave.`);
  };

  // Bulk Quick Action: Clear Selection (Restore initial state for filtered students)
  const handleClearSelection = () => {
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredStudents.map((st) => st.id),
      "Present",
      attendanceMode === "morning" ? "07:00 AM" : "08:00 PM",
      attendanceMode === "morning" ? "08:30 AM" : "09:30 PM"
    );
    showToast("Reset attendance selection for displayed students.");
  };

  // Row Status Toggle
  const handleUpdateStatus = (studentId, newStatus) => {
    const defaultIn = attendanceMode === "morning" ? "07:00 AM" : "08:00 PM";
    const defaultOut = attendanceMode === "morning" ? "08:30 AM" : "09:30 PM";
    const curr = activeRecords[studentId] || {};
    let inTime = curr.inTime;
    let outTime = curr.outTime;

    if (newStatus === "Present" || newStatus === "Half Day") {
      if (!inTime || inTime === "--") inTime = defaultIn;
      if (!outTime || outTime === "--") outTime = defaultOut;
    } else {
      inTime = "--";
      outTime = "--";
    }

    updateHostelAttendanceStatus(attendanceMode, studentId, newStatus, inTime, outTime);
  };

  // Inline Time Update
  const handleUpdateTime = (studentId, field, value) => {
    const curr = activeRecords[studentId] || { status: "Present", inTime: "--", outTime: "--" };
    const inTime = field === "inTime" ? value : curr.inTime;
    const outTime = field === "outTime" ? value : curr.outTime;
    updateHostelAttendanceStatus(attendanceMode, studentId, curr.status, inTime, outTime);
  };

  // Open Student Details Modal
  const handleOpenDetails = (student) => {
    const current = activeRecords[student.id] || {
      status: "Present",
      inTime: attendanceMode === "morning" ? "07:00 AM" : "08:00 PM",
      outTime: attendanceMode === "morning" ? "08:30 AM" : "09:30 PM",
    };
    setSelectedStudentForDetails(student);
    setEditDetailForm({
      status: current.status,
      inTime: current.inTime === "--" ? "" : current.inTime,
      outTime: current.outTime === "--" ? "" : current.outTime,
    });
  };

  // Save Student Details Modal
  const handleSaveStudentDetails = (e) => {
    e.preventDefault();
    if (!selectedStudentForDetails) return;

    updateHostelAttendanceStatus(
      attendanceMode,
      selectedStudentForDetails.id,
      editDetailForm.status,
      editDetailForm.inTime.trim() || "--",
      editDetailForm.outTime.trim() || "--"
    );

    setSelectedStudentForDetails(null);
    showToast("Attendance updated successfully.");
  };

  // Confirm Save Attendance Log Modal
  const handleConfirmSaveLog = () => {
    saveHostelAttendanceLog(attendanceDate, attendanceMode, activeRecords);
    setIsSaveModalOpen(false);
    showToast("Attendance log saved successfully.");
  };

  // Export Attendance Report as CSV
  const handleExportCSV = () => {
    const headers = [
      "Student Name",
      "Admission Number",
      "Hostel Block",
      "Room & Bed No",
      "Attendance Status",
      "In Time",
      "Out Time",
      "Attendance Date",
      "Mode",
    ];

    const rows = filteredStudents.map((st) => {
      const rec = activeRecords[st.id] || {
        status: "Present",
        inTime: "07:00 AM",
        outTime: "08:30 AM",
      };
      return [
        `"${st.name}"`,
        `"${st.id}"`,
        `"${st.block}"`,
        `"${st.roomBed}"`,
        `"${rec.status}"`,
        `"${rec.inTime || "--"}"`,
        `"${rec.outTime || "--"}"`,
        `"${attendanceDate}"`,
        `"${attendanceMode === "morning" ? "Morning" : "Night"}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Hostel_Attendance_${attendanceMode}_${attendanceDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Attendance report exported successfully.");
  };

  // Handle Top Tabs Navigation
  const handleTabClick = (tabKey) => {
    setTopTab(tabKey);
    const prefix = window.location.pathname.startsWith("/dashboard") ? "/dashboard" : "";
    if (tabKey === "allocation") {
      navigate(`${prefix}/hostel/students?tab=allocation`);
    } else if (tabKey === "outpass") {
      navigate(`${prefix}/hostel/students?tab=outpass`);
    } else if (tabKey === "transfer") {
      navigate(`${prefix}/hostel/students?tab=transfer`);
    }
  };

  return (
    <DashboardLayout
      title={null}
      subtitle={null}
      breadcrumb={["Hostel Management", "Hostel Attendance Register"]}
    >
      <div
        className="hostel-page-wrapper min-h-screen bg-[#f2f6ed] p-6 text-[#1f2913]"
        style={{ backgroundColor: "#f2f6ed", minHeight: "100vh" }}
      >
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            className="fixed top-6 right-6 z-50 bg-[#1f2913] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#5b7a2b]/40 animate-fade-in"
            role="status"
          >
            <CheckCircle2 size={18} className="text-[#a4d46b]" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. TOP HOSTEL NAVIGATION TABS (EXACTLY FOUR TABS)                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <nav
          className="bg-white p-2 rounded-2xl border border-[#e2ebd8] mb-5 flex items-center gap-2 overflow-x-auto shadow-xs"
          aria-label="Hostel Navigation Tabs"
        >
          {/* Tab 1: Student Hostel Allocation */}
          <button
            type="button"
            className={
              topTab === "allocation"
                ? "bg-[#5b7a2b] text-white font-medium rounded-xl px-4 py-2 text-xs shadow-xs border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-neutral-600 hover:text-neutral-900 rounded-xl px-4 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabClick("allocation")}
          >
            <UserPlus size={16} />
            <span>Student Hostel Allocation</span>
          </button>

          {/* Tab 2: Hostel Attendance Register (Active) */}
          <button
            type="button"
            className={
              topTab === "attendance"
                ? "bg-[#5b7a2b] text-white font-medium rounded-xl px-4 py-2 text-xs shadow-xs border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-neutral-600 hover:text-neutral-900 rounded-xl px-4 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabClick("attendance")}
          >
            <ClipboardCheck size={16} />
            <span>Hostel Attendance Register</span>
          </button>

          {/* Tab 3: Outpass & Leave Management */}
          <button
            type="button"
            className={
              topTab === "outpass"
                ? "bg-[#5b7a2b] text-white font-medium rounded-xl px-4 py-2 text-xs shadow-xs border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-neutral-600 hover:text-neutral-900 rounded-xl px-4 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabClick("outpass")}
          >
            <LogOut size={16} />
            <span>Outpass &amp; Leave Management</span>
          </button>

          {/* Tab 4: Transfer & Vacate Student */}
          <button
            type="button"
            className={
              topTab === "transfer"
                ? "bg-[#5b7a2b] text-white font-medium rounded-xl px-4 py-2 text-xs shadow-xs border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-neutral-600 hover:text-neutral-900 rounded-xl px-4 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabClick("transfer")}
          >
            <ArrowLeftRight size={16} />
            <span>Transfer &amp; Vacate Student</span>
          </button>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. PAGE HEADER                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Left: Calendar Icon + Title */}
          <div className="text-2xl font-bold text-[#1f2913] flex items-center gap-2.5">
            <CalendarDays size={26} className="text-[#5b7a2b]" />
            <span>Hostel Attendance</span>
          </div>

          {/* Right: Save Attendance Log Button */}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="bg-[#5b7a2b] hover:bg-[#4d6924] text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-2 border-0"
          >
            <Save size={16} />
            <span>Save Attendance Log</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. ATTENDANCE MODE & VIEW CONTROLS ROW                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Left: Morning Attendance vs Night Attendance */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-[#e2ebd8] shadow-xs gap-1">
            <button
              type="button"
              onClick={() => setAttendanceMode("morning")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer border-0 ${
                attendanceMode === "morning"
                  ? "bg-[#5b7a2b] text-white shadow-xs"
                  : "bg-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Sun size={15} />
              <span>Morning Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceMode("night")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer border-0 ${
                attendanceMode === "night"
                  ? "bg-[#5b7a2b] text-white shadow-xs"
                  : "bg-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Moon size={15} />
              <span>Night Attendance</span>
            </button>
          </div>

          {/* Right: Daily Attendance, Monthly Attendance, Export Report */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white p-1 rounded-2xl border border-[#e2ebd8] shadow-xs gap-1">
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer border-0 ${
                  viewMode === "daily"
                    ? "bg-[#5b7a2b] text-white shadow-xs"
                    : "bg-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Daily Attendance
              </button>
              <button
                type="button"
                onClick={() => setViewMode("monthly")}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer border-0 ${
                  viewMode === "monthly"
                    ? "bg-[#5b7a2b] text-white shadow-xs"
                    : "bg-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Monthly Attendance
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-white hover:bg-[#f0f4e8] text-[#1f2913] border border-[#e2ebd8] px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} className="text-[#5b7a2b]" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. FILTER CARD (FOUR FILTERS IN ONE DESKTOP ROW)                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="p-4 bg-white rounded-2xl border border-[#e2ebd8] mb-5 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Filter 1: SEARCH STUDENT */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                SEARCH STUDENT
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Search by name, adm no, room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-[#e2ebd8] bg-white text-slate-800 placeholder-neutral-400 outline-none focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b] transition"
                />
                <Search
                  size={15}
                  className="absolute left-3 text-neutral-400 pointer-events-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 bg-transparent border-0 cursor-pointer p-0"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter 2: ATTENDANCE DATE * */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                ATTENDANCE DATE <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#e2ebd8] bg-white text-slate-800 outline-none focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b] cursor-pointer transition font-medium"
              />
            </div>

            {/* Filter 3: HOSTEL BLOCK */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                HOSTEL BLOCK
              </label>
              <select
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#e2ebd8] bg-white text-slate-800 outline-none focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b] cursor-pointer transition"
              >
                <option value="All Blocks">All Blocks</option>
                {blocks.map((opt) => (
                  <option key={opt.id || opt.name} value={opt.name}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 4: ROOM / FLOOR */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                ROOM / FLOOR
              </label>
              <select
                value={selectedRoomFloor}
                onChange={(e) => setSelectedRoomFloor(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-[#e2ebd8] bg-white text-slate-800 outline-none focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b] cursor-pointer transition"
              >
                {ROOM_FLOOR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONDITIONAL RENDERING: DAILY VIEW vs MONTHLY VIEW               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {viewMode === "daily" ? (
          <>
            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 5. ATTENDANCE SUMMARY CARD                                    */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-[#e2ebd8] p-5 mb-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2ebd8]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1f2913] m-0">
                  ATTENDANCE SUMMARY (
                  {attendanceMode === "morning" ? "MORNING" : "NIGHT"})
                </h2>
                <span className="text-xs font-semibold text-neutral-500">
                  Date: {attendanceDate}
                </span>
              </div>

              {/* 5 Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* 1. TOTAL STUDENTS */}
                <div className="bg-[#f2f6ed] rounded-xl p-3 border border-[#e2ebd8] flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    TOTAL STUDENTS
                  </span>
                  <span className="text-xl font-bold text-[#1f2913]">
                    {summaryStats.total}
                  </span>
                </div>

                {/* 2. PRESENT */}
                <div className="bg-[#EBF7E3] rounded-xl p-3 border border-[#cbe3bd] flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-[#35611e] uppercase tracking-wider mb-1">
                    PRESENT
                  </span>
                  <span className="text-xl font-bold text-[#35611e]">
                    {summaryStats.present}
                  </span>
                </div>

                {/* 3. ABSENT */}
                <div className="bg-[#fdf2f2] rounded-xl p-3 border border-[#fbd5d5] flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">
                    ABSENT
                  </span>
                  <span className="text-xl font-bold text-rose-700">
                    {summaryStats.absent}
                  </span>
                </div>

                {/* 4. ON LEAVE */}
                <div className="bg-[#fffbeb] rounded-xl p-3 border border-[#fde68a] flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                    ON LEAVE
                  </span>
                  <span className="text-xl font-bold text-amber-700">
                    {summaryStats.leave}
                  </span>
                </div>

                {/* 5. HALF DAY */}
                <div className="bg-[#f0f9ff] rounded-xl p-3 border border-[#bae6fd] flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">
                    HALF DAY
                  </span>
                  <span className="text-xl font-bold text-sky-700">
                    {summaryStats.halfDay}
                  </span>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 6. QUICK BULK ACTIONS                                         */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-[#e2ebd8] p-4 mb-5 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs font-bold text-[#1f2913] tracking-wide uppercase">
                QUICK BULK ACTIONS:
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="bg-[#5b7a2b] hover:bg-[#4d6924] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer border-0"
                >
                  Mark All Present
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllAbsent}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Mark All Absent
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllLeave}
                  className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Mark All Leave
                </button>

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 7. ATTENDANCE TABLE                                           */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-[#e2ebd8] overflow-hidden shadow-xs mb-6">
              {filteredStudents.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 text-xs">
                  No matching student records found for the selected filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="pc-table w-full text-left">
                    <thead>
                      <tr className="bg-[#f7f9f4] border-b border-[#e2ebd8]">
                        <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                          STUDENT NAME
                        </th>
                        <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                          HOSTEL BLOCK
                        </th>
                        <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                          ROOM &amp; BED NO
                        </th>
                        <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap text-center">
                          ATTENDANCE STATUS
                        </th>
                        <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                          IN TIME
                        </th>
                        <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                          OUT TIME
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2ebd8]">
                      {filteredStudents.map((st) => {
                        const rec = activeRecords[st.id] || {
                          status: "Present",
                          inTime: attendanceMode === "morning" ? "07:00 AM" : "08:00 PM",
                          outTime: attendanceMode === "morning" ? "08:30 AM" : "09:30 PM",
                        };

                        return (
                          <tr
                            key={st.id}
                            className="hover:bg-[#f0f4e8]/30 transition group"
                          >
                            {/* Student Name */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(st)}
                                className="text-left font-semibold text-[#1f2913] hover:text-[#5b7a2b] text-sm bg-transparent border-0 cursor-pointer p-0 transition"
                                title="Click to view & edit details"
                              >
                                {st.name}
                              </button>
                            </td>

                            {/* Hostel Block */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-xs text-neutral-700">
                              {st.block}
                            </td>

                            {/* Room & Bed No */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-block bg-[#E8F2DE] text-[#34591F] font-semibold text-xs px-2.5 py-1 rounded-lg border border-[#D5E4C8] whitespace-nowrap">
                                {st.roomBed}
                              </span>
                            </td>

                            {/* Attendance Status Buttons: Present | Absent | Half Day | Leave */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              <div className="inline-flex items-center bg-[#f0f4e8] p-1 rounded-xl border border-[#e2ebd8] gap-1">
                                {/* Present */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Present")}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 transition ${
                                    rec.status === "Present"
                                      ? "bg-[#5b7a2b] text-white shadow-xs"
                                      : "bg-transparent text-neutral-600 hover:text-neutral-900"
                                  }`}
                                >
                                  Present
                                </button>

                                {/* Absent */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Absent")}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 transition ${
                                    rec.status === "Absent"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "bg-transparent text-neutral-600 hover:text-neutral-900"
                                  }`}
                                >
                                  Absent
                                </button>

                                {/* Half Day */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Half Day")}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 transition ${
                                    rec.status === "Half Day"
                                      ? "bg-sky-600 text-white shadow-xs"
                                      : "bg-transparent text-neutral-600 hover:text-neutral-900"
                                  }`}
                                >
                                  Half Day
                                </button>

                                {/* Leave */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Leave")}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 transition ${
                                    rec.status === "Leave"
                                      ? "bg-amber-600 text-white shadow-xs"
                                      : "bg-transparent text-neutral-600 hover:text-neutral-900"
                                  }`}
                                >
                                  Leave
                                </button>
                              </div>
                            </td>

                            {/* In Time */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={rec.inTime || ""}
                                disabled={rec.status === "Absent" || rec.status === "Leave"}
                                onChange={(e) =>
                                  handleUpdateTime(st.id, "inTime", e.target.value)
                                }
                                placeholder="--:--"
                                className={`w-28 h-8 px-2.5 text-xs text-center font-medium rounded-xl border border-[#e2ebd8] outline-none transition ${
                                  rec.status === "Absent" || rec.status === "Leave"
                                    ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                    : "bg-white text-slate-800 focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b]"
                                }`}
                              />
                            </td>

                            {/* Out Time */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={rec.outTime || ""}
                                disabled={rec.status === "Absent" || rec.status === "Leave"}
                                onChange={(e) =>
                                  handleUpdateTime(st.id, "outTime", e.target.value)
                                }
                                placeholder="--:--"
                                className={`w-28 h-8 px-2.5 text-xs text-center font-medium rounded-xl border border-[#e2ebd8] outline-none transition ${
                                  rec.status === "Absent" || rec.status === "Leave"
                                    ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                    : "bg-white text-slate-800 focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b]"
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ═════════════════════════════════════════════════════════════ */
          /* MONTHLY ATTENDANCE VIEW                                       */
          /* ═════════════════════════════════════════════════════════════ */
          <div className="space-y-5 mb-6">
            {/* Monthly Header & Selector Card */}
            <div className="bg-white rounded-2xl border border-[#e2ebd8] p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1f2913] m-0 mb-1">
                  Monthly Hostel Attendance Overview
                </h3>
                <p className="text-xs text-neutral-500 m-0">
                  Comprehensive attendance distribution, average attendance percentage and resident summary.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-neutral-600 uppercase">
                  Select Month:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-10 px-3 text-xs font-semibold rounded-xl border border-[#e2ebd8] bg-white text-slate-800 outline-none focus:border-[#5b7a2b] cursor-pointer"
                >
                  <option value="August 2026">August 2026</option>
                  <option value="September 2026">September 2026</option>
                  <option value="October 2026">October 2026</option>
                </select>
              </div>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-[#e2ebd8] p-4 shadow-xs">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                  TOTAL RESIDENTS
                </span>
                <span className="text-2xl font-bold text-[#1f2913]">
                  {MONTHLY_ATTENDANCE_DATA.length}
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-[#e2ebd8] p-4 shadow-xs">
                <span className="text-[11px] font-bold text-[#35611e] uppercase tracking-wider block mb-1">
                  AVG ATTENDANCE RATE
                </span>
                <span className="text-2xl font-bold text-[#35611e]">
                  96.8%
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-[#e2ebd8] p-4 shadow-xs">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                  TOTAL APPROVED LEAVES
                </span>
                <span className="text-2xl font-bold text-amber-700">
                  14 Days
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-[#e2ebd8] p-4 shadow-xs">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                  TOTAL UNEXCUSED ABSENCES
                </span>
                <span className="text-2xl font-bold text-rose-700">
                  3 Days
                </span>
              </div>
            </div>

            {/* Monthly Student-Level Table */}
            <div className="bg-white rounded-2xl border border-[#e2ebd8] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="pc-table w-full text-left">
                  <thead>
                    <tr className="bg-[#f7f9f4] border-b border-[#e2ebd8]">
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                        STUDENT NAME
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                        ADMISSION NO
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                        HOSTEL BLOCK
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap">
                        ROOM &amp; BED
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap text-center">
                        PRESENT
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap text-center">
                        ABSENT
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap text-center">
                        LEAVE
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap text-center">
                        HALF DAY
                      </th>
                      <th className="py-3.5 px-4 text-[11px] font-bold text-neutral-600 uppercase whitespace-nowrap text-center">
                        ATTENDANCE %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2ebd8]">
                    {MONTHLY_ATTENDANCE_DATA.map((row) => (
                      <tr key={row.id} className="hover:bg-[#f0f4e8]/30 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-[#1f2913] text-sm">
                          {row.name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-neutral-600 font-mono">
                          {row.id}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-neutral-700">
                          {row.block}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block bg-[#E8F2DE] text-[#34591F] font-semibold text-xs px-2.5 py-1 rounded-lg border border-[#D5E4C8] whitespace-nowrap">
                            {row.roomBed}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center font-semibold text-[#35611e] text-xs">
                          {row.present}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center font-semibold text-rose-600 text-xs">
                          {row.absent}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center font-semibold text-amber-600 text-xs">
                          {row.leave}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center font-semibold text-sky-600 text-xs">
                          {row.halfDay}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              row.percentage >= 90
                                ? "bg-[#E1F2D6] text-[#296518]"
                                : row.percentage >= 75
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {row.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: CONFIRM SAVE ATTENDANCE LOG                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isSaveModalOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-log-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSaveModalOpen(false);
            }}
          >
            <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border border-[#e2ebd8] animate-fade-in">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#e2ebd8]">
                <h3 id="save-log-title" className="text-base font-bold text-[#1f2913] m-0">
                  Save Attendance Log
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 bg-transparent border-0 cursor-pointer p-1"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
                Are you sure you want to save the hostel attendance log for the selected date?
              </p>

              {/* Summary Breakdown */}
              <div className="bg-[#f7f9f4] p-3.5 rounded-xl border border-[#e2ebd8] mb-5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-medium">Date:</span>
                  <span className="font-bold text-[#1f2913]">{attendanceDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-medium">Mode:</span>
                  <span className="font-bold text-[#1f2913]">
                    {attendanceMode === "morning" ? "Morning Attendance" : "Night Attendance"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-medium">Hostel Filter:</span>
                  <span className="font-semibold text-slate-800">{selectedHostel}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#e2ebd8]">
                  <span className="text-neutral-500 font-medium">Students Count:</span>
                  <span className="font-bold text-[#1f2913]">{summaryStats.total}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-[#35611e] font-semibold">Present: {summaryStats.present}</span>
                  <span className="text-rose-600 font-semibold">Absent: {summaryStats.absent}</span>
                  <span className="text-amber-600 font-semibold">Leave: {summaryStats.leave}</span>
                  <span className="text-sky-600 font-semibold">Half Day: {summaryStats.halfDay}</span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium px-4 py-2 rounded-xl text-xs transition cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveLog}
                  className="bg-[#5b7a2b] hover:bg-[#4d6924] text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer border-0"
                >
                  Save Attendance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 2: STUDENT ATTENDANCE DETAILS & EDIT                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {selectedStudentForDetails && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-details-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedStudentForDetails(null);
            }}
          >
            <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border border-[#e2ebd8] animate-fade-in">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#e2ebd8]">
                <h3 id="student-details-title" className="text-base font-bold text-[#1f2913] m-0">
                  Student Attendance Details
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForDetails(null)}
                  className="text-neutral-400 hover:text-neutral-700 bg-transparent border-0 cursor-pointer p-1"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveStudentDetails}>
                {/* Student Info Card */}
                <div className="bg-[#f7f9f4] p-3.5 rounded-xl border border-[#e2ebd8] mb-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Student Name:</span>
                    <span className="font-bold text-[#1f2913]">
                      {selectedStudentForDetails.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Admission Number:</span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {selectedStudentForDetails.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Hostel Block:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedStudentForDetails.block}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Room &amp; Bed:</span>
                    <span className="text-[#34591F] font-semibold">
                      {selectedStudentForDetails.roomBed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Attendance Date:</span>
                    <span className="text-slate-800 font-semibold">{attendanceDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-medium">Attendance Mode:</span>
                    <span className="text-slate-800 font-semibold">
                      {attendanceMode === "morning" ? "Morning Attendance" : "Night Attendance"}
                    </span>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Attendance Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["Present", "Absent", "Half Day", "Leave"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setEditDetailForm((prev) => {
                            let inTime = prev.inTime;
                            let outTime = prev.outTime;
                            if (st === "Present") {
                              if (!inTime || inTime === "--") inTime = attendanceMode === "morning" ? "07:00 AM" : "08:00 PM";
                              if (!outTime || outTime === "--") outTime = attendanceMode === "morning" ? "08:30 AM" : "09:30 PM";
                            } else if (st === "Absent" || st === "Leave") {
                              inTime = "";
                              outTime = "";
                            }
                            return { ...prev, status: st, inTime, outTime };
                          });
                        }}
                        className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                          editDetailForm.status === st
                            ? st === "Present"
                              ? "bg-[#5b7a2b] text-white border-[#5b7a2b]"
                              : st === "Absent"
                              ? "bg-rose-600 text-white border-rose-600"
                              : st === "Half Day"
                              ? "bg-sky-600 text-white border-sky-600"
                              : "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-neutral-600 border-[#e2ebd8] hover:bg-[#f0f4e8]"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* In Time & Out Time */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      In Time
                    </label>
                    <input
                      type="text"
                      disabled={editDetailForm.status === "Absent" || editDetailForm.status === "Leave"}
                      placeholder="e.g. 07:00 AM"
                      value={editDetailForm.inTime}
                      onChange={(e) =>
                        setEditDetailForm({ ...editDetailForm, inTime: e.target.value })
                      }
                      className="w-full h-10 px-3 text-xs rounded-xl border border-[#e2ebd8] bg-white text-slate-800 outline-none focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b] disabled:bg-neutral-100 disabled:text-neutral-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Out Time
                    </label>
                    <input
                      type="text"
                      disabled={editDetailForm.status === "Absent" || editDetailForm.status === "Leave"}
                      placeholder="e.g. 08:30 AM"
                      value={editDetailForm.outTime}
                      onChange={(e) =>
                        setEditDetailForm({ ...editDetailForm, outTime: e.target.value })
                      }
                      className="w-full h-10 px-3 text-xs rounded-xl border border-[#e2ebd8] bg-white text-slate-800 outline-none focus:border-[#5b7a2b] focus:ring-1 focus:ring-[#5b7a2b] disabled:bg-neutral-100 disabled:text-neutral-400"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e2ebd8]">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForDetails(null)}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium px-4 py-2 rounded-xl text-xs transition cursor-pointer border-0"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="bg-[#5b7a2b] hover:bg-[#4d6924] text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer border-0"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
