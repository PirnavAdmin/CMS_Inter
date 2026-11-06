import React, { useState, useEffect, useRef } from "react";
import {
  Route as RouteIcon,
  Bus,
  Truck,
  Users,
  Sun,
  Moon,
  Navigation,
  AlertTriangle,
  Play,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import DriverStatCard from "../components/DriverStatCard.jsx";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import { getDashboard, getRoute, getTrips } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";
import { useDriverData } from "../DriverDataContext.jsx";
import { unwrapDriverData, formatTime12Hour } from "../data/driverData.js";

export default function DriverHomePage({
  onNavigateTab,
  activeTripState,
  studentsList = [],
}) {
  const [dashboardData, setDashboardData] = useState(null);
  const [tripsData, setTripsData] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const { driverProfile } = useDriverData();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        if (!hasLoadedOnce.current) {
          setIsLoading(true);
        }
        const [dashRes, routeRes, tripsRes] = await Promise.allSettled([
          getDashboard().then(unwrapDriverData),
          getRoute().then(unwrapDriverData),
          getTrips().then(unwrapDriverData),
        ]);

        if (!isMounted) return;

        if (dashRes.status === "fulfilled") {
          setDashboardData(dashRes.value);
        }
        if (tripsRes && tripsRes.status === "fulfilled") {
          const tVal = tripsRes.value?.trips || tripsRes.value || {};
          setTripsData(tVal);
        }
        if (routeRes.status === "fulfilled") {
          const rVal = routeRes.value || {};
          const rObj = rVal.route || rVal;
          const stops = rVal.stops || rVal.pickupPoints || rObj.stops || rObj.pickupPoints || [];
          setRouteInfo({
            ...rObj,
            stops,
            pickupPoints: stops,
          });
        }
        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || err.message || "Failed to load dashboard data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    };
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const assignedVeh = dashboardData?.assignedVehicle || dashboardData?.assignment || {};
  const assignedRoute = dashboardData?.route || dashboardData?.assignment || {};
  const assignedAtt = dashboardData?.attendant || dashboardData?.assignment || {};

  const busNumber = assignedVeh.vehicleNumber || driverProfile?.assignedVehicle || "AP39AU2653";
  const vehicleModel = assignedVeh.vehicleType || driverProfile?.vehicleModel || "Ashok Leyland 45-Seater";
  const vehicleReg = assignedVeh.registrationNumber || busNumber || "AP39AU2653";
  const routeName = assignedRoute.routeName || routeInfo?.routeName || driverProfile?.assignedRoute || "32 Habsiguda";
  const routeCode = assignedRoute.routeCode || routeInfo?.routeCode || "HABSIGUDA_1";
  const routeDistance = routeInfo?.DistanceKm || routeInfo?.distanceKm || "21.0";
  const attendantName = assignedAtt.attendantName || driverProfile?.assignedAttendant || "Ramesh K";
  const shiftName = dashboardData?.shift || dashboardData?.assignment?.shift || driverProfile?.shift || "Morning";

  const totalAssignedStudents =
    dashboardData?.assignedStudents ??
    dashboardData?.assignment?.assignedStudents ??
    studentsList.length ??
    2;

  const pickedUpCount = studentsList.filter((s) => s.status === "Picked Up" || s.status === "Boarded").length;
  const pendingCount = Math.max(0, totalAssignedStudents - pickedUpCount);

  const morningTripObj = tripsData?.morningTrip;
  const eveningTripObj = tripsData?.eveningTrip;

  const morningTripStatus = morningTripObj?.status || activeTripState?.morningTripStatus || "Scheduled";
  const eveningTripStatus = eveningTripObj?.status || activeTripState?.eveningTripStatus || "Scheduled";

  const isAllTripsCompleted = morningTripStatus === "Completed" && eveningTripStatus === "Completed";
  const isTripInProgress = morningTripStatus === "In Progress" || eveningTripStatus === "In Progress";

  const morningTripTime = dashboardData?.morningTripTime || dashboardData?.assignment?.morningTripTime || "07:35 AM";
  const eveningTripTime = dashboardData?.eveningTripTime || dashboardData?.assignment?.eveningTripTime || "04:45 PM";

  if (isLoading) {
    return (
      <div className="dp-page-container">
        <SkeletonPage variant="dashboard" columns={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dp-page-container">
        <div className="dp-page-header">
          <div className="dp-header-main">
            <h1 className="dp-page-title text-red-500">Error Loading Data</h1>
            <p className="dp-page-subtitle">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const toTitleCase = (str) => {
    if (!str || typeof str !== "string") return "";
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const DEFAULT_ROUTE_STOPS = [
    { id: 1, stopName: "Tarnaka Metro", landmark: "Metro Pillar 1042 / St. Ann's", pickupTime: "07:35 AM", dropTime: "04:35 PM", studentCount: 1, stopOrder: 1 },
    { id: 2, stopName: "Habsiguda Crossroads", landmark: "Opp. Indian Oil Petrol Pump", pickupTime: "07:50 AM", dropTime: "04:20 PM", studentCount: 1, stopOrder: 2 },
    { id: 3, stopName: "Nacharam IDA", landmark: "Industrial Area Entrance", pickupTime: "08:05 AM", dropTime: "04:05 PM", studentCount: 0, stopOrder: 3 },
    { id: 4, stopName: "Campus Main Gate", landmark: "College Arrival Bay", pickupTime: "08:25 AM", dropTime: "03:45 PM", studentCount: 0, stopOrder: 4 },
  ];

  const rawStops = (routeInfo?.stops && routeInfo.stops.length > 0)
    ? routeInfo.stops
    : (routeInfo?.pickupPoints && routeInfo.pickupPoints.length > 0)
    ? routeInfo.pickupPoints
    : (dashboardData?.routeDetails?.stops && dashboardData.routeDetails.stops.length > 0)
    ? dashboardData.routeDetails.stops
    : DEFAULT_ROUTE_STOPS;

  const stopsList = rawStops.map((s, idx) => ({
    id: s.pickupPointId || s.id || idx + 1,
    name: toTitleCase(s.stopName || s.name || `Stop ${idx + 1}`),
    pickupTime: formatTime12Hour(s.pickupTime) || "07:35 AM",
    studentCount: s.studentCount != null ? Number(s.studentCount) : 0,
    status: isAllTripsCompleted ? "Completed" : (s.status || "Scheduled"),
    stopNumber: s.stopOrder || s.sequenceNo || idx + 1,
  }));

  const todaySchedule = [
    {
      id: "m-trip-1",
      time: morningTripObj?.time || `${formatTime12Hour(morningTripTime)} - 08:30 AM`,
      title: "Morning Pickup Operation",
      route: routeName,
      stops: `${stopsList.length || 2} Stops`,
      students: totalAssignedStudents,
      status: morningTripStatus,
      statusTone: morningTripStatus === "Completed" ? "success" : morningTripStatus === "In Progress" ? "warning" : "primary",
    },
    {
      id: "e-trip-2",
      time: eveningTripObj?.time || `${formatTime12Hour(eveningTripTime)} - 05:30 PM`,
      title: "Evening Drop Operation",
      route: routeName,
      stops: `${stopsList.length || 2} Stops`,
      students: totalAssignedStudents,
      status: eveningTripStatus,
      statusTone: eveningTripStatus === "Completed" ? "success" : eveningTripStatus === "In Progress" ? "warning" : "primary",
    },
  ];

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <ShieldCheck size={14} /> Certified Transport Crew
          </div>
          <h1 className="dp-page-title">Driver Dashboard</h1>
          <p className="dp-page-subtitle">Safe Students, Smooth Journeys</p>
        </div>
        <div className="dp-header-actions">
          <button type="button" className="dp-btn dp-btn-outline" onClick={() => onNavigateTab("route")}>
            <RouteIcon size={16} /> View Route Map
          </button>
          <button type="button" className="dp-btn dp-btn-primary" onClick={() => onNavigateTab("trips")}>
            <Play size={16} /> Trips Management
          </button>
        </div>
      </div>

      {/* Driver Welcome Hero Strip */}
      <div className="dp-driver-hero-card">
        <div className="dp-hero-avatar">{driverProfile?.initials || "PR"}</div>
        <div className="dp-hero-text">
          <div className="dp-hero-greeting">
            <h3>Welcome back, {driverProfile?.name || "Driver"}!</h3>
            <span className="dp-hero-role-tag">
              {driverProfile?.role || "Bus Driver"} • {driverProfile?.employeeId || "MNT0030"}
            </span>
          </div>
          <p className="dp-hero-desc">
            You are assigned to <strong>{busNumber}</strong> ({vehicleModel}) on <strong>{routeName}</strong> today.
          </p>
        </div>
        <div className="dp-hero-stats">
          <div className="dp-hs-item">
            <small>Attendant</small>
            <strong>{attendantName}</strong>
          </div>
          <div className="dp-hs-item">
            <small>Shift</small>
            <strong>{shiftName}</strong>
          </div>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="dp-stat-grid-8">
        <DriverStatCard
          icon={RouteIcon}
          title="Today's Route"
          value={routeName}
          subtitle={`Code: ${routeCode} • ${routeDistance} km`}
          tone="primary"
          onClick={() => onNavigateTab("route")}
        />
        <DriverStatCard
          icon={Bus}
          title="Bus Number"
          value={busNumber}
          subtitle={`Registration: ${vehicleReg}`}
          tone="blue"
          onClick={() => onNavigateTab("profile")}
        />
        <DriverStatCard
          icon={Truck}
          title="Assigned Vehicle"
          value={vehicleModel}
          subtitle={`${assignedVeh.capacity || 45}-Seater • Commercial Fleet`}
          tone="purple"
          onClick={() => onNavigateTab("profile")}
        />
        <DriverStatCard
          icon={Users}
          title="Students Assigned"
          value={`${totalAssignedStudents}`}
          subtitle={`${pickedUpCount} Picked Up • ${pendingCount} Pending`}
          tone="success"
          onClick={() => onNavigateTab("students")}
        />
        <DriverStatCard
          icon={Sun}
          title="Morning Trip"
          value={morningTripStatus}
          subtitle={morningTripObj?.time || formatTime12Hour(morningTripTime)}
          tone={morningTripStatus === "Completed" ? "success" : morningTripStatus === "In Progress" ? "warning" : "primary"}
          badge={morningTripStatus === "In Progress" ? "Live" : undefined}
          onClick={() => onNavigateTab("trips")}
        />
        <DriverStatCard
          icon={Moon}
          title="Evening Trip"
          value={eveningTripStatus}
          subtitle={eveningTripObj?.time || formatTime12Hour(eveningTripTime)}
          tone={eveningTripStatus === "Completed" ? "success" : eveningTripStatus === "In Progress" ? "warning" : "purple"}
          badge={eveningTripStatus === "In Progress" ? "Live" : undefined}
          onClick={() => onNavigateTab("trips")}
        />
        <DriverStatCard
          icon={Navigation}
          title="GPS Status"
          value={isAllTripsCompleted ? "Standby" : isTripInProgress ? "Active" : "Online"}
          subtitle={isAllTripsCompleted ? "Parked • Campus Depot" : "Active • Telemetry Synced"}
          tone={isAllTripsCompleted ? "primary" : "success"}
          badge={isTripInProgress ? "Live" : undefined}
          onClick={() => onNavigateTab("gps")}
        />
        <DriverStatCard
          icon={AlertTriangle}
          title="Active Alerts"
          value="0"
          subtitle="Route clear & on schedule"
          tone="primary"
        />
      </div>

      {/* Primary Action Card: Dynamic Based on Real Status */}
      <div className="dp-action-banner-card">
        <div className="dp-abc-content">
          <div className="dp-abc-icon-wrap">
            {isAllTripsCompleted ? <CheckCircle2 size={32} className="dp-text-success" /> : <Bus size={32} />}
          </div>
          <div className="dp-abc-text">
            <h2>
              {isAllTripsCompleted
                ? "All Scheduled Trips Completed for Today!"
                : isTripInProgress
                ? "Active Trip In Progress"
                : morningTripStatus === "Completed"
                ? "Ready for Evening Drop Operation?"
                : "Ready to Start Morning Pickup?"}
            </h2>
            <p>
              {isAllTripsCompleted
                ? "Both morning pickup and evening drop routes have been successfully finished. Vehicle AP39AU2653 safely parked at campus depot."
                : isTripInProgress
                ? "Vehicle AP39AU2653 is en-route. Live GPS and student manifests are broadcasting."
                : morningTripStatus === "Completed"
                ? "Morning route completed. Evening return run is scheduled at 04:30 PM."
                : "Ensure vehicle is ready and pre-trip safety checklist is verified before starting the trip."}
            </p>
          </div>
        </div>
        <div className="dp-abc-actions">
          {isAllTripsCompleted ? (
            <button type="button" className="dp-btn dp-btn-primary dp-btn-lg" onClick={() => onNavigateTab("reports")}>
              <CheckCircle2 size={18} /> View Trip Reports
            </button>
          ) : isTripInProgress ? (
            <button type="button" className="dp-btn dp-btn-primary dp-btn-lg" onClick={() => onNavigateTab("gps")}>
              <Navigation size={18} /> Live GPS Tracking
            </button>
          ) : (
            <button type="button" className="dp-btn dp-btn-primary dp-btn-lg" onClick={() => onNavigateTab("trips")}>
              <Play size={18} /> Trips Management
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Section: Today's Schedule & Upcoming Stops */}
      <div className="dp-dashboard-dual-grid">
        {/* Today's Schedule */}
        <div className="dp-card">
          <div className="dp-card-head">
            <div className="dp-flex-col">
              <h3>Today's Schedule</h3>
              <p>Daily planned run timings and stops</p>
            </div>
            <span className="dp-date-badge">
              <Calendar size={13} /> Today
            </span>
          </div>
          <div className="dp-card-body p-0">
            <div className="dp-schedule-list">
              {todaySchedule.map((item) => (
                <div key={item.id} className="dp-schedule-item">
                  <div className="dp-sched-time">
                    <Clock size={15} />
                    <span>{item.time}</span>
                  </div>
                  <div className="dp-sched-info">
                    <h4>{item.title}</h4>
                    <p>
                      {item.route} • {item.stops} {item.students > 0 && `• ${item.students} Students`}
                    </p>
                  </div>
                  <div className="dp-sched-status">
                    <DriverStatusBadge status={item.status} tone={item.statusTone} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dp-card-footer">
            <button type="button" className="dp-link-btn" onClick={() => onNavigateTab("trips")}>
              Open Trip Operation Deck <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Upcoming Stops Progress */}
        <div className="dp-card">
          <div className="dp-card-head">
            <div className="dp-flex-col">
              <h3>Upcoming Stops & Route Flow</h3>
              <p>Real-time progress for {routeName}</p>
            </div>
            <button type="button" className="dp-link-btn" onClick={() => onNavigateTab("route")}>
              Full Route Details
            </button>
          </div>
          <div className="dp-card-body dp-stops-body">
            <div className="dp-stops-timeline">
              {stopsList.length > 0 ? (
                stopsList.map((stop, idx) => (
                  <div
                    key={stop.id || idx}
                    className={`dp-timeline-step ${
                      stop.status === "Completed"
                        ? "is-completed"
                        : stop.status === "In Progress"
                        ? "is-current"
                        : "is-upcoming"
                    }`}
                  >
                    <div className="dp-step-marker">
                      {stop.status === "Completed" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <span>{stop.stopNumber || idx + 1}</span>
                      )}
                    </div>
                    <div className="dp-step-body">
                      <div className="dp-step-top">
                        <strong>{stop.name}</strong>
                        <span className="dp-step-time">{stop.pickupTime}</span>
                      </div>
                      <div className="dp-step-bottom">
                        <span className="dp-step-students">
                          <Users size={12} /> {stop.studentCount} {stop.studentCount === 1 ? "Student" : "Students"}
                        </span>
                        <DriverStatusBadge status={stop.status} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p>No stops available.</p>
                </div>
              )}
            </div>
          </div>
          <div className="dp-card-footer">
            <button type="button" className="dp-link-btn" onClick={() => onNavigateTab("students")}>
              Manage Student Pickup List <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
