import { useState, useEffect } from "react";
import {
  hostelBlocks as SEED_HOSTEL_BLOCKS,
  HOSTEL_ROOMS_DATA as SEED_HOSTEL_ROOMS,
} from "./hostelData.js";
import {
  INITIAL_ATTENDANCE_STUDENTS as SEED_ATTENDANCE_STUDENTS,
  createDefaultAttendanceMap,
} from "./hostelAttendanceData.js";

const STORAGE_KEY = "pirnav_hostel_management_store_v1";

const INITIAL_CATEGORIES = [
  {
    id: "cat-1",
    name: "Single Occupancy AC Deluxe",
    type: "AC Accommodation",
    specification: "AC, Attached Bath, Study Table, Balcony",
    capacity: 1,
    fee: "₹12,500/mo",
    totalRooms: 12,
    totalBeds: 12,
    blocks: "Boys Residence - Block A, Girls Residence - Block A",
    status: "Active",
  },
  {
    id: "cat-2",
    name: "Double Sharing AC Standard",
    type: "AC Accommodation",
    specification: "AC, Common Bath, Wi-Fi, Wardrobes",
    capacity: 2,
    fee: "₹8,500/mo",
    totalRooms: 28,
    totalBeds: 56,
    blocks: "Boys Residence - Block A, Boys Residence - Block B",
    status: "Active",
  },
  {
    id: "cat-3",
    name: "Double Sharing Non-AC Standard",
    type: "Non-AC Standard",
    specification: "Ceiling Fan, Natural Ventilation, Wardrobe",
    capacity: 2,
    fee: "₹6,500/mo",
    totalRooms: 34,
    totalBeds: 68,
    blocks: "Junior College Wing, Girls Residence - Block B",
    status: "Active",
  },
  {
    id: "cat-4",
    name: "Triple Sharing Non-AC Economy",
    type: "Non-AC Standard",
    specification: "Spacious Room, 3 Beds, Shared Washrooms",
    capacity: 3,
    fee: "₹5,000/mo",
    totalRooms: 20,
    totalBeds: 60,
    blocks: "Junior College Wing",
    status: "Active",
  },
  {
    id: "cat-5",
    name: "Premium Scholar AC Suite",
    type: "Special / Deluxe AC",
    specification: "Air Conditioned, High-Speed LAN, Refrigerator",
    capacity: 1,
    fee: "₹15,000/mo",
    totalRooms: 6,
    totalBeds: 6,
    blocks: "Co-ed Scholars & Staff Wing",
    status: "Active",
  },
];

const INITIAL_WARDENS = [
  {
    id: "w-1",
    empId: "WRD-2021-01",
    name: "Dr. K. Ramesh",
    designation: "Chief Resident Warden",
    phone: "+91 98451 22301",
    email: "ramesh.k@college.edu",
    assignedHostels: "Boys Residence - Block A",
    gender: "Male",
    status: "Active",
  },
  {
    id: "w-2",
    empId: "WRD-2022-04",
    name: "Mr. S. Sundaram",
    designation: "Senior Resident Warden",
    phone: "+91 97120 44512",
    email: "sundaram.s@college.edu",
    assignedHostels: "Boys Residence - Block B, Junior Wing",
    gender: "Male",
    status: "Active",
  },
  {
    id: "w-3",
    empId: "WRD-2020-02",
    name: "Dr. M. Anuradha",
    designation: "Chief Resident Warden",
    phone: "+91 98765 11200",
    email: "anuradha.m@college.edu",
    assignedHostels: "Girls Residence - Block A",
    gender: "Female",
    status: "Active",
  },
  {
    id: "w-4",
    empId: "WRD-2023-09",
    name: "Mrs. P. Revathi",
    designation: "Resident Assistant Warden",
    phone: "+91 98831 66720",
    email: "revathi.p@college.edu",
    assignedHostels: "Girls Residence - Block B",
    gender: "Female",
    status: "Active",
  },
];

