// Pure examination rules. Missing persistence is deliberately kept missing.
export const pageConfig = {
  title: "Examination Center",
  subtitle: "Manage examinations, scheduling and review.",
  breadcrumb: ["Examinations"],
};
export const id = (value) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0 ? String(Number(value)) : "";
export const ids = (values) =>
  [...new Set((Array.isArray(values) ? values : []).map(id).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b),
  );
export const body = (response) => {
  let value = response?.data ?? response;
  for (let depth = 0; depth < 4 && value && !Array.isArray(value); depth++) {
    if (value.data !== undefined || value.Data !== undefined) value = value.data ?? value.Data;
    else break;
  }
  return value;
};
export const rows = (response) => {
  const value = body(response);
  if (Array.isArray(value)) return value;
  const list = value?.items ?? value?.Items ?? value?.records ?? value?.schedules;
  if (!Array.isArray(list)) throw new Error("The backend returned an invalid list response.");
  return list;
};
export const day = (value) => String(value ?? "").split("T")[0];
export const time = (value) => String(value ?? "").slice(0, 5);
export const mapIds = (value, property) => {
  if (Array.isArray(value))
    return Object.fromEntries(value.map((entry) => [id(entry.groupId), ids(entry[property])]));
  return Object.fromEntries(Object.entries(value || {}).map(([key, list]) => [key, ids(list)]));
};
export function strategy(exam) {
  const category = String(exam?.examCategory ?? "").toUpperCase();
  const mode = String(exam?.scheduleMode ?? "").toUpperCase();
  const resolved =
    category === "REGULAR" ? "SUBJECT_WISE" : category === "OBJECTIVE" ? "PATTERN_WISE" : "";
  if (category && !resolved) return "";
  if (resolved && mode && mode !== resolved) return "";
  return resolved || (["SUBJECT_WISE", "PATTERN_WISE"].includes(mode) ? mode : "");
}
export function normalizeExam(raw) {
  return {
    ...raw,
    id: id(raw.examinationId ?? raw.examId ?? raw.id),
    name: raw.examName ?? raw.name ?? "",
    code: raw.examCode ?? "",
    boardId: id(raw.boardId),
    yearId: id(raw.academicYearId),
    levelIds: ids(raw.academicLevelIds ?? [raw.academicLevelId]),
    groupIds: ids(raw.groupIds ?? [raw.groupId]),
    programIds: ids(raw.programIds ?? [raw.programId]),
    selectedSubjectIds: ids(raw.selectedSubjectIds ?? raw.allocatedSubjectIds),
    groupProgramSelections: mapIds(raw.groupProgramSelections, "programIds"),
    groupSubjectSelections: mapIds(raw.groupSubjectSelections, "subjectIds"),
    selectedGroupPatterns: raw.selectedGroupPatterns ?? {},
    startDate: day(raw.startDate),
    endDate: day(raw.endDate),
    status: String(raw.status ?? "").toUpperCase(),
    // Do not infer category, scope, pattern or selected subjects from saved rows.
    configurationFields: Object.keys(raw),
  };
}
export function normalizeSchedule(raw) {
  const assignments = Array.isArray(raw.hallAssignments)
    ? raw.hallAssignments.map((hall) => ({
        hallId: id(hall.hallId),
        hallName: hall.hallName ?? "",
        candidateCount: Number(hall.candidateCount),
        invigilatorIds: ids(hall.invigilatorIds),
      }))
    : [];
  return {
    ...raw,
    id: id(raw.examScheduleId ?? raw.examinationScheduleId ?? raw.id),
    examId: id(raw.examinationId),
    groupId: id(raw.groupId),
    academicLevelId: id(raw.academicLevelId),
    subjectId: id(raw.subjectId),
    includedSubjectIds: ids(raw.includedSubjectIds),
    date: day(raw.examDate),
    startTime: time(raw.startTime),
    endTime: time(raw.endTime),
    roomId: id(raw.roomId),
    invigilatorId: id(raw.invigilatorId),
    hallAssignments: assignments,
    candidateCount: raw.candidateCount == null ? null : Number(raw.candidateCount),
    combinedConfigurationVerified:
      raw.scheduleMode === "PATTERN_WISE" &&
      Boolean(
        id(raw.groupId) &&
        raw.patternName &&
        ids(raw.includedSubjectIds).length &&
        assignments.length &&
        assignments.every((a) => a.hallId && a.candidateCount > 0 && a.invigilatorIds.length),
      ),
  };
}
export function normalizeSubject(raw) {
  return {
    ...raw,
    id: id(raw.subjectId),
    name: raw.subjectName ?? "",
    groupId: id(raw.groupId),
    academicLevelId: id(raw.academicLevelId),
    boardId: id(raw.boardId),
    language:
      raw.language === true || String(raw.subjectType).toLowerCase() === "language"
        ? true
        : raw.language === false
          ? false
          : undefined,
  };
}
export const isEligibleSubject = (subject, scope, objective = false) =>
  subject.isActive === true &&
  subject.boardId === id(scope.boardId) &&
  subject.groupId === id(scope.groupId) &&
  subject.academicLevelId === id(scope.academicLevelId) &&
  (!objective || (!subject.language && subject.language !== undefined));
