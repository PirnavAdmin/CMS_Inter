import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

// Keep backend GroupIds used by examinations/marks/results and validate
// their identity against Group Management's master catalog.
export const filterCatalogGroups = (masters, groups, scope = {}) => {
  const read = (row, key) => row?.[key] ?? row?.[key[0].toUpperCase() + key.slice(1)];
  const id = (row, key) => String(read(row, key) ?? "");
  const active = (row) => !["false", "0"].includes(String(read(row, "isActive") ?? "").trim().toLowerCase())
    && !["inactive", "deleted", "archived"].includes(String(read(row, "status") ?? "").trim().toLowerCase())
    && !["true", "1"].includes(String(read(row, "isDeleted") ?? "").trim().toLowerCase());
  const catalog = new Map(masters.filter((row) => active(row) && Number(id(row, "masterGroupId")) > 0
    && id(row, "boardId") === String(scope.boardId)).map((row) => [id(row, "masterGroupId"), row]));
  const levelIds = (scope.academicLevelIds ?? (scope.academicLevelId ? [scope.academicLevelId] : [])).map(String);
  const nameKey = (name) => String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const ordered = scope.levelIndependentGroups ? [...groups].sort((a, b) => {
    const priority = (row) => id(row, "groupId") === String(scope.selectedGroupId || "") ? 2 : id(row, "academicLevelId") === String(scope.academicLevelId || "") ? 1 : 0;
    return priority(b) - priority(a);
  }) : groups;
  const seen = new Set();
  return ordered.flatMap((row) => {
    const groupId = id(row, "groupId");
    let master = catalog.get(id(row, "masterGroupId"));
    // The Admission/Student list endpoint can omit MasterGroupId. In that
    // response only, accept an exact, unique name from the active catalog.
    if (!id(row, "masterGroupId") && scope.levelIndependentGroups) {
      const matches = [...catalog.values()].filter((entry) => nameKey(read(entry, "groupName")) === nameKey(read(row, "groupName")));
      if (matches.length === 1) master = matches[0];
    }
    if (!master || !active(row) || !Number.isInteger(Number(groupId)) || Number(groupId) <= 0 || seen.has(groupId)) return [];
    if (!["boardId", "academicYearId", "campusId"].every((key) => !scope[key] || !id(row, key) || id(row, key) === String(scope[key]))) return [];
    if (!scope.levelIndependentGroups && levelIds.length && !levelIds.includes(id(row, "academicLevelId"))) return [];
    const eligible = read(master, "eligibleAcademicLevels") ?? read(master, "eligibleLevels");
    if (Array.isArray(eligible) && !eligible.some((level) => active(level) && (scope.levelIndependentGroups
      ? !levelIds.length || levelIds.includes(id(level, "academicLevelId"))
      : id(level, "academicLevelId") === id(row, "academicLevelId")))) return [];
    const identity = scope.levelIndependentGroups ? "master:" + id(master, "masterGroupId") : groupId;
    if (seen.has(identity)) return [];
    const name = read(master, "groupName");
    if (!name) return [];
    seen.add(identity);
    return [{ ...row, groupId: read(row, "groupId"), masterGroupId: read(master, "masterGroupId"),
      groupName: name, boardId: read(row, "boardId"), academicYearId: read(row, "academicYearId"), academicLevelId: read(row, "academicLevelId"),
      programs: read(row, "programs") ?? [], isActive: true }];
  });
};

export const getCatalogGroups = async (scope = {}, { signal } = {}) => {
  if (!scope.boardId || !scope.academicYearId) return [];
  const responses = await Promise.all([
    apiClient.get(apiEndpoints.masterGroups.list, { params: { boardId: Number(scope.boardId) }, signal }),
    apiClient.get(scope.levelIndependentGroups ? apiEndpoints.groups.list : apiEndpoints.groups.getByBoard(scope.boardId), { params: {
      ...(scope.levelIndependentGroups ? { boardId: scope.boardId } : {}),
      academicYearId: scope.academicYearId, ...(!scope.levelIndependentGroups && scope.academicLevelId ? { academicLevelId: scope.academicLevelId } : {}), isActive: true,
    }, signal }),
  ]);
  responses.forEach((response) => {
    if (response.data?.success === false) throw new Error(response.data.message || "Unable to load groups.");
  });
  const rows = (payload) => {
    let current = payload;
    for (let depth = 0; depth < 6; depth += 1) {
      if (Array.isArray(current)) return current;
      if (!current || typeof current !== "object") break;
      if (current.success === false) throw new Error(current.message || "Unable to load groups.");
      current = current.data ?? current.Data ?? current.items ?? current.Items ?? current.results ?? current.Results ?? current.$values ?? current.groups ?? current.Groups;
    }
    throw new Error("The group API returned an invalid list response.");
  };
  return filterCatalogGroups(rows(responses[0].data), rows(responses[1].data), scope);
};

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

export const getPublishedResults = async (params = {}) => {
  const response = await apiClient.get(apiEndpoints.results.published, { params });
  return unwrapPayload(response.data);
};

export const getResultsReadiness = async (params = {}) => {
  const response = await apiClient.get(apiEndpoints.results.readiness, { params });
  return unwrapPayload(response.data);
};

export const getSectionResults = async (sectionId, examId, params = {}) => {
  const response = await apiClient.get(apiEndpoints.results.sections(sectionId), {
    params: { examId, ...params },
  });
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
