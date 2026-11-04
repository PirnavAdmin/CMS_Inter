import { useSearchParams } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import {
  Route as RouteIcon,
  MapPin,
  Bus,
  Clock,
  Users,
  CheckCircle2,
  Navigation,
  ArrowRight,
} from "lucide-react";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import { getRoute, getDashboard } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";
import { useDriverData } from "../DriverDataContext.jsx";
import { unwrapDriverData, formatTime12Hour } from "../data/driverData.js";

export default function DriverRoutePage({ onNavigateTab }) {
  const [routeDetails, setRouteDetails] = useState(null);
  const { driverProfile, dashboard } = useDriverData();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStopId = searchParams.get("stopId") ?? routeDetails?.stops?.[0]?.id;
  const setSelectedStopId = (id) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("stopId", String(id));
      return next;
    });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasLoadedOnce = useRef(false);

  const toTitleCase = (str) => {
    if (!str || typeof str !== "string") return "";
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  useEffect(() => {
    let isMounted = true;
    const fetchRoute = async () => {
      try {
        if (!hasLoadedOnce.current) {
          setIsLoading(true);
        }
        const [routeRes, dashRes] = await Promise.allSettled([
          getRoute().then(unwrapDriverData),
          getDashboard().then(unwrapDriverData),
        ]);

        if (!isMounted) return;

        const routePayload = routeRes.status === "fulfilled" ? routeRes.value : {};
        const dashPayload = dashRes.status === "fulfilled" ? dashRes.value : {};

        const rawRoute = routePayload.route || routePayload;
        const rawStops = routePayload.pickupPoints || routePayload.stops || rawRoute.stops || [];

        const assignedVeh = dashPayload.assignedVehicle || dashPayload.assignment || {};
        const assignedAtt = dashPayload.attendant || dashPayload.assignment || {};

        const mappedStops = rawStops.map((s, idx) => ({
          id: s.pickupPointId ?? s.id ?? idx + 1,
          stopNumber: s.stopOrder ?? s.sequenceNo ?? s.stopNumber ?? idx + 1,
          name: toTitleCase(s.stopName ?? s.name ?? `Stop ${idx + 1}`),
          landmark: s.landmark ?? s.stopAddress ?? "Scheduled Stop Landmark",
          pickupTime: formatTime12Hour(s.pickupTime) || "07:30 AM",
          dropTime: formatTime12Hour(s.dropTime) || "04:15 PM",
          studentCount: s.studentCount != null ? Number(s.studentCount) : 0,
          status: s.status ?? "Scheduled",
        }));

        const combinedRoute = {
          routeName: rawRoute.routeName || driverProfile?.assignedRoute || "Assigned Route",
          routeCode: rawRoute.routeCode || "ROUTE-01",
          startPoint: rawRoute.StartLocation || rawRoute.startLocation || "Campus Gate",
          endPoint: rawRoute.EndLocation || rawRoute.endLocation || "Designated Drop",
          morningStartTime: dashPayload.morningTripTime || dashPayload.assignment?.morningTripTime || "07:00 AM",
          morningEndTime: "08:30 AM",
          distanceKm: rawRoute.DistanceKm || rawRoute.distanceKm || "0",
          busNumber: assignedVeh.vehicleNumber || driverProfile?.assignedVehicle || "Not Assigned",
          vehicleModel: assignedVeh.vehicleType || driverProfile?.vehicleModel || "Transport Vehicle",
          assignedAttendant: assignedAtt.attendantName || driverProfile?.assignedAttendant || "N/A",
          attendantPhone: assignedAtt.contactNumber || driverProfile?.attendantPhone || "N/A",
          shift: dashPayload.shift || dashPayload.assignment?.shift || driverProfile?.shift || "Morning",
          effectiveDate: assignedVeh.assignedDate ? String(assignedVeh.assignedDate).slice(0, 10) : "Active Term",
          totalStudents: dashPayload.assignedStudents ?? dashPayload.assignment?.assignedStudents ?? mappedStops.reduce((acc, s) => acc + (s.studentCount || 0), 0),
          stops: mappedStops,
        };

        setRouteDetails(combinedRoute);
        setError("");
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || err.message || "Failed to load route details.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    };

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="dp-page-container">
        <SkeletonPage variant="page" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dp-page-container">
        <p className="dp-text-danger">{error}</p>
      </div>
    );
  }

  const activeStop = routeDetails?.stops?.find((s) => String(s.id) === String(selectedStopId));

  return (
    <div className="dp-page-container">
      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <RouteIcon size={14} /> Assigned Route Information
          </div>
          <h1 className="dp-page-title">My Route</h1>
          <p className="dp-page-subtitle">View your assigned transport route and pickup points.</p>
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
              <h2 className="dp-card-title">{routeDetails?.routeName}</h2>
              <span className="dp-code-badge">Code: {routeDetails?.routeCode}</span>
            </div>
          </div>
          <DriverStatusBadge status="Active Schedule" tone="success" />
        </div>

        <div className="dp-card-body">
          <div className="dp-route-details-grid">
            <div className="dp-rd-item">
              <span className="dp-rd-label">Start Point</span>
              <strong className="dp-rd-val">{routeDetails?.startPoint}</strong>
              <small className="dp-rd-sub">Pickup Departs: {formatTime12Hour(routeDetails?.morningStartTime)}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">End Point</span>
              <strong className="dp-rd-val">{routeDetails?.endPoint}</strong>
              <small className="dp-rd-sub">Arrives: {routeDetails?.morningEndTime}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Total Distance</span>
              <strong className="dp-rd-val">{routeDetails?.distanceKm} km</strong>
              <small className="dp-rd-sub">Scheduled Route Loop</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Bus Number</span>
              <strong className="dp-rd-val">{routeDetails?.busNumber}</strong>
              <small className="dp-rd-sub">{routeDetails?.vehicleModel}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Assigned Attendant</span>
              <strong className="dp-rd-val">{routeDetails?.assignedAttendant}</strong>
              <small className="dp-rd-sub">{routeDetails?.attendantPhone}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Shift</span>
              <strong className="dp-rd-val">{routeDetails?.shift}</strong>
              <small className="dp-rd-sub">Active Duty</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Effective Date</span>
              <strong className="dp-rd-val">{routeDetails?.effectiveDate}</strong>
              <small className="dp-rd-sub">Current Assignment</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Total Assigned Students</span>
              <strong className="dp-rd-val">{routeDetails?.totalStudents} Students</strong>
              <small className="dp-rd-sub">Across {routeDetails?.stops?.length || 0} Scheduled Stops</small>
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
          {/* Corridor Progress Header */}
          <div className="dp-route-corridor-summary">
            <div className="dp-corridor-metric">
              <Bus size={15} className="dp-text-primary" />
              <span>{routeDetails?.stops?.length || 0} Scheduled Stops</span>
            </div>
            <div className="dp-corridor-sep">•</div>
            <div className="dp-corridor-metric">
              <RouteIcon size={15} className="dp-text-primary" />
              <span>{routeDetails?.distanceKm || 21} km Total Transit</span>
            </div>
            <div className="dp-corridor-sep">•</div>
            <div className="dp-corridor-metric">
              <Users size={15} className="dp-text-primary" />
              <span>{routeDetails?.totalStudents || 2} Students Assigned</span>
            </div>
          </div>

          {/* Stepper Grid of Interactive Cards */}
          <div className="dp-route-stepper-grid">
            {routeDetails?.stops && routeDetails.stops.length > 0 ? (
              routeDetails.stops.map((stop, index) => {
                const isSelected = String(selectedStopId) === String(stop.id);
                const isCompleted = stop.status === "Completed";
                const isLast = index === routeDetails.stops.length - 1;

                return (
                  <React.Fragment key={stop.id}>
                    <div
                      className={`dp-route-step-card ${isSelected ? "is-selected" : ""} ${isCompleted ? "is-done" : ""}`}
                      onClick={() => setSelectedStopId(stop.id)}
                    >
                      <div className="dp-rsc-header">
                        <span className="dp-rsc-order-badge">
                          {isCompleted ? <CheckCircle2 size={13} /> : `Stop ${stop.stopNumber}`}
                        </span>
                        <span className="dp-rsc-time-tag">
                          <Clock size={11} /> {stop.pickupTime}
                        </span>
                      </div>
                      <div className="dp-rsc-body">
                        <h4 className="dp-rsc-title">{stop.name}</h4>
                        <p className="dp-rsc-landmark">
                          <MapPin size={12} /> {stop.landmark}
                        </p>
                      </div>
                      <div className="dp-rsc-footer">
                        <span className="dp-rsc-student-chip">
                          <Users size={11} /> {stop.studentCount > 0 ? `${stop.studentCount} ${stop.studentCount === 1 ? 'Student' : 'Students'}` : isLast ? 'Campus Drop' : 'En-route Stop'}
                        </span>
                        <DriverStatusBadge status={stop.status} />
                      </div>
                    </div>
                    {!isLast && (
                      <div className="dp-route-step-arrow" aria-hidden="true">
                        <ArrowRight size={18} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <p className="text-gray-500 py-3">No stops configured for this route.</p>
            )}
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
                {routeDetails?.stops && routeDetails.stops.length > 0 ? (
                  routeDetails.stops.map((stop) => (
                    <tr
                      key={stop.id}
                      className={String(selectedStopId) === String(stop.id) ? "dp-row-highlight" : ""}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-500">
                      No pickup points found for this route.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
