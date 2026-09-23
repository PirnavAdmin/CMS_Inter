import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
const { AbortController } = globalThis;
const calls = [];
let response = [];
const fakeApi = Object.fromEntries(
  ["get", "post", "patch"].map((method) => [
    method,
    async (...args) => {
      calls.push({ method, args });
      return { data: response };
    },
  ]),
);
globalThis.__promotionTestApi = fakeApi;
const apiStub =
  "data:text/javascript," +
  encodeURIComponent(
    "export default globalThis.__promotionTestApi; export const getApiErrorMessage=e=>e.response?.data?.message ?? e.message;",
  );
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/api/apiClient.js") return { url: apiStub, shortCircuit: true };
    if (specifier.startsWith("@/"))
      return nextResolve(pathToFileURL(path.resolve("src", specifier.slice(2))).href, context);
    return nextResolve(specifier, context);
  },
});
const service = await import("../src/features/promotion/services/promotionStore.js");

test("eligibility fails closed for missing, malformed and ineligible status", () => {
  for (const row of [
    {},
    { eligibilityStatus: "" },
    { eligibilityStatus: 1 },
    { eligibilityStatus: "Not Eligible" },
    { eligible: true },
    null,
  ])
    assert.equal(service.isPromotionEligible(row), false);
  assert.equal(service.isPromotionEligible({ eligibilityStatus: "Eligible" }), true);
});
test("next year must exist and belong to the selected board; no fixed-year fallback", () => {
  const years = [
    { value: "1", label: "2030-2031", boardId: "9" },
    { value: "2", label: "2031-2032", boardId: "9" },
    { value: "3", label: "2031-2032", boardId: "8" },
  ];
  assert.equal(service.nextPromotionYear(years, "1", "9").value, "2");
  assert.equal(service.nextPromotionYear(years, "2", "9"), null);
  assert.equal(service.nextPromotionYear(years.slice(0, 1), "1", "9"), null);
});
test("progression only selects a configured level in the same naming family", () => {
  const levels = [
    { value: "1", label: "Intermediate 1st Year" },
    { value: "2", label: "Intermediate 2nd Year" },
    { value: "3", label: "Class 12" },
  ];
  assert.equal(service.nextPromotionLevel(levels, "1"), "2");
  assert.equal(service.nextPromotionLevel(levels, "2"), "");
  assert.equal(service.nextPromotionLevel(levels.slice(0, 1), "1"), "");
  assert.equal(service.isFinalPromotionLevel("2nd PUC"), true);
});
test("PascalCase normalization preserves authoritative zero counts and false flags", () => {
  assert.deepEqual(
    service.normalizePromotionData({
      Data: { EligibleCount: 0, Students: [{ StudentId: 1, RollbackStatus: false }] },
    }),
    { data: { eligibleCount: 0, students: [{ studentId: 1, rollbackStatus: false }] } },
  );
  assert.throws(() => service.promotionList({ message: "not a list" }));
});
test("sections request only supported scope parameters and exclude stale/inactive IDs", async () => {
  const scope = {
    boardId: "9",
    academicYearId: "1",
    academicLevelId: "2",
    groupId: "3",
    programId: "4",
  };
  const row = {
    sectionId: 5,
    sectionName: "A",
    boardId: 9,
    academicYearId: 1,
    academicLevelId: 2,
    groupId: 3,
    programId: 4,
    isActive: true,
  };
  response = [
    row,
    { ...row, sectionId: 6, academicYearId: 2 },
    { ...row, sectionId: 7, isActive: false },
    { ...row, sectionId: 8, groupId: 30 },
  ];
  const result = await service.getPromotionOptions("sections", scope);
  assert.equal(result.length, 1);
  assert.equal(result[0].value, "5");
  assert.equal(result[0].label, "A");
  const call = calls.at(-1);
  assert.equal(call.args[0], "/api/v1/Sections");
  assert.deepEqual(call.args[1].params, {
    BoardId: 9,
    AcademicYearId: 1,
    AcademicLevelId: 2,
    GroupId: 3,
    ProgramId: 4,
    IsActive: true,
  });
  assert.equal(call.args[1].skipGlobalLoader, true);
});
test("eligible-students alias forwards cancellation and has no invented query fields", async () => {
  response = [];
  const controller = new AbortController();
  await service.getEligibleStudents(
    { academicYearId: 1, section: "A", search: "" },
    controller.signal,
  );
  const call = calls.at(-1);
  assert.equal(call.args[0], "/api/v1/promotions/eligible-students");
  assert.equal(call.args[1].signal, controller.signal);
  assert.deepEqual(call.args[1].params, { academicYearId: 1, section: "A" });
});
test("allocation uses independent search and validates program and level IDs", async () => {
  response = [
    { studentId: 1, academicLevelId: 2, groupId: 3, programId: 4, isActive: true },
    { studentId: 2, academicLevelId: 5, groupId: 3, programId: 4, isActive: true },
    { studentId: 3, academicLevelId: 2, groupId: 3, programId: 6, isActive: true },
  ];
  const result = await service.getAllocationStudents({
    boardId: "9",
    academicYearId: "1",
    academicLevelId: "2",
    groupId: "3",
    programId: "4",
  });
  assert.deepEqual(
    result.map((row) => row.studentId),
    [1],
  );
  const call = calls.at(-1);
  assert.equal(call.args[0], "/api/v1/students/search");
  assert.equal("programId" in call.args[1].params, false);
});
test("single and section allocation retain section names and numeric payload IDs", async () => {
  const single = {
    targetAcademicYearId: 2,
    targetAcademicLevel: "Year Two",
    targetGroupId: 3,
    targetProgramId: 4,
    targetSection: "Section Name",
  };
  response = { PromotionId: 10, PromotionStatus: "Promoted" };
  assert.equal((await service.promoteSingleStudent(7, single)).promotionId, 10);
  assert.equal(calls.at(-1).args[0], "/api/v1/promotions/student/7");
  assert.deepEqual(calls.at(-1).args[1], single);
  const allocation = {
    studentIds: [7],
    targetAcademicYearId: 2,
    targetAcademicLevelId: 2,
    targetAcademicLevel: "Year Two",
    targetGroupId: 3,
    targetSectionId: 8,
    targetSection: "Section Name",
  };
  await service.allocateSection(allocation);
  assert.equal(calls.at(-1).method, "patch");
  assert.deepEqual(calls.at(-1).args[1], allocation);
});
test("error messages distinguish permission, endpoint, validation, timeout and network", () => {
  assert.match(service.promotionError({ response: { status: 401 } }), /session/i);
  assert.match(service.promotionError({ response: { status: 403 } }), /permission/i);
  assert.match(service.promotionError({ response: { status: 404 } }), /404/);
  assert.match(
    service.promotionError({ response: { status: 400, data: { message: "Invalid target" } } }),
    /Validation: Invalid target/,
  );
  assert.match(service.promotionError({ code: "ECONNABORTED" }), /timed out/);
  assert.match(service.promotionError({ code: "ERR_NETWORK" }), /network/);
});
