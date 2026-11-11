// A summary describes one saved configuration, never the sum of unrelated courses.
export function savedAcademicLevelLabel(id, name) {
  const level = Number(id);
  if (!Number.isInteger(level) || level <= 0) return "Year not configured";
  return String(name || "").trim() || (level === 1 ? "1st Year" : level === 2 ? "2nd Year" : "Year name unavailable");
}

export function savedStructureTotal(serverTotal, items) {
  if (serverTotal !== undefined && serverTotal !== null) return serverTotal;
  if (!items.length) return undefined;
  const active = items.filter(item => item.selected !== false);
  if (active.some(item => !Number.isFinite(item.originalAmount))) return undefined;
  return active.reduce((sum, item) => sum + item.originalAmount, 0);
}

export function savedStructureSummary(selected, structures) {
  if (!selected) return { first: undefined, second: undefined };
  const pair = structures.find(row => String(row.id) === String(selected.pairedStructureId)
    && String(row.pairedStructureId) === String(selected.id)
    && ["campusId", "boardId", "academicYearId", "groupId", "programId"].every(key =>
      String(row[key] ?? "") === String(selected[key] ?? "")));
  const records = pair ? [selected, pair] : [selected];
  return {
    first: records.find(row => Number(row.academicLevelId) === 1)?.totalFee,
    second: records.find(row => Number(row.academicLevelId) === 2)?.totalFee,
  };
}
