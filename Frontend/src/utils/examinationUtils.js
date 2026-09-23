// Examination Domain Utilities & Canonical Classification Helpers

export const ensureArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined) return [];
  if (typeof val === "object") {
    if (Array.isArray(val.items)) return val.items;
    if (Array.isArray(val.data)) return val.data;
    if (Array.isArray(val.results)) return val.results;
    if (Array.isArray(val.result)) return val.result;
    if (Array.isArray(val.rooms)) return val.rooms;
    if (Array.isArray(val.halls)) return val.halls;
    if (Array.isArray(val.availableHalls)) return val.availableHalls;
    if (Array.isArray(val.$values)) return val.$values;
    if (Array.isArray(val.records)) return val.records;
    if (Array.isArray(val.schedules)) return val.schedules;
    if (Array.isArray(val.examinationSchedules)) return val.examinationSchedules;
    if (Array.isArray(val.subjects)) return val.subjects;
  }
  return [val];
};

export const unwrap = (res) => {
  if (!res) return [];
  const payload = res.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.rooms)) return payload.rooms;
  if (Array.isArray(payload?.halls)) return payload.halls;
  if (Array.isArray(payload?.availableHalls)) return payload.availableHalls;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.schedules)) return payload.schedules;
  if (Array.isArray(payload?.examinationSchedules)) return payload.examinationSchedules;
  if (Array.isArray(payload?.subjects)) return payload.subjects;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.result)) return payload.data.result;
  if (Array.isArray(payload?.data?.rooms)) return payload.data.rooms;
  if (Array.isArray(payload?.data?.halls)) return payload.data.halls;
  if (Array.isArray(payload?.data?.availableHalls)) return payload.data.availableHalls;
  if (Array.isArray(payload?.data?.schedules)) return payload.data.schedules;
  if (Array.isArray(payload?.data?.examinationSchedules)) return payload.data.examinationSchedules;
  if (Array.isArray(payload?.data?.subjects)) return payload.data.subjects;
  if (Array.isArray(payload?.data?.$values)) return payload.data.$values;
  return [];
};

export const d = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(String(value).includes("T") ? value : value + "T00:00:00"),
    )
    : "—";

export const normalizeId = (value) => String(value ?? "");
export const normalizeStatus = (value) => String(value || "").trim().toUpperCase();
export const normalizeCodePart = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const canonicalDate = (value) => (value ? String(value).split("T")[0] : "");

export const formatTimeOnly = (timeStr) => {
  if (!timeStr) return "09:00:00";
  const s = String(timeStr).trim();
  const parts = s.split(":");
  const h = (parts[0] || "09").padStart(2, "0");
  const m = (parts[1] || "00").padStart(2, "0");
  const sec = (parts[2] || "00").substring(0, 2).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const hasTimeOverlap = (startA, endA, startB, endB) => {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);
  return sA < eB && eA > sB;
};

// Invigilator count rule: 1-60 candidates requires at least 1, >60 requires at least 2
export const requiredInvigilatorCount = (candidateCount) =>
  Number(candidateCount) > 60 ? 2 : 1;

/**
 * Canonical Examination Classification:
 * Strictly two scheduling strategies:
 * 1. REGULAR   -> SUBJECT_WISE
 * 2. OBJECTIVE -> PATTERN_WISE
 */
export const isCombinedExamination = (examOrForm) => {
  if (!examOrForm) return false;
  const mode = normalizeStatus(examOrForm.scheduleMode);
  if (mode === "PATTERN_WISE" || mode === "COMBINED_OBJECTIVE") return true;
  if (mode === "SUBJECT_WISE" || mode === "REGULAR") return false;
  const cat =
    examOrForm.examCategory ||
    examOrForm.category ||
    examOrForm.examinationCategory ||
    examOrForm.exam_category ||
    examOrForm.categoryName ||
    examOrForm.rawCategory ||
    "";
  const catTrim = String(cat).trim().toLowerCase();
  if (catTrim === "objective" || catTrim === "combined" || catTrim.includes("objective")) return true;
  if (catTrim === "others" && examOrForm.customCategoryName) {
    const customLower = String(examOrForm.customCategoryName).trim().toLowerCase();
    if (customLower.includes("objective") || customLower.includes("pattern")) return true;
  }
  return false;
};

export const isRegularExamination = (examOrForm) => {
  return !isCombinedExamination(examOrForm);
};

