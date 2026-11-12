import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// No mock data
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { calculateStaffProfileCompletion, isStaffPortalUnlocked } from "./profileCompletion.js";
import * as staffApi from "@/api/staffApi.js";
import { attendanceService } from "@/api/attendanceService.js";

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

const FacultyContext = createContext(null);

export const getStaffStorageKey = (profileOrAuth) => {
  const rawId = profileOrAuth?.staffId || (profileOrAuth?.role !== "Admin" && profileOrAuth?.role !== "Super Admin" ? profileOrAuth?.id : null);
  const empId = profileOrAuth?.employeeId;
  const rawEmail = profileOrAuth?.email;
  const email = Array.isArray(rawEmail)
    ? String(rawEmail[0] || "").toLowerCase().trim()
    : String(rawEmail || "").toLowerCase().trim();
  if (rawId) return `staff_profile_${rawId}`;
  if (empId) return `staff_profile_${empId}`;
  if (email) return `staff_profile_${email}`;
  return null;
};

export const persistStaffProfile = (data) => {
  try {
    const authUser = getAuthUser();
    if (authUser && data) {
      const compPct = calculateStaffProfileCompletion(data);
      const pStatus = data.profileStatus || authUser.profileStatus;
      const isCompleted = isStaffPortalUnlocked(pStatus, authUser.isOnboarded === true);

      const updatedAuth = {
        ...authUser,
        ...(data.photoUrl ? { photoUrl: data.photoUrl, photoPath: data.photoUrl, profilePhoto: data.photoUrl } : {}),
        ...(pStatus ? { profileStatus: pStatus } : {}),
        ...(compPct ? { profileCompletionPercentage: compPct } : {}),
        isOnboarded: isCompleted,
      };
      if (sessionStorage.getItem("user")) sessionStorage.setItem("user", JSON.stringify(updatedAuth));
      if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updatedAuth));
    }
  } catch {}
};

const getInitialProfileData = () => {
  try {
    const authUser = getAuthUser();
    const baseUser = {
      id: "", employeeId: "", firstName: "", lastName: "", fullName: "", email: "", mobile: "",
      designation: "", department: "", role: "Faculty",
      maritalStatus: "", dob: "", gender: "", aadhaar: "", pan: "", bloodGroup: "",
      dateOfJoining: "", bankName: "", accountHolder: "", accountNumber: "", ifsc: "",
      branch: "", accountType: "", houseNumber: "", street: "", city: "", district: "",
      state: "", pin: "", country: "", uanNumber: "", pfNumber: "", experience: [], documents: []
    };
    if (!authUser) return baseUser;

    const nameParts = (authUser.name || authUser.fullName || "").trim().split(/\s+/).filter(Boolean);
    const firstName = authUser.firstName || nameParts[0] || baseUser.firstName;
    const lastName = authUser.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : baseUser.lastName);
    const fullName = authUser.fullName || authUser.name || `${firstName} ${lastName}`.trim();

    return {
      ...baseUser,
      ...authUser,
      id: authUser.staffId || authUser.id || baseUser.id,
      employeeId: authUser.employeeId || authUser.empId || baseUser.employeeId,
      fullName: fullName || baseUser.fullName,
      firstName: firstName || baseUser.firstName,
      lastName: lastName || baseUser.lastName,
      email: authUser.email || baseUser.email,
      role: authUser.role || "Faculty",
      designation: authUser.designation || baseUser.designation,
      department: authUser.department || baseUser.department,
      mobile: authUser.mobile || authUser.phone || baseUser.mobile,
      photoUrl: authUser.photoUrl || authUser.photoPath || authUser.profilePhoto || "",
      _isDetailedLoaded: false,
    };
  } catch {
    return {};
  }
};

const getInitialPunchState = () => ({
  isPunchedIn: false,
  inTime: null,
  outTime: null,
  hoursWorked: "--",
});

