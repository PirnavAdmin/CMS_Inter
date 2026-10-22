/**
 * PIRNAV COLLEGE MANAGEMENT SYSTEM — Comprehensive Offline / Mock API Adapter
 *
 * When the remote backend (e.g. ngrok tunnel) is offline or when the user is logged in
 * with a mock session, this adapter intercepts requests and serves full, accurate,
 * reactive data with HTTP 200 responses.
 *
 * It prevents browser 404 network errors, suppresses ngrok downtime crashes,
 * and allows full CRUD interactions across all ERP modules.
 */

import { DEFAULT_CAMPUSES } from "../data/defaultCampuses.js";
import {
  boards as rawBoards,
  academicYears as rawAcademicYears,
  courses as rawCourses,
  subjects as rawSubjects,
  sections as rawSections,
  faculty as rawFaculty,
  students as rawStudents,
  certificates as rawCertificates,
  examinations as rawExaminations,
  examSchedule as rawExamSchedule,
  fees as rawFees,
  transportRoutes,
  transportVehicles,
  transportDrivers,
  transportPickupPoints,
  transportStudentAssignments,
  transportVehicleAssignments,
} from "../data/mockData.js";

// Storage helpers for session persistence
const STORAGE_PREFIX = "cms_mock_store_";

function getStored(key, defaultVal) {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_PREFIX + key) : null;
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    }
  } catch {
    /* storage unavailable */
  }
}

// ──────────────────────────────────────────────────────────────────────────
// INITIAL DATASETS
// ──────────────────────────────────────────────────────────────────────────

const initialHostelBlocks = [
  {
    id: 1,
    hostelId: 1,
    name: "Boys Hostel 1",
    blockName: "Boys Hostel 1",
    code: "BH-1",
    blockCode: "BH-1",
    totalFloors: 4,
    floors: 4,
    totalRooms: 12,
    totalBeds: 31,
    occupiedBeds: 2,
    availableBeds: 29,
    vacantBeds: 29,
    wardenName: "Dr. K. Sharma",
    warden: "Dr. K. Sharma",
    primaryMobileNumber: "9848011111",
    wardenPhone: "9848011111",
    email: "warden.bh1@pirnav.edu",
    address: "Campus North Wing, Pirnav Campus",
    type: "Boys",
    hostelType: "Boys",
    status: "Active",
    isActive: true,
  },
  {
    id: 2,
    hostelId: 2,
    name: "Boys Hostel 2",
    blockName: "Boys Hostel 2",
    code: "BH-2",
    blockCode: "BH-2",
    totalFloors: 4,
    floors: 4,
    totalRooms: 12,
    totalBeds: 31,
    occupiedBeds: 1,
    availableBeds: 30,
    vacantBeds: 30,
    wardenName: "Mr. S. Rao",
    warden: "Mr. S. Rao",
    primaryMobileNumber: "9848022222",
    wardenPhone: "9848022222",
    email: "warden.bh2@pirnav.edu",
    address: "Campus East Wing, Pirnav Campus",
    type: "Boys",
    hostelType: "Boys",
    status: "Active",
    isActive: true,
  },
  {
    id: 3,
    hostelId: 3,
    name: "Girls Hostel 1",
    blockName: "Girls Hostel 1",
    code: "GH-1",
    blockCode: "GH-1",
    totalFloors: 4,
    floors: 4,
    totalRooms: 12,
    totalBeds: 31,
    occupiedBeds: 2,
    availableBeds: 29,
    vacantBeds: 29,
    wardenName: "Mrs. P. Lakshmi",
    warden: "Mrs. P. Lakshmi",
    primaryMobileNumber: "9848033333",
    wardenPhone: "9848033333",
    email: "warden.gh1@pirnav.edu",
    address: "Campus South Wing, Pirnav Campus",
    type: "Girls",
    hostelType: "Girls",
    status: "Active",
    isActive: true,
  },
  {
    id: 4,
    hostelId: 4,
    name: "Girls Hostel 2",
    blockName: "Girls Hostel 2",
    code: "GH-2",
    blockCode: "GH-2",
    totalFloors: 4,
    floors: 4,
    totalRooms: 12,
    totalBeds: 31,
    occupiedBeds: 1,
    availableBeds: 30,
    vacantBeds: 30,
    wardenName: "Ms. S. Devi",
    warden: "Ms. S. Devi",
    primaryMobileNumber: "9848044444",
    wardenPhone: "9848044444",
    email: "warden.gh2@pirnav.edu",
    address: "Campus West Wing, Pirnav Campus",
    type: "Girls",
    hostelType: "Girls",
    status: "Active",
    isActive: true,
  },
];

const initialRoomTypes = [
  {
    id: 1,
    roomTypeId: 1,
    name: "Single Occupancy AC",
    roomTypeSpecification: "Single Occupancy AC",
    specification: "Single Occupancy AC",
    acType: "AC",
    bedCapacity: 1,
    capacity: 1,
    standardMonthlyFee: 12000,
    monthlyFee: 12000,
    fee: 12000,
    totalRooms: 20,
    totalBeds: 20,
    blocks: "BH-1, GH-1",
    description: "Premium single room with attached bathroom and AC",
    status: "Active",
    isActive: true,
  },
  {
    id: 2,
    roomTypeId: 2,
    name: "Double Sharing AC",
    roomTypeSpecification: "Double Sharing AC",
    specification: "Double Sharing AC",
    acType: "AC",
    bedCapacity: 2,
    capacity: 2,
    standardMonthlyFee: 8500,
    monthlyFee: 8500,
    fee: 8500,
    totalRooms: 40,
    totalBeds: 80,
    blocks: "BH-1, BH-2, GH-1, GH-2",
    description: "Twin sharing room with individual wardrobes and AC",
    status: "Active",
    isActive: true,
  },
  {
    id: 3,
    roomTypeId: 3,
    name: "Double Sharing Non-AC",
    roomTypeSpecification: "Double Sharing Non-AC",
    specification: "Double Sharing Non-AC",
    acType: "Non-AC",
    bedCapacity: 2,
    capacity: 2,
    standardMonthlyFee: 6000,
    monthlyFee: 6000,
    fee: 6000,
    totalRooms: 50,
    totalBeds: 100,
    blocks: "BH-1, BH-2, GH-1, GH-2",
    description: "Standard twin room with ventilation and study tables",
    status: "Active",
    isActive: true,
  },
  {
    id: 4,
    roomTypeId: 4,
    name: "Triple Sharing Non-AC",
    roomTypeSpecification: "Triple Sharing Non-AC",
    specification: "Triple Sharing Non-AC",
    acType: "Non-AC",
    bedCapacity: 3,
    capacity: 3,
    standardMonthlyFee: 4500,
    monthlyFee: 4500,
    fee: 4500,
    totalRooms: 60,
    totalBeds: 180,
    blocks: "BH-2, GH-2",
    description: "Three bed sharing room with dedicated lockers",
    status: "Active",
    isActive: true,
  },
  {
    id: 5,
    roomTypeId: 5,
    name: "4-Bed Dormitory Non-AC",
    roomTypeSpecification: "4-Bed Dormitory Non-AC",
    specification: "4-Bed Dormitory Non-AC",
    acType: "Non-AC",
    bedCapacity: 4,
    capacity: 4,
    standardMonthlyFee: 3500,
    monthlyFee: 3500,
    fee: 3500,
    totalRooms: 30,
    totalBeds: 120,
    blocks: "BH-2, GH-2",
    description: "Spacious four-bed room suitable for junior intermediate",
    status: "Active",
    isActive: true,
  },
];

// Helper to generate realistic rooms across blocks
function generateInitialRooms() {
  const rooms = [];
  let roomId = 1;
  const blocks = [
    { id: 1, name: "Boys Hostel 1", code: "BH-1" },
    { id: 2, name: "Boys Hostel 2", code: "BH-2" },
    { id: 3, name: "Girls Hostel 1", code: "GH-1" },
    { id: 4, name: "Girls Hostel 2", code: "GH-2" },
  ];
  const floors = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor"];

  blocks.forEach((blk) => {
    floors.forEach((fl, flIdx) => {
      for (let r = 1; r <= 3; r++) {
        const roomNo = `${flIdx + 1}0${r}`;
        const typeId = ((flIdx + r) % 5) + 1;
        const typeSpec = initialRoomTypes.find((t) => t.id === typeId) || initialRoomTypes[0];

        rooms.push({
          id: roomId,
          roomId,
          hostelId: blk.id,
          hostelName: blk.name,
          hostelCode: blk.code,
          roomNo,
          roomNumber: roomNo,
          floorLevel: fl,
          floor: fl,
          roomTypeId: typeSpec.id,
          roomTypeSpecification: typeSpec.name,
          type: typeSpec.name,
          capacity: typeSpec.bedCapacity,
          bedCapacity: typeSpec.bedCapacity,
          occupied: 0,
          standardMonthlyFee: typeSpec.standardMonthlyFee,
          fee: `₹${typeSpec.standardMonthlyFee.toLocaleString()}/mo`,
          acType: typeSpec.acType,
          status: "Active",
          isActive: true,
        });
        roomId++;
      }
    });
  });
  return rooms;
}

// Helper to generate beds for rooms
function generateInitialBeds(rooms) {
  const beds = [];
  let bedId = 1;
  const letters = ["A", "B", "C", "D"];
  rooms.forEach((rm) => {
    for (let b = 0; b < rm.capacity; b++) {
      beds.push({
        id: bedId,
        bedId,
        roomId: rm.id,
        roomNumber: rm.roomNumber,
        hostelId: rm.hostelId,
        hostelName: rm.hostelName,
        bedNumber: `${rm.roomNumber}-${letters[b] || b + 1}`,
        bedStatus: "Available",
        status: "Active",
        isActive: true,
      });
      bedId++;
    }
  });
  return beds;
}

const initialWardens = [
  {
    id: 1,
    wardenAssignmentId: 1,
    hostelId: 1,
    staffId: 101,
    wardenName: "Dr. K. Sharma",
    name: "Dr. K. Sharma",
    employeeId: "EMP-H101",
    empId: "EMP-H101",
    mobileNumber: "9848011111",
    phone: "9848011111",
    email: "warden.bh1@pirnav.edu",
    designation: "Chief Warden",
    assignedHostels: "Boys Hostel 1",
    hostelName: "Boys Hostel 1",
    blockName: "Boys Hostel 1",
    hostelType: "Boys",
    gender: "Male",
    assignmentDate: "2024-06-01",
    status: "Active",
    isActive: true,
  },
  {
    id: 2,
    wardenAssignmentId: 2,
    hostelId: 2,
    staffId: 102,
    wardenName: "Mr. S. Rao",
    name: "Mr. S. Rao",
    employeeId: "EMP-H102",
    empId: "EMP-H102",
    mobileNumber: "9848022222",
    phone: "9848022222",
    email: "warden.bh2@pirnav.edu",
    designation: "Resident Warden",
    assignedHostels: "Boys Hostel 2",
    hostelName: "Boys Hostel 2",
    blockName: "Boys Hostel 2",
    hostelType: "Boys",
    gender: "Male",
    assignmentDate: "2024-06-01",
    status: "Active",
    isActive: true,
  },
  {
    id: 3,
    wardenAssignmentId: 3,
    hostelId: 3,
    staffId: 103,
    wardenName: "Mrs. P. Lakshmi",
    name: "Mrs. P. Lakshmi",
    employeeId: "EMP-H103",
    empId: "EMP-H103",
    mobileNumber: "9848033333",
    phone: "9848033333",
    email: "warden.gh1@pirnav.edu",
    designation: "Chief Warden",
    assignedHostels: "Girls Hostel 1",
    hostelName: "Girls Hostel 1",
    blockName: "Girls Hostel 1",
    hostelType: "Girls",
    gender: "Female",
    assignmentDate: "2024-06-01",
    status: "Active",
    isActive: true,
  },
  {
    id: 4,
    wardenAssignmentId: 4,
    hostelId: 4,
    staffId: 104,
    wardenName: "Ms. S. Devi",
    name: "Ms. S. Devi",
    employeeId: "EMP-H104",
    empId: "EMP-H104",
    mobileNumber: "9848044444",
    phone: "9848044444",
    email: "warden.gh2@pirnav.edu",
    designation: "Assistant Warden",
    assignedHostels: "Girls Hostel 2",
    hostelName: "Girls Hostel 2",
    blockName: "Girls Hostel 2",
    hostelType: "Girls",
    gender: "Female",
    assignmentDate: "2024-06-01",
    status: "Active",
    isActive: true,
  },
];

const initialAllocations = [
  {
    id: 1,
    allocationId: 1,
    studentId: 1,
    studentName: "Aarav Reddy",
    name: "Aarav Reddy",
    admissionNo: "ADM-2024-001",
    gender: "Male",
    hostelId: 1,
    hostelName: "Boys Hostel 1",
    blockName: "Boys Hostel 1",
    hostelCode: "BH-1",
    blockCode: "BH-1",
    roomId: 1,
    room: "Room #101",
    roomNumber: "101",
    bedId: 1,
    bed: "101-A",
    bedNumber: "101-A",
    roomBadge: "Room #101 (101-A)",
    floor: "Ground Floor",
    floorLevel: "Ground Floor",
    joiningDate: "2024-06-15",
    joinDate: "2024-06-15",
    monthlyFee: 12000,
    contact: "9000012345",
    status: "Active",
    hostelType: "Boys",
  },
  {
    id: 2,
    allocationId: 2,
    studentId: 2,
    studentName: "Diya Sharma",
    name: "Diya Sharma",
    admissionNo: "ADM-2024-002",
    gender: "Female",
    hostelId: 3,
    hostelName: "Girls Hostel 1",
    blockName: "Girls Hostel 1",
    hostelCode: "GH-1",
    blockCode: "GH-1",
    roomId: 25,
    room: "Room #101",
    roomNumber: "101",
    bedId: 49,
    bed: "101-A",
    bedNumber: "101-A",
    roomBadge: "Room #101 (101-A)",
    floor: "Ground Floor",
    floorLevel: "Ground Floor",
    joiningDate: "2024-06-15",
    joinDate: "2024-06-15",
    monthlyFee: 8500,
    contact: "9000023456",
    status: "Active",
    hostelType: "Girls",
  },
  {
    id: 3,
    allocationId: 3,
    studentId: 3,
    studentName: "Vihaan Patel",
    name: "Vihaan Patel",
    admissionNo: "ADM-2024-003",
    gender: "Male",
    hostelId: 1,
    hostelName: "Boys Hostel 1",
    blockName: "Boys Hostel 1",
    hostelCode: "BH-1",
    blockCode: "BH-1",
    roomId: 2,
    room: "Room #102",
    roomNumber: "102",
    bedId: 3,
    bed: "102-A",
    bedNumber: "102-A",
    roomBadge: "Room #102 (102-A)",
    floor: "Ground Floor",
    floorLevel: "Ground Floor",
    joiningDate: "2024-06-16",
    joinDate: "2024-06-16",
    monthlyFee: 6000,
    contact: "9000034567",
    status: "Active",
    hostelType: "Boys",
  },
  {
    id: 4,
    allocationId: 4,
    studentId: 5,
    studentName: "Ishaan Verma",
    name: "Ishaan Verma",
    admissionNo: "ADM-2024-004",
    gender: "Male",
    hostelId: 2,
    hostelName: "Boys Hostel 2",
    blockName: "Boys Hostel 2",
    hostelCode: "BH-2",
    blockCode: "BH-2",
    roomId: 13,
    room: "Room #101",
    roomNumber: "101",
    bedId: 25,
    bed: "101-A",
    bedNumber: "101-A",
    roomBadge: "Room #101 (101-A)",
    floor: "Ground Floor",
    floorLevel: "Ground Floor",
    joiningDate: "2024-06-18",
    joinDate: "2024-06-18",
    monthlyFee: 4500,
    contact: "9000056789",
    status: "Active",
    hostelType: "Boys",
  },
  {
    id: 5,
    allocationId: 5,
    studentId: 6,
    studentName: "Saanvi Nair",
    name: "Saanvi Nair",
    admissionNo: "ADM-2024-005",
    gender: "Female",
    hostelId: 3,
    hostelName: "Girls Hostel 1",
    blockName: "Girls Hostel 1",
    hostelCode: "GH-1",
    blockCode: "GH-1",
    roomId: 26,
    room: "Room #102",
    roomNumber: "102",
    bedId: 51,
    bed: "102-A",
    bedNumber: "102-A",
    roomBadge: "Room #102 (102-A)",
    floor: "Ground Floor",
    floorLevel: "Ground Floor",
    joiningDate: "2024-06-20",
    joinDate: "2024-06-20",
    monthlyFee: 6000,
    contact: "9000067890",
    status: "Active",
    hostelType: "Girls",
  },
  {
    id: 6,
    allocationId: 6,
    studentId: 8,
    studentName: "Meera Joshi",
    name: "Meera Joshi",
    admissionNo: "ADM-2024-006",
    gender: "Female",
    hostelId: 4,
    hostelName: "Girls Hostel 2",
    blockName: "Girls Hostel 2",
    hostelCode: "GH-2",
    blockCode: "GH-2",
    roomId: 37,
    room: "Room #101",
    roomNumber: "101",
    bedId: 73,
    bed: "101-A",
    bedNumber: "101-A",
    roomBadge: "Room #101 (101-A)",
    floor: "Ground Floor",
    floorLevel: "Ground Floor",
    joiningDate: "2024-06-22",
    joinDate: "2024-06-22",
    monthlyFee: 3500,
    contact: "9000089012",
    status: "Active",
    hostelType: "Girls",
  },
];

const initialOutpasses = [
  {
    id: 1,
    requestId: 1,
    studentId: 1,
    studentName: "Aarav Reddy",
    admissionNo: "ADM-2024-001",
    hostelId: 1,
    hostelName: "Boys Hostel 1",
    blockName: "Boys Hostel 1",
    roomNumber: "101",
    roomNo: "101",
    requestType: "Home Visit",
    outpassType: "Home Visit",
    fromDateTime: "2026-10-15T09:00:00",
    departureDate: "2026-10-15",
    toDateTime: "2026-10-18T18:00:00",
    returnDate: "2026-10-18",
    reason: "Attending cousin wedding in hometown",
    destination: "Hyderabad",
    approvalStatus: "Approved",
    status: "Approved",
    approvalRemarks: "Parent confirmation received over phone",
  },
  {
    id: 2,
    requestId: 2,
    studentId: 2,
    studentName: "Diya Sharma",
    admissionNo: "ADM-2024-002",
    hostelId: 3,
    hostelName: "Girls Hostel 1",
    blockName: "Girls Hostel 1",
    roomNumber: "101",
    roomNo: "101",
    requestType: "Emergency",
    outpassType: "Emergency",
    fromDateTime: "2026-10-14T10:00:00",
    departureDate: "2026-10-14",
    toDateTime: "2026-10-16T17:00:00",
    returnDate: "2026-10-16",
    reason: "Dentist appointment and rest",
    destination: "Vijayawada",
    approvalStatus: "Pending",
    status: "Pending",
    approvalRemarks: "",
  },
  {
    id: 3,
    requestId: 3,
    studentId: 3,
    studentName: "Vihaan Patel",
    admissionNo: "ADM-2024-003",
    hostelId: 1,
    hostelName: "Boys Hostel 1",
    blockName: "Boys Hostel 1",
    roomNumber: "102",
    roomNo: "102",
    requestType: "Weekend Outpass",
    outpassType: "Weekend Outpass",
    fromDateTime: "2026-10-17T12:00:00",
    departureDate: "2026-10-17",
    toDateTime: "2026-10-18T20:00:00",
    returnDate: "2026-10-18",
    reason: "Local guardian visit",
    destination: "Guntur",
    approvalStatus: "Approved",
    status: "Approved",
    approvalRemarks: "Approved by Chief Warden",
  },
];

const initialTransfers = [
  {
    id: 1,
    requestId: 1,
    allocationId: 1,
    studentId: 1,
    studentName: "Aarav Reddy",
    admissionNo: "ADM-2024-001",
    requestType: "Transfer",
    actionType: "Room Transfer",
    fromHostelId: 1,
    fromHostelName: "Boys Hostel 1",
    fromRoomId: 1,
    fromRoomNumber: "101",
    fromBedId: 1,
    toHostelId: 1,
    toHostelName: "Boys Hostel 1",
    toRoomId: 2,
    toRoomNumber: "102",
    toBedId: 4,
    toBedNumber: "102-B",
    requestDate: "2026-10-10",
    date: "2026-10-10",
    status: "Approved",
    approvalStatus: "Approved",
    reason: "Prefers room closer to study area",
  },
  {
    id: 2,
    requestId: 2,
    allocationId: 5,
    studentId: 6,
    studentName: "Saanvi Nair",
    admissionNo: "ADM-2024-005",
    requestType: "Vacate",
    actionType: "Bed Vacate",
    fromHostelId: 3,
    fromHostelName: "Girls Hostel 1",
    fromRoomId: 26,
    fromRoomNumber: "102",
    fromBedId: 51,
    toHostelId: null,
    toHostelName: null,
    toRoomId: null,
    toRoomNumber: null,
    toBedId: null,
    requestDate: "2026-10-12",
    date: "2026-10-12",
    status: "Pending",
    approvalStatus: "Pending",
    reason: "Shifting to local day scholar accommodation",
    refundAmount: 2000,
  },
];

const initialHostelAttendance = initialAllocations.map((a, i) => ({
  id: i + 1,
  attendanceId: i + 1,
  studentId: a.studentId,
  studentName: a.studentName,
  admissionNo: a.admissionNo,
  hostelId: a.hostelId,
  hostelName: a.hostelName,
  roomId: a.roomId,
  roomNumber: a.roomNumber,
  bedId: a.bedId,
  bedNumber: a.bedNumber,
  date: new Date().toISOString().split("T")[0],
  attendanceDate: new Date().toISOString().split("T")[0],
  session: "Night",
  status: i === 2 ? "Absent" : "Present",
  inTime: i === 2 ? "--" : "20:00",
  remarks: i === 2 ? "Outpass sanctioned" : "Marked by warden",
  markedByStaffName: "Dr. K. Sharma",
}));

