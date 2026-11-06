/**
 * Transport Manager General & Dashboard Operational API
 * Fetches operational summary, fleet metrics, alerts, and lookup lists
 */

import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const extractList = (data) => {
  let payload = data;
  const listKeys = ["items", "Items", "records", "Records", "results", "Results", "vehicles", "Vehicles", "drivers", "Drivers", "routes", "Routes", "attendants", "Attendants", "$values"];
  for (let depth = 0; depth < 5 && payload; depth += 1) {
    if (Array.isArray(payload)) return payload;
    const list = listKeys.map((key) => payload?.[key]).find(Array.isArray);
    if (list) return list;
    const nested = payload.data ?? payload.Data ?? payload.result ?? payload.Result;
    if (!nested || nested === payload) break;
    payload = nested;
  }
  return [];
};

export const getTransportDashboardStats = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.transport.dashboard, { params });
    const payload = res.data?.data ?? res.data ?? {};
    return payload.summary || payload;
  } catch (error) {
    console.warn("Transport dashboard summary failed:", error);
    return null;
  }
};

export const getTransportLookups = async (params = {}) => {
  try {
    const [vehiclesRes, driversRes, routesRes] = await Promise.allSettled([
      apiClient.get(apiEndpoints.transport.lookups.vehicles, { params }),
      apiClient.get(apiEndpoints.transport.lookups.drivers, { params }),
      apiClient.get(apiEndpoints.transport.lookups.routes, { params }),
    ]);

    return {
      vehicles: vehiclesRes.status === "fulfilled" ? extractList(vehiclesRes.value?.data) : [],
      drivers: driversRes.status === "fulfilled" ? extractList(driversRes.value?.data) : [],
      routes: routesRes.status === "fulfilled" ? extractList(routesRes.value?.data) : [],
    };
  } catch (error) {
    console.warn("Transport lookups failed:", error);
    return { vehicles: [], drivers: [], routes: [] };
  }
};

export const getRoutes = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.transport.routes, { params: { PageNumber: 1, PageSize: 1000, ...params } });
    return extractList(res.data?.data ?? res.data);
  } catch (error) {
    console.warn("Transport routes fetch failed:", error);
    return [];
  }
};

export const getPickupPoints = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.transport.pickupPoints, { params: { PageNumber: 1, PageSize: 1000, ...params } });
    return extractList(res.data?.data ?? res.data);
  } catch (error) {
    console.warn("Transport pickup points fetch failed:", error);
    return [];
  }
};

export const getAttendants = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.transport.attendants, { params: { PageNumber: 1, PageSize: 1000, ...params } });
    return extractList(res.data?.data ?? res.data);
  } catch (error) {
    console.warn("Transport attendants fetch failed:", error);
    return [];
  }
};

export const getTrips = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.transport.trips, { params });
    const payload = res.data?.data?.trips || res.data?.data || res.data;
    const rawList = extractList(payload);
    return rawList.map((t) => ({
      ...t,
      id: t.tripId || t.id,
      tripId: t.tripId || t.id,
      assignmentId: t.assignmentId || t.vehicleAssignmentId,
      vehicleId: t.vehicleId,
      vehicleNumber: t.vehicleNumber || t.busNumber || "",
      routeName: t.routeName || t.route || "",
      driverId: t.driverId,
      driverName: t.driverName || t.driver || "",
      attendantId: t.attendantId,
      attendantName: t.attendantName || t.attendant || "",
      tripType: t.tripType || (t.morningTripTime && t.eveningTripTime ? "Both (M/E)" : t.morningTripTime ? "Morning" : t.eveningTripTime ? "Evening" : "Regular"),
      tripDate: t.tripDate ? String(t.tripDate).split("T")[0] : (t.date ? String(t.date).split("T")[0] : new Date().toISOString().split("T")[0]),
      morningTripTime: t.morningTripTime || t.morningTrip || t.startTime || "",
      eveningTripTime: t.eveningTripTime || t.eveningTrip || t.endTime || "",
      startTime: t.startTime || t.morningTripTime || t.morningTrip || "",
      endTime: t.endTime || t.eveningTripTime || t.eveningTrip || "",
      studentsCount: Number(t.studentsCount ?? t.studentsPresent ?? 0),
      studentsPresent: t.studentsCount ?? t.studentsPresent ?? t.assignedStudents ?? 0,
      capacity: Number(t.capacity || 0),
      status: t.status || t.tripStatus || "Scheduled",
      gpsStatus: t.gpsStatus || "Online",
    }));
  } catch (error) {
    console.warn("Transport trips fetch failed:", error);
    return [];
  }
};

export const getStudentAssignments = async (params = {}) => {
  try {
    const res = await apiClient.get(apiEndpoints.transport.studentAssignments, { params: { PageNumber: 1, PageSize: 1000, ...params } });
    return extractList(res.data?.data ?? res.data);
  } catch (error) {
    console.warn("Transport student assignments fetch failed:", error);
    return [];
  }
};

export const getTripLiveOperations = async (assignmentId) => {
  if (!assignmentId) return null;
  try {
    const res = await apiClient.get(apiEndpoints.transport.dashboardOperations(assignmentId));
    return res.data?.data ?? res.data ?? null;
  } catch (error) {
    console.warn("Live trip operations fetch failed:", error);
    return null;
  }
};

