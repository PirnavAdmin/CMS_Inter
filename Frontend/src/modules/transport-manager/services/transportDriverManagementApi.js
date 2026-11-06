/**
 * Transport Driver Management API
 * Fetches drivers, details, and updates driver operational info
 */

import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { normalizeDriver } from "../data/transportManagerModel.js";

const extractList = (data) => {
  let payload = data;
  const listKeys = ["items", "Items", "records", "Records", "results", "Results", "drivers", "Drivers", "$values"];
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
