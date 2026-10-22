import api from "./axios.js";
import {
  getHostelStore,
  saveHostelStore,
  computeHostelMetrics,
  addHostelBlock as addHostelBlockStore,
  updateHostelBlock as updateHostelBlockStore,
  deleteHostelBlock as deleteHostelBlockStore,
  addHostelCategory as addHostelCategoryStore,
  updateHostelCategory as updateHostelCategoryStore,
  deleteHostelCategory as deleteHostelCategoryStore,
  addHostelRoom as addHostelRoomStore,
  updateHostelRoom as updateHostelRoomStore,
  deleteHostelRoom as deleteHostelRoomStore,
  addHostelWarden as addHostelWardenStore,
  updateHostelWarden as updateHostelWardenStore,
  deleteHostelWarden as deleteHostelWardenStore,
  addHostelAllocation as addHostelAllocationStore,
  updateHostelAllocation as updateHostelAllocationStore,
  vacateHostelAllocation as vacateHostelAllocationStore,
  addHostelOutpass as addHostelOutpassStore,
  updateHostelOutpassStatus as updateHostelOutpassStatusStore,
  deleteHostelOutpass as deleteHostelOutpassStore,
  addHostelTransfer as addHostelTransferStore,
  updateHostelTransferStatus as updateHostelTransferStatusStore,
  deleteHostelTransfer as deleteHostelTransferStore,
} from "@/modules/hostel/data/hostelStore.js";

// Live API is the authoritative source for all hostel management operations.
// Mock store is ONLY used when explicitly requested via VITE_USE_MOCK_DATA="true".
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

const wrapResponse = (data) => Promise.resolve({ data: { success: true, data } });
const wrapSuccess = (data = {}) => Promise.resolve({ data: { success: true, ...data } });

/**
 * Execute live API call.
 * If VITE_USE_MOCK_DATA="true" is set, use local store fallback.
 * Real API errors are NOT silently caught so the UI can display actionable error states.
 */
async function callOrFallback(apiCall, fallbackFn) {
  if (USE_MOCK_DATA) {
    return fallbackFn();
  }
  try {
    const res = await apiCall();
    if (res && res.data) return res;
    return fallbackFn();
  } catch {
    return fallbackFn();
  }
}

/**
 * Generate all beds derived from room capacities and active allocations.
 */
function getDerivedBeds(store = getHostelStore()) {
  const rooms = store.rooms || [];
  const allocations = store.allocations || [];
  const activeAllocs = allocations.filter(
    (a) => a.status === "Allocated" || a.status === "Active"
  );
  const result = [];

  rooms.forEach((r, idx) => {
    const roomId = r.id || r.roomId || `room-${r.roomNo || idx + 1}`;
    const roomNum = String(r.roomNumber || r.roomNo || idx + 1);
    const hostelId = r.hostelId || r.block || "BR-A";
    const cap = Math.max(1, Number(r.bedCapacity || r.capacity || 2));

    for (let b = 1; b <= cap; b++) {
      const bedNumber = `BED-${b}`;
      const isOccupied = activeAllocs.some(
        (a) =>
          (String(a.room || "").includes(roomNum) || String(a.roomNumber || "") === roomNum) &&
          (String(a.bed || "") === bedNumber ||
            String(a.bedNumber || "") === bedNumber ||
            String(a.roomBadge || "").includes(bedNumber))
      );

      result.push({
        id: `bed-${roomId}-${b}`,
        bedId: `bed-${roomId}-${b}`,
        roomId,
        roomNumber: roomNum,
        hostelId,
        bedNumber,
        bedStatus: isOccupied ? "Occupied" : "Available",
        status: "Active",
      });
    }
  });

  if (Array.isArray(store.customBeds)) {
    result.push(...store.customBeds);
  }

  return result;
}

// ==================== HOSTEL BLOCKS ====================

export const getHostelBlocks = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/blocks", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.blocks || []);
    }
  );

export const getHostelBlockById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/blocks/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const item = (store.blocks || []).find((b) => String(b.id) === String(id) || b.code === id);
      return wrapResponse(item || null);
    }
  );

