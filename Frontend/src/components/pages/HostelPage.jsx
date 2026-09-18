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
import {
  hostelStats as seedStats,
  hostelBlocks as seedBlocks,
  hostelRoomCategories as seedCategories,
  hostelRooms as seedRooms,
  hostelWardens as seedWardens,
  hostelAllocations as seedAllocations,
  hostelOutpasses as seedOutpasses,
  hostelTransfers as seedTransfers,
  hostelAttendanceStudents as seedAttendanceStudents,
} from "@/data/mockData.js";
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

// Seed constants matching Screenshot 1 & 2 reference data
const defaultSeedAllocations = [
  {
    id: "alloc-kalyan",
    admissionNo: "REG-1171",
    studentName: "kalyan Ram N",
    gender: "Male",
    blockName: "HM-660",
    blockCode: "HM-660",
    floor: "Floor 1",
    room: "RM-674",
    bed: "BED-1",
    roomBadge: "Room #RM-674 (BED-1)",
    joinDate: "2026-08-26",
    status: "Active",
    monthlyFee: "₹6,500",
    contact: "+91 98765 11171",
  },
  {
    id: "alloc-rajesh",
    admissionNo: "ADM 2026 101",
    studentName: "Rajesh Kumar",
    gender: "Male",
    blockName: "Ramachandra Bhavan Block",
    blockCode: "RBB",
    floor: "Floor 1",
    room: "101",
    bed: "BED-1",
    roomBadge: "Room #101 (BED-1)",
    joinDate: "2026-06-01",
    status: "Active",
    monthlyFee: "₹6,500",
    contact: "+91 98765 10101",
  },
];

const defaultExtraBlocks = [
  {
    id: "blk-hm660",
    name: "HM-660",
    code: "HM-660",
    type: "Boys",
    floors: 3,
    totalRooms: 30,
    totalBeds: 60,
    occupiedBeds: 12,
    vacantBeds: 48,
    warden: "Dr. K. Ramesh",
    wardenPhone: "+91 98451 22301",
    status: "Active",
  },
  {
    id: "blk-rbb",
    name: "Ramachandra Bhavan Block",
    code: "RBB",
    type: "Boys",
    floors: 4,
    totalRooms: 40,
    totalBeds: 80,
    occupiedBeds: 25,
    vacantBeds: 55,
    warden: "M. Ramachandra",
    wardenPhone: "+91 98451 22302",
    status: "Active",
  },
  {
    id: "blk-rbb-a",
    name: "Ramachandra Bhavan (Block A)",
    code: "RBB-A",
    type: "Girls",
    floors: 3,
    totalRooms: 30,
    totalBeds: 60,
    occupiedBeds: 3,
    vacantBeds: 57,
    warden: "Mrs. K. Shanti",
    wardenPhone: "+91 98451 22303",
    status: "Active",
  },
];

// Seed attendance students matching Screenshot 1 & 2 reference data
const defaultAttendanceStudents = [
  {
    id: "REG-1456",
    admissionNo: "REG-1456",
    name: "Annabel Sutherland",
    block: "Ramachandra Bhavan (Block A)",
    blockCode: "RBB-A",
    room: "Room #120",
    bed: "BED-3",
    roomBed: "Room #120 (BED-3)",
    floor: "Floor 1",
    gender: "Female",
    inTime: "07:00",
  },
  {
    id: "REG-1093",
    admissionNo: "REG-1093",
    name: "Navya Reddy",
    block: "Ramachandra Bhavan (Block A)",
    blockCode: "RBB-A",
    room: "Room #120",
    bed: "BED-3",
    roomBed: "Room #120 (BED-3)",
    floor: "Floor 1",
    gender: "Female",
    inTime: "07:00",
  },
  {
    id: "REG-1090",
    admissionNo: "REG-1090",
    name: "Saanvi Krishna",
    block: "Ramachandra Bhavan (Block A)",
    blockCode: "RBB-A",
    room: "Room #G02",
    bed: "BED-2",
    roomBed: "Room #G02 (BED-2)",
    floor: "Ground Floor",
    gender: "Female",
    inTime: "07:00",
  },
];

const defaultExtraRooms = [
  {
    id: "rm-hm674",
    roomNo: "RM-674",
    block: "blk-hm660",
    blockName: "HM-660",
    floor: "Floor 1",
    type: "Double Sharing AC",
    capacity: 2,
    fee: "₹7,500",
    occupied: 1,
    beds: [
      { id: "RM-674-B1", bedNumber: "BED-1", status: "Occupied", studentName: "kalyan Ram N" },
      { id: "RM-674-B2", bedNumber: "BED-2", status: "Vacant" },
    ],
    status: "Available",
  },
  {
    id: "rm-rbb101",
    roomNo: "101",
    block: "blk-rbb",
    blockName: "Ramachandra Bhavan Block",
    floor: "Floor 1",
    type: "Double Sharing Non-AC",
    capacity: 2,
    fee: "₹6,000",
    occupied: 1,
    beds: [
      { id: "RBB-101-B1", bedNumber: "BED-1", status: "Occupied", studentName: "Rajesh Kumar" },
      { id: "RBB-101-B2", bedNumber: "BED-2", status: "Vacant" },
    ],
    status: "Available",
  },
];

const candidateStudentsList = [
  { id: "st-1", name: "kalyan Ram N", admissionNo: "REG-1171", className: "Class 10-A" },
  { id: "st-2", name: "Rajesh Kumar", admissionNo: "ADM 2026 101", className: "Class 10-A" },
  { id: "st-3", name: "Surya Teja", admissionNo: "ADM-2026-102", className: "Class 10-A" },
  { id: "st-4", name: "Dhanush Y", admissionNo: "ADM-2026-103", className: "Class 10-B" },
  { id: "st-5", name: "Bhanuprakash P", admissionNo: "ADM-2026-104", className: "Class 10-B" },
  { id: "st-6", name: "Saranya Ch", admissionNo: "ADM-2026-105", className: "Class 9-A" },
  { id: "st-7", name: "Ananya Roy", admissionNo: "ADM-2026-106", className: "Class 9-B" },
  { id: "st-8", name: "Sundharam Padala", admissionNo: "ADM-2026-107", className: "Class 10-A" },
  { id: "st-9", name: "Akhila Reddy", admissionNo: "ADM-2024-001", className: "Class 11-A" },
  { id: "st-10", name: "Alexander Wright", admissionNo: "ADM-2024-002", className: "Class 11-B" },
  { id: "st-11", name: "Rahul Sharma", admissionNo: "ADM-2024-007", className: "Class 12-A" },
  { id: "st-12", name: "Sneha Reddy", admissionNo: "ADM-2024-008", className: "Class 12-B" },
  { id: "st-13", name: "Vikram Patel", admissionNo: "ADM-2024-009", className: "Class 11-C" },
];

const defaultInitialOutpasses = [
  {
    id: 1,
    studentName: "Rajesh Kumar",
    admissionNo: "ADM-2026-101",
    blockName: "Ramachandra Bhavan Block",
    roomNo: "101",
    roomNumber: "101",
    outpassType: "Home Leave",
    requestType: "Home Leave",
    departureDate: "2026-08-15",
    outDate: "2026-08-15",
    returnDate: "2026-08-18",
    reason: "Family function visit",
    status: "Approved",
  },
  {
    id: 2,
    studentName: "Ananya Roy",
    admissionNo: "ADM-2026-106",
    blockName: "Girls Block A",
    roomNo: "G-101",
    roomNumber: "G-101",
    outpassType: "Local Outpass",
    requestType: "Local Outpass",
    departureDate: "2026-08-17",
    outDate: "2026-08-17",
    returnDate: "2026-08-17",
    reason: "Medical checkup",
    status: "Pending",
  },
  ...seedOutpasses,
];

