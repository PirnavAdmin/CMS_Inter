import React from "react";

/**
 * Normalizes and returns a compact or short representation of a subject name for tight timetable cells.
 *
 * @param {string|object} subject - The subject string or subject object.
 * @returns {string} Short subject name.
 */
export function getShortSubjectName(subject) {
  if (!subject) return "";
  const name = typeof subject === "object"
    ? String(subject.subjectName || subject.name || subject.subjectCode || subject.code || "")
    : String(subject);

  const trimmed = name.trim();
  if (!trimmed) return "";

  // Common high-frequency subjects mapping to clean short names
  const knownShortMap = {
    "mathematics": "Maths",
    "mathematics i": "Maths I",
    "mathematics ii": "Maths II",
    "mathematics ia": "Maths IA",
    "mathematics ib": "Maths IB",
    "mathematics iia": "Maths IIA",
    "mathematics iib": "Maths IIB",
    "mathematics 1a": "Maths 1A",
    "mathematics 1b": "Maths 1B",
    "mathematics 2a": "Maths 2A",
    "mathematics 2b": "Maths 2B",
    "mathematics-ia": "Maths-IA",
    "mathematics-ib": "Maths-IB",
    "mathematics-iia": "Maths-IIA",
    "mathematics-iib": "Maths-IIB",
    "physics theory": "Physics",
    "chemistry theory": "Chemistry",
    "botany theory": "Botany",
    "zoology theory": "Zoology",
    "computer science": "Comp. Sci",
    "computer science practical": "Comp. Sci Lab",
    "physics practical": "Physics Lab",
    "chemistry practical": "Chemistry Lab",
    "botany practical": "Botany Lab",
    "zoology practical": "Zoology Lab",
    "commerce & accountancy": "Commerce",
    "economics & finance": "Economics",
    "civics & governance": "Civics",
    "environmental education": "Env. Edu",
  };

  const lower = trimmed.toLowerCase();
  if (knownShortMap[lower]) {
    return knownShortMap[lower];
  }

  return trimmed;
}

/**
 * Renders a start and end time stacked vertically to save horizontal column width in timetable headers.
 * Uses React.createElement for pure JS compatibility without JSX pragma.
 *
 * @param {string} time - Time string, e.g. "09:00 AM - 10:00 AM" or "09:00 - 10:00"
 * @returns {React.ReactElement|null} Stacked small element.
 */
export function renderStackedPeriodTime(time) {
  if (!time) return null;
  const timeStr = String(time).trim();
  if (!timeStr) return null;

  // Split on " - ", "-", " to ", or en/em dashes
  const parts = timeStr.split(/\s*[-–—]\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return React.createElement(
      "small",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1px",
          marginTop: "3px",
          fontSize: "11px",
          lineHeight: 1.15,
          fontWeight: 500,
          opacity: 0.88,
        },
      },
      React.createElement("span", null, parts[0]),
      React.createElement("span", { style: { fontSize: "9px", opacity: 0.65, lineHeight: 1 } }, "to"),
      React.createElement("span", null, parts[1])
    );
  }

  return React.createElement(
    "small",
    {
      style: {
        display: "block",
        marginTop: "3px",
        fontSize: "11px",
        lineHeight: 1.2,
        opacity: 0.88,
      },
    },
    timeStr
  );
}

export default {
  getShortSubjectName,
  renderStackedPeriodTime,
};