export function configurationIssues(exam) {
  const issues = [];
  if (!strategy(exam))
    issues.push("Exam category / scheduling strategy is missing or inconsistent.");
  if (!exam.levelIds?.length || !exam.groupIds?.length)
    issues.push("Academic level or group scope is missing.");
  for (const gid of exam.groupIds || []) {
    if (!exam.groupProgramSelections?.[gid]?.length)
      issues.push(`Group ${gid}: selected programs were not returned.`);
    for (const lid of exam.levelIds || []) {
      if (!exam.groupSubjectSelections?.[`${lid}:${gid}`]?.length)
        issues.push(`Level ${lid}, group ${gid}: selected subjects were not returned.`);
    }
    if (strategy(exam) === "PATTERN_WISE" && exam.selectedGroupPatterns?.[gid]?.length !== 1)
      issues.push(`Group ${gid}: one persisted Objective pattern is required.`);
  }
  return issues;
}
export function requirements(exam) {
  if (configurationIssues(exam).length) return [];
  const result = [];
  for (const gid of exam.groupIds) {
    if (strategy(exam) === "PATTERN_WISE") {
      result.push({
        key: `${exam.id}:PATTERN_WISE:${gid}:${exam.levelIds.join(",")}:${exam.selectedGroupPatterns[gid][0]}`,
        groupId: gid,
        levelIds: exam.levelIds,
        patternName: exam.selectedGroupPatterns[gid][0],
        includedSubjectIds: ids(
          exam.levelIds.flatMap((lid) => exam.groupSubjectSelections[`${lid}:${gid}`]),
        ),
        scheduleMode: "PATTERN_WISE",
      });
    } else
      for (const lid of exam.levelIds)
        for (const sid of exam.groupSubjectSelections[`${lid}:${gid}`]) {
          result.push({
            key: `${exam.id}:SUBJECT_WISE:${lid}:${gid}:${sid}`,
            groupId: gid,
            academicLevelId: lid,
            levelIds: [lid],
            subjectId: sid,
            includedSubjectIds: [sid],
            scheduleMode: "SUBJECT_WISE",
          });
        }
  }
  return result;
}
export function candidateCount(students, exam, session) {
  const programs = ids(exam.groupProgramSelections?.[session.groupId]);
  if (!programs.length || !session.levelIds?.length) return null;
  return new Set(
    students
      .filter(
        (s) =>
          s.isActive === true &&
          id(s.groupId) === id(session.groupId) &&
          session.levelIds.includes(id(s.academicLevelId)) &&
          programs.includes(id(s.programId)),
      )
      .map((s) => id(s.studentId))
      .filter(Boolean),
  ).size;
}
export const overlaps = (a, b) =>
  a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;
export const hallIds = (s) =>
  ids(s.hallAssignments?.length ? s.hallAssignments.map((a) => a.hallId) : [s.roomId]);
export const facultyIds = (s) =>
  ids(
    s.hallAssignments?.length
      ? s.hallAssignments.flatMap((a) => a.invigilatorIds)
      : [s.invigilatorId],
  );
