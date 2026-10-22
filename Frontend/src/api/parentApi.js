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
 * 5b. GET /api/v1/marks/student/{studentId}
 * Retrieves direct subject marks entered for a student across all examinations.
 */
export const getStudentMarks = async (studentId) => {
  if (!isBackendStudentId(studentId)) return [];
  try {
    const res = await api.get(`/api/v1/marks/student/${encodeURIComponent(studentId)}`);
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data) ? data : [];
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
    const memo = res?.data?.data ?? res?.data ?? null;
    if (memo && Array.isArray(memo.subjects) && memo.subjects.length > 0) {
      return memo;
    }
  } catch {
    // Fall back to building memo from real marks endpoint
  }

  try {
    const allMarks = await getStudentMarks(studentId);
    const examMarks = allMarks.filter((m) => String(m.examinationId) === String(examinationId));
    if (examMarks.length > 0) {
      const first = examMarks[0];
      const subjects = examMarks.map((m) => ({
        subjectId: m.subjectId,
        subjectCode: m.subjectCode || `SUB-${m.subjectId}`,
        subjectName: m.subjectName || `Subject ${m.subjectId}`,
        maxMarks: m.passingMarks ? (m.passingMarks === 35 ? 100 : m.passingMarks * 2) : 100,
        passingMarks: m.passingMarks || 35,
        internalMarks: m.internalMarks || 0,
        practicalMarks: m.practicalMarks || 0,
        theoryMarks: m.theoryMarks ?? m.totalMarks ?? 0,
        totalMarks: m.totalMarks ?? m.theoryMarks ?? 0,
        resultStatus: m.isPass ? "PASS" : "FAIL",
      }));
      const totalMarks = subjects.reduce((sum, s) => sum + (s.totalMarks || 0), 0);
      const maxTotalMarks = subjects.reduce((sum, s) => sum + (s.maxMarks || 0), 0);
      const percentage = maxTotalMarks > 0 ? Math.round((totalMarks / maxTotalMarks) * 1000) / 10 : 0;
      return {
        studentId: Number(studentId),
        rollNo: first.rollNo || "",
        studentName: first.studentName || "",
        examinationName: first.examinationName || `Examination #${examinationId}`,
        examCode: first.examCode || "EXM",
        academicYear: first.academicYearName || "2026-2027",
        courseName: first.group || "MPC",
        sectionName: first.sectionName || "REG-1",
        totalMarks,
        maxTotalMarks,
        percentage,
        grade: percentage >= 85 ? "A+" : percentage >= 75 ? "A" : percentage >= 60 ? "B" : "Pass",
        resultStatus: subjects.every((s) => s.resultStatus === "PASS") ? "PASS" : "FAIL",
        subjects,
      };
    }
  } catch {
    // Return null if unavailable
  }
  return null;
};

/**
 * 7. GET /api/v1/subjects/group/{groupId}
 * Fetches curriculum subjects mapped to a specific student group.
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
 * 8. GET /api/v1/attendance/student/{studentId}/yearly-overview
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
 * 9. GET /api/v1/timetable/student/{studentId} or /api/v1/timetable/section/{sectionId}
 * Gets weekly timetable slots for a student or section.
 */
export const getStudentTimetable = async (studentId, sectionId) => {
  if (!isBackendStudentId(studentId)) return [];
  try {
    const res = await api.get(`/api/v1/timetable/student/${encodeURIComponent(studentId)}`);
    const data = res?.data?.data ?? res?.data ?? [];
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // Continue to section fallback
  }

  // In College Management Systems, timetable schedules are assigned by section
  if (sectionId) {
    try {
      const sectionRes = await api.get(`/api/v1/timetable/section/${encodeURIComponent(sectionId)}`);
      const sectionData = sectionRes?.data?.data ?? sectionRes?.data ?? [];
      if (Array.isArray(sectionData) && sectionData.length > 0) return sectionData;
    } catch {
      // Return empty
    }
  }
  return [];
};

/**
 * 10. GET /api/v1/attendance/student/{studentId}/subjects
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
 * 11. GET /api/v1/attendance/student/{studentId}/daily-logs
 * Retrieves detailed daily attendance punch logs for a student.
 */
export const getStudentDailyAttendanceLogs = async (studentId, { month, year } = {}) => {
  if (!isBackendStudentId(studentId)) return [];
  try {
    const now = new Date();
    const params = {
      month: (month !== undefined && month !== null && month !== "" && month !== "all") ? Number(month) : (now.getMonth() + 1),
      year: (year !== undefined && year !== null && year !== "") ? Number(year) : now.getFullYear(),
    };
    const res = await api.get(`/api/v1/attendance/student/${encodeURIComponent(studentId)}/daily-logs`, { params });
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/**
 * 12. GET /api/v1/examinations
 * Retrieves examinations scheduled for the student's campus and group.
 */
export const getStudentExaminations = async (campusId = 1, groupId = 37) => {
  try {
    const res = await api.get("/api/v1/examinations", {
      params: {
        CampusId: campusId || 1,
        GroupId: groupId || 37,
      },
    });
    const data = res?.data?.data ?? res?.data ?? [];
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // Try fallback
  }

  try {
    const fallback = await api.get("/api/v1/dashboard/upcoming-examinations");
    const data = fallback?.data?.data ?? fallback?.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/**
 * 13. GET /api/v1/examinations/{examinationId}/schedules
 * Retrieves paper-wise schedules, timings, rooms, and invigilators for an examination.
 */
export const getExaminationSchedules = async (examinationId) => {
  if (!examinationId) return [];
  try {
    const res = await api.get(`/api/v1/examinations/${encodeURIComponent(examinationId)}/schedules`);
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};


