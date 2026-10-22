import { formatCurrency, formatCompactCurrency } from "../../data/feeManagementData.js";

export const readFee = (row, key) => row?.[key] ?? row?.[key[0].toUpperCase() + key.slice(1)];

export const feeText = (row, key) => readFee(row, key) ?? "-";

export function feeMoney(value) {
  return value == null || value === "" || !Number.isFinite(Number(value))
    ? "-" : formatCurrency(value);
}

export const feeCompactMoney = (value) => feeMoney(value) === "-" ? "-" : formatCompactCurrency(value);

export function pageOf(rows, page, search = "", status = "") {
  const term = search.trim().toLowerCase();
  const filtered = rows.filter((row) => (!term || Object.values(row).some((value) =>
    typeof value !== "object" && String(value ?? "").toLowerCase().includes(term)))
    && (!status || readFee(row, "status") === status));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / 10));
  const current = Math.min(pages, Math.max(1, page));
  const offset = (current - 1) * 10;
  return { rows: filtered.slice(offset, offset + 10), total, pages, current, start: total ? offset + 1 : 0, end: Math.min(offset + 10, total) };
}

// Structures only accept campusId on the server; board/year filtering must happen here.
export function scopedStructures(rows, params) {
  return rows.filter((row) => ["boardId", "academicYearId"].every((key) =>
    !params[key] || String(readFee(row, key)) === String(params[key])));
}

export function scopedFeeMasters(rows, params) {
  return rows.filter((row) => ["campusId", "boardId", "academicYearId"].every((key) => {
    const value = readFee(row, key);
    return !params[key] || value == null || value === "" || Number(value) === 0 || String(value) === String(params[key]);
  }));
}

export function feeDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function feeStatus(row) {
  const explicit = readFee(row, "status");
  if (typeof explicit === "string" && explicit.trim()) return explicit;
  const active = readFee(row, "isActive") ?? explicit;
  return active === true || active === 1 ? "Active" : active === false || active === 0 ? "Inactive" : "-";
}

export function splitFeeSchedules(rows, today) {
  const payable = rows.filter((row) => {
    const amount = readFee(row, "balance") ?? readFee(row, "amount");
    return Number(amount) > 0 && !["paid", "completed"].includes(String(readFee(row, "status") || "").toLowerCase());
  });
  return {
    overdue: payable.filter((row) => String(readFee(row, "dueDate") || "").slice(0, 10) && String(readFee(row, "dueDate")).slice(0, 10) < today),
    upcoming: payable.filter((row) => !readFee(row, "dueDate") || String(readFee(row, "dueDate")).slice(0, 10) >= today),
  };
}

export function savedYearSummary(row, structures) {
  const pairId = readFee(row, "pairedStructureId");
  const pair = structures.find((item) => pairId != null && String(readFee(item, "feeStructureId")) === String(pairId));
  const isSecond = Number(readFee(row, "academicLevelId")) === 2;
  return {
    first: isSecond ? readFee(pair, "totalAmount") : readFee(row, "totalAmount"),
    second: isSecond ? readFee(row, "totalAmount") : readFee(row, "secondYearTotalAmount") ?? readFee(pair, "totalAmount"),
  };
}
