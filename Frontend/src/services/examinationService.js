import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

/**
 * Normalizes payload responses from either raw arrays/objects or envelope structures:
 * { success: true, data: ... } or { items: ... } or direct array.
 */
function unwrapResponse(response) {
  const data = response?.data;
  if (data === undefined || data === null) return data;
  if (Array.isArray(data)) return data;
  if (data?.data !== undefined) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return data;
}

/**
 * 1. GET /api/v1/examinations
 * Retrieves all examinations with comprehensive academic and status filtering.
 * Params: CampusId, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId, ExamType, AssessmentTypeId, Status, SearchTerm
 */
export async function getExaminations(params = {}) {
  const queryParams = { ...params };
  // Support both camelCase and PascalCase query params seamlessly
  if (params.campusId !== undefined && params.CampusId === undefined) queryParams.CampusId = params.campusId;
  if (params.boardId !== undefined && params.BoardId === undefined) queryParams.BoardId = params.boardId;
  if (params.academicYearId !== undefined && params.AcademicYearId === undefined) queryParams.AcademicYearId = params.academicYearId;
  if (params.academicLevelId !== undefined && params.AcademicLevelId === undefined) queryParams.AcademicLevelId = params.academicLevelId;
  if (params.groupId !== undefined && params.GroupId === undefined) queryParams.GroupId = params.groupId;
  if (params.programId !== undefined && params.ProgramId === undefined) queryParams.ProgramId = params.programId;
  if (params.examType !== undefined && params.ExamType === undefined) queryParams.ExamType = params.examType;
  if (params.assessmentTypeId !== undefined && params.AssessmentTypeId === undefined) queryParams.AssessmentTypeId = params.assessmentTypeId;
  if (params.status !== undefined && params.Status === undefined) queryParams.Status = params.status;
  if (params.searchTerm !== undefined && params.SearchTerm === undefined) queryParams.SearchTerm = params.searchTerm;

  const res = await apiClient.get(apiEndpoints.examinations.list, { params: queryParams });
  return unwrapResponse(res);
}

/**
 * 2. GET /api/v1/examinations/{examinationId}
 * Retrieves examination details by unique identifier, including schedule array.
 */
export async function getExaminationById(examinationId) {
  const res = await apiClient.get(apiEndpoints.examinations.getById(examinationId));
  return unwrapResponse(res);
}

/**
 * 3. POST /api/v1/examinations
 * Creates a new examination entry.
 * Note: A valid Board (boardId) is required by backend validation.
 */
export async function createExamination(payload) {
  const res = await apiClient.post(apiEndpoints.examinations.create, payload);
  return unwrapResponse(res);
}

/**
 * 4. GET /api/v1/examinations/{examinationId}/schedules
 * Retrieves exam schedules for an examination.
 */
export async function getExaminationSchedules(examinationId) {
  const res = await apiClient.get(apiEndpoints.examinations.schedules(examinationId));
  return unwrapResponse(res);
}

/**
 * 5. GET /api/v1/examinations/{examinationId}/eligible-subjects
 * Retrieves eligible subjects and their current schedule status for an examination.
 */
export async function getEligibleSubjects(examinationId) {
  const res = await apiClient.get(apiEndpoints.examinations.eligibleSubjects(examinationId));
  return unwrapResponse(res);
}

/**
 * 6. GET /api/v1/examinations/available-halls
 * Retrieves list of available halls/rooms for an examination slot without scheduling conflicts.
 * Params: date, examDate, startTime, endTime, requiredCapacity, sectionIds, excludeScheduleId, examinationId
 */
export async function getAvailableHalls(params = {}) {
  const res = await apiClient.get(apiEndpoints.examinations.availableHalls, { params });
  return unwrapResponse(res);
}

/**
 * 7. GET /api/v1/examinations/settings
 * Retrieves the examination cell grading criteria and moderation rules.
 * Params: campusId
 */
export async function getExaminationSettings(campusId) {
  const params = campusId ? { campusId } : {};
  const res = await apiClient.get(apiEndpoints.examinations.settings, { params });
  return unwrapResponse(res);
}

/**
 * 7b. PUT /api/v1/examinations/settings
 * Saves or updates the examination cell grading criteria and moderation rules.
 * Params: campusId
 */