const defaultSeedTransfers = [
  {
    id: "tr-1",
    studentName: "Rajesh Kumar",
    admissionNo: "ADM-2026-101",
    actionType: "Room Transfer",
    requestType: "Room Transfer",
    currentBlock: "Ramachandra Bhavan Block",
    currentRoom: "101",
    currentRoomDisplay: "Ramachandra Bhavan Block (#101)",
    targetBlock: "Bhanu Block",
    targetRoom: "201",
    targetBed: "Bed #1",
    targetDisplayTitle: "New Bed: Bhanu Block (#201)",
    targetDisplaySub: "✓ Old Bed #101 Released to Available",
    feeAdjustment: null,
    date: "2026-08-01",
    requestDate: "2026-08-01",
    status: "Completed",
    reason: "Preferred study environment in Bhanu Block",
  },
  {
    id: "tr-2",
    studentName: "Surya Teja",
    admissionNo: "ADM-2026-102",
    actionType: "Bed Vacate",
    requestType: "Bed Vacate",
    currentBlock: "Ramachandra Bhavan Block",
    currentRoom: "101",
    currentRoomDisplay: "Ramachandra Bhavan Block (#101)",
    targetBlock: "--",
    targetRoom: "--",
    targetBed: "--",
    targetDisplayTitle: "✓ Old Bed Released to Available",
    targetDisplaySub: null,
    feeAdjustment: "Fee Adjusted: ₹45,000 (Credit to Tuition Fee)",
    date: "2026-08-10",
    requestDate: "2026-08-10",
    status: "Completed",
    reason: "Switched to Non-Residential / Day Scholar after 3 months",
  },
];

