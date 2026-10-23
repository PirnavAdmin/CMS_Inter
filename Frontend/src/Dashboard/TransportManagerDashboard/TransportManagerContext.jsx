import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { getAuthToken, getAuthUser } from "@/features/authStorage.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
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

  // Profile data
  const profile = useMemo(() => {
    return {
      id: authUser.staffId || authUser.id || "TM-1",
      employeeId: authUser.employeeId || authUser.staffCode || authUser.empId || "EMP-TM-01",
      name: authUser.fullName || authUser.name || "Transport Manager",
      email: authUser.email || "transport.manager@pirnav.edu",
      role: authUser.role || "Transport Manager",
      department: authUser.department || "Transport Operations",
      phone: authUser.mobile || authUser.phone || "",
    };
  }, [authUser]);

  // Board Authorization & Restriction
  // Filter boards based strictly on what's assigned to this user
  const authorizedBoards = useMemo(() => {
    const userBoards = authUser.boards || authUser.assignedBoards || authUser.boardList;
    const campusBoards = selectedCampus?.affiliatedBoards || selectedCampus?.boards || academicContext.boards || [];

    if (Array.isArray(userBoards) && userBoards.length > 0) {
      // If user has explicit board list assigned in JWT/auth storage
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

    // Default to campus affiliated boards if assigned to this campus
    return campusBoards;
  }, [authUser, selectedCampus, academicContext.boards]);

  // Selected board
  const [selectedBoardId, setSelectedBoardId] = useState(() => {
    if (authorizedBoards.length === 1) {
      return String(authorizedBoards[0].id || authorizedBoards[0].boardId || "");
    }
    return academicContext.selectedBoardId ? String(academicContext.selectedBoardId) : "";
  });

  useEffect(() => {
    if (authorizedBoards.length === 1) {
      setSelectedBoardId(String(authorizedBoards[0].id || authorizedBoards[0].boardId || ""));
    } else if (authorizedBoards.length > 1 && (!selectedBoardId || !authorizedBoards.some((b) => String(b.id || b.boardId) === String(selectedBoardId)))) {
      setSelectedBoardId(String(authorizedBoards[0].id || authorizedBoards[0].boardId || ""));
    }
  }, [authorizedBoards, selectedBoardId]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshAll = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  // Fetch transport entities
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const params = {
          boardId: selectedBoardId || undefined,
          campusId: selectedCampus?.id || selectedCampus?.campusId || undefined,
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
  }, [selectedBoardId, selectedCampus, revision]);

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
