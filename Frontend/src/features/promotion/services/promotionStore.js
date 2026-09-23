import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null));
const requestOptions = { timeout: 20000, skipGlobalLoader: true };
const id = (value) => String(value ?? "");

// Normalize casing and envelopes once, without synthesizing missing business data.
export function normalizePromotionData(value) {
  if (Array.isArray(value)) return value.map(normalizePromotionData);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key[0].toLowerCase() + key.slice(1),
      normalizePromotionData(item),
    ]),
  );
}
const body = (response) => {
  const data = normalizePromotionData(response.data);
  return data?.data ?? data;
};
export function promotionList(data) {
  if (Array.isArray(data)) return data;
  for (const key of ["data", "items", "records", "students", "details", "$values"]) {
    if (data?.[key] != null) return promotionList(data[key]);
  }
  throw new Error("The server returned an invalid list. Please retry.");
}
const get = async (url, params, signal) =>
  body(await apiClient.get(url, { ...requestOptions, params: cleanParams(params), signal }));
const post = async (url, payload) =>
  body(await apiClient.post(url, payload, { ...requestOptions, timeout: 30000 }));
const patch = async (url, payload) => body(await apiClient.patch(url, payload, requestOptions));

// Both eligibility routes map to PromotionsController.GetEligible. Use one alias only.
export const getEligibleStudents = (params, signal) =>
  get(apiEndpoints.promotions.eligibleStudents, params, signal);
export const previewPromotion = (payload) => post(apiEndpoints.promotions.preview, payload);
export const promoteStudents = (payload) => post(apiEndpoints.promotions.create, payload);
export const promoteSingleStudent = (studentId, payload) =>
  post(apiEndpoints.promotions.student(studentId), payload);
export const allocateProgram = (payload) =>
  patch(apiEndpoints.promotions.programAllocation, payload);
export const allocateSection = (payload) =>
  patch(apiEndpoints.promotions.sectionAllocation, payload);
export const allocateGroup = (payload) => patch(apiEndpoints.promotions.groupAllocation, payload);
export const getPromotionHistory = (params, signal) =>
  get(apiEndpoints.promotions.history, params, signal);
export const rollbackPromotion = (payload) => post(apiEndpoints.promotions.rollback, payload);
export const getPromotionReport = (params, signal) =>
  get(apiEndpoints.promotions.report, params, signal);

export const isPromotionEligible = (student) =>
  typeof student?.eligibilityStatus === "string" &&
  student.eligibilityStatus.trim().toLowerCase() === "eligible";
export const isFinalPromotionLevel = (label = "") =>
  /\b(?:2nd|second)\s+(?:year|puc)\b/i.test(label);
