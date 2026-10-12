import apiClient from "@/api/axios.js";
import studentApiEndpoints from "../api/studentApiEndpoints.js";
import { env } from "@/config/env.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const getPayload = (payload) => payload?.data ?? payload?.Data ?? payload;

// Same facility-rate source used by Student Management; read only this student's allocation.
export const getStudentTransportFacilityFee = async (studentId) => {
  const response = await apiClient.get(apiEndpoints.students.getById(studentId), { skipGlobalLoader: true });
  const record = getPayload(response.data) || {};
  const student = record.student ?? record.Student ?? record;
  const allocation = student.allocation ?? student.Allocation ?? student.residentialAllocation ?? {};
  const transport = student.transport ?? student.Transport ?? student.transportDetails ?? {};
  const sources = [student, record, allocation, transport, student.route ?? student.Route ?? transport.route ?? transport.Route, student.pickupPoint ?? student.PickupPoint ?? transport.pickupPoint ?? transport.PickupPoint].filter((row) => row && typeof row === "object");
  const read = (...keys) => sources.flatMap((row) => keys.map((key) => row[key])).find((value) => value != null && value !== "") ?? "";
  const type = String(read("studentType", "StudentType", "residentialType", "ResidentialType", "isResidential", "IsResidential")).toLowerCase();
  if (!["non-residential", "non residential", "day scholar", "dayscholar", "false", "1", "0"].includes(type)
    || !/^(yes|true|1)$/i.test(String(read("transportRequired", "TransportRequired", "isTransportRequired", "IsTransportRequired")))) return null;
  const pickup = read("pickupPointId", "PickupPointId", "pickupPoint", "PickupPoint", "pickupPointName", "PickupPointName");
  const route = read("routeId", "RouteId", "busRouteId", "BusRouteId", "busRoute", "BusRoute", "routeName", "RouteName", "busRouteName", "BusRouteName");
  const campus = read("campusId", "CampusId");
  const result = await apiClient.get(apiEndpoints.transport.pickupPoints, { params: { ...(campus ? { CampusId: campus } : {}), PageNumber: 1, PageSize: 1000 }, skipGlobalLoader: true });
  const payload = getPayload(result.data);
  const points = Array.isArray(payload) ? payload : payload?.items ?? payload?.Items ?? payload?.$values ?? payload?.data ?? payload?.Data ?? payload?.results ?? payload?.Results ?? [];
  const matches = (selected, ...values) => Boolean(selected) && values.some((value) => String(value ?? "").trim().toLowerCase() === String(selected).trim().toLowerCase());
  const point = points.find((row) => ![false, 0, "false", "0", "inactive", "disabled"].includes(typeof (row.isActive ?? row.IsActive ?? row.status ?? row.Status) === "string" ? String(row.isActive ?? row.IsActive ?? row.status ?? row.Status).toLowerCase() : row.isActive ?? row.IsActive ?? row.status ?? row.Status)
    && matches(pickup, row.pickupPointId, row.PickupPointId, row.stopName, row.StopName, row.pickupPointName, row.PickupPointName)
    && (!route || !(row.routeId ?? row.RouteId ?? row.routeName ?? row.RouteName) || matches(route, row.routeId, row.RouteId, row.routeName, row.RouteName)));
  if (!point) return null;
  const value = point.monthlyFee ?? point.MonthlyFee ?? point.fare ?? point.Fare;
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return null;
  return { amount: Number(value), plan: "Monthly", detail: point.stopName ?? point.StopName ?? point.pickupPointName ?? point.PickupPointName ?? "" };
};

export const withTransportFacilityFee = (summary, facility) => facility ? { ...summary, configured: true, monthlyFee: facility.amount, plan: facility.plan, detail: facility.detail,
  ...(!summary.assigned ? { amount: facility.amount, status: "Monthly rate · payment status unavailable" } : {}),
} : summary;

