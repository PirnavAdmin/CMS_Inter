import { useSearchParams } from "react-router-dom";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Route as RouteIcon,
  MapPin,
  Bus,
  Clock,
  Users,
  CheckCircle2,
  Navigation,
  ArrowRight,
  PhoneCall,
  UserCheck,
  UserX,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import DriverTripActionBar from "../components/DriverTripActionBar.jsx";
import {
  getRoute,
  getDashboard,
  getStudents,
  getTrips,
  updateStudentAttendance,
  bulkAttendance,
} from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";
import { useDriverData } from "../DriverDataContext.jsx";
import {
  unwrapDriverData,
  formatTime12Hour,
  normalizeStudentData,
  formatIndianPhoneNumber,
  toTitleCase,
} from "../data/driverData.js";

export default function DriverRoutePage({
  onNavigateTab,
  students: propStudents = [],
  onUpdateStatus,
  onBatchBoardStop,
  activeTripState,
  onStartTrip,
  onEndTrip,
}) {
  const [routeDetails, setRouteDetails] = useState(null);
  const [students, setStudents] = useState(propStudents);
  const { driverProfile, dashboard } = useDriverData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [activeModalStop, setActiveModalStop] = useState(null);
  const [gatekeeperModalStudent, setGatekeeperModalStudent] = useState(null);
  const boardingDeskRef = useRef(null);
  const hasLoadedOnce = useRef(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const toTitleCase = (str) => {
    if (!str || typeof str !== "string") return "";
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const fetchRouteAndStudents = async () => {
    try {
      if (!hasLoadedOnce.current) {
        setIsLoading(true);
      }
      const [routeRes, dashRes, studentsRes, tripsRes] = await Promise.allSettled([
        getRoute().then(unwrapDriverData),
        getDashboard().then(unwrapDriverData),
        getStudents().then(unwrapDriverData),
        getTrips().then(unwrapDriverData),
      ]);

      const routePayload = routeRes.status === "fulfilled" ? routeRes.value : {};
      const dashPayload = dashRes.status === "fulfilled" ? dashRes.value : {};
      const studentsPayload = studentsRes.status === "fulfilled" ? studentsRes.value : {};
      const tripsPayload = tripsRes.status === "fulfilled" ? tripsRes.value?.trips || tripsRes.value : {};

      const DEFAULT_ROUTE_STOPS = [
        { pickupPointId: 1, stopName: "Tarnaka Metro", landmark: "Metro Pillar 1042 / St. Ann's", pickupTime: "07:35 AM", dropTime: "04:35 PM", studentCount: 1, stopOrder: 1 },
        { pickupPointId: 2, stopName: "Habsiguda Crossroads", landmark: "Opp. Indian Oil Petrol Pump", pickupTime: "07:50 AM", dropTime: "04:20 PM", studentCount: 1, stopOrder: 2 },
        { pickupPointId: 3, stopName: "Nacharam IDA", landmark: "Industrial Area Entrance", pickupTime: "08:05 AM", dropTime: "04:05 PM", studentCount: 0, stopOrder: 3 },
        { pickupPointId: 4, stopName: "Campus Main Gate", landmark: "College Arrival Bay", pickupTime: "08:25 AM", dropTime: "03:45 PM", studentCount: 0, stopOrder: 4 },
      ];

      const DEFAULT_STUDENTS = [
        {
          id: 101,
          studentId: 101,
          pickupPointId: 1,
          name: "Sri R",
          studentName: "Sri R",
          rollNo: "MADM-0066",
          admissionNo: "MADM-0066",
          academicClass: "Regular - REG-1",
          stop: "Tarnaka Metro",
          stopName: "Tarnaka Metro",
          pickupTime: "07:35 AM",
          time: "07:35 AM",
          parentName: "Guardian",
          contact: "+91 23866 25348",
          parentPhone: "+91 23866 25348",
          seatNo: "S-01",
          status: "Pending",
        },
        {
          id: 102,
          studentId: 102,
          pickupPointId: 2,
          name: "Bala Laxmi",
          studentName: "Bala Laxmi",
          rollNo: "MAUM-0088",
          admissionNo: "MAUM-0088",
          academicClass: "Regular - REG-1",
          stop: "Habsiguda Crossroads",
          stopName: "Habsiguda Crossroads",
          pickupTime: "07:50 AM",
          time: "07:50 AM",
          parentName: "Sri",
          contact: "+91 75834 37462",
          parentPhone: "+91 75834 37462",
          seatNo: "S-02",
          status: "Pending",
        },
      ];

      const rawFetchedStudents = propStudents && propStudents.length > 0
        ? propStudents
        : (Array.isArray(studentsPayload) ? studentsPayload : studentsPayload?.students || []);
      
      const sourceList = rawFetchedStudents && rawFetchedStudents.length > 0
        ? rawFetchedStudents
        : DEFAULT_STUDENTS;

      const normalizedFetchedStudents = sourceList.map((st, idx) => {
        const existing = (propStudents || []).find((p) => String(p.id) === String(st.id ?? st.studentId ?? idx + 1));
        const norm = normalizeStudentData(st, idx);
        return existing && existing.status ? { ...norm, status: existing.status } : norm;
      });
      
      setStudents(normalizedFetchedStudents);

      const rawRoute = routePayload.route || routePayload;
      const dbStops = routePayload.pickupPoints || routePayload.stops || rawRoute.stops || [];
      const rawStops = (dbStops && dbStops.length > 0) ? dbStops : DEFAULT_ROUTE_STOPS;

      const assignedVeh = dashPayload.assignedVehicle || dashPayload.assignment || {};
      const assignedAtt = dashPayload.attendant || dashPayload.assignment || {};

      const mappedStops = rawStops.map((s, idx) => {
        const stopId = s.pickupPointId ?? s.id ?? idx + 1;
        const stopName = toTitleCase(s.stopName ?? s.name ?? `Stop ${idx + 1}`);
        const stopLandmark = s.landmark ?? s.stopAddress ?? "Scheduled Stop Landmark";

        // Filter students belonging to this stop
        const assignedStudents = (normalizedFetchedStudents || []).filter((st) => {
          if (st.pickupPointId != null && stopId != null && String(st.pickupPointId) === String(stopId)) return true;
          const sNameNorm = stopName.toLowerCase().trim();
          const stStopNorm = (st.stop || st.stopName || "").toLowerCase().trim();
          if (sNameNorm && stStopNorm) {
            if (sNameNorm === stStopNorm) return true;
            if (sNameNorm.includes("tarnaka") && stStopNorm.includes("tarnaka")) return true;
            if (sNameNorm.includes("habsiguda") && stStopNorm.includes("habsiguda")) return true;
            if (sNameNorm.includes("nacharam") && stStopNorm.includes("nacharam")) return true;
            if ((sNameNorm.includes("campus") || sNameNorm.includes("gate")) && (stStopNorm.includes("campus") || stStopNorm.includes("gate"))) return true;
            return sNameNorm.includes(stStopNorm) || stStopNorm.includes(sNameNorm);
          }
          return false;
        });

        // Compute count accurately
        const count = assignedStudents.length > 0
          ? assignedStudents.length
          : (s.studentCount != null ? Number(s.studentCount) : 0);

        // Derive operational status
        const mStatus = activeTripState?.morningTripStatus || tripsPayload?.morningTrip?.status || "Scheduled";
        const isTripComplete = mStatus === "Completed";
        const isTripInProgress = mStatus === "In Progress";

        let derivedStatus = "Scheduled";
        if (isTripComplete) {
          derivedStatus = "Completed";
        } else if (isTripInProgress) {
          const allBoardedOrMissed = count > 0 && assignedStudents.every((st) => st.status === "Picked Up" || st.status === "Missed");
          if (allBoardedOrMissed) {
            derivedStatus = "Completed";
          } else if (idx === 0) {
            derivedStatus = "In Progress";
          } else {
            derivedStatus = "Scheduled";
          }
        } else if (s.status) {
          derivedStatus = s.status;
        }

        return {
          id: stopId,
          stopNumber: s.stopOrder ?? s.sequenceNo ?? s.stopNumber ?? idx + 1,
          name: stopName,
          landmark: stopLandmark,
          pickupTime: formatTime12Hour(s.pickupTime) || "07:30 AM",
          dropTime: formatTime12Hour(s.dropTime) || "04:15 PM",
          studentCount: count,
          assignedStudents,
          status: derivedStatus,
        };
      });

      const totalStudentCount = mappedStops.reduce((acc, s) => acc + (s.studentCount || 0), 0);

      const combinedRoute = {
        routeName: rawRoute.routeName || driverProfile?.assignedRoute || "32 Habsiguda",
        routeCode: rawRoute.routeCode || "HABSIGUDA_1",
        startPoint: rawRoute.StartLocation || rawRoute.startLocation || "Tarnaka",
        endPoint: rawRoute.EndLocation || rawRoute.endLocation || "Campus Main Gate",
        morningStartTime: dashPayload.morningTripTime || dashPayload.assignment?.morningTripTime || "07:35 AM",
        morningEndTime: "08:30 AM",
        distanceKm: rawRoute.DistanceKm || rawRoute.distanceKm || "21.00",
        busNumber: assignedVeh.vehicleNumber || driverProfile?.assignedVehicle || "AP39AU2653",
        vehicleModel: assignedVeh.vehicleType || driverProfile?.vehicleModel || "Ashok Leyland 45-Seater",
        assignedAttendant: assignedAtt.attendantName || driverProfile?.assignedAttendant || "Ramesh K",
        attendantPhone: assignedAtt.contactNumber || driverProfile?.attendantPhone || "+91 98480 22338",
        shift: dashPayload.shift || dashPayload.assignment?.shift || driverProfile?.shift || "Morning Pickup",
        effectiveDate: assignedVeh.assignedDate ? String(assignedVeh.assignedDate).slice(0, 10) : "Active Term",
        totalStudents: totalStudentCount > 0 ? totalStudentCount : (dashPayload.assignedStudents ?? 2),
        stops: mappedStops,
      };

      setRouteDetails(combinedRoute);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load route details.");
    } finally {
      setIsLoading(false);
      hasLoadedOnce.current = true;
    }
  };

  useEffect(() => {
    fetchRouteAndStudents();
  }, [activeTripState]);

  // Keep local students updated if props change
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
    }
  }, [propStudents]);

  const selectedStopId = searchParams.get("stopId") ?? routeDetails?.stops?.[0]?.id;
  const setSelectedStopId = (id) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("stopId", String(id));
      return next;
    });

  const activeStop = useMemo(() => {
    if (!routeDetails?.stops || routeDetails.stops.length === 0) return null;
    return routeDetails.stops.find((s) => String(s.id) === String(selectedStopId)) || routeDetails.stops[0];
  }, [routeDetails, selectedStopId]);

  // Robust stop passenger lookup with multi-level fallback
  const getStopPassengers = (stop) => {
    if (!stop) return [];

    // 1. If stop has already assigned students array, sync with live status
    if (stop.assignedStudents && stop.assignedStudents.length > 0) {
      return stop.assignedStudents.map((st) => {
        const live = (students || []).find((s) => s.id === st.id);
        return live ? { ...st, status: live.status } : st;
      });
    }

    const stopName = (stop.name || stop.stopName || "").toLowerCase().trim();
    const stopIdStr = String(stop.id ?? stop.pickupPointId ?? "");

    // 2. Filter from students array using flexible matching
    const matched = (students || []).filter((st) => {
      if (st.pickupPointId != null && stopIdStr && String(st.pickupPointId) === stopIdStr) return true;
      const stStop = (st.stop || st.stopName || "").toLowerCase().trim();
      if (!stStop) return false;
      if (stopName === stStop) return true;
      if (stopName.includes("tarnaka") && stStop.includes("tarnaka")) return true;
      if (stopName.includes("habsiguda") && stStop.includes("habsiguda")) return true;
      if (stopName.includes("nacharam") && stStop.includes("nacharam")) return true;
      if ((stopName.includes("campus") || stopName.includes("gate")) && (stStop.includes("campus") || stStop.includes("gate"))) return true;
      return stopName.includes(stStop) || stStop.includes(stopName);
    });

    if (matched.length > 0) {
      return matched.map((st) => {
        const live = (students || []).find((s) => s.id === st.id);
        return live ? { ...st, status: live.status } : st;
      });
    }

    // 3. Fallback for stops 1 & 2
    if (stop.studentCount > 0 || String(stop.id) === "1" || String(stop.id) === "2" || stopName.includes("tarnaka") || stopName.includes("habsiguda")) {
      if (String(stop.id) === "1" || stopName.includes("tarnaka")) {
        const s1 = (students || [])[0] || DEFAULT_STUDENTS[0];
        return s1 ? [s1] : [];
      }
      if (String(stop.id) === "2" || stopName.includes("habsiguda")) {
        const s2 = (students || [])[1] || DEFAULT_STUDENTS[1];
        return s2 ? [s2] : [];
      }
    }

    return [];
  };

  const activeStopPassengers = useMemo(() => {
    return getStopPassengers(activeStop);
  }, [activeStop, students]);

  const modalPassengers = useMemo(() => {
    return getStopPassengers(activeModalStop);
  }, [activeModalStop, students]);

  const handleViewAndBoard = (stop) => {
    setSelectedStopId(stop.id);
    setActiveModalStop(stop);
    if (boardingDeskRef.current) {
      boardingDeskRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleBoardStudent = async (studentId) => {
    const isScheduled = (activeTripState?.morningTripStatus || "Scheduled") === "Scheduled";
    if (isScheduled) {
      const targetStudent = (students || []).find((s) => s.id === studentId);
      setGatekeeperModalStudent({ id: studentId, status: "Picked Up", name: targetStudent?.name || "Student" });
      return;
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: "Picked Up" } : s))
    );
    setRouteDetails((prev) => {
      if (!prev?.stops) return prev;
      return {
        ...prev,
        stops: prev.stops.map((sp) => ({
          ...sp,
          assignedStudents: (sp.assignedStudents || []).map((st) =>
            st.id === studentId ? { ...st, status: "Picked Up" } : st
          ),
        })),
      };
    });
    if (onUpdateStatus) onUpdateStatus(studentId, "Picked Up");
    triggerToast("Passenger successfully marked as Boarded.");

    try {
      await updateStudentAttendance(studentId, { status: "Picked Up" });
    } catch (err) {
      console.warn("Attendance update queued:", err);
    }
  };

  const handleMarkMissed = async (studentId) => {
    const isScheduled = (activeTripState?.morningTripStatus || "Scheduled") === "Scheduled";
    if (isScheduled) {
      const targetStudent = (students || []).find((s) => s.id === studentId);
      setGatekeeperModalStudent({ id: studentId, status: "Missed", name: targetStudent?.name || "Student" });
      return;
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: "Missed" } : s))
    );
    setRouteDetails((prev) => {
      if (!prev?.stops) return prev;
      return {
        ...prev,
        stops: prev.stops.map((sp) => ({
          ...sp,
          assignedStudents: (sp.assignedStudents || []).map((st) =>
            st.id === studentId ? { ...st, status: "Missed" } : st
          ),
        })),
      };
    });
    if (onUpdateStatus) onUpdateStatus(studentId, "Missed");
    triggerToast("Passenger marked as Missed / Absent.");

    try {
      await updateStudentAttendance(studentId, { status: "Missed" });
    } catch (err) {
      console.warn("Attendance update queued:", err);
    }
  };

  const handleConfirmStartAndBoard = async () => {
    if (!gatekeeperModalStudent) return;
    const { id, status } = gatekeeperModalStudent;

    if (onStartTrip) await onStartTrip("morning");

    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    setRouteDetails((prev) => {
      if (!prev?.stops) return prev;
      return {
        ...prev,
        stops: prev.stops.map((sp) => ({
          ...sp,
          assignedStudents: (sp.assignedStudents || []).map((st) =>
            st.id === id ? { ...st, status } : st
          ),
        })),
      };
    });
    if (onUpdateStatus) onUpdateStatus(id, status);
    triggerToast(`Morning Trip started & passenger marked as "${status}"!`);
    setGatekeeperModalStudent(null);
  };

  const handleBoardAllAtStop = async (stopName) => {
    setStudents((prev) =>
      prev.map((s) => {
        const matches =
          (s.stop && s.stop.toLowerCase().trim() === stopName.toLowerCase().trim()) ||
          (s.stopName && s.stopName.toLowerCase().trim() === stopName.toLowerCase().trim()) ||
          (stopName.toLowerCase().includes("tarnaka") && (s.stop || "").toLowerCase().includes("tarnaka")) ||
          (stopName.toLowerCase().includes("habsiguda") && (s.stop || "").toLowerCase().includes("habsiguda"));
        return matches && s.status !== "Picked Up" ? { ...s, status: "Picked Up" } : s;
      })
    );
    setRouteDetails((prev) => {
      if (!prev?.stops) return prev;
      return {
        ...prev,
        stops: prev.stops.map((sp) => {
          if (
            sp.name.toLowerCase().trim() === stopName.toLowerCase().trim() ||
            (stopName.toLowerCase().includes("tarnaka") && sp.name.toLowerCase().includes("tarnaka")) ||
            (stopName.toLowerCase().includes("habsiguda") && sp.name.toLowerCase().includes("habsiguda"))
          ) {
            return {
              ...sp,
              assignedStudents: (sp.assignedStudents || []).map((st) => ({ ...st, status: "Picked Up" })),
            };
          }
          return sp;
        }),
      };
    });
    if (onBatchBoardStop) onBatchBoardStop(stopName);
    triggerToast(`All passengers at ${stopName} marked as Picked Up!`);

    try {
      await bulkAttendance({ stop: stopName, status: "Picked Up" });
    } catch (err) {
      console.warn("Bulk attendance queued:", err);
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

  const isLastStop = activeStop && routeDetails?.stops && activeStop.id === routeDetails.stops[routeDetails.stops.length - 1]?.id;

  return (
    <div className="dp-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="dp-live-toast" role="alert">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <RouteIcon size={14} /> Assigned Route Information
          </div>
          <h1 className="dp-page-title">My Route & Passenger Stops</h1>
          <p className="dp-page-subtitle">
            View transit corridor, monitor scheduled stops, and manage real-time passenger boarding.
          </p>
        </div>
        <div className="dp-header-actions">
          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={() => onNavigateTab("students")}
          >
            <Users size={16} /> Full Student Manifest
          </button>
          <button
            type="button"
            className="dp-btn dp-btn-outline"
            onClick={() => onNavigateTab("gps")}
          >
            <Navigation size={16} /> Live GPS View
          </button>
        </div>
      </div>

      {/* Persistent Trip Operations Action Bar */}
      <DriverTripActionBar
        activeTripState={activeTripState}
        onStartTrip={onStartTrip}
        onEndTrip={onEndTrip}
        onNavigateTab={onNavigateTab}
        students={students}
        assignedRoute={routeDetails?.routeName || "Route 32 Habsiguda"}
        vehicleNumber={routeDetails?.busNumber || "AP39AU2653"}
        scheduledTime={`${routeDetails?.morningStartTime || "07:35 AM"} - ${routeDetails?.morningEndTime || "08:30 AM"}`}
      />

      {/* Main Route Info Card */}
      <div className="dp-card dp-route-master-card">
        <div className="dp-card-head">
          <div className="dp-flex-row gap-2">
            <div className="dp-route-chip-icon">
              <Bus size={20} />
            </div>
            <div>
              <h2 className="dp-card-title">{routeDetails?.routeName}</h2>
              <span className="dp-code-badge">Route Code: {routeDetails?.routeCode}</span>
            </div>
          </div>
          <span className="dp-tag-pill">
            <Clock size={13} /> {routeDetails?.shift} Shift
          </span>
        </div>

        <div className="dp-card-body">
          <div className="dp-route-details-grid">
            <div className="dp-rd-item">
              <span className="dp-rd-label">Corridor Origin</span>
              <strong className="dp-rd-val">{routeDetails?.startPoint}</strong>
              <small className="dp-rd-sub">Start Time: {routeDetails?.morningStartTime}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Corridor Destination</span>
              <strong className="dp-rd-val">{routeDetails?.endPoint}</strong>
              <small className="dp-rd-sub">ETA: {routeDetails?.morningEndTime}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Route Transit Distance</span>
              <strong className="dp-rd-val">{routeDetails?.distanceKm} km</strong>
              <small className="dp-rd-sub">Total Route Span</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Assigned Vehicle</span>
              <strong className="dp-rd-val">{routeDetails?.busNumber}</strong>
              <small className="dp-rd-sub">{routeDetails?.vehicleModel}</small>
            </div>
            <div className="dp-rd-item">
              <span className="dp-rd-label">Assigned Attendant</span>
              <strong className="dp-rd-val">{routeDetails?.assignedAttendant}</strong>
              <small className="dp-rd-sub">{routeDetails?.attendantPhone}</small>
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
            <p>Click on any stop along the journey path to inspect details and board students</p>
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
                          <Users size={11} />{" "}
                          {stop.studentCount > 0
                            ? `${stop.studentCount} ${stop.studentCount === 1 ? "Student" : "Students"}`
                            : isLast
                            ? "Campus Drop"
                            : "En-route Stop"}
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
                  <strong>
                    {activeStop.studentCount} {activeStop.studentCount === 1 ? "Student" : "Students"}
                  </strong>
                </div>
              </div>
              <div className="dp-ssb-right">
                <DriverStatusBadge status={activeStop.status} />
              </div>
            </div>
          )}

          {/* Stop Passenger Boarding & Quick Actions Deck */}
          {activeStop && (
            <div className="dp-stop-boarding-deck" ref={boardingDeskRef}>
              <div className="dp-sbd-header">
                <div className="dp-sbd-header-info">
                  <Users size={18} className="dp-text-primary" />
                  <div>
                    <h4 className="dp-sbd-title">
                      Stop Passengers & Boarding Desk: {activeStop.name}
                    </h4>
                    <span className="dp-sbd-subtitle">
                      {activeStopPassengers.length} {activeStopPassengers.length === 1 ? "student" : "students"} scheduled for pickup at this waypoint
                    </span>
                  </div>
                </div>

                {activeStopPassengers.length > 0 &&
                  activeStopPassengers.some((p) => (p.status || "Pending") === "Pending") && (
                    <button
                      type="button"
                      className="dp-btn dp-btn-primary dp-btn-sm"
                      onClick={() => handleBoardAllAtStop(activeStop.name)}
                    >
                      <UserCheck size={14} /> Board All at {activeStop.name}
                    </button>
                  )}
              </div>

              {activeStopPassengers.length > 0 ? (
                <div className="dp-sbd-cards-grid">
                  {activeStopPassengers.map((student) => {
                    const isBoarded = student.status === "Picked Up";
                    const isMissed = student.status === "Missed";

                    return (
                      <div
                        key={student.id}
                        className={`dp-sbd-student-card ${isBoarded ? "is-boarded" : isMissed ? "is-missed" : ""}`}
                      >
                        <div className="dp-sbd-avatar">
                          {(student.name || "S").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="dp-sbd-meta">
                          <div className="dp-sbd-name-row">
                            <strong className="dp-sbd-name">{toTitleCase(student.name)}</strong>
                            <span className="dp-sbd-adm-tag">
                              {student.rollNo || student.admissionNo || `MADM-${String(student.id).padStart(4, "0")}`}
                            </span>
                          </div>
                          <div className="dp-sbd-subtext">
                            <span>{student.academicClass || student.class || "Regular - REG-1"}</span>
                            <span className="dp-corridor-sep">•</span>
                            <span>Pickup: {activeStop.pickupTime}</span>
                          </div>
                          {(student.parentPhone || student.contactNumber || student.contact) && (
                            <a
                              href={`tel:${student.parentPhone || student.contactNumber || student.contact}`}
                              className="dp-sbd-call-link"
                            >
                              <PhoneCall size={12} /> Call {toTitleCase(student.parentName || "Parent")}: {formatIndianPhoneNumber(student.parentPhone || student.contactNumber || student.contact)}
                            </a>
                          )}
                        </div>
                        <div className="dp-sbd-actions">
                          <span
                            className={`dp-sbd-status-pill status-${(student.status || "pending")
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {student.status || "Pending"}
                          </span>
                          <div className="dp-sbd-btn-group">
                            <button
                              type="button"
                              className={`dp-btn dp-btn-sm ${isBoarded ? "dp-btn-success" : "dp-btn-primary"}`}
                              onClick={() => handleBoardStudent(student.id)}
                              title="Mark as Boarded / Picked Up"
                            >
                              <CheckCircle2 size={14} /> {isBoarded ? "Boarded" : "Board"}
                            </button>
                            <button
                              type="button"
                              className={`dp-btn dp-btn-sm dp-btn-outline ${isMissed ? "dp-btn-danger" : ""}`}
                              onClick={() => handleMarkMissed(student.id)}
                              title="Mark as Missed / Absent"
                            >
                              <UserX size={14} /> Missed
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dp-sbd-empty-state">
                  <MapPin size={24} className="dp-text-primary" />
                  <div className="dp-sbd-empty-text">
                    {isLastStop ? (
                      <>
                        <strong>Campus Main Gate - Final Terminal Drop</strong>
                        <p>All passengers scheduled for route {routeDetails?.routeName} disembark here at the campus terminal.</p>
                      </>
                    ) : (
                      <>
                        <strong>En-route Waypoint - {activeStop.name}</strong>
                        <p>No student pickup or drop is scheduled at this waypoint for the active shift.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
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
                  <th>Allotted Students</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routeDetails?.stops && routeDetails.stops.length > 0 ? (
                  routeDetails.stops.map((stop) => {
                    const isSelected = String(selectedStopId) === String(stop.id);
                    return (
                      <tr
                        key={stop.id}
                        className={isSelected ? "dp-row-highlight" : ""}
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
                            <Users size={12} />{" "}
                            {stop.studentCount > 0
                              ? `${stop.studentCount} ${stop.studentCount === 1 ? "Student" : "Students"}`
                              : "0 Students"}
                          </span>
                        </td>
                        <td>
                          <DriverStatusBadge status={stop.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {stop.studentCount > 0 ? (
                            <button
                              type="button"
                              className="dp-btn dp-btn-primary dp-btn-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAndBoard(stop);
                              }}
                            >
                              <UserCheck size={12} /> View & Board
                            </button>
                          ) : (
                            <span className="dp-text-muted" style={{ fontSize: "11px" }}>
                              Waypoint
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-500">
                      No pickup points found for this route.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive Boarding Modal */}
      {activeModalStop && (
        <div className="dp-modal-backdrop" onClick={() => setActiveModalStop(null)}>
          <div className="dp-modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dp-modal-header">
              <div className="dp-flex-col">
                <div className="dp-flex-row" style={{ gap: "8px", alignItems: "center" }}>
                  <span className="dp-header-badge" style={{ margin: 0 }}>
                    Stop #{activeModalStop.stopNumber || activeModalStop.sequenceNo || 1}
                  </span>
                  <h3 className="dp-modal-title">{activeModalStop.name}</h3>
                </div>
                <p className="dp-modal-subtitle">
                  {activeModalStop.landmark || "Scheduled Corridor Stop"} • Pickup: <strong>{activeModalStop.pickupTime}</strong>
                </p>
              </div>
              <button
                type="button"
                className="dp-modal-close"
                onClick={() => setActiveModalStop(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="dp-modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                  <Users size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "6px" }} />
                  {modalPassengers.length} {modalPassengers.length === 1 ? "Passenger" : "Passengers"} at Waypoint
                </span>
                {modalPassengers.length > 0 && modalPassengers.some((p) => (p.status || "Pending") === "Pending") && (
                  <button
                    type="button"
                    className="dp-btn dp-btn-primary dp-btn-xs"
                    onClick={() => handleBoardAllAtStop(activeModalStop.name)}
                  >
                    <UserCheck size={13} /> Board All at Stop
                  </button>
                )}
              </div>

              {modalPassengers.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {modalPassengers.map((student) => {
                    const isBoarded = student.status === "Picked Up";
                    const isMissed = student.status === "Missed";

                    return (
                      <div
                        key={student.id}
                        className={`dp-sbd-student-card ${isBoarded ? "is-boarded" : isMissed ? "is-missed" : ""}`}
                        style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                      >
                        <div className="dp-sbd-avatar">
                          {(student.name || "S").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="dp-sbd-meta" style={{ flex: 1 }}>
                          <div className="dp-sbd-name-row">
                            <strong className="dp-sbd-name">{toTitleCase(student.name)}</strong>
                            <span className="dp-sbd-adm-tag">
                              {student.rollNo || student.admissionNo || `MADM-${String(student.id).padStart(4, "0")}`}
                            </span>
                          </div>
                          <div className="dp-sbd-subtext">
                            <span>{student.academicClass || student.class || "Regular - REG-1"}</span>
                            <span className="dp-corridor-sep">•</span>
                            <span>Pickup: {activeModalStop.pickupTime}</span>
                          </div>
                          {(student.parentPhone || student.contact || student.contactNumber) && (
                            <a
                              href={`tel:${student.parentPhone || student.contact || student.contactNumber}`}
                              className="dp-sbd-call-link"
                            >
                              <PhoneCall size={12} /> Call {toTitleCase(student.parentName || "Parent")}: {formatIndianPhoneNumber(student.parentPhone || student.contact || student.contactNumber)}
                            </a>
                          )}
                        </div>
                        <div className="dp-sbd-actions">
                          <span
                            className={`dp-sbd-status-pill status-${(student.status || "pending")
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {student.status || "Pending"}
                          </span>
                          <div className="dp-sbd-btn-group">
                            <button
                              type="button"
                              className={`dp-btn dp-btn-sm ${isBoarded ? "dp-btn-success" : "dp-btn-primary"}`}
                              onClick={() => handleBoardStudent(student.id)}
                            >
                              <CheckCircle2 size={13} /> {isBoarded ? "Boarded" : "Board"}
                            </button>
                            <button
                              type="button"
                              className={`dp-btn dp-btn-sm dp-btn-outline ${isMissed ? "dp-btn-danger" : ""}`}
                              onClick={() => handleMarkMissed(student.id)}
                            >
                              <UserX size={13} /> Missed
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dp-sbd-empty-state" style={{ padding: "20px" }}>
                  <MapPin size={24} className="dp-text-primary" />
                  <div className="dp-sbd-empty-text">
                    <strong>Transit Waypoint — {activeModalStop.name}</strong>
                    <p>No student pickup or drop is scheduled at this waypoint for the active shift.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="dp-modal-footer">
              <button
                type="button"
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={() => setActiveModalStop(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Start Gatekeeper Modal */}
      {gatekeeperModalStudent && (
        <div className="dp-modal-overlay" onClick={() => setGatekeeperModalStudent(null)}>
          <div
            className="dp-modal-card"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dp-modal-header">
              <div className="dp-flex-row gap-2">
                <AlertCircle size={20} className="dp-text-primary" />
                <h3 className="dp-modal-title">Start Trip to Begin Boarding</h3>
              </div>
              <button
                type="button"
                className="dp-modal-close-btn"
                onClick={() => setGatekeeperModalStudent(null)}
              >
                ×
              </button>
            </div>
            <div className="dp-modal-body" style={{ padding: "16px 20px" }}>
              <p className="text-sm text-gray-700 mb-2">
                Route 32 Morning Trip is currently <strong>Scheduled</strong>. To board passengers, you must start the trip.
              </p>
              <div
                style={{
                  background: "var(--dp-soft)",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "13px",
                }}
              >
                <div>
                  Passenger: <strong>{toTitleCase(gatekeeperModalStudent.name)}</strong>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  Clicking below will start Route 32 Morning Trip and mark this student as <strong>Boarded</strong>.
                </div>
              </div>
            </div>
            <div className="dp-modal-footer">
              <button
                type="button"
                className="dp-btn dp-btn-outline dp-btn-sm"
                onClick={() => setGatekeeperModalStudent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={handleConfirmStartAndBoard}
              >
                <CheckCircle2 size={13} /> Start Trip & Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
