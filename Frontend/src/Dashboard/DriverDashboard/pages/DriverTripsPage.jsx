import React, { useState, useEffect } from "react";
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
import { getTrips, startTrip, endTrip, getProfile, getDashboard } from "../../../api/transportDriverApi.js";

export default function DriverTripsPage({
  onNavigateTab,
}) {
  const [morningTrip, setMorningTrip] = useState(null);
  const [eveningTrip, setEveningTrip] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [emergencyHelpline, setEmergencyHelpline] = useState(null);
  const [preTripChecklist, setPreTripChecklist] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch trips, profile, dashboard in parallel
        const [tripsRes, profileRes, dashboardRes] = await Promise.all([
          getTrips(),
          getProfile(),
          getDashboard()
        ]);
        
        // Use real data
        const tripsData = tripsRes.data?.data || {};
        setMorningTrip(tripsData.morningTrip || null);
        setEveningTrip(tripsData.eveningTrip || null);

        setDriverProfile(profileRes.data?.data?.driver || profileRes.data?.data?.vehicle || null);

        setEmergencyHelpline(dashboardRes.data?.data?.stats?.emergencyHelpline || null);
        setPreTripChecklist(dashboardRes.data?.data?.stats?.preTripChecklist || []);

      } catch (err) {
        console.error("Error fetching trips page data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStartMorning = async (id, data) => {
    try {
      const res = await startTrip(id);
      if (res.data?.success) {
        setMorningTrip((prev) => ({ ...prev, status: "In Progress" }));
        triggerToast("Morning trip started successfully! GPS telemetry is live.");
      } else {
        triggerToast("Failed to start morning trip. Server error.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to start morning trip.");
    }
  };

  const handleEndMorning = async (id, data) => {
    try {
      const res = await endTrip(id);
      if (res.data?.success) {
        setMorningTrip((prev) => ({ ...prev, status: "Completed" }));
        triggerToast("Morning trip ended and logged to Transport Registry.");
      } else {
        triggerToast("Failed to end morning trip. Server error.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to end morning trip.");
    }
  };

  const handleStartEvening = async (id, data) => {
    try {
      const res = await startTrip(id);
      if (res.data?.success) {
        setEveningTrip((prev) => ({ ...prev, status: "In Progress" }));
        triggerToast("Evening trip started successfully! GPS telemetry is live.");
      } else {
        triggerToast("Failed to start evening trip. Server error.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to start evening trip.");
    }
  };

  const handleEndEvening = async (id, data) => {
    try {
      const res = await endTrip(id);
      if (res.data?.success) {
        setEveningTrip((prev) => ({ ...prev, status: "Completed" }));
        triggerToast("Evening trip ended and logged to Transport Registry.");
      } else {
        triggerToast("Failed to end evening trip. Server error.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to end evening trip.");
    }
  };

  if (isLoading) {
    return <div className="dp-page-container"><p>Loading trips...</p></div>;
  }

  if (error) {
    return <div className="dp-page-container"><p className="dp-text-danger">{error}</p></div>;
  }

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
          <strong>{driverProfile?.assignedVehicle} ({driverProfile?.vehicleModel})</strong>
        </div>
        <div className="dp-tos-item">
          <small>Current Route</small>
          <strong>{driverProfile?.assignedRoute} ({driverProfile?.routeCode})</strong>
        </div>
        <div className="dp-tos-item">
          <small>Attendant on Board</small>
          <strong>{driverProfile?.assignedAttendant}</strong>
        </div>
        <div className="dp-tos-item">
          <small>Emergency SOS</small>
          <a href={`tel:${emergencyHelpline?.headPhone}`} className="dp-text-danger font-bold">
            {emergencyHelpline?.headPhone}
          </a>
        </div>
      </div>

      {/* Trip Cards Grid */}
      <div className="dp-trips-deck-grid">
        {/* Morning Trip Card */}
        <div>
          <div className="dp-section-subhead">
            <h3>Morning Pickup Operation</h3>
            <span className="dp-time-chip">Shift: {morningTrip?.time}</span>
          </div>
          {morningTrip && (
            <DriverTripCard
              trip={morningTrip}
              checklist={preTripChecklist}
              emergencyContact={emergencyHelpline?.headPhone}
              onStartTrip={handleStartMorning}
              onEndTrip={handleEndMorning}
            />
          )}
        </div>

        {/* Evening Trip Card */}
        <div>
          <div className="dp-section-subhead">
            <h3>Evening Drop Operation</h3>
            <span className="dp-time-chip">Shift: {eveningTrip?.time}</span>
          </div>
          {eveningTrip && (
            <DriverTripCard
              trip={eveningTrip}
              checklist={preTripChecklist}
              emergencyContact={emergencyHelpline?.headPhone}
              onStartTrip={handleStartEvening}
              onEndTrip={handleEndEvening}
            />
          )}
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
              <strong className="dp-hb-name">{emergencyHelpline?.transportHead}</strong>
              <a href={`tel:${emergencyHelpline?.headPhone}`} className="dp-sos-btn">
                <PhoneCall size={16} /> {emergencyHelpline?.headPhone}
              </a>
            </div>

            <div className="dp-help-box">
              <span className="dp-hb-label">Transport Helpdesk Desk</span>
              <strong className="dp-hb-name">Central Dispatch Bay</strong>
              <a href={`tel:${emergencyHelpline?.altHelpdesk}`} className="dp-help-link">
                <PhoneCall size={14} /> {emergencyHelpline?.altHelpdesk}
              </a>
            </div>

            <div className="dp-help-box">
              <span className="dp-hb-label">Depot Workshop Manager</span>
              <strong className="dp-hb-name">{emergencyHelpline?.depotManager}</strong>
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
