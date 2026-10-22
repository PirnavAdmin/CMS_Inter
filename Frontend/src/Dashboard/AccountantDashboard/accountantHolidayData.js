// Accountant-scoped adapter: live holiday pages, staff applicability, and response mapping.
const valueOf = (item, key) => item?.[key] ?? item?.[key[0].toUpperCase() + key.slice(1)];
const fields = ["id", "campusId", "academicYearId", "boardId", "holidayName", "holidayType", "appliesTo", "dateType", "status", "lifecycleStatus", "description", "formattedDateRange"];
const isoDate = value => String(value ?? "").slice(0, 10);

export function normalizeHoliday(raw) {
  const holiday = Object.fromEntries(fields.map(key => [key, valueOf(raw, key)]));
  holiday.startDate = isoDate(valueOf(raw, "startDate") || valueOf(raw, "holidayDate"));
  holiday.endDate = isoDate(valueOf(raw, "endDate") || holiday.startDate);
  if (holiday.id == null || !holiday.startDate || !holiday.endDate || Number.isNaN(Date.parse(holiday.startDate)) || Number.isNaN(Date.parse(holiday.endDate)) || holiday.endDate < holiday.startDate) {
    throw new Error("The holiday API returned an invalid record.");
  }
  return holiday;
}

export function isApplicableHoliday(holiday, scope) {
  // These are the staff audiences supported by the existing holiday editor/backend.
  const audience = String(holiday.appliesTo || "").trim().toLowerCase();
  if (audience !== "all students & staff" && audience !== "staff only") return false;
  return ["campusId", "boardId", "academicYearId"].every(key => holiday[key] == null || (scope[key] != null && String(holiday[key]) === String(scope[key])));
}

export async function loadAccountantHolidays(fetchPage, scope, isCurrent = () => true) {
  const records = new Map();
  let page = 1;
  while (true) {
    const response = await fetchPage({ ...scope, page, pageSize: 100 });
    if (!isCurrent()) return null;
    const body = response?.data;
    if ((body?.success ?? body?.Success ?? body?.status ?? body?.Status) === false) throw new Error(body?.message || body?.Message || "Holiday request failed.");
    const rows = Array.isArray(body) ? body : valueOf(body, "data");
    if (!Array.isArray(rows)) throw new Error("The holiday API returned an invalid list response.");
    const before = records.size;
    for (const raw of rows) {
      const holiday = normalizeHoliday(raw);
      records.set(String(holiday.id), holiday);
    }
    const totalPages = Number(valueOf(body, "totalPages"));
    const total = Number(valueOf(body, "total"));
    const hasNext = Number.isFinite(totalPages) && totalPages > 0 ? page < totalPages : Number.isFinite(total) && total > 0 ? records.size < total : false;
    if (!hasNext) break;
    if (records.size === before) throw new Error("The holiday API did not return the next page of records. Please retry.");
    page += 1;
  }
  return [...records.values()].filter(holiday => isApplicableHoliday(holiday, scope));
}

export function overlapsMonth(startDate, endDate, month) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const target = Number(month) - 1;
  const span = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (span >= 11) return true;
  for (let offset = 0; offset <= span; offset += 1) {
    if ((start.getMonth() + offset) % 12 === target) return true;
  }
  return false;
}
