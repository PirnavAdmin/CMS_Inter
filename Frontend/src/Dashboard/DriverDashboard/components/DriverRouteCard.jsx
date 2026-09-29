import React from "react";
import { Bus, MapPin, Users, Clock, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import DriverStatusBadge from "./DriverStatusBadge.jsx";

export default function DriverRouteCard({ route, onViewFullRoute, onStartTrip }) {
  if (!route) return null;

  return (
    <div className="dp-route-card">
      <div className="dp-route-card-header">
        <div className="dp-route-card-tag">
          <Bus size={18} className="dp-route-bus-icon" />
          <span>Assigned Bus: <strong>{route.busNumber}</strong></span>
        </div>
        <DriverStatusBadge status="Active Route" tone="success" />
      </div>

      <div className="dp-route-card-body">
        <div className="dp-route-main-info">
          <div>
            <span className="dp-label-muted">Route Name</span>
            <h3 className="dp-route-title">{route.routeName} <span className="dp-route-code">({route.routeCode})</span></h3>
          </div>
          <div className="dp-route-quick-stats">
            <div className="dp-rq-stat">
              <MapPin size={15} />
              <span>{route.distanceKm} km</span>
            </div>
            <div className="dp-rq-stat">
              <Clock size={15} />
              <span>{route.totalStops} Stops</span>
            </div>
            <div className="dp-rq-stat">
              <Users size={15} />
              <span>{route.totalStudents} Students</span>
            </div>
          </div>
        </div>

        <div className="dp-route-points-banner">
          <div className="dp-rpb-point">
            <span className="dp-rpb-dot is-start" />
            <div>
              <small>Origin / Start</small>
              <strong>{route.startPoint}</strong>
              <span>{route.morningStartTime}</span>
            </div>
          </div>
          <div className="dp-rpb-line">
            <ArrowRight size={16} className="dp-rpb-arrow" />
          </div>
          <div className="dp-rpb-point is-end">
            <span className="dp-rpb-dot is-destination" />
            <div>
              <small>Destination</small>
              <strong>{route.endPoint}</strong>
              <span>{route.morningEndTime}</span>
            </div>
          </div>
        </div>

        <div className="dp-route-attendant-strip">
          <div className="dp-attendant-info">
            <UserCheck size={16} className="dp-attendant-icon" />
            <span>Assigned Attendant: <strong>{route.assignedAttendant}</strong> ({route.attendantPhone})</span>
          </div>
          <div className="dp-attendant-shift">
            <ShieldCheck size={16} />
            <span>Shift: <strong>{route.shift}</strong></span>
          </div>
        </div>
      </div>

      <div className="dp-route-card-footer">
        {onViewFullRoute && (
          <button type="button" className="dp-btn dp-btn-outline dp-btn-sm" onClick={onViewFullRoute}>
            View Route Details & Stops
          </button>
        )}
        {onStartTrip && (
          <button type="button" className="dp-btn dp-btn-primary dp-btn-sm" onClick={onStartTrip}>
            Start Route Trip
          </button>
        )}
      </div>
    </div>
  );
}