export const pathToModule = {
  "": "dashboard",
  dashboard: "dashboard",
  profile: "profile",
  timetable: "timetable",
  classes: "classes",
  attendance: "attendance",
  marks: "marks",
  "exam-duties": "examduties",
  "my-attendance": "myattendance",
  leave: "leave",
  payslips: "salary",
  holidays: "holidays",
  settings: "settings",
  reimbursements: "reimbursements",
};

export const moduleToPath = {
  dashboard: "",
  profile: "profile",
  timetable: "timetable",
  classes: "classes",
  attendance: "attendance",
  marks: "marks",
  examduties: "exam-duties",
  myattendance: "my-attendance",
  leave: "leave",
  salary: "payslips",
  holidays: "holidays",
  settings: "settings",
  reimbursements: "reimbursements",
};

export function FacultyProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Route & Module Synchronization
  const routeModule = location.pathname.replace(/^\/faculty-dashboard\/?/, "").split("/")[0] || "dashboard";
  const activeModule = pathToModule[routeModule] || "dashboard";

  const setActiveModule = (module) => {
    const path = moduleToPath[module];
    navigate("/faculty-dashboard" + (path ? "/" + path : ""));
  };

  // Profile Data State
  const [profileData, setProfileData] = useState(getInitialProfileData);
  const [isLoadingProfile, setIsLoadingProfile] = useState(() => Boolean(getAuthUser()));
  const hasLoadedProfileRef = useRef(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileStep, setProfileStep] = useState(1);

  // Synchronize profile data with authenticated user and fetch full staff record if available
  const fetchStaffProfileSafe = useCallback(() => {
    const authUser = getAuthUser();
    if (!authUser) {
      setIsLoadingProfile(false);
      return;
    }
    if (!hasLoadedProfileRef.current) {
      setIsLoadingProfile(true);
    }

    const nameParts = (authUser.name || authUser.fullName || "").trim().split(/\s+/).filter(Boolean);
    const firstName = authUser.firstName || nameParts[0] || "";
    const lastName = authUser.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");
    const fullName = authUser.fullName || authUser.name || `${firstName} ${lastName}`.trim();

    setProfileData((prev) => ({
      ...prev,
      ...authUser,
      id: authUser.staffId || authUser.id || prev.id,
      employeeId: authUser.employeeId || authUser.empId || prev.employeeId,
      fullName: fullName || prev.fullName,
      firstName: firstName || prev.firstName,
      lastName: lastName || prev.lastName,
      email: authUser.email || prev.email,
      role: authUser.role || prev.role,
      designation: authUser.designation || prev.designation,
      department: authUser.department || prev.department,
      mobile: authUser.mobile || authUser.phone || prev.mobile,
    }));

    const staffId = authUser.staffId || authUser.id;
    const fetchStaffProfile = () => {
      if (staffId && !isNaN(Number(staffId))) {
        return staffApi.getStaffById(staffId).catch((err) => {
          if (authUser.employeeId) return staffApi.getStaffByEmployeeId(authUser.employeeId);
          throw err;
        });
      }
      if (authUser.employeeId) {
        return staffApi.getStaffByEmployeeId(authUser.employeeId);
      }
      return Promise.resolve(null);
    };

    fetchStaffProfile()
      .then((res) => {
        const apiStaff = res?.data?.data || res?.data;
        if (apiStaff && typeof apiStaff === "object") {
          setProfileData((current) => {
            const expArray = Array.isArray(apiStaff.experienceList)
              ? apiStaff.experienceList
              : (Array.isArray(apiStaff.experience)
                  ? apiStaff.experience
                  : (typeof apiStaff.experienceJson === "string" ? JSON.parse(apiStaff.experienceJson || "[]") : []));

            const docsArray = Array.isArray(apiStaff.documentsList)
              ? apiStaff.documentsList
              : (Array.isArray(apiStaff.documents)
                  ? apiStaff.documents
                  : (typeof apiStaff.documentsJson === "string" ? JSON.parse(apiStaff.documentsJson || "[]") : []));

            const eduArray = Array.isArray(apiStaff.educationList)
              ? apiStaff.educationList
              : (Array.isArray(apiStaff.education)
                  ? apiStaff.education
                  : (typeof apiStaff.educationJson === "string" ? JSON.parse(apiStaff.educationJson || "[]") : []));

            const pStatus = apiStaff.profileStatus || current.profileStatus;
            const currentAuth = getAuthUser();
            const isCompleted = isStaffPortalUnlocked(pStatus, currentAuth?.isOnboarded === true);

            const serverPhoto =
              (apiStaff.photoPath && String(apiStaff.photoPath).trim()) ||
              (apiStaff.profilePhoto && String(apiStaff.profilePhoto).trim().startsWith("/") ? apiStaff.profilePhoto : null) ||
              (apiStaff.photoUrl && !String(apiStaff.photoUrl).includes("/api/v1/staff/photo/") ? apiStaff.photoUrl : null) ||
              current.photoUrl;

            const updated = {
              ...current,
              ...apiStaff,
              experience: expArray,
              experienceList: expArray,
              documents: docsArray,
              documentsList: docsArray,
              education: eduArray,
              educationList: eduArray,
              dob: apiStaff.dateOfBirth ? String(apiStaff.dateOfBirth).split("T")[0] : (current.dob || ""),
              dateOfBirth: apiStaff.dateOfBirth || current.dateOfBirth,
              pan: apiStaff.panNumber || apiStaff.pan || current.pan || "",
              panNumber: apiStaff.panNumber || apiStaff.pan || current.panNumber || "",
              aadhaar: apiStaff.aadhaar || current.aadhaar || "",
              houseNumber: apiStaff.houseNumber || current.houseNumber || "",
              street: apiStaff.street || current.street || "",
              currentAddress: apiStaff.currentAddress || current.currentAddress || "",
              permanentAddress: apiStaff.permanentAddress || current.permanentAddress || "",
              city: apiStaff.city || current.city || "",
              district: apiStaff.district || current.district || "",
              state: apiStaff.state || current.state || "",
              pin: apiStaff.pincode || apiStaff.pin || current.pin || "",
              pincode: apiStaff.pincode || apiStaff.pin || current.pincode || "",
              bankName: apiStaff.bankName || apiStaff.bankDetails?.bankName || current.bankName || "",
              accountHolder: apiStaff.accountHolderName || apiStaff.accountHolder || current.accountHolder || "",
              accountHolderName: apiStaff.accountHolderName || apiStaff.accountHolder || current.accountHolderName || "",
              accountNumber: apiStaff.accountNumber || apiStaff.bankDetails?.accountNumber || current.accountNumber || "",
              ifsc: apiStaff.ifscCode || apiStaff.ifsc || current.ifsc || "",
              ifscCode: apiStaff.ifscCode || apiStaff.ifsc || current.ifscCode || "",
              branch: apiStaff.branch || apiStaff.bankDetails?.branch || current.branch || "",
              accountType: apiStaff.accountType || apiStaff.bankDetails?.accountType || current.accountType || "",
              uanNumber: apiStaff.uanNumber || apiStaff.pfNumber || apiStaff.bankDetails?.uanNumber || apiStaff.bankDetails?.pfNumber || current.uanNumber || "",
              pfNumber: apiStaff.pfNumber || apiStaff.uanNumber || apiStaff.bankDetails?.pfNumber || apiStaff.bankDetails?.uanNumber || current.pfNumber || "",
              department: apiStaff.department || apiStaff.departmentName || current.department,
              designation: apiStaff.designation || apiStaff.designationName || current.designation,
              allocatedSubjects: apiStaff.allocatedSubjects || apiStaff.subjects || current.allocatedSubjects || [],
              subjects: apiStaff.allocatedSubjects || apiStaff.subjects || current.subjects || [],
              photoUrl: serverPhoto,
              profileStatus: pStatus,
              isOnboarded: isCompleted,
              _isDetailedLoaded: true,
            };

            const unifiedPct = calculateStaffProfileCompletion(updated);
            updated.profileCompletionPercentage = unifiedPct;
            updated.profileCompletion = unifiedPct;

            if (apiStaff.firstName || apiStaff.lastName) {
              updated.fullName = `${apiStaff.firstName || ""} ${apiStaff.lastName || ""}`.trim();
            }

            persistStaffProfile(updated);
            return updated;
          });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch detailed staff profile from API:", err?.message || err);
        setProfileData((current) => ({ ...current, _isDetailedLoaded: true }));
      })
      .finally(() => {
        hasLoadedProfileRef.current = true;
        setIsLoadingProfile(false);
      });
  }, []);

  useEffect(() => {
    fetchStaffProfileSafe();

    const handleSync = () => {
      fetchStaffProfileSafe();
    };
    window.addEventListener("cms-staff-updated", handleSync);
    window.addEventListener("cms-staff-records-updated", handleSync);
    window.addEventListener("staff-records-updated", handleSync);
    return () => {
      window.removeEventListener("cms-staff-updated", handleSync);
      window.removeEventListener("cms-staff-records-updated", handleSync);
      window.removeEventListener("staff-records-updated", handleSync);
    };
  }, [fetchStaffProfileSafe]);

  // Biometric Punch State
  const [punchState, setPunchState] = useState(getInitialPunchState);

  // Sync punch status with backend on initial load
  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) return;
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
        }
      })
      .catch((err) => {
        console.warn("Could not fetch today punch status in FacultyContext:", err?.message || err);
      });
  }, []);

  const togglePunch = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!punchState.isPunchedIn) {
      const next = { isPunchedIn: true, inTime: timeStr, outTime: null, hoursWorked: "Just punched in" };
      setPunchState(next);
      notify(`Punched IN successfully at ${timeStr}`);
    } else {
      const next = { ...punchState, isPunchedIn: false, outTime: timeStr };
      setPunchState(next);
      notify(`Punched OUT successfully at ${timeStr}`);
    }
  };

  // Toast Notification System
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = (text, type = "success", title = null) => {
    clearTimeout(toastTimer.current);
    if (typeof text === "object" && text !== null) {
      setToast({
        text: text.message || text.text || "",
        type: text.type || type,
        title: text.title || title || null,
      });
    } else {
      setToast({ text, type, title });
    }
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Board & Academic Year Dropdowns
  const boards = [];
  const academicYears = [];
  const [selectedBoard, setSelectedBoard] = useState(boards[0] || null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0] || null);
  const boardsLoading = false;
  const academicYearsLoading = false;

  // Sidebar Layout State
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Compute initials
  const initials = useMemo(() => {
    const name = (profileData.fullName || profileData.name || "").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    const first = profileData.firstName?.[0] || name[0] || "F";
    const last = profileData.lastName?.[0] || "";
    return `${first}${last}`.toUpperCase();
  }, [profileData.firstName, profileData.lastName, profileData.fullName, profileData.name]);

  const value = useMemo(
    () => ({
      profileData,
      setProfileData,
      isLoadingProfile,
      persistStaffProfile,
      isEditingProfile,
      setIsEditingProfile,
      profileStep,
      setProfileStep,
      punchState,
      setPunchState,
      togglePunch,
      toast,
      setToast,
      notify,
      selectedBoard,
      setSelectedBoard,
      selectedAcademicYear,
      setSelectedAcademicYear,
      boards,
      academicYears,
      boardsLoading,
      academicYearsLoading,
      activeModule,
      setActiveModule,
      sidebarOpen,
      setSidebarOpen,
      initials,
      refreshStaffProfile: fetchStaffProfileSafe,
    }),
    [
      profileData,
      isLoadingProfile,
      isEditingProfile,
      profileStep,
      punchState,
      toast,
      selectedBoard,
      selectedAcademicYear,
      activeModule,
      sidebarOpen,
      initials,
      fetchStaffProfileSafe,
    ]
  );

  return <FacultyContext.Provider value={value}>{children}</FacultyContext.Provider>;
}

export function useFaculty() {
  const context = useContext(FacultyContext);
  if (!context) {
    throw new Error("useFaculty must be used within a FacultyProvider");
  }
  return context;
}

export function useFacultySafe() {
  return useContext(FacultyContext);
}

export default FacultyContext;
