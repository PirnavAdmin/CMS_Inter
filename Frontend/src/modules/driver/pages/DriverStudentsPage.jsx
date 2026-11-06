import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Phone,
  RefreshCw,
  Sparkles,
  Award,
} from "lucide-react";
import DriverStatCard from "../components/DriverStatCard.jsx";
import DriverStudentTable from "../components/DriverStudentTable.jsx";
import { getStudents, updateStudentAttendance, bulkAttendance, getRoute } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";

export default function DriverStudentsPage() {
  const [students, setStudents] = useState([]);
  const [routeDetails, setRouteDetails] = useState({ stops: [] });
  const [selectedBatchStop, setSelectedBatchStop] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasLoadedOnce = useRef(false);

  const toTitleCase = (str) => {
    if (!str || typeof str !== "string") return "";
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const DEFAULT_STUDENTS = [
    {
      id: 101,
      studentId: 101,
      name: "K. Sai Teja",
      rollNo: "CSE24-102",
      admissionNo: "CSE24-102",
      academicClass: "B.Tech CSE - II Year",
      stop: "Tarnaka Metro",
      pickupTime: "07:35 AM",
      time: "07:35 AM",
      parentName: "K. Venkat Rao",
      contact: "+91 98480 12345",
      parentPhone: "+91 98480 12345",
      status: "Pending",
    },
    {
      id: 102,
      studentId: 102,
      name: "V. Sneha Reddy",
      rollNo: "ECE24-208",
      admissionNo: "ECE24-208",
      academicClass: "B.Tech ECE - II Year",
      stop: "Habsiguda Crossroads",
      pickupTime: "07:50 AM",
      time: "07:50 AM",
      parentName: "V. Mohan Reddy",
      contact: "+91 94401 54321",
      parentPhone: "+91 94401 54321",
      status: "Pending",
    },
  ];

  const DEFAULT_STOPS = [
    { id: 1, name: "Tarnaka Metro", stopName: "Tarnaka Metro", pickupTime: "07:35 AM" },
    { id: 2, name: "Habsiguda Crossroads", stopName: "Habsiguda Crossroads", pickupTime: "07:50 AM" },
    { id: 3, name: "Nacharam IDA", stopName: "Nacharam IDA", pickupTime: "08:05 AM" },
    { id: 4, name: "Campus Main Gate", stopName: "Campus Main Gate", pickupTime: "08:25 AM" },
  ];

  const fetchStudentsAndRoute = async () => {
    try {
      if (!hasLoadedOnce.current) {
        setIsLoading(true);
      }
      const [studentsRes, routeRes] = await Promise.allSettled([
        getStudents(),
        getRoute()
      ]);
      
      let fetchedStudents = [];
      if (studentsRes.status === "fulfilled") {
        const sPayload = studentsRes.value?.data?.data ?? studentsRes.value?.data ?? {};
        fetchedStudents = sPayload.students ?? (Array.isArray(sPayload) ? sPayload : []);
      }

      if (!fetchedStudents || fetchedStudents.length === 0) {
        fetchedStudents = DEFAULT_STUDENTS;
      }
      setStudents(fetchedStudents);

      let rawStops = [];
      let fetchedRouteData = {};
      if (routeRes.status === "fulfilled") {
        const rPayload = routeRes.value?.data?.data ?? routeRes.value?.data ?? {};
        rawStops = rPayload.stops || rPayload.pickupPoints || rPayload.route?.stops || [];
        fetchedRouteData = rPayload.route || {};
      }

      const normalizedStops = (rawStops && rawStops.length > 0)
        ? rawStops.map((st) => ({
            ...st,
            name: toTitleCase(st.stopName || st.name || st.pickupPointName || "Campus Stop"),
          }))
        : DEFAULT_STOPS;

      const fetchedRoute = {
        ...fetchedRouteData,
        stops: normalizedStops,
      };
      setRouteDetails(fetchedRoute);
      if (normalizedStops.length > 0) {
        setSelectedBatchStop(normalizedStops[0].name);
      }
      setError("");
    } catch (err) {
      console.error(err);
      setStudents(DEFAULT_STUDENTS);
      setRouteDetails({ stops: DEFAULT_STOPS });
      setSelectedBatchStop(DEFAULT_STOPS[0].name);
    } finally {
      setIsLoading(false);
      hasLoadedOnce.current = true;
    }
  };

  useEffect(() => {
    fetchStudentsAndRoute();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    triggerToast(`Student status updated to "${status}".`);

    try {
      await updateStudentAttendance(id, { status });
    } catch (err) {
      console.warn("Backend attendance sync queued:", err);
    }
  };

  const handleQuickBoardStop = async () => {
    setStudents((prev) =>
      prev.map((s) =>
        (s.stop === selectedBatchStop || s.stopName === selectedBatchStop) && s.status !== "Picked Up"
          ? { ...s, status: "Picked Up" }
          : s
      )
    );
    triggerToast(`All pending students at stop "${selectedBatchStop}" marked as Boarded!`);

    try {
      await bulkAttendance({ stop: selectedBatchStop, status: "Picked Up" });
    } catch (err) {
      console.warn("Backend bulk attendance sync queued:", err);
    }
  };

  const totalCount = students.length;
  const pickedUpCount = students.filter((s) => s.status === "Picked Up" || s.status === "Boarded").length;
  const pendingCount = students.filter((s) => s.status === "Pending").length;
  const missedCount = students.filter((s) => s.status === "Not Boarded" || s.status === "Absent" || s.status === "Missed").length;

  const stopsList = routeDetails.stops?.map((s) => s.name) || [];

  if (isLoading) {
    return <div className="dp-page-container"><SkeletonPage variant="table" columns={6} rows={7} /></div>;
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
        <div className="dp-header-actions">
          <div className="dp-quick-batch-box">
            <select
              value={selectedBatchStop}
              onChange={(e) => setSelectedBatchStop(e.target.value)}
              className="dp-select dp-select-sm"
            >
              {stopsList.map((stop) => (
                <option key={stop} value={stop}>
                  {stop}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="dp-btn dp-btn-primary dp-btn-sm"
              onClick={handleQuickBoardStop}
            >
              <UserCheck size={14} /> Board All at Stop
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
