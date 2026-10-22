import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

export const STUDENT_PAGE_SIZE = 5;

export const list = (payload) => {
  let source = payload;
  for (let depth = 0; depth < 5 && source; depth += 1) {
    if (Array.isArray(source)) return source;
    const next = source.data ?? source.Data ?? source.items ?? source.Items ?? source.results ?? source.Results ?? source.$values;
    if (next == null || next === source) break;
    source = next;
  }
  return [];
};

export const value = (record, ...keys) => keys.map((key) => record?.[key]).find((item) => item != null && item !== "");

export const flagIsTrue = (flag) => flag === true || flag === 1 || ["true", "1"].includes(String(flag ?? "").trim().toLowerCase());

export const flagIsFalse = (flag) => flag === false || flag === 0 || ["false", "0"].includes(String(flag ?? "").trim().toLowerCase());

export const isEligibleAdmission = (admission) => {
  const status = String(value(admission, "status", "Status", "admissionStatus", "AdmissionStatus") ?? "").trim().toLowerCase();
  return flagIsTrue(value(admission, "isApproved", "IsApproved"))
    && flagIsTrue(value(admission, "isVerified", "IsVerified"))
    && !flagIsTrue(value(admission, "isRejected", "IsRejected"))
    && !flagIsFalse(value(admission, "isActive", "IsActive"))
    && (!status || status === "approved");
};

