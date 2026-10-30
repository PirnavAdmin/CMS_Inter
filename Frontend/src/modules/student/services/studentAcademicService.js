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

// Keep the portal's allocation details in sync with authenticated student profile
export const getStudentAllocationProfile = async (student) => {
  if (student && typeof student === "object" && (student.studentId || student.StudentId)) {
    return student;
  }
  return await getCurrentStudent();
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
  const response = await apiClient.get(url.href, {
    responseType: "blob",
    signal,
    skipGlobalLoader: true,
    // A missing optional photo is handled locally; other failures still reject.
    validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
  });
  if (response.status === 404) {
    throw new Error("Your saved profile photo is missing from the server. Please upload a replacement photo.");
  }
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

const examScopeValue = (record, key) => record?.[key] ?? record?.[key[0].toUpperCase() + key.slice(1)];
const examScopeIds = (value) => {
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = value.split(","); }
  }
  return (Array.isArray(value) ? value : value?.$values ?? [value])
    .map(Number).filter((id) => Number.isInteger(id) && id > 0).map(String);
};
const examMatchesStudent = (record, student) => {
  if (!["campusId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId", "sectionId"].every((key) => {
    const plural = examScopeIds(examScopeValue(record, `${key}s`));
    const ids = plural.length ? plural : examScopeIds(examScopeValue(record, key));
    return !ids.length || ids.includes(String(Number(examScopeValue(student, key))));
  })) return false;
  // A combined exam can map different programs to each group. Check the pair,
  // rather than accepting any program anywhere in the exam's flattened list.
  const selections = examScopeValue(record, "groupProgramSelections");
  const group = String(Number(examScopeValue(student, "groupId")));
  if (Array.isArray(selections) && selections.length) {
    const entry = selections.find((item) => String(Number(examScopeValue(item, "groupId"))) === group);
    if (!entry) return false;
    const ids = examScopeIds(examScopeValue(entry, "programIds") ?? examScopeValue(entry, "programId"));
    return !ids.length || ids.includes(String(Number(examScopeValue(student, "programId"))));
  }
  if (selections && typeof selections === "object" && Object.keys(selections).length) {
    if (!Object.prototype.hasOwnProperty.call(selections, group)) return false;
    const ids = examScopeIds(selections[group]);
    return !ids.length || ids.includes(String(Number(examScopeValue(student, "programId"))));
  }
  return true;
};

export const getStudentExaminations = async (student, { allPages = false } = {}) => {
  if (!["boardId", "academicYearId", "academicLevelId", "groupId", "programId"].every((key) => Number(examScopeValue(student, key)) > 0)) return [];
  const params = {
    CampusId: student.campusId,
    BoardId: student.boardId,
    AcademicYearId: student.academicYearId,
    AcademicLevelId: student.academicLevelId,
    GroupId: student.groupId,
  };
  // The server's exact ProgramId predicate excludes NULL (All Programs) exams.
  // Keep those candidates and apply the student's program/group mapping below.
  Object.keys(params).forEach((key) => {
    if (!params[key]) delete params[key];
  });

  const examinationEndpoint = apiEndpoints.examinations.getAll;
  const rows = (value) => Array.isArray(value) ? value : value?.items ?? value?.Items ?? [];
  const candidates = [];
  let previousPage = "";
  for (let page = 1; page <= 100; page += 1) {
    const response = await apiClient.get(examinationEndpoint, { params: { ...params, ...(allPages ? { PageNumber: page, PageSize: 100 } : {}) } });
    const batch = rows(getPayload(response.data));
    const fingerprint = JSON.stringify(batch);
    if (batch.length && fingerprint === previousPage) throw new Error("Unable to load all examinations: the server repeated a page.");
    candidates.push(...batch);
    if (!allPages || batch.length < 100) break;
    if (page === 100) throw new Error("Unable to load the complete examination history.");
    previousPage = fingerprint;
  }
  const inStudentScope = (record) => examMatchesStudent(record, student);
  const examinations = candidates.filter(inStudentScope);
  const visible = examinations.filter((exam) => ["SCHEDULED", "PUBLISHED", "COMPLETED"].includes(String(exam.status || "").trim().toUpperCase()));

  const results = await Promise.all(visible.map(async (exam) => {
    const examinationId = exam.examinationId ?? exam.examId ?? exam.id;
    if (!examinationId) return { ...exam, schedules: [] };
    const detailResponse = await apiClient.get(`${examinationEndpoint}/${encodeURIComponent(examinationId)}`);
    const detail = getPayload(detailResponse.data) || {};
    let schedules = detail.schedules;
    if (!Array.isArray(schedules) || !schedules.length) {
      const scheduleResponse = await apiClient.get(`${examinationEndpoint}/${encodeURIComponent(examinationId)}/schedules`);
      schedules = getPayload(scheduleResponse.data);
    }
    const applicableSchedules = rows(schedules).filter(inStudentScope);
    if (allPages && rows(schedules).length && !applicableSchedules.length) return null;
    return { ...exam, ...detail, schedules: applicableSchedules };
  }));
  return results.filter((exam) => exam && inStudentScope(exam));
};

