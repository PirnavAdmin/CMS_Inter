/**
 * Transport Maintenance API
 * Tracks vehicle condition, inspections, and maintenance work orders
 */

import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { normalizeMaintenance } from "../data/transportManagerModel.js";

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

export const getMaintenanceRecords = async (params = {}) => {
  const res = await apiClient.get(apiEndpoints.transport.maintenance, { params });
  const rawList = extractList(res.data);
  return rawList.map(normalizeMaintenance).filter(Boolean);
};

export const createMaintenanceRecord = async (payload) => {
  const body = {
    vehicleId: Number(payload.vehicleId),
    serviceType: payload.category || payload.serviceType || "General Maintenance",
    serviceDate: payload.serviceDate ? `${payload.serviceDate}T00:00:00` : new Date().toISOString(),
    cost: Number(payload.cost) || 0,
    vendorCenter: payload.vendor || payload.vendorCenter || "",
    nextServiceDue: payload.nextDueDate ? `${payload.nextDueDate}T00:00:00` : null,
    remarks: payload.notes || payload.remarks || "",
    status: payload.status === "Completed" || payload.status === true,
  };
  const res = await apiClient.post(apiEndpoints.transport.maintenance, body);
  return res.data;
};

export const updateMaintenanceRecord = async (id, payload) => {
  if (!id) throw new Error("Maintenance record ID is required.");
  const body = {
    vehicleId: Number(payload.vehicleId),
    serviceType: payload.category || payload.serviceType || "General Maintenance",
    serviceDate: payload.serviceDate ? `${payload.serviceDate}T00:00:00` : new Date().toISOString(),
    cost: Number(payload.cost) || 0,
    vendorCenter: payload.vendor || payload.vendorCenter || "",
    nextServiceDue: payload.nextDueDate ? `${payload.nextDueDate}T00:00:00` : null,
    remarks: payload.notes || payload.remarks || "",
    status: payload.status === "Completed" || payload.status === true,
  };
  const res = await apiClient.put(apiEndpoints.transport.maintenanceById(id), body);
  return res.data;
};
