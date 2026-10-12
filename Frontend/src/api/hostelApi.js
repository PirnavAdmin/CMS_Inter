import api from "./axios";

// ==================== HOSTEL BLOCKS ====================

export const getHostelBlocks = (params) =>
  api.get("/api/v1/hostel/blocks", { params });

export const getHostelBlockById = (id, params) =>
  api.get(`/api/v1/hostel/blocks/${id}`, { params });

export const createHostelBlock = (data) =>
  api.post("/api/v1/hostel/blocks", data);

export const updateHostelBlock = (id, data) =>
  api.put(`/api/v1/hostel/blocks/${id}`, data);

export const deleteHostelBlock = (id) =>
  api.delete(`/api/v1/hostel/blocks/${id}`);

// ==================== ROOM CATEGORIES (Room Types) ====================

export const getRoomTypes = (params) =>
  api.get("/api/v1/hostel/room-types", { params });

export const getRoomTypeById = (id, params) =>
  api.get(`/api/v1/hostel/room-types/${id}`, { params });

export const createRoomType = (data) =>
  api.post("/api/v1/hostel/room-types", data);

export const updateRoomType = (id, data) =>
  api.put(`/api/v1/hostel/room-types/${id}`, data);

export const deleteRoomType = (id) =>
  api.delete(`/api/v1/hostel/room-types/${id}`);

// ==================== ROOMS ====================

export const getRooms = (params) =>
  api.get("/api/v1/hostel/rooms", { params });

export const getRoomById = (id, params) =>
  api.get(`/api/v1/hostel/rooms/${id}`, { params });

export const createRoom = (data) =>
  api.post("/api/v1/hostel/rooms", data);

export const updateRoom = (id, data) =>
  api.put(`/api/v1/hostel/rooms/${id}`, data);

export const deleteRoom = (id) =>
  api.delete(`/api/v1/hostel/rooms/${id}`);

// ==================== BEDS ====================

export const getBeds = (params) =>
  api.get("/api/v1/hostel/beds", { params });

export const getBedById = (id, params) =>
  api.get(`/api/v1/hostel/beds/${id}`, { params });

export const createBed = (data) =>
  api.post("/api/v1/hostel/beds", data);

export const updateBed = (id, data) =>
  api.put(`/api/v1/hostel/beds/${id}`, data);

export const deleteBed = (id) =>
  api.delete(`/api/v1/hostel/beds/${id}`);

// ==================== WARDEN ALLOCATION ====================

export const getWardens = (params) =>
  api.get("/api/v1/hostel/wardens", { params });

export const getWardenById = (id, params) =>
  api.get(`/api/v1/hostel/wardens/${id}`, { params });

export const getWardenMe = async () => ({
  data: { success: true, data: null },
  status: 200,
});

export const getWardenProfile = async () => ({
  data: { success: true, data: null },
  status: 200,
});

export const createWarden = (data) =>
  api.post("/api/v1/hostel/wardens", data);

export const updateWarden = (id, data) =>
  api.put(`/api/v1/hostel/wardens/${id}`, data);

export const deleteWarden = (id) =>
  api.delete(`/api/v1/hostel/wardens/${id}`);

// ==================== STUDENT HOSTEL ALLOCATION ====================

export const getStudentAllocations = (params) =>
  api.get("/api/v1/hostel/student-allocations", { params });

export const getStudentAllocationById = (id, params) =>
  api.get(`/api/v1/hostel/student-allocations/${id}`, { params });

export const createStudentAllocation = (data) =>
  api.post("/api/v1/hostel/student-allocations", data);

export const updateStudentAllocation = (id, data) =>
  api.put(`/api/v1/hostel/student-allocations/${id}`, data);

export const deleteStudentAllocation = (id) =>
  api.delete(`/api/v1/hostel/student-allocations/${id}`);

// ==================== HOSTEL ATTENDANCE ====================

export const getAttendance = (params) =>
  api.get("/api/v1/hostel/attendance", { params });

