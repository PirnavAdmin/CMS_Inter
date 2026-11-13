import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../api/apiClient.js";
import { getDashboard, getProfile, getRoute } from "../../api/transportDriverApi.js";
import { HttpTransportType, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { getAuthToken } from "../auth/authStorage.js";
import { env } from "../../config/env.js";
import { getDriverIdentity } from "./data/driverIdentity.js";
import { assignmentProfile, normalizeDriverRoute, unwrapDriverData } from "./data/driverData.js";
import useDriverIdleLogout from "./useDriverIdleLogout.js";

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
  const [savedPreferences, setSavedPreferences] = useState(null);
  const applySavedPreferences = useCallback((preferences) => {
    if (preferences) setSavedPreferences({ ...preferences, autoLogoutMinutes: Number(preferences.autoLogoutMinutes) });
  }, []);
  useDriverIdleLogout(savedPreferences?.autoLogoutMinutes);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get("/api/v1/transport/driver/settings", { signal: controller.signal })
      .then(unwrapDriverData)
      .then((data) => { if (!controller.signal.aborted) applySavedPreferences(data.preferences); })
      .catch(() => { /* Settings page reports failures; never activate preview preferences. */ });
    return () => controller.abort();
  }, [applySavedPreferences]);
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
          setNotifications(items.map((item) => ({ ...item, isRead: item.isRead ?? (item.readTime != null) })));
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

  const broadcastDriverSync = useCallback((type, extra = {}) => {
    if (typeof BroadcastChannel === "undefined") return;
    const tokenTail = (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim().slice(-16);
    if (!tokenTail) return;
    try {
      const ch = new BroadcastChannel("cms_driver_notifications_sync");
      ch.postMessage({ type, tokenTail, ...extra });
      ch.close();
    } catch { /* ignore cross-tab broadcast errors */ }
  }, []);

  const refreshNotificationsOnly = useCallback(async () => {
    try {
      const value = unwrapDriverData(await apiClient.get("/api/v1/transport/driver/notifications"));
      if (!mounted.current) return false;
      const items = Array.isArray(value) ? value : value.items;
      if (Array.isArray(items)) {
        setNotifications(items.map((item) => ({ ...item, isRead: item.isRead ?? (item.readTime != null) })));
        setNotificationError("");
        return true;
      }
      setNotificationError("The notification API returned an unsupported response.");
      return false;
    } catch (err) {
      if (mounted.current) {
        setNotificationError(err?.response?.status === 404
          ? "Driver notifications are not available on the server yet."
          : "Unable to load driver notifications. Try refreshing.");
      }
      return false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    window.addEventListener("cms-notifications-resync", refreshNotificationsOnly);
    let channel = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel("cms_driver_notifications_sync");
        channel.onmessage = (event) => {
          const msg = event?.data;
          const tokenTail = (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim().slice(-16);
          if (!msg || !tokenTail || msg.tokenTail !== tokenTail) return;
          if (msg.type === "incoming" && msg.notification?.id != null) {
            const n = msg.notification;
            setNotifications((previous) => [{ ...n, isRead: n.isRead ?? false }, ...previous.filter((item) => item.id !== n.id)]);
          } else if (msg.type === "mark-read" && msg.id != null) {
            setNotifications((previous) => previous.map((item) => item.id === msg.id ? { ...item, isRead: true } : item));
          } else if (msg.type === "mark-all-read") {
            setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
          }
        };
      } catch { channel = null; }
    }
    return () => {
      mounted.current = false;
      window.removeEventListener("cms-notifications-resync", refreshNotificationsOnly);
      try { channel?.close(); } catch { /* ignore */ }
    };
  }, [refresh, refreshNotificationsOnly]);

  useEffect(() => {
    let stopped = false;
    let messageTimer;
    let blipRetryTimer = null;
    let pausedForServerDown = false;
    let wasDisconnected = false;
    let wasConnectedBeforeDrop = false;
    let blipRetryUsed = false;
    let isConnecting = false;
    let lastAttemptAt = 0;
    const base = env.useDevProxy ? "" : env.apiBaseUrl.replace(/\/$/, "");
    const getNormalizedToken = () => (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim();
    const clearBlipTimer = () => { if (blipRetryTimer) { clearTimeout(blipRetryTimer); blipRetryTimer = null; } };
    const connection = new HubConnectionBuilder()
      .withUrl(`${base}/hubs/driverNotifications`, {
        accessTokenFactory: getNormalizedToken,
        headers: { "ngrok-skip-browser-warning": "true" },
        ...(env.signalrSkipNegotiation ? { transport: HttpTransportType.WebSockets, skipNegotiation: true } : {}),
      })
      .configureLogging(LogLevel.None)
      .build();
    const start = async (force = false) => {
      if (stopped || isConnecting) return;
      if (!getNormalizedToken()) {
        setConnectionStatus("Disconnected");
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        wasDisconnected = true;
        pausedForServerDown = true;
        setConnectionStatus("Paused (offline)");
        return;
      }
      if (connection.state !== HubConnectionState.Disconnected) return;
      if (!force && pausedForServerDown) return;
      if (!force && Date.now() - lastAttemptAt < 5000) return;
      isConnecting = true;
      lastAttemptAt = Date.now();
      try {
        await connection.start();
        if (!stopped) {
          clearBlipTimer();
          pausedForServerDown = false;
          wasConnectedBeforeDrop = true;
          blipRetryUsed = false;
          setConnectionStatus("Connected");
          if (wasDisconnected) {
            wasDisconnected = false;
            refreshNotificationsOnly();
          }
        }
      } catch {
        if (!stopped) {
          wasDisconnected = true;
          wasConnectedBeforeDrop = false;
          pausedForServerDown = true;
          setConnectionStatus("Paused (server unreachable)");
        }
      } finally {
        isConnecting = false;
      }
    };
    connection.on("ReceiveNotification", (notification) => {
      if (stopped) return;
      if (notification?.id != null) {
        const normalized = { ...notification, isRead: notification.isRead ?? false };
        setNotifications((previous) => [normalized, ...previous.filter((item) => item.id !== normalized.id)]);
        broadcastDriverSync("incoming", { notification: normalized });
      } else {
        refreshNotificationsOnly();
      }
      setLiveMessage(notification?.message || notification?.title || "You have a new driver notification.");
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => setLiveMessage(""), 6000);
    });
    connection.onclose(() => {
      if (!stopped) {
        wasDisconnected = true;
        const canRetrySingleBlip =
          wasConnectedBeforeDrop &&
          !blipRetryUsed &&
          (typeof navigator === "undefined" || navigator.onLine !== false) &&
          (typeof document === "undefined" || document.visibilityState !== "hidden");
        if (canRetrySingleBlip) {
          blipRetryUsed = true;
          setConnectionStatus("Reconnecting");
          clearBlipTimer();
          blipRetryTimer = setTimeout(() => { blipRetryTimer = null; if (!stopped) start(true); }, 2500);
        } else {
          pausedForServerDown = true;
          setConnectionStatus("Paused (server unreachable)");
        }
      }
    });
    const handleBackendReachable = () => {
      if (!stopped && pausedForServerDown && connection.state === HubConnectionState.Disconnected) {
        clearBlipTimer();
        pausedForServerDown = false;
        blipRetryUsed = false;
        start(true);
      }
    };
    const handleOnline = () => {
      if (!stopped && connection.state === HubConnectionState.Disconnected) {
        clearBlipTimer();
        pausedForServerDown = false;
        blipRetryUsed = false;
        start();
      }
    };
    window.addEventListener("cms-backend-reachable", handleBackendReachable);
    window.addEventListener("online", handleOnline);
    start();
    return () => {
      stopped = true;
      clearTimeout(messageTimer);
      clearBlipTimer();
      window.removeEventListener("cms-backend-reachable", handleBackendReachable);
      window.removeEventListener("online", handleOnline);
      connection.off("ReceiveNotification");
      connection.stop().catch(() => {});
    };
  }, [refreshNotificationsOnly]);

  const markRead = async (id) => {
    try {
      unwrapDriverData(await apiClient.put(`/api/v1/transport/drivers/notifications/${encodeURIComponent(id)}/read`));
      if (!mounted.current) return false;
      setNotifications((previous) => previous.map((item) => item.id === id ? { ...item, isRead: true } : item));
      broadcastDriverSync("mark-read", { id });
      setNotificationError("");
      return true;
    } catch { if (mounted.current) setNotificationError("Unable to mark notifications as read. Please try again."); return false; }
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter((item) => !item.isRead && item.id != null).map((item) => markRead(item.id)));
    broadcastDriverSync("mark-all-read");
  };

  const driverProfile = useMemo(() => getDriverIdentity(assignmentProfile(dashboard, { ...profile, ...dashboard.driverProfile })), [dashboard, profile]);
  const contextValue = useMemo(() => ({
    dashboard, driverProfile, routeDetails, routeError, connectionStatus, notifications, loading, error, notificationError, refresh, markAllRead, markRead, applySavedPreferences
  }), [dashboard, driverProfile, routeDetails, routeError, connectionStatus, notifications, loading, error, notificationError, refresh, applySavedPreferences]);
  return <DriverDataContext.Provider value={contextValue}>
    {liveMessage && <div className="dp-floating-toast" role="status" aria-live="polite">{liveMessage}</div>}
    {children}
  </DriverDataContext.Provider>;
}