const INITIAL_ALLOCATED_STUDENTS = [
  {
    id: "ADM-2024-001",
    name: "Rahul Sharma",
    studentName: "Rahul Sharma",
    admissionNo: "ADM-2024-001",
    admNo: "ADM-2024-001",
    gender: "Male",
    block: "Boys Residence - Block A",
    blockName: "Boys Residence - Block A",
    blockCode: "BR-A",
    floor: "Floor 1",
    room: "Room #101",
    roomBadge: "Room #101 (BED-1)",
    roomBed: "Room #101 (BED-1)",
    joinDate: "2026-08-01",
    fee: "₹6,500",
    monthlyFee: "₹6,500",
    status: "Allocated",
    contact: "+91 98765 00123",
  },
  {
    id: "ADM-2024-015",
    name: "Sneha Reddy",
    studentName: "Sneha Reddy",
    admissionNo: "ADM-2024-015",
    admNo: "ADM-2024-015",
    gender: "Female",
    block: "Girls Residence - Block A",
    blockName: "Girls Residence - Block A",
    blockCode: "GR-A",
    floor: "Floor 1",
    room: "Room #102",
    roomBadge: "Room #102 (BED-1)",
    roomBed: "Room #102 (BED-1)",
    joinDate: "2026-08-03",
    fee: "₹6,500",
    monthlyFee: "₹6,500",
    status: "Allocated",
    contact: "+91 98765 00124",
  },
  {
    id: "ADM-2024-042",
    name: "Vikram Patel",
    studentName: "Vikram Patel",
    admissionNo: "ADM-2024-042",
    admNo: "ADM-2024-042",
    gender: "Male",
    block: "Boys Residence - Block B",
    blockName: "Boys Residence - Block B",
    blockCode: "BR-B",
    floor: "Floor 2",
    room: "Room #201",
    roomBadge: "Room #201 (BED-2)",
    roomBed: "Room #201 (BED-2)",
    joinDate: "2026-08-05",
    fee: "₹7,000",
    monthlyFee: "₹7,000",
    status: "Allocated",
    contact: "+91 98765 00125",
  },
  {
    id: "ADM-2024-068",
    name: "Priya Nair",
    studentName: "Priya Nair",
    admissionNo: "ADM-2024-068",
    admNo: "ADM-2024-068",
    gender: "Female",
    block: "Girls Residence - Block A",
    blockName: "Girls Residence - Block A",
    blockCode: "GR-A",
    floor: "Floor 1",
    room: "Room #103",
    roomBadge: "Room #103 (BED-1)",
    roomBed: "Room #103 (BED-1)",
    joinDate: "2026-08-07",
    fee: "₹6,500",
    monthlyFee: "₹6,500",
    status: "Allocated",
    contact: "+91 98765 00126",
  },
  {
    id: "ADM-2024-095",
    name: "Amit Kumar",
    studentName: "Amit Kumar",
    admissionNo: "ADM-2024-095",
    admNo: "ADM-2024-095",
    gender: "Male",
    block: "Boys Residence - Block A",
    blockName: "Boys Residence - Block A",
    blockCode: "BR-A",
    floor: "Floor 3",
    room: "Room #301",
    roomBadge: "Room #301 (BED-1)",
    roomBed: "Room #301 (BED-1)",
    joinDate: "2026-08-10",
    fee: "₹8,000",
    monthlyFee: "₹8,000",
    status: "Allocated",
    contact: "+91 98765 00127",
  },
  {
    id: "ADM-2024-112",
    name: "Ananya Verma",
    studentName: "Ananya Verma",
    admissionNo: "ADM-2024-112",
    admNo: "ADM-2024-112",
    gender: "Female",
    block: "Junior College Wing",
    blockName: "Junior College Wing",
    blockCode: "JCW",
    floor: "Floor 2",
    room: "Room #202",
    roomBadge: "Room #202 (BED-1)",
    roomBed: "Room #202 (BED-1)",
    joinDate: "2026-08-12",
    fee: "₹5,500",
    monthlyFee: "₹5,500",
    status: "Allocated",
    contact: "+91 98765 00128",
  },
];

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