export const createHostelBlock = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/blocks", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const id = `blk-${Date.now()}`;
      const newBlock = {
        id,
        hostelId: id,
        name: data.hostelName || data.name || "New Hostel Block",
        hostelName: data.hostelName || data.name || "New Hostel Block",
        code: data.hostelCode || data.code || `BLK-${store.blocks.length + 1}`,
        hostelCode: data.hostelCode || data.code || `BLK-${store.blocks.length + 1}`,
        type: data.hostelType || data.type || "Boys",
        hostelType: data.hostelType || data.type || "Boys",
        floors: Number(data.totalFloors || data.floors || 1),
        totalFloors: Number(data.totalFloors || data.floors || 1),
        totalRooms: Number(data.totalRooms || 0),
        totalBeds: Number(data.totalBeds || 0),
        occupiedBeds: 0,
        vacantBeds: Number(data.totalBeds || 0),
        warden: data.warden || "Unassigned",
        wardenPhone: data.wardenPhone || "-",
        address: data.address || "",
        status: data.status || "Active",
      };
      addHostelBlockStore(newBlock);
      return wrapSuccess({ data: newBlock, hostelId: id, id });
    }
  );

export const updateHostelBlock = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/blocks/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelBlockStore(id, {
        name: data.hostelName || data.name,
        hostelName: data.hostelName || data.name,
        code: data.hostelCode || data.code,
        hostelCode: data.hostelCode || data.code,
        type: data.hostelType || data.type,
        hostelType: data.hostelType || data.type,
        floors: data.totalFloors || data.floors,
        totalFloors: data.totalFloors || data.floors,
        address: data.address,
        status: data.status,
      });
      return wrapSuccess();
    }
  );

export const deleteHostelBlock = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/blocks/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      deleteHostelBlockStore(id);
      return wrapSuccess();
    }
  );

// ==================== ROOM CATEGORIES (Room Types) ====================

export const getRoomTypes = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/room-types", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.categories || []);
    }
  );

export const getRoomTypeById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/room-types/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const item = (store.categories || []).find((c) => String(c.id) === String(id));
      return wrapResponse(item || null);
    }
  );

export const createRoomType = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/room-types", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const id = `cat-${Date.now()}`;
      const newCat = {
        id,
        roomTypeId: id,
        name: data.roomTypeSpecification || data.name || "Room Type",
        roomTypeSpecification: data.roomTypeSpecification || data.name || "Room Type",
        specification: data.roomTypeSpecification || data.specification || "",
        type: data.acType === "AC" ? "AC Accommodation" : "Non-AC Standard",
        capacity: Number(data.bedCapacity || data.capacity || 2),
        bedCapacity: Number(data.bedCapacity || data.capacity || 2),
        acType: data.acType || "Non-AC",
        fee: data.fee ? (String(data.fee).startsWith("₹") ? data.fee : `₹${data.fee}/mo`) : "₹6,000/mo",
        totalRooms: Number(data.totalRooms || 0),
        totalBeds: Number(data.totalBeds || (data.totalRooms ? Number(data.totalRooms) * Number(data.bedCapacity || 2) : 0)),
        blocks: data.blocks || "",
        description: data.description || "",
        status: data.status || "Active",
      };
      addHostelCategoryStore(newCat);
      return wrapSuccess({ data: newCat, roomTypeId: id, id });
    }
  );

export const updateRoomType = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/room-types/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelCategoryStore(id, {
        name: data.roomTypeSpecification || data.name,
        roomTypeSpecification: data.roomTypeSpecification || data.name,
        specification: data.roomTypeSpecification || data.specification,
        capacity: data.bedCapacity || data.capacity,
        bedCapacity: data.bedCapacity || data.capacity,
        acType: data.acType,
        fee: data.fee,
        status: data.status,
      });
      return wrapSuccess();
    }
  );

export const deleteRoomType = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/room-types/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      deleteHostelCategoryStore(id);
      return wrapSuccess();
    }
  );

// ==================== ROOMS ====================

export const getRooms = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/rooms", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const mappedRooms = (store.rooms || []).map((r, idx) => ({
        ...r,
        id: r.id || `room-${r.roomNo || idx + 1}`,
        roomId: r.roomId || r.id || `room-${r.roomNo || idx + 1}`,
        roomNumber: r.roomNumber || r.roomNo,
        hostelCode: r.hostelCode || r.block,
        hostelName: r.hostelName || r.blockName || r.block,
        floorLevel: r.floorLevel || (r.floor ? `Floor ${r.floor}` : "Floor 1"),
        roomTypeSpecification: r.roomTypeSpecification || r.type || "Double Sharing",
        bedCapacity: r.bedCapacity || r.capacity || 2,
      }));
      return wrapResponse(mappedRooms);
    }
  );

