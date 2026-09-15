import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UserPlus,
  Plus,
  Search,
  UserCheck,
  LogOut,
  ArrowLeftRight,
  CheckCircle2,
  X,
  Phone,
  Calendar,
  CalendarDays,
  Save,
  Sun,
  Moon,
  FileSpreadsheet,
  Users,
  BedDouble,
  Building2,
  Clock,
  Download,
  Check,
  AlertCircle,
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
  addHostelAllocation,
  updateHostelAllocation,
  vacateHostelAllocation,
  addHostelOutpass,
  updateHostelOutpassStatus,
  deleteHostelOutpass,
  addHostelTransfer,
  updateHostelTransferStatus,
  deleteHostelTransfer,
  updateHostelAttendanceStatus,
  updateAllHostelAttendanceStatus,
  saveHostelAttendanceLog,
} from "./data/hostelData.js";
import "./HostelModule.css";

// ══════════════════════════════════════════════════════════════════════════════
// 1. INITIAL MOCK DATA (PRESERVED)
// ══════════════════════════════════════════════════════════════════════════════

// Initial student room allocation records (Screen 1)
const INITIAL_STUDENTS = [
  {
    id: "ADM-2024-001",
    name: "Rahul Sharma",
    gender: "Male",
    block: "Boys Residence - Block A",
    blockCode: "BR-A",
    floor: "Floor 1",
    room: "Room #101",
    roomBed: "Room #101 (BED-1)",
    joinDate: "2026-08-01",
    fee: "₹6,500",
    status: "Allocated",
  },
  {
    id: "ADM-2024-015",
    name: "Sneha Reddy",
    gender: "Female",
    block: "Girls Residence - Block A",
    blockCode: "GR-A",
    floor: "Floor 1",
    room: "Room #102",
    roomBed: "Room #102 (BED-1)",
    joinDate: "2026-08-03",
    fee: "₹6,500",
    status: "Allocated",
  },
  {
    id: "ADM-2024-042",
    name: "Vikram Patel",
    gender: "Male",
    block: "Boys Residence - Block B",
    blockCode: "BR-B",
    floor: "Floor 2",
    room: "Room #201",
    roomBed: "Room #201 (BED-2)",
    joinDate: "2026-08-05",
    fee: "₹7,000",
    status: "Allocated",
  },
  {
    id: "ADM-2024-068",
    name: "Priya Nair",
    gender: "Female",
    block: "Girls Residence - Block A",
    blockCode: "GR-A",
    floor: "Floor 1",
    room: "Room #103",
    roomBed: "Room #103 (BED-1)",
    joinDate: "2026-08-07",
    fee: "₹6,500",
    status: "Allocated",
  },
  {
    id: "ADM-2024-095",
    name: "Amit Kumar",
    gender: "Male",
    block: "Boys Residence - Block A",
    blockCode: "BR-A",
    floor: "Floor 3",
    room: "Room #301",
    roomBed: "Room #301 (BED-1)",
    joinDate: "2026-08-10",
    fee: "₹8,000",
    status: "Allocated",
  },
  {
    id: "ADM-2024-112",
    name: "Ananya Verma",
    gender: "Female",
    block: "Junior College Wing",
    blockCode: "JCW",
    floor: "Floor 2",
    room: "Room #202",
    roomBed: "Room #202 (BED-1)",
    joinDate: "2026-08-12",
    fee: "₹5,500",
    status: "Allocated",
  },
];

// Initial Outpass & Leave records (Screen 5)
const INITIAL_OUTPASSES = [
  {
    id: "out-1",
    studentName: "Ananya Verma",
    admissionNo: "ADM-2024-023",
    requestType: "Local Outpass",
    roomNo: "Room #204",
    blockName: "Girls Residence - Block A",
    outDate: "2026-08-14 14:00",
    returnDate: "2026-08-14",
    returnTime: "19:30",
    status: "Pending Approval",
    reason: "Bookstore visit & medical consultation",
  },
  {
    id: "out-2",
    studentName: "Rohan Mehra",
    admissionNo: "ADM-2024-051",
    requestType: "Emergency Leave",
    roomNo: "Room #108",
    blockName: "Boys Residence - Block A",
    outDate: "2026-08-14 16:00",
    returnDate: "2026-08-16",
    returnTime: "20:00",
    status: "Pending Approval",
    reason: "Family emergency",
  },
  {
    id: "out-3",
    studentName: "Karthik Raj",
    admissionNo: "ADM-2024-067",
    requestType: "Weekend Home Pass",
    roomNo: "Room #101",
    blockName: "Boys Residence - Block A",
    outDate: "2026-08-15 08:00",
    returnDate: "2026-08-17",
    returnTime: "20:00",
    status: "Approved",
    reason: "Family function at hometown",
  },
  {
    id: "out-4",
    studentName: "Meera Krishnan",
    admissionNo: "ADM-2024-077",
    requestType: "Medical Leave",
    roomNo: "Room #102",
    blockName: "Girls Residence - Block B",
    outDate: "2026-08-13 16:30",
    returnDate: "2026-08-15",
    returnTime: "18:00",
    status: "Under Review",
    reason: "Doctor consultation",
  },
];

// Initial Transfer & Vacate records (Screen 6)
const INITIAL_TRANSFERS = [
  {
    id: "tr-1",
    studentName: "Amit Kumar",
    admissionNo: "ADM-2024-095",
    currentBlock: "Boys Residence - Block A",
    currentRoom: "Room #301 (BED-1)",
    targetBlock: "Boys Residence - Block B",
    targetRoom: "Room #201",
    requestType: "Block Transfer",
    reason: "Medical condition requiring lower floor",
    requestDate: "2026-08-12",
    status: "Pending Review",
  },
  {
    id: "tr-2",
    studentName: "Priya Nair",
    admissionNo: "ADM-2024-068",
    currentBlock: "Girls Residence - Block A",
    currentRoom: "Room #103 (BED-1)",
    targetBlock: "--",
    targetRoom: "--",
    requestType: "Vacate Bed",
    reason: "Switched to Day Scholar",
    requestDate: "2026-08-10",
    status: "Approved",
  },
  {
    id: "tr-3",
    studentName: "Rahul Sharma",
    admissionNo: "ADM-2024-001",
    currentBlock: "Boys Residence - Block A",
    currentRoom: "Room #101 (BED-1)",
    targetBlock: "Boys Residence - Block A",
    targetRoom: "Room #102 (BED-2)",
    requestType: "Room Change",
    reason: "Study group alignment with roommate",
    requestDate: "2026-08-08",
    status: "Processed",
  },
];

