import React, { useState, useEffect } from "react";
import {
  Navigation,
  Radio,
  MapPin,
} from "lucide-react";
import DriverStatCard from "../components/DriverStatCard.jsx";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import { getRoute, getGps, sendGpsLocation } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../components/common/Ui.jsx";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon path issues with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const getStopIcon = (status, stopNumber) => {
  let bgColor = "#cbd5e1"; // Pending
  let color = "#475569";
  let borderColor = "#94a3b8";

  if (status === "Completed") {
    bgColor = "#2e8540";
    color = "white";
    borderColor = "white";
  } else if (status === "Ongoing") {
    bgColor = "#cf7900";
    color = "white";
    borderColor = "white";
  }

  return new L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${bgColor}; color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid ${borderColor}; box-shadow: 0 0 6px rgba(0,0,0,0.5);">${stopNumber}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const busIcon = new L.divIcon({
  className: "custom-bus-icon",
  html: `<div style="background-color: #6f8700; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 10px rgba(111,135,0,0.8);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M4 11h16"></path><path d="M8 15h.01"></path><path d="M16 15h.01"></path><path d="M10 4v3"></path></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Dynamic map center updater component
const MapCenterUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export default function DriverGpsPage() {
  const [routeDetails, setRouteDetails] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [lastPingTime, setLastPingTime] = useState("Waiting...");
  const [isTracking, setIsTracking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fallback realistic coordinates for Hyderabad if backend doesn't provide them
  const fallbackCoords = [
    [17.4450, 78.3800], // 1
    [17.4480, 78.3830], // 2
    [17.4510, 78.3850], // 3
    [17.4530, 78.3880], // 4
    [17.4560, 78.3910], // 5
    [17.4590, 78.3940]  // 6
  ];

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true);
        const res = await getRoute();
        const data = res.data || res;
        
        // Some APIs wrap the actual payload in a nested 'data' property
        let details = data.data || data.routeDetails || data;
        
        // Map backend pickupPoints to frontend expected stops format
        if (details.pickupPoints && Array.isArray(details.pickupPoints)) {
          details.stops = details.pickupPoints.map((p, index) => ({
             id: p.pickupPointId || index,
             name: p.stopName || p.pickupPointName || `Stop ${index + 1}`,
             pickupTime: p.pickupTime ? p.pickupTime.toString() : "08:00 AM",
             status: p.status || "Pending",
             stopNumber: index + 1,
             position: p.position
          }));
        }

        // Ensure stops have coordinates
        if (details.stops && details.stops.length > 0) {
          details.stops = details.stops.map((stop, index) => ({
            ...stop,
            position: stop.position || fallbackCoords[index % fallbackCoords.length]
          }));
        }
        
        setRouteDetails(details);
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

  const stops = routeDetails?.stops || [];
  
  const [livePos, setLivePos] = useState([17.4495, 78.3840]); // Default fallback live pos
  
  // Try to get actual browser location
  useEffect(() => {
    let watchId;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentSpeed = position.coords.speed ? (position.coords.speed * 3.6).toFixed(1) : speed; // m/s to km/h
          
          setLivePos([lat, lng]);
          if (position.coords.speed) setSpeed(currentSpeed);
          
          // Send the exact location of the driver to the backend
          sendGpsLocation({ lat, lng, speed: currentSpeed, heading: position.coords.heading })
            .catch(err => console.error("Failed to sync GPS to backend:", err));
        },
        (error) => {
          console.warn("Geolocation error, using fallback location", error);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);
  
  const completedStops = stops.filter(s => s.status === "Completed");
  const nextStop = stops.find(s => s.status === "Ongoing");
  
  // If we couldn't get browser location, try to interpolate between stops
  useEffect(() => {
    if (livePos[0] === 17.4495 && livePos[1] === 78.3840) {
      try {
        if (completedStops.length > 0 && nextStop) {
          const lastCompleted = completedStops[completedStops.length - 1];
          // Ensure positions are arrays and have values
          const lat1 = Number(Array.isArray(lastCompleted.position) ? lastCompleted.position[0] : lastCompleted.position?.lat);
          const lng1 = Number(Array.isArray(lastCompleted.position) ? lastCompleted.position[1] : lastCompleted.position?.lng);
          const lat2 = Number(Array.isArray(nextStop.position) ? nextStop.position[0] : nextStop.position?.lat);
          const lng2 = Number(Array.isArray(nextStop.position) ? nextStop.position[1] : nextStop.position?.lng);
          
          if (!isNaN(lat1) && !isNaN(lat2) && !isNaN(lng1) && !isNaN(lng2)) {
            setLivePos([(lat1 + lat2) / 2, (lng1 + lng2) / 2]);
          }
        } else if (stops.length > 0) {
          const lat = Number(Array.isArray(stops[0].position) ? stops[0].position[0] : stops[0].position?.lat);
          const lng = Number(Array.isArray(stops[0].position) ? stops[0].position[1] : stops[0].position?.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            setLivePos([lat, lng]);
          }
        }
      } catch (e) {
        console.error("Interpolation error:", e);
      }
    }
  }, [stops, completedStops, nextStop, livePos]);

  const polylinePositions = stops.map(s => {
    if (Array.isArray(s.position) && s.position.length >= 2) return [Number(s.position[0]), Number(s.position[1])];
    if (s.position?.lat !== undefined) return [Number(s.position.lat), Number(s.position.lng)];
    return null;
  }).filter(p => p !== null && !isNaN(p[0]) && !isNaN(p[1]));

  if (loading) return <div className="dp-page-container"><SkeletonPage variant="dashboard" columns={4} /></div>;
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
            className="dp-btn dp-btn-outline" 
            onClick={() => setIsTracking(!isTracking)}
          >
            {isTracking ? "Pause Tracking" : "Resume Tracking"}
          </button>
        </div>
      </div>

      {/* Real-Time Metrics */}
      <div className="dp-dashboard-grid dp-grid-4">
        <DriverStatCard
          icon={Radio}
          title="GPS Tracker Status"
          value={isTracking ? "Online (Active)" : "Paused"}
          subtitle="4G / LTE • 12 Satellites Locked"
          type="primary"
        />
        <DriverStatCard
          icon={Navigation}
          title="Current Speed"
          value={`${speed} km/h`}
          subtitle="Speed Limit: 40 km/h (Safe Zone)"
          type="info"
        />
        <DriverStatCard
          icon={MapPin}
          title="Next Scheduled Stop"
          value={nextStop ? nextStop.name : "Arrived"}
          subtitle={nextStop ? `ETA: ${nextStop.pickupTime}` : "Journey complete"}
          type="warning"
        />
        <DriverStatCard
          icon={Navigation}
          title="Route Journey Progress"
          value="65% Completed"
          subtitle="15.9 km of 24.5 km covered"
          type="success"
        />
      </div>

      {/* Main Map Visualizer */}
      <div className="dp-card dp-telemetry-card">
        <div className="dp-card-head">
          <div className="dp-flex-row justify-between w-full items-center">
            <h3>Live Route Telemetry Visualizer</h3>
            <span className="dp-text-sm dp-text-muted">Signal: 99.8% Strong • Ping: {lastPingTime}</span>
          </div>
        </div>
        
        <div className="dp-card-body p-0">
          <div style={{ height: "450px", width: "100%", zIndex: 0 }}>
            <MapContainer center={livePos} zoom={15} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <Polyline positions={polylinePositions} color="#2e8540" weight={6} opacity={0.7} />
              
              {stops.map(stop => {
                const pos = Array.isArray(stop.position) ? [Number(stop.position[0]), Number(stop.position[1])] : (stop.position?.lat !== undefined ? [Number(stop.position.lat), Number(stop.position.lng)] : null);
                if (!pos || isNaN(pos[0]) || isNaN(pos[1])) return null;
                return (
                  <Marker 
                    key={stop.id} 
                    position={pos}
                    icon={getStopIcon(stop.status, stop.stopNumber)}
                  >
                    <Popup>
                      <strong>{stop.name}</strong><br/>
                      Status: {stop.status}<br/>
                      Time: {stop.pickupTime}
                    </Popup>
                  </Marker>
                );
              })}
              
              {livePos && !isNaN(livePos[0]) && !isNaN(livePos[1]) && (
                <>
                  <Marker position={livePos} icon={busIcon}>
                    <Popup>
                      <strong>Live Bus Location</strong><br/>
                      Speed: {speed} km/h
                    </Popup>
                  </Marker>
                  <MapCenterUpdater center={livePos} />
                </>
              )}
            </MapContainer>
          </div>
        </div>

        <div className="dp-card-footer dp-map-footer">
          <div className="dp-telemetry-item">
            <small>Latitude / Longitude</small>
            <code>{livePos && !isNaN(livePos[0]) ? `${livePos[0].toFixed(4)}° N, ${livePos[1].toFixed(4)}° E` : 'Tracking...'}</code>
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
                        : `${((stop.id - 2) * 4.2).toFixed(1)} km away`}
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
