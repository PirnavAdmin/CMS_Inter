/**
 * Transport Manager General & Dashboard Operational API
 * Fetches operational summary, fleet metrics, alerts, and lookup lists
 */

import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.$values)) return data.$values;
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
    return extractList(payload);
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