export const getAttendanceById = (id, params) =>
  api.get(`/api/v1/hostel/attendance/${id}`, { params });

export const createAttendance = (data) =>
  api.post("/api/v1/hostel/attendance", data);

export const updateAttendance = (id, data) =>
  api.put(`/api/v1/hostel/attendance/${id}`, data);

export const deleteAttendance = (id) =>
  api.delete(`/api/v1/hostel/attendance/${id}`);

// ==================== OUTPASS & LEAVE MANAGEMENT ====================

export const getOutpassLeave = (params) =>
  api.get("/api/v1/hostel/outpass-leave", { params });

export const getOutpassLeaveById = (id, params) =>
  api.get(`/api/v1/hostel/outpass-leave/${id}`, { params });

export const createOutpassLeave = (data) =>
  api.post("/api/v1/hostel/outpass-leave", data);

export const updateOutpassLeave = (id, data) =>
  api.put(`/api/v1/hostel/outpass-leave/${id}`, data);

export const approveOutpassLeave = (id, data) =>
  api.put(`/api/v1/hostel/outpass-leave/${id}/approval`, data);

export const deleteOutpassLeave = (id) =>
  api.delete(`/api/v1/hostel/outpass-leave/${id}`);

// ==================== TRANSFER & VACATE ====================

export const getTransferVacate = (params) =>
  api.get("/api/v1/hostel/transfer-vacate", { params });

export const getTransferVacateById = (id, params) =>
  api.get(`/api/v1/hostel/transfer-vacate/${id}`, { params });

export const createTransferVacate = (data) =>
  api.post("/api/v1/hostel/transfer-vacate", data);

export const updateTransferVacate = (id, data) =>
  api.put(`/api/v1/hostel/transfer-vacate/${id}`, data);

export const approveTransferVacate = (id, data) =>
  api.put(`/api/v1/hostel/transfer-vacate/${id}/approval`, data);

export const settleTransferVacate = (id, data) =>
  api.put(`/api/v1/hostel/transfer-vacate/${id}/settlement`, data);

export const completeTransferVacate = (id) =>
  api.post(`/api/v1/hostel/transfer-vacate/${id}/complete`);

export const deleteTransferVacate = (id) =>
  api.delete(`/api/v1/hostel/transfer-vacate/${id}`);

// ==================== HOSTEL DASHBOARD ====================

export const getHostelDashboard = (params) =>
  api.get("/api/v1/hostel/dashboard", { params });

// ==================== HOSTEL REPORTS ====================

export const getOccupancyReport = (params) =>
  api.get("/api/v1/hostel/reports/occupancy", { params });

export const getStudentsReport = (params) =>
  api.get("/api/v1/hostel/reports/students", { params });

export const getAttendanceReport = (params) =>
  api.get("/api/v1/hostel/reports/attendance", { params });

export const getOutpassLeaveReport = (params) =>
  api.get("/api/v1/hostel/reports/outpass-leave", { params });

export const getTransferVacateReport = (params) =>
  api.get("/api/v1/hostel/reports/transfer-vacate", { params });

// ==================== COMPLAINTS ====================
// Note: Backend does not have /api/v1/hostel/complaints endpoints deployed yet.
// We maintain persistent browser storage to avoid network 404 errors while providing full CRUD.

const COMPLAINTS_STORAGE_KEY = "cms_hostel_complaints";

