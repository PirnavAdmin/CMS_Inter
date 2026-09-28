import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Eye, Pencil, Plus, RefreshCw } from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import { StatusBadge, Toast, Modal } from "../common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import "./ExaminationPage.css";
function getApiErrorMessage(error, fallback = "Unable to complete the request. Please retry.") {
  const status = error?.response?.status;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission for this action.";
  if (status === 409)
    return "The selected hall or invigilator is no longer available. Refresh availability and choose again.";
  // Internal SQL/provider details must never be rendered by this module.
  if (!error?.response && error?.isUserFacing) return error.message;
  return fallback;
}
function userError(message) {
  return Object.assign(new Error(message), { isUserFacing: true });
}
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
  if (resolved || ["SUBJECT_WISE", "PATTERN_WISE"].includes(mode)) return resolved || mode;
  // Exact values from ExaminationController's pattern catalog; no fuzzy name guessing.
  const pattern = String(exam?.examPattern || "").toUpperCase();
  if (
    [
      "OBJECTIVE_COMBINED",
      "OBJECTIVE COMBINED PATTERN",
      "JEE_MAIN",
      "JEE MAIN PATTERN",
      "JEE_ADVANCED",
      "JEE ADVANCED PATTERN",
      "NEET",
      "NEET UG PATTERN",
    ].includes(pattern)
  )
    return "PATTERN_WISE";
  if (
    [
      "REGULAR_ACADEMIC",
      "REGULAR ACADEMIC PATTERN",
      "SEM",
      "SEMESTER / ANNUAL SYSTEM",
      "ANN",
      "YEARLY SYSTEM",
    ].includes(pattern)
  )
    return "SUBJECT_WISE";
  return "";
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
  const fields = ["examScheduleId", "examinationId", "subjectId", "subjectName", "subjectCode", "examDate", "startTime", "endTime", "sessionId", "scheduleMode", "roomId", "invigilatorId", "hall", "roomNumber", "invigilator", "invigilatorName", "examMode", "maxMarks", "passingMarks", "status"];
  const source = { ...raw };
  for (const field of fields) {
    const pascal = field[0].toUpperCase() + field.slice(1);
    if (source[field] == null && raw[pascal] != null) source[field] = raw[pascal];
  }
  if (source.hall == null) source.hall = source.roomNumber ?? "";
  if (source.invigilator == null) source.invigilator = source.invigilatorName ?? "";
  const assignments = Array.isArray(source.hallAssignments)
    ? source.hallAssignments.map((hall) => ({
        hallId: id(hall.hallId),
        hallName: hall.hallName ?? "",
        candidateCount: Number(hall.candidateCount),
        invigilatorIds: ids(hall.invigilatorIds),
      }))
    : [];
  return {
    ...source,
    id: id(source.examScheduleId ?? source.examinationScheduleId ?? source.id),
    examId: id(source.examinationId),
    groupId: id(source.groupId),
    academicLevelId: id(source.academicLevelId),
    subjectId: id(source.subjectId),
    includedSubjectIds: ids(source.includedSubjectIds),
    date: day(source.examDate),
    startTime: time(source.startTime),
    endTime: time(source.endTime),
    roomId: id(source.roomId),
    invigilatorId: id(source.invigilatorId),
    hallAssignments: assignments,
    candidateCount: source.candidateCount == null ? null : Number(source.candidateCount),
    combinedConfigurationVerified:
      source.scheduleMode === "PATTERN_WISE" &&
      Boolean(
        id(source.groupId) &&
        source.patternName &&
        ids(source.includedSubjectIds).length &&
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
export function creationBlockers(form) {
  const issues = [];
  if (form.levelIds.length > 1 || form.groupIds.length > 1 || form.programIds.length > 1)
    issues.push(
      "Create one examination per academic level, group and program. Reduce the scope to create this examination.",
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

const endpoint = apiEndpoints.examinations;
const options = { skipGlobalLoader: true, timeout: 20000 };
export const get = (url, params, signal) => apiClient.get(url, { ...options, params, signal });
export const getExams = async (scope, signal) =>
  rows(await get(endpoint.getAll, scope, signal)).map(normalizeExam);
const lookupCache = new Map();
export function useLookup(url, params = {}, enabled = true, cacheForWizard = false) {
  const key = enabled && url ? JSON.stringify([url, params]) : "";
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: "", status: "idle", data: [], error: null });
  useEffect(() => {
    if (!key) return;
    const cached = cacheForWizard ? lookupCache.get(key) : null;
    if (cached && Date.now() - cached.time < 120000) {
      setState({ key, status: "loaded", data: cached.data, error: null });
      return;
    }
    const controller = new AbortController();
    const [target, queryParams] = JSON.parse(key);
    setState({ key, status: "loading", data: [], error: null });
    get(target, queryParams, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          const data = rows(response);
          if (cacheForWizard) lookupCache.set(key, { time: Date.now(), data });
          setState({ key, status: "loaded", data, error: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key, status: "error", data: [], error });
      });
    return () => controller.abort();
  }, [key, revision, cacheForWizard]);
  return {
    ...(state.key === key ? state : { status: key ? "loading" : "idle", data: [], error: null }),
    retry: () => { lookupCache.delete(key); setRevision((value) => value + 1); },
  };
}
export async function saveExam(form, existingId, onAccepted) {
  const payload = examinationPayload(form);
  const response = existingId
    ? await apiClient.put(endpoint.byId(existingId), payload, options)
    : await apiClient.post(endpoint.getAll, payload, options);
  const returned = body(response);
  const savedId = id(returned.examinationId ?? returned.examId ?? returned.id ?? existingId);
  // Once accepted, the wizard must never retry POST even if the verifying GET fails.
  onAccepted(savedId || "unknown");
  if (!savedId)
    throw new Error(
      "Save accepted but no examination ID was returned. Reload the list before another creation.",
    );
  const exam = (await getExams({ boardId: Number(form.boardId), academicYearId: Number(form.yearId) }))
    .find((row) => row.id === savedId);
  if (!exam)
    throw userError("The examination was accepted but is not yet visible in the list. Refresh Exams before creating another.");
  const expected = {
    name: form.name.trim(),
    boardId: form.boardId,
    yearId: form.yearId,
    levelIds: form.levelIds,
    groupIds: form.groupIds,
    programIds: form.programIds,
    startDate: form.startDate,
    endDate: form.endDate,
    examPattern: form.examPattern,
  };
  if (Object.entries(expected).some(([key, value]) => !same(exam[key], value)))
    throw userError(
      "The examination was created, but its details could not be verified. Return to Exams and refresh before creating another.",
    );
  return { exam, issues: [] };
}
export async function updateMetadata(exam, patch) {
  const scope = { boardId: Number(exam.boardId), academicYearId: Number(exam.yearId) };
  const current = (await getExams(scope)).find((row) => row.id === exam.id);
  if (!current) throw userError("This examination is no longer in the active list. Refresh Exams.");
  if (!["DRAFT", "SCHEDULED"].includes(current.status))
    throw new Error("The examination is now read-only. Refresh its details.");
  await apiClient.put(endpoint.byId(exam.id), patch, options);
  const actual = (await getExams(scope)).find((row) => row.id === exam.id);
  if (!actual) throw userError("The update was accepted, but the examination is not visible in the list. Refresh Exams.");
  for (const [key, expected] of Object.entries(patch)) {
    const actualValue = key === "examName" ? actual.name : actual[key];
    if (!same(actualValue ?? "", expected ?? ""))
      throw new Error(`Update accepted, but ${key} did not round-trip. Reload before retrying.`);
  }
  return actual;
}
export async function changeStatus(exam, action, scope) {
  if (action === "delete") await apiClient.delete(endpoint.byId(exam.id), options);
  else await apiClient.patch(endpoint.cancel(exam.id), {}, options);
  const list = await getExams(scope);
  const returned = list.find((row) => row.id === exam.id);
  if (action === "delete" ? Boolean(returned) : returned?.status !== "CANCELLED")
    throw new Error(
      "Mutation accepted but the refreshed list does not confirm the change. Reload before retrying.",
    );
  return list;
}
export async function loadCandidates(exam, session, signal) {
  // The search repository omits p_AcademicLevelId. The group route has no
  // search-procedure dependency. Its list DTO lacks board/year; hydrate details
  // with bounded concurrency before counting, never broaden missing identities.
  const group = session.groupId || exam.groupIds[0];
  if (!group || !exam.boardId || !exam.yearId || !exam.levelIds.length)
    throw userError("Choose an examination with an academic level and group first.");
  const roster = rows(await get(apiEndpoints.students.getByGroup(group), undefined, signal));
  const studentIds = ids(roster.map((student) => student.studentId));
  const result = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, studentIds.length) }, async () => {
      while (cursor < studentIds.length) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const studentId = studentIds[cursor++];
        const student = body(
          await get(apiEndpoints.students.getById(studentId), undefined, signal),
        );
        if (
          id(student.studentId) !== studentId ||
          !id(student.boardId) ||
          !id(student.academicYearId) ||
          !id(student.academicLevelId) ||
          !id(student.groupId) ||
          !id(student.programId)
        )
          continue;
        if (
          student.isActive === true &&
          id(student.boardId) === exam.boardId &&
          id(student.academicYearId) === exam.yearId &&
          id(student.groupId) === group &&
          exam.levelIds.includes(id(student.academicLevelId)) &&
          (!exam.programIds.length || exam.programIds.includes(id(student.programId)))
        )
          result.push(student);
      }
    }),
  );
  return result;
}
export async function exportExcel(examId, scope) {
  const response = await apiClient.get(endpoint.exportExcel(examId), {
    ...options,
    params: examId ? undefined : scope,
    responseType: "blob",
  });
  if (!response.data?.size) throw new Error("The backend returned an empty export.");
  if (response.data.type?.includes("json") || response.data.type?.includes("text/"))
    throw new Error("The backend returned an error document instead of an Excel workbook.");
  const url = URL.createObjectURL(response.data),
    link = document.createElement("a");
  link.href = url;
  link.download = examId ? `Examination-${examId}.xlsx` : "Examinations.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export function ExamField({ label, value = "", onChange, options, type = "text", ...props }) {
  return (
    <label className="cms-field ec-field">
      <span>{label}</span>
      {options ? (
        <select value={value} onChange={(e) => onChange?.(e.target.value)} {...props}>
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange?.(e.target.value)} {...props} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} {...props} />
      )}
    </label>
  );
}
export function LookupState({ lookup, noun }) {
  if (lookup.status === "error")
    return (
      <div className="ec-notice" role="alert">
        Unable to load {noun}.{" "}
        <button type="button" className="cms-btn cms-btn-ghost" onClick={lookup.retry}>
          Retry {noun}
        </button>
      </div>
    );
  if (lookup.status === "loading") return <p role="status">Loading {noun}…</p>;
  if (lookup.status === "loaded" && !lookup.data.length)
    return <p className="ec-muted">No {noun} are configured for this scope.</p>;
  return null;
}
function GroupPrograms({ group, selected, onChange }) {
  const programs = useLookup(apiEndpoints.groups.programs(group.id), {}, true, true);
  return (
    <div className="ec-scope-panel">
      <h3>{group.name}</h3>
      <LookupState lookup={programs} noun="programs" />
      <div className="ec-choices">
        {programs.data
          .filter((p) => p.isActive !== false)
          .map((p) => {
            const pid = id(p.programId ?? p.id);
            return (
              <label key={pid}>
                <input
                  type="checkbox"
                  checked={selected.includes(pid)}
                  onChange={() =>
                    onChange(
                      selected.includes(pid)
                        ? selected.filter((v) => v !== pid)
                        : [...selected, pid],
                      Object.fromEntries(
                        programs.data.map((program) => [
                          id(program.programId ?? program.id),
                          program.programName ?? program.name,
                        ]),
                      ),
                    )
                  }
                />
                {p.programName ?? p.name}
              </label>
            );
          })}
      </div>
    </div>
  );
}
function LevelGroups({ level, form, updatePrograms }) {
  const groups = useLookup(apiEndpoints.groups.list, {
    boardId: Number(form.boardId),
    academicYearId: Number(form.yearId),
    academicLevelId: Number(level.id),
    isActive: true,
  }, true, true);
  const [active, setActive] = useState("");
  const options = groups.data
    .filter((g) => g.isActive !== false && id(g.boardId) === form.boardId)
    .map((g) => ({ id: id(g.groupId ?? g.id), name: g.groupName ?? g.name }));
  const current = options.find((g) => g.id === active) ?? options[0];
  return (
    <section className="ec-scope-panel">
      <h3>{level.name}</h3>
      <LookupState lookup={groups} noun="groups" />
      <div className="ec-pills">
        {options.map((g) => (
          <button
            type="button"
            key={g.id}
            aria-pressed={current?.id === g.id}
            onClick={() => setActive(g.id)}
          >
            {g.name} · {form.groupProgramSelections[g.id]?.length || 0} programs
          </button>
        ))}
      </div>
      {current && (
        <GroupPrograms
          key={current.id}
          group={current}
          selected={form.groupProgramSelections[current.id] || []}
          onChange={(selection, labels) => updatePrograms(current, level, selection, labels)}
        />
      )}
    </section>
  );
}
function SubjectScope({ form, lid, gid, update, patterns }) {
  const lookup = useLookup(apiEndpoints.subjects.context, {
    boardId: Number(form.boardId),
    groupId: Number(gid),
    academicLevelId: Number(lid),
  }, true, true);
  const objective = strategy(form) === "PATTERN_WISE",
    key = `${lid}:${gid}`;
  const subjects = lookup.data
    .map(normalizeSubject)
    .filter((s, index, all) => s.id && all.findIndex((other) => other.id === s.id) === index)
    .filter((s) =>
      isEligibleSubject(
        s,
        { boardId: form.boardId, groupId: gid, academicLevelId: lid },
        objective,
      ),
    );
  const selected = form.groupSubjectSelections[key] || [];
  const setSelected = (selection) =>
    update((previous) => {
      const mapping = { ...previous.groupSubjectSelections, [key]: ids(selection) };
      return {
        ...previous,
        groupSubjectSelections: mapping,
        selectedSubjectIds: ids(Object.values(mapping).flat()),
        subjectLabels: {
          ...previous.subjectLabels,
          ...Object.fromEntries(subjects.map((s) => [s.id, s.name])),
        },
      };
    });
  return (
    <details className="ec-scope-panel" open>
      <summary>
        {form.levelLabels[lid] || `Level ${lid}`} · {form.groupLabels[gid] || `Group ${gid}`}
      </summary>
      <p className="ec-muted">
        Programs:{" "}
        {(form.groupProgramSelections[gid] || [])
          .map((pid) => form.programLabels[pid] || `Program ${pid}`)
          .join(", ")}
      </p>
      {objective && (
        <ExamField
          label="Objective pattern"
          value={form.selectedGroupPatterns[gid]?.[0] || ""}
          options={patterns}
          onChange={(value) =>
            update((previous) => ({
              ...previous,
              selectedGroupPatterns: {
                ...previous.selectedGroupPatterns,
                [gid]: value ? [value] : [],
              },
              examPattern: value,
            }))
          }
        />
      )}
      <LookupState lookup={lookup} noun="subjects" />
      <div className="ec-actions">
        <button
          type="button"
          className="cms-btn cms-btn-ghost"
          disabled={lookup.status !== "loaded"}
          onClick={() => setSelected(subjects.map((s) => s.id))}
        >
          {objective ? "Include all non-language subjects" : "Select all in this scope"}
        </button>
        {!objective && (
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setSelected([])}>
            Clear this scope
          </button>
        )}
      </div>
      <div className="ec-choices">
        {subjects.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={() =>
                setSelected(
                  selected.includes(s.id)
                    ? selected.filter((v) => v !== s.id)
                    : [...selected, s.id],
                )
              }
            />
            {s.name}
          </label>
        ))}
      </div>
    </details>
  );
}
function ExamFormWizard({ context, onClose, onSaved, onBusyChange }) {
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState("");
  const submissionInProgressRef = useRef(false);
  const [form, setForm] = useState({
    name: "",
    boardId: id(context.selectedBoardId),
    yearId: id(context.selectedAcademicYearId),
    examCategory: "",
    scheduleMode: "",
    examType: "",
    assessmentTypeId: "",
    examPattern: "",
    startDate: "",
    endDate: "",
    description: "",
    status: "DRAFT",
    levelIds: [],
    groupIds: [],
    programIds: [],
    programLabels: {},
    groupProgramSelections: {},
    groupSubjectSelections: {},
    selectedGroupPatterns: {},
    selectedSubjectIds: [],
    levelLabels: {},
    groupLabels: {},
    subjectLabels: {},
  });
  const [confirmed, setConfirmed] = useState(false);
  const levels = useLookup(
    apiEndpoints.boards.academicLevels,
    { boardId: Number(form.boardId) },
    step >= 1 && Boolean(form.boardId),
    true,
  );
  const types = useLookup(apiEndpoints.examinations.types, {}, true, true);
  const patterns = useLookup(apiEndpoints.examinations.patterns, {}, step >= 2, true);
  const levelOptions = levels.data.map((l) => ({
    id: id(l.academicLevelId ?? l.id),
    name: l.levelName ?? l.academicLevelName ?? l.name,
  }));
  const patternOptions = patterns.data.map((p) => ({ id: p.patternName, name: p.patternName }));
  const change = (key, value) => {
    setError("");
    setConfirmed(false);
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "examCategory"
        ? {
            scheduleMode: value === "Objective" ? "PATTERN_WISE" : "SUBJECT_WISE",
            groupSubjectSelections: {},
            selectedSubjectIds: [],
            selectedGroupPatterns: {},
            examPattern: "",
            ...(value === "Objective" ? { endDate: previous.startDate } : {}),
          }
        : {}),
      ...(key === "startDate" && previous.examCategory === "Objective" ? { endDate: value } : {}),
    }));
  };
  const updatePrograms = (group, level, selections, labels) =>
    setForm((previous) => {
      const mapping = { ...previous.groupProgramSelections, [group.id]: ids(selections) };
      if (!selections.length) delete mapping[group.id];
      const subjectMapping = Object.fromEntries(
        Object.entries(previous.groupSubjectSelections).filter(
          ([key]) => !key.endsWith(`:${group.id}`),
        ),
      );
      const groupPatterns = { ...previous.selectedGroupPatterns };
      delete groupPatterns[group.id];
      return {
        ...previous,
        groupProgramSelections: mapping,
        groupIds: ids(Object.keys(mapping)),
        programIds: ids(Object.values(mapping).flat()),
        programLabels: { ...previous.programLabels, ...labels },
        groupSubjectSelections: subjectMapping,
        selectedSubjectIds: ids(Object.values(subjectMapping).flat()),
        selectedGroupPatterns: groupPatterns,
        groupLabels: { ...previous.groupLabels, [group.id]: group.name },
        levelLabels: { ...previous.levelLabels, [level.id]: level.name },
      };
    });
  const validateStep = () => {
    if (
      step === 0 &&
      (!form.name.trim() ||
        !strategy(form) ||
        !form.assessmentTypeId ||
        !form.startDate ||
        !form.endDate ||
        form.endDate < form.startDate ||
        !form.boardId ||
        !form.yearId)
    )
      return "Complete exam name, category, type and a valid date range using the active academic context.";
    if (step === 1 && (!form.levelIds.length || !form.groupIds.length))
      return "Select academic levels and explicit programs for at least one group.";
    if (
      step === 2 &&
      (!form.examPattern ||
        form.levelIds.some((lid) =>
          form.groupIds.some((gid) => !form.groupSubjectSelections[`${lid}:${gid}`]?.length),
        ) ||
        (strategy(form) === "PATTERN_WISE" &&
          form.groupIds.some((gid) => form.selectedGroupPatterns[gid]?.length !== 1)))
    )
      return "Configure subjects for each level/group and one pattern per Objective group.";
    return "";
  };
  const next = () => {
    const issue = validateStep();
    if (issue) setError(issue);
    else {
      setError("");
      setStep(step + 1);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (step !== 3) {
      next();
      return;
    }
    if (submissionInProgressRef.current || accepted) return;
    if (!confirmed) return setError("Confirm the reviewed configuration before creating.");
    const blockers = creationBlockers(form);
    if (blockers.length) return setError(blockers.join(" "));
    submissionInProgressRef.current = true;
    onBusyChange?.(true);
    setBusy(true);
    setError("");
    try {
      const result = await saveExam(form, null, setAccepted);
      await onSaved(result.exam, form.selectedSubjectIds);
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      submissionInProgressRef.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  };
  return (
    <section className="cms-card ec-wizard">
      <div className="ec-card-heading">
        <div>
          <h2>Create examination</h2>
          <p>
            {context.selectedBoard?.name} · {context.selectedAcademicYear?.name}
          </p>
        </div>
        <button type="button" className="cms-btn cms-btn-ghost" disabled={busy} onClick={onClose}>
          Back to Exams
        </button>
      </div>
      <ol className="ec-stepper">
        {["Exam information", "Academic scope", "Subjects / patterns", "Review & create"].map(
          (name, index) => (
            <li key={name} aria-current={step === index ? "step" : undefined}>
              <span>{index + 1}</span>
              {name}
            </li>
          ),
        )}
      </ol>
      <form onSubmit={submit}>
        <fieldset disabled={busy || Boolean(accepted)}>
          {step === 0 && (
            <div className="ec-grid">
              <ExamField
                label="Board"
                value={context.selectedBoard?.name || "Select in navbar"}
                readOnly
              />
              <ExamField
                label="Academic year"
                value={context.selectedAcademicYear?.name || "Select in navbar"}
                readOnly
              />
              <ExamField
                label="Exam name"
                value={form.name}
                onChange={(value) => change("name", value)}
                maxLength={150}
              />
              <ExamField
                label="Exam category"
                value={form.examCategory}
                options={[
                  { id: "Regular", name: "Regular — subject wise" },
                  { id: "Objective", name: "Objective — pattern wise" },
                ]}
                onChange={(value) => change("examCategory", value)}
              />
              <div>
                <ExamField
                  label="Exam type"
                  value={form.assessmentTypeId}
                  options={types.data.map((t) => ({
                    id: String(t.assessmentTypeId ?? t.examTypeId),
                    name: t.name ?? t.examType,
                  }))}
                  onChange={(value) => {
                    change("assessmentTypeId", value);
                    change(
                      "examType",
                      types.data.find((t) => String(t.assessmentTypeId ?? t.examTypeId) === value)
                        ?.name || "",
                    );
                  }}
                />
                <LookupState lookup={types} noun="exam types" />
              </div>
              <ExamField
                label="Start date"
                type="date"
                value={form.startDate}
                onChange={(value) => change("startDate", value)}
              />
              <ExamField
                label="End date"
                type="date"
                value={form.endDate}
                min={form.startDate}
                readOnly={form.examCategory === "Objective"}
                onChange={(value) => change("endDate", value)}
              />
              <ExamField
                label="Description"
                type="textarea"
                value={form.description}
                maxLength={500}
                onChange={(value) => change("description", value)}
              />
            </div>
          )}
          {step === 1 && (
            <>
              <LookupState lookup={levels} noun="academic levels" />
              <div className="ec-choices">
                {levelOptions.map((level) => (
                  <label key={level.id}>
                    <input
                      type="checkbox"
                      checked={form.levelIds.includes(level.id)}
                      onChange={() => {
                        change(
                          "levelIds",
                          form.levelIds.includes(level.id)
                            ? form.levelIds.filter((lid) => lid !== level.id)
                            : [...form.levelIds, level.id],
                        );
                        setForm((previous) => ({
                          ...previous,
                          groupIds: [],
                          programIds: [],
                          groupProgramSelections: {},
                          selectedGroupPatterns: {},
                          groupSubjectSelections: {},
                          selectedSubjectIds: [],
                          levelLabels: { ...previous.levelLabels, [level.id]: level.name },
                        }));
                      }}
                    />
                    {level.name}
                  </label>
                ))}
              </div>
              {levelOptions
                .filter((level) => form.levelIds.includes(level.id))
                .map((level) => (
                  <LevelGroups
                    key={level.id}
                    level={level}
                    form={form}
                    updatePrograms={updatePrograms}
                  />
                ))}
              <p className="ec-muted">
                Programs are selected per group. Switching panels preserves your choices.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <LookupState lookup={patterns} noun="patterns" />
              {form.examCategory === "Regular" && (
                <ExamField
                  label="Exam pattern"
                  value={form.examPattern}
                  options={patternOptions}
                  onChange={(value) => change("examPattern", value)}
                />
              )}
              {form.levelIds.flatMap((lid) =>
                form.groupIds.map((gid) => (
                  <SubjectScope
                    key={`${lid}:${gid}`}
                    form={form}
                    lid={lid}
                    gid={gid}
                    update={setForm}
                    patterns={patternOptions}
                  />
                )),
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h3>{form.name}</h3>
              <p>
                {form.examCategory} · {form.examType} · {form.startDate} — {form.endDate}
              </p>
              {form.groupIds.map((gid) => (
                <section className="ec-scope-panel" key={gid}>
                  <h3>{form.groupLabels[gid] || `Group ${gid}`}</h3>
                  <p>
                    Programs:{" "}
                    {form.groupProgramSelections[gid]
                      .map((pid) => form.programLabels[pid] || `Program ${pid}`)
                      .join(", ")}
                  </p>
                  {form.levelIds.map((lid) => (
                    <p key={lid}>
                      {form.levelLabels[lid] || `Level ${lid}`}:{" "}
                      {(form.groupSubjectSelections[`${lid}:${gid}`] || [])
                        .map((sid) => form.subjectLabels[sid] || `Subject ${sid}`)
                        .join(", ")}
                    </p>
                  ))}
                  {form.examCategory === "Objective" && (
                    <p>Pattern: {form.selectedGroupPatterns[gid]?.join(", ")}</p>
                  )}
                </section>
              ))}
              <div className="ec-notice" role="note">
                <strong>Session planning</strong>
                <p>
                  {creationBlockers(form).join(" ") ||
                    "Your subject choices guide scheduling during this visit. Saved sessions are retained; unscheduled choices can be selected again when you return."}
                </p>
              </div>
              <label className="ec-check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I have reviewed the examination details.
              </label>
            </>
          )}
        </fieldset>
        {error && (
          <div className="ec-notice ec-error" role="alert">
            {error}
          </div>
        )}
        <div className="ec-actions ec-footer">
          {step > 0 && !accepted && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={busy}
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
            >
              Previous
            </button>
          )}
          {accepted ? (
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={busy}
              onClick={onClose}
            >
              Return to Exams
            </button>
          ) : (
            <button
              type="submit"
              className="cms-btn cms-btn-primary"
              disabled={busy || (step === 3 && (!confirmed || creationBlockers(form).length > 0))}
            >
              {busy ? "Creating…" : step === 3 ? "Create examination" : "Continue"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export function ExamDialog({ title, onClose, children, busy = false }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = document.querySelector(".ec-dialog");
    const selector =
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
    dialog?.querySelector(selector)?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const nodes = [...(dialog?.querySelectorAll(selector) || [])].filter(
        (node) => node.getClientRects().length,
      );
      const first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus?.();
    };
  }, []);
  return (
    <Modal title={title} onClose={onClose} className="ec-dialog" closeOnOverlay={true}>
      {children}
    </Modal>
  );
}
export function ScheduleSummary({ schedules }) {
  return (
    <div className="cms-table-wrap">
      <table className="cms-table ec-schedule-table">
        <thead>
          <tr>
            <th>Subject / pattern</th>
            <th>Group / level</th>
            <th>Date & time</th>
            <th>Hall</th>
            <th>Invigilator</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((row) => (
            <tr key={row.id}>
              <td>
                {row.patternName || row.subjectName || "Not returned"}
                <small>{row.scheduleMode}</small>
              </td>
              <td>
                {row.groupId || "Not returned"} / {row.academicLevelId || "Not returned"}
              </td>
              <td>
                {row.date}
                <small>
                  {row.startTime}–{row.endTime}
                </small>
              </td>
              <td>
                {row.hallAssignments.length
                  ? row.hallAssignments.map((a) => a.hallName || `Hall ${a.hallId}`).join(", ")
                  : row.hall || (row.roomId ? `Room ${row.roomId}` : "Not assigned")}
              </td>
              <td>
                {row.invigilator ||
                  (row.invigilatorId ? `Faculty ${row.invigilatorId}` : "Not assigned")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!schedules.length && <p className="cms-empty">No saved schedules.</p>}
    </div>
  );
}
export async function persistSchedule(exam, original, entry, hall, person, onAccepted, knownSchedules = []) {
  if (!["DRAFT", "SCHEDULED"].includes(exam.status))
    throw userError("This examination is now read-only. Refresh its details.");
  const payload = {
    examinationId: Number(exam.id),
    subjectId: Number(entry.subjectId),
    examDate: entry.date,
    startTime: `${entry.startTime}:00`,
    endTime: `${entry.endTime}:00`,
    scheduleMode: original.scheduleMode || "SUBJECT_WISE",
    examMode: entry.examMode || "Written",
    roomId: Number(hall.id),
    hall: hall.code || hall.name,
    invigilatorId: Number(person.id),
    invigilator: person.name,
    maxMarks: Number(entry.maxMarks),
    passingMarks: Number(entry.passingMarks),
  };
  const response = original.id
    ? await apiClient.put(endpoint.schedule(exam.id, original.id), payload, options)
    : await apiClient.post(endpoint.schedules(exam.id), payload, options);
  onAccepted();
  const returned = body(response);
  const saved = normalizeSchedule(Array.isArray(returned) ? returned[0] : returned);
  const savedId = original.id || saved.id;
  const expected = {
    subjectId: id(payload.subjectId),
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    roomId: hall.id,
    invigilatorId: person.id,
    maxMarks: payload.maxMarks,
    passingMarks: payload.passingMarks,
    examMode: payload.examMode,
    scheduleMode: payload.scheduleMode,
  };
  if (!savedId || Object.entries(expected).some(([key, value]) => !same(saved[key], value)))
    throw userError(
      "The save was accepted but its response could not be verified. Close the editor before retrying.",
    );
  return [...knownSchedules.filter((row) => row.id !== savedId), saved];
}

function ScheduleEditor({ exam, original, schedules, onClose, onSaved, onBusy }) {
  const [entry, setEntry] = useState({
    ...original,
    subjectId: original.subjectId,
    date: original.date || exam.startDate,
    startTime: original.startTime || "",
    endTime: original.endTime || "",
    maxMarks: original.maxMarks ?? "",
    passingMarks: original.passingMarks ?? "",
    roomId: original.roomId || "",
    invigilatorId: original.invigilatorId || "",
    examMode: original.examMode || "Written",
  });
  const [candidates, setCandidates] = useState({ status: "loading", count: null });
  const [candidateRevision, setCandidateRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setCandidates({ status: "loading", count: null });
    loadCandidates(exam, { groupId: exam.groupIds[0] }, controller.signal)
      .then((students) => {
        if (!controller.signal.aborted) setCandidates({ status: "loaded", count: students.length });
      })
      .catch(() => {
        if (!controller.signal.aborted) setCandidates({ status: "error", count: null });
      });
    return () => controller.abort();
  }, [exam, candidateRevision]);
  const timingReady = Boolean(
    entry.subjectId &&
    entry.date &&
    entry.startTime &&
    entry.endTime &&
    entry.startTime < entry.endTime,
  );
  const params = {
    date: entry.date,
    startTime: `${entry.startTime}:00`,
    endTime: `${entry.endTime}:00`,
    examinationId: Number(exam.id),
    ...(original.id ? { excludeScheduleId: Number(original.id) } : {}),
  };
  const hallsLookup = useLookup(endpoint.availableHalls, params, timingReady);
  const staffLookup = useLookup(
    endpoint.availableInvigilators,
    { ...params, subjectId: Number(entry.subjectId) },
    false, // The correctly scoped live request returns HTTP 500 on this deployment.
  );
  const teachingLookup = useLookup(
    apiEndpoints.faculty.dropdown,
    { staffType: "Teaching" },
    timingReady,
  );
  const halls = [
    ...new Map(
      hallsLookup.data
        .filter(
          (h) =>
            h.isActive === true &&
            h.isAvailable === true &&
            Number(h.capacity) > 0 &&
            (candidates.count == null || Number(h.capacity) >= candidates.count),
        )
        .map((h) => [
          id(h.roomId),
          { id: id(h.roomId), name: h.roomName, code: h.roomCode, capacity: Number(h.capacity) },
        ]),
    ).values(),
  ];
  const teachingIds = new Set(
    teachingLookup.data
      .filter((f) => String(f.staffType ?? f.facultyType).toLowerCase() === "teaching")
      .map((f) => id(f.facultyId ?? f.staffId ?? f.id)),
  );
  const faculty = [
    ...new Map(
      staffLookup.data
        .filter(
          (f) => f.isActive === true && f.isAvailable === true && teachingIds.has(id(f.facultyId)),
        )
        .map((f) => [id(f.facultyId), { id: id(f.facultyId), name: f.facultyName ?? f.fullName }]),
    ).values(),
  ];
  const change = (key, value) => {
    setError("");
    setEntry((previous) => ({
      ...previous,
      [key]: value,
      ...(["date", "startTime", "endTime"].includes(key) ? { roomId: "", invigilatorId: "" } : {}),
    }));
  };
  const ready =
    timingReady &&
    candidates.count > 0 &&
    hallsLookup.status === "loaded" &&
    staffLookup.status === "loaded" &&
    teachingLookup.status === "loaded";
  const save = async (event) => {
    event.preventDefault();
    if (lock.current || accepted) return;
    const hall = halls.find((h) => h.id === entry.roomId),
      person = faculty.find((f) => f.id === entry.invigilatorId);
    if (!ready || !hall || !person)
      return setError("Select an available hall and invigilator after loading candidates.");
    if (entry.date < exam.startDate || entry.date > exam.endDate)
      return setError("Choose a date within the examination period.");
    if (
      !(Number(entry.maxMarks) > 0) ||
      entry.passingMarks === "" ||
      Number(entry.passingMarks) < 0 ||
      Number(entry.passingMarks) > Number(entry.maxMarks)
    )
      return setError("Enter valid maximum and passing marks.");
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const list = await persistSchedule(exam, original, entry, hall, person, () => {
        if (mounted.current) setAccepted(true);
      }, schedules);
      onSaved(list);
    } catch (failure) {
      if (mounted.current) {
        setError(
          getApiErrorMessage(
            failure,
            "Unable to save schedule. Check the selected resources and retry.",
          ),
        );
        hallsLookup.retry();
        teachingLookup.retry();
      }
    } finally {
      lock.current = false;
      onBusy(false);
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <ExamDialog title={original.id ? "Edit / reschedule" : "Schedule subject"} onClose={onClose}>
      <form onSubmit={save}>
        <section className="ec-scope-panel">
          <h3>{original.subjectName || "Examination session"}</h3>
          {original.id && (
            <p className="ec-muted">
              Current assignment: {original.hall || "No hall"} ·{" "}
              {original.invigilator || "No invigilator"}
            </p>
          )}
          {candidates.status === "loading" && <p role="status">Loading candidates…</p>}
          {candidates.status === "error" && (
            <p role="alert">
              Unable to load candidates.{" "}
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setCandidateRevision((v) => v + 1)}
              >
                Retry candidates
              </button>
            </p>
          )}
          {candidates.status === "loaded" && (
            <p>
              Confirmed active candidates: <strong>{candidates.count}</strong>
              {candidates.count === 0 && " — no active students match this academic scope."}
            </p>
          )}
        </section>
        <fieldset disabled={busy || accepted}>
          <h3>Timing</h3>
          <div className="ec-grid">
            <ExamField
              label="Exam date"
              type="date"
              value={entry.date}
              min={exam.startDate}
              max={exam.endDate}
              onChange={(v) => change("date", v)}
              required
            />
            <ExamField
              label="Start time"
              type="time"
              value={entry.startTime}
              onChange={(v) => change("startTime", v)}
              required
            />
            <ExamField
              label="End time"
              type="time"
              value={entry.endTime}
              onChange={(v) => change("endTime", v)}
              required
            />
          </div>
          <h3>Marks</h3>
          <div className="ec-grid">
            <ExamField
              label="Maximum marks"
              type="number"
              min="1"
              value={entry.maxMarks}
              onChange={(v) => change("maxMarks", v)}
              required
            />
            <ExamField
              label="Passing marks"
              type="number"
              min="0"
              max={entry.maxMarks}
              value={entry.passingMarks}
              onChange={(v) => change("passingMarks", v)}
              required
            />
          </div>
          <h3>Resources</h3>
          {!timingReady && (
            <p className="ec-muted">Choose a valid date and time to load available resources.</p>
          )}
          <div className="ec-grid">
            <div>
              <ExamField
                label="Hall"
                value={entry.roomId}
                options={halls.map((h) => ({ id: h.id, name: `${h.name} · ${h.capacity} seats` }))}
                onChange={(v) => change("roomId", v)}
                disabled={hallsLookup.status !== "loaded"}
              />
              <LookupState lookup={hallsLookup} noun="halls" />
              {hallsLookup.status === "loaded" && hallsLookup.data.length > 0 && !halls.length && (
                <p>
                  No available hall can seat this cohort. Choose another time or update room
                  capacity.
                </p>
              )}
            </div>
            <div>
              <ExamField
                label="Invigilator"
                value={entry.invigilatorId}
                options={faculty}
                onChange={(v) => change("invigilatorId", v)}
                disabled={staffLookup.status !== "loaded" || teachingLookup.status !== "loaded"}
              />
              <p className="ec-notice">Invigilator availability is currently unavailable.</p>
              <LookupState lookup={teachingLookup} noun="teaching staff" />
              {staffLookup.status === "loaded" &&
                teachingLookup.status === "loaded" &&
                !faculty.length && (
                  <p>No teaching staff are available for this time and subject.</p>
                )}
            </div>
          </div>
          {timingReady && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                hallsLookup.retry();
                teachingLookup.retry();
              }}
            >
              Refresh availability
            </button>
          )}
        </fieldset>
        {error && (
          <p className="ec-notice ec-error" role="alert">
            {error}
          </p>
        )}
        <div className="ec-actions ec-footer">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="cms-btn cms-btn-primary"
            disabled={busy || accepted || !ready}
          >
            {busy ? "Saving…" : "Save schedule"}
          </button>
        </div>
      </form>
    </ExamDialog>
  );
}

function SchedulingWorkspace({ exam, schedules: savedSchedules, onSchedules, onRefresh, notify, plan, cachedContext, onContext }) {
  const [context, setContext] = useState(cachedContext ? { status: "loaded", data: cachedContext } : { status: "loading", data: null });
  const [contextRevision, setContextRevision] = useState(0);
  useEffect(() => {
    if (contextRevision === 0 && cachedContext) {
      setContext({ status: "loaded", data: cachedContext });
      return undefined;
    }
    const controller = new AbortController();
    setContext({ status: "loading", data: null });
    get(endpoint.schedulingContext(exam.id), undefined, controller.signal)
      .then((response) => { if (!controller.signal.aborted) { const data = body(response); setContext({ status: "loaded", data }); setContextRevision(0); onContext(exam.id, data); } })
      .catch(() => { if (!controller.signal.aborted) setContext({ status: "error", data: null }); });
    return () => controller.abort();
  }, [exam.id, contextRevision, cachedContext, onContext]);
  const plannedIds = ids(plan?.length ? plan : exam.selectedSubjectIds);
  const eligible = useLookup(apiEndpoints.subjects.context, {
    boardId: Number(exam.boardId),
    groupId: Number(exam.groupIds[0]),
    academicLevelId: Number(exam.levelIds[0]),
  }, plannedIds.length > 0);
  const [editor, setEditor] = useState(null),
    [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const [finalizing, setFinalizing] = useState(false);
  const objective = strategy(exam) === "PATTERN_WISE";
  const schedules = Array.isArray(savedSchedules) ? savedSchedules : [];
  const editable = Array.isArray(savedSchedules) && plannedIds.length > 0 && ["DRAFT", "SCHEDULED"].includes(exam.status);
  const subjects = [
    ...new Map(eligible.data.filter((subject) => plannedIds.includes(id(subject.subjectId))).map((subject) => [id(subject.subjectId), subject])).values(),
  ];
  const sessionSubjects = subjects;
  const remove = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await apiClient.delete(endpoint.schedule(exam.id, removing.id), options);
      onSchedules(schedules.filter((row) => row.id !== removing.id));
      setRemoving(null);
      notify("Schedule removed.");
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Unable to remove schedule. Please retry."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const finalize = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const scope = { boardId: Number(exam.boardId), academicYearId: Number(exam.yearId) };
      const fresh = (await getExams(scope)).find((row) => row.id === exam.id),
        saved = schedules;
      if (
        fresh.status !== "DRAFT" ||
        !saved.length ||
        saved.some(
          (row) =>
            !row.subjectId ||
            !row.roomId ||
            !row.invigilatorId ||
            !row.date ||
            !row.startTime ||
            row.startTime >= row.endTime,
        )
      )
        throw userError("Save complete sessions before finalizing this draft.");
      await apiClient.post(endpoint.finalize(exam.id), {}, options);
      if ((await getExams(scope)).find((row) => row.id === exam.id)?.status !== "SCHEDULED")
        throw userError("Finalization could not be verified. Refresh this examination.");
      setFinalizing(false);
      onRefresh();
      notify("Saved sessions finalized.");
    } catch (failure) {
      setError(
        getApiErrorMessage(failure, "Unable to finalize saved sessions. Refresh and retry."),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="cms-card ec-workspace">
      <div className="ec-card-heading">
        <div>
          <h2>{exam.name}</h2>
          <p>
            {exam.code} · {objective ? "Objective pattern" : "Subject sessions"} ·{" "}
            {exam.examPattern}
          </p>
          <p>
            {exam.academicLevelName} · {exam.groupName} · {exam.programName}
          </p>
          <p>
            {exam.startDate} — {exam.endDate}
          </p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-ghost"
          onClick={() => {
            eligible.retry();
            setContextRevision((value) => value + 1);
            onRefresh();
          }}
        >
          Refresh context
        </button>
      </div>
      {context.status === "loading" && <p role="status">Loading scheduling context…</p>}
      {context.status === "error" && <p className="ec-notice ec-error" role="alert">Unable to load scheduling context. <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setContextRevision((value) => value + 1)}>Retry context</button></p>}
      {context.status === "loaded" && <p className="ec-muted">{context.data.totalEligibleStudents} active students across {context.data.sectionIds?.length ?? 0} sections in this group. Confirmed examination candidates are checked separately when scheduling.</p>}
      {!Array.isArray(savedSchedules) && <p className="ec-notice">Existing schedule details are temporarily unavailable from the server.</p>}
      <p className="ec-progress">
        {Array.isArray(savedSchedules) ? `${schedules.length} sessions saved in this visit · ` : ""}
        {plannedIds.length > 0 && Array.isArray(savedSchedules) ?
          sessionSubjects.filter((s) => !schedules.some((row) => row.subjectId === id(s.subjectId)))
            .length : 0} selected subjects available to schedule
      </p>
      <h3>
        Selected examination subjects
      </h3>
      {!plannedIds.length && <p className="ec-muted">Exact saved subject selection is unavailable from the current examination list.</p>}
      {plannedIds.length > 0 && <LookupState lookup={eligible} noun="subjects" />}
      {objective && (
        <p className="ec-notice">
          New combined Objective sittings are unavailable. Sessions saved in this visit can be edited below.
        </p>
      )}
      <div className="ec-session-list">
        {sessionSubjects.map((subject) => {
          const saved = schedules.filter((row) => row.subjectId === id(subject.subjectId));
          return (
            <article className="ec-session" key={subject.subjectId}>
              <div>
                <h3>{subject.subjectName}</h3>
                <p>{!Array.isArray(savedSchedules) ? "Existing schedule status unavailable" : saved.length ? "Saved in this visit" : "Not scheduled in this visit"}</p>
                {saved.map((row) => (
                  <p key={row.id}>
                    {row.date} · {row.startTime}–{row.endTime} · {row.hall} · {row.invigilator}
                  </p>
                ))}
              </div>
              {editable && (
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  disabled={busy || (objective && !saved.length)}
                  onClick={() =>
                    setEditor(
                      saved[0] || {
                        subjectId: id(subject.subjectId),
                        subjectName: subject.subjectName,
                        maxMarks: subject.totalMarks || "",
                        passingMarks: subject.passingMarks ?? "",
                        scheduleMode: "SUBJECT_WISE",
                      },
                    )
                  }
                >
                  {saved.length ? "Edit / reschedule" : "Schedule"}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <h3>Saved sessions</h3>
      {Array.isArray(savedSchedules) && !schedules.length && (
        <p className="cms-empty">Choose a subject above to schedule its examination.</p>
      )}
      {schedules.map((row) => (
        <article className="ec-session" key={row.id}>
          <div>
            <h3>{row.subjectName || "Examination session"}</h3>
            <p>
              {row.date} · {row.startTime}–{row.endTime}
            </p>
            <small>
              {row.hall} · {row.invigilator}
            </small>
          </div>
          {editable && (
            <div className="ec-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={busy}
                onClick={() => setEditor(row)}
              >
                Edit / reschedule
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={busy}
                onClick={() => setRemoving(row)}
              >
                Remove
              </button>
            </div>
          )}
        </article>
      ))}
      <p className="ec-muted">
        Each session uses one subject, hall and invigilator. Combined multi-subject sittings are not
        available here.
      </p>
      {error && (
        <p className="ec-notice" role="alert">
          {error}
        </p>
      )}
      <div className="ec-actions ec-footer">
        {editable && exam.status === "DRAFT" && schedules.length > 0 && (
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={busy}
            onClick={() => setFinalizing(true)}
          >
            Finalize saved sessions
          </button>
        )}
        <button type="button" className="cms-btn cms-btn-ghost" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {editor && (
        <ScheduleEditor
          exam={exam}
          original={editor}
          schedules={schedules}
          onBusy={setBusy}
          onClose={() => setEditor(null)}
          onSaved={(list) => {
            onSchedules(list);
            setEditor(null);
            eligible.retry();
            notify("Schedule saved.");
          }}
        />
      )}
      {finalizing && (
        <ExamDialog title="Finalize saved sessions" onClose={() => setFinalizing(false)}>
          <p>
            Mark this examination as scheduled using its {schedules.length} saved sessions?
            Unscheduled subjects will not be added.
          </p>
          <div className="ec-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => setFinalizing(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={busy}
              onClick={finalize}
            >
              Confirm finalization
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </ExamDialog>
      )}
      {removing && (
        <ExamDialog title="Remove schedule" onClose={() => setRemoving(null)}>
          <p>Remove this saved session?</p>
          <div className="ec-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => setRemoving(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={busy}
              onClick={remove}
            >
              Confirm
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </ExamDialog>
      )}
    </section>
  );
}

export default function ExaminationPage() {
  const context = useAcademicContext();
  return (
    <ExaminationCenter
      key={`${context.selectedBoardId}:${context.selectedAcademicYearId}`}
      context={context}
    />
  );
}

function ExaminationCenter({ context }) {
  const location = useLocation(),
    navigate = useNavigate();
  const [creating, setCreating] = useState(location.pathname.endsWith("/add"));
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [sessionPlan, setSessionPlan] = useState({ examId: "", subjects: [] });
  const [workspace, setWorkspace] = useState("exams"),
    [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true),
    [listError, setListError] = useState("");
  const [search, setSearch] = useState(""),
    [filters, setFilters] = useState({ group: "", program: "", level: "", status: "" });
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState("");
  const [sessionSchedules, setSessionSchedules] = useState({});
  const [schedulingContexts, setSchedulingContexts] = useState({});
  const [editing, setEditing] = useState(null),
    [action, setAction] = useState(null),
    [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const listRequest = useRef(null),
    mutationRef = useRef(false);
  const boardId = Number(context.selectedBoardId),
    academicYearId = Number(context.selectedAcademicYearId);
  const notify = useCallback((message, type = "success") => setToast({ message, type }), []);
  const cacheSchedulingContext = useCallback((examId, data) => {
    setSchedulingContexts((previous) => ({ ...previous, [examId]: data }));
  }, []);
  const load = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setListError("");
    try {
      const list = await getExams({ boardId, academicYearId }, controller.signal);
      if (!controller.signal.aborted) {
        setExams(list);
        setSelected((current) => list.some((exam) => exam.id === current) ? current : "");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setListError(getApiErrorMessage(error));
        throw error;
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [boardId, academicYearId]);
  useEffect(() => {
    load().catch(() => {
      /* load exposes error beside the retained list */
    });
    return () => listRequest.current?.abort();
  }, [load]);
  const openExam = (exam, target) => {
    setSelected(exam.id);
    setWorkspace(target);
  };
  const openEdit = (exam) => {
    const schedules = sessionSchedules[exam.id];
    if (!Array.isArray(schedules)) return notify("Existing schedule details are temporarily unavailable from the server.", "error");
    if (!["DRAFT", "SCHEDULED"].includes(exam.status)) return notify("This examination is read-only.", "error");
    setEditing({ exam, schedules });
  };
  const doExport = async (examId) => {
    try {
      await exportExcel(examId, { boardId, academicYearId });
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
    }
  };
  const confirmAction = async () => {
    if (mutationRef.current || !action) return;
    mutationRef.current = true;
    setBusy(true);
    try {
      const fresh = (await getExams({ boardId, academicYearId })).find((row) => row.id === action.exam.id);
      if (!fresh) throw userError("This examination is no longer in the active list. Refresh Exams.");
      if (
        action.kind === "delete"
          ? !["DRAFT", "CANCELLED"].includes(fresh.status)
          : !["DRAFT", "SCHEDULED"].includes(fresh.status)
      )
        throw new Error("The examination status changed. Refresh before proceeding.");
      const list = await changeStatus(fresh, action.kind, { boardId, academicYearId });
      setExams(list);
      if (selected === fresh.id) {
        setSelected("");
        setWorkspace("exams");
      }
      setAction(null);
      notify(
        action.kind === "delete"
          ? "Examination deletion verified."
          : "Examination cancellation verified.",
      );
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  };
  const closeCreate = () => {
    setCreating(false);
    if (location.pathname.endsWith("/add")) navigate("/dashboard/examinations", { replace: true });
  };
  const scoped = exams.filter(
    (exam) => exam.boardId === String(boardId) && exam.yearId === String(academicYearId),
  );
  const filtered = scoped.filter(
    (exam) =>
      (!filters.group || exam.groupIds.includes(filters.group)) &&
      (!filters.program || exam.programIds.includes(filters.program)) &&
      (!filters.level || exam.levelIds.includes(filters.level)) &&
      (!filters.status || exam.status === filters.status) &&
      (!search.trim() ||
        [
          exam.name,
          exam.code,
          exam.groupName,
          exam.academicLevelName,
          exam.examPattern,
          exam.status,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    currentPage = Math.min(page, pages);
  const filterOptions = (key, label) => [
    ...new Map(
      scoped.flatMap((exam) =>
        exam[key].map((value) => [
          value,
          { id: value, name: exam[key].length === 1 && exam[label] ? exam[label] : value },
        ]),
      ),
    ).values(),
  ];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const summary = [
    ["Total exams", scoped.length],
    [
      "Upcoming",
      scoped.filter((exam) => exam.status === "SCHEDULED" && exam.startDate > today).length,
    ],
    [
      "Ongoing",
      scoped.filter(
        (exam) => exam.status === "SCHEDULED" && exam.startDate <= today && exam.endDate >= today,
      ).length,
    ],
    ["Completed", scoped.filter((exam) => exam.status === "COMPLETED").length],
  ];
  const selectedExam = exams.find((exam) => exam.id === selected);
  const selectedDetails = selectedExam ? { exam: selectedExam, schedules: sessionSchedules[selected] ?? null } : null;
  return (
    <DashboardLayout
      title="Examination Center"
      subtitle="Manage examinations, scheduling and review within the active academic context."
      breadcrumb={["Examinations"]}
    >
      <div className="examination-center">
        <div className="ec-toolbar">
          <nav className="ec-tabs" aria-label="Examination workspaces">
            {[
              ["exams", "Exams"],
              ["scheduling", "Scheduling"],
              ["review", "Exam details / review"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                disabled={creatingBusy}
                aria-current={workspace === key ? "page" : undefined}
                onClick={() => {
                  setWorkspace(key);
                  closeCreate();
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          {!creating && (
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => {
                setWorkspace("exams");
                setCreating(true);
              }}
            >
              <Plus size={16} />
              Create examination
            </button>
          )}
        </div>
        {creating ? (
          <ExamFormWizard
            context={context}
            onBusyChange={setCreatingBusy}
            onClose={closeCreate}
            onSaved={async (exam, subjects) => {
              setExams((previous) => [...previous.filter((row) => row.id !== exam.id), exam]);
              setSessionPlan({ examId: exam.id, subjects });
              setSessionSchedules((previous) => ({ ...previous, [exam.id]: [] }));
              closeCreate();
              openExam(exam, "scheduling");
              notify("Examination created. Choose a subject to schedule.");
            }}
          />
        ) : workspace === "exams" ? (
          <>
            {!loading && !listError && (
              <div className="ec-stats">
                {summary.map(([label, count]) => (
                  <div className="cms-card" key={label}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            )}
            <section className="cms-card ec-workspace">
              <div className="ec-filters">
                <ExamField
                  label="Search exams"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder="Name, code, pattern or group"
                />
                {[
                  ["group", "Group", "groupIds", "groupName"],
                  ["program", "Program", "programIds", "programName"],
                  ["level", "Academic level", "levelIds", "academicLevelName"],
                ].map(([key, label, idsKey, nameKey]) => (
                  <ExamField
                    key={key}
                    label={label}
                    value={filters[key]}
                    options={filterOptions(idsKey, nameKey)}
                    onChange={(value) => {
                      setFilters({ ...filters, [key]: value });
                      setPage(1);
                    }}
                  />
                ))}
                <ExamField
                  label="Status"
                  value={filters.status}
                  options={[...new Set(scoped.map((exam) => exam.status))]
                    .filter(Boolean)
                    .map((value) => ({ id: value, name: value }))}
                  onChange={(value) => {
                    setFilters({ ...filters, status: value });
                    setPage(1);
                  }}
                />
              </div>
              <div className="ec-actions">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={loading}
                  onClick={() =>
                    load().catch(() => {
                      /* error rendered above */
                    })
                  }
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => {
                    setFilters({ group: "", program: "", level: "", status: "" });
                    setSearch("");
                  }}
                >
                  Clear filters
                </button>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => doExport()}>
                  Export Excel
                </button>
              </div>
              {listError && (
                <p className="ec-notice ec-error" role="alert">
                  {listError} The last loaded list is retained. Use Refresh to retry.
                </p>
              )}
              {loading && <p role="status">Loading examinations…</p>}
              <div className="cms-table-wrap">
                <table className="cms-table ec-list-table">
                  <thead>
                    <tr>
                      <th>Examination</th>
                      <th>Academic scope</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage - 1) * 8, currentPage * 8).map((exam) => (
                      <tr key={exam.id}>
                        <td>
                          <strong>{exam.name}</strong>
                          <small>
                            {exam.code || "Code not returned"} ·{" "}
                            {exam.examPattern || "Pattern not returned"}
                          </small>
                        </td>
                        <td>
                          {exam.academicLevelName || exam.academicLevel || "Level not returned"}
                          <small>
                            {exam.groupName || "Group not returned"} ·{" "}
                            {exam.programName || "Program not returned"}
                          </small>
                        </td>
                        <td>
                          {exam.startDate}
                          <small>to {exam.endDate}</small>
                        </td>
                        <td>
                          <StatusBadge value={exam.status} />
                        </td>
                        <td>
                          <div className="ec-actions">
                            <button
                              type="button"
                              className="cms-action-btn"
                              aria-label={`Review ${exam.name}`}
                              title="Review"
                              onClick={() => openExam(exam, "review")}
                            >
                              <Eye size={16} />
                            </button>
                            {["DRAFT", "SCHEDULED"].includes(exam.status) && (
                              <>
                                <button
                                  type="button"
                                  className="cms-action-btn"
                                  aria-label={`Schedule ${exam.name}`}
                                  title="Schedule / reschedule"
                                  onClick={() => openExam(exam, "scheduling")}
                                >
                                  <CalendarDays size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="cms-action-btn"
                                  aria-label={`Edit ${exam.name}`}
                                  title="Edit"
                                  onClick={() => openEdit(exam)}
                                >
                                  <Pencil size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && !filtered.length && (
                  <p className="cms-empty">
                    No examinations match this academic context and filters.
                  </p>
                )}
              </div>
              <div className="ec-pagination">
                <span>{filtered.length} examinations</span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span>
                  {currentPage} / {pages}
                </span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={currentPage === pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="cms-card ec-selector">
              <ExamField
                label="Examination"
                value={selected}
                options={scoped.map((exam) => ({
                  id: exam.id,
                  name: `${exam.name} · ${exam.code} · ${exam.status}`,
                }))}
                onChange={setSelected}
              />
            </div>
            {selectedDetails && (workspace === "scheduling" ? (
                <SchedulingWorkspace
                  plan={sessionPlan.examId === selected ? sessionPlan.subjects : undefined}
                  key={selected}
                  exam={selectedDetails.exam}
                  schedules={selectedDetails.schedules}
                  cachedContext={schedulingContexts[selected]}
                  onContext={cacheSchedulingContext}
                  onSchedules={(schedules) =>
                    setSessionSchedules((previous) => ({ ...previous, [selected]: schedules }))
                  }
                  onRefresh={load}
                  notify={notify}
                />
              ) : (
                <ExamDetailsPanel
                  details={selectedDetails}
                  onEdit={() => openEdit(selectedDetails.exam)}
                  onSchedule={() => setWorkspace("scheduling")}
                  onAction={(kind) => setAction({ exam: selectedDetails.exam, kind })}
                />
              ))}
            {!selected && (
              <p className="cms-empty">
                Select an examination to{" "}
                {workspace === "scheduling" ? "manage its schedule" : "review its details"}.
              </p>
            )}
          </>
        )}
        {!creating && selectedDetails?.exam && workspace !== "exams" && (
          <div className="ec-print">
            <h1>{selectedDetails.exam.name}</h1>
            <p>
              {selectedDetails.exam.code} · {selectedDetails.exam.startDate} —{" "}
              {selectedDetails.exam.endDate}
            </p>
            {Array.isArray(selectedDetails.schedules) && <ScheduleSummary schedules={selectedDetails.schedules} />}
          </div>
        )}
        {editing && (
          <MetadataEditor
            data={editing}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              await load();
              notify("Examination metadata update verified.");
            }}
          />
        )}
        {action && (
          <ExamDialog
            title={action.kind === "delete" ? "Delete examination" : "Cancel examination"}
            busy={busy}
            onClose={() => !busy && setAction(null)}
          >
            <p>
              {action.kind === "delete" ? "Delete" : "Cancel"} {action.exam.name}?{" "}
              {action.kind === "cancel"
                ? "It will become read-only."
                : "Its associated examination records will be removed from the active list."}
            </p>
            <div className="ec-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Keep examination
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={busy}
                onClick={confirmAction}
              >
                {busy ? "Verifying…" : "Confirm"}
              </button>
            </div>
          </ExamDialog>
        )}
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      </div>
    </DashboardLayout>
  );
}

function ExamDetailsPanel({
  details: { exam, schedules },
  onEdit,
  onSchedule,
  onAction,
}) {
  const schedulesAvailable = Array.isArray(schedules);
  const editable = ["DRAFT", "SCHEDULED"].includes(exam.status);
  return (
    <section className="cms-card ec-workspace">
      <div className="ec-card-heading">
        <div>
          <h2>{exam.name}</h2>
          <p>
            {exam.code} · {exam.examType} · {exam.startDate} — {exam.endDate}
          </p>
        </div>
        <StatusBadge value={exam.status} />
      </div>
      <div className="ec-grid">
        <section className="ec-scope-panel">
          <h3>Overview</h3>
          <p>{exam.description || "No description"}</p>
          <p>Pattern: {exam.examPattern || "Select a subject in Scheduling"}</p>
        </section>
        <section className="ec-scope-panel">
          <h3>Academic scope</h3>
          <p>
            {exam.boardName} · {exam.academicYearName}
          </p>
          <p>
            {exam.academicLevelName || exam.academicLevel} · {exam.groupName} · {exam.programName}
          </p>
        </section>
      </div>
      <details className="ec-scope-panel" open>
        <summary>Subject / pattern configuration</summary>
        <p>
          {exam.examPattern || "No pattern specified"}. Select subjects and manage sessions in
          Scheduling.
        </p>
      </details>
      <h3>Schedule, hall and invigilator allocation</h3>
      {schedulesAvailable ? <ScheduleSummary schedules={schedules} /> : <p>Existing schedule details are temporarily unavailable from the server.</p>}
      <div className="ec-actions ec-footer">
        {editable && (
          <>
            <button type="button" className="cms-btn cms-btn-primary" onClick={onSchedule}>
              Open Scheduling
            </button>
            {schedulesAvailable && <button type="button" className="cms-btn cms-btn-ghost" onClick={onEdit}>
              Edit examination
            </button>}
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => onAction("cancel")}
            >
              Cancel examination
            </button>
          </>
        )}
        <button type="button" className="cms-btn cms-btn-ghost" onClick={() => window.print()}>
          Print
        </button>
        {["DRAFT", "CANCELLED"].includes(exam.status) && (
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => onAction("delete")}
          >
            Delete examination
          </button>
        )}
      </div>
    </section>
  );
}

function MetadataEditor({ data: { exam, schedules }, onClose, onSaved }) {
  const [form, setForm] = useState({
    examName: exam.name,
    startDate: exam.startDate,
    endDate: exam.endDate,
    description: exam.description || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const save = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    if (!form.examName.trim() || !form.startDate || !form.endDate || form.endDate < form.startDate)
      return setError("Complete a name and valid examination period.");
    if (schedules.some((row) => row.date < form.startDate || row.date > form.endDate))
      return setError(
        "Saved sessions fall outside this period. Reschedule those sessions before changing the period.",
      );
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await updateMetadata(exam, form);
      await onSaved();
      onClose();
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <ExamDialog title="Edit examination" onClose={onClose}>
      <form onSubmit={save}>
        <p className="ec-notice">
          Update examination information here. Manage subject sessions in Scheduling.
        </p>
        <fieldset disabled={busy}>
          <div className="ec-grid">
            <ExamField label="Exam code" value={exam.code} readOnly />
            <ExamField
              label="Exam name"
              value={form.examName}
              onChange={(value) => setForm({ ...form, examName: value })}
              maxLength={150}
            />
            <ExamField
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(value) => setForm({ ...form, startDate: value })}
            />
            <ExamField
              label="End date"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(value) => setForm({ ...form, endDate: value })}
            />
            <ExamField
              label="Description"
              type="textarea"
              value={form.description}
              maxLength={500}
              onChange={(value) => setForm({ ...form, description: value })}
            />
          </div>
        </fieldset>
        {error && (
          <p className="ec-notice ec-error" role="alert">
            {error}
          </p>
        )}
        <div className="ec-actions ec-footer">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="cms-btn cms-btn-primary" disabled={busy}>
            {busy ? "Saving and verifying…" : "Save metadata"}
          </button>
        </div>
      </form>
    </ExamDialog>
  );
}
