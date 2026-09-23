import React, { useState, useEffect } from "react";
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

export default function DriverStudentsPage() {
  const [students, setStudents] = useState([]);
  const [routeDetails, setRouteDetails] = useState({ stops: [] });
  const [selectedBatchStop, setSelectedBatchStop] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const fetchStudentsAndRoute = async () => {
    try {
      setIsLoading(true);
      const studentsRes = await getStudents();
      
      const resData = studentsRes.data?.data || {};
      const fetchedStudents = resData.students || [];
      setStudents(fetchedStudents);

      const routeStops = resData.routeStops || [];
      const stopsArray = routeStops.map(stop => typeof stop === 'string' ? { name: stop } : stop);
      setRouteDetails({ stops: stopsArray });
      
      if (stopsArray.length > 0) {
        setSelectedBatchStop(stopsArray[0].name);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load students data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndRoute();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateStudentAttendance(id, { status });
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
      triggerToast(`Student status updated to "${status}".`);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update student status.");
    }
  };

  const handleQuickBoardStop = async () => {
    try {
      await bulkAttendance({ stop: selectedBatchStop, status: "Picked Up" });
      setStudents((prev) =>
        prev.map((s) =>
          s.stop === selectedBatchStop && s.status !== "Picked Up"
            ? { ...s, status: "Picked Up" }
            : s
        )
      );
      triggerToast(`All pending students at stop "${selectedBatchStop}" marked as Boarded!`);
    } catch (err) {
      console.error(err);
      triggerToast(`Failed to update batch attendance for ${selectedBatchStop}.`);
    }
  };

  const totalCount = students.length;
  const pickedUpCount = students.filter((s) => s.status === "Picked Up" || s.status === "Boarded").length;
  const pendingCount = students.filter((s) => s.status === "Pending").length;
  const missedCount = students.filter((s) => s.status === "Not Boarded" || s.status === "Absent").length;

  const stopsList = routeDetails.stops?.map((s) => s.name) || [];

  if (isLoading) {
    return <div className="dp-page-container"><p>Loading students...</p></div>;
  }

  if (error) {
    return <div className="dp-page-container"><p className="dp-text-danger">{error}</p></div>;
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
              className="dp-select dp-select-sm app-select"
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
          onUpdateStatus={handleUpdateStatus}
          showFilters={true}
        />
      </div>
    </div>
  );
}
