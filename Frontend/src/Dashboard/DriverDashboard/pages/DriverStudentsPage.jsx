import React, { useState } from "react";
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
import { routeDetails } from "../data/driverMockData.js";

export default function DriverStudentsPage({
  students = [],
  onUpdateStatus,
  onBatchBoardStop,
}) {
  const [selectedBatchStop, setSelectedBatchStop] = useState("Green Park");
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const totalCount = students.length;
  const pickedUpCount = students.filter((s) => s.status === "Picked Up").length;
  const pendingCount = students.filter((s) => s.status === "Pending").length;
  const missedCount = students.filter((s) => s.status === "Not Boarded" || s.status === "Absent").length;

  const stopsList = routeDetails.stops.map((s) => s.name);

  const handleQuickBoardStop = () => {
    if (onBatchBoardStop) {
      onBatchBoardStop(selectedBatchStop);
    }
    triggerToast(`All pending students at stop "${selectedBatchStop}" marked as Boarded!`);
  };

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
          subtitle={`${Math.round((pickedUpCount / totalCount) * 100)}% Onboard`}
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
          onUpdateStatus={(id, status) => {
            if (onUpdateStatus) onUpdateStatus(id, status);
            triggerToast(`Student status updated to "${status}".`);
          }}
          showFilters={true}
        />
      </div>
    </div>
  );
}

