import api from "./axios.js";

/**
 * PIRNAV HOSTEL MANAGEMENT MODULE APIs
 * Communicates directly with Backend Hostel Controller (/api/v1/hostel/*)
 * No mock data or mock fallbacks are used.
 */

// ==================== HOSTEL BLOCKS ====================

export const getHostelBlocks = (params, config = {}) =>
  api.get("/api/v1/hostel/blocks", { params, ...config });

export const getHostelBlockById = (id, config = {}) =>
  api.get(`/api/v1/hostel/blocks/${id}`, config);

export const createHostelBlock = (data, config = {}) =>
  api.post("/api/v1/hostel/blocks", data, config);

export const updateHostelBlock = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/blocks/${id}`, data, config);

export const deleteHostelBlock = (id, config = {}) =>
  api.delete(`/api/v1/hostel/blocks/${id}`, config);

// ==================== ROOM CATEGORIES (Room Types) ====================

export const getRoomTypes = (params, config = {}) =>
  api.get("/api/v1/hostel/room-types", { params, ...config });

export const getRoomTypeById = (id, config = {}) =>
  api.get(`/api/v1/hostel/room-types/${id}`, config);

export const createRoomType = (data, config = {}) =>
  api.post("/api/v1/hostel/room-types", data, config);

export const updateRoomType = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/room-types/${id}`, data, config);

export const deleteRoomType = (id, config = {}) =>
  api.delete(`/api/v1/hostel/room-types/${id}`, config);

// ==================== ROOMS ====================

export const getRooms = (params, config = {}) =>
  api.get("/api/v1/hostel/rooms", { params, ...config });

export const getRoomById = (id, config = {}) =>
  api.get(`/api/v1/hostel/rooms/${id}`, config);

export const createRoom = (data, config = {}) =>
  api.post("/api/v1/hostel/rooms", data, config);

export const updateRoom = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/rooms/${id}`, data, config);

export const deleteRoom = (id, config = {}) =>
  api.delete(`/api/v1/hostel/rooms/${id}`, config);

// ==================== BEDS ====================

export const getBeds = (params, config = {}) =>
  api.get("/api/v1/hostel/beds", { params, ...config });

export const getBedById = (id, config = {}) =>
  api.get(`/api/v1/hostel/beds/${id}`, config);

export const createBed = (data, config = {}) =>
  api.post("/api/v1/hostel/beds", data, config);

export const updateBed = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/beds/${id}`, data, config);

export const deleteBed = (id, config = {}) =>
  api.delete(`/api/v1/hostel/beds/${id}`, config);

// ==================== WARDEN ALLOCATION ====================

export const getWardens = (params, config = {}) =>
  api.get("/api/v1/hostel/wardens", { params, ...config });

export const getWardenById = (id, config = {}) =>
  api.get(`/api/v1/hostel/wardens/${id}`, config);

export const createWarden = (data, config = {}) =>
  api.post("/api/v1/hostel/wardens", data, config);

export const updateWarden = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/wardens/${id}`, data, config);

export const deleteWarden = (id, config = {}) =>
  api.delete(`/api/v1/hostel/wardens/${id}`, config);

// ==================== STUDENT HOSTEL ALLOCATION ====================

export const getStudentAllocations = (params, config = {}) =>
  api.get("/api/v1/hostel/student-allocations", { params, ...config });

export const getStudentAllocationById = (id, config = {}) =>
  api.get(`/api/v1/hostel/student-allocations/${id}`, config);

export const createStudentAllocation = (data, config = {}) =>
  api.post("/api/v1/hostel/student-allocations", data, config);

export const updateStudentAllocation = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/student-allocations/${id}`, data, config);

export const vacateStudentAllocation = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/student-allocations/${id}/vacate`, data, config);

export const deleteStudentAllocation = (id, config = {}) =>
  api.delete(`/api/v1/hostel/student-allocations/${id}`, config);

// ==================== HOSTEL ATTENDANCE ====================

export const getAttendance = (params, config = {}) =>
  api.get("/api/v1/hostel/attendance", { params, ...config });

export const getAttendanceById = (id, config = {}) =>
  api.get(`/api/v1/hostel/attendance/${id}`, config);

export const createAttendance = (data, config = {}) =>
  api.post("/api/v1/hostel/attendance", data, config);

export const markAttendance = (data, config = {}) =>
  api.post("/api/v1/hostel/attendance", data, config);

export const updateAttendance = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/attendance/${id}`, data, config);

export const deleteAttendance = (id, config = {}) =>
  api.delete(`/api/v1/hostel/attendance/${id}`, config);

// ==================== OUTPASS & LEAVE MANAGEMENT ====================

export const getOutpassLeave = (params, config = {}) =>
  api.get("/api/v1/hostel/outpass-leave", { params, ...config });

export const getOutpassLeaveById = (id, config = {}) =>
  api.get(`/api/v1/hostel/outpass-leave/${id}`, config);

export const createOutpassLeave = (data, config = {}) =>
  api.post("/api/v1/hostel/outpass-leave", data, config);

export const updateOutpassLeave = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/outpass-leave/${id}`, data, config);

export const approveOutpassLeave = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/outpass-leave/${id}/approval`, data, config);

export const deleteOutpassLeave = (id, config = {}) =>
  api.delete(`/api/v1/hostel/outpass-leave/${id}`, config);

// ==================== TRANSFER & VACATE ====================

export const getTransferVacate = (params, config = {}) =>
  api.get("/api/v1/hostel/transfer-vacate", { params, ...config });

export const getTransferVacateById = (id, config = {}) =>
  api.get(`/api/v1/hostel/transfer-vacate/${id}`, config);

export const createTransferVacate = (data, config = {}) =>
  api.post("/api/v1/hostel/transfer-vacate", data, config);

export const updateTransferVacate = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/transfer-vacate/${id}`, data, config);

export const approveTransferVacate = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/transfer-vacate/${id}/approval`, data, config);

export const settleTransferVacate = (id, data, config = {}) =>
  api.put(`/api/v1/hostel/transfer-vacate/${id}/settlement`, data, config);

export const completeTransferVacate = (id, config = {}) =>
  api.post(`/api/v1/hostel/transfer-vacate/${id}/complete`, {}, config);

export const deleteTransferVacate = (id, config = {}) =>
  api.delete(`/api/v1/hostel/transfer-vacate/${id}`, config);

// ==================== HOSTEL DASHBOARD ====================

export const getHostelDashboard = (params, config = {}) =>
  api.get("/api/v1/hostel/dashboard", { params, ...config });

// ==================== HOSTEL REPORTS ====================

export const getOccupancyReport = (params, config = {}) =>
  api.get("/api/v1/hostel/reports/occupancy", { params, ...config });

export const getStudentsReport = (params, config = {}) =>
  api.get("/api/v1/hostel/reports/students", { params, ...config });

export const getAttendanceReport = (params, config = {}) =>
  api.get("/api/v1/hostel/reports/attendance", { params, ...config });

export const getOutpassLeaveReport = (params, config = {}) =>
  api.get("/api/v1/hostel/reports/outpass-leave", { params, ...config });

export const getTransferVacateReport = (params, config = {}) =>
  api.get("/api/v1/hostel/reports/transfer-vacate", { params, ...config });

// ==================== COMPLAINTS ====================

export const createHostelComplaint = (data, config = {}) =>
  api.post("/api/v1/hostel/complaints", data, config);
