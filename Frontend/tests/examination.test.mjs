import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { apiEndpoints } from "../src/api/apiEndpoints.js";
// Exercise actual helpers from the consolidated page; no parallel runtime implementation.
const source = await readFile(
  new URL("../src/components/pages/ExaminationPage.jsx", import.meta.url),
  "utf8",
);
const calls = [];
let respond = () => [];
globalThis.__examClient = Object.fromEntries(
  ["get", "post", "put", "patch", "delete"].map((method) => [
    method,
    async (...args) => {
      calls.push({ method, args });
      return { data: await respond(method, ...args) };
    },
  ]),
);
globalThis.__examEndpoints = apiEndpoints;
const helpers = source.slice(
  source.indexOf("function getApiErrorMessage("),
  source.indexOf("export function ExamField("),
);
const mutation = source.slice(
  source.indexOf("export async function persistSchedule("),
  source.indexOf("function ScheduleEditor("),
);
const code = `const apiClient=globalThis.__examClient; const apiEndpoints=globalThis.__examEndpoints;\n${helpers}\n${mutation}\nexport {getApiErrorMessage};`;
const api = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const exam = {
  id: "1",
  status: "DRAFT",
  boardId: "1",
  yearId: "9",
  levelIds: ["1"],
  groupIds: ["37"],
  programIds: ["2"],
};
const form = {
  ...exam,
  name: "Term test",
  examCategory: "Regular",
  examType: "Unit Test",
  assessmentTypeId: "1",
  examPattern: "Regular Academic Pattern",
  scheduleMode: "SUBJECT_WISE",
  selectedSubjectIds: ["10"],
  startDate: "2030-09-01",
  endDate: "2030-09-05",
  description: "",
};
const rawExam = {
  examinationId: 1,
  boardId: 1,
  academicYearId: 9,
  academicLevelId: 1,
  groupId: 37,
  programId: 2,
  examName: form.name,
  examPattern: form.examPattern,
  startDate: form.startDate,
  endDate: form.endDate,
  status: "DRAFT",
};
test("IDs deduplicate numeric/string identities", () =>
  assert.deepEqual(api.ids([37, "37", 0, null, "2"]), ["2", "37"]));
