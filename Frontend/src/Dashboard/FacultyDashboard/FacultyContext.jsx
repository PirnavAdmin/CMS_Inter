import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { facultyMockData } from "./data/facultyMockData.js";

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
    const baseUser = facultyMockData.user;
    const key = getStaffStorageKey(baseUser);
    if (key) {
      const saved = localStorage.getItem(key);
      if (saved) return { ...baseUser, ...JSON.parse(saved) };
    }
    return baseUser;
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
    const first = profileData.firstName?.[0] || profileData.fullName?.[0] || "S";
    const last = profileData.lastName?.[0] || "";
    return `${first}${last}`.toUpperCase();
  }, [profileData.firstName, profileData.lastName, profileData.fullName]);

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