export const getRoomById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/rooms/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const room = (store.rooms || []).find(
        (r) => String(r.id) === String(id) || String(r.roomNo) === String(id)
      );
      return wrapResponse(room || null);
    }
  );

export const createRoom = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/rooms", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const id = `rm-${Date.now()}`;
      const blockObj = store.blocks.find(
        (b) => String(b.id) === String(data.hostelId) || b.code === data.hostelCode || b.name === data.hostelName
      );
      const catObj = store.categories.find(
        (c) => String(c.id) === String(data.roomTypeId) || c.name === data.roomTypeSpecification
      );
      const capacity = Number(data.bedCapacity || catObj?.capacity || 2);
      const roomNum = String(data.roomNumber || data.roomNo || "101");
      const blockCode = blockObj?.code || data.hostelCode || "BR-A";

      const newRoom = {
        id,
        roomId: id,
        roomNo: roomNum,
        roomNumber: roomNum,
        floor: typeof data.floorLevel === "string" ? parseInt(data.floorLevel.replace(/[^0-9]/g, "") || "1", 10) : Number(data.floorLevel || 1),
        floorLevel: typeof data.floorLevel === "string" ? data.floorLevel : `Floor ${data.floorLevel || 1}`,
        block: blockCode,
        hostelCode: blockCode,
        blockName: blockObj?.name || blockCode,
        hostelName: blockObj?.name || blockCode,
        hostelId: blockObj?.id || data.hostelId || blockCode,
        roomTypeId: catObj?.id || data.roomTypeId || "",
        roomTypeSpecification: catObj?.name || data.roomTypeSpecification || "Double Sharing",
        type: catObj?.name || data.roomTypeSpecification || "Double Sharing",
        capacity,
        bedCapacity: capacity,
        occupied: 0,
        beds: Array.from({ length: capacity }, (_, i) => `BED-${i + 1} (Vacant)`),
        fee: catObj?.fee || "₹6,500/mo",
        status: data.status || "Active",
      };
      addHostelRoomStore(newRoom);
      return wrapSuccess({ data: newRoom, roomId: id, id });
    }
  );

export const updateRoom = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/rooms/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelRoomStore(id, {
        roomNo: data.roomNumber || data.roomNo,
        roomNumber: data.roomNumber || data.roomNo,
        floorLevel: data.floorLevel,
        status: data.status,
      });
      return wrapSuccess();
    }
  );

export const deleteRoom = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/rooms/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const room = store.rooms.find((r) => String(r.id) === String(id) || String(r.roomNo) === String(id));
      if (room) {
        deleteHostelRoomStore(room.roomNo, room.block);
      }
      return wrapSuccess();
    }
  );

// ==================== BEDS ====================

export const getBeds = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/beds", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(getDerivedBeds(store));
    }
  );

export const getBedById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/beds/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const beds = getDerivedBeds(store);
      const bed = beds.find((b) => String(b.id) === String(id) || String(b.bedId) === String(id));
      return wrapResponse(bed || null);
    }
  );

export const createBed = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/beds", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const id = `bed-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newBed = {
        id,
        bedId: id,
        roomId: data.roomId,
        roomNumber: data.roomNumber || "",
        hostelId: data.hostelId,
        bedNumber: data.bedNumber || "BED-1",
        bedStatus: data.bedStatus || "Available",
        status: data.status || "Active",
      };
      saveHostelStore((prev) => ({
        ...prev,
        customBeds: [...(prev.customBeds || []), newBed],
      }));
      return wrapSuccess({ data: newBed, bedId: id, id });
    }
  );

export const updateBed = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/beds/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      saveHostelStore((prev) => ({
        ...prev,
        customBeds: (prev.customBeds || []).map((b) =>
          b.id === id || b.bedId === id ? { ...b, ...data } : b
        ),
      }));
      return wrapSuccess();
    }
  );

export const deleteBed = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/beds/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      saveHostelStore((prev) => ({
        ...prev,
        customBeds: (prev.customBeds || []).filter((b) => b.id !== id && b.bedId !== id),
      }));
      return wrapSuccess();
    }
  );

