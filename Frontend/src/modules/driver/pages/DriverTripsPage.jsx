import { useSearchParams } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import {
  Bus,
  CheckCircle2,
  Zap,
  FileText,
  ShieldAlert,
  PhoneCall,
} from "lucide-react";
import DriverTripCard from "../components/DriverTripCard.jsx";
import { getTrips, startTrip, endTrip, getProfile, getDashboard } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";
import { useDriverData } from "../DriverDataContext.jsx";
import { unwrapDriverData } from "../data/driverData.js";

export default function DriverTripsPage({ onNavigateTab, activeTripState, onStartTrip, onEndTrip }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { driverProfile: contextProfile } = useDriverData();
  const [morningTrip, setMorningTrip] = useState(null);
  const [eveningTrip, setEveningTrip] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [emergencyHelpline, setEmergencyHelpline] = useState(null);
  const [preTripChecklist, setPreTripChecklist] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const hasLoadedOnce = useRef(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        if (!hasLoadedOnce.current) {
          setIsLoading(true);
        }
        const results = await Promise.allSettled([
          getTrips().then(unwrapDriverData),
          getProfile().then(unwrapDriverData),
          getDashboard().then(unwrapDriverData),
        ]);

        if (!isMounted) return;

        const [tripsRes, profileRes, dashboardRes] = results;

        const tripsData = tripsRes.status === "fulfilled" ? tripsRes.value?.trips || tripsRes.value || {} : {};
        const profileData = profileRes.status === "fulfilled" ? profileRes.value?.profile || profileRes.value || {} : {};
        const dashboardData = dashboardRes.status === "fulfilled" ? dashboardRes.value || {} : {};

        const mTrip = tripsData.morningTrip || null;
        const eTrip = tripsData.eveningTrip || null;

        const assignedVeh = dashboardData.assignedVehicle || dashboardData.assignment || {};
        const assignedRoute = dashboardData.route || dashboardData.assignment || {};
        const assignedAtt = dashboardData.attendant || dashboardData.assignment || {};

        setMorningTrip(
          mTrip || {
            id: 1,
            time: dashboardData.morningTripTime || dashboardData.assignment?.morningTripTime || "07:35 AM - 08:30 AM",
            title: "Morning Pickup Operation",
            type: "Morning Pickup",
            route: assignedRoute.routeName || contextProfile?.assignedRoute || "Assigned Route",
            stops: `${dashboardData.routeDetails?.stops?.length || 2} Stops`,
            students: dashboardData.assignedStudents ?? dashboardData.assignment?.assignedStudents ?? 2,
            status: "Scheduled",
          }
        );

        setEveningTrip(
          eTrip || {
            id: 2,
            time: dashboardData.eveningTripTime || dashboardData.assignment?.eveningTripTime || "04:45 PM - 05:30 PM",
            title: "Evening Drop Operation",
            type: "Evening Drop",
            route: assignedRoute.routeName || contextProfile?.assignedRoute || "Assigned Route",
            stops: `${dashboardData.routeDetails?.stops?.length || 2} Stops`,
            students: dashboardData.assignedStudents ?? dashboardData.assignment?.assignedStudents ?? 2,
            status: "Scheduled",
          }
        );

        setDriverProfile({
          assignedVehicle: assignedVeh.vehicleNumber || profileData.assignedVehicle || contextProfile?.assignedVehicle || "AP39AU2653",
          vehicleModel: assignedVeh.vehicleType || profileData.vehicleModel || contextProfile?.vehicleModel || "Ashok Leyland 45-Seater",
          assignedRoute: assignedRoute.routeName || profileData.assignedRoute || contextProfile?.assignedRoute || "32 Habsiguda",
          routeCode: assignedRoute.routeCode || profileData.routeCode || "HABSIGUDA_1",
          assignedAttendant: assignedAtt.attendantName || profileData.assignedAttendant || contextProfile?.assignedAttendant || "Ramesh K",
        });

        setEmergencyHelpline(
          dashboardData.emergencyHelpline || {
            headPhone: "+91 98480 22338",
            transportHead: "Transport Cell Incharge (Ramesh K)",
            altHelpdesk: "+91 92835 72983",
            depotManager: "Campus Fleet Workshop",
          }
        );

        setPreTripChecklist(
          dashboardData.preTripChecklist || [
            { id: "c1", label: "Tire Pressure & Wheel Lug Nuts", task: "Tire Pressure & Wheel Lug Nuts", category: "Wheels & Tires", mandatory: true },
            { id: "c2", label: "Service Brakes & Steering Response", task: "Service Brakes & Steering Response", category: "Control Systems", mandatory: true },
            { id: "c3", label: "Fuel, Engine Oil & Coolant Levels", task: "Fuel, Engine Oil & Coolant Levels", category: "Engine & Fluids", mandatory: true },
            { id: "c4", label: "First Aid Kit & Fire Extinguisher", task: "First Aid Kit & Fire Extinguisher", category: "Emergency Gear", mandatory: true },
          ]
        );

        setError("");
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching trips data:", err);
          setError("Failed to load trips data. Please refresh.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTripState?.morningTripStatus) {
      setMorningTrip((prev) =>
        prev ? { ...prev, status: activeTripState.morningTripStatus } : prev
      );
    }
    if (activeTripState?.eveningTripStatus) {
      setEveningTrip((prev) =>
        prev ? { ...prev, status: activeTripState.eveningTripStatus } : prev
      );
    }
  }, [activeTripState]);

  const handleStartMorning = async (id) => {
    try {
      await startTrip(id);
      setMorningTrip((prev) => ({ ...prev, status: "In Progress" }));
      if (onStartTrip) onStartTrip("morning");
      triggerToast("Morning trip started successfully! Live GPS tracking active.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to start morning trip.");
    }
  };

  const handleEndMorning = async (id) => {
    try {
      await endTrip(id);
      setMorningTrip((prev) => ({ ...prev, status: "Completed" }));
      if (onEndTrip) onEndTrip("morning");
      triggerToast("Morning trip ended and logged to Transport Registry.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to end morning trip.");
    }
  };

  const handleStartEvening = async (id) => {
    try {
      await startTrip(id);
      setEveningTrip((prev) => ({ ...prev, status: "In Progress" }));
      if (onStartTrip) onStartTrip("evening");
      triggerToast("Evening trip started successfully! Live GPS tracking active.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to start evening trip.");
    }
  };

  const handleEndEvening = async (id) => {
    try {
      await endTrip(id);
      setEveningTrip((prev) => ({ ...prev, status: "Completed" }));
      if (onEndTrip) onEndTrip("evening");
      triggerToast("Evening trip ended and logged to Transport Registry.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to end evening trip.");
    }
  };

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
          <p className="dp-page-subtitle">Start, monitor, and log your daily college transport trips.</p>
        </div>
        <div className="dp-header-actions">
          <button type="button" className="dp-btn dp-btn-outline" onClick={() => onNavigateTab("gps")}>
            <Zap size={16} /> Live GPS Console
          </button>
          <button type="button" className="dp-btn dp-btn-primary" onClick={() => onNavigateTab("reports")}>
            <FileText size={16} /> Trip History Logs
          </button>
        </div>
      </div>

      {/* Driver Bus Status Strip */}
      <div className="dp-trips-overview-strip">
        <div className="dp-tos-item">
          <small>Vehicle Assigned</small>
          <strong>
            {driverProfile?.assignedVehicle} ({driverProfile?.vehicleModel})
          </strong>
        </div>
        <div className="dp-tos-item">
          <small>Current Route</small>
          <strong>
            {driverProfile?.assignedRoute} ({driverProfile?.routeCode})
          </strong>
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
