import api from "./axios";

// ==================== HOSTEL BLOCKS ====================

export const getHostelBlocks = (params) =>
  api.get("/api/v1/hostel/blocks", { params });

export const getHostelBlockById = (id) =>
  api.get(`/api/v1/hostel/blocks/${id}`);

export const createHostelBlock = (data) =>
  api.post("/api/v1/hostel/blocks", data);

export const updateHostelBlock = (id, data) =>
  api.put(`/api/v1/hostel/blocks/${id}`, data);

export const deleteHostelBlock = (id) =>
  api.delete(`/api/v1/hostel/blocks/${id}`);

// ==================== ROOM CATEGORIES (Room Types) ====================

export const getRoomTypes = (params) =>
  api.get("/api/v1/hostel/room-types", { params });

export const getRoomTypeById = (id) =>
  api.get(`/api/v1/hostel/room-types/${id}`);

export const createRoomType = (data) =>
  api.post("/api/v1/hostel/room-types", data);

export const updateRoomType = (id, data) =>
  api.put(`/api/v1/hostel/room-types/${id}`, data);

export const deleteRoomType = (id) =>
  api.delete(`/api/v1/hostel/room-types/${id}`);

// ==================== ROOMS ====================

export const getRooms = (params) =>
  api.get("/api/v1/hostel/rooms", { params });

export const getRoomById = (id) =>
  api.get(`/api/v1/hostel/rooms/${id}`);

export const createRoom = (data) =>
  api.post("/api/v1/hostel/rooms", data);

export const updateRoom = (id, data) =>
  api.put(`/api/v1/hostel/rooms/${id}`, data);

export const deleteRoom = (id) =>
  api.delete(`/api/v1/hostel/rooms/${id}`);

// ==================== BEDS ====================

export const getBeds = (params) =>
  api.get("/api/v1/hostel/beds", { params });

export const getBedById = (id) =>
  api.get(`/api/v1/hostel/beds/${id}`);

export const createBed = (data) =>
  api.post("/api/v1/hostel/beds", data);

export const updateBed = (id, data) =>
  api.put(`/api/v1/hostel/beds/${id}`, data);

export const deleteBed = (id) =>
  api.delete(`/api/v1/hostel/beds/${id}`);

// ==================== WARDEN ALLOCATION ====================

export const getWardens = (params) =>
  api.get("/api/v1/hostel/wardens", { params });

export const getWardenById = (id) =>
  api.get(`/api/v1/hostel/wardens/${id}`);

export const createWarden = (data) =>
  api.post("/api/v1/hostel/wardens", data);

export const updateWarden = (id, data) =>
  api.put(`/api/v1/hostel/wardens/${id}`, data);

export const deleteWarden = (id) =>
  api.delete(`/api/v1/hostel/wardens/${id}`);

// ==================== STUDENT HOSTEL ALLOCATION ====================

export const getStudentAllocations = (params) =>
  api.get("/api/v1/hostel/student-allocations", { params });

export const getStudentAllocationById = (id) =>
  api.get(`/api/v1/hostel/student-allocations/${id}`);

export const createStudentAllocation = (data) =>
  api.post("/api/v1/hostel/student-allocations", data);

export const updateStudentAllocation = (id, data) =>
  api.put(`/api/v1/hostel/student-allocations/${id}`, data);

export const deleteStudentAllocation = (id) =>
  api.delete(`/api/v1/hostel/student-allocations/${id}`);

// ==================== HOSTEL ATTENDANCE ====================

export const getAttendance = (params) =>
  api.get("/api/v1/hostel/attendance", { params });

export const getAttendanceById = (id) =>
  api.get(`/api/v1/hostel/attendance/${id}`);

export const createAttendance = (data) =>
  api.post("/api/v1/hostel/attendance", data);

export const updateAttendance = (id, data) =>
  api.put(`/api/v1/hostel/attendance/${id}`, data);

export const deleteAttendance = (id) =>
  api.delete(`/api/v1/hostel/attendance/${id}`);

// ==================== OUTPASS & LEAVE MANAGEMENT ====================

export const getOutpassLeave = (params) =>
  api.get("/api/v1/hostel/outpass-leave", { params });

export const getOutpassLeaveById = (id) =>
  api.get(`/api/v1/hostel/outpass-leave/${id}`);

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

export const getTransferVacateById = (id) =>
  api.get(`/api/v1/hostel/transfer-vacate/${id}`);

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