export const getStudentAttendance = async (studentId, fromDate, toDate) => {
  const parsedFrom = fromDate ? new Date(fromDate) : new Date();
  const month = Number.isInteger(parsedFrom.getMonth()) ? parsedFrom.getMonth() + 1 : 0;
  const year = parsedFrom.getFullYear() || new Date().getFullYear();

  try {
    const response = await apiClient.get(`/api/v1/attendance/student/${studentId}/daily-logs`, {
      params: { month, year },
      skipGlobalLoader: true,
    });
    const payload = getPayload(response.data);
    const rows = Array.isArray(payload) ? payload : payload?.items ?? payload?.Items ?? payload?.records ?? [];
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r) => ({
        ...r,
        attendanceDate: String(r.date || r.attendanceDate || "").slice(0, 10),
        session: r.sessionName || r.session,
        status: r.status,
      }));
    }
  } catch {
    // Graceful fallback to search endpoint if daily-logs is unavailable
  }

  const response = await apiClient.get(studentApiEndpoints.attendance.search, {
    params: { studentId, fromDate, toDate, pageNumber: 1, pageSize: 1000 },
    skipGlobalLoader: true,
  });
  const list = (value) => {
    const payload = getPayload(value);
    return Array.isArray(payload) ? payload
      : payload?.records ?? payload?.items ?? payload?.attendanceRecords ?? payload?.data ?? [];
  };
  return list(response.data);
};

export const getPublishedStudentResults = async (student) => {
  const studentId = Number(student?.studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) throw new Error('Student ID is unavailable.');
  const response = await apiClient.get(studentApiEndpoints.results.published, { params: { studentId } });
  if (response.data?.success === false) throw new Error(response.data.message || 'Unable to load published results.');
  const data = getPayload(response.data);
  const rows = Array.isArray(data) ? data : data?.items ?? data?.Items ?? data?.results ?? data?.Results;
  if (!Array.isArray(rows)) throw new Error('The server returned an invalid published results list.');
  if (rows.some((row) => (row.studentId ?? row.StudentId) != null && String(row.studentId ?? row.StudentId) !== String(studentId))) throw new Error('The result list does not match your student profile.');
  return rows;
};

export const getStudentResult = async (student, examId) => {
  const params = {
    studentId: student?.studentId,
    boardId: student?.boardId,
    academicYearId: student?.academicYearId,
    academicLevelId: student?.academicLevelId,
    groupId: student?.groupId,
  };
  params.examId = examId;
  Object.keys(params).forEach((key) => { if (params[key] == null || params[key] === "") delete params[key]; });
  const response = await apiClient.get(studentApiEndpoints.results.studentResult, {
    params,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
  });
  if (response.status === 404) return null;
  return getPayload(response.data);
};

const timetableValue = (row, key) => row?.[key] ?? row?.[key[0].toUpperCase() + key.slice(1)];
const timetableRows = (payload) => {
  let value = payload;
  for (let depth = 0; depth < 6 && value && !Array.isArray(value); depth += 1) {
    value = value.$values ?? value.data ?? value.Data ?? value.items ?? value.Items ?? value.result ?? value.Result ?? value.timetableSlots ?? value.slots;
  }
  return Array.isArray(value) ? value : [];
};
const timetableDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const normalizeTimetableSlot = (row) => {
  const normalized = Object.fromEntries(Object.keys(row).map((key) => [key[0].toLowerCase() + key.slice(1), row[key]]));
  const day = Number(normalized.dayOfWeek);
  const namedDay = timetableDays.find((name) => name.toLowerCase() === String(normalized.dayName || normalized.day || "").toLowerCase());
  const period = Number(normalized.periodNumber) || Number(String(normalized.periodName || "").match(/\d+/)?.[0]);
  return { ...normalized,
    dayName: namedDay || (Number.isInteger(day) ? timetableDays[day === 7 ? 0 : day] : ""),
    periodNumber: period || null,
    periodName: normalized.periodName || (period ? `Period ${period}` : "Period"),
    isBreak: /^(true|1)$/i.test(String(normalized.isBreak)) || /break|lunch|interval/i.test(normalized.periodName || ""),
  };
};

export const getStudentWeeklyTimetable = async (student, { signal } = {}) => {
  const profile = typeof student === "object" && student ? student : { studentId: student };
  const studentId = timetableValue(profile, "studentId");
  if (!Number.isInteger(Number(studentId)) || Number(studentId) <= 0) throw new Error("Student ID unavailable.");
  const sectionId = timetableValue(profile, "sectionId");
  const academicYearId = timetableValue(profile, "academicYearId");
  if (!(Number(sectionId) > 0)) return [];
  if (!(Number(academicYearId) > 0)) throw new Error("Your academic year is not assigned. Please contact the college office.");
  // Use the same section lookup as the admin grid. The legacy student SQL
  // incorrectly uses GroupId as SectionId and can return an empty timetable.
  const response = await apiClient.get(apiEndpoints.timetable.getBySection(sectionId), {
    params: { isPublished: true, ...(Number(academicYearId) > 0 ? { academicYearId: Number(academicYearId) } : {}),
      ...(Number(timetableValue(profile, "campusId")) > 0 ? { campusId: Number(timetableValue(profile, "campusId")) } : {}) }, signal,
  });
  return timetableRows(response.data).filter((row) => {
    const published = timetableValue(row, "isPublished");
    const status = String(timetableValue(row, "status") ?? timetableValue(row, "approvalStatusName") ?? "").toLowerCase();
    if (published != null ? !/^(true|1)$/i.test(String(published)) : status && status !== "published") return false;
    return ["sectionId", "academicYearId", "campusId", "boardId", "academicLevelId", "groupId", "programId"].every((key) => {
      const expected = timetableValue(profile, key), actual = timetableValue(row, key);
      return !(Number(expected) > 0) || actual == null || String(actual) === String(expected);
    });
  }).map(normalizeTimetableSlot);
};

export const getStudentDailyTimetable = async (studentId, academicYearId, date = new Date().toISOString()) => {
  const response = await apiClient.get(studentApiEndpoints.timetable.daily(studentId), {
    params: { date, academicYearId },
  });
  const payload = getPayload(response.data);
  return Array.isArray(payload) ? payload : [];
};