export const getStudentTransportFeeSummary = (detailsPayload, historyPayload) => {
  const details = getPayload(detailsPayload) || {};
  const read = (row, key) => row?.[key] ?? row?.[key[0].toUpperCase() + key.slice(1)];
  const number = (row, ...keys) => {
    for (const key of keys) {
      const value = read(row, key);
      if (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))) return Number(value);
    }
    return null;
  };
  const isTransport = (value) => /\btransport\b|\bbus\s*(?:fee|fare)\b/i.test(String(value || ""));
  const rows = [read(details, "components"), read(details, "breakdown"), read(details, "feeBreakdown")].find((value) => Array.isArray(value) && value.length) || [];
  const transport = Array.isArray(rows) ? rows.filter((row) => isTransport(read(row, "feeTypeName") || read(row, "feeType") || read(row, "name"))) : [];
  if (!transport.length) return { assigned: false, amount: null, paid: null, due: null, status: "Not Assigned" };
  const sum = (keys) => {
    const values = transport.map((row) => number(row, ...keys));
    return values.every((value) => value !== null) ? values.reduce((total, value) => total + value, 0) : null;
  };
  const amount = sum(["payableAmount", "payable", "amount", "feeAmount"]);
  let paid = sum(["paidAmount", "paid", "amountPaid"]);
  let due = sum(["balanceAmount", "balance", "dueAmount", "outstandingBalance"]);
  const totalPaid = number(details, "totalPaid", "paidAmount");
  const accountDue = number(details, "outstandingBalance", "balanceAmount", "balance");
  if (paid === null && totalPaid === 0) paid = 0;
  if (paid === null && accountDue === 0 && amount !== null) paid = amount;
  const history = getPayload(historyPayload);
  const payments = Array.isArray(history) ? history : read(details, "paymentHistory") || [];
  const identified = payments.filter((row) => isTransport(read(row, "feeTypeName") || read(row, "feeType") || read(row, "paymentType")) && !/fail|cancel|refund|pending/i.test(String(read(row, "status") || "")));
  if (paid === null && identified.length && identified.every((row) => number(row, "amount", "paidAmount") !== null)) paid = identified.reduce((total, row) => total + number(row, "amount", "paidAmount"), 0);
  if (due === null && amount !== null && paid !== null) due = Math.max(amount - paid, 0);
  if (paid === null && amount !== null && due !== null) paid = Math.max(amount - due, 0);
  const status = due === 0 ? "Paid" : paid === 0 && due > 0 ? "Unpaid" : paid > 0 && due > 0 ? "Partially Paid" : "Payment status unavailable";
  return { assigned: true, amount, paid, due, status };
};

export const getCurrentStudent = async () => {
  const response = await apiClient.get(studentApiEndpoints.profile.me);
  return getPayload(response.data) || {};
};

