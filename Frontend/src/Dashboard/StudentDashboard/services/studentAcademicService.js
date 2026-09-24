import apiClient from "@/api/axios.js";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

const getPayload = (payload) => payload?.data ?? payload?.Data ?? payload;

export const getCurrentStudent = async () => {
  const response = await apiClient.get(studentApiEndpoints.profile.me);
  return getPayload(response.data) || {};
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
