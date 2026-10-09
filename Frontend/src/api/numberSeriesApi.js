import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

/**
 * 1. GET /api/v1/settings/number-series (or /api/v1/number-series)
 * Returns list of configurations for all supported number series.
 */
export async function getNumberSeriesList(campusId, boardId, academicYearId, includeSubCounters = false) {
  const headers = campusId !== undefined && campusId !== null && campusId !== ""
    ? { "X-Campus-Id": String(campusId) }
    : {};
  const params = {};
  if (boardId !== undefined && boardId !== null && boardId !== "") params.board = String(boardId);
  if (academicYearId !== undefined && academicYearId !== null && academicYearId !== "") {
    params.academicYear = String(academicYearId);
  }
  if (includeSubCounters) {
    params.includeSubCounters = true;
  }
  const requestConfig = { headers, params };

  try {
    const response = await apiClient.get(apiEndpoints.numberSeries.getAll, requestConfig);
    return response.data;
  } catch (err) {
    // Fallback to /api/v1/number-series if settings prefix route fails
    try {
      const fallbackRes = await apiClient.get("/api/v1/number-series", requestConfig);
      return fallbackRes.data;
    } catch {
      throw err;
    }
  }
}

/**
 * 2. GET /api/v1/settings/number-series/{seriesCode} (or /api/v1/number-series/{seriesCode})
 * Returns configuration object + dynamically parsed livePreview string for a specific series.
 * Supports code (e.g., EMPLOYEE_ID) or slug (e.g., employee-id, admission-no, certificate-number, receipt-no).
 */
export async function getNumberSeriesByCode(seriesCode) {
  if (!seriesCode) throw new Error("seriesCode is required");
  try {
    const response = await apiClient.get(apiEndpoints.numberSeries.getByCode(seriesCode));
    return response.data;
  } catch (err) {
    try {
      const fallbackRes = await apiClient.get(`/api/v1/number-series/${encodeURIComponent(seriesCode)}`);
      return fallbackRes.data;
    } catch {
      throw err;
    }
  }
}

/**
 * 3. PUT /api/v1/settings/number-series/{seriesCode} (or /api/v1/number-series/{seriesCode})
 * Updates configuration: prefix, formatPattern, numberLength, startNumber, description.
 */
export async function updateNumberSeries(seriesCode, configData, campusId) {
  if (!seriesCode) throw new Error("seriesCode is required");
  const headers = campusId !== undefined && campusId !== null && campusId !== ""
    ? { "X-Campus-Id": String(campusId) }
    : {};
  const payload = {
    prefix: configData.prefix ?? "",
    formatPattern: configData.formatPattern ?? configData.format ?? "",
    numberLength: Number(configData.numberLength ?? 4),
    startNumber: Number(configData.startNumber ?? 1),
    description: configData.description ?? "",
    isActive: configData.isActive !== undefined ? configData.isActive : true,
    seriesName: configData.seriesName || configData.name || "",
  };

  try {
    const response = await apiClient.put(apiEndpoints.numberSeries.update(seriesCode), payload, { headers });
    return response.data;
  } catch (err) {
    try {
      const fallbackRes = await apiClient.put(
        `/api/v1/number-series/${encodeURIComponent(seriesCode)}`,
        payload,
        { headers },
      );
      return fallbackRes.data;
    } catch {
      throw err;
    }
  }
}

/**
 * 4. POST /api/v1/settings/number-series/{seriesCode}/generate-next (or /api/v1/number-series/{seriesCode}/generate-next)
 * Executes thread-safe atomic sequence increment and returns the newly generated sequence ID.
 */
export async function generateNextNumber(seriesCode, context = {}, campusId, campusCode = null) {
  if (!seriesCode) throw new Error("seriesCode is required");
  const resolvedCampusId = context.campusId ?? campusId;
  const resolvedCampusCode = context.campusCode ?? campusCode;
  const scopeKeys = ["campusId", "boardId", "academicYearId", "groupId", "programId"];
  if (seriesCode === "ROLL_NO" && scopeKeys.some((key) => !Number.isInteger(Number(key === "campusId" ? resolvedCampusId : context[key])) || Number(key === "campusId" ? resolvedCampusId : context[key]) <= 0)) {
    throw new Error("Campus, Board, Academic Year, Group and Program are required for Roll Number generation.");
  }
  const payload = {
    ...Object.fromEntries(scopeKeys.filter((key) => (key === "campusId" ? resolvedCampusId : context[key]) != null).map((key) => [key, Number(key === "campusId" ? resolvedCampusId : context[key])])),
    ...(resolvedCampusCode ? { campusCode: resolvedCampusCode } : {}),
    ...(context.program != null ? { program: context.program } : {}),
    board: context.board ?? "",
    dept: context.dept ?? "",
    type: context.type ?? "",
    staff: context.staff ?? "",
    desig: context.desig ?? "",
    cert: context.cert ?? "",
    academicYear: context.academicYear ?? "",
    group: context.group ?? "",
    groupCode: context.groupCode ?? "",
    campusGroupPrefix: context.campusGroupPrefix ?? "",
    section: context.section ?? "",
    level: context.level ?? "",
    exam: context.exam ?? "",
  };

  const params = {};
  if (resolvedCampusId !== undefined && resolvedCampusId !== null && resolvedCampusId !== "") params.campusId = resolvedCampusId;
  if (resolvedCampusCode !== undefined && resolvedCampusCode !== null && resolvedCampusCode !== "") params.campusCode = resolvedCampusCode;
  const requestConfig = { params };

  try {
    const response = await apiClient.post(apiEndpoints.numberSeries.generateNext(seriesCode), payload, requestConfig);
    return response.data;
  } catch (err) {
    if (seriesCode === "ROLL_NO") throw err;
    try {
      const fallbackRes = await apiClient.post(`/api/v1/number-series/${encodeURIComponent(seriesCode)}/generate-next`, payload, requestConfig);
      return fallbackRes.data;
    } catch {
      throw err;
    }
  }
}

/**
 * 5. GET /api/v1/settings/number-series/{seriesCode}/preview (or /api/v1/number-series/{seriesCode}/preview)
 * Dynamic on-the-fly preview calculation for UI typing without persisting changes.
 */
export async function previewNumberSeries(seriesCode, { pattern, numberLength, prefix, campusId, campusCode } = {}) {
  if (!seriesCode) throw new Error("seriesCode is required");
  const params = {};
  if (pattern !== undefined) params.pattern = pattern;
  if (numberLength !== undefined) params.numberLength = Number(numberLength);
  if (prefix !== undefined) params.prefix = prefix;
  if (campusId !== undefined) params.campusId = campusId;
  if (campusCode !== undefined && campusCode !== null && campusCode !== "") params.campusCode = campusCode;

  try {
    const response = await apiClient.get(apiEndpoints.numberSeries.preview(seriesCode), { params });
    return response.data;
  } catch (err) {
    try {
      const fallbackRes = await apiClient.get(`/api/v1/number-series/${encodeURIComponent(seriesCode)}/preview`, { params });
      return fallbackRes.data;
    } catch {
      throw err;
    }
  }
}

export default {
  getNumberSeriesList,
  getNumberSeriesByCode,
  updateNumberSeries,
  generateNextNumber,
  previewNumberSeries,
};

