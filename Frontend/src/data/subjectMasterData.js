export const subjectMaster = [
  { id: "ENG1", name: "English", code: "ENG1", type: ["Language"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "SL1", name: "Second Language", code: "SL1", type: ["Language"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "MATH1A", name: "Mathematics IA", code: "MATH1A", type: ["Theory"], marks: { theory: 75, practical: 0, internal: 0, total: 75, passing: 27 } },
  { id: "MATH1B", name: "Mathematics IB", code: "MATH1B", type: ["Theory"], marks: { theory: 75, practical: 0, internal: 0, total: 75, passing: 27 } },
  { id: "MATH2A", name: "Mathematics IIA", code: "MATH2A", type: ["Theory"], marks: { theory: 75, practical: 0, internal: 0, total: 75, passing: 27 } },
  { id: "MATH2B", name: "Mathematics IIB", code: "MATH2B", type: ["Theory"], marks: { theory: 75, practical: 0, internal: 0, total: 75, passing: 27 } },
  { id: "PHY1", name: "Physics", code: "PHY1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "CHE1", name: "Chemistry", code: "CHE1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "BOT1", name: "Botany", code: "BOT1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "ZOO1", name: "Zoology", code: "ZOO1", type: ["Theory", "Practical"], marks: { theory: 60, practical: 30, internal: 10, total: 100, passing: 35 } },
  { id: "ECO1", name: "Economics", code: "ECO1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "COM1", name: "Commerce", code: "COM1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "CIV1", name: "Civics", code: "CIV1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "HIS1", name: "History", code: "HIS1", type: ["Theory"], marks: { theory: 100, practical: 0, internal: 0, total: 100, passing: 35 } },
  { id: "CS1", name: "Computer Science", code: "CS1", type: ["Theory", "Practical"], marks: { theory: 70, practical: 30, internal: 0, total: 100, passing: 35 } },
  { id: "EVS1", name: "Environmental Education", code: "EVS1", type: ["Theory"], marks: { theory: 50, practical: 0, internal: 0, total: 50, passing: 18 } },
];

export const commonSubjectIds = ["ENG1", "SL1"];

// Second Language is one shared common-subject slot. These are selectable
// language choices for that slot, not separate common subjects or group maps.
export const secondLanguageOptions = [
  { name: "Telugu", code: "TEL1" },
  { name: "Hindi", code: "HIN1" },
  { name: "Sanskrit", code: "SAN1" },
  { name: "Urdu", code: "URD1" },
  { name: "Arabic", code: "ARA1" },
];

// Subject Management is currently frontend/mock driven. Keep the language
// options for the SL1 common-subject slot in this same data module so they
// survive a page refresh without creating another state architecture.
const SECOND_LANGUAGE_STORAGE_KEY = "cms_subject_management_second_languages";

export const loadSecondLanguages = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(SECOND_LANGUAGE_STORAGE_KEY) || "[]");
    return Array.isArray(stored)
      ? stored.filter((language) => language?.name && language?.code)
      : [];
  } catch {
    return [];
  }
};

export const saveSecondLanguages = (languages) => {
  try {
    localStorage.setItem(SECOND_LANGUAGE_STORAGE_KEY, JSON.stringify(languages));
  } catch {
    // Storage may be unavailable; retain the current in-memory selection.
  }
};

export const groupSubjectMap = {
  MPC: ["MATH1A", "MATH1B", "PHY1", "CHE1"],
  BIPC: ["BOT1", "ZOO1", "PHY1", "CHE1"],
  MEC: ["MATH1A", "MATH1B", "ECO1", "COM1"],
  CEC: ["CIV1", "ECO1", "COM1"],
  HEC: ["HIS1", "ECO1", "CIV1"],
};

// Candidate curriculum subjects are selected by the human-readable academic
// level and group. Physics and Chemistry deliberately reuse one definition:
// the selected academic level is what distinguishes their first- and
// second-year allocations.
export const academicLevelGroupSubjectMap = {
  firstYear: {
    MPC: ["MATH1A", "MATH1B", "PHY1", "CHE1"],
    BIPC: ["BOT1", "ZOO1", "PHY1", "CHE1"],
    MEC: ["MATH1A", "MATH1B", "ECO1", "COM1"],
    CEC: ["CIV1", "ECO1", "COM1"],
    HEC: ["HIS1", "ECO1", "CIV1"],
  },
  secondYear: {
    MPC: ["MATH2A", "MATH2B", "PHY1", "CHE1"],
    BIPC: ["BOT1", "ZOO1", "PHY1", "CHE1"],
    MEC: ["MATH2A", "MATH2B", "ECO1", "COM1"],
    CEC: ["CIV1", "ECO1", "COM1"],
    HEC: ["HIS1", "ECO1", "CIV1"],
  },
};
