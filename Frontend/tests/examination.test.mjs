import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import * as model from "../src/features/examination/examinationModel.js";
const calls = [];
let respond = () => [];
globalThis.__examinationApi = Object.fromEntries(
  ["get", "post", "put", "patch", "delete"].map((method) => [
    method,
    async (...args) => {
      calls.push({ method, args });
      return { data: await respond(method, ...args) };
    },
  ]),
);
const stub =
  "data:text/javascript," + encodeURIComponent("export default globalThis.__examinationApi;");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/api/apiClient.js") return { url: stub, shortCircuit: true };
    if (specifier.startsWith("@/"))
      return next(pathToFileURL(path.resolve("src", specifier.slice(2))).href, context);
    return next(specifier, context);
  },
});
const api = await import("../src/features/examination/examinationApi.js");
const fullExam = (objective = false) => ({
  id: "1",
  name: "Fixture",
  boardId: "9",
  yearId: "10",
  levelIds: ["11", "12"],
  groupIds: ["21", "22"],
  programIds: ["31", "32"],
  groupProgramSelections: { 21: ["31"], 22: ["32"] },
  groupSubjectSelections: {
    "11:21": ["101"],
    "12:21": ["102"],
    "11:22": ["103"],
    "12:22": ["104"],
  },
  selectedSubjectIds: ["101", "102", "103", "104"],
  selectedGroupPatterns: objective ? { 21: ["MPC"], 22: ["BiPC"] } : {},
  examCategory: objective ? "Objective" : "Regular",
  scheduleMode: objective ? "PATTERN_WISE" : "SUBJECT_WISE",
  startDate: "2030-09-01",
  endDate: "2030-09-03",
  examPattern: "Regular Academic Pattern",
  examType: "Unit Test",
  assessmentTypeId: "1",
  description: "",
  status: "DRAFT",
});
const scope = {
  examId: "1",
  groupId: "21",
  candidateCount: 30,
  date: "2030-09-01",
  startTime: "10:00",
  endTime: "12:00",
  subjectIds: [101, 102],
  excludeScheduleId: "50",
};
const halls = [
    { id: "1", capacity: 60 },
    { id: "2", capacity: 50 },
  ],
  faculty = [{ id: "8" }, { id: "9" }];
