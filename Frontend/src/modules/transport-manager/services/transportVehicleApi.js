/**
 * Transport Vehicle API
 * Provides endpoints for fleet vehicles, details, registration, and updates
 */

import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { normalizeVehicle } from "../data/transportManagerModel.js";

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

export const getVehicles = async (params = {}) => {
  const res = await apiClient.get(apiEndpoints.transport.vehicles, {
    params: { PageNumber: 1, PageSize: 1000, ...params },
  });
  const rawList = extractList(res.data);
  return rawList.map(normalizeVehicle).filter(Boolean);
};

export const getVehicleById = async (id) => {
  if (!id) throw new Error("Vehicle ID is required.");
  const res = await apiClient.get(apiEndpoints.transport.vehicleById(id));
  const payload = res.data?.data ?? res.data ?? {};
  return normalizeVehicle(payload.vehicle ?? payload);
};

export const createVehicle = async (payload) => {
  const body = {
    vehicleNumber: payload.vehicleNumber,
    registrationNumber: payload.registrationNumber,
    vehicleName: payload.vehicleNumber,
    vehicleType: payload.vehicleType || "Bus",
    capacity: Number(payload.capacity) || 40,
    isAC: Boolean(payload.isAC),
    gpsDeviceId: payload.gpsDeviceId || "",
    chassisNumber: payload.chassisNumber || "",
    engineNumber: payload.engineNumber || "",
    insuranceExpiry: payload.insuranceExpiry || null,
    pollutionExpiry: payload.pollutionExpiry || null,
    fitnessExpiry: payload.fitnessExpiry || null,
    status: payload.status === "Active" || payload.status === true,
  };
  const res = await apiClient.post(apiEndpoints.transport.vehicles, body);
  return res.data;
};

export const updateVehicle = async (id, payload) => {
  if (!id) throw new Error("Vehicle ID is required.");
  const numericId = Number(String(id).replace(/[^\d]/g, "")) || id;
  const body = {
    vehicleNumber: payload.vehicleNumber,
    registrationNumber: payload.registrationNumber,
    vehicleName: payload.vehicleNumber,
    vehicleType: payload.vehicleType || "Bus",
    capacity: Number(payload.capacity) || 40,
    isAC: Boolean(payload.isAC),
    gpsDeviceId: payload.gpsDeviceId || "",
    chassisNumber: payload.chassisNumber || "",
    engineNumber: payload.engineNumber || "",
    insuranceExpiry: payload.insuranceExpiry || null,
    pollutionExpiry: payload.pollutionExpiry || null,
    fitnessExpiry: payload.fitnessExpiry || null,
    status: payload.status === "Active" || payload.status === true,
  };
  const res = await apiClient.put(apiEndpoints.transport.vehicleById(numericId), body);
  return res.data;
};
