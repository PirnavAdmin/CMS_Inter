import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
} from "lucide-react";
import DriverStatCard from "../components/DriverStatCard.jsx";
import DriverStudentTable from "../components/DriverStudentTable.jsx";
import DriverTripActionBar from "../components/DriverTripActionBar.jsx";
import { getStudents, getRoute } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";
import { normalizeStudentData, toTitleCase } from "../data/driverData.js";

const DEFAULT_STOPS = [
  { id: 1, name: "Tarnaka Metro", stopName: "Tarnaka Metro", pickupTime: "07:35 AM" },
  { id: 2, name: "Habsiguda Crossroads", stopName: "Habsiguda Crossroads", pickupTime: "07:50 AM" },
  { id: 3, name: "Nacharam IDA", stopName: "Nacharam IDA", pickupTime: "08:05 AM" },
  { id: 4, name: "Campus Main Gate", stopName: "Campus Main Gate", pickupTime: "08:25 AM" },
];

export default function DriverStudentsPage({
  students: propStudents = [],
  onUpdateStatus,
  onBatchBoardStop,
  activeTripState,
  onStartTrip,
  onEndTrip,
  onNavigateTab,
}) {
  const [students, setStudents] = useState(propStudents);
  const [routeDetails, setRouteDetails] = useState({ stops: DEFAULT_STOPS });
  const [selectedBatchStop, setSelectedBatchStop] = useState("Tarnaka Metro");
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [gatekeeperModalStudent, setGatekeeperModalStudent] = useState(null);
  const hasLoadedOnce = useRef(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Keep students in sync with global parent state
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
    }
  }, [propStudents]);

  useEffect(() => {
    let isMounted = true;
    const fetchRoute = async () => {
      try {
        const routeRes = await getRoute();
        if (!isMounted) return;
        const rPayload = routeRes?.data?.data ?? routeRes?.data ?? {};
        const rawStops = rPayload.stops || rPayload.pickupPoints || rPayload.route?.stops || [];
        const normalizedStops = (rawStops && rawStops.length > 0)
          ? rawStops.map((st) => ({
              ...st,
              name: toTitleCase(st.stopName || st.name || st.pickupPointName || "Campus Stop"),
            }))
          : DEFAULT_STOPS;

        setRouteDetails({
          ...(rPayload.route || {}),
          stops: normalizedStops,
        });
        if (normalizedStops.length > 0) {
          setSelectedBatchStop(normalizedStops[0].name);
        }
      } catch (err) {
        if (isMounted) {
          setRouteDetails({ stops: DEFAULT_STOPS });
        }
      }
    };

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateStatus = async (id, status) => {
    // If user is trying to board while trip is still Scheduled, prompt to start trip
    const isScheduled = (activeTripState?.morningTripStatus || "Scheduled") === "Scheduled";
    if (isScheduled && (status === "Picked Up" || status === "Boarded")) {
      const targetStudent = students.find((s) => s.id === id);
      setGatekeeperModalStudent({ id, status, name: targetStudent?.name || "Student" });
      return;
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    if (onUpdateStatus) onUpdateStatus(id, status);
    triggerToast(`Student status updated to "${status}".`);
  };

  const handleConfirmStartAndBoard = async () => {
    if (!gatekeeperModalStudent) return;
    const { id, status } = gatekeeperModalStudent;

    if (onStartTrip) await onStartTrip("morning");

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    if (onUpdateStatus) onUpdateStatus(id, status);
    triggerToast(`Morning Trip started & passenger marked as "${status}"!`);
    setGatekeeperModalStudent(null);
  };

  const totalCount = students.length;
  const pickedUpCount = students.filter(
    (s) => s.status === "Picked Up" || s.status === "Boarded"
  ).length;
  const pendingCount = students.filter((s) => s.status === "Pending").length;
  const missedCount = students.filter(
    (s) => s.status === "Not Boarded" || s.status === "Absent" || s.status === "Missed"
  ).length;

  const stopsList = routeDetails.stops?.map((s) => s.name) || [
    "Tarnaka Metro",
    "Habsiguda Crossroads",
    "Nacharam IDA",
    "Campus Main Gate",
  ];

  if (isLoading) {
    return (
      <div className="dp-page-container">
        <SkeletonPage variant="table" columns={6} rows={7} />
      </div>
    );
  }

  return (
    <div className="dp-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="dp-floating-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <Users size={14} /> Passenger Manifest
          </div>
          <h1 className="dp-page-title">Students Transport List</h1>
          <p className="dp-page-subtitle">
            Manage student pickup, attendance, and contact information in real-time.
          </p>
        </div>
      </div>

      {/* Persistent Trip Operations Action Bar */}
      <DriverTripActionBar
        activeTripState={activeTripState}
        onStartTrip={onStartTrip}
        onEndTrip={onEndTrip}
        onNavigateTab={onNavigateTab}
        students={students}
        assignedRoute="Route 32 Habsiguda"
        vehicleNumber="AP39AU2653"
        scheduledTime="07:35 AM - 08:30 AM"
      />

      {/* KPI Stats Grid */}
      <div className="dp-stat-grid-4">
        <DriverStatCard
          icon={Users}
          title="Total Assigned"
          value={`${totalCount}`}
          subtitle="Registered bus passengers"
          tone="primary"
        />
        <DriverStatCard
          icon={UserCheck}
          title="Picked Up / Boarded"
          value={`${pickedUpCount}`}
          subtitle={`${totalCount > 0 ? Math.round((pickedUpCount / totalCount) * 100) : 0}% Onboard`}
          tone="success"
        />
        <DriverStatCard
          icon={Clock}
          title="Pending Pickup"
          value={`${pendingCount}`}
          subtitle="Awaiting at upcoming stops"
          tone="warning"
        />
        <DriverStatCard
          icon={UserX}
          title="Not Boarded / Absent"
          value={`${missedCount}`}
          subtitle="Missed or absent today"
          tone={missedCount > 0 ? "danger" : "purple"}
        />
      </div>

      {/* Main Students Table Card */}
      <div className="dp-card">
        <DriverStudentTable
          students={students}
          stopsList={stopsList}
          activeStop={selectedBatchStop}
          onUpdateStatus={handleUpdateStatus}
          showFilters={true}
        />
      </div>

      {/* Trip Start Gatekeeper Modal */}
      {gatekeeperModalStudent && (
        <div className="dp-modal-overlay" onClick={() => setGatekeeperModalStudent(null)}>
          <div
            className="dp-modal-card"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dp-modal-header">
              <div className="dp-flex-row gap-2">
                <AlertTriangle size={20} className="dp-text-primary" />
                <h3 className="dp-modal-title">Start Trip to Begin Boarding</h3>
              </div>
              <button
                type="button"
                className="dp-modal-close-btn"
                onClick={() => setGatekeeperModalStudent(null)}
              >
                ×
              </button>
            </div>
            <div className="dp-modal-body" style={{ padding: "16px 20px" }}>
              <p className="text-sm text-gray-700 mb-2">
                Route 32 Morning Trip is currently <strong>Scheduled</strong>. To board passengers, you must start the trip.
              </p>
              <div
                style={{
                  background: "var(--dp-soft)",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "13px",
                }}
              >
                <div>
                  Passenger: <strong>{gatekeeperModalStudent.name}</strong>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  Clicking below will start Route 32 Morning Trip and mark this student as <strong>Boarded</strong>.
                </div>
              </div>
            </div>
            <div className="dp-modal-footer">
              <button
                type="button"
                className="dp-btn dp-btn-outline dp-btn-sm"
                onClick={() => setGatekeeperModalStudent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={handleConfirmStartAndBoard}
              >
                <Play size={13} /> Start Trip & Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