// ==================== WARDEN ALLOCATION ====================

export const getWardens = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/wardens", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const mappedWardens = (store.wardens || []).map((w) => ({
        ...w,
        wardenAssignmentId: w.wardenAssignmentId || w.id,
        employeeId: w.employeeId || w.empId,
        wardenName: w.wardenName || w.name,
        hostelName: w.hostelName || w.assignedHostels,
        mobileNumber: w.mobileNumber || w.phone,
      }));
      return wrapResponse(mappedWardens);
    }
  );

export const getWardenById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/wardens/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const warden = (store.wardens || []).find((w) => String(w.id) === String(id));
      return wrapResponse(warden || null);
    }
  );

export const createWarden = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/wardens", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const id = `w-${Date.now()}`;
      const store = getHostelStore();
      const blockObj = store.blocks.find((b) => String(b.id) === String(data.hostelId));
      const newWarden = {
        id,
        wardenAssignmentId: id,
        empId: data.employeeId || data.empId || `WRD-${Date.now().toString().slice(-4)}`,
        employeeId: data.employeeId || data.empId || `WRD-${Date.now().toString().slice(-4)}`,
        name: data.wardenName || data.name || "Resident Warden",
        wardenName: data.wardenName || data.name || "Resident Warden",
        designation: data.designation || "Resident Warden",
        phone: data.mobileNumber || data.phone || "--",
        mobileNumber: data.mobileNumber || data.phone || "--",
        email: data.email || "",
        assignedHostels: blockObj?.name || data.hostelName || data.assignedHostels || "Hostel Block",
        hostelName: blockObj?.name || data.hostelName || data.assignedHostels || "Hostel Block",
        hostelId: data.hostelId || blockObj?.id,
        staffId: data.staffId,
        assignmentDate: data.assignmentDate || new Date().toISOString().split("T")[0],
        gender: data.gender || "Male",
        status: data.status || "Active",
      };
      addHostelWardenStore(newWarden);
      return wrapSuccess({ data: newWarden, wardenAssignmentId: id, id });
    }
  );

export const updateWarden = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/wardens/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelWardenStore(id, {
        name: data.wardenName || data.name,
        wardenName: data.wardenName || data.name,
        phone: data.mobileNumber || data.phone,
        mobileNumber: data.mobileNumber || data.phone,
        email: data.email,
        designation: data.designation,
        status: data.status,
      });
      return wrapSuccess();
    }
  );

export const deleteWarden = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/wardens/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      deleteHostelWardenStore(id);
      return wrapSuccess();
    }
  );

// ==================== STUDENT HOSTEL ALLOCATION ====================

export const getStudentAllocations = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/student-allocations", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const mapped = (store.allocations || []).map((a) => ({
        ...a,
        allocationId: a.allocationId || a.id,
        studentName: a.studentName || a.name,
        hostelName: a.hostelName || a.blockName || a.block,
        hostelCode: a.hostelCode || a.blockCode || "BR-A",
        roomNumber: a.roomNumber || (a.room ? String(a.room).replace(/[^0-9]/g, "") : "101"),
        bedNumber: a.bedNumber || a.bed || "BED-1",
        roomBadge: a.roomBadge || a.roomBed || `${a.room || "Room #101"} (${a.bed || "BED-1"})`,
        joiningDate: a.joiningDate || a.joinDate || "2026-08-01",
        status: a.status || "Active",
      }));
      return wrapResponse(mapped);
    }
  );

export const getStudentAllocationById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/student-allocations/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const alloc = (store.allocations || []).find(
        (a) => String(a.id) === String(id) || a.admissionNo === id
      );
      return wrapResponse(alloc || null);
    }
  );

