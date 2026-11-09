import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DriverLayout from "./layout/DriverLayout.jsx";
import DriverHomePage from "./pages/DriverHomePage.jsx";
import DriverRoutePage from "./pages/DriverRoutePage.jsx";
import DriverTripsPage from "./pages/DriverTripsPage.jsx";
import DriverStudentsPage from "./pages/DriverStudentsPage.jsx";
import DriverGpsPage from "./pages/DriverGpsPage.jsx";
import DriverReportsPage from "./pages/DriverReportsPage.jsx";
import DriverProfilePage from "./pages/DriverProfilePage.jsx";
import DriverPayslipsPage from "./pages/DriverPayslipsPage.jsx";
import DriverLeavePage from "./pages/DriverLeavePage.jsx";
import DriverAttendancePage from "./pages/DriverAttendancePage.jsx";
import DriverHolidaysPage from "./pages/DriverHolidaysPage.jsx";
import DriverSettingsPage from "./pages/DriverSettingsPage.jsx";
import { DriverDataProvider } from "./DriverDataContext.jsx";
import "./DriverDashboard.css";
import { clearAuthSession } from "../auth/authStorage.js";
import { normalizeStudentData } from "./data/driverData.js";

const DEFAULT_FALLBACK_STUDENTS = [
  {
    id: 101,
    studentId: 101,
    pickupPointId: 1,
    name: "Sri R",
    rollNo: "MADM-0066",
    admissionNo: "MADM-0066",
    academicClass: "Regular - REG-1",
    stop: "Tarnaka Metro",
    time: "07:35 AM",
    parentName: "Guardian",
    contact: "+91 23866 25348",
    parentPhone: "+91 23866 25348",
    seatNo: "S-01",
    status: "Pending",
  },
  {
    id: 102,
    studentId: 102,
    pickupPointId: 2,
    name: "Bala Laxmi",
    rollNo: "MAUM-0088",
    admissionNo: "MAUM-0088",
    academicClass: "Regular - REG-1",
    stop: "Habsiguda Crossroads",
    time: "07:50 AM",
    parentName: "Sri",
    contact: "+91 75834 37462",
    parentPhone: "+91 75834 37462",
    seatNo: "S-02",
    status: "Pending",
  },
];

