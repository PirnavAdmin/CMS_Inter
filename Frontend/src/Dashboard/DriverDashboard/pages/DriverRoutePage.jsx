import React, { useState } from "react";
import {
  Route as RouteIcon,
  MapPin,
  Bus,
  Clock,
  Users,
  ShieldCheck,
  UserCheck,
  Calendar,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Phone,
  Info,
} from "lucide-react";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import { routeDetails, driverProfile } from "../data/driverMockData.js";

export default function DriverRoutePage({ onNavigateTab }) {
  const [selectedStopId, setSelectedStopId] = useState(3); // Green park default active

  const activeStop = routeDetails.stops.find((s) => s.id === selectedStopId) || routeDetails.stops[0];

  return (
    <div className="dp-page-container">
      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <RouteIcon size={14} /> Assigned Route Information
          </div>
          <h1 className="dp-page-title">My Route</h1>
          <p className="dp-page-subtitle">
            View your assigned transport route and pickup points.
          </p>
        </div>
        <div className="dp-header-actions">
          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={() => onNavigateTab("students")}
          >
            <Users size={16} /> View Route Students
          </button>
        </div>
      </div>

      {/* Main Route Info Card */}
      <div className="dp-card dp-route-master-card">
        <div className="dp-card-head">
          <div className="dp-flex-row gap-2">
            <div className="dp-route-chip-icon">
              <Bus size={20} />
            </div>
            <div>
              <h2 className="dp-card-title">{routeDetails.routeName}</h2>
              <span className="dp-code-badge">Code: {routeDetails.routeCode}</span>
            </div>
          </div>
          <DriverStatusBadge status="Active Schedule" tone="success" />
        </div>

        <div className="dp-card-body">
          <div className="dp-route-details-grid">
            <div className="dp-rd-item">
              <span className="dp-rd-label">Start Point</span>
              <strong className="dp-rd-val">{routeDetails.startPoint}</strong>
              <small className="dp-rd-sub">Pickup Departs: {routeDetails.morningStartTime}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">End Point</span>
              <strong className="dp-rd-val">{routeDetails.endPoint}</strong>
              <small className="dp-rd-sub">Arrives Campus: {routeDetails.morningEndTime}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Total Distance</span>
              <strong className="dp-rd-val">{routeDetails.distanceKm} km</strong>
              <small className="dp-rd-sub">Approx. 90 mins loop</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Bus Number</span>
              <strong className="dp-rd-val">{routeDetails.busNumber}</strong>
              <small className="dp-rd-sub">{routeDetails.vehicleModel}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Assigned Attendant</span>
              <strong className="dp-rd-val">{routeDetails.assignedAttendant}</strong>
              <small className="dp-rd-sub">{routeDetails.attendantPhone}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Shift</span>
              <strong className="dp-rd-val">{routeDetails.shift}</strong>
              <small className="dp-rd-sub">Morning & Evening</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Effective Date</span>
              <strong className="dp-rd-val">{routeDetails.effectiveDate}</strong>
              <small className="dp-rd-sub">Academic Term 2026-27</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Total Assigned Students</span>
              <strong className="dp-rd-val">{routeDetails.totalStudents} Students</strong>
              <small className="dp-rd-sub">Across 6 Scheduled Stops</small>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Visual Step-by-Step Route Map */}
      <div className="dp-card">
        <div className="dp-card-head">
          <div className="dp-flex-col">
            <h3>Visual Step-by-Step Route Map</h3>
            <p>Click on any stop along the journey path to inspect details</p>
          </div>
          <span className="dp-tag-pill">
            <Navigation size={13} /> Real-time Waypoints
          </span>
        </div>

        <div className="dp-card-body">
          <div className="dp-visual-route-track">
            {routeDetails.stops.map((stop, index) => {
              const isSelected = selectedStopId === stop.id;
              const isCompleted = stop.status === "Completed";
              const isInProgress = stop.status === "In Progress";

              return (
                <div
                  key={stop.id}
                  className={`dp-vrt-node ${
                    isSelected ? "is-selected" : ""
                  } ${isCompleted ? "is-done" : ""} ${
                    isInProgress ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedStopId(stop.id)}
                >
                  <div className="dp-vrt-circle">
                    {isCompleted ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <span>{stop.stopNumber}</span>
                    )}
                  </div>
                  <div className="dp-vrt-label">
                    <strong>{stop.name}</strong>
                    <small>{stop.pickupTime}</small>
                  </div>
                  {index < routeDetails.stops.length - 1 && (
                    <div className={`dp-vrt-connector ${isCompleted ? "is-filled" : ""}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Stop Callout Card */}
          {activeStop && (
            <div className="dp-selected-stop-banner">
              <div className="dp-ssb-left">
                <div className="dp-ssb-badge">Stop #{activeStop.stopNumber}</div>
                <div>
                  <h4 className="dp-ssb-name">{activeStop.name}</h4>
                  <p className="dp-ssb-landmark">
                    <MapPin size={13} /> Landmark: {activeStop.landmark}
                  </p>
                </div>
              </div>
              <div className="dp-ssb-middle">
                <div className="dp-ssb-stat">
                  <small>Morning Pickup</small>
                  <strong>{activeStop.pickupTime}</strong>
                </div>
                <div className="dp-ssb-stat">
                  <small>Evening Drop</small>
                  <strong>{activeStop.dropTime}</strong>
                </div>
                <div className="dp-ssb-stat">
                  <small>Students at Stop</small>
                  <strong>{activeStop.studentCount} Students</strong>
                </div>
              </div>
              <div className="dp-ssb-right">
                <DriverStatusBadge status={activeStop.status} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pickup Points Table */}
      <div className="dp-card">
        <div className="dp-card-head">
          <div className="dp-flex-col">
            <h3>Route Pickup Points Table</h3>
            <p>Complete schedule and student breakdown by stop</p>
          </div>
          <button
            type="button"
            className="dp-btn dp-btn-outline dp-btn-sm"
            onClick={() => onNavigateTab("gps")}
          >
            <Navigation size={14} /> Open Live GPS View
          </button>
        </div>

        <div className="dp-card-body p-0">
          <div className="dp-table-responsive">
            <table className="dp-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>Stop Name</th>
                  <th>Landmark / Location</th>
                  <th>Morning Pickup</th>
                  <th>Evening Drop</th>
                  <th>Student Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {routeDetails.stops.map((stop) => (
                  <tr
                    key={stop.id}
                    className={selectedStopId === stop.id ? "dp-row-highlight" : ""}
                    onClick={() => setSelectedStopId(stop.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span className="dp-stop-seq">{stop.stopNumber}</span>
                    </td>
                    <td>
                      <div className="dp-flex-row gap-1">
                        <MapPin size={15} className="dp-text-primary" />
                        <strong>{stop.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="dp-text-muted">{stop.landmark}</span>
                    </td>
                    <td>
                      <span className="dp-time-pill">
                        <Clock size={12} /> {stop.pickupTime}
                      </span>
                    </td>
                    <td>
                      <span className="dp-time-pill">
                        <Clock size={12} /> {stop.dropTime}
                      </span>
                    </td>
                    <td>
                      <span className="dp-student-count-chip">
                        <Users size={12} /> {stop.studentCount} Students
                      </span>
                    </td>
                    <td>
                      <DriverStatusBadge status={stop.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

