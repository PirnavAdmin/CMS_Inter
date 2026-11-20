import assert from "node:assert/strict";
import test from "node:test";
import { savedAcademicLevelLabel, savedStructureSummary, savedStructureTotal } from "./feeStructureSummary.js";

const first = { id: "1", pairedStructureId: "2", academicLevelId: 1, campusId: 1,
  boardId: "1", academicYearId: "7", groupId: "3", programId: "4", totalFee: 78000 };
const second = { ...first, id: "2", pairedStructureId: "1", academicLevelId: 2, totalFee: 82000 };

test("invalid academic levels do not inherit the backend's first-year fallback label", () => {
  for (const id of [0, "0", null, undefined, -1, "invalid"]) {
    assert.equal(savedAcademicLevelLabel(id, "1st Year"), "Year not configured");
  }
  assert.equal(savedAcademicLevelLabel("1", "Intermediate 1st Year"), "Intermediate 1st Year");
  assert.equal(savedAcademicLevelLabel(2, ""), "2nd Year");
  assert.equal(savedAcademicLevelLabel(3, "Class XI"), "Class XI");
  assert.equal(savedAcademicLevelLabel(3, ""), "Year name unavailable");
  assert.deepEqual(savedStructureSummary({ ...first, academicLevelId: 0, pairedStructureId: null }, []), { first: undefined, second: undefined });
});

test("saved totals take precedence over partial component data, including zero", () => {
  const items = [{ originalAmount: 3000, selected: true }];
  assert.equal(savedStructureTotal(78000, items), 78000);
  assert.equal(savedStructureTotal(0, items), 0);
});

test("missing totals use complete active components and preserve missing data", () => {
  assert.equal(savedStructureTotal(undefined, [{ originalAmount: 3000 }, { originalAmount: 9000, selected: false }]), 3000);
  assert.equal(savedStructureTotal(undefined, [{ originalAmount: undefined }]), undefined);
  assert.equal(savedStructureTotal(undefined, []), undefined);
});

test("summary shows the selected configuration and its explicitly linked second year", () => {
  const unrelated = { ...first, id: "3", totalFee: 999999 };
  for (const selected of [first, second]) {
    assert.deepEqual(savedStructureSummary(selected, [first, second, unrelated]), { first: 78000, second: 82000 });
  }
});

test("summary does not invent a second year or use a pair from another scope", () => {
  assert.deepEqual(savedStructureSummary(first, [first]), { first: 78000, second: undefined });
  assert.deepEqual(savedStructureSummary(first, [first, { ...second, groupId: "9" }]), { first: 78000, second: undefined });
  assert.deepEqual(savedStructureSummary(first, [first, { ...second, pairedStructureId: "8" }]), { first: 78000, second: undefined });
  assert.deepEqual(savedStructureSummary(undefined, []), { first: undefined, second: undefined });
});

test("summary accepts the backend second-year total when the paired row is absent", () => {
  assert.deepEqual(savedStructureSummary({ ...first, secondYearTotalAmount: 82000 }, [first]), { first: 78000, second: 82000 });
  assert.deepEqual(savedStructureSummary({ ...first, secondYearTotalAmount: 0 }, [first]), { first: 78000, second: 0 });
  assert.deepEqual(savedStructureSummary({ ...first, secondYearTotalAmount: 99999 }, [first, second]), { first: 78000, second: 82000 });
});