export const getExaminationScheduleMode = (examOrForm) => {
  return isCombinedExamination(examOrForm) ? "PATTERN_WISE" : "SUBJECT_WISE";
};

export const getResolvedExamCategory = (examOrForm) => {
  if (!examOrForm) return "Regular";
  return isCombinedExamination(examOrForm) ? "Objective" : "Regular";
};

/**
 * Objective examinations must exclude language subjects.
 */
export const isLanguageSubject = (s) => {
  if (!s) return false;
  if (s.language === true || s.language === 1 || String(s.language).toLowerCase() === "true") return true;
  if (s.isLanguage === true || s.isLanguage === 1 || String(s.isLanguage).toLowerCase() === "true") return true;
  const rawType = normalizeStatus(s.subjectType || s.type || s.category);
  if (rawType === "LANGUAGE" || rawType.includes("LANGUAGE")) return true;
  const name = String(s.name || s.subjectName || "").trim().toLowerCase();
  const code = String(s.code || s.subjectCode || "").trim().toUpperCase();
  const languagePattern = /\b(english|sanskrit|telugu|hindi|urdu|french|arabic|tamil|kannada|marathi|second\s*language|first\s*language|language)\b/i;
  const codePattern = /^(ENG|SANS|SAN|TEL|HIN|URD|FRE|ARA|TAM|KAN|MAR|SL|FL|LANG)/i;
  return languagePattern.test(name) || codePattern.test(code);
};

/**
 * Scoped student counting for accurate candidate strength calculation.
 * Accepts exact schedule scope:
 * {
 *   academicLevelIds,
 *   groupId,
 *   programIds,
 *   subjectId,
 *   includedSubjectIds
 * }
 * Regular schedules: count only active students matching subject's academic level cohort + target group + selected programs.
 * Objective schedules: count active students matching target group's selected programs + examination's selected level scope.
 * Students with missing group data are rejected.
 */
export const getGroupStudents = (
  exam,
  scopeOrGroupId,
  programsList = [],
  studentsList = [],
) => {
  if (!exam) return [];

  // Support both object scope and legacy targetGroupId string
  let targetGid = "";
  let targetLevelIds = [];
  let targetProgramIds = [];

  if (typeof scopeOrGroupId === "object" && scopeOrGroupId !== null) {
    targetGid = normalizeId(scopeOrGroupId.groupId);
    targetLevelIds = ensureArray(scopeOrGroupId.academicLevelIds).map(normalizeId).filter(Boolean);
    targetProgramIds = ensureArray(scopeOrGroupId.programIds).map(normalizeId).filter(Boolean);
  } else {
    targetGid = normalizeId(scopeOrGroupId);
  }

  if (!targetGid) return [];

  // If level scope not specified directly, derive from exam
  if (targetLevelIds.length === 0) {
    targetLevelIds = ensureArray(exam.academicLevelIds || exam.levelIds || [exam.levelId])
      .map(normalizeId)
      .filter(Boolean);
  }

  // If program scope not specified directly, derive from exam groupProgramSelections
  if (targetProgramIds.length === 0) {
    let pIds = [];
    if (exam.groupProgramSelections && typeof exam.groupProgramSelections === "object" && !Array.isArray(exam.groupProgramSelections)) {
      pIds = ensureArray(exam.groupProgramSelections[targetGid] || exam.groupProgramSelections[String(targetGid)]);
    } else if (Array.isArray(exam.groupProgramSelections) && exam.groupProgramSelections.length > 0) {
      const match = exam.groupProgramSelections.find((g) => normalizeId(g.groupId) === targetGid);
      pIds = match ? ensureArray(match.programIds) : [];
    } else {
      pIds = ensureArray(exam.programIds || [exam.programId].filter(Boolean));
      pIds = pIds.filter((id) =>
        ensureArray(programsList).some(
          (p) => normalizeId(p.id) === normalizeId(id) && (!p.groupId || normalizeId(p.groupId) === targetGid),
        ),
      );
    }
    targetProgramIds = [...new Set(pIds.map(normalizeId).filter(Boolean))];
  }

  const selectedProgramObjs = ensureArray(programsList).filter((p) => targetProgramIds.includes(normalizeId(p.id)));
  const selectedProgCodes = new Set(selectedProgramObjs.map((p) => String(p.code || "").toUpperCase()).filter(Boolean));
  const selectedProgNames = new Set(selectedProgramObjs.map((p) => String(p.name || "").toLowerCase()).filter(Boolean));

  const seenStudentIds = new Set();
  return ensureArray(studentsList).filter((s) => {
    if (s.isActive === false || normalizeStatus(s.status) === "INACTIVE" || normalizeStatus(s.status) === "SUSPENDED") return false;
    const sId = normalizeId(s.id ?? s.studentId ?? s._id ?? s.admissionNo);
    if (!sId || seenStudentIds.has(sId)) return false;

    // Explicit group match: Student MUST have a valid groupId that matches targetGid
    const sGid = normalizeId(s.groupId || s.group?.id || s.courseGroupId);
    if (!sGid || sGid !== targetGid) return false;

    // Academic level match: Student MUST have a valid academic level that matches target levels
    if (targetLevelIds.length > 0) {
      const sLid = normalizeId(s.academicLevelId || s.levelId || s.academicLevel?.id);
      if (!sLid || !targetLevelIds.includes(sLid)) return false;
    }

    // Program match: If programs are specified, student MUST match one of the group's selected programs
    if (targetProgramIds.length > 0) {
      const sPid = normalizeId(s.programId || s.programmeId || s.program?.id || s.programme?.id || s.academicProgramId);
      const sPName = String(s.programName || s.programmeName || s.program?.name || "").toLowerCase();
      const sPCode = String(s.programCode || s.programmeCode || s.program?.code || "").toUpperCase();

      const matchesById = sPid && targetProgramIds.includes(sPid);
      const matchesByCode = sPCode && selectedProgCodes.has(sPCode);
      const matchesByName = sPName && selectedProgNames.has(sPName);

      if (!matchesById && !matchesByCode && !matchesByName) return false;
    }

    seenStudentIds.add(sId);
    return true;
  });
};

