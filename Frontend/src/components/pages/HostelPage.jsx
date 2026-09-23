import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Building2,
  Layers,
  BedDouble,
  ShieldCheck,
  Users,
  Clock,
  ArrowRightLeft,
  UserCheck,
  BarChart3,
  Search,
  Plus,
  Download,
  Edit3,
  Trash2,
  Eye,
  Check,
  X,
  Printer,
  Phone,
  Mail,
  UserPlus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  Calendar,
  Sun,
  Moon,
  Bookmark,
  Save,
  IndianRupee,
  Info,
  CheckCircle2,
  XCircle,
  LogOut,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, ConfirmDialog, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import * as hostelApi from "@/api/hostelApi.js";
import "./HostelPage.css";

// ── Tab Configurations (4 Major Tabs with Subtabs matching Transport Reference) ──
const majorTabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "setup", label: "Hostel Master Setup", icon: Building2 },
  { id: "students", label: "Student Management", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

const setupSubtabs = [
  { id: "blocks", label: "Hostel Blocks", title: "Hostel Blocks Master", subtitle: "Configure physical residences, gender assignments, and floor capacity", icon: Building2 },
  { id: "categories", label: "Room Categories", title: "Room Categories Master", subtitle: "Define room accommodation tiers, standard tariffs, and specifications", icon: Layers },
  { id: "rooms", label: "Rooms & Bed Allocation", title: "Rooms & Bed Allocation", subtitle: "Physical room numbers, floor location, bed allocation status and monthly rates", icon: Home },
  { id: "wardens", label: "Warden Allocation", title: "Resident Wardens", subtitle: "Staff assignments, duty blocks, direct phone lines, and supervision oversight", icon: Users },
];

const studentSubtabs = [
  { id: "allocations", label: "Student Hostel Allocation", title: "Student Room Allocations", subtitle: "Active resident students, room and bed numbers, joining records, and room vacate workflow", icon: UserPlus },
  { id: "attendance", label: "Hostel Attendance Register", title: "Hostel Attendance Register", subtitle: "Biometric and roll call daily logs for resident hostellers", icon: Users },
  { id: "outpasses", label: "Outpass & Leave Management", title: "Outpass & Leave Requests", subtitle: "Manage student gate passes, weekend home permissions, emergency leaves, and warden approvals", icon: ArrowRightLeft },
  { id: "transfers", label: "Transfer & Vacate Student", title: "Hostel Transfers & Bed Vacations", subtitle: "Track inter-block migrations, room swaps, and official bed vacation applications", icon: RotateCcw },
];

// Reference Academic Year Months for Monthly Attendance
const academicMonthOptions = [
  { value: "2026-06", label: "June 2026", rangeText: "Jun 1, 2026 – Jun 30, 2026" },
  { value: "2026-07", label: "July 2026", rangeText: "Jul 1, 2026 – Jul 31, 2026" },
  { value: "2026-08", label: "August 2026", rangeText: "Aug 1, 2026 – Aug 31, 2026" },
  { value: "2026-09", label: "September 2026", rangeText: "Sep 1, 2026 – Sep 30, 2026" },
  { value: "2026-10", label: "October 2026", rangeText: "Oct 1, 2026 – Oct 31, 2026" },
  { value: "2026-11", label: "November 2026", rangeText: "Nov 1, 2026 – Nov 30, 2026" },
  { value: "2026-12", label: "December 2026", rangeText: "Dec 1, 2026 – Dec 31, 2026" },
  { value: "2027-01", label: "January 2027", rangeText: "Jan 1, 2027 – Jan 31, 2027" },
  { value: "2027-02", label: "February 2027", rangeText: "Feb 1, 2027 – Feb 28, 2027" },
  { value: "2027-03", label: "March 2027", rangeText: "Mar 1, 2027 – Mar 31, 2027" },
  { value: "2027-04", label: "April 2027", rangeText: "Apr 1, 2027 – Apr 30, 2027" },
  { value: "2027-05", label: "May 2027", rangeText: "May 1, 2027 – May 31, 2027" },
];






const hostelReportCategories = [
  { id: "Block Report", label: "Block Report" },
  { id: "Room Report", label: "Room Report" },
  { id: "Bed Allocation Report", label: "Bed Allocation Report" },
  { id: "Student Allocation Report", label: "Student Allocation Report" },
  { id: "Attendance Report", label: "Attendance Report" },
  { id: "Outpass & Leave Report", label: "Outpass & Leave Report" },
  { id: "Transfer & Vacate Report", label: "Transfer & Vacate Report" },
  { id: "Warden Report", label: "Warden Report" },
];

const reportOptions = [
  { id: "summary", label: "Hostel Facilities Summary" },
  { id: "occupancy", label: "Block-by-Block Occupancy" },
  { id: "allocations", label: "Resident Student Allocations" },
  { id: "wardens", label: "Wardens Directory & Lines" },
  { id: "attendance", label: "Daily Attendance Audit Log" },
  { id: "outpasses", label: "Outpass & Leave Movement Log" },
  { id: "transfers", label: "Migration & Vacate Movement Log" },
];

// ── CSV Export Utility ────────────────────────────────────────────────
function exportCsv(filename, rows, columns) {
  const header = columns.map((col) => `"${col.label}"`).join(",");
  const body = rows.map((row) =>
    columns
      .map((col) => {
        const val = typeof col.value === "function" ? col.value(row) : row[col.key];
        return `"${String(val ?? "").replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const blob = new Blob([[header, ...body].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ── Component Definition ──────────────────────────────────────────────
export default function HostelPage() {
  const location = useLocation();

  // ── Navigation Tabs State ───────────────────────────────────────────
  const [activeMajorTab, setActiveMajorTab] = useState("dashboard");
  const [activeSetupSubtab, setActiveSetupSubtab] = useState("blocks");
  const [activeStudentSubtab, setActiveStudentSubtab] = useState("allocations");

  // ── Dashboard Interactive State ─────────────────────────────────────
  const [dashBlockSearch, setDashBlockSearch] = useState("");
  const [dashSelectedBlockId, setDashSelectedBlockId] = useState("blk-1");
  const [dashBlockPage, setDashBlockPage] = useState(1);

  // ── API-backed State Initialization ─────────────────────────────────
  const [blocks, setBlocks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [outpasses, setOutpasses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState(() => ({ morning: {}, night: {} }));
  const [beds, setBeds] = useState([]);
  const [candidateStaff, setCandidateStaff] = useState([]);
  const [candidateAdmissions, setCandidateAdmissions] = useState([]);
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // ── API Response Mappers ────────────────────────────────────────────
  const mapBlock = useCallback((b) => ({
    id: b.hostelId ?? b.id,
    name: b.hostelName ?? b.name ?? "",
    code: b.hostelCode ?? b.code ?? "",
    type: b.hostelType ?? b.type ?? "Boys",
    floors: b.totalFloors ?? b.floors ?? 1,
    totalRooms: b.totalRooms ?? 0,
    totalBeds: b.totalBeds ?? 0,
    occupiedBeds: b.occupiedBeds ?? 0,
    vacantBeds: b.availableBeds ?? b.vacantBeds ?? 0,
    warden: b.wardenName ?? b.warden ?? "Unassigned",
    wardenPhone: b.primaryMobileNumber ?? b.wardenPhone ?? "-",
    email: b.email ?? "",
    address: b.address ?? "",
    status: b.status ?? "Active",
  }), []);

  const mapCategory = useCallback((c) => ({
    id: c.roomTypeId ?? c.id,
    name: c.roomTypeSpecification ?? c.name ?? "",
    specification: c.roomTypeSpecification ?? c.specification ?? "",
    type: c.acType === "AC" ? "AC Accommodation" : c.acType === "Non-AC" ? "Non-AC Standard" : (c.type ?? ""),
    capacity: c.bedCapacity ?? c.capacity ?? 1,
    acType: c.acType ?? "Non-AC",
    fee: c.fee ?? "",
    totalRooms: c.totalRooms ?? 0,
    totalBeds: c.totalBeds ?? 0,
    blocks: c.blocks ?? "",
    description: c.description ?? "",
    status: c.status ?? "Active",
  }), []);

  const mapRoom = useCallback((r) => ({
    id: r.roomId ?? r.id,
    roomNo: r.roomNumber ?? r.roomNo ?? "",
    block: r.hostelCode ?? r.block ?? "",
    blockName: r.hostelName ?? r.blockName ?? "",
    floor: r.floorLevel ?? r.floor ?? "",
    type: r.roomTypeSpecification ?? r.type ?? "",
    capacity: r.bedCapacity ?? r.capacity ?? 1,
    acType: r.acType ?? "",
    occupied: r.occupied ?? 0,
    fee: r.fee ?? "",
    beds: r.beds ?? [],
    status: r.status ?? "Active",
    hostelId: r.hostelId,
    roomTypeId: r.roomTypeId,
  }), []);

  const mapBed = useCallback((bd) => ({
    id: bd.bedId ?? bd.id,
    roomId: bd.roomId,
    roomNumber: bd.roomNumber ?? "",
    hostelId: bd.hostelId,
    bedNumber: bd.bedNumber ?? "",
    bedStatus: bd.bedStatus ?? "Available",
    status: bd.status ?? "Active",
  }), []);

  const mapWarden = useCallback((w) => ({
    id: w.wardenAssignmentId ?? w.id,
    empId: w.employeeId ?? w.empId ?? "",
    name: w.wardenName ?? [w.firstName, w.middleName, w.lastName].filter(Boolean).join(" ") ?? w.name ?? "",
    designation: w.designation ?? "Resident Warden",
    phone: w.phone ?? "",
    email: w.email ?? "",
    assignedHostels: w.hostelName ?? w.assignedHostels ?? "",
    hostelId: w.hostelId,
    staffId: w.staffId,
    assignmentDate: w.assignmentDate ?? "",
    gender: w.gender ?? "",
    status: w.status ?? "Active",
  }), []);

  const mapAllocation = useCallback((a) => ({
    id: a.allocationId ?? a.id,
    admissionNo: a.admissionNo ?? "",
    studentName: a.studentName ?? a.name ?? "",
    gender: a.gender ?? "",
    blockName: a.hostelName ?? a.blockName ?? "",
    blockCode: a.hostelCode ?? a.blockCode ?? "",
    floor: a.floorLevel ?? a.floor ?? "",
    room: a.roomNumber ? `Room #${a.roomNumber}` : (a.room ?? ""),
    bed: a.bedNumber ?? a.bed ?? "",
    roomBadge: a.roomNumber && a.bedNumber ? `Room #${a.roomNumber} (${a.bedNumber})` : (a.roomBadge ?? ""),
    joinDate: a.joiningDate ? a.joiningDate.split("T")[0] : (a.joinDate ?? ""),
    status: a.status ?? "Active",
    monthlyFee: a.monthlyFee ?? "",
    contact: a.contact ?? "",
    remarks: a.remarks ?? "",
    hostelId: a.hostelId,
    roomId: a.roomId,
    bedId: a.bedId,
    studentId: a.studentId,
    wardenAssignmentId: a.wardenAssignmentId,
  }), []);

  const mapOutpass = useCallback((o) => ({
    id: o.requestId ?? o.id,
    studentName: o.studentName ?? "",
    admissionNo: o.admissionNo ?? "",
    blockName: o.hostelName ?? o.blockName ?? "",
    roomNo: o.roomNumber ?? o.roomNo ?? "",
    roomNumber: o.roomNumber ?? o.roomNumber ?? "",
    outpassType: o.requestType ?? o.outpassType ?? "",
    requestType: o.requestType ?? "",
    departureDate: o.fromDateTime ? o.fromDateTime.split("T")[0] : (o.departureDate ?? ""),
    outDate: o.fromDateTime ?? o.outDate ?? "",
    returnDate: o.toDateTime ? o.toDateTime.split("T")[0] : (o.returnDate ?? ""),
    reason: o.reason ?? "",
    destination: o.destination ?? "",
    status: o.approvalStatus ?? o.status ?? "Pending",
    approvalRemarks: o.approvalRemarks ?? "",
    hostelId: o.hostelId,
    studentId: o.studentId,
    roomId: o.roomId,
    bedId: o.bedId,
    wardenAssignmentId: o.wardenAssignmentId,
  }), []);

  const mapTransfer = useCallback((t) => ({
    id: t.requestId ?? t.id,
    studentName: t.studentName ?? "",
    admissionNo: t.admissionNo ?? "",
    actionType: t.requestType === "Transfer" ? "Room Transfer" : (t.requestType === "Vacate" ? "Bed Vacate" : (t.actionType ?? t.requestType ?? "")),
    requestType: t.requestType ?? "",
    currentBlock: t.fromHostelName ?? t.currentBlock ?? "",
    currentRoom: t.fromRoomNumber ?? t.currentRoom ?? "",
    currentRoomDisplay: t.fromHostelName && t.fromRoomNumber ? `${t.fromHostelName} (#${t.fromRoomNumber})` : (t.currentRoomDisplay ?? ""),
    targetBlock: t.toHostelName ?? t.targetBlock ?? "--",
    targetRoom: t.toRoomNumber ?? t.targetRoom ?? "--",
    targetBed: t.toBedNumber ?? t.targetBed ?? "--",
    targetDisplayTitle: t.toHostelName && t.toRoomNumber ? `New Bed: ${t.toHostelName} (#${t.toRoomNumber})` : (t.requestType === "Vacate" ? "✓ Old Bed Released to Available" : (t.targetDisplayTitle ?? "--")),
    targetDisplaySub: t.toHostelName && t.fromRoomNumber ? `✓ Old Bed #${t.fromRoomNumber} Released to Available` : (t.targetDisplaySub ?? null),
    feeAdjustment: t.requestType === "Vacate" && t.refundAmount ? `Fee Adjusted: ₹${t.refundAmount.toLocaleString()}` : (t.feeAdjustment ?? null),
    date: t.requestDate ? (typeof t.requestDate === "string" ? t.requestDate.split("T")[0] : t.requestDate) : (t.date ?? ""),
    requestDate: t.requestDate ? (typeof t.requestDate === "string" ? t.requestDate.split("T")[0] : t.requestDate) : (t.requestDate ?? ""),
    status: t.approvalStatus ?? t.status ?? "Pending",
    reason: t.reason ?? "",
    allocationId: t.allocationId,
    studentId: t.studentId,
    fromHostelId: t.fromHostelId,
    fromRoomId: t.fromRoomId,
    fromBedId: t.fromBedId,
    toHostelId: t.toHostelId,
    toRoomId: t.toRoomId,
    toBedId: t.toBedId,
    wardenAssignmentId: t.wardenAssignmentId,
    approvalStatus: t.approvalStatus ?? "",
    feeSettlementStatus: t.feeSettlementStatus ?? "",
  }), []);

  // ── Fetch all hostel data from API on mount ─────────────────────────
  const fetchHostelData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [blocksRes, catsRes, roomsRes, bedsRes, wardensRes, allocsRes, outpassRes, transferRes, dashRes, staffRes, admRes, studentsRes] = await Promise.allSettled([
        hostelApi.getHostelBlocks(),
        hostelApi.getRoomTypes(),
        hostelApi.getRooms(),
        hostelApi.getBeds(),
        hostelApi.getWardens(),
        hostelApi.getStudentAllocations(),
        hostelApi.getOutpassLeave(),
        hostelApi.getTransferVacate(),
        hostelApi.getHostelDashboard(),
        apiClient.get("/api/v1/staff?pageSize=100", { skipGlobalLoader: true }),
        apiClient.get("/api/v1/student-admissions?pageSize=100", { skipGlobalLoader: true }),
        apiClient.get("/api/v1/students?pageSize=200", { skipGlobalLoader: true }),
      ]);

      if (blocksRes.status === "fulfilled") {
        const rawBlocks = blocksRes.value?.data?.data;
        setBlocks(Array.isArray(rawBlocks) ? rawBlocks.map(mapBlock) : []);
      }
      if (catsRes.status === "fulfilled") {
        const rawCats = catsRes.value?.data?.data;
        setCategories(Array.isArray(rawCats) ? rawCats.map(mapCategory) : []);
      }
      if (roomsRes.status === "fulfilled") {
        const rawRooms = roomsRes.value?.data?.data;
        setRooms(Array.isArray(rawRooms) ? rawRooms.map(mapRoom) : []);
      }
      if (bedsRes.status === "fulfilled") {
        const rawBeds = bedsRes.value?.data?.data;
        setBeds(Array.isArray(rawBeds) ? rawBeds.map(mapBed) : []);
      }
      if (wardensRes.status === "fulfilled") {
        const rawWardens = wardensRes.value?.data?.data;
        setWardens(Array.isArray(rawWardens) ? rawWardens.map(mapWarden) : []);
      }
      if (allocsRes.status === "fulfilled") {
        const rawAllocs = allocsRes.value?.data?.data;
        const mapped = Array.isArray(rawAllocs) ? rawAllocs.map(mapAllocation) : [];
        setAllocations(mapped);
        // Derive attendance student list from active allocations
        setAttendanceStudents(mapped.filter(a => a.status === "Active").map(a => ({
          id: a.admissionNo || a.id,
          admissionNo: a.admissionNo,
          studentId: a.studentId,
          name: a.studentName,
          block: a.blockName,
          blockCode: a.blockCode,
          room: a.room,
          roomId: a.roomId,
          bed: a.bed,
          bedId: a.bedId,
          roomBed: a.roomBadge || `${a.room} (${a.bed})`,
          floor: a.floor,
          gender: a.gender,
          inTime: "07:00",
        })));
      }
      if (outpassRes.status === "fulfilled") {
        const rawOutpass = outpassRes.value?.data?.data;
        setOutpasses(Array.isArray(rawOutpass) ? rawOutpass.map(mapOutpass) : []);
      }
      if (transferRes.status === "fulfilled") {
        const rawTransfer = transferRes.value?.data?.data;
        setTransfers(Array.isArray(rawTransfer) ? rawTransfer.map(mapTransfer) : []);
      }
      if (dashRes.status === "fulfilled") {
        setDashboardData(dashRes.value?.data?.data ?? null);
      }
      if (staffRes.status === "fulfilled") {
        const rawStaff = staffRes.value?.data?.items || staffRes.value?.data?.data || staffRes.value?.data;
        if (Array.isArray(rawStaff)) setCandidateStaff(rawStaff);
      }
      if (admRes.status === "fulfilled") {
        const rawAdm = admRes.value?.data?.items || admRes.value?.data?.data || admRes.value?.data;
        if (Array.isArray(rawAdm)) setCandidateAdmissions(rawAdm);
      }
      if (studentsRes.status === "fulfilled") {
        const rawStudents = studentsRes.value?.data?.items || studentsRes.value?.data?.data || studentsRes.value?.data;
        if (Array.isArray(rawStudents)) setCandidateStudents(rawStudents);
      }
    } catch (err) {
      console.error("Failed to fetch hostel data:", err);
      setApiError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [mapBlock, mapCategory, mapRoom, mapBed, mapWarden, mapAllocation, mapOutpass, mapTransfer]);

  useEffect(() => {
    fetchHostelData();
  }, [fetchHostelData]);

  // Helper to refresh a specific entity list after mutation
  const refreshBlocks = useCallback(async () => {
    try {
      const res = await hostelApi.getHostelBlocks();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) setBlocks(raw.map(mapBlock));
    } catch (err) { console.error("Refresh blocks error:", err); }
  }, [mapBlock]);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await hostelApi.getRoomTypes();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) setCategories(raw.map(mapCategory));
    } catch (err) { console.error("Refresh categories error:", err); }
  }, [mapCategory]);

  const refreshRooms = useCallback(async () => {
    try {
      const res = await hostelApi.getRooms();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) setRooms(raw.map(mapRoom));
    } catch (err) { console.error("Refresh rooms error:", err); }
  }, [mapRoom]);

  const refreshBeds = useCallback(async () => {
    try {
      const res = await hostelApi.getBeds();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) setBeds(raw.map(mapBed));
    } catch (err) { console.error("Refresh beds error:", err); }
  }, [mapBed]);

  const refreshWardens = useCallback(async () => {
    try {
      const res = await hostelApi.getWardens();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) setWardens(raw.map(mapWarden));
    } catch (err) { console.error("Refresh wardens error:", err); }
  }, [mapWarden]);

  const refreshAllocations = useCallback(async () => {
    try {
      const res = await hostelApi.getStudentAllocations();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) {
        const mapped = raw.map(mapAllocation);
        setAllocations(mapped);
        setAttendanceStudents(mapped.filter(a => a.status === "Active").map(a => ({
          id: a.admissionNo || a.id,
          admissionNo: a.admissionNo,
          studentId: a.studentId,
          name: a.studentName,
          block: a.blockName,
          blockCode: a.blockCode,
          room: a.room,
          roomId: a.roomId,
          bed: a.bed,
          bedId: a.bedId,
          roomBed: a.roomBadge || `${a.room} (${a.bed})`,
          floor: a.floor,
          gender: a.gender,
          inTime: "07:00",
        })));
      }
    } catch (err) { console.error("Refresh allocations error:", err); }
  }, [mapAllocation]);

  const refreshOutpasses = useCallback(async () => {
    try {
      const res = await hostelApi.getOutpassLeave();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) setOutpasses(raw.map(mapOutpass));
    } catch (err) { console.error("Refresh outpasses error:", err); }
  }, [mapOutpass]);

  const refreshTransfers = useCallback(async () => {
    try {
      const res = await hostelApi.getTransferVacate();
      const raw = res?.data?.data;
      if (Array.isArray(raw)) setTransfers(raw.map(mapTransfer));
    } catch (err) { console.error("Refresh transfers error:", err); }
  }, [mapTransfer]);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await hostelApi.getHostelDashboard();
      setDashboardData(res?.data?.data ?? null);
    } catch (err) { console.error("Refresh dashboard error:", err); }
  }, []);

  // ── Synchronize route location with initial tab ──────────────────────
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("master") || path.includes("block")) {
      setActiveMajorTab("setup");
      if (path.includes("category")) setActiveSetupSubtab("categories");
      else if (path.includes("room")) setActiveSetupSubtab("rooms");
      else if (path.includes("warden")) setActiveSetupSubtab("wardens");
      else setActiveSetupSubtab("blocks");
    } else if (path.includes("students") || path.includes("student-allocation") || path.includes("allocat")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("allocations");
    } else if (path.includes("attendance")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("attendance");
    } else if (path.includes("outpass")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("outpasses");
    } else if (path.includes("transfer") || path.includes("vacat")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("transfers");
    } else if (path.includes("report")) {
      setActiveMajorTab("reports");
    } else if (path.includes("hostel")) {
      setActiveMajorTab("dashboard");
    }
  }, [location.pathname]);

  // ── Search & Filter State ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBlock, setFilterBlock] = useState("");
  const [filterHostelRooms, setFilterHostelRooms] = useState("");
  const [filterHostelWarden, setFilterHostelWarden] = useState("");
  const [filterAcType, setFilterAcType] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFloor, setFilterFloor] = useState("all");
  const [filterAllocSearch, setFilterAllocSearch] = useState("");
  const [filterAllocHostel, setFilterAllocHostel] = useState("all");
  const [filterAllocFloor, setFilterAllocFloor] = useState("all");
  const [filterAllocRoom, setFilterAllocRoom] = useState("all");

  // Outpass & Leave Filter State
  const [outpassSearch, setOutpassSearch] = useState("");
  const [outpassStatus, setOutpassStatus] = useState("");
  const [outpassType, setOutpassType] = useState("");

  // Transfer & Vacate Filter State (Screenshots 1 & 2)
  const [transferSearch, setTransferSearch] = useState("");
  const [transferFilter, setTransferFilter] = useState("all");
  const [isTransferFilterOpen, setIsTransferFilterOpen] = useState(false);

  // Attendance specific state matching Screenshot 1 & 2
  const [attendanceShift, setAttendanceShift] = useState("night");
  const [attendanceDate, setAttendanceDate] = useState("2026-09-17");
  const [attendanceFrequency, setAttendanceFrequency] = useState("daily");
  const [attendanceMonth, setAttendanceMonth] = useState("2026-09");
  const [customRangeStart, setCustomRangeStart] = useState("2026-09-01");
  const [customRangeEnd, setCustomRangeEnd] = useState("2026-09-17");
  const [appliedCustomRange, setAppliedCustomRange] = useState({ start: "2026-09-01", end: "2026-09-17" });
  const [rangeError, setRangeError] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceBlock, setAttendanceBlock] = useState("all");
  const [attendanceRoom, setAttendanceRoom] = useState("all");

  // Reports specific state (Matching User Reference Screenshot)
  const [reportType, setReportType] = useState("summary");
  const [reportCategory, setReportCategory] = useState("Block Report");
  const [reportBlockFilter, setReportBlockFilter] = useState("");
  const [reportCategoryFilter, setReportCategoryFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(5);
  const [isCustomReportPage, setIsCustomReportPage] = useState(false);
  const [customReportPageInput, setCustomReportPageInput] = useState("5");

  useEffect(() => {
    setReportPage(1);
  }, [reportCategory, reportBlockFilter, reportCategoryFilter, reportSearch]);

  // Global Dialogs & Modals
  const [modal, setModal] = useState({ isOpen: false, type: "", mode: "add", data: null });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    danger: false,
    confirmLabel: "Confirm",
    onConfirm: null,
  });
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const closeModal = () => setModal({ isOpen: false, type: "", mode: "add", data: null });
  const closeConfirm = () =>
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      danger: false,
      confirmLabel: "Confirm",
      onConfirm: null,
    });

  // ── Refresh data from API ───────────────────────────────────────────
  const handleResetData = async () => {
    try {
      showToast("Refreshing hostel data from server...", "info");
      await fetchHostelData();
      showToast("Hostel data refreshed from server successfully!");
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Enriched Blocks with Live Child & Dashboard Metrics ─────────────
  const enrichedBlocks = useMemo(() => {
    return blocks.map((b) => {
      const dbBlock = dashboardData?.blocks?.find(
        (db) => db.hostelId === b.id || db.hostelCode === b.code
      );
      const blockRooms = rooms.filter(
        (r) => r.hostelId === b.id || r.block === b.name || r.blockName === b.name
      );
      const totalRoomsCount = dbBlock?.totalRooms ?? blockRooms.length;
      const blockBeds = beds.filter((bd) => bd.hostelId === b.id);
      const totalBedsCount = dbBlock?.totalBeds ?? (blockBeds.length > 0 ? blockBeds.length : blockRooms.reduce((acc, r) => acc + (Number(r.capacity) || 1), 0));
      const occupiedCount = dbBlock?.occupiedBeds ?? allocations.filter((a) => a.hostelId === b.id && a.status === "Active").length;
      const vacantCount = dbBlock?.availableBeds ?? Math.max(0, totalBedsCount - occupiedCount);
      const assignedWarden = wardens.find((w) => w.hostelId === b.id);

      return {
        ...b,
        totalRooms: totalRoomsCount,
        totalBeds: totalBedsCount,
        occupiedBeds: occupiedCount,
        vacantBeds: vacantCount,
        warden: assignedWarden?.name || b.wardenName || "Unassigned",
        wardenPhone: assignedWarden?.phone || b.primaryMobileNumber || "-",
      };
    });
  }, [blocks, dashboardData, rooms, beds, allocations, wardens]);

  // ── Computed Metrics ────────────────────────────────────────────────
  const totalRooms = useMemo(
    () => dashboardData?.totalRooms ?? enrichedBlocks.reduce((acc, b) => acc + (Number(b.totalRooms) || 0), 0),
    [dashboardData, enrichedBlocks]
  );

  const totalBeds = useMemo(
    () => dashboardData?.totalBeds ?? enrichedBlocks.reduce((acc, b) => acc + (Number(b.totalBeds) || 0), 0),
    [dashboardData, enrichedBlocks]
  );

  const activeAllocations = useMemo(
    () => allocations.filter((a) => a.status === "Allocated" || a.status === "Active"),
    [allocations]
  );

  const occupiedBeds = dashboardData?.occupiedBeds ?? activeAllocations.length;
  const vacantBeds = dashboardData?.availableBeds ?? Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate = dashboardData?.occupancyPercentage ?? (totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0);
  const monthlyRevenue = useMemo(() => {
    return allocations.reduce((sum, a) => {
      const num = parseFloat(String(a.monthlyFee || "").replace(/[^0-9.]/g, "")) || 0;
      return sum + num;
    }, 0);
  }, [allocations]);
  const activeWardensCount = dashboardData?.activeWardens ?? wardens.filter((w) => w.status === "Active").length;
  const pendingOutpasses = useMemo(
    () => outpasses.filter((o) => o.status === "Pending" || o.status === "Pending Approval" || o.status === "Under Review").length,
    [outpasses]
  );

  // ── Block CRUD ──────────────────────────────────────────────────────
  const handleSaveBlock = async (blockData) => {
    try {
      const payload = {
        hostelName: blockData.name,
        hostelCode: blockData.code,
        hostelType: blockData.type || "Boys",
        totalFloors: Number(blockData.floors) || 1,
        address: blockData.address || blockData.location || "",
        status: blockData.status || "Active",
      };
      if (modal.mode === "edit") {
        await hostelApi.updateHostelBlock(blockData.id, payload);
        showToast(`Block ${blockData.name} updated successfully!`);
      } else {
        await hostelApi.createHostelBlock(payload);
        showToast(`Hostel block ${blockData.name} added successfully!`);
      }
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      console.error("Save block error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleDeleteBlock = (block) => {
    const hasRooms = rooms.some((r) => r.block === block.code || r.hostelId === block.id);
    const hasAllocs = allocations.some((a) => a.blockName === block.name || a.blockCode === block.code || a.hostelId === block.id);

    if (hasRooms || hasAllocs) {
      showToast(`Cannot delete ${block.name}: Assigned rooms or active resident allocations exist.`, "danger");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Delete Hostel Block",
      message: `Are you sure you want to delete ${block.name} (${block.code})? This action cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await hostelApi.deleteHostelBlock(block.id);
          await refreshBlocks();
          await refreshDashboard();
          closeConfirm();
          showToast(`Hostel block ${block.name} deleted.`);
        } catch (err) {
          console.error("Delete block error:", err);
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Room Sharing Config Save Handler ─────────────────────────────────
  const handleSaveRoomSharingConfig = async ({ block, floorConfigs }) => {
    if (!block) return;
    try {
      showToast("Generating room configurations and beds on server...", "info");
      const defaultRoomType = categories[0]?.id || 1;
      for (const fc of floorConfigs) {
        let roomIndexOnFloor = 1;
        const addRooms = async (count, catName, bedCapacity) => {
          const matchCat = categories.find((c) => c.name?.toLowerCase().includes(catName.toLowerCase()))?.id || defaultRoomType;
          for (let i = 0; i < count; i++) {
            const roomNum = fc.floorIndex === 0
              ? `${String(roomIndexOnFloor).padStart(3, "0")}`
              : `${fc.floorIndex}${String(roomIndexOnFloor).padStart(2, "0")}`;
            const roomRes = await hostelApi.createRoom({
              hostelId: block.id,
              roomTypeId: matchCat,
              floorLevel: fc.floorLabel || `Floor ${fc.floorIndex || 1}`,
              roomNumber: roomNum,
              status: "Active",
            });
            const newRoomId = roomRes?.data?.data?.roomId ?? roomRes?.data?.roomId;
            if (newRoomId) {
              const bedsToGen = bedCapacity || 2;
              for (let bi = 1; bi <= bedsToGen; bi++) {
                try {
                  await hostelApi.createBed({
                    roomId: newRoomId,
                    bedNumber: `BED-${bi}`,
                    bedStatus: "Available",
                    status: "Active",
                  });
                } catch (bErr) {
                  console.warn(`Bed gen warning for room ${roomNum}:`, bErr);
                }
              }
            }
            roomIndexOnFloor++;
          }
        };
        if (fc.singleSharing > 0) await addRooms(fc.singleSharing, "Single", 1);
        if (fc.doubleSharing > 0) await addRooms(fc.doubleSharing, "Double", 2);
        if (fc.tripleSharing > 0) await addRooms(fc.tripleSharing, "Triple", 3);
        if (fc.fourSharing > 0) await addRooms(fc.fourSharing, "Four", 4);
      }
      await refreshRooms();
      await refreshBeds();
      await refreshBlocks();
      await refreshDashboard();
      showToast(`Room sharing configuration and beds saved for ${block.name}!`);
      closeModal();
    } catch (err) {
      console.error("Room config error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Category CRUD ───────────────────────────────────────────────────
  const handleSaveCategory = async (catData) => {
    try {
      const isAc = (catData.type?.includes("AC") || catData.name?.includes("AC")) &&
                   !catData.type?.includes("Non-AC") && !catData.name?.includes("Non-AC");
      const payload = {
        roomTypeSpecification: catData.name || catData.specification || "Standard Room",
        bedCapacity: Number(catData.capacity) || 2,
        acType: isAc ? "AC" : "Non-AC",
        status: catData.status || "Active",
        description: catData.specification || catData.description || catData.type || "",
      };
      if (modal.mode === "edit") {
        await hostelApi.updateRoomType(catData.id, payload);
        showToast(`Category ${catData.name} updated.`);
      } else {
        await hostelApi.createRoomType(payload);
        showToast(`Room category ${catData.name} created.`);
      }
      await refreshCategories();
      closeModal();
    } catch (err) {
      console.error("Save category error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleDeleteCategory = (cat) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Room Category",
      message: `Delete category "${cat.name}"?`,
      danger: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await hostelApi.deleteRoomType(cat.id);
          await refreshCategories();
          closeConfirm();
          showToast(`Category ${cat.name} removed.`);
        } catch (err) {
          console.error("Delete category error:", err);
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Room CRUD ───────────────────────────────────────────────────────
  const handleSaveRoom = async (roomData) => {
    try {
      const blk = blocks.find((b) => b.code === roomData.block || b.name === roomData.block || String(b.id) === String(roomData.block));
      const hostelId = blk ? blk.id : (blocks[0]?.id || 1);
      const cat = categories.find((c) => c.name === roomData.type || String(c.id) === String(roomData.roomTypeId));
      const roomTypeId = cat ? cat.id : (categories[0]?.id || 1);

      const payload = {
        hostelId,
        roomTypeId,
        floorLevel: roomData.floor || "Floor 1",
        roomNumber: String(roomData.roomNo || "").replace(/^Room #/i, "").trim() || "101",
        status: roomData.status || "Active",
      };

      if (modal.mode === "edit") {
        await hostelApi.updateRoom(roomData.id, payload);
        showToast(`Room ${roomData.roomNo} updated.`);
      } else {
        const roomRes = await hostelApi.createRoom(payload);
        const newRoomId = roomRes?.data?.data?.roomId ?? roomRes?.data?.roomId;
        if (newRoomId) {
          const cap = Number(cat?.capacity || roomData.capacity || 2);
          for (let bi = 1; bi <= cap; bi++) {
            try {
              await hostelApi.createBed({
                roomId: newRoomId,
                bedNumber: `BED-${bi}`,
                bedStatus: "Available",
                status: "Active",
              });
            } catch (bErr) {
              console.warn(`Bed gen warning for room ${roomData.roomNo}:`, bErr);
            }
          }
        }
        showToast(`Room ${roomData.roomNo} and beds added.`);
      }
      await refreshRooms();
      await refreshBeds();
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      console.error("Save room error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleDeleteRoom = (room) => {
    if (room.occupied > 0) {
      showToast(`Room ${room.roomNo} is occupied and cannot be deleted.`, "danger");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Delete Room",
      message: `Delete Room ${room.roomNo} in block ${room.block}?`,
      danger: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await hostelApi.deleteRoom(room.id);
          await refreshRooms();
          await refreshBlocks();
          await refreshDashboard();
          closeConfirm();
          showToast(`Room ${room.roomNo} deleted.`);
        } catch (err) {
          console.error("Delete room error:", err);
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Warden CRUD ─────────────────────────────────────────────────────
  const handleSaveWarden = async (wardenData) => {
    try {
      const blk = blocks.find((b) =>
        b.name === wardenData.assignedHostels || b.code === wardenData.assignedHostels || String(b.id) === String(wardenData.hostelId)
      );
      const hostelId = blk ? blk.id : (blocks[0]?.id || 1);
      const payload = {
        staffId: Number(wardenData.staffId) || 1,
        hostelId,
        assignmentDate: wardenData.assignmentDate ? new Date(wardenData.assignmentDate).toISOString() : new Date().toISOString(),
        status: wardenData.status || "Active",
      };

      if (modal.mode === "edit") {
        await hostelApi.updateWarden(wardenData.id, payload);
        showToast(`Warden ${wardenData.name} updated.`);
      } else {
        await hostelApi.createWarden(payload);
        showToast(`Warden ${wardenData.name} assigned.`);
      }
      await refreshWardens();
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      console.error("Save warden error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleDeleteWarden = (warden) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Warden Assignment",
      message: `Remove warden ${warden.name} (${warden.empId})?`,
      danger: true,
      confirmLabel: "Remove",
      onConfirm: async () => {
        try {
          await hostelApi.deleteWarden(warden.id);
          await refreshWardens();
          await refreshBlocks();
          await refreshDashboard();
          closeConfirm();
          showToast(`Warden ${warden.name} removed.`);
        } catch (err) {
          console.error("Delete warden error:", err);
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Student Allocation CRUD ─────────────────────────────────────────
  const handleSaveAllocation = async (allocData) => {
    try {
      const studentId = Number(allocData.studentId);
      if (!studentId || isNaN(studentId) || studentId <= 0) {
        showToast("Please select a valid registered student from the dropdown list.", "warning");
        return;
      }

      const blk = blocks.find((b) => b.name === allocData.blockName || b.code === allocData.blockCode || String(b.id) === String(allocData.hostelId));
      const hostelId = blk ? Number(blk.id) : (Number(blocks[0]?.id) || 1);
      const rm = rooms.find((r) => r.roomNo === allocData.room || `Room #${r.roomNo}` === allocData.room || String(r.id) === String(allocData.roomId));
      const roomId = rm ? Number(rm.id) : (Number(rooms[0]?.id) || 1);

      // Resolve actual database bed ID for this specific room
      let actualBedId = allocData.bedId ? Number(allocData.bedId) : null;
      if (!actualBedId && allocData.bed) {
        const matchingBed = beds.find(b => String(b.roomId) === String(roomId) && (b.bedNumber === allocData.bed || String(b.id) === String(allocData.bed)));
        if (matchingBed) actualBedId = Number(matchingBed.id);
      }
      if (!actualBedId) {
        const roomBeds = beds.filter(b => String(b.roomId) === String(roomId));
        if (roomBeds.length > 0) {
          actualBedId = Number(roomBeds[0].id);
        }
      }

      if (!actualBedId || isNaN(actualBedId) || actualBedId <= 0) {
        showToast("Please select a valid registered bed for this room.", "warning");
        return;
      }

      const warden = wardens.find(w => String(w.hostelId) === String(hostelId));
      const wardenAssignmentId = allocData.wardenAssignmentId ? Number(allocData.wardenAssignmentId) : (warden?.id ? Number(warden.id) : null);

      const payload = {
        studentId: Number(allocData.studentId),
        hostelId: Number(hostelId),
        roomId: Number(roomId),
        bedId: Number(actualBedId),
        wardenAssignmentId: wardenAssignmentId ? Number(wardenAssignmentId) : null,
        joiningDate: allocData.joinDate ? new Date(allocData.joinDate).toISOString() : new Date().toISOString(),
        status: allocData.status || "Active",
        remarks: allocData.remarks || "Student hostel room allocation",
      };

      if (modal.mode === "edit") {
        await hostelApi.updateStudentAllocation(allocData.id, payload);
        showToast(`Allocation for ${allocData.studentName} updated.`);
      } else {
        await hostelApi.createStudentAllocation(payload);
        showToast(`Room & Bed allocated to ${allocData.studentName} successfully!`);
      }
      await refreshAllocations();
      await refreshRooms();
      await refreshBlocks();
      await refreshBeds();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      console.error("Save allocation error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleVacateAllocation = async (alloc, reason) => {
    try {
      await hostelApi.deleteStudentAllocation(alloc.id);
      await refreshAllocations();
      await refreshRooms();
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
      showToast(`Bed vacated for ${alloc.studentName}.`);
    } catch (err) {
      console.error("Vacate allocation error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Outpass CRUD ────────────────────────────────────────────────────
  const handleSaveOutpass = async (outData) => {
    try {
      const alloc = allocations.find(
        (a) =>
          a.admissionNo === outData.admissionNo ||
          a.studentName === outData.studentName ||
          String(a.studentId) === String(outData.studentId)
      );
      const blk = blocks.find((b) => b.name === outData.blockName || b.code === outData.blockCode || String(b.id) === String(outData.hostelId));
      const rm = rooms.find((r) => r.roomNo === outData.roomNo || r.roomNo === outData.roomNumber || String(r.id) === String(outData.roomId));
      const hostelId = Number(outData.hostelId || alloc?.hostelId || blk?.id || blocks[0]?.id || 1);
      const roomId = Number(outData.roomId || alloc?.roomId || rm?.id || rooms[0]?.id || 1);
      const bedId = Number(outData.bedId || alloc?.bedId);
      const studentId = Number(outData.studentId || alloc?.studentId);
      const wardenAssignmentId = outData.wardenAssignmentId ? Number(outData.wardenAssignmentId) : (alloc?.wardenAssignmentId ? Number(alloc.wardenAssignmentId) : null);

      if (!studentId || isNaN(studentId) || studentId <= 0) {
        showToast("Please select an active resident student for outpass.", "warning");
        return;
      }

      if (!bedId || isNaN(bedId) || bedId <= 0) {
        showToast("Active bed assignment could not be found for this student.", "warning");
        return;
      }

      const parseIso = (val, fallbackOffsetMs = 0) => {
        if (!val) return new Date(Date.now() + fallbackOffsetMs).toISOString();
        let d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString();
        d = new Date(`${val}T09:00:00Z`);
        if (!isNaN(d.getTime())) return d.toISOString();
        return new Date(Date.now() + fallbackOffsetMs).toISOString();
      };

      const fromIso = parseIso(outData.departureDate || outData.outDate || outData.fromDateTime, 0);
      const toIso = parseIso(outData.returnDate || outData.toDateTime, 14400000);

      let reqType = "Outpass";
      const rawType = (outData.requestType || outData.outpassType || "").toLowerCase();
      if (rawType.includes("leave") || rawType.includes("home") || rawType.includes("emergency")) {
        reqType = "Leave";
      } else {
        reqType = "Outpass";
      }

      const payload = {
        studentId,
        hostelId,
        roomId,
        bedId,
        wardenAssignmentId,
        requestType: reqType,
        fromDateTime: fromIso,
        toDateTime: toIso,
        reason: outData.reason?.trim() || "Outpass permission request",
        destination: outData.destination?.trim() || "City",
      };

      await hostelApi.createOutpassLeave(payload);
      await refreshOutpasses();
      closeModal();
      showToast(`Outpass request submitted for ${outData.studentName || "student"}.`);
    } catch (err) {
      console.error("Save outpass error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleUpdateOutpassStatus = async (outpassId, newStatus) => {
    try {
      let apiStatus = "Pending";
      const s = (newStatus || "").toLowerCase();
      if (s.includes("approve")) apiStatus = "Approved";
      else if (s.includes("reject")) apiStatus = "Rejected";

      await hostelApi.approveOutpassLeave(outpassId, {
        approvalStatus: apiStatus,
        approvalRemarks: `Warden status update: ${apiStatus}`,
      });
      await refreshOutpasses();
      showToast(`Outpass marked as ${apiStatus}.`);
    } catch (err) {
      console.error("Update outpass error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleDeleteOutpass = async (outpass) => {
    try {
      await hostelApi.deleteOutpassLeave(outpass.id);
      await refreshOutpasses();
      showToast("Outpass record removed.");
    } catch (err) {
      console.error("Delete outpass error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Transfer CRUD (Screenshots 1, 2, 3) ──────────────────────────────
  const handleDeleteTransfer = async (tr) => {
    try {
      await hostelApi.deleteTransferVacate(tr.id);
      await refreshTransfers();
      showToast(`Transfer record for ${tr.studentName || "student"} removed.`);
    } catch (err) {
      console.error("Delete transfer error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleSaveTransfer = async (transData) => {
    try {
      const isVacate = transData.actionType === "Bed Vacate";
      const fromBlk = blocks.find((b) => b.name === transData.currentBlock);
      const toBlk = blocks.find((b) => b.name === transData.destinationBlock);
      const alloc = allocations.find((a) => a.admissionNo === transData.admissionNo || a.studentName === transData.studentName);

      const payload = {
        allocationId: alloc ? alloc.id : 1,
        studentId: alloc?.studentId || 1,
        requestType: isVacate ? "Vacate" : "Transfer",
        fromHostelId: fromBlk ? fromBlk.id : 1,
        fromRoomId: alloc?.roomId || 1,
        fromBedId: alloc?.bedId || 1,
        toHostelId: isVacate ? null : (toBlk ? toBlk.id : null),
        toRoomId: isVacate ? null : 1,
        toBedId: isVacate ? null : 1,
        requestDate: new Date().toISOString(),
        effectiveDate: new Date(Date.now() + 86400000).toISOString(),
        reason: transData.reason || (isVacate ? "Student vacating bed" : "Student room transfer"),
      };

      await hostelApi.createTransferVacate(payload);
      await refreshTransfers();
      closeModal();
      showToast(`${isVacate ? "Bed vacate request" : "Room transfer request"} submitted for ${transData.studentName || "student"}.`);
    } catch (err) {
      console.error("Save transfer error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleProcessTransfer = (tr) => {
    setConfirmDialog({
      isOpen: true,
      title: "Approve and Process Migration",
      message: `Approve migration for ${tr.studentName} to ${tr.targetBlock} (${tr.targetRoom})? This will update their active bed allocation.`,
      confirmLabel: "Process Migration",
      onConfirm: async () => {
        try {
          await hostelApi.approveTransferVacate(tr.id, {
            approvalStatus: "Approved",
            approvalRemarks: "Approved and migration processed",
          });
          await hostelApi.completeTransferVacate(tr.id);
          await refreshTransfers();
          await refreshAllocations();
          await refreshRooms();
          await refreshBlocks();
          await refreshDashboard();
          closeConfirm();
          showToast(`Migration for ${tr.studentName} processed successfully!`);
        } catch (err) {
          console.error("Process transfer error:", err);
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Attendance Actions (Screenshots 1 & 2) ─────────────────────────
  const handleToggleAttendance = (studentId, newStatus) => {
    setAttendanceMap((prev) => {
      const current = prev[attendanceShift]?.[studentId]?.status;
      const toggledStatus = current === newStatus ? "" : newStatus;
      return {
        ...prev,
        [attendanceShift]: {
          ...prev[attendanceShift],
          [studentId]: {
            ...(prev[attendanceShift]?.[studentId] || {}),
            status: toggledStatus,
            inTime: toggledStatus === "Present" || toggledStatus === "Half Day" ? (attendanceShift === "morning" ? "07:00" : "20:00") : "--",
          },
        },
      };
    });
  };

  const handleBulkMarkAttendance = (status) => {
    setAttendanceMap((prev) => {
      const updated = { ...prev[attendanceShift] };
      attendanceStudents.forEach((s) => {
        const matchBlock =
          !attendanceBlock ||
          attendanceBlock === "all" ||
          s.block === attendanceBlock ||
          s.blockCode === attendanceBlock;
        if (matchBlock) {
          updated[s.id] = {
            status,
            inTime: status === "Present" || status === "Half Day" ? (attendanceShift === "morning" ? "07:00" : "20:00") : "--",
            remarks: `Bulk marked ${status}`,
          };
        }
      });
      return { ...prev, [attendanceShift]: updated };
    });
    showToast(`Marked all students as ${status} for ${attendanceShift === "morning" ? "Morning" : "Night"} attendance.`);
  };

  const handleClearAttendanceSelection = () => {
    setAttendanceMap((prev) => {
      const updated = { ...prev[attendanceShift] };
      attendanceStudents.forEach((s) => {
        const matchBlock =
          !attendanceBlock ||
          attendanceBlock === "all" ||
          s.block === attendanceBlock ||
          s.blockCode === attendanceBlock;
        if (matchBlock) {
          updated[s.id] = {
            status: "",
            inTime: "--",
            remarks: "",
          };
        }
      });
      return { ...prev, [attendanceShift]: updated };
    });
    showToast(`Cleared attendance selection for ${attendanceShift === "morning" ? "Morning" : "Night"} attendance.`);
  };

  const handleSaveAttendanceLog = async () => {
    try {
      showToast("Saving attendance records to server...", "info");
      const currentMap = attendanceMap[attendanceShift] || {};
      const markedIds = Object.keys(currentMap).filter((id) => currentMap[id]?.status);
      if (markedIds.length === 0) {
        showToast("No attendance marked to save.", "warning");
        return;
      }
      const sessionLabel = attendanceShift === "morning" ? "Morning" : "Night";
      const attDate = attendanceDate ? new Date(`${attendanceDate}T00:00:00Z`).toISOString() : new Date().toISOString();

      let savedCount = 0;
      let lastError = null;
      for (const stId of markedIds) {
        const record = currentMap[stId];
        const student = attendanceStudents.find((s) => s.id === stId || s.admissionNo === stId || String(s.studentId) === String(stId));
        const alloc = allocations.find((a) => String(a.studentId) === String(student?.studentId) || a.admissionNo === student?.admissionNo || a.admissionNo === stId || String(a.id) === String(stId));
        const blk = blocks.find((b) => b.name === student?.block || b.code === student?.blockCode || String(b.id) === String(alloc?.hostelId));

        const hostelId = Number(alloc?.hostelId || blk?.id || 1);
        const roomId = Number(alloc?.roomId || student?.roomId || 1);
        const bedId = Number(alloc?.bedId || student?.bedId || 1);
        const studentId = Number(alloc?.studentId || student?.studentId || 1);
        const wardenAssignmentId = alloc?.wardenAssignmentId ? Number(alloc.wardenAssignmentId) : null;

        const payload = {
          studentId,
          hostelId,
          roomId,
          bedId,
          wardenAssignmentId,
          attendanceDate: attDate,
          session: sessionLabel,
          attendanceStatus: record.status || "Present",
          remarks: record.remarks || `Recorded during ${sessionLabel} session`,
        };

        try {
          await hostelApi.createAttendance(payload);
          savedCount++;
        } catch (singleErr) {
          console.warn(`Attendance record failed for student ${stId}:`, singleErr);
          lastError = singleErr;
        }
      }
      if (savedCount > 0) {
        showToast(`Attendance log saved successfully! (${savedCount} records)`, "success");
      } else if (lastError) {
        showToast(getApiErrorMessage(lastError), "danger");
      }
    } catch (err) {
      console.error("Save attendance error:", err);
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Attendance Mode & Date Range Handlers ────────────────────────────
  const handleSelectAttendanceFrequency = (mode) => {
    setAttendanceFrequency(mode);
    setRangeError("");
    if (mode === "daily") {
      if (!attendanceDate) setAttendanceDate("2026-09-17");
    } else if (mode === "monthly") {
      if (!attendanceMonth) setAttendanceMonth("2026-09");
    } else if (mode === "custom") {
      if (!customRangeStart && !customRangeEnd) {
        setCustomRangeStart("2026-09-01");
        setCustomRangeEnd("2026-09-17");
        setAppliedCustomRange({ start: "2026-09-01", end: "2026-09-17" });
      }
    }
  };

  const handleCustomStartChange = (val) => {
    setCustomRangeStart(val);
    if (val && customRangeEnd && val > customRangeEnd) {
      setRangeError("Start date cannot be after end date.");
    } else {
      setRangeError("");
    }
  };

  const handleCustomEndChange = (val) => {
    setCustomRangeEnd(val);
    if (val && customRangeStart && val < customRangeStart) {
      setRangeError("End date cannot be before start date.");
    } else {
      setRangeError("");
    }
  };

  const handleApplyCustomRange = () => {
    if (!customRangeStart || !customRangeEnd) {
      setRangeError("Please select both start and end dates.");
      showToast("Please select a valid date range.", "error");
      return;
    }
    if (customRangeStart > customRangeEnd) {
      setRangeError("Start date cannot be after end date.");
      showToast("Start date cannot be after end date.", "error");
      return;
    }
    setRangeError("");
    setAppliedCustomRange({ start: customRangeStart, end: customRangeEnd });
    showToast(`Applied date range: ${customRangeStart} → ${customRangeEnd}`, "success");
  };

  const handleClearCustomRange = () => {
    setCustomRangeStart("");
    setCustomRangeEnd("");
    setRangeError("");
  };

  const handleExportAttendanceReport = (filteredList) => {
    const shiftData = attendanceMap[attendanceShift] || {};
    const selectedMonthObj = academicMonthOptions.find((m) => m.value === attendanceMonth);
    const activePeriodLabel =
      attendanceFrequency === "daily"
        ? attendanceDate
        : attendanceFrequency === "monthly"
        ? (selectedMonthObj ? selectedMonthObj.label : attendanceMonth)
        : `${appliedCustomRange.start || "start"}_to_${appliedCustomRange.end || "end"}`;

    const exportData = filteredList.map((s) => ({
      admissionNo: s.admissionNo || s.id,
      studentName: s.name,
      hostelBlock: s.block,
      roomBed: s.roomBed || `${s.room} (${s.bed})`,
      attendanceStatus: shiftData[s.id]?.status || "Unmarked",
      inTime: shiftData[s.id]?.inTime || s.inTime || "07:00",
      shift: attendanceShift.toUpperCase(),
      date: activePeriodLabel,
    }));
    exportCsv(
      `hostel-attendance-${attendanceShift}-${String(activePeriodLabel).replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`,
      exportData,
      [
        { key: "admissionNo", label: "Admission No" },
        { key: "studentName", label: "Student Name" },
        { key: "hostelBlock", label: "Hostel Block" },
        { key: "roomBed", label: "Room & Bed No" },
        { key: "attendanceStatus", label: "Attendance Status" },
        { key: "inTime", label: "In Time" },
        { key: "shift", label: "Shift" },
        { key: "date", label: "Date / Period" },
      ]
    );
    showToast(`Exported ${attendanceShift} attendance log for ${activePeriodLabel}`);
  };

  // ═════════════════════════════════════════════════════════════════════
  // RENDER SECTIONS (FLAT, DIRECT NAVIGATION)
  // ═════════════════════════════════════════════════════════════════════

  // 1. Dashboard
  const renderDashboard = () => {
    // Blocks filtered by search query
    const filteredDashBlocks = enrichedBlocks.filter((b) => {
      if (!dashBlockSearch) return true;
      const q = dashBlockSearch.toLowerCase().trim();
      return (
        b.name?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.warden?.toLowerCase().includes(q) ||
        b.type?.toLowerCase().includes(q)
      );
    });

    const pageSize = 4;
    const totalPages = Math.ceil(filteredDashBlocks.length / pageSize) || 1;
    const currentBlocksPage = filteredDashBlocks.slice(
      (dashBlockPage - 1) * pageSize,
      dashBlockPage * pageSize
    );

    const selectedDashBlock =
      enrichedBlocks.find((b) => String(b.id) === String(dashSelectedBlockId) || b.code === dashSelectedBlockId) ||
      enrichedBlocks[0] ||
      {};

    // Recent 4 live allocations for dashboard display
    const recentAllocationsList = allocations.slice(0, 4);

    // Outpass requests for dashboard display
    const dashOutpassesList = outpasses.slice(0, 4);

    return (
      <div className="cms-hostel-stack">
        {/* 1. Header & Live Status matching Screenshot 3 */}
        <div className="cms-dash-header-row">
          <div>
            <div className="cms-dash-header-title">
              <Building2 size={24} style={{ color: "var(--cms-primary)" }} />
              <span>Hostel Management Dashboard</span>
            </div>
            <p className="cms-dash-header-sub">
              Monitor bed occupancy, manage block capacities, and process student outpass permissions.
            </p>
          </div>
          <div className="cms-dash-live-badge">
            <span className="cms-dash-live-dot" />
            <span>Live Status • All Blocks Operational</span>
          </div>
        </div>

        {/* 2. Info Banner matching Screenshot 3 */}
        <div className="cms-dash-info-banner">
          <Info size={18} style={{ color: "var(--cms-primary)", flexShrink: 0 }} />
          <span>
            Hostel Facilities Overview • Tracking live occupancy for {blocks.length} Hostel Blocks with {totalBeds} Total Beds.
          </span>
        </div>

        {/* 3. 8 Metric KPI Cards matching Screenshot 3 (2 rows of 4) */}
        <div className="cms-dash-kpi-grid">
          {/* Card 1: TOTAL HOSTELS */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-primary-soft)", color: "var(--cms-primary)" }}>
              <Building2 size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">TOTAL HOSTELS</span>
                <span className="cms-dash-kpi-pill" style={{ background: "var(--cms-green-soft)", color: "var(--cms-green)" }}>
                  Active
                </span>
              </div>
              <div className="cms-dash-kpi-val">{blocks.length}</div>
              <div className="cms-dash-kpi-sub">Operational blocks</div>
            </div>
          </div>

          {/* Card 2: TOTAL CAPACITY */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-info-soft)", color: "var(--cms-info)" }}>
              <BedDouble size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">TOTAL CAPACITY</span>
                <span className="cms-dash-kpi-pill" style={{ background: "var(--cms-info-soft)", color: "var(--cms-info)" }}>
                  Max Cap
                </span>
              </div>
              <div className="cms-dash-kpi-val">{totalBeds} Beds</div>
              <div className="cms-dash-kpi-sub">Registered capacity</div>
            </div>
          </div>

          {/* Card 3: OCCUPANCY RATE */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-primary-soft)", color: "var(--cms-primary)" }}>
              <Clock size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">OCCUPANCY RATE</span>
                <span className="cms-dash-kpi-pill" style={{ background: "color-mix(in srgb, var(--cms-primary) 18%, transparent)", color: "var(--cms-primary)" }}>
                  Optimal
                </span>
              </div>
              <div className="cms-dash-kpi-val">{occupancyRate}%</div>
              <div className="cms-dash-kpi-sub">Live allocation</div>
            </div>
          </div>

          {/* Card 4: OCCUPIED BEDS */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-amber-soft)", color: "var(--cms-amber)" }}>
              <Users size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">OCCUPIED BEDS</span>
                <span className="cms-dash-kpi-pill" style={{ background: "var(--cms-amber-soft)", color: "var(--cms-amber)" }}>
                  Assigned
                </span>
              </div>
              <div className="cms-dash-kpi-val">{occupiedBeds}</div>
              <div className="cms-dash-kpi-sub">Allotted to students</div>
            </div>
          </div>

          {/* Card 5: VACANT BEDS */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-green-soft)", color: "var(--cms-green)" }}>
              <Home size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">VACANT BEDS</span>
                <span className="cms-dash-kpi-pill" style={{ background: "var(--cms-green-soft)", color: "var(--cms-green)" }}>
                  Available
                </span>
              </div>
              <div className="cms-dash-kpi-val">{vacantBeds}</div>
              <div className="cms-dash-kpi-sub">Ready for allocation</div>
            </div>
          </div>

          {/* Card 6: HOSTELLERS */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-info-soft)", color: "var(--cms-info)" }}>
              <UserCheck size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">HOSTELLERS</span>
                <span className="cms-dash-kpi-pill" style={{ background: "var(--cms-info-soft)", color: "var(--cms-info)" }}>
                  Students
                </span>
              </div>
              <div className="cms-dash-kpi-val">{occupiedBeds}</div>
              <div className="cms-dash-kpi-sub">Active residents</div>
            </div>
          </div>

          {/* Card 7: MONTHLY REVENUE */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-green-soft)", color: "var(--cms-green)" }}>
              <IndianRupee size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">MONTHLY REVENUE</span>
                <span className="cms-dash-kpi-pill" style={{ background: "var(--cms-green-soft)", color: "var(--cms-green)" }}>
                  Billed
                </span>
              </div>
              <div className="cms-dash-kpi-val">
                {monthlyRevenue > 0 ? `₹${monthlyRevenue.toLocaleString()}` : "₹0"}
              </div>
              <div className="cms-dash-kpi-sub">Hostel fees billing</div>
            </div>
          </div>

          {/* Card 8: ACTIVE WARDENS */}
          <div className="cms-dash-kpi-card">
            <div className="cms-dash-kpi-icon" style={{ background: "var(--cms-red-soft)", color: "var(--cms-red)" }}>
              <ShieldCheck size={20} />
            </div>
            <div className="cms-dash-kpi-info">
              <div className="cms-dash-kpi-top">
                <span className="cms-dash-kpi-label">ACTIVE WARDENS</span>
                <span className="cms-dash-kpi-pill" style={{ background: "var(--cms-red-soft)", color: "var(--cms-red)" }}>
                  Supervising
                </span>
              </div>
              <div className="cms-dash-kpi-val">{activeWardensCount}</div>
              <div className="cms-dash-kpi-sub">Staff on duty</div>
            </div>
          </div>
        </div>

        {/* 4. Quick Actions Bar matching Screenshot 3 */}
        <div className="cms-dash-quick-bar">
          <span className="cms-dash-quick-label">Quick Actions</span>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              setActiveMajorTab("setup");
              setActiveSetupSubtab("blocks");
            }}
          >
            <Building2 size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Setup Blocks</span>
          </button>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              setActiveMajorTab("students");
              setActiveStudentSubtab("allocations");
            }}
          >
            <Users size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Hostel Students</span>
          </button>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              setActiveMajorTab("students");
              setActiveStudentSubtab("allocations");
              setModal({ isOpen: true, type: "allocation", mode: "add", data: null });
            }}
          >
            <BedDouble size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Bed Allocation</span>
          </button>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              setActiveMajorTab("students");
              setActiveStudentSubtab("attendance");
            }}
          >
            <CheckCircle2 size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Mark Attendance</span>
          </button>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              setActiveMajorTab("reports");
            }}
          >
            <BarChart3 size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Hostel Reports</span>
          </button>
        </div>

        {/* 5. Overall Bed Occupancy Progress Card matching Screenshot 3 */}
        <div className="cms-dash-occupancy-card">
          <div className="cms-dash-occ-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} style={{ color: "var(--cms-primary)" }} />
              <span style={{ letterSpacing: "0.03em" }}>OVERALL HOSTEL BED OCCUPANCY</span>
            </div>
            <span style={{ color: "var(--cms-muted)", fontWeight: 600 }}>
              {occupiedBeds} Occupied / {vacantBeds} Vacant ({totalBeds} Total Capacity)
            </span>
          </div>
          <div className="cms-dash-progress-track">
            <div
              className="cms-dash-progress-fill"
              style={{ width: `${Math.max(3, occupancyRate)}%` }}
            />
          </div>
          <div className="cms-dash-occ-footer">
            <div style={{ display: "flex", gap: 18 }}>
              <span>Occupied Beds ({occupancyRate}%)</span>
              <span>Vacant Beds ({100 - occupancyRate}%)</span>
            </div>
            <span style={{ fontWeight: 600 }}>Live Status</span>
          </div>
        </div>

        {/* 6. Hostel Block Overview & Analytics matching Screenshot 4 */}
        <div className="cms-dash-block-section">
          {/* Section Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", fontWeight: 800, color: "var(--cms-text)" }}>
              <Building2 size={18} style={{ color: "var(--cms-primary)" }} />
              <span>Hostel Block Overview &amp; Analytics</span>
            </div>
            <div className="app-search-field" style={{ position: "relative", width: 280, maxWidth: "100%" }}>
              <Search className="app-search-field__icon"
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--cms-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search block, code, warden..."
                value={dashBlockSearch}
                onChange={(e) => {
                  setDashBlockSearch(e.target.value);
                  setDashBlockPage(1);
                }}
                className="cms-alloc-input-compact"
                style={{ height: 34, paddingLeft: 34, fontSize: 12 }}
              />
            </div>
          </div>

          {/* Selected Block Banner matching Screenshot 4 */}
          {selectedDashBlock && (
            <div className="cms-dash-block-banner">
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: "0.95rem", color: "var(--cms-text)" }}>
                <span>{selectedDashBlock.name}</span>
                <span style={{ color: "var(--cms-muted)", fontWeight: 600 }}>({selectedDashBlock.code})</span>
                <span>•</span>
                <span style={{ color: "var(--cms-primary)" }}>{selectedDashBlock.type}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--cms-muted)" }}>
                {selectedDashBlock.description || "Main campus residence housing enrolled students."}
              </p>
              <div className="cms-dash-block-badges">
                <span className="cms-dash-badge-pill">Floors: <strong>{selectedDashBlock.floors}</strong></span>
                <span className="cms-dash-badge-pill">Rooms: <strong>{selectedDashBlock.totalRooms}</strong></span>
                <span className="cms-dash-badge-pill">
                  Occupied: <strong style={{ color: "var(--cms-amber)" }}>{selectedDashBlock.occupiedBeds}</strong>
                </span>
                <span className="cms-dash-badge-pill">
                  Vacant: <strong style={{ color: "var(--cms-green)" }}>{selectedDashBlock.vacantBeds}</strong>
                </span>
                <span className="cms-dash-badge-pill">
                  Warden: <strong>{selectedDashBlock.warden || "Unassigned"}</strong> {selectedDashBlock.wardenPhone && selectedDashBlock.wardenPhone !== "-" ? `(${selectedDashBlock.wardenPhone})` : ""}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-green)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  • Active Status
                </span>
              </div>
            </div>
          )}

          {/* 7-Block Analytics Table matching Screenshot 4 */}
          <div className="cms-hostel-compact-card">
            <div className="cms-hostel-table-scroll">
              <table className="cms-hostel-compact-table">
                <thead>
                  <tr>
                    <th>BLOCK NAME &amp; CODE</th>
                    <th>TYPE</th>
                    <th>FLOORS</th>
                    <th>ROOMS</th>
                    <th>TOTAL BEDS</th>
                    <th>OCCUPIED</th>
                    <th>VACANT</th>
                    <th>WARDEN &amp; CONTACT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBlocksPage.map((b) => {
                    const isSelected = b.id === dashSelectedBlockId || b.code === dashSelectedBlockId;
                    return (
                      <tr
                        key={b.id}
                        onClick={() => setDashSelectedBlockId(b.id)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "var(--cms-primary-soft)" : "transparent",
                        }}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cms-primary)", flexShrink: 0 }} />
                            <strong style={{ color: "var(--cms-text)" }}>{b.name}</strong>
                            <span style={{ color: "var(--cms-muted)", fontSize: 11 }}>({b.code})</span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: b.type === "Girls" ? "var(--cms-info)" : "var(--cms-primary)",
                            }}
                          >
                            • {b.type}
                          </span>
                        </td>
                        <td>{b.floors}</td>
                        <td>{b.totalRooms}</td>
                        <td>{b.totalBeds}</td>
                        <td>
                          <strong style={{ color: "var(--cms-amber)" }}>{b.occupiedBeds}</strong>
                        </td>
                        <td>
                          <strong style={{ color: "var(--cms-green)" }}>{b.vacantBeds}</strong>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {b.warden} <span style={{ color: "var(--cms-muted)" }}>{b.wardenPhone}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              border: "1px solid var(--cms-green)",
                              color: "var(--cms-green)",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            • Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls matching Screenshot 4 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 14px",
                borderTop: "1px solid var(--cms-border)",
                background: "var(--cms-subtle)",
                fontSize: 12,
                color: "var(--cms-muted)",
              }}
            >
              <span>
                Showing {Math.min((dashBlockPage - 1) * pageSize + 1, filteredDashBlocks.length)}-
                {Math.min(dashBlockPage * pageSize, filteredDashBlocks.length)} of {filteredDashBlocks.length} records
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  disabled={dashBlockPage === 1}
                  onClick={() => setDashBlockPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--cms-border)",
                    background: "var(--cms-surface)",
                    color: "var(--cms-text)",
                    cursor: dashBlockPage === 1 ? "not-allowed" : "pointer",
                    opacity: dashBlockPage === 1 ? 0.5 : 1,
                  }}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setDashBlockPage(pg)}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 6,
                      border: pg === dashBlockPage ? "none" : "1px solid var(--cms-border)",
                      background: pg === dashBlockPage ? "var(--cms-primary)" : "var(--cms-surface)",
                      color: pg === dashBlockPage ? "#fff" : "var(--cms-text)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={dashBlockPage === totalPages}
                  onClick={() => setDashBlockPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--cms-border)",
                    background: "var(--cms-surface)",
                    color: "var(--cms-text)",
                    cursor: dashBlockPage === totalPages ? "not-allowed" : "pointer",
                    opacity: dashBlockPage === totalPages ? 0.5 : 1,
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Bottom Split Section matching Screenshot 5 (2 Columns) */}
        <div className="cms-dash-split-grid">
          {/* Left: RECENT BED ALLOCATIONS */}
          <div className="cms-dash-split-card">
            <div className="cms-dash-split-head">
              <div className="cms-dash-split-title">
                <CheckCircle2 size={16} style={{ color: "var(--cms-primary)" }} />
                <span>RECENT BED ALLOCATIONS</span>
              </div>
              <button
                type="button"
                className="cms-dash-split-link"
                onClick={() => {
                  setActiveMajorTab("students");
                  setActiveStudentSubtab("allocations");
                }}
              >
                View All &gt;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentAllocationsList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 10px", color: "var(--cms-muted)", fontSize: 12 }}>
                  No recent bed allocations recorded.
                </div>
              ) : (
                recentAllocationsList.map((item) => (
                  <div key={item.id} className="cms-dash-item-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ color: "var(--cms-primary)", display: "flex", alignItems: "center" }}>
                        <BedDouble size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cms-text)" }}>
                          {item.studentName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--cms-muted)" }}>
                          {item.admissionNo} • {item.blockName || item.block || "Hostel"} • {item.roomBadge || item.room || "-"}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        background: "var(--cms-subtle)",
                        border: "1px solid var(--cms-border)",
                        color: "var(--cms-muted)",
                        borderRadius: 9999,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.joinDate || "-"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: ACTIVE OUTPASS & LEAVE REQUESTS */}
          <div className="cms-dash-split-card">
            <div className="cms-dash-split-head">
              <div className="cms-dash-split-title">
                <AlertCircle size={16} style={{ color: "var(--cms-amber)" }} />
                <span>ACTIVE OUTPASS &amp; LEAVE REQUESTS</span>
              </div>
              <button
                type="button"
                className="cms-dash-split-link"
                onClick={() => {
                  setActiveMajorTab("students");
                  setActiveStudentSubtab("outpasses");
                }}
              >
                View All &gt;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dashOutpassesList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 10px", color: "var(--cms-muted)", fontSize: 12 }}>
                  No active outpass or leave requests.
                </div>
              ) : (
                dashOutpassesList.map((item) => {
                  const statusNormalized = (item.status || "").toLowerCase();
                  const isPending = statusNormalized.includes("pending");
                  const isApproved = statusNormalized.includes("approve");
                  const isRejected = statusNormalized.includes("reject");
                  const formattedDate = item.departureDate || (item.outDate ? item.outDate.split("T")[0] : "-");

                  return (
                    <div key={item.id} className="cms-dash-item-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <div style={{ color: isApproved ? "var(--cms-green)" : isRejected ? "var(--cms-red)" : "var(--cms-amber)", display: "flex", alignItems: "center" }}>
                          <Clock size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--cms-text)" }}>
                              {item.studentName}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                borderRadius: 9999,
                                padding: "1px 7px",
                                background: isApproved
                                  ? "var(--cms-green-soft)"
                                  : isRejected
                                  ? "var(--cms-red-soft)"
                                  : "var(--cms-amber-soft)",
                                color: isApproved
                                  ? "var(--cms-green)"
                                  : isRejected
                                  ? "var(--cms-red)"
                                  : "var(--cms-amber)",
                              }}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--cms-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.requestType || item.outpassType || "Outpass"} • {item.roomNo || item.roomNumber || "-"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              className="cms-dash-btn-approve"
                              onClick={() => handleUpdateOutpassStatus(item.id, "Approved")}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              type="button"
                              className="cms-dash-btn-reject"
                              onClick={() => handleUpdateOutpassStatus(item.id, "Rejected")}
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        )}
                        <span
                          style={{
                            background: "var(--cms-subtle)",
                            border: "1px solid var(--cms-border)",
                            color: "var(--cms-muted)",
                            borderRadius: 9999,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. Hostel Blocks
  const renderHostelBlocks = () => {
    const isHostelSelected = Boolean(filterBlock);

    const filtered = !isHostelSelected
      ? []
      : blocks.filter((b) => {
          const matchQ =
            !searchQuery ||
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.warden && b.warden.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchBlock =
            filterBlock === "all" ||
            b.code === filterBlock ||
            String(b.id) === String(filterBlock) ||
            b.name === filterBlock;
          return matchQ && matchBlock;
        });

    return (
      <div className="cms-card">
        <div className="cms-card-head">
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Hostel Blocks</h3>
            <p style={{ margin: 0, color: "var(--cms-muted)", fontSize: 12 }}>
              Configure physical residences, gender assignments, and floor capacity
            </p>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModal({ isOpen: true, type: "block", mode: "add", data: null })}
          >
            <Plus size={15} /> Add Block
          </button>
        </div>
        <div className="cms-card-body">
          <div className="cms-hostel-toolbar">
            <div className="cms-hostel-search app-search-field">
              <Search className="app-search-field__icon" size={15} />
              <input
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="cms-hostel-toolbar-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-muted)" }}>Filter:</span>
              <select
                className="cms-hostel-select app-select"
                value={filterBlock}
                onChange={(e) => setFilterBlock(e.target.value)}
                style={{ minWidth: 230 }}
              >
                <option value="">Select Hostel...</option>
                <option value="all">All Hostels</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  if (!isHostelSelected) {
                    showToast("Please select a hostel filter first", "info");
                    return;
                  }
                  exportCsv("hostel-blocks.csv", filtered, [
                    { key: "code", label: "Block Code" },
                    { key: "name", label: "Block Name" },
                    { key: "type", label: "Category" },
                    { key: "floors", label: "Floors" },
                    { key: "totalRooms", label: "Rooms" },
                    { key: "totalBeds", label: "Total Beds" },
                    { key: "occupiedBeds", label: "Occupied Beds" },
                    { key: "vacantBeds", label: "Vacant Beds" },
                    { key: "warden", label: "Resident Warden" },
                    { key: "status", label: "Status" },
                  ]);
                }}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>

          {!isHostelSelected ? (
            <div className="cms-hostel-filter-empty-state">
              <div className="cms-hostel-filter-empty-icon">
                <Building2 size={28} />
              </div>
              <h4 className="cms-hostel-filter-empty-title">Select a Filter Option</h4>
              <p className="cms-hostel-filter-empty-desc">
                Please select an option from the dropdown above to view hostel blocks.
              </p>
            </div>
          ) : (
            <div className="cms-hostel-table-wrap">
              <table className="cms-hostel-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Block Name</th>
                    <th>Category</th>
                    <th>Floors</th>
                    <th>Rooms</th>
                    <th>Total Beds</th>
                    <th>Occupied / Vacant</th>
                    <th>Resident Warden</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="cms-hostel-empty">
                        No hostel blocks found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700, color: "var(--cms-primary)" }}>{b.code}</td>
                        <td>
                          <strong>{b.name}</strong>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "var(--cms-subtle)",
                              fontSize: 11.5,
                              fontWeight: 600,
                            }}
                          >
                            {b.type}
                          </span>
                        </td>
                        <td>{b.floors || 1} Floors</td>
                        <td>{b.totalRooms ?? rooms.filter((r) => r.block === b.code).length} Rooms</td>
                        <td>{b.totalBeds ?? rooms.filter((r) => r.block === b.code).reduce((sum, r) => sum + (r.capacity || 0), 0)} Beds</td>
                        <td>
                          <span style={{ color: "var(--cms-amber)", fontWeight: 600 }}>
                            {b.occupiedBeds || 0} Occ
                          </span>{" "}
                          /{" "}
                          <span style={{ color: "var(--cms-green)", fontWeight: 600 }}>
                            {b.vacantBeds ?? Math.max(0, (b.totalBeds || rooms.filter((r) => r.block === b.code).reduce((sum, r) => sum + (r.capacity || 0), 0)) - (b.occupiedBeds || 0))} Vac
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.warden || (wardens.find(w => (w.assignedHostels || []).includes(b.name))?.name) || "Unassigned"}</div>
                          <small style={{ color: "var(--cms-muted)" }}>{b.wardenPhone || (wardens.find(w => (w.assignedHostels || []).includes(b.name))?.phone) || "-"}</small>
                        </td>
                        <td>
                          <StatusBadge value={b.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="cms-hostel-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="cms-action-btn"
                              title="View details"
                              onClick={() => setModal({ isOpen: true, type: "block", mode: "view", data: b })}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="cms-action-btn"
                              title="Edit block"
                              onClick={() => setModal({ isOpen: true, type: "block", mode: "edit", data: b })}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="cms-action-btn danger"
                              title="Delete block"
                              onClick={() => handleDeleteBlock(b)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 3. Room Categories
  const renderRoomCategories = () => {
    const filtered = categories.filter((c) => {
      const matchQ =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.specification && c.specification.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.type.toLowerCase().includes(searchQuery.toLowerCase());
      const isAc = c.type.toLowerCase().includes("ac") && !c.type.toLowerCase().includes("non-ac");
      const matchAc =
        filterAcType === "all" ||
        (filterAcType === "AC" && isAc) ||
        (filterAcType === "Non-AC" && !isAc);
      return matchQ && matchAc;
    });

    return (
      <div className="cms-card">
        <div className="cms-card-head">
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Room Categories</h3>
            <p style={{ margin: 0, color: "var(--cms-muted)", fontSize: 12 }}>
              Define room accommodation tiers, standard tariffs, and specifications
            </p>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModal({ isOpen: true, type: "roomType", mode: "add", data: null })}
          >
            <Plus size={15} /> Add Room Type
          </button>
        </div>
        <div className="cms-card-body">
          <div className="cms-hostel-toolbar">
            <div className="cms-hostel-search app-search-field">
              <Search className="app-search-field__icon" size={15} />
              <input
                placeholder="Search by category or specification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="cms-hostel-toolbar-actions">
              <select
                className="cms-hostel-select app-select"
                value={filterAcType}
                onChange={(e) => setFilterAcType(e.target.value)}
                style={{ minWidth: 230 }}
              >
                <option value="">-- Select AC / Non-AC Option --</option>
                <option value="all">All Options</option>
                <option value="AC">AC</option>
                <option value="Non-AC">Non-AC</option>
              </select>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() =>
                  exportCsv("room-categories.csv", filtered, [
                    { key: "name", label: "Category Name" },
                    { key: "type", label: "Tier Type" },
                    { key: "capacity", label: "Bed Capacity" },
                    { key: "fee", label: "Monthly Tariff" },
                    { key: "totalRooms", label: "Total Rooms" },
                    { key: "totalBeds", label: "Total Beds" },
                    { key: "blocks", label: "Available Blocks" },
                    { key: "status", label: "Status" },
                  ])
                }
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>

          {!filterAcType ? (
            <div className="cms-hostel-filter-empty-state">
              <div className="cms-hostel-filter-empty-icon">
                <Layers size={28} />
              </div>
              <h4 className="cms-hostel-filter-empty-title">Select a Filter Option</h4>
              <p className="cms-hostel-filter-empty-desc">
                Please select an option from the dropdown above to view room categories.
              </p>
            </div>
          ) : (
            <div className="cms-hostel-table-wrap">
              <table className="cms-hostel-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Tier Type</th>
                    <th>Capacity</th>
                    <th>Monthly Tariff</th>
                    <th>Rooms</th>
                    <th>Total Beds</th>
                    <th>Available In Blocks</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="cms-hostel-empty">
                        No room categories found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cat) => (
                      <tr key={cat.id}>
                        <td>
                          <strong>{cat.name}</strong>
                          <div style={{ fontSize: 11, color: "var(--cms-muted)" }}>{cat.specification}</div>
                        </td>
                        <td>{cat.type}</td>
                        <td>{cat.capacity} Person(s)</td>
                        <td style={{ fontWeight: 700, color: "var(--cms-primary)" }}>{cat.fee}</td>
                        <td>{cat.totalRooms} Rooms</td>
                        <td>{cat.totalBeds} Beds</td>
                        <td style={{ fontSize: 12, color: "var(--cms-muted)" }}>{cat.blocks}</td>
                        <td>
                          <StatusBadge value={cat.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="cms-hostel-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="cms-action-btn"
                              title="View category"
                              onClick={() => setModal({ isOpen: true, type: "category", mode: "view", data: cat })}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="cms-action-btn"
                              title="Edit category"
                              onClick={() => setModal({ isOpen: true, type: "category", mode: "edit", data: cat })}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="cms-action-btn danger"
                              title="Delete category"
                              onClick={() => handleDeleteCategory(cat)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 4. Rooms & Bed Allocation (Matching user screenshot reference)
  const renderRooms = () => {
    // Floor matcher helper (supports "Ground Floor", "1st Floor", "Floor 1", etc.)
    const isFloorMatch = (roomFloor, filterVal) => {
      if (!filterVal || filterVal === "all") return true;
      if (!roomFloor) return false;
      const rLower = String(roomFloor).toLowerCase().trim();
      const fLower = String(filterVal).toLowerCase().trim();
      if (rLower === fLower) return true;
      if (rLower.includes("ground") && (fLower.includes("ground") || fLower.includes("0"))) return true;
      const rDigit = rLower.match(/\d+/)?.[0];
      const fDigit = fLower.match(/\d+/)?.[0];
      if (rDigit && fDigit) return rDigit === fDigit;
      return rLower.includes(fLower) || fLower.includes(rLower);
    };

    // Calculate available floors dynamically based on selected hostel block
    const availableFloors = (() => {
      const floorSet = new Set();
      if (filterHostelRooms && filterHostelRooms !== "all") {
        const b = blocks.find((blk) => blk.code === filterHostelRooms || blk.name === filterHostelRooms);
        if (b) {
          const count = Math.max(1, Number(b.floors || 2));
          for (let i = 0; i < count; i++) {
            floorSet.add(i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`);
          }
        }
        rooms
          .filter((r) => r.block === filterHostelRooms || r.blockName === filterHostelRooms)
          .forEach((r) => {
            if (r.floor) floorSet.add(r.floor);
          });
      } else {
        ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].forEach((f) => floorSet.add(f));
        rooms.forEach((r) => {
          if (r.floor) floorSet.add(r.floor);
        });
      }
      return Array.from(floorSet);
    })();

    // Filter rooms by query, hostel block, and floor
    const filtered = rooms.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        r.roomNo.toLowerCase().includes(q) ||
        (r.blockName && r.blockName.toLowerCase().includes(q)) ||
        (r.block && r.block.toLowerCase().includes(q)) ||
        (r.type && r.type.toLowerCase().includes(q));

      const matchBlock =
        !filterHostelRooms ||
        filterHostelRooms === "all" ||
        r.block === filterHostelRooms ||
        r.blockName === filterHostelRooms;

      const matchFloor = isFloorMatch(r.floor, filterFloor);

      return matchQ && matchBlock && matchFloor;
    });

    const isHostelSelected = Boolean(filterHostelRooms) || Boolean(searchQuery.trim());

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header matching Screenshot 1 */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Home size={22} style={{ color: "var(--cms-primary)" }} />
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "var(--cms-text)" }}>
              Rooms &amp; Bed Allocation
            </h2>
          </div>

          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModal({ isOpen: true, type: "room", mode: "add", data: null })}
            style={{ borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, padding: "8px 18px" }}
          >
            <Plus size={16} /> Add New Room
          </button>
        </div>

        {/* Toolbar with Search and Floor Filter matching Screenshot 1 */}
        <div
          className="cms-card"
          style={{
            padding: "12px 18px",
            borderRadius: 18,
            boxShadow: "var(--cms-shadow)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {/* Left: Search input */}
            <div
              className="cms-hostel-search app-search-field"
              style={{
                minWidth: 260,
                flex: "1 1 260px",
                maxWidth: 420,
              }}
            >
              <Search className="app-search-field__icon" size={15} style={{ color: "var(--cms-muted)" }} />
              <input
                type="text"
                placeholder="Search room number, hostel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Right: Filters & Tools */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--cms-text)" }}>Filter:</span>
              <select
                className="cms-hostel-select app-select"
                value={filterHostelRooms}
                onChange={(e) => {
                  setFilterHostelRooms(e.target.value);
                  setFilterFloor("all");
                }}
                style={{ minWidth: 170 }}
              >
                <option value="">Select Hostel...</option>
                <option value="all">All Hostels</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={16} style={{ color: "var(--cms-primary)" }} />
                <select
                  className="cms-hostel-select app-select"
                  value={filterFloor}
                  onChange={(e) => setFilterFloor(e.target.value)}
                  style={{ minWidth: 130 }}
                >
                  <option value="all">All Floors</option>
                  {availableFloors.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
              </div>


              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ borderRadius: 10, padding: "7px 12px", fontSize: 12 }}
                onClick={() =>
                  exportCsv("rooms-bed-allocation.csv", filtered, [
                    { key: "roomNo", label: "Room No" },
                    { key: "blockName", label: "Hostel Block" },
                    { key: "floor", label: "Floor Level" },
                    { key: "type", label: "Room Sharing" },
                    { key: "capacity", label: "Capacity" },
                    { key: "occupied", label: "Occupied Beds" },
                    { key: "fee", label: "Tariff" },
                    { key: "status", label: "Status" },
                  ])
                }
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {!isHostelSelected ? (
          /* Empty state exactly matching Screenshot 1 */
          <div
            className="cms-card"
            style={{
              padding: "64px 24px",
              borderRadius: 24,
              border: "1px solid color-mix(in srgb, var(--cms-primary) 25%, var(--cms-border))",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "var(--cms-surface)",
              boxShadow: "var(--cms-shadow)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "var(--cms-primary-soft)",
                border: "1px solid color-mix(in srgb, var(--cms-primary) 30%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--cms-primary)",
              }}
            >
              <Home size={28} />
            </div>
            <div style={{ maxWidth: 460 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px 0", color: "var(--cms-text)" }}>
                Select a Hostel
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--cms-muted)", margin: 0, lineHeight: 1.5 }}>
                Please select a hostel option from the filter dropdown above to view room allocations.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="cms-card"
            style={{
              padding: "48px 20px",
              borderRadius: 20,
              textAlign: "center",
              color: "var(--cms-muted)",
              fontSize: 13,
            }}
          >
            <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>No rooms found matching your filter criteria.</p>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                setSearchQuery("");
                setFilterHostelRooms("all");
                setFilterFloor("all");
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Table View (Default Only) */
          <div className="cms-hostel-table-wrap" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="cms-hostel-table" style={{ width: "100%", minWidth: 850, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Room No</th>
                  <th>Block</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Occupied Beds</th>
                  <th>Bed Layout</th>
                  <th>Monthly Tariff</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => (
                  <tr key={room.id}>
                    <td style={{ fontWeight: 700, color: "var(--cms-primary)" }}>Room #{room.roomNo}</td>
                    <td>{room.blockName || room.block}</td>
                    <td>{room.floor}</td>
                    <td>{room.type}</td>
                    <td>{room.capacity} Beds</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: room.occupied >= room.capacity ? "var(--cms-amber)" : "var(--cms-green)",
                        }}
                      >
                        {room.occupied} / {room.capacity}
                      </span>
                    </td>
                    <td style={{ fontSize: 11.5 }}>
                      {(room.beds || []).map((bd, i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-block",
                            marginRight: 4,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: bd.includes("Occupied") ? "var(--cms-amber-soft)" : "var(--cms-green-soft)",
                            color: bd.includes("Occupied") ? "var(--cms-amber)" : "var(--cms-green)",
                            fontWeight: 600,
                          }}
                        >
                          {bd}
                        </span>
                      ))}
                    </td>
                    <td style={{ fontWeight: 700 }}>{room.fee}</td>
                    <td>
                      <StatusBadge value={room.status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="cms-hostel-actions" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="cms-action-btn"
                          title="View details"
                          onClick={() => setModal({ isOpen: true, type: "room", mode: "view", data: room })}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="cms-action-btn"
                          title="Edit room"
                          onClick={() => setModal({ isOpen: true, type: "room", mode: "edit", data: room })}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="cms-action-btn danger"
                          title="Delete room"
                          onClick={() => handleDeleteRoom(room)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 5. Wardens (Matching user screenshot reference)
  const renderWardens = () => {
    const filtered = wardens.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.empId.toLowerCase().includes(q) ||
        (w.assignedHostels && w.assignedHostels.toLowerCase().includes(q)) ||
        (w.designation && w.designation.toLowerCase().includes(q));

      const matchBlock =
        !filterHostelWarden ||
        filterHostelWarden === "all" ||
        (w.assignedHostels && w.assignedHostels.toLowerCase().includes(filterHostelWarden.toLowerCase()));

      return matchQ && matchBlock;
    });

    const isHostelSelected = Boolean(filterHostelWarden) || Boolean(searchQuery.trim());

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header matching Screenshot 1 */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={22} style={{ color: "var(--cms-primary)" }} />
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "var(--cms-text)" }}>
              Wardens
            </h2>
          </div>

          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModal({ isOpen: true, type: "warden", mode: "add", data: null })}
            style={{ borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, padding: "8px 18px" }}
          >
            <Plus size={16} /> Assign Warden
          </button>
        </div>

        {/* Toolbar matching Screenshot 1 */}
        <div
          className="cms-card"
          style={{
            padding: "12px 18px",
            borderRadius: 18,
            boxShadow: "var(--cms-shadow)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {/* Left: Search input */}
            <div
              className="cms-hostel-search app-search-field"
              style={{
                minWidth: 260,
                flex: "1 1 260px",
                maxWidth: 420,
              }}
            >
              <Search className="app-search-field__icon" size={15} style={{ color: "var(--cms-muted)" }} />
              <input
                type="text"
                placeholder="Search warden by name, ID, hostel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Right: Filters & Tools */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <select
                className="cms-hostel-select app-select"
                value={filterHostelWarden}
                onChange={(e) => setFilterHostelWarden(e.target.value)}
                style={{ minWidth: 200 }}
              >
                <option value="">-- Select Hostel --</option>
                <option value="all">All Hostels</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>


              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ borderRadius: 10, padding: "7px 12px", fontSize: 12 }}
                onClick={() =>
                  exportCsv("wardens.csv", filtered, [
                    { key: "empId", label: "Employee ID" },
                    { key: "name", label: "Warden Name" },
                    { key: "designation", label: "Designation" },
                    { key: "phone", label: "Phone" },
                    { key: "email", label: "Email" },
                    { key: "assignedHostels", label: "Assigned Hostels" },
                    { key: "status", label: "Status" },
                  ])
                }
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {!isHostelSelected ? (
          /* Empty state exactly matching Screenshot 1 */
          <div
            className="cms-card"
            style={{
              padding: "64px 24px",
              borderRadius: 24,
              border: "1px solid color-mix(in srgb, var(--cms-primary) 25%, var(--cms-border))",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "var(--cms-surface)",
              boxShadow: "var(--cms-shadow)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "var(--cms-primary-soft)",
                border: "1px solid color-mix(in srgb, var(--cms-primary) 30%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--cms-primary)",
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <div style={{ maxWidth: 460 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px 0", color: "var(--cms-text)" }}>
                No Hostel Filter Selected
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--cms-muted)", margin: 0, lineHeight: 1.5 }}>
                Please select a hostel block from the filter dropdown above or use search/manual entry to load warden records.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="cms-card"
            style={{
              padding: "48px 20px",
              borderRadius: 20,
              textAlign: "center",
              color: "var(--cms-muted)",
              fontSize: 13,
            }}
          >
            <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>No warden assignments found matching filter.</p>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                setSearchQuery("");
                setFilterHostelWarden("all");
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Table View (Default Only) */
          <div className="cms-hostel-table-wrap" style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="cms-hostel-table" style={{ width: "100%", minWidth: 800, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Warden Name</th>
                  <th>Designation</th>
                  <th>Assigned Facilities</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600, fontFamily: "monospace" }}>{w.empId}</td>
                    <td>
                      <strong>{w.name}</strong>
                    </td>
                    <td>{w.designation}</td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "var(--cms-subtle)",
                          fontWeight: 700,
                          fontSize: 12,
                          color: "var(--cms-primary)",
                        }}
                      >
                        {w.assignedHostels}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace" }}>{w.phone}</td>
                    <td>{w.email}</td>
                    <td>
                      <StatusBadge value={w.status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="cms-hostel-actions" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="cms-action-btn"
                          title="View details"
                          onClick={() => setModal({ isOpen: true, type: "warden", mode: "view", data: w })}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="cms-action-btn"
                          title="Edit warden"
                          onClick={() => setModal({ isOpen: true, type: "warden", mode: "edit", data: w })}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="cms-action-btn danger"
                          title="Remove warden"
                          onClick={() => handleDeleteWarden(w)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 6. Student Allocations (Student Room Allocations)
  const renderAllocations = () => {
    // Unique list of hostels for dropdown
    const hostelOptions = Array.from(
      new Set([
        ...blocks.map((b) => b.name),
        ...allocations.map((a) => a.blockName).filter(Boolean),
      ])
    );

    // Floor options
    const floorOptions = ["Floor 1", "Floor 2", "Floor 3", "Floor 4"];

    // Dynamic room options based on selected hostel & floor
    const roomOptions = Array.from(
      new Set([
        ...rooms
          .filter((r) => {
            const matchH = filterAllocHostel === "all" || r.blockName === filterAllocHostel || r.block === filterAllocHostel;
            const matchF = filterAllocFloor === "all" || r.floor === filterAllocFloor;
            return matchH && matchF;
          })
          .map((r) => (r.roomNo.startsWith("RM") || r.roomNo.startsWith("Room") ? `Room #${r.roomNo}` : `Room #${r.roomNo}`)),
        ...allocations
          .filter((a) => {
            const matchH = filterAllocHostel === "all" || a.blockName === filterAllocHostel;
            const matchF = filterAllocFloor === "all" || a.floor === filterAllocFloor;
            return matchH && matchF;
          })
          .map((a) => (a.roomBadge ? a.roomBadge.split(" ")[0] : a.room ? `Room #${a.room}` : null))
          .filter(Boolean),
      ])
    );

    // Filter allocations
    const filtered = allocations.filter((a) => {
      const q = filterAllocSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        a.studentName?.toLowerCase().includes(q) ||
        a.admissionNo?.toLowerCase().includes(q) ||
        (a.room && a.room.toLowerCase().includes(q)) ||
        (a.roomBadge && a.roomBadge.toLowerCase().includes(q)) ||
        (a.blockName && a.blockName.toLowerCase().includes(q));

      const matchHostel =
        filterAllocHostel === "all" ||
        a.blockName === filterAllocHostel ||
        a.blockCode === filterAllocHostel;

      const matchFloor = filterAllocFloor === "all" || a.floor === filterAllocFloor;

      const matchRoom =
        filterAllocRoom === "all" ||
        a.room === filterAllocRoom ||
        `Room #${a.room}` === filterAllocRoom ||
        (a.roomBadge && a.roomBadge.includes(filterAllocRoom));

      return matchQ && matchHostel && matchFloor && matchRoom;
    });

    return (
      <div className="cms-hostel-stack">
        {/* Header matching Screenshot 1 */}
        <div className="cms-alloc-header-row">
          <div className="cms-alloc-title-group">
            <UserPlus size={22} style={{ color: "var(--cms-primary)" }} />
            <h2>Student Room Allocations</h2>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModal({ isOpen: true, type: "allocation", mode: "add", data: null })}
            style={{ borderRadius: 9999, height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} /> Allocate Room &amp; Bed
          </button>
        </div>

        {/* Toolbar with EXACTLY 4 Filters */}
        <div className="cms-alloc-toolbar-compact">
          {/* 1. Search Box */}
          <div className="app-search-field" style={{ position: "relative", width: "100%" }}>
            <Search className="app-search-field__icon"
              size={15}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cms-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search student, adm no, room..."
              value={filterAllocSearch}
              onChange={(e) => setFilterAllocSearch(e.target.value)}
              className="cms-alloc-input-compact"
            />
          </div>

          {/* 2. All Hostels Dropdown */}
          <div style={{ position: "relative", width: "100%" }}>
            <select
              value={filterAllocHostel}
              onChange={(e) => {
                setFilterAllocHostel(e.target.value);
                setFilterAllocRoom("all");
              }}
              className="cms-alloc-select-compact app-select"
            >
              <option value="all">All Hostels</option>
              {hostelOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--cms-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronDown size={15} />
            </div>
          </div>

          {/* 3. All Floors Dropdown */}
          <div style={{ position: "relative", width: "100%" }}>
            <select
              value={filterAllocFloor}
              onChange={(e) => {
                setFilterAllocFloor(e.target.value);
                setFilterAllocRoom("all");
              }}
              className="cms-alloc-select-compact app-select"
            >
              <option value="all">All Floors</option>
              {floorOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--cms-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronDown size={15} />
            </div>
          </div>

          {/* 4. All Rooms Dropdown */}
          <div style={{ position: "relative", width: "100%" }}>
            <select
              value={filterAllocRoom}
              onChange={(e) => setFilterAllocRoom(e.target.value)}
              className="cms-alloc-select-compact app-select"
            >
              <option value="all">All Rooms</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--cms-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronDown size={15} />
            </div>
          </div>
        </div>

        {/* Compact Table */}
        <div className="cms-hostel-compact-card">
          <div className="cms-hostel-table-scroll">
            <table className="cms-hostel-compact-table">
              <thead>
                <tr>
                  <th>STUDENT NAME</th>
                  <th>ADMISSION ID</th>
                  <th>HOSTEL FACILITY</th>
                  <th>ROOM &amp; BED</th>
                  <th>JOINING DATE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px 18px", color: "var(--cms-muted)" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <UserPlus size={30} style={{ color: "var(--cms-muted)" }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--cms-text)" }}>No Student Allocations Found</div>
                        <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                          No allocations match your selected filters. Click &quot;+ Allocate Room &amp; Bed&quot; to assign a new bed.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => {
                    const isVacated = a.status === "Vacated";
                    const bedBadge = a.roomBadge || (a.room ? `Room #${a.room}` : "Room #101 (BED-1)");
                    return (
                      <tr key={a.id}>
                        <td>
                          <span
                            style={{ color: "var(--cms-primary)", fontWeight: 700, cursor: "pointer" }}
                            onClick={() => setModal({ isOpen: true, type: "allocation", mode: "view", data: a })}
                          >
                            {a.studentName}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "var(--cms-muted)", fontWeight: 500 }}>{a.admissionNo}</span>
                        </td>
                        <td>
                          <strong style={{ color: "var(--cms-text)" }}>{a.blockName}</strong>
                        </td>
                        <td>
                          <span style={{ color: "var(--cms-green)", fontWeight: 700 }}>{bedBadge}</span>
                        </td>
                        <td>
                          <span style={{ color: "var(--cms-muted)" }}>{a.joinDate || "2026-08-01"}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 9999,
                              fontSize: 11.5,
                              fontWeight: 600,
                              background: isVacated ? "var(--cms-red-soft)" : "var(--cms-green-soft)",
                              color: isVacated ? "var(--cms-red)" : "var(--cms-green)",
                            }}
                          >
                            {isVacated ? "Vacated" : "Active"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {!isVacated ? (
                            <button
                              type="button"
                              className="cms-alloc-vacate-btn"
                              onClick={() => setModal({ isOpen: true, type: "vacate", mode: "vacate", data: a })}
                            >
                              Vacate
                            </button>
                          ) : (
                            <span style={{ color: "var(--cms-muted)", fontSize: 11.5, fontStyle: "italic" }}>Vacated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 7. Outpass & Leave
  const renderOutpasses = () => {
    const isFiltered = Boolean(outpassSearch.trim() || outpassStatus || outpassType);

    const filtered = !isFiltered
      ? []
      : outpasses.filter((o) => {
          const q = outpassSearch.toLowerCase().trim();
          const matchQ =
            !q ||
            o.studentName?.toLowerCase().includes(q) ||
            o.admissionNo?.toLowerCase().includes(q) ||
            (o.roomNo && o.roomNo.toLowerCase().includes(q)) ||
            (o.roomNumber && o.roomNumber.toLowerCase().includes(q)) ||
            (o.blockName && o.blockName.toLowerCase().includes(q)) ||
            (o.reason && o.reason.toLowerCase().includes(q));

          const reqType = o.outpassType || o.requestType || "";
          const matchType =
            !outpassType ||
            reqType.toLowerCase().includes(outpassType.toLowerCase()) ||
            outpassType.toLowerCase().includes(reqType.toLowerCase());

          const matchStatus =
            !outpassStatus ||
            outpassStatus === "all" ||
            o.status?.toLowerCase() === outpassStatus.toLowerCase() ||
            (outpassStatus === "Pending" && (o.status === "Pending" || o.status === "Pending Approval"));

          return matchQ && matchType && matchStatus;
        });

    return (
      <div className="cms-hostel-stack">
        {/* Top Header Row matching Screenshot 1 */}
        <div className="cms-outpass-header-row">
          <div className="cms-outpass-title-group">
            <ArrowRightLeft size={20} style={{ color: "var(--cms-primary)" }} />
            <h2>Outpass &amp; Leave Management</h2>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModal({ isOpen: true, type: "outpass", mode: "add", data: null })}
            style={{
              borderRadius: 9999,
              height: 36,
              padding: "0 18px",
              fontSize: 13,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} /> Apply Outpass / Leave
          </button>
        </div>

        {/* Filter Bar matching Screenshot 1 & 4 */}
        <div className="cms-outpass-toolbar">
          {/* Search Box */}
          <div className="cms-outpass-search-wrap app-search-field">
            <div className="cms-outpass-search-icon app-search-field__icon">
              <Search size={15} />
            </div>
            <input
              type="text"
              className="cms-outpass-search-input"
              placeholder="Search student, adm no, room..."
              value={outpassSearch}
              onChange={(e) => setOutpassSearch(e.target.value)}
            />
          </div>

          {/* Filters & Export */}
          <div className="cms-outpass-filters-wrap">
            {/* Outpass Type Filter matching Screenshot 4 */}
            <select
              className="cms-outpass-select app-select"
              value={outpassType}
              onChange={(e) => setOutpassType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Local Outpass">Local Outpass (Same Day)</option>
              <option value="Home Leave">Home Leave (Multiple Days)</option>
              <option value="Emergency Outpass">Emergency Outpass</option>
            </select>

            {/* Status Filter matching Screenshot 1 & 2 */}
            <select
              className="cms-outpass-select app-select"
              value={outpassStatus}
              onChange={(e) => setOutpassStatus(e.target.value)}
            >
              <option value="">Select Option</option>
              <option value="all">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>

            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ height: 38, borderRadius: 8, padding: "0 12px", fontSize: 12.5 }}
              onClick={() =>
                exportCsv("outpass-requests.csv", filtered.length ? filtered : outpasses, [
                  { key: "studentName", label: "Student" },
                  { key: "admissionNo", label: "Adm No" },
                  { key: "blockName", label: "Hostel & Room", value: (r) => `${r.blockName} (Room #${r.roomNo?.replace("Room #", "") || r.roomNumber || "101"})` },
                  { key: "requestType", label: "Outpass Type", value: (r) => r.outpassType || r.requestType },
                  { key: "departureDate", label: "Departure", value: (r) => r.departureDate || r.outDate },
                  { key: "returnDate", label: "Expected Return" },
                  { key: "status", label: "Status" },
                  { key: "reason", label: "Reason" },
                ])
              }
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Empty State Prompt matching Screenshot 1 */}
        {!isFiltered ? (
          <div className="cms-outpass-empty-prompt">
            <div className="cms-outpass-empty-icon">
              <LogOut size={28} />
            </div>
            <p className="cms-outpass-empty-text">
              Please enter a search query to load records.
            </p>
          </div>
        ) : (
          /* Table Card matching Screenshot 2 & 3 */
          <div className="cms-outpass-table-card cms-hostel-table-scroll">
            <table className="cms-outpass-table">
              <thead>
                <tr>
                  <th className="cms-outpass-th">Student</th>
                  <th className="cms-outpass-th">Adm No</th>
                  <th className="cms-outpass-th">Hostel &amp; Room</th>
                  <th className="cms-outpass-th">Outpass Type</th>
                  <th className="cms-outpass-th">Departure</th>
                  <th className="cms-outpass-th">Expected Return</th>
                  <th className="cms-outpass-th" style={{ textAlign: "center" }}>Status</th>
                  <th className="cms-outpass-th" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "var(--cms-muted)", fontStyle: "italic", fontWeight: 600 }}>
                      No outpass records found matching filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isPending = r.status === "Pending" || r.status === "Pending Approval";
                    const isApproved = r.status === "Approved";
                    const roomDisplay = r.roomNo?.replace("Room #", "") || r.roomNumber || "101";

                    return (
                      <tr key={r.id} className="cms-outpass-row">
                        <td className="cms-outpass-td" style={{ fontWeight: 700, color: "var(--cms-text)" }}>
                          {r.studentName}
                        </td>
                        <td className="cms-outpass-td" style={{ fontFamily: "monospace", color: "var(--cms-muted)", fontSize: 12 }}>
                          {r.admissionNo}
                        </td>
                        <td className="cms-outpass-td">
                          <span className="cms-outpass-hostel-link">
                            {r.blockName} (Room #{roomDisplay})
                          </span>
                        </td>
                        <td className="cms-outpass-td" style={{ fontWeight: 700, color: "var(--cms-text)" }}>
                          {r.outpassType || r.requestType}
                        </td>
                        <td className="cms-outpass-td" style={{ fontFamily: "monospace", color: "var(--cms-muted)", fontSize: 12 }}>
                          {r.departureDate || r.outDate}
                        </td>
                        <td className="cms-outpass-td" style={{ fontFamily: "monospace", color: "var(--cms-muted)", fontSize: 12 }}>
                          {r.returnDate}
                        </td>
                        <td className="cms-outpass-td" style={{ textAlign: "center" }}>
                          <span
                            className={`cms-outpass-status-pill ${
                              isApproved
                                ? "cms-outpass-status-approved"
                                : isPending
                                ? "cms-outpass-status-pending"
                                : "cms-outpass-status-rejected"
                            }`}
                          >
                            {isPending ? "Pending" : r.status}
                          </span>
                        </td>
                        <td className="cms-outpass-td" style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOutpassStatus(r.id, "Approved")}
                                  className="cms-outpass-action-btn approve"
                                  title="Approve Outpass"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOutpassStatus(r.id, "Rejected")}
                                  className="cms-outpass-action-btn reject"
                                  title="Reject Outpass"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setModal({ isOpen: true, type: "outpass", mode: "view", data: r })}
                              className="cms-outpass-action-btn view"
                              title="View details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOutpass(r)}
                              className="cms-outpass-action-btn delete"
                              title="Delete Record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // 8. Transfer & Vacate (Screenshots 1 & 2 - Theme-based & Compact)
  const renderTransfers = () => {
    const filtered = transfers.filter((t) => {
      const q = transferSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        t.studentName?.toLowerCase().includes(q) ||
        t.admissionNo?.toLowerCase().includes(q) ||
        t.currentRoomDisplay?.toLowerCase().includes(q) ||
        t.currentBlock?.toLowerCase().includes(q) ||
        t.targetBlock?.toLowerCase().includes(q) ||
        t.targetRoom?.toLowerCase().includes(q) ||
        t.targetDisplayTitle?.toLowerCase().includes(q);

      const filterLower = transferFilter.toLowerCase();
      const matchFilter =
        !transferFilter ||
        transferFilter === "all" ||
        transferFilter === "Select" ||
        t.actionType?.toLowerCase().includes(filterLower) ||
        t.requestType?.toLowerCase().includes(filterLower);

      return matchQ && matchFilter;
    });

    const currentFilterLabel =
      transferFilter === ""
        ? "Select"
        : transferFilter === "Room Transfer"
        ? "Room Transfer"
        : transferFilter === "Bed Vacate"
        ? "Bed Vacate"
        : "All Requests";

    return (
      <div className="cms-hostel-stack">
        {/* Top Button Row matching Screenshot 1 */}
        <div className="cms-transfer-action-row">
          <button
            type="button"
            className="cms-transfer-btn-pill"
            onClick={() => setModal({ isOpen: true, type: "transfer", mode: "add", data: null })}
          >
            <Plus size={16} /> Request Transfer / Vacate
          </button>
        </div>

        {/* Filter Toolbar matching Screenshot 1 & 2 */}
        <div className="cms-transfer-toolbar">
          {/* Search Box */}
          <div className="cms-transfer-search-wrap app-search-field">
            <div className="cms-transfer-search-icon app-search-field__icon">
              <Search size={15} />
            </div>
            <input
              type="text"
              className="cms-transfer-search-input"
              placeholder="Search student, adm no, room..."
              value={transferSearch}
              onChange={(e) => setTransferSearch(e.target.value)}
            />
          </div>

          {/* Filter Dropdown matching Screenshot 1 & 2 */}
          <div className="cms-transfer-filter-container">
            <button
              type="button"
              className="cms-transfer-filter-trigger app-select-control"
              onClick={() => setIsTransferFilterOpen(!isTransferFilterOpen)}
            >
              <span>{currentFilterLabel}</span>
              <ChevronDown
                size={16}
                style={{
                  transform: isTransferFilterOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s ease",
                  color: "var(--cms-muted)",
                }}
              />
            </button>

            {isTransferFilterOpen && (
              <div className="cms-transfer-filter-menu app-select-panel">
                <div
                  className={(`cms-transfer-filter-option ${transferFilter === "" ? "selected" : ""}`) + " app-select-option"}
                  onClick={() => {
                    setTransferFilter("");
                    setIsTransferFilterOpen(false);
                  }}
                >
                  <span>Select</span>
                </div>
                <div
                  className={(`cms-transfer-filter-option ${transferFilter === "all" || !transferFilter ? "selected" : ""}`) + " app-select-option"}
                  onClick={() => {
                    setTransferFilter("all");
                    setIsTransferFilterOpen(false);
                  }}
                >
                  <span>All Requests</span>
                  {(transferFilter === "all" || !transferFilter) && (
                    <Check size={14} style={{ color: "var(--cms-primary)" }} />
                  )}
                </div>
                <div
                  className={(`cms-transfer-filter-option ${transferFilter === "Room Transfer" ? "selected" : ""}`) + " app-select-option"}
                  onClick={() => {
                    setTransferFilter("Room Transfer");
                    setIsTransferFilterOpen(false);
                  }}
                >
                  <span>Room Transfer</span>
                  {transferFilter === "Room Transfer" && (
                    <Check size={14} style={{ color: "var(--cms-primary)" }} />
                  )}
                </div>
                <div
                  className={(`cms-transfer-filter-option ${transferFilter === "Bed Vacate" ? "selected" : ""}`) + " app-select-option"}
                  onClick={() => {
                    setTransferFilter("Bed Vacate");
                    setIsTransferFilterOpen(false);
                  }}
                >
                  <span>Bed Vacate</span>
                  {transferFilter === "Bed Vacate" && (
                    <Check size={14} style={{ color: "var(--cms-primary)" }} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Card matching Screenshot 1 & 2 */}
        <div className="cms-transfer-table-card cms-hostel-table-scroll">
          <table className="cms-transfer-table">
            <thead>
              <tr>
                <th className="cms-transfer-th">STUDENT</th>
                <th className="cms-transfer-th">ADM NO</th>
                <th className="cms-transfer-th">ACTION TYPE</th>
                <th className="cms-transfer-th">CURRENT ROOM</th>
                <th className="cms-transfer-th">TARGET ROOM / FEE ADJUSTMENT</th>
                <th className="cms-transfer-th">DATE</th>
                <th className="cms-transfer-th">STATUS</th>
                <th className="cms-transfer-th" style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "var(--cms-muted)", fontStyle: "italic", fontWeight: 600 }}>
                    No transfer or vacate records found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="cms-transfer-row">
                    <td className="cms-transfer-td">
                      <span className="cms-transfer-student-name">{t.studentName}</span>
                    </td>
                    <td className="cms-transfer-td">
                      <span className="cms-transfer-adm">{t.admissionNo}</span>
                    </td>
                    <td className="cms-transfer-td">
                      <span className="cms-transfer-action-type">{t.actionType || t.requestType}</span>
                    </td>
                    <td className="cms-transfer-td">
                      <div className="cms-transfer-room-cell">
                        <span className="cms-transfer-room-block">
                          {t.currentBlock || (t.currentRoomDisplay ? t.currentRoomDisplay.split(" (")[0] : "-")}
                        </span>
                        <span className="cms-transfer-room-num">
                          {t.currentRoom ? `(#${t.currentRoom})` : (t.currentRoomDisplay && t.currentRoomDisplay.includes(" (") ? `(${t.currentRoomDisplay.split(" (")[1]}` : "")}
                        </span>
                      </div>
                    </td>
                    <td className="cms-transfer-td">
                      <div className="cms-transfer-target-cell">
                        {t.targetDisplayTitle && (
                          <span className="cms-transfer-target-title">{t.targetDisplayTitle}</span>
                        )}
                        {t.targetDisplaySub && (
                          <span className="cms-transfer-target-sub">{t.targetDisplaySub}</span>
                        )}
                        {t.feeAdjustment && (
                          <span className="cms-transfer-fee-badge">{t.feeAdjustment}</span>
                        )}
                      </div>
                    </td>
                    <td className="cms-transfer-td">
                      <span style={{ color: "var(--cms-muted)", fontSize: 12 }}>
                        {t.date || t.requestDate}
                      </span>
                    </td>
                    <td className="cms-transfer-td">
                      <span className="cms-transfer-status-completed">
                        {t.status || "Completed"}
                      </span>
                    </td>
                    <td className="cms-transfer-td" style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="cms-transfer-delete-btn"
                          title="Delete Record"
                          onClick={() => handleDeleteTransfer(t)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 9. Attendance (Exact match for Screenshots 1 & 2)
  const renderAttendance = () => {
    const shiftData = attendanceMap[attendanceShift] || {};

    const filtered = attendanceStudents.filter((s) => {
      const q = attendanceSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q) ||
        s.admissionNo?.toLowerCase().includes(q) ||
        s.roomBed?.toLowerCase().includes(q) ||
        s.room?.toLowerCase().includes(q);

      const matchBlock =
        !attendanceBlock ||
        attendanceBlock === "all" ||
        s.block === attendanceBlock ||
        s.blockCode === attendanceBlock;

      const matchRoom =
        !attendanceRoom ||
        attendanceRoom === "all" ||
        s.room === attendanceRoom ||
        s.roomBed?.includes(attendanceRoom);

      return matchQ && matchBlock && matchRoom;
    });

    const totalCount = filtered.length;
    const presentCount = filtered.filter((s) => shiftData[s.id]?.status === "Present").length;
    const absentCount = filtered.filter((s) => shiftData[s.id]?.status === "Absent").length;
    const leaveCount = filtered.filter((s) => shiftData[s.id]?.status === "Leave").length;
    const halfDayCount = filtered.filter((s) => shiftData[s.id]?.status === "Half Day").length;

    // Available hostel block options for dropdown
    const attendanceBlockOptions = Array.from(
      new Set(blocks.map((b) => b.name))
    );

    // Available room options for selected block
    const attendanceRoomOptions = Array.from(
      new Set(
        attendanceStudents
          .filter((s) => !attendanceBlock || attendanceBlock === "all" || s.block === attendanceBlock)
          .map((s) => s.room)
          .filter(Boolean)
      )
    );

    return (
      <div className="cms-hostel-stack">
        {/* Section Header */}
        <div className="cms-att-header-row">
          <div className="cms-att-title-group">
            <Calendar size={22} style={{ color: "var(--cms-primary)" }} />
            <h2>Hostel Attendance</h2>
          </div>
          <button
            type="button"
            onClick={handleSaveAttendanceLog}
            className="cms-btn cms-btn-primary"
            style={{ borderRadius: 9999, height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Bookmark size={15} /> Save Attendance Log
          </button>
        </div>

        {/* Shift and View Controls Row */}
        <div className="cms-att-ctrl-row-compact">
          {/* Left: Morning / Night Shift Switch */}
          <div className="cms-att-shift-switch-compact">
            <button
              type="button"
              className={`cms-att-shift-btn-compact ${attendanceShift === "morning" ? "is-active" : ""}`}
              onClick={() => setAttendanceShift("morning")}
            >
              <Sun size={15} style={{ color: attendanceShift === "morning" ? "#ffffff" : "var(--cms-amber)" }} />
              Morning Attendance
            </button>
            <button
              type="button"
              className={`cms-att-shift-btn-compact ${attendanceShift === "night" ? "is-active" : ""}`}
              onClick={() => setAttendanceShift("night")}
            >
              <Moon size={15} style={{ color: attendanceShift === "night" ? "#ffffff" : "var(--cms-muted)" }} />
              Night Attendance
            </button>
          </div>

          {/* Right: Daily / Monthly / Custom Range toggle & Export Report */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="cms-att-freq-compact" role="tablist" aria-label="Attendance Mode">
              <button
                type="button"
                className={`cms-att-freq-btn-compact ${attendanceFrequency === "daily" ? "is-active" : ""}`}
                onClick={() => handleSelectAttendanceFrequency("daily")}
              >
                Daily Attendance
              </button>
              <button
                type="button"
                className={`cms-att-freq-btn-compact ${attendanceFrequency === "monthly" ? "is-active" : ""}`}
                onClick={() => handleSelectAttendanceFrequency("monthly")}
              >
                Monthly Attendance
              </button>
              <button
                type="button"
                className={`cms-att-freq-btn-compact ${attendanceFrequency === "custom" ? "is-active" : ""}`}
                onClick={() => handleSelectAttendanceFrequency("custom")}
              >
                Custom Range
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleExportAttendanceReport(filtered)}
              className="cms-att-export-btn-compact"
            >
              <FileSpreadsheet size={15} /> Export Report
            </button>
          </div>
        </div>

        {/* Filter Card / Bar */}
        <div className={`cms-att-filter-card-compact ${attendanceFrequency === "custom" ? "has-custom-range" : ""}`}>
          {/* 1. SEARCH STUDENT */}
          <div>
            <label className="cms-att-filter-lbl-compact">SEARCH STUDENT</label>
            <div className="app-search-field" style={{ position: "relative", width: "100%" }}>
              <Search className="app-search-field__icon"
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--cms-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Search by name, adm no, room..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="cms-alloc-input-compact"
                style={{ height: 34, paddingLeft: 34, fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* 2. DYNAMIC ATTENDANCE DATE / MONTH / DATE RANGE */}
          <div>
            {attendanceFrequency === "daily" && (
              <>
                <label className="cms-att-filter-lbl-compact">
                  ATTENDANCE DATE <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="cms-alloc-input-compact"
                    style={{ height: 34, paddingLeft: 12, paddingRight: 12, fontSize: 12.5, fontWeight: 600 }}
                  />
                </div>
              </>
            )}

            {attendanceFrequency === "monthly" && (
              <>
                <label className="cms-att-filter-lbl-compact">
                  MONTH <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <select
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(e.target.value)}
                    className="cms-alloc-select-compact app-select"
                    
                  >
                    {academicMonthOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "var(--cms-muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ChevronDown size={14} />
                  </div>
                </div>
              </>
            )}

            {attendanceFrequency === "custom" && (
              <>
                <label className="cms-att-filter-lbl-compact">
                  DATE RANGE <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div className="cms-att-date-range-group">
                  <div className="cms-att-date-range-input-wrap">
                    <input
                      type="date"
                      value={customRangeStart}
                      onChange={(e) => handleCustomStartChange(e.target.value)}
                      className={`cms-alloc-input-compact cms-att-range-input ${rangeError && !customRangeStart ? "is-invalid" : ""}`}
                      aria-label="Start Date"
                      title="Start Date"
                    />
                  </div>
                  <span className="cms-att-range-arrow" aria-hidden="true">
                    <ArrowRight size={13} />
                  </span>
                  <div className="cms-att-date-range-input-wrap">
                    <input
                      type="date"
                      value={customRangeEnd}
                      onChange={(e) => handleCustomEndChange(e.target.value)}
                      className={`cms-alloc-input-compact cms-att-range-input ${rangeError && (!customRangeEnd || customRangeStart > customRangeEnd) ? "is-invalid" : ""}`}
                      aria-label="End Date"
                      title="End Date"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomRange}
                    className="cms-att-range-apply-btn"
                    title="Apply Range"
                  >
                    Apply
                  </button>
                  {(customRangeStart || customRangeEnd) && (
                    <button
                      type="button"
                      onClick={handleClearCustomRange}
                      className="cms-att-range-clear-btn"
                      title="Clear Range"
                      aria-label="Clear date range"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                {rangeError && (
                  <div className="cms-att-range-error-text">
                    <AlertCircle size={11} />
                    <span>{rangeError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 3. HOSTEL BLOCK */}
          <div>
            <label className="cms-att-filter-lbl-compact">HOSTEL BLOCK</label>
            <div style={{ position: "relative", width: "100%" }}>
              <select
                value={attendanceBlock}
                onChange={(e) => {
                  setAttendanceBlock(e.target.value);
                  setAttendanceRoom("all");
                }}
                className="cms-alloc-select-compact app-select"
                
              >
                <option value="all">All Hostel Blocks</option>
                {attendanceBlockOptions.map((blk) => (
                  <option key={blk} value={blk}>
                    {blk}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--cms-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* 4. ROOM / FLOOR */}
          <div>
            <label className="cms-att-filter-lbl-compact">ROOM / FLOOR</label>
            <div style={{ position: "relative", width: "100%" }}>
              <select
                value={attendanceRoom}
                onChange={(e) => setAttendanceRoom(e.target.value)}
                className="cms-alloc-select-compact app-select"
                
              >
                <option value="all">All Rooms</option>
                {attendanceRoomOptions.map((rm) => (
                  <option key={rm} value={rm}>
                    {rm}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--cms-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Summary Card */}
        <div className="cms-att-summary-card-compact">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--cms-primary-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cms-primary)",
                }}
              >
                <Users size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: "var(--cms-text)", letterSpacing: "0.02em" }}>
                ATTENDANCE SUMMARY ({attendanceShift.toUpperCase()})
              </h3>
            </div>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--cms-muted)" }}>
              {attendanceFrequency === "daily" && `Date: ${attendanceDate}`}
              {attendanceFrequency === "monthly" &&
                `Month: ${academicMonthOptions.find((m) => m.value === attendanceMonth)?.label || "September 2026"}`}
              {attendanceFrequency === "custom" &&
                `Date Range: ${appliedCustomRange.start || "--"} → ${appliedCustomRange.end || "--"}`}
            </span>
          </div>

          {/* 5 Summary Stat Boxes */}
          <div className="cms-att-stat-grid-compact">
            {/* 1. Total Students */}
            <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-primary-soft)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-primary)", letterSpacing: "0.04em" }}>
                TOTAL STUDENTS
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-text)", lineHeight: 1 }}>
                {totalCount}
              </div>
            </div>

            {/* 2. Present */}
            <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-green-soft)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-green)", letterSpacing: "0.04em" }}>
                PRESENT
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-green)", lineHeight: 1 }}>
                {presentCount}
              </div>
            </div>

            {/* 3. Absent */}
            <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-red-soft)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-red)", letterSpacing: "0.04em" }}>
                ABSENT
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-red)", lineHeight: 1 }}>
                {absentCount}
              </div>
            </div>

            {/* 4. On Leave */}
            <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-info-soft)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-info)", letterSpacing: "0.04em" }}>
                ON LEAVE
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-info)", lineHeight: 1 }}>
                {leaveCount}
              </div>
            </div>

            {/* 5. Half Day */}
            <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-amber-soft)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-amber)", letterSpacing: "0.04em" }}>
                HALF DAY
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-amber)", lineHeight: 1 }}>
                {halfDayCount}
              </div>
            </div>
          </div>

          {/* Quick Bulk Actions */}
          <div className="cms-att-bulk-row-compact">
            <span>QUICK BULK ACTIONS:</span>
            <button
              type="button"
              onClick={() => handleBulkMarkAttendance("Present")}
              className="cms-att-bulk-btn-compact"
              style={{ background: "var(--cms-green-soft)", color: "var(--cms-green)" }}
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleBulkMarkAttendance("Absent")}
              className="cms-att-bulk-btn-compact"
              style={{ background: "var(--cms-red-soft)", color: "var(--cms-red)" }}
            >
              Mark All Absent
            </button>
            <button
              type="button"
              onClick={() => handleBulkMarkAttendance("Leave")}
              className="cms-att-bulk-btn-compact"
              style={{ background: "var(--cms-info-soft)", color: "var(--cms-info)" }}
            >
              Mark All Leave
            </button>
            <button
              type="button"
              onClick={handleClearAttendanceSelection}
              className="cms-att-bulk-btn-compact"
              style={{ background: "var(--cms-subtle)", color: "var(--cms-muted)", border: "1px solid var(--cms-border)" }}
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Attendance Compact Table */}
        <div className="cms-hostel-compact-card">
          <div className="cms-hostel-table-scroll">
            <table className="cms-hostel-compact-table">
              <thead>
                <tr>
                  <th>ADMISSION NO</th>
                  <th>STUDENT NAME</th>
                  <th>HOSTEL BLOCK</th>
                  <th>ROOM &amp; BED NO</th>
                  <th style={{ textAlign: "center" }}>ATTENDANCE STATUS</th>
                  <th style={{ textAlign: "center" }}>IN TIME</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "36px 18px", color: "var(--cms-muted)" }}>
                      <Users size={30} style={{ color: "var(--cms-muted)", marginBottom: 6 }} />
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cms-text)" }}>No Students Found</div>
                      <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>No resident students match the selected block and filters.</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const currentStatus = shiftData[s.id]?.status || "";
                    const currentInTime = shiftData[s.id]?.inTime || s.inTime || "07:00";
                    return (
                      <tr key={s.id}>
                        <td>
                          <span style={{ color: "var(--cms-muted)", fontWeight: 500 }}>
                            {s.admissionNo || s.id}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "var(--cms-text)" }}>{s.name}</strong>
                        </td>
                        <td>
                          <span style={{ color: "var(--cms-text)", fontWeight: 600 }}>{s.block}</span>
                        </td>
                        <td>
                          <span style={{ color: "var(--cms-muted)" }}>{s.roomBed || `${s.room} (${s.bed})`}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {/* Segmented Status Buttons */}
                          <div className="cms-att-status-group">
                            <button
                              type="button"
                              className={`cms-att-status-pill ${currentStatus === "Present" ? "is-present" : ""}`}
                              onClick={() => handleToggleAttendance(s.id, "Present")}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              className={`cms-att-status-pill ${currentStatus === "Absent" ? "is-absent" : ""}`}
                              onClick={() => handleToggleAttendance(s.id, "Absent")}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              className={`cms-att-status-pill ${currentStatus === "Half Day" ? "is-halfday" : ""}`}
                              onClick={() => handleToggleAttendance(s.id, "Half Day")}
                            >
                              Half Day
                            </button>
                            <button
                              type="button"
                              className={`cms-att-status-pill ${currentStatus === "Leave" ? "is-leave" : ""}`}
                              onClick={() => handleToggleAttendance(s.id, "Leave")}
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <strong style={{ color: "var(--cms-text)", fontSize: 12.5 }}>
                            {currentInTime}
                          </strong>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 10. Hostel Reports (Matching User Reference Screenshot)
  const renderReports = () => {
    // 1. Raw dataset by category
    let rawData = [];
    if (reportCategory === "Block Report") {
      rawData = blocks;
    } else if (reportCategory === "Room Report") {
      rawData = rooms;
    } else if (reportCategory === "Bed Allocation Report" || reportCategory === "Student Allocation Report") {
      rawData = allocations;
    } else if (reportCategory === "Attendance Report") {
      rawData = attendanceStudents;
    } else if (reportCategory === "Outpass & Leave Report") {
      rawData = outpasses;
    } else if (reportCategory === "Transfer & Vacate Report") {
      rawData = transfers;
    } else if (reportCategory === "Warden Report") {
      rawData = wardens;
    } else {
      rawData = blocks;
    }

    // 2. Filter by Block
    let filtered = rawData;
    if (reportBlockFilter && reportBlockFilter !== "all" && reportBlockFilter !== "") {
      const bFilter = reportBlockFilter.toLowerCase();
      filtered = filtered.filter((item) => {
        const blk = (item.name || item.blockName || item.block || item.assignedHostels || item.currentBlock || "").toLowerCase();
        return blk.includes(bFilter);
      });
    }

    // 3. Filter by Category / Status
    if (reportCategoryFilter && reportCategoryFilter !== "all" && reportCategoryFilter !== "") {
      const cFilter = reportCategoryFilter.toLowerCase();
      filtered = filtered.filter((item) => {
        if (cFilter === "active") return (item.status || "").toLowerCase() === "active";
        if (cFilter === "inactive") return (item.status || "").toLowerCase() !== "active";
        if (cFilter === "boys hostel") return (item.category || item.type || "").toLowerCase().includes("boy");
        if (cFilter === "girls hostel") return (item.category || item.type || "").toLowerCase().includes("girl");
        if (cFilter === "co-ed") return (item.category || item.type || "").toLowerCase().includes("co-ed");
        const matchStatus = (item.status || "").toLowerCase().includes(cFilter);
        const matchCat = (item.category || item.type || item.requestType || item.outpassType || "").toLowerCase().includes(cFilter);
        return matchStatus || matchCat;
      });
    }

    // 4. Search Filter
    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        return Object.values(item).some((val) => {
          if (typeof val === "string" || typeof val === "number") {
            return String(val).toLowerCase().includes(q);
          }
          return false;
        });
      });
    }

    // 5. Dynamic Pagination (Defaults to 5 records per page, matches Screenshot 4 reference)
    const totalReportPages = Math.max(1, Math.ceil(filtered.length / reportPageSize));
    const safeReportPage = Math.min(Math.max(1, reportPage), totalReportPages);
    const paginatedReports = filtered.slice(
      (safeReportPage - 1) * reportPageSize,
      safeReportPage * reportPageSize
    );

    // Helper to get structured columns for report export and printing
    const getReportColumns = (cat) => {
      switch (cat) {
        case "Block Report":
          return [
            { key: "code", label: "Block Code", getter: (r) => r.code || "-" },
            { key: "name", label: "Block Name", getter: (r) => r.name || "-" },
            { key: "type", label: "Category", getter: (r) => r.type || r.category || "Boys" },
            { key: "floors", label: "Total Floors", getter: (r) => r.floors ?? r.totalFloors ?? 1 },
            { key: "warden", label: "Warden Name", getter: (r) => r.warden || r.wardenName || "Unassigned" },
            { key: "wardenPhone", label: "Primary Mobile", getter: (r) => r.wardenPhone || r.primaryMobile || "-" },
            { key: "address", label: "Location", getter: (r) => r.address || r.location || "Main Campus" },
            { key: "status", label: "Status", getter: (r) => r.status || "Active" },
          ];
        case "Room Report":
          return [
            { key: "roomNo", label: "Room No", getter: (r) => r.roomNo || r.roomNumber || "-" },
            { key: "blockName", label: "Block Name", getter: (r) => r.blockName || r.block || "-" },
            { key: "floor", label: "Floor", getter: (r) => r.floor || "1st Floor" },
            { key: "type", label: "Category", getter: (r) => r.type || r.category || "Standard" },
            { key: "capacity", label: "Total Beds", getter: (r) => r.capacity ?? r.totalBeds ?? 1 },
            { key: "occupied", label: "Occupied Beds", getter: (r) => r.occupied ?? 0 },
            { key: "vacantBeds", label: "Vacant Beds", getter: (r) => Math.max(0, (r.capacity ?? 1) - (r.occupied ?? 0)) },
            { key: "status", label: "Status", getter: (r) => r.status || "Active" },
          ];
        case "Bed Allocation Report":
        case "Student Allocation Report":
          return [
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || "-" },
            { key: "studentName", label: "Student Name", getter: (r) => r.studentName || r.name || "-" },
            { key: "gender", label: "Gender", getter: (r) => r.gender || "-" },
            { key: "blockName", label: "Hostel Block", getter: (r) => r.blockName || r.blockCode || "-" },
            { key: "roomBadge", label: "Room & Bed", getter: (r) => r.roomBadge || (r.room && r.bed ? `${r.room} (${r.bed})` : r.room || "-") },
            { key: "joinDate", label: "Join Date", getter: (r) => r.joinDate ? (typeof r.joinDate === "string" ? r.joinDate.split("T")[0] : r.joinDate) : "-" },
            { key: "monthlyFee", label: "Monthly Fee", getter: (r) => r.monthlyFee ? `₹${r.monthlyFee}` : "-" },
            { key: "status", label: "Status", getter: (r) => r.status || "Active" },
          ];
        case "Attendance Report":
          return [
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || r.id || "-" },
            { key: "studentName", label: "Student Name", getter: (r) => r.studentName || r.name || "-" },
            { key: "block", label: "Block", getter: (r) => r.block || r.blockName || "-" },
            { key: "roomBed", label: "Room & Bed", getter: (r) => r.roomBed || (r.room && r.bed ? `${r.room} (${r.bed})` : "-") },
            { key: "morning", label: "Morning Shift", getter: (r) => attendanceMap?.morning?.[r.admissionNo || r.id] || "Present" },
            { key: "night", label: "Night Inspection", getter: (r) => attendanceMap?.night?.[r.admissionNo || r.id] || "Present" },
          ];
        case "Outpass & Leave Report":
          return [
            { key: "studentName", label: "Student Name", getter: (r) => r.studentName || "-" },
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || "-" },
            { key: "outpassType", label: "Outpass Type", getter: (r) => r.requestType || r.outpassType || "Outpass" },
            { key: "blockName", label: "Hostel & Room", getter: (r) => r.blockName ? `${r.blockName} (#${r.roomNo || r.roomNumber || "-"})` : (r.roomNo || "-") },
            { key: "departureDate", label: "Departure", getter: (r) => r.departureDate || r.outDate || "-" },
            { key: "returnDate", label: "Expected Return", getter: (r) => r.returnDate || "-" },
            { key: "status", label: "Status", getter: (r) => r.status || "Pending" },
          ];
        case "Transfer & Vacate Report":
          return [
            { key: "studentName", label: "Student Name", getter: (r) => r.studentName || "-" },
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || "-" },
            { key: "actionType", label: "Action Type", getter: (r) => r.actionType || r.requestType || "-" },
            { key: "currentRoomDisplay", label: "Current Room", getter: (r) => r.currentRoomDisplay || r.currentRoom || "-" },
            { key: "targetDisplayTitle", label: "Target Room / Fee Adjustment", getter: (r) => r.targetDisplayTitle || r.feeAdjustment || "-" },
            { key: "date", label: "Date", getter: (r) => r.date || r.requestDate || "-" },
            { key: "status", label: "Status", getter: (r) => r.status || "Pending" },
          ];
        case "Warden Report":
          return [
            { key: "empId", label: "Emp ID", getter: (r) => r.empId || "-" },
            { key: "name", label: "Warden Name", getter: (r) => r.name || "-" },
            { key: "designation", label: "Designation", getter: (r) => r.designation || "Resident Warden" },
            { key: "assignedHostels", label: "Supervised Facilities", getter: (r) => r.assignedHostels || "-" },
            { key: "phone", label: "Primary Mobile", getter: (r) => r.phone || "-" },
            { key: "email", label: "Email", getter: (r) => r.email || "-" },
            { key: "status", label: "Status", getter: (r) => r.status || "Active" },
          ];
        default:
          return [
            { key: "code", label: "Code", getter: (r) => r.code || r.id || "-" },
            { key: "name", label: "Name", getter: (r) => r.name || "-" },
            { key: "status", label: "Status", getter: (r) => r.status || "Active" },
          ];
      }
    };

    // Print Handler (Isolated window prevents CSS conflicts)
    const handlePrintReport = () => {
      const cols = getReportColumns(reportCategory);
      const rows = filtered;
      const popup = window.open("", "_blank", "width=1100,height=760");
      if (!popup) {
        showToast("Pop-up blocked. Please allow pop-ups to print reports.", "warning");
        return;
      }
      const title = `${reportCategory} - Pirnav College`;
      const dateStr = new Date().toLocaleString();
      const filterSummary = [
        reportBlockFilter && reportBlockFilter !== "all" ? `Block: ${reportBlockFilter}` : null,
        reportCategoryFilter && reportCategoryFilter !== "all" ? `Filter: ${reportCategoryFilter}` : null,
        reportSearch.trim() ? `Search: "${reportSearch.trim()}"` : null,
      ].filter(Boolean).join(" | ") || "All Records";

      popup.document.open();
      popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111827; }
    .print-container { padding: 16px; }
    .header { border-bottom: 2px solid #2d6a4f; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-left h1 { font-size: 20px; margin: 0 0 4px; color: #1b4332; }
    .header-left h2 { font-size: 14px; margin: 0; color: #40916c; font-weight: 600; }
    .header-right { text-align: right; font-size: 11px; color: #6b7280; }
    .meta-bar { background: #f3f4f6; padding: 6px 12px; border-radius: 6px; font-size: 11px; color: #374151; margin-bottom: 14px; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #e5e7eb; color: #1f2937; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #d1d5db; font-size: 10.5px; text-transform: uppercase; }
    td { padding: 7px 10px; border: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="header">
      <div class="header-left">
        <h1>Pirnav College</h1>
        <h2>Hostel Management — ${reportCategory}</h2>
      </div>
      <div class="header-right">
        <div>Generated: ${dateStr}</div>
        <div>Total Records: ${rows.length}</div>
      </div>
    </div>
    <div class="meta-bar">
      <span><strong>Scope:</strong> ${filterSummary}</span>
      <span><strong>Official Hostel Audit Report</strong></span>
    </div>
    <table>
      <thead>
        <tr>
          ${cols.map((c) => `<th>${c.label}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.length === 0 ? `<tr><td colspan="${cols.length}" style="text-align:center;padding:24px;color:#9ca3af;">No records found matching filter criteria.</td></tr>` : rows.map((row) => `<tr>${cols.map((c) => `<td>${c.getter ? c.getter(row) : (row[c.key] ?? "-")}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </div>
  <script>
    window.addEventListener('load', () => {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`);
      popup.document.close();
    };

    // Export PDF Handler using jsPDF + autotable
    const handleExportPdf = async () => {
      try {
        const cols = getReportColumns(reportCategory);
        const rows = filtered;
        if (rows.length === 0) {
          showToast("No records to export.", "warning");
          return;
        }

        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ]);

        const doc = new jsPDF({
          orientation: cols.length > 5 ? "landscape" : "portrait",
          unit: "pt",
          format: "a4",
        });

        const dateStr = new Date().toLocaleString();
        const filterSummary = [
          reportBlockFilter && reportBlockFilter !== "all" ? `Block: ${reportBlockFilter}` : null,
          reportCategoryFilter && reportCategoryFilter !== "all" ? `Filter: ${reportCategoryFilter}` : null,
          reportSearch.trim() ? `Search: "${reportSearch.trim()}"` : null,
        ].filter(Boolean).join(" | ") || "All Records";

        doc.setFontSize(16);
        doc.setTextColor(27, 67, 50);
        doc.text("Pirnav College — Hostel Management", 36, 36);

        doc.setFontSize(12);
        doc.setTextColor(64, 145, 108);
        doc.text(reportCategory, 36, 52);

        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`Exported: ${dateStr} | Records: ${rows.length} | Filters: ${filterSummary}`, 36, 68);

        autoTable(doc, {
          startY: 80,
          head: [cols.map((c) => c.label)],
          body: rows.map((row) =>
            cols.map((c) => String(c.getter ? c.getter(row) : (row[c.key] ?? "-")))
          ),
          styles: { fontSize: 8, cellPadding: 4, textColor: [17, 24, 39] },
          headStyles: { fillColor: [45, 106, 79], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: 36, right: 36 },
        });

        const safeName = reportCategory.toLowerCase().replace(/[^a-z0-9]/g, "_");
        doc.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
        showToast(`${reportCategory} exported as PDF successfully!`);
      } catch (err) {
        console.error("Export PDF error:", err);
        showToast("Failed to generate PDF export.", "danger");
      }
    };

    // Download Handler (.xlsx Excel or .csv)
    const handleDownloadReport = async () => {
      try {
        const cols = getReportColumns(reportCategory);
        const rows = filtered;
        if (rows.length === 0) {
          showToast("No records to download.", "warning");
          return;
        }

        const exportData = rows.map((row) => {
          const obj = {};
          cols.forEach((c) => {
            obj[c.label] = c.getter ? c.getter(row) : (row[c.key] ?? "-");
          });
          return obj;
        });

        const safeName = reportCategory.toLowerCase().replace(/[^a-z0-9]/g, "_");

        try {
          const XLSX = await import("xlsx");
          const worksheet = XLSX.utils.json_to_sheet(exportData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, reportCategory.slice(0, 31));
          XLSX.writeFile(workbook, `${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
          showToast(`${reportCategory} downloaded as Excel spreadsheet!`);
        } catch {
          exportCsv(`${safeName}.csv`, rows, cols.map((c) => ({
            label: c.label,
            value: (r) => (c.getter ? c.getter(r) : r[c.key]),
          })));
          showToast(`${reportCategory} downloaded as CSV!`);
        }
      } catch (err) {
        console.error("Download report error:", err);
        showToast("Failed to download report.", "danger");
      }
    };

    return (
      <div className="cms-hostel-stack">
        {/* Top Header Row Matching User Screenshot */}
        <div className="cms-report-header-row">
          <div className="cms-report-title-group">
            <FileSpreadsheet size={24} style={{ color: "var(--cms-primary)" }} />
            <h2>Hostel Reports</h2>
          </div>
          <div className="cms-report-actions">
            <button
              type="button"
              className="cms-report-btn-print"
              onClick={handlePrintReport}
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              className="cms-report-btn-pdf"
              onClick={handleExportPdf}
            >
              <FileSpreadsheet size={15} /> Export PDF
            </button>
            <button
              type="button"
              className="cms-report-btn-download"
              onClick={handleDownloadReport}
            >
              <Download size={15} /> Download
            </button>
          </div>
        </div>

        {/* Filter Card Matching User Screenshot */}
        <div className="cms-report-filter-card">
          <div className="cms-report-filter-grid">
            {/* 1. Hostel Block Filter */}
            <div className="cms-report-field">
              <label className="cms-report-label">Hostel Block Filter</label>
              <select
                className="cms-report-select app-select"
                value={reportBlockFilter}
                onChange={(e) => setReportBlockFilter(e.target.value)}
              >
                <option value="">-- Select Hostel Block --</option>
                <option value="all">All Hostel Blocks</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="cms-report-chevron">
                <ChevronDown size={18} />
              </div>
            </div>

            {/* 2. Hostel Report Category * */}
            <div className="cms-report-field">
              <label className="cms-report-label">
                Hostel Report Category <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <select
                className="cms-report-select app-select"
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
              >
                {hostelReportCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="cms-report-chevron">
                <ChevronDown size={18} />
              </div>
            </div>

            {/* 3. Category / Status Filter */}
            <div className="cms-report-field">
              <label className="cms-report-label">Category / Status Filter</label>
              <select
                className="cms-report-select app-select"
                value={reportCategoryFilter}
                onChange={(e) => setReportCategoryFilter(e.target.value)}
              >
                <option value="">-- Filter by Category / Status --</option>
                <option value="all">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                {reportCategory === "Block Report" && (
                  <>
                    <option value="Boys Hostel">Boys Hostel</option>
                    <option value="Girls Hostel">Girls Hostel</option>
                    <option value="Co-ed">Co-ed</option>
                  </>
                )}
                {reportCategory === "Room Report" && (
                  <>
                    <option value="AC">AC</option>
                    <option value="Non-AC">Non-AC</option>
                  </>
                )}
                {(reportCategory === "Outpass & Leave Report" || reportCategory === "Transfer & Vacate Report") && (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
              </select>
              <div className="cms-report-chevron">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          {/* Full-width Search Input */}
          <div className="cms-report-search-wrap app-search-field">
            <div className="cms-report-search-icon app-search-field__icon">
              <Search size={15} />
            </div>
            <input
              type="text"
              className="cms-report-search-input"
              placeholder="Search hostel report records..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Report Content Card & Table */}
        <div className="cms-report-table-card cms-hostel-table-scroll">
          <div className="cms-report-table-header">
            <h3 className="cms-report-table-title">{reportCategory}</h3>
            <span className="cms-report-badge-total">
              Total Records: {filtered.length}
            </span>
          </div>

          <table className="cms-report-table">
            <thead>
              {reportCategory === "Block Report" && (
                <tr>
                  <th className="cms-report-th">BLOCK CODE</th>
                  <th className="cms-report-th">BLOCK NAME</th>
                  <th className="cms-report-th">CATEGORY</th>
                  <th className="cms-report-th">TOTAL FLOORS</th>
                  <th className="cms-report-th">WARDEN NAME</th>
                  <th className="cms-report-th">PRIMARY MOBILE</th>
                  <th className="cms-report-th">LOCATION</th>
                  <th className="cms-report-th">STATUS</th>
                </tr>
              )}
              {reportCategory === "Room Report" && (
                <tr>
                  <th className="cms-report-th">ROOM NO</th>
                  <th className="cms-report-th">BLOCK NAME</th>
                  <th className="cms-report-th">FLOOR</th>
                  <th className="cms-report-th">CATEGORY</th>
                  <th className="cms-report-th">TOTAL BEDS</th>
                  <th className="cms-report-th">OCCUPIED BEDS</th>
                  <th className="cms-report-th">VACANT BEDS</th>
                  <th className="cms-report-th">STATUS</th>
                </tr>
              )}
              {(reportCategory === "Bed Allocation Report" || reportCategory === "Student Allocation Report") && (
                <tr>
                  <th className="cms-report-th">ADM NO</th>
                  <th className="cms-report-th">STUDENT NAME</th>
                  <th className="cms-report-th">GENDER</th>
                  <th className="cms-report-th">HOSTEL BLOCK</th>
                  <th className="cms-report-th">ROOM &amp; BED</th>
                  <th className="cms-report-th">JOIN DATE</th>
                  <th className="cms-report-th">MONTHLY FEE</th>
                  <th className="cms-report-th">STATUS</th>
                </tr>
              )}
              {reportCategory === "Attendance Report" && (
                <tr>
                  <th className="cms-report-th">ADM NO</th>
                  <th className="cms-report-th">STUDENT NAME</th>
                  <th className="cms-report-th">BLOCK</th>
                  <th className="cms-report-th">ROOM &amp; BED</th>
                  <th className="cms-report-th">MORNING SHIFT</th>
                  <th className="cms-report-th">NIGHT INSPECTION</th>
                </tr>
              )}
              {reportCategory === "Outpass & Leave Report" && (
                <tr>
                  <th className="cms-report-th">STUDENT NAME</th>
                  <th className="cms-report-th">ADM NO</th>
                  <th className="cms-report-th">OUTPASS TYPE</th>
                  <th className="cms-report-th">HOSTEL &amp; ROOM</th>
                  <th className="cms-report-th">DEPARTURE</th>
                  <th className="cms-report-th">EXPECTED RETURN</th>
                  <th className="cms-report-th">STATUS</th>
                </tr>
              )}
              {reportCategory === "Transfer & Vacate Report" && (
                <tr>
                  <th className="cms-report-th">STUDENT NAME</th>
                  <th className="cms-report-th">ADM NO</th>
                  <th className="cms-report-th">ACTION TYPE</th>
                  <th className="cms-report-th">CURRENT ROOM</th>
                  <th className="cms-report-th">TARGET ROOM / FEE ADJUSTMENT</th>
                  <th className="cms-report-th">DATE</th>
                  <th className="cms-report-th">STATUS</th>
                </tr>
              )}
              {reportCategory === "Warden Report" && (
                <tr>
                  <th className="cms-report-th">EMP ID</th>
                  <th className="cms-report-th">WARDEN NAME</th>
                  <th className="cms-report-th">DESIGNATION</th>
                  <th className="cms-report-th">SUPERVISED FACILITIES</th>
                  <th className="cms-report-th">PRIMARY MOBILE</th>
                  <th className="cms-report-th">EMAIL</th>
                  <th className="cms-report-th">STATUS</th>
                </tr>
              )}
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "var(--cms-muted)", fontStyle: "italic", fontWeight: 600 }}>
                    No report records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((item, idx) => {
                  if (reportCategory === "Block Report") {
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{item.code}</td>
                        <td className="cms-report-td" style={{ fontWeight: 600, color: "var(--cms-text)" }}>{item.name}</td>
                        <td className="cms-report-td">{item.category || item.type}</td>
                        <td className="cms-report-td">{item.totalFloors || item.floors || 1}</td>
                        <td className="cms-report-td">{item.wardenName || item.warden}</td>
                        <td className="cms-report-td">{item.primaryMobile || item.wardenPhone}</td>
                        <td className="cms-report-td">{item.location || "Main Campus"}</td>
                        <td className="cms-report-td">
                          <span className={item.status === "Active" ? "cms-report-status-active" : "cms-report-status-inactive"}>
                            {item.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Room Report") {
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.roomNumber || item.room}</td>
                        <td className="cms-report-td">{item.blockName}</td>
                        <td className="cms-report-td">{item.floor}</td>
                        <td className="cms-report-td">{item.category}</td>
                        <td className="cms-report-td">{item.totalBeds}</td>
                        <td className="cms-report-td" style={{ color: "var(--cms-amber)", fontWeight: 700 }}>{item.occupiedBeds}</td>
                        <td className="cms-report-td" style={{ color: "var(--cms-green)", fontWeight: 700 }}>{item.vacantBeds}</td>
                        <td className="cms-report-td">
                          <span className="cms-report-status-active">{item.status || "Available"}</span>
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Bed Allocation Report" || reportCategory === "Student Allocation Report") {
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{item.admissionNo}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.studentName}</td>
                        <td className="cms-report-td">{item.gender}</td>
                        <td className="cms-report-td">{item.blockName}</td>
                        <td className="cms-report-td">{item.roomBadge || item.room}</td>
                        <td className="cms-report-td">{item.joinDate}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.monthlyFee || item.fee}</td>
                        <td className="cms-report-td">
                          <StatusBadge value={item.status || "Active"} />
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Attendance Report") {
                    const morn = attendanceMap.morning?.[item.id]?.status || "Present";
                    const night = attendanceMap.night?.[item.id]?.status || "Present";
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{item.id || item.admissionNo}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.name || item.studentName}</td>
                        <td className="cms-report-td">{item.block || item.blockName}</td>
                        <td className="cms-report-td">{item.roomBed || item.room}</td>
                        <td className="cms-report-td">
                          <StatusBadge value={morn} />
                        </td>
                        <td className="cms-report-td">
                          <StatusBadge value={night} />
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Outpass & Leave Report") {
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.studentName}</td>
                        <td className="cms-report-td">{item.admissionNo}</td>
                        <td className="cms-report-td">{item.outpassType || item.requestType}</td>
                        <td className="cms-report-td">{item.blockName} • {item.roomNo || item.roomNumber}</td>
                        <td className="cms-report-td">{item.departureDate || item.outDate}</td>
                        <td className="cms-report-td">{item.returnDate}</td>
                        <td className="cms-report-td">
                          <StatusBadge value={item.status} />
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Transfer & Vacate Report") {
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.studentName}</td>
                        <td className="cms-report-td">{item.admissionNo}</td>
                        <td className="cms-report-td">{item.actionType || item.requestType}</td>
                        <td className="cms-report-td">{item.currentRoomDisplay || `${item.currentBlock} (#${item.currentRoom || "101"})`}</td>
                        <td className="cms-report-td">
                          {item.targetDisplayTitle || `${item.targetBlock} (${item.targetRoom})`}
                        </td>
                        <td className="cms-report-td">{item.date || item.requestDate}</td>
                        <td className="cms-report-td">
                          <span className="cms-transfer-status-completed">{item.status || "Completed"}</span>
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Warden Report") {
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{item.empId}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.name}</td>
                        <td className="cms-report-td">{item.designation}</td>
                        <td className="cms-report-td">{item.assignedHostels}</td>
                        <td className="cms-report-td">{item.phone}</td>
                        <td className="cms-report-td">{item.email}</td>
                        <td className="cms-report-td">
                          <StatusBadge value={item.status} />
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })
              )}
            </tbody>
          </table>

          {/* Report Pagination Controls matching Screenshot 4 & SectionManagement reference */}
          <div className="cms-report-pagination">
            <span className="cms-report-record-summary">
              Showing {filtered.length ? (safeReportPage - 1) * reportPageSize + 1 : 0}–{Math.min(safeReportPage * reportPageSize, filtered.length)} of {filtered.length} records
            </span>

            <div className="cms-report-page-size-wrap">
              <span className="cms-report-page-size-label">Per page:</span>
              <select
                className="cms-report-page-size-select app-select"
                aria-label="Records per page"
                value={isCustomReportPage ? "custom" : reportPageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "custom") {
                    setIsCustomReportPage(true);
                    setCustomReportPageInput(String(reportPageSize));
                  } else {
                    setIsCustomReportPage(false);
                    setReportPageSize(Number(val));
                    setReportPage(1);
                  }
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value="custom">Custom</option>
              </select>
              {isCustomReportPage && (
                <input
                  type="number"
                  min="1"
                  max="200"
                  className="cms-report-page-size-custom-input"
                  value={customReportPageInput}
                  placeholder="Qty"
                  aria-label="Custom records per page"
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomReportPageInput(val);
                    const num = parseInt(val, 10);
                    if (Number.isInteger(num) && num > 0) {
                      setReportPageSize(num);
                      setReportPage(1);
                    }
                  }}
                />
              )}
            </div>

            <button
              type="button"
              className="cms-btn cms-btn-ghost cms-report-page-btn"
              disabled={safeReportPage <= 1}
              onClick={() => setReportPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="cms-report-page-indicator">
              {safeReportPage} / {totalReportPages}
            </span>
            <button
              type="button"
              className="cms-btn cms-btn-ghost cms-report-page-btn"
              disabled={safeReportPage >= totalReportPages}
              onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render Major Tab Section Dispatchers with Transport-Style Subtabs ──
  const renderSetupMasters = () => (
    <div className="cms-hostel-stack">
      <div className="cms-hostel-tabs is-compact">
        {setupSubtabs.map((tab) => {
          const isActive = activeSetupSubtab === tab.id;
          const SubIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`cms-hostel-tab ${isActive ? "is-active" : ""}`}
              onClick={() => {
                setActiveSetupSubtab(tab.id);
                setSearchQuery("");
              }}
            >
              {SubIcon && <SubIcon size={14} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {activeSetupSubtab === "blocks" && renderHostelBlocks()}
      {activeSetupSubtab === "categories" && renderRoomCategories()}
      {activeSetupSubtab === "rooms" && renderRooms()}
      {activeSetupSubtab === "wardens" && renderWardens()}
    </div>
  );

  const renderStudentManagement = () => (
    <div className="cms-hostel-stack">
      <div className="cms-hostel-tabs is-compact">
        {studentSubtabs.map((tab) => {
          const isActive = activeStudentSubtab === tab.id;
          const SubIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`cms-hostel-tab ${isActive ? "is-active" : ""}`}
              onClick={() => {
                setActiveStudentSubtab(tab.id);
                setSearchQuery("");
              }}
            >
              {SubIcon && <SubIcon size={15} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {activeStudentSubtab === "allocations" && renderAllocations()}
      {activeStudentSubtab === "attendance" && renderAttendance()}
      {activeStudentSubtab === "outpasses" && renderOutpasses()}
      {activeStudentSubtab === "transfers" && renderTransfers()}
    </div>
  );

  const renderReportsSection = () => renderReports();

  // ═════════════════════════════════════════════════════════════════════
  // MODAL FORMS
  // ═════════════════════════════════════════════════════════════════════

  // Block Modal
  const BlockModal = () => {
    const isView = modal.mode === "view";
    const [form, setForm] = useState(
      modal.data || {
        name: "",
        code: "",
        type: "",
        floors: "",
        address: "",
        status: "Active",
      }
    );

    const floorOptions = useMemo(() => {
      const maxFloors = Math.max(15, form.floors ? Number(form.floors) : 15);
      return Array.from({ length: maxFloors }, (_, i) => ({
        value: i + 1,
        label: i === 0 ? "1 Floor" : `${i + 1} Floors`,
      }));
    }, [form.floors]);

    return (
      <Modal
        className="cms-hostel-modal-lg"
        title={
          isView
            ? `Hostel Block Details: ${form.name}`
            : modal.mode === "edit"
            ? `Edit Hostel Block: ${form.name}`
            : "Add New Hostel Block"
        }
        onClose={closeModal}
      >
        <form
          className="cms-block-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveBlock(form);
          }}
        >
          <div className="cms-block-modal-field full">
            <label>
              Block Name <span className="required-star">*</span>
            </label>
            <input
              required
              disabled={isView}
              placeholder="e.g. Boys Residence - Block A"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="cms-block-modal-row-3">
            <div className="cms-block-modal-field">
              <label>
                Block Code <span className="required-star">*</span>
              </label>
              <input
                required
                disabled={isView}
                placeholder="e.g. BLK-A"
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="cms-block-modal-field">
              <label>
                Category <span className="required-star">*</span>
              </label>
              <select className="app-select"
                required
                disabled={isView}
                value={form.type || ""}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="" disabled>Select Category...</option>
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Co-ed">Co-ed</option>
                <option value="Staff/Guest">Staff/Guest</option>
              </select>
            </div>

            <div className="cms-block-modal-field">
              <label>
                Total Floors <span className="required-star">*</span>
              </label>
              <select className="app-select"
                required
                disabled={isView}
                value={form.floors || ""}
                onChange={(e) => setForm({ ...form, floors: e.target.value ? Number(e.target.value) : "" })}
              >
                <option value="" disabled>Select Floors...</option>
                {floorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="cms-block-modal-field full">
            <label>Location</label>
            <input
              disabled={isView}
              placeholder="e.g. North Campus, Block A"
              value={form.address || form.location || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value, location: e.target.value })}
            />
          </div>

          <div className="cms-block-modal-footer">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal}>
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button type="submit" className="cms-btn cms-btn-primary">
                {modal.mode === "edit" ? "Save Changes" : "Save"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

  // ── Room Sharing Config Modal (3-Step Wizard matching Images 3, 4, 5) ──
  const RoomSharingConfigModal = () => {
    const [activeStep, setActiveStep] = useState("sharing"); // default to step 2 if opened from Add Room Type, or 'block'
    const [selectedBlockCode, setSelectedBlockCode] = useState(() => blocks[0]?.code || "");
    const [selectedFloorLevel, setSelectedFloorLevel] = useState("");

    const selectedBlock = useMemo(
      () => blocks.find((b) => b.code === selectedBlockCode) || blocks[0],
      [selectedBlockCode, blocks]
    );

    const initFloorConfigs = (block) => {
      const numFloors = Math.max(1, block?.floors || 3);
      return Array.from({ length: numFloors }, (_, i) => {
        const floorIndex = i;
        const floorLabel =
          i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`;
        return {
          floorIndex,
          floorLabel,
          singleSharing: 0,
          singleAc: "AC",
          doubleSharing: 0,
          doubleAc: "Non-AC",
          tripleSharing: 0,
          tripleAc: "Non-AC",
          fourSharing: 0,
          fourAc: "Non-AC",
          customAllocations: i === 0 ? [
            {
              id: "cust-init-1",
              name: "Deluxe Executive Suite",
              beds: 2,
              rooms: 1,
              ac: "AC",
            },
          ] : [],
        };
      });
    };

    const [floorConfigs, setFloorConfigs] = useState(() => initFloorConfigs(blocks[0] || null));

    // When user selects a different block
    const handleBlockChange = (code) => {
      setSelectedBlockCode(code);
      setSelectedFloorLevel("");
      const b = blocks.find((blk) => blk.code === code);
      if (b) {
        setFloorConfigs(initFloorConfigs(b));
      } else {
        setFloorConfigs([]);
      }
    };

    // When user changes total floors in block
    const handleFloorCountChange = (count) => {
      setFloorConfigs(
        Array.from({ length: count }, (_, i) => {
          const existing = floorConfigs.find((f) => f.floorIndex === i);
          if (existing) return existing;
          const floorLabel =
            i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`;
          return {
            floorIndex: i,
            floorLabel,
            singleSharing: 0,
            singleAc: "AC",
            doubleSharing: 0,
            doubleAc: "Non-AC",
            tripleSharing: 0,
            tripleAc: "Non-AC",
            fourSharing: 0,
            fourAc: "Non-AC",
            customAllocations: [],
          };
        })
      );
    };

    const handleFloorSharingChange = (floorIndex, field, value) => {
      setFloorConfigs((prev) =>
        prev.map((fc) => (fc.floorIndex === floorIndex ? { ...fc, [field]: value } : fc))
      );
    };

    const handleToggleAc = (floorIndex, field) => {
      setFloorConfigs((prev) =>
        prev.map((fc) =>
          fc.floorIndex === floorIndex
            ? { ...fc, [field]: fc[field] === "AC" ? "Non-AC" : "AC" }
            : fc
        )
      );
    };

    // Handlers for Custom Categories
    const handleAddCustomCategory = (floorIndex) => {
      const defaultName = floorIndex === 0 ? "Deluxe Executive Suite" : "Premium Suite";
      setFloorConfigs((prev) =>
        prev.map((fc) =>
          fc.floorIndex === floorIndex
            ? {
                ...fc,
                customAllocations: [
                  ...(fc.customAllocations || []),
                  {
                    id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    name: defaultName,
                    beds: 2,
                    rooms: 1,
                    ac: "AC",
                  },
                ],
              }
            : fc
        )
      );
    };

    const handleUpdateCustomCategory = (floorIndex, custId, field, value) => {
      setFloorConfigs((prev) =>
        prev.map((fc) =>
          fc.floorIndex === floorIndex
            ? {
                ...fc,
                customAllocations: (fc.customAllocations || []).map((ca) =>
                  ca.id === custId ? { ...ca, [field]: value } : ca
                ),
              }
            : fc
        )
      );
    };

    const handleRemoveCustomCategory = (floorIndex, custId) => {
      setFloorConfigs((prev) =>
        prev.map((fc) =>
          fc.floorIndex === floorIndex
            ? {
                ...fc,
                customAllocations: (fc.customAllocations || []).filter((ca) => ca.id !== custId),
              }
            : fc
        )
      );
    };

    // Calculations for overview
    const totalRoomsAllFloors = useMemo(() => {
      return floorConfigs.reduce((sum, fc) => {
        const customRooms = (fc.customAllocations || []).reduce(
          (cSum, ca) => cSum + (Number(ca.rooms) || 0),
          0
        );
        return (
          sum +
          (fc.singleSharing || 0) +
          (fc.doubleSharing || 0) +
          (fc.tripleSharing || 0) +
          (fc.fourSharing || 0) +
          customRooms
        );
      }, 0);
    }, [floorConfigs]);

    const totalBedsAllFloors = useMemo(() => {
      return floorConfigs.reduce((sum, fc) => {
        const customBeds = (fc.customAllocations || []).reduce(
          (cSum, ca) => cSum + (Number(ca.rooms) || 0) * (Number(ca.beds) || 1),
          0
        );
        return (
          sum +
          (fc.singleSharing || 0) * 1 +
          (fc.doubleSharing || 0) * 2 +
          (fc.tripleSharing || 0) * 3 +
          (fc.fourSharing || 0) * 4 +
          customBeds
        );
      }, 0);
    }, [floorConfigs]);

    const totalAcRooms = useMemo(() => {
      return floorConfigs.reduce((sum, fc) => {
        let count = 0;
        if (fc.singleAc === "AC") count += fc.singleSharing || 0;
        if (fc.doubleAc === "AC") count += fc.doubleSharing || 0;
        if (fc.tripleAc === "AC") count += fc.tripleSharing || 0;
        if (fc.fourAc === "AC") count += fc.fourSharing || 0;
        (fc.customAllocations || []).forEach((ca) => {
          if (ca.ac === "AC") count += Number(ca.rooms) || 0;
        });
        return sum + count;
      }, 0);
    }, [floorConfigs]);

    const totalNonAcRooms = Math.max(0, totalRoomsAllFloors - totalAcRooms);
    const [configStatus, setConfigStatus] = useState("Active");
    const [configNote, setConfigNote] = useState("");

    return (
      <Modal
        className="cms-sharing-config-modal"
        title={modal.mode === "edit" ? "Edit Room Sharing Config" : "Create Room Sharing Config"}
        onClose={closeModal}
      >
        <div className="cms-sharing-modal-wrap">
          {/* Stepper Tabs matching Images 3, 4, 5 */}
          <div className="cms-stepper-tabs">
            <button
              type="button"
              className={`cms-stepper-tab ${activeStep === "block" ? "is-active" : ""}`}
              onClick={() => setActiveStep("block")}
            >
              1. Block &amp; Floor Setup
            </button>
            <button
              type="button"
              className={`cms-stepper-tab ${activeStep === "sharing" ? "is-active" : ""}`}
              onClick={() => setActiveStep("sharing")}
            >
              2. Room Sharing &amp; AC
            </button>
            <button
              type="button"
              className={`cms-stepper-tab ${activeStep === "overview" ? "is-active" : ""}`}
              onClick={() => setActiveStep("overview")}
            >
              3. Summary &amp; Overview
            </button>
          </div>

          {/* STEP 1: BLOCK & FLOOR SETUP (IMAGE 3) */}
          {activeStep === "block" && (
            <div className="cms-sharing-step-pane">
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: "var(--cms-subtle)",
                  border: "1px solid var(--cms-border)",
                  marginBottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Select Hostel Block <span style={{ color: "var(--cms-red)" }}>*</span>
                  </label>
                  <select className="app-select"
                    required
                    value={selectedBlockCode}
                    onChange={(e) => handleBlockChange(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="" disabled>Select Hostel Block...</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBlock && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "var(--cms-surface)",
                      border: "1px solid var(--cms-border)",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: "var(--cms-muted)", textTransform: "uppercase" }}>
                        Category
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--cms-text)" }}>
                        {selectedBlock.type || "Boys Hostel"}
                      </span>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "var(--cms-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                        Total Floors in Block <span style={{ color: "var(--cms-red)" }}>*</span>
                      </label>
                      <select className="app-select"
                        value={floorConfigs.length || selectedBlock.floors || 3}
                        onChange={(e) => handleFloorCountChange(Number(e.target.value))}
                        style={{ width: "100%" }}
                      >
                        {Array.from({ length: 30 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} Floor{i > 0 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Select Floor Level
                </label>
                <select className="app-select"
                  disabled={!selectedBlock}
                  value={selectedFloorLevel}
                  onChange={(e) => setSelectedFloorLevel(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">
                    All Floors ({floorConfigs.length || (selectedBlock?.floors || 3)} Floors Configured)
                  </option>
                  {floorConfigs.map((fc) => (
                    <option key={fc.floorIndex} value={fc.floorLabel}>
                      {fc.floorLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cms-sharing-modal-footer">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => {
                    if (!selectedBlock) {
                      showToast("Please select a Hostel Block in Step 1.", "warning");
                      return;
                    }
                    setActiveStep("sharing");
                  }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ROOM SHARING & AC (IMAGE 2 REFERENCE) */}
          {activeStep === "sharing" && (
            <div className="cms-sharing-step-pane">
              {!selectedBlock ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "var(--cms-subtle)",
                    borderRadius: 16,
                    border: "1.5px dashed var(--cms-border)",
                    color: "var(--cms-muted)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Please select a Hostel Block in Step 1 first to configure floor sharing and AC options.
                </div>
              ) : (
                <div className="cms-sharing-floor-scroll">
                  {floorConfigs
                    .filter((fc) => !selectedFloorLevel || fc.floorLabel === selectedFloorLevel)
                    .map((fc) => {
                      const standardRooms =
                        (fc.singleSharing || 0) +
                        (fc.doubleSharing || 0) +
                        (fc.tripleSharing || 0) +
                        (fc.fourSharing || 0);

                      const customRooms = (fc.customAllocations || []).reduce(
                        (sum, ca) => sum + (Number(ca.rooms) || 0),
                        0
                      );

                      const floorRooms = standardRooms + customRooms;

                      const standardBeds =
                        (fc.singleSharing || 0) * 1 +
                        (fc.doubleSharing || 0) * 2 +
                        (fc.tripleSharing || 0) * 3 +
                        (fc.fourSharing || 0) * 4;

                      const customBeds = (fc.customAllocations || []).reduce(
                        (sum, ca) => sum + (Number(ca.rooms) || 0) * (Number(ca.beds) || 1),
                        0
                      );

                      const floorBeds = standardBeds + customBeds;

                      const startNum = fc.floorIndex === 0 ? "001" : `${fc.floorIndex}01`;
                      const endNumStr = floorRooms < 10 ? `0${floorRooms}` : `${floorRooms}`;
                      const endNum = fc.floorIndex === 0 ? `0${endNumStr}` : `${fc.floorIndex}${endNumStr}`;
                      const rangeText =
                        floorRooms === 0
                          ? "No rooms allocated"
                          : floorRooms === 1
                          ? `Room #${startNum}`
                          : `Room #${startNum} to #${endNum}`;

                      return (
                        <div key={fc.floorIndex} className="cms-floor-config-card">
                          <div className="cms-floor-config-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <strong style={{ color: "var(--cms-primary)", fontSize: 13 }}>{fc.floorLabel}</strong>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  background: "var(--cms-primary-soft)",
                                  color: "var(--cms-primary)",
                                }}
                              >
                                {rangeText}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-text)" }}>
                              {floorRooms} Rooms ({floorBeds} Beds Capacity)
                            </span>
                          </div>

                          <div className="cms-sharing-grid">
                            {/* 1-Share */}
                            <div className="cms-sharing-cell">
                              <label>1-Share (1 Bed)</label>
                              <input
                                type="number"
                                min={0}
                                max={50}
                                placeholder="0"
                                value={fc.singleSharing || ""}
                                onChange={(e) =>
                                  handleFloorSharingChange(fc.floorIndex, "singleSharing", Number(e.target.value) || 0)
                                }
                              />
                              <button
                                type="button"
                                className={`cms-ac-toggle-btn ${fc.singleAc === "AC" ? "is-ac" : "is-non-ac"}`}
                                onClick={() => handleToggleAc(fc.floorIndex, "singleAc")}
                              >
                                {fc.singleAc === "AC" ? "AC Room" : "Non-AC"}
                              </button>
                            </div>

                            {/* 2-Share */}
                            <div className="cms-sharing-cell">
                              <label>2-Share (2 Beds)</label>
                              <input
                                type="number"
                                min={0}
                                max={50}
                                placeholder="0"
                                value={fc.doubleSharing || ""}
                                onChange={(e) =>
                                  handleFloorSharingChange(fc.floorIndex, "doubleSharing", Number(e.target.value) || 0)
                                }
                              />
                              <button
                                type="button"
                                className={`cms-ac-toggle-btn ${fc.doubleAc === "AC" ? "is-ac" : "is-non-ac"}`}
                                onClick={() => handleToggleAc(fc.floorIndex, "doubleAc")}
                              >
                                {fc.doubleAc === "AC" ? "AC Room" : "Non-AC"}
                              </button>
                            </div>

                            {/* 3-Share */}
                            <div className="cms-sharing-cell">
                              <label>3-Share (3 Beds)</label>
                              <input
                                type="number"
                                min={0}
                                max={50}
                                placeholder="0"
                                value={fc.tripleSharing || ""}
                                onChange={(e) =>
                                  handleFloorSharingChange(fc.floorIndex, "tripleSharing", Number(e.target.value) || 0)
                                }
                              />
                              <button
                                type="button"
                                className={`cms-ac-toggle-btn ${fc.tripleAc === "AC" ? "is-ac" : "is-non-ac"}`}
                                onClick={() => handleToggleAc(fc.floorIndex, "tripleAc")}
                              >
                                {fc.tripleAc === "AC" ? "AC Room" : "Non-AC"}
                              </button>
                            </div>

                            {/* 4-Share */}
                            <div className="cms-sharing-cell">
                              <label>4-Share (4 Beds)</label>
                              <input
                                type="number"
                                min={0}
                                max={50}
                                placeholder="0"
                                value={fc.fourSharing || ""}
                                onChange={(e) =>
                                  handleFloorSharingChange(fc.floorIndex, "fourSharing", Number(e.target.value) || 0)
                                }
                              />
                              <button
                                type="button"
                                className={`cms-ac-toggle-btn ${fc.fourAc === "AC" ? "is-ac" : "is-non-ac"}`}
                                onClick={() => handleToggleAc(fc.floorIndex, "fourAc")}
                              >
                                {fc.fourAc === "AC" ? "AC Room" : "Non-AC"}
                              </button>
                            </div>
                          </div>

                          {/* Custom Categories Section matching Image 2 */}
                          <div className="cms-custom-cat-section">
                            <div className="cms-custom-cat-header">CUSTOM CATEGORIES:</div>
                            <div className="cms-custom-cat-list">
                              {(fc.customAllocations || []).map((ca) => (
                                <div key={ca.id} className="cms-custom-cat-row">
                                  <input
                                    type="text"
                                    className="cms-custom-cat-name-input"
                                    placeholder="e.g. Deluxe Executive Suite"
                                    value={ca.name || ""}
                                    onChange={(e) =>
                                      handleUpdateCustomCategory(fc.floorIndex, ca.id, "name", e.target.value)
                                    }
                                  />
                                  <div className="cms-custom-cat-num-field">
                                    <label>Beds:</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={20}
                                      value={ca.beds ?? 2}
                                      onChange={(e) =>
                                        handleUpdateCustomCategory(
                                          fc.floorIndex,
                                          ca.id,
                                          "beds",
                                          Math.max(1, Number(e.target.value) || 1)
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="cms-custom-cat-num-field">
                                    <label>Rooms:</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={50}
                                      value={ca.rooms ?? 1}
                                      onChange={(e) =>
                                        handleUpdateCustomCategory(
                                          fc.floorIndex,
                                          ca.id,
                                          "rooms",
                                          Math.max(1, Number(e.target.value) || 1)
                                        )
                                      }
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className={`cms-custom-cat-ac-btn ${ca.ac === "AC" ? "is-ac" : "is-non-ac"}`}
                                    onClick={() =>
                                      handleUpdateCustomCategory(
                                        fc.floorIndex,
                                        ca.id,
                                        "ac",
                                        ca.ac === "AC" ? "Non-AC" : "AC"
                                      )
                                    }
                                  >
                                    {ca.ac === "AC" ? "AC" : "Non-AC"}
                                  </button>
                                  <button
                                    type="button"
                                    className="cms-custom-cat-delete-btn"
                                    title="Delete category"
                                    onClick={() => handleRemoveCustomCategory(fc.floorIndex, ca.id)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              className="cms-add-custom-cat-btn"
                              onClick={() => handleAddCustomCategory(fc.floorIndex)}
                            >
                              + Add Custom Room Category for {fc.floorLabel}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="cms-sharing-modal-footer">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setActiveStep("block")}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => setActiveStep("overview")}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUMMARY & OVERVIEW (IMAGE 2 REFERENCE) */}
          {activeStep === "overview" && (
            <div className="cms-sharing-step-pane">
              {!selectedBlock ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "var(--cms-subtle)",
                    borderRadius: 16,
                    border: "1.5px dashed var(--cms-border)",
                    color: "var(--cms-muted)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Please select a Hostel Block in Step 1 first to view summary & overview.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {/* Compact Info Bar matching Image 2 */}
                  <div className="cms-overview-info-bar">
                    <span>{selectedBlock.type ? `${selectedBlock.type} Hostel` : "Boys Hostel"}</span>
                    <span>{floorConfigs.length} Floors</span>
                    <span>{selectedBlock.address || selectedBlock.location || "Main Campus"}</span>
                  </div>

                  {/* Floor-by-Floor Allocation Overview */}
                  <div className="cms-overview-floor-section">
                    <div className="cms-overview-floor-heading">Floor-by-Floor Allocation Overview</div>
                    <div className="cms-overview-floor-list">
                      {floorConfigs.map((fc) => {
                        const standardRooms =
                          (fc.singleSharing || 0) +
                          (fc.doubleSharing || 0) +
                          (fc.tripleSharing || 0) +
                          (fc.fourSharing || 0);
                        const customRooms = (fc.customAllocations || []).reduce(
                          (sum, ca) => sum + (Number(ca.rooms) || 0),
                          0
                        );
                        const floorRooms = standardRooms + customRooms;

                        const standardBeds =
                          (fc.singleSharing || 0) * 1 +
                          (fc.doubleSharing || 0) * 2 +
                          (fc.tripleSharing || 0) * 3 +
                          (fc.fourSharing || 0) * 4;
                        const customBeds = (fc.customAllocations || []).reduce(
                          (sum, ca) => sum + (Number(ca.rooms) || 0) * (Number(ca.beds) || 1),
                          0
                        );
                        const floorBeds = standardBeds + customBeds;

                        const startNum = fc.floorIndex === 0 ? "001" : `${fc.floorIndex}01`;
                        const endNumStr = floorRooms < 10 ? `0${floorRooms}` : `${floorRooms}`;
                        const endNum = fc.floorIndex === 0 ? `0${endNumStr}` : `${fc.floorIndex}${endNumStr}`;
                        const roomRange =
                          floorRooms === 0
                            ? "No rooms"
                            : floorRooms === 1
                            ? `Room #${startNum} to #${startNum}`
                            : `Room #${startNum} to #${endNum}`;

                        const allocBadges = [];
                        if (fc.singleSharing > 0) allocBadges.push(`1-Share: ${fc.singleSharing} Rms (${fc.singleAc})`);
                        if (fc.doubleSharing > 0) allocBadges.push(`2-Share: ${fc.doubleSharing} Rms (${fc.doubleAc})`);
                        if (fc.tripleSharing > 0) allocBadges.push(`3-Share: ${fc.tripleSharing} Rms (${fc.tripleAc})`);
                        if (fc.fourSharing > 0) allocBadges.push(`4-Share: ${fc.fourSharing} Rms (${fc.fourAc})`);
                        (fc.customAllocations || []).forEach((ca) => {
                          if (ca.rooms > 0) {
                            allocBadges.push(`${ca.name || "Custom"}: ${ca.rooms} Rms (${ca.ac || "AC"})`);
                          }
                        });

                        return (
                          <div key={fc.floorIndex} className="cms-overview-floor-card">
                            <div className="cms-overview-floor-header">
                              <div className="cms-overview-floor-title">
                                <strong>{fc.floorLabel}</strong> <span>({roomRange})</span>
                              </div>
                              <div className="cms-overview-floor-stat">
                                {floorRooms} Rooms • {floorBeds} Beds
                              </div>
                            </div>
                            <div className="cms-overview-badges-wrap">
                              {allocBadges.length > 0 ? (
                                allocBadges.map((bText, idx) => (
                                  <span key={idx} className="cms-overview-badge-pill">
                                    {bText}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: 11.5, color: "var(--cms-muted)", fontStyle: "italic" }}>
                                  No rooms allocated
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4-Column Dark KPI Card matching Image 2 */}
                  <div className="cms-overview-kpi-card">
                    <div className="cms-overview-kpi-col">
                      <span className="cms-overview-kpi-label">TOTAL ROOMS</span>
                      <strong className="cms-overview-kpi-val">{totalRoomsAllFloors}</strong>
                    </div>
                    <div className="cms-overview-kpi-col">
                      <span className="cms-overview-kpi-label">BED CAPACITY</span>
                      <strong className="cms-overview-kpi-val">{totalBedsAllFloors}</strong>
                    </div>
                    <div className="cms-overview-kpi-col">
                      <span className="cms-overview-kpi-label">AC ROOMS</span>
                      <strong className="cms-overview-kpi-val">{totalAcRooms}</strong>
                    </div>
                    <div className="cms-overview-kpi-col">
                      <span className="cms-overview-kpi-label">NON-AC ROOMS</span>
                      <strong className="cms-overview-kpi-val">{totalNonAcRooms}</strong>
                    </div>
                  </div>

                  {/* Bottom Form Fields matching Image 2 */}
                  <div className="cms-overview-form-grid">
                    <div className="cms-overview-field">
                      <label>
                        Status <span className="required-star">*</span>
                      </label>
                      <select className="app-select"
                        value={configStatus}
                        onChange={(e) => setConfigStatus(e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                      </select>
                    </div>
                    <div className="cms-overview-field">
                      <label>Description / Layout Note</label>
                      <input
                        type="text"
                        placeholder="Standard features, layout descriptions..."
                        value={configNote}
                        onChange={(e) => setConfigNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="cms-sharing-modal-footer">
                <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setActiveStep("sharing")}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() =>
                      handleSaveRoomSharingConfig({
                        block: selectedBlock,
                        floorConfigs,
                        status: configStatus,
                        note: configNote,
                      })
                    }
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  // Category Modal
  const CategoryModal = () => {
    const isView = modal.mode === "view";
    const [form, setForm] = useState(
      modal.data || {
        name: "",
        type: "AC Accommodation",
        capacity: 2,
        fee: "₹7,500/mo",
        specification: "",
        blocks: "All Blocks",
        status: "Active",
      }
    );

    return (
      <Modal
        title={
          isView
            ? `Category Details: ${form.name}`
            : modal.mode === "edit"
            ? `Edit Category: ${form.name}`
            : "Add Room Category"
        }
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveCategory(form);
          }}
        >
          <div className="cms-hostel-form-grid">
            <div>
              <label>Category Name *</label>
              <input
                required
                disabled={isView}
                placeholder="e.g. Double Sharing AC"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label>Accommodation Tier *</label>
              <select className="app-select"
                disabled={isView}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="AC Accommodation">AC Accommodation</option>
                <option value="Non-AC Standard">Non-AC Standard</option>
                <option value="Special / Deluxe AC">Special / Deluxe AC</option>
              </select>
            </div>
            <div>
              <label>Bed Capacity per Room</label>
              <input
                type="number"
                min={1}
                max={6}
                disabled={isView}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Standard Monthly Fee</label>
              <input
                disabled={isView}
                placeholder="e.g. ₹6,500/mo"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
              />
            </div>
            <div className="full">
              <label>Specification &amp; Amenities</label>
              <input
                disabled={isView}
                placeholder="e.g. Attached Bath, Wi-Fi, Study Desks"
                value={form.specification}
                onChange={(e) => setForm({ ...form, specification: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal}>
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button type="submit" className="cms-btn cms-btn-primary">
                Save Category
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

  // Room Modal (Matching Screenshot 2: exactly 5 fields)
  const RoomModal = () => {
    const isView = modal.mode === "view";
    const [form, setForm] = useState(
      modal.data || {
        roomNo: "",
        block: "",
        blockName: "",
        floor: "",
        type: "",
        capacity: 2,
        fee: "₹6,500/mo",
        status: "Active",
      }
    );

    // Selected block to compute floors
    const selectedBlock = blocks.find(
      (b) => b.code === form.block || b.name === form.block || String(b.id) === String(form.block)
    );

    // Compute dynamic floor list for selected block
    let floorList = [];
    if (selectedBlock) {
      const count = Math.max(1, Number(selectedBlock.floors || 2));
      floorList = Array.from({ length: count }, (_, i) =>
        i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`
      );
    }
    if (form.floor && !floorList.includes(form.floor)) {
      floorList.unshift(form.floor);
    }

    // Standard room sharing options
    const sharingOptions = [
      { label: "Single Sharing (1 Bed)", value: "Single Sharing", capacity: 1, fee: "₹10,000/mo" },
      { label: "Double Sharing (2 Beds)", value: "Double Sharing", capacity: 2, fee: "₹6,500/mo" },
      { label: "Triple Sharing (3 Beds)", value: "Triple Sharing", capacity: 3, fee: "₹5,000/mo" },
      { label: "Four Sharing (4 Beds)", value: "Four Sharing", capacity: 4, fee: "₹4,200/mo" },
    ];
    categories.forEach((cat) => {
      const optLabel = `${cat.name} (${cat.capacity || 2} ${cat.capacity === 1 ? "Bed" : "Beds"})`;
      if (!sharingOptions.some((opt) => opt.value === cat.name)) {
        sharingOptions.push({
          label: optLabel,
          value: cat.name,
          capacity: cat.capacity || 2,
          fee: cat.fee || "₹6,500/mo",
        });
      }
    });
    if (form.type && !sharingOptions.some((opt) => opt.value === form.type)) {
      sharingOptions.unshift({
        label: form.type,
        value: form.type,
        capacity: form.capacity || 2,
        fee: form.fee || "₹6,500/mo",
      });
    }

    return (
      <Modal
        className="cms-hostel-modal-lg"
        title={
          isView
            ? `Room Details: Room #${form.roomNo}`
            : modal.mode === "edit"
            ? "Edit Room"
            : "Add New Room"
        }
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveRoom(form);
          }}
        >
          <div className="cms-alloc-modal-form">
            {/* 1. Select Hostel Block * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Hostel Block <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={form.block}
                  onChange={(e) => {
                    const b = blocks.find((blk) => blk.code === e.target.value || blk.name === e.target.value || String(blk.id) === String(e.target.value));
                    setForm({
                      ...form,
                      block: e.target.value,
                      blockName: b ? b.name : e.target.value,
                      floor: "",
                    });
                  }}
                  className="cms-alloc-modal-select app-select"
                  
                >
                  <option value="" disabled>Select Hostel Block...</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 2. Floor Level * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Floor Level <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView || !form.block}
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  className="cms-alloc-modal-select app-select"
                  
                >
                  <option value="" disabled>
                    {!form.block ? "Select Hostel Block first..." : "Select Floor Level..."}
                  </option>
                  {floorList.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 3 & 4. Two columns: Room Number * and Assigned Room Sharing * */}
            <div className="cms-alloc-modal-grid">
              <div className="cms-alloc-modal-field">
                <label className="cms-alloc-modal-label">
                  Room Number <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <input
                  required
                  disabled={isView}
                  placeholder="e.g. 101"
                  value={form.roomNo}
                  onChange={(e) => setForm({ ...form, roomNo: e.target.value })}
                  className="cms-alloc-modal-input"
                />
              </div>
              <div className="cms-alloc-modal-field">
                <label className="cms-alloc-modal-label">
                  Assigned Room Sharing <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    required
                    disabled={isView}
                    value={form.type}
                    onChange={(e) => {
                      const chosen = sharingOptions.find((opt) => opt.value === e.target.value);
                      setForm({
                        ...form,
                        type: e.target.value,
                        capacity: chosen ? chosen.capacity : form.capacity,
                        fee: chosen ? chosen.fee : form.fee,
                      });
                    }}
                    className="cms-alloc-modal-select app-select"
                    
                  >
                    <option value="" disabled>Select room sharing...</option>
                    {sharingOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="cms-alloc-modal-chevron">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Status */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Status
              </label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={isView}
                  value={form.status || "Active"}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="cms-alloc-modal-select app-select"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer buttons matching Screenshot 3 */}
          <div className="cms-alloc-modal-footer">
            <button
              type="button"
              className="cms-alloc-modal-cancel-btn"
              onClick={closeModal}
            >
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button
                type="submit"
                className="cms-alloc-modal-submit-btn"
              >
                Save
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

  // Warden Modal (Matching Screenshot 2: exactly 3 fields)
  const WardenModal = () => {
    const isView = modal.mode === "view";

    // Filter out staff members who are already active wardens
    const activeWardenStaffIds = useMemo(() => {
      return new Set(
        wardens
          .filter((w) => w.status === "Active" && (modal.mode !== "edit" || w.id !== modal.data?.id))
          .map((w) => Number(w.staffId))
      );
    }, []);

    // Warden candidates list from live staff API (candidateStaff)
    const wardenCandidates = useMemo(() => {
      const list = [];
      const seen = new Set();

      if (Array.isArray(candidateStaff) && candidateStaff.length > 0) {
        candidateStaff.forEach((s) => {
          const sId = Number(s.staffId || s.id);
          const empId = s.employeeId || s.empId || s.code || `STF-${sId}`;
          const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ") || s.fullName || s.name || `Staff #${empId}`;
          if (!activeWardenStaffIds.has(sId) && !seen.has(sId)) {
            seen.add(sId);
            list.push({
              staffId: sId,
              empId,
              name: fullName,
              designation: s.designation || s.role || "Hostel Warden",
              phone: s.mobileNumber || s.phone || s.primaryMobileNumber || "",
              email: s.email || "",
            });
          }
        });
      }

      // If editing, make sure current warden is included
      if (modal.mode === "edit" && modal.data) {
        const currStaffId = Number(modal.data.staffId);
        if (currStaffId && !list.some((c) => c.staffId === currStaffId)) {
          list.unshift({
            staffId: currStaffId,
            empId: modal.data.empId || `STF-${currStaffId}`,
            name: modal.data.name,
            designation: modal.data.designation || "Hostel Warden",
            phone: modal.data.phone || "",
            email: modal.data.email || "",
          });
        }
      }

      return list;
    }, [activeWardenStaffIds, candidateStaff, modal.mode, modal.data]);

    const [form, setForm] = useState(() => {
      if (modal.data) {
        return {
          ...modal.data,
          assignmentDate: modal.data.assignmentDate ? modal.data.assignmentDate.split("T")[0] : new Date().toISOString().split("T")[0],
        };
      }
      const firstCandidate = wardenCandidates[0] || {};
      const firstBlock = blocks[0] || {};
      return {
        staffId: firstCandidate.staffId || "",
        empId: firstCandidate.empId || "",
        name: firstCandidate.name || "",
        designation: firstCandidate.designation || "Resident Warden",
        phone: firstCandidate.phone || "",
        email: firstCandidate.email || "",
        assignedHostels: firstBlock.name || "",
        hostelId: firstBlock.id || "",
        assignmentDate: new Date().toISOString().split("T")[0],
        status: "Active",
      };
    });

    const handleCandidateChange = (selectedStaffId) => {
      const candidate = wardenCandidates.find((c) => String(c.staffId) === String(selectedStaffId));
      if (candidate) {
        setForm((prev) => ({
          ...prev,
          staffId: candidate.staffId,
          name: candidate.name,
          empId: candidate.empId,
          designation: candidate.designation,
          phone: candidate.phone,
          email: candidate.email,
        }));
      }
    };

    return (
      <Modal
        className="cms-hostel-modal-lg"
        title={
          isView
            ? `Warden Details: ${form.name}`
            : modal.mode === "edit"
            ? "Edit Warden"
            : "Assign Warden"
        }
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveWarden(form);
          }}
        >
          <div className="cms-alloc-modal-form">
            {/* 1. Select Hostel Warden * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Hostel Warden <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={form.staffId || ""}
                  onChange={(e) => handleCandidateChange(e.target.value)}
                  className="cms-alloc-modal-select app-select"
                  
                >
                  <option value="" disabled>
                    {wardenCandidates.length === 0 ? "No available unassigned staff found..." : "Select Hostel Warden..."}
                  </option>
                  {wardenCandidates.map((c) => (
                    <option key={c.staffId} value={c.staffId}>
                      {c.name} ({c.empId} • {c.designation})
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--cms-muted)", margin: "3px 0 0 0" }}>
                Dedicated Hostel Warden directory auto-loaded for assignment.
              </p>
            </div>

            {/* 2. Select Hostel Block * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Hostel Block <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={form.assignedHostels}
                  onChange={(e) => {
                    const blk = blocks.find((b) => b.name === e.target.value);
                    setForm({
                      ...form,
                      assignedHostels: e.target.value,
                      hostelId: blk ? blk.id : form.hostelId,
                    });
                  }}
                  className="cms-alloc-modal-select app-select"
                  
                >
                  <option value="" disabled>Select Hostel Block...</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b.type ? b.type + " Hostel" : "Hostel"})
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 3. Assignment Date */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Assignment Date
              </label>
              <input
                type="date"
                disabled={isView}
                value={form.assignmentDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, assignmentDate: e.target.value })}
                className="cms-alloc-modal-input"
              />
            </div>
          </div>

          {/* Footer buttons matching Screenshot 3 */}
          <div className="cms-alloc-modal-footer">
            <button
              type="button"
              className="cms-alloc-modal-cancel-btn"
              onClick={closeModal}
            >
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button
                type="submit"
                className="cms-alloc-modal-submit-btn"
              >
                Save
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

  // Student Allocation Modal - Matches Screenshot 2 exactly
  const AllocationModal = () => {
    const isView = modal.mode === "view";
    const [form, setForm] = useState(
      modal.data || {
        admissionNo: "",
        studentName: "",
        blockName: "",
        blockCode: "",
        room: "",
        bed: "",
        joinDate: new Date().toISOString().split("T")[0],
        status: "Active",
      }
    );

    const [studentSearch, setStudentSearch] = useState(modal.data?.studentName || "");
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

    // Set of students who already have active hostel allocations
    const activeStudentIds = useMemo(() => {
      const set = new Set();
      allocations.forEach((a) => {
        if (a.status === "Active" && (modal.mode !== "edit" || a.id !== modal.data?.id)) {
          if (a.studentId) set.add(String(a.studentId));
          if (a.admissionNo) set.add(String(a.admissionNo));
        }
      });
      return set;
    }, [allocations, modal.mode, modal.data?.id]);

    // Student candidate suggestions from candidateStudents API (real Students table)
    const allCandidates = useMemo(() => {
      const list = [];
      const seen = new Set();

      // 1. Primary: candidateStudents fetched from /api/v1/students
      if (Array.isArray(candidateStudents) && candidateStudents.length > 0) {
        candidateStudents.forEach((st) => {
          const sId = st.studentId || st.id;
          if (!sId) return;
          const admNo = st.admissionNo || `ADM-${sId}`;
          const fullName = st.studentName || [st.firstName, st.middleName, st.lastName].filter(Boolean).join(" ") || `Student #${admNo}`;
          const isAllocated = activeStudentIds.has(String(sId)) || activeStudentIds.has(String(admNo));

          if (!isAllocated && !seen.has(String(sId))) {
            seen.add(String(sId));
            list.push({
              id: sId,
              studentId: sId,
              name: fullName,
              admissionNo: admNo,
              className: st.programName || st.courseName || st.sectionName || "Enrolled Student",
              gender: st.gender || "",
              contact: st.mobileNumber || "",
            });
          }
        });
      }

      // 2. Secondary: candidateAdmissions if available
      if (Array.isArray(candidateAdmissions) && candidateAdmissions.length > 0) {
        candidateAdmissions.forEach((ca, idx) => {
          const sId = ca.studentId;
          if (!sId) return;
          const admNo = ca.admissionNumber || ca.admissionNo || `ADM-${sId}`;
          const fullName = [ca.firstName, ca.middleName, ca.lastName].filter(Boolean).join(" ") || ca.fullName || ca.studentName || `Student #${admNo}`;
          const isAllocated = activeStudentIds.has(String(sId)) || activeStudentIds.has(String(admNo));

          if (!isAllocated && !seen.has(String(sId))) {
            seen.add(String(sId));
            list.push({
              key: `cand-${sId}-${admNo}-${idx}`,
              id: sId,
              studentId: sId,
              name: fullName,
              admissionNo: admNo,
              className: ca.courseName || ca.branchName || ca.className || "Admitted Student",
              gender: ca.gender || "",
              contact: ca.contactNumber || ca.mobileNumber || "",
            });
          }
        });
      }

      // 3. Fallback for edit mode: keep currently selected student
      if (modal.mode === "edit" && modal.data?.studentId && !seen.has(String(modal.data.studentId))) {
        list.push({
          key: `alloc-edit-${modal.data.studentId}`,
          id: modal.data.studentId,
          studentId: modal.data.studentId,
          name: modal.data.studentName || `Student #${modal.data.studentId}`,
          admissionNo: modal.data.admissionNo || "",
          className: "Resident Hosteller",
        });
      }

      return list;
    }, [candidateStudents, candidateAdmissions, activeStudentIds, modal.mode, modal.data]);

    const filteredCandidates = useMemo(() => {
      if (!studentSearch) return allCandidates;
      const q = studentSearch.toLowerCase().trim();
      return allCandidates.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.admissionNo?.toLowerCase().includes(q)
      );
    }, [studentSearch, allCandidates]);

    // Available rooms for selected block
    const availableRooms = useMemo(() => {
      if (!form.blockName) return [];
      return rooms.filter(
        (r) => r.blockName === form.blockName || r.block === form.blockName || String(r.hostelId) === String(form.hostelId)
      );
    }, [form.blockName, form.hostelId, rooms]);

    // Available beds for selected room (only real registered beds in database)
    const availableBeds = useMemo(() => {
      if (!form.roomId && !form.room) return [];
      const selRoom = rooms.find(
        (r) => String(r.id) === String(form.roomId) || r.roomNo === form.room || `Room #${r.roomNo}` === form.room
      );
      const rId = selRoom ? selRoom.id : form.roomId;
      if (!rId) return [];

      const roomBeds = beds.filter((b) => {
        const matchesRoom = String(b.roomId) === String(rId);
        if (!matchesRoom) return false;
        const isCurrentBed = modal.mode === "edit" && (String(b.id) === String(modal.data?.bedId) || b.bedNumber === modal.data?.bed);
        const isAvailable = (b.bedStatus || "").toLowerCase() === "available" || (!b.bedStatus && (b.status || "").toLowerCase() === "active");
        return isAvailable || isCurrentBed;
      });

      return roomBeds;
    }, [beds, form.roomId, form.room, rooms, modal.mode, modal.data?.bedId, modal.data?.bed]);

    const handleSubmit = (e) => {
      e.preventDefault();
      let studentId = Number(form.studentId);
      if (!studentId || isNaN(studentId) || studentId <= 0) {
        const found = allCandidates.find(
          (s) => s.name?.toLowerCase() === form.studentName?.toLowerCase() || s.admissionNo?.toLowerCase() === form.studentName?.toLowerCase()
        );
        if (found?.studentId) {
          studentId = Number(found.studentId);
        }
      }

      if (!studentId || isNaN(studentId) || studentId <= 0) {
        showToast("Please select a registered student from the dropdown suggestions list.", "warning");
        return;
      }
      if (!form.blockName) {
        showToast("Please select a hostel block.", "error");
        return;
      }
      if (!form.room) {
        showToast("Please select a room.", "error");
        return;
      }
      if (!form.bed) {
        showToast("Please select a bed number.", "error");
        return;
      }

      const selBed = availableBeds.find((b) => b.bedNumber === form.bed);
      const bedId = selBed ? Number(selBed.id) : Number(form.bedId);
      if (!bedId || isNaN(bedId) || bedId <= 0) {
        showToast("Please select a valid available bed in this room.", "warning");
        return;
      }

      handleSaveAllocation({
        ...form,
        studentId,
        bedId,
      });
    };

    return (
      <Modal title="Allocate Room & Bed" onClose={closeModal} className="cms-hostel-modal-lg">
        <form onSubmit={handleSubmit}>
          <div className="cms-alloc-modal-form">
            {/* 1. Select Student * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Student <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div className="app-search-field app-search-field--icon" style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  placeholder="Type student name or reg no (e.g. 's' or 'b')..."
                  value={studentSearch}
                  onFocus={() => setIsStudentDropdownOpen(true)}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setForm({ ...form, studentName: e.target.value, studentId: null });
                    setIsStudentDropdownOpen(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setIsStudentDropdownOpen(false), 250);
                  }}
                  className="cms-alloc-modal-input"
                  style={{ paddingRight: 36 }}
                />
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>

              {isStudentDropdownOpen && (
                <div className="cms-alloc-modal-dropdown app-select-panel">
                  {filteredCandidates.length === 0 ? (
                    <div className="cms-alloc-modal-dropdown-empty">
                      No matching student found. Type name to assign.
                    </div>
                  ) : (
                    filteredCandidates.map((st, idx) => (
                      <div
                        key={st.key || `st-cand-${st.id || st.admissionNo || idx}`}
                        onMouseDown={() => {
                          setForm({
                            ...form,
                            studentId: st.studentId || st.id,
                            studentName: st.name,
                            admissionNo: st.admissionNo,
                          });
                          setStudentSearch(st.name);
                          setIsStudentDropdownOpen(false);
                        }}
                        className="cms-alloc-modal-dropdown-item app-select-option"
                      >
                        <span style={{ fontWeight: 600, color: "var(--cms-text)", fontSize: 12.5 }}>{st.name}</span>
                        <span style={{ color: "var(--cms-muted)", fontSize: 11.5 }}>
                          {st.admissionNo} {st.className ? `• ${st.className}` : ""}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 2. Select Hostel Block * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Hostel Block <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  value={form.blockName}
                  onChange={(e) => {
                    const blk = blocks.find((b) => b.name === e.target.value);
                    setForm({
                      ...form,
                      blockName: e.target.value,
                      blockCode: blk ? blk.code : e.target.value,
                      hostelId: blk ? blk.id : form.hostelId,
                      room: "",
                      roomId: null,
                      bed: "",
                      bedId: null,
                    });
                  }}
                  className="cms-alloc-modal-select app-select"
                  
                >
                  <option value="">Select Hostel Block</option>
                  {blocks.map((b, idx) => (
                    <option key={b.id || b.code || b.name || `blk-${idx}`} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 3. Row with 2 columns: Select Room * & Bed Number * */}
            <div className="cms-alloc-modal-grid">
              {/* Select Room * */}
              <div>
                <label className="cms-alloc-modal-label">
                  Select Room <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    required
                    value={form.room}
                    onChange={(e) => {
                      const selRoomNo = e.target.value;
                      const selRoom = availableRooms.find(r => r.roomNo === selRoomNo || `Room #${r.roomNo}` === selRoomNo || String(r.id) === String(selRoomNo));
                      setForm({
                        ...form,
                        room: selRoom ? selRoom.roomNo : selRoomNo,
                        roomId: selRoom ? selRoom.id : form.roomId,
                        bed: "",
                        bedId: null,
                      });
                    }}
                    className="cms-alloc-modal-select app-select"
                    
                  >
                    {!form.blockName ? (
                      <option value="">Select Hostel Block first...</option>
                    ) : (
                      <>
                        <option value="">Select Room...</option>
                        {availableRooms.map((rm, idx) => (
                          <option key={rm.id || rm.roomNo || `rm-${idx}`} value={rm.roomNo}>
                            Room #{rm.roomNo} {rm.type ? `(${rm.type})` : ""}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <div className="cms-alloc-modal-chevron">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              {/* Bed Number * */}
              <div>
                <label className="cms-alloc-modal-label">
                  Bed Number <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    required
                    value={form.bed}
                    onChange={(e) => {
                      const selBedNum = e.target.value;
                      const bd = availableBeds.find(b => b.bedNumber === selBedNum || String(b.id) === String(selBedNum));
                      setForm({
                        ...form,
                        bed: bd ? bd.bedNumber : selBedNum,
                        bedId: bd ? bd.id : null,
                      });
                    }}
                    className="cms-alloc-modal-select app-select"
                    
                  >
                    {!form.room ? (
                      <option value="">Select Room first...</option>
                    ) : availableBeds.length === 0 ? (
                      <option value="" disabled>No available beds registered for this room</option>
                    ) : (
                      <>
                        <option value="">Select Bed Number...</option>
                        {availableBeds.map((bd, idx) => (
                          <option key={bd.id || bd.bedNumber || `bd-${idx}`} value={bd.bedNumber}>
                            {bd.bedNumber} ({bd.bedStatus || "Available"})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <div className="cms-alloc-modal-chevron">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Joining Date */}
            <div>
              <label className="cms-alloc-modal-label">
                Joining Date
              </label>
              <input
                type="date"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                className="cms-alloc-modal-input"
              />
            </div>
          </div>

          {/* Footer Buttons matching Screenshot 2 */}
          <div className="cms-alloc-modal-footer">
            <button
              type="button"
              onClick={closeModal}
              className="cms-alloc-modal-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cms-alloc-modal-submit-btn"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  // Vacate Bed Modal
  const VacateModal = () => {
    const alloc = modal.data;
    const [reason, setReason] = useState("Switched to Day Scholar");

    if (!alloc) return null;

    return (
      <Modal title={`Vacate Bed: ${alloc.studentName}`} onClose={closeModal} className="cms-hostel-modal-lg">
        <div style={{ display: "grid", gap: 12 }}>
          <div className="cms-hostel-warning">
            <AlertTriangle size={16} />
            <span>
              This will officially vacate the bed ({alloc.roomBadge || alloc.room}) in {alloc.blockName} and update facility vacancy counts.
            </span>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Reason for Vacating Bed
            </label>
            <input
              className="cms-hostel-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Course completion, relocated home..."
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              style={{ background: "var(--cms-red)" }}
              onClick={() => handleVacateAllocation(alloc, reason)}
            >
              Confirm Vacate
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  // Outpass Modal (Screenshot 4 - Theme-based & Exact Fields Only)
  const OutpassModal = () => {
    const isView = modal.mode === "view";
    const [selectedStudentId, setSelectedStudentId] = useState(
      modal.data?.studentId ? String(modal.data.studentId) : (modal.data?.admissionNo || "")
    );
    const [outpassCategory, setOutpassCategory] = useState(
      modal.data?.outpassType || modal.data?.requestType || "Local Outpass (Same Day)"
    );
    const [departureDateTime, setDepartureDateTime] = useState(
      modal.data?.departureDate || modal.data?.outDate || ""
    );
    const [returnDateTime, setReturnDateTime] = useState(
      modal.data?.returnDate || ""
    );
    const [reason, setReason] = useState(modal.data?.reason || "");

    // Resident candidates for student dropdown - strictly active allocations with valid studentId
    const studentCandidates = useMemo(() => {
      const map = new Map();
      allocations.forEach((a) => {
        if (a.status === "Active" && a.studentId) {
          map.set(String(a.studentId), {
            id: a.id,
            allocationId: a.id,
            studentId: a.studentId,
            admissionNo: a.admissionNo,
            name: a.studentName,
            blockName: a.blockName,
            hostelId: a.hostelId,
            room: a.room,
            roomId: a.roomId,
            bed: a.bed,
            bedId: a.bedId,
            wardenAssignmentId: a.wardenAssignmentId,
          });
        }
      });
      return Array.from(map.values());
    }, [allocations]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!selectedStudentId) {
        showToast("Please select a registered resident student", "error");
        return;
      }
      const studentObj = studentCandidates.find(
        (s) => String(s.studentId) === String(selectedStudentId) || s.admissionNo === selectedStudentId || String(s.allocationId) === String(selectedStudentId)
      );

      if (!studentObj) {
        showToast("Please select an active resident hosteller.", "error");
        return;
      }

      handleSaveOutpass({
        studentId: studentObj.studentId,
        studentName: studentObj.name,
        admissionNo: studentObj.admissionNo,
        hostelId: studentObj.hostelId,
        blockName: studentObj.blockName,
        roomId: studentObj.roomId,
        roomNo: studentObj.room,
        roomNumber: studentObj.room,
        bedId: studentObj.bedId,
        wardenAssignmentId: studentObj.wardenAssignmentId,
        outpassType: outpassCategory,
        requestType: outpassCategory,
        departureDate: departureDateTime || new Date().toISOString().slice(0, 16),
        outDate: departureDateTime || new Date().toISOString().slice(0, 16),
        returnDate: returnDateTime || new Date(Date.now() + 14400000).toISOString().slice(0, 16),
        reason: reason || "Outpass permission request",
        destination: "City",
      });
    };

    return (
      <Modal
        title={isView ? `Outpass Details: ${modal.data?.studentName}` : "Apply Outpass / Leave"}
        onClose={closeModal}
        className="cms-hostel-modal-lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="cms-alloc-modal-form">
            {/* 1. Select Student * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Student <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="cms-alloc-modal-select app-select"
                >
                  <option value="">Select Student...</option>
                  {studentCandidates.map((st) => (
                    <option key={st.studentId} value={String(st.studentId)}>
                      {st.name} ({st.admissionNo || `ID: ${st.studentId}`}) — {st.blockName || ""} {st.room ? `Room ${st.room}` : ""}
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 2. Outpass Category * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Outpass Category <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={outpassCategory}
                  onChange={(e) => setOutpassCategory(e.target.value)}
                  className="cms-alloc-modal-select app-select"
                >
                  <option value="Local Outpass (Same Day)">Local Outpass (Same Day)</option>
                  <option value="Home Leave (Multiple Days)">Home Leave (Multiple Days)</option>
                  <option value="Emergency Outpass">Emergency Outpass</option>
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 3. Grid: Departure Date & Time * and Expected Return * */}
            <div className="cms-alloc-modal-grid">
              <div>
                <label className="cms-alloc-modal-label">
                  Departure Date &amp; Time <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <input
                  required
                  disabled={isView}
                  type="datetime-local"
                  value={departureDateTime}
                  onChange={(e) => setDepartureDateTime(e.target.value)}
                  className="cms-alloc-modal-input"
                  placeholder="dd-mm-yyyy --:--"
                />
              </div>

              <div>
                <label className="cms-alloc-modal-label">
                  Expected Return <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <input
                  required
                  disabled={isView}
                  type="datetime-local"
                  value={returnDateTime}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  className="cms-alloc-modal-input"
                  placeholder="dd-mm-yyyy --:--"
                />
              </div>
            </div>

            {/* 4. Reason */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Reason
              </label>
              <input
                disabled={isView}
                placeholder="e.g. Medical appointment, family visit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="cms-alloc-modal-input"
              />
            </div>
          </div>

          {/* Footer Buttons matching Screenshot 4 */}
          <div className="cms-alloc-modal-footer">
            <button
              type="button"
              className="cms-alloc-modal-cancel-btn"
              onClick={closeModal}
            >
              Cancel
            </button>
            {!isView && (
              <button
                type="submit"
                className="cms-alloc-modal-submit-btn"
              >
                Save
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

  const TransferModal = () => {
    const isView = modal.mode === "view";
    const [selectedStudentId, setSelectedStudentId] = useState(
      modal.data?.studentId ? String(modal.data.studentId) : (modal.data?.admissionNo || "")
    );
    const [actionType, setActionType] = useState(
      modal.data?.actionType || modal.data?.requestType || "Room Transfer (Change Room/Block)"
    );
    const [destinationBlock, setDestinationBlock] = useState(
      modal.data?.targetBlock || (blocks[0]?.name || "")
    );
    const [destinationRoom, setDestinationRoom] = useState(
      modal.data?.targetRoom || ""
    );
    const [destinationBed, setDestinationBed] = useState(
      modal.data?.targetBed || ""
    );
    const [reason, setReason] = useState(
      modal.data?.reason || ""
    );

    const isVacate = actionType === "Bed Vacate";

    const residentStudents = useMemo(() => {
      const map = new Map();
      allocations.forEach((a) => {
        if (a.status === "Active" && a.studentId) {
          map.set(String(a.studentId), {
            id: a.id,
            allocationId: a.id,
            studentId: a.studentId,
            name: a.studentName,
            admissionNo: a.admissionNo,
            blockName: a.blockName,
            hostelId: a.hostelId,
            room: a.room,
            roomId: a.roomId,
            bed: a.bed,
            bedId: a.bedId,
          });
        }
      });
      return Array.from(map.values());
    }, [allocations]);

    // Destination block resolution
    const destBlockObj = useMemo(() => {
      return blocks.find((b) => b.name === destinationBlock || String(b.id) === String(destinationBlock)) || blocks[0] || null;
    }, [destinationBlock, blocks]);

    // Destination room options
    const destRooms = useMemo(() => {
      if (!destBlockObj) return [];
      return rooms.filter(
        (r) => r.blockName === destBlockObj.name || r.block === destBlockObj.name || String(r.hostelId) === String(destBlockObj.id)
      );
    }, [destBlockObj, rooms]);

    // Destination room resolution
    const destRoomObj = useMemo(() => {
      return destRooms.find(
        (r) => r.roomNo === destinationRoom || `Room #${r.roomNo}` === destinationRoom || `Room ${r.roomNo}` === destinationRoom || String(r.id) === String(destinationRoom)
      ) || destRooms[0] || null;
    }, [destRooms, destinationRoom]);

    // Destination available beds (only real registered beds in database)
    const destBeds = useMemo(() => {
      if (!destRoomObj) return [];
      const avail = beds.filter(
        (b) => String(b.roomId) === String(destRoomObj.id) && ((b.bedStatus || "").toLowerCase() === "available" || (!b.bedStatus && (b.status || "").toLowerCase() === "active"))
      );
      return avail;
    }, [beds, destRoomObj]);

    const handleSubmit = (e) => {
      e.preventDefault();
      const currentStudent = residentStudents.find(
        (s) => String(s.studentId) === String(selectedStudentId) || s.admissionNo === selectedStudentId
      );

      if (!currentStudent) {
        showToast("Please select an active resident student.", "warning");
        return;
      }

      let toBedId = null;
      if (!isVacate) {
        if (!destBlockObj) {
          showToast("Please select a destination hostel block.", "warning");
          return;
        }
        if (!destRoomObj) {
          showToast("Please select a destination room.", "warning");
          return;
        }
        const selBed = destBeds.find((b) => b.bedNumber === destinationBed);
        toBedId = selBed ? Number(selBed.id) : null;
        if (!toBedId) {
          showToast("Please select an available destination bed.", "warning");
          return;
        }
      }

      handleSaveTransfer({
        allocationId: currentStudent.allocationId,
        studentId: currentStudent.studentId,
        studentName: currentStudent.name,
        admissionNo: currentStudent.admissionNo,
        actionType: isVacate ? "Bed Vacate" : "Room Transfer",
        currentBlock: currentStudent.blockName,
        currentRoom: currentStudent.room,
        currentRoomDisplay: `${currentStudent.blockName} (#${currentStudent.room})`,
        fromHostelId: currentStudent.hostelId,
        fromRoomId: currentStudent.roomId,
        fromBedId: currentStudent.bedId,
        destinationBlock: destBlockObj?.name || destinationBlock,
        toHostelId: destBlockObj?.id || null,
        destinationRoom: destRoomObj ? `Room #${destRoomObj.roomNo}` : destinationRoom,
        toRoomId: destRoomObj?.id || null,
        destinationBed: destinationBed,
        toBedId,
        reason,
      });
    };

    return (
      <Modal
        title={isView ? `Migration Details: ${modal.data?.studentName}` : "Request Transfer / Vacate Bed"}
        onClose={closeModal}
        className="cms-hostel-modal-lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="cms-alloc-modal-form">
            {/* 1. Select Resident Student * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Resident Student <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="cms-alloc-modal-select app-select"
                >
                  <option value="">Select Resident Student...</option>
                  {residentStudents.map((st) => (
                    <option key={st.studentId} value={String(st.studentId)}>
                      {st.name} ({st.admissionNo || `ID: ${st.studentId}`} - {st.blockName} #{st.room})
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 2. Action Type * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Action Type <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="cms-alloc-modal-select app-select"
                >
                  <option value="Room Transfer (Change Room/Block)">Room Transfer (Change Room/Block)</option>
                  <option value="Bed Vacate">Bed Vacate</option>
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 3. Destination Hostel Block * (if not vacate) */}
            {!isVacate && (
              <div className="cms-alloc-modal-field">
                <label className="cms-alloc-modal-label">
                  Destination Hostel Block <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    disabled={isView}
                    value={destinationBlock}
                    onChange={(e) => {
                      setDestinationBlock(e.target.value);
                      setDestinationRoom("");
                      setDestinationBed("");
                    }}
                    className="cms-alloc-modal-select app-select"
                  >
                    <option value="">Select Destination Block...</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.type ? b.type + " Hostel" : "Hostel"})
                      </option>
                    ))}
                  </select>
                  <div className="cms-alloc-modal-chevron">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Grid: Destination Room * and Destination Bed Number * (if not vacate) */}
            {!isVacate && (
              <div className="cms-alloc-modal-grid">
                <div>
                  <label className="cms-alloc-modal-label">
                    Destination Room <span style={{ color: "var(--cms-red)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      disabled={isView}
                      value={destinationRoom}
                      onChange={(e) => {
                        setDestinationRoom(e.target.value);
                        setDestinationBed("");
                      }}
                      className="cms-alloc-modal-select app-select"
                    >
                      <option value="">Select Room...</option>
                      {destRooms.map((r) => (
                        <option key={r.id || r.roomNo} value={r.roomNo}>
                          Room #{r.roomNo} {r.type ? `(${r.type})` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="cms-alloc-modal-chevron">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="cms-alloc-modal-label">
                    Destination Bed Number <span style={{ color: "var(--cms-red)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      disabled={isView}
                      value={destinationBed}
                      onChange={(e) => setDestinationBed(e.target.value)}
                      className="cms-alloc-modal-select app-select"
                    >
                      {!destRoomObj ? (
                        <option value="">Select Room first...</option>
                      ) : destBeds.length === 0 ? (
                        <option value="">No beds available in this room</option>
                      ) : (
                        <>
                          <option value="">Select Bed Number...</option>
                          {destBeds.map((bd) => (
                            <option key={bd.id || bd.bedNumber} value={bd.bedNumber}>
                              {bd.bedNumber} ({bd.bedStatus || "Available"})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <div className="cms-alloc-modal-chevron">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Reason */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Reason
              </label>
              <input
                disabled={isView}
                placeholder="e.g. Switched to Non-Residential / Day Scholar after 3 months"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="cms-alloc-modal-input"
              />
            </div>
          </div>

          {/* Footer Buttons matching Screenshot 3 */}
          <div className="cms-alloc-modal-footer">
            <button
              type="button"
              className="cms-alloc-modal-cancel-btn"
              onClick={closeModal}
            >
              Cancel
            </button>
            {!isView && (
              <button
                type="submit"
                className="cms-alloc-modal-submit-btn"
              >
                Approve &amp; Release Bed
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

  // ═════════════════════════════════════════════════════════════════════
  // MAIN RENDER WITH DASHBOARDLAYOUT
  // ═════════════════════════════════════════════════════════════════════
  return (
    <DashboardLayout
      title="Hostel Management"
      subtitle="Manage hostel blocks, room categories, inventory, wardens, resident student allocations, outpasses, attendance and audit reports."
      breadcrumb={["Hostel Management"]}
    >
      <div className="cms-hostel-page">
        {/* Toast Notification */}
        {toast.message && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: "", type: "success" })}
          />
        )}

        {/* 4 Major Horizontal Navigation Tabs */}
        <div className="cms-hostel-tabs">
          {majorTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMajorTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`cms-hostel-tab ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  setActiveMajorTab(tab.id);
                  setSearchQuery("");
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Screen */}
        {activeMajorTab === "dashboard" && renderDashboard()}
        {activeMajorTab === "setup" && renderSetupMasters()}
        {activeMajorTab === "students" && renderStudentManagement()}
        {activeMajorTab === "reports" && renderReportsSection()}

        {/* Global Modals */}
        {modal.isOpen && modal.type === "block" && <BlockModal />}
        {modal.isOpen && (modal.type === "roomType" || (modal.type === "category" && modal.mode === "add")) && (
          <RoomSharingConfigModal />
        )}
        {modal.isOpen && modal.type === "category" && modal.mode !== "add" && <CategoryModal />}
        {modal.isOpen && modal.type === "room" && <RoomModal />}
        {modal.isOpen && modal.type === "warden" && <WardenModal />}
        {modal.isOpen && modal.type === "allocation" && <AllocationModal />}
        {modal.isOpen && modal.type === "vacate" && <VacateModal />}
        {modal.isOpen && modal.type === "outpass" && <OutpassModal />}
        {modal.isOpen && modal.type === "transfer" && <TransferModal />}

        {/* Global Confirm Dialog */}
        {confirmDialog.isOpen && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            danger={confirmDialog.danger}
            confirmLabel={confirmDialog.confirmLabel}
            onCancel={closeConfirm}
            onConfirm={confirmDialog.onConfirm}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