test("strategy uses category or exact current pattern catalog", () => {
  assert.equal(api.strategy(form), "SUBJECT_WISE");
  assert.equal(api.strategy({ examPattern: "NEET UG Pattern" }), "PATTERN_WISE");
  assert.equal(api.strategy({ examPattern: "some objective sounding name" }), "");
  assert.equal(api.strategy({ examCategory: "Objective", scheduleMode: "SUBJECT_WISE" }), "");
});
test("malformed lists fail", () => assert.throws(() => api.rows({ data: { message: "failed" } })));
test("schedule response normalizes current DTO casing and resource aliases", () => {
  const row = api.normalizeSchedule({ ExamScheduleId: 7, ExaminationId: 1, SubjectId: 10, SubjectName: "Physics", SubjectCode: "PHY", ExamDate: "2030-09-01", StartTime: "09:00:00", EndTime: "12:00:00", RoomId: 41, RoomNumber: "A1", InvigilatorId: 61, InvigilatorName: "Teacher A", ScheduleMode: "SUBJECT_WISE", ExamMode: "Written", MaxMarks: 100, PassingMarks: 35, Status: "Scheduled" });
  assert.equal(row.id, "7");
  assert.equal(row.date, "2030-09-01");
  assert.equal(row.startTime, "09:00");
  assert.equal(row.hall, "A1");
  assert.equal(row.invigilator, "Teacher A");
  assert.equal(row.status, "Scheduled");
});
test("Objective eligibility excludes languages and wrong scope", () => {
  const raw = {
    subjectId: 10,
    boardId: 1,
    academicLevelId: 1,
    groupId: 37,
    isActive: true,
    language: false,
  };
  const scope = { boardId: "1", academicLevelId: "1", groupId: "37" };
  assert.equal(api.isEligibleSubject(api.normalizeSubject(raw), scope, true), true);
  assert.equal(
    api.isEligibleSubject(api.normalizeSubject({ ...raw, language: true }), scope, true),
    false,
  );
  assert.equal(
    api.isEligibleSubject(api.normalizeSubject({ ...raw, groupId: 38 }), scope, true),
    false,
  );
});
test("create supports scalar Objective draft without generating a code", () => {
  const payload = api.examinationPayload({
    ...form,
    examCategory: "Objective",
    scheduleMode: "PATTERN_WISE",
  });
  assert.equal(payload.examCategory, "Objective");
  assert.ok(!("examCode" in payload));
  assert.deepEqual(payload.programIds, [2]);
  assert.ok(api.creationBlockers({ ...form, programIds: ["2", "3"] }).length);
});
test("create sends one POST and verifies supported metadata", async () => {
  calls.length = 0;
  respond = (method) => method === "get" ? [rawExam] : rawExam;
  const saved = await api.saveExam(form, null, () => {});
  assert.equal(saved.exam.id, "1");
  assert.equal(calls.filter((c) => c.method === "post").length, 1);
  assert.ok(calls.every((c) => c.args[0] !== "/api/v1/examinations/1"));
});
test("accepted create is marked before verification GET fails", async () => {
  let accepted = false;
  respond = (method) => {
    if (method === "get") throw Error("offline");
    return rawExam;
  };
  await assert.rejects(
    api.saveExam(form, null, () => {
      accepted = true;
    }),
  );
  assert.equal(accepted, true);
});
test("candidates use group/details routes and exact board/year/level/group/program", async () => {
  calls.length = 0;
  const student = {
    studentId: 1,
    boardId: 1,
    academicYearId: 9,
    academicLevelId: 1,
    groupId: 37,
    programId: 2,
    isActive: true,
  };
  const records = [
    student,
    { ...student, studentId: 2, academicYearId: 8 },
    { ...student, studentId: 3, programId: 3 },
    { ...student, studentId: 4, boardId: 2 },
    { ...student, studentId: 5, academicLevelId: 2 },
    { ...student, studentId: 6, groupId: 38 },
    { ...student, studentId: 7, programId: 0 },
  ];
  respond = (_m, url) =>
    url.includes("/group/")
      ? [...records, student]
      : records.find((s) => String(s.studentId) === url.split("/").at(-1));
  assert.deepEqual(
    (await api.loadCandidates(exam, { groupId: "37" })).map((s) => s.studentId),
    [1],
  );
  assert.equal(calls[0].args[0], "/api/v1/students/group/37");
  assert.equal(calls[0].args[1].params, undefined);
  assert.equal(calls.length, 8);
  assert.ok(calls.every((c) => !c.args[0].includes("search")));
});
test("candidate errors reject rather than invent a count", async () => {
  respond = () => {
    throw Error("Parameter p_AcademicLevelId not found");
  };
  await assert.rejects(api.loadCandidates(exam, { groupId: "37" }));
});
test("safe error helper hides backend internals", () => {
  assert.equal(
    api.getApiErrorMessage(
      { response: { status: 400, data: { message: "SQL System.Exception p_AcademicLevelId" } } },
      "Unable to load candidates.",
    ),
    "Unable to load candidates.",
  );
});
test("schedule POST and PUT each verify one scalar resource assignment", async () => {
  const entry = {
    subjectId: "10",
    date: "2030-09-01",
    startTime: "10:00",
    endTime: "12:00",
    maxMarks: 100,
    passingMarks: 35,
    examMode: "Written",
  };
  let saved;
  respond = (method, url, payload) => {
    if (method === "post" || method === "put") {
      saved = { ...payload, examScheduleId: 50 };
      return saved;
    }
    return url.endsWith("/schedules") ? [saved] : rawExam;
  };
  for (const original of [{}, { id: "50", scheduleMode: "PATTERN_WISE" }]) {
    calls.length = 0;
    await api.persistSchedule(
      exam,
      original,
      entry,
      { id: "41", code: "A1" },
      { id: "61", name: "Teacher" },
      () => {},
    );
    assert.equal(calls.filter((c) => ["post", "put"].includes(c.method)).length, 1);
    assert.equal(saved.roomId, 41);
    assert.equal(saved.invigilatorId, 61);
    assert.ok(!("hallAssignments" in saved));
    assert.ok(calls.every((c) => c.method !== "get"));
  }
});
test("fresh Completed list status prevents metadata mutation", async () => {
  calls.length = 0;
  respond = () => [{ ...rawExam, status: "COMPLETED" }];
  await assert.rejects(api.updateMetadata(exam, { examName: "new" }));
  assert.ok(calls.every((c) => c.method === "get"));
  assert.ok(calls.every((c) => c.args[0] === "/api/v1/examinations"));
});
