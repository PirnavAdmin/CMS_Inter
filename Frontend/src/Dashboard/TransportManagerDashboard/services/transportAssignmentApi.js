/**
 * Transport Assignment API
 * Manages Driver-Vehicle assignments and reassignments
 */

import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { normalizeAssignment } from "../data/transportManagerModel.js";

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

export const getVehicleAssignments = async (params = {}) => {
  const res = await apiClient.get(apiEndpoints.transport.vehicleAssignments, {
    params: { PageNumber: 1, PageSize: 1000, ...params },
  });
  const rawList = extractList(res.data);
  return rawList.map(normalizeAssignment).filter(Boolean);
};

export const getVehicleAssignmentById = async (id) => {
  if (!id) throw new Error("Assignment ID is required.");
  const res = await apiClient.get(apiEndpoints.transport.vehicleAssignmentById(id));
  const payload = res.data?.data ?? res.data ?? {};
  return normalizeAssignment(payload.assignment ?? payload);
};

export const createVehicleAssignment = async (payload) => {
  const body = {
    routeId: Number(payload.routeId),
    vehicleId: Number(payload.vehicleId),
    driverId: Number(payload.driverId),
    attendantId: payload.attendantId ? Number(payload.attendantId) : null,
    morningTripTime: payload.morningTripTime || "07:00 AM",
    eveningTripTime: payload.eveningTripTime || "03:45 PM",
    effectiveFrom: payload.effectiveFrom ? `${payload.effectiveFrom}T00:00:00` : new Date().toISOString(),
    shift: payload.shift || "Morning",
    status: payload.status === "Active" || payload.status === true,
  };
  const res = await apiClient.post(apiEndpoints.transport.vehicleAssignments, body);
  return res.data;
};

export const reassignDriver = async (assignmentId, payload) => {
  if (!assignmentId) throw new Error("Assignment ID is required.");
  const numericId = Number(String(assignmentId).replace(/[^\d]/g, "")) || assignmentId;
  const body = {
    routeId: Number(payload.routeId),
    vehicleId: Number(payload.vehicleId),
    driverId: Number(payload.driverId),
    attendantId: payload.attendantId ? Number(payload.attendantId) : null,
    morningTripTime: payload.morningTripTime || "07:00 AM",
    eveningTripTime: payload.eveningTripTime || "03:45 PM",
    effectiveFrom: payload.effectiveFrom ? `${payload.effectiveFrom}T00:00:00` : new Date().toISOString(),
    shift: payload.shift || "Morning",
    status: payload.status === "Active" || payload.status === true,
  };
  const res = await apiClient.put(apiEndpoints.transport.reassignVehicleAssignment(numericId), body);
  return res.data;
};