export default function StudentHostelManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || "allocation");

  useEffect(() => {
    if (urlTab && ["allocation", "attendance", "outpass", "transfer"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Unified Store
  const {
    blocks,
    allocations,
    outpasses,
    transfers,
    attendanceRecords,
    attendanceStudents,
  } = useHostelStore();

  // Global Toast feedback
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 1: STUDENT HOSTEL ALLOCATION STATE & HANDLERS (Screen 1)
  // ══════════════════════════════════════════════════════════════════════════════
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHostel, setSelectedHostel] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("All Floors");
  const [selectedRoom, setSelectedRoom] = useState("All Rooms");

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isVacateModalOpen, setIsVacateModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState("");
  const [vacateReason, setVacateReason] = useState("");
  const [editingAlloc, setEditingAlloc] = useState(null);

  const [newAlloc, setNewAlloc] = useState({
    name: "",
    admNo: "",
    gender: "Male",
    block: "Boys Residence - Block A",
    floor: "Floor 1",
    room: "Room #104",
    bed: "BED-1",
    fee: "₹6,500",
    joinDate: "2026-08-14",
  });

  const filteredStudents = useMemo(() => {
    return allocations.filter((st) => {
      const matchesSearch =
        !searchQuery ||
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.roomBed && st.roomBed.toLowerCase().includes(searchQuery.toLowerCase())) ||
        st.block.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesHostel = !selectedHostel || selectedHostel === "all" || st.block === selectedHostel;
      const matchesFloor = selectedFloor === "All Floors" || st.floor === selectedFloor;
      const matchesRoom = selectedRoom === "All Rooms" || st.room === selectedRoom;

      return matchesSearch && matchesHostel && matchesFloor && matchesRoom;
    });
  }, [allocations, searchQuery, selectedHostel, selectedFloor, selectedRoom]);

  const showEmptyStateAllocation = !selectedHostel && !searchQuery.trim();

  const handleOpenAllocateModal = () => {
    setEditingAlloc(null);
    setNewAlloc({
      name: "",
      admNo: "",
      gender: "Male",
      block: blocks[0]?.name || "Boys Residence - Block A",
      floor: "Floor 1",
      room: "Room #104",
      bed: "BED-1",
      fee: "₹6,500",
      joinDate: new Date().toISOString().split("T")[0],
    });
    setIsAllocateModalOpen(true);
  };

  const handleCloseAllocateModal = () => {
    setIsAllocateModalOpen(false);
    setEditingAlloc(null);
    setNewAlloc({
      name: "",
      admNo: "",
      gender: "Male",
      block: "Boys Residence - Block A",
      floor: "Floor 1",
      room: "Room #104",
      bed: "BED-1",
      fee: "₹6,500",
      joinDate: "2026-08-14",
    });
  };

  const handleAllocateSubmit = (e) => {
    e.preventDefault();
    if (!newAlloc.name || !newAlloc.admNo) return;

    let code = "BR-A";
    const foundBlock = blocks.find((b) => b.name === newAlloc.block);
    if (foundBlock) {
      code = foundBlock.code;
    } else if (newAlloc.block.includes("Girls")) code = "GR-A";
    else if (newAlloc.block.includes("Block B")) code = "BR-B";
    else if (newAlloc.block.includes("Junior")) code = "JCW";

    if (editingAlloc) {
      updateHostelAllocation(editingAlloc.id, {
        name: newAlloc.name,
        gender: newAlloc.gender,
        block: newAlloc.block,
        blockCode: code,
        floor: newAlloc.floor,
        room: newAlloc.room,
        roomBed: `${newAlloc.room} (${newAlloc.bed})`,
        joinDate: newAlloc.joinDate || editingAlloc.joinDate,
        fee: newAlloc.fee || editingAlloc.fee,
      });
      handleCloseAllocateModal();
      showToast(`Allocation updated successfully for ${newAlloc.name}!`);
    } else {
      const created = {
        id: newAlloc.admNo,
        name: newAlloc.name,
        gender: newAlloc.gender,
        block: newAlloc.block,
        blockCode: code,
        floor: newAlloc.floor,
        room: newAlloc.room,
        roomBed: `${newAlloc.room} (${newAlloc.bed})`,
        joinDate: newAlloc.joinDate || "2026-08-14",
        fee: newAlloc.fee || "₹6,500",
        status: "Allocated",
      };

      addHostelAllocation(created);
      if (!selectedHostel) {
        setSelectedHostel(newAlloc.block);
      }
      handleCloseAllocateModal();
      showToast(`Room & Bed allocated successfully to ${newAlloc.name}!`);
    }
  };

  const handleOpenVacateModal = (studentInfo = "") => {
    setTargetStudent(studentInfo || (allocations[0]?.name + " (" + allocations[0]?.id + ")"));
    setIsVacateModalOpen(true);
  };

  const handleCloseVacateModal = () => {
    setIsVacateModalOpen(false);
    setVacateReason("");
  };

  const handleVacateSubmit = (e) => {
    e.preventDefault();
    const idMatch = targetStudent.match(/\(([^)]+)\)/);
    const studentId = idMatch ? idMatch[1] : targetStudent;
    vacateHostelAllocation(studentId, vacateReason || "Resident student vacated room");
    handleCloseVacateModal();
    showToast(`Bed vacated and released successfully!`);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 2: HOSTEL ATTENDANCE REGISTER STATE & HANDLERS (Screens 2, 3, 4)
  // ══════════════════════════════════════════════════════════════════════════════
  const [attendanceMode, setAttendanceMode] = useState("morning"); // "morning" | "night"
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "monthly"

  const [attSearchQuery, setAttSearchQuery] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("2026-09-11");
  const [attHostelBlock, setAttHostelBlock] = useState("All Blocks");
  const [attRoomFloor, setAttRoomFloor] = useState("All Rooms");

  const activeAttendanceRecords = attendanceRecords[attendanceMode] || {};

  const [isSaveLogModalOpen, setIsSaveLogModalOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [editDetailForm, setEditDetailForm] = useState({
    status: "Present",
    inTime: "07:00 AM",
    outTime: "08:30 AM",
  });

  const studentListForAttendance = attendanceStudents && attendanceStudents.length > 0
    ? attendanceStudents
    : INITIAL_ATTENDANCE_STUDENTS;

  const filteredAttendanceStudents = useMemo(() => {
    return studentListForAttendance.filter((st) => {
      const q = attSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.id.toLowerCase().includes(q) ||
        st.roomBed.toLowerCase().includes(q) ||
        st.block.toLowerCase().includes(q) ||
        st.room.toLowerCase().includes(q);

      const matchesHostel =
        attHostelBlock === "All Blocks" || st.block === attHostelBlock;

      let matchesRoomFloor = true;
      if (attRoomFloor !== "All Rooms") {
        if (attRoomFloor.startsWith("Floor")) {
          matchesRoomFloor = st.floor === attRoomFloor;
        } else if (attRoomFloor.startsWith("Room")) {
          matchesRoomFloor = st.room === attRoomFloor;
        }
      }

      return matchesSearch && matchesHostel && matchesRoomFloor;
    });
  }, [studentListForAttendance, attSearchQuery, attHostelBlock, attRoomFloor]);

  const attendanceSummaryStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let halfDay = 0;

    filteredAttendanceStudents.forEach((st) => {
      const record = activeAttendanceRecords[st.id] || { status: "Present" };
      if (record.status === "Present") present++;
      else if (record.status === "Absent") absent++;
      else if (record.status === "Leave") leave++;
      else if (record.status === "Half Day") halfDay++;
    });

    return {
      total: filteredAttendanceStudents.length,
      present,
      absent,
      leave,
      halfDay,
    };
  }, [filteredAttendanceStudents, activeAttendanceRecords]);

  const handleMarkAllPresent = () => {
    const defaultIn = attendanceMode === "morning" ? "07:00 AM" : "08:00 PM";
    const defaultOut = attendanceMode === "morning" ? "08:30 AM" : "09:30 PM";
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredAttendanceStudents.map((st) => st.id),
      "Present",
      defaultIn,
      defaultOut
    );
    showToast(`Marked ${filteredAttendanceStudents.length} students as Present.`);
  };

  const handleMarkAllAbsent = () => {
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredAttendanceStudents.map((st) => st.id),
      "Absent",
      "--",
      "--"
    );
    showToast(`Marked ${filteredAttendanceStudents.length} students as Absent.`);
  };

  const handleMarkAllLeave = () => {
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredAttendanceStudents.map((st) => st.id),
      "Leave",
      "--",
      "--"
    );
    showToast(`Marked ${filteredAttendanceStudents.length} students as On Leave.`);
  };

  const handleClearSelection = () => {
    updateAllHostelAttendanceStatus(
      attendanceMode,
      filteredAttendanceStudents.map((st) => st.id),
      "Present",
      attendanceMode === "morning" ? "07:00 AM" : "08:00 PM",
      attendanceMode === "morning" ? "08:30 AM" : "09:30 PM"
    );
    showToast("Reset attendance selection for displayed students.");
  };

  const handleUpdateStatus = (studentId, newStatus) => {
    const defaultIn = attendanceMode === "morning" ? "07:00 AM" : "08:00 PM";
    const defaultOut = attendanceMode === "morning" ? "08:30 AM" : "09:30 PM";
    const curr = activeAttendanceRecords[studentId] || {};
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

  const handleOpenDetails = (student) => {
    const current = activeAttendanceRecords[student.id] || {
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

  const handleConfirmSaveLog = () => {
    saveHostelAttendanceLog(attendanceDate, attendanceMode, activeAttendanceRecords);
    setIsSaveLogModalOpen(false);
    showToast("Attendance log saved successfully.");
  };

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

    const rows = filteredAttendanceStudents.map((st) => {
      const rec = activeAttendanceRecords[st.id] || {
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
        `"${rec.inTime}"`,
        `"${rec.outTime}"`,
        `"${attendanceDate}"`,
        `"${attendanceMode.toUpperCase()}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hostel_Attendance_${attendanceDate}_${attendanceMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Attendance CSV report exported successfully!");
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 3: OUTPASS & LEAVE MANAGEMENT STATE & HANDLERS (Screen 5)
  // ══════════════════════════════════════════════════════════════════════════════
  const [outpassSearch, setOutpassSearch] = useState("");
  const [outpassFilter, setOutpassFilter] = useState("");
  const [isApplyOutpassOpen, setIsApplyOutpassOpen] = useState(false);
  const [newOutpass, setNewOutpass] = useState({
    studentName: "",
    admissionNo: "",
    requestType: "Local Outpass",
    roomNo: "Room #101",
    blockName: "Boys Residence - Block A",
    outDate: "2026-09-12 14:00",
    returnDate: "2026-09-12",
    returnTime: "19:30",
    reason: "",
  });

  const filteredOutpasses = useMemo(() => {
    return outpasses.filter((op) => {
      const q = outpassSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        op.studentName.toLowerCase().includes(q) ||
        op.admissionNo.toLowerCase().includes(q) ||
        op.roomNo.toLowerCase().includes(q) ||
        op.blockName.toLowerCase().includes(q);

      const matchesFilter =
        !outpassFilter || outpassFilter === "all" || op.status === outpassFilter;

      return matchesSearch && matchesFilter;
    });
  }, [outpasses, outpassSearch, outpassFilter]);

  const showEmptyStateOutpass = !outpassFilter && !outpassSearch.trim();

  const handleApproveOutpass = (id) => {
    updateHostelOutpassStatus(id, "Approved");
    showToast("Outpass request approved.");
  };

  const handleRejectOutpass = (id) => {
    updateHostelOutpassStatus(id, "Rejected");
    showToast("Outpass request rejected.");
  };

  const handleApplyOutpassSubmit = (e) => {
    e.preventDefault();
    if (!newOutpass.studentName || !newOutpass.admissionNo) return;

    const created = {
      id: `out-${Date.now()}`,
      studentName: newOutpass.studentName,
      admissionNo: newOutpass.admissionNo,
      requestType: newOutpass.requestType,
      roomNo: newOutpass.roomNo,
      blockName: newOutpass.blockName,
      outDate: newOutpass.outDate,
      returnDate: newOutpass.returnDate,
      returnTime: newOutpass.returnTime,
      status: "Pending Approval",
      reason: newOutpass.reason || "General outpass",
    };

    addHostelOutpass(created);
    setIsApplyOutpassOpen(false);
    setOutpassFilter("all");
    showToast(`Outpass request submitted for ${newOutpass.studentName}!`);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 4: TRANSFER & VACATE STUDENT STATE & HANDLERS (Screen 6)
  // ══════════════════════════════════════════════════════════════════════════════
  const [transferSearch, setTransferSearch] = useState("");
  const [transferFilter, setTransferFilter] = useState("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    studentName: "",
    admissionNo: "",
    currentBlock: "Boys Residence - Block A",
    currentRoom: "Room #101 (BED-1)",
    targetBlock: "Boys Residence - Block B",
    targetRoom: "Room #201",
    requestType: "Block Transfer",
    reason: "",
  });

  const filteredTransfers = useMemo(() => {
    return transfers.filter((tr) => {
      const q = transferSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tr.studentName.toLowerCase().includes(q) ||
        tr.admissionNo.toLowerCase().includes(q) ||
        tr.currentRoom.toLowerCase().includes(q) ||
        tr.currentBlock.toLowerCase().includes(q);

      const matchesFilter =
        !transferFilter || transferFilter === "all" || tr.requestType === transferFilter;

      return matchesSearch && matchesFilter;
    });
  }, [transfers, transferSearch, transferFilter]);

  const showEmptyStateTransfer = !transferFilter && !transferSearch.trim();

  const handleApproveTransfer = (id) => {
    updateHostelTransferStatus(id, "Approved");
    showToast("Transfer / Vacate request approved.");
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!newTransfer.studentName || !newTransfer.admissionNo) return;

    const created = {
      id: `tr-${Date.now()}`,
      studentName: newTransfer.studentName,
      admissionNo: newTransfer.admissionNo,
      currentBlock: newTransfer.currentBlock,
      currentRoom: newTransfer.currentRoom,
      targetBlock: newTransfer.requestType === "Vacate Bed" ? "--" : newTransfer.targetBlock,
      targetRoom: newTransfer.requestType === "Vacate Bed" ? "--" : newTransfer.targetRoom,
      requestType: newTransfer.requestType,
      reason: newTransfer.reason || "Resident relocation request",
      requestDate: new Date().toISOString().split("T")[0],
      status: "Pending Review",
    };

    addHostelTransfer(created);
    setIsTransferModalOpen(false);
    setTransferFilter("all");
    showToast(`Transfer/Vacate request recorded for ${newTransfer.studentName}!`);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER MAIN COMPONENT
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <DashboardLayout
      title={null}
      subtitle={null}
      breadcrumb={["Hostel Management", "Student Management"]}
    >
      <div className="hostel-page-wrapper w-full max-w-full box-border bg-[#f2f6ed] text-[#1f2913]">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="pc-toast-banner" role="status">
            <CheckCircle2 size={18} className="text-sky-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOP NAVIGATION TABS (ALL 4 TABS IN ONE ROW ON DESKTOP)          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <nav
          className="w-full max-w-full box-border bg-white p-1.5 md:p-2 rounded-2xl border border-sky-100 mb-5 flex items-center gap-1.5 md:gap-2 shadow-sm"
          aria-label="Student Hostel Navigation Tabs"
        >
          {/* Tab 1: Student Hostel Allocation */}
          <button
            type="button"
            className={
              activeTab === "allocation"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabChange("allocation")}
          >
            <UserPlus size={16} />
            <span>Student Hostel Allocation</span>
          </button>

          {/* Tab 2: Hostel Attendance Register */}
          <button
            type="button"
            className={
              activeTab === "attendance"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabChange("attendance")}
          >
            <UserCheck size={16} />
            <span>Hostel Attendance Register</span>
          </button>

          {/* Tab 3: Outpass & Leave Management */}
          <button
            type="button"
            className={
              activeTab === "outpass"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabChange("outpass")}
          >
            <LogOut size={16} />
            <span>Outpass &amp; Leave Management</span>
          </button>

          {/* Tab 4: Transfer & Vacate Student */}
          <button
            type="button"
            className={
              activeTab === "transfer"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => handleTabChange("transfer")}
          >
            <ArrowLeftRight size={16} />
            <span>Transfer &amp; Vacate Student</span>
          </button>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. SCREEN 1: STUDENT HOSTEL ALLOCATION                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "allocation" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <UserPlus size={26} className="text-sky-600 flex-shrink-0" />
                <span>Student Room Allocations</span>
              </div>
              <button
                type="button"
                onClick={handleOpenAllocateModal}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0 flex-shrink-0"
              >
                <Plus size={15} />
                <span>Allocate Room &amp; Bed</span>
              </button>
            </div>

            {/* Filter Bar (4 Controls fitting completely within parent) */}
            <div className="w-full max-w-full box-border p-3 bg-white rounded-2xl border border-sky-100 mb-4 flex items-center gap-3 shadow-sm flex-wrap md:flex-nowrap">
              {/* Control 1: Search Field */}
              <div className="relative flex items-center flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  placeholder="Search student, adm no, room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                />
                <Search
                  size={15}
                  className="text-slate-400 absolute left-3 pointer-events-none"
                />
              </div>

              {/* Control 2: Hostel Dropdown */}
              <select
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
                className="w-full md:w-64 h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border flex-shrink-0"
              >
                <option value="">Select Hostel...</option>
                <option value="all">All Hostels ({blocks.length})</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Control 3: Floor Dropdown */}
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full md:w-36 h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border flex-shrink-0"
              >
                <option value="All Floors">All Floors</option>
                <option value="Floor 1">Floor 1</option>
                <option value="Floor 2">Floor 2</option>
                <option value="Floor 3">Floor 3</option>
              </select>

              {/* Control 4: Room Dropdown */}
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full md:w-36 h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border flex-shrink-0"
              >
                <option value="All Rooms">All Rooms</option>
                <option value="Room #101">Room #101</option>
                <option value="Room #102">Room #102</option>
                <option value="Room #103">Room #103</option>
                <option value="Room #201">Room #201</option>
                <option value="Room #202">Room #202</option>
                <option value="Room #301">Room #301</option>
              </select>
            </div>

            {/* Empty State vs Allocations Table */}
            {showEmptyStateAllocation ? (
              <div className="w-full max-w-full box-border bg-white border border-sky-100 rounded-3xl py-24 px-6 text-center my-3 shadow-sm">
                <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <UserPlus size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Select a Hostel
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Please select a hostel option from the filter dropdown above to view student room allocations.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STUDENT &amp; ADMISSION NO
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          HOSTEL BLOCK
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ASSIGNED ROOM &amp; BED
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ALLOCATION DATE
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          MONTHLY FEE
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STATUS
                        </th>
                        <th className="text-center py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-sky-50/40 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm leading-tight">
                                {st.name}
                              </span>
                              <span className="text-xs text-slate-500 mt-0.5 font-medium">
                                {st.id} • {st.gender}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-medium text-slate-900 text-sm">
                                {st.block}
                              </span>
                              <span className="bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
                                {st.blockCode}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-block bg-sky-50 text-sky-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-sky-200 whitespace-nowrap">
                              {st.roomBed}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-sm text-slate-700">
                            {st.joinDate}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                            {st.fee}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center justify-center whitespace-nowrap px-3.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ {st.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAlloc(st);
                                  const matchBed = st.roomBed?.match(/\(([^)]+)\)/);
                                  setNewAlloc({
                                    name: st.name,
                                    admNo: st.id,
                                    gender: st.gender,
                                    block: st.block,
                                    floor: st.floor,
                                    room: st.room,
                                    bed: matchBed ? matchBed[1] : "BED-1",
                                    fee: st.fee,
                                    joinDate: st.joinDate,
                                  });
                                  setIsAllocateModalOpen(true);
                                }}
                                className="border border-sky-200 text-sky-700 hover:bg-sky-50 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap bg-white"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenVacateModal(`${st.name} (${st.id})`)}
                                className="border border-rose-300 text-rose-600 hover:bg-rose-50 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap bg-white"
                              >
                                Vacate Bed
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. SCREEN 2/3/4: HOSTEL ATTENDANCE REGISTER                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "attendance" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <CalendarDays size={26} className="text-sky-600 flex-shrink-0" />
                <span>Hostel Attendance</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveLogModalOpen(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0 flex-shrink-0"
              >
                <Save size={15} />
                <span>Save Attendance Log</span>
              </button>
            </div>

            {/* Sub-header Controls: Morning/Night (Left), Daily/Monthly & Export (Right) */}
            <div className="w-full max-w-full box-border flex items-center justify-between gap-3 mb-4 flex-wrap sm:flex-nowrap">
              {/* Left: Attendance Mode Toggle */}
              <div className="flex items-center bg-white p-1 rounded-xl border border-sky-100 shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => setAttendanceMode("morning")}
                  className={
                    attendanceMode === "morning"
                      ? "bg-sky-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border-0 cursor-pointer shadow-xs"
                      : "bg-transparent text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border-0 cursor-pointer"
                  }
                >
                  <Sun size={14} />
                  <span>Morning Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceMode("night")}
                  className={
                    attendanceMode === "night"
                      ? "bg-sky-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border-0 cursor-pointer shadow-xs"
                      : "bg-transparent text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border-0 cursor-pointer"
                  }
                >
                  <Moon size={14} />
                  <span>Night Attendance</span>
                </button>
              </div>

              {/* Right: View Mode & Export Report */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center bg-white p-1 rounded-xl border border-sky-100 shadow-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("daily")}
                    className={
                      viewMode === "daily"
                        ? "bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition border-0 cursor-pointer shadow-xs"
                        : "bg-transparent text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium transition border-0 cursor-pointer"
                    }
                  >
                    Daily Attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("monthly")}
                    className={
                      viewMode === "monthly"
                        ? "bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition border-0 cursor-pointer shadow-xs"
                        : "bg-transparent text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium transition border-0 cursor-pointer"
                    }
                  >
                    Monthly Attendance
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="border border-sky-300 text-sky-700 hover:bg-sky-50 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer bg-white shadow-xs"
                >
                  <Download size={14} />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* Attendance Filter Section (4 Columns) */}
            <div className="w-full max-w-full box-border p-4 bg-white rounded-2xl border border-sky-100 mb-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. SEARCH STUDENT */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  SEARCH STUDENT
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Search by name, adm no, room..."
                    value={attSearchQuery}
                    onChange={(e) => setAttSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                  />
                  <Search size={15} className="text-slate-400 absolute left-3 pointer-events-none" />
                </div>
              </div>

              {/* 2. ATTENDANCE DATE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  ATTENDANCE DATE
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                />
              </div>

              {/* 3. HOSTEL BLOCK */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  HOSTEL BLOCK
                </label>
                <select
                  value={attHostelBlock}
                  onChange={(e) => setAttHostelBlock(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  <option value="All Blocks">All Blocks</option>
                  {blocks.map((blk) => (
                    <option key={blk.id || blk.name} value={blk.name}>
                      {blk.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. ROOM / FLOOR */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  ROOM / FLOOR
                </label>
                <select
                  value={attRoomFloor}
                  onChange={(e) => setAttRoomFloor(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  {ROOM_FLOOR_OPTIONS.map((rf) => (
                    <option key={rf} value={rf}>
                      {rf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attendance Summary Card */}
            <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-sky-100 pb-2">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-sky-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    ATTENDANCE SUMMARY ({attendanceMode.toUpperCase()})
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500">Date: {attendanceDate}</span>
              </div>

              {/* 5 Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 w-full max-w-full box-border">
                {/* Total */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    TOTAL STUDENTS
                  </span>
                  <span className="text-2xl font-bold text-slate-900 block mt-0.5">
                    {attendanceSummaryStats.total}
                  </span>
                </div>

                {/* Present */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase block">
                    PRESENT
                  </span>
                  <span className="text-2xl font-bold text-emerald-700 block mt-0.5">
                    {attendanceSummaryStats.present}
                  </span>
                </div>

                {/* Absent */}
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase block">
                    ABSENT
                  </span>
                  <span className="text-2xl font-bold text-rose-700 block mt-0.5">
                    {attendanceSummaryStats.absent}
                  </span>
                </div>

                {/* On Leave */}
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase block">
                    ON LEAVE
                  </span>
                  <span className="text-2xl font-bold text-amber-700 block mt-0.5">
                    {attendanceSummaryStats.leave}
                  </span>
                </div>

                {/* Half Day */}
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl">
                  <span className="text-[11px] font-semibold text-sky-700 uppercase block">
                    HALF DAY
                  </span>
                  <span className="text-2xl font-bold text-sky-700 block mt-0.5">
                    {attendanceSummaryStats.halfDay}
                  </span>
                </div>
              </div>

              {/* Quick Bulk Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-sky-100 flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  QUICK BULK ACTIONS:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAllAbsent}
                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition"
                  >
                    Mark All Absent
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkAllLeave}
                    className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition"
                  >
                    Mark All Leave
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition border-0"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm my-3">
              <div className="w-full max-w-full overflow-x-auto">
                {viewMode === "daily" ? (
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ADMISSION NO
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STUDENT NAME
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          HOSTEL BLOCK
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ROOM &amp; BED NO
                        </th>
                        {attendanceMode === "night" && (
                          <>
                            <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                              IN TIME
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                              OUT TIME
                            </th>
                          </>
                        )}
                        <th className="text-center py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ATTENDANCE STATUS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {filteredAttendanceStudents.map((st) => {
                        const rec = activeAttendanceRecords[st.id] || { status: "Present" };
                        return (
                          <tr key={st.id} className="hover:bg-sky-50/40 transition">
                            <td className="py-3 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {st.id}
                            </td>
                            <td className="py-3 px-4 font-bold text-sm text-slate-900 whitespace-nowrap">
                              <span
                                onClick={() => handleOpenDetails(st)}
                                className="hover:underline cursor-pointer text-sky-700"
                                title="Click to view/edit attendance details"
                              >
                                {st.name}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                                {st.block}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                              {st.roomBed}
                            </td>
                            {attendanceMode === "night" && (
                              <>
                                <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                                  {rec.inTime || "08:00 PM"}
                                </td>
                                <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                                  {rec.outTime || "09:30 PM"}
                                </td>
                              </>
                            )}
                            <td className="py-3 px-4 whitespace-nowrap text-center">
                              <div className="inline-flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Present")}
                                  className={
                                    rec.status === "Present"
                                      ? "bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-xs border-0 cursor-pointer"
                                      : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  }
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Absent")}
                                  className={
                                    rec.status === "Absent"
                                      ? "bg-rose-600 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-xs border-0 cursor-pointer"
                                      : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  }
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Half Day")}
                                  className={
                                    rec.status === "Half Day"
                                      ? "bg-sky-600 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-xs border-0 cursor-pointer"
                                      : "bg-white text-sky-700 hover:bg-sky-50 border border-sky-200 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  }
                                >
                                  Half Day
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(st.id, "Leave")}
                                  className={
                                    rec.status === "Leave"
                                      ? "bg-amber-600 text-white font-bold px-3 py-1 rounded-lg text-xs shadow-xs border-0 cursor-pointer"
                                      : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                  }
                                >
                                  Leave
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  /* Monthly Attendance Breakdown View */
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STUDENT &amp; ADM NO
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          HOSTEL BLOCK
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          TOTAL DAYS
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-emerald-800 uppercase whitespace-nowrap">
                          PRESENT
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-rose-800 uppercase whitespace-nowrap">
                          ABSENT
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-amber-800 uppercase whitespace-nowrap">
                          LEAVE
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          PERCENTAGE
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {MONTHLY_ATTENDANCE_DATA.map((st) => (
                        <tr key={st.id} className="hover:bg-sky-50/40 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              onClick={() => handleOpenDetails(st)}
                              className="font-bold text-sky-800 hover:underline cursor-pointer text-sm block"
                              title="Click to view/edit attendance details"
                            >
                              {st.name}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {st.id}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                            {st.block}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                            {st.totalDays}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700 whitespace-nowrap">
                            {st.present}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-700 whitespace-nowrap">
                            {st.absent}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-700 whitespace-nowrap">
                            {st.leave}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-block bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2.5 py-0.5 text-xs font-bold">
                              {st.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. SCREEN 5: OUTPASS & LEAVE MANAGEMENT                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "outpass" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <LogOut size={26} className="text-sky-600 flex-shrink-0" />
                <span>Outpass &amp; Leave Management</span>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyOutpassOpen(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0 flex-shrink-0"
              >
                <Plus size={15} />
                <span>Apply Outpass / Leave</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="w-full max-w-full box-border p-3 bg-white rounded-2xl border border-sky-100 mb-4 flex items-center justify-between gap-3 shadow-sm flex-wrap sm:flex-nowrap">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search student, adm no, room..."
                  value={outpassSearch}
                  onChange={(e) => setOutpassSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                />
                <Search size={15} className="text-slate-400 absolute left-3 pointer-events-none" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={outpassFilter}
                  onChange={(e) => setOutpassFilter(e.target.value)}
                  className="h-10 w-48 sm:w-56 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  <option value="">Select Option</option>
                  <option value="all">All Statuses</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Empty State vs Outpass Table */}
            {showEmptyStateOutpass ? (
              <div className="w-full max-w-full box-border bg-white border border-sky-100 rounded-3xl py-24 px-6 text-center my-3 shadow-sm">
                <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <LogOut size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Please enter a search query to load records.
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Enter a student name, admission number, or select a filter option above to view outpass and leave applications.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STUDENT &amp; ADM NO
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          REQUEST TYPE
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          HOSTEL &amp; ROOM
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          DEPARTURE
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          RETURN
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          REASON
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STATUS
                        </th>
                        <th className="text-center py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {filteredOutpasses.map((op) => (
                        <tr key={op.id} className="hover:bg-sky-50/40 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 text-sm block">
                              {op.studentName}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {op.admissionNo}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="bg-sky-50 text-sky-700 border border-sky-200 rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                              {op.requestType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                            {op.blockName} • {op.roomNo}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                            {op.outDate}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                            {op.returnDate} {op.returnTime}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                            {op.reason}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block ${
                                op.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : op.status === "Pending Approval"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {op.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {op.status === "Pending Approval" ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApproveOutpass(op.id)}
                                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectOutpass(op.id)}
                                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. SCREEN 6: TRANSFER & VACATE STUDENT                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "transfer" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <ArrowLeftRight size={26} className="text-sky-600 flex-shrink-0" />
                <span>Transfer &amp; Vacate Student</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0 flex-shrink-0"
              >
                <Plus size={15} />
                <span>Request Transfer / Vacate</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="w-full max-w-full box-border p-3 bg-white rounded-2xl border border-sky-100 mb-4 flex items-center justify-between gap-3 shadow-sm flex-wrap sm:flex-nowrap">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search student, adm no, room..."
                  value={transferSearch}
                  onChange={(e) => setTransferSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                />
                <Search size={15} className="text-slate-400 absolute left-3 pointer-events-none" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={transferFilter}
                  onChange={(e) => setTransferFilter(e.target.value)}
                  className="h-10 w-48 sm:w-56 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  <option value="">Select Option</option>
                  <option value="all">All Requests</option>
                  <option value="Block Transfer">Block Transfer</option>
                  <option value="Room Change">Room Change</option>
                  <option value="Vacate Bed">Vacate Bed</option>
                </select>
              </div>
            </div>

            {/* Empty State vs Transfer Table */}
            {showEmptyStateTransfer ? (
              <div className="w-full max-w-full box-border bg-white border border-sky-100 rounded-3xl py-24 px-6 text-center my-3 shadow-sm">
                <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <ArrowLeftRight size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Please enter a search query or filter to load transfer and vacate records.
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Select a filter option or enter search criteria above to load student transfer and vacate history.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STUDENT &amp; ADM NO
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          CURRENT ALLOCATION
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          REQUEST TYPE
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          TARGET ALLOCATION
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          REQUEST DATE
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          REASON
                        </th>
                        <th className="text-left py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          STATUS
                        </th>
                        <th className="text-center py-3.5 px-4 text-xs font-bold text-sky-900 uppercase whitespace-nowrap">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {filteredTransfers.map((tr) => (
                        <tr key={tr.id} className="hover:bg-sky-50/40 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 text-sm block">
                              {tr.studentName}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {tr.admissionNo}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                            {tr.currentBlock} • {tr.currentRoom}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="bg-sky-50 text-sky-700 border border-sky-200 rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                              {tr.requestType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                            {tr.targetBlock !== "--" ? `${tr.targetBlock} • ${tr.targetRoom}` : "--"}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                            {tr.requestDate}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                            {tr.reason}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block ${
                                tr.status === "Approved" || tr.status === "Processed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {tr.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {tr.status === "Pending Review" ? (
                              <button
                                type="button"
                                onClick={() => handleApproveTransfer(tr.id)}
                                className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition border-0"
                              >
                                Approve
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: "+ ALLOCATE ROOM & BED" (Tab 1)                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isAllocateModalOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAllocateModal();
            }}
          >
            <div className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-sky-100">
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  {editingAlloc ? "Edit Room Allocation" : "Allocate Student Room & Bed"}
                </h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAllocateModal}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAllocateSubmit}>
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Karthik Raj"
                      required
                      value={newAlloc.name}
                      onChange={(e) => setNewAlloc({ ...newAlloc, name: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Admission Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ADM-2024-150"
                      required
                      value={newAlloc.admNo}
                      onChange={(e) => setNewAlloc({ ...newAlloc, admNo: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newAlloc.gender}
                      onChange={(e) => setNewAlloc({ ...newAlloc, gender: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Hostel Block <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newAlloc.block}
                      onChange={(e) => setNewAlloc({ ...newAlloc, block: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      {blocks.map((blk) => (
                        <option key={blk.id || blk.name} value={blk.name}>
                          {blk.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Floor</label>
                    <select
                      value={newAlloc.floor}
                      onChange={(e) => setNewAlloc({ ...newAlloc, floor: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      <option value="Floor 1">Floor 1</option>
                      <option value="Floor 2">Floor 2</option>
                      <option value="Floor 3">Floor 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Room</label>
                    <input
                      type="text"
                      placeholder="e.g. Room #104"
                      value={newAlloc.room}
                      onChange={(e) => setNewAlloc({ ...newAlloc, room: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Bed</label>
                    <select
                      value={newAlloc.bed}
                      onChange={(e) => setNewAlloc({ ...newAlloc, bed: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      <option value="BED-1">BED-1</option>
                      <option value="BED-2">BED-2</option>
                      <option value="BED-3">BED-3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Monthly Fee</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹6,500"
                      value={newAlloc.fee}
                      onChange={(e) => setNewAlloc({ ...newAlloc, fee: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Allocation Date</label>
                    <input
                      type="date"
                      value={newAlloc.joinDate}
                      onChange={(e) => setNewAlloc({ ...newAlloc, joinDate: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-3 border-t border-sky-100">
                  <button
                    type="button"
                    onClick={handleCloseAllocateModal}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    {editingAlloc ? "Update Allocation" : "Confirm Allocation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 2: "VACATE BED MODAL" (Tab 1)                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isVacateModalOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseVacateModal();
            }}
          >
            <div className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-sky-100">
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  Request Transfer / Vacate Bed
                </h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseVacateModal}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleVacateSubmit}>
                <div className="mb-3.5">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Resident Student
                  </label>
                  <input
                    type="text"
                    disabled
                    value={targetStudent}
                    className="w-full border border-sky-100 rounded-xl text-sm p-2.5 outline-none bg-slate-50 text-slate-700 cursor-not-allowed box-border"
                  />
                </div>

                <div className="mb-3.5">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Action Type
                  </label>
                  <select className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border">
                    <option>Vacate Bed &amp; Release to Inventory</option>
                    <option>Transfer to Another Block / Room</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Reason / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Switched to Day Scholar / Course Completed"
                    value={vacateReason}
                    onChange={(e) => setVacateReason(e.target.value)}
                    className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                  />
                </div>

                <div className="flex justify-between items-center mt-6 pt-3 border-t border-sky-100">
                  <button
                    type="button"
                    onClick={handleCloseVacateModal}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    Approve &amp; Release Bed
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 3: "SAVE ATTENDANCE LOG" (Tab 2)                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isSaveLogModalOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSaveLogModalOpen(false);
            }}
          >
            <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100 text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
                <Save size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Save Attendance Log
              </h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Confirm saving attendance records for {attendanceDate} (
                {attendanceMode.toUpperCase()}) across {filteredAttendanceStudents.length} students?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSaveLogModalOpen(false)}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveLog}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition border-0"
                >
                  Confirm &amp; Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 3B: STUDENT ATTENDANCE DETAILS & EDIT (Tab 2)             */}
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
            <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border border-sky-100 animate-fade-in">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-sky-100">
                <h3 id="student-details-title" className="text-base font-bold text-slate-900 m-0">
                  Student Attendance Details
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForDetails(null)}
                  className="text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-1"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveStudentDetails}>
                {/* Student Info Card */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-sky-100 mb-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Student Name:</span>
                    <span className="font-bold text-slate-900">
                      {selectedStudentForDetails.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Admission Number:</span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {selectedStudentForDetails.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Hostel Block:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedStudentForDetails.block}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Room &amp; Bed:</span>
                    <span className="text-sky-800 font-semibold">
                      {selectedStudentForDetails.roomBed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Attendance Date:</span>
                    <span className="text-slate-800 font-semibold">{attendanceDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Attendance Mode:</span>
                    <span className="text-slate-800 font-semibold">
                      {attendanceMode === "morning" ? "Morning Attendance" : "Night Attendance"}
                    </span>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : st === "Absent"
                              ? "bg-rose-600 text-white border-rose-600"
                              : st === "Half Day"
                              ? "bg-sky-600 text-white border-sky-600"
                              : "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-slate-600 border-sky-100 hover:bg-sky-50"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                      className="w-full h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                      className="w-full h-10 px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-sky-100">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForDetails(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-xs transition cursor-pointer border-0"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer border-0"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 4: "+ APPLY OUTPASS / LEAVE" (Tab 3)                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isApplyOutpassOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsApplyOutpassOpen(false);
            }}
          >
            <div className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-sky-100">
                <h3 className="text-lg font-bold text-slate-900 m-0">Apply Outpass / Leave</h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={() => setIsApplyOutpassOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleApplyOutpassSubmit}>
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={newOutpass.studentName}
                      onChange={(e) => setNewOutpass({ ...newOutpass, studentName: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Admission Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ADM-2024-001"
                      value={newOutpass.admissionNo}
                      onChange={(e) => setNewOutpass({ ...newOutpass, admissionNo: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Request Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newOutpass.requestType}
                      onChange={(e) => setNewOutpass({ ...newOutpass, requestType: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      <option value="Local Outpass">Local Outpass</option>
                      <option value="Weekend Home Pass">Weekend Home Pass</option>
                      <option value="Emergency Leave">Emergency Leave</option>
                      <option value="Medical Leave">Medical Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Hostel Block <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newOutpass.blockName}
                      onChange={(e) => setNewOutpass({ ...newOutpass, blockName: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      {blocks.map((blk) => (
                        <option key={blk.id || blk.name} value={blk.name}>
                          {blk.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Departure Date &amp; Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-09-12 14:00"
                      value={newOutpass.outDate}
                      onChange={(e) => setNewOutpass({ ...newOutpass, outDate: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Return Date &amp; Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-09-12 19:30"
                      value={newOutpass.returnTime}
                      onChange={(e) => setNewOutpass({ ...newOutpass, returnTime: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Family function at hometown / Medical checkup"
                    value={newOutpass.reason}
                    onChange={(e) => setNewOutpass({ ...newOutpass, reason: e.target.value })}
                    className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                  />
                </div>

                <div className="flex justify-between items-center mt-6 pt-3 border-t border-sky-100">
                  <button
                    type="button"
                    onClick={() => setIsApplyOutpassOpen(false)}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 5: "+ REQUEST TRANSFER / VACATE" (Tab 4)                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isTransferModalOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsTransferModalOpen(false);
            }}
          >
            <div className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-sky-100">
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  Request Transfer / Vacate Student
                </h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={() => setIsTransferModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTransferSubmit}>
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={newTransfer.studentName}
                      onChange={(e) => setNewTransfer({ ...newTransfer, studentName: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Admission Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ADM-2024-001"
                      value={newTransfer.admissionNo}
                      onChange={(e) => setNewTransfer({ ...newTransfer, admissionNo: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Action / Request Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTransfer.requestType}
                      onChange={(e) => setNewTransfer({ ...newTransfer, requestType: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      <option value="Block Transfer">Block Transfer</option>
                      <option value="Room Change">Room Change</option>
                      <option value="Vacate Bed">Vacate Bed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Current Allocation
                    </label>
                    <input
                      type="text"
                      value={`${newTransfer.currentBlock} • ${newTransfer.currentRoom}`}
                      onChange={(e) => setNewTransfer({ ...newTransfer, currentRoom: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                {newTransfer.requestType !== "Vacate Bed" && (
                  <div className="grid grid-cols-2 gap-3 mb-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Target Hostel Block
                      </label>
                      <select
                        value={newTransfer.targetBlock}
                        onChange={(e) => setNewTransfer({ ...newTransfer, targetBlock: e.target.value })}
                        className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                      >
                        {blocks.map((blk) => (
                          <option key={blk.id || blk.name} value={blk.name}>
                            {blk.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Target Room
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Room #201"
                        value={newTransfer.targetRoom}
                        onChange={(e) => setNewTransfer({ ...newTransfer, targetRoom: e.target.value })}
                        className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                      />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Switched to Day Scholar / Medical relocation"
                    value={newTransfer.reason}
                    onChange={(e) => setNewTransfer({ ...newTransfer, reason: e.target.value })}
                    className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                  />
                </div>

                <div className="flex justify-between items-center mt-6 pt-3 border-t border-sky-100">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    Submit Request
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

// Named export aliases for compatibility across imports
export { StudentHostelManagement, StudentHostelManagement as HostelStudentManagement };