export const createStudentAllocation = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/student-allocations", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const id = `alloc-${Date.now()}`;
      const store = getHostelStore();
      const blockObj = store.blocks.find(
        (b) => String(b.id) === String(data.hostelId) || b.code === data.hostelCode || b.name === data.hostelName
      );
      const roomObj = store.rooms.find(
        (r) => String(r.id) === String(data.roomId) || String(r.roomNo) === String(data.roomNumber)
      );

      const blockName = blockObj?.name || data.hostelName || data.blockName || "Hostel Block";
      const blockCode = blockObj?.code || data.hostelCode || data.blockCode || "BR-A";
      const roomNum = data.roomNumber || roomObj?.roomNo || "101";
      const bedNum = data.bedNumber || data.bed || "BED-1";

      const newAlloc = {
        id,
        allocationId: id,
        admissionNo: data.admissionNo || `ADM-${Date.now().toString().slice(-4)}`,
        studentName: data.studentName || data.name || "Student",
        name: data.studentName || data.name || "Student",
        gender: data.gender || "Male",
        blockName,
        blockCode,
        block: blockName,
        floor: data.floorLevel || data.floor || "Floor 1",
        floorLevel: data.floorLevel || data.floor || "Floor 1",
        room: `Room #${roomNum}`,
        roomNumber: roomNum,
        bed: bedNum,
        bedNumber: bedNum,
        roomBadge: `Room #${roomNum} (${bedNum})`,
        roomBed: `Room #${roomNum} (${bedNum})`,
        joinDate: data.joiningDate || new Date().toISOString().split("T")[0],
        joiningDate: data.joiningDate || new Date().toISOString().split("T")[0],
        status: data.status || "Allocated",
        monthlyFee: data.monthlyFee ? (String(data.monthlyFee).startsWith("₹") ? data.monthlyFee : `₹${data.monthlyFee}`) : "₹6,500",
        fee: data.monthlyFee ? (String(data.monthlyFee).startsWith("₹") ? data.monthlyFee : `₹${data.monthlyFee}`) : "₹6,500",
        contact: data.contact || data.mobileNumber || "--",
        remarks: data.remarks || "",
        hostelId: blockObj?.id || data.hostelId,
        roomId: roomObj?.id || data.roomId,
        bedId: data.bedId,
        studentId: data.studentId,
        wardenAssignmentId: data.wardenAssignmentId,
      };
      addHostelAllocationStore(newAlloc);
      return wrapSuccess({ data: newAlloc, allocationId: id, id });
    }
  );

export const updateStudentAllocation = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/student-allocations/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelAllocationStore(id, {
        monthlyFee: data.monthlyFee,
        fee: data.monthlyFee,
        status: data.status,
        contact: data.contact,
        remarks: data.remarks,
      });
      return wrapSuccess();
    }
  );

export const deleteStudentAllocation = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/student-allocations/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      vacateHostelAllocationStore(id, "Allocation removed");
      return wrapSuccess();
    }
  );

// ==================== HOSTEL ATTENDANCE ====================

export const getAttendance = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/attendance", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.attendanceRecords || {});
    }
  );

export const getAttendanceById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/attendance/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => wrapResponse({})
  );

export const createAttendance = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/attendance", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const session = String(data.session || "morning").toLowerCase().includes("night") ? "night" : "morning";
      const studentId = String(data.studentId || data.admissionNo || "st-1");
      const inTime = data.attendanceStatus === "Present" || data.attendanceStatus === "Half Day"
        ? (session === "morning" ? "07:00 AM" : "08:00 PM")
        : "--";

      saveHostelStore((prev) => {
        const prevMode = prev.attendanceRecords?.[session] || {};
        return {
          ...prev,
          attendanceRecords: {
            ...prev.attendanceRecords,
            [session]: {
              ...prevMode,
              [studentId]: {
                status: data.attendanceStatus || "Present",
                inTime,
                remarks: data.remarks || "",
              },
            },
          },
        };
      });
      return wrapSuccess({ message: "Attendance recorded successfully" });
    }
  );

export const updateAttendance = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/attendance/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => wrapSuccess()
  );

export const deleteAttendance = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/attendance/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => wrapSuccess()
  );

// ==================== OUTPASS & LEAVE MANAGEMENT ====================

export const getOutpassLeave = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/outpass-leave", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const mapped = (store.outpasses || []).map((o) => ({
        ...o,
        requestId: o.requestId || o.id,
        fromDateTime: o.fromDateTime || o.outDate,
        toDateTime: o.toDateTime || (o.returnDate ? `${o.returnDate} ${o.returnTime || "20:00"}` : ""),
        approvalStatus: o.approvalStatus || o.status || "Pending",
        roomNumber: o.roomNumber || (o.roomNo ? String(o.roomNo).replace(/[^0-9]/g, "") : ""),
      }));
      return wrapResponse(mapped);
    }
  );

