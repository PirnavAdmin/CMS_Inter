import React, { useState, useEffect } from "react";
import { Play, Square, CheckSquare, AlertTriangle, Clock, Gauge, Fuel, ShieldAlert, PhoneCall, Info } from "lucide-react";
import DriverStatusBadge from "./DriverStatusBadge.jsx";

export default function DriverTripCard({
  trip,
  onStartTrip,
  onEndTrip,
  checklist = [],
  emergencyContact = "+91 98765 43210",
}) {
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [odometerStart, setOdometerStart] = useState("42175");
  const [odometerEnd, setOdometerEnd] = useState("");
  const [fuelAdded, setFuelAdded] = useState("");
  const [tripNotes, setTripNotes] = useState("");
  const [tripDurationSeconds, setTripDurationSeconds] = useState(1840); // 30m 40s mock active
  const [showSosModal, setShowSosModal] = useState(false);

  // Live timer if in progress
  useEffect(() => {
    let interval = null;
    if (trip?.status === "In Progress") {
      interval = setInterval(() => {
        setTripDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [trip?.status]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${hrs}h ${remMins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const handleToggleCheck = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAllChecks = () => {
    const allChecked = {};
    checklist.forEach((item) => {
      allChecked[item.id] = true;
    });
    setCheckedItems(allChecked);
  };

  const isChecklistComplete = checklist.every((item) => !item.mandatory || checkedItems[item.id]);

  const handleConfirmStart = () => {
    if (!isChecklistComplete) return;
    setShowChecklistModal(false);
    if (onStartTrip) {
      onStartTrip(trip.id, { odometerStart, checkedItems });
    }
  };

  const handleConfirmEnd = () => {
    if (onEndTrip) {
      onEndTrip(trip.id, { odometerEnd: odometerEnd || "42200", fuelAdded, tripNotes });
    }
  };

  return (
    <div className={`dp-trip-card ${trip.status === "In Progress" ? "dp-trip-active" : ""}`}>
      <div className="dp-trip-header">
        <div className="dp-trip-badge-group">
          <span className="dp-trip-type-tag">{trip.type || "Daily Trip"}</span>
          <DriverStatusBadge status={trip.status} />
        </div>
        <span className="dp-trip-time-window">
          <Clock size={14} /> {trip.time}
        </span>
      </div>

      <div className="dp-trip-body">
        <h3 className="dp-trip-title">{trip.title}</h3>
        <p className="dp-trip-meta">
          Route: <strong>{trip.route}</strong> • Stops: <strong>{trip.stops}</strong> • Students: <strong>{trip.students} Assigned</strong>
        </p>

        {trip.status === "In Progress" && (
          <div className="dp-trip-in-progress-banner">
            <div className="dp-live-pulse-wrapper">
              <span className="dp-live-pulse" />
              <strong>Trip Live in Progress</strong>
            </div>
            <div className="dp-trip-timer">
              <Clock size={16} />
              <span>Elapsed: <strong>{formatTimer(tripDurationSeconds)}</strong></span>
            </div>
          </div>
        )}

        <div className="dp-trip-grid-stats">
          <div className="dp-tg-item">
            <Gauge size={16} className="dp-tg-icon" />
            <div>
              <small>Starting Odometer</small>
              <strong>{odometerStart} KM</strong>
            </div>
          </div>
          <div className="dp-tg-item">
            <Fuel size={16} className="dp-tg-icon" />
            <div>
              <small>Fuel Level</small>
              <strong>85% (Tank OK)</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="dp-trip-footer">
        {trip.status === "Not Started" && (
          <button
            type="button"
            className="dp-btn dp-btn-primary dp-btn-full"
            onClick={() => setShowChecklistModal(true)}
          >
            <Play size={16} /> Start Trip (Safety Checklist)
          </button>
        )}

        {trip.status === "In Progress" && (
          <div className="dp-trip-actions-dual">
            <button
              type="button"
              className="dp-btn dp-btn-danger"
              onClick={() => setShowSosModal(true)}
            >
              <ShieldAlert size={16} /> SOS Alert
            </button>
            <button
              type="button"
              className="dp-btn dp-btn-success"
              onClick={handleConfirmEnd}
            >
              <Square size={16} /> End & Complete Trip
            </button>
          </div>
        )}

        {trip.status === "Completed" && (
          <div className="dp-trip-completed-banner">
            <CheckSquare size={16} />
            <span>Trip successfully completed & logged in transport registry.</span>
          </div>
        )}

        {trip.status === "Pending" && (
          <button
            type="button"
            className="dp-btn dp-btn-outline dp-btn-full"
            onClick={() => setShowChecklistModal(true)}
          >
            <Play size={16} /> Prepare & Start Evening Trip
          </button>
        )}
      </div>

      {/* Checklist Modal */}
      {showChecklistModal && (
        <div className="dp-modal-backdrop" onClick={() => setShowChecklistModal(false)}>
          <div className="dp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dp-modal-header">
              <div>
                <h3 className="dp-modal-title">Pre-Trip Safety Inspection</h3>
                <p className="dp-modal-subtitle">Verify all mandatory vehicle parameters before departure</p>
              </div>
              <button
                type="button"
                className="dp-modal-close"
                onClick={() => setShowChecklistModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="dp-modal-body">
              <div className="dp-checklist-toolbar">
                <span className="dp-chk-progress">
                  {Object.values(checkedItems).filter(Boolean).length} of {checklist.length} verified
                </span>
                <button
                  type="button"
                  className="dp-btn dp-btn-ghost dp-btn-xs"
                  onClick={handleSelectAllChecks}
                >
                  <CheckSquare size={13} /> Check All Parameters
                </button>
              </div>

              <div className="dp-checklist-list">
                {checklist.map((item) => (
                  <label
                    key={item.id}
                    className={`dp-checklist-item ${checkedItems[item.id] ? "is-checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.id]}
                      onChange={() => handleToggleCheck(item.id)}
                    />
                    <div className="dp-chk-text">
                      <span className="dp-chk-label">{item.label}</span>
                      <small className="dp-chk-category">
                        {item.category} {item.mandatory && <span className="dp-required-star">* Mandatory</span>}
                      </small>
                    </div>
                  </label>
                ))}
              </div>

              <div className="dp-odometer-input-group">
                <label>
                  <span>Current Starting Odometer (KM):</span>
                  <input
                    type="number"
                    value={odometerStart}
                    onChange={(e) => setOdometerStart(e.target.value)}
                    className="dp-input"
                    placeholder="e.g. 42175"
                  />
                </label>
              </div>
            </div>

            <div className="dp-modal-footer">
              <button
                type="button"
                className="dp-btn dp-btn-outline"
                onClick={() => setShowChecklistModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dp-btn dp-btn-primary"
                disabled={!isChecklistComplete}
                onClick={handleConfirmStart}
              >
                <Play size={15} /> Confirm & Begin Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSosModal && (
        <div className="dp-modal-backdrop" onClick={() => setShowSosModal(false)}>
          <div className="dp-modal-card dp-modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="dp-modal-header dp-danger-header">
              <div className="dp-flex-row gap-2">
                <ShieldAlert size={24} className="dp-text-danger" />
                <div>
                  <h3 className="dp-modal-title">Emergency Transport Assistance</h3>
                  <p className="dp-modal-subtitle">Immediate contact hotline for breakdown or safety alerts</p>
                </div>
              </div>
              <button type="button" className="dp-modal-close" onClick={() => setShowSosModal(false)}>✕</button>
            </div>
            <div className="dp-modal-body">
              <div className="dp-sos-banner">
                <h4>Transport Control Room Hotline</h4>
                <a href={`tel:${emergencyContact}`} className="dp-sos-phone-btn">
                  <PhoneCall size={20} /> {emergencyContact}
                </a>
                <p>Calling will connect directly to the Transport Dispatch Desk & Security Incharge.</p>
              </div>
              <div className="dp-sos-tips">
                <p><strong>Emergency Procedures:</strong></p>
                <ul>
                  <li>Park vehicle safely on the shoulder and turn on Hazard lights.</li>
                  <li>Ensure all students remain seated and calm inside the cabin.</li>
                  <li>Attendant Suresh P is notified to assist emergency egress if required.</li>
                </ul>
              </div>
            </div>
            <div className="dp-modal-footer">
              <button type="button" className="dp-btn dp-btn-outline" onClick={() => setShowSosModal(false)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

