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

export const getWardenMe = (params) =>
  api.get("/api/v1/hostel/warden/me", { params });

export const getWardenProfile = (params) =>
  api.get("/api/v1/hostel/warden/profile", { params });

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

export const getComplaints = (params) =>
  api.get("/api/v1/hostel/complaints", { params });

export const getComplaintById = (id, params) =>
  api.get(`/api/v1/hostel/complaints/${id}`, { params });

export const createComplaint = (data) =>
  api.post("/api/v1/hostel/complaints", data);

export const updateComplaint = (id, data) =>
  api.put(`/api/v1/hostel/complaints/${id}`, data);

export const deleteComplaint = (id) =>
  api.delete(`/api/v1/hostel/complaints/${id}`);

export const updateComplaintStatus = (id, data) =>
  api.put(`/api/v1/hostel/complaints/${id}/status`, data);

export const patchComplaintStatus = (id, data) =>
  api.patch(`/api/v1/hostel/complaints/${id}/status`, data);

export const getComplaintCategories = (params) =>
  api.get("/api/v1/hostel/complaints/categories", { params });

export const getComplaintPriorities = (params) =>
  api.get("/api/v1/hostel/complaints/priorities", { params });

export const getComplaintStatuses = (params) =>
  api.get("/api/v1/hostel/complaints/statuses", { params });
