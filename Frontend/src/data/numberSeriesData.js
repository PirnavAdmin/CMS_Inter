import { getAuthUser } from "../modules/auth/authStorage.js";

export function getCollegeAcronym() {
  try {
    const u = getAuthUser();
    if (u?.collegeCode) {
      const codePart = String(u.collegeCode).split("-")[0].toUpperCase().trim();
      if (codePart && codePart !== "COL") return codePart;
    }
    if (u?.collegeName) {
      const words = String(u.collegeName).trim().split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return words.map(w => w[0]).join("").toUpperCase().slice(0, 5);
      }
      return String(u.collegeName).replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
    }
    if (u?.collegeId && Number(u.collegeId) > 1) {
      return `COL${u.collegeId}`;
    }
  } catch {}
  return "PC";
}

export function getNumberSeriesStorageKey() {
  try {
    const u = getAuthUser();
    const cid = u?.collegeId ? `_c${u.collegeId}` : "";
    const cpid = u?.campusId ? `_cp${u.campusId}` : "";
    return `cms_number_series_settings_v5${cid}${cpid}`;
  } catch {
    return "cms_number_series_settings_v5";
  }
}

export function getFixedNumberSeries() {
  const acr = getCollegeAcronym();
  return [
    {
      id: "teaching-staff-id",
      key: "teaching-staff-id",
      name: "Teaching Staff ID",
      category: "Staff Management",
      prefix: `${acr}TCH`,
      format: "{PREFIX}{SEQ}",
      numberLength: 4,
      startNumber: 1,
      currentNumber: 0,
      totalGenerated: 0,
      currentExample: `${acr}TCH0001`,
      description: "Configure ID series for Professors, Lecturers and Teaching staff.",
      status: "Active",
      allowedTokens: ["{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{DEPT}", "{DESIG}", "{STAFF}"],
      sampleFormats: [
        { format: `${acr}TCH{SEQ}`, example: `${acr}TCH0001` },
        { format: "TCH-{YYYY}-{SEQ}", example: "TCH-2026-0001" },
        { format: "FAC-{DEPT}-{SEQ}", example: "FAC-MATH-0001" },
      ],
    },
    {
      id: "roll-no",
      key: "roll-no",
      seriesCode: "ROLL_NO",
      name: "Roll Number",
      category: "Student Management",
      description: "Sequence resets uniquely per Campus + Board + Academic Year + Group + Program.",
      prefix: "",
      format: "{YY}{CAMPUS:2}{BOARD:1}{PROGRAM:1}{GROUP:1}{SEQ}",
      numberLength: 4,
      startNumber: 1,
      currentNumber: 0,
      currentSequence: 0,
      isActive: true,
      allowedTokens: ["{SEQ}", "{GROUP}", "{GROUP:1}", "{SECTION}", "{YYYY}", "{YY}", "{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{BOARD}", "{BOARD:1}", "{PROGRAM}", "{PROGRAM:1}", "{AY}", "{LEVEL}"],
      sampleFormats: [
        { format: "{YY}{CAMPUS:2}{BOARD:1}{PROGRAM:1}{GROUP:1}{SEQ}", example: "26MUB1M0001" },
        { format: "ROLL-{AY}-{GROUP}-{SEQ}", example: "ROLL-2026-MPC-0001" },
        { format: "{CAMPUS}-{GROUP}-{SEQ}", example: "MC-MPC-0001" },
      ],
    },
    {
      id: "non-teaching-staff-id",
      key: "non-teaching-staff-id",
      name: "Non-Teaching Staff ID",
      category: "Staff Management",
      prefix: `${acr}NT`,
      format: "{PREFIX}{SEQ}",
      numberLength: 4,
      startNumber: 1,
      currentNumber: 0,
      totalGenerated: 0,
      currentExample: `${acr}NT0001`,
      description: "Configure ID series for Administrative, Technical and Support staff.",
      status: "Active",
      allowedTokens: ["{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{DEPT}", "{DESIG}", "{STAFF}"],
      sampleFormats: [
        { format: `${acr}NT{SEQ}`, example: `${acr}NT0001` },
        { format: "NT-{YYYY}-{SEQ}", example: "NT-2026-0001" },
        { format: "ADM-{DEPT}-{SEQ}", example: "ADM-OFFICE-0001" },
      ],
    },
    {
      id: "admission-no",
      key: "admission-no",
      name: "Admission No.",
      category: "Student Admissions",
      prefix: "ADM",
      format: "{CAMPUS}-{PREFIX}-{YY}-{SEQ}",
      numberLength: 4,
      startNumber: 1,
      currentNumber: 0,
      totalGenerated: 0,
      currentExample: "MAIN-ADM-26-0001",
      description: "Configure admission number format for students.",
      status: "Active",
      allowedTokens: ["{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{AY}", "{BOARD}"],
      sampleFormats: [
        { format: "{CAMPUS}-ADM-{YY}-{SEQ}", example: "MAIN-ADM-26-0001" },
        { format: "ADM-{SEQ}", example: "ADM-0001" },
        { format: "ADM-{AY}-{SEQ}", example: "ADM-2026-0001" },
      ],
    },
    {
      id: "exam-code",
      key: "exam-code",
      name: "Exam Code",
      category: "Examinations",
      prefix: "EXAM",
      format: "{GROUP}-{TYPE}-{YEAR}",
      numberLength: 4,
      startNumber: 1,
      currentNumber: 0,
      totalGenerated: 0,
      currentExample: "MPC-FINAL-2025",
      description: "Configure code format for examination schedules and assessments.",
      status: "Active",
      allowedTokens: ["{GROUP}", "{TYPE}", "{YEAR}", "{SEQ}", "{EXAM}"],
      sampleFormats: [
        { format: "{GROUP}-{TYPE}-{YEAR}", example: "MPC-FINAL-2025" },
        { format: "EXAM-{YEAR}-{SEQ}", example: "EXAM-2026-0001" },
      ],
    },
    {
      id: "offer-letter-no",
      key: "offer-letter-no",
      seriesCode: "OFFER_LETTER_NO",
      name: "Staff Offer Letter Number",
      category: "Staff Management",
      prefix: `${acr}-OL`,
      format: "{CAMPUS}-{PREFIX}/{YEAR}/{SEQ}",
      numberLength: 4,
      startNumber: 1,
      currentNumber: 0,
      totalGenerated: 0,
      currentExample: `${acr}-OL/2026/0001`,
      description: "Official serial numbering sequence for institutional faculty and staff offer letters.",
      status: "Active",
      allowedTokens: ["{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{YEAR}", "{YYYY}", "{SEQ}", "{DEPT}"],
      sampleFormats: [
        { format: "{CAMPUS}-OL/{YEAR}/{SEQ}", example: `${acr}-OL/2026/0001` },
        { format: `OL-${acr}-{YEAR}-{SEQ}`, example: `OL-${acr}-2026-0001` },
      ],
    },
    {
      id: "staff-transfer-no",
      key: "staff-transfer-no",
      seriesCode: "TRANSFER_ORDER_NO",
      name: "Staff Transfer Order Number",
      category: "Staff Management",
      prefix: "TRF",
      format: "{CAMPUS}-{PREFIX}/{YEAR}/{SEQ}",
      numberLength: 4,
      startNumber: 1,
      currentNumber: 0,
      totalGenerated: 0,
      currentExample: "MAIN-TRF/2026/0001",
      description: "Official serial numbering sequence for inter-campus faculty and staff transfer orders.",
      status: "Active",
      allowedTokens: ["{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{YEAR}", "{YYYY}", "{SEQ}"],
      sampleFormats: [
        { format: "{CAMPUS}-TRF/{YEAR}/{SEQ}", example: "MAIN-TRF/2026/0001" },
        { format: "TRF-{CAMPUS}-{YEAR}-{SEQ}", example: "TRF-MAIN-2026-0001" },
      ],
    },
    {
      id: "receipt-no",
      key: "receipt-no",
      name: "Receipt No.",
      category: "Fee Management",
      prefix: "FEE",
      format: "{CAMPUS}-{PREFIX}-{YYYYMMDD}-{SEQ}",
      numberLength: 6,
      startNumber: 1,
      currentNumber: 0,
      totalGenerated: 0,
      currentExample: "MAIN-FEE-20260904-000001",
      description: "Configure receipt number format for fee collections.",
      status: "Active",
      allowedTokens: ["{PREFIX}", "{CAMPUS}", "{CAMPUS:2}", "{YYYYMMDD}", "{YYYY}", "{MM}", "{DD}", "{SEQ}"],
      sampleFormats: [
        { format: "{CAMPUS}-FEE-{YYYYMMDD}-{SEQ}", example: "MAIN-FEE-20260904-000011" },
        { format: "RCP-{YYYY}-{SEQ}", example: "RCP-2026-000001" },
        { format: "FEE-{SEQ}", example: "FEE-000001" },
      ],
    },
  ];
}

