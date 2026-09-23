import React, { useState, useEffect } from "react";
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
import { getDashboard } from "../../../api/transportDriverApi.js";

export default function DriverHomePage({
  onNavigateTab,
  activeTripState,
  studentsList = [],
}) {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const res = await getDashboard();
        if (isMounted) {
          setDashboardData(res.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || err.message || "Failed to load dashboard data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const pickedUpCount = studentsList.filter((s) => s.status === "Picked Up").length;
  const pendingCount = studentsList.filter((s) => s.status === "Pending").length;
  const totalStudents = studentsList.length || 32;

  const morningTripStatus = activeTripState?.morningTripStatus || "In Progress";
  const eveningTripStatus = activeTripState?.eveningTripStatus || "Pending";

  if (isLoading) {
    return (
      <div className="dp-page-container">
        <div className="dp-page-header">
          <div className="dp-header-main">
            <h1 className="dp-page-title">Loading Dashboard...</h1>
          </div>
        </div>
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

  const driverProfile = dashboardData?.driverProfile || {};
  const todaySchedule = dashboardData?.todaySchedule || [];
  const routeDetails = dashboardData?.routeDetails || { stops: [] };


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
          <button
            type="button"
            className="dp-btn dp-btn-outline"
            onClick={() => onNavigateTab("route")}
          >
            <RouteIcon size={16} /> View Route Map
          </button>
          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={() => onNavigateTab("trips")}
          >
            <Play size={16} /> Trips Management
          </button>
        </div>
      </div>

      {/* Driver Welcome Hero Strip */}
      <div className="dp-driver-hero-card">
        <div className="dp-hero-avatar">{driverProfile.initials || "DR"}</div>
        <div className="dp-hero-text">
          <div className="dp-hero-greeting">
            <h3>Welcome back, {driverProfile.name || "Driver"}!</h3>
            <span className="dp-hero-role-tag">{driverProfile.role || "Transport Staff"} • {driverProfile.employeeId || "EMP-000"}</span>
          </div>
          <p className="dp-hero-desc">
            You are assigned to <strong>{driverProfile.assignedVehicle || "a vehicle"}</strong> ({driverProfile.vehicleModel || "Standard"}) on <strong>{driverProfile.assignedRoute || "your route"}</strong> today.
          </p>
        </div>
        <div className="dp-hero-stats">
          <div className="dp-hs-item">
            <small>Attendant</small>
            <strong>{driverProfile.assignedAttendant || "N/A"}</strong>
          </div>
          <div className="dp-hs-item">
            <small>Shift</small>
            <strong>{driverProfile.shift || "Regular"}</strong>
          </div>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="dp-stat-grid-8">
        <DriverStatCard
          icon={RouteIcon}
          title="Today's Route"
          value={dashboardData?.routeInfo?.name || driverProfile.assignedRoute || "City Route A"}
          subtitle={dashboardData?.routeInfo?.details || "Code: ROUTE-01 • 24.5 km"}
          tone="primary"
          onClick={() => onNavigateTab("route")}
        />
        <DriverStatCard
          icon={Bus}
          title="Bus Number"
          value={driverProfile.assignedVehicle || "PC-101"}
          subtitle={driverProfile.vehicleRegistration || "Registration: TN 09 BX 4412"}
          tone="blue"
          onClick={() => onNavigateTab("profile")}
        />
        <DriverStatCard
          icon={Truck}
          title="Assigned Vehicle"
          value={driverProfile.vehicleModel || "Tata Starbus"}
          subtitle={driverProfile.vehicleDetails || "40-Seater • Diesel BS-VI"}
          tone="purple"
          onClick={() => onNavigateTab("profile")}
        />
        <DriverStatCard
          icon={Users}
          title="Students Assigned"
          value={`${dashboardData?.studentsCount?.total || totalStudents}`}
          subtitle={`${dashboardData?.studentsCount?.pickedUp || pickedUpCount} Picked Up • ${dashboardData?.studentsCount?.pending || pendingCount} Pending`}
          tone="success"
          onClick={() => onNavigateTab("students")}
        />
        <DriverStatCard
          icon={Sun}
          title="Morning Trip"
          value={dashboardData?.morningTrip?.status || morningTripStatus}
          subtitle={dashboardData?.morningTrip?.time || "07:00 AM – 08:30 AM"}
          tone={(dashboardData?.morningTrip?.status || morningTripStatus) === "In Progress" ? "warning" : "success"}
          badge={(dashboardData?.morningTrip?.status || morningTripStatus) === "In Progress" ? "Live" : undefined}
          onClick={() => onNavigateTab("trips")}
        />
        <DriverStatCard
          icon={Moon}
          title="Evening Trip"
          value={dashboardData?.eveningTrip?.status || eveningTripStatus}
          subtitle={dashboardData?.eveningTrip?.time || "04:00 PM – 05:30 PM"}
          tone="purple"
          onClick={() => onNavigateTab("trips")}
        />
        <DriverStatCard
          icon={Navigation}
          title="GPS Status"
          value={dashboardData?.gpsStatus?.status || "Online"}
          subtitle={dashboardData?.gpsStatus?.signal || "Signal: 99.8% • 12 Sats"}
          tone="success"
          badge={dashboardData?.gpsStatus?.status === "Online" || !dashboardData?.gpsStatus ? "Live" : undefined}
          onClick={() => onNavigateTab("gps")}
        />
        <DriverStatCard
          icon={AlertTriangle}
          title="Active Alerts"
          value={dashboardData?.alerts?.count?.toString() || "0"}
          subtitle={dashboardData?.alerts?.message || "Route clear & on schedule"}
          tone={dashboardData?.alerts?.count > 0 ? "warning" : "primary"}
        />
      </div>

      {/* Primary Action Card: Ready to Start Trip? */}
      <div className="dp-action-banner-card">
        <div className="dp-abc-content">
          <div className="dp-abc-icon-wrap">
            <Bus size={32} />
          </div>
          <div className="dp-abc-text">
            <h2>Ready to Start Your Trip?</h2>
            <p>Ensure vehicle is ready and checklist is complete before starting the trip.</p>
          </div>
        </div>
        <div className="dp-abc-actions">
          <button
            type="button"
            className="dp-btn dp-btn-primary dp-btn-lg"
            onClick={() => onNavigateTab("trips")}
          >
            <Play size={18} /> Start Trip
          </button>
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
              {todaySchedule.length > 0 ? (
                todaySchedule.map((item) => (
                  <div key={item.id} className="dp-schedule-item">
                    <div className="dp-sched-time">
                      <Clock size={15} />
                      <span>{item.time}</span>
                    </div>
                    <div className="dp-sched-info">
                      <h4>{item.title}</h4>
                      <p>{item.route} • {item.stops} {item.students > 0 && `• ${item.students} Students`}</p>
                    </div>
                    <div className="dp-sched-status">
                      <DriverStatusBadge status={item.status} tone={item.statusTone} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>No schedule available for today.</p>
                </div>
              )}
            </div>
          </div>
          <div className="dp-card-footer">
            <button
              type="button"
              className="dp-link-btn"
              onClick={() => onNavigateTab("trips")}
            >
              Open Trip Operation Deck <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Upcoming Stops Progress */}
        <div className="dp-card">
          <div className="dp-card-head">
            <div className="dp-flex-col">
              <h3>Upcoming Stops & Route Flow</h3>
              <p>Real-time progress for {dashboardData?.routeInfo?.name || "the route"}</p>
            </div>
            <button
              type="button"
              className="dp-link-btn"
              onClick={() => onNavigateTab("route")}
            >
              Full Route Details
            </button>
          </div>
          <div className="dp-card-body">
            <div className="dp-stops-timeline">
              {routeDetails.stops && routeDetails.stops.length > 0 ? (
                routeDetails.stops.map((stop, idx) => (
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
                          <Users size={12} /> {stop.studentCount} Students
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
            <button
              type="button"
              className="dp-link-btn"
              onClick={() => onNavigateTab("students")}
            >
              Manage Student Pickup List <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

