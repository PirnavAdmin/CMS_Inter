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
import "./DriverDashboard.css";
import { getAuthUser } from "../../features/authStorage.js";

export default function DriverDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Active Tab state synced with URL pathname if present
  const getTabFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/route")) return "route";
    if (path.includes("/trips") || path.includes("/trip")) return "trips";
    if (path.includes("/students") || path.includes("/student")) return "students";
    if (path.includes("/gps")) return "gps";
    if (path.includes("/reports") || path.includes("/report")) return "reports";
    if (path.includes("/profile")) return "profile";
    return "home";
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath);

  // Sync tab with URL changes
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  // Global shared state for students & active trip
  const [students, setStudents] = useState([]);
  const [activeTripState, setActiveTripState] = useState({
    morningTripStatus: "In Progress",
    eveningTripStatus: "Pending",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { getStudents, getTrips } = await import("../../api/transportDriverApi.js");
        const res = await getStudents();
        if (res.data?.students) {
          setStudents(res.data.students);
        } else if (Array.isArray(res.data)) {
          setStudents(res.data);
        }
        // Optionally fetch active trip state if needed:
        // const tripsRes = await getTrips();
        // setActiveTripState(tripsRes.data.activeTripState);
      } catch (err) {
        console.error("Failed to load global driver data", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleLogout = () => {
    navigate("/login");
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    // Optionally update URL if under /driver route
    if (location.pathname.startsWith("/driver")) {
      navigate(`/driver/${tabId === "home" ? "" : tabId}`);
    }
  };

  const handleUpdateStudentStatus = (studentId, newStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  const handleBatchBoardStop = (stopName) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.stop === stopName && s.status !== "Picked Up"
          ? { ...s, status: "Picked Up" }
          : s
      )
    );
  };

  const handleStartTrip = (tripType) => {
    setActiveTripState((prev) => ({
      ...prev,
      [`${tripType}TripStatus`]: "In Progress",
    }));
  };

  const handleEndTrip = (tripType) => {
    setActiveTripState((prev) => ({
      ...prev,
      [`${tripType}TripStatus`]: "Completed",
    }));
  };

  return (
    <DriverLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onLogout={handleLogout}
      onSyncData={() => {
        // Mock sync
      }}
    >
      {activeTab === "home" && (
        <DriverHomePage
          onNavigateTab={handleSelectTab}
          activeTripState={activeTripState}
          studentsList={students}
        />
      )}

      {activeTab === "route" && (
        <DriverRoutePage onNavigateTab={handleSelectTab} />
      )}

      {activeTab === "trips" && (
        <DriverTripsPage
          activeTripState={activeTripState}
          onStartTrip={handleStartTrip}
          onEndTrip={handleEndTrip}
          onNavigateTab={handleSelectTab}
        />
      )}

      {activeTab === "students" && (
        <DriverStudentsPage
          students={students}
          onUpdateStatus={handleUpdateStudentStatus}
          onBatchBoardStop={handleBatchBoardStop}
        />
      )}

      {activeTab === "gps" && <DriverGpsPage />}

      {activeTab === "reports" && <DriverReportsPage />}

      {activeTab === "profile" && <DriverProfilePage />}
    </DriverLayout>
  );
}

