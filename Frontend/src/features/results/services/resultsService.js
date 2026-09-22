import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

export const getResults = async (params = {}) => {
  const response = await apiClient.get(apiEndpoints.results.list, { params });
  return toResultRecords(response.data);
};

export const processResults = async (data) => {
  const response = await apiClient.post(apiEndpoints.results.process, data);
  return unwrapPayload(response.data);
};

export const publishResults = async (data) => {
  const response = await apiClient.post(apiEndpoints.results.publish, data);
  return unwrapPayload(response.data);
};

export const getBoards = async () => {
  const response = await apiClient.get(apiEndpoints.boards.list);
  return unwrapRecords(response.data);
};

export const getGroups = async (params = {}) => {
  const response = await apiClient.get(apiEndpoints.groups.list, {
    params: { pageNumber: 1, pageSize: 100, ...params },
  });
  return unwrapRecords(response.data);
};

export const getAcademicYears = async () => {
  const response = await apiClient.get(apiEndpoints.academicYears.getAll);
  return unwrapRecords(response.data);
};

export const getAcademicLevels = async () => {
  const response = await apiClient.get(apiEndpoints.boards.academicLevels);
  return unwrapRecords(response.data);
};

export const getExaminations = async () => {
  const response = await apiClient.get(apiEndpoints.examinations.getAll);
  return unwrapRecords(response.data);
};

export const getStudentResult = async (params) => {
  const response = await apiClient.get(apiEndpoints.results.studentResult, { params });
  return unwrapPayload(response.data);
};

export const getRankList = async (params) => {
  const response = await apiClient.get(apiEndpoints.results.rankList, { params });
  return unwrapRecords(response.data);
};

export const getFailedStudents = async () => {
  const response = await apiClient.get(apiEndpoints.results.failedStudents);
  return toResultRecords(response.data);
};

export const getResultStatistics = async () => {
  const response = await apiClient.get(apiEndpoints.results.statistics);
  return unwrapPayload(response.data);
};

export const getResultAnalysis = async (params) => {
  const response = await apiClient.get(apiEndpoints.results.analysis, { params });
  return unwrapPayload(response.data);
};

export const downloadResultsExcel = (params) =>
  apiClient.get(apiEndpoints.results.exportExcel, { params, responseType: "blob" });

export const downloadResultsPdf = (params) =>
  apiClient.get(apiEndpoints.results.downloadPdf, { params, responseType: "blob" });

export const downloadStudentResultMemo = (params) =>
  apiClient.get(apiEndpoints.results.studentMemo, { params, responseType: "blob" });

export const downloadResultMemo = (studentId) =>
  apiClient.get(apiEndpoints.results.memo(studentId), { responseType: "blob" });

export const submitRevaluation = (data) =>
  apiClient.post(apiEndpoints.results.revaluation, {
    resultId: data.resultId,
    studentId: data.studentId,
    reason: data.reason,
  });

export const getRevaluation = async (revaluationId) => {
  const response = await apiClient.get(apiEndpoints.results.revaluationById(revaluationId));
  return unwrapPayload(response.data);
};

function unwrapPayload(payload) {
  return payload?.data ?? payload?.Data ?? payload;
}

function unwrapRecords(payload) {
  const data = unwrapPayload(payload);
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : Array.isArray(data?.items) ? data.items : [];
}

function toResultRecords(payload) {
  const records = unwrapRecords(payload).map(toResultRecord);
  const grouped = new Map();
  records.forEach((record) => {
    const key = `${record.studentId ?? record.id}-${record.examId ?? ""}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...record, subjects: [{ subjectId: record.subjectId, subjectName: record.subject, totalMarks: record.total, internal: record.internal, practical: record.practical, external: record.external }] });
      return;
    }
    existing.total += record.total;
    existing.maximum += record.maximum;
    existing.internal += record.internal;
    existing.practical += record.practical;
    existing.external += record.external;
    existing.subjects.push({ subjectId: record.subjectId, subjectName: record.subject, totalMarks: record.total, internal: record.internal, practical: record.practical, external: record.external });
    existing.percentage = existing.maximum ? `${((existing.total / existing.maximum) * 100).toFixed(2)}%` : "-";
  });
  return [...grouped.values()];
}

function toResultRecord(result) {
  return {
    id: result.resultId,
    resultId: result.resultId,
    studentId: result.studentId,
    boardId: result.boardId,
    academicYearId: result.academicYearId,
    academicLevelId: result.academicLevelId,
    groupId: result.groupId,
    examId: result.examId,
    name: result.studentName,
    roll: result.rollNumber,
    subject: result.subjectName,
    subjectId: result.subjectId,
    internal: result.internalMarks ?? 0,
    practical: result.practicalMarks ?? 0,
    external: result.externalMarks ?? 0,
    total: result.totalMarks ?? 0,
    grade: result.grade || "-",
    result: String(result.resultStatus || "-").toUpperCase(),
    rank: result.rank,
    isPublished: result.isPublished,
    publishedDate: result.publishedDate,
    board: result.boardName,
    academicYear: result.academicYear,
    year: result.academicYearName ?? result.academicYear,
    academicLevel: result.academicLevel,
    group: result.groupName,
    exam: result.examName,
    maximum: result.maximumMarks ?? 0,
    percentage: result.maximumMarks ? `${((result.totalMarks / result.maximumMarks) * 100).toFixed(2)}%` : "-",
    status: result.isPublished ? "Published" : "Draft",
    section: result.sectionName ?? "-",
  };
}