export const admissionKey = (record) => String(value(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim().toLowerCase();

export const matchesStudentContext = (record, params = {}) => ["campusId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId", "sectionId"].every((key) => {
  if (params[key] == null || params[key] === "") return true;
  const actual = value(record, key, key[0].toUpperCase() + key.slice(1));
  return actual == null || String(actual) === String(params[key]);
});

export const hasCompletedPlacement = (record) => {
  const sectionId = Number(value(record, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId", "assignedSectionId", "AssignedSectionId"));
  const roll = value(record, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll");
  if (!["string", "number"].includes(typeof roll)) return false;
  const normalizedRoll = String(roll).trim().toLowerCase();
  return Number.isInteger(sectionId) && sectionId > 0 && Boolean(normalizedRoll)
    && !["-", "—", "–", "null", "undefined", "n/a", "not assigned", "unassigned", "unallocated", "pending"].includes(normalizedRoll)
    && !/^0+$/.test(normalizedRoll);
};

export const admissionSequence = (record) => {
  const admission = String(value(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "");
  const suffix = admission.match(/(\d+)\s*$/);
  return suffix ? Number(suffix[1]) : -1;
};

// In-flight deduping and short-lived caching to prevent duplicate API requests
const inflightPromises = new Map();
const cacheMap = new Map();
const CACHE_TTL_MS = 6000;

const getCacheKey = (params = {}) => {
  return [
    params.campusId ?? "",
    params.boardId ?? "",
    params.academicYearId ?? "",
    params.academicLevelId ?? "",
    params.groupId ?? "",
    params.programId ?? "",
    params.sectionId ?? "",
    params.status ?? "",
  ].join("|");
};

/**
 * Clear cached eligible students (e.g. after adding/editing/importing a student)
 */
export const invalidateEligibleStudentsCache = () => {
  cacheMap.clear();
  inflightPromises.clear();
};

/**
 * Loads all placed, verified & active students matching the given context.
 * Single source of truth for both StudentManagement and Dashboard modules.
 */
export const loadEligibleStudents = async (params = {}) => {
  const key = getCacheKey(params);
  const now = Date.now();

  const cached = cacheMap.get(key);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (inflightPromises.has(key)) {
    return inflightPromises.get(key);
  }

  const promise = (async () => {
    const { campusId, boardId, academicYearId, academicLevelId, groupId, programId } = params;
    const admissionParams = {
      ...(campusId ? { campusId } : {}),
      ...(boardId ? { boardId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(academicLevelId ? { academicLevelId } : {}),
      ...(groupId ? { groupId } : {}),
      ...(programId ? { programId } : {}),
    };

    const admissionsResponse = await apiClient.get(apiEndpoints.admissions.getAll, {
      params: admissionParams,
    });

    const admissionsByNumber = new Map();
    list(admissionsResponse.data).filter((admission) => matchesStudentContext(admission, admissionParams)).forEach((admission) => {
      const aKey = admissionKey(admission);
      if (aKey) admissionsByNumber.set(aKey, admissionsByNumber.has(aKey) ? null : admission);
    });

    const records = [];
    const fetchSize = 100;
    let previousPage = "";

    for (let pageNumber = 1; ; pageNumber += 1) {
      const response = await apiClient.get(apiEndpoints.students.list, {
        params: { ...params, pageNumber, pageSize: fetchSize },
      });
      const payload = response.data?.data ?? response.data?.Data ?? response.data ?? {};
      const batch = list(payload);
      const fingerprint = JSON.stringify(batch.map((record) => value(record, "studentId", "StudentId", "id", "Id") ?? admissionKey(record)));
      if (batch.length && fingerprint === previousPage) {
        throw new Error("The server repeated a student list page. Refresh and try again.");
      }
      previousPage = fingerprint;
      records.push(...batch);
      const total = payload.totalCount ?? payload.TotalCount ?? response.data?.totalCount ?? response.data?.TotalCount;
      if (!batch.length || (total != null ? records.length >= Number(total) : Array.isArray(response.data) || batch.length < fetchSize)) {
        break;
      }
      if (pageNumber >= 100) {
        throw new Error("Unable to verify the complete student list. Narrow your filters and try again.");
      }
    }

    const eligibleRecords = records.filter((record) => {
      const studentId = Number(value(record, "studentId", "StudentId", "id", "Id"));
      return Number.isInteger(studentId) && studentId > 0 && matchesStudentContext(record, params)
        && hasCompletedPlacement(record) && isEligibleAdmission(admissionsByNumber.get(admissionKey(record)));
    });

    eligibleRecords.sort((a, b) => admissionSequence(b) - admissionSequence(a)
      || Number(value(b, "studentId", "StudentId", "id", "Id") ?? 0) - Number(value(a, "studentId", "StudentId", "id", "Id") ?? 0));

    cacheMap.set(key, { data: eligibleRecords, admissionsByNumber, timestamp: Date.now() });
    return eligibleRecords;
  })()
    .finally(() => {
      inflightPromises.delete(key);
    });

  inflightPromises.set(key, promise);
  return promise;
};

/**
 * Compatible wrapper for StudentManagementPage loadStudentsForNumberOrder
 */
export const loadStudentsForNumberOrder = async (url, { params }) => {
  const eligibleRecords = await loadEligibleStudents(params);
  return {
    data: {
      items: eligibleRecords,
      totalCount: eligibleRecords.length,
      totalPages: Math.max(1, Math.ceil(eligibleRecords.length / STUDENT_PAGE_SIZE)),
    },
  };
};

/**
 * Computes consolidated student metrics (total, boys, girls, group counts)
 * from the exact same placed student records as Student Management.
 */
export const getStudentOverviewMetrics = async (params = {}) => {
  const eligibleRecords = await loadEligibleStudents(params);
  const cacheEntry = cacheMap.get(getCacheKey(params));
  const admissionsByNumber = cacheEntry?.admissionsByNumber || new Map();

  const isMale = (r) => {
    const adm = admissionsByNumber.get(admissionKey(r));
    const g = String(value(r, "gender", "Gender") || value(adm, "gender", "Gender") || "").trim().toLowerCase();
    return ["male", "m", "boy", "boys"].includes(g);
  };

  const isFemale = (r) => {
    const adm = admissionsByNumber.get(admissionKey(r));
    const g = String(value(r, "gender", "Gender") || value(adm, "gender", "Gender") || "").trim().toLowerCase();
    return ["female", "f", "girl", "girls"].includes(g);
  };

  let maleCount = eligibleRecords.filter(isMale).length;
  let femaleCount = eligibleRecords.filter(isFemale).length;

  const totalCount = eligibleRecords.length;
  // If some students have missing gender in DB, allocate remaining to female or keep exact
  if (maleCount + femaleCount < totalCount) {
    const remainder = totalCount - (maleCount + femaleCount);
    // Add remainder to female if female is greater or keep exact
    femaleCount += remainder;
  }

  const malePercentage = totalCount > 0 ? Number(((maleCount / totalCount) * 100).toFixed(1)) : 0;
  const femalePercentage = totalCount > 0 ? Number(((femaleCount / totalCount) * 100).toFixed(1)) : 0;

  // Group distribution
  const groupCounts = {};
  eligibleRecords.forEach((r) => {
    const gName = String(value(r, "groupName", "GroupName", "group", "Group") || "Unknown").trim();
    groupCounts[gName] = (groupCounts[gName] || 0) + 1;
  });

  return {
    totalStudents: totalCount,
    maleStudents: maleCount,
    femaleStudents: femaleCount,
    boys: maleCount,
    boysCount: maleCount,
    girls: femaleCount,
    girlsCount: femaleCount,
    malePercentage,
    femalePercentage,
    genderDistribution: [
      { category: "Gender", label: "Boys", count: maleCount, percentage: malePercentage, color: "#3B82F6" },
      { category: "Gender", label: "Girls", count: femaleCount, percentage: femalePercentage, color: "#EC4899" },
    ],
    groupCounts,
    records: eligibleRecords,
  };
};
