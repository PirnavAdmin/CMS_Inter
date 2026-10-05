import apiClient from "@/api/axios.js";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

const getPayload = (payload) => payload?.data ?? payload?.Data ?? payload;

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

export const uploadCurrentStudentDocument = (documentType, file) => {
  const data = new FormData();
  data.append("documentType", documentType);
  data.append("file", file);
  return apiClient.post(studentApiEndpoints.profile.documents, data);
};

export const changeCurrentStudentPassword = (data) => apiClient.post(studentApiEndpoints.profile.changePassword, data);

export const getStudentExaminations = async (student) => {
  const params = {
    BoardId: student.boardId,
    AcademicYearId: student.academicYearId,
    AcademicLevelId: student.academicLevelId,
    GroupId: student.groupId,
    ProgramId: student.programId,
  };
  Object.keys(params).forEach((key) => {
    if (!params[key]) delete params[key];
  });

  const response = await apiClient.get(studentApiEndpoints.examinations.list, { params });
  const payload = getPayload(response.data);
  const examinations = Array.isArray(payload) ? payload : [];
  const visible = examinations.filter((exam) => ["SCHEDULED", "PUBLISHED", "COMPLETED"].includes(String(exam.status || "").trim().toUpperCase()));

  return Promise.all(visible.map(async (exam) => {
    const examinationId = exam.examinationId ?? exam.examId;
    if (!examinationId) return { ...exam, schedules: [] };
    const [detailResponse, scheduleResponse] = await Promise.all([
      apiClient.get(studentApiEndpoints.examinations.getById(examinationId)),
      apiClient.get(studentApiEndpoints.examinations.schedules(examinationId)),
    ]);
    const detail = getPayload(detailResponse.data) || {};
    const schedules = getPayload(scheduleResponse.data);
    return { ...exam, ...detail, schedules: Array.isArray(schedules) ? schedules : [] };
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
