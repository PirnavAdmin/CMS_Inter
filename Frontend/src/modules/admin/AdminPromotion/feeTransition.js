export const readFeeValue = (item, ...keys) => {
  for (const key of keys) {
    const value = item?.[key] ?? item?.[key[0].toUpperCase() + key.slice(1)];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const amount = (value) => {
  if (value === undefined || value === null || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const normalizeFeeStructure = (item = {}) => ({
  id: Number(readFeeValue(item, "feeStructureId", "targetFeeStructureId", "id")) || null,
  name: readFeeValue(item, "feeStructureName", "structureName", "name", "targetFeeStructureName") || "",
  total: amount(readFeeValue(item, "totalFee", "totalAmount", "targetTotalFee", "targetProgramFee")),
  components: (Array.isArray(readFeeValue(item, "components", "items", "feeItems", "breakdown"))
    ? readFeeValue(item, "components", "items", "feeItems", "breakdown") : []).map((row) => ({
    name: readFeeValue(row, "feeTypeName", "componentName", "name") || "",
    amount: amount(readFeeValue(row, "amount", "feeAmount")),
  })),
});

export const normalizeFeePreview = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload ?? {};
  const target = readFeeValue(data, "targetFeeStructure", "destinationFeeStructure", "matchedFeeStructure", "targetStructure") || data;
  const selected = normalizeFeeStructure(target);
  const options = readFeeValue(data, "availableFeeStructures", "feeStructures", "targetFeeStructures") || [];
  const structures = Array.isArray(options) ? options.map(normalizeFeeStructure).filter((row) => row.id) : [];
  if (selected.id && !structures.some((row) => row.id === selected.id)) structures.unshift(selected);
  const current = readFeeValue(data, "currentFee", "currentCampusFee", "currentFeeAccount", "currentProgram");
  const total = amount(current ? readFeeValue(current, "totalFee", "totalAmount") : readFeeValue(data, "currentTotalFee", "currentProgramFee"));
  const paid = amount(current ? readFeeValue(current, "paidAmount", "totalPaid") : readFeeValue(data, "currentPaidAmount", "paidAmount"));
  const balance = amount(current ? readFeeValue(current, "balanceAmount", "outstandingBalance", "outstanding") : readFeeValue(data, "currentBalance", "outstandingBalance"));
  const arrears = readFeeValue(data, "arrearsSummary", "priorArrearsSummary") || data;
  return {
    structures,
    selectedId: selected.id || structures[0]?.id || null,
    current: { total, paid, balance: balance ?? (total !== null && paid !== null ? total - paid : null) },
    targetTotal: selected.total ?? amount(readFeeValue(data, "targetProgramFee", "targetTotalFee", "destinationTotalFee")),
    difference: amount(readFeeValue(data, "difference", "feeDifference", "differentialAmount")),
    arrearsTotal: amount(readFeeValue(arrears, "totalArrears", "totalOutstanding", "totalOutstandingArrears")),
    arrearsCount: amount(readFeeValue(arrears, "studentsWithArrears", "studentCount", "studentsWithOutstandingArrears")),
  };
};

export const selectFeeStructure = (preview, requestedId) => preview?.structures.find((row) => row.id === Number(requestedId))
  || preview?.structures.find((row) => row.id === preview.selectedId) || preview?.structures[0] || null;

export const promotionFeePayload = (preview, config) => {
  const structure = selectFeeStructure(preview, config.targetFeeStructureId);
  if (!structure?.id) throw new Error("A matching target fee structure is required.");
  const count = config.paymentPlan === "Full Payment" ? 1 : config.paymentPlan === "Term-wise" ? 3 : Number(config.numberOfInstallments);
  if (!["Full Payment", "Term-wise", "Custom Installments"].includes(config.paymentPlan)
    || !Number.isInteger(count) || count < 1 || count > 6 || (config.paymentPlan === "Custom Installments" && count < 2)) {
    throw new Error("Choose a valid payment plan and 2 to 6 custom installments.");
  }
  return { targetFeeStructureId: structure.id, paymentPlan: config.paymentPlan, numberOfInstallments: count };
};

export const programAllocationBatches = (entries, previews, updateFees) => {
  const batches = new Map();
  for (const entry of entries) {
    const match = previews?.find((row) => row.studentId === entry.studentId && row.targetProgramId === entry.targetProgramId);
    const structure = selectFeeStructure(match?.fee);
    if (updateFees && (!structure?.id || match?.error)) throw new Error("Load a matching fee preview for every selected student before adjusting fees.");
    const key = `${entry.targetProgramId}:${updateFees ? structure.id : "unchanged"}`;
    if (!batches.has(key)) batches.set(key, {
      studentIds: [], targetProgramId: entry.targetProgramId, updateFees,
      ...(updateFees ? { targetFeeStructureId: structure.id } : {}),
    });
    batches.get(key).studentIds.push(entry.studentId);
  }
  return [...batches.values()];
};