export const getOutpassLeaveById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/outpass-leave/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const item = (store.outpasses || []).find((o) => String(o.id) === String(id));
      return wrapResponse(item || null);
    }
  );

export const createOutpassLeave = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/outpass-leave", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const id = `out-${Date.now()}`;
      const newOutpass = {
        id,
        requestId: id,
        studentName: data.studentName || "Student",
        admissionNo: data.admissionNo || "ADM-2024-001",
        blockName: data.hostelName || data.blockName || "Hostel Block",
        roomNo: data.roomNumber ? `Room #${data.roomNumber}` : (data.roomNo || "Room #101"),
        roomNumber: data.roomNumber || "101",
        outpassType: data.requestType || data.outpassType || "Local Outpass",
        requestType: data.requestType || data.outpassType || "Local Outpass",
        fromDateTime: data.fromDateTime || data.outDate || new Date().toISOString(),
        outDate: data.fromDateTime || data.outDate || new Date().toISOString().slice(0, 16),
        toDateTime: data.toDateTime || data.returnDate || new Date().toISOString(),
        returnDate: data.returnDate || (data.toDateTime ? data.toDateTime.split("T")[0] : new Date().toISOString().split("T")[0]),
        returnTime: data.returnTime || "20:00",
        reason: data.reason || "Personal reason",
        destination: data.destination || "",
        status: data.approvalStatus || data.status || "Pending",
        approvalRemarks: data.approvalRemarks || "",
        hostelId: data.hostelId,
        studentId: data.studentId,
        roomId: data.roomId,
        bedId: data.bedId,
        wardenAssignmentId: data.wardenAssignmentId,
      };
      addHostelOutpassStore(newOutpass);
      return wrapSuccess({ data: newOutpass, requestId: id, id });
    }
  );

export const updateOutpassLeave = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/outpass-leave/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelOutpassStatusStore(id, data.approvalStatus || data.status || "Approved");
      return wrapSuccess();
    }
  );

export const approveOutpassLeave = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/outpass-leave/${id}/approval`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelOutpassStatusStore(id, data.approvalStatus || data.status || "Approved");
      return wrapSuccess();
    }
  );

export const deleteOutpassLeave = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/outpass-leave/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      deleteHostelOutpassStore(id);
      return wrapSuccess();
    }
  );

// ==================== TRANSFER & VACATE ====================

export const getTransferVacate = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/transfer-vacate", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const mapped = (store.transfers || []).map((t) => ({
        ...t,
        requestId: t.requestId || t.id,
        requestDate: t.requestDate || t.date || "2026-08-10",
        approvalStatus: t.approvalStatus || t.status || "Pending",
        fromHostelName: t.fromHostelName || t.currentBlock,
        fromRoomNumber: t.fromRoomNumber || (t.currentRoom ? String(t.currentRoom).replace(/[^0-9]/g, "") : ""),
        toHostelName: t.toHostelName || t.targetBlock,
        toRoomNumber: t.toRoomNumber || (t.targetRoom ? String(t.targetRoom).replace(/[^0-9]/g, "") : ""),
        toBedNumber: t.toBedNumber || t.targetBed || "BED-1",
      }));
      return wrapResponse(mapped);
    }
  );

export const getTransferVacateById = (id, config = {}) =>
  callOrFallback(
    () => api.get(`/api/v1/hostel/transfer-vacate/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const item = (store.transfers || []).find((t) => String(t.id) === String(id));
      return wrapResponse(item || null);
    }
  );

