import React, { useState } from "react";
import {
  Bus,
  Play,
  Square,
  CheckSquare,
  Clock,
  Gauge,
  Fuel,
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Calendar,
  Zap,
} from "lucide-react";
import DriverTripCard from "../components/DriverTripCard.jsx";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import {
  todaySchedule,
  preTripChecklist,
  emergencyHelpline,
  driverProfile,
} from "../data/driverMockData.js";

export default function DriverTripsPage({
  activeTripState,
  onStartTrip,
  onEndTrip,
  onNavigateTab,
}) {
  const [morningTrip, setMorningTrip] = useState({
    id: "trip-01",
    time: "07:00 AM - 08:30 AM",
    title: "Morning Trip – City Route A",
    type: "Morning Pickup",
    route: "City Route A",
    stops: "6 Stops",
    students: 32,
    status: activeTripState?.morningTripStatus || "In Progress",
  });

  const [eveningTrip, setEveningTrip] = useState({
    id: "trip-02",
    time: "04:00 PM - 05:30 PM",
    title: "Evening Trip – City Route A",
    type: "Evening Drop",
    route: "City Route A",
    stops: "6 Stops",
    students: 32,
    status: activeTripState?.eveningTripStatus || "Pending",
  });

  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleStartMorning = (id, data) => {
    setMorningTrip((prev) => ({ ...prev, status: "In Progress" }));
    if (onStartTrip) onStartTrip("morning", data);
    triggerToast("Morning trip started successfully! GPS telemetry is live.");
  };

  const handleEndMorning = (id, data) => {
    setMorningTrip((prev) => ({ ...prev, status: "Completed" }));
    if (onEndTrip) onEndTrip("morning", data);
    triggerToast("Morning trip ended and logged to Transport Registry.");
  };

  const handleStartEvening = (id, data) => {
    setEveningTrip((prev) => ({ ...prev, status: "In Progress" }));
    if (onStartTrip) onStartTrip("evening", data);
    triggerToast("Evening trip started successfully! GPS telemetry is live.");
  };

  const handleEndEvening = (id, data) => {
    setEveningTrip((prev) => ({ ...prev, status: "Completed" }));
    if (onEndTrip) onEndTrip("evening", data);
    triggerToast("Evening trip ended and logged to Transport Registry.");
  };

  return (
    <div className="dp-page-container">
      {/* Toast */}
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
            <Bus size={14} /> Daily Trip Console
          </div>
          <h1 className="dp-page-title">Trips Management</h1>
          <p className="dp-page-subtitle">
            Start, monitor, and log your daily college transport trips.
          </p>
        </div>
        <div className="dp-header-actions">
          <button
            type="button"
            className="dp-btn dp-btn-outline"
            onClick={() => onNavigateTab("gps")}
          >
            <Zap size={16} /> Live GPS Console
          </button>
          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={() => onNavigateTab("reports")}
          >
            <FileText size={16} /> Trip History Logs
          </button>
        </div>
      </div>

      {/* Driver Bus Status Strip */}
      <div className="dp-trips-overview-strip">
        <div className="dp-tos-item">
          <small>Vehicle Assigned</small>
          <strong>{driverProfile.assignedVehicle} ({driverProfile.vehicleModel})</strong>
        </div>
        <div className="dp-tos-item">
          <small>Current Route</small>
          <strong>{driverProfile.assignedRoute} ({driverProfile.routeCode})</strong>
        </div>
        <div className="dp-tos-item">
          <small>Attendant on Board</small>
          <strong>{driverProfile.assignedAttendant}</strong>
        </div>
        <div className="dp-tos-item">
          <small>Emergency SOS</small>
          <a href={`tel:${emergencyHelpline.headPhone}`} className="dp-text-danger font-bold">
            {emergencyHelpline.headPhone}
          </a>
        </div>
      </div>

      {/* Trip Cards Grid */}
      <div className="dp-trips-deck-grid">
        {/* Morning Trip Card */}
        <div>
          <div className="dp-section-subhead">
            <h3>Morning Pickup Operation</h3>
            <span className="dp-time-chip">Shift: 07:00 AM – 08:30 AM</span>
          </div>
          <DriverTripCard
            trip={morningTrip}
            checklist={preTripChecklist}
            emergencyContact={emergencyHelpline.headPhone}
            onStartTrip={handleStartMorning}
            onEndTrip={handleEndMorning}
          />
        </div>

        {/* Evening Trip Card */}
        <div>
          <div className="dp-section-subhead">
            <h3>Evening Drop Operation</h3>
            <span className="dp-time-chip">Shift: 04:00 PM – 05:30 PM</span>
          </div>
          <DriverTripCard
            trip={eveningTrip}
            checklist={preTripChecklist}
            emergencyContact={emergencyHelpline.headPhone}
            onStartTrip={handleStartEvening}
            onEndTrip={handleEndEvening}
          />
        </div>
      </div>

      {/* Safety & Emergency SOS Card */}
      <div className="dp-card dp-card-safety">
        <div className="dp-card-head">
          <div className="dp-flex-row gap-2">
            <ShieldAlert size={22} className="dp-text-danger" />
            <div>
              <h3 className="dp-card-title">Emergency & Safety Dispatch Directory</h3>
              <p>Direct lines for immediate assistance in case of vehicle breakdown, medical need, or route delay</p>
            </div>
          </div>
        </div>

        <div className="dp-card-body">
          <div className="dp-helpline-grid">
            <div className="dp-help-box is-primary-sos">
              <span className="dp-hb-label">Transport Incharge</span>
              <strong className="dp-hb-name">{emergencyHelpline.transportHead}</strong>
              <a href={`tel:${emergencyHelpline.headPhone}`} className="dp-sos-btn">
                <PhoneCall size={16} /> {emergencyHelpline.headPhone}
              </a>
            </div>

            <div className="dp-help-box">
              <span className="dp-hb-label">Transport Helpdesk Desk</span>
              <strong className="dp-hb-name">Central Dispatch Bay</strong>
              <a href={`tel:${emergencyHelpline.altHelpdesk}`} className="dp-help-link">
                <PhoneCall size={14} /> {emergencyHelpline.altHelpdesk}
              </a>
            </div>

            <div className="dp-help-box">
              <span className="dp-hb-label">Depot Workshop Manager</span>
              <strong className="dp-hb-name">{emergencyHelpline.depotManager}</strong>
              <small className="dp-text-muted">Breakdown / Towing / Replacement Bus</small>
            </div>

            <div className="dp-help-box">
              <span className="dp-hb-label">Emergency Services</span>
              <strong className="dp-hb-name">Police: 112 | Medical: 108</strong>
              <small className="dp-text-muted">Local First Responders</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

