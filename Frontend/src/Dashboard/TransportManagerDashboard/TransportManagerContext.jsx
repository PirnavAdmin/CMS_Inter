import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { getAuthUser } from "@/features/authStorage.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import * as staffApi from "@/api/staffApi.js";
import apiClient from "@/api/apiClient.js";
import { attendanceService } from "@/api/attendanceService.js";
import { getVehicles } from "./services/transportVehicleApi.js";
import { getDrivers } from "./services/transportDriverManagementApi.js";
import { getVehicleAssignments } from "./services/transportAssignmentApi.js";
import { getMaintenanceRecords } from "./services/transportMaintenanceApi.js";
import {
  getTransportDashboardStats,
  getRoutes,
  getPickupPoints,
  getAttendants,
  getTrips,
  getStudentAssignments,
} from "./services/transportManagerApi.js";

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const calculateDurationStr = (inTime, outTime, isActive = false) => {
  if (!inTime || inTime === "--") return "0h 0m";
  const inMins = parseTimeToMinutes(inTime);
  if (inMins === null) return "0h 0m";

  let targetMins;
  if (outTime && outTime !== "--") {
    targetMins = parseTimeToMinutes(outTime);
  } else if (isActive) {
    const now = new Date();
    targetMins = now.getHours() * 60 + now.getMinutes();
  } else {
    return "0h 0m";
  }

  if (targetMins === null) return "0h 0m";
  let diff = targetMins - inMins;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
};

export const DEFAULT_TRANSPORT_MANAGER_PROFILE = {
  id: 1125,
  staffId: 1125,
  facultyId: 1125,
  employeeId: "MNT0044",
  firstName: "muzan",
  middleName: null,
  lastName: "kibutsuzi",
  fullName: "muzan kibutsuzi",
  name: "muzan kibutsuzi",
  guardianName: "yorichi",
  fatherOrHusbandName: "yorichi",
  gender: "Male",
  dateOfBirth: "1995-07-10T00:00:00",
  dob: "1995-07-10",
  maritalStatus: "married",
  nationality: "Indian",
  aadhaar: "961895468299",
  pan: null,
  panNumber: null,
  mobile: "7799352436",
  phone: "7799352436",
  alternateMobile: null,
  email: "pondara.venkatesh@pirnav.com",
  bloodGroup: "O+",
  currentAddress: "hyderabad,telangana",
  permanentAddress: null,
  city: "Srikakulam",
  district: "Srikakulam",
  state: "Andhra Pradesh",
  pin: "532201",
  pincode: "532201",
  country: "India",
  qualification: "Graduate",
  designation: "Transport Manager",
  designationId: 534,
  role: "Transport Manager",
  staffType: "Non-Teaching",
  facultyType: "Non-Teaching",
  departmentId: 79,
  department: "Transport",
  campusId: 1,
  campusName: "Main Campus",
  assignedCampusIds: [1],
  assignedCampuses: [],
  boardId: 1,
  boardCode: "BIEAP",
  boardName: "Board of Intermediate Education, Andhra Pradesh",
  board: "BIEAP",
  assignedBoardIds: [1],
  assignedBoards: [],
  dateOfJoining: "2026-08-01T00:00:00",
  joiningDate: "2026-08-01T00:00:00",
  experience: 0.0,
  employmentType: "Full Time",
  status: "Active",
  isDriver: true,
  drivingLicenseNumber: "DAKH345678JNKJAB",
  drivingLicenseExpiryDate: "2028-07-01T00:00:00",
  documents: [
    {
      id: "98349d94-9db7-4a97-b43b-53f75bbb6e12",
      type: "DrivingLicence",
      name: "Staff_Profile_MTCH0063_tangiro_kamado.pdf",
      size: "Unknown",
      url: "/uploads/staff-documents/Staff_Profile_MTCH0063_tangiro_kamado.pdf",
      format: "PDF",
    },
  ],
};

const TransportManagerContext = createContext(null);

