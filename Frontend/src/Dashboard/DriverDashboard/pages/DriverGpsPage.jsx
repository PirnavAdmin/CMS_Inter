import React, { useState, useEffect } from "react";
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
import { getRoute, getGps } from "../../../api/transportDriverApi.js";

export default function DriverGpsPage() {
  const [routeDetails, setRouteDetails] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [lastPingTime, setLastPingTime] = useState("Waiting...");
  const [isTracking, setIsTracking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true);
        const res = await getRoute();
        const data = res.data || res;
        setRouteDetails(data.routeDetails || data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load route data");
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, []);

  useEffect(() => {
    if (!isTracking) return;
    const fetchGps = async () => {
      try {
        const res = await getGps();
        const data = res.data || res;
        if (data.speed !== undefined) setSpeed(data.speed);
        setLastPingTime("Just now");
      } catch (err) {
        console.error("Failed to fetch GPS", err);
      }
    };
    fetchGps();
    const interval = setInterval(fetchGps, 5000);
    return () => clearInterval(interval);
  }, [isTracking]);

  if (loading) return <div className="dp-page-container"><p>Loading GPS Data...</p></div>;
  if (error) return <div className="dp-page-container"><p className="dp-text-danger">{error}</p></div>;

  const stops = routeDetails?.stops || [];

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
          value="Online (Active)"
          subtitle="4G / LTE • 12 Satellites Locked"
          tone="success"
          badge="Live"
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
          value="Green Park"
          subtitle="ETA: 07:40 AM (in ~4 mins)"
          tone="purple"
        />
        <DriverStatCard
          icon={Clock}
          title="Route Journey Progress"
          value="65% Completed"
          subtitle="15.9 km of 24.5 km covered"
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
              <p>Vehicle PC-101 on City Route A (Main Gate → College Campus)</p>
            </div>
          </div>
          <div className="dp-map-indicators">
            <span className="dp-indicator-tag">
              <span className="dp-live-dot" /> Signal: 99.8% Strong
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

              {/* Stop 1: Main Gate (Completed) */}
              <g transform="translate(80, 180)">
                <circle r="16" fill="#2e8540" />
                <circle r="22" fill="none" stroke="#2e8540" strokeWidth="2" opacity="0.4" />
                <text x="0" y="5" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">1</text>
                <text x="0" y="-26" fill="#1d2519" fontSize="11" fontWeight="bold" textAnchor="middle">Main Gate</text>
                <text x="0" y="36" fill="#7b8375" fontSize="10" textAnchor="middle">07:10 AM • 5 Stu</text>
              </g>

              {/* Stop 2: Lake View (Completed) */}
              <g transform="translate(250, 125)">
                <circle r="16" fill="#2e8540" />
                <circle r="22" fill="none" stroke="#2e8540" strokeWidth="2" opacity="0.4" />
                <text x="0" y="5" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">2</text>
                <text x="0" y="-26" fill="#1d2519" fontSize="11" fontWeight="bold" textAnchor="middle">Lake View</text>
                <text x="0" y="36" fill="#7b8375" fontSize="10" textAnchor="middle">07:25 AM • 8 Stu</text>
              </g>

              {/* Stop 3: Green Park (Next Stop - Highlighted) */}
              <g transform="translate(430, 205)">
                <circle r="18" fill="#cf7900" filter="url(#glow)" />
                <circle r="26" fill="none" stroke="#cf7900" strokeWidth="3" opacity="0.5">
                  <animate attributeName="r" values="20;32;20" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="0" y="5" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">3</text>
                <text x="0" y="-30" fill="#cf7900" fontSize="12" fontWeight="bold" textAnchor="middle">★ Green Park (Next)</text>
                <text x="0" y="38" fill="#7b8375" fontSize="10" textAnchor="middle">07:40 AM • 6 Stu</text>
              </g>

              {/* Live Bus Marker moving towards Green Park */}
              <g transform="translate(380, 185)">
                <circle r="20" fill="#6f8700" filter="url(#glow)">
                  <animate attributeName="r" values="18;23;18" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <rect x="-12" y="-9" width="24" height="18" rx="4" fill="#ffffff" />
                <rect x="-9" y="-6" width="7" height="12" rx="1" fill="#6f8700" />
                <rect x="2" y="-6" width="7" height="12" rx="1" fill="#6f8700" />
                <text x="0" y="-26" fill="#6f8700" fontSize="11" fontWeight="bold" textAnchor="middle">BUS PC-101 (32 km/h)</text>
              </g>

              {/* Stop 4: Civil Lines (Upcoming) */}
              <g transform="translate(570, 160)">
                <circle r="15" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                <text x="0" y="4" fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle">4</text>
                <text x="0" y="-24" fill="#64748b" fontSize="11" fontWeight="600" textAnchor="middle">Civil Lines</text>
                <text x="0" y="34" fill="#94a3b8" fontSize="10" textAnchor="middle">07:55 AM • 4 Stu</text>
              </g>

              {/* Stop 5: Market Road (Upcoming) */}
              <g transform="translate(710, 200)">
                <circle r="15" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                <text x="0" y="4" fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle">5</text>
                <text x="0" y="-24" fill="#64748b" fontSize="11" fontWeight="600" textAnchor="middle">Market Road</text>
                <text x="0" y="34" fill="#94a3b8" fontSize="10" textAnchor="middle">08:10 AM • 5 Stu</text>
              </g>

              {/* Stop 6: College Campus (Destination) */}
              <g transform="translate(820, 180)">
                <circle r="18" fill="#1e293b" stroke="#6f8700" strokeWidth="3" />
                <text x="0" y="5" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">6</text>
                <text x="0" y="-28" fill="#1e293b" fontSize="11" fontWeight="bold" textAnchor="middle">College Campus</text>
                <text x="0" y="36" fill="#6f8700" fontSize="10" fontWeight="bold" textAnchor="middle">08:30 AM (End)</text>
              </g>
            </svg>
          </div>
        </div>

        <div className="dp-card-footer dp-map-footer">
          <div className="dp-telemetry-item">
            <small>Latitude / Longitude</small>
            <code>12.9682° N, 80.2289° E</code>
          </div>
          <div className="dp-telemetry-item">
            <small>Satellite Precision</small>
            <span>HDOP: 0.8 (High Accuracy)</span>
          </div>
          <div className="dp-telemetry-item">
            <small>Depot Connection</small>
            <span className="dp-text-success font-semibold">Live Socket Connected</span>
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
                  <th>Distance from Current Pos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((stop) => (
                  <tr key={stop.id} className={stop.id === 3 ? "dp-row-highlight" : ""}>
                    <td>
                      <span className="dp-stop-seq">{stop.stopNumber}</span>
                    </td>
                    <td>
                      <div className="dp-flex-row gap-1">
                        <MapPin size={15} className="dp-text-primary" />
                        <strong>{stop.name}</strong>
                      </div>
                    </td>
                    <td>{stop.pickupTime}</td>
                    <td>
                      <strong className={stop.id === 3 ? "dp-text-warning" : ""}>
                        {stop.status === "Completed" ? "Departed" : stop.pickupTime}
                      </strong>
                    </td>
                    <td>
                      {stop.status === "Completed"
                        ? "Passed"
                        : stop.id === 3
                        ? "1.2 km away"
                        : `${(stop.id - 2) * 4.2} km away`}
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