export default function DriverDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve the screen directly from the current URL, including history navigation.
  const getTabFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/payslip")) return "payslips";
    if (path.includes("/leave")) return "leave";
    if (path.includes("/attendance")) return "attendance";
    if (path.includes("/holiday")) return "holidays";
    if (path.includes("/settings")) return "settings";
    if (path.includes("/route")) return "route";
    if (path.includes("/trips") || path.includes("/trip")) return "trips";
    if (path.includes("/students") || path.includes("/student")) return "students";
    if (path.includes("/gps")) return "gps";
    if (path.includes("/reports") || path.includes("/report")) return "reports";
    if (path.includes("/profile")) return "profile";
    return "home";
  };

  const activeTab = getTabFromPath();

  // Global shared state for students & active trip with localStorage cache
  const [students, setStudents] = useState(() => {
    try {
      const cached = localStorage.getItem("cms_driver_students_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_FALLBACK_STUDENTS;
  });

  const [activeTripState, setActiveTripState] = useState(() => {
    try {
      const cached = localStorage.getItem("cms_driver_trip_state");
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      morningTripStatus: "Scheduled",
      eveningTripStatus: "Scheduled",
      startTime: null,
      endTime: null,
    };
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { getStudents, getTrips } = await import("../../api/transportDriverApi.js");
        const [res, tripsRes] = await Promise.allSettled([getStudents(), getTrips()]);
        const resVal = res.status === "fulfilled" ? res.value : null;

        if (tripsRes.status === "fulfilled") {
          const tPayload = tripsRes.value?.data?.data?.trips || tripsRes.value?.data?.trips || tripsRes.value?.trips || {};
          const mTrip = tPayload.morningTrip;
          const eTrip = tPayload.eveningTrip;
          if (mTrip || eTrip) {
            setActiveTripState((prev) => {
              const next = {
                ...prev,
                morningTripStatus: prev.morningTripStatus !== "Scheduled" ? prev.morningTripStatus : (mTrip?.status || "Scheduled"),
                eveningTripStatus: prev.eveningTripStatus !== "Scheduled" ? prev.eveningTripStatus : (eTrip?.status || "Scheduled"),
              };
              try {
                localStorage.setItem("cms_driver_trip_state", JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        }

        const payload = resVal?.data?.data ?? resVal?.data ?? {};
        const rawList = payload.students ?? (Array.isArray(payload) ? payload : null);

        if (rawList && rawList.length > 0) {
          setStudents((prev) => {
            const normalized = rawList.map((st, idx) => {
              const existing = prev.find(
                (p) => String(p.id) === String(st.id ?? st.studentId ?? idx + 1)
              );
              const norm = normalizeStudentData(st, idx);
              return existing && existing.status ? { ...norm, status: existing.status } : norm;
            });

            try {
              localStorage.setItem("cms_driver_students_cache", JSON.stringify(normalized));
            } catch {}
            return normalized;
          });
        }
      } catch (err) {
        console.error("Failed to load global driver data", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  const handleSelectTab = (tabId) => {
    if (location.pathname.startsWith("/driver")) {
      navigate(`/driver/${tabId === "home" ? "" : tabId}`);
    }
  };

  const handleUpdateStudentStatus = async (studentId, newStatus) => {
    setStudents((prev) => {
      const updated = prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s));
      try {
        localStorage.setItem("cms_driver_students_cache", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const { updateStudentAttendance } = await import("../../api/transportDriverApi.js");
      await updateStudentAttendance(studentId, { status: newStatus });
    } catch (err) {
      console.warn("API update attendance queued:", err);
    }
  };

  const handleBatchBoardStop = async (stopName) => {
    setStudents((prev) => {
      const sNorm = (stopName || "").toLowerCase();
      const updated = prev.map((s) => {
        const curStop = (s.stop || s.stopName || "").toLowerCase();
        const match = curStop === sNorm || curStop.includes(sNorm) || sNorm.includes(curStop);
        return match && s.status !== "Picked Up" ? { ...s, status: "Picked Up" } : s;
      });
      try {
        localStorage.setItem("cms_driver_students_cache", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleStartTrip = async (tripType = "morning") => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nextState = {
      ...activeTripState,
      [`${tripType}TripStatus`]: "In Progress",
      startTime: activeTripState.startTime || timeStr,
    };
    setActiveTripState(nextState);
    try {
      localStorage.setItem("cms_driver_trip_state", JSON.stringify(nextState));
    } catch {}

    try {
      const { startTrip } = await import("../../api/transportDriverApi.js");
      await startTrip(tripType === "morning" ? 1 : 2);
    } catch (err) {
      console.warn("Trip start API queued:", err);
    }
  };

  const handleEndTrip = async (tripType = "morning") => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nextState = {
      ...activeTripState,
      [`${tripType}TripStatus`]: "Completed",
      endTime: timeStr,
    };
    setActiveTripState(nextState);
    try {
      localStorage.setItem("cms_driver_trip_state", JSON.stringify(nextState));
    } catch {}

    try {
      const { endTrip } = await import("../../api/transportDriverApi.js");
      await endTrip(tripType === "morning" ? 1 : 2);
    } catch (err) {
      console.warn("Trip end API queued:", err);
    }
  };

  return (
    <DriverDataProvider>
      <DriverLayout
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
        onSyncData={() => {
          // Sync handler
        }}
      >
        {activeTab === "home" && (
          <DriverHomePage
            onNavigateTab={handleSelectTab}
            activeTripState={activeTripState}
            studentsList={students}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
          />
        )}

        {activeTab === "route" && (
          <DriverRoutePage
            onNavigateTab={handleSelectTab}
            students={students}
            onUpdateStatus={handleUpdateStudentStatus}
            onBatchBoardStop={handleBatchBoardStop}
            activeTripState={activeTripState}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
          />
        )}

        {activeTab === "trips" && (
          <DriverTripsPage
            activeTripState={activeTripState}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            onNavigateTab={handleSelectTab}
            students={students}
          />
        )}

        {activeTab === "students" && (
          <DriverStudentsPage
            students={students}
            onUpdateStatus={handleUpdateStudentStatus}
            onBatchBoardStop={handleBatchBoardStop}
            activeTripState={activeTripState}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === "gps" && (
          <DriverGpsPage
            activeTripState={activeTripState}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            onNavigateTab={handleSelectTab}
            students={students}
          />
        )}

        {activeTab === "reports" && <DriverReportsPage />}
        {activeTab === "profile" && <DriverProfilePage />}
        {activeTab === "payslips" && <DriverPayslipsPage />}
        {activeTab === "leave" && <DriverLeavePage />}
        {activeTab === "attendance" && <DriverAttendancePage />}
        {activeTab === "holidays" && <DriverHolidaysPage />}
        {activeTab === "settings" && <DriverSettingsPage />}
      </DriverLayout>
    </DriverDataProvider>
  );
}
