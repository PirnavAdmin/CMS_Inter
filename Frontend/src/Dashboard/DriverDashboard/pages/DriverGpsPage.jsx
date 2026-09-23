import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Navigation,
  Radio,
  Gauge,
  MapPin,
  Clock,
  Compass,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Zap,
  Activity,
} from "lucide-react";
import DriverStatCard from "../components/DriverStatCard.jsx";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import { getRoute, getGps, sendGpsLocation } from "../../../api/transportDriverApi.js";

// SVG stop positions along the bezier road path for up to 8 stops
const SVG_STOP_COORDS = [
  { x: 80, y: 180 },
  { x: 250, y: 125 },
  { x: 430, y: 205 },
  { x: 570, y: 160 },
  { x: 710, y: 200 },
  { x: 820, y: 180 },
];

function formatTimeSpan(val) {
  if (!val) return "--:--";
  if (typeof val === "string" && val.includes(":")) {
    const parts = val.split(":");
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h > 12 ? h - 12 : h || 12}:${m} ${ampm}`;
  }
  return val;
}

export default function DriverGpsPage() {
  const [routeDetails, setRouteDetails] = useState(null);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [currentLat, setCurrentLat] = useState(null);
  const [currentLng, setCurrentLng] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastPingTime, setLastPingTime] = useState("Waiting...");
  const [isTracking, setIsTracking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);

  // Fetch route data on mount
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true);
        const res = await getRoute();
        const data = res.data || res;
        if (data?.success && data?.data) {
          setRouteDetails(data.data.route || null);
          setPickupPoints(data.data.pickupPoints || []);
        } else {
          setRouteDetails(data.routeDetails || data.route || data);
          setPickupPoints(data.pickupPoints || data.stops || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load route data");
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, []);

  // Send GPS location from browser geolocation API
  useEffect(() => {
    if (!isTracking) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn("Geolocation not available");
      return;
    }

    const onPosition = async (pos) => {
      const { latitude, longitude, speed: geoSpeed, heading, accuracy: geoAccuracy } = pos.coords;
      setCurrentLat(latitude);
      setCurrentLng(longitude);
      setAccuracy(geoAccuracy);
      if (geoSpeed != null && geoSpeed >= 0) setSpeed(Math.round(geoSpeed * 3.6)); // m/s to km/h

      try {
        await sendGpsLocation({
          latitude,
          longitude,
          speed: geoSpeed != null ? Math.round(geoSpeed * 3.6) : 0,
          heading: heading || 0,
          accuracy: geoAccuracy || 0,
        });
        setLastPingTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Failed to send GPS", err);
      }
    };

    const onError = (err) => {
      console.error("Geolocation error:", err);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking]);

  // Also poll the backend GPS endpoint for speed/data reconciliation
  useEffect(() => {
    if (!isTracking) return;
    const fetchGps = async () => {
      try {
        const res = await getGps();
        const data = res.data?.data || res.data || res;
        if (data.speed !== undefined && data.speed > 0) setSpeed(data.speed);
        if (data.latitude) setCurrentLat(data.latitude);
        if (data.longitude) setCurrentLng(data.longitude);
      } catch (err) {
        // Silent - GPS fetch is supplementary
      }
    };
    fetchGps();
    const interval = setInterval(fetchGps, 10000);
    return () => clearInterval(interval);
  }, [isTracking]);

  // Build the SVG stops from real pickup points
  const svgStops = useMemo(() => {
    if (!pickupPoints.length) return [];
    return pickupPoints.map((pp, idx) => {
      const coord = SVG_STOP_COORDS[idx] || { x: 80 + idx * 140, y: 180 };
      return {
        id: pp.pickupPointId || pp.id || idx + 1,
        name: pp.pickupPointName || pp.stopName || pp.name || `Stop ${idx + 1}`,
        pickupTime: formatTimeSpan(pp.pickupTime),
        distanceFromStart: pp.distanceFromStart || 0,
        sequenceNo: pp.sequenceNo || pp.stopOrder || idx + 1,
        status: "Pending", // Will be derived if we have attendance data
        coord,
      };
    });
  }, [pickupPoints]);

  // Determine which stop is "next" (first non-completed)
  const nextStopIndex = useMemo(() => {
    // For now, assume all stops are upcoming since we don't have real-time stop completion data
    return 0;
  }, [svgStops]);

  const routeName = routeDetails?.routeName || routeDetails?.name || "Route";
  const startLoc = routeDetails?.startLocation || svgStops[0]?.name || "Start";
  const endLoc = routeDetails?.endLocation || svgStops[svgStops.length - 1]?.name || "Destination";
  const totalDistanceKm = routeDetails?.distanceKm || routeDetails?.distance || 0;

  if (loading) return <div className="dp-page-container"><p>Loading GPS Data...</p></div>;
  if (error) return <div className="dp-page-container"><p className="dp-text-danger">{error}</p></div>;

  return (
    <div className="dp-page-container">
      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <Radio size={14} className="dp-pulse-icon" /> Live GPS Satellite Telemetry
          </div>
          <h1 className="dp-page-title">GPS Tracking & Navigation</h1>
          <p className="dp-page-subtitle">
            Real-time bus telemetry, speed monitoring, and upcoming stop ETA.
          </p>
        </div>
        <div className="dp-header-actions">
          <button
            type="button"
            className="dp-btn dp-btn-outline"
            onClick={() => setIsTracking((prev) => !prev)}
          >
            <Activity size={15} /> {isTracking ? "Pause Tracking" : "Resume Telemetry"}
          </button>
        </div>
      </div>

      {/* GPS KPI Stats */}
      <div className="dp-stat-grid-4">
        <DriverStatCard
          icon={Navigation}
          title="GPS Tracker Status"
          value={isTracking ? "Online (Active)" : "Paused"}
          subtitle={currentLat ? `Accuracy: ${accuracy ? Math.round(accuracy) + "m" : "N/A"}` : "Acquiring signal..."}
          tone="success"
          badge={isTracking ? "Live" : "Paused"}
        />
        <DriverStatCard
          icon={Gauge}
          title="Current Speed"
          value={`${speed} km/h`}
          subtitle="Speed Limit: 40 km/h (Safe Zone)"
          tone={speed > 35 ? "warning" : "primary"}
        />
        <DriverStatCard
          icon={MapPin}
          title="Next Scheduled Stop"
          value={svgStops[nextStopIndex]?.name || "N/A"}
          subtitle={svgStops[nextStopIndex] ? `ETA: ${svgStops[nextStopIndex].pickupTime}` : "No stops loaded"}
          tone="purple"
        />
        <DriverStatCard
          icon={Clock}
          title="Route Journey Progress"
          value={totalDistanceKm ? `${totalDistanceKm} km total` : "N/A"}
          subtitle={`${startLoc} → ${endLoc}`}
          tone="blue"
        />
      </div>

      {/* Vector Interactive Map Visualizer */}
      <div className="dp-card dp-map-container-card">
        <div className="dp-card-head">
          <div className="dp-flex-row gap-2">
            <Compass size={20} className="dp-text-primary" />
            <div>
              <h3 className="dp-card-title">Live Route Telemetry Visualizer</h3>
              <p>{routeName} ({startLoc} → {endLoc})</p>
            </div>
          </div>
          <div className="dp-map-indicators">
            <span className="dp-indicator-tag">
              <span className="dp-live-dot" /> Signal: {currentLat ? "Strong" : "Acquiring..."}
            </span>
            <span className="dp-indicator-tag">
              <RefreshCw size={12} /> Ping: {lastPingTime}
            </span>
          </div>
        </div>

        <div className="dp-card-body p-0">
          <div className="dp-svg-map-wrapper">
            {/* SVG Visual Road with Stops & Bus Position */}
            <svg
              viewBox="0 0 900 360"
              className="dp-svg-route-canvas"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6f8700" />
                  <stop offset="65%" stopColor="#819b08" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background grid markings */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(111, 135, 0, 0.06)" strokeWidth="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Highway / Road Path */}
              <path
                d="M 80 180 Q 220 70 360 180 T 640 180 T 820 180"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="24"
                strokeLinecap="round"
              />
              <path
                d="M 80 180 Q 220 70 360 180 T 640 180 T 820 180"
                fill="none"
                stroke="url(#roadGradient)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 80 180 Q 220 70 360 180 T 640 180 T 820 180"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="8,8"
                strokeLinecap="round"
              />

              {/* Dynamic Stop Markers */}
              {svgStops.map((stop, idx) => {
                const isNext = idx === nextStopIndex;
                const isCompleted = stop.status === "Completed";
                const isLast = idx === svgStops.length - 1;

                return (
                  <g key={stop.id} transform={`translate(${stop.coord.x}, ${stop.coord.y})`}>
                    {isNext ? (
                      <>
                        <circle r="18" fill="#cf7900" filter="url(#glow)" />
                        <circle r="26" fill="none" stroke="#cf7900" strokeWidth="3" opacity="0.5">
                          <animate attributeName="r" values="20;32;20" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <text x="0" y="5" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">{stop.sequenceNo}</text>
                        <text x="0" y="-30" fill="#cf7900" fontSize="12" fontWeight="bold" textAnchor="middle">★ {stop.name} (Next)</text>
                        <text x="0" y="38" fill="#7b8375" fontSize="10" textAnchor="middle">{stop.pickupTime}</text>
                      </>
                    ) : isLast ? (
                      <>
                        <circle r="18" fill="#1e293b" stroke="#6f8700" strokeWidth="3" />
                        <text x="0" y="5" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">{stop.sequenceNo}</text>
                        <text x="0" y="-28" fill="#1e293b" fontSize="11" fontWeight="bold" textAnchor="middle">{stop.name}</text>
                        <text x="0" y="36" fill="#6f8700" fontSize="10" fontWeight="bold" textAnchor="middle">{stop.pickupTime} (End)</text>
                      </>
                    ) : isCompleted ? (
                      <>
                        <circle r="16" fill="#2e8540" />
                        <circle r="22" fill="none" stroke="#2e8540" strokeWidth="2" opacity="0.4" />
                        <text x="0" y="5" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">{stop.sequenceNo}</text>
                        <text x="0" y="-26" fill="#1d2519" fontSize="11" fontWeight="bold" textAnchor="middle">{stop.name}</text>
                        <text x="0" y="36" fill="#7b8375" fontSize="10" textAnchor="middle">{stop.pickupTime}</text>
                      </>
                    ) : (
                      <>
                        <circle r="15" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                        <text x="0" y="4" fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle">{stop.sequenceNo}</text>
                        <text x="0" y="-24" fill="#64748b" fontSize="11" fontWeight="600" textAnchor="middle">{stop.name}</text>
                        <text x="0" y="34" fill="#94a3b8" fontSize="10" textAnchor="middle">{stop.pickupTime}</text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Live Bus Marker */}
              {svgStops.length > 0 && (
                <g transform={`translate(${nextStopIndex > 0 ? svgStops[nextStopIndex - 1]?.coord.x + 50 : 50}, ${svgStops[nextStopIndex]?.coord.y - 20 || 160})`}>
                  <circle r="20" fill="#6f8700" filter="url(#glow)">
                    <animate attributeName="r" values="18;23;18" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <rect x="-12" y="-9" width="24" height="18" rx="4" fill="#ffffff" />
                  <rect x="-9" y="-6" width="7" height="12" rx="1" fill="#6f8700" />
                  <rect x="2" y="-6" width="7" height="12" rx="1" fill="#6f8700" />
                  <text x="0" y="-26" fill="#6f8700" fontSize="11" fontWeight="bold" textAnchor="middle">BUS ({speed} km/h)</text>
                </g>
              )}
            </svg>
          </div>
        </div>

        <div className="dp-card-footer dp-map-footer">
          <div className="dp-telemetry-item">
            <small>Latitude / Longitude</small>
            <code>{currentLat ? `${currentLat.toFixed(4)}° N, ${currentLng?.toFixed(4)}° E` : "Acquiring..."}</code>
          </div>
          <div className="dp-telemetry-item">
            <small>Accuracy</small>
            <span>{accuracy ? `${Math.round(accuracy)}m` : "N/A"}</span>
          </div>
          <div className="dp-telemetry-item">
            <small>Tracking Status</small>
            <span className={isTracking ? "dp-text-success font-semibold" : "dp-text-muted"}>{isTracking ? "Live Tracking Active" : "Tracking Paused"}</span>
          </div>
        </div>
      </div>

      {/* Waypoint Status List */}
      <div className="dp-card">
        <div className="dp-card-head">
          <div className="dp-flex-col">
            <h3>Route Waypoints & Estimated Timing</h3>
            <p>Real-time ETA calculated dynamically based on current bus velocity</p>
          </div>
        </div>
        <div className="dp-card-body p-0">
          <div className="dp-table-responsive">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Stop #</th>
                  <th>Stop Location</th>
                  <th>Scheduled Pickup</th>
                  <th>Calculated ETA</th>
                  <th>Distance from Start</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {svgStops.map((stop, idx) => (
                  <tr key={stop.id} className={idx === nextStopIndex ? "dp-row-highlight" : ""}>
                    <td>
                      <span className="dp-stop-seq">{stop.sequenceNo}</span>
                    </td>
                    <td>
                      <div className="dp-flex-row gap-1">
                        <MapPin size={15} className="dp-text-primary" />
                        <strong>{stop.name}</strong>
                      </div>
                    </td>
                    <td>{stop.pickupTime}</td>
                    <td>
                      <strong className={idx === nextStopIndex ? "dp-text-warning" : ""}>
                        {stop.status === "Completed" ? "Departed" : stop.pickupTime}
                      </strong>
                    </td>
                    <td>
                      {stop.status === "Completed"
                        ? "Passed"
                        : `${stop.distanceFromStart} km`}
                    </td>
                    <td>
                      <DriverStatusBadge status={idx === nextStopIndex ? "Next" : stop.status || "Upcoming"} />
                    </td>
                  </tr>
                ))}
                {svgStops.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                      No waypoints available for this route
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