// Compile full staff list combining faculty and hostel staff
const initialAllStaff = [
  ...rawFaculty.map((f) => ({
    id: f.id,
    staffId: f.id,
    name: f.name,
    fullName: f.name,
    employeeId: f.empId,
    empId: f.empId,
    email: f.email,
    mobile: f.mobile,
    mobileNumber: f.mobile,
    phone: f.mobile,
    department: f.department,
    designation: f.designation,
    staffType: "Teaching",
    qualification: f.qualification,
    status: f.status,
    isActive: f.status === "Active",
  })),
  {
    id: 101,
    staffId: 101,
    name: "Dr. K. Sharma",
    fullName: "Dr. K. Sharma",
    employeeId: "EMP-H101",
    empId: "EMP-H101",
    email: "warden.bh1@pirnav.edu",
    mobile: "9848011111",
    mobileNumber: "9848011111",
    department: "hostel",
    designation: "Chief Warden",
    staffType: "Non-Teaching",
    status: "Active",
    isActive: true,
  },
  {
    id: 102,
    staffId: 102,
    name: "Mr. S. Rao",
    fullName: "Mr. S. Rao",
    employeeId: "EMP-H102",
    empId: "EMP-H102",
    email: "warden.bh2@pirnav.edu",
    mobile: "9848022222",
    mobileNumber: "9848022222",
    department: "hostel",
    designation: "Resident Warden",
    staffType: "Non-Teaching",
    status: "Active",
    isActive: true,
  },
  {
    id: 103,
    staffId: 103,
    name: "Mrs. P. Lakshmi",
    fullName: "Mrs. P. Lakshmi",
    employeeId: "EMP-H103",
    empId: "EMP-H103",
    email: "warden.gh1@pirnav.edu",
    mobile: "9848033333",
    mobileNumber: "9848033333",
    department: "hostel",
    designation: "Chief Warden",
    staffType: "Non-Teaching",
    status: "Active",
    isActive: true,
  },
  {
    id: 104,
    staffId: 104,
    name: "Ms. S. Devi",
    fullName: "Ms. S. Devi",
    employeeId: "EMP-H104",
    empId: "EMP-H104",
    email: "warden.gh2@pirnav.edu",
    mobile: "9848044444",
    mobileNumber: "9848044444",
    department: "hostel",
    designation: "Assistant Warden",
    staffType: "Non-Teaching",
    status: "Active",
    isActive: true,
  },
  {
    id: 105,
    staffId: 105,
    name: "Mr. Ramesh Naidu",
    fullName: "Mr. Ramesh Naidu",
    employeeId: "EMP-H105",
    empId: "EMP-H105",
    email: "ramesh.hostel@pirnav.edu",
    mobile: "9848055555",
    mobileNumber: "9848055555",
    department: "hostel",
    designation: "Hostel Supervisor",
    staffType: "Non-Teaching",
    status: "Active",
    isActive: true,
  },
  {
    id: 106,
    staffId: 106,
    name: "Mrs. V. Sunitha",
    fullName: "Mrs. V. Sunitha",
    employeeId: "EMP-H106",
    empId: "EMP-H106",
    email: "sunitha.hostel@pirnav.edu",
    mobile: "9848066666",
    mobileNumber: "9848066666",
    department: "hostel",
    designation: "Hostel Clerk",
    staffType: "Non-Teaching",
    status: "Active",
    isActive: true,
  },
];

// Active students normalized with studentId
const initialAllStudents = rawStudents.map((s) => ({
  id: s.id,
  studentId: s.id,
  name: s.name,
  studentName: s.name,
  admissionNo: s.admissionNo,
  roll: s.roll,
  rollNumber: s.roll,
  gender: s.gender,
  group: s.group,
  groupName: s.group,
  level: s.level,
  academicLevel: s.level,
  section: s.section,
  sectionName: s.section,
  mobile: s.mobile,
  mobileNumber: s.mobile,
  father: s.father,
  fatherName: s.father,
  attendancePercentage: s.attendance,
  feeStatus: s.fee,
  status: s.status,
  isActive: s.status === "Active",
}));

const initialCertificates = [
  {
    id: 1,
    certificateId: 1,
    certificateNumber: "CERT-2026-001",
    certificateNo: "CERT-2026-001",
    admissionNo: "MADM-0068",
    admissionNumber: "MADM-0068",
    studentName: "kiran j",
    student: "kiran j",
    studentId: 101,
    rollNo: "874",
    fatherName: "J. Venkat Rao",
    motherName: "J. Lakshmi",
    group: "MPC",
    groupName: "MPC",
    level: "Intermediate 1st Year",
    academicLevel: "Intermediate 1st Year",
    academicYear: "2025-2026",
    certificateType: "Bonafide Certificate",
    type: "Bonafide Certificate",
    purpose: "Passport Application & Identity Verification",
    requestDate: "2026-10-12",
    issueDate: "2026-10-14",
    issue: "2026-10-14",
    status: "Issued",
    remarks: "Verified and issued by Examination Cell",
  },
  {
    id: 2,
    certificateId: 2,
    certificateNumber: "CERT-2026-002",
    certificateNo: "CERT-2026-002",
    admissionNo: "MADM-0045",
    admissionNumber: "MADM-0045",
    studentName: "Rahul Sharma",
    student: "Rahul Sharma",
    studentId: 102,
    rollNo: "852",
    fatherName: "R. Suresh Sharma",
    motherName: "R. Shobha",
    group: "MPC",
    groupName: "MPC",
    level: "Intermediate 2nd Year",
    academicLevel: "Intermediate 2nd Year",
    academicYear: "2025-2026",
    certificateType: "Study Certificate",
    type: "Study Certificate",
    purpose: "State Scholarship Submission",
    requestDate: "2026-10-14",
    issueDate: "",
    issue: "",
    status: "Approved",
    remarks: "Approved by Principal",
  },
  {
    id: 3,
    certificateId: 3,
    certificateNumber: "CERT-2026-003",
    certificateNo: "CERT-2026-003",
    admissionNo: "MADM-0089",
    admissionNumber: "MADM-0089",
    studentName: "Priya Varma",
    student: "Priya Varma",
    studentId: 103,
    rollNo: "860",
    fatherName: "P. Rajesh Varma",
    motherName: "P. Sunitha",
    group: "BiPC",
    groupName: "BiPC",
    level: "Intermediate 1st Year",
    academicLevel: "Intermediate 1st Year",
    academicYear: "2025-2026",
    certificateType: "Conduct Certificate",
    type: "Conduct Certificate",
    purpose: "Entrance Exam Verification",
    requestDate: "2026-10-15",
    issueDate: "",
    issue: "",
    status: "Requested",
    remarks: "Pending Exam Cell verification",
  },
];

const initialAttendanceTimingConfigs = [
  {
    id: 1,
    attendanceTimingConfigId: 1,
    configName: "Standard Staff Shift",
    name: "Standard Staff Shift",
    staffType: "Staff",
    staffTypeValue: 1,
    departmentId: "",
    departmentName: "All Departments",
    workStartTime: "09:00",
    workEndTime: "17:00",
    startTime: "09:00:00",
    endTime: "17:00:00",
    lateThreshold: "09:15",
    earlyCheckoutThreshold: "16:30",
    gracePeriodMinutes: 15,
    minWorkingHours: 7.0,
    description: "Default college shift schedule for Examination Cell & staff.",
    isActive: true,
    status: "Active",
  },
  {
    id: 2,
    attendanceTimingConfigId: 2,
    configName: "Exam Days Special Shift",
    name: "Exam Days Special Shift",
    staffType: "Teaching Faculty",
    staffTypeValue: 1,
    departmentId: "1",
    departmentName: "Examinations",
    workStartTime: "08:30",
    workEndTime: "16:30",
    startTime: "08:30:00",
    endTime: "16:30:00",
    lateThreshold: "08:45",
    earlyCheckoutThreshold: "16:00",
    gracePeriodMinutes: 10,
    minWorkingHours: 7.5,
    description: "Early reporting shift during examination session duties.",
    isActive: true,
    status: "Active",
  },
];

const initialStaffAttendance = [
  {
    id: 1,
    facultyId: 101,
    staffId: 101,
    employeeId: "MNT0043",
    staffName: "Preethi Y",
    name: "Preethi Y",
    designation: "Examination Incharge",
    department: "Examinations",
    attendanceDate: "2026-10-21",
    date: "2026-10-21",
    inTime: "08:52 AM",
    outTime: "05:04 PM",
    status: 1,
    statusLabel: "Present",
    remarks: "On time - Exam Cell morning check-in",
    campusId: 1,
    boardId: 1,
    academicYearId: 6,
  },
  {
    id: 2,
    facultyId: 102,
    staffId: 102,
    employeeId: "EMP-H102",
    staffName: "Mrs. P. Lakshmi",
    name: "Mrs. P. Lakshmi",
    designation: "Associate Professor",
    department: "Physics",
    attendanceDate: "2026-10-21",
    date: "2026-10-21",
    inTime: "09:05 AM",
    outTime: "04:55 PM",
    status: 1,
    statusLabel: "Present",
    remarks: "Present",
    campusId: 1,
    boardId: 1,
    academicYearId: 6,
  },
];

const initialStudentAttendance = [
  {
    studentId: 101,
    id: 101,
    studentName: "Rahul Sharma",
    name: "Rahul Sharma",
    rollNo: "260101",
    rollNumber: "260101",
    admissionNo: "ADM202601",
    admissionNumber: "ADM202601",
    sectionId: 1,
    sectionName: "MPC - Section A",
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    levelName: "Intermediate 1st Year",
    boardId: 1,
    academicYearId: 6,
    morningStatus: "Present",
    afternoonStatus: "Present",
    attendancePercentage: "95.5%",
    percentage: 95.5,
    totalWorkingDays: 100,
    presentDays: 95,
    absentDays: 5,
  },
  {
    studentId: 102,
    id: 102,
    studentName: "Priya Varma",
    name: "Priya Varma",
    rollNo: "260102",
    rollNumber: "260102",
    admissionNo: "ADM202602",
    admissionNumber: "ADM202602",
    sectionId: 1,
    sectionName: "MPC - Section A",
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    levelName: "Intermediate 1st Year",
    boardId: 1,
    academicYearId: 6,
    morningStatus: "Present",
    afternoonStatus: "Present",
    attendancePercentage: "92.0%",
    percentage: 92.0,
    totalWorkingDays: 100,
    presentDays: 92,
    absentDays: 8,
  },
  {
    studentId: 103,
    id: 103,
    studentName: "Venkata Sai",
    name: "Venkata Sai",
    rollNo: "260103",
    rollNumber: "260103",
    admissionNo: "ADM202603",
    admissionNumber: "ADM202603",
    sectionId: 1,
    sectionName: "MPC - Section A",
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    levelName: "Intermediate 1st Year",
    boardId: 1,
    academicYearId: 6,
    morningStatus: "Present",
    afternoonStatus: "Absent",
    attendancePercentage: "88.0%",
    percentage: 88.0,
    totalWorkingDays: 100,
    presentDays: 88,
    absentDays: 12,
  },
  {
    studentId: 104,
    id: 104,
    studentName: "Ananya Reddy",
    name: "Ananya Reddy",
    rollNo: "260104",
    rollNumber: "260104",
    admissionNo: "ADM202604",
    admissionNumber: "ADM202604",
    sectionId: 1,
    sectionName: "MPC - Section A",
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    levelName: "Intermediate 1st Year",
    boardId: 1,
    academicYearId: 6,
    morningStatus: "Absent",
    afternoonStatus: "Absent",
    attendancePercentage: "68.0%",
    percentage: 68.0,
    totalWorkingDays: 100,
    presentDays: 68,
    absentDays: 32,
  },
  {
    studentId: 105,
    id: 105,
    studentName: "Karthik Kumar",
    name: "Karthik Kumar",
    rollNo: "260105",
    rollNumber: "260105",
    admissionNo: "ADM202605",
    admissionNumber: "ADM202605",
    sectionId: 2,
    sectionName: "MPC - Section B",
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    levelName: "Intermediate 1st Year",
    boardId: 1,
    academicYearId: 6,
    morningStatus: "Present",
    afternoonStatus: "Present",
    attendancePercentage: "91.0%",
    percentage: 91.0,
    totalWorkingDays: 100,
    presentDays: 91,
    absentDays: 9,
  },
];

const initialHolidays = [
  {
    id: 1,
    holidayId: 1,
    holidayCode: "HOL-001",
    holidayName: "Gandhi Jayanti",
    name: "Gandhi Jayanti",
    holidayType: "National Holiday",
    dateType: "Single Day",
    startDate: "2026-10-02",
    endDate: "2026-10-02",
    appliesTo: "All Students & Staff",
    description: "National holiday in observance of Gandhi Jayanti.",
    status: "Active",
    lifecycleStatus: "Completed",
    campusId: 1,
  },
  {
    id: 2,
    holidayId: 2,
    holidayCode: "HOL-002",
    holidayName: "Dasara Holidays",
    name: "Dasara Holidays",
    holidayType: "Festival Holiday",
    dateType: "Date Range",
    startDate: "2026-10-19",
    endDate: "2026-10-23",
    appliesTo: "All Students & Staff",
    description: "Festival break for Dasara celebrations.",
    status: "Active",
    lifecycleStatus: "Completed",
    campusId: 1,
  },
  {
    id: 3,
    holidayId: 3,
    holidayCode: "HOL-003",
    holidayName: "Diwali",
    name: "Diwali",
    holidayType: "Festival Holiday",
    dateType: "Single Day",
    startDate: "2026-11-08",
    endDate: "2026-11-08",
    appliesTo: "All Students & Staff",
    description: "Festival holiday for Diwali.",
    status: "Active",
    lifecycleStatus: "Upcoming",
    campusId: 1,
  },
  {
    id: 4,
    holidayId: 4,
    holidayCode: "HOL-004",
    holidayName: "Christmas Day",
    name: "Christmas Day",
    holidayType: "Festival Holiday",
    dateType: "Single Day",
    startDate: "2026-12-25",
    endDate: "2026-12-25",
    appliesTo: "All Students & Staff",
    description: "Christmas vacation holiday.",
    status: "Active",
    lifecycleStatus: "Upcoming",
    campusId: 1,
  },
  {
    id: 5,
    holidayId: 5,
    holidayCode: "HOL-005",
    holidayName: "Sankranti Vacation",
    name: "Sankranti Vacation",
    holidayType: "Festival Holiday",
    dateType: "Date Range",
    startDate: "2027-01-12",
    endDate: "2027-01-16",
    appliesTo: "All Students & Staff",
    description: "Annual festival vacation break.",
    status: "Active",
    lifecycleStatus: "Upcoming",
    campusId: 1,
  },
];

const initialEvaluations = [
  {
    evaluationId: "eval-4-1-1",
    id: "eval-4-1-1",
    examinationId: 4,
    examId: 4,
    examinationName: "Pre-Final Examination 2026-27",
    examCode: "PFE-2026",
    sectionId: 1,
    sectionName: "MPC - Section A",
    subjectId: 1,
    subjectName: "Mathematics - IA",
    subjectCode: "MAT101",
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    academicYearId: 6,
    boardId: 1,
    campusId: 1,
    facultyId: 101,
    facultyName: "Dr. K. Srinivas",
    totalStudents: 4,
    evaluatedCount: 4,
    maxMarks: 100,
    internalMax: 20,
    theoryMax: 80,
    practicalMax: 0,
    passPercentage: 35,
    status: "APPROVED",
    evaluationStatus: "APPROVED",
    isApproved: true,
    rowVersion: 1,
  },
  {
    evaluationId: "eval-4-1-3",
    id: "eval-4-1-3",
    examinationId: 4,
    examId: 4,
    examinationName: "Pre-Final Examination 2026-27",
    examCode: "PFE-2026",
    sectionId: 1,
    sectionName: "MPC - Section A",
    subjectId: 3,
    subjectName: "Physics - I",
    subjectCode: "PHY101",
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    academicYearId: 6,
    boardId: 1,
    campusId: 1,
    facultyId: 102,
    facultyName: "Mrs. P. Lakshmi",
    totalStudents: 4,
    evaluatedCount: 4,
    maxMarks: 100,
    internalMax: 20,
    theoryMax: 80,
    practicalMax: 0,
    passPercentage: 35,
    status: "APPROVED",
    evaluationStatus: "APPROVED",
    isApproved: true,
    rowVersion: 1,
  },
];

const initialStudentMarks = [
  {
    markId: 1,
    evaluationId: "eval-4-1-1",
    examinationId: 4,
    sectionId: 1,
    subjectId: 1,
    studentId: 101,
    studentName: "Rahul Sharma",
    rollNo: "260101",
    internalMarks: 20,
    practicalMarks: 0,
    theoryMarks: 76,
    obtainedMarks: 96,
    totalMarks: 96,
    maxMarks: 100,
    status: "PRESENT",
    isAbsent: false,
  },
  {
    markId: 2,
    evaluationId: "eval-4-1-1",
    examinationId: 4,
    sectionId: 1,
    subjectId: 1,
    studentId: 102,
    studentName: "Priya Varma",
    rollNo: "260102",
    internalMarks: 19,
    practicalMarks: 0,
    theoryMarks: 74,
    obtainedMarks: 93,
    totalMarks: 93,
    maxMarks: 100,
    status: "PRESENT",
    isAbsent: false,
  },
  {
    markId: 3,
    evaluationId: "eval-4-1-1",
    examinationId: 4,
    sectionId: 1,
    subjectId: 1,
    studentId: 103,
    studentName: "Venkata Sai",
    rollNo: "260103",
    internalMarks: 18,
    practicalMarks: 0,
    theoryMarks: 68,
    obtainedMarks: 86,
    totalMarks: 86,
    maxMarks: 100,
    status: "PRESENT",
    isAbsent: false,
  },
  {
    markId: 4,
    evaluationId: "eval-4-1-1",
    examinationId: 4,
    sectionId: 1,
    subjectId: 1,
    studentId: 104,
    studentName: "Ananya Reddy",
    rollNo: "260104",
    internalMarks: 17,
    practicalMarks: 0,
    theoryMarks: 62,
    obtainedMarks: 79,
    totalMarks: 79,
    maxMarks: 100,
    status: "PRESENT",
    isAbsent: false,
  },
];

const initialPublishedResults = [
  {
    id: 1,
    examinationId: 4,
    examId: 4,
    examName: "Pre-Final Examination 2026-27",
    examCode: "PFE-2026",
    boardId: 1,
    academicYearId: 6,
    groupId: 1,
    groupName: "MPC",
    academicLevelId: 1,
    sections: [
      {
        sectionId: 1,
        sectionName: "MPC - Section A",
        totalStudents: 4,
        passedStudents: 4,
        failedStudents: 0,
        passPercentage: 100,
        averagePercentage: 88.5,
        highestPercentage: 96.0,
        lowestPercentage: 79.0,
        isPublished: true,
        publishedDate: "2026-10-15",
        students: [
          { studentId: 101, studentName: "Rahul Sharma", rollNo: "260101", total: 188, maximum: 200, percentage: 94.0, result: "PASS", grade: "A+" },
          { studentId: 102, studentName: "Priya Varma", rollNo: "260102", total: 182, maximum: 200, percentage: 91.0, result: "PASS", grade: "A+" },
          { studentId: 103, studentName: "Venkata Sai", rollNo: "260103", total: 170, maximum: 200, percentage: 85.0, result: "PASS", grade: "A" },
          { studentId: 104, studentName: "Ananya Reddy", rollNo: "260104", total: 154, maximum: 200, percentage: 77.0, result: "PASS", grade: "B+" },
        ],
      },
    ],
  },
];

const initialPromotions = [
  {
    id: 1,
    studentId: 101,
    admissionNo: "ADM202601",
    rollNumber: "260101",
    studentName: "Rahul Sharma",
    currentLevelId: 1,
    currentLevel: "Intermediate 1st Year",
    targetLevelId: 2,
    targetLevel: "Intermediate 2nd Year",
    groupId: 1,
    group: "MPC",
    groupName: "MPC",
    programId: 1,
    programName: "General",
    sectionId: 1,
    sectionName: "MPC - Section A",
    attendancePercentage: 95.5,
    academicScore: 94.0,
    feeDue: 0,
    eligibilityStatus: "Eligible",
    status: "Eligible",
    remarks: "High distinction - eligible for promotion to 2nd Year",
    isEligible: true,
  },
  {
    id: 2,
    studentId: 102,
    admissionNo: "ADM202602",
    rollNumber: "260102",
    studentName: "Priya Varma",
    currentLevelId: 1,
    currentLevel: "Intermediate 1st Year",
    targetLevelId: 2,
    targetLevel: "Intermediate 2nd Year",
    groupId: 1,
    group: "MPC",
    groupName: "MPC",
    programId: 1,
    programName: "General",
    sectionId: 1,
    sectionName: "MPC - Section A",
    attendancePercentage: 92.0,
    academicScore: 91.0,
    feeDue: 0,
    eligibilityStatus: "Eligible",
    status: "Eligible",
    remarks: "Passed all subjects - eligible",
    isEligible: true,
  },
  {
    id: 3,
    studentId: 103,
    admissionNo: "ADM202603",
    rollNumber: "260103",
    studentName: "Venkata Sai",
    currentLevelId: 1,
    currentLevel: "Intermediate 1st Year",
    targetLevelId: 2,
    targetLevel: "Intermediate 2nd Year",
    groupId: 1,
    group: "MPC",
    groupName: "MPC",
    programId: 1,
    programName: "General",
    sectionId: 1,
    sectionName: "MPC - Section A",
    attendancePercentage: 88.0,
    academicScore: 85.0,
    feeDue: 0,
    eligibilityStatus: "Eligible",
    status: "Eligible",
    remarks: "Eligible for 2nd Year",
    isEligible: true,
  },
];

const initialPromotionHistory = [
  {
    id: 1,
    batchId: "BATCH-2025-01",
    promotionDate: "2025-05-20",
    fromLevel: "Intermediate 1st Year",
    toLevel: "Intermediate 2nd Year",
    groupName: "MPC",
    promotedCount: 45,
    failedCount: 2,
    promotedBy: "Exam Cell Admin",
    status: "Completed",
  },
];

const initialCampusTransfers = [
  {
    id: 1,
    transferId: 1,
    studentId: 105,
    studentName: "Karthik Kumar",
    admissionNo: "ADM202605",
    fromCampusId: 1,
    fromCampusName: "Main Campus (HQ)",
    toCampusId: 2,
    toCampusName: "North Campus",
    requestDate: "2026-10-10",
    status: "Pending",
    reason: "Relocation",
  },
];

// ──────────────────────────────────────────────────────────────────────────
// STATE STORE SINGLETON
// ──────────────────────────────────────────────────────────────────────────