test("exactly two canonical strategies, ambiguity fails closed", () => {
  assert.equal(model.strategy({ examCategory: "Regular" }), "SUBJECT_WISE");
  assert.equal(model.strategy({ examCategory: "Objective" }), "PATTERN_WISE");
  for (const exam of [
    {},
    { examCategory: "Others" },
    { examCategory: "Regular", scheduleMode: "PATTERN_WISE" },
  ])
    assert.equal(model.strategy(exam), "");
});
test("normalization never invents absent groups, halls, candidates or category", () => {
  const row = model.normalizeSchedule({ examScheduleId: 4, examinationId: 1, hall: "A, B" });
  assert.equal(row.groupId, "");
  assert.deepEqual(row.hallAssignments, []);
  assert.equal(row.candidateCount, null);
  assert.equal(row.combinedConfigurationVerified, false);
  assert.equal(row.startTime, "");
  assert.equal(model.normalizeExam({ examinationId: 1 }).examCategory, undefined);
});
test("malformed list responses fail instead of appearing empty", () => {
  assert.throws(() => model.rows({ message: "bad" }));
  assert.deepEqual(model.rows({ Data: [] }), []);
});
test("Regular requirements preserve level/group/subject identity", () => {
  const req = model.requirements(fullExam());
  assert.equal(req.length, 4);
  assert.equal(new Set(req.map((r) => r.key)).size, 4);
  assert.equal(req[0].academicLevelId, "11");
});
test("Objective has one logical session per group with exact scoped subjects", () => {
  const req = model.requirements(fullExam(true));
  assert.equal(req.length, 2);
  assert.deepEqual(req[0].includedSubjectIds, ["101", "102"]);
  assert.deepEqual(req[1].includedSubjectIds, ["103", "104"]);
  assert.ok(!req[0].key.includes("Hall"));
});
test("requirements cannot be reconstructed from saved rows", () => {
  const exam = model.normalizeExam({
    examinationId: 1,
    academicLevelId: 11,
    groupId: 21,
    programId: 31,
  });
  assert.deepEqual(model.requirements(exam), []);
  assert.ok(model.readiness(exam, []).length);
});
test("candidate count uses active exact level/group/program and deduplicates students", () => {
  const base = { studentId: 1, isActive: true, groupId: 21, academicLevelId: 11, programId: 31 };
  const students = [
    base,
    base,
    { ...base, studentId: 2, programId: 32 },
    { ...base, studentId: 3, academicLevelId: 12 },
    { ...base, studentId: 4, isActive: false },
    { ...base, studentId: 5, programId: undefined },
    { ...base, studentId: 6, groupId: 22 },
  ];
  assert.equal(model.candidateCount(students, fullExam(), model.requirements(fullExam())[0]), 1);
  assert.equal(
    model.candidateCount(
      students,
      { groupProgramSelections: {} },
      model.requirements(fullExam())[0],
    ),
    null,
  );
});
test("Objective excludes language, unknown classification and mismatched scope", () => {
  const raw = {
    subjectId: 1,
    boardId: 9,
    groupId: 21,
    academicLevelId: 11,
    isActive: true,
    language: false,
  };
  const scope = { boardId: 9, groupId: 21, academicLevelId: 11 };
  assert.equal(model.isEligibleSubject(model.normalizeSubject(raw), scope, true), true);
  for (const patch of [
    { language: true },
    { language: undefined },
    { groupId: 22 },
    { academicLevelId: 12 },
    { isActive: false },
  ])
    assert.equal(
      model.isEligibleSubject(model.normalizeSubject({ ...raw, ...patch }), scope, true),
      false,
    );
});
test("overlap includes date, full interval and permits adjacent/later use", () => {
  const a = { date: "2030-09-01", startTime: "10:00", endTime: "12:00" };
  assert.equal(model.overlaps(a, { ...a, startTime: "11:00", endTime: "13:00" }), true);
  assert.equal(model.overlaps(a, { ...a, startTime: "12:00", endTime: "14:00" }), false);
  assert.equal(model.overlaps(a, { ...a, date: "2030-09-02" }), false);
});
test("draft hall/faculty filtering excludes other sessions, preserves self", () => {
  const a = { ...scope, id: "50", roomId: "1", invigilatorId: "8" },
    b = { ...scope, id: "51", roomId: "2", invigilatorId: "9" };
  assert.deepEqual(model.availableForDraft(halls, [a, b], a, "hall"), [halls[0]]);
  assert.deepEqual(model.availableForDraft(faculty, [a, b], a, "faculty"), [faculty[0]]);
});
test("multi-hall allocation is complete or throws with no partial result", () => {
  const allocation = model.allocate(110, halls, faculty);
  assert.equal(allocation.length, 2);
  assert.equal(
    allocation.reduce((sum, a) => sum + a.candidateCount, 0),
    110,
  );
  assert.throws(() => model.allocate(111, halls, faculty));
  assert.throws(() => model.allocate(110, halls, faculty.slice(0, 1)));
});
test("over 60 candidates require two distinct invigilators", () => {
  assert.equal(model.requiredInvigilators(60), 1);
  assert.equal(model.requiredInvigilators(61), 2);
  const row = {
    ...scope,
    hallAssignments: [{ hallId: "1", candidateCount: 61, invigilatorIds: ["8"] }],
  };
  assert.ok(
    model
      .validateAllocation(row, 61, [{ id: "1", capacity: 100 }], faculty, [])
      .some((e) => e.includes("2 invigilator")),
  );
});
test("scope comparisons normalize IDs, object key order and arrays", () => {
  assert.ok(model.same({ a: [2, 1], b: { x: [3] } }, { b: { x: ["3"] }, a: ["1", "2"] }));
  assert.ok(!model.same({ a: [1] }, { a: [1, 2] }));
});
test("readiness checks missing required sessions and synchronized Objective sitting", () => {
  assert.equal(
    model.readiness(fullExam(), []).filter((m) => m.includes("one persisted")).length,
    4,
  );
  const schedules = [
    { scheduleMode: "PATTERN_WISE", date: scope.date, startTime: "10:00", endTime: "12:00" },
    { scheduleMode: "PATTERN_WISE", date: scope.date, startTime: "14:00", endTime: "16:00" },
  ];
  assert.ok(model.readiness(fullExam(true), schedules).some((m) => m.includes("share one")));
});
test("POST payload has no code or unsupported per-group properties; multi-scope/Objective blocked", () => {
  const form = { ...fullExam(), levelIds: ["11"], groupIds: ["21"], programIds: ["31"] };
  const payload = model.examinationPayload(form);
  assert.ok(!("examCode" in payload));
  assert.ok(!("groupProgramSelections" in payload));
  assert.deepEqual(payload.programIds, [31]);
  assert.throws(() => model.examinationPayload(fullExam()));
  assert.throws(() =>
    model.examinationPayload({ ...form, examCategory: "Objective", scheduleMode: "PATTERN_WISE" }),
  );
});
test("availability waits for complete scope and sends exclusion plus all subjects", () => {
  for (const patch of [
    { date: "" },
    { subjectIds: [] },
    { candidateCount: 0 },
    { groupId: "" },
    { startTime: "13:00" },
  ])
    assert.equal(api.availabilityParams({ ...scope, ...patch }), null);
  const params = api.availabilityParams(scope);
  assert.equal(params.halls.excludeScheduleId, 50);
  assert.deepEqual(params.faculty.subjectIds, [101, 102]);
  assert.ok(!("requiredCapacity" in params.halls));
});
test("identical in-flight availability is deduplicated and invalidated without mutation retry", async () => {
  calls.length = 0;
  let release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  respond = async () => {
    await wait;
    return [];
  };
  const client = api.createAvailabilityClient(),
    a = client.load(scope),
    b = client.load(scope);
  assert.equal(a, b);
  assert.equal(calls.length, 3);
  release();
  await a;
  client.invalidate();
  await client.load(scope);
  assert.equal(calls.length, 6);
});
test("availability intersects authoritative teaching roster and uses repeated subjectIds", async () => {
  respond = (_method, url) =>
    url.endsWith("available-halls")
      ? [
          {
            roomId: 1,
            roomName: "A",
            roomCode: "A1",
            capacity: 60,
            isActive: true,
            isAvailable: true,
          },
        ]
      : url.endsWith("dropdown")
        ? [{ facultyId: 8, staffType: "Teaching" }]
        : [
            { facultyId: 8, isActive: true, isAvailable: true, facultyName: "Teacher" },
            { facultyId: 9, isActive: true, isAvailable: true, facultyName: "Nonteacher" },
          ];
  calls.length = 0;
  const data = await api.createAvailabilityClient().load(scope);
  assert.equal(data.faculty.length, 1);
  assert.equal(data.halls[0].code, "A1");
  assert.equal(
    calls[1].args[1].params.toString(),
    "date=2030-09-01&startTime=10%3A00%3A00&endTime=12%3A00%3A00&examinationId=1&excludeScheduleId=50&subjectIds=101&subjectIds=102",
  );
});
test("create accepted then GET reports missing config without claiming success", async () => {
  calls.length = 0;
  respond = () => ({
    examinationId: 7,
    examName: "Fixture",
    boardId: 9,
    academicYearId: 10,
    academicLevelId: 11,
    groupId: 21,
    programId: 31,
  });
  let accepted;
  const form = { ...fullExam(), levelIds: ["11"], groupIds: ["21"], programIds: ["31"] };
  const result = await api.saveExam(form, null, (value) => {
    accepted = value;
  });
  assert.equal(accepted, "7");
  assert.ok(result.issues.length);
  assert.equal(calls.filter((c) => c.method === "post").length, 1);
  assert.equal(calls.at(-1).args[0], "/api/v1/examinations/7");
});
test("accepted create marks ID before a failing verification GET", async () => {
  let accepted;
  respond = (method) => {
    if (method === "get") throw new Error("Offline");
    return { examinationId: 7 };
  };
  await assert.rejects(
    api.saveExam(
      { ...fullExam(), levelIds: ["11"], groupIds: ["21"], programIds: ["31"] },
      null,
      (value) => {
        accepted = value;
      },
    ),
    /Offline/,
  );
  assert.equal(accepted, "7");
});
test("PUT cannot silently discard second hall or invigilator", () => {
  assert.throws(
    () =>
      api.scheduleUpdatePayload(
        { hallAssignments: model.allocate(110, halls, faculty) },
        halls,
        faculty,
      ),
    /BACKEND CONTRACT BLOCKER/,
  );
  assert.throws(
    () =>
      api.scheduleUpdatePayload(
        { hallAssignments: [{ hallId: "1", invigilatorIds: ["8", "9"] }] },
        halls,
        faculty,
      ),
    /BACKEND CONTRACT BLOCKER/,
  );
});
test("schedule PUT refetch verifies IDs/date/time and exposes mismatch", async () => {
  calls.length = 0;
  respond = (_method, url) =>
    url.endsWith("/schedules")
      ? [{ examScheduleId: 50, examinationId: 1, roomId: 999 }]
      : { examinationId: 1, status: "DRAFT" };
  const entry = {
    ...scope,
    subjectId: "101",
    scheduleMode: "SUBJECT_WISE",
    maxMarks: 100,
    passingMarks: 35,
    hallAssignments: [{ hallId: "1", candidateCount: 30, invigilatorIds: ["8"] }],
  };
  let accepted = false;
  await assert.rejects(
    api.updateSchedule(
      "1",
      { ...entry, id: "50" },
      entry,
      [{ ...halls[0], name: "A", code: "A1" }],
      [{ ...faculty[0], name: "Teacher" }],
      () => {
        accepted = true;
      },
    ),
    /do not match/,
  );
  assert.equal(accepted, true);
  assert.equal(calls.filter((c) => c.method === "put").length, 1);
});

test("metadata and deletion refuse a newly read-only examination before mutation", async () => {
  calls.length = 0;
  respond = () => ({ examinationId: 1, status: "COMPLETED" });
  await assert.rejects(api.updateMetadata({ id: "1" }, { examName: "Changed" }), /read-only/);
  await assert.rejects(api.deleteSchedule("1", "50"), /read-only/);
  assert.ok(calls.every((c) => c.method === "get"));
});
test("exam verification rejects changed supported type and status fields", () => {
  const exam = fullExam();
  const issues = model.verifyExam(exam, {
    ...exam,
    examType: "Other",
    assessmentTypeId: 99,
    status: "SCHEDULED",
  });
  for (const field of ["examType", "assessmentTypeId", "status"])
    assert.ok(issues.includes(`${field} did not round-trip.`));
});
