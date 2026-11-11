import assert from "node:assert/strict";
import test from "node:test";
import { assertFeeDetailIdentity, feeDetailWarnings, normalizeFeeBreakdown, normalizeFeeDetails, sumFeeValues } from "./feeDetails.js";

test("corrected DTO names, concessions and zero payables survive normalization", () => {
  const detail = normalizeFeeDetails({ StudentId: 544, StudentFeeId: 27, TotalPayable: 0,
    Breakdown: [{ StudentFeeComponentId: 106, FeeType: "Admission", Amount: 5000,
      ConcessionScheme: "Full scholarship", Discount: 5000, Payable: 0 }] });
  assert.equal(detail.totalPayable, 0);
  assert.equal(detail.breakdown[0].type, "Admission");
  assert.equal(detail.breakdown[0].concessionName, "Full scholarship");
  assert.equal(detail.breakdown[0].concessionAmount, 5000);
  assert.equal(sumFeeValues(detail.breakdown, "payableAmount"), 0);
  assert.deepEqual(feeDetailWarnings(detail), []);
  assert.deepEqual(normalizeFeeDetails(detail), detail);
});

test("raw field aliases and nested fee names normalize to the same display fields", () => {
  const [row] = normalizeFeeBreakdown([{ feeType: { feeTypeName: "Course Fee" }, amount: "65000",
    concessionAmount: "5000", payableAmount: "60000" }]);
  assert.equal(row.type, "Course Fee");
  assert.equal(row.payableAmount, 60000);
  const summary = normalizeFeeDetails({ PayableAmount: 60000, PaidAmount: 10000, BalanceAmount: 50000 });
  assert.equal(summary.totalPayable, 60000);
  assert.equal(summary.totalPaid, 10000);
  assert.equal(summary.outstandingBalance, 50000);
});

test("missing amounts remain unavailable and unresolved names are explicit", () => {
  const detail = normalizeFeeDetails({ breakdown: [{ feeTypeId: 12, amount: 5000 }] });
  assert.equal(detail.breakdown[0].type, "Unresolved fee type #12");
  assert.equal(detail.breakdown[0].concessionAmount, undefined);
  assert.equal(detail.breakdown[0].payableAmount, undefined);
  assert.equal(sumFeeValues(detail.breakdown, "payableAmount"), undefined);
  assert.equal(normalizeFeeDetails({}).totalPayable, undefined);
  assert.equal(feeDetailWarnings(detail).length, 2);
});

test("the current broken DTO raises warnings without replacing server zero values", () => {
  const detail = { totalPayable: 0, outstandingBalance: 70000, breakdown: [
    { feeType: "", amount: 5000, discount: 0, payable: 0 },
    { feeType: "", amount: 65000, discount: 0, payable: 0 }],
    schedules: [{ balanceAmount: 17500 }, { balanceAmount: 17500 }, { balanceAmount: 17500 }, { balanceAmount: 17500 }] };
  const data = normalizeFeeDetails(detail);
  assert.equal(data.breakdown[0].payableAmount, 0);
  const warnings = feeDetailWarnings(data, { totalPayable: 70000 });
  assert.ok(warnings.some(message => message.includes("names")));
  assert.ok(warnings.some(message => message.includes("discounts and payables")));
  assert.ok(warnings.some(message => message.includes("list record")));
});

test("paid amounts are distinct from payable and schedule discrepancies are exposed", () => {
  const detail = { totalPayable: 70000, totalPaid: 35000, outstandingBalance: 35000,
    breakdown: [{ feeType: "Course Fee", amount: 70000, discount: 0, payable: 70000 }],
    schedules: [{ balanceAmount: 0 }, { balanceAmount: 0 }, { balanceAmount: 17500 }, { balanceAmount: 17500 }] };
  assert.deepEqual(feeDetailWarnings(detail), []);
  assert.ok(feeDetailWarnings({ ...detail, outstandingBalance: 0 }).some(message => message.includes("schedule balances")));
});

test("details must belong to both the selected student and selected fee account", () => {
  const expected = { studentId: 544, studentFeeId: 27 };
  assert.doesNotThrow(() => assertFeeDetailIdentity({ StudentId: 544, StudentFeeId: 27 }, expected));
  for (const detail of [{ studentId: 1, studentFeeId: 27 }, { studentId: 544, studentFeeId: 28 }, { studentId: 544 }]) {
    assert.throws(() => assertFeeDetailIdentity(detail, expected), /do not match/);
  }
  assert.throws(() => assertFeeDetailIdentity({ studentId: 544, studentFeeId: 27,
    breakdown: [{ studentFeeId: 28 }] }, expected), /another account/);
});

test("schedules use their saved installment number without creating installments", () => {
  const data = normalizeFeeDetails({ Schedules: [{ InstallmentNumber: 4, Amount: 17500, BalanceAmount: 17500 }] });
  assert.equal(data.schedules.length, 1);
  assert.equal(data.schedules[0].feeSchedule, "Fee Schedule 4");
  assert.equal(data.schedules[0].Amount, 17500);
});