export function availableForDraft(options, schedules, entry, kind) {
  const used = new Set(
    schedules
      .filter((s) => s.id !== entry.id && overlaps(s, entry))
      .flatMap(kind === "hall" ? hallIds : facultyIds),
  );
  return options.filter((option) => !used.has(option.id));
}
export const requiredInvigilators = (count) => (Number(count) > 60 ? 2 : 1);
export function allocate(count, halls, faculty) {
  if (!Number.isInteger(count) || count <= 0)
    throw new Error("A confirmed positive candidate count is required.");
  let remaining = count,
    cursor = 0;
  const allocations = [];
  for (const hall of halls) {
    if (!remaining) break;
    const seats = Math.min(remaining, Number(hall.capacity));
    if (!(seats > 0)) continue;
    const needed = requiredInvigilators(seats);
    if (faculty.length - cursor < needed) continue;
    allocations.push({
      hallId: hall.id,
      candidateCount: seats,
      invigilatorIds: faculty.slice(cursor, cursor + needed).map((f) => f.id),
    });
    cursor += needed;
    remaining -= seats;
  }
  if (remaining)
    throw new Error(
      "Insufficient available hall capacity or invigilators. No allocation was saved.",
    );
  return allocations;
}
export function validateAllocation(entry, count, halls, faculty, schedules) {
  const issues = [],
    seenHalls = new Set(),
    seenFaculty = new Set();
  if (!entry.date || !entry.startTime || !entry.endTime || entry.startTime >= entry.endTime)
    issues.push("Select a valid date and time interval.");
  const allowedHalls = availableForDraft(halls, schedules, entry, "hall"),
    allowedFaculty = availableForDraft(faculty, schedules, entry, "faculty");
  let allocated = 0;
  for (const assignment of entry.hallAssignments || []) {
    const hall = allowedHalls.find((h) => h.id === assignment.hallId),
      number = Number(assignment.candidateCount);
    if (!hall || seenHalls.has(assignment.hallId)) issues.push("Select distinct available halls.");
    if (!Number.isInteger(number) || number <= 0 || number > Number(hall?.capacity))
      issues.push("Candidate allocation must be positive and within hall capacity.");
    if (ids(assignment.invigilatorIds).length < requiredInvigilators(number))
      issues.push(`Hall requires ${requiredInvigilators(number)} invigilator(s).`);
    seenHalls.add(assignment.hallId);
    allocated += number;
    for (const fid of assignment.invigilatorIds) {
      if (!allowedFaculty.some((f) => f.id === fid) || seenFaculty.has(fid))
        issues.push(
          "Each hall needs distinct available invigilators who do not teach its subjects.",
        );
      seenFaculty.add(fid);
    }
  }
  if (!(count > 0) || allocated !== count)
    issues.push("Allocate every confirmed candidate exactly once across halls.");
  return [...new Set(issues)];
}
export function canonical(value) {
  if (Array.isArray(value))
    return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return typeof value === "number" ? String(value) : value;
}
export const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const scopeOf = (exam) =>
  Object.fromEntries(
    [
      "levelIds",
      "groupIds",
      "programIds",
      "groupProgramSelections",
      "selectedSubjectIds",
      "groupSubjectSelections",
      "selectedGroupPatterns",
      "examCategory",
      "scheduleMode",
      "examPattern",
    ].map((key) => [key, exam[key]]),
  );