function buildSeedState() {
  return {
    blocks: SEED_HOSTEL_BLOCKS,
    categories: INITIAL_CATEGORIES,
    rooms: SEED_HOSTEL_ROOMS,
    wardens: INITIAL_WARDENS,
    allocations: INITIAL_ALLOCATED_STUDENTS,
    outpasses: INITIAL_OUTPASSES,
    transfers: INITIAL_TRANSFERS,
    attendanceRecords: {
      morning: createDefaultAttendanceMap("morning"),
      night: createDefaultAttendanceMap("night"),
    },
    attendanceStudents: SEED_ATTENDANCE_STUDENTS,
  };
}

// In-memory cache + observer listeners
let cache = null;
const listeners = new Set();

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

export const getHostelStore = () => {
  if (cache) return cache;
  if (hasStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Array.isArray(parsed.blocks) &&
          Array.isArray(parsed.allocations)
        ) {
          cache = {
            ...buildSeedState(),
            ...parsed,
          };
          return cache;
        }
      }
    } catch {
      // Fall through to seed state
    }
  }
  const seeded = buildSeedState();
  cache = seeded;
  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch {
      // Ignore write errors
    }
  }
  return cache;
};

export const saveHostelStore = (updater) => {
  const current = getHostelStore();
  const next = typeof updater === "function" ? updater(current) : updater;
  cache = next;

  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable or full
    }
  }

  listeners.forEach((fn) => {
    try {
      fn(next);
    } catch (err) {
      console.error("Hostel store listener error:", err);
    }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hostel-store-update", { detail: next })
    );
  }

  return next;
};

export const subscribeHostelStore = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// React hook to access and subscribe to reactive hostel store
export function useHostelStore() {
  const [state, setState] = useState(() => getHostelStore());

  useEffect(() => {
    const unsubscribe = subscribeHostelStore((next) => {
      setState({ ...next });
    });
    const handleEvent = (e) => {
      if (e.detail) setState({ ...e.detail });
    };
    if (typeof window !== "undefined") {
      window.addEventListener("hostel-store-update", handleEvent);
    }
    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("hostel-store-update", handleEvent);
      }
    };
  }, []);

  return state;
}

