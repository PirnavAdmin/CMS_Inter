const valueOf = (row, ...keys) => {
  for (const key of keys) {
    const value = row?.[key] ?? row?.[key[0].toUpperCase() + key.slice(1)];
    if (value !== undefined && value !== null && value !== "") return value;
  }
};
const numberOf = (row, ...keys) => {
  const value = valueOf(row, ...keys);
  return value !== undefined && Number.isFinite(Number(value)) ? Number(value) : undefined;
};
const textOf = (row, ...keys) => {
  const value = valueOf(row, ...keys);
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
};
const rowsOf = value => Array.isArray(value) ? value : value?.$values || [];

export function sumFeeValues(rows, key) {
  if (!rows.length || rows.some(row => !Number.isFinite(row[key]))) return undefined;
  return rows.reduce((sum, row) => sum + row[key], 0);
}

export function normalizeFeeBreakdown(rows = []) {
  return rows.map((row, index) => {
    const feeTypeId = valueOf(row, "feeTypeId");
    const name = textOf(row, "feeTypeName", "feeType", "type", "name")
      || textOf(valueOf(row, "feeType"), "feeTypeName", "name");
    const originalAmount = numberOf(row, "originalAmount", "amount", "feeAmount", "baseAmount");
    const concessionAmount = numberOf(row, "concessionAmount", "discount", "discountAmount", "scholarshipAmount");
    const explicitPayable = numberOf(row, "payableAmount", "payable", "netAmount", "finalAmount");
    return {
      ...row,
      id: String(valueOf(row, "studentFeeComponentId", "feeStructureComponentId", "id") ?? `fee-item-${index}`),
      feeTypeId,
      type: name || `Unresolved fee type${feeTypeId ? ` #${feeTypeId}` : ""}`,
      nameUnresolved: row.nameUnresolved === true || !name,
      originalAmount,
      concessionAmount,
      concessionName: textOf(row, "concessionName", "concessionScheme", "scholarshipName", "schemeName"),
      payableAmount: explicitPayable ?? (originalAmount !== undefined && concessionAmount !== undefined
        ? Math.max(originalAmount - concessionAmount, 0) : undefined),
      selected: valueOf(row, "selected") !== false,
      required: [true, 1, "true", "1"].includes(valueOf(row, "isMandatory", "required")),
    };
  });
}

export function normalizeFeeDetails(detail) {
  return {
    ...detail,
    originalFee: numberOf(detail, "originalFee", "totalAmount"),
    concession: numberOf(detail, "concession", "concessionAmount"),
    scheduledFees: numberOf(detail, "scheduledFees"),
    totalPayable: numberOf(detail, "totalPayable", "payableAmount", "payable"),
    totalPaid: numberOf(detail, "totalPaid", "paidAmount", "paid"),
    outstandingBalance: numberOf(detail, "outstandingBalance", "balanceAmount", "balance"),
    breakdown: normalizeFeeBreakdown(rowsOf(valueOf(detail, "breakdown", "feeItems", "items"))),
    schedules: rowsOf(valueOf(detail, "schedules", "installments", "feeSchedules")).map(row => ({
      ...row,
      feeSchedule: textOf(row, "feeSchedule", "scheduleName", "installmentName")
        || (valueOf(row, "installmentNumber", "no") ? `Fee Schedule ${valueOf(row, "installmentNumber", "no")}` : "Schedule name unavailable"),
    })),
  };
}

export function assertFeeDetailIdentity(detail, expected) {
  for (const key of ["studentId", "studentFeeId"]) {
    const wanted = numberOf(expected, key, ...(key === "studentFeeId" ? ["assignmentId", "studentFeeAssignmentId"] : []));
    if (wanted !== undefined && wanted > 0 && numberOf(detail, key) !== wanted) {
      throw new Error("The returned fee details do not match the selected student and fee account. Refresh the list and try again.");
    }
  }
  for (const key of ["studentFeeId"]) {
    const id = numberOf(detail, key);
    for (const row of [...rowsOf(valueOf(detail, "breakdown")), ...rowsOf(valueOf(detail, "schedules"))]) {
      const childId = numberOf(row, key);
      if (childId > 0 && childId !== id) throw new Error("The response contains fee details from another account. Refresh the list and try again.");
    }
  }
}

export function feeDetailWarnings(detail, expected = {}) {
  const data = normalizeFeeDetails(detail);
  const warnings = [];
  if (data.breakdown.some(row => row.nameUnresolved)) warnings.push("Some saved fee names are unavailable. The fee mapping needs correction.");
  if (data.breakdown.some(row => row.originalAmount === undefined || row.concessionAmount === undefined || row.payableAmount === undefined)) {
    warnings.push("Some fee amounts or discounts were not returned. Missing values are shown as unavailable.");
  }
  const differs = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 0.01;
  if (data.breakdown.some(row => differs(row.payableAmount, row.originalAmount === undefined || row.concessionAmount === undefined
    ? undefined : Math.max(row.originalAmount - row.concessionAmount, 0)))) {
    warnings.push("Saved fee amounts, discounts and payables do not reconcile. Verify the account before collecting payment.");
  }
  if (differs(sumFeeValues(data.breakdown.filter(row => row.selected), "payableAmount"), data.totalPayable)) {
    warnings.push("Saved breakdown payable differs from the account total payable. These values need verification.");
  }
  const scheduleBalances = data.schedules.map(row => ({ balance: numberOf(row, "balanceAmount", "balance") }));
  const scheduleAmounts = data.schedules.map(row => ({ amount: numberOf(row, "amount") }));
  if (differs(sumFeeValues(scheduleAmounts, "amount"), data.scheduledFees)) {
    warnings.push("Saved schedule amounts differ from the summary scheduled fees. Refresh to verify these values.");
  }
  if (differs(sumFeeValues(scheduleBalances, "balance"), data.outstandingBalance)) {
    warnings.push("Saved schedule balances differ from the account outstanding balance. Verify payment allocations and fee adjustments.");
  }
  const expectedPayable = numberOf(expected, "totalPayable", "payableAmount", "payable");
  if (differs(data.totalPayable, expectedPayable)) warnings.push("The details total payable differs from the list record. Refresh to verify the saved totals.");
  return warnings;
}