const defaultReportBlocks = [
  {
    id: "rep-blk-1",
    code: "HST-01",
    name: "Ramachandra Bhavan (Block A)",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 1,
    floors: 1,
    wardenName: "Goutham k",
    warden: "Goutham k",
    primaryMobile: "+91-9878990876",
    wardenPhone: "+91-9878990876",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-2",
    code: "HST-02",
    name: "Boys Residence - Block A",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 3,
    floors: 3,
    wardenName: "Mr. Ramesh Kumar",
    warden: "Mr. Ramesh Kumar",
    primaryMobile: "+91-9845122301",
    wardenPhone: "+91-9845122301",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-3",
    code: "HST-03",
    name: "Boys Residence - Block B",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 3,
    floors: 3,
    wardenName: "Mr. S. Sundaram",
    warden: "Mr. S. Sundaram",
    primaryMobile: "+91-9712044512",
    wardenPhone: "+91-9712044512",
    location: "North Campus",
    status: "Active",
  },
  {
    id: "rep-blk-4",
    code: "HST-04",
    name: "Girls Residence - Block A",
    category: "Girls Hostel",
    type: "Girls Hostel",
    totalFloors: 3,
    floors: 3,
    wardenName: "Dr. M. Anuradha",
    warden: "Dr. M. Anuradha",
    primaryMobile: "+91-9876511200",
    wardenPhone: "+91-9876511200",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-5",
    code: "HST-05",
    name: "Bhanu Block",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 4,
    floors: 4,
    wardenName: "M. Ramachandra",
    warden: "M. Ramachandra",
    primaryMobile: "+91-9845122302",
    wardenPhone: "+91-9845122302",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-6",
    code: "HST-06",
    name: "Luxury hostel",
    category: "Co-ed",
    type: "Co-ed",
    totalFloors: 2,
    floors: 2,
    wardenName: "Mr. A. Sharma",
    warden: "Mr. A. Sharma",
    primaryMobile: "+91-9765432109",
    wardenPhone: "+91-9765432109",
    location: "South Campus",
    status: "Active",
  },
  {
    id: "rep-blk-7",
    code: "HST-07",
    name: "Junior College Wing",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 2,
    floors: 2,
    wardenName: "Dr. K. Ramesh",
    warden: "Dr. K. Ramesh",
    primaryMobile: "+91-9845122301",
    wardenPhone: "+91-9845122301",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-8",
    code: "HST-08",
    name: "Senior Wing - Block D",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 4,
    floors: 4,
    wardenName: "Mr. T. Srinivas",
    warden: "Mr. T. Srinivas",
    primaryMobile: "+91-9845122304",
    wardenPhone: "+91-9845122304",
    location: "East Campus",
    status: "Active",
  },
  {
    id: "rep-blk-9",
    code: "HST-09",
    name: "Girls Residence - Block B",
    category: "Girls Hostel",
    type: "Girls Hostel",
    totalFloors: 3,
    floors: 3,
    wardenName: "Mrs. P. Vani",
    warden: "Mrs. P. Vani",
    primaryMobile: "+91-9845122305",
    wardenPhone: "+91-9845122305",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-10",
    code: "HST-10",
    name: "International Hostel - Block E",
    category: "Co-ed",
    type: "Co-ed",
    totalFloors: 5,
    floors: 5,
    wardenName: "Dr. Robert Smith",
    warden: "Dr. Robert Smith",
    primaryMobile: "+91-9845122306",
    wardenPhone: "+91-9845122306",
    location: "North Campus",
    status: "Active",
  },
  {
    id: "rep-blk-11",
    code: "HST-11",
    name: "HM-660 Block",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 3,
    floors: 3,
    wardenName: "Mr. V. Krishna",
    warden: "Mr. V. Krishna",
    primaryMobile: "+91-9845122307",
    wardenPhone: "+91-9845122307",
    location: "West Campus",
    status: "Active",
  },
  {
    id: "rep-blk-12",
    code: "HST-12",
    name: "Kaveri Bhavan Block",
    category: "Girls Hostel",
    type: "Girls Hostel",
    totalFloors: 3,
    floors: 3,
    wardenName: "Mrs. S. Kamala",
    warden: "Mrs. S. Kamala",
    primaryMobile: "+91-9845122308",
    wardenPhone: "+91-9845122308",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-13",
    code: "HST-13",
    name: "Godavari Bhavan Block",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 2,
    floors: 2,
    wardenName: "Mr. N. Prasad",
    warden: "Mr. N. Prasad",
    primaryMobile: "+91-9845122309",
    wardenPhone: "+91-9845122309",
    location: "South Campus",
    status: "Active",
  },
  {
    id: "rep-blk-14",
    code: "HST-14",
    name: "Krishna Bhavan Block",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 4,
    floors: 4,
    wardenName: "Mr. K. Mahesh",
    warden: "Mr. K. Mahesh",
    primaryMobile: "+91-9845122310",
    wardenPhone: "+91-9845122310",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-15",
    code: "HST-15",
    name: "Saraswati Bhavan Block",
    category: "Girls Hostel",
    type: "Girls Hostel",
    totalFloors: 3,
    floors: 3,
    wardenName: "Dr. B. Lakshmi",
    warden: "Dr. B. Lakshmi",
    primaryMobile: "+91-9845122311",
    wardenPhone: "+91-9845122311",
    location: "Main Campus",
    status: "Active",
  },
  {
    id: "rep-blk-16",
    code: "HST-16",
    name: "Narmada Bhavan Block",
    category: "Girls Hostel",
    type: "Girls Hostel",
    totalFloors: 2,
    floors: 2,
    wardenName: "Mrs. G. Sujatha",
    warden: "Mrs. G. Sujatha",
    primaryMobile: "+91-9845122312",
    wardenPhone: "+91-9845122312",
    location: "East Campus",
    status: "Active",
  },
  {
    id: "rep-blk-17",
    code: "HST-17",
    name: "Yamuna Bhavan Block",
    category: "Co-ed",
    type: "Co-ed",
    totalFloors: 3,
    floors: 3,
    wardenName: "Mr. R. Raghav",
    warden: "Mr. R. Raghav",
    primaryMobile: "+91-9845122313",
    wardenPhone: "+91-9845122313",
    location: "North Campus",
    status: "Active",
  },
  {
    id: "rep-blk-18",
    code: "HST-18",
    name: "Ganga Bhavan Block",
    category: "Boys Hostel",
    type: "Boys Hostel",
    totalFloors: 4,
    floors: 4,
    wardenName: "Mr. D. Suresh",
    warden: "Mr. D. Suresh",
    primaryMobile: "+91-9845122314",
    wardenPhone: "+91-9845122314",
    location: "Main Campus",
    status: "Active",
  },
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

  // ── Pure In-Memory State Initialization (Zero LocalStorage) ─────────
  const [blocks, setBlocks] = useState(() => {
    const list = seedBlocks.map((b) => {
      if (b.code === "BR-A") return { ...b, occupiedBeds: 5, vacantBeds: 43, warden: "Mr. Ramesh Kumar", wardenPhone: "+91 98451 22301" };
      if (b.code === "BR-B") return { ...b, occupiedBeds: 1, vacantBeds: 29, warden: "Mr. S. Sundaram", wardenPhone: "+91 97120 44512" };
      if (b.code === "GR-A") return { ...b, occupiedBeds: 1, vacantBeds: 29, warden: "Dr. M. Anuradha", wardenPhone: "+91 98765 11200" };
      if (b.code === "JCW") return { ...b, occupiedBeds: 1, vacantBeds: 19, warden: "Mr. A. Sharma", wardenPhone: "+91 97654 32109" };
      return b;
    });
    defaultExtraBlocks.forEach((eb) => {
      if (!list.some((b) => b.name === eb.name || b.code === eb.code)) {
        list.push(eb);
      }
    });
    return list;
  });

  const [categories, setCategories] = useState(() => seedCategories);
  const [rooms, setRooms] = useState(() => [...defaultExtraRooms, ...seedRooms]);
  const [wardens, setWardens] = useState(() => seedWardens);
  const [allocations, setAllocations] = useState(() => [...defaultSeedAllocations, ...seedAllocations]);
  const [outpasses, setOutpasses] = useState(() => defaultInitialOutpasses);
  const [transfers, setTransfers] = useState(() => defaultSeedTransfers);
  const [attendanceStudents, setAttendanceStudents] = useState(() => defaultAttendanceStudents);
  const [attendanceMap, setAttendanceMap] = useState(() => ({ morning: {}, night: {} }));

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
  const [attendanceBlock, setAttendanceBlock] = useState("Ramachandra Bhavan (Block A)");
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

  // ── Reset to initial mock datasets ──────────────────────────────────
  const handleResetData = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Reset Hostel Mock Data",
      message: "Are you sure you want to restore all hostel datasets from mockData.js? Any local edits will be reset.",
      danger: true,
      confirmLabel: "Reset Data",
      onConfirm: () => {
        setBlocks(seedBlocks);
        setCategories(seedCategories);
        setRooms(seedRooms);
        setWardens(seedWardens);
        setAllocations(seedAllocations);
        setOutpasses(seedOutpasses);
        setTransfers(seedTransfers);
        setAttendanceStudents(seedAttendanceStudents);
        const map = { morning: {}, night: {} };
        seedAttendanceStudents.forEach((s) => {
          map.morning[s.id] = { status: "Present", inTime: "07:00 AM", remarks: "Regular roll call" };
          map.night[s.id] = { status: "Present", inTime: "08:00 PM", remarks: "Night inspection" };
        });
        setAttendanceMap(map);
        closeConfirm();
        showToast("Hostel data reset to default mock data successfully!");
      },
    });
  };

  // ── Computed Metrics ────────────────────────────────────────────────
  const totalRooms = useMemo(
    () => blocks.reduce((acc, b) => acc + (Number(b.totalRooms) || 0), 0),
    [blocks]
  );

  const totalBeds = useMemo(
    () => blocks.reduce((acc, b) => acc + (Number(b.totalBeds) || 0), 0),
    [blocks]
  );

  const activeAllocations = useMemo(
    () => allocations.filter((a) => a.status === "Allocated" || a.status === "Active"),
    [allocations]
  );

  const occupiedBeds = activeAllocations.length;
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const pendingOutpasses = useMemo(
    () => outpasses.filter((o) => o.status === "Pending Approval" || o.status === "Under Review").length,
    [outpasses]
  );

  // ── Block CRUD ──────────────────────────────────────────────────────
  const handleSaveBlock = (blockData) => {
    if (modal.mode === "edit") {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockData.id
            ? {
                ...b,
                ...blockData,
                floors: Number(blockData.floors) || b.floors,
                address: blockData.address || blockData.location || b.address || "",
              }
            : b
        )
      );
      showToast(`Block ${blockData.name} updated successfully!`);
    } else {
      const newBlock = {
        id: `blk-${Date.now()}`,
        name: blockData.name,
        code: blockData.code,
        type: blockData.type || "Boys",
        floors: Number(blockData.floors) || 1,
        address: blockData.address || blockData.location || "",
        totalRooms: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        vacantBeds: 0,
        warden: "Unassigned",
        wardenPhone: "-",
        status: blockData.status || "Active",
      };
      setBlocks((prev) => [newBlock, ...prev]);
      showToast(`Hostel block ${blockData.name} added successfully!`);
    }
    closeModal();
  };

  const handleDeleteBlock = (block) => {
    const hasRooms = rooms.some((r) => r.block === block.code);
    const hasAllocs = allocations.some((a) => a.blockName === block.name || a.blockCode === block.code);

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
      onConfirm: () => {
        setBlocks((prev) => prev.filter((b) => b.id !== block.id));
        closeConfirm();
        showToast(`Hostel block ${block.name} deleted.`);
      },
    });
  };

  // ── Room Sharing Config Save Handler ─────────────────────────────────
  const handleSaveRoomSharingConfig = ({ block, floorConfigs }) => {
    if (!block) return;
    let totalRoomsCount = 0;
    let totalBedsCount = 0;
    const generatedRooms = [];

    floorConfigs.forEach((fc) => {
      let roomIndexOnFloor = 1;
      const addRooms = (count, capacity, sharingType, acType) => {
        for (let i = 0; i < count; i++) {
          const roomNum = fc.floorIndex === 0 
            ? `${String(roomIndexOnFloor).padStart(3, "0")}`
            : `${fc.floorIndex}${String(roomIndexOnFloor).padStart(2, "0")}`;
          generatedRooms.push({
            id: `rm-${block.code}-${roomNum}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            roomNo: roomNum,
            block: block.code,
            blockName: block.name,
            floor: fc.floorLabel,
            type: `${sharingType} (${acType})`,
            capacity: capacity,
            occupied: 0,
            fee: acType === "AC" ? "₹7,500/mo" : "₹6,000/mo",
            beds: Array.from({ length: capacity }, (_, bi) => `BED-${bi + 1} (Vacant)`),
            status: "Active",
          });
          roomIndexOnFloor++;
          totalRoomsCount++;
          totalBedsCount += capacity;
        }
      };

      if (fc.singleSharing > 0) addRooms(fc.singleSharing, 1, "Single Sharing", fc.singleAc);
      if (fc.doubleSharing > 0) addRooms(fc.doubleSharing, 2, "Double Sharing", fc.doubleAc);
      if (fc.tripleSharing > 0) addRooms(fc.tripleSharing, 3, "Triple Sharing", fc.tripleAc);
      if (fc.fourSharing > 0) addRooms(fc.fourSharing, 4, "Four Sharing", fc.fourAc);
      if (Array.isArray(fc.customAllocations)) {
        fc.customAllocations.forEach((ca) => {
          const roomsCount = Number(ca.rooms) || 0;
          const bedsPerRoom = Number(ca.beds) || 1;
          if (roomsCount > 0) {
            addRooms(roomsCount, bedsPerRoom, ca.name || "Custom Suite", ca.ac || "AC");
          }
        });
      }
    });

    if (generatedRooms.length > 0) {
      setRooms((prev) => [
        ...prev.filter((r) => r.block !== block.code),
        ...generatedRooms,
      ]);
    }

    setBlocks((prev) =>
      prev.map((b) =>
        b.code === block.code
          ? {
              ...b,
              totalRooms: totalRoomsCount || b.totalRooms,
              totalBeds: totalBedsCount || b.totalBeds,
              vacantBeds: Math.max(0, (totalBedsCount || b.totalBeds) - (b.occupiedBeds || 0)),
              floors: floorConfigs.length || b.floors,
            }
          : b
      )
    );

    showToast(`Room sharing configuration saved for ${block.name}!`);
    closeModal();
  };

  // ── Category CRUD ───────────────────────────────────────────────────
  const handleSaveCategory = (catData) => {
    if (modal.mode === "edit") {
      setCategories((prev) => prev.map((c) => (c.id === catData.id ? { ...c, ...catData } : c)));
      showToast(`Category ${catData.name} updated.`);
    } else {
      const newCat = { ...catData, id: `cat-${Date.now()}` };
      setCategories((prev) => [newCat, ...prev]);
      showToast(`Room category ${catData.name} created.`);
    }
    closeModal();
  };

  const handleDeleteCategory = (cat) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Room Category",
      message: `Delete category "${cat.name}"?`,
      danger: true,
      confirmLabel: "Delete",
      onConfirm: () => {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        closeConfirm();
        showToast(`Category ${cat.name} removed.`);
      },
    });
  };

  // ── Room CRUD ───────────────────────────────────────────────────────
  const handleSaveRoom = (roomData) => {
    let capacity = roomData.capacity || 2;
    if (roomData.type) {
      if (roomData.type.includes("1 Bed") || roomData.type.toLowerCase().includes("single")) capacity = 1;
      else if (roomData.type.includes("2 Bed") || roomData.type.toLowerCase().includes("double")) capacity = 2;
      else if (roomData.type.includes("3 Bed") || roomData.type.toLowerCase().includes("triple")) capacity = 3;
      else if (roomData.type.includes("4 Bed") || roomData.type.toLowerCase().includes("four")) capacity = 4;
    }
    const fee = roomData.fee || (roomData.type?.toLowerCase().includes("ac") ? "₹7,500/mo" : "₹6,000/mo");
    const beds = roomData.beds && roomData.beds.length === capacity
      ? roomData.beds
      : Array.from({ length: capacity }, (_, i) => `BED-${i + 1} (Vacant)`);

    const blk = blocks.find((b) => b.code === roomData.block || b.name === roomData.block || String(b.id) === String(roomData.block));
    const block = blk ? blk.code : (roomData.block || "BR-A");
    const blockName = blk ? blk.name : (roomData.blockName || roomData.block || "Boys Residence - Block A");

    const finalRoom = {
      ...roomData,
      block,
      blockName,
      capacity,
      fee,
    };

    if (modal.mode === "edit") {
      setRooms((prev) => prev.map((r) => (r.id === roomData.id ? { ...r, ...finalRoom } : r)));
      showToast(`Room ${roomData.roomNo} updated.`);
    } else {
      const newRoom = {
        ...finalRoom,
        id: `rm-${Date.now()}`,
        occupied: 0,
        beds,
        status: roomData.status || "Active",
      };
      setRooms((prev) => [newRoom, ...prev]);
      showToast(`Room ${roomData.roomNo} added.`);
    }
    closeModal();
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
      onConfirm: () => {
        setRooms((prev) => prev.filter((r) => r.id !== room.id));
        closeConfirm();
        showToast(`Room ${room.roomNo} deleted.`);
      },
    });
  };

  // ── Warden CRUD ─────────────────────────────────────────────────────
  const handleSaveWarden = (wardenData) => {
    if (modal.mode === "edit") {
      setWardens((prev) => prev.map((w) => (w.id === wardenData.id ? { ...w, ...wardenData } : w)));
      showToast(`Warden ${wardenData.name} updated.`);
    } else {
      const newW = {
        ...wardenData,
        id: `w-${Date.now()}`,
        status: wardenData.status || "Active",
      };
      setWardens((prev) => [newW, ...prev]);
      showToast(`Warden ${wardenData.name} assigned.`);
    }

    if (wardenData.assignedHostels) {
      setBlocks((prev) =>
        prev.map((b) =>
          wardenData.assignedHostels.includes(b.name) || wardenData.assignedHostels.includes(b.code)
            ? { ...b, warden: wardenData.name, wardenPhone: wardenData.phone || b.wardenPhone }
            : b
        )
      );
    }
    closeModal();
  };

  const handleDeleteWarden = (warden) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Warden Assignment",
      message: `Remove warden ${warden.name} (${warden.empId})?`,
      danger: true,
      confirmLabel: "Remove",
      onConfirm: () => {
        setWardens((prev) => prev.filter((w) => w.id !== warden.id));
        closeConfirm();
        showToast(`Warden ${warden.name} removed.`);
      },
    });
  };

  // ── Student Allocation CRUD ─────────────────────────────────────────
  const handleSaveAllocation = (allocData) => {
    const roomStr = allocData.roomBadge || (allocData.room ? (allocData.room.startsWith("Room #") ? allocData.room : `Room #${allocData.room}`) : "Room #101");
    const bedStr = allocData.bed || "BED-1";
    const finalRoomBadge = allocData.roomBadge || `${roomStr} (${bedStr})`;

    if (modal.mode === "edit") {
      setAllocations((prev) =>
        prev.map((a) => (a.id === allocData.id ? { ...a, ...allocData, roomBadge: finalRoomBadge } : a))
      );
      showToast(`Allocation for ${allocData.studentName} updated.`);
    } else {
      const newAlloc = {
        ...allocData,
        id: `alloc-${Date.now()}`,
        status: "Active",
        room: roomStr,
        bed: bedStr,
        roomBadge: finalRoomBadge,
      };
      setAllocations((prev) => [newAlloc, ...prev]);

      // update block occupied count
      setBlocks((prev) =>
        prev.map((b) =>
          b.name === allocData.blockName
            ? {
                ...b,
                occupiedBeds: Number(b.occupiedBeds || 0) + 1,
                vacantBeds: Math.max(0, Number(b.vacantBeds || 0) - 1),
              }
            : b
        )
      );

      // update room occupied count if matching room
      setRooms((prev) =>
        prev.map((r) => {
          const matchRoom = r.blockName === allocData.blockName && (r.roomNo === allocData.room || `Room #${r.roomNo}` === roomStr);
          if (matchRoom) {
            return {
              ...r,
              occupied: Math.min(Number(r.capacity || 2), Number(r.occupied || 0) + 1),
            };
          }
          return r;
        })
      );

      showToast(`Room & Bed allocated to ${allocData.studentName} successfully!`);
    }
    closeModal();
  };

  const handleVacateAllocation = (alloc, reason) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.id === alloc.id ? { ...a, status: "Vacated", vacateReason: reason, vacateDate: new Date().toISOString().split("T")[0] } : a
      )
    );
    setBlocks((prev) =>
      prev.map((b) =>
        b.name === alloc.blockName
          ? {
              ...b,
              occupiedBeds: Math.max(0, Number(b.occupiedBeds || 0) - 1),
              vacantBeds: Number(b.vacantBeds || 0) + 1,
            }
          : b
      )
    );
    closeModal();
    showToast(`Bed vacated for ${alloc.studentName}.`);
  };

  // ── Outpass CRUD ────────────────────────────────────────────────────
  const handleSaveOutpass = (outData) => {
    const newOut = {
      ...outData,
      id: `out-${Date.now()}`,
      status: "Pending Approval",
    };
    setOutpasses((prev) => [newOut, ...prev]);
    closeModal();
    showToast(`Outpass request submitted for ${outData.studentName}.`);
  };

  const handleUpdateOutpassStatus = (outpassId, newStatus) => {
    setOutpasses((prev) =>
      prev.map((o) => (o.id === outpassId ? { ...o, status: newStatus } : o))
    );
    showToast(`Outpass marked as ${newStatus}.`);
  };

  const handleDeleteOutpass = (outpass) => {
    setOutpasses((prev) => prev.filter((o) => o.id !== outpass.id));
    showToast("Outpass record removed.");
  };

  // ── Transfer CRUD (Screenshots 1, 2, 3) ──────────────────────────────
  const handleDeleteTransfer = (tr) => {
    setTransfers((prev) => prev.filter((t) => t.id !== tr.id));
    showToast(`Transfer record for ${tr.studentName || "student"} removed.`);
  };

  const handleSaveTransfer = (transData) => {
    const isVacate = transData.actionType === "Bed Vacate";
    const destRoomClean = transData.destinationRoom ? transData.destinationRoom.replace("Room ", "").trim() : "201";
    const newTr = {
      ...transData,
      id: `tr-${Date.now()}`,
      studentName: transData.studentName || "Resident Student",
      admissionNo: transData.admissionNo || "ADM-2026-103",
      actionType: isVacate ? "Bed Vacate" : "Room Transfer",
      requestType: isVacate ? "Bed Vacate" : "Room Transfer (Change Room/Block)",
      currentBlock: transData.currentBlock || "Ramachandra Bhavan Block",
      currentRoom: transData.currentRoom || "101",
      currentRoomDisplay: transData.currentRoomDisplay || `${transData.currentBlock || "Ramachandra Bhavan Block"} (#${transData.currentRoom || "101"})`,
      targetBlock: isVacate ? "--" : (transData.destinationBlock || "Boys Residence - Block A"),
      targetRoom: isVacate ? "--" : destRoomClean,
      targetBed: isVacate ? "--" : (transData.destinationBed || "Bed #1"),
      targetDisplayTitle: isVacate
        ? "✓ Old Bed Released to Available"
        : `New Bed: ${transData.destinationBlock || "Bhanu Block"} (#${destRoomClean})`,
      targetDisplaySub: isVacate
        ? null
        : `✓ Old Bed #${transData.currentRoom || "101"} Released to Available`,
      feeAdjustment: isVacate
        ? "Fee Adjusted: ₹45,000 (Credit to Tuition Fee)"
        : null,
      date: new Date().toISOString().split("T")[0],
      requestDate: new Date().toISOString().split("T")[0],
      status: "Completed",
    };
    setTransfers((prev) => [newTr, ...prev]);

    // In-memory allocation status update
    if (isVacate) {
      setAllocations((prev) =>
        prev.map((a) =>
          a.admissionNo === transData.admissionNo || a.studentName === transData.studentName
            ? { ...a, status: "Vacated" }
            : a
        )
      );
    } else {
      setAllocations((prev) =>
        prev.map((a) =>
          a.admissionNo === transData.admissionNo || a.studentName === transData.studentName
            ? {
                ...a,
                blockName: transData.destinationBlock || a.blockName,
                room: destRoomClean,
                bed: transData.destinationBed || a.bed,
                roomBadge: `Room #${destRoomClean} (${transData.destinationBed || a.bed})`,
              }
            : a
        )
      );
    }

    closeModal();
    showToast(`${isVacate ? "Bed vacated and released" : "Room transfer approved"} for ${newTr.studentName}.`);
  };

  const handleProcessTransfer = (tr) => {
    setConfirmDialog({
      isOpen: true,
      title: "Approve and Process Migration",
      message: `Approve migration for ${tr.studentName} to ${tr.targetBlock} (${tr.targetRoom})? This will update their active bed allocation.`,
      confirmLabel: "Process Migration",
      onConfirm: () => {
        // update transfer status
        setTransfers((prev) =>
          prev.map((t) => (t.id === tr.id ? { ...t, status: "Processed" } : t))
        );

        // if target is Vacate Bed
        if (tr.requestType === "Vacate Bed") {
          setAllocations((prev) =>
            prev.map((a) =>
              a.studentName === tr.studentName ? { ...a, status: "Vacated" } : a
            )
          );
        } else {
          // update allocation room/block
          setAllocations((prev) =>
            prev.map((a) =>
              a.studentName === tr.studentName
                ? {
                    ...a,
                    blockName: tr.targetBlock,
                    room: tr.targetRoom,
                    roomBadge: tr.targetRoom,
                  }
                : a
            )
          );
        }

        closeConfirm();
        showToast(`Migration for ${tr.studentName} processed successfully!`);
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
          s.blockCode === attendanceBlock ||
          (attendanceBlock.includes("Ramachandra") && s.block?.includes("Ramachandra"));
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
          s.blockCode === attendanceBlock ||
          (attendanceBlock.includes("Ramachandra") && s.block?.includes("Ramachandra"));
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

  const handleSaveAttendanceLog = () => {
    showToast("Attendance log saved successfully!", "success");
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
    const filteredDashBlocks = blocks.filter((b) => {
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
      blocks.find((b) => b.id === dashSelectedBlockId || b.code === dashSelectedBlockId) ||
      blocks[0] ||
      {};

    // Recent 4 allocations for dashboard display
    const recentAllocationsList = [
      {
        id: "alloc-dash-1",
        studentName: "Rahul Sharma",
        admissionNo: "ADM-2024-001",
        blockName: "Boys Residence - Block A",
        room: "Room #101 (BED-1)",
        joinDate: "2026-08-01",
      },
      {
        id: "alloc-dash-2",
        studentName: "Sneha Reddy",
        admissionNo: "ADM-2024-015",
        blockName: "Girls Residence - Block A",
        room: "Room #102 (BED-1)",
        joinDate: "2026-08-03",
      },
      {
        id: "alloc-dash-3",
        studentName: "Vikram Patel",
        admissionNo: "ADM-2024-042",
        blockName: "Boys Residence - Block B",
        room: "Room #201 (BED-2)",
        joinDate: "2026-08-05",
      },
      {
        id: "alloc-dash-4",
        studentName: "Priya Nair",
        admissionNo: "ADM-2024-068",
        blockName: "Girls Residence - Block A",
        room: "Room #103 (BED-1)",
        joinDate: "2026-08-07",
      },
    ];

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
              <div className="cms-dash-kpi-val">₹40,000</div>
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
              <div className="cms-dash-kpi-val">{wardens.length || 4}</div>
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
            <div style={{ position: "relative", width: 280, maxWidth: "100%" }}>
              <Search
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
                  Warden: <strong>{selectedDashBlock.warden || "Mr. Ramesh Kumar"}</strong> ({selectedDashBlock.wardenPhone || "+91 98451 22301"})
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
              {recentAllocationsList.map((item) => (
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
                        {item.admissionNo} • {item.blockName} • {item.room}
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
                    {item.joinDate}
                  </span>
                </div>
              ))}
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
              {dashOutpassesList.map((item) => {
                const isPending = item.status === "Pending Approval";
                const isApproved = item.status === "Approved";
                return (
                  <div key={item.id} className="cms-dash-item-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                      <div style={{ color: isApproved ? "var(--cms-green)" : "var(--cms-amber)", display: "flex", alignItems: "center" }}>
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
                                : isPending
                                ? "var(--cms-amber-soft)"
                                : "var(--cms-info-soft)",
                              color: isApproved
                                ? "var(--cms-green)"
                                : isPending
                                ? "var(--cms-amber)"
                                : "var(--cms-info)",
                            }}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--cms-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.requestType} • {item.roomNo}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                        {item.outDate?.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                );
              })}
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
            <div className="cms-hostel-search">
              <Search size={15} />
              <input
                placeholder="Search by category or specification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="cms-hostel-toolbar-actions">
              <select
                className="cms-hostel-select"
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
                className="cms-hostel-select"
                value={filterHostelRooms}
                onChange={(e) => {
                  setFilterHostelRooms(e.target.value);
                  setFilterFloor("all");
                }}
                style={{ minWidth: 170, borderRadius: 10, fontWeight: 600 }}
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
                          {t.currentBlock || (t.currentRoomDisplay ? t.currentRoomDisplay.split(" (")[0] : "Ramachandra Bhavan Block")}
                        </span>
                        <span className="cms-transfer-room-num">
                          {t.currentRoom ? `(#${t.currentRoom})` : (t.currentRoomDisplay && t.currentRoomDisplay.includes(" (") ? `(${t.currentRoomDisplay.split(" (")[1]}` : "(#101)")}
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
        s.blockCode === attendanceBlock ||
        (attendanceBlock.includes("Ramachandra") && s.block?.includes("Ramachandra"));

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
      new Set([
        "Ramachandra Bhavan (Block A)",
        ...blocks.map((b) => b.name),
        ...attendanceStudents.map((s) => s.block).filter(Boolean),
      ])
    );

    // Available room options for selected block
    const attendanceRoomOptions = Array.from(
      new Set(
        attendanceStudents
          .filter((s) => !attendanceBlock || attendanceBlock === "all" || s.block === attendanceBlock || (attendanceBlock.includes("Ramachandra") && s.block?.includes("Ramachandra")))
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
                    className="cms-alloc-select-compact"
                    style={{ height: 34, fontSize: 12.5, fontWeight: 600 }}
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
      rawData = defaultReportBlocks;
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
      rawData = defaultReportBlocks;
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

    // Export Handler
    const handleDownloadReport = () => {
      if (reportCategory === "Block Report") {
        exportCsv("block-report.csv", filtered, [
          { key: "code", label: "Block Code" },
          { key: "name", label: "Block Name" },
          { key: "category", label: "Category" },
          { key: "totalFloors", label: "Total Floors" },
          { key: "wardenName", label: "Warden Name" },
          { key: "primaryMobile", label: "Primary Mobile" },
          { key: "location", label: "Location" },
          { key: "status", label: "Status" },
        ]);
      } else if (reportCategory === "Room Report") {
        exportCsv("room-report.csv", filtered, [
          { key: "roomNumber", label: "Room No" },
          { key: "blockName", label: "Block Name" },
          { key: "floor", label: "Floor" },
          { key: "category", label: "Category" },
          { key: "totalBeds", label: "Total Beds" },
          { key: "occupiedBeds", label: "Occupied Beds" },
          { key: "vacantBeds", label: "Vacant Beds" },
          { key: "status", label: "Status" },
        ]);
      } else if (reportCategory === "Bed Allocation Report" || reportCategory === "Student Allocation Report") {
        exportCsv("allocation-report.csv", filtered, [
          { key: "admissionNo", label: "Adm No" },
          { key: "studentName", label: "Student Name" },
          { key: "gender", label: "Gender" },
          { key: "blockName", label: "Hostel Block" },
          { key: "roomBadge", label: "Room & Bed" },
          { key: "joinDate", label: "Join Date" },
          { key: "monthlyFee", label: "Monthly Fee" },
          { key: "status", label: "Status" },
        ]);
      } else if (reportCategory === "Attendance Report") {
        exportCsv("attendance-report.csv", filtered, [
          { key: "id", label: "Adm No" },
          { key: "name", label: "Student Name" },
          { key: "block", label: "Block" },
          { key: "roomBed", label: "Room & Bed" },
        ]);
      } else if (reportCategory === "Outpass & Leave Report") {
        exportCsv("outpass-report.csv", filtered, [
          { key: "studentName", label: "Student Name" },
          { key: "admissionNo", label: "Adm No" },
          { key: "outpassType", label: "Outpass Type" },
          { key: "blockName", label: "Hostel & Room" },
          { key: "departureDate", label: "Departure" },
          { key: "returnDate", label: "Expected Return" },
          { key: "status", label: "Status" },
        ]);
      } else if (reportCategory === "Transfer & Vacate Report") {
        exportCsv("transfer-vacate-report.csv", filtered, [
          { key: "studentName", label: "Student Name" },
          { key: "admissionNo", label: "Adm No" },
          { key: "actionType", label: "Action Type" },
          { key: "currentRoomDisplay", label: "Current Room" },
          { key: "date", label: "Date" },
          { key: "status", label: "Status" },
        ]);
      } else if (reportCategory === "Warden Report") {
        exportCsv("warden-report.csv", filtered, [
          { key: "empId", label: "Emp ID" },
          { key: "name", label: "Warden Name" },
          { key: "designation", label: "Designation" },
          { key: "assignedHostels", label: "Supervised Facilities" },
          { key: "phone", label: "Primary Mobile" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
        ]);
      } else {
        exportCsv("hostel-report.csv", filtered, [
          { key: "code", label: "Block Code" },
          { key: "name", label: "Block Name" },
          { key: "status", label: "Status" },
        ]);
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
              onClick={() => window.print()}
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              className="cms-report-btn-pdf"
              onClick={() => window.print()}
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
                onChange={(e) => setReportBlockFilter(e.target.value)}
              >
                <option value="">-- Select Hostel Block --</option>
                <option value="all">All Hostel Blocks</option>
                <option value="Ramachandra Bhavan (Block A)">Ramachandra Bhavan (Block A)</option>
                <option value="Boys Residence - Block A">Boys Residence - Block A</option>
                <option value="Boys Residence - Block B">Boys Residence - Block B</option>
                <option value="Girls Residence - Block A">Girls Residence - Block A</option>
                <option value="Bhanu Block">Bhanu Block</option>
                <option value="Luxury hostel">Luxury hostel</option>
                <option value="Junior College Wing">Junior College Wing</option>
                <option value="Senior Wing - Block D">Senior Wing - Block D</option>
                <option value="Girls Residence - Block B">Girls Residence - Block B</option>
                <option value="International Hostel - Block E">International Hostel - Block E</option>
                <option value="HM-660 Block">HM-660 Block</option>
                <option value="Kaveri Bhavan Block">Kaveri Bhavan Block</option>
                <option value="Godavari Bhavan Block">Godavari Bhavan Block</option>
                <option value="Krishna Bhavan Block">Krishna Bhavan Block</option>
                <option value="Saraswati Bhavan Block">Saraswati Bhavan Block</option>
                <option value="Narmada Bhavan Block">Narmada Bhavan Block</option>
                <option value="Yamuna Bhavan Block">Yamuna Bhavan Block</option>
                <option value="Ganga Bhavan Block">Ganga Bhavan Block</option>
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
                className="cms-report-select"
                value={reportCategoryFilter}
                onChange={(e) => setReportCategoryFilter(e.target.value)}
              >
                <option value="">-- Filter by Category --</option>
                <option value="all">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Boys Hostel">Boys Hostel</option>
                <option value="Girls Hostel">Girls Hostel</option>
                <option value="Co-ed">Co-ed</option>
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
                  className="cms-alloc-modal-select"
                  style={{ color: form.block ? "var(--cms-text)" : "var(--cms-muted)" }}
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
                  className="cms-alloc-modal-select"
                  style={{ color: form.floor ? "var(--cms-text)" : "var(--cms-muted)" }}
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
                    className="cms-alloc-modal-select"
                    style={{ color: form.type ? "var(--cms-text)" : "var(--cms-muted)" }}
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

    // Warden candidates list auto-loaded for assignment
    const wardenCandidates = useMemo(() => {
      const predefined = [
        { empId: "STF-2026-NTS-01", name: "Dr. Eleanor Vance", designation: "Chief Hostel Warden", phone: "+91 98451 22301", email: "eleanor.vance@college.edu" },
        { empId: "STF-2026-NTS-02", name: "Rajesh Kumar", designation: "Senior Hostel Warden", phone: "+91 97120 44512", email: "rajesh.k@college.edu" },
        { empId: "STF-2026-NTS-03", name: "Savitri Devi", designation: "Girls Hostel Warden", phone: "+91 98765 11200", email: "savitri.d@college.edu" },
        { empId: "STF-2026-NTS-04", name: "Vikram Singh", designation: "Assistant Hostel Warden", phone: "+91 98831 66720", email: "vikram.s@college.edu" },
      ];
      wardens.forEach((w) => {
        if (!predefined.some((p) => p.name.toLowerCase() === w.name.toLowerCase())) {
          predefined.push({
            empId: w.empId || `WRD-${Date.now()}`,
            name: w.name,
            designation: w.designation || "Resident Warden",
            phone: w.phone || "+91 98451 00000",
            email: w.email || `${w.name.toLowerCase().replace(/\s+/g, ".")}@college.edu`,
          });
        }
      });
      return predefined;
    }, []);

    const [form, setForm] = useState(() => {
      if (modal.data) {
        return {
          ...modal.data,
          assignmentDate: modal.data.assignmentDate || new Date().toISOString().split("T")[0],
        };
      }
      const firstCandidate = wardenCandidates[0] || {};
      const firstBlock = blocks[0] || {};
      return {
        empId: firstCandidate.empId || "STF-2026-NTS-01",
        name: firstCandidate.name || "Dr. Eleanor Vance",
        designation: firstCandidate.designation || "Chief Hostel Warden",
        phone: firstCandidate.phone || "+91 98451 22301",
        email: firstCandidate.email || "eleanor.vance@college.edu",
        assignedHostels: firstBlock.name || "Ramachandra Bhavan (Block A)",
        assignmentDate: new Date().toISOString().split("T")[0],
        status: "Active",
      };
    });

    const handleCandidateChange = (selectedName) => {
      const candidate = wardenCandidates.find((c) => c.name === selectedName);
      if (candidate) {
        setForm((prev) => ({
          ...prev,
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
                  value={form.name}
                  onChange={(e) => handleCandidateChange(e.target.value)}
                  className="cms-alloc-modal-select"
                  style={{ color: form.name ? "var(--cms-text)" : "var(--cms-muted)" }}
                >
                  <option value="" disabled>Select Hostel Warden...</option>
                  {wardenCandidates.map((c) => (
                    <option key={c.empId + c.name} value={c.name}>
                      {c.name} ({c.designation})
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
                  onChange={(e) => setForm({ ...form, assignedHostels: e.target.value })}
                  className="cms-alloc-modal-select"
                  style={{ color: form.assignedHostels ? "var(--cms-text)" : "var(--cms-muted)" }}
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

    // Merge candidate students with attendance students for rich suggestions
    const allCandidates = useMemo(() => {
      const map = new Map();
      candidateStudentsList.forEach((s) => map.set(s.admissionNo, s));
      attendanceStudents.forEach((st) => {
        if (!map.has(st.id)) {
          map.set(st.id, {
            id: st.id,
            name: st.name,
            admissionNo: st.id,
            className: "Class 10",
          });
        }
      });
      return Array.from(map.values());
    }, [attendanceStudents]);

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
      const blkRooms = rooms.filter(
        (r) => r.blockName === form.blockName || r.block === form.blockName
      );
      if (blkRooms.length > 0) {
        return blkRooms.map((r) =>
          r.roomNo.startsWith("RM") || r.roomNo.startsWith("Room")
            ? `Room #${r.roomNo}`
            : `Room #${r.roomNo}`
        );
      }
      if (form.blockName === "HM-660") return ["Room #RM-674", "Room #RM-675", "Room #RM-676"];
      if (form.blockName === "Ramachandra Bhavan Block") return ["Room #101", "Room #102", "Room #103"];
      return ["Room #101", "Room #102", "Room #103", "Room #201", "Room #202"];
    }, [form.blockName, rooms]);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.studentName) {
        showToast("Please select a student", "error");
        return;
      }
      if (!form.blockName) {
        showToast("Please select a hostel block", "error");
        return;
      }
      if (!form.room) {
        showToast("Please select a room", "error");
        return;
      }
      if (!form.bed) {
        showToast("Please select a bed number", "error");
        return;
      }

      handleSaveAllocation(form);
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
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  placeholder="Type student name or reg no (e.g. 's' or 'b')..."
                  value={studentSearch}
                  onFocus={() => setIsStudentDropdownOpen(true)}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setForm({ ...form, studentName: e.target.value });
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
                <div className="cms-alloc-modal-dropdown">
                  {filteredCandidates.length === 0 ? (
                    <div className="cms-alloc-modal-dropdown-empty">
                      No matching student found. Type name to assign.
                    </div>
                  ) : (
                    filteredCandidates.map((st) => (
                      <div
                        key={st.id}
                        onMouseDown={() => {
                          setForm({
                            ...form,
                            studentName: st.name,
                            admissionNo: st.admissionNo,
                          });
                          setStudentSearch(st.name);
                          setIsStudentDropdownOpen(false);
                        }}
                        className="cms-alloc-modal-dropdown-item"
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
                      room: "",
                    });
                  }}
                  className="cms-alloc-modal-select"
                  style={{ color: form.blockName ? "var(--cms-text)" : "var(--cms-muted)" }}
                >
                  <option value="">Select Hostel Block</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.name}>
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
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="cms-alloc-modal-select"
                    style={{ color: form.room ? "var(--cms-text)" : "var(--cms-muted)" }}
                  >
                    {!form.blockName ? (
                      <option value="">Select Hostel Block first...</option>
                    ) : (
                      <>
                        <option value="">Select Room...</option>
                        {availableRooms.map((rm) => (
                          <option key={rm} value={rm}>
                            {rm}
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
                    onChange={(e) => setForm({ ...form, bed: e.target.value })}
                    className="cms-alloc-modal-select"
                    style={{ color: form.bed ? "var(--cms-text)" : "var(--cms-muted)" }}
                  >
                    <option value="">Select Bed Number...</option>
                    <option value="BED-1">BED-1</option>
                    <option value="BED-2">BED-2</option>
                    <option value="BED-3">BED-3</option>
                    <option value="BED-4">BED-4</option>
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
      modal.data?.admissionNo || ""
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

    // Resident candidates for student dropdown
    const studentCandidates = useMemo(() => {
      const map = new Map();
      allocations.forEach((a) => {
        map.set(a.admissionNo, {
          id: a.admissionNo,
          admissionNo: a.admissionNo,
          name: a.studentName,
          blockName: a.blockName,
          room: a.room,
        });
      });
      attendanceStudents.forEach((st) => {
        if (!map.has(st.id)) {
          map.set(st.id, {
            id: st.id,
            admissionNo: st.id,
            name: st.name,
            blockName: blocks[0]?.name || "Ramachandra Bhavan Block",
            room: "101",
          });
        }
      });
      return Array.from(map.values());
    }, [allocations, attendanceStudents]);

    const handleSubmit = (e) => {
      e.preventDefault();
      const studentObj = studentCandidates.find((s) => s.admissionNo === selectedStudentId) || {
        name: modal.data?.studentName || "Resident Student",
        admissionNo: selectedStudentId || "ADM-2026-101",
        blockName: "Ramachandra Bhavan Block",
        room: "101",
      };

      handleSaveOutpass({
        studentName: studentObj.name,
        admissionNo: studentObj.admissionNo,
        blockName: studentObj.blockName,
        roomNo: studentObj.room,
        roomNumber: studentObj.room,
        outpassType: outpassCategory,
        requestType: outpassCategory,
        departureDate: departureDateTime || new Date().toISOString().split("T")[0],
        outDate: departureDateTime || new Date().toISOString().split("T")[0],
        returnDate: returnDateTime || new Date().toISOString().split("T")[0],
        reason: reason,
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
                  className="cms-alloc-modal-select"
                >
                  <option value="">Select Student...</option>
                  {studentCandidates.map((st) => (
                    <option key={st.admissionNo} value={st.admissionNo}>
                      {st.name} ({st.admissionNo})
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

  // Transfer Modal (Screenshot 3 - Theme-based & Exact Fields)
  const TransferModal = () => {
    const isView = modal.mode === "view";
    const [selectedStudentId, setSelectedStudentId] = useState(
      modal.data?.admissionNo || ""
    );
    const [actionType, setActionType] = useState(
      modal.data?.actionType || modal.data?.requestType || "Room Transfer (Change Room/Block)"
    );
    const [destinationBlock, setDestinationBlock] = useState(
      modal.data?.targetBlock || "Boys Residence - Block A"
    );
    const [destinationRoom, setDestinationRoom] = useState(
      modal.data?.targetRoom ? (modal.data.targetRoom.startsWith("Room") ? modal.data.targetRoom : `Room ${modal.data.targetRoom}`) : "Room 201"
    );
    const [destinationBed, setDestinationBed] = useState(
      modal.data?.targetBed || "Bed #1"
    );
    const [reason, setReason] = useState(
      modal.data?.reason || ""
    );

    const isVacate = actionType === "Bed Vacate";

    const residentStudents = useMemo(() => {
      const map = new Map();
      allocations.forEach((a) => {
        if (a.status !== "Vacated") {
          map.set(a.admissionNo, {
            name: a.studentName,
            admissionNo: a.admissionNo,
            blockName: a.blockName,
            room: a.room,
            bed: a.bed,
          });
        }
      });
      return Array.from(map.values());
    }, [allocations]);

    const handleSubmit = (e) => {
      e.preventDefault();
      const currentStudent = residentStudents.find((s) => s.admissionNo === selectedStudentId) || {
        name: modal.data?.studentName || "Rajesh Kumar",
        admissionNo: selectedStudentId || "ADM-2026-101",
        blockName: "Ramachandra Bhavan Block",
        room: "101",
      };

      handleSaveTransfer({
        studentName: currentStudent.name,
        admissionNo: currentStudent.admissionNo,
        actionType: isVacate ? "Bed Vacate" : "Room Transfer",
        currentBlock: currentStudent.blockName,
        currentRoom: currentStudent.room,
        currentRoomDisplay: `${currentStudent.blockName} (#${currentStudent.room})`,
        destinationBlock,
        destinationRoom,
        destinationBed,
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
                  className="cms-alloc-modal-select"
                >
                  <option value="">Select Resident Student...</option>
                  {residentStudents.map((st) => (
                    <option key={st.admissionNo} value={st.admissionNo}>
                      {st.name} ({st.admissionNo} - {st.blockName} #{st.room})
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
                    onChange={(e) => setDestinationBlock(e.target.value)}
                    className="cms-alloc-modal-select"
                  >
                    <option value="Boys Residence - Block A">Boys Residence - Block A</option>
                    <option value="Boys Residence - Block B">Boys Residence - Block B</option>
                    <option value="Bhanu Block">Bhanu Block</option>
                    <option value="Girls Residence - Block A">Girls Residence - Block A</option>
                    <option value="Luxury hostel">Luxury hostel</option>
                    <option value="Ramachandra Bhavan Block">Ramachandra Bhavan Block</option>
                    {blocks.filter(b => !["Boys Residence - Block A", "Boys Residence - Block B", "Bhanu Block", "Girls Residence - Block A", "Luxury hostel", "Ramachandra Bhavan Block"].includes(b.name)).map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
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
                      onChange={(e) => setDestinationRoom(e.target.value)}
                      className="cms-alloc-modal-select"
                    >
                      <option value="Room 201">Room 201</option>
                      <option value="Room 202">Room 202</option>
                      <option value="Room 101">Room 101</option>
                      <option value="Room 102">Room 102</option>
                      <option value="Room 103">Room 103</option>
                      <option value="Room 301">Room 301</option>
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
                      <option value="Bed #1">Bed #1</option>
                      <option value="Bed #2">Bed #2</option>
                      <option value="Bed #3">Bed #3</option>
                      <option value="Bed #4">Bed #4</option>
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
