import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { facultyMockData } from "./data/facultyMockData.js";
import { getAuthUser } from "@/features/authStorage.js";
import * as staffApi from "@/api/staffApi.js";

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
    const key = getStaffStorageKey(data);
    if (key) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch {}
};

const getInitialProfileData = () => {
  try {
    const authUser = getAuthUser();
    const baseUser = facultyMockData.user;
    let mergedUser = { ...baseUser };

    if (authUser) {
      const nameParts = (authUser.name || authUser.fullName || "").trim().split(/\s+/).filter(Boolean);
      const firstName = authUser.firstName || nameParts[0] || baseUser.firstName;
      const lastName = authUser.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : baseUser.lastName);
      const fullName = authUser.fullName || authUser.name || `${firstName} ${lastName}`.trim();

      mergedUser = {
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
      };
    }

    const key = getStaffStorageKey(mergedUser);
    if (key) {
      const saved = localStorage.getItem(key);
      if (saved) {
        mergedUser = { ...mergedUser, ...JSON.parse(saved) };
      }
    }

    try {
      const genericSaved = localStorage.getItem("staff_profile_data");
      if (genericSaved) {
        const parsedGeneric = JSON.parse(genericSaved);
        if (
          !authUser ||
          String(parsedGeneric.id) === String(mergedUser.id) ||
          parsedGeneric.email === mergedUser.email ||
          parsedGeneric.employeeId === mergedUser.employeeId
        ) {
          mergedUser = { ...mergedUser, ...parsedGeneric };
        }
      }
    } catch {}

    return mergedUser;
  } catch {
    return facultyMockData.user;
  }
};

const getInitialPunchState = () => {
  try {
    const saved = localStorage.getItem("staff_punch_state");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { isPunchedIn: true, inTime: "08:45 AM", outTime: null, hoursWorked: "4 hrs 32 mins" };
};

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
  reimbursements: "reimbursements",
  settings: "settings",
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
  reimbursements: "reimbursements",
  settings: "settings",
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileStep, setProfileStep] = useState(1);

  // Synchronize profile data with authenticated user and fetch full staff record if available
  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) return;

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
    if (staffId) {
      staffApi
        .getStaffById(staffId)
        .then((res) => {
          const apiStaff = res?.data?.data || res?.data;
          if (apiStaff && typeof apiStaff === "object") {
            setProfileData((current) => {
              const updated = { ...current, ...apiStaff };
              if (apiStaff.firstName || apiStaff.lastName) {
                updated.fullName = `${apiStaff.firstName || ""} ${apiStaff.lastName || ""}`.trim();
              }
              return updated;
            });
          }
        })
        .catch((err) => {
          console.warn("Could not fetch detailed staff profile from API:", err?.message || err);
        });
    }
  }, []);

  // Biometric Punch State
  const [punchState, setPunchState] = useState(getInitialPunchState);

  const togglePunch = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!punchState.isPunchedIn) {
      const next = { isPunchedIn: true, inTime: timeStr, outTime: null, hoursWorked: "Just punched in" };
      setPunchState(next);
      localStorage.setItem("staff_punch_state", JSON.stringify(next));
      notify(`Punched IN successfully at ${timeStr}`);
    } else {
      const next = { ...punchState, isPunchedIn: false, outTime: timeStr };
      setPunchState(next);
      localStorage.setItem("staff_punch_state", JSON.stringify(next));
      notify(`Punched OUT successfully at ${timeStr}`);
    }
  };

  // Toast Notification System
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const notify = (text, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Board & Academic Year Dropdowns
  const boards = facultyMockData.boards;
  const academicYears = facultyMockData.academicYears;
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

  const value = {
    profileData,
    setProfileData,
    persistStaffProfile,
    isEditingProfile,
    setIsEditingProfile,
    profileStep,
    setProfileStep,
    punchState,
    setPunchState,
    togglePunch,
    toast,
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
  };

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
