import api from "./axios.js";
import { env } from "@/config/env.js";

/**
 * PIRNAV COLLEGE MANAGEMENT SYSTEM — PARENT DASHBOARD APIs
 * Directly integrates with backend endpoints:
 * 1. GET /api/v1/students/my-children
 * 2. GET /api/v1/students/{studentId}
 * 3. GET /api/v1/fees/students/{studentId}/fee-details
 * 4. GET /api/v1/fees/students/{studentId}/fee-ledger
 * 5. GET /api/v1/students/me/results?studentId={studentId}
 * 6. GET /api/v1/students/me/results/{examinationId}/memo?studentId={studentId}
 */

// Helper to resolve student photo URLs correctly
export const resolveStudentPhotoUrl = (photoPath) => {
  if (!photoPath) return "";
  const clean = String(photoPath).trim().replace(/\\/g, "/");
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean) || clean.startsWith("data:") || clean.startsWith("blob:")) {
    return clean;
  }
  const configuredBase = String(env.apiBaseUrl || "https://whiff-lyrics-debug.ngrok-free.dev").trim();
  const origin = configuredBase.replace(/\/+$/, "");
  const normalized = clean.startsWith("/") ? clean : `/${clean}`;
  return `${origin}${normalized}`;
};

const isBackendStudentId = (id) => Boolean(id) && !isNaN(Number(id)) && Number(id) > 0 && !String(id).startsWith("stu-");

/**
 * 1. GET /api/v1/students/my-children
 * Retrieves all children enrolled under the authenticated parent account.
 */
export const getMyChildren = async () => {
  try {
    const res = await api.get("/api/v1/students/my-children");
    // Handles { success: true, data: [...] } or direct array [...]
    if (res?.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    if (Array.isArray(res?.data)) {
      return res.data;
    }
    return res?.data?.data || [];
  } catch {
    return [];
  }
};

/**
 * 2. GET /api/v1/students/{studentId}
 * Retrieves comprehensive details for a specific student.
 */
export const getStudentById = async (studentId) => {
  if (!isBackendStudentId(studentId)) return null;
  try {
    const res = await api.get(`/api/v1/students/${encodeURIComponent(studentId)}`);
    return res?.data?.data ?? res?.data ?? null;
  } catch {
    return null;
  }
};

/**
 * 3. GET /api/v1/fees/students/{studentId}/fee-details
 * Retrieves complete fee ledger, breakdown, payment plan, and installments for a student.
 */
export const getStudentFeeDetails = async (studentId) => {
  if (!isBackendStudentId(studentId)) return null;
  try {
    const res = await api.get(`/api/v1/fees/students/${encodeURIComponent(studentId)}/fee-details`);
    return res?.data?.data ?? res?.data ?? null;
  } catch {
    try {
      const fallback = await api.get(`/api/v1/fees/students/${encodeURIComponent(studentId)}/fee-ledger`);
      return fallback?.data?.data ?? fallback?.data ?? null;
    } catch {
      return null;
    }
  }
};

/**
 * 4. GET /api/v1/fees/students/{studentId}/fee-ledger
 * Compatibility route for student fee ledger.
 */
export const getStudentFeeLedger = async (studentId) => {
  if (!isBackendStudentId(studentId)) return null;
  try {
    const res = await api.get(`/api/v1/fees/students/${encodeURIComponent(studentId)}/fee-ledger`);
    return res?.data?.data ?? res?.data ?? null;
  } catch {
    return null;
  }
};

/**
 * 5. GET /api/v1/students/me/results?studentId={studentId}
 * Retrieves published examination results for the specified student.
 */
export const getStudentResults = async (studentId) => {
  if (!isBackendStudentId(studentId)) return [];
  try {
    const res = await api.get(`/api/v1/students/me/results`, {
      params: { studentId },
    });
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    return [];
  } catch {
    return [];
  }
};

/**
 * 6. GET /api/v1/students/me/results/{examinationId}/memo?studentId={studentId}
 * Retrieves detailed marks memo with subject-wise scores for a specific completed exam.
 */
export const getStudentResultMemo = async (examinationId, studentId) => {
  if (!examinationId || !isBackendStudentId(studentId)) return null;
  try {
    const res = await api.get(`/api/v1/students/me/results/${encodeURIComponent(examinationId)}/memo`, {
      params: studentId ? { studentId } : {},
    });
    return res?.data?.data ?? res?.data ?? null;
  } catch {
    return null;
  }
};

/**
 * Optional auxiliary helper: Fetch subjects by group if available
 */
export const getSubjectsByGroup = async (groupId) => {
  if (!groupId) return [];
  try {
    const res = await api.get(`/api/v1/subjects/group/${encodeURIComponent(groupId)}`);
    return res?.data?.data ?? res?.data ?? [];
  } catch {
    return [];
  }
};

/**
 * 7. GET /api/v1/attendance/student/{studentId}/yearly-overview
 * Retrieves the yearly attendance overview for a specific student.
 */
export const getStudentAttendanceOverview = async (studentId, academicYearId) => {
  if (!isBackendStudentId(studentId)) return null;
  try {
    const res = await api.get(`/api/v1/attendance/student/${encodeURIComponent(studentId)}/yearly-overview`, {
      params: academicYearId ? { academicYearId } : {},
    });
    return res?.data?.data ?? res?.data ?? null;
  } catch {
    return null;
  }
};

/**
 * 8. GET /api/v1/timetable/student/{studentId}
 * Gets published weekly timetable for a student.
 */
export const getStudentTimetable = async (studentId) => {
  if (!isBackendStudentId(studentId)) return [];
  try {
    const res = await api.get(`/api/v1/timetable/student/${encodeURIComponent(studentId)}`);
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/**
 * 9. GET /api/v1/attendance/student/{studentId}/subjects
 * Retrieves subject-wise attendance breakdown for a student.
 */
export const getStudentAttendanceSubjects = async (studentId) => {
  if (!isBackendStudentId(studentId)) return [];
  try {
    const res = await api.get(`/api/v1/attendance/student/${encodeURIComponent(studentId)}/subjects`);
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/**
 * 10. GET /api/v1/attendance/student/{studentId}/daily-logs?month={month}&year={year}
 * Retrieves detailed daily attendance punch logs for a student.
 */
export const getStudentDailyAttendanceLogs = async (studentId, { month, year } = {}) => {
  if (!isBackendStudentId(studentId)) return [];
  try {
    const params = {};
    if (month !== undefined && month !== null && month !== "" && month !== "all") {
      params.month = Number(month);
    }
    if (year !== undefined && year !== null && year !== "") {
      params.year = Number(year);
    }
    const res = await api.get(`/api/v1/attendance/student/${encodeURIComponent(studentId)}/daily-logs`, { params });
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};