class MockDataStore {
  constructor() {
    this.hostelBlocks = getStored("hostel_blocks", initialHostelBlocks);
    this.roomTypes = getStored("hostel_room_types", initialRoomTypes);
    const defaultRooms = generateInitialRooms();
    this.rooms = getStored("hostel_rooms", defaultRooms);
    this.beds = getStored("hostel_beds", generateInitialBeds(this.rooms));
    this.wardens = getStored("hostel_wardens", initialWardens);
    this.allocations = getStored("hostel_allocations", initialAllocations);
    this.outpasses = getStored("hostel_outpasses", initialOutpasses);
    this.transfers = getStored("hostel_transfers", initialTransfers);
    this.attendance = getStored("hostel_attendance", initialHostelAttendance);
    this.staff = getStored("staff", initialAllStaff);
    this.students = getStored("students", initialAllStudents);
    this.campuses = getStored("campuses", DEFAULT_CAMPUSES);

    // Synchronize beds and rooms with active allocations so only genuinely allocated beds are marked Occupied
    const activeAllocs = (this.allocations || []).filter((a) => (a.status || "").toLowerCase() === "active");
    const activeBedIds = new Set(activeAllocs.map((a) => Number(a.bedId)).filter(Boolean));
    const activeRoomOccupancy = {};
    activeAllocs.forEach((a) => {
      if (a.roomId) activeRoomOccupancy[a.roomId] = (activeRoomOccupancy[a.roomId] || 0) + 1;
    });
    this.beds.forEach((bd) => {
      const isAllocated =
        activeBedIds.has(Number(bd.id || bd.bedId)) ||
        activeAllocs.some(
          (a) =>
            (Number(a.hostelId) === Number(bd.hostelId) || a.hostelName === bd.hostelName || a.blockName === bd.hostelName) &&
            String(a.roomNumber || a.room).replace(/^(room\s*#?)/i, "").trim() === String(bd.roomNumber).trim() &&
            String(a.bedNumber || a.bed).trim() === String(bd.bedNumber).trim()
        );
      bd.bedStatus = isAllocated ? "Occupied" : "Available";
    });
    this.rooms.forEach((rm) => {
      rm.occupied =
        activeRoomOccupancy[rm.id] ||
        activeAllocs.filter(
          (a) =>
            Number(a.roomId) === Number(rm.id) ||
            ((Number(a.hostelId) === Number(rm.hostelId) || a.hostelName === rm.hostelName || a.blockName === rm.hostelName) &&
              String(a.roomNumber || a.room).replace(/^(room\s*#?)/i, "").trim() === String(rm.roomNumber || rm.roomNo).trim())
        ).length;
    });
    this.academicYears = getStored("academic_years", [
      {
        id: 1,
        academicYearId: 1,
        name: "2024-2025",
        academicYearName: "2024-2025",
        yearName: "2024-2025",
        code: "AY-24-25",
        boardId: 1,
        campusId: 1,
        start: "2024-06-01",
        end: "2025-04-30",
        status: "Active",
        isActive: true,
        isCurrent: false,
      },
      {
        id: 4,
        academicYearId: 4,
        name: "2025-2026",
        academicYearName: "2025-2026",
        yearName: "2025-2026",
        code: "AY-25-26",
        boardId: 1,
        campusId: 1,
        start: "2025-06-01",
        end: "2026-04-30",
        status: "Active",
        isActive: true,
        isCurrent: false,
      },
      {
        id: 6,
        academicYearId: 6,
        name: "2026-2027",
        academicYearName: "2026-2027",
        yearName: "2026-2027",
        code: "AY-26-27",
        boardId: 1,
        campusId: 1,
        start: "2026-06-01",
        end: "2027-04-30",
        status: "Active",
        isActive: true,
        isCurrent: true,
      },
    ]);
    this.boards = getStored("boards", [
      {
        id: 1,
        boardId: 1,
        name: "Board of Intermediate Education, Andhra Pradesh",
        boardName: "Board of Intermediate Education, Andhra Pradesh",
        code: "BIEAP",
        boardCode: "BIEAP",
        status: "Active",
        isActive: true,
      },
      {
        id: 2,
        boardId: 2,
        name: "Telangana Board of Intermediate Education",
        boardName: "Telangana Board of Intermediate Education",
        code: "TSBIE",
        boardCode: "TSBIE",
        status: "Active",
        isActive: true,
      },
      {
        id: 3,
        boardId: 3,
        name: "Central Board of Secondary Education",
        boardName: "Central Board of Secondary Education",
        code: "CBSE",
        boardCode: "CBSE",
        status: "Active",
        isActive: true,
      },
    ]);
    this.academicLevels = getStored("academic_levels", [
      { id: 1, academicLevelId: 1, name: "1st Year", levelName: "1st Year", code: "INT-1", boardId: 1, status: "Active", isActive: true },
      { id: 2, academicLevelId: 2, name: "2nd Year", levelName: "2nd Year", code: "INT-2", boardId: 1, status: "Active", isActive: true },
    ]);
    this.courses = getStored("courses", rawCourses);
    this.subjects = getStored("subjects", rawSubjects);
    this.sections = getStored("sections", rawSections);
    this.masterPatterns = getStored("exam_patterns", [
      { id: 1, patternId: 1, name: "Regular Academic Pattern", patternName: "Regular Academic Pattern", code: "REG", totalMarks: 300, isDefault: true, isActive: true },
      { id: 2, patternId: 2, name: "Objective Pattern", patternName: "Objective Pattern", code: "OBJ", totalMarks: 180, isDefault: false, isActive: true },
      { id: 3, patternId: 3, name: "IIT-JEE Advanced Pattern", patternName: "IIT-JEE Advanced Pattern", code: "JEE-ADV", totalMarks: 300, isDefault: false, isActive: true },
      { id: 4, patternId: 4, name: "NEET Objective Pattern", patternName: "NEET Objective Pattern", code: "NEET-OBJ", totalMarks: 720, isDefault: false, isActive: true },
    ]);
    this.examTypes = getStored("exam_types", [
      { id: 1, name: "Unit Test", code: "UT", examType: "Unit Test", assessmentTypeId: 1 },
      { id: 2, name: "Quarterly Exam", code: "QE", examType: "Quarterly Exam", assessmentTypeId: 2 },
      { id: 3, name: "Half Yearly Exam", code: "HY", examType: "Half Yearly Exam", assessmentTypeId: 3 },
      { id: 4, name: "Pre-Final Exam", code: "PFE", examType: "Pre-Final Exam", assessmentTypeId: 4 },
      { id: 5, name: "Annual Final Exam", code: "AFE", examType: "Annual Final Exam", assessmentTypeId: 5 },
    ]);
    this.programs = getStored("programs", [
      { id: 1, programId: 1, name: "General", programName: "General", code: "GEN", groupId: 1, boardId: 1, isActive: true },
      { id: 2, programId: 2, name: "IIT-JEE Focus", programName: "IIT-JEE Focus", code: "IIT", groupId: 1, boardId: 1, isActive: true },
      { id: 3, programId: 3, name: "NEET Focus", programName: "NEET Focus", code: "NEET", groupId: 2, boardId: 1, isActive: true },
      { id: 4, programId: 4, name: "Regular BiPC", programName: "Regular BiPC", code: "REG-BIPC", groupId: 2, boardId: 1, isActive: true },
      { id: 5, programId: 5, name: "General Commerce", programName: "General Commerce", code: "COMM", groupId: 3, boardId: 2, isActive: true },
    ]);
    this.examRooms = getStored("exam_rooms", [
      { id: 1, roomId: 1, roomNumber: "Hall-1", roomName: "Hall-1", name: "Hall-1", capacity: 60, maxCapacity: 60, blockName: "Main Block", buildingName: "Main Block", floor: "Ground Floor", campusId: 1, status: "Active", isActive: true },
      { id: 2, roomId: 2, roomNumber: "Hall-2", roomName: "Hall-2", name: "Hall-2", capacity: 60, maxCapacity: 60, blockName: "Main Block", buildingName: "Main Block", floor: "1st Floor", campusId: 1, status: "Active", isActive: true },
      { id: 3, roomId: 3, roomNumber: "Hall-3", roomName: "Hall-3", name: "Hall-3", capacity: 60, maxCapacity: 60, blockName: "Science Block", buildingName: "Science Block", floor: "Ground Floor", campusId: 1, status: "Active", isActive: true },
      { id: 4, roomId: 4, roomNumber: "Hall-4", roomName: "Hall-4", name: "Hall-4", capacity: 60, maxCapacity: 60, blockName: "Science Block", buildingName: "Science Block", floor: "1st Floor", campusId: 1, status: "Active", isActive: true },
      { id: 5, roomId: 5, roomNumber: "Room-101", roomName: "Room-101", name: "Room-101", capacity: 60, maxCapacity: 60, blockName: "Commerce Block", buildingName: "Commerce Block", floor: "Ground Floor", campusId: 1, status: "Active", isActive: true },
      { id: 6, roomId: 6, roomNumber: "Room-102", roomName: "Room-102", name: "Room-102", capacity: 60, maxCapacity: 60, blockName: "Commerce Block", buildingName: "Commerce Block", floor: "1st Floor", campusId: 1, status: "Active", isActive: true },
    ]);
    this.examinations = getStored("examinations", rawExaminations);
    this.examSchedules = getStored("exam_schedules", rawExamSchedule);
    this.certificates = getStored("certificates", initialCertificates);
    this.hallTickets = getStored("hall_tickets", []);
    this.attendanceTimingConfigs = getStored("attendance_timing_configs", initialAttendanceTimingConfigs);
    this.staffAttendance = getStored("staff_attendance", initialStaffAttendance);
    this.studentAttendance = getStored("student_attendance", initialStudentAttendance);
    this.holidays = getStored("holidays", initialHolidays);
    this.evaluations = getStored("evaluations", initialEvaluations);
    this.studentMarks = getStored("student_marks", initialStudentMarks);
    this.publishedResults = getStored("published_results", initialPublishedResults);
    this.promotions = getStored("promotions", initialPromotions);
    this.promotionHistory = getStored("promotion_history", initialPromotionHistory);
    this.campusTransfers = getStored("campus_transfers", initialCampusTransfers);
  }

  // Aliases for seamless access
  get blocks() { return this.hostelBlocks; }
  set blocks(val) { this.hostelBlocks = val; }
  get hostel_blocks() { return this.hostelBlocks; }
  set hostel_blocks(val) { this.hostelBlocks = val; }

  get hostel_room_types() { return this.roomTypes; }
  set hostel_room_types(val) { this.roomTypes = val; }

  get hostel_rooms() { return this.rooms; }
  set hostel_rooms(val) { this.rooms = val; }

  get hostel_beds() { return this.beds; }
  set hostel_beds(val) { this.beds = val; }

  get hostel_wardens() { return this.wardens; }
  set hostel_wardens(val) { this.wardens = val; }

  get hostel_allocations() { return this.allocations; }
  set hostel_allocations(val) { this.allocations = val; }

  get hostel_outpasses() { return this.outpasses; }
  set hostel_outpasses(val) { this.outpasses = val; }

  get hostel_transfers() { return this.transfers; }
  set hostel_transfers(val) { this.transfers = val; }

  get hostel_attendance() { return this.attendance; }
  set hostel_attendance(val) { this.attendance = val; }

  get academic_years() { return this.academicYears; }
  set academic_years(val) { this.academicYears = val; }

  get exam_schedules() { return this.examSchedules; }
  set exam_schedules(val) { this.examSchedules = val; }

  get attendance_timing_configs() { return this.attendanceTimingConfigs; }
  set attendance_timing_configs(val) { this.attendanceTimingConfigs = val; }

  get staff_attendance() { return this.staffAttendance; }
  set staff_attendance(val) { this.staffAttendance = val; }

  get student_attendance() { return this.studentAttendance; }
  set student_attendance(val) { this.studentAttendance = val; }

  get student_marks() { return this.studentMarks; }
  set student_marks(val) { this.studentMarks = val; }

  get published_results() { return this.publishedResults; }
  set published_results(val) { this.publishedResults = val; }

  get promotion_history() { return this.promotionHistory; }
  set promotion_history(val) { this.promotionHistory = val; }

  get campus_transfers() { return this.campusTransfers; }
  set campus_transfers(val) { this.campusTransfers = val; }

  resetExaminations() {
    this.examinations = JSON.parse(JSON.stringify(rawExaminations));
    this.examSchedules = JSON.parse(JSON.stringify(rawExamSchedule));
    this.certificates = JSON.parse(JSON.stringify(initialCertificates));
    this.hallTickets = [];
    this.attendanceTimingConfigs = JSON.parse(JSON.stringify(initialAttendanceTimingConfigs));
    this.staffAttendance = JSON.parse(JSON.stringify(initialStaffAttendance));
    this.studentAttendance = JSON.parse(JSON.stringify(initialStudentAttendance));
    this.holidays = JSON.parse(JSON.stringify(initialHolidays));
    this.evaluations = JSON.parse(JSON.stringify(initialEvaluations));
    this.studentMarks = JSON.parse(JSON.stringify(initialStudentMarks));
    this.publishedResults = JSON.parse(JSON.stringify(initialPublishedResults));
    this.promotions = JSON.parse(JSON.stringify(initialPromotions));
    this.promotionHistory = JSON.parse(JSON.stringify(initialPromotionHistory));
    this.campusTransfers = JSON.parse(JSON.stringify(initialCampusTransfers));

    this.save("examinations");
    this.save("exam_schedules");
    this.save("certificates");
    this.save("hall_tickets");
    this.save("attendance_timing_configs");
    this.save("staff_attendance");
    this.save("student_attendance");
    this.save("holidays");
    this.save("evaluations");
    this.save("student_marks");
    this.save("published_results");
    this.save("promotions");
    this.save("promotion_history");
    this.save("campus_transfers");

    if (typeof window !== "undefined") {
      try {
        const keys = [
          "cms_mock_store_examinations",
          "cms_mock_store_exam_schedules",
          "cms_certificates",
          "cms_mock_store_attendance_timing_configs",
          "cms_mock_store_staff_attendance",
          "cms_mock_store_student_attendance",
          "cms_mock_store_holidays",
          "cms_mock_store_evaluations",
          "cms_mock_store_student_marks",
          "cms_mock_store_published_results",
          "cms_mock_store_promotions",
          "cms_mock_store_promotion_history",
          "cms_mock_store_campus_transfers",
        ];
        keys.forEach((k) => window.localStorage.removeItem(k));
      } catch (err) {
        void err;
      }
    }
    return true;
  }

  save(key) {
    const propToStorageKey = {
      hostelBlocks: "hostel_blocks",
      blocks: "hostel_blocks",
      hostel_blocks: "hostel_blocks",
      roomTypes: "hostel_room_types",
      hostel_room_types: "hostel_room_types",
      rooms: "hostel_rooms",
      hostel_rooms: "hostel_rooms",
      beds: "hostel_beds",
      hostel_beds: "hostel_beds",
      wardens: "hostel_wardens",
      hostel_wardens: "hostel_wardens",
      allocations: "hostel_allocations",
      hostel_allocations: "hostel_allocations",
      outpasses: "hostel_outpasses",
      hostel_outpasses: "hostel_outpasses",
      transfers: "hostel_transfers",
      hostel_transfers: "hostel_transfers",
      attendance: "hostel_attendance",
      hostel_attendance: "hostel_attendance",
      academicYears: "academic_years",
      academic_years: "academic_years",
      academicLevels: "academic_levels",
      academic_levels: "academic_levels",
      campuses: "campuses",
      boards: "boards",
      staff: "staff",
      students: "students",
      courses: "courses",
      subjects: "subjects",
      sections: "sections",
      masterPatterns: "exam_patterns",
      exam_patterns: "exam_patterns",
      examTypes: "exam_types",
      exam_types: "exam_types",
      programs: "programs",
      examRooms: "exam_rooms",
      exam_rooms: "exam_rooms",
      examinations: "examinations",
      examSchedules: "exam_schedules",
      exam_schedules: "exam_schedules",
      certificates: "certificates",
      hallTickets: "hall_tickets",
      hall_tickets: "hall_tickets",
      attendanceTimingConfigs: "attendance_timing_configs",
      attendance_timing_configs: "attendance_timing_configs",
      staffAttendance: "staff_attendance",
      staff_attendance: "staff_attendance",
      studentAttendance: "student_attendance",
      student_attendance: "student_attendance",
      holidays: "holidays",
      evaluations: "evaluations",
      studentMarks: "student_marks",
      student_marks: "student_marks",
      publishedResults: "published_results",
      published_results: "published_results",
      promotions: "promotions",
      promotionHistory: "promotion_history",
      promotion_history: "promotion_history",
      campusTransfers: "campus_transfers",
      campus_transfers: "campus_transfers",
    };

    const storageKeyToProp = {
      hostel_blocks: "hostelBlocks",
      hostel_room_types: "roomTypes",
      hostel_rooms: "rooms",
      hostel_beds: "beds",
      hostel_wardens: "wardens",
      hostel_allocations: "allocations",
      hostel_outpasses: "outpasses",
      hostel_transfers: "transfers",
      hostel_attendance: "attendance",
      academic_years: "academicYears",
      academic_levels: "academicLevels",
      campuses: "campuses",
      boards: "boards",
      staff: "staff",
      students: "students",
      courses: "courses",
      subjects: "subjects",
      sections: "sections",
      exam_patterns: "masterPatterns",
      exam_types: "examTypes",
      programs: "programs",
      exam_rooms: "examRooms",
      examinations: "examinations",
      exam_schedules: "examSchedules",
      certificates: "certificates",
      hall_tickets: "hallTickets",
      attendance_timing_configs: "attendanceTimingConfigs",
      staff_attendance: "staffAttendance",
      student_attendance: "studentAttendance",
      holidays: "holidays",
      evaluations: "evaluations",
      student_marks: "studentMarks",
      published_results: "publishedResults",
      promotions: "promotions",
      promotion_history: "promotionHistory",
      campus_transfers: "campusTransfers",
    };

    const storeKey = propToStorageKey[key] || key;
    const prop = storageKeyToProp[storeKey] || key;
    const data = this[prop] !== undefined ? this[prop] : this[key];
    if (data !== undefined) {
      setStored(storeKey, data);
    }
  }
}

export const mockStore = new MockDataStore();

if (typeof window !== "undefined") {
  window.mockStore = mockStore;
  window.resetMockExamData = () => {
    mockStore.resetExaminations();
    console.log("Mock examination and schedule data reset to defaults.");
    window.location.reload();
  };
}

// ──────────────────────────────────────────────────────────────────────────
// RESPONSE BUILDER HELPERS
// ──────────────────────────────────────────────────────────────────────────

function ok(config, data) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config,
  });
}

function parseUrl(urlStr, configParams = {}) {
  const [pathname, search] = String(urlStr || "").split("?");
  const params = new URLSearchParams(search || "");
  if (configParams && typeof configParams === "object") {
    Object.entries(configParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && !params.has(k)) {
        params.set(k, String(v));
      }
    });
  }
  const cleanPath = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return { path: `/${cleanPath}`, params };
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN MOCK ADAPTER HANDLER
// ──────────────────────────────────────────────────────────────────────────

export function handleMockApiRequest(config) {
  const method = String(config.method || "get").toLowerCase();
  const { path, params } = parseUrl(config.url, config.params);
  const body = config.data ? (typeof config.data === "string" ? JSON.parse(config.data || "{}") : config.data) : {};

  // 0. DASHBOARD METRICS & OVERVIEW (/api/v1/dashboard/*)
  if (path.startsWith("/api/v1/dashboard/")) {
    const sub = path.replace("/api/v1/dashboard/", "");
    if (sub === "summary") {
      const totalStudents = mockStore.students?.length || 1248;
      const teachingStaff = mockStore.faculty?.filter((f) => !String(f.staffType || "").toLowerCase().includes("non")).length || 48;
      const nonTeachingStaff = mockStore.faculty?.filter((f) => String(f.staffType || "").toLowerCase().includes("non")).length || 22;
      const totalGroups = mockStore.courses?.length || 12;
      const totalSections = mockStore.sections?.length || 24;
      return ok(config, {
        success: true,
        data: {
          totalStudents,
          totalStudentsCount: totalStudents,
          teachingStaff,
          teachingStaffCount: teachingStaff,
          nonTeachingStaff,
          nonTeachingStaffCount: nonTeachingStaff,
          totalGroups,
          totalSections,
        },
      });
    }

    if (sub === "students-overview") {
      const total = mockStore.students?.length || 1248;
      const boys = Math.round(total * 0.58);
      const girls = total - boys;
      return ok(config, {
        success: true,
        data: {
          totalStudents: total,
          totalCount: total,
          boys,
          girls,
          male: boys,
          female: girls,
        },
      });
    }

    if (sub === "admission-trend") {
      return ok(config, {
        success: true,
        data: [
          { period: "May 2026", studentsJoined: 110 },
          { period: "Jun 2026", studentsJoined: 340 },
          { period: "Jul 2026", studentsJoined: 285 },
          { period: "Aug 2026", studentsJoined: 320 },
          { period: "Sep 2026", studentsJoined: 193 },
        ],
      });
    }

    if (sub === "group-distribution") {
      const groups = (mockStore.courses || []).map((c) => ({
        name: c.name || c.code || "Group",
        code: c.code || "GRP",
        value: 100 + Math.floor(Math.random() * 200),
      }));
      const fallback = [
        { name: "MPC", code: "MPC", value: 450 },
        { name: "BiPC", code: "BiPC", value: 380 },
        { name: "MEC", code: "MEC", value: 220 },
        { name: "CEC", code: "CEC", value: 198 },
      ];
      return ok(config, { success: true, data: groups.length ? groups : fallback });
    }

    if (sub === "students-attendance-today") {
      const total = mockStore.students?.length || 1248;
      const present = Math.round(total * 0.94);
      const absent = Math.round(total * 0.04);
      const halfDay = total - present - absent;
      return ok(config, {
        success: true,
        data: {
          total,
          totalStudents: total,
          present,
          absent,
          halfDay,
          percentage: 94.2,
        },
      });
    }

    if (sub === "staff-attendance-today") {
      return ok(config, {
        success: true,
        data: {
          total: 70,
          present: 65,
          absent: 3,
          late: 2,
          onLeave: 2,
          percentage: 95.7,
        },
      });
    }

    if (sub === "upcoming-holidays") {
      return ok(config, {
        success: true,
        data: [
          { id: 1, holidayName: "Diwali Festival", name: "Diwali Festival", type: "Festival Holiday", formattedDateRange: "01 Nov 2026 – 03 Nov 2026", durationText: "3 Days", badge: "Upcoming", tone: "violet" },
          { id: 2, holidayName: "Christmas Vacation", name: "Christmas Vacation", type: "Vacation", formattedDateRange: "24 Dec 2026 – 26 Dec 2026", durationText: "3 Days", badge: "Upcoming", tone: "green" },
          { id: 3, holidayName: "Sankranti Holidays", name: "Sankranti Holidays", type: "Festival Holiday", formattedDateRange: "13 Jan 2027 – 17 Jan 2027", durationText: "5 Days", badge: "Upcoming", tone: "orange" },
        ],
      });
    }

    if (sub === "upcoming-examinations") {
      const exams = (mockStore.examinations || []).map((e) => ({
        id: e.id,
        examId: e.id,
        name: e.name,
        examName: e.name,
        examCode: e.examCode || e.code,
        groupName: e.groupName || "MPC",
        formattedDate: `${e.startDate} to ${e.endDate}`,
        dateText: `${e.startDate} to ${e.endDate}`,
        badge: e.status || "Scheduled",
        status: e.status,
      }));
      return ok(config, { success: true, data: exams, items: exams });
    }
  }

  // 1. CAMPUSES
  if (path === "/api/v1/campuses") {
    if (method === "get") {
      return ok(config, { success: true, data: mockStore.campuses, items: mockStore.campuses });
    }
    if (method === "post") {
      const newCampus = {
        id: mockStore.campuses.length + 1,
        campusId: mockStore.campuses.length + 1,
        ...body,
        status: "Active",
        isActive: true,
      };
      mockStore.campuses.push(newCampus);
      mockStore.save("campuses");
      return ok(config, { success: true, message: "Campus created successfully", data: newCampus });
    }
  }
  if (path.startsWith("/api/v1/campuses/")) {
    const id = Number(path.split("/").pop());
    const c = mockStore.campuses.find((x) => x.id === id || x.campusId === id);
    if (method === "get") return ok(config, { success: true, data: c || mockStore.campuses[0] });
    if (method === "put") {
      if (c) Object.assign(c, body);
      mockStore.save("campuses");
      return ok(config, { success: true, data: c });
    }
  }

  // 2. ACADEMIC YEARS
  if (path === "/api/v1/academic-years/active" || path === "/api/v1/academic-years") {
    if (method === "get") {
      const boardId = params.get("boardId");
      let list = mockStore.academicYears;
      if (boardId) {
        list = list.filter((y) => String(y.boardId) === String(boardId) || !y.boardId);
        if (!list.length) list = mockStore.academicYears;
      }
      return ok(config, {
        success: true,
        data: list,
        items: list,
        $values: list,
      });
    }
    if (method === "post") {
      const newYear = { id: mockStore.academicYears.length + 1, ...body, status: "Active", isActive: true };
      mockStore.academicYears.push(newYear);
      mockStore.save("academic_years");
      return ok(config, { success: true, data: newYear });
    }
  }

  // 3. BOARDS & ACADEMIC LEVELS
  if (path === "/api/v1/boards" || path === "/api/v1/boards/academic-levels") {
    return ok(config, { success: true, data: mockStore.boards, items: mockStore.boards, $values: mockStore.boards });
  }
  if (path === "/api/v1/academic-levels" || path.startsWith("/api/v1/academic-levels")) {
    const levels = [
      { id: 1, academicLevelId: 1, levelName: "Intermediate 1st Year", name: "Intermediate 1st Year", code: "INT-1", boardId: 1, isActive: true },
      { id: 2, academicLevelId: 2, levelName: "Intermediate 2nd Year", name: "Intermediate 2nd Year", code: "INT-2", boardId: 1, isActive: true },
    ];
    return ok(config, { success: true, status: true, data: levels, items: levels, $values: levels });
  }

  // 4. HOSTEL BLOCKS
  if (path === "/api/v1/hostel/blocks") {
    if (method === "get") {
      const blocksWithCounts = mockStore.hostelBlocks.map((b) => {
        const bId = Number(b.id || b.hostelId);
        const bRooms = mockStore.rooms.filter(
          (r) => Number(r.hostelId) === bId || r.block === b.code || r.blockName === b.name
        );
        const bRoomIds = new Set(bRooms.map((r) => Number(r.id || r.roomId)));
        const bBeds = mockStore.beds.filter(
          (bd) => bRoomIds.has(Number(bd.roomId)) || Number(bd.hostelId) === bId
        );
        const occBeds = bBeds.filter((bd) => (bd.bedStatus || "").toLowerCase() === "occupied").length;
        const totalRooms = bRooms.length || Number(b.totalRooms || 0);
        const totalBeds = bBeds.length || Number(b.totalBeds || 0);
        const vacantBeds = Math.max(0, totalBeds - occBeds);

        return {
          ...b,
          totalRooms,
          totalBeds,
          occupiedBeds: occBeds,
          availableBeds: vacantBeds,
          vacantBeds,
        };
      });
      return ok(config, { success: true, data: blocksWithCounts, items: blocksWithCounts });
    }
    if (method === "post") {
      const maxId = mockStore.hostelBlocks.reduce((max, b) => Math.max(max, Number(b.id || b.hostelId || 0)), 0);
      const nextId = maxId + 1;
      const bName = body.hostelName || body.name || `Hostel Block #${nextId}`;
      const bCode = body.hostelCode || body.code || `BLK-${nextId}`;
      const bType = body.hostelType || body.type || "Boys";
      const bFloors = Number(body.totalFloors || body.floors || 1);

      const newBlock = {
        id: nextId,
        hostelId: nextId,
        name: bName,
        blockName: bName,
        hostelName: bName,
        code: bCode,
        blockCode: bCode,
        hostelCode: bCode,
        type: bType,
        hostelType: bType,
        totalFloors: bFloors,
        floors: bFloors,
        totalRooms: Number(body.totalRooms || 0),
        totalBeds: Number(body.totalBeds || 0),
        availableBeds: Number(body.totalBeds || 0),
        vacantBeds: Number(body.totalBeds || 0),
        occupiedBeds: 0,
        warden: body.warden || body.wardenName || "Unassigned",
        wardenName: body.wardenName || body.warden || "Unassigned",
        wardenPhone: body.wardenPhone || body.primaryMobileNumber || "-",
        primaryMobileNumber: body.primaryMobileNumber || body.wardenPhone || "-",
        email: body.email || "",
        address: body.address || "",
        status: body.status || "Active",
        isActive: (body.status || "Active").toLowerCase() === "active",
        ...body,
      };
      mockStore.hostelBlocks.push(newBlock);
      mockStore.save("hostel_blocks");
      return ok(config, { success: true, message: "Block created successfully", data: newBlock });
    }
  }
  if (path.startsWith("/api/v1/hostel/blocks/")) {
    const id = Number(path.split("/").pop());
    const blk = mockStore.hostelBlocks.find((b) => Number(b.id || b.hostelId) === id);
    if (method === "put") {
      if (blk) {
        Object.assign(blk, body);
        if (body.hostelName) { blk.name = body.hostelName; blk.blockName = body.hostelName; }
        if (body.hostelCode) { blk.code = body.hostelCode; blk.blockCode = body.hostelCode; }
        if (body.hostelType) { blk.type = body.hostelType; }
        if (body.totalFloors) { blk.floors = body.totalFloors; }
      }
      mockStore.save("hostel_blocks");
      return ok(config, { success: true, data: blk });
    }
    if (method === "delete") {
      mockStore.hostelBlocks = mockStore.hostelBlocks.filter((b) => Number(b.id || b.hostelId) !== id);
      mockStore.save("hostel_blocks");
      return ok(config, { success: true, message: "Block deleted successfully" });
    }
    return ok(config, { success: true, data: blk });
  }

  // 5. HOSTEL ROOM TYPES / CATEGORIES
  if (path === "/api/v1/hostel/room-types") {
    if (method === "get") {
      return ok(config, { success: true, data: mockStore.roomTypes, items: mockStore.roomTypes });
    }
    if (method === "post") {
      const maxId = mockStore.roomTypes.reduce((max, r) => Math.max(max, Number(r.id || r.roomTypeId || 0)), 0);
      const nextId = maxId + 1;
      const newCat = {
        id: nextId,
        roomTypeId: nextId,
        name: body.roomTypeSpecification || body.name || `Room Type #${nextId}`,
        roomTypeSpecification: body.roomTypeSpecification || body.name || `Room Type #${nextId}`,
        specification: body.roomTypeSpecification || body.specification || body.name || `Room Type #${nextId}`,
        acType: body.acType || "Non-AC",
        bedCapacity: Number(body.bedCapacity || body.capacity || 2),
        capacity: Number(body.bedCapacity || body.capacity || 2),
        standardMonthlyFee: Number(body.standardMonthlyFee || body.monthlyFee || body.fee || 6000),
        monthlyFee: Number(body.standardMonthlyFee || body.monthlyFee || body.fee || 6000),
        fee: Number(body.standardMonthlyFee || body.monthlyFee || body.fee || 6000),
        status: body.status || "Active",
        isActive: true,
        ...body,
      };
      mockStore.roomTypes.push(newCat);
      mockStore.save("hostel_room_types");
      return ok(config, { success: true, data: newCat });
    }
  }
  if (path.startsWith("/api/v1/hostel/room-types/")) {
    const id = Number(path.split("/").pop());
    const rt = mockStore.roomTypes.find((r) => Number(r.id || r.roomTypeId) === id);
    if (method === "put") {
      if (rt) Object.assign(rt, body);
      mockStore.save("hostel_room_types");
      return ok(config, { success: true, data: rt });
    }
    if (method === "delete") {
      mockStore.roomTypes = mockStore.roomTypes.filter((r) => Number(r.id || r.roomTypeId) !== id);
      mockStore.save("hostel_room_types");
      return ok(config, { success: true, message: "Room type deleted" });
    }
    return ok(config, { success: true, data: rt });
  }

  // 6. HOSTEL ROOMS
  if (path === "/api/v1/hostel/rooms") {
    if (method === "get") {
      return ok(config, { success: true, data: mockStore.rooms, items: mockStore.rooms });
    }
    if (method === "post") {
      const maxId = mockStore.rooms.reduce((max, r) => Math.max(max, Number(r.id || r.roomId || 0)), 0);
      const nextId = maxId + 1;
      const blk = mockStore.hostelBlocks.find((b) => Number(b.id || b.hostelId) === Number(body.hostelId));
      const cat = mockStore.roomTypes.find((c) => Number(c.id || c.roomTypeId) === Number(body.roomTypeId));
      const cap = Number(body.bedCapacity || body.capacity || cat?.bedCapacity || cat?.capacity || 2);
      const rNum = String(body.roomNumber || body.roomNo || "").replace(/^Room\s*#?\s*/i, "").trim();
      const feeVal = cat?.standardMonthlyFee || (body.acType === "AC" ? 7500 : 6000);

      const newRoom = {
        id: nextId,
        roomId: nextId,
        hostelId: Number(body.hostelId || blk?.id || 1),
        hostelName: blk?.name || `Hostel Block #${body.hostelId}`,
        hostelCode: blk?.code || `BLK-${body.hostelId}`,
        block: blk?.code || blk?.name || `BLK-${body.hostelId}`,
        blockName: blk?.name || `Hostel Block #${body.hostelId}`,
        roomNo: rNum,
        roomNumber: rNum,
        floorLevel: body.floorLevel || body.floor || "Floor 1",
        floor: body.floorLevel || body.floor || "Floor 1",
        roomTypeId: Number(body.roomTypeId || cat?.id || 1),
        roomTypeSpecification: cat?.name || cat?.roomTypeSpecification || "Standard Room",
        type: cat?.name || cat?.roomTypeSpecification || "Standard Room",
        capacity: cap,
        bedCapacity: cap,
        occupied: 0,
        standardMonthlyFee: feeVal,
        fee: `₹${feeVal.toLocaleString()}/mo`,
        acType: body.acType || cat?.acType || "Non-AC",
        status: body.status || "Active",
        isActive: true,
        ...body,
      };
      mockStore.rooms.push(newRoom);
      mockStore.save("hostel_rooms");
      return ok(config, { success: true, data: newRoom });
    }
  }
  if (path.startsWith("/api/v1/hostel/rooms/")) {
    const id = Number(path.split("/").pop());
    const rm = mockStore.rooms.find((r) => Number(r.id || r.roomId) === id);
    if (method === "put") {
      if (rm) {
        Object.assign(rm, body);
        if (body.roomNumber || body.roomNo) {
          const clean = String(body.roomNumber || body.roomNo).replace(/^Room\s*#?\s*/i, "").trim();
          rm.roomNo = clean;
          rm.roomNumber = clean;
        }
        if (body.bedCapacity || body.capacity) {
          const cap = Number(body.bedCapacity || body.capacity);
          rm.capacity = cap;
          rm.bedCapacity = cap;
        }
      }
      mockStore.save("hostel_rooms");
      return ok(config, { success: true, data: rm });
    }
    if (method === "delete") {
      mockStore.rooms = mockStore.rooms.filter((r) => Number(r.id || r.roomId) !== id);
      mockStore.beds = mockStore.beds.filter((bd) => Number(bd.roomId) !== id);
      mockStore.save("hostel_rooms");
      mockStore.save("hostel_beds");
      return ok(config, { success: true, message: "Room deleted" });
    }
    return ok(config, { success: true, data: rm });
  }

  // 7. HOSTEL BEDS
  if (path === "/api/v1/hostel/beds") {
    if (method === "get") {
      return ok(config, { success: true, data: mockStore.beds, items: mockStore.beds });
    }
    if (method === "post") {
      const maxId = mockStore.beds.reduce((max, b) => Math.max(max, Number(b.id || b.bedId || 0)), 0);
      const nextId = maxId + 1;
      const parentRoom = mockStore.rooms.find((r) => Number(r.id || r.roomId) === Number(body.roomId));
      const newBed = {
        id: nextId,
        bedId: nextId,
        roomId: Number(body.roomId),
        hostelId: parentRoom ? parentRoom.hostelId : (body.hostelId || 1),
        hostelName: parentRoom ? (parentRoom.hostelName || parentRoom.blockName) : "",
        roomNumber: parentRoom ? (parentRoom.roomNumber || parentRoom.roomNo) : (body.roomNumber || ""),
        bedNumber: body.bedNumber || `BED-${nextId}`,
        bedStatus: body.bedStatus || "Available",
        status: body.status || "Active",
        isActive: true,
        ...body,
      };
      mockStore.beds.push(newBed);
      mockStore.save("hostel_beds");
      return ok(config, { success: true, data: newBed });
    }
  }
  if (path.startsWith("/api/v1/hostel/beds/")) {
    const id = Number(path.split("/").pop());
    const bd = mockStore.beds.find((b) => Number(b.id || b.bedId) === id);
    if (method === "put") {
      if (bd) Object.assign(bd, body);
      mockStore.save("hostel_beds");
      return ok(config, { success: true, data: bd });
    }
    if (method === "delete") {
      mockStore.beds = mockStore.beds.filter((b) => Number(b.id || b.bedId) !== id);
      mockStore.save("hostel_beds");
      return ok(config, { success: true, message: "Bed deleted" });
    }
    return ok(config, { success: true, data: bd });
  }

  // 8. HOSTEL WARDENS
  if (path === "/api/v1/hostel/wardens") {
    if (method === "get") {
      const allFaculty = mockStore.faculty || rawFaculty || [];
      const enrichedWardens = (mockStore.wardens || []).map((w) => {
        const staff = allFaculty.find((f) => Number(f.staffId || f.id) === Number(w.staffId));
        const blk = (mockStore.blocks || []).find((b) => Number(b.id) === Number(w.hostelId) || String(b.id) === String(w.hostelId));
        const blkName = w.hostelName || w.blockName || w.assignedHostels || blk?.name || (w.hostelId ? `Hostel Block #${w.hostelId}` : "");
        const wName = w.wardenName || w.name || staff?.name || staff?.fullName || "Resident Warden";
        const empId = w.employeeId || w.empId || staff?.employeeId || staff?.empId || (w.staffId ? `EMP-${w.staffId}` : "");
        const phone = w.phone || w.mobileNumber || staff?.phone || staff?.mobileNumber || "";
        const email = w.email || staff?.email || "";
        const designation = w.designation || staff?.designation || "Resident Warden";

        return {
          ...w,
          wardenName: wName,
          name: wName,
          employeeId: empId,
          empId,
          phone,
          mobileNumber: phone,
          email,
          designation,
          assignedHostels: blkName,
          hostelName: blkName,
          blockName: blkName,
        };
      });
      return ok(config, { success: true, data: enrichedWardens, items: enrichedWardens });
    }
    if (method === "post") {
      const allFaculty = mockStore.faculty || rawFaculty || [];
      const staff = allFaculty.find((f) => Number(f.staffId || f.id) === Number(body.staffId));
      const blk = (mockStore.blocks || []).find((b) => Number(b.id) === Number(body.hostelId) || String(b.id) === String(body.hostelId));
      const blkName = body.hostelName || body.blockName || body.assignedHostels || blk?.name || (body.hostelId ? `Hostel Block #${body.hostelId}` : "");
      const wName = body.wardenName || body.name || staff?.name || staff?.fullName || "Resident Warden";
      const empId = body.employeeId || body.empId || staff?.employeeId || staff?.empId || (body.staffId ? `EMP-${body.staffId}` : "");
      const phone = body.phone || body.mobileNumber || staff?.phone || staff?.mobileNumber || "";
      const email = body.email || staff?.email || "";
      const designation = body.designation || staff?.designation || "Resident Warden";

      const newWarden = {
        id: mockStore.wardens.length + 1,
        wardenAssignmentId: mockStore.wardens.length + 1,
        ...body,
        wardenName: wName,
        name: wName,
        employeeId: empId,
        empId,
        phone,
        mobileNumber: phone,
        email,
        designation,
        assignedHostels: blkName,
        hostelName: blkName,
        blockName: blkName,
        status: body.status || "Active",
        isActive: true,
      };

      // Also sync block's warden field
      if (blk) {
        blk.warden = wName;
        blk.wardenName = wName;
        blk.wardenPhone = phone;
        blk.primaryMobileNumber = phone;
        blk.email = email || blk.email;
        mockStore.save("hostel_blocks");
      }

      mockStore.wardens.push(newWarden);
      mockStore.save("hostel_wardens");
      return ok(config, { success: true, data: newWarden });
    }
  }
  if (path.startsWith("/api/v1/hostel/wardens/")) {
    const id = Number(path.split("/").pop());
    const w = mockStore.wardens.find((x) => x.id === id || x.wardenAssignmentId === id);
    if (method === "put") {
      if (w) {
        Object.assign(w, body);
        const blk = (mockStore.blocks || []).find((b) => Number(b.id) === Number(w.hostelId));
        if (blk && (w.name || w.wardenName)) {
          blk.warden = w.name || w.wardenName;
          blk.wardenName = w.name || w.wardenName;
          blk.wardenPhone = w.phone || w.mobileNumber;
          mockStore.save("hostel_blocks");
        }
      }
      mockStore.save("hostel_wardens");
      return ok(config, { success: true, data: w });
    }
    if (method === "delete") {
      mockStore.wardens = mockStore.wardens.filter((x) => x.id !== id && x.wardenAssignmentId !== id);
      mockStore.save("hostel_wardens");
      return ok(config, { success: true, message: "Warden unassigned" });
    }
    return ok(config, { success: true, data: w });
  }

  // 9. HOSTEL ALLOCATIONS
  if (path === "/api/v1/hostel/allocations" || path === "/api/v1/hostel/student-allocations") {
    if (method === "get") {
      return ok(config, { success: true, data: mockStore.allocations, items: mockStore.allocations });
    }
    if (method === "post") {
      const newAlloc = {
        id: mockStore.allocations.length + 1,
        allocationId: mockStore.allocations.length + 1,
        ...body,
        joiningDate: body.joiningDate || new Date().toISOString().split("T")[0],
        status: "Active",
        isActive: true,
      };
      mockStore.allocations.push(newAlloc);
      mockStore.save("hostel_allocations");

      // Mark assigned bed as Occupied
      if (newAlloc.bedId) {
        const bd = mockStore.beds.find((b) => Number(b.id || b.bedId) === Number(newAlloc.bedId));
        if (bd) {
          bd.bedStatus = "Occupied";
          mockStore.save("hostel_beds");
        }
      }
      return ok(config, { success: true, message: "Student allocated successfully", data: newAlloc });
    }
  }
  if (path.startsWith("/api/v1/hostel/student-allocations/") || path.startsWith("/api/v1/hostel/allocations/")) {
    const allocId = Number(path.split("/").pop());
    const alloc = mockStore.allocations.find((a) => Number(a.id || a.allocationId) === allocId);
    if (method === "put") {
      if (alloc) Object.assign(alloc, body);
      mockStore.save("hostel_allocations");
      return ok(config, { success: true, data: alloc });
    }
    if (method === "delete") {
      if (alloc) {
        alloc.status = "Vacated";
        alloc.isActive = false;
        // Release bed
        const bedId = alloc.bedId;
        if (bedId) {
          const bd = mockStore.beds.find((b) => Number(b.id || b.bedId) === Number(bedId));
          if (bd) {
            bd.bedStatus = "Available";
            mockStore.save("hostel_beds");
          }
        }
      }
      mockStore.save("hostel_allocations");
      return ok(config, { success: true, message: "Bed vacated successfully" });
    }
    return ok(config, { success: true, data: alloc });
  }

  // 10. HOSTEL OUTPASS & LEAVE
  if (path === "/api/v1/hostel/outpass-leave" || path === "/api/v1/hostel/outpass") {
    if (method === "get") {
      const enrichedOutpasses = (mockStore.outpasses || []).map((o) => {
        const alloc = (mockStore.allocations || []).find(
          (a) =>
            (o.studentId && Number(a.studentId) === Number(o.studentId)) ||
            (o.admissionNo && a.admissionNo === o.admissionNo) ||
            (o.studentName && a.studentName === o.studentName)
        );
        const sName = o.studentName || alloc?.studentName || (o.studentId ? `Student #${o.studentId}` : "Resident Student");
        const admNo = o.admissionNo || alloc?.admissionNo || (o.studentId ? `ADM-2024-00${o.studentId}` : "ADM-001");
        const bName = o.blockName || o.hostelName || alloc?.blockName || alloc?.hostelName || "Boys Hostel 1";
        const rNo = o.roomNumber || o.roomNo || alloc?.roomNumber || alloc?.room || "101";
        const cleanRNo = String(rNo).replace("Room #", "").trim();

        return {
          ...o,
          studentName: sName,
          admissionNo: admNo,
          blockName: bName,
          hostelName: bName,
          roomNo: cleanRNo,
          roomNumber: cleanRNo,
          outpassType: o.outpassType || o.requestType || "Local Outpass",
          requestType: o.requestType || o.outpassType || "Local Outpass",
          status: o.approvalStatus || o.status || "Pending",
          approvalStatus: o.approvalStatus || o.status || "Pending",
        };
      });
      return ok(config, { success: true, data: enrichedOutpasses, items: enrichedOutpasses });
    }
    if (method === "post") {
      const alloc = (mockStore.allocations || []).find(
        (a) =>
          (body.studentId && Number(a.studentId) === Number(body.studentId)) ||
          (body.admissionNo && a.admissionNo === body.admissionNo) ||
          (body.studentName && a.studentName === body.studentName)
      );
      const sName = body.studentName || alloc?.studentName || (body.studentId ? `Student #${body.studentId}` : "Resident Student");
      const admNo = body.admissionNo || alloc?.admissionNo || "ADM-001";
      const bName = body.blockName || body.hostelName || alloc?.blockName || alloc?.hostelName || "Boys Hostel 1";
      const rNo = body.roomNumber || body.roomNo || alloc?.roomNumber || alloc?.room || "101";
      const cleanRNo = String(rNo).replace("Room #", "").trim();

      const depDateStr = body.departureDate || (body.fromDateTime ? String(body.fromDateTime).split("T")[0] : new Date().toISOString().split("T")[0]);
      const retDateStr = body.returnDate || (body.toDateTime ? String(body.toDateTime).split("T")[0] : depDateStr);

      const conflict = (mockStore.outpasses || []).find((op) => {
        const isSame =
          (body.studentId && Number(op.studentId) === Number(body.studentId)) ||
          (admNo && op.admissionNo && String(op.admissionNo).trim().toLowerCase() === String(admNo).trim().toLowerCase()) ||
          (sName && op.studentName && String(op.studentName).trim().toLowerCase() === String(sName).trim().toLowerCase());
        if (!isSame) return false;

        const st = String(op.approvalStatus || op.status || "").toLowerCase();
        const isActive = st === "pending" || st === "approved" || st === "active";
        if (!isActive) return false;

        const opStart = String(op.departureDate || op.outDate || op.fromDateTime || "").split("T")[0];
        const opEnd = String(op.returnDate || op.toDateTime || opStart).split("T")[0] || opStart;
        if (!opStart) return false;

        return depDateStr <= opEnd && retDateStr >= opStart;
      });

      if (conflict) {
        return Promise.reject({
          response: {
            status: 400,
            data: { message: `${sName} already has an active (${conflict.approvalStatus || conflict.status}) outpass for ${depDateStr}. Multiple requests on the same date are not allowed.` },
          },
        });
      }

      const newOut = {
        id: mockStore.outpasses.length + 1,
        requestId: mockStore.outpasses.length + 1,
        ...body,
        studentName: sName,
        admissionNo: admNo,
        blockName: bName,
        hostelName: bName,
        roomNo: cleanRNo,
        roomNumber: cleanRNo,
        outpassType: body.outpassType || body.requestType || "Local Outpass",
        requestType: body.requestType || body.outpassType || "Local Outpass",
        approvalStatus: "Pending",
        status: "Pending",
        departureDate: depDateStr,
        returnDate: retDateStr,
      };
      mockStore.outpasses.push(newOut);
      mockStore.save("hostel_outpasses");
      return ok(config, { success: true, message: "Outpass request submitted", data: newOut });
    }
  }
  if (path.startsWith("/api/v1/hostel/outpass-leave/") || path.startsWith("/api/v1/hostel/outpass/")) {
    const segments = path.split("/");
    const id = Number(segments[5] || segments[4]);
    const target = mockStore.outpasses.find((o) => Number(o.id || o.requestId) === id);

    if (method === "put" || method === "post") {
      if (target) {
        if (body.approvalStatus) {
          target.approvalStatus = body.approvalStatus;
          target.status = body.approvalStatus;
        }
        if (body.approvalRemarks) target.approvalRemarks = body.approvalRemarks;
        Object.assign(target, body);
        mockStore.save("hostel_outpasses");
      }
      return ok(config, { success: true, message: `Outpass status updated`, data: target });
    }
    if (method === "delete") {
      mockStore.outpasses = mockStore.outpasses.filter((o) => Number(o.id || o.requestId) !== id);
      mockStore.save("hostel_outpasses");
      return ok(config, { success: true, message: "Outpass record deleted" });
    }
    return ok(config, { success: true, data: target });
  }

  // 11. HOSTEL TRANSFER & VACATE
  if (path === "/api/v1/hostel/transfer-vacate") {
    if (method === "get") {
      const enrichedTransfers = (mockStore.transfers || []).map((t) => {
        const alloc = (mockStore.allocations || []).find(
          (a) =>
            (t.allocationId && Number(a.id || a.allocationId) === Number(t.allocationId)) ||
            (t.studentId && Number(a.studentId) === Number(t.studentId)) ||
            (t.admissionNo && a.admissionNo === t.admissionNo)
        );
        const sName = t.studentName || alloc?.studentName || (t.studentId ? `Student #${t.studentId}` : "Resident Student");
        const admNo = t.admissionNo || alloc?.admissionNo || (t.studentId ? `ADM-2024-00${t.studentId}` : "ADM-001");
        const fromB = t.fromHostelName || t.currentBlock || alloc?.blockName || alloc?.hostelName || "Boys Hostel 1";
        const fromR = t.fromRoomNumber || t.currentRoom || alloc?.roomNumber || alloc?.room || "101";
        const cleanFromR = String(fromR).replace("Room #", "").trim();
        const actType = t.actionType || (t.requestType === "Vacate" ? "Bed Vacate" : "Room Transfer");

        return {
          ...t,
          studentName: sName,
          admissionNo: admNo,
          actionType: actType,
          requestType: t.requestType || (actType === "Bed Vacate" ? "Vacate" : "Transfer"),
          currentBlock: fromB,
          fromHostelName: fromB,
          currentRoom: cleanFromR,
          fromRoomNumber: cleanFromR,
          currentRoomDisplay: `${fromB} (#${cleanFromR})`,
          targetDisplayTitle: t.targetDisplayTitle || (actType === "Bed Vacate" ? "✓ Old Bed Released to Available" : `New Bed: ${t.toHostelName || fromB} (#${t.toRoomNumber || "102"})`),
          status: t.approvalStatus || t.status || "Pending",
          approvalStatus: t.approvalStatus || t.status || "Pending",
        };
      });
      return ok(config, { success: true, data: enrichedTransfers, items: enrichedTransfers });
    }
    if (method === "post") {
      const isVacate = body.actionType === "Bed Vacate" || body.requestType === "Vacate";
      const alloc = (mockStore.allocations || []).find(
        (a) =>
          (body.allocationId && Number(a.id || a.allocationId) === Number(body.allocationId)) ||
          (body.studentId && Number(a.studentId) === Number(body.studentId)) ||
          (body.admissionNo && a.admissionNo === body.admissionNo)
      );
      const sName = body.studentName || alloc?.studentName || (body.studentId ? `Student #${body.studentId}` : "Resident Student");
      const admNo = body.admissionNo || alloc?.admissionNo || "ADM-001";
      const fromB = body.fromHostelName || body.currentBlock || alloc?.blockName || "Boys Hostel 1";
      const fromR = body.fromRoomNumber || body.currentRoom || alloc?.roomNumber || "101";
      const cleanFromR = String(fromR).replace("Room #", "").trim();

      const newReq = {
        id: mockStore.transfers.length + 1,
        requestId: mockStore.transfers.length + 1,
        ...body,
        studentName: sName,
        admissionNo: admNo,
        actionType: isVacate ? "Bed Vacate" : "Room Transfer",
        requestType: isVacate ? "Vacate" : "Transfer",
        fromHostelName: fromB,
        currentBlock: fromB,
        fromRoomNumber: cleanFromR,
        currentRoom: cleanFromR,
        currentRoomDisplay: `${fromB} (#${cleanFromR})`,
        targetDisplayTitle: isVacate ? "✓ Old Bed Released to Available" : `New Bed: ${body.toHostelName || fromB} (#${body.toRoomNumber || "102"})`,
        approvalStatus: "Pending",
        status: "Pending",
        requestDate: new Date().toISOString().split("T")[0],
        date: new Date().toISOString().split("T")[0],
      };
      mockStore.transfers.push(newReq);
      mockStore.save("hostel_transfers");
      return ok(config, { success: true, message: "Request created", data: newReq });
    }
  }
  if (path.startsWith("/api/v1/hostel/transfer-vacate/")) {
    const segments = path.split("/");
    const id = Number(segments[5] || segments[4]);
    const target = mockStore.transfers.find((t) => Number(t.id || t.requestId) === id);

    const completeAction = () => {
      if (!target) return;
      const isVacate = target.actionType === "Bed Vacate" || target.requestType === "Vacate";
      if (isVacate) {
        // 1. Mark student allocation as Vacated
        const alloc = (mockStore.allocations || []).find(
          (a) =>
            (target.allocationId && Number(a.id || a.allocationId) === Number(target.allocationId)) ||
            (target.studentId && Number(a.studentId) === Number(target.studentId)) ||
            (target.admissionNo && a.admissionNo === target.admissionNo)
        );
        if (alloc) {
          alloc.status = "Vacated";
          alloc.isActive = false;
          // 2. Mark bed as Available
          const bedId = target.fromBedId || alloc.bedId;
          if (bedId) {
            const bd = (mockStore.beds || []).find((b) => Number(b.id || b.bedId) === Number(bedId));
            if (bd) {
              bd.bedStatus = "Available";
              mockStore.save("hostel_beds");
            }
          }
          mockStore.save("hostel_allocations");
        }
      } else {
        // Room Transfer
        const alloc = (mockStore.allocations || []).find(
          (a) =>
            (target.allocationId && Number(a.id || a.allocationId) === Number(target.allocationId)) ||
            (target.studentId && Number(a.studentId) === Number(target.studentId))
        );
        if (alloc) {
          if (target.fromBedId) {
            const oldBed = (mockStore.beds || []).find((b) => Number(b.id || b.bedId) === Number(target.fromBedId));
            if (oldBed) oldBed.bedStatus = "Available";
          }
          if (target.toBedId) {
            const newBed = (mockStore.beds || []).find((b) => Number(b.id || b.bedId) === Number(target.toBedId));
            if (newBed) newBed.bedStatus = "Occupied";
            alloc.bedId = target.toBedId;
            alloc.bedNumber = target.toBedNumber || newBed?.bedNumber;
          }
          if (target.toHostelId) alloc.hostelId = target.toHostelId;
          if (target.toHostelName) alloc.blockName = target.toHostelName;
          if (target.toRoomId) alloc.roomId = target.toRoomId;
          if (target.toRoomNumber) alloc.room = target.toRoomNumber;
          mockStore.save("hostel_beds");
          mockStore.save("hostel_allocations");
        }
      }
    };

    if (path.endsWith("/approval")) {
      if (target) {
        target.approvalStatus = body.approvalStatus || "Approved";
        target.status = body.approvalStatus || "Approved";
        if (body.approvalStatus === "Approved") {
          completeAction();
        }
        mockStore.save("hostel_transfers");
      }
      return ok(config, { success: true, message: `Request status updated`, data: target });
    }
    if (path.endsWith("/complete")) {
      if (target) {
        target.status = "Completed";
        target.approvalStatus = "Approved";
        completeAction();
        mockStore.save("hostel_transfers");
      }
      return ok(config, { success: true, message: `Request completed`, data: target });
    }
    if (method === "delete") {
      mockStore.transfers = mockStore.transfers.filter((t) => Number(t.id || t.requestId) !== id);
      mockStore.save("hostel_transfers");
      return ok(config, { success: true, message: "Transfer record deleted" });
    }
    if (method === "put") {
      if (target) Object.assign(target, body);
      mockStore.save("hostel_transfers");
      return ok(config, { success: true, data: target });
    }
    return ok(config, { success: true, data: target });
  }

  // 12. HOSTEL DASHBOARD STATS
  if (path === "/api/v1/hostel/dashboard") {
    const activeAllocs = (mockStore.allocations || []).filter(
      (a) => a.status === "Active" || a.status === "Allocated"
    );
    const totalBedsCount = mockStore.beds.length;
    const occupiedCount = activeAllocs.length;
    const availableCount = Math.max(0, totalBedsCount - occupiedCount);
    const occPct = totalBedsCount > 0 ? Math.round((occupiedCount / totalBedsCount) * 100) : 0;
    const rev = activeAllocs.reduce(
      (sum, a) => sum + (parseFloat(String(a.monthlyFee || "").replace(/[^0-9.]/g, "")) || 0),
      0
    );

    const stats = {
      totalBlocks: mockStore.hostelBlocks.length,
      totalRooms: mockStore.rooms.length,
      totalBeds: totalBedsCount,
      occupiedBeds: occupiedCount,
      availableBeds: availableCount,
      occupancyPercentage: occPct,
      occupancyRate: `${occPct}%`,
      activeWardens: (mockStore.wardens || []).filter((w) => w.status === "Active").length,
      hostellers: occupiedCount,
      monthlyRevenue: rev,
      pendingOutpasses: (mockStore.outpasses || []).filter(
        (o) => o.status === "Pending" || o.approvalStatus === "Pending"
      ).length,
      totalComplaints: 0,
      feeCollectionRate: "100%",
    };
    return ok(config, { success: true, data: stats });
  }

  // 13. HOSTEL ATTENDANCE
  if (path === "/api/v1/hostel/attendance") {
    if (method === "get") {
      return ok(config, { success: true, data: mockStore.attendance, items: mockStore.attendance });
    }
    if (method === "post") {
      if (Array.isArray(body)) {
        mockStore.attendance = body;
      } else {
        mockStore.attendance.push(body);
      }
      mockStore.save("hostel_attendance");
      return ok(config, { success: true, message: "Attendance saved successfully" });
    }
  }

  // 14. STAFF & DROPDOWNS
  if (path === "/api/v1/staff" || path === "/api/v1/staff/dropdown") {
    let list = mockStore.staff;
    const dept = params.get("Department") || params.get("department");
    const sType = params.get("staffType") || params.get("StaffType");
    if (dept) {
      list = list.filter((s) => String(s.department || "").toLowerCase().includes(dept.toLowerCase()));
    }
    if (sType) {
      list = list.filter((s) => String(s.staffType || "").toLowerCase() === sType.toLowerCase());
    }
    return ok(config, {
      success: true,
      data: list,
      items: list,
      totalCount: list.length,
    });
  }

  // 15. STUDENTS & DROPDOWNS
  if (
    path === "/api/v1/students" ||
    path === "/api/v1/students/active" ||
    path === "/api/v1/student-admissions" ||
    path === "/api/v1/certificates/students-dropdown"
  ) {
    return ok(config, {
      success: true,
      data: mockStore.students,
      items: mockStore.students,
      totalCount: mockStore.students.length,
    });
  }

  // 16. NUMBER SERIES (/api/v1/settings/number-series/* or /api/v1/number-series/*)
  const numSeriesMatch = path.match(/^\/api\/v1\/(?:settings\/)?number-series(?:\/([^/]+))?(?:\/generate-next)?$/i);
  if (numSeriesMatch) {
    const seriesCode = numSeriesMatch[1] || "EXAM_CODE";
    const isGenerateNext = path.endsWith("/generate-next");

    if (method === "post" && isGenerateNext) {
      const year = new Date().getFullYear();
      const currentExams = mockStore.examinations || [];
      const nextSeq = currentExams.length + 1;
      const generatedCode = `EXM-${year}-${String(nextSeq).padStart(4, "0")}`;
      return ok(config, {
        success: true,
        data: {
          seriesCode,
          generatedNumber: generatedCode,
          generatedCode: generatedCode,
          code: generatedCode,
          nextSequence: nextSeq + 1,
        },
      });
    }

    if (method === "get") {
      const year = new Date().getFullYear();
      const nextSeq = (mockStore.examinations || []).length + 1;
      const preview = `EXM-${year}-${String(nextSeq).padStart(4, "0")}`;
      if (seriesCode && seriesCode !== "all") {
        return ok(config, {
          success: true,
          data: {
            seriesCode,
            name: "Examination Code",
            prefix: "EXM",
            formatPattern: "EXM-{YEAR}-{SEQ}",
            numberLength: 4,
            currentSequence: nextSeq - 1,
            startNumber: 1,
            livePreview: preview,
            nextCode: preview,
            preview: preview,
            isActive: true,
          },
        });
      }
      return ok(config, {
        success: true,
        data: [
          {
            seriesCode: "EXAM_CODE",
            name: "Examination Code",
            formatPattern: "EXM-{YEAR}-{SEQ}",
            numberLength: 4,
            currentSequence: nextSeq - 1,
            livePreview: preview,
            nextCode: preview,
            isActive: true,
          },
        ],
      });
    }
  }

  // 17. BOARDS (/api/v1/boards, /api/v1/boards/active)
  if (path === "/api/v1/boards" || path === "/api/v1/boards/active") {
    return ok(config, {
      success: true,
      data: mockStore.boards,
      items: mockStore.boards,
      totalCount: mockStore.boards.length,
    });
  }
  const singleBoardMatch = path.match(/^\/api\/v1\/boards\/(\d+)$/);
  if (singleBoardMatch) {
    const bId = Number(singleBoardMatch[1]);
    const b = mockStore.boards.find((x) => Number(x.id || x.boardId) === bId) || mockStore.boards[0];
    return ok(config, { success: true, data: b });
  }

  // 18. ACADEMIC YEARS (/api/v1/academic-years, /api/v1/academic-years/active)
  if (path === "/api/v1/academic-years" || path === "/api/v1/academic-years/active") {
    let list = mockStore.academicYears;
    const boardId = params.get("boardId") || params.get("BoardId");
    if (boardId) {
      list = list.filter((y) => !y.boardId || String(y.boardId) === String(boardId));
    }
    return ok(config, {
      success: true,
      data: list,
      items: list,
      totalCount: list.length,
    });
  }

  // 19. ACADEMIC LEVELS (/api/v1/academic-levels)
  if (path === "/api/v1/academic-levels") {
    return ok(config, {
      success: true,
      data: mockStore.academicLevels,
      items: mockStore.academicLevels,
      totalCount: mockStore.academicLevels.length,
    });
  }

  // 20. ROOMS & HALLS (/api/v1/rooms, /api/v1/rooms/active)
  if (path === "/api/v1/rooms" || path === "/api/v1/rooms/active") {
    let list = mockStore.examRooms;
    const campusId = params.get("campusId") || params.get("CampusId") || config.headers?.["X-Campus-Id"];
    if (campusId) {
      list = list.filter((r) => !r.campusId || String(r.campusId) === String(campusId));
    }
    return ok(config, {
      success: true,
      data: list,
      items: list,
      totalCount: list.length,
    });
  }

  // 21. EXAMINATION PATTERNS & TYPES
  if (path === "/api/v1/examinations/patterns") {
    return ok(config, {
      success: true,
      data: mockStore.masterPatterns,
      items: mockStore.masterPatterns,
      totalCount: mockStore.masterPatterns.length,
    });
  }
  if (path === "/api/v1/examinations/types") {
    return ok(config, {
      success: true,
      data: mockStore.examTypes,
      items: mockStore.examTypes,
      totalCount: mockStore.examTypes.length,
    });
  }

  // 22. AVAILABLE HALLS (/api/v1/examinations/available-halls)
  if (path === "/api/v1/examinations/available-halls") {
    const qDate = params.get("date") || params.get("examDate");
    const qStart = params.get("startTime") || "09:00:00";
    const qEnd = params.get("endTime") || "12:00:00";
    const campusId = params.get("campusId") || config.headers?.["X-Campus-Id"] || 1;
    const excludeExamId = params.get("excludeExamId");

    const roomsList = mockStore.examRooms.filter((r) => !r.campusId || String(r.campusId) === String(campusId));
    const allSchedules = mockStore.examSchedules || [];

    const occupiedRoomIds = new Set();
    if (qDate) {
      allSchedules.forEach((s) => {
        if (excludeExamId && String(s.examId || s.examinationId) === String(excludeExamId)) return;
        const sDate = s.date || s.examDate || s.scheduleDate;
        if (sDate && String(sDate).split("T")[0] === String(qDate).split("T")[0]) {
          const sStart = s.startTime || "09:00:00";
          const sEnd = s.endTime || "12:00:00";
          const parseMin = (t) => {
            const [h = 0, m = 0] = String(t).split(":").map(Number);
            return h * 60 + m;
          };
          const overlap = parseMin(qStart) < parseMin(sEnd) && parseMin(qEnd) > parseMin(sStart);
          if (overlap) {
            if (s.roomId) occupiedRoomIds.add(Number(s.roomId));
            if (s.hallId) occupiedRoomIds.add(Number(s.hallId));
            if (Array.isArray(s.hallAssignments)) {
              s.hallAssignments.forEach((h) => {
                if (h.hallId) occupiedRoomIds.add(Number(h.hallId));
                if (h.roomId) occupiedRoomIds.add(Number(h.roomId));
              });
            }
          }
        }
      });
    }

    const availableHalls = roomsList.map((r) => {
      const isOccupied = occupiedRoomIds.has(Number(r.id || r.roomId));
      return {
        ...r,
        hallId: r.id || r.roomId,
        roomId: r.id || r.roomId,
        hallName: r.name || r.roomName || r.roomNumber,
        isAvailable: !isOccupied,
        available: !isOccupied,
        status: isOccupied ? "Occupied" : "Available",
      };
    });

    return ok(config, {
      success: true,
      data: availableHalls,
      items: availableHalls,
      totalCount: availableHalls.length,
    });
  }

  // 23. PROGRAMS (/api/v1/programs, /api/v1/groups/:id/programs)
  const groupProgramsMatch = path.match(/^\/api\/v1\/groups\/(\d+)\/programs$/);
  if (groupProgramsMatch) {
    const gid = Number(groupProgramsMatch[1]);
    const list = mockStore.programs.filter((p) => Number(p.groupId) === gid);
    return ok(config, { success: true, data: list, items: list });
  }
  if (path === "/api/v1/programs") {
    return ok(config, {
      success: true,
      data: mockStore.programs,
      items: mockStore.programs,
      totalCount: mockStore.programs.length,
    });
  }

  // 24. GROUPS BOARD (/api/v1/groups/board/:id)
  const boardGroupsMatch = path.match(/^\/api\/v1\/groups\/board\/(\d+)$/);
  if (boardGroupsMatch) {
    const bId = Number(boardGroupsMatch[1]);
    const list = mockStore.courses.filter((c) => !c.boardId || Number(c.boardId) === bId);
    return ok(config, { success: true, data: list, items: list });
  }

  // 25. AUTO SCHEDULE POST (/api/v1/examinations/:id/auto-schedule)
  const autoScheduleMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/auto-schedule$/);
  if (autoScheduleMatch && method === "post") {
    const examId = Number(autoScheduleMatch[1]);
    const ex = mockStore.examinations.find((e) => String(e.id) === String(examId) || String(e.examinationId) === String(examId));
    if (!ex) return ok(config, { success: false, message: "Examination not found." });

    const groupId = Number(body.groupId) || Number(ex.groupIds?.[0] || ex.groupId || 1);
    const eligibleSubjects = mockStore.subjects.filter((s) => {
      if (Array.isArray(s.groupIds)) return s.groupIds.map(Number).includes(groupId);
      return !s.groupId || Number(s.groupId) === groupId;
    });

    if (body.replaceExisting) {
      mockStore.examSchedules = mockStore.examSchedules.filter(
        (s) => !(String(s.examId) === String(examId) && Number(s.groupId) === groupId)
      );
    }

    const startDateStr = ex.startDate || new Date().toISOString().split("T")[0];
    let currDate = new Date(startDateStr);
    const createdSchedules = [];
    let nextSchId = mockStore.examSchedules.reduce((max, s) => Math.max(max, Number(s.id || s.examScheduleId || 0)), 0) + 1;

    const availableFaculty = mockStore.staff.filter((s) => !String(s.staffType || "").toLowerCase().includes("non"));
    const availableRooms = mockStore.examRooms;

    eligibleSubjects.forEach((sub, idx) => {
      while (currDate.getDay() === 0) {
        currDate.setDate(currDate.getDate() + 1);
      }
      const dateIso = currDate.toISOString().split("T")[0];
      const room = availableRooms[idx % availableRooms.length] || availableRooms[0];
      const fac = availableFaculty[idx % availableFaculty.length] || availableFaculty[0];

      const sch = {
        id: nextSchId,
        examScheduleId: nextSchId,
        examId: examId,
        examinationId: examId,
        subjectId: Number(sub.id || sub.subjectId),
        subjectName: sub.name || sub.subjectName,
        subjectCode: sub.code || sub.subjectCode,
        groupId: groupId,
        academicLevelId: Number(body.academicLevelId) || 1,
        date: dateIso,
        examDate: dateIso,
        scheduleDate: dateIso,
        startTime: body.defaultStartTime || "09:00:00",
        endTime: body.defaultEndTime || "12:00:00",
        roomId: Number(room.id || room.roomId),
        roomName: room.name || room.roomName,
        roomNumber: room.roomNumber || room.name,
        hall: room.name || room.roomName,
        invigilatorId: Number(fac.id),
        invigilatorName: fac.name,
        invigilator: fac.name,
        totalMarks: Number(sub.maxMarks || sub.max || 100),
        passingMarks: Number(sub.passingMarks || sub.pass || 35),
        candidateCount: 60,
        status: "Scheduled",
        hallAssignments: [
          {
            hallId: Number(room.id || room.roomId),
            roomId: Number(room.id || room.roomId),
            roomName: room.name || room.roomName,
            roomNumber: room.roomNumber || room.name,
            candidateCount: 60,
            invigilatorId: Number(fac.id),
            invigilatorName: fac.name,
            invigilatorIds: [Number(fac.id)],
          },
        ],
      };
      nextSchId++;
      mockStore.examSchedules.push(sch);
      createdSchedules.push(sch);

      currDate.setDate(currDate.getDate() + 1);
    });

    mockStore.save("exam_schedules");
    return ok(config, {
      success: true,
      message: `Auto-scheduled ${createdSchedules.length} subjects successfully.`,
      data: createdSchedules,
      items: createdSchedules,
    });
  }

  // 26. BATCH SCHEDULES POST (/api/v1/examinations/:id/schedules/batch)
  const batchScheduleMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/schedules\/batch$/);
  if (batchScheduleMatch && method === "post") {
    const examId = Number(batchScheduleMatch[1]);
    const subIds = Array.isArray(body.subjectIds) ? body.subjectIds : (body.subjectId ? [body.subjectId] : [1]);
    const maxSchId = mockStore.examSchedules.reduce((max, s) => Math.max(max, Number(s.id || s.examScheduleId || 0)), 0);
    const created = [];
    let nextId = maxSchId + 1;

    subIds.forEach((sId) => {
      const subObj = mockStore.subjects.find((s) => Number(s.id || s.subjectId) === Number(sId)) || {};
      const schRecord = {
        ...body,
        id: nextId,
        examScheduleId: nextId,
        examId: examId,
        examinationId: examId,
        subjectId: Number(sId),
        subjectName: subObj.name || subObj.subjectName || "Subject",
        subjectCode: subObj.code || subObj.subjectCode || "",
        date: body.examDate || body.date,
        examDate: body.examDate || body.date,
        startTime: body.startTime || "09:00:00",
        endTime: body.endTime || "12:00:00",
        status: "Scheduled",
      };
      nextId++;
      mockStore.examSchedules.push(schRecord);
      created.push(schRecord);
    });

    mockStore.save("exam_schedules");
    return ok(config, { success: true, data: created, items: created });
  }

  // 27. HALL TICKETS
  if (path.startsWith("/api/v1/examinations/halltickets")) {
    const isGenerate = path.endsWith("/generate");
    const isBatchDownload = path.endsWith("/batch-download");

    if (method === "post" && isGenerate) {
      const examId = Number(body.examId || body.examinationId);
      const ex = mockStore.examinations.find((e) => Number(e.id || e.examinationId) === examId) || mockStore.examinations[0];
      const exSchedules = mockStore.examSchedules.filter((s) => Number(s.examId || s.examinationId) === examId);
      const sampleStudents = mockStore.students.slice(0, 5);

      const generatedTickets = sampleStudents.map((st, i) => ({
        id: `ht-${examId}-${st.id}`,
        hallTicketId: `ht-${examId}-${st.id}`,
        hallTicketNumber: `HT-${new Date().getFullYear()}-${String(st.id).padStart(4, "0")}`,
        examId: examId,
        examinationId: examId,
        examName: ex.name,
        examCode: ex.code,
        studentId: st.id,
        studentName: st.name,
        admissionNo: st.admissionNo,
        rollNumber: st.roll || `26010${i + 1}`,
        groupName: st.group || "MPC",
        academicLevelName: st.level || "1st Year",
        schedules: exSchedules,
        status: "Generated",
        generatedAt: new Date().toISOString(),
      }));

      mockStore.hallTickets = generatedTickets;
      mockStore.save("hall_tickets");
      return ok(config, { success: true, message: "Hall tickets generated successfully.", data: generatedTickets, items: generatedTickets });
    }

    if (method === "post" && isBatchDownload) {
      return ok(config, { success: true, message: "Batch download prepared successfully." });
    }

    const examId = Number(params.get("examId") || params.get("examinationId"));
    let tickets = mockStore.hallTickets || [];
    if (examId) {
      tickets = tickets.filter((t) => Number(t.examId || t.examinationId) === examId);
    }
    return ok(config, { success: true, data: tickets, items: tickets, totalCount: tickets.length });
  }

  // 28. EXAMINATIONS CRUD & FILTERING
  if (path === "/api/v1/examinations") {
    if (method === "get") {
      let exams = [...mockStore.examinations];
      const campusId = params.get("campusId") || config.headers?.["X-Campus-Id"];
      const boardId = params.get("boardId");
      const academicYearId = params.get("AcademicYearId") || params.get("academicYearId");
      const status = params.get("status") || params.get("Status");
      const search = params.get("search") || params.get("searchTerm") || params.get("SearchTerm");

      if (campusId) {
        exams = exams.filter((e) => !e.campusId || String(e.campusId) === String(campusId));
      }
      if (boardId) {
        exams = exams.filter((e) => !e.boardId || String(e.boardId) === String(boardId));
      }
      if (academicYearId) {
        exams = exams.filter((e) => {
          const yId = e.academicYearId || e.yearId;
          return !yId || String(yId) === String(academicYearId);
        });
      }
      if (status) {
        exams = exams.filter((e) => String(e.status || "").toUpperCase() === String(status).toUpperCase());
      }
      if (search) {
        const q = String(search).trim().toLowerCase();
        exams = exams.filter((e) =>
          String(e.name || e.examName || "").toLowerCase().includes(q) ||
          String(e.code || e.examCode || "").toLowerCase().includes(q)
        );
      }

      // Enrich exams with their schedules from mockStore.examSchedules
      exams = exams.map((ex) => {
        const exSchedules = (mockStore.examSchedules || []).filter(
          (s) => String(s.examId) === String(ex.id) || String(s.examinationId) === String(ex.id)
        );
        return {
          ...ex,
          schedules: exSchedules,
          examinationSchedules: exSchedules,
          scheduledSubjectsCount: exSchedules.length,
        };
      });

      return ok(config, {
        success: true,
        data: exams,
        items: exams,
        totalCount: exams.length,
      });
    }

    if (method === "post") {
      const maxId = mockStore.examinations.reduce((max, e) => Math.max(max, Number(e.id || e.examinationId || 0)), 0);
      const newId = maxId + 1;
      const genCode = body.examCode || body.code || `EXM-${new Date().getFullYear()}-${String(newId).padStart(4, "0")}`;
      const newExam = {
        ...body,
        id: newId,
        examinationId: newId,
        examId: newId,
        campusId: Number(body.campusId) || 1,
        examCode: genCode,
        code: genCode,
        name: body.examName || body.name || "New Examination",
        examName: body.examName || body.name || "New Examination",
        boardId: Number(body.boardId) || 1,
        academicYearId: Number(body.academicYearId || body.yearId) || 6,
        yearId: Number(body.academicYearId || body.yearId) || 6,
        academicLevelIds: Array.isArray(body.academicLevelIds) ? body.academicLevelIds : (body.academicLevelId ? [body.academicLevelId] : [1]),
        groupIds: Array.isArray(body.groupIds) ? body.groupIds : (body.groupId ? [body.groupId] : [1]),
        programIds: Array.isArray(body.programIds) ? body.programIds : (body.programId ? [body.programId] : [1]),
        selectedSubjectIds: Array.isArray(body.selectedSubjectIds) ? body.selectedSubjectIds : [],
        groupProgramSelections: body.groupProgramSelections || [],
        selectedGroupPatterns: body.selectedGroupPatterns || {},
        examType: body.examType || "Regular Exam",
        assessmentTypeId: Number(body.assessmentTypeId) || 1,
        examCategory: body.examCategory || body.category || "Regular",
        category: body.examCategory || body.category || "Regular",
        customCategoryName: body.customCategoryName || "",
        examPattern: body.examPattern || body.pattern || "Regular Academic Pattern",
        scheduleMode: body.scheduleMode || (body.examCategory === "Objective" ? "PATTERN_WISE" : "SUBJECT_WISE"),
        startDate: body.startDate || new Date().toISOString().split("T")[0],
        endDate: body.endDate || new Date().toISOString().split("T")[0],
        totalMarks: Number(body.totalMarks) || 300,
        passingMarks: Number(body.passingMarks) || 105,
        passPercentage: Number(body.passPercentage) || 35,
        status: body.status || "DRAFT",
        description: body.description || "",
        schedules: [],
        examinationSchedules: [],
      };
      mockStore.examinations.unshift(newExam);
      mockStore.save("examinations");
      return ok(config, { success: true, message: "Examination created successfully", data: newExam });
    }
  }

  // 29. EXAMINATION SCHEDULES CRUD
  const examSchedulesMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/schedules(?:\/(\d+))?$/);
  if (examSchedulesMatch) {
    const examId = Number(examSchedulesMatch[1]);
    const scheduleId = examSchedulesMatch[2] ? Number(examSchedulesMatch[2]) : null;

    if (method === "get") {
      const schedules = (mockStore.examSchedules || []).filter(
        (s) => String(s.examId) === String(examId) || String(s.examinationId) === String(examId)
      );
      return ok(config, { success: true, data: schedules, items: schedules, totalCount: schedules.length });
    }

    if (method === "post") {
      const maxSchId = mockStore.examSchedules.reduce((max, s) => Math.max(max, Number(s.id || s.examScheduleId || 0)), 0);
      let itemsToInsert = [];
      if (Array.isArray(body)) {
        itemsToInsert = body;
      } else if (Array.isArray(body.schedules)) {
        itemsToInsert = body.schedules;
      } else if (body && typeof body === "object") {
        itemsToInsert = [body];
      }

      const created = [];
      let nextId = maxSchId + 1;
      itemsToInsert.forEach((item) => {
        const hallAssignments = Array.isArray(item.hallAssignments) && item.hallAssignments.length > 0
          ? item.hallAssignments
          : (item.roomId || item.hallId ? [
              {
                hallId: item.hallId || item.roomId,
                roomId: item.hallId || item.roomId,
                roomName: item.roomName || item.hall || item.roomNumber || `Hall-${item.roomId}`,
                candidateCount: Number(item.candidateCount) || 60,
                invigilatorId: item.invigilatorId || 1,
                invigilatorName: item.invigilatorName || item.invigilator || "Invigilator",
                invigilatorIds: item.invigilatorId ? [item.invigilatorId] : [1],
              }
            ] : []);

        const schRecord = {
          ...item,
          id: nextId,
          examScheduleId: nextId,
          examId: examId,
          examinationId: examId,
          date: item.examDate || item.date,
          examDate: item.examDate || item.date,
          scheduleDate: item.examDate || item.date,
          startTime: item.startTime || "09:00:00",
          endTime: item.endTime || "12:00:00",
          status: item.status || "Scheduled",
          hallAssignments,
        };
        nextId++;
        mockStore.examSchedules.push(schRecord);
        created.push(schRecord);
      });
      mockStore.save("exam_schedules");
      return ok(config, { success: true, data: created.length === 1 ? created[0] : created });
    }

    if (method === "put" && scheduleId) {
      const idx = mockStore.examSchedules.findIndex(
        (s) => Number(s.id) === scheduleId || Number(s.examScheduleId) === scheduleId
      );
      if (idx !== -1) {
        mockStore.examSchedules[idx] = {
          ...mockStore.examSchedules[idx],
          ...body,
          id: scheduleId,
          examScheduleId: scheduleId,
          examId: examId,
          examinationId: examId,
          date: body.examDate || body.date || mockStore.examSchedules[idx].date,
          examDate: body.examDate || body.date || mockStore.examSchedules[idx].examDate,
          scheduleDate: body.examDate || body.date || mockStore.examSchedules[idx].scheduleDate,
        };
        mockStore.save("exam_schedules");
        return ok(config, { success: true, data: mockStore.examSchedules[idx] });
      }
      return ok(config, { success: true, data: body });
    }

    if (method === "delete" && scheduleId) {
      mockStore.examSchedules = mockStore.examSchedules.filter(
        (s) => Number(s.id) !== scheduleId && Number(s.examScheduleId) !== scheduleId
      );
      mockStore.save("exam_schedules");
      return ok(config, { success: true, message: "Schedule deleted successfully." });
    }
  }

