import React, { useState } from "react";
import {
  Bus,
  Play,
  Square,
  CheckCircle2,
  Navigation,
  Clock,
  Users,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export default function DriverTripActionBar({
  activeTripState,
  onStartTrip,
  onEndTrip,
  onNavigateTab,
  students = [],
  assignedRoute = "Route 32 Habsiguda",
  vehicleNumber = "AP39AU2653",
  scheduledTime = "07:35 AM - 08:30 AM",
}) {
  const [showEndModal, setShowEndModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const status = activeTripState?.morningTripStatus || "Scheduled";
  const isScheduled = status === "Scheduled";
  const isInProgress = status === "In Progress";
  const isCompleted = status === "Completed";

  const totalStudents = students.length || 2;
  const boardedStudents = students.filter(
    (s) => s.status === "Picked Up" || s.status === "Boarded"
  ).length;

  const handleStart = async () => {
    setIsActionLoading(true);
    try {
      if (onStartTrip) await onStartTrip("morning");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmEnd = async () => {
    setIsActionLoading(true);
    try {
      if (onEndTrip) await onEndTrip("morning");
      setShowEndModal(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      <div className={`dp-trip-action-bar dp-trip-bar-${status.toLowerCase().replace(/\s+/g, "-")}`}>
        <div className="dp-tab-left">
          <div className="dp-tab-icon-wrap">
            <Bus size={20} />
            {isInProgress && <span className="dp-live-pulsing-dot" />}
          </div>
          <div className="dp-tab-info">
            <div className="dp-tab-title-row">
              <strong className="dp-tab-title">Morning Pickup: {assignedRoute}</strong>
              <span className={`dp-tab-status-pill status-${status.toLowerCase().replace(/\s+/g, "-")}`}>
                {isInProgress ? "🟢 In Progress" : isCompleted ? "✓ Completed" : "⏱ Scheduled"}
              </span>
            </div>
            <div className="dp-tab-meta">
              <span>
                <Clock size={12} /> {scheduledTime}
              </span>
              <span className="dp-corridor-sep">•</span>
              <span>Bus: {vehicleNumber}</span>
              <span className="dp-corridor-sep">•</span>
              <span>
                <Users size={12} /> {boardedStudents}/{totalStudents} Boarded
              </span>
            </div>
          </div>
        </div>

        <div className="dp-tab-actions">
          {isScheduled && (
            <button
              type="button"
              className="dp-btn dp-btn-primary dp-tab-btn-pulse"
              onClick={handleStart}
              disabled={isActionLoading}
            >
              <Play size={15} /> Start Morning Trip
            </button>
          )}

          {isInProgress && (
            <>
              {onNavigateTab && (
                <button
                  type="button"
                  className="dp-btn dp-btn-outline dp-btn-sm"
                  onClick={() => onNavigateTab("gps")}
                >
                  <Navigation size={14} /> Live GPS
                </button>
              )}
              <button
                type="button"
                className="dp-btn dp-btn-danger dp-btn-sm"
                onClick={() => setShowEndModal(true)}
                disabled={isActionLoading}
              >
                <Square size={14} /> End Trip
              </button>
            </>
          )}

          {isCompleted && (
            <div className="dp-tab-completed-badge">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>Shift Complete • 100% Stops Cleared</span>
            </div>
          )}
        </div>
      </div>

      {/* End Trip Confirmation Modal */}
      {showEndModal && (
        <div className="dp-modal-overlay" onClick={() => setShowEndModal(false)}>
          <div
            className="dp-modal-card"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dp-modal-header">
              <div className="dp-flex-row gap-2">
                <AlertTriangle size={20} className="dp-text-warning" />
                <h3 className="dp-modal-title">End Route 32 Morning Trip?</h3>
              </div>
              <button
                type="button"
                className="dp-modal-close-btn"
                onClick={() => setShowEndModal(false)}
              >
                ×
              </button>
            </div>

            <div className="dp-modal-body" style={{ padding: "16px 20px" }}>
              <p className="text-sm text-gray-600 mb-3">
                You are about to conclude the Morning Pickup trip for <strong>{assignedRoute}</strong>.
              </p>
              <div
                style={{
                  background: "var(--dp-soft)",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <span className="text-gray-500 block text-xs">Students Accounted</span>
                  <strong>{boardedStudents} of {totalStudents} Boarded</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Arrival Status</span>
                  <strong className="text-emerald-600">Campus Main Gate (ETA met)</strong>
                </div>
              </div>
            </div>

            <div className="dp-modal-footer">
              <button
                type="button"
                className="dp-btn dp-btn-outline dp-btn-sm"
                onClick={() => setShowEndModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dp-btn dp-btn-danger dp-btn-sm"
                onClick={handleConfirmEnd}
                disabled={isActionLoading}
              >
                <Square size={13} /> {isActionLoading ? "Ending..." : "Confirm & End Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