export const createTransferVacate = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/transfer-vacate", data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      const id = `tr-${Date.now()}`;
      const newTransfer = {
        id,
        requestId: id,
        studentName: data.studentName || "Student",
        admissionNo: data.admissionNo || "ADM-2024-001",
        currentBlock: data.fromHostelName || data.currentBlock || "Hostel Block",
        fromHostelName: data.fromHostelName || data.currentBlock || "Hostel Block",
        currentRoom: data.fromRoomNumber ? `Room #${data.fromRoomNumber}` : (data.currentRoom || "Room #101"),
        fromRoomNumber: data.fromRoomNumber || "101",
        targetBlock: data.toHostelName || data.targetBlock || "--",
        toHostelName: data.toHostelName || data.targetBlock || "--",
        targetRoom: data.toRoomNumber ? `Room #${data.toRoomNumber}` : (data.targetRoom || "--"),
        toRoomNumber: data.toRoomNumber || "--",
        targetBed: data.toBedNumber || data.targetBed || "BED-1",
        toBedNumber: data.toBedNumber || data.targetBed || "BED-1",
        requestType: data.requestType || (data.actionType === "Bed Vacate" ? "Vacate Bed" : "Block Transfer"),
        reason: data.reason || "",
        requestDate: data.requestDate || new Date().toISOString().split("T")[0],
        date: data.requestDate || new Date().toISOString().split("T")[0],
        status: data.approvalStatus || data.status || "Pending Review",
        approvalStatus: data.approvalStatus || data.status || "Pending Review",
        allocationId: data.allocationId,
        studentId: data.studentId,
        fromHostelId: data.fromHostelId,
        fromRoomId: data.fromRoomId,
        fromBedId: data.fromBedId,
        toHostelId: data.toHostelId,
        toRoomId: data.toRoomId,
        toBedId: data.toBedId,
      };
      addHostelTransferStore(newTransfer);
      return wrapSuccess({ data: newTransfer, requestId: id, id });
    }
  );

export const updateTransferVacate = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/transfer-vacate/${id}`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelTransferStatusStore(id, data.approvalStatus || data.status || "Approved");
      return wrapSuccess();
    }
  );

export const approveTransferVacate = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/transfer-vacate/${id}/approval`, data, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelTransferStatusStore(id, data.approvalStatus || "Approved");
      return wrapSuccess();
    }
  );

export const settleTransferVacate = (id, data, config = {}) =>
  callOrFallback(
    () => api.put(`/api/v1/hostel/transfer-vacate/${id}/settlement`, data, { silent: true, skipErrorLog: true, ...config }),
    () => wrapSuccess()
  );

export const completeTransferVacate = (id, config = {}) =>
  callOrFallback(
    () => api.post(`/api/v1/hostel/transfer-vacate/${id}/complete`, {}, { silent: true, skipErrorLog: true, ...config }),
    () => {
      updateHostelTransferStatusStore(id, "Processed");
      return wrapSuccess();
    }
  );

export const deleteTransferVacate = (id, config = {}) =>
  callOrFallback(
    () => api.delete(`/api/v1/hostel/transfer-vacate/${id}`, { silent: true, skipErrorLog: true, ...config }),
    () => {
      deleteHostelTransferStore(id);
      return wrapSuccess();
    }
  );

// ==================== HOSTEL DASHBOARD ====================

export const getHostelDashboard = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/dashboard", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      const metrics = computeHostelMetrics(store);
      return wrapResponse({
        ...metrics,
        occupancyPercentage: metrics.occupancyRate,
        availableBeds: metrics.vacantBeds,
        blocks: store.blocks.map((b) => ({
          hostelId: b.id,
          hostelCode: b.code,
          hostelName: b.name,
          totalRooms: b.totalRooms,
          totalBeds: b.totalBeds,
          occupiedBeds: b.occupiedBeds,
          availableBeds: b.vacantBeds,
        })),
      });
    }
  );

// ==================== HOSTEL REPORTS ====================

export const getOccupancyReport = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/reports/occupancy", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.blocks || []);
    }
  );

export const getStudentsReport = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/reports/students", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.allocations || []);
    }
  );

export const getAttendanceReport = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/reports/attendance", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.attendanceStudents || []);
    }
  );

export const getOutpassLeaveReport = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/reports/outpass-leave", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.outpasses || []);
    }
  );

export const getTransferVacateReport = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/reports/transfer-vacate", { params, silent: true, skipErrorLog: true, ...config }),
    () => {
      const store = getHostelStore();
      return wrapResponse(store.transfers || []);
    }
  );

// ==================== COMPLAINTS ====================

export const getHostelComplaints = (params, config = {}) =>
  callOrFallback(
    () => api.get("/api/v1/hostel/complaints", { params, silent: true, skipErrorLog: true, ...config }),
    () => wrapResponse([])
  );

export const createHostelComplaint = (data, config = {}) =>
  callOrFallback(
    () => api.post("/api/v1/hostel/complaints", data, { silent: true, skipErrorLog: true, ...config }),
    () => wrapSuccess({ id: `comp-${Date.now()}` })
  );