  // 30. FINALIZE, PUBLISH, CANCEL
  const finalizeMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/finalize-schedule$/);
  if (finalizeMatch) {
    const examId = Number(finalizeMatch[1]);
    const ex = mockStore.examinations.find((e) => String(e.id) === String(examId) || String(e.examinationId) === String(examId));
    if (ex) {
      ex.status = "SCHEDULED";
      mockStore.save("examinations");
    }
    return ok(config, { success: true, message: "Schedule finalized successfully." });
  }

  const publishMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/schedules\/publish$/);
  if (publishMatch) {
    const examId = Number(publishMatch[1]);
    const ex = mockStore.examinations.find((e) => String(e.id) === String(examId) || String(e.examinationId) === String(examId));
    if (ex) {
      ex.status = "PUBLISHED";
      mockStore.save("examinations");
    }
    return ok(config, { success: true, message: "Schedules published successfully." });
  }

  const cancelMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/cancel$/);
  if (cancelMatch) {
    const examId = Number(cancelMatch[1]);
    const ex = mockStore.examinations.find((e) => String(e.id) === String(examId) || String(e.examinationId) === String(examId));
    if (ex) {
      ex.status = "CANCELLED";
      mockStore.save("examinations");
    }
    return ok(config, { success: true, message: "Examination cancelled." });
  }

  const eligibleSubjectsMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/eligible-subjects$/);
  if (eligibleSubjectsMatch) {
    const examId = Number(eligibleSubjectsMatch[1]);
    const ex = mockStore.examinations.find((e) => String(e.id) === String(examId) || String(e.examinationId) === String(examId));
    let subs = mockStore.subjects || rawSubjects;
    if (ex && Array.isArray(ex.groupIds) && ex.groupIds.length > 0) {
      subs = subs.filter((s) => {
        if (Array.isArray(s.groupIds)) return s.groupIds.some((gid) => ex.groupIds.map(Number).includes(Number(gid)));
        return !s.groupId || ex.groupIds.map(Number).includes(Number(s.groupId));
      });
    }
    return ok(config, { success: true, data: subs, items: subs });
  }

  const schedContextMatch = path.match(/^\/api\/v1\/examinations\/(\d+)\/scheduling-context$/);
  if (schedContextMatch) {
    return ok(config, {
      success: true,
      data: {
        eligibleSections: [{ id: 1, sectionId: 1, name: "Section A", sectionName: "Section A" }],
        activeStudentsCount: 60,
        requiredCapacity: 60,
      },
    });
  }

  // 31. SINGLE EXAMINATION DETAILS, UPDATE, DELETE
  const singleExamMatch = path.match(/^\/api\/v1\/examinations\/(\d+)$/);
  if (singleExamMatch) {
    const examId = Number(singleExamMatch[1]);
    const ex = mockStore.examinations.find((e) => String(e.id) === String(examId) || String(e.examinationId) === String(examId));
    if (method === "get") {
      if (ex) {
        const exSchedules = (mockStore.examSchedules || []).filter(
          (s) => String(s.examId) === String(examId) || String(s.examinationId) === String(examId)
        );
        return ok(config, {
          success: true,
          data: {
            ...ex,
            schedules: exSchedules,
            examinationSchedules: exSchedules,
          },
        });
      }
      return ok(config, { success: true, data: mockStore.examinations[0] || null });
    }
    if (method === "put") {
      if (ex) {
        Object.assign(ex, body);
        mockStore.save("examinations");
        return ok(config, { success: true, data: ex });
      }
      return ok(config, { success: true, data: body });
    }
    if (method === "delete") {
      mockStore.examinations = mockStore.examinations.filter(
        (e) => String(e.id) !== String(examId) && String(e.examinationId) !== String(examId)
      );
      mockStore.examSchedules = mockStore.examSchedules.filter(
        (s) => String(s.examId) !== String(examId) && String(s.examinationId) !== String(examId)
      );
      mockStore.save("examinations");
      mockStore.save("exam_schedules");
      return ok(config, { success: true, message: "Examination deleted." });
    }
  }

  if (path.startsWith("/api/v1/exam-schedules")) {
    return ok(config, { success: true, data: mockStore.examSchedules, items: mockStore.examSchedules });
  }

  // 32. COURSES, GROUPS, SECTIONS, SUBJECTS
  if (path === "/api/v1/groups" || path === "/api/v1/courses") {
    return ok(config, { success: true, data: mockStore.courses || rawCourses, items: mockStore.courses || rawCourses });
  }
  if (path === "/api/v1/sections") {
    return ok(config, { success: true, data: mockStore.sections || rawSections, items: mockStore.sections || rawSections });
  }
  if (path === "/api/v1/subjects" || path === "/api/v1/subjects/context") {
    return ok(config, { success: true, data: mockStore.subjects || rawSubjects, items: mockStore.subjects || rawSubjects });
  }

  // 18. FEES & COLLECTIONS
  if (path.startsWith("/api/v1/fees")) {
    return ok(config, { success: true, data: rawFees, items: rawFees });
  }

  // 19. TRANSPORT
  if (path === "/api/v1/transport/routes") {
    return ok(config, { success: true, data: transportRoutes, items: transportRoutes });
  }
  if (path === "/api/v1/transport/vehicles") {
    return ok(config, { success: true, data: transportVehicles, items: transportVehicles });
  }
  if (path === "/api/v1/transport/drivers") {
    return ok(config, { success: true, data: transportDrivers, items: transportDrivers });
  }
  if (path === "/api/v1/transport/pickup-points") {
    return ok(config, { success: true, data: transportPickupPoints, items: transportPickupPoints });
  }
  if (path === "/api/v1/transport/student-assignments") {
    return ok(config, { success: true, data: transportStudentAssignments, items: transportStudentAssignments });
  }
  if (path === "/api/v1/transport/vehicle-assignments") {
    return ok(config, { success: true, data: transportVehicleAssignments, items: transportVehicleAssignments });
  }

  // 20. CERTIFICATES FULL CRUD & WORKFLOW
  if (path.startsWith("/api/v1/certificates")) {
    if (!mockStore.certificates || !Array.isArray(mockStore.certificates)) {
      mockStore.certificates = [...initialCertificates];
    }

    // 20.1 Active templates
    if (path === "/api/v1/certificates/active-templates") {
      const templates = [
        { id: 1, templateCode: "BONAFIDE", title: "Bonafide Certificate", name: "Bonafide Certificate", orientation: "landscape" },
        { id: 2, templateCode: "STUDY", title: "Study Certificate", name: "Study Certificate", orientation: "landscape" },
        { id: 3, templateCode: "CONDUCT", title: "Conduct Certificate", name: "Conduct Certificate", orientation: "landscape" },
        { id: 4, templateCode: "TRANSFER", title: "Transfer Certificate", name: "Transfer Certificate", orientation: "portrait" },
      ];
      return ok(config, { success: true, data: templates, items: templates });
    }

    // 20.2 Workflow stage summary counts
    if (path === "/api/v1/certificates/workflow-stats") {
      const list = mockStore.certificates;
      const stats = {
        totalCount: list.length,
        requestedCount: list.filter((c) => c.status === "Requested").length,
        generatedCount: list.filter((c) => c.status === "Generated").length,
        reviewedCount: list.filter((c) => c.status === "Reviewed").length,
        approvedCount: list.filter((c) => c.status === "Approved").length,
        issuedCount: list.filter((c) => c.status === "Issued").length,
        cancelledCount: list.filter((c) => c.status === "Cancelled").length,
      };
      return ok(config, { success: true, data: stats });
    }

    // 20.3 Students dropdown
    if (path === "/api/v1/certificates/students-dropdown") {
      return ok(config, { success: true, data: mockStore.students, items: mockStore.students });
    }

    // 20.4 Generate / Create Certificate (Single)
    if ((path === "/api/v1/certificates/generate" || path === "/api/v1/certificates/student-request") && method === "post") {
      const nextId = mockStore.certificates.reduce((max, c) => Math.max(max, Number(c.id || c.certificateId || 0)), 0) + 1;
      const matchedStudent = mockStore.students.find((s) => String(s.admissionNo).trim().toLowerCase() === String(body?.admissionNo || "").trim().toLowerCase()) || {};
      const certNumber = `CERT-${new Date().getFullYear()}-${String(nextId).padStart(3, "0")}`;
      const newCert = {
        id: nextId,
        certificateId: nextId,
        certificateNumber: certNumber,
        certificateNo: certNumber,
        number: certNumber,
        admissionNo: body?.admissionNo || matchedStudent.admissionNo || "MADM-0068",
        admissionNumber: body?.admissionNo || matchedStudent.admissionNo || "MADM-0068",
        studentName: matchedStudent.name || matchedStudent.studentName || "Student",
        student: matchedStudent.name || matchedStudent.studentName || "Student",
        studentId: matchedStudent.id || matchedStudent.studentId || 101,
        rollNo: matchedStudent.rollNo || matchedStudent.roll || "101",
        fatherName: matchedStudent.father || matchedStudent.fatherName || "J. Venkat Rao",
        motherName: matchedStudent.motherName || "J. Lakshmi",
        group: matchedStudent.group || "MPC",
        groupName: matchedStudent.group || "MPC",
        level: matchedStudent.level || "Intermediate 1st Year",
        academicLevel: matchedStudent.level || "Intermediate 1st Year",
        academicYear: matchedStudent.academicYear || "2025-2026",
        certificateType: body?.certificateType || body?.type || "Bonafide Certificate",
        type: body?.certificateType || body?.type || "Bonafide Certificate",
        purpose: body?.purpose || "Official Purpose",
        requestDate: body?.requestDate ? String(body.requestDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        issueDate: "",
        issue: "",
        status: "Requested",
        remarks: body?.remarks || "",
      };
      mockStore.certificates.unshift(newCert);
      mockStore.save("certificates");
      try {
        localStorage.setItem("cms_certificates", JSON.stringify(mockStore.certificates));
      } catch {}
      return ok(config, { success: true, message: "Certificate generated successfully", data: newCert });
    }

    // 20.5 Bulk Generate Certificates
    if (path === "/api/v1/certificates/bulk-generate" && method === "post") {
      const admissionNos = Array.isArray(body?.admissionNos) ? body.admissionNos : [];
      const createdList = [];
      let nextId = mockStore.certificates.reduce((max, c) => Math.max(max, Number(c.id || c.certificateId || 0)), 0);
      admissionNos.forEach((adm) => {
        nextId += 1;
        const matched = mockStore.students.find((s) => String(s.admissionNo).trim().toLowerCase() === String(adm).trim().toLowerCase()) || {};
        const certNumber = `CERT-${new Date().getFullYear()}-${String(nextId).padStart(3, "0")}`;
        const newCert = {
          id: nextId,
          certificateId: nextId,
          certificateNumber: certNumber,
          certificateNo: certNumber,
          number: certNumber,
          admissionNo: adm,
          admissionNumber: adm,
          studentName: matched.name || matched.studentName || adm,
          student: matched.name || matched.studentName || adm,
          studentId: matched.id || matched.studentId || 101,
          rollNo: matched.rollNo || matched.roll || "101",
          fatherName: matched.father || matched.fatherName || "Father",
          motherName: matched.motherName || "Mother",
          group: matched.group || "MPC",
          groupName: matched.group || "MPC",
          level: matched.level || "Intermediate 1st Year",
          academicLevel: matched.level || "Intermediate 1st Year",
          academicYear: matched.academicYear || "2025-2026",
          certificateType: body?.certificateType || "Bonafide Certificate",
          type: body?.certificateType || "Bonafide Certificate",
          purpose: body?.purpose || "Official Purpose",
          requestDate: body?.requestDate ? String(body.requestDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
          issueDate: "",
          issue: "",
          status: "Generated",
          remarks: body?.remarks || "",
        };
        mockStore.certificates.unshift(newCert);
        createdList.push(newCert);
      });
      mockStore.save("certificates");
      try {
        localStorage.setItem("cms_certificates", JSON.stringify(mockStore.certificates));
      } catch {}
      return ok(config, { success: true, message: `${createdList.length} certificates generated successfully`, data: createdList });
    }

    // 20.6 Workflow Status Transition Endpoints
    const reviewMatch = path.match(/^\/api\/v1\/certificates\/(.+)\/review$/);
    if (reviewMatch) {
      const certId = reviewMatch[1];
      const cert = mockStore.certificates.find((c) => String(c.id) === String(certId) || String(c.certificateNumber) === String(certId));
      if (cert) {
        cert.status = "Reviewed";
        mockStore.save("certificates");
        try { localStorage.setItem("cms_certificates", JSON.stringify(mockStore.certificates)); } catch {}
      }
      return ok(config, { success: true, message: "Certificate marked as Reviewed", data: cert });
    }

    const approveMatch = path.match(/^\/api\/v1\/certificates\/(.+)\/approve$/);
    if (approveMatch) {
      const certId = approveMatch[1];
      const cert = mockStore.certificates.find((c) => String(c.id) === String(certId) || String(c.certificateNumber) === String(certId));
      if (cert) {
        cert.status = "Approved";
        mockStore.save("certificates");
        try { localStorage.setItem("cms_certificates", JSON.stringify(mockStore.certificates)); } catch {}
      }
      return ok(config, { success: true, message: "Certificate approved", data: cert });
    }

    const issueMatch = path.match(/^\/api\/v1\/certificates\/(.+)\/issue$/);
    if (issueMatch) {
      const certId = issueMatch[1];
      const cert = mockStore.certificates.find((c) => String(c.id) === String(certId) || String(c.certificateNumber) === String(certId));
      if (cert) {
        cert.status = "Issued";
        cert.issueDate = new Date().toISOString().slice(0, 10);
        cert.issue = cert.issueDate;
        mockStore.save("certificates");
        try { localStorage.setItem("cms_certificates", JSON.stringify(mockStore.certificates)); } catch {}
      }
      return ok(config, { success: true, message: "Certificate issued", data: cert });
    }

    const cancelMatch = path.match(/^\/api\/v1\/certificates\/(.+)\/cancel$/);
    if (cancelMatch) {
      const certId = cancelMatch[1];
      const cert = mockStore.certificates.find((c) => String(c.id) === String(certId) || String(c.certificateNumber) === String(certId));
      if (cert) {
        cert.status = "Cancelled";
        mockStore.save("certificates");
        try { localStorage.setItem("cms_certificates", JSON.stringify(mockStore.certificates)); } catch {}
      }
      return ok(config, { success: true, message: "Certificate cancelled", data: cert });
    }

    // 20.7 Delete Certificate
    if (method === "delete") {
      const deleteId = path.split("/").pop();
      mockStore.certificates = mockStore.certificates.filter((c) => String(c.id) !== String(deleteId) && String(c.certificateNumber) !== String(deleteId));
      mockStore.save("certificates");
      try { localStorage.setItem("cms_certificates", JSON.stringify(mockStore.certificates)); } catch {}
      return ok(config, { success: true, message: "Certificate deleted successfully" });
    }

    // 20.8 List all certificates (GET)
    if (method === "get") {
      let list = [...mockStore.certificates];
      const q = params.get("search");
      const stat = params.get("status");
      const cType = params.get("certificateType");
      if (q && q.trim()) {
        const queryLower = q.trim().toLowerCase();
        list = list.filter((c) =>
          [c.student, c.studentName, c.admissionNo, c.certificateNumber, c.number, c.type, c.purpose]
            .some((v) => String(v || "").toLowerCase().includes(queryLower))
        );
      }
      if (stat && stat !== "All") {
        list = list.filter((c) => c.status === stat);
      }
      if (cType && cType !== "All") {
        list = list.filter((c) => (c.type || c.certificateType) === cType);
      }
      return ok(config, { success: true, data: list, items: list, totalCount: list.length });
    }

    return ok(config, { success: true, data: mockStore.certificates, items: mockStore.certificates });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 33. EVALUATIONS & MARKS (/api/v1/faculty/evaluations, /api/v1/evaluations/*, /api/v1/marks/*)
  // ──────────────────────────────────────────────────────────────────────────
  if (path === "/api/v1/faculty/evaluations" || path === "/api/v1/evaluations" || path === "/api/v1/evaluations/search") {
    let list = [...(mockStore.evaluations || [])];
    const examId = params.get("examId") || params.get("examinationId") || body?.examId || body?.examinationId;
    const sectionId = params.get("sectionId") || body?.sectionId;
    const subjectId = params.get("subjectId") || body?.subjectId;
    const status = params.get("status") || body?.status;

    if (examId) list = list.filter((e) => String(e.examId || e.examinationId) === String(examId));
    if (sectionId) list = list.filter((e) => String(e.sectionId) === String(sectionId));
    if (subjectId) list = list.filter((e) => String(e.subjectId) === String(subjectId));
    if (status && status !== "ALL") list = list.filter((e) => String(e.status || e.evaluationStatus).toUpperCase() === String(status).toUpperCase());

    return ok(config, {
      success: true,
      data: list,
      items: list,
      records: list,
      evaluations: list,
      totalCount: list.length,
    });
  }

  // Single Evaluation Students (GET /api/v1/evaluations/:evalId/students)
  const evalStudentsMatch = path.match(/^\/api\/v1\/evaluations\/([^/]+)\/students$/);
  if (evalStudentsMatch) {
    const evalId = evalStudentsMatch[1];
    const currentEval = (mockStore.evaluations || []).find((e) => String(e.id || e.evaluationId) === String(evalId)) || {};
    const effectiveExamId = currentEval.examId || currentEval.examinationId || 4;
    const effectiveSubId = currentEval.subjectId || 1;

    // Join with student marks stored in mockStore.studentMarks
    const existingMarks = (mockStore.studentMarks || []).filter(
      (m) => String(m.examId || m.examinationId) === String(effectiveExamId) && String(m.subjectId) === String(effectiveSubId)
    );

    const baseStudents = (mockStore.students || []).slice(0, 10);
    const studentsWithMarks = baseStudents.map((st, idx) => {
      const markRecord = existingMarks.find((m) => String(m.studentId) === String(st.id || st.studentId));
      return {
        studentId: st.id || st.studentId || 101 + idx,
        studentName: st.name || st.studentName || `Student ${idx + 1}`,
        rollNumber: st.rollNumber || st.rollNo || `26010${idx + 1}`,
        admissionNumber: st.admissionNumber || st.admissionNo || `ADM20260${idx + 1}`,
        marksObtained: markRecord ? markRecord.marksObtained : (90 - idx * 2),
        maxMarks: currentEval.maxMarks || 100,
        passMarks: currentEval.passMarks || 35,
        isAbsent: markRecord ? Boolean(markRecord.isAbsent) : false,
        remarks: markRecord ? markRecord.remarks : "Satisfactory",
        status: markRecord?.status || "DRAFT",
      };
    });

    return ok(config, {
      success: true,
      data: studentsWithMarks,
      items: studentsWithMarks,
      totalCount: studentsWithMarks.length,
    });
  }

  // Save Evaluation Marks (PUT /api/v1/faculty/evaluations/:evalId/marks, PUT /api/v1/evaluations/:evalId/marks)
  const saveMarksMatch = path.match(/^\/api\/v1\/(?:faculty\/)?evaluations\/([^/]+)\/marks$/);
  if (saveMarksMatch && (method === "put" || method === "post")) {
    const evalId = saveMarksMatch[1];
    const incomingRows = Array.isArray(body?.marks)
      ? body.marks
      : Array.isArray(body?.studentMarks)
      ? body.studentMarks
      : Array.isArray(body?.rows)
      ? body.rows
      : [];

    const currentEval = (mockStore.evaluations || []).find((e) => String(e.id || e.evaluationId) === String(evalId));
    if (currentEval) {
      currentEval.status = "DRAFT";
      currentEval.evaluationStatus = "DRAFT";
      currentEval.enteredCount = incomingRows.length || currentEval.enteredCount;
      currentEval.updatedAt = new Date().toISOString();
    }

    incomingRows.forEach((row) => {
      const sId = row.studentId;
      const existingIdx = (mockStore.studentMarks || []).findIndex(
        (m) =>
          String(m.studentId) === String(sId) &&
          String(m.examId || m.examinationId) === String(currentEval?.examId || body?.examinationId || 4) &&
          String(m.subjectId) === String(currentEval?.subjectId || body?.subjectId || 1)
      );
      const markEntry = {
        studentId: sId,
        studentName: row.studentName || row.name,
        rollNumber: row.rollNumber || row.rollNo,
        examinationId: currentEval?.examId || body?.examinationId || 4,
        examId: currentEval?.examId || body?.examinationId || 4,
        subjectId: currentEval?.subjectId || body?.subjectId || 1,
        subjectName: currentEval?.subjectName || body?.subjectName || "Subject",
        sectionId: currentEval?.sectionId || body?.sectionId || 1,
        marksObtained: Number(row.marksObtained ?? row.marks ?? 0),
        maxMarks: Number(currentEval?.maxMarks || row.maxMarks || 100),
        passMarks: Number(currentEval?.passMarks || row.passMarks || 35),
        isAbsent: Boolean(row.isAbsent),
        remarks: row.remarks || "",
        status: "DRAFT",
      };
      if (existingIdx >= 0) {
        mockStore.studentMarks[existingIdx] = { ...mockStore.studentMarks[existingIdx], ...markEntry };
      } else {
        mockStore.studentMarks.push(markEntry);
      }
    });

    mockStore.save("evaluations");
    mockStore.save("student_marks");
    return ok(config, {
      success: true,
      message: "Marks draft saved successfully",
      data: currentEval || { id: evalId, status: "DRAFT" },
    });
  }

  // Submit Evaluation (POST /api/v1/faculty/evaluations/:evalId/submit, POST /api/v1/evaluations/:evalId/submit)
  const submitEvalMatch = path.match(/^\/api\/v1\/(?:faculty\/)?evaluations\/([^/]+)\/submit$/);
  if (submitEvalMatch && method === "post") {
    const evalId = submitEvalMatch[1];
    let currentEval = (mockStore.evaluations || []).find(
      (e, idx) =>
        String(e.id || e.evaluationId) === String(evalId) ||
        String(idx + 1) === String(evalId) ||
        String(e.examId || e.examinationId) === String(evalId)
    );
    if (!currentEval && (mockStore.evaluations || []).length > 0) {
      currentEval = mockStore.evaluations[0];
    }
    if (currentEval) {
      currentEval.status = "SUBMITTED";
      currentEval.evaluationStatus = "SUBMITTED";
      currentEval.submittedAt = new Date().toISOString();
      mockStore.save("evaluations");
    }
    return ok(config, {
      success: true,
      message: "Evaluation submitted for verification successfully",
      data: currentEval,
    });
  }

  // Verify Evaluation (POST /api/v1/evaluations/:evalId/verify)
  const verifyEvalMatch = path.match(/^\/api\/v1\/evaluations\/([^/]+)\/verify$/);
  if (verifyEvalMatch && method === "post") {
    const evalId = verifyEvalMatch[1];
    let currentEval = (mockStore.evaluations || []).find(
      (e, idx) =>
        String(e.id || e.evaluationId) === String(evalId) ||
        String(idx + 1) === String(evalId) ||
        String(e.examId || e.examinationId) === String(evalId)
    );
    if (!currentEval && (mockStore.evaluations || []).length > 0) {
      currentEval = mockStore.evaluations[0];
    }
    if (currentEval) {
      currentEval.status = "VERIFIED";
      currentEval.evaluationStatus = "VERIFIED";
      currentEval.verifiedAt = new Date().toISOString();
      mockStore.save("evaluations");
    }
    return ok(config, {
      success: true,
      message: "Evaluation verified successfully",
      data: currentEval,
    });
  }

  // Approve Evaluation (POST /api/v1/evaluations/:evalId/approve)
  const approveEvalMatch = path.match(/^\/api\/v1\/evaluations\/([^/]+)\/approve$/);
  if (approveEvalMatch && method === "post") {
    const evalId = approveEvalMatch[1];
    let currentEval = (mockStore.evaluations || []).find(
      (e, idx) =>
        String(e.id || e.evaluationId) === String(evalId) ||
        String(idx + 1) === String(evalId) ||
        String(e.examId || e.examinationId) === String(evalId)
    );
    if (!currentEval && (mockStore.evaluations || []).length > 0) {
      currentEval = mockStore.evaluations[0];
    }
    if (currentEval) {
      currentEval.status = "APPROVED";
      currentEval.evaluationStatus = "APPROVED";
      currentEval.approvedAt = new Date().toISOString();
      mockStore.save("evaluations");
    }
    return ok(config, {
      success: true,
      message: "Evaluation approved successfully",
      data: currentEval,
    });
  }

  // Reject Evaluation (POST /api/v1/evaluations/:evalId/reject)
  const rejectEvalMatch = path.match(/^\/api\/v1\/evaluations\/([^/]+)\/reject$/);
  if (rejectEvalMatch && method === "post") {
    const evalId = rejectEvalMatch[1];
    let currentEval = (mockStore.evaluations || []).find(
      (e, idx) =>
        String(e.id || e.evaluationId) === String(evalId) ||
        String(idx + 1) === String(evalId) ||
        String(e.examId || e.examinationId) === String(evalId)
    );
    if (!currentEval && (mockStore.evaluations || []).length > 0) {
      currentEval = mockStore.evaluations[0];
    }
    if (currentEval) {
      currentEval.status = "REJECTED";
      currentEval.evaluationStatus = "REJECTED";
      currentEval.rejectionReason = body?.remarks || body?.reason || "Rejected by coordinator";
      mockStore.save("evaluations");
    }
    return ok(config, {
      success: true,
      message: "Evaluation rejected",
      data: currentEval,
    });
  }

  // Verify All & Approve All Evaluations
  if (path === "/api/v1/evaluations/verify-all" && method === "post") {
    (mockStore.evaluations || []).forEach((e) => {
      if (e.status === "SUBMITTED") e.status = "VERIFIED";
    });
    mockStore.save("evaluations");
    return ok(config, { success: true, message: "All submitted evaluations verified successfully" });
  }
  if (path === "/api/v1/evaluations/approve-all" && method === "post") {
    (mockStore.evaluations || []).forEach((e) => {
      if (e.status === "VERIFIED" || e.status === "SUBMITTED") e.status = "APPROVED";
    });
    mockStore.save("evaluations");
    return ok(config, { success: true, message: "All verified evaluations approved successfully" });
  }

  // GET /api/v1/marks/exam/:examId or GET /api/v1/marks
  const marksExamMatch = path.match(/^\/api\/v1\/marks\/exam\/([^/]+)$/);
  if (marksExamMatch && method === "get") {
    const examId = marksExamMatch[1];
    let list = (mockStore.studentMarks || []).filter((m) => String(m.examId || m.examinationId) === String(examId));
    if (!list.length) {
      list = (mockStore.studentMarks || []);
    }
    return ok(config, { success: true, data: list, items: list, records: list });
  }
  if (path === "/api/v1/marks" && method === "get") {
    const examId = params.get("examinationId") || params.get("examId");
    let list = [...(mockStore.studentMarks || [])];
    if (examId) list = list.filter((m) => String(m.examId || m.examinationId) === String(examId));
    return ok(config, { success: true, data: list, items: list, records: list });
  }
  if (path === "/api/v1/marks/bulk" && method === "post") {
    return ok(config, { success: true, message: "Student marks bulk-saved successfully" });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 34. RESULTS, PUBLISHING & ANALYTICS (/api/v1/results/*)
  // ──────────────────────────────────────────────────────────────────────────
  if (path === "/api/v1/results/dashboard") {
    const totalResults = (mockStore.publishedResults || []).length || 240;
    const publishedCount = (mockStore.publishedResults || []).filter((r) => r.isPublished || r.status === "PUBLISHED").length || 180;
    return ok(config, {
      success: true,
      data: {
        totalResults,
        publishedCount,
        pendingCount: Math.max(0, totalResults - publishedCount),
      },
    });
  }

  if (path === "/api/v1/results/readiness") {
    const approvedCount = (mockStore.evaluations || []).filter((e) => e.status === "APPROVED").length;
    return ok(config, {
      success: true,
      data: {
        canGenerateResults: true,
        isReady: true,
        approvedEvaluationCount: approvedCount || 4,
        totalEligibleStudents: 60,
      },
    });
  }

  if (path === "/api/v1/results/published") {
    let list = [...(mockStore.publishedResults || [])];
    const examId = params.get("examId") || params.get("examinationId");
    const groupId = params.get("groupId");
    const sectionId = params.get("sectionId");
    if (examId) list = list.filter((r) => String(r.examId || r.examinationId) === String(examId));
    if (groupId) list = list.filter((r) => String(r.groupId) === String(groupId));
    if (sectionId) list = list.filter((r) => String(r.sectionId) === String(sectionId));
    return ok(config, {
      success: true,
      data: list,
      items: list,
      records: list,
      totalCount: list.length,
    });
  }

  if (path === "/api/v1/results/process" || path === "/api/v1/results/generate") {
    const examId = body?.examId || body?.examinationId || 4;
    (mockStore.publishedResults || []).forEach((r) => {
      if (String(r.examId || r.examinationId) === String(examId)) {
        r.status = "PROCESSED";
        r.processedAt = new Date().toISOString();
      }
    });
    mockStore.save("published_results");
    return ok(config, {
      success: true,
      message: "Results processed and prepared for publication successfully",
      data: mockStore.publishedResults,
    });
  }

  if (path === "/api/v1/results/publish" && method === "post") {
    const examId = body?.examId || body?.examinationId;
    const sectionId = body?.sectionId;
    (mockStore.publishedResults || []).forEach((r) => {
      if (!examId || String(r.examId || r.examinationId) === String(examId)) {
        if (!sectionId || String(r.sectionId) === String(sectionId)) {
          r.status = "PUBLISHED";
          r.isPublished = true;
          r.publishedAt = new Date().toISOString();
        }
      }
    });
    if (examId) {
      const exam = (mockStore.examinations || []).find((e) => String(e.id || e.examinationId) === String(examId));
      if (exam) {
        exam.status = "COMPLETED";
        mockStore.save("examinations");
      }
    }
    mockStore.save("published_results");
    return ok(config, {
      success: true,
      message: "Results published successfully to student and parent portals.",
    });
  }

  if (path === "/api/v1/results/rank-list") {
    const group = params.get("groupName") || "MPC";
    const rankList = [
      { rank: 1, studentId: 101, studentName: "Rahul Sharma", rollNumber: "260101", sectionName: `${group} - Sec A`, totalMarks: 388, maxMarks: 400, percentage: 97.0, result: "PASS" },
      { rank: 2, studentId: 102, studentName: "Priya Varma", rollNumber: "260102", sectionName: `${group} - Sec A`, totalMarks: 382, maxMarks: 400, percentage: 95.5, result: "PASS" },
      { rank: 3, studentId: 103, studentName: "Venkata Sai", rollNumber: "260103", sectionName: `${group} - Sec A`, totalMarks: 374, maxMarks: 400, percentage: 93.5, result: "PASS" },
      { rank: 4, studentId: 104, studentName: "Ananya Reddy", rollNumber: "260104", sectionName: `${group} - Sec A`, totalMarks: 366, maxMarks: 400, percentage: 91.5, result: "PASS" },
      { rank: 5, studentId: 105, studentName: "Karthik Kumar", rollNumber: "260105", sectionName: `${group} - Sec B`, totalMarks: 358, maxMarks: 400, percentage: 89.5, result: "PASS" },
      { rank: 6, studentId: 106, studentName: "Sneha Patel", rollNumber: "260106", sectionName: `${group} - Sec B`, totalMarks: 349, maxMarks: 400, percentage: 87.25, result: "PASS" },
      { rank: 7, studentId: 107, studentName: "Rohan Gupta", rollNumber: "260107", sectionName: `${group} - Sec B`, totalMarks: 342, maxMarks: 400, percentage: 85.5, result: "PASS" },
      { rank: 8, studentId: 108, studentName: "Meghana Rao", rollNumber: "260108", sectionName: `${group} - Sec B`, totalMarks: 335, maxMarks: 400, percentage: 83.75, result: "PASS" },
      { rank: 9, studentId: 109, studentName: "Harish Teja", rollNumber: "260109", sectionName: `${group} - Sec C`, totalMarks: 328, maxMarks: 400, percentage: 82.0, result: "PASS" },
      { rank: 10, studentId: 110, studentName: "Deepika Nair", rollNumber: "260110", sectionName: `${group} - Sec C`, totalMarks: 320, maxMarks: 400, percentage: 80.0, result: "PASS" },
    ];
    return ok(config, { success: true, data: rankList, items: rankList });
  }

  if (path === "/api/v1/results/analytics" || path === "/api/reports/results") {
    return ok(config, {
      success: true,
      data: {
        totalStudents: 60,
        passedStudents: 57,
        failedStudents: 3,
        passPercentage: 95.0,
        averageScore: 82.5,
        highestScore: 98.0,
        lowestScore: 32.0,
        gradeDistributions: { "A+": 25, "A": 20, "B": 10, "C": 2, "F": 3 },
      },
    });
  }

  if (path === "/api/v1/results/failed-students") {
    const failedList = [
      { studentId: 112, studentName: "Ajay Verma", rollNumber: "260112", sectionName: "MPC - Sec C", totalMarks: 110, maxMarks: 400, percentage: 27.5, result: "FAIL", failedSubjects: ["Mathematics IA"] },
    ];
    return ok(config, { success: true, data: failedList, items: failedList });
  }

  if (path === "/api/v1/results/statistics") {
    return ok(config, {
      success: true,
      data: {
        totalExams: mockStore.examinations.length,
        totalSections: 6,
        averagePassRate: 94.2,
      },
    });
  }

  const resultSectionMatch = path.match(/^\/api\/v1\/results\/sections\/([^/]+)$/);
  if (resultSectionMatch) {
    return ok(config, {
      success: true,
      data: {
        sectionId: resultSectionMatch[1],
        published: true,
        studentsCount: 20,
        passedCount: 19,
        passRate: 95.0,
      },
    });
  }

  if (path === "/api/v1/results/student-result" || path === "/api/v1/results/students/memo" || path === "/api/v1/results/download-pdf") {
    const studentId = params.get("studentId") || 101;
    const student = (mockStore.students || []).find((s) => String(s.id || s.studentId) === String(studentId)) || { name: "Rahul Sharma", rollNumber: "260101" };
    return ok(config, {
      success: true,
      data: {
        studentId,
        studentName: student.name || student.studentName,
        rollNumber: student.rollNumber || student.rollNo,
        examinationName: "Quarterly Examination 2026-27",
        totalMarks: 388,
        maxMarks: 400,
        percentage: 97.0,
        result: "PASS",
        grade: "A+",
        subjects: [
          { subjectName: "Mathematics IA", marksObtained: 98, maxMarks: 100, grade: "A+" },
          { subjectName: "Physics", marksObtained: 96, maxMarks: 100, grade: "A+" },
          { subjectName: "Chemistry", marksObtained: 97, maxMarks: 100, grade: "A+" },
          { subjectName: "English", marksObtained: 97, maxMarks: 100, grade: "A+" },
        ],
      },
    });
  }

  if (path.startsWith("/api/v1/student-analysis")) {
    return ok(config, {
      success: true,
      data: {
        averagePerformance: 85.5,
        attendanceImpact: "Strong positive correlation (95% attendance corresponds to 91% average score)",
        subjectAverages: [
          { subjectName: "Mathematics IA", average: 88.2 },
          { subjectName: "Physics", average: 82.4 },
          { subjectName: "Chemistry", average: 84.1 },
          { subjectName: "English", average: 89.0 },
        ],
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 35. STUDENT ATTENDANCE (/api/v1/attendance/*)
  // ──────────────────────────────────────────────────────────────────────────
  if (path === "/api/v1/attendance/admin/students" || path === "/api/v1/attendance/students") {
    let list = [...(mockStore.studentAttendance || [])];
    const sectionId = params.get("sectionId");
    const groupId = params.get("groupId");
    if (sectionId) list = list.filter((s) => String(s.sectionId) === String(sectionId));
    if (groupId) list = list.filter((s) => String(s.groupId) === String(groupId));
    return ok(config, { success: true, data: list, items: list, records: list });
  }

  if (path === "/api/v1/attendance/student-monthly-report") {
    return ok(config, {
      success: true,
      data: mockStore.studentAttendance || [],
      items: mockStore.studentAttendance || [],
    });
  }

  if (path === "/api/v1/attendance/defaulters") {
    const defaulters = (mockStore.studentAttendance || []).filter((s) => (s.percentage || 100) < 75 || s.absentDays > 10);
    return ok(config, {
      success: true,
      data: defaulters.length ? defaulters : (mockStore.studentAttendance || []).slice(2, 3),
      items: defaulters.length ? defaulters : (mockStore.studentAttendance || []).slice(2, 3),
    });
  }

  if (path === "/api/v1/attendance/admin/bulk-save" || path === "/api/v1/attendance/bulk" || path === "/api/v1/attendance/bulk-update") {
    const studentEntries = Array.isArray(body?.students) ? body.students : Array.isArray(body) ? body : [];
    studentEntries.forEach((entry) => {
      const match = (mockStore.studentAttendance || []).find((s) => String(s.studentId || s.id) === String(entry.studentId || entry.id));
      if (match) {
        if (entry.morningStatus) match.morningStatus = entry.morningStatus;
        if (entry.afternoonStatus) match.afternoonStatus = entry.afternoonStatus;
        if (entry.status) match.morningStatus = entry.status;
      }
    });
    mockStore.save("student_attendance");
    return ok(config, { success: true, message: "Student attendance saved successfully" });
  }

  const studentOverviewMatch = path.match(/^\/api\/v1\/attendance\/student\/([^/]+)\/yearly-overview$/);
  if (studentOverviewMatch) {
    const stId = studentOverviewMatch[1];
    return ok(config, {
      success: true,
      data: {
        studentId: stId,
        totalWorkingDays: 200,
        presentDays: 188,
        absentDays: 12,
        attendancePercentage: 94.0,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 36. STAFF ATTENDANCE & PUNCH RECORDS (/api/v1/staff-attendance/*)
  // ──────────────────────────────────────────────────────────────────────────
  if (path === "/api/v1/staff-attendance/load" && method === "post") {
    const reqDate = body?.attendanceDate || body?.date || new Date().toISOString().slice(0, 10);
    let list = (mockStore.staffAttendance || []).map((s) => ({
      ...s,
      attendanceDate: reqDate,
      date: reqDate,
    }));
    return ok(config, { success: true, data: list, items: list });
  }

  if (path === "/api/v1/staff-attendance/update" && method === "put") {
    const staffId = body?.facultyId || body?.staffId;
    const match = (mockStore.staffAttendance || []).find((s) => String(s.facultyId || s.staffId) === String(staffId));
    if (match) {
      if (body?.inTime) match.inTime = body.inTime;
      if (body?.outTime) match.outTime = body.outTime;
      if (body?.status !== undefined) {
        match.status = body.status;
        match.statusLabel = body.status === 1 ? "Present" : body.status === 2 ? "Late" : "Absent";
      }
      if (body?.remarks !== undefined) match.remarks = body.remarks;
      mockStore.save("staff_attendance");
    }
    return ok(config, { success: true, message: "Staff attendance updated successfully", data: match });
  }

  if (path === "/api/v1/staff-attendance/monthly-report") {
    return ok(config, {
      success: true,
      data: mockStore.staffAttendance || [],
      items: mockStore.staffAttendance || [],
    });
  }

  const staffDetailsMatch = path.match(/^\/api\/v1\/staff-attendance\/staff\/([^/]+)\/details$/);
  if (staffDetailsMatch) {
    const sId = staffDetailsMatch[1];
    const match = (mockStore.staffAttendance || []).find((s) => String(s.facultyId || s.staffId) === String(sId)) || mockStore.staffAttendance?.[0];
    return ok(config, { success: true, data: match });
  }

  const staffOverviewMatch = path.match(/^\/api\/v1\/staff-attendance\/staff\/([^/]+)\/yearly-overview$/);
  if (staffOverviewMatch) {
    return ok(config, {
      success: true,
      data: {
        totalWorkingDays: 240,
        presentDays: 232,
        leavesTaken: 6,
        lateDays: 2,
        percentage: 96.6,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 37. ATTENDANCE TIMING CONFIGURATION (/api/v1/attendance-timing-config/*)
  // ──────────────────────────────────────────────────────────────────────────
  if (path === "/api/v1/attendance-timing-config") {
    if (method === "get") {
      return ok(config, {
        success: true,
        data: mockStore.attendanceTimingConfigs || [],
        items: mockStore.attendanceTimingConfigs || [],
      });
    }
    if (method === "post") {
      const newId = Date.now();
      const newConfig = {
        id: newId,
        attendanceTimingConfigId: newId,
        ...body,
        status: body?.isActive ? "Active" : "Inactive",
      };
      mockStore.attendanceTimingConfigs.push(newConfig);
      mockStore.save("attendance_timing_configs");
      return ok(config, { success: true, message: "Attendance timing configuration created successfully", data: newConfig });
    }
  }

  if (path === "/api/v1/attendance-timing-config/effective") {
    const effective = (mockStore.attendanceTimingConfigs || []).find((c) => c.isActive) || mockStore.attendanceTimingConfigs?.[0];
    return ok(config, { success: true, data: effective });
  }

  const timingConfigIdMatch = path.match(/^\/api\/v1\/attendance-timing-config\/([^/]+)$/);
  if (timingConfigIdMatch) {
    const cfgId = timingConfigIdMatch[1];
    if (method === "get") {
      const match = (mockStore.attendanceTimingConfigs || []).find((c) => String(c.id || c.attendanceTimingConfigId) === String(cfgId));
      return ok(config, { success: true, data: match });
    }
    if (method === "put") {
      const idx = (mockStore.attendanceTimingConfigs || []).findIndex((c) => String(c.id || c.attendanceTimingConfigId) === String(cfgId));
      if (idx >= 0) {
        mockStore.attendanceTimingConfigs[idx] = { ...mockStore.attendanceTimingConfigs[idx], ...body };
        mockStore.save("attendance_timing_configs");
      }
      return ok(config, { success: true, message: "Timing configuration updated successfully", data: mockStore.attendanceTimingConfigs[idx] });
    }
    if (method === "delete") {
      mockStore.attendanceTimingConfigs = (mockStore.attendanceTimingConfigs || []).filter((c) => String(c.id || c.attendanceTimingConfigId) !== String(cfgId));
      mockStore.save("attendance_timing_configs");
      return ok(config, { success: true, message: "Timing configuration deleted successfully" });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 38. HOLIDAYS (/api/v1/holidays/*)
  // ──────────────────────────────────────────────────────────────────────────
  if (path === "/api/v1/holidays/summary") {
    const all = mockStore.holidays || [];
    const national = all.filter((h) => (h.holidayType || h.type) === "National").length;
    const festival = all.filter((h) => (h.holidayType || h.type) === "Festival").length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcoming = all.filter((h) => (h.startDate || h.date) >= todayStr).length;
    const completed = all.filter((h) => (h.endDate || h.date) < todayStr).length;
    return ok(config, {
      success: true,
      data: {
        total: all.length,
        national,
        festival,
        upcoming,
        completed,
      },
    });
  }

  if (path === "/api/v1/holidays") {
    if (method === "get") {
      let list = [...(mockStore.holidays || [])];
      const q = params.get("search");
      if (q && q.trim()) {
        const queryLower = q.trim().toLowerCase();
        list = list.filter((h) => String(h.name || h.holidayName || "").toLowerCase().includes(queryLower));
      }
      return ok(config, {
        success: true,
        data: list,
        items: list,
        total: list.length,
        totalPages: 1,
        page: 1,
        pageSize: 20,
      });
    }
    if (method === "post") {
      const newId = Date.now();
      const newHol = {
        id: newId,
        holidayId: newId,
        ...body,
      };
      mockStore.holidays.push(newHol);
      mockStore.save("holidays");
      return ok(config, { success: true, message: "Holiday added successfully", data: newHol });
    }
  }

  const holidayIdMatch = path.match(/^\/api\/v1\/holidays\/([^/]+)$/);
  if (holidayIdMatch) {
    const hId = holidayIdMatch[1];
    if (method === "get") {
      const match = (mockStore.holidays || []).find((h) => String(h.id || h.holidayId) === String(hId));
      return ok(config, { success: true, data: match });
    }
    if (method === "put") {
      const idx = (mockStore.holidays || []).findIndex((h) => String(h.id || h.holidayId) === String(hId));
      if (idx >= 0) {
        mockStore.holidays[idx] = { ...mockStore.holidays[idx], ...body };
        mockStore.save("holidays");
      }
      return ok(config, { success: true, message: "Holiday updated successfully", data: mockStore.holidays[idx] });
    }
    if (method === "delete") {
      mockStore.holidays = (mockStore.holidays || []).filter((h) => String(h.id || h.holidayId) !== String(hId));
      mockStore.save("holidays");
      return ok(config, { success: true, message: "Holiday deleted successfully" });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 39. PROMOTIONS & CAMPUS TRANSFERS (/api/v1/promotions/*)
  // ──────────────────────────────────────────────────────────────────────────
  if (path === "/api/v1/promotions/eligible") {
    let list = [...(mockStore.promotions || [])];
    const academicYearId = params.get("academicYearId");
    const boardId = params.get("boardId");
    if (academicYearId) list = list.filter((p) => !p.academicYearId || String(p.academicYearId) === String(academicYearId));
    if (boardId) list = list.filter((p) => !p.boardId || String(p.boardId) === String(boardId));
    return ok(config, {
      success: true,
      data: list,
      items: list,
      records: list,
      totalCount: list.length,
    });
  }

  if (path === "/api/v1/promotions/preview" && method === "post") {
    const count = Array.isArray(body?.studentIds) ? body.studentIds.length : 1;
    return ok(config, {
      success: true,
      data: {
        totalEligible: count,
        readyToPromote: count,
        validationIssues: [],
        feeChangeRequired: false,
      },
    });
  }

  if (path === "/api/v1/promotions" && method === "post") {
    const studentIds = Array.isArray(body?.studentIds) ? body.studentIds : [];
    studentIds.forEach((sId) => {
      const promoRecord = (mockStore.promotions || []).find((p) => String(p.studentId) === String(sId));
      const histId = Date.now() + Math.floor(Math.random() * 1000);
      mockStore.promotionHistory.unshift({
        id: histId,
        historyId: histId,
        studentId: sId,
        studentName: promoRecord?.studentName || "Student",
        rollNumber: promoRecord?.rollNumber || "260101",
        fromLevel: promoRecord?.currentLevel || "Intermediate 1st Year",
        toLevel: promoRecord?.targetLevel || body?.targetAcademicLevelName || "Intermediate 2nd Year",
        group: promoRecord?.group || "MPC",
        promotionDate: new Date().toISOString().slice(0, 10),
        status: "PROMOTED",
      });
      if (promoRecord) {
        promoRecord.status = "PROMOTED";
      }
    });
    mockStore.save("promotions");
    mockStore.save("promotion_history");
    return ok(config, {
      success: true,
      message: `${studentIds.length || 1} student(s) promoted successfully`,
      data: { promotedCount: studentIds.length || 1 },
    });
  }

  const promoStudentMatch = path.match(/^\/api\/v1\/promotions\/student\/([^/]+)$/);
  if (promoStudentMatch && method === "post") {
    const sId = promoStudentMatch[1];
    const promoRecord = (mockStore.promotions || []).find((p) => String(p.studentId) === String(sId));
    const histId = Date.now();
    mockStore.promotionHistory.unshift({
      id: histId,
      historyId: histId,
      studentId: sId,
      studentName: promoRecord?.studentName || "Student",
      rollNumber: promoRecord?.rollNumber || "260101",
      fromLevel: promoRecord?.currentLevel || "Intermediate 1st Year",
      toLevel: body?.targetAcademicLevelName || "Intermediate 2nd Year",
      group: promoRecord?.group || "MPC",
      promotionDate: new Date().toISOString().slice(0, 10),
      status: "PROMOTED",
    });
    if (promoRecord) promoRecord.status = "PROMOTED";
    mockStore.save("promotions");
    mockStore.save("promotion_history");
    return ok(config, { success: true, message: "Student promoted successfully" });
  }

  if (path === "/api/v1/promotions/history") {
    return ok(config, {
      success: true,
      data: mockStore.promotionHistory || [],
      items: mockStore.promotionHistory || [],
      records: mockStore.promotionHistory || [],
    });
  }

  if (path === "/api/v1/promotions/rollback" && method === "post") {
    const histId = body?.historyId || body?.id;
    if (histId) {
      mockStore.promotionHistory = (mockStore.promotionHistory || []).filter((h) => String(h.id || h.historyId) !== String(histId));
      mockStore.save("promotion_history");
    }
    return ok(config, { success: true, message: "Promotion rolled back successfully" });
  }

  if (path === "/api/v1/promotions/report") {
    return ok(config, {
      success: true,
      data: {
        totalEligible: (mockStore.promotions || []).length,
        promotedCount: (mockStore.promotionHistory || []).length,
        pendingCount: (mockStore.promotions || []).filter((p) => p.status === "Eligible").length,
      },
    });
  }

  if (path === "/api/v1/promotions/fee-preview" || path.startsWith("/api/v1/promotions/program-fee-preview")) {
    return ok(config, {
      success: true,
      data: {
        currentFee: 50000,
        targetFee: 55000,
        difference: 5000,
        structure: "Standard Intermediate Tuition Fee",
      },
    });
  }

  if (path === "/api/v1/promotions/program-allocation" || path === "/api/v1/promotions/section-allocation" || path === "/api/v1/promotions/group-allocation") {
    return ok(config, { success: true, message: "Allocation updated successfully" });
  }

  // Campus Transfers
  if (path === "/api/v1/promotions/campus-transfers") {
    if (method === "post") {
      const newTransfer = {
        id: Date.now(),
        ...body,
        status: "Pending",
        requestedDate: new Date().toISOString().slice(0, 10),
      };
      mockStore.campusTransfers.push(newTransfer);
      mockStore.save("campus_transfers");
      return ok(config, { success: true, message: "Campus transfer initiated successfully", data: newTransfer });
    }
  }

  if (path === "/api/v1/promotions/campus-transfers/sent") {
    const list = (mockStore.campusTransfers || []).filter((t) => !t.type || t.type === "sent");
    return ok(config, { success: true, data: list, items: list });
  }

  if (path === "/api/v1/promotions/campus-transfers/received") {
    const list = (mockStore.campusTransfers || []).filter((t) => t.type === "received");
    return ok(config, { success: true, data: list, items: list });
  }

  const transferApproveMatch = path.match(/^\/api\/v1\/promotions\/campus-transfers\/([^/]+)\/approve$/);
  if (transferApproveMatch && (method === "put" || method === "post")) {
    const tId = transferApproveMatch[1];
    const match = (mockStore.campusTransfers || []).find((t) => String(t.id) === String(tId));
    if (match) {
      match.status = "Approved";
      mockStore.save("campus_transfers");
    }
    return ok(config, { success: true, message: "Campus transfer approved successfully" });
  }

  const transferRejectMatch = path.match(/^\/api\/v1\/promotions\/campus-transfers\/([^/]+)\/reject$/);
  if (transferRejectMatch && (method === "put" || method === "post")) {
    const tId = transferRejectMatch[1];
    const match = (mockStore.campusTransfers || []).find((t) => String(t.id) === String(tId));
    if (match) {
      match.status = "Rejected";
      mockStore.save("campus_transfers");
    }
    return ok(config, { success: true, message: "Campus transfer rejected successfully" });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 40. PROFILE LOOKUPS (/api/v1/students/:id/profile, /api/v1/staff/:id)
  // ──────────────────────────────────────────────────────────────────────────
  const studentProfileMatch = path.match(/^\/api\/v1\/students\/([^/]+)(?:\/profile)?$/);
  if (studentProfileMatch && method === "get") {
    const stId = studentProfileMatch[1];
    const match = (mockStore.students || []).find((s) => String(s.id || s.studentId) === String(stId)) || {
      id: stId,
      name: "Rahul Sharma",
      studentName: "Rahul Sharma",
      rollNo: "260101",
      admissionNo: "ADM202601",
      group: "MPC",
      level: "Intermediate 1st Year",
      academicYear: "2026-2027",
      status: "Active",
    };
    return ok(config, { success: true, data: match, student: match });
  }

  const staffProfileMatch = path.match(/^\/api\/v1\/(?:staff|faculty)\/([^/]+)(?:\/profile)?$/);
  if (staffProfileMatch && method === "get") {
    const sId = staffProfileMatch[1];
    const match = (mockStore.staff || []).find((s) => String(s.id || s.staffId || s.facultyId) === String(sId)) || {
      id: sId,
      name: "Preethi Y",
      staffName: "Preethi Y",
      employeeId: "MNT0043",
      designation: "Examination Incharge",
      department: "Examinations",
      email: "preethi.y@college.edu",
      phone: "+91 9876543210",
      status: "Active",
    };
    return ok(config, { success: true, data: match, staff: match });
  }

  // 21. GENERAL DEFAULT FALLBACK FOR ANY OTHER API ROUTE
  if (method === "get") {
    return ok(config, { success: true, data: [], items: [], totalCount: 0 });
  }
  return ok(config, {
    success: true,
    message: "Operation completed successfully.",
    data: { id: Date.now(), ...body },
  });
}

<<<<<<< HEAD
// Native browser fetch is preserved without interception
if (typeof window !== "undefined") {
  window.__mockStore = mockStore;
}

=======
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
