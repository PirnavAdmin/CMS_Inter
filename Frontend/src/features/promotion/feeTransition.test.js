import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { normalizeFeePreview, programAllocationBatches, promotionFeePayload } from "./feeTransition.js";

const preview = (id = 9) => normalizeFeePreview({
  targetFeeStructure: { feeStructureId: id, feeStructureName: "Target", totalFee: 84500,
    components: [{ feeTypeName: "Tuition", amount: 75000 }] },
  currentFee: { totalFee: 87500, paidAmount: 40000 },
  arrearsSummary: { studentsWithArrears: 2, totalArrears: 12000 },
});

test("normalization preserves real zero values and missing amounts", () => {
  const result = normalizeFeePreview({ Data: { TargetFeeStructure: { FeeStructureId: 9, TotalFee: 0 },
    CurrentFee: { TotalFee: 500, PaidAmount: 0 } } });
  assert.equal(result.targetTotal, 0);
  assert.equal(result.current.paid, 0);
  assert.equal(result.current.balance, 500);
  assert.equal(normalizeFeePreview({}).current.total, null);
  assert.equal(normalizeFeePreview({}).targetTotal, null);
  assert.equal(preview().current.balance, 47500);
  assert.equal(preview().arrearsCount, 2);
});

test("promotion payment plans send validated installment counts", () => {
  for (const [paymentPlan, numberOfInstallments] of [["Full Payment", 1], ["Term-wise", 3], ["Custom Installments", 6]]) {
    assert.deepEqual(promotionFeePayload(preview(), { paymentPlan, numberOfInstallments }),
      { targetFeeStructureId: 9, paymentPlan, numberOfInstallments });
  }
  for (const count of [1, 7, 2.5, ""]) assert.throws(() => promotionFeePayload(preview(),
    { paymentPlan: "Custom Installments", numberOfInstallments: count }));
  assert.throws(() => promotionFeePayload(normalizeFeePreview({}), { paymentPlan: "Full Payment" }));
});

test("program allocations keep different matched fee structures in separate batches", () => {
  const entries = [{ studentId: 1, targetProgramId: 4 }, { studentId: 2, targetProgramId: 4 }, { studentId: 3, targetProgramId: 4 }];
  const previews = entries.map((entry) => ({ ...entry, fee: preview(entry.studentId === 2 ? 10 : 9) }));
  const batches = programAllocationBatches(entries, previews, true);
  assert.deepEqual(batches, [
    { studentIds: [1, 3], targetProgramId: 4, updateFees: true, targetFeeStructureId: 9 },
    { studentIds: [2], targetProgramId: 4, updateFees: true, targetFeeStructureId: 10 },
  ]);
  assert.throws(() => programAllocationBatches(entries, previews.slice(1), true));
  assert.deepEqual(programAllocationBatches(entries, null, false), [{ studentIds: [1, 2, 3], targetProgramId: 4, updateFees: false }]);
});

test("preview services use supplied routes and mutations retain fee configuration", async () => {
  const calls = [];
  const events = [];
  let fail = false;
  const api = async (method, ...args) => {
    calls.push({ method, args });
    if (fail) throw new Error("Mock API failure");
    return { data: { data: { ok: true } } };
  };
  const source = readFileSync(new URL("./services/promotionStore.js", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/export default \{[\s\S]*$/, "").replace(/export /g, "");
  const endpoints = { promotions: { feePreview: "/api/v1/promotions/fee-preview", create: "/api/v1/promotions",
    student: (id) => `/api/v1/promotions/student/${id}`, programAllocation: "/api/v1/promotions/program-allocation",
    programFeePreview: (id, program) => `/api/v1/promotions/program-fee-preview?studentId=${id}&targetProgramId=${program}` },
  campusTransfers: { feePreview: (id) => `/api/v1/promotions/campus-transfers/${id}/fee-preview`, approve: (id) => `/api/v1/promotions/campus-transfers/${id}/approve` } };
  const store = vm.runInNewContext(`${source}; ({getPromotionFeePreview, getProgramFeePreview, getCampusTransferFeePreview, promoteStudents, promoteSingleStudent, allocateProgram})`, {
    Event, window: { dispatchEvent: (event) => events.push(event.type) }, apiEndpoints: endpoints,
    apiClient: { get: (...args) => api("get", ...args), post: (...args) => api("post", ...args), patch: (...args) => api("patch", ...args) },
  });
  await store.getPromotionFeePreview({ campusId: 1, targetGroupId: 37, studentIds: [102] });
  await store.getProgramFeePreview(102, 4);
  await store.getCampusTransferFeePreview(12);
  assert.equal(calls[0].method, "post");
  assert.equal(calls[1].args[0], "/api/v1/promotions/program-fee-preview?studentId=102&targetProgramId=4");
  assert.equal(calls[2].args[0], "/api/v1/promotions/campus-transfers/12/fee-preview");
  assert.equal(events.length, 0);
  const payload = { studentIds: [102], ...promotionFeePayload(preview(), { paymentPlan: "Term-wise" }) };
  await store.promoteStudents(payload);
  await store.promoteSingleStudent(102, payload);
  await store.allocateProgram({ ...payload, updateFees: true });
  assert.equal(calls[3].args[1], payload);
  assert.equal(calls[4].args[1], payload);
  assert.equal(calls[5].args[1].updateFees, true);
  assert.equal(events.length, 3);
  fail = true;
  await assert.rejects(store.promoteStudents(payload), /Mock API failure/);
  assert.equal(events.length, 3);
});
