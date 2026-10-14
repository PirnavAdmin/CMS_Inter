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
        start: "2025-06-01",
        end: "2026-04-30",
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
      campuses: "campuses",
      boards: "boards",
      staff: "staff",
      students: "students",
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
      campuses: "campuses",
      boards: "boards",
      staff: "staff",
      students: "students",
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

function parseUrl(urlStr) {
  const [pathname, search] = String(urlStr || "").split("?");
  const params = new URLSearchParams(search || "");
  const cleanPath = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return { path: `/${cleanPath}`, params };
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN MOCK ADAPTER HANDLER
// ──────────────────────────────────────────────────────────────────────────

export function handleMockApiRequest(config) {
  const method = String(config.method || "get").toLowerCase();
  const { path, params } = parseUrl(config.url);
  const body = config.data ? (typeof config.data === "string" ? JSON.parse(config.data || "{}") : config.data) : {};

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

  // 3. BOARDS
  if (path === "/api/v1/boards" || path === "/api/v1/boards/academic-levels") {
    return ok(config, { success: true, data: mockStore.boards, items: mockStore.boards, $values: mockStore.boards });
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

  // 16. EXAMINATIONS, SCHEDULES, MARKS, RESULTS
  if (path.startsWith("/api/v1/examinations")) {
    return ok(config, { success: true, data: rawExaminations, items: rawExaminations });
  }
  if (path.startsWith("/api/v1/exam-schedules")) {
    return ok(config, { success: true, data: rawExamSchedule, items: rawExamSchedule });
  }
  if (path.startsWith("/api/v1/results")) {
    return ok(config, { success: true, data: [], items: [] });
  }

  // 17. COURSES, GROUPS, SECTIONS, SUBJECTS
  if (path === "/api/v1/groups" || path === "/api/v1/courses") {
    return ok(config, { success: true, data: rawCourses, items: rawCourses });
  }
  if (path === "/api/v1/sections") {
    return ok(config, { success: true, data: rawSections, items: rawSections });
  }
  if (path === "/api/v1/subjects") {
    return ok(config, { success: true, data: rawSubjects, items: rawSubjects });
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

  // 20. CERTIFICATES
  if (path.startsWith("/api/v1/certificates")) {
    return ok(config, { success: true, data: rawCertificates, items: rawCertificates });
  }

  // 21. REIMBURSEMENTS
  if (path.startsWith("/api/v1/staff-reimbursements") || path.startsWith("/api/v1/reimbursements")) {
    let storedClaims = [];
    try {
      const raw = typeof window !== "undefined" ? window.localStorage?.getItem("cms_reimbursement_claims") : null;
      storedClaims = raw ? JSON.parse(raw) : [];
    } catch {}
    if (!Array.isArray(storedClaims) || storedClaims.length === 0) {
      storedClaims = [
        {
          id: 1,
          claimId: "CLM-2026-001",
          facultyName: "Dr. Ananya Rao",
          department: "Mathematics",
          category: "Teaching Materials",
          amount: 3200,
          status: "Pending",
          submissionDate: "2026-10-03",
        },
      ];
    }
    if (path.includes("/summary")) {
      const pendingCount = storedClaims.filter((c) => (c.status || "").toLowerCase() === "pending").length;
      const approvedCount = storedClaims.filter((c) => (c.status || "").toLowerCase() === "approved").length;
      return ok(config, {
        success: true,
        data: {
          pendingCount,
          approvedCount,
          totalCount: storedClaims.length,
          items: storedClaims,
        },
      });
    }
    return ok(config, {
      success: true,
      status: true,
      data: storedClaims,
      items: storedClaims,
      totalCount: storedClaims.length,
    });
  }

  // 22. GENERAL DEFAULT FALLBACK FOR ANY OTHER API ROUTE
  if (method === "get") {
    return ok(config, { success: true, data: [], items: [], totalCount: 0 });
  }
  return ok(config, {
    success: true,
    message: "Operation completed successfully.",
    data: { id: Date.now(), ...body },
  });
}

