import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import apiClient from "../../api/apiClient.js";
import { getDashboard, getProfile, getRoute } from "../../api/transportDriverApi.js";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getAuthToken } from "../../features/authStorage.js";
import { env } from "../../config/env.js";
import { getDriverIdentity } from "./data/driverIdentity.js";
import { assignmentProfile, normalizeDriverRoute, unwrapDriverData } from "./data/driverData.js";

const DriverDataContext = createContext(null);
export const useDriverData = () => useContext(DriverDataContext);

export function DriverDataProvider({ children }) {
  const [dashboard, setDashboard] = useState({});
  const [profile, setProfile] = useState({});
  const [routeDetails, setRouteDetails] = useState(null);
  const [routeError, setRouteError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [liveMessage, setLiveMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const mounted = useRef(false);
  const pending = useRef(null);
  const refreshAgain = useRef(false);

  const refresh = useCallback(() => {
    if (pending.current) { refreshAgain.current = true; return pending.current; }
    pending.current = (async () => {
      const results = await Promise.allSettled([
        getDashboard().then(unwrapDriverData),
        getProfile().then(unwrapDriverData),
        apiClient.get("/api/v1/transport/driver/notifications").then(unwrapDriverData),
        getRoute().then(unwrapDriverData),
      ]);
      if (!mounted.current) return false;
      const [dashboardResult, profileResult, notificationResult, routeResult] = results;
      let dataError = "";
      if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
      else dataError = dashboardResult.reason?.message || "Unable to load driver assignment.";
      if (profileResult.status === "fulfilled") {
        const value = profileResult.value;
        setProfile(assignmentProfile(value, value.profile || value.driverProfile || {}));
      }
      if (routeResult.status === "fulfilled") {
        setRouteDetails(normalizeDriverRoute(routeResult.value));
        setRouteError("");
      } else setRouteError("Unable to load your assigned route. Please refresh.");
      if (notificationResult.status === "fulfilled") {
        const value = notificationResult.value;
        const items = Array.isArray(value) ? value : value.items;
        if (Array.isArray(items)) {
          setNotifications(items);
          setNotificationError("");
        } else setNotificationError("The notification API returned an unsupported response.");
      } else {
        setNotificationError(notificationResult.reason?.response?.status === 404
          ? "Driver notifications are not available on the server yet."
          : "Unable to load driver notifications. Try refreshing.");
      }
      setError(dataError);
      setLoading(false);
      return !dataError && notificationResult.status === "fulfilled";
    })().finally(() => {
      pending.current = null;
      if (mounted.current && refreshAgain.current) { refreshAgain.current = false; refresh(); }
    });
    return pending.current;
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const refreshVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener("focus", refreshVisible); };
  }, [refresh]);

  useEffect(() => {
    let stopped = false;
    let retryTimer;
    let messageTimer;
    const base = env.useDevProxy ? "" : env.apiBaseUrl.replace(/\/$/, "");
    const connection = new HubConnectionBuilder()
      .withUrl(`${base}/hubs/driverNotifications`, {
        accessTokenFactory: () => getAuthToken().replace(/^Bearer\s+/i, "").trim(),
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();
    const start = async () => {
      if (stopped) return;
      try {
        await connection.start();
        if (!stopped) { setConnectionStatus("Connected"); refresh(); }
      } catch {
        if (!stopped) {
          setConnectionStatus("Reconnecting; periodic refresh active");
          retryTimer = setTimeout(start, 10000);
        }
      }
    };
    connection.on("ReceiveNotification", (notification) => {
      if (stopped) return;
      setLiveMessage(notification?.message || "Your driver assignment was updated.");
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => setLiveMessage(""), 6000);
      refresh();
    });
    connection.onreconnecting(() => { if (!stopped) setConnectionStatus("Reconnecting; periodic refresh active"); });
    connection.onreconnected(() => { if (!stopped) { setConnectionStatus("Connected"); refresh(); } });
    connection.onclose(() => { if (!stopped) { setConnectionStatus("Reconnecting; periodic refresh active"); retryTimer = setTimeout(start, 10000); } });
    start();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(messageTimer);
      connection.off("ReceiveNotification");
      connection.stop().catch(() => {});
    };
  }, [refresh]);

  const markAllRead = async () => {
    try {
      unwrapDriverData(await apiClient.post("/api/v1/transport/driver/notifications/read-all"));
      setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
      setNotificationError("");
    } catch { setNotificationError("Unable to mark notifications as read. Please try again."); }
  };

  const driverProfile = getDriverIdentity(assignmentProfile(dashboard, { ...profile, ...dashboard.driverProfile }));
  return <DriverDataContext.Provider value={{ dashboard, driverProfile, routeDetails, routeError, connectionStatus, notifications, loading, error, notificationError, refresh, markAllRead }}>
    {liveMessage && <div className="dp-floating-toast" role="status" aria-live="polite">{liveMessage}</div>}
    {children}
  </DriverDataContext.Provider>;
}