export function nextPromotionLevel(levels, sourceId) {
  const source = levels.find((level) => level.value === id(sourceId));
  if (!source || isFinalPromotionLevel(source.label)) return "";
  const signature = (label) =>
    label
      .toLowerCase()
      .replace(/\bfirst\b/g, "1")
      .replace(/\bsecond\b/g, "2")
      .replace(/(\d+)(st|nd|rd|th)\b/g, "$1");
  const current = signature(source.label);
  const number = current.match(/\d+/);
  if (!number) return "";
  const next = current.replace(/\d+/, String(Number(number[0]) + 1));
  return levels.find((level) => signature(level.label) === next)?.value ?? "";
}
export function nextPromotionYear(years, sourceId, boardId) {
  const source = years.find((year) => year.value === id(sourceId));
  const start = source?.label.match(/^(\d{4})\s*[-/]\s*\d{4}$/)?.[1];
  if (!start) return null;
  return (
    years.find(
      (year) =>
        Number(year.label.match(/^(\d{4})\s*[-/]/)?.[1]) === Number(start) + 1 &&
        (!year.boardId || year.boardId === id(boardId)),
    ) ?? null
  );
}
const option = (row, idKey, labelKey) => ({
  ...row,
  value: id(row[idKey] ?? row.id),
  label: row[labelKey] ?? row.name ?? "",
});
export function normalizeSection(row) {
  const sectionId = id(row.sectionId ?? row.id);
  const sectionName = row.sectionName ?? row.name ?? "";
  return {
    ...row,
    id: sectionId,
    value: sectionId,
    label: sectionName,
    sectionId,
    sectionName,
    ...Object.fromEntries(
      ["boardId", "academicYearId", "academicLevelId", "groupId", "programId"].map((key) => [
        key,
        id(row[key]),
      ]),
    ),
  };
}
export function matchesSectionScope(section, scope) {
  // The repository has permissive year/level/group predicates. Enforce exact IDs
  // on the scoped response so another year's section cannot become a destination.
  return (
    section.isActive === true &&
    ["boardId", "academicYearId", "academicLevelId", "groupId", "programId"].every(
      (key) => section[key] === id(scope[key]),
    )
  );
}
export async function getPromotionOptions(kind, scope = {}) {
  if (kind === "years") {
    const rows = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = normalizePromotionData(
        (
          await apiClient.get(apiEndpoints.academicYears.list, {
            ...requestOptions,
            params: { PageNumber: page, PageSize: 100 },
          })
        ).data,
      );
      rows.push(...promotionList(response));
      totalPages = response.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return rows.map((row) => ({
      ...option(row, "academicYearId", "academicYearName"),
      boardId: id(row.boardId),
    }));
  }
  if (kind === "levels")
    return promotionList(
      await get(apiEndpoints.boards.academicLevels, { boardId: scope.boardId }),
    ).map((row) => option(row, "academicLevelId", "levelName"));
  if (kind === "groups")
    return promotionList(await get(apiEndpoints.groups.list, { ...scope, isActive: true })).map(
      (row) => option(row, "groupId", "groupName"),
    );
  if (kind === "programs")
    return promotionList(await get(apiEndpoints.groups.programs(scope.groupId)))
      .filter((row) => row.isActive !== false)
      .map((row) => option(row, "programId", "programName"));
  if (kind === "sections") {
    const params = {
      BoardId: Number(scope.boardId),
      AcademicYearId: Number(scope.academicYearId),
      AcademicLevelId: Number(scope.academicLevelId),
      GroupId: Number(scope.groupId),
      ProgramId: Number(scope.programId),
      IsActive: true,
    };
    return promotionList(await get(apiEndpoints.sections.list, params))
      .map(normalizeSection)
      .filter((section) => section.value && matchesSectionScope(section, scope));
  }
  throw new Error("Unknown promotion master data.");
}
export async function getAllocationStudents(scope, signal) {
  // Student search supports year/board/level/group/section, but not ProgramId.
  // Its repository also omits AcademicLevelId; validate returned IDs locally.
  const rows = promotionList(
    await get(
      apiEndpoints.students.search,
      {
        boardId: Number(scope.boardId),
        academicYearId: Number(scope.academicYearId),
        academicLevelId: Number(scope.academicLevelId),
        groupId: Number(scope.groupId),
        sectionId: scope.sectionId ? Number(scope.sectionId) : undefined,
        isActive: true,
      },
      signal,
    ),
  );
  return rows.filter(
    (row) =>
      row.isActive === true &&
      ["academicLevelId", "groupId", "programId"].every((key) => id(row[key]) === id(scope[key])) &&
      (!scope.sectionId || id(row.sectionId) === id(scope.sectionId)),
  );
}
export function promotionError(error, action = "complete the request") {
  const status = error?.response?.status;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "Your account does not have permission to perform this action.";
  if (status === 404)
    return `Unable to ${action}: the requested endpoint or record was not found (404).`;
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code))
    return `The request to ${action} timed out. Refresh the data before retrying a save.`;
  if ([400, 409, 422].includes(status)) return `Validation: ${getApiErrorMessage(error)}`;
  if (status >= 500)
    return `Unable to ${action}: server error (${status}). ${getApiErrorMessage(error)}`;
  if (error?.code === "ERR_NETWORK")
    return `Unable to ${action}: check your network connection and retry.`;
  return getApiErrorMessage(error);
}

export default {
  getEligibleStudents,
  previewPromotion,
  promoteStudents,
  promoteSingleStudent,
  allocateProgram,
  allocateSection,
  allocateGroup,
  getPromotionHistory,
  rollbackPromotion,
  getPromotionReport,
};