export async function updateExaminationSettings(campusId, payload) {
  const params = campusId ? { campusId } : {};
  const res = await apiClient.put(apiEndpoints.examinations.settings, payload, { params });
  return unwrapResponse(res);
}

/**
 * 7c. GET /api/v1/examinations/duties
 * Retrieves invigilation exam duties for a faculty/staff member or all staff members.
 * Params: staffId (integer), status (string: 'Upcoming' | 'Cancelled' | 'Completed'), campusId (integer)
 */
export async function getExamDuties(params = {}) {
  const res = await apiClient.get(apiEndpoints.examinations.duties, { params });
  return unwrapResponse(res);
}

/**
 * 8. GET /api/v1/evaluations/readiness
 * Retrieves marks evaluation readiness status for an examination and section before results processing.
 * Params: boardId, academicYearId, academicLevelId, groupId, programId, sectionId, examinationId
 */
export async function getEvaluationReadiness(params = {}) {
  const res = await apiClient.get(apiEndpoints.evaluations.readiness, { params });
  return unwrapResponse(res);
}

/**
 * 9. GET /api/v1/evaluations/export
 * Exports evaluation list and metrics to an Excel workbook (.xlsx).
 * Params: boardId, academicYearId, academicLevelId, groupId, sectionId, examinationId, format = 'xlsx'
 */
export async function exportEvaluations(params = {}) {
  const res = await apiClient.get(apiEndpoints.evaluations.export, {
    params: { format: "xlsx", ...params },
    responseType: "blob",
  });
  return res.data;
}

/**
 * 10. GET /api/v1/faculty/evaluations
 * Retrieves list of evaluations assigned to the faculty (or filterable by faculty/exam/status).
 * Params: facultyId, status, examinationStatus
 */
export async function getFacultyEvaluations(params = {}) {
  const res = await apiClient.get(apiEndpoints.evaluations.facultyEvaluations, { params });
  return unwrapResponse(res);
}

/**
 * 11. GET /api/v1/faculty/evaluations/{evaluationId}/students
 * Retrieves student marks entry sheet and maxima details for an evaluation.
 */
export async function getFacultyEvaluationStudents(evaluationId) {
  const res = await apiClient.get(apiEndpoints.evaluations.facultyStudents(evaluationId));
  return unwrapResponse(res);
}

/**
 * 12. GET /api/v1/marks/summary/{examinationId}
 * Retrieves summary statistics for entered marks in an examination.
 */
export async function getMarksSummary(examinationId) {
  const res = await apiClient.get(apiEndpoints.marks.summary(examinationId));
  return unwrapResponse(res);
}

/**
 * 13. GET /api/v1/marks/export/csv
 * Exports marks entries to CSV file.
 * Params: examinationId, subjectId
 */
export async function exportMarksCsv(params = {}) {
  const res = await apiClient.get(apiEndpoints.marks.exportCsv, {
    params,
    responseType: "blob",
  });
  return res.data;
}

/**
 * 14. GET /api/v1/results/readiness
 * Retrieves results generation readiness status (checks if exam is COMPLETED and all subject evaluations are APPROVED).
 * Params: boardId, academicYearId, academicLevelId, groupId, programId, examId, examinationId, campusId
 */
export async function getResultsReadiness(params = {}) {
  const res = await apiClient.get(apiEndpoints.results.readiness, { params });
  return unwrapResponse(res);
}

/**
 * 15. GET /api/v1/results/sections/{sectionId}
 * Retrieves section detailed student-wise result table and dynamic subject definitions for the selected section.
 * Query: examId (Required)
 */
export async function getSectionResults(sectionId, examId, additionalParams = {}) {
  const params = { examId, ...additionalParams };
  const res = await apiClient.get(apiEndpoints.results.sections(sectionId), { params });
  return unwrapResponse(res);
}

/**
 * 16. GET /api/v1/results/published
 * Retrieves all previously published examination results grouped by exam and group with section breakdown.
 * Params: boardId, academicYearId, groupId, campusId
 */
export async function getPublishedResults(params = {}) {
  const res = await apiClient.get(apiEndpoints.results.published, { params });
  return unwrapResponse(res);
}