export const FIXED_NUMBER_SERIES = getFixedNumberSeries();

export function normalizeNumberSeriesItem(item = {}) {
  const rawCode = item.seriesCode || item.SeriesCode || item.slug || item.key || item.id || "";
  const code = String(rawCode).toLowerCase().replace(/_/g, '-');
  const name = item.seriesName || item.SeriesName || item.name || code;
  let rawFormat = item.formatPattern || item.FormatPattern || item.format || "{SEQ}";
  if (typeof rawFormat === "string") {
    rawFormat = rawFormat
      .replace(/-ADM-/g, "-{PREFIX}-")
      .replace(/-FEE-/g, "-{PREFIX}-")
      .replace(/-OL\//g, "-{PREFIX}/")
      .replace(/-TRF\//g, "-{PREFIX}/");
    if (rawFormat.includes("TCH{SEQ}") && !rawFormat.includes("{PREFIX}")) rawFormat = "{PREFIX}{SEQ}";
    if (rawFormat.includes("NT{SEQ}") && !rawFormat.includes("{PREFIX}")) rawFormat = "{PREFIX}{SEQ}";
  }
  const format = rawFormat;
  const prefix = item.prefix || item.Prefix || "";
  const numberLength = Number(item.numberLength ?? item.NumberLength ?? 4);
  const startNumber = Number(item.startNumber ?? item.StartNumber ?? 1);
  const currentSequence = Number(item.currentSequence ?? item.CurrentSequence ?? item.currentNumber ?? 0);
  const allowedTokens = item.availablePlaceholders || item.AvailablePlaceholders || item.allowedTokens || ["{SEQ}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{CAMPUS}", "{AY}", "{BOARD}", "{GROUP}"];
  const sampleFormatsRaw = item.sampleFormats || item.SampleFormats || [];
  const sampleFormats = sampleFormatsRaw.map((sf) => ({
    format: sf.pattern || sf.format || "",
    pattern: sf.pattern || sf.format || "",
    example: sf.example || "",
  }));
  const description = item.description || item.Description || "";
  const isActive = item.isActive ?? item.IsActive ?? true;
  const dynamicPreview = buildNumberFromFormat(format, currentSequence + 1, numberLength);
  
  const currentExample = (item.CurrentSequence !== undefined || item.currentSequence !== undefined) 
      ? buildNumberFromFormat(format, currentSequence > 0 ? currentSequence : startNumber, numberLength) 
      : (item.currentExample || dynamicPreview);
      
  const livePreview = (item.LivePreview || item.livePreview) 
      ? (item.LivePreview || item.livePreview) 
      : dynamicPreview;

  return {
    ...item,
    id: code,
    key: code,
    seriesCode: code,
    slug: item.slug || code,
    name,
    seriesName: name,
    prefix,
    format,
    formatPattern: format,
    numberLength,
    startNumber,
    currentSequence,
    currentNumber: currentSequence,
    totalGenerated: item.totalGenerated ?? currentSequence,
    allowedTokens,
    availablePlaceholders: allowedTokens,
    sampleFormats,
    description,
    isActive,
    status: isActive ? "Active" : "Inactive",
    currentExample: currentExample || dynamicPreview,
    livePreview: livePreview || dynamicPreview,
  };
}

export function isSeriesRemoved(item) {
  if (!item) return true;
  const key = String(item.id || item.key || item.seriesCode || item.slug || "").toLowerCase().trim().replace(/[\s_]+/g, "-");
  const name = String(item.name || item.seriesName || "").toLowerCase().trim();

  // Permanently suppress obsolete / redundant cards
  if (
    key.includes("certificate") ||
    name.includes("certificate") ||
    key === "employee-id" ||
    key === "student-id" ||
    key === "section-name" ||
    key === "library-id" ||
    key === "hostel-id" ||
    key.startsWith("student-roll-no-") ||
    name === "student roll" ||
    name === "student roll no"
  ) {
    return true;
  }

  try {
    const deletedRaw = localStorage.getItem('NumberSeries_Deleted');
    if (deletedRaw) {
      const deletedList = JSON.parse(deletedRaw);
      if (Array.isArray(deletedList) && (deletedList.includes(key) || deletedList.includes(name))) {
        return true;
      }
    }
  } catch {
    // Ignore storage errors
  }

  if (item.isDeleted === true) return true;
  return false;
}

// --- LIVE GENERATED HISTORY (Zero mock fallback) ---
export const MOCK_GENERATED_HISTORY = {};

// --- LIVE CONFIGURATION HISTORY LOGS (Zero mock fallback) ---
export const MOCK_CONFIG_HISTORY = {};

// --- HELPER STORAGE READ / WRITE ---
export function readNumberSeriesSettings() {
  try {
    const storageKey = getNumberSeriesStorageKey();
    const raw = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
    const defaults = getFixedNumberSeries();
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaults;
    
    // Filter out removed and legacy hidden series
    const cleanParsed = parsed.filter((p) => p && !isSeriesRemoved(p));
    
    const getCanonicalKey = (item) => {
      const rawCode = item.seriesCode || item.slug || item.key || item.id || item.name || "";
      let code = String(rawCode).toUpperCase().replace(/[\s-]+/g, '_');
      if (code === 'STUDENT_ROLL_NO' || code === 'STUDENT_ROLL') code = 'ROLL_NO';
      if (code === 'STAFF_TRANSFER_NO' || code === 'STAFF_TRANSFER_ORDER_NUMBER' || code === 'STAFF_TRANSFER_ORDER_NO') code = 'TRANSFER_ORDER_NO';
      if (code === 'STAFF_OFFER_LETTER_NO' || code === 'STAFF_OFFER_LETTER_NUMBER' || code === 'OFFER_LETTER') code = 'OFFER_LETTER_NO';
      return code;
    };

    const seenCanonical = new Set();
    const result = [];

    // Map onto FIXED_NUMBER_SERIES first so our 8 canonical cards always come first in stable order
    defaults.forEach((fixed) => {
      const fixedKey = getCanonicalKey(fixed);
      const found = cleanParsed.find((p) => {
        return (
          p.id === fixed.id ||
          p.key === fixed.key ||
          (p.seriesCode && fixed.seriesCode && p.seriesCode === fixed.seriesCode) ||
          getCanonicalKey(p) === fixedKey
        );
      });
      seenCanonical.add(fixedKey);
      result.push(found ? { ...fixed, ...found, seriesCode: fixed.seriesCode || found.seriesCode } : fixed);
    });
    
    // Append any genuine custom series created by user (not in FIXED_NUMBER_SERIES)
    cleanParsed.forEach((p) => {
      const pKey = getCanonicalKey(p);
      if (!seenCanonical.has(pKey)) {
        seenCanonical.add(pKey);
        result.push(p);
      }
    });
    
    return result;
  } catch {
    return defaults;
  }
}

export function writeNumberSeriesSettings(list) {
  try {
    const cleanList = (Array.isArray(list) ? list : []).filter((item) => !isSeriesRemoved(item));
    const json = JSON.stringify(cleanList);
    const storageKey = getNumberSeriesStorageKey();
    localStorage.setItem(storageKey, json);
    sessionStorage.setItem(storageKey, json);
  } catch (err) {
    console.error("Failed to save number series settings", err);
  }
}

// --- HELPER READ / WRITE CONFIG HISTORY ---
export function readConfigHistory(seriesId) {
  try {
    const raw = localStorage.getItem(`pirnav_config_hist_${seriesId}`);
    if (!raw) return MOCK_CONFIG_HISTORY[seriesId] || [];
    return JSON.parse(raw);
  } catch {
    return MOCK_CONFIG_HISTORY[seriesId] || [];
  }
}

export function appendConfigHistory(seriesId, newConfig) {
  const current = readConfigHistory(seriesId);
  const updatedPrevious = current.map((item) => ({ ...item, status: "Previous" }));
  const nextVersionNum = (updatedPrevious.length + 1.0).toFixed(1);
  const nowStr = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  
  const newRow = {
    version: `v${nextVersionNum}`,
    format: newConfig.format,
    prefix: newConfig.prefix || "—",
    length: newConfig.numberLength,
    startNum: newConfig.startNumber,
    changedBy: "Admin",
    date: nowStr,
    status: "Active",
  };
  const newList = [newRow, ...updatedPrevious];
  try {
    localStorage.setItem(`pirnav_config_hist_${seriesId}`, JSON.stringify(newList));
  } catch {
    // Ignore storage errors
  }
  return newList;
}

// --- TOKEN REPLACEMENT & NUMBER FORMATTING ENGINE ---
export function buildNumberFromFormat(format, seqNum, numberLength = 4, customTokens = {}) {
  if (!format) return "—";
  const num = Number(seqNum || 1);
  const padded = String(num).padStart(Number(numberLength || 1), "0");

  const now = new Date();
  const year = now.getFullYear();
  const shortYear = String(year).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const yyyymmdd = `${year}${month}${day}`;

  // Random uppercase hex value for {RANDOM} token
  const randomVal = customTokens.RANDOM || "82FC40";

  let result = format;
  result = result.replace(/{SEQ}/g, padded);
  result = result.replace(/{YYYY}/g, customTokens.YYYY || String(year));
  result = result.replace(/{YY}/g, customTokens.YY || shortYear);
  result = result.replace(/{MM}/g, customTokens.MM || month);
  result = result.replace(/{DD}/g, customTokens.DD || day);
  result = result.replace(/{YYYYMMDD}/g, customTokens.YYYYMMDD || yyyymmdd);

  // Series specific tokens
  result = result.replace(/{DEPT}/g, customTokens.DEPT || "MATH");
  result = result.replace(/{DESIG}/g, customTokens.DESIG || "HOD");
  result = result.replace(/{PREFIX}/g, customTokens.PREFIX !== undefined ? customTokens.PREFIX : "");
  const grpStr = customTokens.GROUP || "GROUP";
  result = result.replace(/{GROUP}/g, grpStr);
  result = result.replace(/{GROUP:1}/g, grpStr.startsWith("[") ? grpStr : grpStr.substring(0, 1));
  result = result.replace(/{SECTION}/g, customTokens.SECTION || "A");
  
  const campusStr = customTokens.CAMPUS || "M";
  result = result.replace(/{CAMPUS}/g, campusStr.toUpperCase());
  result = result.replace(/{CAMPUS:2}/g, campusStr.startsWith("[") ? campusStr : (campusStr.length >= 2 ? campusStr.substring(0, 2).toUpperCase() : campusStr.toUpperCase()));
  
  const prgStr = customTokens.PROGRAM || "PROGRAM";
  result = result.replace(/{PROGRAM}/g, prgStr);
  result = result.replace(/{PROGRAM:1}/g, prgStr.startsWith("[") ? prgStr : prgStr.substring(0, 1));
  
  const brdStr = customTokens.BOARD || "BIEAP";
  result = result.replace(/{BOARD}/g, brdStr);
  result = result.replace(/{BOARD:1}/g, brdStr.startsWith("[") ? brdStr : brdStr.substring(0, 1));
  
  result = result.replace(/{STAFF}/g, customTokens.STAFF || "FAC");
  result = result.replace(/{AY}/g, customTokens.AY || `${year}-${year + 1}`);
  result = result.replace(/{LEVEL}/g, customTokens.LEVEL || "SR");
  result = result.replace(/{EXAM}/g, customTokens.EXAM || "FINAL");
  result = result.replace(/{TYPE}/g, customTokens.TYPE || "FINAL");
  result = result.replace(/{YEAR}/g, customTokens.YEAR || String(year));
  result = result.replace(/{CERT}/g, customTokens.CERT || "CND");
  result = result.replace(/{RANDOM}/g, randomVal);

  return result;
}

// --- BACKWARD COMPATIBILITY EXPORTS FOR OTHER MODULES (StaffManagementPage, etc.) ---
export const initialNumberSeries = FIXED_NUMBER_SERIES;

export function formatSeriesNumber(series, sequenceNum = null, customTokens = {}) {
  if (!series) return "—";
  const num = sequenceNum !== null ? sequenceNum : (Number(series.currentNumber || 0) + 1);
  return buildNumberFromFormat(series.format || "ID{SEQ}", num, series.numberLength || 4, customTokens);
}

export function findSeriesConfig(seriesKey) {
  const seriesList = readNumberSeriesSettings();
  const normalizedKey = String(seriesKey || "").trim().toLowerCase();
  let series = seriesList.find((s) =>
    s.key === seriesKey ||
    s.id === seriesKey ||
    String(s.slug || "").toLowerCase() === normalizedKey ||
    String(s.seriesCode || "").toLowerCase() === normalizedKey
  );
  if (!series) {
    if (normalizedKey.includes("non-teaching") || normalizedKey.includes("pcnt") || normalizedKey.includes("non_teaching")) {
      series = seriesList.find((s) => s.id === "non-teaching-staff-id" || s.key === "non-teaching-staff-id");
    } else if (normalizedKey.includes("teaching") || normalizedKey.includes("pctch") || normalizedKey.includes("employee") || normalizedKey.includes("staff")) {
      series = seriesList.find((s) => s.id === "teaching-staff-id" || s.key === "teaching-staff-id");
    } else if (normalizedKey.includes("student")) {
      series = seriesList.find((s) => s.id === "student-id" || s.key === "student-id");
    } else if (normalizedKey.includes("admission")) {
      series = seriesList.find((s) => s.id === "admission-no" || s.key === "admission-no");
    } else if (normalizedKey.includes("roll")) {
      series = seriesList.find((s) => s.id === "roll-no" || s.key === "roll-no");
    } else if (normalizedKey.includes("section")) {
      series = seriesList.find((s) => s.id === "section-name" || s.key === "section-name");
    } else if (normalizedKey.includes("exam")) {
      series = seriesList.find((s) => s.id === "exam-code" || s.key === "exam-code");
    } else if (normalizedKey.includes("cert")) {
      series = seriesList.find((s) => s.id === "certificate-number" || s.key === "certificate-number");
    } else if (normalizedKey.includes("fee") || normalizedKey.includes("receipt")) {
      series = seriesList.find((s) => s.id === "receipt-no" || s.key === "receipt-no");
    }
  }
  return series;
}

export function generateNextNumber(seriesKey, customTokens = {}) {
  const series = findSeriesConfig(seriesKey);
  if (!series) {
    const norm = String(seriesKey || "").toLowerCase();
    if (norm.includes("non-teaching") || norm.includes("pcnt")) return "PCNT0001";
    if (norm.includes("staff") || norm.includes("employee") || norm.includes("teaching")) return "PCTCH0001";
    if (norm.includes("admission")) return "ADM-18";
    if (norm.includes("roll")) return "2";
    if (norm.includes("student")) return "519";
    if (norm.includes("section")) return "MPC-Section A";
    if (norm.includes("exam")) return "MPC-FINAL-2025";
    if (norm.includes("cert")) return "CND-2026-82FC40";
    if (norm.includes("receipt") || norm.includes("fee")) return "FEE-20260904-000012";
    return "ID001";
  }
  return formatSeriesNumber(series, Number(series.currentNumber || 0) + 1, customTokens);
}

export function incrementSeriesSequence(seriesKey) {
  const series = findSeriesConfig(seriesKey);
  const targetId = series?.id || series?.key || seriesKey;
  const seriesList = readNumberSeriesSettings();
  const updated = seriesList.map((s) => {
    if (s.id === targetId || s.key === targetId) {
      return { ...s, currentNumber: Number(s.currentNumber || 0) + 1, totalGenerated: Number(s.totalGenerated || 0) + 1 };
    }
    return s;
  });
  writeNumberSeriesSettings(updated);
}

export function resetNumberSeriesSequence(id, newCurrentNumber = 0) {
  const series = findSeriesConfig(id);
  const targetId = series?.id || series?.key || id;
  const seriesList = readNumberSeriesSettings();
  const updated = seriesList.map((s) => {
    if (s.id === targetId || s.key === targetId) {
      return { ...s, currentNumber: Number(newCurrentNumber) };
    }
    return s;
  });
  writeNumberSeriesSettings(updated);
}

// --- GET PREVIEW NEXT NUMBER FOR A SERIES ---
export function getNextNumberPreview(series, overrideConfig = null, customTokens = {}) {
  if (!series) return "—";
  const cfg = overrideConfig || series;
  const nextSeqNum = Number(cfg.currentSequence ?? cfg.currentNumber ?? 0) + 1;
  return buildNumberFromFormat(cfg.format, nextSeqNum, cfg.numberLength, customTokens);
}

// --- FORMAT VALIDATION ENGINE ---
export function validateNumberSeries(format, numberLength, currentNumber, allowedTokens = []) {
  if (!format || !format.trim()) {
    return { valid: false, message: "Format cannot be empty." };
  }

  // Check sequence length overflow
  const nextNum = Number(currentNumber || 0) + 1;
  const maxPossible = Math.pow(10, Number(numberLength || 1)) - 1;
  if (numberLength < 6 && nextNum > maxPossible) {
    return {
      valid: false,
      message: `Sequence length (${numberLength}) is too small for current number (${nextNum}).`,
    };
  }

  // Extract all {TOKEN} patterns
  const tokens = format.match(/\{[^}]+\}/g) || [];
  const coreSupportedBases = new Set([
    "SEQ", "YYYY", "YY", "MM", "DD", "YYYYMMDD", "RANDOM", "PREFIX", 
    "GROUP", "SECTION", "CAMPUS", "BOARD", "PROGRAM", "AY", "DEPT", 
    "DESIG", "STAFF", "CERT", "TYPE", "YEAR", "LEVEL", "EXAM"
  ]);

  const allowedSet = new Set(allowedTokens.map((t) => t.toUpperCase()));

  const unsupported = [];
  for (const token of tokens) {
    const rawInner = token.slice(1, -1).trim().toUpperCase();
    const baseName = rawInner.split(":")[0];
    const isAllowedExplicit = allowedSet.has(token.toUpperCase()) || allowedSet.has(`{${baseName}}`);
    const isCoreBase = coreSupportedBases.has(baseName);
    if (!isAllowedExplicit && !isCoreBase) {
      unsupported.push(token);
    }
  }

  if (unsupported.length > 0) {
    return {
      valid: false,
      message: `Unsupported placeholder: ${unsupported.join(", ")}`,
    };
  }

  return { valid: true, message: "" };
}


export function autoGenerateRollNoPrefix(groupName) {
  if (!groupName) return "";
  const upper = groupName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return upper.length <= 4 ? upper : upper.substring(0, 4);
}
