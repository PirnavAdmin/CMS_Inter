import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DriverLayout from "./layout/DriverLayout.jsx";
import DriverLoginPage from "./pages/DriverLoginPage.jsx";
import DriverHomePage from "./pages/DriverHomePage.jsx";
import DriverRoutePage from "./pages/DriverRoutePage.jsx";
import DriverTripsPage from "./pages/DriverTripsPage.jsx";
import DriverStudentsPage from "./pages/DriverStudentsPage.jsx";
import DriverGpsPage from "./pages/DriverGpsPage.jsx";
import DriverReportsPage from "./pages/DriverReportsPage.jsx";
import DriverProfilePage from "./pages/DriverProfilePage.jsx";
import { mockStudents } from "./data/driverMockData.js";
import "./DriverDashboard.css";

export default function DriverDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Authentication State
  const [session, setSession] = useState(() => {
    try {
      const stored = sessionStorage.getItem("pjc-driver-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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
  const [students, setStudents] = useState(mockStudents);
  const [activeTripState, setActiveTripState] = useState({
    morningTripStatus: "In Progress",
    eveningTripStatus: "Pending",
  });

  const handleLoginSuccess = (userSession) => {
    setSession(userSession);
    setActiveTab("home");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("pjc-driver-session");
    setSession(null);
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

  // If not logged in, show Driver Login Page
  if (!session) {
    return <DriverLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

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