export function TransportManagerProvider({ children }) {
  const authUser = useMemo(() => getAuthUser() || {}, []);
  const { selectedCampus } = useCampusContext?.() || {};
  const academicContext = useAcademicContext?.() || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Entities state
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [trips, setTrips] = useState([]);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);

  const [revision, setRevision] = useState(0);

  // Profile data from storage / API
  const [staffProfile, setStaffProfile] = useState(() => {
    try {
      const auth = getAuthUser();
      const saved = localStorage.getItem("tm_profile_data");
      const base = auth
        ? {
            ...DEFAULT_TRANSPORT_MANAGER_PROFILE,
            ...auth,
            id: auth.staffId || auth.id || DEFAULT_TRANSPORT_MANAGER_PROFILE.id,
            staffId: auth.staffId || auth.id || DEFAULT_TRANSPORT_MANAGER_PROFILE.staffId,
            employeeId: auth.employeeId || DEFAULT_TRANSPORT_MANAGER_PROFILE.employeeId,
            name: auth.name || auth.fullName || DEFAULT_TRANSPORT_MANAGER_PROFILE.name,
            fullName: auth.fullName || auth.name || DEFAULT_TRANSPORT_MANAGER_PROFILE.fullName,
            email: auth.email || DEFAULT_TRANSPORT_MANAGER_PROFILE.email,
            role: auth.designation || auth.role || DEFAULT_TRANSPORT_MANAGER_PROFILE.role,
            designation: auth.designation || DEFAULT_TRANSPORT_MANAGER_PROFILE.designation,
          }
        : DEFAULT_TRANSPORT_MANAGER_PROFILE;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!auth || String(parsed.id) === String(auth.id) || parsed.email === auth.email || String(parsed.staffId) === String(auth.staffId)) {
          return { ...base, ...parsed };
        }
      }
      return base;
    } catch (e) {
      console.warn("Could not read saved tm profile:", e);
    }
    return DEFAULT_TRANSPORT_MANAGER_PROFILE;
  });

  const effectiveStaffId = useMemo(() => {
    return authUser.staffId || authUser.id || DEFAULT_TRANSPORT_MANAGER_PROFILE.id;
  }, [authUser]);

  // Load detailed profile from staff API
  useEffect(() => {
    let active = true;
    const fetchStaff = async () => {
      try {
        let res;
        try {
          res = await staffApi.getStaffById(effectiveStaffId);
        } catch {
          res = await apiClient.get("/api/v1/staff/me");
        }
        const data = res?.data?.data || res?.data;
        if (active && data && typeof data === "object") {
          setStaffProfile((prev) => {
            const fullName = data.fullName || (data.firstName ? `${data.firstName} ${data.lastName || ""}`.trim() : prev.name);
            const merged = {
              ...prev,
              ...data,
              id: data.id || data.staffId || prev.id,
              staffId: data.staffId || data.id || prev.staffId,
              employeeId: data.employeeId || prev.employeeId,
              fullName,
              name: fullName,
              role: data.designation || data.role || prev.role,
              designation: data.designation || prev.designation,
              department: data.department || prev.department,
              phone: data.mobile || prev.phone,
              mobile: data.mobile || prev.mobile,
              campusId: data.campusId || prev.campusId || 1,
              boardId: data.boardId || prev.boardId || 1,
              boardCode: data.boardCode || prev.boardCode || "BIEAP",
            };
            try {
              localStorage.setItem("tm_profile_data", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn("Could not fetch staff profile by ID:", err?.message || err);
      }
    };
    fetchStaff();
    return () => {
      active = false;
    };
  }, [effectiveStaffId]);

  // Biometric punch state
  const [punchState, setPunchState] = useState(() => {
    try {
      const saved = localStorage.getItem("staff_punch_state");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { isPunchedIn: false, inTime: null, outTime: null, hoursWorked: "--" };
  });

  useEffect(() => {
    attendanceService
      .getMyTodayStatus()
      .then((res) => {
        const payload = res?.data || res?.Data || (res?.status ? res : null);
        if (payload) {
          const isPunched = payload.status === "punched_in" || payload.Status === "punched_in";
          const inTime = payload.inTime || payload.InTime || null;
          const outTime = payload.outTime || payload.OutTime || null;
          const next = {
            isPunchedIn: isPunched,
            inTime,
            outTime,
            hoursWorked: inTime ? calculateDurationStr(inTime, outTime, isPunched) : "--",
          };
          setPunchState(next);
          try {
            localStorage.setItem("staff_punch_state", JSON.stringify(next));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn("Could not fetch today punch status in TransportManagerContext:", err?.message || err);
      });
  }, []);

  // Listen to profile updates from other components
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "tm_profile_data" && e.newValue) {
        try {
          setStaffProfile((prev) => ({ ...prev, ...JSON.parse(e.newValue) }));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateProfile = useCallback((patch) => {
    setStaffProfile((prev) => {
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem("tm_profile_data", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Normalised profile object
  const profile = useMemo(() => {
    const name = staffProfile.fullName || staffProfile.name || authUser.fullName || authUser.name || "muzan kibutsuzi";
    return {
      ...DEFAULT_TRANSPORT_MANAGER_PROFILE,
      ...staffProfile,
      id: staffProfile.staffId || staffProfile.id || authUser.staffId || authUser.id || 1125,
      staffId: staffProfile.staffId || staffProfile.id || authUser.staffId || authUser.id || 1125,
      employeeId: staffProfile.employeeId || authUser.employeeId || "MNT0044",
      name,
      fullName: name,
      email: staffProfile.email || authUser.email || "pondara.venkatesh@pirnav.com",
      role: staffProfile.designation || staffProfile.role || authUser.role || "Transport Manager",
      designation: staffProfile.designation || staffProfile.role || authUser.role || "Transport Manager",
      department: staffProfile.department || authUser.department || "Transport",
      departmentId: staffProfile.departmentId || authUser.departmentId || 79,
      phone: staffProfile.mobile || staffProfile.phone || authUser.mobile || "7799352436",
      mobile: staffProfile.mobile || staffProfile.phone || authUser.mobile || "7799352436",
      campusId: staffProfile.campusId || authUser.campusId || 1,
      boardId: staffProfile.boardId || authUser.boardId || 1,
      boardCode: staffProfile.boardCode || authUser.boardCode || "BIEAP",
    };
  }, [staffProfile, authUser]);

  // Board Authorization & Restriction
  const authorizedBoards = useMemo(() => {
    const userBoards = authUser.boards || authUser.assignedBoards || authUser.boardList;
    const campusBoards = selectedCampus?.affiliatedBoards || selectedCampus?.boards || academicContext.boards || [];

    if (Array.isArray(userBoards) && userBoards.length > 0) {
      const userBoardIdentities = userBoards.map((b) =>
        typeof b === "string" ? b.trim().toLowerCase() : String(b.boardId || b.id || b.name || "").trim().toLowerCase()
      );
      return campusBoards.filter((b) => {
        const id = String(b.id || b.boardId || "").trim().toLowerCase();
        const name = String(b.name || b.boardName || "").trim().toLowerCase();
        const code = String(b.code || b.boardCode || "").trim().toLowerCase();
        return userBoardIdentities.includes(id) || userBoardIdentities.includes(name) || userBoardIdentities.includes(code);
      });
    }

    if (campusBoards.length > 0) return campusBoards;
    return [{ id: 1, boardId: 1, code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh" }];
  }, [authUser, selectedCampus, academicContext.boards]);

  // Selected board
  const [selectedBoardId, setSelectedBoardId] = useState(() => {
    if (authorizedBoards.length === 1) {
      return String(authorizedBoards[0].id || authorizedBoards[0].boardId || "1");
    }
    return String(profile.boardId || academicContext.selectedBoardId || "1");
  });

  useEffect(() => {
    if (authorizedBoards.length === 1) {
      setSelectedBoardId(String(authorizedBoards[0].id || authorizedBoards[0].boardId || "1"));
    } else if (authorizedBoards.length > 1 && (!selectedBoardId || !authorizedBoards.some((b) => String(b.id || b.boardId) === String(selectedBoardId)))) {
      setSelectedBoardId(String(authorizedBoards[0].id || authorizedBoards[0].boardId || "1"));
    }
  }, [authorizedBoards, selectedBoardId]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshAll = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  // Fetch transport entities strictly using user's profile campus, board & academic year
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const effectiveCampusId = profile.campusId || selectedCampus?.id || selectedCampus?.campusId || 1;
        const effectiveBoardId = selectedBoardId || String(profile.boardId || 1);
        const effectiveAcademicYearId = academicContext.selectedAcademicYearId || 1;

        const params = {
          boardId: effectiveBoardId,
          campusId: effectiveCampusId,
          academicYearId: effectiveAcademicYearId,
        };

        const [
          vehiclesRes,
          driversRes,
          assignmentsRes,
          maintenanceRes,
          statsRes,
          routesRes,
          pickupsRes,
          attendantsRes,
          tripsRes,
          studentsRes,
        ] = await Promise.allSettled([
          getVehicles(params),
          getDrivers(params),
          getVehicleAssignments(params),
          getMaintenanceRecords(params),
          getTransportDashboardStats(params),
          getRoutes(params),
          getPickupPoints(params),
          getAttendants(params),
          getTrips(params),
          getStudentAssignments(params),
        ]);

        if (!isMounted) return;

        if (vehiclesRes.status === "fulfilled") setVehicles(vehiclesRes.value);
        if (driversRes.status === "fulfilled") setDrivers(driversRes.value);
        if (assignmentsRes.status === "fulfilled") setAssignments(assignmentsRes.value);
        if (maintenanceRes.status === "fulfilled") setMaintenance(maintenanceRes.value);
        if (statsRes.status === "fulfilled") setDashboardMetrics(statsRes.value);
        if (routesRes.status === "fulfilled") setRoutes(routesRes.value);
        if (pickupsRes.status === "fulfilled") setPickupPoints(pickupsRes.value);
        if (attendantsRes.status === "fulfilled") setAttendants(attendantsRes.value);
        if (tripsRes.status === "fulfilled") setTrips(tripsRes.value);
        if (studentsRes.status === "fulfilled") setStudentAssignments(studentsRes.value);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load transport data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedBoardId, selectedCampus, profile.campusId, profile.boardId, academicContext.selectedAcademicYearId, revision]);

  const toggleSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const value = {
    profile,
    staffProfile,
    setStaffProfile,
    updateProfile,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    closeSidebar,
    authorizedBoards,
    selectedBoardId,
    setSelectedBoardId,
    vehicles,
    drivers,
    assignments,
    maintenance,
    routes,
    pickupPoints,
    attendants,
    trips,
    studentAssignments,
    dashboardMetrics,
    punchState,
    setPunchState,
    loading,
    error,
    toast,
    showToast,
    refreshAll,
  };

  return (
    <TransportManagerContext.Provider value={value}>
      {children}
    </TransportManagerContext.Provider>
  );
}

export function useTransportManager() {
  const context = useContext(TransportManagerContext);
  if (!context) {
    throw new Error("useTransportManager must be used within TransportManagerProvider");
  }
  return context;
}

export function useTransportManagerSafe() {
  return useContext(TransportManagerContext);
}
