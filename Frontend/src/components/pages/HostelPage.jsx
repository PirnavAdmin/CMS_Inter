import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { getAuthUser } from "@/features/authStorage.js";
import { isWardenRole } from "@/routes/ProtectedRoute.jsx";
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
  { id: "rooms", label: "Rooms & Bed Allocation", title: "Rooms & Bed Allocation", subtitle: "Unified management of room accommodation types, tariffs, bed inventories, and allocations", icon: Home },
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

// Unenrolled admission applicant IDs returned in the certificate students dropdown UNION
// that do NOT exist in the Students master table (sp_CheckStudentExists returns 0).
// Hostel room allocations require an enrolled student record in the Students master table.
const UNENROLLED_ADMISSION_IDS = new Set([
  1, 506, 509, 516, 591, 592, 593, 595, 598, 609, 610, 615, 620
]);

const UNENROLLED_ADMISSION_NUMBERS = new Set([
  "ADM-01", "ADM-06", "ADM-09", "ADM-10", "ADM-12", "ADM-13", "ADM-16",
  "ADM-45", "ADM-46", "ADM-53", "NADM-0001", "MADM-0059", "NADM-0060", "MADM-0068"
]);

const isUnenrolledAdmissionCandidate = (candidate) => {
  if (!candidate) return true;
  return false;
};

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
function exportCsv(filename, rows = [], columns = []) {
  if (!Array.isArray(columns) || columns.length === 0) return;
  const safeRows = Array.isArray(rows) ? rows : [];
  const header = columns.map((col) => `"${String(col.label ?? "").replace(/"/g, '""')}"`).join(",");
  const body = safeRows.map((row) =>
    columns
      .map((col) => {
        let val;
        if (typeof col.value === "function") val = col.value(row);
        else if (typeof col.getter === "function") val = col.getter(row);
        else val = row ? row[col.key] : "";
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
  link.download = filename || "export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 1000);
}

const extractCollection = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const d = payload.data ?? payload.Data ?? payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items ?? d?.Items)) return d.items ?? d.Items;
  if (Array.isArray(d?.data ?? d?.Data)) return d.data ?? d.Data;
  if (Array.isArray(d?.$values)) return d.$values;
  if (Array.isArray(payload.items ?? payload.Items)) return payload.items ?? payload.Items;
  return [];
};

const getVal = (obj, ...keys) => {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
  }
  return undefined;
};

// Date helpers for today's date and current month defaults
const getTodayDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getCurrentMonthStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

// Canonical floor label normalizer
const normalizeFloorName = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  if (/^ground/i.test(s) || s === "0") return "Ground Floor";
  const numMatch = s.match(/\d+/);
  if (numMatch) {
    const n = parseInt(numMatch[0], 10);
    if (n === 0) return "Ground Floor";
    if (n === 1) return "1st Floor";
    if (n === 2) return "2nd Floor";
    if (n === 3) return "3rd Floor";
    return `${n}th Floor`;
  }
  return s;
};

// Floor matching helper supporting canonical and variations
const isFloorMatch = (roomFloor, filterVal) => {
  if (!filterVal || filterVal === "all") return true;
  if (!roomFloor) return false;
  const rNorm = normalizeFloorName(roomFloor).toLowerCase();
  const fNorm = normalizeFloorName(filterVal).toLowerCase();
  if (rNorm === fNorm) return true;
  const rDigit = String(roomFloor).match(/\d+/)?.[0];
  const fDigit = String(filterVal).match(/\d+/)?.[0];
  if (rDigit && fDigit && rDigit === fDigit) return true;
  if (/ground/i.test(String(roomFloor)) && (/ground/i.test(String(filterVal)) || fDigit === "0")) return true;
  return String(roomFloor).toLowerCase().includes(String(filterVal).toLowerCase());
};

// Sort floor labels in natural ascending order: Ground Floor, 1st Floor, 2nd Floor, etc.
const sortFloorLabels = (floors = []) => {
  return [...floors].sort((a, b) => {
    const aNorm = normalizeFloorName(a);
    const bNorm = normalizeFloorName(b);
    if (aNorm === "Ground Floor") return -1;
    if (bNorm === "Ground Floor") return 1;
    const aNum = parseInt(aNorm.match(/\d+/)?.[0] || "999", 10);
    const bNum = parseInt(bNorm.match(/\d+/)?.[0] || "999", 10);
    return aNum - bNum;
  });
};

// Room number canonicalizer (e.g. "Room #101" -> "101", "RM101" -> "101")
const cleanRoomNumber = (val) => {
  if (!val) return "";
  return String(val).replace(/^(room\s*#?|rm\s*#?)\s*/i, "").trim();
};

const DEFAULT_HOSTEL_STAFF = [];

// ── Unified Hostel Pagination Component ────────────────────────────────
function HostelPagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = "records",
}) {
  if (!totalItems || totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageClamped = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (currentPageClamped - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const visiblePages = (() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPageClamped - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  })();

  return (
    <div className="cms-pagination cms-hostel-pagination-attached">
      <span className="cms-page-info">
        Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> {itemLabel}
        {totalPages > 1 && (
          <span style={{ marginLeft: 6, fontWeight: 500, color: "var(--cms-muted)" }}>
            (Page {currentPageClamped} of {totalPages})
          </span>
        )}
      </span>
      <button
        type="button"
        className="cms-page-btn"
        disabled={currentPageClamped <= 1}
        onClick={() => onPageChange(Math.max(1, currentPageClamped - 1))}
      >
        Previous
      </button>
      {visiblePages.map((p) => (
        <button
          key={p}
          type="button"
          className={`cms-page-btn ${p === currentPageClamped ? "is-active" : ""}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="cms-page-btn"
        disabled={currentPageClamped >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPageClamped + 1))}
      >
        Next
      </button>
    </div>
  );
}

// ── Component Definition ──────────────────────────────────────────────
export default function HostelPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();
  const isWardenRoute = location.pathname.toLowerCase().includes("warden");
  const isWarden = isWardenRole(user?.role, user) || isWardenRoute;
  const isAdmin = Boolean(user?.isAdmin || String(user?.role || "").toLowerCase().includes("admin"));
  const canAccessAdminEndpoints = isAdmin && !isWarden;

  // ── Isolated View for Sidebar Field Selection ───────────────────────
  const activeSection = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes("attendance")) return "attendance";
    if (p.includes("outpass") || p.includes("leave")) return "outpasses";
    if (p.includes("transfer") || p.includes("vacat")) return "transfers";
    if (p.includes("student-allocation") || p.includes("allocat")) return "allocations";
    if (p.includes("students")) return "students";
    if (p.includes("room") || p.includes("bed")) return "rooms";
    if (p.includes("block")) return "blocks";
    if (p.includes("warden") && !p.includes("warden-dashboard") && !p.includes("overview")) return "wardens";
    if (p.includes("report")) return "reports";
    if (p.includes("master")) return "setup";
    if (p.includes("warden") || p.includes("overview")) return "dashboard";
    return "default";
  }, [location.pathname]);

  const isDedicatedView = isWardenRoute || activeSection !== "default";

  // ── Navigation Tabs State ───────────────────────────────────────────
  const [activeMajorTab, setActiveMajorTab] = useState("dashboard");
  const [activeSetupSubtab, setActiveSetupSubtab] = useState("blocks");
  const [activeStudentSubtab, setActiveStudentSubtab] = useState("allocations");

  // ── Dashboard Interactive State ─────────────────────────────────────
  const [dashBlockSearch, setDashBlockSearch] = useState("");
  const [dashSelectedBlockId, setDashSelectedBlockId] = useState("");
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
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState(null);
  const [beds, setBeds] = useState([]);
  const [candidateStaff, setCandidateStaff] = useState([]);
  const [candidateAdmissions, setCandidateAdmissions] = useState([]);
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const isSavingWardenRef = useRef(false);
  const isSavingAllocRef = useRef(false);
  const isSavingBlockRef = useRef(false);
  const isSavingRoomRef = useRef(false);
  const isSavingCategoryRef = useRef(false);
  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  const candidateStaffRef = useRef(candidateStaff);
  useEffect(() => {
    candidateStaffRef.current = candidateStaff;
  }, [candidateStaff]);
  const allocationsRef = useRef(allocations);
  useEffect(() => {
    allocationsRef.current = allocations;
  }, [allocations]);

  // ── API Response Mappers ────────────────────────────────────────────
  const mapBlock = useCallback((b) => {
    if (!b) return {};
    const bId = b.hostelId ?? b.id ?? "";
    const bName = (b.hostelName ?? b.name ?? "").trim() || `Hostel Block #${bId}`;
    const bCode = (b.hostelCode ?? b.code ?? "").trim() || `BLK-${bId}`;
    return {
      id: bId,
      name: bName,
      code: bCode,
      type: b.hostelType ?? b.type ?? "Boys",
      floors: Math.max(1, Number(b.totalFloors ?? b.floors ?? 3)),
      totalRooms: b.totalRooms ?? 0,
      totalBeds: b.totalBeds ?? 0,
      occupiedBeds: b.occupiedBeds ?? 0,
      vacantBeds: b.availableBeds ?? b.vacantBeds ?? 0,
      warden: b.wardenName ?? b.warden ?? "Unassigned",
      wardenPhone: b.primaryMobileNumber ?? b.wardenPhone ?? "-",
      email: b.email ?? "",
      address: b.address ?? "",
      status: b.status ?? "Active",
    };
  }, []);

  const mapCategory = useCallback((c) => {
    if (!c) return {};
    const rawFee = c.standardMonthlyFee ?? c.monthlyFee ?? c.fee;
    let feeFormatted = "";
    if (rawFee !== undefined && rawFee !== null && rawFee !== "" && Number(rawFee) > 0) {
      feeFormatted = `₹${Number(rawFee).toLocaleString()}/mo`;
    } else if (typeof c.fee === "string" && c.fee.trim() !== "") {
      feeFormatted = c.fee;
    }

    return {
      id: c.roomTypeId ?? c.id ?? "",
      name: c.roomTypeSpecification ?? c.name ?? "",
      specification: c.roomTypeSpecification ?? c.specification ?? "",
      type: c.acType === "AC" ? "AC Accommodation" : c.acType === "Non-AC" ? "Non-AC Standard" : (c.type ?? ""),
      capacity: Number(c.bedCapacity ?? c.capacity ?? 1),
      acType: c.acType ?? "Non-AC",
      fee: feeFormatted || "—",
      totalRooms: c.totalRooms ?? 0,
      totalBeds: c.totalBeds ?? 0,
      blocks: c.blocks ?? "",
      description: c.description ?? "",
      status: c.status ?? "Active",
    };
  }, []);

  const mapRoom = useCallback((r, blockList = blocksRef.current, catList = categoriesRef.current) => {
    if (!r) return {};
    const blks = Array.isArray(blockList) ? blockList : [];
    const cats = Array.isArray(catList) ? catList : [];

    const matchedBlk = blks.find(
      (b) => Number(b.id) === Number(r.hostelId) || b.code === r.hostelCode || b.name === r.hostelName
    );
    const resolvedBlockName = (r.hostelName || "").trim() || matchedBlk?.name || r.blockName || r.block || (Number(r.hostelId) === 1 ? "Boys Hostel 1" : (r.hostelId ? `Hostel Block #${r.hostelId}` : "Boys Hostel 1"));
    const resolvedBlockCode = (r.hostelCode || "").trim() || matchedBlk?.code || r.blockCode || (Number(r.hostelId) === 1 ? "BH-1" : (r.hostelId ? `BLK-${r.hostelId}` : "BH-1"));

    const matchedCat = cats.find(
      (c) => Number(c.id) === Number(r.roomTypeId) || c.name === r.roomTypeSpecification || c.specification === r.roomTypeSpecification
    );
    const resolvedType = (r.roomTypeSpecification || "").trim() || matchedCat?.name || r.type || "";
    const resolvedCapacity = Number(r.bedCapacity ?? matchedCat?.capacity ?? r.capacity ?? 1);
    const rawFee = r.fee || r.monthlyFee || r.standardMonthlyFee || matchedCat?.fee;
    let feeFormatted = "";
    if (rawFee !== undefined && rawFee !== null && rawFee !== "" && Number(rawFee) > 0) {
      feeFormatted = `₹${Number(rawFee).toLocaleString()}/mo`;
    } else if (typeof rawFee === "string" && rawFee.trim() !== "") {
      feeFormatted = rawFee;
    }

    return {
      id: r.roomId ?? r.id ?? r.RoomId ?? "",
      roomNo: r.roomNumber ?? r.roomNo ?? r.RoomNumber ?? r.RoomNo ?? "",
      block: resolvedBlockCode,
      blockName: resolvedBlockName,
      floor: normalizeFloorName(r.floorLevel ?? r.floor ?? r.FloorLevel ?? "Ground Floor"),
      type: resolvedType,
      capacity: resolvedCapacity,
      acType: r.acType ?? matchedCat?.acType ?? "",
      occupied: r.occupied ?? r.Occupied ?? 0,
      fee: feeFormatted || "—",
      beds: Array.isArray(r.beds) ? r.beds : (Array.isArray(r.Beds) ? r.Beds : []),
      status: r.status ?? r.Status ?? "Active",
      hostelId: r.hostelId ?? r.HostelId ?? matchedBlk?.id,
      roomTypeId: r.roomTypeId ?? r.RoomTypeId ?? matchedCat?.id,
    };
  }, []);

  const mapBed = useCallback((bd) => {
    if (!bd) return {};
    return {
      id: bd.bedId ?? bd.id ?? "",
      roomId: bd.roomId,
      roomNumber: bd.roomNumber ?? "",
      hostelId: bd.hostelId,
      bedNumber: bd.bedNumber ?? "",
      bedStatus: bd.bedStatus ?? "Available",
      status: bd.status ?? "Active",
    };
  }, []);

  const mapWarden = useCallback((w, blockList = blocksRef.current) => {
    if (!w) return {};
    const blks = Array.isArray(blockList) && blockList.length > 0 ? blockList : (blocksRef.current || []);
    const wardenFullName = [w.firstName, w.middleName, w.lastName].filter(Boolean).join(" ");
    const matchedBlk = blks.find((b) => Number(b.id) === Number(w.hostelId) || String(b.id) === String(w.hostelId) || b.name === w.hostelName);
    const resolvedBlockName = (w.hostelName && !w.hostelName.startsWith("Hostel Block #")) ? w.hostelName : (matchedBlk?.name || w.assignedHostels || (w.hostelId ? `Hostel Block #${w.hostelId}` : ""));
    const resolvedCategory = w.hostelType || matchedBlk?.type || w.category || "";

    const staffList = candidateStaffRef.current || [];
    const staffMember = staffList.find((s) => Number(s.staffId || s.id) === Number(w.staffId));

    const wName = w.wardenName || (wardenFullName ? wardenFullName : (w.name || staffMember?.fullName || staffMember?.name || "Resident Warden"));
    const empId = w.employeeId || w.empId || staffMember?.empId || staffMember?.employeeId || (w.staffId ? `EMP-${w.staffId}` : "");
    const phone = w.phone || w.mobileNumber || staffMember?.phone || staffMember?.mobileNumber || "";
    const email = w.email || staffMember?.email || "";
    const designation = w.designation || staffMember?.designation || "Resident Warden";

    return {
      id: w.wardenAssignmentId ?? w.id ?? "",
      wardenAssignmentId: w.wardenAssignmentId ?? w.id ?? "",
      empId,
      employeeId: empId,
      name: wName,
      wardenName: wName,
      designation,
      phone,
      mobileNumber: phone,
      email,
      assignedHostels: resolvedBlockName,
      hostelName: resolvedBlockName,
      blockName: resolvedBlockName,
      hostelId: w.hostelId,
      staffId: w.staffId,
      assignmentDate: w.assignmentDate ? (typeof w.assignmentDate === "string" ? w.assignmentDate.split("T")[0] : String(w.assignmentDate)) : "",
      gender: w.gender ?? "",
      category: resolvedCategory,
      hostelType: resolvedCategory,
      type: resolvedCategory,
      status: w.status ?? "Active",
    };
  }, []);

  const mapAllocation = useCallback((a, blockList = blocksRef.current) => {
    if (!a) return {};
    const blks = Array.isArray(blockList) ? blockList : [];
    const matchedBlk = blks.find((b) => Number(b.id) === Number(a.hostelId) || b.name === a.hostelName);
    const resolvedBlockName = (a.hostelName || "").trim() || matchedBlk?.name || a.blockName || (a.hostelId ? `Hostel Block #${a.hostelId}` : "");
    const resolvedBlockCode = (a.hostelCode || "").trim() || matchedBlk?.code || a.blockCode || (a.hostelId ? `BLK-${a.hostelId}` : "");
    return {
      id: a.allocationId ?? a.id ?? "",
      allocationId: a.allocationId ?? a.id ?? "",
      admissionNo: a.admissionNo ?? "",
      studentName: a.studentName ?? a.name ?? "",
      gender: a.gender ?? "",
      blockName: resolvedBlockName,
      hostelName: resolvedBlockName,
      blockCode: resolvedBlockCode,
      hostelCode: resolvedBlockCode,
      floor: a.floorLevel ?? a.floor ?? "",
      room: a.roomNumber ? `Room #${a.roomNumber}` : (a.room ?? ""),
      roomNumber: a.roomNumber ?? a.room ?? "",
      bed: a.bedNumber ?? a.bed ?? "",
      bedNumber: a.bedNumber ?? a.bed ?? "",
      roomBadge: a.roomNumber && a.bedNumber ? `Room #${a.roomNumber} (${a.bedNumber})` : (a.roomBadge ?? (a.room ? `${a.room}` : "")),
      joinDate: a.joiningDate ? (typeof a.joiningDate === "string" ? a.joiningDate.split("T")[0] : String(a.joiningDate).split("T")[0]) : (a.joinDate ?? ""),
      status: a.status ?? "Active",
      monthlyFee: a.monthlyFee ?? a.fee ?? "",
      contact: a.contact ?? "",
      remarks: a.remarks ?? "",
      hostelId: a.hostelId,
      roomId: a.roomId,
      bedId: a.bedId,
      studentId: a.studentId,
      wardenAssignmentId: a.wardenAssignmentId,
      category: a.hostelType ?? matchedBlk?.type ?? "",
    };
  }, []);

  const mapOutpass = useCallback((o) => {
    if (!o) return {};
    const alloc = (allocationsRef.current || []).find(
      (a) =>
        (o.studentId && Number(a.studentId) === Number(o.studentId)) ||
        (o.admissionNo && String(a.admissionNo).trim().toLowerCase() === String(o.admissionNo).trim().toLowerCase()) ||
        (o.studentName && String(a.studentName).trim().toLowerCase() === String(o.studentName).trim().toLowerCase())
    );
    const sName = o.studentName || alloc?.studentName || (o.studentId ? `Student #${o.studentId}` : "Resident Student");
    const admNo = o.admissionNo || alloc?.admissionNo || "-";
    const bName = o.blockName || o.hostelName || alloc?.blockName || alloc?.hostelName || "Boys Hostel 1";
    const rNo = o.roomNumber || o.roomNo || alloc?.roomNumber || alloc?.room || "-";
    const cleanRNo = String(rNo).replace("Room #", "").trim();

    return {
      id: o.requestId ?? o.id ?? "",
      studentName: sName,
      admissionNo: admNo,
      blockName: bName,
      hostelName: bName,
      roomNo: cleanRNo,
      roomNumber: cleanRNo,
      outpassType: o.outpassType ?? o.requestType ?? "Local Outpass",
      requestType: o.requestType ?? o.outpassType ?? "Local Outpass",
      departureDate: o.fromDateTime ? (typeof o.fromDateTime === "string" ? o.fromDateTime.split("T")[0] : String(o.fromDateTime).split("T")[0]) : (o.departureDate ?? ""),
      outDate: o.fromDateTime ?? o.outDate ?? "",
      returnDate: o.toDateTime ? (typeof o.toDateTime === "string" ? o.toDateTime.split("T")[0] : String(o.toDateTime).split("T")[0]) : (o.returnDate ?? ""),
      reason: o.reason ?? "",
      destination: o.destination ?? "",
      status: o.approvalStatus ?? o.status ?? "Pending",
      approvalRemarks: o.approvalRemarks ?? "",
      hostelId: o.hostelId || alloc?.hostelId,
      studentId: o.studentId || alloc?.studentId,
      roomId: o.roomId || alloc?.roomId,
      bedId: o.bedId || alloc?.bedId,
      wardenAssignmentId: o.wardenAssignmentId,
    };
  }, []);

  const mapTransfer = useCallback((t) => {
    if (!t) return {};
    const alloc = (allocationsRef.current || []).find(
      (a) =>
        (t.allocationId && Number(a.id || a.allocationId) === Number(t.allocationId)) ||
        (t.studentId && Number(a.studentId) === Number(t.studentId)) ||
        (t.admissionNo && String(a.admissionNo).trim().toLowerCase() === String(t.admissionNo).trim().toLowerCase())
    );
    const sName = t.studentName || alloc?.studentName || (t.studentId ? `Student #${t.studentId}` : "Resident Student");
    const admNo = t.admissionNo || alloc?.admissionNo || "-";
    const fromB = t.fromHostelName || t.currentBlock || alloc?.blockName || alloc?.hostelName || "Boys Hostel 1";
    const fromR = t.fromRoomNumber || t.currentRoom || alloc?.roomNumber || alloc?.room || "-";
    const cleanFromR = String(fromR).replace("Room #", "").trim();
    const actType = t.actionType || (t.requestType === "Vacate" ? "Bed Vacate" : "Room Transfer");

    return {
      id: t.requestId ?? t.id ?? "",
      studentName: sName,
      admissionNo: admNo,
      actionType: actType,
      requestType: t.requestType || (actType === "Bed Vacate" ? "Vacate" : "Transfer"),
      currentBlock: fromB,
      fromHostelName: fromB,
      currentRoom: cleanFromR,
      fromRoomNumber: cleanFromR,
      currentRoomDisplay: `${fromB} (#${cleanFromR})`,
      targetBlock: t.toHostelName ?? t.targetBlock ?? "--",
      targetRoom: t.toRoomNumber ?? t.targetRoom ?? "--",
      targetBed: t.toBedNumber ?? t.targetBed ?? "--",
      targetDisplayTitle: t.toHostelName && t.toRoomNumber ? `New Bed: ${t.toHostelName} (#${t.toRoomNumber})` : (t.requestType === "Vacate" || actType === "Bed Vacate" ? "✓ Old Bed Released to Available" : (t.targetDisplayTitle ?? "--")),
      targetDisplaySub: t.toHostelName && t.fromRoomNumber ? `✓ Old Bed #${t.fromRoomNumber} Released to Available` : (t.targetDisplaySub ?? null),
      feeAdjustment: (t.requestType === "Vacate" || actType === "Bed Vacate") && t.refundAmount ? `Fee Adjusted: ₹${t.refundAmount.toLocaleString()}` : (t.feeAdjustment ?? null),
      date: t.requestDate ? (typeof t.requestDate === "string" ? t.requestDate.split("T")[0] : String(t.requestDate).split("T")[0]) : (t.date ?? ""),
      requestDate: t.requestDate ? (typeof t.requestDate === "string" ? t.requestDate.split("T")[0] : String(t.requestDate).split("T")[0]) : (t.requestDate ?? ""),
      status: t.approvalStatus ?? t.status ?? "Pending",
      reason: t.reason ?? "",
      allocationId: t.allocationId || alloc?.id,
      studentId: t.studentId || alloc?.studentId,
      fromHostelId: t.fromHostelId || alloc?.hostelId,
      fromRoomId: t.fromRoomId || alloc?.roomId,
      fromBedId: t.fromBedId || alloc?.bedId,
      toHostelId: t.toHostelId,
      toRoomId: t.toRoomId,
      toBedId: t.toBedId,
      wardenAssignmentId: t.wardenAssignmentId,
      approvalStatus: t.approvalStatus ?? "",
      feeSettlementStatus: t.feeSettlementStatus ?? "",
    };
  }, []);

  // Normalizer for attendance record from API or DB
  const mapAttendanceRecord = useCallback((r) => {
    if (!r) return null;
    const attId = getVal(r, "attendanceId", "AttendanceId", "id", "Id");
    const sId = getVal(r, "studentId", "StudentId");
    const rawDate = getVal(r, "attendanceDate", "AttendanceDate", "date", "Date");
    const dateStr = rawDate ? String(rawDate).split("T")[0] : "";
    const rawSession = getVal(r, "session", "Session") || "Night";
    const session = String(rawSession).toLowerCase().includes("morn") ? "Morning" : "Night";
    const status = getVal(r, "attendanceStatus", "AttendanceStatus", "status", "Status") || "Present";
    const inTime =
      getVal(r, "inTime", "InTime", "checkInTime", "CheckInTime") ||
      (status === "Present" || status === "Half Day" ? (session === "Morning" ? "07:00" : "20:00") : "--");

    return {
      id: attId,
      attendanceId: attId,
      studentId: sId ? Number(sId) : null,
      studentName: getVal(r, "studentName", "StudentName", "name", "Name") || "",
      admissionNo: getVal(r, "admissionNo", "AdmissionNo") || "",
      hostelId: getVal(r, "hostelId", "HostelId"),
      hostelName: getVal(r, "hostelName", "HostelName", "blockName", "BlockName") || "",
      roomId: getVal(r, "roomId", "RoomId"),
      roomNumber: getVal(r, "roomNumber", "RoomNumber", "room", "Room") || "",
      bedId: getVal(r, "bedId", "BedId"),
      bedNumber: getVal(r, "bedNumber", "BedNumber", "bed", "Bed") || "",
      date: dateStr,
      attendanceDate: dateStr,
      session,
      status,
      inTime,
      remarks: getVal(r, "remarks", "Remarks") || "",
      wardenAssignmentId: getVal(r, "wardenAssignmentId", "WardenAssignmentId"),
      markedByStaffName: getVal(r, "markedByStaffName", "MarkedByStaffName") || "",
    };
  }, []);

  // ── Fetch all hostel data from API on mount ─────────────────────────
  const fetchHostelData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const shouldFetchStaff = canAccessAdminEndpoints;
      const shouldFetchAdmissions = canAccessAdminEndpoints;
      const shouldFetchAllStudents = canAccessAdminEndpoints;

      const [blocksRes, catsRes, roomsRes, bedsRes, wardensRes, allocsRes, outpassRes, transferRes, dashRes, hostelStaffRes, staffRes, staffDropRes, admRes, certStudentsRes, allStudentsRes, attRes] = await Promise.allSettled([
        hostelApi.getHostelBlocks().catch(() => null),
        hostelApi.getRoomTypes().catch(() => null),
        hostelApi.getRooms().catch(() => null),
        hostelApi.getBeds().catch(() => null),
        hostelApi.getWardens().catch(() => null),
        hostelApi.getStudentAllocations().catch(() => null),
        hostelApi.getOutpassLeave().catch(() => null),
        hostelApi.getTransferVacate().catch(() => null),
        hostelApi.getHostelDashboard().catch(() => null),
        shouldFetchStaff
          ? apiClient.get("/api/v1/staff?Department=hostel&pageSize=500", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true })
              .catch(() => apiClient.get("/api/v1/staff?Department=hostel", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true }).catch(() => null))
          : Promise.resolve(null),
        shouldFetchStaff
          ? apiClient.get("/api/v1/staff?staffType=Non-Teaching&pageSize=500", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true }).catch(() => apiClient.get("/api/v1/staff?pageSize=500", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true }).catch(() => null))
          : Promise.resolve(null),
        shouldFetchStaff
          ? apiClient.get("/api/v1/staff/dropdown?staffType=Non-Teaching", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true }).catch(() => null)
          : Promise.resolve(null),
        shouldFetchAdmissions
          ? apiClient.get("/api/v1/student-admissions", { skipGlobalLoader: true, optionalAuth: true, skipAuthRedirect: true, skipErrorLog: true }).catch(() => null)
          : Promise.resolve(null),
        canAccessAdminEndpoints
          ? apiClient.get("/api/v1/certificates/students-dropdown", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true })
              .catch(() => null)
          : Promise.resolve(null),
        shouldFetchAllStudents
          ? apiClient.get("/api/v1/students/active", { skipGlobalLoader: true, optionalAuth: true, skipAuthRedirect: true, skipErrorLog: true })
              .catch(() => apiClient.get("/api/v1/students?pageSize=500", { skipGlobalLoader: true, optionalAuth: true, skipAuthRedirect: true, skipErrorLog: true }).catch(() => null))
          : Promise.resolve(null),
        hostelApi.getAttendance().catch(() => null),
      ]);

      let uniqueBlocks = [];
      if (blocksRes.status === "fulfilled") {
        const rawBlocks = extractCollection(blocksRes.value?.data);
        const mappedBlocks = Array.isArray(rawBlocks) ? rawBlocks.map(mapBlock) : [];
        uniqueBlocks = Array.from(new Map(mappedBlocks.map((b) => [String(b.id || b.code), b])).values());
        blocksRef.current = uniqueBlocks;
        setBlocks(uniqueBlocks);
        if (uniqueBlocks.length > 0) {
          setDashSelectedBlockId((prev) => (prev && prev !== "blk-1" ? prev : uniqueBlocks[0].id));
        }
      }
      let uniqueCats = [];
      if (catsRes.status === "fulfilled") {
        const rawCats = extractCollection(catsRes.value?.data);
        const mappedCats = Array.isArray(rawCats) ? rawCats.map(mapCategory) : [];
        uniqueCats = Array.from(new Map(mappedCats.map((c) => [String(c.id || c.name), c])).values());
        categoriesRef.current = uniqueCats;
        setCategories(uniqueCats);
      }
      if (roomsRes.status === "fulfilled") {
        const rawRooms = extractCollection(roomsRes.value?.data);
        const mappedRooms = Array.isArray(rawRooms) ? rawRooms.map((r) => mapRoom(r, uniqueBlocks, uniqueCats)) : [];
        const uniqueRooms = Array.from(new Map(mappedRooms.map((r) => [String(r.id || `${r.hostelId}-${r.roomNo}`), r])).values());
        setRooms(uniqueRooms);
      }
      if (bedsRes.status === "fulfilled") {
        const rawBeds = extractCollection(bedsRes.value?.data);
        const mappedBeds = Array.isArray(rawBeds) ? rawBeds.map(mapBed) : [];
        const uniqueBeds = Array.from(new Map(mappedBeds.map((bd) => [String(bd.id || `${bd.roomId}-${bd.bedNumber}`), bd])).values());
        setBeds(uniqueBeds);
      }
      if (wardensRes.status === "fulfilled") {
        const rawWardens = extractCollection(wardensRes.value?.data);
        const mappedWardens = Array.isArray(rawWardens) ? rawWardens.map((w) => mapWarden(w, uniqueBlocks)) : [];
        const uniqueWardens = Array.from(new Map(mappedWardens.map((w) => [String(w.id || `${w.hostelId}-${w.staffId}`), w])).values());
        setWardens(uniqueWardens);
      }
      let derivedStudents = [];
      if (allocsRes.status === "fulfilled") {
        const rawAllocs = extractCollection(allocsRes.value?.data);
        const mapped = Array.isArray(rawAllocs) ? rawAllocs.map((a) => mapAllocation(a, uniqueBlocks)) : [];
        const uniqueAllocs = Array.from(new Map(mapped.map((a) => [String(a.id || `${a.studentId}-${a.bedId}`), a])).values());
        setAllocations(uniqueAllocs);
        // Derive attendance student list from active allocations with strict deduplication
        const seenAtt = new Set();
        const uniqueAttStudents = [];
        uniqueAllocs.filter(a => a.status === "Active").forEach((a) => {
          const k = a.studentId ? `sid-${a.studentId}` : (a.admissionNo ? `adm-${String(a.admissionNo).trim().toLowerCase()}` : `id-${a.id}`);
          if (!seenAtt.has(k)) {
            seenAtt.add(k);
            uniqueAttStudents.push({
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
            });
          }
        });
        setAttendanceStudents(uniqueAttStudents);

        derivedStudents = uniqueAllocs.map((a) => ({
          id: a.studentId || a.id,
          studentId: a.studentId || a.id,
          name: a.studentName,
          fullName: a.studentName,
          admissionNo: a.admissionNo,
          gender: a.gender,
          blockName: a.blockName,
          room: a.room,
          bed: a.bed,
          isEnrolled: true,
        }));
      }
      if (outpassRes.status === "fulfilled") {
        const rawOutpass = extractCollection(outpassRes.value?.data);
        const mappedOutpass = Array.isArray(rawOutpass) ? rawOutpass.map(mapOutpass) : [];
        const uniqueOutpass = Array.from(new Map(mappedOutpass.map((o) => [String(o.id), o])).values());
        setOutpasses(uniqueOutpass);
      }
      if (transferRes.status === "fulfilled") {
        const rawTransfer = extractCollection(transferRes.value?.data);
        const mappedTransfer = Array.isArray(rawTransfer) ? rawTransfer.map(mapTransfer) : [];
        const uniqueTransfer = Array.from(new Map(mappedTransfer.map((t) => [String(t.id), t])).values());
        setTransfers(uniqueTransfer);
      }
      if (dashRes.status === "fulfilled") {
        setDashboardData(dashRes.value?.data?.data ?? dashRes.value?.data ?? null);
      }
      let loadedStaff = [];
      if (hostelStaffRes?.status === "fulfilled" && hostelStaffRes.value?.data) {
        const rawHostelStaff = extractCollection(hostelStaffRes.value.data);
        if (Array.isArray(rawHostelStaff)) loadedStaff = [...rawHostelStaff];
      }
      if (staffRes.status === "fulfilled" && staffRes.value?.data) {
        const rawStaff = extractCollection(staffRes.value.data);
        if (Array.isArray(rawStaff)) {
          rawStaff.forEach((s) => {
            const sId = Number(s.staffId || s.id);
            const idx = loadedStaff.findIndex((ls) => Number(ls.staffId || ls.id) === sId);
            if (idx >= 0) {
              loadedStaff[idx] = { ...s, ...loadedStaff[idx] };
            } else {
              loadedStaff.push(s);
            }
          });
        }
      }
      if (staffDropRes?.status === "fulfilled" && staffDropRes.value?.data) {
        const dropStaff = extractCollection(staffDropRes.value.data);
        if (Array.isArray(dropStaff)) {
          dropStaff.forEach((ds) => {
            const dsId = Number(ds.staffId || ds.id);
            const idx = loadedStaff.findIndex((s) => Number(s.staffId || s.id) === dsId);
            if (idx >= 0) {
              loadedStaff[idx] = { ...ds, ...loadedStaff[idx] };
            } else {
              loadedStaff.push(ds);
            }
          });
        }
      }
      // Strictly filter to Hostel Warden & Assistant Warden candidates
      const wardenStaffCandidates = loadedStaff.filter((s) => {
        if (!s) return false;
        const desig = String(s.designation || s.role || "").toLowerCase().trim();
        const dept = String(s.department || s.departmentName || "").toLowerCase().trim();

        // 1. HARD EXCLUSION: Never allow bus drivers, conductors, accountants, librarians, teachers, peons, etc.
        const isExcluded = /driver|conductor|transport|librarian|accountant|accounts|finance|principal|electrician|plumber|mechanic|peon|cleaner|sweeper|cook|faculty|lecturer|professor/i.test(desig) ||
          /transport|library|accounts|finance/i.test(dept);
        if (isExcluded) return false;

        // 2. HARD INCLUSION: Must be Warden, Assistant Warden, Chief Warden, Caretaker, or in Hostel department
        const isWarden = /warden|caretaker/i.test(desig) || dept.includes("hostel");
        return isWarden;
      });
      setCandidateStaff(wardenStaffCandidates);
      if (admRes.status === "fulfilled" && admRes.value?.data) {
        const rawAdm = extractCollection(admRes.value.data);
        if (Array.isArray(rawAdm) && rawAdm.length > 0) setCandidateAdmissions(rawAdm);
      }
      let loadedStudents = [];
      if (allStudentsRes?.status === "fulfilled" && allStudentsRes.value?.data) {
        const rawStudents = extractCollection(allStudentsRes.value.data);
        if (Array.isArray(rawStudents) && rawStudents.length > 0) {
          loadedStudents = rawStudents.map((s) => ({ ...s, isEnrolled: true }));
        }
      }
      if (certStudentsRes.status === "fulfilled" && certStudentsRes.value?.data) {
        const rawCert = extractCollection(certStudentsRes.value.data);
        if (Array.isArray(rawCert) && rawCert.length > 0) {
          if (loadedStudents.length === 0) {
            loadedStudents = rawCert.map((s) => ({
              ...s,
              isEnrolled: !isUnenrolledAdmissionCandidate(s),
            }));
          } else {
            const existingIds = new Set(loadedStudents.map((s) => Number(s.studentId || s.id)));
            const extra = rawCert.filter((cs) => {
              const csId = Number(cs.studentId || cs.id);
              return csId && !existingIds.has(csId);
            }).map((s) => ({ ...s, isEnrolled: !isUnenrolledAdmissionCandidate(s) }));
            loadedStudents = [...loadedStudents, ...extra];
          }
        }
      }
      if (loadedStudents.length === 0 && derivedStudents.length > 0) {
        loadedStudents = derivedStudents;
      }
      if (loadedStudents.length > 0) setCandidateStudents(loadedStudents);
      if (attRes?.status === "fulfilled" && attRes.value?.data) {
        const rawAtt = extractCollection(attRes.value.data);
        const mappedAtt = Array.isArray(rawAtt) ? rawAtt.map(mapAttendanceRecord).filter(Boolean) : [];
        setAttendanceRecords(mappedAtt);
      }
    } catch (err) {
      setApiError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [canAccessAdminEndpoints, mapBlock, mapCategory, mapRoom, mapBed, mapWarden, mapAllocation, mapOutpass, mapTransfer, mapAttendanceRecord]);

  const hasFetchedInitialRef = useRef(false);
  useEffect(() => {
    if (hasFetchedInitialRef.current) return;
    hasFetchedInitialRef.current = true;
    fetchHostelData();
  }, [fetchHostelData]);

  // Helper to refresh a specific entity list after mutation
  const refreshBlocks = useCallback(async () => {
    try {
      const res = await hostelApi.getHostelBlocks();
      const raw = extractCollection(res?.data);
      if (Array.isArray(raw)) {
        const uniqueBlocks = Array.from(new Map(raw.map(mapBlock).map((b) => [String(b.id || b.code), b])).values());
        setBlocks(uniqueBlocks);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapBlock]);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await hostelApi.getRoomTypes();
      const raw = extractCollection(res?.data);
      if (Array.isArray(raw)) {
        const uniqueCats = Array.from(new Map(raw.map(mapCategory).map((c) => [String(c.id || c.name), c])).values());
        categoriesRef.current = uniqueCats;
        setCategories(uniqueCats);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapCategory]);

  const refreshRooms = useCallback(async () => {
    try {
      const res = await hostelApi.getRooms();
      const raw = extractCollection(res?.data);
      if (Array.isArray(raw)) {
        const uniqueRooms = Array.from(new Map(raw.map((r) => mapRoom(r, blocksRef.current, categoriesRef.current)).map((r) => [String(r.id || `${r.hostelId}-${r.roomNo}`), r])).values());
        setRooms(uniqueRooms);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapRoom]);

  const refreshBeds = useCallback(async () => {
    try {
      const res = await hostelApi.getBeds();
      const raw = extractCollection(res?.data);
      if (Array.isArray(raw)) {
        const uniqueBeds = Array.from(new Map(raw.map(mapBed).map((bd) => [String(bd.id || `${bd.roomId}-${bd.bedNumber}`), bd])).values());
        setBeds(uniqueBeds);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapBed]);

  const refreshWardens = useCallback(async () => {
    try {
      const res = await hostelApi.getWardens();
      const raw = extractCollection(res?.data);
      if (Array.isArray(raw)) {
        const uniqueWardens = Array.from(new Map(raw.map(mapWarden).map((w) => [String(w.id || `${w.hostelId}-${w.staffId}`), w])).values());
        setWardens(uniqueWardens);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapWarden]);

  const refreshAllocations = useCallback(async () => {
    try {
      const res = await hostelApi.getStudentAllocations();
      const raw = extractCollection(res?.data);
      if (Array.isArray(raw)) {
        const mapped = raw.map(mapAllocation);
        const uniqueAllocs = Array.from(new Map(mapped.map((a) => [String(a.id || `${a.studentId}-${a.bedId}`), a])).values());
        setAllocations(uniqueAllocs);
        const seenAtt = new Set();
        const uniqueAttStudents = [];
        uniqueAllocs.filter(a => a.status === "Active").forEach((a) => {
          const k = a.studentId ? `sid-${a.studentId}` : (a.admissionNo ? `adm-${String(a.admissionNo).trim().toLowerCase()}` : `id-${a.id}`);
          if (!seenAtt.has(k)) {
            seenAtt.add(k);
            uniqueAttStudents.push({
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
            });
          }
        });
        setAttendanceStudents(uniqueAttStudents);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapAllocation]);

  const refreshOutpasses = useCallback(async () => {
    try {
      const res = await hostelApi.getOutpassLeave();
      const raw = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
      if (Array.isArray(raw)) {
        const uniqueOutpass = Array.from(new Map(raw.map(mapOutpass).map((o) => [String(o.id), o])).values());
        setOutpasses(uniqueOutpass);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapOutpass]);

  const refreshTransfers = useCallback(async () => {
    try {
      const res = await hostelApi.getTransferVacate();
      const raw = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
      if (Array.isArray(raw)) {
        const uniqueTransfer = Array.from(new Map(raw.map(mapTransfer).map((t) => [String(t.id), t])).values());
        setTransfers(uniqueTransfer);
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapTransfer]);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await hostelApi.getHostelDashboard();
      setDashboardData(res?.data?.data ?? res?.data ?? null);
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, []);

  const refreshAttendance = useCallback(async () => {
    try {
      const res = await hostelApi.getAttendance();
      const raw = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
      if (Array.isArray(raw)) setAttendanceRecords(raw.map(mapAttendanceRecord).filter(Boolean));
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
  }, [mapAttendanceRecord]);

  // ── Synchronize route location with initial tab ──────────────────────
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("master") || path.includes("block")) {
      setActiveMajorTab("setup");
      if (path.includes("category")) setActiveSetupSubtab("categories");
      else if (path.includes("room")) setActiveSetupSubtab("rooms");
      else if (path.includes("warden") && !path.includes("warden-dashboard")) setActiveSetupSubtab("wardens");
      else setActiveSetupSubtab("blocks");
    } else if (path.includes("room") || path.includes("bed")) {
      setActiveMajorTab("setup");
      setActiveSetupSubtab("rooms");
    } else if (path.includes("allocat")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("allocations");
    } else if (path.includes("attendance")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("attendance");
    } else if (path.includes("outpass") || path.includes("leave")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("outpasses");
    } else if (path.includes("transfer") || path.includes("vacat")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("transfers");
    } else if (path.includes("students") || path.includes("student-allocation")) {
      setActiveMajorTab("students");
      setActiveStudentSubtab("allocations");
    } else if (path.includes("report")) {
      setActiveMajorTab("reports");
    } else if (path.includes("hostel") || path.includes("warden")) {
      setActiveMajorTab("dashboard");
    }
  }, [location.pathname]);

  // ── Search & Filter State ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBlock, setFilterBlock] = useState("all");
  const [filterHostelRooms, setFilterHostelRooms] = useState("all");
  const [filterHostelWarden, setFilterHostelWarden] = useState("all");
  const [filterAcType, setFilterAcType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFloor, setFilterFloor] = useState("all");
  const [filterAllocSearch, setFilterAllocSearch] = useState("");
  const [filterAllocHostel, setFilterAllocHostel] = useState("all");
  const [filterAllocFloor, setFilterAllocFloor] = useState("all");
  const [filterAllocRoom, setFilterAllocRoom] = useState("all");
  const [blocksCurrentPage, setBlocksCurrentPage] = useState(1);
  const [roomsCurrentPage, setRoomsCurrentPage] = useState(1);
  const [wardensCurrentPage, setWardensCurrentPage] = useState(1);
  const [categoriesCurrentPage, setCategoriesCurrentPage] = useState(1);
  const [allocCurrentPage, setAllocCurrentPage] = useState(1);
  const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
  const [outpassCurrentPage, setOutpassCurrentPage] = useState(1);
  const [transferCurrentPage, setTransferCurrentPage] = useState(1);

  // Outpass & Leave Filter State
  const [outpassSearch, setOutpassSearch] = useState("");
  const [outpassStatus, setOutpassStatus] = useState("all");
  const [outpassType, setOutpassType] = useState("all");

  // Transfer & Vacate Filter State (Screenshots 1 & 2)
  const [transferSearch, setTransferSearch] = useState("");
  const [transferFilter, setTransferFilter] = useState("all");
  const [isTransferFilterOpen, setIsTransferFilterOpen] = useState(false);

  // Attendance specific state matching Screenshot 1 & 2
  const [attendanceShift, setAttendanceShift] = useState("night");
  const [attendanceDate, setAttendanceDate] = useState(getTodayDateStr);
  const [attendanceFrequency, setAttendanceFrequency] = useState("daily");
  const [attendanceMonth, setAttendanceMonth] = useState(getCurrentMonthStr);
  const [customRangeStart, setCustomRangeStart] = useState(() => `${getCurrentMonthStr()}-01`);
  const [customRangeEnd, setCustomRangeEnd] = useState(getTodayDateStr);
  const [appliedCustomRange, setAppliedCustomRange] = useState(() => ({
    start: `${getCurrentMonthStr()}-01`,
    end: getTodayDateStr(),
  }));
  const [rangeError, setRangeError] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceBlock, setAttendanceBlock] = useState("all");
  const [attendanceRoom, setAttendanceRoom] = useState("all");

  // Reset blocks pagination to page 1 whenever block filters or search query change
  useEffect(() => {
    setBlocksCurrentPage(1);
  }, [searchQuery, filterBlock]);

  // Reset room pagination to page 1 whenever search query or room filters change
  useEffect(() => {
    setRoomsCurrentPage(1);
  }, [searchQuery, filterHostelRooms, filterFloor, filterCategory, filterAcType]);

  // Reset wardens pagination to page 1 whenever search query or warden filters change
  useEffect(() => {
    setWardensCurrentPage(1);
  }, [searchQuery, filterHostelWarden]);

  // Reset categories pagination to page 1 whenever search query or category filters change
  useEffect(() => {
    setCategoriesCurrentPage(1);
  }, [searchQuery, filterAcType]);

  // Reset allocation pagination to page 1 whenever search query or alloc filters change
  useEffect(() => {
    setAllocCurrentPage(1);
  }, [filterAllocSearch, filterAllocHostel, filterAllocFloor, filterAllocRoom]);

  // Reset outpass pagination to page 1 whenever outpass search or filters change
  useEffect(() => {
    setOutpassCurrentPage(1);
  }, [outpassSearch, outpassStatus, outpassType]);

  // Reset transfer pagination to page 1 whenever transfer search or filter change
  useEffect(() => {
    setTransferCurrentPage(1);
  }, [transferSearch, transferFilter]);

  // Reset attendance pagination to page 1 whenever attendance search or filters change
  useEffect(() => {
    setAttendanceCurrentPage(1);
  }, [
    attendanceSearch,
    attendanceBlock,
    attendanceRoom,
    attendanceFrequency,
    attendanceShift,
    attendanceDate,
    attendanceMonth,
    appliedCustomRange,
  ]);

  // Dynamic academic & calendar month options guaranteed to include current month
  const resolvedMonthOptions = useMemo(() => {
    const curMonth = getCurrentMonthStr();
    const hasCurrent = academicMonthOptions.some((m) => m.value === curMonth);
    if (!hasCurrent) {
      const [y, m] = curMonth.split("-");
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const monthName = d.toLocaleString("default", { month: "long" });
      const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      return [
        {
          value: curMonth,
          label: `${monthName} ${y}`,
          rangeText: `${monthName.slice(0, 3)} 1, ${y} – ${monthName.slice(0, 3)} ${lastDay}, ${y}`,
        },
        ...academicMonthOptions,
      ];
    }
    return academicMonthOptions;
  }, []);

  // Synchronize attendanceRecords from server into attendanceMap for active date & shift
  useEffect(() => {
    if (!attendanceDate || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) return;
    const sessionLabel = attendanceShift === "morning" ? "Morning" : "Night";
    const dayRecords = attendanceRecords.filter((r) => {
      const rDate = r.attendanceDate || r.date;
      const rSession = (r.session || "").toLowerCase();
      return rDate === attendanceDate && (rSession.startsWith(attendanceShift[0]) || r.session === sessionLabel);
    });

    if (dayRecords.length > 0) {
      setAttendanceMap((prev) => {
        const updatedShift = { ...prev[attendanceShift] };
        dayRecords.forEach((r) => {
          const st = attendanceStudents.find(
            (s) =>
              (r.studentId && Number(s.studentId) === Number(r.studentId)) ||
              (r.admissionNo && s.admissionNo === r.admissionNo) ||
              s.id === r.studentId ||
              String(s.id) === String(r.studentId)
          );
          const key = st ? st.id : (r.admissionNo || r.studentId);
          if (key) {
            updatedShift[key] = {
              status: r.status,
              inTime:
                r.inTime ||
                (r.status === "Present" || r.status === "Half Day"
                  ? attendanceShift === "morning"
                    ? "07:00"
                    : "20:00"
                  : "--"),
              remarks: r.remarks || "",
              attendanceId: r.attendanceId || r.id,
            };
          }
        });
        return { ...prev, [attendanceShift]: updatedShift };
      });
    }
  }, [attendanceDate, attendanceShift, attendanceRecords, attendanceStudents]);

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
        (db) => Number(db.hostelId) === Number(b.id) || db.hostelCode === b.code || db.hostelName === b.name
      );
      const blockRooms = rooms.filter(
        (r) => Number(r.hostelId) === Number(b.id) || r.block === b.name || r.blockName === b.name || r.block === b.code
      );
      const totalRoomsCount = dbBlock?.totalRooms ?? blockRooms.length;
      const blockBeds = beds.filter((bd) => Number(bd.hostelId) === Number(b.id) || blockRooms.some((r) => Number(r.id) === Number(bd.roomId)));
      const totalBedsCount = dbBlock?.totalBeds ?? (blockBeds.length > 0 ? blockBeds.length : blockRooms.reduce((acc, r) => acc + (Number(r.capacity) || 1), 0));
      const occupiedCount = dbBlock?.occupiedBeds ?? allocations.filter((a) => (Number(a.hostelId) === Number(b.id) || a.blockName === b.name || a.blockCode === b.code) && a.status === "Active").length;
      const vacantCount = dbBlock?.availableBeds ?? Math.max(0, totalBedsCount - occupiedCount);
      const assignedWarden = wardens.find((w) => (w.status || "").toLowerCase() === "active" && (Number(w.hostelId) === Number(b.id) || String(w.hostelId) === String(b.id) || w.assignedHostels === b.name || (w.assignedHostels || "").includes(b.name)));
      const staffForWarden = assignedWarden && (!assignedWarden.name || assignedWarden.name === "Resident Warden")
        ? candidateStaff.find((s) => Number(s.staffId || s.id) === Number(assignedWarden.staffId))
        : null;
      const blockWardenName = (assignedWarden?.name && assignedWarden.name !== "Resident Warden") ? assignedWarden.name : (staffForWarden?.fullName || staffForWarden?.name || assignedWarden?.name || b.warden || b.wardenName || "Unassigned");
      const blockWardenPhone = assignedWarden?.phone || assignedWarden?.mobileNumber || staffForWarden?.phone || staffForWarden?.mobileNumber || b.wardenPhone || b.primaryMobileNumber || "-";

      return {
        ...b,
        totalRooms: totalRoomsCount,
        totalBeds: totalBedsCount,
        occupiedBeds: occupiedCount,
        vacantBeds: vacantCount,
        warden: blockWardenName,
        wardenPhone: blockWardenPhone,
      };
    });
  }, [blocks, dashboardData, rooms, beds, allocations, wardens, candidateStaff]);

  // ── Enriched Categories with Live Room & Bed Counts & Block Availability ───
  const enrichedCategories = useMemo(() => {
    return categories.map((cat) => {
      const catRooms = rooms.filter(
        (r) =>
          (cat.id && Number(r.roomTypeId) === Number(cat.id)) ||
          r.type === cat.name ||
          r.roomTypeSpecification === cat.name ||
          (cat.specification && (r.type === cat.specification || r.roomTypeSpecification === cat.specification))
      );
      const roomCount = catRooms.length;

      const catRoomIds = new Set(catRooms.map((r) => Number(r.id)).filter(Boolean));
      const catBeds = beds.filter((bd) => catRoomIds.has(Number(bd.roomId)));
      const bedCount =
        catBeds.length > 0
          ? catBeds.length
          : catRooms.reduce((acc, r) => acc + (Number(r.capacity) || Number(cat.capacity) || 1), 0);

      const blockNames = Array.from(
        new Set(
          catRooms
            .map((r) => r.blockName || r.block)
            .filter((b) => b && b !== "—" && !b.startsWith("Hostel Block #"))
        )
      );
      const blocksDisplay =
        blockNames.length > 0
          ? blockNames.join(", ")
          : (cat.blocks || "—");

      return {
        ...cat,
        totalRooms: roomCount,
        totalBeds: bedCount,
        blocks: blocksDisplay,
      };
    });
  }, [categories, rooms, beds]);

  // Synchronize dashboard selected block with available enrichedBlocks to prevent stale selections
  useEffect(() => {
    if (dashBlockSearch && enrichedBlocks.length > 0) {
      const exists = enrichedBlocks.some(
        (b) => String(b.id) === String(dashBlockSearch) || b.code === dashBlockSearch
      );
      if (!exists) {
        setDashBlockSearch("");
      }
    }
  }, [dashBlockSearch, enrichedBlocks]);

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

  // Students who opted for hostel during admission or registration and await room allocation
  const unallocatedHostelStudents = useMemo(() => {
    const activeAllocStudentIds = new Set();
    allocations.forEach((a) => {
      if (String(a.status || "").toLowerCase() === "active") {
        if (a.studentId) activeAllocStudentIds.add(String(a.studentId));
        if (a.admissionNo) activeAllocStudentIds.add(String(a.admissionNo).trim().toLowerCase());
      }
    });

    const list = [];
    const seen = new Set();

    const considerStudent = (st) => {
      if (!st) return;
      const sId = st.studentId || st.id || st.admissionId;
      const admNo = String(st.admissionNo || st.admissionNumber || "").trim();
      const sName = st.studentName || [st.firstName, st.middleName, st.lastName].filter(Boolean).join(" ") || st.name || "";
      const dedupe = (sId ? `id-${sId}` : "") || (admNo ? `adm-${admNo.toLowerCase()}` : "") || `name-${sName.toLowerCase()}`;
      if (!dedupe || seen.has(dedupe)) return;

      // Check if opted for hostel - strictly exclude day scholars
      const sType = String(st.studentType || st.facilityType || "").toLowerCase();
      const isDayScholar = ["non-residential", "non residential", "day scholar", "dayscholar", "day-scholar"].includes(sType) ||
        String(st.transportRequired || "").toLowerCase() === "yes" ||
        st.isResidential === false || String(st.isResidential).toLowerCase() === "false";
      const isResidential = ["residential", "hostel", "hosteller"].includes(sType) || st.isResidential === true || String(st.isResidential).toLowerCase() === "true" || st.isHostelOpted;
      const prefBlock = st.hostelBlock || st.hostelBlockName || st.preferredBlockName || st.blockName || "";
      const prefRoom = st.hostelRoom || st.hostelRoomName || st.preferredRoomType || st.roomType || "";
      const hasHostelPref = Boolean(prefBlock && String(prefBlock).toLowerCase() !== "none" && String(prefBlock).toLowerCase() !== "null");

      if (isDayScholar && !hasHostelPref) return;
      if (!isResidential && !hasHostelPref) return;

      // Check if already allocated
      if (sId && activeAllocStudentIds.has(String(sId))) return;
      if (admNo && activeAllocStudentIds.has(admNo.toLowerCase())) return;

      seen.add(dedupe);

      // Match preferred block to actual block
      const matchedBlock = blocks.find((b) =>
        (prefBlock && (String(b.name || "").toLowerCase() === String(prefBlock).toLowerCase() || String(b.code || "").toLowerCase() === String(prefBlock).toLowerCase())) ||
        (st.hostelId && String(b.id) === String(st.hostelId))
      );

      list.push({
        studentId: sId,
        admissionNo: admNo,
        studentName: sName || (admNo ? `Student #${admNo}` : `Student #${sId}`),
        className: st.programName || st.courseName || st.className || "Hostel Resident",
        preferredBlockName: matchedBlock?.name || prefBlock || "",
        preferredBlockCode: matchedBlock?.code || "",
        hostelId: matchedBlock?.id || st.hostelId || "",
        preferredRoomType: prefRoom || "",
        gender: st.gender || "",
      });
    };

    if (Array.isArray(candidateStudents)) candidateStudents.forEach(considerStudent);
    if (Array.isArray(candidateAdmissions)) candidateAdmissions.forEach(considerStudent);

    try {
      const localAdms = JSON.parse(localStorage.getItem("studentAdmissionRecords") || "[]");
      if (Array.isArray(localAdms)) {
        localAdms.forEach((entry) => {
          const x = { ...(entry.raw || {}), ...(entry.values || {}), ...entry };
          considerStudent(x);
        });
      }
    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }

    return list;
  }, [allocations, candidateStudents, candidateAdmissions, blocks]);

  // ── Block CRUD ──────────────────────────────────────────────────────
  const handleSaveBlock = async (blockData) => {
    if (isSavingBlockRef.current) return;
    isSavingBlockRef.current = true;
    try {
      const name = String(blockData.name || blockData.hostelName || "").trim();
      const code = String(blockData.code || blockData.hostelCode || "").trim().toUpperCase();
      const type = String(blockData.type || blockData.hostelType || "Boys").trim();
      const floors = Math.max(1, Math.min(50, Number(blockData.floors || blockData.totalFloors) || 1));
      const address = String(blockData.address || blockData.location || "").trim();
      const status = String(blockData.status || "Active").trim();

      if (!name) {
        showToast("Block name is required.", "warning");
        return;
      }
      if (!code) {
        showToast("Block code is required.", "warning");
        return;
      }

      const isEdit = modal.mode === "edit";
      const isDuplicate = blocks.some((b) => {
        if (isEdit && (String(b.id) === String(blockData.id) || String(b.hostelId) === String(blockData.id))) return false;
        return (b.code || b.hostelCode || "").trim().toUpperCase() === code;
      });

      if (isDuplicate) {
        showToast(`Hostel code "${code}" already exists in the system. Please choose a unique block code.`, "warning");
        return;
      }

      const payload = {
        campusId: Number(window.localStorage.getItem("cms_selected_campus_id")) || 1,
        hostelName: name,
        hostelCode: code,
        hostelType: type,
        totalFloors: floors,
        address,
        status,
      };

      if (isEdit) {
        await hostelApi.updateHostelBlock(blockData.id, payload, { skipErrorLog: true });
        showToast(`Block ${name} updated successfully!`);
      } else {
        await hostelApi.createHostelBlock(payload, { skipErrorLog: true });
        showToast(`Hostel block ${name} added successfully!`);
      }
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      showToast(getApiErrorMessage(err) || "Failed to save hostel block.", "danger");
    } finally {
      isSavingBlockRef.current = false;
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
          await hostelApi.deleteHostelBlock(block.id, { skipErrorLog: true });
          await refreshBlocks();
          await refreshDashboard();
          closeConfirm();
          showToast(`Hostel block ${block.name} deleted.`);
        } catch (err) {
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
      const targetHostelId = Number(block.id || block.hostelId);
      const generatedLocalRooms = [];
      const generatedLocalBeds = [];

      for (const fc of floorConfigs) {
        let roomIndexOnFloor = 1;
        const addRooms = async (count, catName, bedCapacity, acMode = "Non-AC") => {
          const matchCatObj = categories.find((c) =>
            (Number(c.capacity) === bedCapacity && (c.acType || "").toLowerCase() === (acMode || "").toLowerCase()) ||
            Number(c.capacity) === bedCapacity ||
            (catName && c.name && String(c.name).toLowerCase().includes(String(catName).toLowerCase()))
          ) || categories[0];
          const matchCat = matchCatObj?.id || defaultRoomType;

          for (let i = 0; i < count; i++) {
            const roomNum = fc.floorIndex === 0
              ? `${String(roomIndexOnFloor).padStart(3, "0")}`
              : `${fc.floorIndex}${String(roomIndexOnFloor).padStart(2, "0")}`;

            let newRoomId = null;
            const existingRoom = rooms.find(
              (r) => (Number(r.hostelId) === targetHostelId || r.block === block.code) &&
                     String(r.roomNo || r.roomNumber).replace(/^Room #/i, "").trim().toLowerCase() === roomNum.toLowerCase()
            );

            if (existingRoom) {
              newRoomId = existingRoom.id;
            } else {
              try {
                const roomRes = await hostelApi.createRoom({
                  hostelId: targetHostelId,
                  roomTypeId: Number(matchCat),
                  floorLevel: fc.floorLabel || `Floor ${fc.floorIndex || 1}`,
                  roomNumber: roomNum,
                  status: "Active",
                }, { skipErrorLog: true });
                newRoomId = roomRes?.data?.data?.roomId ?? roomRes?.data?.roomId ?? roomRes?.data?.data?.id ?? roomRes?.data?.id;
              } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
            }

            const roomUid = newRoomId || `rm-${block.code || block.id}-${roomNum}-${Date.now()}-${i}`;
            const bedsToGen = Math.max(1, Number(matchCatObj?.capacity ?? bedCapacity ?? 1));

            const existingBedNumbers = new Set(
              beds
                .filter((b) => Number(b.roomId) === Number(newRoomId))
                .map((b) => String(b.bedNumber || "").trim().toLowerCase())
            );
            if (Array.isArray(existingRoom?.beds)) {
              existingRoom.beds.forEach((b) => {
                const num = String(b.bedNumber || b.bed || "").trim().toLowerCase();
                if (num) existingBedNumbers.add(num);
              });
            }

            for (let bi = 1; bi <= bedsToGen; bi++) {
              const bedNum = `BED-${bi}`;
              const alreadyExists = existingBedNumbers.has(bedNum.toLowerCase()) || existingBedNumbers.has(String(bi).toLowerCase());
              if (newRoomId && !alreadyExists) {
                try {
                  await hostelApi.createBed({
                    roomId: Number(newRoomId),
                    bedNumber: bedNum,
                    bedStatus: "Available",
                    status: "Active",
                  }, { skipErrorLog: true });
                  existingBedNumbers.add(String(bedNum || "").toLowerCase());
                } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
              }
              generatedLocalBeds.push({
                id: `bed-${roomUid}-${bi}`,
                roomId: roomUid,
                bedNumber: bedNum,
                bedStatus: "Available",
                status: "Active",
              });
            }

            generatedLocalRooms.push({
              id: roomUid,
              roomNo: roomNum,
              block: block.code || block.name,
              blockName: block.name,
              hostelId: targetHostelId,
              roomTypeId: Number(matchCat),
              floor: fc.floorLabel,
              type: matchCatObj?.name || `${catName} (${acMode || "Non-AC"})`,
              capacity: bedsToGen,
              occupied: 0,
              fee: matchCatObj?.fee || (acMode === "AC" ? "₹7,500/mo" : "₹6,000/mo"),
              status: "Active",
            });

            roomIndexOnFloor++;
          }
        };

        if (fc.singleSharing > 0) await addRooms(fc.singleSharing, "Single", 1, fc.singleAc);
        if (fc.doubleSharing > 0) await addRooms(fc.doubleSharing, "Double", 2, fc.doubleAc);
        if (fc.tripleSharing > 0) await addRooms(fc.tripleSharing, "Triple", 3, fc.tripleAc);
        if (fc.fourSharing > 0) await addRooms(fc.fourSharing, "Four", 4, fc.fourAc);
        if (Array.isArray(fc.customAllocations)) {
          for (const ca of fc.customAllocations) {
            const roomsCount = Number(ca.rooms) || 0;
            const bedsPerRoom = Number(ca.beds) || 1;
            if (roomsCount > 0) {
              await addRooms(roomsCount, ca.name || "Custom Suite", bedsPerRoom, ca.ac || "AC");
            }
          }
        }
      }

      if (generatedLocalRooms.length > 0) {
        setRooms((prev) => {
          const map = new Map();
          prev.forEach((r) => map.set(`${r.hostelId || r.block}-${r.roomNo}`, r));
          generatedLocalRooms.forEach((r) => map.set(`${r.hostelId || r.block}-${r.roomNo}`, r));
          return Array.from(map.values());
        });
      }
      if (generatedLocalBeds.length > 0) {
        setBeds((prev) => [...prev, ...generatedLocalBeds.filter((gb) => !prev.some((b) => b.id === gb.id))]);
      }

      await refreshRooms();
      await refreshBeds();
      await refreshBlocks();
      await refreshDashboard();
      showToast(`Room sharing configuration and beds saved for ${block.name}!`);
      closeModal();
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Category CRUD ───────────────────────────────────────────────────
  const handleSaveCategory = async (catData) => {
    if (isSavingCategoryRef.current) return;
    isSavingCategoryRef.current = true;
    try {
      const isAc = (catData.type?.includes("AC") || catData.name?.includes("AC") || catData.acType === "AC") &&
                   !catData.type?.includes("Non-AC") && !catData.name?.includes("Non-AC") && catData.acType !== "Non-AC";
      const cleanFee = Number(String(catData.fee || catData.monthlyFee || catData.standardMonthlyFee || "").replace(/[^0-9.]/g, "")) || 0;
      const payload = {
        roomTypeSpecification: catData.name || catData.specification || "Standard Room",
        bedCapacity: Number(catData.capacity) || 2,
        acType: isAc ? "AC" : "Non-AC",
        standardMonthlyFee: cleanFee,
        monthlyFee: cleanFee,
        fee: cleanFee,
        status: catData.status || "Active",
        description: catData.specification || catData.description || catData.type || "",
      };

      if (catData.status === "Inactive") {
        const hasActiveRooms = rooms.some(
          (r) =>
            ((catData.id && Number(r.roomTypeId) === Number(catData.id)) ||
             r.type === catData.name ||
             r.roomTypeSpecification === catData.name) &&
            (r.status || "Active").toLowerCase() === "active"
        );
        if (hasActiveRooms) {
          showToast(`Cannot deactivate category "${catData.name}": Active rooms are assigned to this category.`, "warning");
          return;
        }
      }

      if (modal.mode === "edit") {
        await hostelApi.updateRoomType(catData.id, payload, { skipErrorLog: true });
        showToast(`Category ${catData.name} updated.`);
      } else {
        await hostelApi.createRoomType(payload, { skipErrorLog: true });
        showToast(`Room category ${catData.name} created.`);
      }
      await refreshCategories();
      await refreshRooms();
      closeModal();
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    } finally {
      isSavingCategoryRef.current = false;
    }
  };

  const handleDeleteCategory = (cat) => {
    const hasRooms = rooms.some(
      (r) =>
        (cat.id && Number(r.roomTypeId) === Number(cat.id)) ||
        r.type === cat.name ||
        r.roomTypeSpecification === cat.name ||
        (cat.specification && (r.type === cat.specification || r.roomTypeSpecification === cat.specification))
    );
    if (hasRooms) {
      const roomCount = rooms.filter(
        (r) =>
          (cat.id && Number(r.roomTypeId) === Number(cat.id)) ||
          r.type === cat.name ||
          r.roomTypeSpecification === cat.name
      ).length;
      showToast(`Cannot delete category "${cat.name}": ${roomCount} room(s) are currently assigned to this category.`, "danger");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Delete Room Category",
      message: `Delete category "${cat.name}"? This action cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await hostelApi.deleteRoomType(cat.id, { skipErrorLog: true });
          await refreshCategories();
          closeConfirm();
          showToast(`Category ${cat.name} removed.`);
        } catch (err) {
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Room CRUD ───────────────────────────────────────────────────────
  const handleSaveRoom = async (roomData) => {
    if (isSavingRoomRef.current) return;
    isSavingRoomRef.current = true;
    try {
      const blk = blocks.find((b) =>
        String(b.id) === String(roomData.hostelId) ||
        String(b.id) === String(roomData.block) ||
        b.code === roomData.block ||
        b.name === roomData.block ||
        b.name === roomData.blockName
      );
      const hostelId = blk ? Number(blk.id) : (Number(blocks[0]?.id) || 1);

      const cat = categories.find((c) =>
        String(c.id) === String(roomData.roomTypeId) ||
        String(c.id) === String(roomData.type) ||
        c.name === roomData.type ||
        c.name?.toLowerCase() === String(roomData.type || "").toLowerCase()
      ) || categories[0];
      const roomTypeId = cat ? Number(cat.id) : 1;

      // Parse single room (101), range (101-105), or comma-separated list (101, 102, 103)
      const parseRoomNumbers = (inputStr) => {
        if (!inputStr) return [];
        const parts = String(inputStr).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
        const result = [];
        for (const part of parts) {
          const clean = part.replace(/^Room\s*#?\s*/i, "").trim();
          const rangeMatch = clean.match(/^(\d+)\s*-\s*(\d+)$/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            const minVal = Math.min(start, end);
            const maxVal = Math.max(start, end);
            const padLen = rangeMatch[1].length;
            for (let num = minVal; num <= maxVal && (num - minVal) < 50; num++) {
              result.push(String(num).padStart(padLen, "0"));
            }
          } else if (clean) {
            result.push(clean);
          }
        }
        return [...new Set(result)];
      };

      const roomNumbers = modal.mode === "edit"
        ? [String(roomData.roomNo || roomData.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim()]
        : parseRoomNumbers(roomData.roomNo || roomData.roomNumber);

      if (roomNumbers.length === 0) {
        showToast("Please enter a valid room number (e.g. 101 or 101-105).", "warning");
        return;
      }

      const resolveCategoryForRoom = (catList, acType, cap) => {
        const isAc = acType === "AC";
        const isCatAc = (c) => {
          const cType = String(c.type || "").toLowerCase();
          const cAc = String(c.acType || "").toLowerCase();
          const cName = String(c.name || "").toLowerCase();
          const cSpec = String(c.specification || "").toLowerCase();
          if (cAc === "ac") return true;
          if (cAc === "non-ac") return false;
          if ((cType.includes("ac") || cName.includes("ac") || cSpec.includes("ac")) &&
              !cType.includes("non-ac") && !cName.includes("non-ac") && !cSpec.includes("non-ac")) {
            return true;
          }
          return false;
        };
        const exact = catList.find((c) => isCatAc(c) === isAc && Number(c.capacity) === Number(cap));
        if (exact) return exact;
        const acMatch = catList.find((c) => isCatAc(c) === isAc);
        if (acMatch) return acMatch;
        return catList[0] || null;
      };

      if (modal.mode === "edit") {
        const singleNumber = roomNumbers[0];
        const targetAc = roomData.acType || "AC";
        const rCat = resolveCategoryForRoom(categories, targetAc, roomData.capacity) || cat;
        const targetRoomTypeId = rCat ? Number(rCat.id) : Number(roomTypeId);
        const payload = {
          hostelId: Number(hostelId),
          roomTypeId: targetRoomTypeId,
          floorLevel: roomData.floor || "Floor 1",
          roomNumber: singleNumber,
          status: roomData.status || "Active",
          acType: targetAc,
          bedCapacity: Number(roomData.capacity) || 2,
        };
        await hostelApi.updateRoom(roomData.id, payload, { skipErrorLog: true });
        showToast(`Room #${singleNumber} updated.`);
      } else {
        let createdCount = 0;
        let duplicateCount = 0;
        let updatedCount = 0;
        for (const rNum of roomNumbers) {
          const cleanTarget = String(rNum).replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
          const targetNum = parseInt(cleanTarget, 10);

          // Check if room number already exists in this hostel block
          const existingRoom = rooms.find((r) => {
            const matchesBlock =
              (r.hostelId && Number(r.hostelId) === Number(hostelId)) ||
              (blk?.code && r.block && String(r.block).trim().toLowerCase() === String(blk.code).trim().toLowerCase()) ||
              (blk?.name && r.blockName && String(r.blockName).trim().toLowerCase() === String(blk.name).trim().toLowerCase());
            if (!matchesBlock) return false;
            const rClean = String(r.roomNo || r.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
            const rParsed = parseInt(rClean, 10);
            return rClean === cleanTarget || (!isNaN(targetNum) && !isNaN(rParsed) && targetNum === rParsed);
          });

          // Determine specific AC vs Non-AC for this individual room
          const targetAc = roomData.roomAcMap?.[rNum] || roomData.acType || "Non-AC";
          const rCat = resolveCategoryForRoom(categories, targetAc, roomData.capacity) || cat;
          const targetRoomTypeId = rCat ? Number(rCat.id) : Number(roomTypeId);

          if (existingRoom) {
            // Update existing room's AC classification and bed capacity
            try {
              await hostelApi.updateRoom(existingRoom.id, {
                hostelId: Number(hostelId),
                roomTypeId: targetRoomTypeId,
                floorLevel: roomData.floor || existingRoom.floor || "Floor 1",
                roomNumber: rNum,
                status: existingRoom.status || "Active",
                acType: targetAc,
                bedCapacity: Number(roomData.capacity) || Number(existingRoom.capacity) || 2,
              }, { skipErrorLog: true });
              updatedCount++;
            } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
            continue;
          }

          const payload = {
            hostelId: Number(hostelId),
            roomTypeId: targetRoomTypeId,
            floorLevel: roomData.floor || "Floor 1",
            roomNumber: rNum,
            status: roomData.status || "Active",
            acType: targetAc,
            bedCapacity: Number(roomData.capacity) || 2,
          };

          try {
            const roomRes = await hostelApi.createRoom(payload, { skipErrorLog: true });
            const newRoomId = roomRes?.data?.data?.roomId ?? roomRes?.data?.roomId ?? roomRes?.data?.data?.id ?? roomRes?.data?.id;
            if (newRoomId) {
              const existingBedNumbers = new Set(
                beds
                  .filter((b) => Number(b.roomId) === Number(newRoomId))
                  .map((b) => String(b.bedNumber || "").trim().toLowerCase())
              );
              const cap = Math.max(1, Number(roomData.capacity ?? cat?.capacity ?? 2));
              for (let bi = 1; bi <= cap; bi++) {
                const bedNum = `BED-${bi}`;
                if (!existingBedNumbers.has(bedNum.toLowerCase()) && !existingBedNumbers.has(String(bi).toLowerCase())) {
                  try {
                    await hostelApi.createBed({
                      roomId: Number(newRoomId),
                      bedNumber: bedNum,
                      bedStatus: "Available",
                      status: "Active",
                    }, { skipErrorLog: true });
                    existingBedNumbers.add(String(bedNum || "").toLowerCase());
                  } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
                }
              }
            }
            createdCount++;
          } catch (createErr) {
            const errMsg = getApiErrorMessage(createErr);
            if (errMsg && errMsg.toLowerCase().includes("already exist")) {
              duplicateCount++;
            }
          }
        }

        // Also update any other rooms on this floor that were customized in roomAcMap
        if (roomData.roomAcMap && typeof roomData.roomAcMap === "object") {
          for (const [rNum, targetAc] of Object.entries(roomData.roomAcMap)) {
            if (roomNumbers.includes(rNum)) continue;
            const cleanTarget = String(rNum).replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
            const targetNum = parseInt(cleanTarget, 10);
            const er = rooms.find((r) => {
              const matchesBlock =
                (r.hostelId && Number(r.hostelId) === Number(hostelId)) ||
                (blk?.code && r.block && String(r.block).trim().toLowerCase() === String(blk.code).trim().toLowerCase()) ||
                (blk?.name && r.blockName && String(r.blockName).trim().toLowerCase() === String(blk.name).trim().toLowerCase());
              if (!matchesBlock) return false;
              const rClean = String(r.roomNo || r.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
              const rParsed = parseInt(rClean, 10);
              return rClean === cleanTarget || (!isNaN(targetNum) && !isNaN(rParsed) && targetNum === rParsed);
            });
            if (er && er.acType !== targetAc) {
              const rCat = resolveCategoryForRoom(categories, targetAc, er.capacity) || cat;
              try {
                await hostelApi.updateRoom(er.id, {
                  hostelId: Number(hostelId),
                  roomTypeId: rCat ? Number(rCat.id) : Number(roomTypeId),
                  floorLevel: er.floor || roomData.floor || "Floor 1",
                  roomNumber: er.roomNo || er.roomNumber || rNum,
                  status: er.status || "Active",
                  acType: targetAc,
                  bedCapacity: Number(er.capacity) || 2,
                }, { skipErrorLog: true });
                updatedCount++;
              } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
            }
          }
        }

        if (createdCount > 0 || updatedCount > 0) {
          const msgParts = [];
          if (createdCount > 0) msgParts.push(`added ${createdCount} room(s)`);
          if (updatedCount > 0) msgParts.push(`updated ${updatedCount} room(s)`);
          showToast(`Successfully ${msgParts.join(" and ")} on ${roomData.floor}!`);
          setSearchQuery("");
          setFilterHostelRooms("all");
          setFilterFloor("all");
          setFilterCategory("all");
          setRoomsCurrentPage(1);
        } else if (duplicateCount > 0) {
          showToast(`Room number already exists in ${blk?.name || "this hostel block"}.`, "warning");
          return;
        } else {
          showToast("Room configurations saved.", "success");
        }
      }

      await refreshRooms();
      await refreshBeds();
      await refreshCategories();
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    } finally {
      isSavingRoomRef.current = false;
    }
  };

  const handleDeleteRoom = (room) => {
    const roomBeds = beds.filter((b) => Number(b.roomId) === Number(room.id));
    const isOccupied = roomBeds.some((b) => (b.bedStatus || "").toLowerCase() === "occupied") ||
      allocations.some((a) => (a.status || "").toLowerCase() === "active" && Number(a.roomId) === Number(room.id));
    if (isOccupied) {
      showToast(`Room #${room.roomNo} has active resident allocations or occupied beds and cannot be deleted.`, "danger");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Delete Room",
      message: `Delete Room ${room.roomNo} in block ${room.blockName || room.block}?`,
      danger: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await hostelApi.deleteRoom(room.id, { skipErrorLog: true });
          await refreshRooms();
          await refreshBeds();
          await refreshCategories();
          await refreshBlocks();
          await refreshDashboard();
          setRoomsCurrentPage(1);
          closeConfirm();
          showToast(`Room ${room.roomNo} deleted.`);
        } catch (err) {
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Warden CRUD ─────────────────────────────────────────────────────
  const handleSaveWarden = async (wardenData) => {
    if (isSavingWardenRef.current) return;
    isSavingWardenRef.current = true;
    try {
      const staffId = Number(wardenData.staffId);
      if (!staffId || isNaN(staffId) || staffId <= 0) {
        showToast("Please select a valid hostel warden.", "warning");
        return;
      }

      // Collect target hostel block IDs (supports single or multiple hostels)
      let targetHostelIds = Array.isArray(wardenData.selectedHostelIds) && wardenData.selectedHostelIds.length > 0
        ? wardenData.selectedHostelIds.map(Number)
        : [];

      if (targetHostelIds.length === 0 && (wardenData.hostelId || wardenData.assignedHostels)) {
        const blk = blocks.find((b) =>
          String(b.id) === String(wardenData.hostelId) || b.name === wardenData.assignedHostels || b.code === wardenData.assignedHostels
        );
        if (blk?.id) targetHostelIds = [Number(blk.id)];
        else if (wardenData.hostelId) targetHostelIds = [Number(wardenData.hostelId)];
      }

      if (targetHostelIds.length === 0) {
        showToast("Please select at least one hostel block.", "warning");
        return;
      }

      const assignmentDate = wardenData.assignmentDate
        ? (wardenData.assignmentDate.includes("T") ? wardenData.assignmentDate : `${wardenData.assignmentDate}T00:00:00`)
        : new Date().toISOString();

      let savedBlocksCount = 0;
      for (const hostelId of targetHostelIds) {
        const existingBlockWarden = wardens.find(
          (w) => (w.status || "").toLowerCase() === "active" && Number(w.hostelId) === Number(hostelId)
        );

        // If this warden is already the active warden for this block, keep it active
        if (existingBlockWarden && Number(existingBlockWarden.staffId) === Number(staffId)) {
          savedBlocksCount++;
          continue;
        }

        const blk = blocks.find((b) => Number(b.id) === Number(hostelId));
        const blkName = blk?.name || wardenData.assignedHostels || `Hostel Block #${hostelId}`;
        const staffMember = (candidateStaff || []).find((s) => Number(s.staffId || s.id) === Number(staffId));
        const wName = wardenData.name || wardenData.wardenName || staffMember?.name || staffMember?.fullName || "";
        const empId = wardenData.empId || wardenData.employeeId || staffMember?.empId || staffMember?.employeeId || "";
        const phone = wardenData.phone || wardenData.mobileNumber || staffMember?.phone || staffMember?.mobileNumber || "";
        const email = wardenData.email || staffMember?.email || "";
        const designation = wardenData.designation || staffMember?.designation || "Resident Warden";

        const payload = {
          staffId,
          hostelId,
          assignmentDate,
          status: wardenData.status || "Active",
          wardenName: wName,
          name: wName,
          employeeId: empId,
          empId,
          phone,
          mobileNumber: phone,
          email,
          designation,
          hostelName: blkName,
          blockName: blkName,
          assignedHostels: blkName,
        };

        if (existingBlockWarden?.id) {
          // Block already has a warden: reassign to this warden
          await hostelApi.updateWarden(existingBlockWarden.id, payload, { skipErrorLog: true });
        } else {
          // New assignment for this block
          await hostelApi.createWarden(payload, { skipErrorLog: true });
        }
        savedBlocksCount++;
      }

      const assignedBlockNames = targetHostelIds
        .map((hId) => blocks.find((b) => Number(b.id) === Number(hId))?.name || `Block #${hId}`)
        .join(", ");

      showToast(`Warden ${wardenData.name} successfully assigned to ${assignedBlockNames}!`);
      await refreshWardens();
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    } finally {
      isSavingWardenRef.current = false;
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
          await hostelApi.deleteWarden(warden.id, { skipErrorLog: true });
          await refreshWardens();
          await refreshBlocks();
          await refreshDashboard();
          closeConfirm();
          showToast(`Warden ${warden.name} removed.`);
        } catch (err) {
          showToast(getApiErrorMessage(err), "danger");
        }
      },
    });
  };

  // ── Student Allocation CRUD ─────────────────────────────────────────
  const handleSaveAllocation = async (allocData) => {
    if (isSavingAllocRef.current) return;
    isSavingAllocRef.current = true;
    try {
      const studentId = Number(allocData.studentId);
      if (!studentId || isNaN(studentId) || studentId <= 0) {
        showToast("Please select a registered, enrolled student from the dropdown list.", "warning");
        return;
      }

      // Check active allocation for this student
      const existingAlloc = allocations.find(
        (a) => (a.status || "").toLowerCase() === "active" && (
          (studentId && Number(a.studentId) === Number(studentId)) ||
          (allocData.admissionNo && String(a.admissionNo).trim().toLowerCase() === String(allocData.admissionNo).trim().toLowerCase())
        )
      );

      const isEditing = modal.mode === "edit" || Boolean(allocData.id && allocations.some((a) => Number(a.id) === Number(allocData.id)));

      const blk = blocks.find((b) => b.name === allocData.blockName || b.code === allocData.blockCode || String(b.id) === String(allocData.hostelId));
      const hostelId = Number(allocData.hostelId) || (blk ? Number(blk.id) : (Number(blocks[0]?.id) || 1));

      const rm = rooms.find((r) => (String(r.id) === String(allocData.roomId) || r.roomNo === allocData.room || `Room #${r.roomNo}` === allocData.room) && String(r.hostelId) === String(hostelId))
        || rooms.find((r) => r.roomNo === allocData.room || `Room #${r.roomNo}` === allocData.room || String(r.id) === String(allocData.roomId));
      const roomId = rm ? Number(rm.id) : (Number(allocData.roomId) || (Number(rooms[0]?.id) || 1));

      // Resolve actual database bed ID for this specific room
      let actualBedId = null;
      if (allocData.bedId && !isNaN(Number(allocData.bedId)) && Number(allocData.bedId) > 0) {
        const bedMatch = beds.find((b) => String(b.id) === String(allocData.bedId) && String(b.roomId) === String(roomId));
        if (bedMatch) actualBedId = Number(bedMatch.id);
      }
      if (!actualBedId && allocData.bed) {
        const matchingBed = beds.find((b) => String(b.roomId) === String(roomId) && (b.bedNumber === allocData.bed || String(b.id) === String(allocData.bed)));
        if (matchingBed) actualBedId = Number(matchingBed.id);
      }
      if (!actualBedId) {
        const availableRoomBed = beds.find((b) => String(b.roomId) === String(roomId) && (b.bedStatus || "").toLowerCase() === "available");
        if (availableRoomBed) {
          actualBedId = Number(availableRoomBed.id);
        } else {
          const roomBeds = beds.filter((b) => String(b.roomId) === String(roomId));
          if (roomBeds.length > 0) actualBedId = Number(roomBeds[0].id);
        }
      }

      // If bed does not exist in DB yet, auto-create bed in database for this room
      if ((!actualBedId || isNaN(actualBedId) || actualBedId <= 0) && roomId > 0) {
        const bedNumber = allocData.bed || "BED-1";
        const existingBed = beds.find(
          (b) => Number(b.roomId) === Number(roomId) &&
                 String(b.bedNumber || "").trim().toLowerCase() === String(bedNumber).trim().toLowerCase()
        );
        if (existingBed?.id) {
          actualBedId = Number(existingBed.id);
        } else {
          try {
            const bedRes = await hostelApi.createBed({
              roomId: Number(roomId),
              bedNumber,
              bedStatus: "Available",
              status: "Active",
            }, { skipErrorLog: true });
            const createdBedId = bedRes?.data?.data?.bedId ?? bedRes?.data?.data?.id ?? bedRes?.data?.bedId ?? bedRes?.data?.id;
            if (createdBedId) {
              actualBedId = Number(createdBedId);
              await refreshBeds();
            }
          } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
        }
      }

      if (!actualBedId || isNaN(actualBedId) || actualBedId <= 0) {
        showToast("Please select a valid registered bed for this room.", "warning");
        return;
      }

      // Check if selected bed is already occupied by another student
      const isSameBedAllocation = isEditing || (existingAlloc && Number(existingAlloc.bedId) === Number(actualBedId));
      const selectedBedObj = beds.find((b) => Number(b.id) === Number(actualBedId));
      if (selectedBedObj && (selectedBedObj.bedStatus || "").toLowerCase() === "occupied" && !isSameBedAllocation) {
        showToast("The selected bed is already occupied. Please select an available bed.", "warning");
        return;
      }

      const warden = wardens.find((w) => String(w.hostelId) === String(hostelId) && (w.status || "").toLowerCase() === "active")
        || wardens.find((w) => String(w.hostelId) === String(hostelId));
      let wardenAssignmentId = warden?.id ? Number(warden.id) : null;
      if (!wardenAssignmentId && allocData.wardenAssignmentId) {
        const matchingWarden = wardens.find((w) => String(w.id) === String(allocData.wardenAssignmentId) && String(w.hostelId) === String(hostelId));
        if (matchingWarden) wardenAssignmentId = Number(matchingWarden.id);
      }

      const joinDateObj = allocData.joinDate ? new Date(allocData.joinDate) : new Date();
      const joiningDate = !isNaN(joinDateObj.getTime()) ? joinDateObj.toISOString() : new Date().toISOString();

      const payload = {
        studentId: Number(studentId),
        hostelId: Number(hostelId),
        roomId: Number(roomId),
        bedId: Number(actualBedId),
        ...(wardenAssignmentId && Number(wardenAssignmentId) > 0 ? { wardenAssignmentId: Number(wardenAssignmentId) } : {}),
        joiningDate,
        status: allocData.status || "Active",
        remarks: allocData.remarks || "Student hostel room allocation",
      };

      if (isEditing) {
        const updateId = allocData.id || existingAlloc?.id;
        await hostelApi.updateStudentAllocation(updateId, payload, { skipErrorLog: true });
        showToast(`Allocation for ${allocData.studentName} updated.`);
      } else if (existingAlloc?.id) {
        // Reallocate student to selected room & bed via update to prevent 400 "This student already has an active hostel allocation"
        await hostelApi.updateStudentAllocation(existingAlloc.id, payload, { skipErrorLog: true });
        showToast(`Room & Bed reallocated for ${allocData.studentName} successfully!`);
      } else {
        await hostelApi.createStudentAllocation(payload, { skipErrorLog: true });
        showToast(`Room & Bed allocated to ${allocData.studentName} successfully!`);
      }
      await refreshAllocations();
      await refreshRooms();
      await refreshBlocks();
      await refreshBeds();
      await refreshDashboard();
      closeModal();
    } catch (err) {
      const apiMsg = getApiErrorMessage(err);
      if (apiMsg && apiMsg.toLowerCase().includes("student not found")) {
        showToast("Student not found in master database. This applicant is not yet enrolled into the Student Master table.", "danger");
      } else {
        showToast(apiMsg || "Failed to save allocation.", "danger");
      }
    } finally {
      isSavingAllocRef.current = false;
    }
  };

  const handleVacateAllocation = async (alloc, reason) => {
    try {
      await hostelApi.deleteStudentAllocation(alloc.id, { skipErrorLog: true });
      await refreshAllocations();
      await refreshRooms();
      await refreshBlocks();
      await refreshDashboard();
      closeModal();
      showToast(`Bed vacated for ${alloc.studentName}.`);
    } catch (err) {
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

      const formatLocalIso = (val, fallbackOffsetMs = 0) => {
        if (!val) {
          const d = new Date(Date.now() + fallbackOffsetMs);
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
        }
        if (typeof val === "string") {
          const match = val.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
          if (match) {
            return `${match[1]}T${match[2]}:${match[3] || "00"}`;
          }
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
        const fallback = new Date(Date.now() + fallbackOffsetMs);
        const pad = (n) => String(n).padStart(2, "0");
        return `${fallback.getFullYear()}-${pad(fallback.getMonth() + 1)}-${pad(fallback.getDate())}T${pad(fallback.getHours())}:${pad(fallback.getMinutes())}:00`;
      };

      const fromIso = formatLocalIso(outData.departureDate || outData.outDate || outData.fromDateTime, 0);
      let toIso = formatLocalIso(outData.returnDate || outData.toDateTime, 14400000);

      // Guard: Ensure toDateTime is strictly greater than fromDateTime
      if (new Date(toIso).getTime() <= new Date(fromIso).getTime()) {
        showToast("To date and time must be greater than From date and time.", "warning");
        return;
      }

      let reqType = "Outpass";
      const rawType = (outData.requestType || outData.outpassType || "").toLowerCase();
      if (rawType.includes("leave") || rawType.includes("home") || rawType.includes("emergency")) {
        reqType = "Leave";
      } else {
        reqType = "Outpass";
      }

      // Check for existing active (Pending or Approved) request for this student on the same date
      const newStartDay = fromIso.split("T")[0];
      const newEndDay = toIso.split("T")[0] || newStartDay;
      const sFullName = outData.studentName || alloc?.studentName || "Student";

      const existingActive = outpasses.find((op) => {
        const isSame =
          (studentId && Number(op.studentId) === Number(studentId)) ||
          (outData.admissionNo && op.admissionNo && String(op.admissionNo).trim().toLowerCase() === String(outData.admissionNo).trim().toLowerCase()) ||
          (outData.studentName && op.studentName && String(op.studentName).trim().toLowerCase() === String(outData.studentName).trim().toLowerCase());
        if (!isSame) return false;

        const st = String(op.approvalStatus || op.status || "").toLowerCase();
        const isActive = st === "pending" || st === "approved" || st === "active";
        if (!isActive) return false;

        const opStart = String(op.departureDate || op.outDate || op.fromDateTime || "").split("T")[0];
        const opEnd = String(op.returnDate || op.toDateTime || opStart).split("T")[0] || opStart;
        if (!opStart) return false;

        return newStartDay <= opEnd && newEndDay >= opStart;
      });

      if (existingActive) {
        showToast(
          `${sFullName} already has an active (${existingActive.approvalStatus || existingActive.status || "Approved"}) request for ${newStartDay}. Cannot apply multiple requests on the same date.`,
          "warning"
        );
        return;
      }

      const payload = {
        studentId,
        studentName: outData.studentName || alloc?.studentName || "Resident Student",
        admissionNo: outData.admissionNo || alloc?.admissionNo || "ADM-001",
        hostelId,
        hostelName: outData.blockName || alloc?.blockName || blk?.name || "Boys Hostel 1",
        blockName: outData.blockName || alloc?.blockName || blk?.name || "Boys Hostel 1",
        roomId,
        roomNo: outData.roomNo || outData.roomNumber || alloc?.room || rm?.roomNo || "101",
        roomNumber: outData.roomNumber || outData.roomNo || alloc?.roomNumber || alloc?.room || rm?.roomNo || "101",
        bedId,
        wardenAssignmentId,
        requestType: reqType,
        outpassType: outData.outpassType || outData.requestType || reqType,
        fromDateTime: fromIso,
        toDateTime: toIso,
        reason: outData.reason?.trim() || "Outpass permission request",
        destination: outData.destination?.trim() || "City",
      };

      await hostelApi.createOutpassLeave(payload, { skipErrorLog: true });
      await refreshOutpasses();
      closeModal();
      showToast(`Outpass request submitted for ${payload.studentName}.`);
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      showToast(errMsg || "Failed to submit outpass request.", "danger");
    }
  };

  const handleUpdateOutpassStatus = async (outpassId, newStatus) => {
    try {
      let apiStatus = "Pending";
      const s = (newStatus || "").toLowerCase();
      if (s.includes("approve")) apiStatus = "Approved";
      else if (s.includes("reject")) apiStatus = "Rejected";

      // Optimistic update of outpasses table
      setOutpasses((prev) =>
        prev.map((op) =>
          Number(op.id) === Number(outpassId) || String(op.id) === String(outpassId)
            ? { ...op, status: apiStatus, approvalStatus: apiStatus }
            : op
        )
      );

      await hostelApi.approveOutpassLeave(outpassId, {
        approvalStatus: apiStatus,
        approvalRemarks: `Warden status update: ${apiStatus}`,
      }, { skipErrorLog: true });
      await refreshOutpasses();
      showToast(`Outpass marked as ${apiStatus}.`);
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleDeleteOutpass = async (outpass) => {
    try {
      await hostelApi.deleteOutpassLeave(outpass.id, { skipErrorLog: true });
      await refreshOutpasses();
      showToast("Outpass record removed.");
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Transfer CRUD (Screenshots 1, 2, 3) ──────────────────────────────
  const handleUpdateTransferStatus = async (requestId, newStatus) => {
    try {
      let apiStatus = "Pending";
      const s = (newStatus || "").toLowerCase();
      if (s.includes("approve")) apiStatus = "Approved";
      else if (s.includes("reject")) apiStatus = "Rejected";

      const matchedTr = transfers.find((t) => Number(t.id) === Number(requestId) || String(t.id) === String(requestId));
      const isVacate = matchedTr?.actionType === "Bed Vacate" || matchedTr?.requestType === "Vacate";

      // Optimistic update of transfers table
      setTransfers((prev) =>
        prev.map((tr) =>
          Number(tr.id) === Number(requestId) || String(tr.id) === String(requestId)
            ? { ...tr, status: apiStatus === "Approved" ? "Completed" : apiStatus, approvalStatus: apiStatus }
            : tr
        )
      );

      // If Vacate is approved, mark student's allocation as Vacated in allocations state
      if (apiStatus === "Approved" && isVacate && matchedTr) {
        setAllocations((prev) =>
          prev.map((a) =>
            (matchedTr.allocationId && Number(a.id || a.allocationId) === Number(matchedTr.allocationId)) ||
            (matchedTr.studentId && Number(a.studentId) === Number(matchedTr.studentId)) ||
            (matchedTr.admissionNo && a.admissionNo === matchedTr.admissionNo)
              ? { ...a, status: "Vacated", isActive: false }
              : a
          )
        );
      }

      await hostelApi.approveTransferVacate(
        requestId,
        {
          approvalStatus: apiStatus,
          approvalRemarks: `Warden status update: ${apiStatus}`,
        },
        { skipErrorLog: true }
      );

      if (apiStatus === "Approved") {
        try {
          await hostelApi.completeTransferVacate(requestId, { skipErrorLog: true });
        } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
      }

      await refreshTransfers();
      await refreshAllocations();
      await refreshRooms();
      await refreshBlocks();
      await refreshDashboard();
      showToast(`Transfer/vacate request marked as ${apiStatus}.`);
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  const handleDeleteTransfer = async (tr) => {
    try {
      const id = typeof tr === "object" ? tr?.id : tr;
      const sName = typeof tr === "object" ? tr?.studentName : "student";
      await hostelApi.deleteTransferVacate(id, { skipErrorLog: true });
      await refreshTransfers();
      showToast(`Transfer record for ${sName || "student"} removed.`);
    } catch (err) {
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
        allocationId: transData.allocationId || (alloc ? alloc.id : 1),
        studentId: transData.studentId || alloc?.studentId || 1,
        studentName: transData.studentName || alloc?.studentName || "Resident Student",
        admissionNo: transData.admissionNo || alloc?.admissionNo || "ADM-001",
        requestType: isVacate ? "Vacate" : "Transfer",
        actionType: transData.actionType || (isVacate ? "Bed Vacate" : "Room Transfer"),
        fromHostelId: transData.fromHostelId || (fromBlk ? fromBlk.id : 1),
        fromHostelName: transData.currentBlock || alloc?.blockName || fromBlk?.name || "Boys Hostel 1",
        currentBlock: transData.currentBlock || alloc?.blockName || fromBlk?.name || "Boys Hostel 1",
        fromRoomId: transData.fromRoomId || alloc?.roomId || 1,
        fromRoomNumber: transData.currentRoom || alloc?.roomNumber || alloc?.room || "101",
        currentRoom: transData.currentRoom || alloc?.roomNumber || alloc?.room || "101",
        fromBedId: transData.fromBedId || alloc?.bedId || 1,
        toHostelId: isVacate ? null : (transData.toHostelId || (toBlk ? toBlk.id : null)),
        toHostelName: isVacate ? null : (transData.destinationBlock || toBlk?.name || null),
        toRoomId: isVacate ? null : (transData.toRoomId || 1),
        toRoomNumber: isVacate ? null : (transData.destinationRoom || "102"),
        toBedId: isVacate ? null : (transData.toBedId || 1),
        toBedNumber: isVacate ? null : (transData.destinationBed || "102-B"),
        requestDate: new Date().toISOString(),
        effectiveDate: new Date(Date.now() + 86400000).toISOString(),
        reason: transData.reason || (isVacate ? "Student vacating bed" : "Student room transfer"),
        refundAmount: isVacate ? (transData.refundAmount || 2000) : null,
      };

      await hostelApi.createTransferVacate(payload, { skipErrorLog: true });
      await refreshTransfers();
      closeModal();
      showToast(`${isVacate ? "Bed vacate request" : "Room transfer request"} submitted for ${payload.studentName}.`);
    } catch (err) {
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
          }, { skipErrorLog: true });
          await hostelApi.completeTransferVacate(tr.id, { skipErrorLog: true });
          await refreshTransfers();
          await refreshAllocations();
          await refreshRooms();
          await refreshBlocks();
          await refreshDashboard();
          closeConfirm();
          showToast(`Migration for ${tr.studentName} processed successfully!`);
        } catch (err) {
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

        // Check if an existing attendance record exists for this student on this date and session
        const existingRec =
          (attendanceRecords || []).find((r) => {
            const rDate = r.attendanceDate || r.date;
            const rSession = (r.session || "").toLowerCase();
            const matchStudent = (r.studentId && Number(r.studentId) === studentId) || (r.admissionNo && r.admissionNo === student?.admissionNo);
            const matchDate = rDate === attendanceDate;
            const matchSession = rSession.startsWith(attendanceShift[0]) || r.session === sessionLabel;
            return matchStudent && matchDate && matchSession;
          }) || (record.attendanceId ? { attendanceId: record.attendanceId } : null);

        try {
          if (existingRec?.attendanceId) {
            await hostelApi.updateAttendance(existingRec.attendanceId, payload, { skipErrorLog: true });
          } else {
            try {
              await hostelApi.createAttendance(payload, { skipErrorLog: true });
            } catch (createErr) {
              const errText = String(createErr?.response?.data?.message || createErr?.message || "");
              if (!errText.toLowerCase().includes("already") && createErr?.response?.status !== 400) {
                throw createErr;
              }
            }
          }
          savedCount++;
        } catch (singleErr) {
          lastError = singleErr;
        }
      }
      if (savedCount > 0) {
        showToast(`Attendance log saved successfully! (${savedCount} records)`, "success");
        await refreshAttendance();
      } else if (lastError) {
        showToast(getApiErrorMessage(lastError), "danger");
      }
    } catch (err) {
      showToast(getApiErrorMessage(err), "danger");
    }
  };

  // ── Attendance Mode & Date Range Handlers ────────────────────────────
  const handleSelectAttendanceFrequency = (mode) => {
    setAttendanceFrequency(mode);
    setRangeError("");
    if (mode === "daily") {
      if (!attendanceDate) setAttendanceDate(getTodayDateStr());
    } else if (mode === "monthly") {
      if (!attendanceMonth) setAttendanceMonth(getCurrentMonthStr());
    } else if (mode === "custom") {
      if (!customRangeStart && !customRangeEnd) {
        setCustomRangeStart(`${getCurrentMonthStr()}-01`);
        setCustomRangeEnd(getTodayDateStr());
        setAppliedCustomRange({ start: `${getCurrentMonthStr()}-01`, end: getTodayDateStr() });
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

  // Compute student attendance stats for specific mode & period
  const getStudentPeriodStats = useCallback(
    (student, mode, periodConfig) => {
      const sId = student.studentId ? Number(student.studentId) : null;
      const admNo = student.admissionNo || student.id;

      let studentLogs = (attendanceRecords || []).filter((r) => {
        if (sId && r.studentId && Number(r.studentId) === sId) return true;
        if (admNo && r.admissionNo && r.admissionNo === admNo) return true;
        if (r.studentId && String(r.studentId) === String(student.id)) return true;
        return false;
      });

      if (mode === "daily") {
        const d = periodConfig?.date || attendanceDate;
        studentLogs = studentLogs.filter((r) => (r.attendanceDate || r.date) === d);
      } else if (mode === "monthly") {
        const m = periodConfig?.month || attendanceMonth;
        studentLogs = studentLogs.filter((r) => {
          const d = r.attendanceDate || r.date || "";
          return d.startsWith(m);
        });
      } else if (mode === "custom") {
        const start = periodConfig?.start || appliedCustomRange.start;
        const end = periodConfig?.end || appliedCustomRange.end;
        studentLogs = studentLogs.filter((r) => {
          const d = r.attendanceDate || r.date || "";
          return (!start || d >= start) && (!end || d <= end);
        });
      }

      // If active today status is set in attendanceMap for active shift, include it if not already in logs
      const shiftMap = attendanceMap[attendanceShift] || {};
      const activeEntry = shiftMap[student.id];
      const hasTodayRecord = studentLogs.some(
        (r) => (r.attendanceDate || r.date) === attendanceDate && (r.session || "").toLowerCase().startsWith(attendanceShift[0])
      );
      if (activeEntry?.status && !hasTodayRecord) {
        const isInScope =
          mode === "daily"
            ? (periodConfig?.date || attendanceDate) === attendanceDate
            : mode === "monthly"
            ? attendanceDate.startsWith(periodConfig?.month || attendanceMonth)
            : mode === "custom"
            ? (!appliedCustomRange.start || attendanceDate >= appliedCustomRange.start) &&
              (!appliedCustomRange.end || attendanceDate <= appliedCustomRange.end)
            : true;

        if (isInScope) {
          studentLogs = [
            ...studentLogs,
            {
              id: `active-${attendanceDate}-${attendanceShift}-${student.id}`,
              attendanceId: `active-${attendanceDate}-${attendanceShift}-${student.id}`,
              date: attendanceDate,
              attendanceDate: attendanceDate,
              session: attendanceShift === "morning" ? "Morning" : "Night",
              status: activeEntry.status,
              inTime: activeEntry.inTime || (attendanceShift === "morning" ? "07:00" : "20:00"),
              remarks: activeEntry.remarks || "Today's roll call",
            },
          ];
        }
      }

      const present = studentLogs.filter((r) => r.status === "Present").length;
      const absent = studentLogs.filter((r) => r.status === "Absent").length;
      const leave = studentLogs.filter((r) => r.status === "Leave").length;
      const halfDay = studentLogs.filter((r) => r.status === "Half Day").length;
      const total = studentLogs.length;
      const pct = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;

      return {
        studentLogs,
        present,
        absent,
        leave,
        halfDay,
        total,
        pct,
      };
    },
    [attendanceRecords, attendanceMap, attendanceShift, attendanceDate, attendanceMonth, appliedCustomRange]
  );

  const handleExportAttendanceReport = (filteredList) => {
    const shiftData = attendanceMap[attendanceShift] || {};
    const selectedMonthObj = resolvedMonthOptions.find((m) => m.value === attendanceMonth);
    const activePeriodLabel =
      attendanceFrequency === "daily"
        ? attendanceDate
        : attendanceFrequency === "monthly"
        ? (selectedMonthObj ? selectedMonthObj.label : attendanceMonth)
        : `${appliedCustomRange.start || "start"}_to_${appliedCustomRange.end || "end"}`;

    if (attendanceFrequency === "daily") {
      const exportData = filteredList.map((s) => ({
        admissionNo: s.admissionNo || s.id,
        studentName: s.name,
        hostelBlock: s.block,
        roomBed: s.roomBed || `${s.room} (${s.bed})`,
        attendanceStatus: shiftData[s.id]?.status || "Unmarked",
        inTime: shiftData[s.id]?.inTime || s.inTime || "07:00",
        shift: attendanceShift.toUpperCase(),
        date: attendanceDate,
      }));
      exportCsv(
        `hostel-attendance-daily-${attendanceShift}-${attendanceDate}.csv`,
        exportData,
        [
          { key: "admissionNo", label: "Admission No" },
          { key: "studentName", label: "Student Name" },
          { key: "hostelBlock", label: "Hostel Block" },
          { key: "roomBed", label: "Room & Bed" },
          { key: "attendanceStatus", label: "Attendance Status" },
          { key: "inTime", label: "In Time" },
          { key: "shift", label: "Shift" },
          { key: "date", label: "Date" },
        ]
      );
    } else {
      const exportData = filteredList.map((s) => {
        const stats = getStudentPeriodStats(s, attendanceFrequency);
        return {
          admissionNo: s.admissionNo || s.id,
          studentName: s.name,
          hostelBlock: s.block,
          roomBed: s.roomBed || `${s.room} (${s.bed})`,
          presentDays: stats.present,
          absentDays: stats.absent,
          leaveDays: stats.leave,
          halfDays: stats.halfDay,
          totalLogs: stats.total,
          attendancePct: `${stats.pct}%`,
          period: activePeriodLabel,
        };
      });
      exportCsv(
        `hostel-attendance-${attendanceFrequency}-${String(activePeriodLabel).replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`,
        exportData,
        [
          { key: "admissionNo", label: "Admission No" },
          { key: "studentName", label: "Student Name" },
          { key: "hostelBlock", label: "Hostel Block" },
          { key: "roomBed", label: "Room & Bed" },
          { key: "presentDays", label: "Present Days" },
          { key: "absentDays", label: "Absent Days" },
          { key: "leaveDays", label: "On Leave" },
          { key: "halfDays", label: "Half Days" },
          { key: "totalLogs", label: "Total Logs" },
          { key: "attendancePct", label: "Attendance %" },
          { key: "period", label: "Period" },
        ]
      );
    }
    showToast(`Exported ${attendanceFrequency} attendance report successfully!`, "success");
  };

  // ═════════════════════════════════════════════════════════════════════
  // RENDER SECTIONS (FLAT, DIRECT NAVIGATION)
  // ═════════════════════════════════════════════════════════════════════

  // Hostel Name Searchable Dropdown for Hostel Block Overview & Analytics
  const HostelBlockDropdown = ({
    blocks = [],
    selectedBlockId = "",
    onSelectBlock,
    isLoading = false,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      } else if (!isOpen) {
        setSearch("");
      }
    }, [isOpen]);

    const selectedBlock = blocks.find(
      (b) => String(b.id) === String(selectedBlockId) || b.code === selectedBlockId
    );

    const filteredBlocks = blocks.filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        String(b.name || "").toLowerCase().includes(q) ||
        String(b.code || "").toLowerCase().includes(q) ||
        String(b.type || "").toLowerCase().includes(q) ||
        String(b.warden || "").toLowerCase().includes(q)
      );
    });

    const handleSelect = (blockId) => {
      onSelectBlock(blockId);
      setIsOpen(false);
    };

    const handleClear = (e) => {
      e.stopPropagation();
      onSelectBlock("");
    };

    const labelText = selectedBlock
      ? `${selectedBlock.name} (${selectedBlock.code})`
      : isLoading
      ? "Loading hostels..."
      : "All Hostel Blocks";

    return (
      <div
        ref={dropdownRef}
        className={`cms-hostel-name-dropdown-wrapper ${isOpen ? "is-open" : ""}`}
        style={{ position: "relative", width: 280, maxWidth: "100%", zIndex: isOpen ? 60 : 1 }}
      >
        <button
          type="button"
          className={`cms-hostel-name-dropdown-trigger ${isOpen ? "is-open" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={selectedBlock ? `Selected: ${selectedBlock.name} (${selectedBlock.code})` : "All Hostel Blocks"}
          style={{
            width: "100%",
            height: 34,
            paddingLeft: 34,
            paddingRight: selectedBlock ? 54 : 32,
            borderRadius: 9999,
            border: `1px solid ${isOpen ? "var(--cms-primary)" : "var(--cms-border)"}`,
            backgroundColor: "#ffffff",
            fontSize: 12,
            color: selectedBlock ? "var(--cms-text)" : "var(--cms-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            outline: "none",
            textAlign: "left",
            position: "relative",
            boxSizing: "border-box",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: isOpen ? "0 0 0 2px var(--cms-primary-soft)" : "none",
          }}
        >
          <Building2
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--cms-primary)",
              pointerEvents: "none",
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: selectedBlock ? 600 : 500,
              color: selectedBlock ? "var(--cms-text)" : "var(--cms-muted)",
            }}
          >
            {labelText}
          </span>

          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {selectedBlock && (
              <span
                role="button"
                tabIndex={0}
                title="Show all hostel blocks"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--cms-subtle, #f1f5f9)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cms-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={11} />
              </span>
            )}
            <ChevronDown
              size={14}
              style={{
                color: "var(--cms-muted)",
                transition: "transform 0.2s",
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </div>
        </button>

        {isOpen && (
          <div
            className="cms-hostel-name-dropdown-menu"
            style={{
              position: "absolute",
              top: "calc(100% + 5px)",
              left: 0,
              right: 0,
              backgroundColor: "#ffffff",
              border: "1px solid var(--cms-border)",
              borderRadius: 12,
              boxShadow: "0 12px 30px -4px rgba(0, 0, 0, 0.16), 0 8px 12px -4px rgba(0, 0, 0, 0.08)",
              zIndex: 1000,
              overflow: "hidden",
            }}
          >
            <div
              className="cms-hostel-dropdown-search-wrap"
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid var(--cms-border)",
                backgroundColor: "#f8fafc",
                position: "relative",
              }}
            >
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 18,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--cms-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search hostel name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsOpen(false);
                  if (e.key === "Enter" && filteredBlocks.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredBlocks[0].id);
                  }
                }}
                className="cms-hostel-dropdown-search-input"
                style={{
                  width: "100%",
                  height: 30,
                  paddingLeft: 28,
                  paddingRight: search ? 26 : 10,
                  borderRadius: 6,
                  border: "1px solid var(--cms-border)",
                  backgroundColor: "#ffffff",
                  fontSize: 12,
                  color: "var(--cms-text)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 18,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--cms-muted)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div
              className="cms-hostel-dropdown-list"
              style={{
                maxHeight: 220,
                overflowY: "auto",
                padding: "4px 0",
                backgroundColor: "#ffffff",
              }}
              role="listbox"
            >
              {!search && (
                <>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!selectedBlockId}
                    onClick={() => handleSelect("")}
                    className={`cms-hostel-dropdown-item ${!selectedBlockId ? "is-selected" : ""}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Layers size={13} style={{ color: "var(--cms-primary)" }} />
                      <span>All Hostel Blocks</span>
                      <span style={{ fontSize: 11, color: "var(--cms-muted)" }}>
                        ({blocks.length})
                      </span>
                    </div>
                    {!selectedBlockId && <Check size={13} style={{ color: "var(--cms-primary)" }} />}
                  </button>
                  <div style={{ height: 1, background: "var(--cms-border)", margin: "3px 8px" }} />
                </>
              )}

              {filteredBlocks.length > 0 ? (
                filteredBlocks.map((b) => {
                  const isSelected = String(b.id) === String(selectedBlockId) || b.code === selectedBlockId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(b.id)}
                      className={`cms-hostel-dropdown-item ${isSelected ? "is-selected" : ""}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <Building2
                          size={13}
                          style={{
                            color: isSelected ? "var(--cms-primary)" : "var(--cms-muted)",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span>{b.name}</span>
                          <span style={{ color: "var(--cms-muted)", fontSize: 11, marginLeft: 5 }}>
                            ({b.code})
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: b.type === "Girls" ? "rgba(236, 72, 153, 0.1)" : "rgba(59, 130, 246, 0.1)",
                            color: b.type === "Girls" ? "#db2777" : "#2563eb",
                            fontWeight: 600,
                          }}
                        >
                          {b.type}
                        </span>
                        {isSelected && <Check size={13} style={{ color: "var(--cms-primary)" }} />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "16px 12px",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--cms-muted)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Building2 size={18} style={{ opacity: 0.5 }} />
                  <span>No matching hostel blocks</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1. Dashboard
  const renderDashboard = () => {
    // Blocks filtered by selected hostel from dropdown
    const filteredDashBlocks = enrichedBlocks.filter((b) => {
      if (!dashBlockSearch) return true;
      return String(b.id) === String(dashBlockSearch) || b.code === dashBlockSearch;
    });

    const pageSize = 4;
    const totalPages = Math.ceil(filteredDashBlocks.length / pageSize) || 1;
    const currentBlocksPage = filteredDashBlocks.slice(
      (dashBlockPage - 1) * pageSize,
      dashBlockPage * pageSize
    );

    const selectedDashBlock =
      enrichedBlocks.find(
        (b) =>
          (dashBlockSearch && (String(b.id) === String(dashBlockSearch) || b.code === dashBlockSearch)) ||
          (dashSelectedBlockId && (String(b.id) === String(dashSelectedBlockId) || b.code === dashSelectedBlockId))
      ) ||
      enrichedBlocks[0] ||
      null;

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
              if (isWardenRoute) {
                navigate("/warden-dashboard/rooms");
              } else {
                setActiveMajorTab("setup");
                setActiveSetupSubtab("blocks");
              }
            }}
          >
            <Building2 size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Setup Blocks</span>
          </button>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              if (isWardenRoute) {
                navigate("/warden-dashboard/students");
              } else {
                setActiveMajorTab("students");
                setActiveStudentSubtab("allocations");
              }
            }}
          >
            <Users size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Hostel Students</span>
          </button>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              if (isWardenRoute) {
                navigate("/warden-dashboard/allocations");
              } else {
                setActiveMajorTab("students");
                setActiveStudentSubtab("allocations");
              }
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
              if (isWardenRoute) {
                navigate("/warden-dashboard/attendance");
              } else {
                setActiveMajorTab("students");
                setActiveStudentSubtab("attendance");
              }
            }}
          >
            <CheckCircle2 size={14} style={{ color: "var(--cms-primary)" }} />
            <span>Mark Attendance</span>
          </button>
          <button
            type="button"
            className="cms-dash-quick-btn"
            onClick={() => {
              if (isWardenRoute) {
                navigate("/warden-dashboard/reports");
              } else {
                setActiveMajorTab("reports");
              }
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, position: "relative", zIndex: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", fontWeight: 800, color: "var(--cms-text)" }}>
              <Building2 size={18} style={{ color: "var(--cms-primary)" }} />
              <span>Hostel Block Overview &amp; Analytics</span>
            </div>
            <HostelBlockDropdown
              blocks={enrichedBlocks}
              selectedBlockId={dashBlockSearch}
              onSelectBlock={(blockId) => {
                setDashBlockSearch(blockId);
                setDashBlockPage(1);
                if (blockId) {
                  setDashSelectedBlockId(blockId);
                }
              }}
              isLoading={isLoading}
            />
          </div>

          {/* Selected Block Banner matching Screenshot 4 */}
          {Boolean(selectedDashBlock && (selectedDashBlock.id || selectedDashBlock.name)) && (
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
                  {currentBlocksPage.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "32px 16px", color: "var(--cms-muted)", fontSize: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <Building2 size={22} style={{ opacity: 0.4 }} />
                          <span>No hostel blocks available</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentBlocksPage.map((b) => {
                      const isSelected = String(b.id) === String(dashSelectedBlockId) || b.code === dashSelectedBlockId;
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
                    })
                  )}
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
                Showing {filteredDashBlocks.length > 0 ? Math.min((dashBlockPage - 1) * pageSize + 1, filteredDashBlocks.length) : 0}-
                {Math.min(dashBlockPage * pageSize, filteredDashBlocks.length)} of {filteredDashBlocks.length} records
                {dashBlockSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDashBlockSearch("");
                      setDashBlockPage(1);
                    }}
                    style={{
                      marginLeft: 10,
                      background: "transparent",
                      border: "none",
                      color: "var(--cms-primary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: 11,
                    }}
                  >
                    View All Blocks
                  </button>
                ) : null}
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
                  if (isWardenRoute) {
                    navigate("/warden-dashboard/allocations");
                  } else {
                    setActiveMajorTab("students");
                    setActiveStudentSubtab("allocations");
                  }
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
                  if (isWardenRoute) {
                    navigate("/warden-dashboard/leave-requests");
                  } else {
                    setActiveMajorTab("students");
                    setActiveStudentSubtab("outpasses");
                  }
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
                  const formattedDate = item.departureDate || (typeof item.outDate === "string" ? item.outDate.split("T")[0] : String(item.outDate || "").split("T")[0] || "-");

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
    const isHostelSelected = !filterBlock || filterBlock === "all" || Boolean(filterBlock);

    const filtered = enrichedBlocks.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        String(b.name || "").toLowerCase().includes(q) ||
        String(b.code || "").toLowerCase().includes(q) ||
        String(b.warden || "").toLowerCase().includes(q) ||
        String(b.type || "").toLowerCase().includes(q);
      const matchBlock =
        !filterBlock ||
        filterBlock === "all" ||
        b.code === filterBlock ||
        String(b.id) === String(filterBlock) ||
        b.name === filterBlock;
      return matchQ && matchBlock;
    });

    // Pagination (10 blocks per page)
    const blocksPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / blocksPerPage));
    const currentPageClamped = Math.min(Math.max(1, blocksCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * blocksPerPage;
    const endIndex = Math.min(startIndex + blocksPerPage, filtered.length);
    const paginatedBlocks = filtered.slice(startIndex, endIndex);

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
            <div className="cms-hostel-search">
              <Search size={15} />
              <input
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="cms-hostel-toolbar-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-muted)" }}>Filter:</span>
              <select
                className="cms-hostel-select"
                value={filterBlock}
                onChange={(e) => setFilterBlock(e.target.value)}
                style={{ minWidth: 230 }}
              >
                <option value="">Select Hostel...</option>
                <option value="all">All Hostels</option>
                {Array.from(new Map(blocks.map((b) => [String(b.id || b.code), b])).values()).map((b) => (
                  <option key={b.id || b.code} value={b.code}>
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
            <div className="cms-hostel-compact-card" style={{ border: "1px solid var(--cms-border)", borderRadius: 12, overflow: "hidden", background: "var(--cms-surface)" }}>
              <div style={{ width: "100%", overflowX: "auto" }}>
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
                    paginatedBlocks.map((b) => (
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
                        <td>{rooms.filter((r) => String(r.hostelId) === String(b.id) || r.block === b.code || r.blockName === b.name).length} Rooms</td>
                        <td>{beds.filter((bd) => String(bd.hostelId) === String(b.id) || rooms.some((r) => Number(r.id) === Number(bd.roomId) && String(r.hostelId) === String(b.id))).length || rooms.filter((r) => String(r.hostelId) === String(b.id) || r.block === b.code).reduce((sum, r) => sum + (r.capacity || 0), 0)} Beds</td>
                        <td>
                          <span style={{ color: "var(--cms-amber)", fontWeight: 600 }}>
                            {b.occupiedBeds || allocations.filter((a) => (a.status || "").toLowerCase() === "active" && (String(a.hostelId) === String(b.id) || a.blockName === b.name || a.blockCode === b.code)).length} Occ
                          </span>{" "}
                          /{" "}
                          <span style={{ color: "var(--cms-green)", fontWeight: 600 }}>
                            {b.vacantBeds ?? Math.max(0, (beds.filter((bd) => String(bd.hostelId) === String(b.id)).length || rooms.filter((r) => String(r.hostelId) === String(b.id)).reduce((sum, r) => sum + (r.capacity || 0), 0)) - (allocations.filter((a) => (a.status || "").toLowerCase() === "active" && (String(a.hostelId) === String(b.id) || a.blockName === b.name || a.blockCode === b.code)).length))} Vac
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {wardens.find((w) => (w.status || "").toLowerCase() === "active" && (String(w.hostelId) === String(b.id) || (w.assignedHostels || "").includes(b.name)))?.name || b.warden || "Unassigned"}
                          </div>
                          <small style={{ color: "var(--cms-muted)" }}>
                            {wardens.find((w) => (w.status || "").toLowerCase() === "active" && (String(w.hostelId) === String(b.id) || (w.assignedHostels || "").includes(b.name)))?.phone || b.wardenPhone || "-"}
                          </small>
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

            {/* Pagination Controls */}
            {filtered.length > 0 && (
              <HostelPagination
                currentPage={blocksCurrentPage}
                totalItems={filtered.length}
                pageSize={blocksPerPage}
                onPageChange={setBlocksCurrentPage}
                itemLabel="blocks"
              />
            )}
          </div>
        )}
        </div>
      </div>
    );
  };

  // ── Tab 2: Room Categories Master ──────────────────────────────────
  const renderRoomCategories = () => {
    const filtered = enrichedCategories.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const cType = String(c.type || "").toLowerCase();
      const matchQ =
        !q ||
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.specification || "").toLowerCase().includes(q) ||
        cType.includes(q);
      const isAc = (cType.includes("ac") || String(c.acType || "").toLowerCase() === "ac") && !cType.includes("non-ac");
      const matchAc =
        !filterAcType ||
        filterAcType === "all" ||
        (filterAcType === "AC" && isAc) ||
        (filterAcType === "Non-AC" && !isAc);
      return matchQ && matchAc;
    });

    // Pagination (10 categories per page)
    const categoriesPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / categoriesPerPage));
    const currentPageClamped = Math.min(Math.max(1, categoriesCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * categoriesPerPage;
    const endIndex = Math.min(startIndex + categoriesPerPage, filtered.length);
    const paginatedCategories = filtered.slice(startIndex, endIndex);

    return (
      <div className="cms-room-categories-view" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Layers size={22} style={{ color: "var(--cms-primary)" }} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "var(--cms-text)" }}>
                Room Categories
              </h2>
              <p style={{ margin: "2px 0 0 0", color: "var(--cms-muted)", fontSize: 12 }}>
                Define room accommodation tiers, standard tariffs, sharing configurations, and amenities
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModal({ isOpen: true, type: "roomType", mode: "add", data: null })}
            style={{ borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, padding: "8px 18px" }}
          >
            <Plus size={16} /> Add Room Type
          </button>
        </div>

        {/* Category Cards Overview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {enrichedCategories.map((cat) => (
            <div
              key={cat.id}
              className="cms-card"
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                boxShadow: "var(--cms-shadow)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "var(--cms-surface)",
                border: "1px solid var(--cms-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <div>
                  <strong style={{ fontSize: 13.5, color: "var(--cms-text)" }}>{cat.name}</strong>
                  <div style={{ fontSize: 11, color: "var(--cms-muted)" }}>{cat.type}</div>
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: 6,
                    background: cat.acType === "AC" ? "rgba(59, 130, 246, 0.12)" : "rgba(100, 116, 139, 0.12)",
                    color: cat.acType === "AC" ? "#2563eb" : "#475569",
                    flexShrink: 0,
                  }}
                >
                  {cat.acType || (cat.type?.includes("AC") && !cat.type?.includes("Non-AC") ? "AC" : "Non-AC")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ fontWeight: 800, color: "var(--cms-primary)" }}>{cat.fee}</span>
                <span style={{ color: "var(--cms-muted)", fontWeight: 600 }}>
                  {cat.totalRooms} Rooms • {cat.totalBeds} Beds
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--cms-border)", paddingTop: 8, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: "var(--cms-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                  {cat.blocks}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    className="cms-action-btn"
                    title="View category"
                    style={{ width: 26, height: 26 }}
                    onClick={() => setModal({ isOpen: true, type: "category", mode: "view", data: cat })}
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    className="cms-action-btn"
                    title="Edit category"
                    style={{ width: 26, height: 26 }}
                    onClick={() => setModal({ isOpen: true, type: "category", mode: "edit", data: cat })}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    type="button"
                    className="cms-action-btn danger"
                    title="Delete category"
                    style={{ width: 26, height: 26 }}
                    onClick={() => handleDeleteCategory(cat)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
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
            <div
              className="cms-hostel-search"
              style={{
                minWidth: 260,
                flex: "1 1 260px",
                maxWidth: 420,
              }}
            >
              <Search size={15} style={{ color: "var(--cms-muted)" }} />
              <input
                type="text"
                placeholder="Search by category or specification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <select
                className="cms-hostel-select"
                value={filterAcType}
                onChange={(e) => setFilterAcType(e.target.value)}
                style={{ minWidth: 200, borderRadius: 10, fontWeight: 600 }}
              >
                <option value="all">All Options</option>
                <option value="AC">AC Accommodation</option>
                <option value="Non-AC">Non-AC Standard</option>
              </select>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ borderRadius: 10, padding: "7px 12px", fontSize: 12 }}
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
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
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
            <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>No room categories found matching filter.</p>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                setSearchQuery("");
                setFilterAcType("all");
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="cms-hostel-compact-card" style={{ border: "1px solid var(--cms-border)", borderRadius: 12, overflow: "hidden", background: "var(--cms-surface)" }}>
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table className="cms-hostel-table" style={{ width: "100%", minWidth: 800 }}>
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
                {paginatedCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <strong>{cat.name}</strong>
                      <div style={{ fontSize: 11, color: "var(--cms-muted)" }}>{cat.specification}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: cat.acType === "AC" ? "rgba(59, 130, 246, 0.12)" : "rgba(100, 116, 139, 0.12)",
                          color: cat.acType === "AC" ? "#2563eb" : "#475569",
                          fontWeight: 700,
                          fontSize: 11.5,
                        }}
                      >
                        {cat.type}
                      </span>
                    </td>
                    <td>{cat.capacity} Person(s)</td>
                    <td style={{ fontWeight: 700, color: "var(--cms-primary)" }}>{cat.fee}</td>
                    <td>{cat.totalRooms} Rooms</td>
                    <td>{cat.totalBeds} Beds</td>
                    <td style={{ maxWidth: 200, fontSize: 11.5 }}>{cat.blocks}</td>
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <HostelPagination
              currentPage={categoriesCurrentPage}
              totalItems={filtered.length}
              pageSize={categoriesPerPage}
              onPageChange={setCategoriesCurrentPage}
              itemLabel="categories"
            />
          )}
        </div>
      )}
      </div>
    );
  };

  // ── Tab 3: Rooms & Bed Allocation ──────────────────────────────────
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

    // Calculate available floors dynamically based on selected hostel block with canonical deduplication
    const availableFloors = (() => {
      const floorSet = new Set();
      if (filterHostelRooms && filterHostelRooms !== "all") {
        const b = blocks.find((blk) => String(blk.id) === String(filterHostelRooms) || blk.code === filterHostelRooms || blk.name === filterHostelRooms);
        if (b) {
          const count = Math.max(1, Number(b.floors || 2));
          for (let i = 0; i < count; i++) {
            floorSet.add(i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`);
          }
        }
        rooms
          .filter((r) => String(r.hostelId) === String(filterHostelRooms) || (b && (String(r.hostelId) === String(b.id) || r.block === b.code || r.block === b.name || r.blockName === b.name || r.blockName === b.code)))
          .forEach((r) => {
            if (r.floor) floorSet.add(normalizeFloorName(r.floor));
          });
      } else {
        ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].forEach((f) => floorSet.add(f));
        rooms.forEach((r) => {
          if (r.floor) floorSet.add(normalizeFloorName(r.floor));
        });
      }
      return sortFloorLabels(Array.from(floorSet));
    })();

    // Helper: Determine if a room is AC or Non-AC
    const isRoomAc = (r) => {
      if (!r) return false;
      const rAc = String(r.acType || "").trim().toLowerCase();
      if (rAc === "ac") return true;
      if (rAc === "non-ac") return false;
      const rType = String(r.type || "").trim().toLowerCase();
      const rSpec = String(r.roomTypeSpecification || "").trim().toLowerCase();
      if ((rType.includes("ac") || rSpec.includes("ac")) && !rType.includes("non-ac") && !rSpec.includes("non-ac")) return true;
      const matchedCat = categories.find((c) =>
        (r.roomTypeId && String(c.id) === String(r.roomTypeId)) ||
        c.name === r.type ||
        (c.specification && c.specification === r.roomTypeSpecification)
      );
      if (matchedCat) {
        const cAc = String(matchedCat.acType || "").trim().toLowerCase();
        if (cAc === "ac") return true;
        if (cAc === "non-ac") return false;
        const cName = String(matchedCat.name || "").trim().toLowerCase();
        const cType = String(matchedCat.type || "").trim().toLowerCase();
        if ((cName.includes("ac") || cType.includes("ac")) && !cName.includes("non-ac") && !cType.includes("non-ac")) return true;
      }
      return false;
    };

    const totalRoomsCount = rooms.length;
    const acRoomsCount = rooms.filter((r) => isRoomAc(r)).length;
    const nonAcRoomsCount = totalRoomsCount - acRoomsCount;
    const occupiedBedsCount = beds.filter((b) => (b.bedStatus || "").toLowerCase() === "occupied").length;
    const availableBedsCount = Math.max(0, beds.length - occupiedBedsCount);

    // Filter rooms by query, hostel block, floor, and AC/Non-AC type
    const filtered = rooms.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        String(r.roomNo || "").toLowerCase().includes(q) ||
        String(r.blockName || "").toLowerCase().includes(q) ||
        String(r.block || "").toLowerCase().includes(q) ||
        String(r.type || "").toLowerCase().includes(q) ||
        String(r.floor || "").toLowerCase().includes(q);

      const b = blocks.find((blk) => String(blk.id) === String(filterHostelRooms) || blk.code === filterHostelRooms || blk.name === filterHostelRooms);
      const matchBlock =
        !filterHostelRooms ||
        filterHostelRooms === "all" ||
        String(r.hostelId) === String(filterHostelRooms) ||
        (b && (
          String(r.hostelId) === String(b.id) ||
          r.block === b.code ||
          r.block === b.name ||
          r.blockName === b.name ||
          r.blockName === b.code
        ));

      const matchFloor = isFloorMatch(r.floor, filterFloor);

      const matchAc = (() => {
        if (!filterAcType || filterAcType === "all") return true;
        const isAc = isRoomAc(r);
        if (filterAcType === "AC") return isAc;
        if (filterAcType === "Non-AC") return !isAc;
        return true;
      })();

      return matchQ && matchBlock && matchFloor && matchAc;
    });

    // Pagination (10 records per page as requested)
    const roomsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / roomsPerPage));
    const currentPageClamped = Math.min(Math.max(1, roomsCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * roomsPerPage;
    const endIndex = Math.min(startIndex + roomsPerPage, filtered.length);
    const paginatedRooms = filtered.slice(startIndex, endIndex);

    return (
      <div className="cms-rooms-view" style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
        {/* Main Header with Primary Action Button: + Add New Room */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Home size={22} style={{ color: "var(--cms-primary)" }} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "var(--cms-text)" }}>
                Rooms &amp; Bed Allocation
              </h2>
              <p style={{ margin: "2px 0 0 0", color: "var(--cms-muted)", fontSize: 12 }}>
                Physical room inventory, AC &amp; Non-AC classifications, floor locations, and bed layouts
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => setModal({ isOpen: true, type: "room", mode: "add", data: null })}
              style={{ borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, padding: "8px 20px", boxShadow: "0 4px 12px rgba(82, 110, 52, 0.2)" }}
            >
              <Plus size={16} /> Add New Room
            </button>
          </div>
        </div>

        {/* Quick Room Classification & Inventory Overview Bar */}
        <div
          className="cms-card"
          style={{
            padding: "14px 20px",
            borderRadius: 16,
            background: "var(--cms-surface)",
            border: "1px solid var(--cms-border)",
            boxShadow: "var(--cms-shadow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--cms-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Room Types:
            </span>

            {/* All Rooms Pill */}
            <button
              type="button"
              className={`cms-btn ${filterAcType === "all" ? "cms-btn-primary" : "cms-btn-ghost"}`}
              onClick={() => {
                setFilterAcType("all");
                setRoomsCurrentPage(1);
              }}
              style={{
                borderRadius: 10,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: filterAcType === "all" ? 800 : 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: filterAcType === "all" ? "2px solid var(--cms-primary)" : "1px solid var(--cms-border)",
              }}
            >
              <span>All Rooms</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: filterAcType === "all" ? "rgba(255,255,255,0.25)" : "var(--cms-subtle)",
                  color: filterAcType === "all" ? "#fff" : "var(--cms-text)",
                  fontWeight: 800,
                }}
              >
                {totalRoomsCount}
              </span>
            </button>

            {/* AC Rooms Pill */}
            <button
              type="button"
              className={`cms-btn ${filterAcType === "AC" ? "cms-btn-primary" : "cms-btn-ghost"}`}
              onClick={() => {
                setFilterAcType("AC");
                setRoomsCurrentPage(1);
              }}
              style={{
                borderRadius: 10,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: filterAcType === "AC" ? 800 : 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: filterAcType === "AC" ? "2px solid #2563eb" : "1px solid var(--cms-border)",
                background: filterAcType === "AC" ? "#2563eb" : undefined,
                color: filterAcType === "AC" ? "#fff" : undefined,
              }}
            >
              <span>❄️ AC Rooms</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: filterAcType === "AC" ? "rgba(255,255,255,0.25)" : "rgba(59, 130, 246, 0.12)",
                  color: filterAcType === "AC" ? "#fff" : "#2563eb",
                  fontWeight: 800,
                }}
              >
                {acRoomsCount}
              </span>
            </button>

            {/* Non-AC Rooms Pill */}
            <button
              type="button"
              className={`cms-btn ${filterAcType === "Non-AC" ? "cms-btn-primary" : "cms-btn-ghost"}`}
              onClick={() => {
                setFilterAcType("Non-AC");
                setRoomsCurrentPage(1);
              }}
              style={{
                borderRadius: 10,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: filterAcType === "Non-AC" ? 800 : 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: filterAcType === "Non-AC" ? "2px solid #475569" : "1px solid var(--cms-border)",
                background: filterAcType === "Non-AC" ? "#475569" : undefined,
                color: filterAcType === "Non-AC" ? "#fff" : undefined,
              }}
            >
              <span>💨 Non-AC Rooms</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: filterAcType === "Non-AC" ? "rgba(255,255,255,0.25)" : "rgba(100, 116, 139, 0.12)",
                  color: filterAcType === "Non-AC" ? "#fff" : "#475569",
                  fontWeight: 800,
                }}
              >
                {nonAcRoomsCount}
              </span>
            </button>
          </div>

          {/* Real-time Bed Inventory Summary */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cms-primary)" }} />
              <span style={{ color: "var(--cms-muted)" }}>Total Beds:</span>
              <strong style={{ color: "var(--cms-text)" }}>{beds.length}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cms-green)" }} />
              <span style={{ color: "var(--cms-muted)" }}>Available:</span>
              <strong style={{ color: "var(--cms-green)" }}>{availableBedsCount}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cms-amber)" }} />
              <span style={{ color: "var(--cms-muted)" }}>Occupied:</span>
              <strong style={{ color: "var(--cms-amber)" }}>{occupiedBedsCount}</strong>
            </div>
          </div>
        </div>

        {/* Selected Room Type Filter Banner Indicator */}
        {filterAcType !== "all" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "var(--cms-subtle, rgba(82, 110, 52, 0.08))",
              borderRadius: 12,
              border: "1px solid var(--cms-border)",
              fontSize: 13,
            }}
          >
            <span>
              Showing: <strong style={{ color: filterAcType === "AC" ? "#2563eb" : "#475569" }}>
                {filterAcType === "AC" ? "❄️ AC Rooms" : "💨 Non-AC Rooms"}
              </strong> ({filtered.length} rooms matched)
            </span>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ padding: "4px 12px", fontSize: 11.5, borderRadius: 8, height: "auto", fontWeight: 700 }}
              onClick={() => {
                setFilterAcType("all");
                setRoomsCurrentPage(1);
              }}
            >
              Show All Rooms
            </button>
          </div>
        )}

        {/* Toolbar with Search and Filters */}
        <div
          className="cms-card"
          style={{
            padding: "12px 18px",
            borderRadius: 18,
            boxShadow: "var(--cms-shadow)",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            {/* Left: Search input */}
            <div
              className="cms-hostel-search"
              style={{
                minWidth: "min(240px, 100%)",
                flex: "1 1 240px",
                maxWidth: 400,
              }}
            >
              <Search size={15} style={{ color: "var(--cms-muted)" }} />
              <input
                type="text"
                placeholder="Search room number, hostel, AC/Non-AC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Right: Filters & Tools */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, maxWidth: "100%", minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--cms-text)" }}>Filter:</span>
              <select
                className="cms-hostel-select"
                value={filterHostelRooms}
                onChange={(e) => {
                  setFilterHostelRooms(e.target.value);
                  setFilterFloor("all");
                }}
                style={{ minWidth: 170, borderRadius: 10, fontWeight: 600 }}
              >
                <option value="all">All Hostels ({blocks.length})</option>
                {Array.from(new Map(blocks.map((b) => [String(b.id || b.code), b])).values()).map((b) => (
                  <option key={b.id || b.code} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={16} style={{ color: "var(--cms-primary)" }} />
                <select
                  className="cms-hostel-select"
                  value={filterFloor}
                  onChange={(e) => setFilterFloor(e.target.value)}
                  style={{ minWidth: 130, borderRadius: 10, fontWeight: 600 }}
                >
                  <option value="all">All Floors</option>
                  {availableFloors.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
              </div>

              <select
                className="cms-hostel-select"
                value={filterAcType}
                onChange={(e) => {
                  setFilterAcType(e.target.value);
                  setRoomsCurrentPage(1);
                }}
                style={{ minWidth: 160, borderRadius: 10, fontWeight: 600 }}
              >
                <option value="all">All Room Types ({totalRoomsCount})</option>
                <option value="AC">❄️ AC Rooms ({acRoomsCount})</option>
                <option value="Non-AC">💨 Non-AC Rooms ({nonAcRoomsCount})</option>
              </select>

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

        {/* Rooms Table */}
        {filtered.length === 0 ? (
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
                setFilterAcType("all");
                setRoomsCurrentPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="cms-hostel-compact-card" style={{ border: "1px solid var(--cms-border)", borderRadius: 12, overflow: "hidden", background: "var(--cms-surface)" }}>
            <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", boxSizing: "border-box" }}>
              <table className="cms-hostel-table" style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Room No</th>
                  <th>Hostel Block</th>
                  <th>Floor</th>
                  <th>Room Sharing / Type</th>
                  <th>Capacity</th>
                  <th>Occupied Beds</th>
                  <th>Bed Layout</th>
                  <th>Monthly Tariff</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((room) => {
                  const rawRoomBeds = [
                    ...beds.filter((b) => Number(b.roomId) === Number(room.id) || String(b.roomId) === String(room.id)),
                    ...(Array.isArray(room.beds) ? room.beds : [])
                  ];
                  const seenBedKeys = new Set();
                  const roomBeds = [];
                  for (const bd of rawRoomBeds) {
                    const k = bd.id ? `id-${bd.id}` : `num-${bd.bedNumber}`;
                    if (!seenBedKeys.has(k)) {
                      seenBedKeys.add(k);
                      roomBeds.push(bd);
                    }
                  }
                  const roomAllocs = allocations.filter((a) => (a.status || "").toLowerCase() === "active" && (Number(a.roomId) === Number(room.id) || roomBeds.some((bd) => Number(bd.id) === Number(a.bedId))));
                  const occupiedCount = roomBeds.filter((b) => (b.bedStatus || "").toLowerCase() === "occupied" || roomAllocs.some((a) => Number(a.bedId) === Number(b.id))).length;
                  const totalCap = roomBeds.length > 0 ? roomBeds.length : (room.capacity || 1);
                  const matchedBlock = blocks.find((b) => Number(b.id) === Number(room.hostelId));
                  const displayBlockName = (room.blockName && room.blockName !== "Hostel Block #1") ? room.blockName : (matchedBlock?.name || "Boys Hostel 1");
                  const displayBlockCode = room.block || matchedBlock?.code || "BH-1";

                  // Resolve monthly tariff from room or matched room category
                  const matchedCat = categories.find((c) =>
                    (room.roomTypeId && String(c.id) === String(room.roomTypeId)) ||
                    c.name === room.type ||
                    c.name === room.roomTypeSpecification ||
                    (c.specification && c.specification === room.roomTypeSpecification)
                  );
                  const resolvedFee = (() => {
                    const rf = room.fee;
                    if (rf && rf !== "-" && rf !== "0" && rf !== 0) {
                      return typeof rf === "number" ? `₹${rf.toLocaleString()}` : String(rf);
                    }
                    if (matchedCat) {
                      const cf = matchedCat.fee || matchedCat.standardMonthlyFee || matchedCat.monthlyFee;
                      if (cf && cf !== "-" && cf !== "0" && cf !== 0) {
                        return typeof cf === "number" ? `₹${cf.toLocaleString()}` : String(cf);
                      }
                    }
                    return "-";
                  })();

                  return (
                    <tr key={room.id || `${room.block}-${room.roomNo}`}>
                      <td style={{ fontWeight: 700, color: "var(--cms-primary)" }}>Room #{room.roomNo}</td>
                      <td>
                        <strong>{displayBlockName}</strong>
                        <div style={{ fontSize: 11, color: "var(--cms-muted)" }}>{displayBlockCode}</div>
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "var(--cms-subtle)",
                          fontWeight: 600,
                          fontSize: 12,
                        }}>
                          {room.floor || "Ground Floor"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: isRoomAc(room) ? "rgba(59, 130, 246, 0.12)" : "rgba(100, 116, 139, 0.12)",
                              color: isRoomAc(room) ? "#2563eb" : "#475569",
                              border: `1px solid ${isRoomAc(room) ? "rgba(59, 130, 246, 0.25)" : "rgba(100, 116, 139, 0.25)"}`,
                            }}
                          >
                            {isRoomAc(room) ? "❄️ AC Room" : "💨 Non-AC Room"}
                          </span>
                        </div>
                        <strong style={{ fontSize: 12.5, color: "var(--cms-text)" }}>
                          {totalCap === 1 ? "Single Bed" : totalCap === 2 ? "2-Bed Sharing" : totalCap === 3 ? "3-Bed Sharing" : totalCap === 4 ? "4-Bed Sharing" : `${totalCap}-Bed Sharing`}
                        </strong>
                      </td>
                      <td>{totalCap} Beds</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: occupiedCount >= totalCap ? "var(--cms-amber)" : "var(--cms-green)",
                          }}
                        >
                          {occupiedCount} / {totalCap}
                        </span>
                      </td>
                      <td style={{ fontSize: 11.5, whiteSpace: "normal", maxWidth: 320, minWidth: 160 }}>
                        {roomBeds.length === 0 ? (
                          <span style={{ color: "var(--cms-muted)", fontStyle: "italic" }}>No beds registered</span>
                        ) : (
                          roomBeds.map((bd, i) => {
                            const alloc = roomAllocs.find((a) => Number(a.bedId) === Number(bd.id));
                            const isOccupied = (bd.bedStatus || "").toLowerCase() === "occupied" || Boolean(alloc);
                            const bedLabel = `${bd.bedNumber || `Bed #${i + 1}`}${alloc?.studentName ? ` • ${alloc.studentName}` : ""}`;
                            return (
                              <span
                                key={bd.id || i}
                                title={isOccupied ? `Occupied by ${alloc?.studentName || "Resident"}` : "Available"}
                                style={{
                                  display: "inline-block",
                                  marginRight: 4,
                                  marginBottom: 2,
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                  background: isOccupied ? "var(--cms-amber-soft)" : "var(--cms-green-soft)",
                                  color: isOccupied ? "var(--cms-amber)" : "var(--cms-green)",
                                  fontWeight: 600,
                                  fontSize: 11,
                                }}
                              >
                                {bedLabel}
                              </span>
                            );
                          })
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--cms-primary)" }}>{resolvedFee}</td>
                      <td>
                        <StatusBadge value={room.status} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="cms-hostel-actions" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="cms-action-btn"
                            title="View details"
                            onClick={() => setModal({ isOpen: true, type: "room", mode: "view", data: { ...room, roomBeds, roomAllocs } })}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (10 rooms per page) */}
          {filtered.length > 0 && (
            <HostelPagination
              currentPage={roomsCurrentPage}
              totalItems={filtered.length}
              pageSize={roomsPerPage}
              onPageChange={setRoomsCurrentPage}
              itemLabel="rooms"
            />
          )}
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
        String(w.name || "").toLowerCase().includes(q) ||
        String(w.empId || "").toLowerCase().includes(q) ||
        String(w.assignedHostels || "").toLowerCase().includes(q) ||
        String(w.designation || "").toLowerCase().includes(q);

      const matchBlock =
        !filterHostelWarden ||
        filterHostelWarden === "all" ||
        String(w.hostelId) === String(filterHostelWarden) ||
        String(w.assignedHostels || "").toLowerCase().includes(String(filterHostelWarden).toLowerCase()) ||
        wardens.some(
          (ow) => Number(ow.staffId) === Number(w.staffId) && (String(ow.hostelId) === String(filterHostelWarden) || String(ow.assignedHostels || "").toLowerCase().includes(String(filterHostelWarden).toLowerCase()))
        );

      return matchQ && matchBlock;
    });

    const isHostelSelected = !filterHostelWarden || filterHostelWarden === "all" || Boolean(filterHostelWarden);

    // Pagination (10 wardens per page)
    const wardensPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / wardensPerPage));
    const currentPageClamped = Math.min(Math.max(1, wardensCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * wardensPerPage;
    const endIndex = Math.min(startIndex + wardensPerPage, filtered.length);
    const paginatedWardens = filtered.slice(startIndex, endIndex);

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
              className="cms-hostel-search"
              style={{
                minWidth: 260,
                flex: "1 1 260px",
                maxWidth: 420,
              }}
            >
              <Search size={15} style={{ color: "var(--cms-muted)" }} />
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
                className="cms-hostel-select"
                value={filterHostelWarden}
                onChange={(e) => setFilterHostelWarden(e.target.value)}
                style={{ minWidth: 200, borderRadius: 10, fontWeight: 600 }}
              >
                <option value="all">All Hostels</option>
                {Array.from(new Map(blocks.map((b) => [String(b.id || b.name), b])).values()).map((b) => (
                  <option key={b.id || b.code || b.name} value={b.id}>
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
          <div className="cms-hostel-compact-card" style={{ border: "1px solid var(--cms-border)", borderRadius: 12, overflow: "hidden", background: "var(--cms-surface)" }}>
            <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
                {paginatedWardens.map((w) => {
                  const s = (!w.name || !w.empId || !w.phone || !w.email)
                    ? (candidateStaff || []).find((st) => Number(st.staffId || st.id) === Number(w.staffId))
                    : null;
                  const matchedBlk = blocks.find((b) => Number(b.id) === Number(w.hostelId) || String(b.id) === String(w.hostelId));
                  const displayName = w.name || w.wardenName || s?.fullName || s?.name || "Resident Warden";
                  const displayEmpId = w.empId || w.employeeId || s?.empId || s?.employeeId || (w.staffId ? `EMP-${w.staffId}` : "-");
                  const displayPhone = w.phone || w.mobileNumber || s?.phone || s?.mobileNumber || "-";
                  const displayEmail = w.email || s?.email || "-";
                  const displayDesig = w.designation || s?.designation || "Resident Warden";

                  return (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600, fontFamily: "monospace" }}>{displayEmpId}</td>
                      <td>
                        <strong>{displayName}</strong>
                      </td>
                      <td>{displayDesig}</td>
                      <td>
                        {(() => {
                          const allAssigned = wardens
                            .filter((ow) => Number(ow.staffId) === Number(w.staffId) && (ow.status || "").toLowerCase() === "active")
                            .map((ow) => {
                              const owBlk = blocks.find((b) => Number(b.id) === Number(ow.hostelId) || String(b.id) === String(ow.hostelId));
                              return (ow.assignedHostels && !ow.assignedHostels.startsWith("Hostel Block #")) ? ow.assignedHostels : (owBlk?.name || ow.assignedHostels || ow.blockName);
                            })
                            .filter(Boolean);
                          const currentFac = (w.assignedHostels && !w.assignedHostels.startsWith("Hostel Block #")) ? w.assignedHostels : (matchedBlk?.name || w.assignedHostels);
                          const displayFacilities = allAssigned.length > 0 ? Array.from(new Set(allAssigned)) : (currentFac ? [currentFac] : []);

                          return (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {displayFacilities.map((fac) => (
                                <span
                                  key={fac}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                    background: "var(--cms-subtle)",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    color: "var(--cms-primary)",
                                    border: "1px solid var(--cms-border)",
                                  }}
                                >
                                  {fac}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ fontFamily: "monospace" }}>{displayPhone}</td>
                      <td>{displayEmail}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <HostelPagination
              currentPage={wardensCurrentPage}
              totalItems={filtered.length}
              pageSize={wardensPerPage}
              onPageChange={setWardensCurrentPage}
              itemLabel="wardens"
            />
          )}
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
        ...blocks.map((b) => b.name).filter(Boolean),
        ...allocations.map((a) => a.blockName).filter(Boolean),
      ])
    );

    // Dynamic floor options strictly deduplicated and canonicalized
    const floorOptions = (() => {
      const set = new Set();
      if (filterAllocHostel !== "all") {
        const blk = blocks.find((b) => b.name === filterAllocHostel || b.code === filterAllocHostel || String(b.id) === String(filterAllocHostel));
        if (blk) {
          const count = Math.max(1, Number(blk.floors || 2));
          for (let i = 0; i < count; i++) {
            set.add(i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`);
          }
        }
        rooms
          .filter((r) => r.blockName === filterAllocHostel || r.block === filterAllocHostel || (blk && (String(r.hostelId) === String(blk.id) || r.block === blk.code || r.blockName === blk.name)))
          .forEach((r) => { if (r.floor) set.add(normalizeFloorName(r.floor)); });
        allocations
          .filter((a) => a.blockName === filterAllocHostel || (blk && (String(a.hostelId) === String(blk.id) || a.blockCode === blk.code || a.blockName === blk.name)))
          .forEach((a) => { if (a.floor) set.add(normalizeFloorName(a.floor)); });
      } else {
        ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"].forEach((f) => set.add(f));
        rooms.forEach((r) => { if (r.floor) set.add(normalizeFloorName(r.floor)); });
        allocations.forEach((a) => { if (a.floor) set.add(normalizeFloorName(a.floor)); });
      }
      return sortFloorLabels(Array.from(set));
    })();

    // Dynamic room options strictly deduplicated and canonicalized
    const roomOptions = (() => {
      const set = new Set();
      const blk = blocks.find((b) => b.name === filterAllocHostel || b.code === filterAllocHostel || String(b.id) === String(filterAllocHostel));
      rooms
        .filter((r) => {
          const matchH = filterAllocHostel === "all" || r.blockName === filterAllocHostel || r.block === filterAllocHostel || (blk && (String(r.hostelId) === String(blk.id) || r.block === blk.code || r.blockName === blk.name));
          const matchF = isFloorMatch(r.floor, filterAllocFloor);
          return matchH && matchF;
        })
        .forEach((r) => {
          const c = cleanRoomNumber(r.roomNo);
          if (c) set.add(c);
        });

      allocations
        .filter((a) => {
          const matchH = filterAllocHostel === "all" || a.blockName === filterAllocHostel || (blk && (String(a.hostelId) === String(blk.id) || a.blockCode === blk.code || a.blockName === blk.name));
          const matchF = isFloorMatch(a.floor, filterAllocFloor);
          return matchH && matchF;
        })
        .forEach((a) => {
          const c = cleanRoomNumber(a.room || a.roomBadge?.split(" ")[0]);
          if (c) set.add(c);
        });

      return Array.from(set).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
        const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });
    })();

    // Filter allocations
    const filtered = allocations.filter((a) => {
      const q = filterAllocSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        String(a.studentName || "").toLowerCase().includes(q) ||
        String(a.admissionNo || "").toLowerCase().includes(q) ||
        String(a.room || "").toLowerCase().includes(q) ||
        String(a.roomBadge || "").toLowerCase().includes(q) ||
        String(a.blockName || "").toLowerCase().includes(q);

      const blk = blocks.find((b) => b.name === filterAllocHostel || b.code === filterAllocHostel || String(b.id) === String(filterAllocHostel));
      const matchHostel =
        filterAllocHostel === "all" ||
        a.blockName === filterAllocHostel ||
        a.blockCode === filterAllocHostel ||
        (blk && (String(a.hostelId) === String(blk.id) || a.blockName === blk.name || a.blockCode === blk.code));

      const matchFloor = isFloorMatch(a.floor, filterAllocFloor);

      const matchRoom =
        filterAllocRoom === "all" ||
        cleanRoomNumber(a.room) === filterAllocRoom ||
        cleanRoomNumber(a.roomBadge?.split(" ")[0]) === filterAllocRoom;

      return matchQ && matchHostel && matchFloor && matchRoom;
    });

    // Pagination (10 records per page as requested: Previous, 1, 2, Next)
    const allocsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / allocsPerPage));
    const currentPageClamped = Math.min(Math.max(1, allocCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * allocsPerPage;
    const endIndex = Math.min(startIndex + allocsPerPage, filtered.length);
    const paginatedAllocs = filtered.slice(startIndex, endIndex);

    return (
      <div className="cms-hostel-stack">
        {/* Header matching Screenshot 1 */}
        <div className="cms-alloc-header-row">
          <div className="cms-alloc-title-group">
            <UserPlus size={22} style={{ color: "var(--cms-primary)" }} />
            <h2>
              {location.pathname.toLowerCase().includes("students") && !location.pathname.toLowerCase().includes("allocat")
                ? "Resident Students"
                : "Student Room Allocations"}
            </h2>
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

        {/* Live Pending Hostel Opted Candidates Section */}
        {unallocatedHostelStudents.length > 0 && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 16,
              background: "var(--cms-bg-subtle, rgba(238, 242, 255, 0.6))",
              border: "1px solid color-mix(in srgb, var(--cms-primary) 30%, transparent)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BedDouble size={18} style={{ color: "var(--cms-primary)" }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--cms-text)" }}>
                  Hostel Applicants Awaiting Room Allocation ({unallocatedHostelStudents.length})
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                Students who selected hostel facility during admission or registration
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {unallocatedHostelStudents.slice(0, 8).map((st) => (
                <div
                  key={`unalloc-${st.studentId || st.admissionNo}`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--cms-surface, #fff)",
                    border: "1px solid var(--cms-border-subtle, #e2e8f0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--cms-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {st.studentName}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--cms-muted)" }}>
                      <span>{st.admissionNo || `ID #${st.studentId}`}</span>
                      {st.preferredBlockName && (
                        <span style={{ background: "rgba(16, 185, 129, 0.12)", color: "#059669", padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>
                          {st.preferredBlockName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ fontSize: 11.5, padding: "4px 10px", height: 28, borderRadius: 8, whiteSpace: "nowrap", fontWeight: 700 }}
                    onClick={() => {
                      setModal({
                        isOpen: true,
                        type: "allocation",
                        mode: "add",
                        data: {
                          studentId: st.studentId,
                          studentName: st.studentName,
                          admissionNo: st.admissionNo,
                          blockName: st.preferredBlockName,
                          blockCode: st.preferredBlockCode,
                          hostelId: st.hostelId,
                          floor: "",
                          room: "",
                          roomId: null,
                          bed: "",
                          bedId: null,
                          joinDate: getTodayDateStr(),
                          status: "Active",
                        },
                      });
                    }}
                  >
                    Allocate Room
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar with EXACTLY 4 Filters */}
        <div className="cms-alloc-toolbar-compact">
          {/* 1. Search Box */}
          <div style={{ position: "relative", width: "100%" }}>
            <Search
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
                setFilterAllocFloor("all");
                setFilterAllocRoom("all");
              }}
              className="cms-alloc-select-compact"
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
              className="cms-alloc-select-compact"
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
              className="cms-alloc-select-compact"
            >
              <option value="all">All Rooms</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  Room #{r}
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
                  paginatedAllocs.map((a) => {
                    const isVacated = a.status === "Vacated";
                    const bedBadge = a.roomBadge || (a.room ? `Room #${a.room}` : "-");
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
                          <span style={{ color: "var(--cms-muted)" }}>{a.joinDate || "-"}</span>
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

          {/* Pagination Controls (10 records per page) */}
          {filtered.length > 0 && (
            <HostelPagination
              currentPage={allocCurrentPage}
              totalItems={filtered.length}
              pageSize={allocsPerPage}
              onPageChange={setAllocCurrentPage}
              itemLabel="allocations"
            />
          )}
        </div>
      </div>
    );
  };

  // 7. Outpass & Leave
  const renderOutpasses = () => {
    const isFiltered = true;

    const filtered = outpasses.filter((o) => {
      const q = outpassSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        String(o.studentName || "").toLowerCase().includes(q) ||
        String(o.admissionNo || "").toLowerCase().includes(q) ||
        String(o.roomNo || "").toLowerCase().includes(q) ||
        String(o.roomNumber || "").toLowerCase().includes(q) ||
        String(o.blockName || "").toLowerCase().includes(q) ||
        String(o.reason || "").toLowerCase().includes(q);

      const reqType = String(o.outpassType || o.requestType || "").toLowerCase();
      const oType = String(outpassType || "").toLowerCase();
      const matchType =
        !outpassType ||
        outpassType === "all" ||
        reqType.includes(oType) ||
        oType.includes(reqType);

      const oStatus = String(o.status || "").toLowerCase();
      const fStatus = String(outpassStatus || "").toLowerCase();
      const matchStatus =
        !outpassStatus ||
        outpassStatus === "all" ||
        oStatus === fStatus ||
        (fStatus === "pending" && (oStatus === "pending" || oStatus === "pending approval"));

      return matchQ && matchType && matchStatus;
    });

    // Pagination (10 requests per page)
    const outpassPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / outpassPerPage));
    const currentPageClamped = Math.min(Math.max(1, outpassCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * outpassPerPage;
    const endIndex = Math.min(startIndex + outpassPerPage, filtered.length);
    const paginatedOutpasses = filtered.slice(startIndex, endIndex);

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
          <div className="cms-outpass-search-wrap">
            <div className="cms-outpass-search-icon">
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
              className="cms-outpass-select"
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
              className="cms-outpass-select"
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
          <>
            {/* Table Card matching Screenshot 2 & 3 */}
            <div className="cms-outpass-table-card" style={{ overflow: "hidden" }}>
              <div className="cms-hostel-table-scroll">
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
                  paginatedOutpasses.map((r) => {
                    const isPending = r.status === "Pending" || r.status === "Pending Approval";
                    const isApproved = r.status === "Approved";
                    const matchedAlloc = (allocations || []).find((a) =>
                      (r.studentId && Number(a.studentId) === Number(r.studentId)) ||
                      (r.admissionNo && a.admissionNo === r.admissionNo) ||
                      (r.studentName && a.studentName === r.studentName)
                    );
                    const sName = r.studentName || matchedAlloc?.studentName || (r.studentId ? `Student #${r.studentId}` : "Resident Student");
                    const admNo = r.admissionNo || matchedAlloc?.admissionNo || "-";
                    const blkName = r.blockName || r.hostelName || matchedAlloc?.blockName || matchedAlloc?.hostelName || "Boys Hostel 1";
                    const rawRNo = r.roomNo || r.roomNumber || matchedAlloc?.roomNumber || matchedAlloc?.room || "101";
                    const roomDisplay = String(rawRNo).replace("Room #", "").trim() || "101";

                    return (
                      <tr key={r.id} className="cms-outpass-row">
                        <td className="cms-outpass-td" style={{ fontWeight: 700, color: "var(--cms-text)" }}>
                          {sName}
                        </td>
                        <td className="cms-outpass-td" style={{ fontFamily: "monospace", color: "var(--cms-muted)", fontSize: 12 }}>
                          {admNo}
                        </td>
                        <td className="cms-outpass-td">
                          <span className="cms-outpass-hostel-link">
                            {blkName} (Room #{roomDisplay})
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

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <HostelPagination
              currentPage={outpassCurrentPage}
              totalItems={filtered.length}
              pageSize={outpassPerPage}
              onPageChange={setOutpassCurrentPage}
              itemLabel="requests"
            />
          )}
        </div>
      </>
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
        String(t.studentName || "").toLowerCase().includes(q) ||
        String(t.admissionNo || "").toLowerCase().includes(q) ||
        String(t.currentRoomDisplay || "").toLowerCase().includes(q) ||
        String(t.currentBlock || "").toLowerCase().includes(q) ||
        String(t.targetBlock || "").toLowerCase().includes(q) ||
        String(t.targetRoom || "").toLowerCase().includes(q) ||
        String(t.targetDisplayTitle || "").toLowerCase().includes(q);

      const filterLower = String(transferFilter || "").toLowerCase();
      const matchFilter =
        !transferFilter ||
        transferFilter === "all" ||
        transferFilter === "Select" ||
        String(t.actionType || "").toLowerCase().includes(filterLower) ||
        String(t.requestType || "").toLowerCase().includes(filterLower);

      return matchQ && matchFilter;
    });

    // Pagination (10 requests per page)
    const transferPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / transferPerPage));
    const currentPageClamped = Math.min(Math.max(1, transferCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * transferPerPage;
    const endIndex = Math.min(startIndex + transferPerPage, filtered.length);
    const paginatedTransfers = filtered.slice(startIndex, endIndex);

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
          <div className="cms-transfer-search-wrap">
            <div className="cms-transfer-search-icon">
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
              className="cms-transfer-filter-trigger"
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
              <div className="cms-transfer-filter-menu">
                <div
                  className={`cms-transfer-filter-option ${transferFilter === "" ? "selected" : ""}`}
                  onClick={() => {
                    setTransferFilter("");
                    setIsTransferFilterOpen(false);
                  }}
                >
                  <span>Select</span>
                </div>
                <div
                  className={`cms-transfer-filter-option ${transferFilter === "all" || !transferFilter ? "selected" : ""}`}
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
                  className={`cms-transfer-filter-option ${transferFilter === "Room Transfer" ? "selected" : ""}`}
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
                  className={`cms-transfer-filter-option ${transferFilter === "Bed Vacate" ? "selected" : ""}`}
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
        <div className="cms-transfer-table-card" style={{ overflow: "hidden" }}>
          <div className="cms-hostel-table-scroll">
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
                paginatedTransfers.map((t) => {
                  const st = (t.status || t.approvalStatus || "Pending").toLowerCase();
                  const isApproved = st === "approved";
                  const isCompleted = st === "completed";
                  const isRejected = st.includes("reject") || st.includes("cancel");
                  const isPending = !isApproved && !isCompleted && !isRejected;

                  const matchedAlloc = (allocations || []).find((a) =>
                    (t.allocationId && Number(a.id || a.allocationId) === Number(t.allocationId)) ||
                    (t.studentId && Number(a.studentId) === Number(t.studentId)) ||
                    (t.admissionNo && a.admissionNo === t.admissionNo)
                  );
                  const sName = t.studentName || matchedAlloc?.studentName || (t.studentId ? `Student #${t.studentId}` : "Resident Student");
                  const admNo = t.admissionNo || matchedAlloc?.admissionNo || "-";
                  const curBlock = t.currentBlock || t.fromHostelName || matchedAlloc?.blockName || (t.currentRoomDisplay ? t.currentRoomDisplay.split(" (")[0] : "Boys Hostel 1");
                  const curRoomRaw = t.currentRoom || t.fromRoomNumber || matchedAlloc?.roomNumber || matchedAlloc?.room || "101";
                  const curRoom = String(curRoomRaw).replace("Room #", "").trim() || "101";

                  return (
                    <tr key={t.id} className="cms-transfer-row">
                      <td className="cms-transfer-td">
                        <span className="cms-transfer-student-name">{sName}</span>
                      </td>
                      <td className="cms-transfer-td">
                        <span className="cms-transfer-adm">{admNo}</span>
                      </td>
                      <td className="cms-transfer-td">
                        <span className="cms-transfer-action-type">{t.actionType || t.requestType}</span>
                      </td>
                      <td className="cms-transfer-td">
                        <div className="cms-transfer-room-cell">
                          <span className="cms-transfer-room-block">
                            {curBlock}
                          </span>
                          <span className="cms-transfer-room-num">
                            (#{curRoom})
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
                        <span
                          className={`cms-outpass-status-pill ${
                            isApproved || isCompleted
                              ? "cms-outpass-status-approved"
                              : isPending
                              ? "cms-outpass-status-pending"
                              : "cms-outpass-status-rejected"
                          }`}
                        >
                          {isPending ? "Pending" : (t.status || t.approvalStatus || "Completed")}
                        </span>
                      </td>
                      <td className="cms-transfer-td" style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateTransferStatus(t.id, "Approved")}
                                className="cms-outpass-action-btn approve"
                                title="Approve Request"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateTransferStatus(t.id, "Rejected")}
                                className="cms-outpass-action-btn reject"
                                title="Reject Request"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setModal({ isOpen: true, type: "transfer", mode: "view", data: t })}
                            className="cms-outpass-action-btn view"
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="cms-outpass-action-btn delete"
                            title="Delete Record"
                            onClick={() => handleDeleteTransfer(t)}
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

        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <HostelPagination
            currentPage={transferCurrentPage}
            totalItems={filtered.length}
            pageSize={transferPerPage}
            onPageChange={setTransferCurrentPage}
            itemLabel="requests"
          />
        )}
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
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.id || "").toLowerCase().includes(q) ||
        String(s.admissionNo || "").toLowerCase().includes(q) ||
        String(s.roomBed || "").toLowerCase().includes(q) ||
        String(s.room || "").toLowerCase().includes(q);

      const blk = blocks.find((b) => b.name === attendanceBlock || b.code === attendanceBlock || String(b.id) === String(attendanceBlock));
      const matchBlock =
        !attendanceBlock ||
        attendanceBlock === "all" ||
        s.block === attendanceBlock ||
        s.blockCode === attendanceBlock ||
        (blk && (s.block === blk.name || s.blockCode === blk.code || String(s.hostelId) === String(blk.id)));

      const matchRoom =
        !attendanceRoom ||
        attendanceRoom === "all" ||
        cleanRoomNumber(s.room) === attendanceRoom ||
        cleanRoomNumber(s.roomBed) === attendanceRoom;

      return matchQ && matchBlock && matchRoom;
    });

    // Pagination (10 students per page)
    const attendancePerPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / attendancePerPage));
    const currentPageClamped = Math.min(Math.max(1, attendanceCurrentPage), totalPages);
    const startIndex = (currentPageClamped - 1) * attendancePerPage;
    const endIndex = Math.min(startIndex + attendancePerPage, filtered.length);
    const paginatedAttendance = filtered.slice(startIndex, endIndex);

    const totalCount = filtered.length;
    const presentCount = filtered.filter((s) => shiftData[s.id]?.status === "Present").length;
    const absentCount = filtered.filter((s) => shiftData[s.id]?.status === "Absent").length;
    const leaveCount = filtered.filter((s) => shiftData[s.id]?.status === "Leave").length;
    const halfDayCount = filtered.filter((s) => shiftData[s.id]?.status === "Half Day").length;

    // Aggregate metrics across active student list for Monthly and Custom range
    let aggPresent = 0;
    let aggAbsent = 0;
    let aggLeave = 0;
    let aggHalf = 0;
    let aggTotal = 0;
    if (attendanceFrequency !== "daily") {
      filtered.forEach((s) => {
        const st = getStudentPeriodStats(s, attendanceFrequency);
        aggPresent += st.present;
        aggAbsent += st.absent;
        aggLeave += st.leave;
        aggHalf += st.halfDay;
        aggTotal += st.total;
      });
    }
    const aggPct = aggTotal > 0 ? Math.round(((aggPresent + aggHalf * 0.5) / aggTotal) * 100) : 0;

    // Available hostel block options for dropdown strictly deduplicated
    const attendanceBlockOptions = Array.from(
      new Set([
        ...blocks.map((b) => b.name).filter(Boolean),
        ...attendanceStudents.map((s) => s.block).filter(Boolean),
      ])
    );

    // Available room options for selected block strictly deduplicated and canonicalized
    const attendanceRoomOptions = (() => {
      const set = new Set();
      const blk = blocks.find((b) => b.name === attendanceBlock || b.code === attendanceBlock || String(b.id) === String(attendanceBlock));
      attendanceStudents
        .filter((s) => !attendanceBlock || attendanceBlock === "all" || s.block === attendanceBlock || s.blockCode === attendanceBlock || (blk && (s.block === blk.name || s.blockCode === blk.code)))
        .forEach((s) => {
          const c = cleanRoomNumber(s.room);
          if (c) set.add(c);
        });
      rooms
        .filter((r) => !attendanceBlock || attendanceBlock === "all" || r.blockName === attendanceBlock || r.block === attendanceBlock || (blk && (String(r.hostelId) === String(blk.id) || r.block === blk.code || r.blockName === blk.name)))
        .forEach((r) => {
          const c = cleanRoomNumber(r.roomNo);
          if (c) set.add(c);
        });
      return Array.from(set).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
        const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });
    })();

    const activeMonthObj = resolvedMonthOptions.find((m) => m.value === attendanceMonth);

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
            <div style={{ position: "relative", width: "100%" }}>
              <Search
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="cms-att-filter-lbl-compact" style={{ margin: 0 }}>
                    ATTENDANCE DATE <span style={{ color: "var(--cms-red)" }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAttendanceDate(getTodayDateStr())}
                    className="cms-att-today-badge-btn"
                    title="Jump to Today's Date"
                  >
                    Today
                  </button>
                </div>
                <div style={{ position: "relative", width: "100%", marginTop: 4 }}>
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
                    className="cms-alloc-select-compact"
                    style={{ height: 34, fontSize: 12.5, fontWeight: 600 }}
                  >
                    {resolvedMonthOptions.map((m) => (
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
                className="cms-alloc-select-compact"
                style={{ height: 34, fontSize: 12.5 }}
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
                className="cms-alloc-select-compact"
                style={{ height: 34, fontSize: 12.5 }}
              >
                <option value="all">All Rooms</option>
                {attendanceRoomOptions.map((rm) => (
                  <option key={rm} value={rm}>
                    Room #{rm}
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
              {attendanceFrequency === "monthly" && `Month: ${activeMonthObj?.label || attendanceMonth}`}
              {attendanceFrequency === "custom" &&
                `Date Range: ${appliedCustomRange.start || "--"} → ${appliedCustomRange.end || "--"}`}
            </span>
          </div>

          {/* Stat Boxes */}
          {attendanceFrequency === "daily" ? (
            <>
              <div className="cms-att-stat-grid-compact">
                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-primary-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-primary)", letterSpacing: "0.04em" }}>
                    TOTAL STUDENTS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-text)", lineHeight: 1 }}>
                    {totalCount}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-green-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-green)", letterSpacing: "0.04em" }}>
                    PRESENT
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-green)", lineHeight: 1 }}>
                    {presentCount}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-red-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-red)", letterSpacing: "0.04em" }}>
                    ABSENT
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-red)", lineHeight: 1 }}>
                    {absentCount}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-info-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-info)", letterSpacing: "0.04em" }}>
                    ON LEAVE
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-info)", lineHeight: 1 }}>
                    {leaveCount}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-amber-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-amber)", letterSpacing: "0.04em" }}>
                    HALF DAY
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-amber)", lineHeight: 1 }}>
                    {halfDayCount}
                  </div>
                </div>
              </div>

              {/* Quick Bulk Actions for Daily Roll Call */}
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
            </>
          ) : (
            <>
              {/* Aggregated Period Stat Boxes */}
              <div className="cms-att-stat-grid-compact">
                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-primary-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-primary)", letterSpacing: "0.04em" }}>
                    TOTAL RESIDENTS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-text)", lineHeight: 1 }}>
                    {totalCount}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-info-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-info)", letterSpacing: "0.04em" }}>
                    RECORDED LOGS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-info)", lineHeight: 1 }}>
                    {aggTotal}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-green-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-green)", letterSpacing: "0.04em" }}>
                    PRESENT LOGS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-green)", lineHeight: 1 }}>
                    {aggPresent}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-red-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-red)", letterSpacing: "0.04em" }}>
                    ABSENT LOGS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-red)", lineHeight: 1 }}>
                    {aggAbsent}
                  </div>
                </div>

                <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-amber-soft)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-amber)", letterSpacing: "0.04em" }}>
                    ATTENDANCE RATE
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--cms-amber)", lineHeight: 1 }}>
                    {aggPct}%
                  </div>
                </div>
              </div>

              <div className="cms-att-period-info-banner">
                <Info size={14} style={{ color: "var(--cms-primary)", flexShrink: 0 }} />
                <span>
                  Showing aggregated records for {attendanceFrequency === "monthly" ? activeMonthObj?.label || attendanceMonth : `${appliedCustomRange.start} → ${appliedCustomRange.end}`}. Click on any student row or <strong>View Logs</strong> to inspect their complete individual history.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Attendance Main Table */}
        <div className="cms-hostel-compact-card">
          <div className="cms-hostel-table-scroll">
            <table className="cms-hostel-compact-table">
              {attendanceFrequency === "daily" ? (
                <>
                  <thead>
                    <tr>
                      <th>ADMISSION NO</th>
                      <th>STUDENT NAME</th>
                      <th>HOSTEL BLOCK</th>
                      <th>ROOM &amp; BED NO</th>
                      <th style={{ textAlign: "center" }}>ATTENDANCE STATUS</th>
                      <th style={{ textAlign: "center" }}>IN TIME</th>
                      <th style={{ textAlign: "center" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "36px 18px", color: "var(--cms-muted)" }}>
                          <Users size={30} style={{ color: "var(--cms-muted)", marginBottom: 6 }} />
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cms-text)" }}>No Students Found</div>
                          <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>No resident students match the selected block and filters.</div>
                        </td>
                      </tr>
                    ) : (
                      paginatedAttendance.map((s) => {
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
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForAttendance(s)}
                                className="cms-att-student-btn"
                                title="Click to view full attendance history"
                              >
                                <strong>{s.name}</strong>
                              </button>
                            </td>
                            <td>
                              <span style={{ color: "var(--cms-text)", fontWeight: 600 }}>{s.block}</span>
                            </td>
                            <td>
                              <span style={{ color: "var(--cms-muted)" }}>{s.roomBed || `${s.room} (${s.bed})`}</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
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
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForAttendance(s)}
                                className="cms-att-view-action-btn"
                                title="View Student Attendance Log"
                              >
                                <Eye size={13} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr>
                      <th>ADMISSION NO</th>
                      <th>STUDENT NAME</th>
                      <th>HOSTEL BLOCK</th>
                      <th>ROOM &amp; BED NO</th>
                      <th style={{ textAlign: "center" }}>PRESENT</th>
                      <th style={{ textAlign: "center" }}>ABSENT</th>
                      <th style={{ textAlign: "center" }}>ON LEAVE</th>
                      <th style={{ textAlign: "center" }}>HALF DAY</th>
                      <th style={{ textAlign: "center" }}>TOTAL LOGS</th>
                      <th style={{ textAlign: "center" }}>ATTENDANCE %</th>
                      <th style={{ textAlign: "center" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: "36px 18px", color: "var(--cms-muted)" }}>
                          <Users size={30} style={{ color: "var(--cms-muted)", marginBottom: 6 }} />
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cms-text)" }}>No Students Found</div>
                          <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>No resident students match the selected block and filters.</div>
                        </td>
                      </tr>
                    ) : (
                      paginatedAttendance.map((s) => {
                        const stats = getStudentPeriodStats(s, attendanceFrequency);
                        return (
                          <tr key={s.id}>
                            <td>
                              <span style={{ color: "var(--cms-muted)", fontWeight: 500 }}>
                                {s.admissionNo || s.id}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForAttendance(s)}
                                className="cms-att-student-btn"
                                title={`Click to view ${attendanceFrequency === "monthly" ? "monthly" : "custom range"} details`}
                              >
                                <strong>{s.name}</strong>
                              </button>
                            </td>
                            <td>
                              <span style={{ color: "var(--cms-text)", fontWeight: 600 }}>{s.block}</span>
                            </td>
                            <td>
                              <span style={{ color: "var(--cms-muted)" }}>{s.roomBed || `${s.room} (${s.bed})`}</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="cms-att-stat-badge is-present">{stats.present}d</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="cms-att-stat-badge is-absent">{stats.absent}d</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="cms-att-stat-badge is-leave">{stats.leave}d</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="cms-att-stat-badge is-halfday">{stats.halfDay}d</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <strong style={{ color: "var(--cms-text)", fontSize: 13 }}>
                                {stats.total}
                              </strong>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className={`cms-att-pct-pill ${
                                  stats.pct >= 75 ? "is-high" : stats.pct >= 50 ? "is-mid" : "is-low"
                                }`}
                              >
                                {stats.pct}%
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForAttendance(s)}
                                className="cms-att-view-action-btn"
                                title="View detailed logs"
                              >
                                <Eye size={13} /> {attendanceFrequency === "monthly" ? "View Month" : "View Range"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </>
              )}
            </table>
          </div>

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <HostelPagination
              currentPage={attendanceCurrentPage}
              totalItems={filtered.length}
              pageSize={attendancePerPage}
              onPageChange={setAttendanceCurrentPage}
              itemLabel="students"
            />
          )}
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
      const bFilter = String(reportBlockFilter || "").toLowerCase().trim();
      const matchedBlock = blocks.find(
        (b) => String(b.name || "").toLowerCase().trim() === bFilter || String(b.code || "").toLowerCase().trim() === bFilter
      );
      const bId = matchedBlock?.id;

      filtered = filtered.filter((item) => {
        if (!item) return false;

        // Check exact ID match if both IDs are available
        if (bId && (item.hostelId || item.blockId || item.id)) {
          if (reportCategory === "Block Report") {
            if (String(item.id) === String(bId)) return true;
          } else if (reportCategory === "Transfer & Vacate Report") {
            if (String(item.fromHostelId) === String(bId) || String(item.toHostelId) === String(bId) || String(item.hostelId) === String(bId)) return true;
          } else {
            if (String(item.hostelId) === String(bId) || String(item.blockId) === String(bId)) return true;
          }
        }

        // Check contextual block name field
        let blk = "";
        if (reportCategory === "Block Report") {
          blk = String(item.name || item.hostelName || item.code || item.hostelCode || "");
        } else if (reportCategory === "Warden Report") {
          blk = String(item.assignedHostels || item.hostelName || item.blockName || blocks.find(b => Number(b.id) === Number(item.hostelId))?.name || "");
        } else if (reportCategory === "Room Report") {
          blk = String(item.blockName || item.block || item.hostelName || blocks.find(b => Number(b.id) === Number(item.hostelId))?.name || "");
        } else if (reportCategory === "Bed Allocation Report" || reportCategory === "Student Allocation Report") {
          blk = String(item.blockName || item.hostelName || item.blockCode || blocks.find(b => Number(b.id) === Number(item.hostelId))?.name || "");
        } else if (reportCategory === "Attendance Report") {
          blk = String(item.block || item.blockName || "");
        } else if (reportCategory === "Outpass & Leave Report") {
          blk = String(item.blockName || item.hostelName || blocks.find(b => Number(b.id) === Number(item.hostelId))?.name || "");
        } else if (reportCategory === "Transfer & Vacate Report") {
          blk = String(item.currentBlock || item.fromHostelName || item.toHostelName || item.targetBlock || "");
        } else {
          blk = String(item.blockName || item.assignedHostels || item.hostelName || item.block || "");
        }

        const blkClean = blk.toLowerCase().trim();
        if (!blkClean) return false;
        return blkClean.includes(bFilter) || bFilter.includes(blkClean);
      });
    }

    // 3. Filter by Category / Status
    if (reportCategoryFilter && reportCategoryFilter !== "all" && reportCategoryFilter !== "") {
      const cFilter = String(reportCategoryFilter || "").toLowerCase().trim();
      filtered = filtered.filter((item) => {
        if (!item) return false;
        const iStatus = String(item.status || "").toLowerCase().trim();
        if (cFilter === "active") return iStatus === "active";
        if (cFilter === "inactive") return iStatus !== "active";

        const catOrType = String(item.category || item.type || item.acType || item.requestType || item.outpassType || item.actionType || item.hostelType || "").toLowerCase().trim();
        if (cFilter === "boys hostel") return catOrType.includes("boy");
        if (cFilter === "girls hostel") return catOrType.includes("girl");
        if (cFilter === "co-ed") return catOrType.includes("co-ed");
        if (cFilter === "ac") return catOrType.includes("ac") && !catOrType.includes("non-ac");
        if (cFilter === "non-ac") return catOrType.includes("non-ac");
        if (cFilter === "pending") return iStatus === "pending" || catOrType === "pending";
        if (cFilter === "approved") return iStatus === "approved" || catOrType === "approved";
        if (cFilter === "rejected") return iStatus === "rejected" || catOrType === "rejected";

        const matchStatus = iStatus.includes(cFilter);
        const matchCat = catOrType.includes(cFilter);
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
            { key: "code", label: "Block Code", getter: (r) => r.code || r.hostelCode || "-" },
            { key: "name", label: "Block Name", getter: (r) => r.name || r.hostelName || "-" },
            { key: "type", label: "Category", getter: (r) => r.type || r.category || r.hostelType || "Boys" },
            { key: "floors", label: "Total Floors", getter: (r) => r.floors ?? r.totalFloors ?? 1 },
            { key: "warden", label: "Warden Name", getter: (r) => r.warden || r.wardenName || "Unassigned" },
            { key: "wardenPhone", label: "Primary Mobile", getter: (r) => r.wardenPhone || r.primaryMobile || r.primaryMobileNumber || "-" },
            { key: "address", label: "Location", getter: (r) => r.address || r.location || "Main Campus" },
            { key: "status", label: "Status", getter: (r) => r.status || "Active" },
          ];
        case "Room Report":
          return [
            { key: "roomNo", label: "Room No", getter: (r) => r.roomNo || r.roomNumber || r.room || "-" },
            { key: "blockName", label: "Block Name", getter: (r) => r.blockName || r.block || r.hostelName || blocks.find((b) => Number(b.id) === Number(r.hostelId))?.name || "-" },
            { key: "floor", label: "Floor", getter: (r) => r.floor || "1st Floor" },
            { key: "type", label: "Category", getter: (r) => r.type || r.category || (r.acType ? `${r.acType} Standard` : "Standard") },
            { key: "capacity", label: "Total Beds", getter: (r) => r.capacity ?? r.totalBeds ?? r.bedCapacity ?? 1 },
            { key: "occupied", label: "Occupied Beds", getter: (r) => {
              const rAllocs = allocations.filter((a) => (a.status || "").toLowerCase() === "active" && (Number(a.roomId) === Number(r.id) || (r.roomNo && String(a.roomNumber) === String(r.roomNo) && Number(a.hostelId) === Number(r.hostelId))));
              const distinctBeds = new Set(rAllocs.map((a) => a.bedId || a.bedNumber).filter(Boolean));
              return distinctBeds.size > 0 ? distinctBeds.size : rAllocs.length;
            }},
            { key: "vacantBeds", label: "Vacant Beds", getter: (r) => {
              const cap = r.capacity ?? r.totalBeds ?? r.bedCapacity ?? 1;
              const rAllocs = allocations.filter((a) => (a.status || "").toLowerCase() === "active" && (Number(a.roomId) === Number(r.id) || (r.roomNo && String(a.roomNumber) === String(r.roomNo) && Number(a.hostelId) === Number(r.hostelId))));
              const distinctBeds = new Set(rAllocs.map((a) => a.bedId || a.bedNumber).filter(Boolean));
              const occ = distinctBeds.size > 0 ? distinctBeds.size : rAllocs.length;
              return Math.max(0, cap - occ);
            }},
            { key: "status", label: "Status", getter: (r) => {
              const cap = r.capacity ?? r.totalBeds ?? r.bedCapacity ?? 1;
              const rAllocs = allocations.filter((a) => (a.status || "").toLowerCase() === "active" && (Number(a.roomId) === Number(r.id) || (r.roomNo && String(a.roomNumber) === String(r.roomNo) && Number(a.hostelId) === Number(r.hostelId))));
              const distinctBeds = new Set(rAllocs.map((a) => a.bedId || a.bedNumber).filter(Boolean));
              const occ = distinctBeds.size > 0 ? distinctBeds.size : rAllocs.length;
              return occ >= cap ? "Occupied" : occ > 0 ? "Partially Occupied" : (r.status || "Available");
            }},
          ];
        case "Bed Allocation Report":
        case "Student Allocation Report":
          return [
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || "-" },
            { key: "studentName", label: "Student Name", getter: (r) => r.studentName || r.name || "-" },
            { key: "gender", label: "Gender", getter: (r) => r.gender || "-" },
            { key: "blockName", label: "Hostel Block", getter: (r) => r.blockName || r.hostelName || r.blockCode || blocks.find((b) => Number(b.id) === Number(r.hostelId))?.name || "-" },
            { key: "roomBadge", label: "Room & Bed", getter: (r) => r.roomBadge || (r.room && r.bed ? `${r.room} (${r.bed})` : r.room || "-") },
            { key: "joinDate", label: "Join Date", getter: (r) => r.joinDate ? (typeof r.joinDate === "string" ? r.joinDate.split("T")[0] : String(r.joinDate).split("T")[0]) : "-" },
            { key: "monthlyFee", label: "Monthly Fee", getter: (r) => r.monthlyFee ? `₹${r.monthlyFee}` : (r.fee ? `₹${r.fee}` : "-") },
            { key: "status", label: "Status", getter: (r) => r.status || "Active" },
          ];
        case "Attendance Report":
          return [
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || r.id || "-" },
            { key: "studentName", label: "Student Name", getter: (r) => r.name || r.studentName || "-" },
            { key: "block", label: "Block", getter: (r) => r.block || r.blockName || "-" },
            { key: "roomBed", label: "Room & Bed", getter: (r) => r.roomBed || (r.room && r.bed ? `${r.room} (${r.bed})` : r.room || "-") },
            { key: "morning", label: "Morning Shift", getter: (r) => {
              const val = (typeof attendanceMap?.morning?.[r.id] === "object" ? attendanceMap?.morning?.[r.id]?.status : attendanceMap?.morning?.[r.id])
                || (typeof attendanceMap?.morning?.[r.studentId] === "object" ? attendanceMap?.morning?.[r.studentId]?.status : attendanceMap?.morning?.[r.studentId])
                || (typeof attendanceMap?.morning?.[r.admissionNo] === "object" ? attendanceMap?.morning?.[r.admissionNo]?.status : attendanceMap?.morning?.[r.admissionNo]);
              return val || "Present";
            }},
            { key: "night", label: "Night Inspection", getter: (r) => {
              const val = (typeof attendanceMap?.night?.[r.id] === "object" ? attendanceMap?.night?.[r.id]?.status : attendanceMap?.night?.[r.id])
                || (typeof attendanceMap?.night?.[r.studentId] === "object" ? attendanceMap?.night?.[r.studentId]?.status : attendanceMap?.night?.[r.studentId])
                || (typeof attendanceMap?.night?.[r.admissionNo] === "object" ? attendanceMap?.night?.[r.admissionNo]?.status : attendanceMap?.night?.[r.admissionNo]);
              return val || "Present";
            }},
          ];
        case "Outpass & Leave Report":
          return [
            { key: "studentName", label: "Student Name", getter: (r) => r.studentName || "-" },
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || "-" },
            { key: "outpassType", label: "Outpass Type", getter: (r) => r.requestType || r.outpassType || "Outpass" },
            { key: "blockName", label: "Hostel & Room", getter: (r) => r.blockName ? `${r.blockName} (#${r.roomNo || r.roomNumber || r.room || "-"})` : (r.roomNo || r.roomNumber || r.room || "-") },
            { key: "departureDate", label: "Departure", getter: (r) => r.departureDate || r.outDate || "-" },
            { key: "returnDate", label: "Expected Return", getter: (r) => r.returnDate || "-" },
            { key: "status", label: "Status", getter: (r) => r.status || "Pending" },
          ];
        case "Transfer & Vacate Report":
          return [
            { key: "studentName", label: "Student Name", getter: (r) => r.studentName || "-" },
            { key: "admissionNo", label: "Adm No", getter: (r) => r.admissionNo || "-" },
            { key: "actionType", label: "Action Type", getter: (r) => r.actionType || r.requestType || "-" },
            { key: "currentRoomDisplay", label: "Current Room", getter: (r) => r.currentRoomDisplay || (r.currentBlock ? `${r.currentBlock}${r.currentRoom ? ` (#${r.currentRoom})` : ""}` : "-") },
            { key: "targetDisplayTitle", label: "Target Room / Fee Adjustment", getter: (r) => r.targetDisplayTitle || (r.targetBlock ? `${r.targetBlock} (${r.targetRoom || ""})` : (r.feeAdjustment || "-")) },
            { key: "date", label: "Date", getter: (r) => r.date || r.requestDate || "-" },
            { key: "status", label: "Status", getter: (r) => r.status || "Completed" },
          ];
        case "Warden Report":
          return [
            { key: "empId", label: "Emp ID", getter: (r) => r.empId || r.employeeId || "-" },
            { key: "name", label: "Warden Name", getter: (r) => r.name || r.wardenName || "-" },
            { key: "designation", label: "Designation", getter: (r) => r.designation || "Hostel Warden" },
            { key: "assignedHostels", label: "Supervised Facilities", getter: (r) => r.assignedHostels || r.hostelName || r.blockName || blocks.find((b) => Number(b.id) === Number(r.hostelId))?.name || "-" },
            { key: "phone", label: "Primary Mobile", getter: (r) => r.phone || r.mobileNumber || "-" },
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

        const [jspdfModule, autoTableModule] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
        ]);
        const jsPDF = jspdfModule?.default || jspdfModule?.jsPDF || jspdfModule;
        const autoTable = autoTableModule?.default || autoTableModule?.autoTable || autoTableModule;

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

        const tableOptions = {
          startY: 80,
          head: [cols.map((c) => c.label)],
          body: rows.map((row) =>
            cols.map((c) => String(c.getter ? c.getter(row) : (row[c.key] ?? "-")))
          ),
          styles: { fontSize: 8, cellPadding: 4, textColor: [17, 24, 39] },
          headStyles: { fillColor: [45, 106, 79], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          margin: { left: 36, right: 36 },
        };

        if (typeof autoTable === "function") {
          autoTable(doc, tableOptions);
        } else if (typeof doc.autoTable === "function") {
          doc.autoTable(tableOptions);
        }

        const safeName = reportCategory.toLowerCase().replace(/[^a-z0-9]/g, "_");
        doc.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
        showToast(`${reportCategory} exported as PDF successfully!`);
      } catch (err) {
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
                className="cms-report-select"
                value={reportBlockFilter}
                onChange={(e) => {
                  setReportBlockFilter(e.target.value);
                  setReportPage(1);
                }}
              >
                <option value="">-- Select Hostel Block --</option>
                <option value="all">All Hostel Blocks</option>
                {Array.from(new Set(blocks.map((b) => b.name).filter(Boolean))).map((bName) => (
                  <option key={bName} value={bName}>
                    {bName}
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
                className="cms-report-select"
                value={reportCategory}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setReportCategory(newCat);
                  setReportCategoryFilter("");
                  setReportPage(1);
                  if (newCat === "Warden Report" && wardens.length === 0) {
                    refreshWardens();
                  }
                }}
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
                className="cms-report-select"
                value={reportCategoryFilter}
                onChange={(e) => {
                  setReportCategoryFilter(e.target.value);
                  setReportPage(1);
                }}
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
          <div className="cms-report-search-wrap">
            <div className="cms-report-search-icon">
              <Search size={15} />
            </div>
            <input
              type="text"
              className="cms-report-search-input"
              placeholder="Search hostel report records..."
              value={reportSearch}
              onChange={(e) => {
                setReportSearch(e.target.value);
                setReportPage(1);
              }}
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
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{item.code || item.hostelCode || "-"}</td>
                        <td className="cms-report-td" style={{ fontWeight: 600, color: "var(--cms-text)" }}>{item.name || item.hostelName || "-"}</td>
                        <td className="cms-report-td">{item.category || item.type || item.hostelType || "Hostel"}</td>
                        <td className="cms-report-td">{item.totalFloors ?? item.floors ?? 1}</td>
                        <td className="cms-report-td">{item.wardenName || item.warden || "Unassigned"}</td>
                        <td className="cms-report-td">{item.primaryMobile || item.wardenPhone || item.primaryMobileNumber || "-"}</td>
                        <td className="cms-report-td">{item.location || item.address || "Main Campus"}</td>
                        <td className="cms-report-td">
                          <span className={item.status === "Active" ? "cms-report-status-active" : "cms-report-status-inactive"}>
                            {item.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Room Report") {
                    const roomNo = item.roomNo || item.roomNumber || item.room || "-";
                    const blockName = item.blockName || item.block || item.hostelName || blocks.find((b) => Number(b.id) === Number(item.hostelId))?.name || "-";
                    const floor = item.floor || "1st Floor";
                    const category = item.type || item.category || (item.acType ? `${item.acType} Standard` : "Standard");
                    const totalBeds = item.capacity ?? item.totalBeds ?? item.bedCapacity ?? 1;
                    const rAllocs = allocations.filter((a) => (a.status || "").toLowerCase() === "active" && (Number(a.roomId) === Number(item.id) || (item.roomNo && String(a.roomNumber) === String(item.roomNo) && Number(a.hostelId) === Number(item.hostelId))));
                    const distinctBeds = new Set(rAllocs.map((a) => a.bedId || a.bedNumber).filter(Boolean));
                    const occupiedBeds = distinctBeds.size > 0 ? distinctBeds.size : rAllocs.length;
                    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
                    const roomStatus = occupiedBeds >= totalBeds ? "Occupied" : occupiedBeds > 0 ? "Partially Occupied" : (item.status || "Available");
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{roomNo}</td>
                        <td className="cms-report-td">{blockName}</td>
                        <td className="cms-report-td">{floor}</td>
                        <td className="cms-report-td">{category}</td>
                        <td className="cms-report-td">{totalBeds}</td>
                        <td className="cms-report-td" style={{ color: "var(--cms-amber)", fontWeight: 700 }}>{occupiedBeds}</td>
                        <td className="cms-report-td" style={{ color: "var(--cms-green)", fontWeight: 700 }}>{vacantBeds}</td>
                        <td className="cms-report-td">
                          <span className={occupiedBeds >= totalBeds ? "cms-report-status-inactive" : "cms-report-status-active"}>{roomStatus}</span>
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Bed Allocation Report" || reportCategory === "Student Allocation Report") {
                    const admNo = item.admissionNo || "-";
                    const sName = item.studentName || item.name || "-";
                    const gender = item.gender || "-";
                    const blk = item.blockName || item.hostelName || item.blockCode || blocks.find((b) => Number(b.id) === Number(item.hostelId))?.name || "-";
                    const rmBadge = item.roomBadge || (item.room && item.bed ? `${item.room} (${item.bed})` : (item.room || "-"));
                    const jDate = item.joinDate ? (typeof item.joinDate === "string" ? item.joinDate.split("T")[0] : String(item.joinDate).split("T")[0]) : "-";
                    const feeVal = item.monthlyFee ? `₹${item.monthlyFee}` : (item.fee ? `₹${item.fee}` : "-");
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{admNo}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{sName}</td>
                        <td className="cms-report-td">{gender}</td>
                        <td className="cms-report-td">{blk}</td>
                        <td className="cms-report-td">{rmBadge}</td>
                        <td className="cms-report-td">{jDate}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{feeVal}</td>
                        <td className="cms-report-td">
                          <StatusBadge value={item.status || "Active"} />
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Attendance Report") {
                    const morn = (typeof attendanceMap?.morning?.[item.id] === "object" ? attendanceMap?.morning?.[item.id]?.status : attendanceMap?.morning?.[item.id])
                      || (typeof attendanceMap?.morning?.[item.studentId] === "object" ? attendanceMap?.morning?.[item.studentId]?.status : attendanceMap?.morning?.[item.studentId])
                      || (typeof attendanceMap?.morning?.[item.admissionNo] === "object" ? attendanceMap?.morning?.[item.admissionNo]?.status : attendanceMap?.morning?.[item.admissionNo])
                      || "Present";
                    const night = (typeof attendanceMap?.night?.[item.id] === "object" ? attendanceMap?.night?.[item.id]?.status : attendanceMap?.night?.[item.id])
                      || (typeof attendanceMap?.night?.[item.studentId] === "object" ? attendanceMap?.night?.[item.studentId]?.status : attendanceMap?.night?.[item.studentId])
                      || (typeof attendanceMap?.night?.[item.admissionNo] === "object" ? attendanceMap?.night?.[item.admissionNo]?.status : attendanceMap?.night?.[item.admissionNo])
                      || "Present";
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{item.admissionNo || item.id || "-"}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.name || item.studentName || "-"}</td>
                        <td className="cms-report-td">{item.block || item.blockName || "-"}</td>
                        <td className="cms-report-td">{item.roomBed || item.room || "-"}</td>
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
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.studentName || "-"}</td>
                        <td className="cms-report-td">{item.admissionNo || "-"}</td>
                        <td className="cms-report-td">{item.outpassType || item.requestType || "Outpass"}</td>
                        <td className="cms-report-td">{item.blockName ? `${item.blockName} • ${item.roomNo || item.roomNumber || item.room || "-"}` : (item.roomNo || item.roomNumber || item.room || "-")}</td>
                        <td className="cms-report-td">{item.departureDate || item.outDate || "-"}</td>
                        <td className="cms-report-td">{item.returnDate || "-"}</td>
                        <td className="cms-report-td">
                          <StatusBadge value={item.status || "Pending"} />
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Transfer & Vacate Report") {
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.studentName || "-"}</td>
                        <td className="cms-report-td">{item.admissionNo || "-"}</td>
                        <td className="cms-report-td">{item.actionType || item.requestType || "-"}</td>
                        <td className="cms-report-td">{item.currentRoomDisplay || (item.currentBlock ? `${item.currentBlock}${item.currentRoom ? ` (#${item.currentRoom})` : ""}` : "-")}</td>
                        <td className="cms-report-td">
                          {item.targetDisplayTitle || `${item.targetBlock || ""} (${item.targetRoom || ""})`}
                        </td>
                        <td className="cms-report-td">{item.date || item.requestDate || "-"}</td>
                        <td className="cms-report-td">
                          <span className="cms-transfer-status-completed">{item.status || "Completed"}</span>
                        </td>
                      </tr>
                    );
                  }
                  if (reportCategory === "Warden Report") {
                    const blockDisplay = item.assignedHostels || item.hostelName || item.blockName || blocks.find((b) => Number(b.id) === Number(item.hostelId))?.name || "-";
                    return (
                      <tr key={item.id || idx} className="cms-report-row">
                        <td className="cms-report-td" style={{ fontWeight: 600 }}>{item.empId || item.employeeId || "-"}</td>
                        <td className="cms-report-td" style={{ fontWeight: 700 }}>{item.name || item.wardenName || "-"}</td>
                        <td className="cms-report-td">{item.designation || "Hostel Warden"}</td>
                        <td className="cms-report-td">{blockDisplay}</td>
                        <td className="cms-report-td">{item.phone || item.mobileNumber || "-"}</td>
                        <td className="cms-report-td">{item.email || "-"}</td>
                        <td className="cms-report-td">
                          <StatusBadge value={item.status || "Active"} />
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
                className="cms-report-page-size-select"
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
            {(() => {
              if (totalReportPages <= 5) {
                return Array.from({ length: totalReportPages }, (_, i) => i + 1);
              }
              let start = Math.max(1, safeReportPage - 2);
              let end = Math.min(totalReportPages, start + 4);
              if (end - start < 4) {
                start = Math.max(1, end - 4);
              }
              const pages = [];
              for (let i = start; i <= end; i++) {
                pages.push(i);
              }
              return pages;
            })().map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cms-btn ${p === safeReportPage ? "cms-btn-primary" : "cms-btn-ghost"}`}
                  style={{
                    minWidth: 32,
                    height: 30,
                    padding: 0,
                    fontSize: 12,
                    borderRadius: 6,
                    fontWeight: p === safeReportPage ? 800 : 600,
                  }}
                  onClick={() => setReportPage(p)}
                >
                  {p}
                </button>
              ))}
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
                setBlocksCurrentPage(1);
                setRoomsCurrentPage(1);
                setWardensCurrentPage(1);
                setCategoriesCurrentPage(1);
              }}
            >
              {SubIcon && <SubIcon size={14} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {activeSetupSubtab === "blocks" && renderHostelBlocks()}
      {(activeSetupSubtab === "rooms" || activeSetupSubtab === "categories") && renderRooms()}
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
                setAllocCurrentPage(1);
                setAttendanceCurrentPage(1);
                setOutpassCurrentPage(1);
                setTransferCurrentPage(1);
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
  // MAIN RENDER WITH DASHBOARDLAYOUT
  // ═════════════════════════════════════════════════════════════════════
  return (
    <DashboardLayout
      title={isWardenRoute ? "Hostel Warden Portal" : "Hostel Management"}
      subtitle={
        isWardenRoute
          ? "Resident student oversight, room & bed allocations, daily attendance, outpass approvals, and hostel analytics."
          : "Manage hostel blocks, room categories, inventory, wardens, resident student allocations, outpasses, attendance and audit reports."
      }
      breadcrumb={isWardenRoute ? undefined : ["Hostel Management"]}
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

        {/* If viewing a dedicated sidebar field (like Warden portal routes), render ONLY that view */}
        {isDedicatedView ? (
          <div className="cms-hostel-stack">
            {activeSection === "dashboard" && renderDashboard()}
            {activeSection === "rooms" && renderRooms()}
            {activeSection === "allocations" && renderAllocations()}
            {activeSection === "students" && renderAllocations()}
            {activeSection === "attendance" && renderAttendance()}
            {activeSection === "outpasses" && renderOutpasses()}
            {activeSection === "transfers" && renderTransfers()}
            {activeSection === "blocks" && renderHostelBlocks()}
            {activeSection === "wardens" && renderWardens()}
            {activeSection === "reports" && renderReportsSection()}
            {activeSection === "setup" && renderSetupMasters()}
          </div>
        ) : (
          <>
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
                      setBlocksCurrentPage(1);
                      setRoomsCurrentPage(1);
                      setWardensCurrentPage(1);
                      setCategoriesCurrentPage(1);
                      setAllocCurrentPage(1);
                      setAttendanceCurrentPage(1);
                      setOutpassCurrentPage(1);
                      setTransferCurrentPage(1);
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
          </>
        )}

        {/* Global Modals */}
        {modal.isOpen && modal.type === "block" && (
          <BlockModal
            modal={modal}
            closeModal={closeModal}
            handleSaveBlock={handleSaveBlock}
            setActiveMajorTab={setActiveMajorTab}
            setActiveSetupSubtab={setActiveSetupSubtab}
            setFilterHostelRooms={setFilterHostelRooms}
            blocks={blocks}
            isWardenRoute={isWardenRoute}
            navigate={navigate}
          />
        )}
        {modal.isOpen && (modal.type === "category" || modal.type === "roomType") && (
          <CategoryModal
            modal={modal}
            closeModal={closeModal}
            handleSaveCategory={handleSaveCategory}
          />
        )}
        {modal.isOpen && modal.type === "roomSharingConfig" && (
          <RoomSharingConfigModal
            modal={modal}
            blocks={blocks}
            closeModal={closeModal}
            handleSaveRoomSharingConfig={handleSaveRoomSharingConfig}
            showToast={showToast}
          />
        )}
        {modal.isOpen && modal.type === "room" && (
          <RoomModal
            modal={modal}
            closeModal={closeModal}
            blocks={blocks}
            categories={categories}
            rooms={rooms}
            beds={beds}
            allocations={allocations}
            handleSaveRoom={handleSaveRoom}
            handleSaveRoomSharingConfig={handleSaveRoomSharingConfig}
            setModal={setModal}
            refreshCategories={refreshCategories}
            showToast={showToast}
          />
        )}
        {modal.isOpen && modal.type === "warden" && (
          <WardenModal
            modal={modal}
            closeModal={closeModal}
            blocks={blocks}
            wardens={wardens}
            candidateStaff={candidateStaff}
            handleSaveWarden={handleSaveWarden}
            showToast={showToast}
          />
        )}
        {modal.isOpen && modal.type === "allocation" && (
          <AllocationModal
            modal={modal}
            closeModal={closeModal}
            blocks={blocks}
            rooms={rooms}
            beds={beds}
            allocations={allocations}
            candidateAdmissions={candidateAdmissions}
            candidateStudents={candidateStudents}
            canAccessAdminEndpoints={canAccessAdminEndpoints}
            handleSaveAllocation={handleSaveAllocation}
            showToast={showToast}
          />
        )}
        {modal.isOpen && modal.type === "vacate" && (
          <VacateModal
            modal={modal}
            closeModal={closeModal}
            handleVacateAllocation={handleVacateAllocation}
          />
        )}
        {modal.isOpen && modal.type === "outpass" && (
          <OutpassModal
            modal={modal}
            closeModal={closeModal}
            allocations={allocations}
            outpasses={outpasses}
            handleSaveOutpass={handleSaveOutpass}
            showToast={showToast}
          />
        )}
        {modal.isOpen && modal.type === "transfer" && (
          <TransferModal
            modal={modal}
            closeModal={closeModal}
            blocks={blocks}
            rooms={rooms}
            beds={beds}
            allocations={allocations}
            handleSaveTransfer={handleSaveTransfer}
            showToast={showToast}
          />
        )}

        {/* Student Attendance Detailed Log Modal */}
        {selectedStudentForAttendance && (
          <StudentAttendanceModal
            student={selectedStudentForAttendance}
            onClose={() => setSelectedStudentForAttendance(null)}
            attendanceRecords={attendanceRecords}
            attendanceMap={attendanceMap}
            attendanceShift={attendanceShift}
            attendanceDate={attendanceDate}
            attendanceMonth={attendanceMonth}
            customRangeStart={customRangeStart}
            customRangeEnd={customRangeEnd}
            appliedCustomRange={appliedCustomRange}
            academicMonthOptions={resolvedMonthOptions}
            attendanceFrequency={attendanceFrequency}
            onToggleAttendance={handleToggleAttendance}
            onSaveAttendanceLog={handleSaveAttendanceLog}
            exportCsv={exportCsv}
          />
        )}

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

// ═════════════════════════════════════════════════════════════════════
// MODAL FORMS (TOP-LEVEL COMPONENTS)
// ═════════════════════════════════════════════════════════════════════

// Student Individual Attendance Logs Modal
function StudentAttendanceModal({
  student,
  onClose,
  attendanceRecords,
  attendanceMap,
  attendanceShift,
  attendanceDate,
  attendanceMonth,
  customRangeStart,
  customRangeEnd,
  appliedCustomRange,
  academicMonthOptions,
  attendanceFrequency,
  onToggleAttendance,
  onSaveAttendanceLog,
  exportCsv,
}) {
  const [activeMode, setActiveMode] = useState(attendanceFrequency || "daily");
  const [filterShift, setFilterShift] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(attendanceMonth || getCurrentMonthStr());
  const [rangeStart, setRangeStart] = useState(customRangeStart || `${getCurrentMonthStr()}-01`);
  const [rangeEnd, setRangeEnd] = useState(customRangeEnd || getTodayDateStr());
  const [selectedDate, setSelectedDate] = useState(attendanceDate || getTodayDateStr());
  const [searchLog, setSearchLog] = useState("");

  const sId = student.studentId ? Number(student.studentId) : null;
  const admNo = student.admissionNo || student.id;

  // Derive all records for this student
  const studentLogs = useMemo(() => {
    let logs = (attendanceRecords || []).filter((r) => {
      if (sId && r.studentId && Number(r.studentId) === sId) return true;
      if (admNo && r.admissionNo && r.admissionNo === admNo) return true;
      if (r.studentId && String(r.studentId) === String(student.id)) return true;
      return false;
    });

    // Also include in-memory active status from attendanceMap for attendanceDate
    ["morning", "night"].forEach((sh) => {
      const activeEntry = attendanceMap?.[sh]?.[student.id];
      if (activeEntry?.status) {
        const hasLog = logs.some(
          (r) =>
            (r.attendanceDate || r.date) === attendanceDate &&
            (r.session || "").toLowerCase().startsWith(sh[0])
        );
        if (!hasLog) {
          logs.push({
            id: `temp-${attendanceDate}-${sh}-${student.id}`,
            attendanceId: `temp-${attendanceDate}-${sh}-${student.id}`,
            date: attendanceDate,
            attendanceDate: attendanceDate,
            session: sh === "morning" ? "Morning" : "Night",
            status: activeEntry.status,
            inTime: activeEntry.inTime || (sh === "morning" ? "07:00" : "20:00"),
            remarks: activeEntry.remarks || "Today's roll call",
            roomNumber: student.room,
            bedNumber: student.bed,
            hostelName: student.block,
          });
        }
      }
    });

    if (activeMode === "daily") {
      logs = logs.filter((r) => (r.attendanceDate || r.date) === selectedDate);
    } else if (activeMode === "monthly") {
      logs = logs.filter((r) => {
        const d = r.attendanceDate || r.date || "";
        return d.startsWith(selectedMonth);
      });
    } else if (activeMode === "custom") {
      logs = logs.filter((r) => {
        const d = r.attendanceDate || r.date || "";
        return (!rangeStart || d >= rangeStart) && (!rangeEnd || d <= rangeEnd);
      });
    }

    if (filterShift !== "all") {
      logs = logs.filter((r) => (r.session || "").toLowerCase().startsWith(filterShift[0]));
    }

    if (searchLog.trim()) {
      const q = searchLog.toLowerCase().trim();
      logs = logs.filter(
        (r) =>
          (r.remarks && r.remarks.toLowerCase().includes(q)) ||
          (r.status && r.status.toLowerCase().includes(q)) ||
          (r.session && r.session.toLowerCase().includes(q)) ||
          (r.date && r.date.includes(q))
      );
    }

    // Sort newest first
    return [...logs].sort((a, b) => {
      const da = a.attendanceDate || a.date || "";
      const db = b.attendanceDate || b.date || "";
      if (da !== db) return db.localeCompare(da);
      return (b.session || "").localeCompare(a.session || "");
    });
  }, [
    student,
    attendanceRecords,
    attendanceMap,
    activeMode,
    selectedDate,
    selectedMonth,
    rangeStart,
    rangeEnd,
    filterShift,
    searchLog,
    attendanceDate,
    sId,
    admNo,
  ]);

  // Summary stats
  const stats = useMemo(() => {
    const present = studentLogs.filter((r) => r.status === "Present").length;
    const absent = studentLogs.filter((r) => r.status === "Absent").length;
    const leave = studentLogs.filter((r) => r.status === "Leave").length;
    const halfDay = studentLogs.filter((r) => r.status === "Half Day").length;
    const total = studentLogs.length;
    const pct = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;
    return { present, absent, leave, halfDay, total, pct };
  }, [studentLogs]);

  const handleExportIndividual = () => {
    const exportData = studentLogs.map((r) => ({
      admissionNo: student.admissionNo || student.id,
      studentName: student.name,
      block: student.block || r.hostelName || "--",
      roomBed: student.roomBed || `${student.room} (${student.bed})`,
      date: r.attendanceDate || r.date,
      session: r.session || "--",
      status: r.status || "--",
      inTime: r.inTime || "--",
      remarks: r.remarks || "--",
      markedBy: r.markedByStaffName || "--",
    }));

    exportCsv(
      `attendance-${student.admissionNo || student.name}-${activeMode}.csv`,
      exportData,
      [
        { key: "admissionNo", label: "Admission No" },
        { key: "studentName", label: "Student Name" },
        { key: "block", label: "Hostel Block" },
        { key: "roomBed", label: "Room & Bed" },
        { key: "date", label: "Attendance Date" },
        { key: "session", label: "Session" },
        { key: "status", label: "Attendance Status" },
        { key: "inTime", label: "In Time" },
        { key: "remarks", label: "Remarks" },
        { key: "markedBy", label: "Marked By" },
      ]
    );
  };

  const currentDailyShiftStatus = attendanceMap?.[attendanceShift]?.[student.id]?.status || "";

  return (
    <Modal
      title={`Attendance History: ${student.name}`}
      onClose={onClose}
      className="cms-hostel-modal-lg"
    >
      <div className="cms-student-att-modal-body">
        {/* Student Info Card */}
        <div className="cms-student-att-banner">
          <div className="cms-student-att-avatar">
            <Users size={22} />
          </div>
          <div className="cms-student-att-info">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--cms-text)" }}>
                {student.name}
              </h3>
              <span className="cms-student-att-adm-badge">
                Adm #{student.admissionNo || student.id}
              </span>
              {student.gender && (
                <span className="cms-student-att-pill">
                  {student.gender}
                </span>
              )}
            </div>
            <div className="cms-student-att-meta-row">
              <span><strong>Block:</strong> {student.block}</span>
              <span>•</span>
              <span><strong>Room &amp; Bed:</strong> {student.roomBed || `${student.room} (${student.bed})`}</span>
              {student.floor && (
                <>
                  <span>•</span>
                  <span><strong>Floor:</strong> {student.floor}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mode Switcher Bar */}
        <div className="cms-student-att-ctrl-bar">
          <div className="cms-att-freq-compact" role="tablist" aria-label="Student Attendance Mode">
            <button
              type="button"
              className={`cms-att-freq-btn-compact ${activeMode === "daily" ? "is-active" : ""}`}
              onClick={() => setActiveMode("daily")}
            >
              Daily
            </button>
            <button
              type="button"
              className={`cms-att-freq-btn-compact ${activeMode === "monthly" ? "is-active" : ""}`}
              onClick={() => setActiveMode("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`cms-att-freq-btn-compact ${activeMode === "custom" ? "is-active" : ""}`}
              onClick={() => setActiveMode("custom")}
            >
              Custom Range
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Filter by Shift */}
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="cms-alloc-select-compact"
              style={{ height: 32, fontSize: 12, minWidth: 100 }}
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning Only</option>
              <option value="night">Night Only</option>
            </select>

            <button
              type="button"
              onClick={handleExportIndividual}
              className="cms-att-export-btn-compact"
              style={{ height: 32, fontSize: 12 }}
            >
              <FileSpreadsheet size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Dynamic Period Selectors */}
        <div className="cms-student-att-filter-row">
          {activeMode === "daily" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-muted)" }}>Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="cms-alloc-input-compact"
                style={{ height: 32, width: 140, fontSize: 12 }}
              />
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateStr())}
                className="cms-att-today-badge-btn"
                title="Reset to Today"
              >
                Today
              </button>

              {/* Quick Roll Call Marker for this student on selectedDate if it's attendanceDate */}
              {selectedDate === attendanceDate && (
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cms-muted)" }}>
                    Mark for Today ({attendanceShift}):
                  </span>
                  <div className="cms-att-status-group" style={{ transform: "scale(0.9)", transformOrigin: "right center" }}>
                    <button
                      type="button"
                      className={`cms-att-status-pill ${currentDailyShiftStatus === "Present" ? "is-present" : ""}`}
                      onClick={() => onToggleAttendance(student.id, "Present")}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      className={`cms-att-status-pill ${currentDailyShiftStatus === "Absent" ? "is-absent" : ""}`}
                      onClick={() => onToggleAttendance(student.id, "Absent")}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      className={`cms-att-status-pill ${currentDailyShiftStatus === "Half Day" ? "is-halfday" : ""}`}
                      onClick={() => onToggleAttendance(student.id, "Half Day")}
                    >
                      Half Day
                    </button>
                    <button
                      type="button"
                      className={`cms-att-status-pill ${currentDailyShiftStatus === "Leave" ? "is-leave" : ""}`}
                      onClick={() => onToggleAttendance(student.id, "Leave")}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMode === "monthly" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-muted)" }}>Select Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="cms-alloc-select-compact"
                style={{ height: 32, fontSize: 12, minWidth: 160 }}
              >
                {academicMonthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeMode === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-muted)" }}>Date Range:</label>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="cms-alloc-input-compact"
                style={{ height: 32, width: 135, fontSize: 12 }}
                aria-label="Start Date"
              />
              <ArrowRight size={13} style={{ color: "var(--cms-muted)" }} />
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="cms-alloc-input-compact"
                style={{ height: 32, width: 135, fontSize: 12 }}
                aria-label="End Date"
              />
              <button
                type="button"
                onClick={() => {
                  setRangeStart(`${getCurrentMonthStr()}-01`);
                  setRangeEnd(getTodayDateStr());
                }}
                className="cms-att-today-badge-btn"
                title="Reset Range"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* 5 Summary Stat Boxes */}
        <div className="cms-att-stat-grid-compact" style={{ marginTop: 10, marginBottom: 12 }}>
          <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-primary-soft)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-primary)", letterSpacing: "0.04em" }}>
              TOTAL LOGS
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--cms-text)", lineHeight: 1 }}>
              {stats.total}
            </div>
          </div>

          <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-green-soft)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-green)", letterSpacing: "0.04em" }}>
              PRESENT
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--cms-green)", lineHeight: 1 }}>
              {stats.present}
            </div>
          </div>

          <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-red-soft)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-red)", letterSpacing: "0.04em" }}>
              ABSENT
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--cms-red)", lineHeight: 1 }}>
              {stats.absent}
            </div>
          </div>

          <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-info-soft)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-info)", letterSpacing: "0.04em" }}>
              ON LEAVE
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--cms-info)", lineHeight: 1 }}>
              {stats.leave}
            </div>
          </div>

          <div className="cms-att-stat-box-compact" style={{ background: "var(--cms-amber-soft)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--cms-amber)", letterSpacing: "0.04em" }}>
              RATE %
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--cms-amber)", lineHeight: 1 }}>
              {stats.pct}%
            </div>
          </div>
        </div>

        {/* Detailed Records Table */}
        <div className="cms-hostel-compact-card" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table className="cms-hostel-compact-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>SESSION</th>
                <th style={{ textAlign: "center" }}>STATUS</th>
                <th style={{ textAlign: "center" }}>IN TIME</th>
                <th>ROOM &amp; BED</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {studentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "30px 16px", color: "var(--cms-muted)" }}>
                    <Calendar size={24} style={{ color: "var(--cms-muted)", marginBottom: 4 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cms-text)" }}>
                      No Records Logged
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>
                      No attendance records found for this period.
                    </div>
                  </td>
                </tr>
              ) : (
                studentLogs.map((log) => {
                  const dateStr = log.attendanceDate || log.date;
                  let dayOfWeek = "";
                  if (dateStr) {
                    try {
                      const d = new Date(dateStr);
                      if (!isNaN(d.getTime())) {
                        dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
                      }
                    } catch (_) { /* Optional background refresh can fail without blocking the current action. */ }
                  }
                  return (
                    <tr key={log.id || `${log.date}-${log.session}`}>
                      <td>
                        <strong style={{ color: "var(--cms-text)", fontSize: 12.5 }}>{dateStr}</strong>
                        {dayOfWeek && (
                          <span style={{ fontSize: 11, color: "var(--cms-muted)", marginLeft: 6 }}>
                            ({dayOfWeek})
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                          {(log.session || "").toLowerCase().includes("morn") ? (
                            <Sun size={13} style={{ color: "var(--cms-amber)" }} />
                          ) : (
                            <Moon size={13} style={{ color: "var(--cms-primary)" }} />
                          )}
                          {log.session || "Night"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`cms-att-status-pill ${
                            log.status === "Present"
                              ? "is-present"
                              : log.status === "Absent"
                              ? "is-absent"
                              : log.status === "Leave"
                              ? "is-leave"
                              : "is-halfday"
                          }`}
                          style={{ pointerEvents: "none" }}
                        >
                          {log.status || "Present"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <strong style={{ color: "var(--cms-text)", fontSize: 12 }}>
                          {log.inTime || "--"}
                        </strong>
                      </td>
                      <td>
                        <span style={{ color: "var(--cms-muted)", fontSize: 12 }}>
                          {student.roomBed || `${student.room} (${student.bed})`}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "var(--cms-muted)", fontSize: 11.5 }}>
                          {log.remarks || "--"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          {selectedDate === attendanceDate && (
            <button
              type="button"
              onClick={onSaveAttendanceLog}
              className="cms-btn cms-btn-primary"
              style={{ borderRadius: 8, height: 34, fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Save size={14} /> Save Active Changes
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="cms-btn cms-btn-secondary"
            style={{ borderRadius: 8, height: 34, fontSize: 12.5, fontWeight: 600, marginLeft: "auto" }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Block Modal
function BlockModal({ modal, closeModal, handleSaveBlock, setActiveMajorTab, setActiveSetupSubtab, setFilterHostelRooms, blocks = [], isWardenRoute = false, navigate }) {
    const isView = modal.mode === "view";
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState(
      modal.data || {
        name: "",
        code: "",
        type: "Boys",
        floors: 1,
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

    const duplicateCodeWarning = useMemo(() => {
      const trimmedCode = (form.code || "").trim().toUpperCase();
      if (!trimmedCode || !Array.isArray(blocks)) return null;
      const found = blocks.some((b) => {
        if (modal.mode === "edit" && (String(b.id) === String(form.id) || String(b.hostelId) === String(form.id))) {
          return false;
        }
        return (b.code || b.hostelCode || "").trim().toUpperCase() === trimmedCode;
      });
      return found ? `Block code "${trimmedCode}" already exists. Please choose a different code.` : null;
    }, [form.code, form.id, blocks, modal.mode]);

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
          onSubmit={async (e) => {
            e.preventDefault();
            if (duplicateCodeWarning || isSubmitting) return;
            setIsSubmitting(true);
            try {
              await handleSaveBlock(form);
            } finally {
              setIsSubmitting(false);
            }
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
                placeholder="e.g. BLK-C"
                value={form.code || ""}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                style={duplicateCodeWarning ? { borderColor: "#ef4444" } : undefined}
              />
              {duplicateCodeWarning && (
                <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", fontWeight: 500 }}>
                  {duplicateCodeWarning}
                </div>
              )}
            </div>

            <div className="cms-block-modal-field">
              <label>
                Category <span className="required-star">*</span>
              </label>
              <select
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
              <select
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
            <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal} disabled={isSubmitting}>
              {isView ? "Close" : "Cancel"}
            </button>
            {isView && (
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => {
                  if (isWardenRoute && navigate) {
                    navigate("/warden-dashboard/rooms");
                  } else if (setActiveMajorTab && setActiveSetupSubtab) {
                    setActiveMajorTab("setup");
                    setActiveSetupSubtab("rooms");
                  }
                  if (setFilterHostelRooms) setFilterHostelRooms(String(form.id || form.code || ""));
                  closeModal();
                }}
              >
                View Rooms in Block
              </button>
            )}
            {!isView && (
              <button
                type="submit"
                className="cms-btn cms-btn-primary"
                disabled={isSubmitting}
                style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
              >
                {isSubmitting ? "Saving..." : modal.mode === "edit" ? "Save Changes" : "Save"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

// ── Room Sharing Config Modal (3-Step Wizard matching Images 3, 4, 5) ──
function RoomSharingConfigModal({ modal, blocks, closeModal, handleSaveRoomSharingConfig, showToast }) {
    const defaultBlock = useMemo(
      () => blocks.find((b) => b.code && b.name) || blocks[0],
      [blocks]
    );
    const [activeStep, setActiveStep] = useState("block"); // starts with Step 1: Block & Floor Setup
    const [selectedBlockCode, setSelectedBlockCode] = useState(() => defaultBlock?.code || String(defaultBlock?.id || ""));
    const [selectedFloorLevel, setSelectedFloorLevel] = useState("");

    const selectedBlock = useMemo(
      () => blocks.find((b) => b.code === selectedBlockCode || String(b.id) === String(selectedBlockCode)) || defaultBlock,
      [selectedBlockCode, blocks, defaultBlock]
    );

    const initFloorConfigs = (block) => {
      const numFloors = Math.max(1, Number(block?.floors || 3));
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
          customAllocations: [],
        };
      });
    };

    const [floorConfigs, setFloorConfigs] = useState(() => initFloorConfigs(defaultBlock || null));

    // When user selects a different block
    const handleBlockChange = (codeOrId) => {
      setSelectedBlockCode(codeOrId);
      setSelectedFloorLevel("");
      const b = blocks.find((blk) => blk.code === codeOrId || String(blk.id) === String(codeOrId));
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
                  <select
                    required
                    value={selectedBlockCode}
                    onChange={(e) => handleBlockChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--cms-border)",
                      background: "var(--cms-surface)",
                      color: selectedBlockCode ? "var(--cms-text)" : "var(--cms-muted)",
                      fontSize: 13,
                      fontWeight: 600,
                      outline: "none",
                    }}
                  >
                    <option value="" disabled>Select Hostel Block...</option>
                    {Array.from(new Map(blocks.map((b) => [String(b.id || b.code), b])).values()).map((b) => (
                      <option key={b.id || b.code} value={b.code}>
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
                      <select
                        value={floorConfigs.length || selectedBlock.floors || 3}
                        onChange={(e) => handleFloorCountChange(Number(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          borderRadius: 8,
                          border: "1px solid var(--cms-border)",
                          background: "var(--cms-subtle)",
                          color: "var(--cms-primary)",
                          fontSize: 12,
                          fontWeight: 700,
                          outline: "none",
                        }}
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
                <select
                  disabled={!selectedBlock}
                  value={selectedFloorLevel}
                  onChange={(e) => setSelectedFloorLevel(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--cms-border)",
                    background: "var(--cms-surface)",
                    color: "var(--cms-text)",
                    fontSize: 13,
                    outline: "none",
                  }}
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
                      <select
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
function CategoryModal({ modal, closeModal, handleSaveCategory }) {
    const isView = modal.mode === "view";
    const [form, setForm] = useState(() => {
      if (modal.data) {
        return {
          id: modal.data.id,
          name: modal.data.name || modal.data.specification || "",
          type: modal.data.type || (modal.data.acType === "AC" ? "AC Accommodation" : "Non-AC Standard"),
          capacity: Number(modal.data.capacity) || 2,
          fee: modal.data.fee || "₹7,500/mo",
          specification: modal.data.specification || modal.data.description || "",
          blocks: modal.data.blocks || "All Blocks",
          status: modal.data.status || "Active",
        };
      }
      return {
        name: "",
        type: "AC Accommodation",
        capacity: 2,
        fee: "₹7,500/mo",
        specification: "",
        blocks: "All Blocks",
        status: "Active",
      };
    });

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
              <select
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
            <div>
              <label>Status</label>
              <select
                disabled={isView}
                value={form.status || "Active"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
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
// ── Room Modal (Unified Workflow: Block -> Floor -> Room Number -> Category -> AC -> Sharing -> Capacity -> Beds -> Save) ──
function RoomModal({
  modal,
  closeModal,
  blocks = [],
  categories = [],
  rooms = [],
  beds = [],
  allocations = [],
  handleSaveRoom,
  handleSaveRoomSharingConfig,
  setModal,
  refreshCategories,
  showToast,
}) {
  const isView = modal.mode === "view";
  const [modalTab, setModalTab] = useState("floor"); // "floor" | "bulkBlock"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Standard Tariffs for AC vs Non-AC based on bed sharing capacity
  const STANDARD_TARIFFS = {
    AC: {
      1: "₹10,000/mo",
      2: "₹8,500/mo",
      3: "₹7,000/mo",
      4: "₹6,000/mo",
    },
    "Non-AC": {
      1: "₹7,000/mo",
      2: "₹5,500/mo",
      3: "₹4,500/mo",
      4: "₹3,500/mo",
    },
  };

  const detectRoomAc = (r) => {
    if (!r) return true;
    const rAc = String(r.acType || "").trim().toLowerCase();
    if (rAc === "ac") return true;
    if (rAc === "non-ac") return false;
    const rType = String(r.type || "").trim().toLowerCase();
    const rSpec = String(r.roomTypeSpecification || "").trim().toLowerCase();
    if ((rType.includes("ac") || rSpec.includes("ac")) && !rType.includes("non-ac") && !rSpec.includes("non-ac")) return true;
    return false;
  };

  const resolveBestCategory = (catList, acType, cap) => {
    const isAc = acType === "AC";
    const isCatAc = (c) => {
      const cType = String(c.type || "").toLowerCase();
      const cAc = String(c.acType || "").toLowerCase();
      const cName = String(c.name || "").toLowerCase();
      const cSpec = String(c.specification || "").toLowerCase();
      if (cAc === "ac") return true;
      if (cAc === "non-ac") return false;
      if ((cType.includes("ac") || cName.includes("ac") || cSpec.includes("ac")) &&
          !cType.includes("non-ac") && !cName.includes("non-ac") && !cSpec.includes("non-ac")) {
        return true;
      }
      return false;
    };

    const exact = catList.find((c) => isCatAc(c) === isAc && Number(c.capacity) === Number(cap));
    if (exact) return exact;
    const acMatch = catList.find((c) => isCatAc(c) === isAc);
    if (acMatch) return acMatch;
    return catList[0] || null;
  };

  const [form, setForm] = useState(() => {
    if (modal.data) {
      const foundBlock = blocks.find(
        (b) => String(b.id) === String(modal.data.hostelId) || b.code === modal.data.block || b.name === modal.data.block
      );
      const isAc = detectRoomAc(modal.data);
      const cap = Number(modal.data.capacity || modal.data.bedCapacity || 2);
      const acStr = isAc ? "AC" : "Non-AC";
      const matchedCat = resolveBestCategory(categories, acStr, cap);
      const standardFee = STANDARD_TARIFFS[acStr]?.[cap] || (isAc ? "₹8,500/mo" : "₹5,500/mo");

      return {
        ...modal.data,
        block: foundBlock ? String(foundBlock.id) : (modal.data.block || (blocks[0]?.id ? String(blocks[0].id) : "")),
        hostelId: foundBlock ? foundBlock.id : (modal.data.hostelId || blocks[0]?.id),
        blockName: foundBlock ? foundBlock.name : (modal.data.blockName || modal.data.block || ""),
        acType: acStr,
        capacity: cap,
        roomTypeId: matchedCat ? matchedCat.id : (modal.data.roomTypeId || categories[0]?.id || ""),
        type: `${acStr} ${cap === 1 ? "Single" : cap === 2 ? "Double" : cap === 3 ? "Triple" : "4-Sharing"} Room`,
        fee: modal.data.fee && modal.data.fee !== "-" && modal.data.fee !== "0" ? modal.data.fee : standardFee,
        floor: modal.data.floor || "Ground Floor",
        roomNo: String(modal.data.roomNo || modal.data.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim(),
        status: modal.data.status || "Active",
      };
    }
    const firstBlock = blocks.find((b) => b.name && b.code) || blocks[0];
    const initialAc = "AC";
    const initialCap = 2;
    const matchedCat = resolveBestCategory(categories, initialAc, initialCap);
    return {
      roomNo: "",
      block: firstBlock ? String(firstBlock.id) : "",
      hostelId: firstBlock ? firstBlock.id : "",
      blockName: firstBlock ? firstBlock.name : "",
      floor: "Ground Floor",
      acType: initialAc,
      capacity: initialCap,
      roomTypeId: matchedCat ? matchedCat.id : (categories[0]?.id || ""),
      type: `${initialAc} ${initialCap === 1 ? "Single" : initialCap === 2 ? "Double" : initialCap === 3 ? "Triple" : "4-Sharing"} Room`,
      fee: STANDARD_TARIFFS[initialAc][initialCap],
      status: "Active",
    };
  });

  // Selected block to compute floors and inventory
  const selectedBlock = useMemo(() => {
    return blocks.find(
      (b) => String(b.id) === String(form.block) || b.code === form.block || b.name === form.block
    ) || blocks[0];
  }, [blocks, form.block]);

  // Dynamic floor list for selected block
  const floorList = useMemo(() => {
    const set = new Set();
    if (selectedBlock) {
      const count = Math.max(1, Number(selectedBlock.floors || 2));
      for (let i = 0; i < count; i++) {
        set.add(i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`);
      }
    } else {
      ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor"].forEach((f) => set.add(f));
    }
    if (form.floor) {
      set.add(normalizeFloorName(form.floor));
    }
    return sortFloorLabels(Array.from(set));
  }, [selectedBlock, form.floor]);

  // Floor matching helper
  const isFloorMatch = (roomFloor, targetFloor) => {
    if (!roomFloor || !targetFloor) return false;
    const rLower = String(roomFloor).toLowerCase().trim();
    const tLower = String(targetFloor).toLowerCase().trim();
    if (rLower === tLower) return true;
    if (rLower.includes("ground") && tLower.includes("ground")) return true;
    const rDigit = rLower.match(/\d+/)?.[0];
    const tDigit = tLower.match(/\d+/)?.[0];
    if (rDigit && tDigit) return rDigit === tDigit;
    return rLower.includes(tLower) || tLower.includes(rLower);
  };

  // Rooms and Beds in this block
  const blockRooms = useMemo(() => {
    if (!selectedBlock) return [];
    const bId = String(selectedBlock.id);
    const bCode = String(selectedBlock.code || "").trim().toLowerCase();
    const bName = String(selectedBlock.name || "").trim().toLowerCase();
    return rooms.filter((r) => {
      if (String(r.hostelId) === bId) return true;
      if (bCode && String(r.block).trim().toLowerCase() === bCode) return true;
      if (bName && String(r.blockName).trim().toLowerCase() === bName) return true;
      return false;
    });
  }, [rooms, selectedBlock]);

  const blockBeds = useMemo(() => {
    const rIds = new Set(blockRooms.map((r) => Number(r.id)).filter(Boolean));
    return beds.filter((b) => rIds.has(Number(b.roomId)));
  }, [beds, blockRooms]);

  // Existing rooms on the selected floor
  const floorExistingRooms = useMemo(() => {
    if (!form.floor) return [];
    return blockRooms.filter((r) => isFloorMatch(r.floor, form.floor));
  }, [blockRooms, form.floor]);

  // Parse room numbers helper
  const parseRoomNumbers = (inputStr) => {
    if (!inputStr) return [];
    const parts = String(inputStr).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const result = [];
    for (const part of parts) {
      const clean = part.replace(/^Room\s*#?\s*/i, "").trim();
      const rangeMatch = clean.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const minVal = Math.min(start, end);
        const maxVal = Math.max(start, end);
        const padLen = rangeMatch[1].length;
        for (let num = minVal; num <= maxVal && (num - minVal) < 50; num++) {
          result.push(String(num).padStart(padLen, "0"));
        }
      } else if (clean) {
        result.push(clean);
      }
    }
    return [...new Set(result)];
  };

  const parsedRooms = useMemo(() => parseRoomNumbers(form.roomNo), [form.roomNo]);

  // All configurable rooms for this floor (parsed from input + existing on this floor)
  const floorConfigurableRooms = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. First add rooms from input field
    parsedRooms.forEach((rNum) => {
      const cleanNum = String(rNum).replace(/^Room\s*#?\s*/i, "").trim();
      const existingMatch = floorExistingRooms.find((er) => {
        const erClean = String(er.roomNo || er.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
        return erClean === cleanNum.toLowerCase() || parseInt(erClean, 10) === parseInt(cleanNum, 10);
      });
      seen.add(cleanNum.toLowerCase());
      list.push({
        roomNumber: cleanNum,
        isExisting: !!existingMatch,
        existingId: existingMatch?.id || null,
        initialAc: existingMatch ? (existingMatch.acType || (String(existingMatch.type || "").toLowerCase().includes("non-ac") ? "Non-AC" : "AC")) : (form.acType || "Non-AC"),
      });
    });

    // 2. Then add existing rooms on this floor that were not in parsedRooms
    floorExistingRooms.forEach((er) => {
      const erClean = String(er.roomNo || er.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim();
      if (!seen.has(erClean.toLowerCase())) {
        seen.add(erClean.toLowerCase());
        list.push({
          roomNumber: erClean,
          isExisting: true,
          existingId: er.id,
          initialAc: er.acType || (String(er.type || "").toLowerCase().includes("non-ac") ? "Non-AC" : "AC"),
        });
      }
    });

    return list;
  }, [parsedRooms, floorExistingRooms, form.acType]);

  // Per-room AC / Non-AC mapping state for rooms on this floor
  const [roomAcMap, setRoomAcMap] = useState({});
  const [selectedTargetRoom, setSelectedTargetRoom] = useState("");

  const getRoomAc = (rNum) => {
    if (!rNum) return form.acType || "Non-AC";
    if (roomAcMap[rNum]) return roomAcMap[rNum];
    const er = floorExistingRooms.find((r) => {
      const erClean = String(r.roomNo || r.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
      return erClean === String(rNum).toLowerCase() || parseInt(erClean, 10) === parseInt(String(rNum), 10);
    });
    if (er) {
      return er.acType || (String(er.type || "").toLowerCase().includes("non-ac") ? "Non-AC" : "AC");
    }
    return form.acType || "Non-AC";
  };

  const handleToggleRoomAc = (rNum, specificAc) => {
    setRoomAcMap((prev) => ({
      ...prev,
      [rNum]: specificAc,
    }));
    if (selectedTargetRoom === rNum) {
      setForm((prev) => ({
        ...prev,
        acType: specificAc,
        type: `${specificAc} ${Number(prev.capacity) === 1 ? "Single" : Number(prev.capacity) === 2 ? "Double" : Number(prev.capacity) === 3 ? "Triple" : "4-Sharing"} Room`,
      }));
    }
  };

  const setAllRoomsAc = (specificAc) => {
    const next = {};
    floorConfigurableRooms.forEach((r) => {
      next[r.roomNumber] = specificAc;
    });
    parsedRooms.forEach((r) => {
      next[r] = specificAc;
    });
    setRoomAcMap(next);
    setForm((prev) => ({
      ...prev,
      acType: specificAc,
      type: `${specificAc} ${Number(prev.capacity) === 1 ? "Single" : Number(prev.capacity) === 2 ? "Double" : Number(prev.capacity) === 3 ? "Triple" : "4-Sharing"} Room`,
      fee: STANDARD_TARIFFS[specificAc]?.[prev.capacity] || prev.fee,
    }));
  };

  // Handle classification toggle (AC vs Non-AC) and sharing capacity (1, 2, 3, 4 beds)
  const handleClassificationChange = (newAcType, newCap) => {
    const chosenAc = newAcType || form.acType || "AC";
    const chosenCap = Number(newCap || form.capacity || 2);
    const matchedCat = resolveBestCategory(categories, chosenAc, chosenCap);
    const standardFee = STANDARD_TARIFFS[chosenAc]?.[chosenCap] || (chosenAc === "AC" ? "₹8,500/mo" : "₹5,500/mo");

    setForm((prev) => ({
      ...prev,
      acType: chosenAc,
      capacity: chosenCap,
      roomTypeId: matchedCat ? matchedCat.id : prev.roomTypeId,
      type: `${chosenAc} ${chosenCap === 1 ? "Single" : chosenCap === 2 ? "Double" : chosenCap === 3 ? "Triple" : "4-Sharing"} Room`,
      fee: standardFee,
    }));

    if (newAcType) {
      if (selectedTargetRoom && selectedTargetRoom !== "__ALL__") {
        handleToggleRoomAc(selectedTargetRoom, newAcType);
      } else {
        setAllRoomsAc(newAcType);
      }
    }
  };

  // Check if room numbers already exist in selected block (only warn if on DIFFERENT floor)
  const duplicateWarning = useMemo(() => {
    if (isView || !form.roomNo || !selectedBlock) return null;
    const targetBlockId = String(selectedBlock.id);
    for (const rNum of parsedRooms) {
      const cleanTarget = String(rNum).toLowerCase();
      const numTarget = parseInt(cleanTarget, 10);
      const dup = rooms.find((r) => {
        if (modal.mode === "edit" && String(r.id) === String(modal.data?.id)) return false;
        const matchesBlock =
          String(r.hostelId) === targetBlockId ||
          (selectedBlock?.code && String(r.block).trim().toLowerCase() === String(selectedBlock.code).trim().toLowerCase()) ||
          (selectedBlock?.name && String(r.blockName).trim().toLowerCase() === String(selectedBlock.name).trim().toLowerCase());
        if (!matchesBlock) return false;
        const rClean = String(r.roomNo || r.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
        const rNumParsed = parseInt(rClean, 10);
        return rClean === cleanTarget || (!isNaN(numTarget) && !isNaN(rNumParsed) && numTarget === rNumParsed);
      });
      if (dup) {
        if (dup.floor && form.floor && !isFloorMatch(dup.floor, form.floor)) {
          return `Room #${rNum} already exists on ${dup.floor} in this block.`;
        }
        return null;
      }
    }
    return null;
  }, [isView, form.roomNo, parsedRooms, selectedBlock, rooms, modal.mode, modal.data, form.floor]);

  const existingSameFloorRooms = useMemo(() => {
    return parsedRooms.filter((rNum) => {
      const cleanTarget = String(rNum).toLowerCase();
      const numTarget = parseInt(cleanTarget, 10);
      return floorExistingRooms.some((r) => {
        const rClean = String(r.roomNo || r.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim().toLowerCase();
        const rParsed = parseInt(rClean, 10);
        return rClean === cleanTarget || (!isNaN(numTarget) && !isNaN(rParsed) && numTarget === rParsed);
      });
    });
  }, [parsedRooms, floorExistingRooms]);

  // Suggested room presets based on selected floor
  const floorPresets = useMemo(() => {
    const fLower = String(form.floor || "").toLowerCase();
    if (fLower.includes("ground") || fLower.includes("0")) {
      return [
        { label: "+ Range 001–005 (5 Rooms)", value: "001-005" },
        { label: "+ Range 001–010 (10 Rooms)", value: "001-010" },
        { label: "+ Single 001", value: "001" },
      ];
    }
    const digit = fLower.match(/\d+/)?.[0] || "1";
    return [
      { label: `+ Range ${digit}01–${digit}05 (5 Rooms)`, value: `${digit}01-${digit}05` },
      { label: `+ Range ${digit}01–${digit}10 (10 Rooms)`, value: `${digit}01-${digit}10` },
      { label: `+ Single ${digit}01`, value: `${digit}01` },
    ];
  }, [form.floor]);

  // Bulk Multi-Floor Configuration State
  const initFloorConfigs = (block) => {
    const numFloors = Math.max(1, Number(block?.floors || 2));
    return Array.from({ length: numFloors }, (_, i) => ({
      floorIndex: i,
      floorLabel: i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`,
      singleSharing: 0,
      singleAc: "AC",
      doubleSharing: 2,
      doubleAc: "Non-AC",
      tripleSharing: 0,
      tripleAc: "Non-AC",
      fourSharing: 0,
      fourAc: "Non-AC",
      customAllocations: [],
    }));
  };

  const [floorConfigs, setFloorConfigs] = useState(() => initFloorConfigs(selectedBlock));

  // Sync when selected block changes
  const handleBlockChange = (blkId) => {
    const b = blocks.find((blk) => String(blk.id) === String(blkId) || blk.code === blkId);
    if (b) {
      setForm({
        ...form,
        block: String(b.id),
        hostelId: b.id,
        blockName: b.name,
        floor: "Ground Floor",
      });
      setFloorConfigs(initFloorConfigs(b));
    }
  };

  const isAcAccom = form.acType === "AC";

  return (
    <Modal
      className="cms-hostel-modal-lg"
      title={
        isView
          ? `Room Details: Room #${form.roomNo}`
          : modal.mode === "edit"
          ? "Edit Room"
          : "Add Room & Bed Allocation"
      }
      onClose={closeModal}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Mode Switcher (Floor Setup vs Full Block Multi-Floor Setup) */}
        {!isView && modal.mode !== "edit" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px",
              background: "var(--cms-subtle)",
              borderRadius: 12,
              border: "1px solid var(--cms-border)",
            }}
          >
            <button
              type="button"
              className={`cms-btn ${modalTab === "floor" ? "cms-btn-primary" : "cms-btn-ghost"}`}
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
              onClick={() => setModalTab("floor")}
            >
              <Home size={15} /> Floor-wise Room &amp; Bed Setup
            </button>
            <button
              type="button"
              className={`cms-btn ${modalTab === "bulkBlock" ? "cms-btn-primary" : "cms-btn-ghost"}`}
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
              onClick={() => setModalTab("bulkBlock")}
            >
              <Building2 size={15} /> Full Block Multi-Floor Setup ({floorList.length} Floors)
            </button>
          </div>
        )}

        {/* TAB 1: STANDARD FLOOR-WISE ROOM & BED SETUP */}
        {modalTab === "floor" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (duplicateWarning || isSubmitting) return;
              setIsSubmitting(true);
              try {
                const finalRoomAcMap = { ...roomAcMap };
                floorConfigurableRooms.forEach((r) => {
                  finalRoomAcMap[r.roomNumber] = getRoomAc(r.roomNumber);
                });
                parsedRooms.forEach((rNum) => {
                  finalRoomAcMap[rNum] = getRoomAc(rNum);
                });
                await handleSaveRoom({ ...form, roomAcMap: finalRoomAcMap });
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="cms-alloc-modal-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Step 1: Hostel Block Selection */}
              <div className="cms-alloc-modal-field">
                <label className="cms-alloc-modal-label">
                  1. Hostel Block <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    required
                    disabled={isView}
                    value={String(form.block || form.hostelId || "")}
                    onChange={(e) => handleBlockChange(e.target.value)}
                    className="cms-alloc-modal-select"
                    style={{ color: form.block || form.hostelId ? "var(--cms-text)" : "var(--cms-muted)" }}
                  >
                    <option value="" disabled>Select Hostel Block...</option>
                    {Array.from(new Map(blocks.map((b) => [String(b.id || b.code), b])).values()).map((b) => (
                      <option key={b.id || b.code} value={String(b.id)}>
                        {b.name || b.code || `Hostel Block #${b.id}`} {b.code ? `(${b.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="cms-alloc-modal-chevron">
                    <ChevronDown size={16} />
                  </div>
                </div>

                {/* Real-time Block Floors & Inventory Card */}
                {selectedBlock && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "10px 14px",
                      background: "var(--cms-subtle)",
                      borderRadius: 12,
                      border: "1px solid var(--cms-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: "var(--cms-text)" }}>
                        {selectedBlock.name || "Hostel Block"}
                      </strong>
                      <span style={{ fontSize: 11, color: "var(--cms-muted)", marginLeft: 6 }}>
                        ({selectedBlock.code || "Block"})
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "var(--cms-primary)",
                          color: "#fff",
                        }}
                      >
                        🏢 {floorList.length} Floors Configured
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--cms-muted)", fontWeight: 600 }}>
                        {blockRooms.length} Existing Rooms • {blockBeds.length} Beds
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Floor Level Selection with Interactive Floor Pills */}
              <div className="cms-alloc-modal-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label className="cms-alloc-modal-label" style={{ margin: 0 }}>
                    2. Select Floor Level <span style={{ color: "var(--cms-red)" }}>*</span>
                  </label>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 600 }}>
                    Block has {floorList.length} total floors
                  </span>
                </div>

                {/* Interactive Floor Pills */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {floorList.map((fl) => {
                    const isSel = form.floor === fl;
                    const floorRoomsCount = blockRooms.filter((r) => isFloorMatch(r.floor, fl)).length;
                    return (
                      <button
                        key={fl}
                        type="button"
                        disabled={isView}
                        className={`cms-btn ${isSel ? "cms-btn-primary" : "cms-btn-ghost"}`}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: isSel ? 800 : 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          border: isSel ? "2px solid var(--cms-primary)" : "1px solid var(--cms-border)",
                        }}
                        onClick={() => setForm({ ...form, floor: fl })}
                      >
                        <span>{fl}</span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 6,
                            background: isSel ? "rgba(255,255,255,0.25)" : "var(--cms-subtle)",
                            color: isSel ? "#fff" : "var(--cms-muted)",
                            fontWeight: 700,
                          }}
                        >
                          {floorRoomsCount} rooms
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Floor Dropdown Select */}
                <div style={{ position: "relative" }}>
                  <select
                    required
                    disabled={isView || !form.block}
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    className="cms-alloc-modal-select"
                    style={{ color: form.floor ? "var(--cms-text)" : "var(--cms-muted)" }}
                  >
                    <option value="" disabled>Select Floor Level...</option>
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

              {/* Step 3: Room Number Input & Smart Floor Presets */}
              <div className="cms-alloc-modal-field">
                <label className="cms-alloc-modal-label">
                  3. Room Number(s) <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <input
                  required
                  disabled={isView}
                  placeholder="e.g. 101 or 101-105"
                  value={form.roomNo}
                  onChange={(e) => setForm({ ...form, roomNo: e.target.value })}
                  className="cms-alloc-modal-input"
                />

                {/* Quick Preset Buttons for Selected Floor */}
                {!isView && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700 }}>Quick Fill for {form.floor}:</span>
                    {floorPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        style={{ padding: "3px 9px", fontSize: 11, borderRadius: 6, height: "auto" }}
                        onClick={() => setForm({ ...form, roomNo: preset.value })}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Existing Rooms on this Floor Quick Select Pills */}
                {!isView && floorExistingRooms.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                      Existing Rooms on {form.floor} ({floorExistingRooms.length}):
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {floorExistingRooms.map((er) => {
                        const erNum = String(er.roomNo || er.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim();
                        const erAc = getRoomAc(erNum);
                        const isSel = form.roomNo === erNum || selectedTargetRoom === erNum;
                        return (
                          <button
                            key={er.id || erNum}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, roomNo: erNum });
                              setSelectedTargetRoom(erNum);
                            }}
                            className="cms-btn cms-btn-ghost"
                            style={{
                              padding: "3px 8px",
                              fontSize: 11,
                              borderRadius: 6,
                              border: isSel ? "1.5px solid var(--cms-primary)" : "1px solid var(--cms-border)",
                              fontWeight: isSel ? 800 : 600,
                              background: isSel ? "var(--cms-subtle)" : "transparent",
                            }}
                          >
                            Room #{erNum} ({erAc === "AC" ? "❄️ AC" : "💨 Non-AC"})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Duplicate Room Warning (Only if on another floor) */}
                {!isView && duplicateWarning && (
                  <p style={{ fontSize: 11.5, color: "var(--cms-red, #ef4444)", margin: "4px 0 0 0", fontWeight: 700 }}>
                    ⚠️ {duplicateWarning}
                  </p>
                )}

                {/* Existing Same Floor Informational Notice */}
                {!isView && existingSameFloorRooms.length > 0 && (
                  <p style={{ fontSize: 11.5, color: "#2563eb", margin: "4px 0 0 0", fontWeight: 600 }}>
                    ℹ️ {existingSameFloorRooms.map((r) => `Room #${r}`).join(", ")} already exists on {form.floor} — saving will update its AC/Non-AC classification.
                  </p>
                )}

                {/* Live Parsed Room Chips Preview */}
                {!isView && parsedRooms.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "var(--cms-surface)",
                      borderRadius: 10,
                      border: "1px solid var(--cms-border)",
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cms-text)", marginBottom: 6 }}>
                      Rooms on {form.floor} ({parsedRooms.length} Room{parsedRooms.length > 1 ? "s" : ""}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {parsedRooms.map((rNum) => {
                        const isDiffFloorDup = rooms.some(
                          (r) =>
                            (String(r.hostelId) === String(selectedBlock?.id) || r.block === selectedBlock?.code) &&
                            String(r.roomNo || r.roomNumber || "").replace(/^Room\s*#?\s*/i, "").trim().toLowerCase() === String(rNum).toLowerCase() &&
                            r.floor && form.floor && !isFloorMatch(r.floor, form.floor)
                        );
                        const isSameFloorExisting = existingSameFloorRooms.includes(rNum);
                        const acForRoom = getRoomAc(rNum);
                        const isAc = acForRoom === "AC";
                        return (
                          <span
                            key={rNum}
                            onClick={() => setSelectedTargetRoom(rNum)}
                            style={{
                              padding: "4px 9px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              background: isDiffFloorDup ? "rgba(239, 68, 68, 0.15)" : isAc ? "rgba(37, 99, 235, 0.08)" : "rgba(100, 116, 139, 0.08)",
                              color: isDiffFloorDup ? "#dc2626" : isAc ? "#2563eb" : "#475569",
                              border: isDiffFloorDup ? "1px solid #ef4444" : isAc ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid rgba(100, 116, 139, 0.3)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            Room #{rNum}
                            <span style={{ fontSize: 10, opacity: 0.9 }}>
                              {isAc ? "❄️ AC" : "💨 Non-AC"}
                            </span>
                            {isSameFloorExisting && "(Update)"}
                            {isDiffFloorDup && "(Exists)"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Room Classification (AC vs Non-AC Room) */}
              <div className="cms-alloc-modal-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="cms-alloc-modal-label" style={{ margin: 0 }}>
                    4. Room Classification &amp; AC / Non-AC Selection <span style={{ color: "var(--cms-red)" }}>*</span>
                  </label>
                  <span style={{ fontSize: 11.5, color: "var(--cms-muted)", fontWeight: 600 }}>
                    Select a room to configure AC or Non-AC
                  </span>
                </div>

                {/* Dropdown to pick specific Room or All Rooms on this Floor */}
                {floorConfigurableRooms.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-text)", display: "block", marginBottom: 4 }}>
                      Select Room on {form.floor || "Floor"} to Configure:
                    </label>
                    <div style={{ position: "relative" }}>
                      <select
                        disabled={isView}
                        value={selectedTargetRoom || (floorConfigurableRooms[0]?.roomNumber || "__ALL__")}
                        onChange={(e) => setSelectedTargetRoom(e.target.value)}
                        className="cms-alloc-modal-select"
                        style={{ fontWeight: 600 }}
                      >
                        {floorConfigurableRooms.map((r) => {
                          const rAc = getRoomAc(r.roomNumber);
                          return (
                            <option key={r.roomNumber} value={r.roomNumber}>
                              Room #{r.roomNumber} ({r.isExisting ? "Existing on Floor" : "New Room"}) — Currently {rAc === "AC" ? "❄️ AC" : "💨 Non-AC"}
                            </option>
                          );
                        })}
                        <option value="__ALL__">🌐 Apply to All Rooms on {form.floor} simultaneously</option>
                      </select>
                      <div className="cms-alloc-modal-chevron">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                )}

                {(() => {
                  const targetRoomDisplay = selectedTargetRoom && selectedTargetRoom !== "__ALL__"
                    ? selectedTargetRoom
                    : (floorConfigurableRooms[0]?.roomNumber || parsedRooms[0] || "");
                  const activeTargetAc = (selectedTargetRoom && selectedTargetRoom !== "__ALL__")
                    ? getRoomAc(targetRoomDisplay)
                    : form.acType;

                  return (
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--cms-muted)", fontWeight: 700, marginBottom: 6 }}>
                        Classification for {selectedTargetRoom === "__ALL__" ? `All Rooms on ${form.floor}` : `Room #${targetRoomDisplay}`}:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {/* AC Room Option */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => !isView && handleClassificationChange("AC", form.capacity)}
                          className="cms-card"
                          style={{
                            padding: "14px 16px",
                            borderRadius: 14,
                            cursor: isView ? "default" : "pointer",
                            textAlign: "left",
                            border: activeTargetAc === "AC" ? "2px solid #2563eb" : "1px solid var(--cms-border)",
                            background: activeTargetAc === "AC" ? "rgba(59, 130, 246, 0.08)" : "var(--cms-surface)",
                            boxShadow: activeTargetAc === "AC" ? "0 4px 14px rgba(37, 99, 235, 0.16)" : "none",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 18 }}>❄️</span>
                              <strong style={{ fontSize: 14, color: activeTargetAc === "AC" ? "#2563eb" : "var(--cms-text)" }}>
                                AC Room
                              </strong>
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 4 }}>
                              Air-conditioned accommodation
                            </div>
                          </div>
                          {activeTargetAc === "AC" && (
                            <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "#2563eb", color: "#fff" }}>
                              ✓ Selected
                            </span>
                          )}
                        </div>

                        {/* Non-AC Room Option */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => !isView && handleClassificationChange("Non-AC", form.capacity)}
                          className="cms-card"
                          style={{
                            padding: "14px 16px",
                            borderRadius: 14,
                            cursor: isView ? "default" : "pointer",
                            textAlign: "left",
                            border: activeTargetAc === "Non-AC" ? "2px solid #475569" : "1px solid var(--cms-border)",
                            background: activeTargetAc === "Non-AC" ? "rgba(100, 116, 139, 0.08)" : "var(--cms-surface)",
                            boxShadow: activeTargetAc === "Non-AC" ? "0 4px 14px rgba(71, 85, 105, 0.16)" : "none",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 18 }}>💨</span>
                              <strong style={{ fontSize: 14, color: activeTargetAc === "Non-AC" ? "#334155" : "var(--cms-text)" }}>
                                Non-AC Room
                              </strong>
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 4 }}>
                              Standard ventilated accommodation
                            </div>
                          </div>
                          {activeTargetAc === "Non-AC" && (
                            <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: "#475569", color: "#fff" }}>
                              ✓ Selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Per-Room AC vs Non-AC Allocation on this Floor (ALWAYS VISIBLE) */}
                {floorConfigurableRooms.length > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: "var(--cms-subtle)",
                      border: "1px solid var(--cms-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <strong style={{ fontSize: 13, color: "var(--cms-text)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>🏢</span> Floor Room-by-Room Classification ({form.floor || "Selected Floor"})
                        </strong>
                        <p style={{ margin: "2px 0 0 0", fontSize: 11.5, color: "var(--cms-muted)" }}>
                          Click ❄️ AC or 💨 Non-AC on any room to customize individually:
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 600 }}>Quick Set:</span>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, fontWeight: 700 }}
                          onClick={() => setAllRoomsAc("AC")}
                        >
                          ❄️ All AC
                        </button>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, fontWeight: 700 }}
                          onClick={() => setAllRoomsAc("Non-AC")}
                        >
                          💨 All Non-AC
                        </button>
                      </div>
                    </div>

                    {/* Room-by-Room Selector Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                        gap: 8,
                        maxHeight: 220,
                        overflowY: "auto",
                        paddingRight: 4,
                      }}
                    >
                      {floorConfigurableRooms.map((r) => {
                        const rNum = r.roomNumber;
                        const curAc = getRoomAc(rNum);
                        const isAc = curAc === "AC";
                        const isFocused = selectedTargetRoom === rNum;
                        return (
                          <div
                            key={rNum}
                            onClick={() => setSelectedTargetRoom(rNum)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              borderRadius: 10,
                              background: isFocused ? "var(--cms-card-hover, rgba(82, 110, 52, 0.08))" : "var(--cms-surface)",
                              border: isFocused ? "2px solid var(--cms-primary, #526e34)" : isAc ? "1.5px solid rgba(37, 99, 235, 0.4)" : "1.5px solid rgba(100, 116, 139, 0.3)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                              cursor: "pointer",
                            }}
                          >
                            <div>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cms-text)", display: "block" }}>
                                Room #{rNum}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--cms-muted)" }}>
                                {r.isExisting ? "Existing on Floor" : "New Room"}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={isView}
                                onClick={() => {
                                  handleToggleRoomAc(rNum, "AC");
                                  setSelectedTargetRoom(rNum);
                                }}
                                style={{
                                  padding: "3px 9px",
                                  fontSize: 11,
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  cursor: isView ? "default" : "pointer",
                                  border: isAc ? "1px solid #2563eb" : "1px solid var(--cms-border)",
                                  background: isAc ? "#2563eb" : "transparent",
                                  color: isAc ? "#fff" : "var(--cms-muted)",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                ❄️ AC
                              </button>
                              <button
                                type="button"
                                disabled={isView}
                                onClick={() => {
                                  handleToggleRoomAc(rNum, "Non-AC");
                                  setSelectedTargetRoom(rNum);
                                }}
                                style={{
                                  padding: "3px 9px",
                                  fontSize: 11,
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  cursor: isView ? "default" : "pointer",
                                  border: !isAc ? "1px solid #475569" : "1px solid var(--cms-border)",
                                  background: !isAc ? "#475569" : "transparent",
                                  color: !isAc ? "#fff" : "var(--cms-muted)",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                💨 Non-AC
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Breakdown Summary */}
                    {(() => {
                      const acCount = floorConfigurableRooms.filter((r) => getRoomAc(r.roomNumber) === "AC").length;
                      const nonAcCount = floorConfigurableRooms.length - acCount;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                          <span style={{ color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            ❄️ {acCount} AC Room{acCount !== 1 ? "s" : ""}
                          </span>
                          <span style={{ color: "var(--cms-border)" }}>•</span>
                          <span style={{ color: "#475569", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            💨 {nonAcCount} Non-AC Room{nonAcCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Step 5: Room Sharing & Bed Capacity */}
              <div className="cms-alloc-modal-field">
                <label className="cms-alloc-modal-label">
                  5. Room Sharing &amp; Bed Capacity <span style={{ color: "var(--cms-red)" }}>*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                  {[
                    { cap: 1, label: "Single Bed", sub: "1 Person / Room", icon: "🛏️" },
                    { cap: 2, label: "2-Bed (Double)", sub: "2 Persons / Room", icon: "🛏️🛏️" },
                    { cap: 3, label: "3-Bed (Triple)", sub: "3 Persons / Room", icon: "🛏️🛏️🛏️" },
                    { cap: 4, label: "4-Bed (Four)", sub: "4 Persons / Room", icon: "🛏️🛏️🛏️🛏️" },
                  ].map((item) => {
                    const isSel = Number(form.capacity) === item.cap;
                    return (
                      <div
                        key={item.cap}
                        role="button"
                        tabIndex={0}
                        onClick={() => !isView && handleClassificationChange(form.acType, item.cap)}
                        className="cms-card"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          cursor: isView ? "default" : "pointer",
                          textAlign: "center",
                          border: isSel ? "2px solid var(--cms-primary)" : "1px solid var(--cms-border)",
                          background: isSel ? "var(--cms-subtle)" : "var(--cms-surface)",
                          boxShadow: isSel ? "0 4px 12px rgba(82, 110, 52, 0.16)" : "none",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ fontSize: 14, marginBottom: 4 }}>{item.icon}</div>
                        <strong style={{ fontSize: 12.5, color: isSel ? "var(--cms-primary)" : "var(--cms-text)", display: "block" }}>
                          {item.label}
                        </strong>
                        <span style={{ fontSize: 11, color: "var(--cms-muted)" }}>{item.sub}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 6: Monthly Tariff & Selected Configuration Summary Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  padding: "12px 16px",
                  background: "var(--cms-subtle)",
                  borderRadius: 12,
                  border: "1px solid var(--cms-border)",
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", display: "block" }}>Room Classification</span>
                  {parsedRooms.length > 1 ? (
                    (() => {
                      const acCount = parsedRooms.filter((r) => getRoomAc(r) === "AC").length;
                      const nonAcCount = parsedRooms.length - acCount;
                      return (
                        <strong style={{ fontSize: 12.5, color: "var(--cms-text)" }}>
                          <span style={{ color: "#2563eb" }}>❄️ {acCount} AC</span>
                          {" / "}
                          <span style={{ color: "#475569" }}>💨 {nonAcCount} Non-AC</span>
                        </strong>
                      );
                    })()
                  ) : (
                    <strong style={{ fontSize: 13, color: form.acType === "AC" ? "#2563eb" : "#475569" }}>
                      {form.acType === "AC" ? "❄️ AC Room" : "💨 Non-AC Room"}
                    </strong>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", display: "block" }}>Sharing Layout</span>
                  <strong style={{ fontSize: 13, color: "var(--cms-text)" }}>
                    {form.capacity} {form.capacity === 1 ? "Bed (Single)" : "Beds (Sharing)"}
                  </strong>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--cms-muted)", display: "block", marginBottom: 3 }}>
                    Monthly Tariff
                  </label>
                  <input
                    disabled={isView}
                    value={form.fee}
                    onChange={(e) => setForm({ ...form, fee: e.target.value })}
                    className="cms-alloc-modal-input"
                    style={{ height: 32, fontSize: 12, fontWeight: 700, padding: "4px 8px" }}
                    placeholder="e.g. ₹8,500/mo"
                  />
                </div>
              </div>

              {/* Step 7: Supported Bed Numbers Live Preview */}
              <div className="cms-alloc-modal-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label className="cms-alloc-modal-label" style={{ margin: 0 }}>
                    6. Auto-Provisioned Bed Numbers ({form.capacity} Beds per Room)
                  </label>
                  <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 600 }}>
                    Total: {parsedRooms.length * form.capacity} Beds across {parsedRooms.length || 1} room(s)
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {Array.from({ length: Math.max(1, Number(form.capacity || 2)) }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "var(--cms-green-soft)",
                        color: "var(--cms-green)",
                        border: "1px solid var(--cms-green)",
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      BED-{i + 1} • Available
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--cms-muted)", margin: "4px 0 0 0" }}>
                  All bed records will be automatically created in the database and linked to each generated room.
                </p>
              </div>

              {/* Step 8: Status */}
              <div className="cms-alloc-modal-field">
                <label className="cms-alloc-modal-label">7. Status</label>
                <div style={{ position: "relative" }}>
                  <select
                    disabled={isView}
                    value={form.status || "Active"}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="cms-alloc-modal-select"
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

              {/* View Mode: Real Beds and Occupant Display */}
              {isView && (
                <div style={{ marginTop: 12 }}>
                  <label className="cms-alloc-modal-label" style={{ marginBottom: 6, display: "block" }}>
                    Registered Beds &amp; Occupancy
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(() => {
                      const curRoomBeds = modal.data?.roomBeds || beds.filter((b) => Number(b.roomId) === Number(form.id));
                      if (curRoomBeds.length === 0) {
                        return <span style={{ color: "var(--cms-muted)", fontSize: 12 }}>No beds registered for this room.</span>;
                      }
                      return curRoomBeds.map((bd, i) => {
                        const alloc = (modal.data?.roomAllocs || allocations).find(
                          (a) => (a.status || "").toLowerCase() === "active" && Number(a.bedId) === Number(bd.id)
                        );
                        const isOcc = (bd.bedStatus || "").toLowerCase() === "occupied" || Boolean(alloc);
                        return (
                          <div
                            key={bd.id || i}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              background: isOcc ? "var(--cms-amber-soft)" : "var(--cms-green-soft)",
                              border: `1px solid ${isOcc ? "var(--cms-amber)" : "var(--cms-green)"}`,
                              color: isOcc ? "var(--cms-amber)" : "var(--cms-green)",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <div>{bd.bedNumber || `Bed #${i + 1}`} - {isOcc ? "Occupied" : "Available"}</div>
                            {alloc && (
                              <div style={{ fontSize: 11, color: "var(--cms-text)", fontWeight: 500, marginTop: 2 }}>
                                Resident: {alloc.studentName} ({alloc.admissionNo || "Enrolled"})
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="cms-alloc-modal-footer" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="cms-alloc-modal-cancel-btn"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                {isView ? "Close" : "Cancel"}
              </button>
              {!isView && (
                <button
                  type="submit"
                  disabled={Boolean(duplicateWarning) || isSubmitting}
                  className="cms-alloc-modal-submit-btn"
                  style={duplicateWarning || isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                >
                  {isSubmitting ? "Saving Room..." : "Save Room & Beds"}
                </button>
              )}
            </div>
          </form>
        )}

        {/* TAB 2: FULL BLOCK MULTI-FLOOR SETUP (Configure all floors of block) */}
        {modalTab === "bulkBlock" && !isView && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: "10px 14px",
                background: "var(--cms-subtle)",
                borderRadius: 12,
                border: "1px solid var(--cms-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <strong style={{ fontSize: 13, color: "var(--cms-text)" }}>
                  Multi-Floor Setup for {selectedBlock?.name}
                </strong>
                <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--cms-muted)" }}>
                  Configure room counts and sharing types for all {floorConfigs.length} floors at once
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "var(--cms-primary)",
                  color: "#fff",
                }}
              >
                {floorConfigs.length} Floors Available
              </span>
            </div>

            {/* Floor Cards List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {floorConfigs.map((fc, fIdx) => {
                const floorRooms = (fc.singleSharing || 0) + (fc.doubleSharing || 0) + (fc.tripleSharing || 0) + (fc.fourSharing || 0);
                const floorBeds = (fc.singleSharing || 0) * 1 + (fc.doubleSharing || 0) * 2 + (fc.tripleSharing || 0) * 3 + (fc.fourSharing || 0) * 4;
                const startNum = fIdx === 0 ? "001" : `${fIdx}01`;
                const endNum = fIdx === 0 ? String(floorRooms).padStart(3, "0") : `${fIdx}${String(floorRooms).padStart(2, "0")}`;
                const rangeLabel = floorRooms > 0 ? (floorRooms === 1 ? `Room #${startNum}` : `Rooms #${startNum} to #${endNum}`) : "No rooms";

                return (
                  <div
                    key={fc.floorIndex}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "var(--cms-surface)",
                      border: "1px solid var(--cms-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 13, color: "var(--cms-primary)" }}>{fc.floorLabel}</strong>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "var(--cms-subtle)",
                            color: "var(--cms-text)",
                          }}
                        >
                          {rangeLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cms-text)" }}>
                        {floorRooms} Rooms ({floorBeds} Beds Capacity)
                      </span>
                    </div>

                    {/* Sharing Inputs Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {/* 1-Share */}
                      <div style={{ padding: 8, background: "var(--cms-subtle)", borderRadius: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>1-Share (1 Bed)</label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={fc.singleSharing || ""}
                          placeholder="0"
                          style={{ width: "100%", height: 30, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--cms-border)", fontSize: 12 }}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setFloorConfigs((prev) => prev.map((item) => (item.floorIndex === fc.floorIndex ? { ...item, singleSharing: val } : item)));
                          }}
                        />
                      </div>

                      {/* 2-Share */}
                      <div style={{ padding: 8, background: "var(--cms-subtle)", borderRadius: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>2-Share (2 Beds)</label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={fc.doubleSharing || ""}
                          placeholder="0"
                          style={{ width: "100%", height: 30, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--cms-border)", fontSize: 12 }}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setFloorConfigs((prev) => prev.map((item) => (item.floorIndex === fc.floorIndex ? { ...item, doubleSharing: val } : item)));
                          }}
                        />
                      </div>

                      {/* 3-Share */}
                      <div style={{ padding: 8, background: "var(--cms-subtle)", borderRadius: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>3-Share (3 Beds)</label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={fc.tripleSharing || ""}
                          placeholder="0"
                          style={{ width: "100%", height: 30, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--cms-border)", fontSize: 12 }}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setFloorConfigs((prev) => prev.map((item) => (item.floorIndex === fc.floorIndex ? { ...item, tripleSharing: val } : item)));
                          }}
                        />
                      </div>

                      {/* 4-Share */}
                      <div style={{ padding: 8, background: "var(--cms-subtle)", borderRadius: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>4-Share (4 Beds)</label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={fc.fourSharing || ""}
                          placeholder="0"
                          style={{ width: "100%", height: 30, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--cms-border)", fontSize: 12 }}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setFloorConfigs((prev) => prev.map((item) => (item.floorIndex === fc.floorIndex ? { ...item, fourSharing: val } : item)));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons for Bulk */}
            <div className="cms-alloc-modal-footer" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="cms-alloc-modal-cancel-btn"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-alloc-modal-submit-btn"
                disabled={isSubmitting}
                onClick={async () => {
                  if (!handleSaveRoomSharingConfig) return;
                  setIsSubmitting(true);
                  try {
                    await handleSaveRoomSharingConfig({
                      block: selectedBlock,
                      floorConfigs,
                    });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? "Generating All Floors..." : `Generate & Save All Floors for ${selectedBlock?.name}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Warden Modal (Matching Screenshot 2: exactly 3 fields)
function WardenModal({ modal, closeModal, blocks, wardens, candidateStaff, handleSaveWarden, showToast }) {
    const isView = modal.mode === "view";
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dedicated load for Hostel department staff
    const [hostelStaff, setHostelStaff] = useState([]);
    useEffect(() => {
      let isMounted = true;
      // Fetch fresh Hostel department staff
      apiClient.get("/api/v1/staff?Department=hostel&pageSize=500", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true })
        .catch(() => apiClient.get("/api/v1/staff?Department=hostel", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true }))
        .then((res) => {
          if (isMounted && res?.data) {
            const items = extractCollection(res.data);
            if (Array.isArray(items) && items.length > 0) setHostelStaff(items);
          }
        })
        .catch(() => {});
      return () => { isMounted = false; };
    }, []);

    const effectiveStaff = useMemo(() => {
      const merged = [];
      const seen = new Set();
      const addStaff = (s) => {
        if (!s) return;
        const sId = Number(s.staffId || s.id);
        if (sId && !seen.has(sId)) {
          seen.add(sId);
          merged.push(s);
        }
      };
      (hostelStaff || []).forEach(addStaff);
      (candidateStaff || []).forEach(addStaff);
      return merged;
    }, [hostelStaff, candidateStaff]);

    // Warden candidates list strictly from Hostel & Warden staff
    const wardenCandidates = useMemo(() => {
      const list = [];
      const seen = new Set();
      const staffSource = (effectiveStaff && effectiveStaff.length > 0) ? effectiveStaff : [];

      staffSource.forEach((s) => {
        if (!s) return;
        const sId = Number(s.staffId || s.id);
        if (!sId || seen.has(sId)) return;

        const dept = String(s.department || s.departmentName || "").toLowerCase().trim();
        const desig = String(s.designation || s.role || "").toLowerCase().trim();

        // 1. HARD EXCLUSION: Reject non-warden roles (drivers, conductors, accountants, librarians, teachers, peons, etc.)
        const isExcluded = /driver|conductor|transport|librarian|accountant|accounts|finance|principal|electrician|plumber|mechanic|peon|cleaner|sweeper|cook|faculty|lecturer|professor/i.test(desig) ||
          /transport|library|accounts|finance/i.test(dept);
        if (isExcluded) return;

        // 2. HARD INCLUSION: Must be Warden, Assistant Warden, Chief Warden, Caretaker, or in Hostel department
        const isWarden = /warden|caretaker/i.test(desig) || dept.includes("hostel");
        if (!isWarden) return;

        seen.add(sId);
        const empId = s.employeeId || s.empId || s.code || `MNT-${sId}`;
        const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ") || s.fullName || s.name || `Staff #${empId}`;

        // Find active blocks currently assigned to this warden (supports multiple hostels)
        const activeAssignments = wardens.filter(
          (w) => Number(w.staffId) === sId && String(w.status || "").toLowerCase() === "active"
        );
        const assignedBlocks = activeAssignments
          .map((w) => w.assignedHostels || w.blockName || (w.hostelId ? `Block #${w.hostelId}` : ""))
          .filter(Boolean);
        const assignedBlock = assignedBlocks.length > 0 ? Array.from(new Set(assignedBlocks)).join(", ") : null;

        list.push({
          staffId: sId,
          empId,
          name: fullName,
          designation: s.designation || s.role || "Hostel Warden",
          department: s.department || "Hostel",
          phone: s.mobileNumber || s.phone || s.mobile || s.primaryMobileNumber || "",
          email: s.email || "",
          assignedBlocks,
          assignedBlock,
          isAssigned: Boolean(assignedBlock),
        });
      });

      // If editing, ensure currently edited warden is in the list
      if (modal.mode === "edit" && modal.data) {
        const currStaffId = Number(modal.data.staffId);
        if (currStaffId && !list.some((c) => c.staffId === currStaffId)) {
          list.unshift({
            staffId: currStaffId,
            empId: modal.data.empId || `MNT-${currStaffId}`,
            name: modal.data.name,
            designation: modal.data.designation || "Hostel Warden",
            department: modal.data.department || "Hostel",
            phone: modal.data.phone || "",
            email: modal.data.email || "",
            assignedBlock: null,
            isAssigned: false,
          });
        }
      }

      // Sort alphabetically by name
      return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [effectiveStaff, wardens, modal.mode, modal.data]);

    const [form, setForm] = useState(() => {
      if (modal.data) {
        return {
          ...modal.data,
          assignmentDate: modal.data.assignmentDate ? modal.data.assignmentDate.split("T")[0] : new Date().toISOString().split("T")[0],
          assignedHostels: modal.data.assignedHostels || modal.data.hostelName || modal.data.blockName || "",
          hostelId: modal.data.hostelId || "",
        };
      }
      return {
        staffId: "",
        empId: "",
        name: "",
        designation: "Hostel Warden",
        phone: "",
        email: "",
        assignedHostels: "",
        hostelId: "",
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
      } else {
        setForm((prev) => ({
          ...prev,
          staffId: "",
          name: "",
          empId: "",
          designation: "",
          phone: "",
          email: "",
        }));
      }
    };

    return (
      <Modal
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
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.staffId) {
              if (typeof showToast === "function") showToast("Please select a hostel warden.", "warning");
              return;
            }
            if (!form.assignedHostels && !form.hostelId) {
              if (typeof showToast === "function") showToast("Please select a hostel block.", "warning");
              return;
            }
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
              await handleSaveWarden(form);
            } finally {
              setIsSubmitting(false);
            }
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
                  value={form.staffId ? String(form.staffId) : ""}
                  onChange={(e) => handleCandidateChange(e.target.value)}
                  className="cms-alloc-modal-select"
                  style={{ color: form.name ? "var(--cms-text)" : "var(--cms-muted)" }}
                >
                  <option value="" disabled>
                    {wardenCandidates.length === 0 ? "No hostel warden staff found..." : "Select Hostel Warden..."}
                  </option>
                  {wardenCandidates.map((c) => (
                    <option key={c.staffId} value={String(c.staffId)}>
                      {c.name} ({c.empId} • {c.designation}{c.assignedBlock ? ` • Assigned: ${c.assignedBlock}` : ""})
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--cms-muted)", margin: "3px 0 0 0" }}>
                Dedicated Hostel Warden directory loaded for assignment.
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
                    const blk = blocks.find((b) => b.name === e.target.value || String(b.id) === e.target.value);
                    setForm({
                      ...form,
                      assignedHostels: blk ? blk.name : e.target.value,
                      hostelId: blk ? blk.id : form.hostelId,
                    });
                  }}
                  className="cms-alloc-modal-select"
                  style={{ color: form.assignedHostels ? "var(--cms-text)" : "var(--cms-muted)" }}
                >
                  <option value="" disabled>Select hostel block...</option>
                  {blocks.map((b) => {
                    const currentWarden = wardens.find(
                      (w) => (w.assignedHostels === b.name || Number(w.hostelId) === Number(b.id)) && (w.status || "").toLowerCase() === "active"
                    );
                    const isCurrentThisWarden = currentWarden && Number(currentWarden.staffId) === Number(form.staffId);
                    return (
                      <option key={b.id || b.name} value={b.name}>
                        {b.name} ({b.type} Hostel){isCurrentThisWarden ? " (Currently assigned to this warden)" : currentWarden ? ` - Current: ${currentWarden.name}` : ""}
                      </option>
                    );
                  })}
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
              disabled={isSubmitting}
            >
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="cms-alloc-modal-submit-btn"
                style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

// Student Allocation Modal - Matches Screenshot 2 exactly
function AllocationModal({
  modal,
  closeModal,
  blocks,
  rooms,
  beds,
  allocations,
  candidateAdmissions,
  candidateStudents,
  canAccessAdminEndpoints = false,
  handleSaveAllocation,
  showToast,
}) {
    const isView = modal.mode === "view";
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState(
      modal.data || {
        admissionNo: "",
        studentName: "",
        blockName: "",
        blockCode: "",
        floor: "",
        room: "",
        roomId: null,
        bed: "",
        bedId: null,
        joinDate: getTodayDateStr(),
        status: "Active",
      }
    );

    const [studentSearch, setStudentSearch] = useState(modal.data?.studentName || "");
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

    // Map of active hostel allocations by student ID and admission number
    const activeAllocationsMap = useMemo(() => {
      const map = new Map();
      allocations.forEach((a) => {
        if ((a.status || "").toLowerCase() === "active" && (modal.mode !== "edit" || a.id !== modal.data?.id)) {
          if (a.studentId) map.set(String(a.studentId), a);
          if (a.admissionNo) map.set(String(a.admissionNo).trim().toLowerCase(), a);
        }
      });
      return map;
    }, [allocations, modal.mode, modal.data?.id]);

    // Fallback load for admissions & students if not yet loaded in parent state
    const [modalAdmissions, setModalAdmissions] = useState([]);
    const [modalStudents, setModalStudents] = useState([]);

    useEffect(() => {
      let cancelled = false;
      const needAdm = !candidateAdmissions || candidateAdmissions.length === 0;
      const needStu = !candidateStudents || candidateStudents.length === 0;
      if (canAccessAdminEndpoints && (needAdm || needStu)) {
        Promise.allSettled([
          needAdm ? apiClient.get("/api/v1/student-admissions", { skipGlobalLoader: true, optionalAuth: true, skipAuthRedirect: true, skipErrorLog: true }).catch(() => null) : Promise.resolve(null),
          needStu ? (
            apiClient.get("/api/v1/students/active", { skipGlobalLoader: true, optionalAuth: true, skipAuthRedirect: true, skipErrorLog: true })
              .catch(() => apiClient.get("/api/v1/students?pageSize=500", { skipGlobalLoader: true, optionalAuth: true, skipAuthRedirect: true, skipErrorLog: true }).catch(() => null))
          ) : Promise.resolve(null),
          needStu ? (
            apiClient.get("/api/v1/certificates/students-dropdown", { skipGlobalLoader: true, optionalAuth: true, skipErrorLog: true }).catch(() => null)
          ) : Promise.resolve(null),
        ]).then(([admR, stuActiveR, stuCertR]) => {
          if (cancelled) return;
          if (admR?.status === "fulfilled" && admR.value?.data) {
            const c = extractCollection(admR.value.data);
            if (Array.isArray(c) && c.length > 0) setModalAdmissions(c);
          }
          let combinedStudents = [];
          if (stuActiveR?.status === "fulfilled" && stuActiveR.value?.data) {
            const act = extractCollection(stuActiveR.value.data);
            if (Array.isArray(act) && act.length > 0) {
              combinedStudents = act.map((s) => ({ ...s, isEnrolled: true }));
            }
          }
          if (stuCertR?.status === "fulfilled" && stuCertR.value?.data) {
            const cert = extractCollection(stuCertR.value.data);
            if (Array.isArray(cert) && cert.length > 0) {
              const existingIds = new Set(combinedStudents.map((s) => Number(s.studentId || s.id)));
              cert.forEach((cs) => {
                const csId = Number(cs.studentId || cs.id);
                if (!csId || !existingIds.has(csId)) {
                  combinedStudents.push({ ...cs, isEnrolled: !isUnenrolledAdmissionCandidate(cs) });
                }
              });
            }
          }
          if (combinedStudents.length > 0) {
            setModalStudents(combinedStudents);
          }
        }).catch(() => {});
      }
      return () => { cancelled = true; };
    }, [canAccessAdminEndpoints, candidateAdmissions, candidateStudents]);

    const effectiveAdmissions = useMemo(() => {
      return (candidateAdmissions && candidateAdmissions.length > 0) ? candidateAdmissions : modalAdmissions;
    }, [candidateAdmissions, modalAdmissions]);

    const effectiveStudents = useMemo(() => {
      return (candidateStudents && candidateStudents.length > 0) ? candidateStudents : modalStudents;
    }, [candidateStudents, modalStudents]);

    // Student candidate suggestions: prioritized by Hostel opt-in during admission
    const allCandidates = useMemo(() => {
      const admissionsMap = new Map();
      const registerAdmission = (ca) => {
        if (!ca) return;
        const sId = getVal(ca, "studentId", "StudentId", "id", "Id", "studentAdmissionId", "StudentAdmissionId", "admissionId", "AdmissionId");
        if (sId) admissionsMap.set(String(sId), ca);
        const admNo = getVal(ca, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "regNo", "RegNo");
        if (admNo) {
          const rawStr = String(admNo).trim().toLowerCase();
          admissionsMap.set(rawStr, ca);
          admissionsMap.set(rawStr.replace(/[^a-z0-9]/gi, ""), ca);
        }
        const sName = getVal(ca, "studentName", "StudentName", "fullName", "FullName") || [getVal(ca, "firstName", "FirstName"), getVal(ca, "lastName", "LastName")].filter(Boolean).join(" ");
        if (sName) {
          admissionsMap.set(sName.trim().toLowerCase(), ca);
        }
      };

      if (Array.isArray(effectiveAdmissions)) {
        effectiveAdmissions.forEach(registerAdmission);
      }

      let localAdmissionsList = [];
      let localAssignments = null;
      try {
        const localAdms = JSON.parse(localStorage.getItem("studentAdmissionRecords") || "[]");
        if (Array.isArray(localAdms) && localAdms.length > 0) {
          localAdmissionsList = localAdms;
          localAdms.forEach((entry) => {
            const x = { ...(entry.raw || {}), ...(entry.values || {}), ...entry };
            registerAdmission(x);
          });
        }
        localAssignments = JSON.parse(localStorage.getItem("studentAcademicAssignments") || "{}");
      } catch {
        // ignore storage errors
      }

      const checkHostelOpted = (student, admission) => {
        const sId = getVal(student, "studentId", "StudentId", "id", "Id") || getVal(admission, "studentId", "StudentId", "id", "Id");
        const rawAdmNo = String(getVal(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || getVal(admission, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || "").trim();
        const sName = String(getVal(student, "studentName", "StudentName", "fullName", "FullName") || getVal(admission, "studentName", "StudentName", "fullName", "FullName") || "").trim().toLowerCase();

        const adm = admission
          || (sId ? admissionsMap.get(String(sId)) : null)
          || (rawAdmNo ? admissionsMap.get(rawAdmNo.toLowerCase()) : null)
          || (rawAdmNo ? admissionsMap.get(rawAdmNo.replace(/[^a-z0-9]/gi, "").toLowerCase()) : null)
          || (sName ? admissionsMap.get(sName) : null);
        const assign = (sId && localAssignments ? localAssignments[sId] : null) || (student?.id && localAssignments ? localAssignments[student.id] : null);

        const sources = [admission, adm, student, assign].filter(Boolean);

        let isHostel = false;
        let isDayScholar = false;
        let prefBlock = "";
        let prefRoom = "";
        let prefHostelId = "";

        for (const src of sources) {
          const typeVal = String(getVal(src, "studentType", "StudentType", "facilityType", "FacilityType", "residential", "Residential", "residentialType", "ResidentialType", "residence", "Residence", "residentialStatus", "ResidentialStatus", "studentCategory", "StudentCategory") || "").trim().toLowerCase();
          if (["hostel", "residential", "hosteller", "residence"].includes(typeVal)) {
            isHostel = true;
          }
          if (["non-residential", "non residential", "day scholar", "dayscholar", "day-scholar"].includes(typeVal)) {
            isDayScholar = true;
          }

          const isRes = src.isResidential ?? src.IsResidential;
          if (isRes === true || isRes === 1 || String(isRes).toLowerCase() === "true" || String(isRes).toLowerCase() === "yes") {
            isHostel = true;
          }
          if (isRes === false || isRes === 0 || String(isRes).toLowerCase() === "false" || String(isRes).toLowerCase() === "no") {
            isDayScholar = true;
          }

          const hReq = String(getVal(src, "hostelRequired", "HostelRequired", "isHostelRequired", "IsHostelRequired") || "").trim().toLowerCase();
          if (["yes", "true", "1", "y"].includes(hReq)) {
            isHostel = true;
          }
          if (["no", "false", "0", "n"].includes(hReq)) {
            isDayScholar = true;
          }

          const tReq = String(getVal(src, "transportRequired", "TransportRequired") || "").trim().toLowerCase();
          if (["yes", "true", "1", "y"].includes(tReq)) {
            isDayScholar = true;
          }

          const hId = getVal(src, "hostelId", "HostelId", "hostelBlockId", "HostelBlockId");
          if (hId && String(hId) !== "0" && String(hId).trim() !== "" && String(hId).toLowerCase() !== "null" && String(hId).toLowerCase() !== "none") {
            isHostel = true;
            prefHostelId = String(hId);
          }

          const hBlock = getVal(src, "hostelBlock", "HostelBlock", "fetchedHostelBlock", "FetchedHostelBlock", "hostelBlockName", "HostelBlockName", "blockName", "BlockName", "block", "Block");
          if (hBlock && String(hBlock).trim() !== "" && String(hBlock).toLowerCase() !== "none" && String(hBlock).toLowerCase() !== "null") {
            isHostel = true;
            if (!prefBlock) prefBlock = String(hBlock).trim();
          }

          const hRoom = getVal(src, "hostelRoom", "HostelRoom", "fetchedHostelRoom", "FetchedHostelRoom", "hostelRoomName", "HostelRoomName", "roomTypeName", "RoomTypeName", "roomType", "RoomType");
          if (hRoom && String(hRoom).trim() !== "" && String(hRoom).toLowerCase() !== "none" && String(hRoom).toLowerCase() !== "null") {
            isHostel = true;
            if (!prefRoom) prefRoom = String(hRoom).trim();
          }
        }

        // Strictly enforce: if student is a day scholar and did not choose hostel block/room, they are not hostel-opted
        if (isDayScholar && !prefBlock && !prefRoom && !prefHostelId) {
          isHostel = false;
        }

        if (prefBlock && blocks && blocks.length > 0) {
          const blkMatch = blocks.find((b) => String(b.id) === String(prefBlock) || b.code?.toLowerCase() === prefBlock.toLowerCase() || b.name?.toLowerCase() === prefBlock.toLowerCase());
          if (blkMatch) {
            prefBlock = blkMatch.name;
            prefHostelId = String(blkMatch.id);
          }
        }

        return { isHostel, isDayScholar, prefBlock, prefRoom, prefHostelId, adm };
      };

      const hostelCandidates = [];
      const seen = new Set();

      const processCandidate = (st, admissionObj = null) => {
        let sId = getVal(st, "studentId", "StudentId");
        if (!sId && st) {
          sId = getVal(st, "id", "Id");
        }
        let admNo = getVal(st, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || getVal(admissionObj, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || "";
        const sName = getVal(st, "studentName", "StudentName", "fullName", "FullName")
          || [getVal(st, "firstName", "FirstName"), getVal(st, "middleName", "MiddleName"), getVal(st, "lastName", "LastName")].filter(Boolean).join(" ")
          || getVal(admissionObj, "studentName", "StudentName", "fullName", "FullName")
          || [getVal(admissionObj, "firstName", "FirstName"), getVal(admissionObj, "middleName", "MiddleName"), getVal(admissionObj, "lastName", "LastName")].filter(Boolean).join(" ");

        let rawNumericId = sId && !isNaN(Number(sId)) && Number(sId) > 0 ? Number(sId) : null;
        let isEnrolled = false;
        let numericStudentId = null;

        // Verify if candidate is genuinely enrolled in the Students master table
        const isUnenrolled = isUnenrolledAdmissionCandidate(st || admissionObj);
        if (st && rawNumericId && !isUnenrolled && st.isEnrolled !== false) {
          isEnrolled = true;
          numericStudentId = rawNumericId;
        }

        // If from admissionObj or an unenrolled candidate, try to match to a genuine enrolled student in Students
        if (admissionObj || isUnenrolled) {
          if (Array.isArray(effectiveStudents) && effectiveStudents.length > 0) {
            const matchedEnrolled = effectiveStudents.find((es) => {
              if (isUnenrolledAdmissionCandidate(es)) return false;
              const esId = Number(getVal(es, "studentId", "StudentId", "id", "Id"));
              if (!esId) return false;
              const esAdm = String(getVal(es, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || "").trim().toLowerCase();
              const esName = String(getVal(es, "studentName", "StudentName", "fullName", "FullName") || "").trim().toLowerCase();
              return (admNo && esAdm && esAdm === String(admNo).trim().toLowerCase()) ||
                     (sName && esName && esName === String(sName).trim().toLowerCase());
            });
            if (matchedEnrolled) {
              numericStudentId = Number(getVal(matchedEnrolled, "studentId", "StudentId", "id", "Id"));
              isEnrolled = true;
              if (!admNo && matchedEnrolled.admissionNo) admNo = matchedEnrolled.admissionNo;
            }
          }
        }

        const cleanNameKey = sName ? `name-${String(sName).trim().toLowerCase()}` : null;
        const cleanAdmKey = admNo ? `adm-${String(admNo).trim().toLowerCase()}` : null;
        const cleanSidKey = numericStudentId ? `sid-${numericStudentId}` : null;

        const dedupeKey = cleanSidKey || cleanAdmKey || cleanNameKey;
        if (!dedupeKey || seen.has(dedupeKey)) return;
        if (cleanSidKey && seen.has(cleanSidKey)) return;
        if (cleanAdmKey && seen.has(cleanAdmKey)) return;
        if (cleanNameKey && seen.has(cleanNameKey)) return;

        // Check active allocation status for this student
        const existingAlloc = (numericStudentId && activeAllocationsMap.get(String(numericStudentId))) ||
                              (admNo && activeAllocationsMap.get(String(admNo).trim().toLowerCase())) || null;
        const isAllocated = Boolean(existingAlloc);

        const optCheck = checkHostelOpted(st, admissionObj);

        // HARD REQUIREMENT: Day scholars must never appear. Only students who selected hostel in admissions or active residents!
        if (optCheck.isDayScholar && !isAllocated && !optCheck.prefBlock && !optCheck.prefRoom) {
          return;
        }
        if (!optCheck.isHostel && !isAllocated) {
          return;
        }

        seen.add(dedupeKey);
        if (cleanSidKey) seen.add(cleanSidKey);
        if (cleanAdmKey) seen.add(cleanAdmKey);
        if (cleanNameKey) seen.add(cleanNameKey);

        const fullName = sName || (admNo ? `Student #${admNo}` : (numericStudentId ? `Student #${numericStudentId}` : "Student"));

        const cls = getVal(st, "programName", "ProgramName", "courseName", "CourseName", "sectionName", "SectionName", "groupName", "GroupName")
          || getVal(admissionObj, "programName", "ProgramName", "courseName", "CourseName", "branchName", "BranchName", "className", "ClassName")
          || (isEnrolled ? "Enrolled Student" : "Admission Applicant");

        const allocatedRoomDesc = existingAlloc
          ? `${existingAlloc.blockName || "Hostel"} • Room #${existingAlloc.room || existingAlloc.roomId || "-"}${existingAlloc.bed ? ` (Bed ${existingAlloc.bed})` : ""}`
          : "";

        const cand = {
          id: numericStudentId || admNo || dedupeKey,
          studentId: numericStudentId,
          name: fullName,
          admissionNo: admNo,
          isEnrolled,
          className: cls,
          gender: getVal(st, "gender", "Gender") || getVal(admissionObj, "gender", "Gender") || "",
          contact: getVal(st, "mobileNumber", "MobileNumber", "mobile", "Mobile") || getVal(admissionObj, "contactNumber", "ContactNumber", "mobileNumber", "MobileNumber") || "",
          isHostelOpted: true,
          preferredBlockName: optCheck.prefBlock || existingAlloc?.blockName || "",
          preferredRoomType: optCheck.prefRoom || "",
          hostelId: optCheck.prefHostelId || existingAlloc?.hostelId || "",
          isAllocated,
          allocatedRoom: allocatedRoomDesc,
          existingAlloc,
        };

        hostelCandidates.push(cand);
      };

      if (Array.isArray(effectiveStudents) && effectiveStudents.length > 0) {
        effectiveStudents.forEach((st) => processCandidate(st, null));
      }

      if (Array.isArray(effectiveAdmissions) && effectiveAdmissions.length > 0) {
        effectiveAdmissions.forEach((ca) => processCandidate(null, ca));
      }

      if (localAdmissionsList.length > 0) {
        localAdmissionsList.forEach((entry) => {
          const x = { ...(entry.raw || {}), ...(entry.values || {}), ...entry };
          processCandidate(null, x);
        });
      }

      // Sort: Unallocated students first so they can be immediately assigned, followed by already allocated
      hostelCandidates.sort((a, b) => {
        if (!a.isAllocated && b.isAllocated) return -1;
        if (a.isAllocated && !b.isAllocated) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });

      // Fallback for edit mode: keep currently selected student if not present
      if (modal.mode === "edit" && modal.data?.studentId && !seen.has(String(modal.data.studentId))) {
        hostelCandidates.unshift({
          id: modal.data.studentId,
          studentId: modal.data.studentId,
          name: modal.data.studentName || `Student #${modal.data.studentId}`,
          admissionNo: modal.data.admissionNo || "",
          className: "Resident Hosteller",
          isHostelOpted: true,
          isEnrolled: true,
          isAllocated: false,
          allocatedRoom: "",
        });
      }

      return hostelCandidates;
    }, [effectiveStudents, effectiveAdmissions, activeAllocationsMap, modal.mode, modal.data, blocks]);

    // Handle student select change - matching Warden selection behavior
    const handleStudentChange = (selectedVal) => {
      if (!selectedVal) {
        setForm({
          ...form,
          studentId: null,
          studentName: "",
          admissionNo: "",
        });
        setStudentSearch("");
        return;
      }
      const st = allCandidates.find(
        (c) => String(c.studentId) === String(selectedVal) ||
               String(c.admissionNo) === String(selectedVal) ||
               String(c.id) === String(selectedVal)
      );
      if (!st) return;

      let nextBlock = form.blockName;
      let nextHostelId = form.hostelId;
      let nextBlockCode = form.blockCode;
      let nextFloor = form.floor;
      let nextRoom = form.room;
      let nextRoomId = form.roomId;

      if (st.preferredBlockName || st.hostelId) {
        const matchedBlk = blocks.find((b) =>
          (st.preferredBlockName && (String(b.name || "").toLowerCase() === String(st.preferredBlockName).toLowerCase() || String(b.code || "").toLowerCase() === String(st.preferredBlockName).toLowerCase())) ||
          (st.hostelId && String(b.id) === String(st.hostelId))
        );
        if (matchedBlk && !form.blockName) {
          nextBlock = matchedBlk.name;
          nextBlockCode = matchedBlk.code;
          nextHostelId = matchedBlk.id;
        }
      }

      if (st.preferredRoomType && nextBlock) {
        const prefRm = rooms.find((r) =>
          (r.blockName === nextBlock || r.block === nextBlock || String(r.hostelId) === String(nextHostelId)) &&
          (String(r.type || "").toLowerCase() === String(st.preferredRoomType).toLowerCase() || r.roomNo === st.preferredRoomType)
        );
        if (prefRm && !form.room) {
          nextRoom = prefRm.roomNo;
          nextRoomId = prefRm.id;
          if (prefRm.floor) nextFloor = normalizeFloorName(prefRm.floor);
        }
      }

      setForm({
        ...form,
        studentId: st.studentId || (Number(st.id) > 0 ? Number(st.id) : null),
        studentName: st.name,
        admissionNo: st.admissionNo || "",
        ...(nextBlock ? { blockName: nextBlock, blockCode: nextBlockCode, hostelId: nextHostelId } : {}),
        ...(nextFloor ? { floor: nextFloor } : {}),
        ...(nextRoom ? { room: nextRoom, roomId: nextRoomId } : {}),
      });
      setStudentSearch(st.name);
    };

    // Compute dynamic floor list for selected block in allocation modal strictly deduplicated
    const modalAvailableFloors = useMemo(() => {
      if (!form.blockName) return [];
      const blk = blocks.find((b) => b.name === form.blockName || b.code === form.blockCode || String(b.id) === String(form.hostelId));
      const floorSet = new Set();
      if (blk) {
        const count = Math.max(1, Number(blk.floors || 2));
        for (let i = 0; i < count; i++) {
          floorSet.add(i === 0 ? "Ground Floor" : i === 1 ? "1st Floor" : i === 2 ? "2nd Floor" : i === 3 ? "3rd Floor" : `${i}th Floor`);
        }
      }
      rooms
        .filter((r) => r.blockName === form.blockName || r.block === form.blockName || (blk && (String(r.hostelId) === String(blk.id) || r.block === blk.code || r.block === blk.name || r.blockName === blk.name)))
        .forEach((r) => {
          if (r.floor) floorSet.add(normalizeFloorName(r.floor));
        });
      return sortFloorLabels(Array.from(floorSet));
    }, [form.blockName, form.blockCode, form.hostelId, blocks, rooms]);

    // Available rooms for selected block and optional floor filter strictly deduplicated
    const availableRooms = useMemo(() => {
      if (!form.blockName) return [];
      const blk = blocks.find((b) => b.name === form.blockName || b.code === form.blockCode || String(b.id) === String(form.hostelId));
      const seenR = new Set();
      const list = [];
      rooms.filter((r) => {
        const matchBlock =
          r.blockName === form.blockName ||
          r.block === form.blockName ||
          (blk && (
            String(r.hostelId) === String(blk.id) ||
            r.block === blk.code ||
            r.block === blk.name ||
            r.blockName === blk.name
          ));
        const matchFloor = !form.floor || form.floor === "all" || isFloorMatch(r.floor, form.floor);
        return matchBlock && matchFloor;
      }).forEach((r) => {
        const key = r.id ? `id-${r.id}` : `no-${cleanRoomNumber(r.roomNo)}`;
        if (!seenR.has(key)) {
          seenR.add(key);
          list.push(r);
        }
      });
      return list;
    }, [form.blockName, form.blockCode, form.hostelId, form.floor, rooms, blocks]);

    // All beds for selected room strictly deduplicated with occupancy status
    const availableBeds = useMemo(() => {
      if (!form.roomId && !form.room) return [];
      const selRoom = rooms.find(
        (r) => String(r.id) === String(form.roomId) || r.roomNo === form.room || `Room #${r.roomNo}` === form.room || cleanRoomNumber(r.roomNo) === cleanRoomNumber(form.room)
      );
      const rId = selRoom ? selRoom.id : form.roomId;
      if (!rId) return [];

      const rawBeds = [
        ...beds.filter((b) => String(b.roomId) === String(rId)),
        ...(Array.isArray(selRoom?.beds) ? selRoom.beds : []),
      ];

      // If room has capacity but no explicit bed records in beds table, generate bed representations
      const cap = Number(selRoom?.capacity) || 0;
      if (rawBeds.length === 0 && cap > 0) {
        for (let i = 1; i <= cap; i++) {
          rawBeds.push({
            id: `room-${rId}-bed-${i}`,
            bedNumber: `Bed ${i}`,
            roomId: rId,
            bedStatus: "Available",
            isSynthetic: true,
          });
        }
      }

      const uniqueBeds = [];
      const seenBedSet = new Set();
      for (const bd of rawBeds) {
        const bedNum = bd.bedNumber || `Bed #${uniqueBeds.length + 1}`;
        const k = bd.id ? `id-${bd.id}` : `num-${bedNum}`;
        if (!seenBedSet.has(k)) {
          seenBedSet.add(k);

          // Find active allocation for this bed
          const activeAlloc = allocations.find(
            (a) => (a.status || "").toLowerCase() === "active" &&
                   (modal.mode !== "edit" || a.id !== modal.data?.id) &&
                   ((bd.id && !bd.isSynthetic && Number(a.bedId) === Number(bd.id)) ||
                    (form.room && (a.room === form.room || cleanRoomNumber(a.room) === cleanRoomNumber(form.room)) &&
                     (a.bed === bedNum || cleanRoomNumber(a.bed) === cleanRoomNumber(bedNum))))
          );

          const isOccupied = (bd.bedStatus || "").toLowerCase() === "occupied" || Boolean(activeAlloc);
          const occupiedBy = activeAlloc?.studentName || (isOccupied ? "Resident Hosteller" : null);

          uniqueBeds.push({
            ...bd,
            bedNumber: bedNum,
            isOccupied,
            occupiedBy,
            activeAlloc,
          });
        }
      }
      return uniqueBeds;
    }, [beds, form.roomId, form.room, rooms, allocations, modal.mode, modal.data?.id]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      let studentId = Number(form.studentId);
      if (!studentId || isNaN(studentId) || studentId <= 0) {
        const found = allCandidates.find(
          (s) => s.isEnrolled && s.studentId && !isUnenrolledAdmissionCandidate(s) && (
            (form.admissionNo && String(s.admissionNo)?.trim().toLowerCase() === String(form.admissionNo)?.trim().toLowerCase()) ||
            (studentSearch && s.name?.trim().toLowerCase() === studentSearch?.trim().toLowerCase()) ||
            (form.studentName && s.name?.trim().toLowerCase() === form.studentName?.trim().toLowerCase())
          )
        );
        if (found?.studentId) {
          studentId = Number(found.studentId);
        }
      }

      if (!studentId || isNaN(studentId) || studentId <= 0 || isUnenrolledAdmissionCandidate({ studentId })) {
        showToast("Please select a registered, enrolled student from the dropdown list. Hostel beds can only be allocated to students enrolled in the Student Master database.", "warning");
        return;
      }

      // Check if student already has an active allocation
      const existingAlloc = allocations.find(
        (a) => (a.status || "").toLowerCase() === "active" && (
          (studentId && Number(a.studentId) === Number(studentId)) ||
          (form.admissionNo && String(a.admissionNo).trim().toLowerCase() === String(form.admissionNo).trim().toLowerCase())
        )
      );

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

      const selBed = availableBeds.find((b) => b.bedNumber === form.bed || String(b.id) === String(form.bedId));
      let bedId = selBed && !selBed.isSynthetic && !isNaN(Number(selBed.id)) ? Number(selBed.id) : (Number(form.bedId) || null);
      if (selBed && selBed.isOccupied && modal.mode !== "edit" && (!existingAlloc || Number(existingAlloc.bedId) !== Number(bedId))) {
        showToast("The selected bed is already occupied. Please select an available bed.", "warning");
        return;
      }

      setIsSubmitting(true);
      try {
        await handleSaveAllocation({
          ...form,
          id: form.id || existingAlloc?.id,
          studentId,
          bedId,
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Modal title="Allocate Room & Bed" onClose={closeModal} className="cms-hostel-modal-lg">
        <form onSubmit={handleSubmit}>
          <div className="cms-alloc-modal-form">
            {/* 1. Select Student (Hostel Opted) * */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Select Student (Hostel Opted) <span style={{ color: "var(--cms-red)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  required
                  disabled={isView}
                  value={form.studentId ? String(form.studentId) : (form.admissionNo || "")}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="cms-alloc-modal-select"
                  style={{ color: form.studentName ? "var(--cms-text)" : "var(--cms-muted)" }}
                >
                  <option value="" disabled>
                    {allCandidates.length === 0
                      ? "No hostel-opted students found in admissions..."
                      : "Select Student (Hostel Opted)..."}
                  </option>
                  {allCandidates.map((st) => {
                    const isCurrentEditStudent = modal.mode === "edit" && (
                      (form.studentId && Number(st.studentId) === Number(form.studentId)) ||
                      (form.admissionNo && st.admissionNo === form.admissionNo)
                    );
                    const disabled = st.isAllocated && !isCurrentEditStudent;
                    const val = st.studentId ? String(st.studentId) : (st.admissionNo ? String(st.admissionNo) : String(st.id));
                    return (
                      <option
                        key={st.key || `st-cand-${st.id || st.admissionNo || st.studentId}`}
                        value={val}
                        disabled={disabled}
                      >
                        {st.name} ({st.admissionNo || `ID: ${st.studentId || st.id}`} • {st.className}
                        {st.isAllocated
                          ? ` • Already Allocated: ${st.allocatedRoom}`
                          : st.preferredBlockName
                          ? ` • Opted: ${st.preferredBlockName}`
                          : " • Hostel Opted"}
                        )
                      </option>
                    );
                  })}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--cms-muted)", margin: "3px 0 0 0" }}>
                Only students who selected Hostel accommodation in admission are listed. Day scholars are excluded.
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
                  value={form.blockName}
                  onChange={(e) => {
                    const blk = blocks.find((b) => b.name === e.target.value);
                    setForm({
                      ...form,
                      blockName: e.target.value,
                      blockCode: blk ? blk.code : e.target.value,
                      hostelId: blk ? blk.id : form.hostelId,
                      floor: "",
                      room: "",
                      roomId: null,
                      bed: "",
                      bedId: null,
                    });
                  }}
                  className="cms-alloc-modal-select"
                  style={{ color: form.blockName ? "var(--cms-text)" : "var(--cms-muted)" }}
                >
                  <option value="">Select Hostel Block</option>
                  {Array.from(new Map(blocks.map((b) => [String(b.id || b.name), b])).values()).map((b) => (
                    <option key={b.id || b.code || b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="cms-alloc-modal-chevron">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 2b. Floor Level (Cascaded with Block & Rooms) */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Floor Level
              </label>
              <div style={{ position: "relative" }}>
                <select
                  disabled={!form.blockName}
                  value={form.floor || "all"}
                  onChange={(e) => {
                    const selFloor = e.target.value === "all" ? "" : e.target.value;
                    setForm({
                      ...form,
                      floor: selFloor,
                      room: "",
                      roomId: null,
                      bed: "",
                      bedId: null,
                    });
                  }}
                  className="cms-alloc-modal-select"
                  style={{ color: form.floor ? "var(--cms-text)" : "var(--cms-muted)" }}
                >
                  <option value="all">
                    {!form.blockName ? "Select Hostel Block first..." : "All Floors"}
                  </option>
                  {modalAvailableFloors.map((fl) => (
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
                    disabled={isView}
                    value={form.room || ""}
                    onChange={(e) => {
                      const selRoomNo = e.target.value;
                      const selRoom = availableRooms.find(r => r.roomNo === selRoomNo || `Room #${r.roomNo}` === selRoomNo || String(r.id) === String(selRoomNo));
                      setForm({
                        ...form,
                        room: selRoom ? selRoom.roomNo : selRoomNo,
                        roomId: selRoom ? selRoom.id : form.roomId,
                        floor: selRoom?.floor ? normalizeFloorName(selRoom.floor) : form.floor,
                        bed: "",
                        bedId: null,
                      });
                    }}
                    className="cms-alloc-modal-select"
                    style={{ color: form.room ? "var(--cms-text)" : "var(--cms-muted)" }}
                  >
                    {!form.blockName ? (
                      <option value="">Select Hostel Block first...</option>
                    ) : (
                      <>
                        <option value="">Select Room...</option>
                        {availableRooms.map((rm, idx) => {
                          const rmBeds = beds.filter(b => Number(b.roomId) === Number(rm.id) || String(b.roomId) === String(rm.id)) || [];
                          const rmAllocs = allocations.filter(a => (a.status || "").toLowerCase() === "active" && (Number(a.roomId) === Number(rm.id) || rm.roomNo === a.room));
                          const cap = Number(rm.capacity) || rmBeds.length || 1;
                          const occupiedCount = Math.max(
                            rmAllocs.length,
                            rmBeds.filter(b => (b.bedStatus || "").toLowerCase() === "occupied").length
                          );
                          const isFull = cap > 0 && occupiedCount >= cap;
                          return (
                            <option key={rm.id || rm.roomNo || `rm-${idx}`} value={rm.roomNo}>
                              Room #{rm.roomNo} {rm.type ? `(${rm.type})` : ""} • {occupiedCount}/{cap} Beds Assigned {isFull ? "(Full)" : `(${cap - occupiedCount} Available)`}
                            </option>
                          );
                        })}
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
                    disabled={isView}
                    value={form.bed || ""}
                    onChange={(e) => {
                      const selBedNum = e.target.value;
                      const bd = availableBeds.find(b => b.bedNumber === selBedNum || String(b.id) === String(selBedNum));
                      setForm({
                        ...form,
                        bed: bd ? bd.bedNumber : selBedNum,
                        bedId: bd && !bd.isSynthetic ? bd.id : null,
                      });
                    }}
                    className="cms-alloc-modal-select"
                    style={{ color: form.bed ? "var(--cms-text)" : "var(--cms-muted)" }}
                  >
                    {!form.room ? (
                      <option value="">Select Room first...</option>
                    ) : availableBeds.length === 0 ? (
                      <option value="" disabled>No beds registered for this room</option>
                    ) : (
                      <>
                        <option value="">Select Bed Number...</option>
                        {availableBeds.map((bd, idx) => {
                          const isCurrentBed = modal.mode === "edit" && (
                            (modal.data?.bedId && String(bd.id) === String(modal.data?.bedId)) ||
                            (modal.data?.bed && bd.bedNumber === modal.data?.bed)
                          );
                          const disabled = bd.isOccupied && !isCurrentBed;
                          return (
                            <option
                              key={bd.id || bd.bedNumber || `bd-${idx}`}
                              value={bd.bedNumber}
                              disabled={disabled}
                            >
                              {bd.bedNumber} {bd.isOccupied
                                ? `(Already Assigned • Occupied: ${bd.occupiedBy || "Resident"})`
                                : "(Available)"}
                            </option>
                          );
                        })}
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
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cms-alloc-modal-submit-btn"
              style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

// Vacate Bed Modal
function VacateModal({ modal, closeModal, handleVacateAllocation }) {
    const alloc = modal.data;
    const [reason, setReason] = useState("Switched to Day Scholar");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!alloc) return null;

    const handleConfirm = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await handleVacateAllocation(alloc, reason);
      } finally {
        setIsSubmitting(false);
      }
    };

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
              disabled={isSubmitting}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              style={{ background: "var(--cms-red)", opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
              disabled={isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? "Processing..." : "Confirm Vacate"}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

const formatToDatetimeLocal = (val, offsetMs = 0, baseTimestamp = null) => {
  let d;
  if (!val) {
    const base = baseTimestamp !== null ? baseTimestamp : Date.now();
    d = new Date(base + offsetMs);
  } else {
    d = new Date(val);
    if (isNaN(d.getTime())) {
      const base = baseTimestamp !== null ? baseTimestamp : Date.now();
      d = new Date(base + offsetMs);
    }
  }
  const pad = (n) => String(n).padStart(2, "0");
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
};

// Outpass Modal (Screenshot 4 - Theme-based & Exact Fields Only)
function OutpassModal({ modal, closeModal, allocations, outpasses = [], handleSaveOutpass, showToast }) {
    const isView = modal.mode === "view";
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState(
      modal.data?.studentId ? String(modal.data.studentId) : (modal.data?.admissionNo || "")
    );
    const [outpassCategory, setOutpassCategory] = useState(
      modal.data?.outpassType || modal.data?.requestType || "Local Outpass (Same Day)"
    );

    const initialDep = modal.data
      ? formatToDatetimeLocal(modal.data?.fromDateTime || modal.data?.departureDate || modal.data?.outDate)
      : formatToDatetimeLocal(null, 0);

    const isLeaveInitial = (modal.data?.requestType || modal.data?.outpassType || outpassCategory || "").toLowerCase().includes("leave");
    const initialRet = modal.data
      ? formatToDatetimeLocal(modal.data?.toDateTime || modal.data?.returnDate)
      : formatToDatetimeLocal(null, isLeaveInitial ? 48 * 3600 * 1000 : 4 * 3600 * 1000);

    const [departureDateTime, setDepartureDateTime] = useState(initialDep);
    const [returnDateTime, setReturnDateTime] = useState(initialRet);
    const [reason, setReason] = useState(modal.data?.reason || "");

    const isDateInvalid = Boolean(
      departureDateTime &&
      returnDateTime &&
      new Date(returnDateTime).getTime() <= new Date(departureDateTime).getTime()
    );

    // Resident candidates for student dropdown strictly deduplicated
    const studentCandidates = useMemo(() => {
      const map = new Map();
      (allocations || []).forEach((a) => {
        if ((a.status || "").toLowerCase() === "active") {
          const key = String(a.studentId || a.admissionNo || a.id);
          if (!map.has(key)) {
            map.set(key, {
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
        }
      });
      return Array.from(map.values());
    }, [allocations]);

    const conflictingRequest = useMemo(() => {
      if (!selectedStudentId || !departureDateTime || !Array.isArray(outpasses)) {
        return null;
      }

      const studentObj = studentCandidates.find(
        (s) =>
          String(s.studentId) === String(selectedStudentId) ||
          s.admissionNo === selectedStudentId ||
          String(s.allocationId) === String(selectedStudentId) ||
          String(s.id) === String(selectedStudentId)
      );

      const newStartDay = String(departureDateTime).split("T")[0];
      const newEndDay = returnDateTime ? String(returnDateTime).split("T")[0] : newStartDay;
      if (!newStartDay) return null;

      return outpasses.find((op) => {
        if (modal.data?.id && (op.id === modal.data.id || op.requestId === modal.data.id)) return false;
        if (modal.data?.requestId && (op.requestId === modal.data.requestId || op.id === modal.data.requestId)) return false;

        const isSameStudent =
          (studentObj?.studentId && Number(op.studentId) === Number(studentObj.studentId)) ||
          (studentObj?.admissionNo && op.admissionNo && String(op.admissionNo).trim().toLowerCase() === String(studentObj.admissionNo).trim().toLowerCase()) ||
          (studentObj?.name && op.studentName && String(op.studentName).trim().toLowerCase() === String(studentObj.name).trim().toLowerCase()) ||
          String(op.studentId) === String(selectedStudentId) ||
          (op.admissionNo && op.admissionNo === selectedStudentId);

        if (!isSameStudent) return false;

        const status = String(op.approvalStatus || op.status || "").toLowerCase();
        const isActive = status === "pending" || status === "approved" || status === "active";
        if (!isActive) return false;

        const existingStartStr = op.departureDate || op.outDate || op.fromDateTime || "";
        const existingEndStr = op.returnDate || op.toDateTime || existingStartStr;
        const opStartDay = String(existingStartStr).split("T")[0];
        const opEndDay = String(existingEndStr).split("T")[0] || opStartDay;

        if (!opStartDay) return false;

        // Interval overlap: new [newStartDay, newEndDay] overlaps with existing [opStartDay, opEndDay]
        return newStartDay <= opEndDay && newEndDay >= opStartDay;
      });
    }, [selectedStudentId, departureDateTime, returnDateTime, outpasses, studentCandidates, modal.data]);

    const handleCategoryChange = (newCat) => {
      setOutpassCategory(newCat);
      if (isView) return;
      const depDate = departureDateTime ? new Date(departureDateTime) : new Date();
      const baseTime = isNaN(depDate.getTime()) ? Date.now() : depDate.getTime();
      const isLeave = String(newCat || "").toLowerCase().includes("leave") || String(newCat || "").toLowerCase().includes("home");
      const defaultDurationMs = isLeave ? 48 * 3600 * 1000 : 4 * 3600 * 1000;
      setReturnDateTime(formatToDatetimeLocal(null, defaultDurationMs, baseTime));
    };

    const handleDepartureChange = (newDep) => {
      setDepartureDateTime(newDep);
      if (!newDep) return;
      const newDepTime = new Date(newDep).getTime();
      const curRetTime = returnDateTime ? new Date(returnDateTime).getTime() : 0;
      if (isNaN(newDepTime)) return;
      if (!returnDateTime || isNaN(curRetTime) || curRetTime <= newDepTime) {
        const isLeave = String(outpassCategory || "").toLowerCase().includes("leave") || String(outpassCategory || "").toLowerCase().includes("home");
        const defaultDurationMs = isLeave ? 48 * 3600 * 1000 : 4 * 3600 * 1000;
        setReturnDateTime(formatToDatetimeLocal(null, defaultDurationMs, newDepTime));
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

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

      if (!departureDateTime) {
        showToast("Please select Departure Date & Time.", "error");
        return;
      }

      if (!returnDateTime) {
        showToast("Please select Expected Return Date & Time.", "error");
        return;
      }

      const depMs = new Date(departureDateTime).getTime();
      const retMs = new Date(returnDateTime).getTime();
      if (isNaN(depMs) || isNaN(retMs)) {
        showToast("Please enter valid departure and return dates.", "error");
        return;
      }

      if (retMs <= depMs) {
        showToast("To date and time must be greater than From date and time.", "error");
        return;
      }

      if (conflictingRequest) {
        showToast("Student already has a pending or approved request for the selected date and time range.", "warning");
        return;
      }

      try {
        setIsSubmitting(true);
        await handleSaveOutpass({
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
          departureDate: departureDateTime,
          outDate: departureDateTime,
          returnDate: returnDateTime,
          reason: reason || "Outpass permission request",
          destination: "City",
        });
      } finally {
        setIsSubmitting(false);
      }
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
                  disabled={isView || isSubmitting}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="cms-alloc-modal-select"
                >
                  <option value="">Select Student...</option>
                  {studentCandidates.map((st, idx) => (
                    <option key={st.studentId ? `st-id-${st.studentId}` : (st.admissionNo ? `st-adm-${st.admissionNo}` : `st-${idx}`)} value={String(st.studentId || st.admissionNo || st.id)}>
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
                  disabled={isView || isSubmitting}
                  value={outpassCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="cms-alloc-modal-select"
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
                  disabled={isView || isSubmitting}
                  type="datetime-local"
                  value={departureDateTime}
                  onChange={(e) => handleDepartureChange(e.target.value)}
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
                  disabled={isView || isSubmitting}
                  type="datetime-local"
                  min={departureDateTime || undefined}
                  value={returnDateTime}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  className="cms-alloc-modal-input"
                  style={isDateInvalid || conflictingRequest ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                  placeholder="dd-mm-yyyy --:--"
                />
                {isDateInvalid && (
                  <span
                    style={{
                      color: "var(--cms-red, #dc2626)",
                      fontSize: "12px",
                      marginTop: "4px",
                      display: "block",
                      fontWeight: 500,
                    }}
                  >
                    To date and time must be greater than From date and time.
                  </span>
                )}
                {conflictingRequest && !isDateInvalid && (
                  <span
                    style={{
                      color: "var(--cms-warning-text, #b45309)",
                      fontSize: "12px",
                      marginTop: "4px",
                      display: "block",
                      fontWeight: 500,
                    }}
                  >
                    ⚠️ Conflict: Active ({conflictingRequest.approvalStatus || "Pending"}) request exists for this range.
                  </span>
                )}
              </div>
            </div>

            {conflictingRequest && !isDateInvalid && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(234, 179, 8, 0.12)",
                  border: "1px solid rgba(234, 179, 8, 0.35)",
                  color: "var(--cms-warning-text, #b45309)",
                  fontSize: "12px",
                  lineHeight: "1.4",
                  fontWeight: 500,
                }}
              >
                ⚠️ Student already has an active ({conflictingRequest.approvalStatus || "Pending"}) request for this date/time range. Please select another date or time.
              </div>
            )}

            {/* 4. Reason */}
            <div className="cms-alloc-modal-field">
              <label className="cms-alloc-modal-label">
                Reason
              </label>
              <input
                disabled={isView || isSubmitting}
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
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {!isView && (
              <button
                type="submit"
                className="cms-alloc-modal-submit-btn"
                disabled={isDateInvalid || Boolean(conflictingRequest) || isSubmitting}
                style={isDateInvalid || Boolean(conflictingRequest) || isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  };

function TransferModal({
  modal,
  closeModal,
  blocks,
  rooms,
  beds,
  allocations,
  handleSaveTransfer,
  showToast,
}) {
    const isView = modal.mode === "view";
    const [isSubmitting, setIsSubmitting] = useState(false);
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
      if (modal?.data?.studentName) {
        const key = String(modal.data.studentId || modal.data.admissionNo || modal.data.id || "view-student");
        map.set(key, {
          id: modal.data.allocationId || modal.data.id,
          allocationId: modal.data.allocationId || modal.data.id,
          studentId: modal.data.studentId,
          name: modal.data.studentName,
          admissionNo: modal.data.admissionNo,
          blockName: modal.data.currentBlock || modal.data.fromHostelName || "Hostel",
          hostelId: modal.data.fromHostelId,
          room: modal.data.currentRoom || modal.data.fromRoomNumber || "-",
          roomId: modal.data.fromRoomId,
          bed: modal.data.fromBedId || "-",
          bedId: modal.data.fromBedId,
        });
      }
      allocations.forEach((a) => {
        if ((a.status || "").toLowerCase() === "active") {
          const key = String(a.studentId || a.admissionNo || a.id);
          if (!map.has(key)) {
            map.set(key, {
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
        }
      });
      return Array.from(map.values());
    }, [allocations, modal?.data]);

    // Destination block resolution
    const destBlockObj = useMemo(() => {
      return blocks.find((b) => b.name === destinationBlock || String(b.id) === String(destinationBlock)) || blocks[0] || null;
    }, [destinationBlock, blocks]);

    // Destination room options strictly deduplicated
    const destRooms = useMemo(() => {
      if (!destBlockObj) return [];
      const seen = new Set();
      const list = [];
      rooms.filter(
        (r) => r.blockName === destBlockObj.name || r.block === destBlockObj.name || r.block === destBlockObj.code || String(r.hostelId) === String(destBlockObj.id)
      ).forEach((r) => {
        const k = r.id ? `id-${r.id}` : `num-${cleanRoomNumber(r.roomNo)}`;
        if (!seen.has(k)) {
          seen.add(k);
          list.push(r);
        }
      });
      return list;
    }, [destBlockObj, rooms]);

    // Destination room resolution
    const destRoomObj = useMemo(() => {
      if (!destinationRoom) return null;
      return destRooms.find(
        (r) => r.roomNo === destinationRoom || `Room #${r.roomNo}` === destinationRoom || `Room ${r.roomNo}` === destinationRoom || cleanRoomNumber(r.roomNo) === cleanRoomNumber(destinationRoom) || String(r.id) === String(destinationRoom)
      ) || null;
    }, [destRooms, destinationRoom]);

    // Destination available beds (only real registered beds in database strictly deduplicated)
    const destBeds = useMemo(() => {
      if (!destRoomObj) return [];
      const rawBeds = [
        ...beds.filter((b) => String(b.roomId) === String(destRoomObj.id)),
        ...(Array.isArray(destRoomObj.beds) ? destRoomObj.beds : [])
      ];
      const avail = rawBeds.filter(
        (b) => (b.bedStatus || "").toLowerCase() === "available" || (!b.bedStatus && (b.status || "").toLowerCase() === "active")
      );
      const unique = [];
      const seen = new Set();
      for (const b of avail) {
        const k = b.id ? `id-${b.id}` : `num-${b.bedNumber}`;
        if (!seen.has(k)) {
          seen.add(k);
          unique.push(b);
        }
      }
      return unique;
    }, [beds, destRoomObj]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isSubmitting) return;
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

      setIsSubmitting(true);
      try {
        await handleSaveTransfer({
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
      } finally {
        setIsSubmitting(false);
      }
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
                  className="cms-alloc-modal-select"
                >
                  <option value="">Select Resident Student...</option>
                  {residentStudents.map((st) => (
                    <option key={st.studentId ? `rs-${st.studentId}` : (st.admissionNo ? `ra-${st.admissionNo}` : `ri-${st.id}`)} value={String(st.studentId || st.admissionNo || st.id)}>
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
                  className="cms-alloc-modal-select"
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
                    className="cms-alloc-modal-select"
                  >
                    <option value="">Select Destination Block...</option>
                    {Array.from(new Map(blocks.map((b) => [String(b.id || b.name), b])).values()).map((b) => (
                      <option key={b.id || b.code || b.name} value={b.name}>
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
                      className="cms-alloc-modal-select"
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
                      className="cms-alloc-modal-select"
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
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {!isView && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="cms-alloc-modal-submit-btn"
                style={isSubmitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
              >
                {isSubmitting ? "Processing..." : "Approve & Release Bed"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    );
  }
