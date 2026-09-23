import apiClient from "@/api/apiClient.js";
import { useEffect, useState } from "react";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import {
  body,
  rows,
  id,
  ids,
  normalizeExam,
  normalizeSchedule,
  examinationPayload,
  verifyExam,
  same,
} from "./examinationModel.js";

const endpoint = apiEndpoints.examinations;
const options = { skipGlobalLoader: true, timeout: 20000 };
export const get = (url, params, signal) => apiClient.get(url, { ...options, params, signal });
export const getExam = async (examId, signal) =>
  normalizeExam(body(await get(endpoint.byId(examId), undefined, signal)));
export const getSchedules = async (examId, signal) =>
  rows(await get(endpoint.schedules(examId), undefined, signal)).map(normalizeSchedule);
export const getExams = async (scope, signal) =>
  rows(await get(endpoint.getAll, scope, signal)).map(normalizeExam);
export function useLookup(url, params = {}, enabled = true) {
  const key = enabled && url ? JSON.stringify([url, params]) : "";
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: "", status: "idle", data: [], error: null });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const [target, queryParams] = JSON.parse(key);
    setState({ key, status: "loading", data: [], error: null });
    get(target, queryParams, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted)
          setState({ key, status: "loaded", data: rows(response), error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key, status: "error", data: [], error });
      });
    return () => controller.abort();
  }, [key, revision]);
  return {
    ...(state.key === key ? state : { status: key ? "loading" : "idle", data: [], error: null }),
    retry: () => setRevision((value) => value + 1),
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
  const exam = await getExam(savedId);
  return { exam, issues: verifyExam(form, exam) };
}
export async function updateMetadata(exam, patch) {
  const current = await getExam(exam.id);
  if (!["DRAFT", "SCHEDULED"].includes(current.status))
    throw new Error("The examination is now read-only. Refresh its details.");
  await apiClient.put(endpoint.byId(exam.id), patch, options);
  const actual = await getExam(exam.id);
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
export async function deleteSchedule(examId, scheduleId) {
  const current = await getExam(examId);
  if (!["DRAFT", "SCHEDULED"].includes(current.status))
    throw new Error("The examination is now read-only. Refresh its details.");
  await apiClient.delete(endpoint.schedule(examId, scheduleId), options);
  const list = await getSchedules(examId);
  if (list.some((row) => row.id === scheduleId))
    throw new Error("The schedule still appears after deletion. Reload before retrying.");
  return list;
}
export function scheduleUpdatePayload(entry, halls, faculty) {
  if (entry.hallAssignments.length !== 1 || entry.hallAssignments[0].invigilatorIds.length !== 1)
    throw new Error(
      "BACKEND CONTRACT BLOCKER: schedule PUT supports one room and one invigilator only. Multiple assignments cannot be persisted.",
    );
  const hall = halls.find((h) => h.id === entry.hallAssignments[0].hallId);
  const person = faculty.find((f) => f.id === entry.hallAssignments[0].invigilatorIds[0]);
  if (!hall || !person)
    throw new Error("Refresh availability and select an available hall and invigilator.");
  return {
    subjectId: Number(entry.subjectId),
    examDate: entry.date,
    startTime: `${entry.startTime}:00`,
    endTime: `${entry.endTime}:00`,
    scheduleMode: entry.scheduleMode,
    roomId: Number(hall.id),
    hall: hall.code || hall.name,
    invigilatorId: Number(person.id),
    invigilator: person.name,
    examMode: entry.examMode || "Written",
    maxMarks: Number(entry.maxMarks),
    passingMarks: Number(entry.passingMarks),
  };
}
export async function updateSchedule(examId, original, entry, halls, faculty, onAccepted) {
  if (original.scheduleMode !== "SUBJECT_WISE" || !original.subjectId)
    throw new Error(
      "BACKEND CONTRACT BLOCKER: Objective sessions cannot be safely updated without persisted pattern, included subjects and all hall assignments.",
    );
  const payload = scheduleUpdatePayload(entry, halls, faculty);
  const currentExam = await getExam(examId);
  if (!["DRAFT", "SCHEDULED"].includes(currentExam.status))
    throw new Error("The examination is now read-only. Refresh its details.");
  await apiClient.put(endpoint.schedule(examId, original.id), payload, options);
  onAccepted();
  const list = await getSchedules(examId);
  const saved = list.find((row) => row.id === original.id);
  const fields = {
    examId: id(examId),
    hall: payload.hall,
    invigilator: payload.invigilator,
    examMode: payload.examMode,
    subjectId: id(payload.subjectId),
    date: payload.examDate,
    startTime: entry.startTime,
    endTime: entry.endTime,
    roomId: id(payload.roomId),
    invigilatorId: id(payload.invigilatorId),
    maxMarks: payload.maxMarks,
    passingMarks: payload.passingMarks,
    scheduleMode: payload.scheduleMode,
  };
  if (!saved || Object.entries(fields).some(([key, value]) => !same(saved[key], value)))
    throw new Error(
      "Update accepted but refreshed schedule fields do not match. Reload before retrying; no automatic mutation retry was made.",
    );
  return list;
}
export async function loadCandidates(exam, session, signal) {
  // Search has no programId parameter. Verify level/group/program on returned rows.
  return rows(
    await get(
      apiEndpoints.students.search,
      {
        boardId: Number(exam.boardId),
        academicYearId: Number(exam.yearId),
        groupId: Number(session.groupId),
        ...(session.levelIds.length === 1 ? { academicLevelId: Number(session.levelIds[0]) } : {}),
        isActive: true,
      },
      signal,
    ),
  );
}
export function availabilityParams(scope) {
  if (
    !scope.examId ||
    !scope.groupId ||
    !scope.date ||
    !scope.startTime ||
    !scope.endTime ||
    scope.startTime >= scope.endTime ||
    !ids(scope.subjectIds).length ||
    !(scope.candidateCount > 0)
  )
    return null;
  const common = {
    date: scope.date,
    startTime: `${scope.startTime}:00`,
    endTime: `${scope.endTime}:00`,
    examinationId: Number(scope.examId),
    ...(scope.excludeScheduleId ? { excludeScheduleId: Number(scope.excludeScheduleId) } : {}),
  };
  // Do not use full candidateCount as requiredCapacity: it would hide smaller
  // halls needed for a multi-hall allocation. The API permits this omission.
  return { halls: common, faculty: { ...common, subjectIds: ids(scope.subjectIds).map(Number) } };
}
const query = (params) => {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    for (const entry of Array.isArray(value) ? value : [value]) result.append(key, String(entry));
  return result;
};
export function createAvailabilityClient() {
  const inflight = new Map();
  let generation = 0;
  return {
    invalidate() {
      generation++;
      inflight.clear();
    },
    load(scope) {
      const params = availabilityParams(scope);
      if (!params)
        return Promise.reject(
          new Error("Select a session, confirmed candidates, date and time first."),
        );
      const key = JSON.stringify([generation, scope]);
      if (inflight.has(key)) return inflight.get(key);
      const request = Promise.all([
        get(endpoint.availableHalls, query(params.halls)),
        get(endpoint.availableInvigilators, query(params.faculty)),
        get(apiEndpoints.faculty.dropdown, { staffType: "Teaching" }),
      ])
        .then(([halls, faculty, teaching]) => {
          const teachingIds = new Set(
            rows(teaching)
              .filter((f) => String(f.staffType ?? f.facultyType).toLowerCase() === "teaching")
              .map((f) => id(f.facultyId ?? f.staffId ?? f.id)),
          );
          return {
            halls: rows(halls)
              .filter(
                (r) => r.isActive === true && r.isAvailable === true && Number(r.capacity) > 0,
              )
              .map((r) => ({
                id: id(r.roomId),
                name: r.roomName,
                code: r.roomCode,
                capacity: Number(r.capacity),
                roomType: r.roomType,
              })),
            faculty: rows(faculty)
              .filter(
                (f) =>
                  f.isActive === true && f.isAvailable === true && teachingIds.has(id(f.facultyId)),
              )
              .map((f) => ({
                id: id(f.facultyId),
                name: f.facultyName ?? f.fullName,
                employeeId: f.employeeId,
              })),
          };
        })
        .finally(() => {
          if (inflight.get(key) === request) inflight.delete(key);
        });
      inflight.set(key, request);
      return request;
    },
  };
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
