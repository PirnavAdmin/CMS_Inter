/**
 * Transport Driver Management API
 * Fetches drivers, details, and updates driver operational info
 */

import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { normalizeDriver } from "../data/transportManagerModel.js";

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

export const getDrivers = async (params = {}) => {
  const res = await apiClient.get(apiEndpoints.transport.drivers, {
    params: { PageNumber: 1, PageSize: 1000, ...params },
  });
  const rawList = extractList(res.data);
  return rawList.map(normalizeDriver).filter(Boolean);
};

export const getDriverById = async (id) => {
  if (!id) throw new Error("Driver ID is required.");
  const res = await apiClient.get(apiEndpoints.transport.driverById(id));
  const payload = res.data?.data ?? res.data ?? {};
  return normalizeDriver(payload.driver ?? payload);
};

export const updateDriver = async (id, payload) => {
  if (!id) throw new Error("Driver ID is required.");
  const driverApiId = encodeURIComponent(id);
  const body = {
    driverName: payload.driverName,
    employeeId: payload.employeeId,
    mobileNumber: payload.mobileNumber,
    email: payload.email || "",
    licenceNumber: payload.licenseNumber,
    licenceExpiry: payload.licenseExpiryDate || null,
    address: payload.address || "",
    status: payload.status === "Active" || payload.status === true,
  };
  const res = await apiClient.put(apiEndpoints.transport.driverById(driverApiId), body);
  return res.data;
};
