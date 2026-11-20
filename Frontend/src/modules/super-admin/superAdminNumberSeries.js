/**
 * Super Admin - College Code & Number Series Configuration
 * Provides configurable user-based ID & Number Series for Colleges
 * References Admin Number Series pattern without altering Admin files.
 */

const STORAGE_KEY = "pirnav_college_code_series";

export const DEFAULT_COLLEGE_SERIES = {
  prefix: "COL",
  separator: "-",
  yearFormat: "YYYY", // 'YYYY' | 'YY' | 'NONE'
  padding: 3,         // 3 -> 001, 4 -> 0001
  startNumber: 1,
  currentSequence: 14,
  template: "{PREFIX}-{YYYY}-{SEQ}",
  description: "Automated series pattern for assigning official College Codes upon registration.",
};

export const SAMPLE_PRESETS = [
  { label: "COL-2026-001 (Standard)", template: "{PREFIX}-{YYYY}-{SEQ}", separator: "-", yearFormat: "YYYY", padding: 3 },
  { label: "COL-001 (Compact)", template: "{PREFIX}-{SEQ}", separator: "-", yearFormat: "NONE", padding: 3 },
  { label: "COL0001 (Direct 4-Digit)", template: "{PREFIX}{SEQ}", separator: "", yearFormat: "NONE", padding: 4 },
  { label: "COL/26/001 (Slash Year)", template: "{PREFIX}/{YY}/{SEQ}", separator: "/", yearFormat: "YY", padding: 3 },
  { label: "INST_2026_0001 (Underscore)", template: "{PREFIX}_{YYYY}_{SEQ}", separator: "_", yearFormat: "YYYY", padding: 4 },
];

export function getCollegeCodeSeriesSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_COLLEGE_SERIES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_COLLEGE_SERIES, ...parsed };
    }
  } catch (err) {
    console.warn("Could not load college code series settings:", err);
  }
  return { ...DEFAULT_COLLEGE_SERIES };
}

export function saveCollegeCodeSeriesSettings(settings) {
  if (typeof window === "undefined") return settings;
  try {
    const merged = { ...DEFAULT_COLLEGE_SERIES, ...settings };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error("Could not save college code series settings:", err);
    return settings;
  }
}

/**
 * Builds a college code string from settings and a sequence number
 */
export function formatCollegeCode(settings = {}, seqNumber = 1, customPrefix = null) {
  const conf = { ...DEFAULT_COLLEGE_SERIES, ...settings };
  const prefix = (customPrefix || conf.prefix || "COL").toUpperCase().trim();
  const sep = conf.separator !== undefined ? conf.separator : "-";
  const padding = Number(conf.padding) || 3;
  const seqStr = String(Math.max(1, seqNumber)).padStart(padding, "0");

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);

  let result = conf.template || "{PREFIX}-{YYYY}-{SEQ}";
  result = result.replace(/\{PREFIX\}/g, prefix);

  if (conf.yearFormat === "YYYY") {
    result = result.replace(/\{YYYY\}/g, yyyy).replace(/\{YY\}/g, yy);
  } else if (conf.yearFormat === "YY") {
    result = result.replace(/\{YYYY\}/g, yy).replace(/\{YY\}/g, yy);
  } else {
    // NONE: remove year token and any surrounding delimiter
    result = result
      .replace(/-\{YYYY\}-/g, "-")
      .replace(/\/{YYYY}\//g, "/")
      .replace(/_\{YYYY\}_/g, "_")
      .replace(/\{YYYY\}/g, "")
      .replace(/-\{YY\}-/g, "-")
      .replace(/\/{YY}\//g, "/")
      .replace(/_\{YY\}_/g, "_")
      .replace(/\{YY\}/g, "");
  }

  result = result.replace(/\{SEQ\}/g, seqStr);
  return result;
}

/**
 * Returns the next generated college code and optionally increments the sequence
 */
export function getNextCollegeCode(customPrefix = null, existingCollegesCount = 0) {
  const conf = getCollegeCodeSeriesSettings();
  const baseCount = Math.max(Number(conf.currentSequence) || 0, Number(existingCollegesCount) || 0);
  const nextSeq = baseCount + 1;
  return formatCollegeCode(conf, nextSeq, customPrefix);
}

/**
 * Increments the current counter in localStorage
 */
export function incrementCollegeCodeSequence() {
  const conf = getCollegeCodeSeriesSettings();
  conf.currentSequence = (Number(conf.currentSequence) || 0) + 1;
  saveCollegeCodeSeriesSettings(conf);
  return conf.currentSequence;
}