// Compute live metrics for Dashboard and Reports
export function computeHostelMetrics(store = getHostelStore()) {
  const blocks = store.blocks || [];
  const allocations = store.allocations || [];
  const wardens = store.wardens || [];

  const totalHostels = blocks.length;
  const totalCapacity = blocks.reduce(
    (acc, b) => acc + (Number(b.totalBeds) || 0),
    0
  );
  const activeAllocations = allocations.filter((a) => a.status === "Allocated");
  const occupiedBeds = activeAllocations.length;
  const vacantBeds = Math.max(0, totalCapacity - occupiedBeds);
  const occupancyRate =
    totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;
  const hostellers = occupiedBeds;

  // Monthly revenue from allocations
  const monthlyRevenue = activeAllocations.reduce((acc, a) => {
    const num = parseInt(
      String(a.monthlyFee || a.fee || "0").replace(/[^0-9]/g, ""),
      10
    );
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const activeWardens = wardens.filter((w) => w.status === "Active").length;

  return {
    totalHostels,
    totalCapacity,
    occupiedBeds,
    vacantBeds,
    occupancyRate,
    hostellers,
    monthlyRevenue,
    activeWardens,
  };
}

// --- Action Helpers ---

// Blocks
export function addHostelBlock(block) {
  return saveHostelStore((prev) => ({
    ...prev,
    blocks: [...prev.blocks, block],
  }));
}

export function updateHostelBlock(id, updatedFields) {
  return saveHostelStore((prev) => ({
    ...prev,
    blocks: prev.blocks.map((b) =>
      b.id === id ? { ...b, ...updatedFields } : b
    ),
  }));
}

export function deleteHostelBlock(id) {
  return saveHostelStore((prev) => ({
    ...prev,
    blocks: prev.blocks.filter((b) => b.id !== id),
  }));
}

// Categories
export function addHostelCategory(cat) {
  return saveHostelStore((prev) => ({
    ...prev,
    categories: [...prev.categories, cat],
  }));
}

export function updateHostelCategory(id, updatedFields) {
  return saveHostelStore((prev) => ({
    ...prev,
    categories: prev.categories.map((c) =>
      c.id === id ? { ...c, ...updatedFields } : c
    ),
  }));
}

export function deleteHostelCategory(id) {
  return saveHostelStore((prev) => ({
    ...prev,
    categories: prev.categories.filter((c) => c.id !== id),
  }));
}

// Rooms
export function addHostelRoom(room) {
  return saveHostelStore((prev) => ({
    ...prev,
    rooms: [...prev.rooms, room],
  }));
}

export function updateHostelRoom(roomNo, blockOrFields, updatedFields) {
  const targetBlock = typeof blockOrFields === "string" ? blockOrFields : null;
  const fields =
    typeof blockOrFields === "object" && blockOrFields !== null
      ? blockOrFields
      : updatedFields || {};

  return saveHostelStore((prev) => ({
    ...prev,
    rooms: prev.rooms.map((r) =>
      r.roomNo === roomNo && (!targetBlock || r.block === targetBlock)
        ? { ...r, ...fields }
        : r
    ),
  }));
}

export function deleteHostelRoom(roomNo, block) {
  return saveHostelStore((prev) => ({
    ...prev,
    rooms: prev.rooms.filter(
      (r) => !(r.roomNo === roomNo && (!block || r.block === block))
    ),
  }));
}

// Wardens
export function addHostelWarden(warden) {
  return saveHostelStore((prev) => ({
    ...prev,
    wardens: [...prev.wardens, warden],
  }));
}

export function updateHostelWarden(id, updatedFields) {
  return saveHostelStore((prev) => ({
    ...prev,
    wardens: prev.wardens.map((w) =>
      w.id === id ? { ...w, ...updatedFields } : w
    ),
  }));
}

export function deleteHostelWarden(id) {
  return saveHostelStore((prev) => ({
    ...prev,
    wardens: prev.wardens.filter((w) => w.id !== id),
  }));
}

// Student Allocations
export function addHostelAllocation(allocation) {
  return saveHostelStore((prev) => {
    const updatedBlocks = prev.blocks.map((b) => {
      if (b.name === allocation.block || b.code === allocation.blockCode) {
        const occ = (Number(b.occupiedBeds) || 0) + 1;
        const vac = Math.max(0, (Number(b.totalBeds) || 0) - occ);
        return { ...b, occupiedBeds: occ, vacantBeds: vac };
      }
      return b;
    });

    const newStudentId = allocation.admissionNo || allocation.id || allocation.admNo;
    const existsInAtt = prev.attendanceStudents?.some((s) => s.id === newStudentId);
    const updatedAttStudents = existsInAtt
      ? prev.attendanceStudents
      : [
          ...(prev.attendanceStudents || []),
          {
            id: newStudentId,
            name: allocation.name || allocation.studentName,
            block: allocation.block || "Hostel Block",
            room: allocation.room || "Room",
            bed: allocation.bed || "BED-1",
            roomBed:
              allocation.roomBed ||
              `${allocation.room || "Room"} (${allocation.bed || "BED-1"})`,
            floor: allocation.floor || "Floor 1",
            gender: allocation.gender || "Male",
            phone: allocation.contact || "--",
            parentName: "--",
          },
        ];

    return {
      ...prev,
      blocks: updatedBlocks,
      allocations: [allocation, ...prev.allocations],
      attendanceStudents: updatedAttStudents,
    };
  });
}

export function updateHostelAllocation(id, updatedFields) {
  return saveHostelStore((prev) => ({
    ...prev,
    allocations: prev.allocations.map((a) =>
      a.id === id || a.admissionNo === id || a.admNo === id
        ? { ...a, ...updatedFields }
        : a
    ),
  }));
}

export function vacateHostelAllocation(id, reason) {
  return saveHostelStore((prev) => {
    const target = prev.allocations.find(
      (a) => a.id === id || a.admissionNo === id || a.admNo === id
    );
    const updatedAllocations = prev.allocations.filter(
      (a) => !(a.id === id || a.admissionNo === id || a.admNo === id)
    );

    let updatedBlocks = prev.blocks;
    if (target) {
      updatedBlocks = prev.blocks.map((b) => {
        if (b.name === target.block || b.code === target.blockCode) {
          const occ = Math.max(0, (Number(b.occupiedBeds) || 0) - 1);
          const vac = Math.min(
            Number(b.totalBeds) || 0,
            (Number(b.totalBeds) || 0) - occ
          );
          return { ...b, occupiedBeds: occ, vacantBeds: vac };
        }
        return b;
      });
    }

    const vacateLog = target
      ? [
          {
            id: `tr-${Date.now()}`,
            studentName: target.name || target.studentName,
            admissionNo: target.admissionNo || target.id,
            currentBlock: target.block || target.blockName,
            currentRoom: target.roomBed || target.room,
            targetBlock: "--",
            targetRoom: "--",
            requestType: "Vacate Bed",
            reason: reason || "Resident student vacated room",
            requestDate: new Date().toISOString().split("T")[0],
            status: "Processed",
          },
          ...prev.transfers,
        ]
      : prev.transfers;

    return {
      ...prev,
      blocks: updatedBlocks,
      allocations: updatedAllocations,
      transfers: vacateLog,
    };
  });
}

// Outpasses
export function addHostelOutpass(outpass) {
  return saveHostelStore((prev) => ({
    ...prev,
    outpasses: [outpass, ...prev.outpasses],
  }));
}

export function updateHostelOutpassStatus(id, status) {
  return saveHostelStore((prev) => ({
    ...prev,
    outpasses: prev.outpasses.map((o) =>
      o.id === id ? { ...o, status } : o
    ),
  }));
}

export function deleteHostelOutpass(id) {
  return saveHostelStore((prev) => ({
    ...prev,
    outpasses: prev.outpasses.filter((o) => o.id !== id),
  }));
}

// Transfers
export function addHostelTransfer(transfer) {
  return saveHostelStore((prev) => ({
    ...prev,
    transfers: [transfer, ...prev.transfers],
  }));
}

export function updateHostelTransferStatus(id, status) {
  return saveHostelStore((prev) => {
    const targetTransfer = prev.transfers.find((t) => t.id === id);
    let updatedAllocations = prev.allocations;
    let updatedBlocks = prev.blocks;

    if (targetTransfer && status === "Approved") {
      if (targetTransfer.requestType === "Vacate Bed") {
        const alloc = prev.allocations.find(
          (a) =>
            a.admissionNo === targetTransfer.admissionNo ||
            a.admNo === targetTransfer.admissionNo ||
            a.id === targetTransfer.admissionNo
        );
        if (alloc) {
          updatedAllocations = prev.allocations.filter(
            (a) =>
              !(
                a.admissionNo === targetTransfer.admissionNo ||
                a.admNo === targetTransfer.admissionNo ||
                a.id === targetTransfer.admissionNo
              )
          );
          updatedBlocks = prev.blocks.map((b) => {
            if (b.name === alloc.block || b.code === alloc.blockCode) {
              const occ = Math.max(0, (Number(b.occupiedBeds) || 0) - 1);
              const vac = Math.min(
                Number(b.totalBeds) || 0,
                (Number(b.totalBeds) || 0) - occ
              );
              return { ...b, occupiedBeds: occ, vacantBeds: vac };
            }
            return b;
          });
        }
      } else if (
        targetTransfer.requestType === "Block Transfer" ||
        targetTransfer.requestType === "Room Change"
      ) {
        updatedAllocations = prev.allocations.map((a) => {
          if (
            a.admissionNo === targetTransfer.admissionNo ||
            a.admNo === targetTransfer.admissionNo ||
            a.id === targetTransfer.admissionNo
          ) {
            return {
              ...a,
              block:
                targetTransfer.targetBlock && targetTransfer.targetBlock !== "--"
                  ? targetTransfer.targetBlock
                  : a.block,
              room:
                targetTransfer.targetRoom && targetTransfer.targetRoom !== "--"
                  ? targetTransfer.targetRoom
                  : a.room,
              roomBed:
                targetTransfer.targetRoom && targetTransfer.targetRoom !== "--"
                  ? `${targetTransfer.targetRoom} (BED-1)`
                  : a.roomBed,
            };
          }
          return a;
        });
      }
    }

    return {
      ...prev,
      blocks: updatedBlocks,
      allocations: updatedAllocations,
      transfers: prev.transfers.map((t) =>
        t.id === id ? { ...t, status } : t
      ),
    };
  });
}

export function deleteHostelTransfer(id) {
  return saveHostelStore((prev) => ({
    ...prev,
    transfers: prev.transfers.filter((t) => t.id !== id),
  }));
}

// Attendance
export function updateHostelAttendanceStatus(mode, studentId, status, inTime, outTime) {
  return saveHostelStore((prev) => {
    const currentModeRecords = prev.attendanceRecords[mode] || {};
    const existing = currentModeRecords[studentId] || {};
    const defaultIn = mode === "morning" ? "07:00 AM" : "08:00 PM";
    const defaultOut = mode === "morning" ? "08:30 AM" : "09:30 PM";

    let finalIn = inTime !== undefined ? inTime : existing.inTime;
    let finalOut = outTime !== undefined ? outTime : existing.outTime;

    if (status === "Present" || status === "Half Day") {
      if (!finalIn || finalIn === "--") finalIn = defaultIn;
      if (!finalOut || finalOut === "--") finalOut = defaultOut;
    } else if (status === "Absent" || status === "Leave") {
      finalIn = "--";
      finalOut = "--";
    }

    return {
      ...prev,
      attendanceRecords: {
        ...prev.attendanceRecords,
        [mode]: {
          ...currentModeRecords,
          [studentId]: {
            status,
            inTime: finalIn,
            outTime: finalOut,
          },
        },
      },
    };
  });
}

export function updateAllHostelAttendanceStatus(mode, studentIds, status) {
  return saveHostelStore((prev) => {
    const currentModeRecords = { ...(prev.attendanceRecords[mode] || {}) };
    const defaultIn = mode === "morning" ? "07:00 AM" : "08:00 PM";
    const defaultOut = mode === "morning" ? "08:30 AM" : "09:30 PM";

    studentIds.forEach((id) => {
      let inTime = "--";
      let outTime = "--";
      if (status === "Present" || status === "Half Day") {
        inTime = defaultIn;
        outTime = defaultOut;
      }
      currentModeRecords[id] = { status, inTime, outTime };
    });

    return {
      ...prev,
      attendanceRecords: {
        ...prev.attendanceRecords,
        [mode]: currentModeRecords,
      },
    };
  });
}

export function saveHostelAttendanceLog(arg1, arg2, records) {
  const mode =
    arg1 === "morning" || arg1 === "night"
      ? arg1
      : arg2 === "morning" || arg2 === "night"
      ? arg2
      : "morning";

  return saveHostelStore((prev) => ({
    ...prev,
    attendanceRecords: {
      ...prev.attendanceRecords,
      [mode]: {
        ...(prev.attendanceRecords[mode] || {}),
        ...records,
      },
    },
  }));
}
