import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import apiClient from "../../api/apiClient.js";
import { getDashboard, getProfile, getRoute } from "../../api/transportDriverApi.js";
import { getDriverIdentity } from "./data/driverIdentity.js";
import { assignmentProfile, normalizeDriverRoute, unwrapDriverData } from "./data/driverData.js";
import { notificationsList } from "./data/driverMockData.js";
import useDriverIdleLogout from "./useDriverIdleLogout.js";

const DriverDataContext = createContext(null);
export const useDriverData = () => useContext(DriverDataContext);

export function DriverDataProvider({ children }) {
  const [dashboard, setDashboard] = useState({});
  const [profile, setProfile] = useState({});
  const [routeDetails, setRouteDetails] = useState(null);
  const [routeError, setRouteError] = useState("");
  const connectionStatus = "Mock notifications";

  const [notifications, setNotifications] = useState(() => notificationsList.map((item) => ({ ...item, message: item.content, isRead: !item.unread })));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const notificationError = "";
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
        getRoute().then(unwrapDriverData),
      ]);
      if (!mounted.current) return false;
      const [dashboardResult, profileResult, routeResult] = results;
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
      setError(dataError);
      setLoading(false);
      return !dataError;
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

  const markRead = async (id) => {
    setNotifications((previous) => previous.map((item) => item.id === id ? { ...item, isRead: true, unread: false } : item));
    return true;
  };

  const markAllRead = async () => {
    await Promise.all(notifications.filter((item) => !item.isRead && item.id != null).map((item) => markRead(item.id)));
  };

  const driverProfile = getDriverIdentity(assignmentProfile(dashboard, { ...profile, ...dashboard.driverProfile }));
  return <DriverDataContext.Provider value={{ dashboard, driverProfile, routeDetails, routeError, connectionStatus, notifications, loading, error, notificationError, refresh, markAllRead, markRead, applySavedPreferences }}>
    {children}
  </DriverDataContext.Provider>;
}