export function verifyExam(expected, actual) {
  const issues = configurationIssues(actual);
  for (const key of [
    "name",
    "boardId",
    "yearId",
    "startDate",
    "endDate",
    "description",
    "examType",
    "assessmentTypeId",
    "status",
    ...Object.keys(scopeOf(expected)),
  ])
    if (!same(expected[key] ?? "", actual[key] ?? "")) issues.push(`${key} did not round-trip.`);
  return [...new Set(issues)];
}
export function matchesRequirement(row, requirement) {
  return (
    row.groupId === requirement.groupId &&
    row.scheduleMode === requirement.scheduleMode &&
    (requirement.scheduleMode === "PATTERN_WISE"
      ? row.patternName === requirement.patternName &&
        same(row.includedSubjectIds, requirement.includedSubjectIds)
      : row.academicLevelId === requirement.academicLevelId &&
        row.subjectId === requirement.subjectId)
  );
}
export function readiness(exam, schedules, resources = {}) {
  const errors = configurationIssues(exam);
  for (const req of requirements(exam)) {
    const matching = schedules.filter((row) => matchesRequirement(row, req));
    if (matching.length !== 1) {
      errors.push(`${req.key}: one persisted session is required.`);
      continue;
    }
    const row = matching[0];
    if (!row.id || !row.hallAssignments.length || !(row.candidateCount > 0))
      errors.push(`${req.key}: persisted halls or candidate counts are missing.`);
    if (req.scheduleMode === "PATTERN_WISE" && !row.combinedConfigurationVerified)
      errors.push(`${req.key}: Objective configuration is unverified.`);
    if (
      !row.date ||
      !row.startTime ||
      !row.endTime ||
      row.startTime >= row.endTime ||
      row.date < exam.startDate ||
      row.date > exam.endDate
    )
      errors.push(`${req.key}: invalid date/time.`);
    if (!resources.halls || !resources.faculty || !resources.students || !resources.subjects)
      errors.push(
        `${req.key}: refresh candidate, subject and resource validation data before finalization.`,
      );
    else {
      const strength = candidateCount(resources.students, exam, req);
      errors.push(
        ...validateAllocation(row, strength, resources.halls, resources.faculty, schedules),
      );
      if (row.candidateCount !== strength)
        errors.push(`${req.key}: persisted candidate count differs from the scoped roster.`);
      if (
        req.scheduleMode === "PATTERN_WISE" &&
        req.includedSubjectIds.some(
          (sid) => resources.subjects.find((subject) => subject.id === sid)?.language !== false,
        )
      )
        errors.push(`${req.key}: Objective subjects must be confirmed non-language subjects.`);
    }
  }
  const objective = schedules.filter((s) => s.scheduleMode === "PATTERN_WISE");
  if (
    objective.some(
      (s) =>
        !same(
          [s.date, s.startTime, s.endTime],
          [objective[0].date, objective[0].startTime, objective[0].endTime],
        ),
    )
  )
    errors.push("All Objective sessions must share one date and time.");
  return errors;
}
// These are audited server limitations, not inferred from a failed request.
export const CONTRACT_BLOCKERS = [
  "The examination API stores only one academic level, group and program. Per-group programs, subjects and patterns are not persisted.",
  "Examination GET omits examCategory, scheduleMode and selectedSubjectIds. Required sessions cannot be verified after refresh.",
  "Schedule GET omits group/level, pattern, included subjects, candidate counts and hall assignments. POST ignores hallAssignments; PUT cannot update them.",
  "Bulk schedule creation is sequential, not transactional. Multi-hall / multi-group Objective scheduling cannot be saved atomically.",
];
export function creationBlockers(form) {
  const issues = [];
  if (form.levelIds.length > 1 || form.groupIds.length > 1 || form.programIds.length > 1)
    issues.push(CONTRACT_BLOCKERS[0]);
  if (strategy(form) === "PATTERN_WISE")
    issues.push(
      "Objective configuration cannot be persisted by the current API. Creation is blocked to avoid losing the selected pattern and subjects.",
    );
  return issues;
}
export function examinationPayload(form) {
  if (creationBlockers(form).length) throw new Error(creationBlockers(form).join(" "));
  return {
    examName: form.name.trim(),
    boardId: Number(form.boardId),
    academicYearId: Number(form.yearId),
    academicLevelIds: form.levelIds.map(Number),
    groupIds: form.groupIds.map(Number),
    programIds: form.programIds.map(Number),
    selectedSubjectIds: form.selectedSubjectIds.map(Number),
    examCategory: form.examCategory,
    scheduleMode: strategy(form),
    examType: form.examType,
    assessmentTypeId: Number(form.assessmentTypeId),
    examPattern: form.examPattern,
    startDate: form.startDate,
    endDate: form.endDate,
    description: form.description,
    status: form.status || "DRAFT",
  };
}