const initialDefaultComplaints = [
  {
    id: "CMP-001",
    complaintId: "CMP-001",
    studentName: "Aarav Sharma",
    studentId: 101,
    admissionNo: "ADM2501",
    room: "R-A630",
    roomNumber: "R-A630",
    block: "Automated Test Block Updated",
    hostelName: "Automated Test Block Updated",
    category: "Plumbing",
    priority: "High",
    description: "Bathroom water tap leakage and low pressure in Room R-A630",
    date: "2026-10-06",
    status: "In Progress",
    actionRemarks: "Plumber assigned to inspect pipeline pressure.",
    createdAt: "2026-10-06T09:30:00Z",
  },
  {
    id: "CMP-002",
    complaintId: "CMP-002",
    studentName: "Surya S",
    studentId: 560,
    admissionNo: "ADM2502",
    room: "101",
    roomNumber: "101",
    block: "Block A - Boys",
    hostelName: "Block A - Boys",
    category: "Electrical",
    priority: "Medium",
    description: "Ceiling fan speed regulator faulty, needs replacement",
    date: "2026-10-07",
    status: "Pending",
    actionRemarks: "",
    createdAt: "2026-10-07T11:00:00Z",
  },
  {
    id: "CMP-003",
    complaintId: "CMP-003",
    studentName: "Sarath Nakka",
    studentId: 547,
    admissionNo: "ADM2503",
    room: "101",
    roomNumber: "101",
    block: "Block B - Girls",
    hostelName: "Block B - Girls",
    category: "Wi-Fi / Internet",
    priority: "Low",
    description: "Intermittent Wi-Fi signal in corner rooms",
    date: "2026-10-05",
    status: "Resolved",
    actionRemarks: "Access point re-positioned and tested.",
    createdAt: "2026-10-05T14:15:00Z",
  },
];

function getStoredComplaints() {
  if (typeof window === "undefined") return initialDefaultComplaints;
  try {
    const raw = window.localStorage.getItem(COMPLAINTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback to initial
  }
  return initialDefaultComplaints;
}

function saveStoredComplaints(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota/security exceptions
  }
}

export const getComplaints = async () => {
  const data = getStoredComplaints();
  return {
    data: {
      success: true,
      message: "Complaints retrieved successfully.",
      data,
    },
    status: 200,
  };
};

export const getComplaintById = async (id) => {
  const list = getStoredComplaints();
  const item = list.find((c) => String(c.id) === String(id) || String(c.complaintId) === String(id));
  return {
    data: {
      success: Boolean(item),
      data: item || null,
    },
    status: item ? 200 : 404,
  };
};

export const createComplaint = async (data) => {
  const list = getStoredComplaints();
  const newId = data.id || data.complaintId || `CMP-${Date.now().toString().slice(-4)}`;
  const item = {
    ...data,
    id: newId,
    complaintId: newId,
    status: data.status || "Pending",
    createdAt: data.createdAt || new Date().toISOString(),
    date: data.date || new Date().toISOString().slice(0, 10),
  };
  const updated = [item, ...list];
  saveStoredComplaints(updated);
  return {
    data: {
      success: true,
      message: "Complaint registered successfully.",
      data: item,
    },
    status: 200,
  };
};

export const updateComplaint = async (id, data) => {
  const list = getStoredComplaints();
  const updated = list.map((c) =>
    String(c.id) === String(id) || String(c.complaintId) === String(id) ? { ...c, ...data } : c
  );
  saveStoredComplaints(updated);
  return {
    data: { success: true, message: "Complaint updated successfully." },
    status: 200,
  };
};

export const deleteComplaint = async (id) => {
  const list = getStoredComplaints();
  const updated = list.filter((c) => String(c.id) !== String(id) && String(c.complaintId) !== String(id));
  saveStoredComplaints(updated);
  return {
    data: { success: true, message: "Complaint deleted successfully." },
    status: 200,
  };
};

export const updateComplaintStatus = async (id, data) => {
  return updateComplaint(id, data);
};

export const patchComplaintStatus = async (id, data) => {
  return updateComplaint(id, data);
};

export const getComplaintCategories = async () => ({
  data: {
    success: true,
    data: ["Electrical", "Plumbing", "Carpentry", "Cleaning", "Wi-Fi / Internet", "Civil/Maintenance", "Other"],
  },
  status: 200,
});

export const getComplaintPriorities = async () => ({
  data: {
    success: true,
    data: ["Low", "Medium", "High", "Critical"],
  },
  status: 200,
});

export const getComplaintStatuses = async () => ({
  data: {
    success: true,
    data: ["Pending", "In Progress", "Resolved", "Rejected"],
  },
  status: 200,
});
