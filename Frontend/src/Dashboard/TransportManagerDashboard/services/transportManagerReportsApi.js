/**
 * Transport Manager Reports API
 * Fetches analytics reports and provides genuine CSV download utilities
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

export const getTransportReport = async (reportType, params = {}) => {
  const endpointMap = {
    dashboard: apiEndpoints.transport.reports.dashboard,
    trips: apiEndpoints.transport.reports.trips,
    vehicles: apiEndpoints.transport.reports.vehicles,
    drivers: apiEndpoints.transport.reports.drivers,
    routes: apiEndpoints.transport.reports.routes,
    maintenance: apiEndpoints.transport.reports.maintenance,
    monthlyCost: apiEndpoints.transport.reports.monthlyCost,
  };

  const url = endpointMap[reportType] || apiEndpoints.transport.reports.vehicles;
  const res = await apiClient.get(url, { params });
  return extractList(res.data);
};

export const exportReportToCsv = (filename, rows = [], columns = []) => {
  if (!rows || !rows.length) return false;

  const header = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = row[col.key] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");

  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(`${header}\n${body}`);
  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
};
