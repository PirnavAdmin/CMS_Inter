const field = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key] ?? record?.[key[0].toUpperCase() + key.slice(1)];
    if (value != null) return value;
  }
};

export function normalizeStudentStatus(value) {
  const numeric = { 1: "Present", 2: "Absent", 4: "Half Day", 5: "Holiday" };
  if (numeric[value]) return numeric[value];
  return ({ present: "Present", absent: "Absent", halfday: "Half Day", holiday: "Holiday" })[
    String(value ?? "").toLowerCase().replace(/[\s_-]/g, "")
  ] ?? null;
}

export function summarizeStudentAttendance(payload, viewBy) {
  if (payload?.success === false || payload?.Success === false) throw new Error(payload.message || payload.Message || "Unable to load student attendance.");
  const data = payload?.data ?? payload?.Data ?? payload;
  const rows = Array.isArray(data) ? data : data?.items ?? data?.Items ?? data?.$values;
  if (!Array.isArray(rows)) throw new Error("The student attendance API returned an unsupported response.");
  const processed = rows.map((row) => {
    const session = (name) => normalizeStudentStatus(field(row, `${name}Status`, `${name}AttendanceStatus`, `${name}SessionStatus`, name, `${name}Attendance`));
    const morning = session("morning"), afternoon = session("afternoon");
    let status = null;
    if (morning === "Half Day" || afternoon === "Half Day" ||
        (morning === "Present" && afternoon === "Absent") || (afternoon === "Present" && morning === "Absent")) status = "Half Day";
    else if (morning === "Present" || afternoon === "Present") status = "Present";
    else if (morning === "Absent" || afternoon === "Absent") status = "Absent";
    else if (morning === "Holiday" || afternoon === "Holiday") status = "Holiday";
    // Legacy attendance is a fallback only when neither session has a value.
    else if (field(row, "morningStatus", "morningAttendanceStatus", "morningSessionStatus", "morning", "morningAttendance") == null &&
             field(row, "afternoonStatus", "afternoonAttendanceStatus", "afternoonSessionStatus", "afternoon", "afternoonAttendance") == null) status = normalizeStudentStatus(field(row, "status"));
    return { row, status };
  }).filter(({ status }) => ["Present", "Absent", "Half Day"].includes(status));
  const count = (items) => {
    const present = items.filter((item) => item.status === "Present").length;
    const absent = items.filter((item) => item.status === "Absent").length;
    const halfDay = items.filter((item) => item.status === "Half Day").length;
    return { total: items.length, present, absent, halfDay, percentage: items.length ? Math.round((present + 0.5 * halfDay) * 100 / items.length) : 0 };
  };
  const groups = new Map();
  if (viewBy !== "Overall") processed.forEach((item) => {
    const name = viewBy === "Academic Level" ? field(item.row, "academicLevelName", "levelName") || "Academic level not provided"
      : viewBy === "Group" ? field(item.row, "groupName") || "Group not provided"
        : field(item.row, "sectionName") || "Section not provided";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  });
  return { ...count(processed), breakdownList: [...groups].map(([name, items]) => ({ name, ...count(items) })) };
}
