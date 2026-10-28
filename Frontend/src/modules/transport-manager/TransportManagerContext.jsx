import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import * as staffApi from "@/api/staffApi.js";
import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
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

const resolvePhotoUrl = (value) => {
  const path = String(value ?? "").trim();
  if (!path) return "";
  if (/^(?:https?:|blob:|data:)/i.test(path)) return path;
  const baseUrl = (env?.apiBaseUrl || "").replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/${path.replace(/^\/+/, "")}` : path;
};

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
  aadhaarCardUrl: null,
  aadhaarDocument: null,
  pan: null,
  panNumber: null,
  panCardUrl: null,
  panDocument: null,
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
  highestQualification: "Graduate",
  designation: "Transport Manager",
  designationId: 534,
  role: "Transport Manager",
  roleId: 18,
  roleName: "Transport Manager",
  staffType: "Non-Teaching",
  facultyType: "Non-Teaching",
  departmentId: 79,
  department: "Transport",
  campusId: 1,
  campusName: "Main Campus (HQ)",
  assignedCampusIds: [1],
  assignedCampuses: [
    { id: 1, name: "Main Campus (HQ)", code: "MAIN" }
  ],
  boardId: 1,
  boardCode: "BIEAP",
  boardName: "Board of Intermediate Education, Andhra Pradesh",
  board: "BIEAP",
  assignedBoardIds: [1],
  assignedBoards: [
    { id: 1, name: "Board of Intermediate Education, Andhra Pradesh", code: "BIEAP" }
  ],
  dateOfJoining: "2026-08-01T00:00:00",
  joiningDate: "2026-08-01T00:00:00",
  experience: 0,
  totalExperience: "0 Years",
  employmentType: "Full Time",
  status: "Active",
  profileStatus: "Completed",
  profileCompletion: 68,
  profileCompletionPercentage: 68,
  isDriver: true,
  drivingLicenseNumber: "DAKH345678JNKJAB",
  drivingLicenseExpiryDate: "2028-07-01T00:00:00",
  drivingLicence: "Staff_Profile_MTCH0063_tangiro_kamado.pdf",
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
  documentsList: [
    {
      id: "98349d94-9db7-4a97-b43b-53f75bbb6e12",
      type: "DrivingLicence",
      name: "Staff_Profile_MTCH0063_tangiro_kamado.pdf",
      size: "Unknown",
      url: "/uploads/staff-documents/Staff_Profile_MTCH0063_tangiro_kamado.pdf",
      format: "PDF",
    },
  ],
  documentsMap: {
    DrivingLicence: "Staff_Profile_MTCH0063_tangiro_kamado.pdf",
  },
  bankDetails: {
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    accountType: "Savings",
    panNumber: "",
    basicSalary: null,
  },
  emergencyContact: {
    contactName: "",
    relationship: "",
    mobile: "",
    alternateMobile: "",
    address: "",
  },
  allocatedSubjects: [],
  subjects: [],
  educationList: [],
  experienceList: [],
  customFields: {},
  departmentSpecific: {},
  photoUrl: "",
  photoPath: "",
  profilePhoto: "",
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
          const rawPhoto = data.photoUrl || data.photoPath || data.profilePhoto || "";
          const resolvedPhoto = rawPhoto ? resolvePhotoUrl(rawPhoto) : "";
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
              photoUrl: resolvedPhoto || prev.photoUrl || "",
              photoPath: data.photoPath || rawPhoto || prev.photoPath || "",
              profilePhoto: data.profilePhoto || rawPhoto || prev.profilePhoto || "",
            };
            try {
              const toPersist = { ...merged };
              delete toPersist.photoUrl;
              delete toPersist.photoPath;
              delete toPersist.profilePhoto;
              localStorage.setItem("tm_profile_data", JSON.stringify(toPersist));
            } catch {}
            return merged;
          });

          if (!resolvedPhoto && effectiveStaffId) {
            apiClient.get(apiEndpoints.faculty.getPhoto(effectiveStaffId), {
              responseType: "blob",
              skipGlobalLoader: true,
              skipErrorLog: true,
            }).then((photoRes) => {
              if (!active) return;
              if (photoRes?.data instanceof Blob && photoRes.data.size > 0 && (photoRes.data.type || "").startsWith("image/")) {
                const blobUrl = URL.createObjectURL(photoRes.data);
                setStaffProfile((prev) => ({
                  ...prev,
                  photoUrl: blobUrl,
                }));
              }
            }).catch(() => null);
          }
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
          const parsed = JSON.parse(e.newValue);
          delete parsed.photoUrl;
          delete parsed.photoPath;
          delete parsed.profilePhoto;
          setStaffProfile((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Listen to in-memory photo update events
  useEffect(() => {
    const handlePhotoUpdated = (e) => {
      const nextPhoto = e.detail?.photoUrl;
      if (nextPhoto !== undefined) {
        setStaffProfile((prev) => ({
          ...prev,
          photoUrl: nextPhoto,
          photoPath: nextPhoto,
          profilePhoto: nextPhoto,
        }));
      }
    };
    window.addEventListener("cms-staff-photo-updated", handlePhotoUpdated);
    return () => window.removeEventListener("cms-staff-photo-updated", handlePhotoUpdated);
  }, []);

  const updateProfile = useCallback((patch) => {
    setStaffProfile((prev) => {
      const updated = { ...prev, ...patch };
      try {
        const toPersist = { ...updated };
        delete toPersist.photoUrl;
        delete toPersist.photoPath;
        delete toPersist.profilePhoto;
        localStorage.setItem("tm_profile_data", JSON.stringify(toPersist));
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
      photoUrl: staffProfile.photoUrl || "",
      photoPath: staffProfile.photoPath || "",
      profilePhoto: staffProfile.profilePhoto || "",
    };
  }, [staffProfile, authUser]);

  // Authorized Campuses & Boards strictly from assigned staff details
  const authorizedCampuses = useMemo(() => {
    if (Array.isArray(profile.assignedCampuses) && profile.assignedCampuses.length > 0) {
      return profile.assignedCampuses;
    }
    return [{ id: 1, campusId: 1, name: "Main Campus (HQ)", code: "MAIN" }];
  }, [profile.assignedCampuses]);

  const authorizedBoards = useMemo(() => {
    if (Array.isArray(profile.assignedBoards) && profile.assignedBoards.length > 0) {
      return profile.assignedBoards;
    }
    return [{ id: 1, boardId: 1, code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh" }];
  }, [profile.assignedBoards]);

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

  // Effective filter parameters strictly for campus, board and academic year
  const effectiveCampusId = useMemo(() => {
    return Number(selectedCampus?.id || selectedCampus?.campusId || profile.campusId || 1);
  }, [selectedCampus, profile.campusId]);

  const effectiveBoardId = useMemo(() => {
    return Number(selectedBoardId || profile.boardId || 1);
  }, [selectedBoardId, profile.boardId]);

  const effectiveAcademicYearId = useMemo(() => {
    return academicContext.selectedAcademicYearId || (academicContext.selectedAcademicYear?.id || academicContext.selectedAcademicYear?.name) || 1;
  }, [academicContext.selectedAcademicYearId, academicContext.selectedAcademicYear]);

  // Scope filter helper
  const filterByScope = useCallback((list) => {
    if (!Array.isArray(list)) return [];
    return list.filter((item) => {
      if (!item) return false;
      const cId = item.campusId ?? item.CampusId;
      const bId = item.boardId ?? item.BoardId;
      const ayId = item.academicYearId ?? item.AcademicYearId;

      if (cId != null && String(cId) !== String(effectiveCampusId)) return false;
      if (bId != null && String(bId) !== String(effectiveBoardId)) return false;
      if (ayId != null && String(ayId) !== String(effectiveAcademicYearId)) return false;

      const cList = item.assignedCampusIds ?? item.assignedCampuses;
      if (Array.isArray(cList) && cList.length > 0) {
        const match = cList.some((c) => String(typeof c === "object" ? c.id || c.campusId : c) === String(effectiveCampusId));
        if (!match) return false;
      }

      const bList = item.assignedBoardIds ?? item.assignedBoards;
      if (Array.isArray(bList) && bList.length > 0) {
        const match = bList.some((b) => String(typeof b === "object" ? b.id || b.boardId : b) === String(effectiveBoardId));
        if (!match) return false;
      }

      return true;
    });
  }, [effectiveCampusId, effectiveBoardId, effectiveAcademicYearId]);

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
        const params = {
          boardId: effectiveBoardId,
          campusId: effectiveCampusId,
          academicYearId: effectiveAcademicYearId,
          BoardId: effectiveBoardId,
          CampusId: effectiveCampusId,
          AcademicYearId: effectiveAcademicYearId,
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

        if (vehiclesRes.status === "fulfilled") setVehicles(filterByScope(vehiclesRes.value));
        if (driversRes.status === "fulfilled") setDrivers(filterByScope(driversRes.value));
        if (assignmentsRes.status === "fulfilled") setAssignments(filterByScope(assignmentsRes.value));
        if (maintenanceRes.status === "fulfilled") setMaintenance(filterByScope(maintenanceRes.value));
        if (statsRes.status === "fulfilled") setDashboardMetrics(statsRes.value);
        if (routesRes.status === "fulfilled") setRoutes(filterByScope(routesRes.value));
        if (pickupsRes.status === "fulfilled") setPickupPoints(filterByScope(pickupsRes.value));
        if (attendantsRes.status === "fulfilled") setAttendants(filterByScope(attendantsRes.value));
        if (tripsRes.status === "fulfilled") setTrips(filterByScope(tripsRes.value));
        if (studentsRes.status === "fulfilled") setStudentAssignments(filterByScope(studentsRes.value));
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
  }, [effectiveCampusId, effectiveBoardId, effectiveAcademicYearId, revision, filterByScope]);

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
    authorizedCampuses,
    authorizedBoards,
    selectedBoardId,
    setSelectedBoardId,
    effectiveCampusId,
    effectiveBoardId,
    effectiveAcademicYearId,
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