// Keep the portal's allocation details in sync with the combined record used
// by Student Management (student record + admission record).
export const getStudentAllocationProfile = async (student) => {
  const studentId = student?.studentId ?? student?.StudentId ?? student?.id ?? student?.Id;
  const admissionNo = String(student?.admissionNo ?? student?.AdmissionNo ?? student?.admissionNumber ?? student?.AdmissionNumber ?? "").trim();
  const getRows = (payload) => {
    let value = payload;
    for (let index = 0; index < 3; index += 1) {
      if (value?.data != null) value = value.data;
      else if (value?.Data != null) value = value.Data;
      else break;
    }
    if (Array.isArray(value)) return value;
    return value?.items ?? value?.Items ?? value?.records ?? value?.Records ?? value?.results ?? value?.Results ?? [];
  };
  const getRecord = (payload) => {
    let value = payload;
    for (let index = 0; index < 3; index += 1) {
      if (value?.data != null) value = value.data;
      else if (value?.Data != null) value = value.Data;
      else break;
    }
    return value && typeof value === "object" ? value : {};
  };
  const read = (record, ...keys) => keys.map((key) => record?.[key]).find((value) => value != null && value !== "");

  const [studentResult, studentListResult, admissionListResult] = await Promise.allSettled([
    studentId ? apiClient.get(`/api/v1/students/${encodeURIComponent(studentId)}`) : Promise.reject(new Error("Student ID unavailable")),
    apiClient.get("/api/v1/students"),
    apiClient.get("/api/v1/student-admissions"),
  ]);
  const currentRecord = studentResult.status === "fulfilled" ? getRecord(studentResult.value.data) : student;
  const currentStudentId = String(read(currentRecord, "studentId", "StudentId", "id", "Id") ?? studentId ?? "");
  const currentAdmissionNo = String(read(currentRecord, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? admissionNo).trim();
  const studentSummary = studentListResult.status === "fulfilled"
    ? getRows(studentListResult.value.data).find((item) => String(read(item, "studentId", "StudentId", "id", "Id") ?? "") === currentStudentId
      || String(read(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim() === currentAdmissionNo)
    : null;
  const admissionSummary = admissionListResult.status === "fulfilled"
    ? getRows(admissionListResult.value.data).find((item) => String(read(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim() === currentAdmissionNo
      || String(read(item, "studentId", "StudentId") ?? "") === currentStudentId)
    : null;
  let admission = admissionSummary;
  const admissionId = read(admissionSummary, "admissionId", "AdmissionId", "studentAdmissionId", "StudentAdmissionId", "id", "Id");
  if (admissionId != null) {
    try {
      const detail = await apiClient.get(`/api/v1/student-admissions/${encodeURIComponent(admissionId)}`);
      admission = { ...admissionSummary, ...getRecord(detail.data) };
    } catch { /* The list record still contains useful allocation fields. */ }
  }

  const merged = { ...(currentRecord && typeof currentRecord === "object" ? currentRecord : student) };
  Object.entries(studentSummary || {}).forEach(([key, value]) => {
    if ((merged[key] == null || merged[key] === "") && value != null && value !== "") merged[key] = value;
  });
  Object.entries(admission || {}).forEach(([key, value]) => {
    if (value != null && value !== "") merged[key] = value;
  });
  return merged;
};

export const updateCurrentStudentProfile = (data) => apiClient.put(studentApiEndpoints.profile.update, data);

export const uploadCurrentStudentPhoto = (file) => {
  const data = new FormData();
  data.append("file", file);
  return apiClient.post(studentApiEndpoints.profile.photo, data);
};

export const removeCurrentStudentPhoto = () => apiClient.delete(studentApiEndpoints.profile.removePhoto);

export const getCurrentStudentPhotoFile = async (path, signal) => {
  const base = new URL(env.apiBaseUrl, window.location.origin);
  const url = new URL(path, `${base.origin}/`);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== base.origin
    || !url.pathname.startsWith("/uploads/")) throw new Error("The profile photo URL is unavailable.");
  const response = await apiClient.get(url.href, { responseType: "blob", signal, skipGlobalLoader: true });
  if (!response.data.type.startsWith("image/")) throw new Error("The photo server did not return an image.");
  return response.data;
};

export const uploadCurrentStudentDocument = (documentType, file) => {
  const data = new FormData();
  data.append("documentType", documentType);
  data.append("file", file);
  return apiClient.post(studentApiEndpoints.profile.documents, data);
};

// Resolve only backend file paths returned by the current student's profile.
export const getStudentDocumentUrl = (path) => {
  if (typeof path !== "string" || !path.trim()) return "";
  try {
    const base = new URL(env.apiBaseUrl, window.location.origin);
    const url = new URL(path, `${base.origin}/`);
    return ["http:", "https:"].includes(url.protocol) && url.origin === base.origin
      && url.pathname.startsWith("/uploads/student-documents/") ? url.href : "";
  } catch { return ""; }
};

export const getCurrentStudentDocumentFile = async (path) => {
  const url = getStudentDocumentUrl(path);
  if (!url) throw new Error("This document does not have an available file URL.");
  try {
    const response = await apiClient.get(url, { responseType: "blob" });
    if (response.data.type.includes("text/html")) throw new Error("The document server returned a page instead of a file.");
    return response.data;
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Keep the original HTTP error. */ }
    }
    throw error;
  }
};

export const changeCurrentStudentPassword = (data) => apiClient.post(studentApiEndpoints.profile.changePassword, data);

export const getStudentExaminations = async (student) => {
  const params = {
    CampusId: student.campusId,
    BoardId: student.boardId,
    AcademicYearId: student.academicYearId,
    AcademicLevelId: student.academicLevelId,
    GroupId: student.groupId,
    ProgramId: student.programId,
  };
  Object.keys(params).forEach((key) => {
    if (!params[key]) delete params[key];
  });

  const examinationEndpoint = apiEndpoints.examinations.getAll;
  const response = await apiClient.get(examinationEndpoint, { params });
  const payload = getPayload(response.data);
  const rows = (value) => Array.isArray(value) ? value : value?.items ?? value?.Items ?? [];
  const inStudentScope = (record) => ["campusId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId", "sectionId"].every((key) => {
    const actual = record[key] ?? record[key[0].toUpperCase() + key.slice(1)];
    return actual == null || !student[key] || String(actual) === String(student[key]);
  });
  const examinations = rows(payload).filter(inStudentScope);
  const visible = examinations.filter((exam) => ["SCHEDULED", "PUBLISHED", "COMPLETED"].includes(String(exam.status || "").trim().toUpperCase()));

  return Promise.all(visible.map(async (exam) => {
    const examinationId = exam.examinationId ?? exam.examId ?? exam.id;
    if (!examinationId) return { ...exam, schedules: [] };
    const [detailResponse, scheduleResponse] = await Promise.all([
      apiClient.get(`${examinationEndpoint}/${encodeURIComponent(examinationId)}`),
      apiClient.get(`${examinationEndpoint}/${encodeURIComponent(examinationId)}/schedules`),
    ]);
    const detail = getPayload(detailResponse.data) || {};
    const schedules = getPayload(scheduleResponse.data);
    return { ...exam, ...detail, schedules: rows(schedules).filter(inStudentScope) };
  }));
};

export const getStudentAttendance = async (studentId, fromDate, toDate) => {
  const response = await apiClient.get(studentApiEndpoints.attendance.search, {
    params: { studentId, fromDate, toDate },
  });
  return getPayload(response.data);
};

export const getStudentResult = async (student) => {
  const params = {
    studentId: student?.studentId,
    boardId: student?.boardId,
    academicYearId: student?.academicYearId,
    academicLevelId: student?.academicLevelId,
    groupId: student?.groupId,
  };
  Object.keys(params).forEach((key) => { if (params[key] == null || params[key] === "") delete params[key]; });
  const response = await apiClient.get(studentApiEndpoints.results.studentResult, { params });
  return getPayload(response.data);
};

export const getStudentWeeklyTimetable = async (studentId) => {
  const response = await apiClient.get(studentApiEndpoints.timetable.weekly(studentId));
  const payload = getPayload(response.data);
  return Array.isArray(payload) ? payload : [];
};

export const getStudentDailyTimetable = async (studentId, academicYearId, date = new Date().toISOString()) => {
  const response = await apiClient.get(studentApiEndpoints.timetable.daily(studentId), {
    params: { date, academicYearId },
  });
  const payload = getPayload(response.data);
  return Array.isArray(payload) ? payload : [];
};