export const getRequiredCandidateStrength = (
  exam,
  scopeOrGroupId = null,
  programsList = [],
  isFinalizing = false,
  studentsList = [],
) => {
  if (!exam) return 0;

  if (typeof scopeOrGroupId === "object" && scopeOrGroupId !== null && scopeOrGroupId.groupId) {
    const students = getGroupStudents(exam, scopeOrGroupId, programsList, studentsList);
    return students.length;
  }

  const targetGid = scopeOrGroupId ? normalizeId(scopeOrGroupId) : null;
  const examGroupIds = targetGid
    ? [targetGid]
    : ensureArray(exam.groupIds || [exam.groupId]).map(normalizeId).filter(Boolean);

  if (!examGroupIds.length) return 0;

  let totalCandidateStrength = 0;
  for (const gid of examGroupIds) {
    const groupStudents = getGroupStudents(exam, gid, programsList, studentsList);
    totalCandidateStrength += groupStudents.length;
  }

  return totalCandidateStrength;
};

/**
 * Scope canonicalization to detect true scope changes before edit/reschedule.
 */
export const canonicalizeScope = (exam) => {
  if (!exam) return {};
  const sortArr = (arr) => ensureArray(arr).map(normalizeId).filter(Boolean).sort();
  const sortMap = (mapObj) => {
    if (!mapObj || typeof mapObj !== "object" || Array.isArray(mapObj)) return {};
    return Object.fromEntries(
      Object.entries(mapObj)
        .map(([k, v]) => [normalizeId(k), ensureArray(v).map(normalizeId).filter(Boolean).sort()])
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  };

  return {
    academicLevelIds: sortArr(exam.academicLevelIds ?? exam.levelIds ?? [exam.levelId]),
    groupIds: sortArr(exam.groupIds ?? [exam.groupId]),
    programIds: sortArr(exam.programIds ?? [exam.programId]),
    groupProgramSelections: sortMap(exam.groupProgramSelections),
    selectedSubjectIds: sortArr(exam.selectedSubjectIds),
    groupSubjectSelections: sortMap(exam.groupSubjectSelections),
    selectedGroupPatterns: Object.fromEntries(
      Object.entries(exam.selectedGroupPatterns || {})
        .map(([k, v]) => [normalizeId(k), ensureArray(v).map(String).sort()])
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
    examCategory: getResolvedExamCategory(exam),
    scheduleMode: getExaminationScheduleMode(exam),
    examPattern: String(exam.examPattern || "").trim(),
  };
};
