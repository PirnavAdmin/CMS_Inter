import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
  Search,
  ChevronDown,
  Check,
  Layers,
  BookOpen,
  Sparkles,
  CheckSquare,
  Square,
  Wand2,
  Clock,
  Award,
  Lock,
  Unlock,
  Users,
  Ban,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { ConfirmDialog, Loader, Modal, StatusBadge, Toast } from "../common/Ui.jsx";
import "./ExaminationPage.css";

const PAGE_SIZE = 5;

// ---------- DATA NORMALIZATION & UNWRAPPING HELPERS ----------
// ✅ SAFE ARRAY WRAPPER: Guarantees val is converted to a valid array without throwing
const ensureArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined) return [];
  if (typeof val === "object") {
    if (Array.isArray(val.items)) return val.items;
    if (Array.isArray(val.data)) return val.data;
    if (Array.isArray(val.results)) return val.results;
    if (Array.isArray(val.result)) return val.result;
  }
  // Wrap single primitive/object into an array if not empty
  return [val];
};

// ✅ SAFE UNWRAPPER: Unwraps any nested response structure and ALWAYS returns an Array []
const unwrap = (res) => {
  if (!res) return [];
  const payload = res.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.schedules)) return payload.schedules;
  if (Array.isArray(payload?.examinationSchedules)) return payload.examinationSchedules;
  if (Array.isArray(payload?.subjects)) return payload.subjects;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.result)) return payload.data.result;
  if (Array.isArray(payload?.data?.schedules)) return payload.data.schedules;
  if (Array.isArray(payload?.data?.examinationSchedules)) return payload.data.examinationSchedules;
  if (Array.isArray(payload?.data?.subjects)) return payload.data.subjects;
  if (Array.isArray(payload?.data?.$values)) return payload.data.$values;
  return [];
};

const d = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(String(value).includes("T") ? value : value + "T00:00:00"),
    )
    : "—";

const normalizeId = (value) => String(value ?? "");
const normalizeStatus = (value) => String(value || "").trim().toUpperCase();
const normalizeCodePart = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const canonicalDate = (value) => (value ? String(value).split("T")[0] : "");

// Centralized Examination Classification Helpers
export const getResolvedExamCategory = (examOrForm) => {
  if (!examOrForm) return "";
  const cat = examOrForm.examCategory || examOrForm.category || "";
  if (String(cat).trim().toLowerCase() === "others") {
    return String(examOrForm.customCategoryName || "").trim();
  }
  return String(cat).trim();
};

export const isRegularExamination = (examOrForm) => {
  const resolved = getResolvedExamCategory(examOrForm);
  return resolved.toLowerCase() === "regular";
};

export const isCombinedExamination = (examOrForm) => {
  const resolved = getResolvedExamCategory(examOrForm);
  if (!resolved) return false;
  return resolved.toLowerCase() !== "regular";
};

export const getExaminationScheduleMode = (examOrForm) => {
  return isRegularExamination(examOrForm) ? "SUBJECT_WISE" : "PATTERN_WISE";
};

// Local Fisher-Yates shuffle helper for randomized allocation among equally eligible faculty
const shuffleArray = (values = []) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [
      result[randomIndex],
      result[index],
    ];
  }
  return result;
};

// Invigilator count rule: 1-60 candidates requires at least 1, >60 requires at least 2
const requiredInvigilatorCount = (candidateCount) =>
  Number(candidateCount) > 60 ? 2 : 1;

// Convert HH:MM strings into integer minutes to accurately test time overlap
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const hasTimeOverlap = (startA, endA, startB, endB) => {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);
  return sA < eB && eA > sB;
};

const nameOf = (items = [], id, fallback = "—") => {
  const safeItems = ensureArray(items);
  if (!safeItems.length) return fallback;
  const strId = normalizeId(id);
  const found = safeItems.find(
    (x) =>
      normalizeId(x.id) === strId ||
      normalizeId(x.boardId) === strId ||
      normalizeId(x.academicYearId) === strId ||
      normalizeId(x.academicLevelId) === strId ||
      normalizeId(x.groupId) === strId ||
      normalizeId(x.programId) === strId ||
      normalizeId(x.facultyId) === strId ||
      normalizeId(x.staffId) === strId ||
      normalizeId(x.roomId) === strId
  );
  return (
    found?.name ||
    found?.groupName ||
    found?.academicYearName ||
    found?.academicLevelName ||
    found?.programName ||
    found?.fullName ||
    fallback
  );
};

const codeOf = (items = [], id, fallback = "—") => {
  const safeItems = ensureArray(items);
  if (!safeItems.length) return fallback;
  const strId = normalizeId(id);
  const found = safeItems.find(
    (x) =>
      normalizeId(x.id) === strId ||
      normalizeId(x.boardId) === strId ||
      normalizeId(x.academicYearId) === strId ||
      normalizeId(x.academicLevelId) === strId ||
      normalizeId(x.groupId) === strId ||
      normalizeId(x.programId) === strId ||
      normalizeId(x.facultyId) === strId ||
      normalizeId(x.staffId) === strId ||
      normalizeId(x.roomId) === strId
  );
  return (
    found?.code ||
    found?.boardCode ||
    found?.groupCode ||
    found?.programCode ||
    found?.levelCode ||
    fallback
  );
};

const getProgramsForGroups = (programs = [], groupIds = [], groupsList = []) => {
  const normalizedGroupIds = ensureArray(groupIds).map(normalizeId);
  const fromProgs = ensureArray(programs).filter(
    (p) => p.isActive !== false && normalizedGroupIds.includes(normalizeId(p.groupId)),
  );
  if (fromProgs.length > 0) return fromProgs;
  const fromGroups = ensureArray(groupsList)
    .filter((g) => normalizedGroupIds.includes(normalizeId(g.id)))
    .flatMap((g) => ensureArray(g.programs));
  return fromGroups.filter((p) => p.isActive !== false);
};

// Standardize pattern resolution so each group tab resolves its relevant patterns
const resolveGroupPatterns = (group, examCategory = "", masterPatterns = []) => {
  const options = ensureArray(masterPatterns).filter((pattern) =>
    typeof pattern === "string" ||
    (pattern.isActive !== false && (!pattern.groupId || normalizeId(pattern.groupId) === normalizeId(group?.id)) &&
      (!pattern.examCategory || normalizeStatus(pattern.examCategory) === normalizeStatus(examCategory)))
  ).map((pattern) => {
    const name = typeof pattern === "string" ? pattern : pattern.name || pattern.patternName || "";
    return { id: name, name };
  }).filter((pattern) => pattern.name);
  return [...options, { id: "Others", name: "Others" }];
};

const getEligibleSubjects = (exam, subjectsList = []) => {
  if (!exam) return [];
  const levelIds = ensureArray(exam.levelIds || [exam.levelId]).filter(Boolean).map(normalizeId);
  const groupIds = ensureArray(exam.groupIds || [exam.groupId]).filter(Boolean).map(normalizeId);
  const programIds = ensureArray(exam.programIds || [exam.programId]).filter(Boolean).map(normalizeId);
  const cat = String(exam.examCategory || "").toLowerCase();
  const isObjectiveCat = cat.includes("objective");

  return ensureArray(subjectsList).filter((s) => {
    if (s.isActive === false) return false;
    if (isObjectiveCat) {
      const isLanguage =
        String(s.name || "").toLowerCase().includes("english") ||
        String(s.name || "").toLowerCase().includes("sanskrit") ||
        String(s.name || "").toLowerCase().includes("language");
      if (isLanguage) return false;
    }
    const sLevelIds = ensureArray(s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [])).map(normalizeId);
    const sGroupIds = ensureArray(s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId);
    const sProgramIds = ensureArray(s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId);

    const matchesLevel = !levelIds.length || !sLevelIds.length || sLevelIds.some((id) => levelIds.includes(id));
    const matchesGroup = !groupIds.length || !sGroupIds.length || sGroupIds.some((id) => groupIds.includes(id));
    const matchesProgram = !sProgramIds.length || !programIds.length || sProgramIds.some((id) => programIds.includes(id));
    return matchesLevel && matchesGroup && matchesProgram;
  });
};

const getSelectedSubjectsForExam = (exam, targetGroupId = null, subjectsList = []) => {
  const allEligible = getEligibleSubjects(exam, subjectsList);
  let subjects = allEligible;
  if (exam?.selectedSubjectIds && ensureArray(exam.selectedSubjectIds).length > 0) {
    const selIds = ensureArray(exam.selectedSubjectIds).map(normalizeId);
    subjects = allEligible.filter((s) => selIds.includes(normalizeId(s.id)));
  }
  if (targetGroupId) {
    subjects = subjects.filter((s) => {
      const sGroupIds = ensureArray(s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId);
      return !sGroupIds.length || sGroupIds.includes(normalizeId(targetGroupId));
    });
  }
  return subjects;
};

export const getGroupStudents = (
  exam,
  targetGroupId,
  programsList = [],
  studentsList = [],
) => {
  if (!exam || !targetGroupId) return [];
  const gid = normalizeId(targetGroupId);

  // Extract exam academic level IDs (if any specified)
  const examLevelIds = ensureArray(exam.academicLevelIds || exam.levelIds || [exam.levelId])
    .map(normalizeId)
    .filter(Boolean);

  // Resolve selected program IDs for this group
  let pIds = [];
  if (exam.groupProgramSelections && typeof exam.groupProgramSelections === "object" && !Array.isArray(exam.groupProgramSelections)) {
    pIds = ensureArray(exam.groupProgramSelections[gid] || exam.groupProgramSelections[String(gid)]);
  } else if (Array.isArray(exam.groupProgramSelections) && exam.groupProgramSelections.length > 0) {
    const match = exam.groupProgramSelections.find((g) => normalizeId(g.groupId) === gid);
    pIds = match ? ensureArray(match.programIds) : [];
  } else {
    pIds = ensureArray(exam.programIds || [exam.programId].filter(Boolean));
    pIds = pIds.filter((id) =>
      ensureArray(programsList).some(
        (p) => normalizeId(p.id) === normalizeId(id) && (!p.groupId || normalizeId(p.groupId) === gid),
      ),
    );
  }
  const uniquePids = [...new Set(pIds.map(normalizeId).filter(Boolean))];

  // Also collect program names / codes for robust matching
  const selectedProgramObjs = ensureArray(programsList).filter((p) => uniquePids.includes(normalizeId(p.id)));
  const selectedProgCodes = new Set(selectedProgramObjs.map((p) => String(p.code || "").toUpperCase()).filter(Boolean));
  const selectedProgNames = new Set(selectedProgramObjs.map((p) => String(p.name || "").toLowerCase()).filter(Boolean));

  // Filter active students belonging to this group and the selected programs
  const seenStudentIds = new Set();
  return ensureArray(studentsList).filter((s) => {
    if (s.isActive === false || normalizeStatus(s.status) === "INACTIVE" || normalizeStatus(s.status) === "SUSPENDED") return false;
    const sId = normalizeId(s.id ?? s.studentId ?? s._id ?? s.admissionNo);
    if (!sId || seenStudentIds.has(sId)) return false;

    // Group match
    const sGid = normalizeId(s.groupId || s.group?.id || s.courseGroupId);
    if (sGid && sGid !== gid) return false;

    // Academic level match (must match ANY selected academic level if set on student)
    if (examLevelIds.length > 0) {
      const sLid = normalizeId(s.academicLevelId || s.levelId || s.academicLevel?.id);
      if (sLid && !examLevelIds.includes(sLid)) return false;
    }

    // Program match: if programs are selected for this group, student must match one of them
    if (uniquePids.length > 0) {
      const sPid = normalizeId(s.programId || s.programmeId || s.program?.id || s.programme?.id || s.academicProgramId);
      const sPName = String(s.programName || s.programmeName || s.program?.name || "").toLowerCase();
      const sPCode = String(s.programCode || s.programmeCode || s.program?.code || "").toUpperCase();

      const matchesById = sPid && uniquePids.includes(sPid);
      const matchesByCode = sPCode && selectedProgCodes.has(sPCode);
      const matchesByName = sPName && selectedProgNames.has(sPName);

      if (!matchesById && !matchesByCode && !matchesByName) return false;
    }

    seenStudentIds.add(sId);
    return true;
  });
};

const getRequiredCandidateStrength = (
  exam,
  targetGroupId = null,
  programsList = [],
  isFinalizing = false,
  studentsList = [],
) => {
  if (!exam) return 0;
  const targetGid = targetGroupId ? normalizeId(targetGroupId) : null;

  // Resolve target group IDs
  const examGroupIds = targetGid
    ? [targetGid]
    : ensureArray(exam.groupIds || [exam.groupId]).map(normalizeId).filter(Boolean);

  if (!examGroupIds.length) return 0;

  let totalCandidateStrength = 0;
  let hasGenuineStrength = false;

  for (const gid of examGroupIds) {
    const groupStudents = getGroupStudents(exam, gid, programsList, studentsList);

    if (groupStudents.length > 0) {
      hasGenuineStrength = true;
      totalCandidateStrength += groupStudents.length;
    } else {
      // Resolve selected program IDs for this group
      let pIds = [];
      if (exam.groupProgramSelections && typeof exam.groupProgramSelections === "object" && !Array.isArray(exam.groupProgramSelections)) {
        pIds = ensureArray(exam.groupProgramSelections[gid] || exam.groupProgramSelections[String(gid)]);
      } else if (Array.isArray(exam.groupProgramSelections) && exam.groupProgramSelections.length > 0) {
        const match = exam.groupProgramSelections.find((g) => normalizeId(g.groupId) === gid);
        pIds = match ? ensureArray(match.programIds) : [];
      } else {
        pIds = ensureArray(exam.programIds || [exam.programId].filter(Boolean));
        pIds = pIds.filter((id) =>
          ensureArray(programsList).some(
            (p) => normalizeId(p.id) === normalizeId(id) && (!p.groupId || normalizeId(p.groupId) === gid),
          ),
        );
      }
      const uniquePids = [...new Set(pIds.map(normalizeId).filter(Boolean))];

      // Fallback to program capacity if students list is empty or not yet loaded for this group
      const groupFallback = uniquePids.reduce((sum, id) => {
        const prog = ensureArray(programsList).find((p) => normalizeId(p.id) === id);
        const cap = Number(prog?.candidateStrength) || Number(prog?.capacity);
        if (cap > 0) {
          hasGenuineStrength = true;
          return sum + cap;
        }
        return sum;
      }, 0);
      if (groupFallback > 0) {
        totalCandidateStrength += groupFallback;
      } else {
        // Fallback to group default capacity if programs have no defined capacity
        const grp = ensureArray(exam.groups || []).find((g) => normalizeId(g.id) === gid);
        const grpCap = Number(grp?.candidateStrength) || Number(grp?.capacity) || 0;
        if (grpCap > 0) {
          hasGenuineStrength = true;
          totalCandidateStrength += grpCap;
        }
      }
    }
  }

  if (isFinalizing && !hasGenuineStrength) {
    return 0;
  }
  return totalCandidateStrength;
};

const getScheduleHallIds = (schedule) => {
  if (!schedule) return [];
  const assigned = (schedule.hallAssignments || [])
    .map((a) => normalizeId(a.hallId))
    .filter((id) => id && id !== "0" && id !== "undefined" && id !== "null");
  if (assigned.length > 0) return assigned;
  if (schedule.hallId || schedule.roomId) {
    const hid = normalizeId(schedule.hallId || schedule.roomId);
    if (hid && hid !== "0" && hid !== "undefined" && hid !== "null") return [hid];
  }
  return [];
};

const getScheduleInvigilatorIds = (schedule) => {
  if (!schedule) return [];
  const assigned = (schedule.hallAssignments || [])
    .flatMap((a) => a.invigilatorIds || [])
    .map(normalizeId)
    .filter((id) => id && id !== "0" && id !== "undefined" && id !== "null");
  if (assigned.length > 0) return assigned;
  const single = schedule.invigilatorId || schedule.facultyId;
  if (single) {
    const fid = normalizeId(single);
    if (fid && fid !== "0" && fid !== "undefined" && fid !== "null") return [fid];
  }
  return [];
};

const getRoomAllocatedCount = (schedules, roomId, date, startTime, endTime, editingId = null) => {
  const cDate = canonicalDate(date);
  return schedules
    .filter(
      (s) =>
        (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
        canonicalDate(s.date || s.examDate) === cDate &&
        hasTimeOverlap(startTime, endTime, s.startTime, s.endTime),
    )
    .flatMap((s) => s.hallAssignments || [])
    .filter((a) => normalizeId(a.hallId) === normalizeId(roomId))
    .reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0);
};

// Strict Hall Conflict Semantics: Room is UNAVAILABLE if another schedule uses it during overlapping time
const getEligibleRooms = (schedules, entry, editingId = null, exam = null, roomsList = []) => {
  const selectedLevels = (exam?.levelIds || [exam?.levelId]).filter(Boolean).map(normalizeId);
  const entryDate = canonicalDate(entry?.date || entry?.examDate);
  return roomsList.filter((room) => {
    if (room.status !== "Active" && room.isActive === false) return false;
    // Level filtering: If room is level specific, exam must include that level
    if (room.levelId && room.levelId !== "ALL") {
      if (selectedLevels.length > 0 && !selectedLevels.includes(normalizeId(room.levelId))) {
        return false;
      }
    }
    // Strict Hall conflict check: Cannot share Hall with any other concurrent schedule
    if (!entryDate || !entry?.startTime || !entry?.endTime) return true;
    const isOccupiedByAnotherSchedule = schedules.some(
      (s) =>
        (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
        canonicalDate(s.date || s.examDate) === entryDate &&
        hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) &&
        getScheduleHallIds(s).includes(normalizeId(room.id)),
    );
    return !isOccupiedByAnotherSchedule;
  });
};

// Active invigilators must be available for the full session.
const getEligibleInvigilators = (schedules, entry, editingId = null, facultyList = [], subjectsList = []) => {
  const entrySubjectIds = [
    entry?.subjectId,
    ...(entry?.includedSubjectIds || []),
  ].map(normalizeId).filter(Boolean);
  const entryDate = canonicalDate(entry?.date || entry?.examDate);

  return facultyList.filter((f) => {
    if (f.isActive === false || f.status === "Inactive") return false;
    if (f.isTeaching === false || f.type === "NON_TEACHING" || (f.role && String(f.role).toLowerCase().includes("non-teaching"))) return false;
    const fId = normalizeId(f.id);

    // Safeguard: Own-subject faculty exclusion
    // An invigilator cannot be assigned to an examination for the subject they teach.
    if (entrySubjectIds.length > 0 && Array.isArray(f.subjectsTaught) && f.subjectsTaught.length > 0) {
      const teachesThisSubject = entrySubjectIds.some((sId) =>
        f.subjectsTaught.map(normalizeId).includes(sId),
      );
      if (teachesThisSubject) return false;
    }

    if (entryDate && entry?.startTime && entry?.endTime) {
      const hasConflict = schedules.some(
        (s) =>
          (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
          canonicalDate(s.date || s.examDate) === entryDate &&
          hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) &&
          getScheduleInvigilatorIds(s).includes(fId),
      );
      if (hasConflict) return false;
    }

    return true;
  });
};

// Extract room/hall or invigilator booking collision details from backend error responses
const parseBookingConflict = (error, roomsList = [], facultyList = []) => {
  const rawMsg =
    error?.response?.data?.details ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.detail ||
    (typeof error?.response?.data === "string" ? error.response.data : "") ||
    error?.message ||
    "";

  if (!rawMsg) return null;

  const regex = /(?:Room\/Hall|Room|Hall|Faculty|Invigilator)\s*['"]?([^'"]+?)['"]?\s+is already (?:booked|assigned).*?during\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)\s*-\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)\s*on\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i;
  const match = String(rawMsg).match(regex);
  if (!match) return null;

  const rawIdentifier = match[1].trim();
  const startTime = match[2].slice(0, 5);
  const endTime = match[3].slice(0, 5);
  const date = match[4].trim();

  const isRoomConflict = /Room|Hall/i.test(rawMsg);
  const isFacultyConflict = /Faculty|Invigilator/i.test(rawMsg);

  let roomId = null;
  let facultyId = null;

  if (isRoomConflict || !isFacultyConflict) {
    const target = rawIdentifier.toLowerCase();
    const matchedRoom = (roomsList || []).find((r) => {
      const id = normalizeId(r.id);
      const num = String(r.roomNumber ?? "").trim().toLowerCase();
      const name = String(r.name ?? "").trim().toLowerCase();
      const code = String(r.code ?? "").trim().toLowerCase();
      return id === target || num === target || name === target || code === target ||
        target.includes(num) || target.includes(name);
    });
    roomId = matchedRoom ? normalizeId(matchedRoom.id) : rawIdentifier;
  }

  if (isFacultyConflict) {
    const target = rawIdentifier.toLowerCase();
    const matchedFaculty = (facultyList || []).find((f) => {
      const id = normalizeId(f.id);
      const name = String(f.name ?? "").trim().toLowerCase();
      const fullName = String(f.fullName ?? "").trim().toLowerCase();
      return id === target || name === target || fullName === target ||
        target.includes(name) || target.includes(fullName);
    });
    facultyId = matchedFaculty ? normalizeId(matchedFaculty.id) : rawIdentifier;
  }

  return {
    rawIdentifier,
    roomId,
    facultyId,
    startTime,
    endTime,
    date,
  };
};

// Complete-or-fail Automatic Hall and Invigilator Allocation
const autoAssignHallsAndInvigilators = (
  exam,
  targetGroupId,
  date,
  startTime,
  endTime,
  currentSchedules,
  currentScheduleId = null,
  roomsList = [],
  facultyList = [],
  programsList = [],
  subjectContext = null,
  studentsList = [],
) => {
  const genuineStrength = getRequiredCandidateStrength(exam, targetGroupId, programsList, false, studentsList);
  if (genuineStrength <= 0) return null;
  const requiredStrength = genuineStrength;
  const eligibleRooms = getEligibleRooms(
    currentSchedules,
    { date, startTime, endTime },
    currentScheduleId,
    exam,
    roomsList,
  );
  const eligibleFaculty = getEligibleInvigilators(
    currentSchedules,
    {
      date,
      startTime,
      endTime,
      subjectId: subjectContext?.subjectId,
      includedSubjectIds: subjectContext?.includedSubjectIds,
    },
    currentScheduleId,
    facultyList,
    subjectContext?.subjectsList || [],
  );

  // Compute duty count across current schedules for balanced faculty allocation
  const facultyDutyCounts = new Map();
  (currentSchedules || []).forEach((s) => {
    getScheduleInvigilatorIds(s).forEach((fid) => {
      facultyDutyCounts.set(fid, (facultyDutyCounts.get(fid) || 0) + 1);
    });
  });

  const shuffledEligible = shuffleArray(eligibleFaculty);
  const sortedFaculty = shuffledEligible.sort((a, b) => {
    const countA = facultyDutyCounts.get(normalizeId(a.id)) || 0;
    const countB = facultyDutyCounts.get(normalizeId(b.id)) || 0;
    return countA - countB;
  });

  let remaining = requiredStrength;
  const assignments = [];
  const usedFacultyIds = new Set();

  // Prefer rooms previously assigned to this group in this exam for room continuity
  const preferredGroupRoomIds = new Set();
  (currentSchedules || []).forEach((s) => {
    if (normalizeId(s.examId) === normalizeId(exam?.id) && normalizeId(s.groupId) === normalizeId(targetGroupId)) {
      getScheduleHallIds(s).forEach((hid) => preferredGroupRoomIds.add(hid));
    }
  });

  const sortedEligibleRooms = [...eligibleRooms].sort((a, b) => {
    const aPref = preferredGroupRoomIds.has(normalizeId(a.id)) ? 1 : 0;
    const bPref = preferredGroupRoomIds.has(normalizeId(b.id)) ? 1 : 0;
    if (aPref !== bPref) return bPref - aPref;
    return (Number(b.capacity) || 0) - (Number(a.capacity) || 0);
  });

  for (const room of sortedEligibleRooms) {
    if (remaining <= 0) break;
    const roomCap = Number(room.capacity) || 0;
    if (roomCap <= 0) continue;

    const allocCount = Math.min(remaining, roomCap);
    const neededFacultyCount = requiredInvigilatorCount(allocCount);
    const roomFaculty = [];

    for (const f of sortedFaculty) {
      if (!usedFacultyIds.has(normalizeId(f.id))) {
        roomFaculty.push(normalizeId(f.id));
        usedFacultyIds.add(normalizeId(f.id));
        if (roomFaculty.length >= neededFacultyCount) break;
      }
    }

    // Every hall MUST receive the required number of invigilators
    if (roomFaculty.length < neededFacultyCount) {
      roomFaculty.forEach((fid) => usedFacultyIds.delete(fid));
      continue;
    }

    assignments.push({
      hallId: normalizeId(room.id),
      candidateCount: allocCount,
      invigilatorIds: roomFaculty,
    });

    remaining -= allocCount;
  }

  // Complete-or-fail verification: must allocate at least required candidate strength AND at least one room
  const totalAllocated = assignments.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0);
  if (assignments.length === 0 || totalAllocated < requiredStrength) {
    return null;
  }

  return assignments;
};

const localDateTime = (date, time = "00:00") => {
  const [y, m, day] = String(date).split("-").map(Number);
  const [h, min] = String(time).split(":").map(Number);
  return new Date(y, m - 1, day, h || 0, min || 0);
};

const generateSequentialExamDates = (startDateStr, count = 1) => {
  const dates = [];
  let curr = new Date(startDateStr || new Date());
  while (dates.length < count) {
    if (curr.getDay() !== 0) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, "0");
      const dd = String(curr.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const calculateSuggestedEndDate = (startDateStr, subjectCount) => {
  if (!startDateStr) return "";
  const count = Math.max(1, subjectCount || 1);
  const dates = generateSequentialExamDates(startDateStr, count);
  return dates[dates.length - 1];
};

function directExportScheduleExcel(targetExams, schedules, groupsList = [], filename = "Scheduled_Examinations") {
  const rows = targetExams.flatMap((exam) => {
    const examSchedules = schedules.filter((s) => String(s.examId) === String(exam.id));
    return examSchedules.map((s) => {
      const isObj = s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName);
      const marksText = isObj
        ? `${s.totalMarks || 100} (Pass: ${s.passPercentage || 35}%)`
        : `${s.totalMarks || 100} (Pass: ${s.passingMarks || 35})`;
      const hallText = s.roomName && s.roomName !== "—"
        ? s.roomName
        : (ensureArray(s.hallAssignments).map((a) => a.hallName || a.roomNumber || a.hallId).filter(Boolean).join(", ") || "—");
      const invigilatorText = s.invigilatorName && s.invigilatorName !== "—"
        ? s.invigilatorName
        : (ensureArray(s.hallAssignments).flatMap((a) => a.invigilatorNames || a.invigilatorIds || []).filter(Boolean).join(", ") || "—");

      return {
        "Exam Code": exam.code || "—",
        "Exam Name": exam.name || "—",
        "Group": nameOf(groupsList, s.groupId, "—"),
        "Subject/Pattern": s.subjectName || s.patternName || "—",
        "Exam Date": d(s.date),
        "Timing": `${s.startTime || "—"} - ${s.endTime || "—"}`,
        "Marks": marksText,
        "Hall/Room": hallText,
        "Invigilator": invigilatorText,
        "Mode": s.mode || (isObj ? "Objective" : "Written"),
      };
    });
  });

  if (!rows.length) return false;

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  worksheet["!cols"] = [
    { wch: 16 }, // Exam Code
    { wch: 32 }, // Exam Name
    { wch: 16 }, // Group
    { wch: 30 }, // Subject/Pattern
    { wch: 16 }, // Exam Date
    { wch: 20 }, // Timing
    { wch: 22 }, // Marks
    { wch: 28 }, // Hall/Room
    { wch: 32 }, // Invigilator
    { wch: 16 }, // Mode
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
  XLSX.writeFile(workbook, `${filename.replace(/\s+/g, "_")}.xlsx`);
  return true;
}

// Validates hall assignments, capacity, and invigilator rules
function validateHallAssignments(
  assignments = [],
  exam,
  schedules,
  entry,
  editingId,
  targetGroupId,
  isFinalizing = false,
  roomsList = [],
  facultyList = [],
  subjectsList = [],
) {
  const messages = [];
  const validAssignments = ensureArray(assignments);

  if (isFinalizing && !validAssignments.some((assignment) => assignment.hallId)) {
    messages.push("At least one examination hall must be assigned before finalizing.");
  }

  const seenHalls = new Set();
  const seenFaculty = new Set();

  validAssignments.forEach((a) => {
    if (!a.hallId) {
      if (isFinalizing || validAssignments.length > 1) {
        messages.push("Select a valid room for each hall assignment.");
      }
      return;
    }
    const room = roomsList.find((r) => normalizeId(r.id) === normalizeId(a.hallId));
    if (!room || normalizeStatus(room.status) === "INACTIVE" || room.isActive === false) messages.push("Select an active room.");
    if (seenHalls.has(normalizeId(a.hallId))) messages.push("The same room cannot be added twice.");
    seenHalls.add(normalizeId(a.hallId));

    // Cross-Schedule Hall Validation: verify no classroom/hall is assigned to concurrent exam sessions
    const entryDate = canonicalDate(entry?.date || entry?.examDate);
    if (entryDate && entry?.startTime && entry?.endTime && a.hallId) {
      const conflictingSchedule = schedules.find(
        (s) =>
          (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
          canonicalDate(s.date || s.examDate) === entryDate &&
          hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) &&
          getScheduleHallIds(s).includes(normalizeId(a.hallId)),
      );
      if (conflictingSchedule) {
        const roomTitle = room?.name || nameOf(roomsList, a.hallId, `Hall ${a.hallId}`);
        messages.push(
          `${roomTitle} is already assigned to another examination during ${conflictingSchedule.startTime}–${conflictingSchedule.endTime}.`,
        );
      }
    }

    const roomCap = Number(room?.capacity) || 0;
    const count = Number(a.candidateCount);
    if (!Number.isInteger(count) || count <= 0) messages.push(`${room?.name || "Room"} requires a positive candidate count.`);
    if (room && roomCap > 0 && count > roomCap) messages.push(`${room.name} capacity is ${room.capacity}.`);
    const validInvigilators = (a.invigilatorIds || []).filter(
      (id) => id && normalizeId(id) !== "0" && normalizeId(id) !== "undefined" && normalizeId(id) !== "null",
    );

    const neededInv = requiredInvigilatorCount(count);
    if (validInvigilators.length < neededInv) {
      if (isFinalizing || validInvigilators.length > 0) {
        messages.push(`${room?.name || "Room"} has ${count} candidates and requires at least ${neededInv} invigilator${neededInv > 1 ? "s" : ""}, but only ${validInvigilators.length} assigned.`);
      }
    }

    validInvigilators.forEach((id) => {
      const nid = normalizeId(id);
      const facMember = facultyList.find((f) => normalizeId(f.id) === nid);
      const facName = facMember?.name || nameOf(facultyList, id, `Faculty ${id}`);
      if (!facMember || facMember.isActive === false || normalizeStatus(facMember.status) === "INACTIVE") messages.push("Select an active teaching faculty member.");

      // Same-session double room assignment check
      if (seenFaculty.has(nid)) {
        messages.push(`${facName} cannot cover two rooms simultaneously.`);
      }
      seenFaculty.add(nid);

      // Safeguard: Own-subject faculty exclusion
      const entrySubjectIds = [entry?.subjectId, ...(entry?.includedSubjectIds || [])].map(normalizeId).filter(Boolean);
      if (entrySubjectIds.length > 0 && Array.isArray(facMember?.subjectsTaught) && entrySubjectIds.some((sId) => facMember.subjectsTaught.map(normalizeId).includes(sId))) {
        messages.push(`${facName} teaches ${entry.subjectName || "this subject"} and cannot invigilate their own subject examination.`);
      }

      // Cross-schedule faculty time overlap check
      if (entryDate && entry?.startTime && entry?.endTime) {
        const conflictingFacSchedule = schedules.find(
          (s) =>
            (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
            canonicalDate(s.date || s.examDate) === entryDate &&
            hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) &&
            getScheduleInvigilatorIds(s).includes(nid),
        );
        if (conflictingFacSchedule) {
          messages.push(
            `${facName} is already assigned to invigilate another hall during ${conflictingFacSchedule.startTime}–${conflictingFacSchedule.endTime}.`,
          );
        }
      }

    });
  });
  return messages;
}

function validateScheduleEntry(
  exam,
  entry,
  schedules,
  editingId,
  roomsList = [],
  facultyList = [],
  isFinalizing = false,
  subjectsList = [],
  groupsList = [],
) {
  const messages = [];
  if (schedules.some((saved) => normalizeId(saved.examId) === normalizeId(exam.id) && (!editingId || normalizeId(saved.id) !== normalizeId(editingId)) && normalizeId(saved.groupId) === normalizeId(entry.groupId) && (entry.patternName ? saved.patternName === entry.patternName : entry.subjectId && normalizeId(saved.subjectId) === normalizeId(entry.subjectId)))) messages.push("This subject or pattern already has a schedule. Edit the saved entry to reschedule it.");
  const isCombined = isCombinedExamination(exam);
  const isRegular = isRegularExamination(exam);
  const entryDate = canonicalDate(entry?.date || entry?.examDate);

  if (!entryDate || (exam.startDate && entryDate < canonicalDate(exam.startDate)) || (exam.endDate && entryDate > canonicalDate(exam.endDate)))
    messages.push("Exam date must be within the examination period.");

  // Combined Examination Must Use One Common Date (entry.date MUST equal exam.startDate)
  if (isCombined && entryDate && exam.startDate && entryDate !== canonicalDate(exam.startDate)) {
    messages.push(`Combined examination sessions must be conducted on the common examination date (${d(exam.startDate)}).`);
  }

  // Cross-Schedule Multi-Group Time Sync
  if (isRegular && entry.subjectId && entryDate && entry.startTime && entry.endTime) {
    const parallelSameSubjectOtherGroup = schedules.find(
      (s) =>
        normalizeId(s.examId) === normalizeId(exam.id) &&
        (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
        normalizeId(s.groupId) !== normalizeId(entry.groupId) &&
        normalizeId(s.subjectId) === normalizeId(entry.subjectId),
    );
    if (parallelSameSubjectOtherGroup) {
      if (
        canonicalDate(parallelSameSubjectOtherGroup.date || parallelSameSubjectOtherGroup.examDate) !== entryDate ||
        parallelSameSubjectOtherGroup.startTime !== entry.startTime ||
        parallelSameSubjectOtherGroup.endTime !== entry.endTime
      ) {
        messages.push(
          `Same regular subject (${entry.subjectName || "Subject"}) scheduled across multiple groups must share identical examination date and time intervals.`,
        );
      }
    }
  }

  // Same-Day Subject Schedule Separation per Group
  if (isRegular && entryDate && !isCombined) {
    const duplicateDateSchedule = schedules.find(
      (s) =>
        normalizeId(s.examId) === normalizeId(exam.id) &&
        (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
        normalizeId(s.groupId) === normalizeId(entry.groupId) &&
        canonicalDate(s.date || s.examDate) === entryDate,
    );
    if (duplicateDateSchedule) {
      const groupName = nameOf(groupsList, entry.groupId, "this group");
      messages.push(
        `Another subject for ${groupName} is already scheduled on ${d(entryDate)}. Regular subjects must be conducted on different days.`,
      );
    }
  }

  // Combined Session Time Consistency
  if (isCombined) {
    const existingCombinedSession = schedules.find(
      (s) =>
        normalizeId(s.examId) === normalizeId(exam.id) &&
        (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
        (s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName)),
    );
    if (existingCombinedSession && existingCombinedSession.startTime && existingCombinedSession.endTime) {
      if (entry.startTime !== existingCombinedSession.startTime || entry.endTime !== existingCombinedSession.endTime) {
        messages.push(
          `Combined examinations must share the same session timing (${existingCombinedSession.startTime}–${existingCombinedSession.endTime}).`,
        );
      }
    }
    if (!entry.patternName) {
      messages.push("Examination pattern is required.");
    }
    if (!entry.includedSubjectIds || ensureArray(entry.includedSubjectIds).length === 0) {
      messages.push("Included subjects are required for combined examination scheduling.");
    }
  }

  if (isRegular && !entry.subjectId) {
    messages.push("Subject is required.");
  }

  if (!entry.startTime || !entry.endTime || entry.startTime >= entry.endTime)
    messages.push("End time must be later than start time.");
  if (!(Number(entry.totalMarks) > 0)) messages.push("Total Marks must be a positive number.");
  if (isCombined && (!(Number(entry.passPercentage) > 0) || Number(entry.passPercentage) > 100))
    messages.push("Pass Percentage must be between 1 and 100.");
  if (!isCombined && (!(Number(entry.passingMarks) >= 0) || Number(entry.passingMarks) > Number(entry.totalMarks)))
    messages.push("Passing Marks must be between 0 and Total Marks.");

  const effectiveAssignments = ensureArray(entry.hallAssignments);
  messages.push(...validateHallAssignments(effectiveAssignments, exam, schedules, entry, editingId, entry.groupId, isFinalizing, roomsList, facultyList, subjectsList));

  // Points 7, 8, 9: Invigilator Validation (Availability, Time Overlap & Own-Subject Exclusion)
  if (facultyList && facultyList.length > 0) {
    const eligibleFacultyIds = getEligibleInvigilators(schedules, entry, editingId, facultyList, subjectsList).map((f) => normalizeId(f.id));
    effectiveAssignments
      .flatMap((a) => a.invigilatorIds || [])
      .filter((id) => id && normalizeId(id) !== "0" && normalizeId(id) !== "undefined" && normalizeId(id) !== "null")
      .forEach((id) => {
        const nid = normalizeId(id);
        const facultyMember = facultyList.find((f) => normalizeId(f.id) === nid);
        if (facultyMember && !eligibleFacultyIds.includes(nid)) {
          const isOverlapping = schedules.some(
            (s) =>
              (!editingId || normalizeId(s.id) !== normalizeId(editingId)) &&
              canonicalDate(s.date || s.examDate) === entryDate &&
              hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) &&
              getScheduleInvigilatorIds(s).includes(nid),
          );
          const entrySubjectIds = [entry?.subjectId, ...(entry?.includedSubjectIds || [])].map(normalizeId).filter(Boolean);
          const teachesSubject = entrySubjectIds.length > 0 && Array.isArray(facultyMember.subjectsTaught) && entrySubjectIds.some((sId) => facultyMember.subjectsTaught.map(normalizeId).includes(sId));
          if (teachesSubject) {
            messages.push(`${facultyMember.name || nameOf(facultyList, id)} teaches ${entry.subjectName || "this subject"} and cannot invigilate their own subject examination.`);
          } else if (isOverlapping) {
            messages.push(`${facultyMember.name || nameOf(facultyList, id)} is already invigilating another exam hall in an overlapping time slot.`);
          } else {
            messages.push(`${facultyMember.name || nameOf(facultyList, id)} is not an active, available invigilator.`);
          }
        }
      });
  }
  return messages;
}

const matchesScheduleGroup = (s, targetGroupId, exam = null, subjectsList = []) => {
  if (!s) return false;
  if (!targetGroupId) return true;
  const targetGid = normalizeId(targetGroupId);
  const sGid = normalizeId(s.groupId);
  if (sGid && sGid === targetGid) return true;

  // 1. If exam has 0 or 1 group, all schedules for this exam belong to this group!
  if (exam) {
    const examGids = ensureArray(exam.groupIds || (exam.groupId ? [exam.groupId] : [])).map(normalizeId).filter(Boolean);
    if (examGids.length <= 1) return true;
  }

  // 2. Match through subjectId, code, or name in subjectsList
  if (s.subjectId && Array.isArray(subjectsList) && subjectsList.length > 0) {
    const sub = subjectsList.find(
      (x) =>
        normalizeId(x.id ?? x.subjectId) === normalizeId(s.subjectId) ||
        (s.subjectCode && x.code && String(x.code).toUpperCase() === String(s.subjectCode).toUpperCase()) ||
        (s.subjectName && x.name && String(x.name).toLowerCase() === String(s.subjectName).toLowerCase()),
    );
    if (sub) {
      const subGids = ensureArray(sub.groupIds || (sub.groupId ? [sub.groupId] : [])).map(normalizeId).filter(Boolean);
      if (subGids.length > 0) return subGids.includes(targetGid);
      return true;
    }
  }

  // 3. Fallback: If s has no groupId set, match with targetGid tab
  if (!sGid) return true;

  return false;
};

function validateScheduleReadiness(
  exam,
  schedules,
  groupsList = [],
  subjectsList = [],
  roomsList = [],
  facultyList = [],
  programsList = [],
  studentsList = [],
) {
  const entries = schedules.filter((s) => normalizeId(s.examId) === normalizeId(exam.id));
  const messages = [];
  const isCombined = isCombinedExamination(exam);
  const groupIds = (exam.groupIds || [exam.groupId]).filter(Boolean).map(normalizeId);

  if (isCombined) {
    groupIds.forEach((gid) => {
      const groupName = nameOf(groupsList, gid, `Group ${gid}`);
      const configuredPatterns = (exam.selectedGroupPatterns && exam.selectedGroupPatterns[gid]) || [exam.examPattern];
      configuredPatterns.forEach((pName) => {
        const hasPatternScheduled = entries.some(
          (s) =>
            (normalizeId(s.groupId) === gid || matchesScheduleGroup(s, gid, exam, subjectsList) || groupIds.length <= 1) &&
            (s.patternName === pName || (s.subjectName && s.subjectName.includes(pName))),
        );
        if (!hasPatternScheduled) {
          messages.push(`[${groupName}] Pattern "${pName}" session has not been scheduled.`);
        }
      });
    });
  } else {
    const selIds = ensureArray(exam.selectedSubjectIds).map(normalizeId).filter(Boolean);
    let selectedSubs = subjectsList;
    if (selIds.length > 0) {
      if (subjectsList.length > 0) {
        selectedSubs = subjectsList.filter((s) => selIds.includes(normalizeId(s.id ?? s.subjectId)));
      }
      if (selectedSubs.length === 0) {
        selectedSubs = selIds.map((id) => {
          const matched = subjectsList.find((s) => normalizeId(s.id ?? s.subjectId) === id);
          return matched || { id, name: `Subject ${id}` };
        });
      }
    }
    groupIds.forEach((gid) => {
      const groupName = nameOf(groupsList, gid, `Group ${gid}`);
      const groupSubs = selectedSubs.filter((s) => {
        const sGroupIds = (s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId);
        return !sGroupIds.length || sGroupIds.includes(gid);
      });
      groupSubs.forEach((subject) => {
        const subId = normalizeId(subject.id ?? subject.subjectId);
        const isScheduled = entries.some(
          (s) =>
            (normalizeId(s.subjectId) === subId ||
              (s.subjectCode && subject.code && String(s.subjectCode).toUpperCase() === String(subject.code).toUpperCase()) ||
              (s.subjectName && subject.name && String(s.subjectName).toLowerCase().includes(String(subject.name).toLowerCase()))) &&
            (!s.groupId || normalizeId(s.groupId) === gid || matchesScheduleGroup(s, gid, exam, subjectsList) || groupIds.length <= 1),
        );
        if (!isScheduled) {
          messages.push(`[${groupName}] ${subject.name || "Subject " + subId} has not been scheduled.`);
        }
      });
    });
  }

  // Requirement 14: Capacity Validation
  groupIds.forEach((gid) => {
    const groupName = nameOf(groupsList, gid, `Group ${gid}`);
    const reqStrength = getRequiredCandidateStrength(exam, gid, programsList, true, studentsList);
    if (reqStrength <= 0) {
      messages.push(
        `Candidate strength for ${groupName} could not be determined. Please verify active student enrollments, programs, and academic levels before finalizing.`,
      );
    } else {
      const grpEntries = entries.filter((s) => normalizeId(s.groupId) === gid || matchesScheduleGroup(s, gid, exam, subjectsList));
      grpEntries.forEach((entry) => {
        let allocatedStrength = ensureArray(entry.hallAssignments).reduce(
          (total, assignment) => total + (Number(assignment.candidateCount) || 0),
          0,
        );
        // If entry has room assigned but candidateCount was 0 or unassigned, auto-heal using room capacity
        if (allocatedStrength === 0 && ensureArray(entry.hallAssignments).some((a) => a.hallId)) {
          let rem = reqStrength;
          entry.hallAssignments = ensureArray(entry.hallAssignments).map((a) => {
            const rObj = ensureArray(roomsList).find((r) => normalizeId(r.id) === normalizeId(a.hallId));
            const rCap = Number(rObj?.capacity) || 0;
            const count = rem > 0 ? (rCap > 0 ? Math.min(rem, rCap) : rem) : (rCap > 0 ? rCap : 1);
            rem -= count;
            return { ...a, candidateCount: count };
          });
          allocatedStrength = entry.hallAssignments.reduce(
            (total, assignment) => total + (Number(assignment.candidateCount) || 0),
            0,
          );
        }
        if (allocatedStrength < reqStrength) {
          messages.push(
            `${groupName} requires ${reqStrength} candidate seats, but only ${allocatedStrength} candidates are allocated for ${entry.subjectName || "session"}.`,
          );
        }
      });
    }
  });

  entries.forEach((entry) =>
    messages.push(...validateScheduleEntry(exam, entry, schedules, entry.id, roomsList, facultyList, true, subjectsList, groupsList)),
  );
  return [...new Set(messages)];
}

const isGroupScheduleReady = (
  exam,
  groupId,
  schedules,
  subjectsList = [],
  roomsList = [],
  facultyList = [],
  programsList = [],
  groupsList = [],
  studentsList = [],
) => {
  if (!exam || !groupId) return false;
  const gid = normalizeId(groupId);
  const isCombined = isCombinedExamination(exam);
  const grpEntries = schedules.filter(
    (s) =>
      normalizeId(s.examId) === normalizeId(exam.id) &&
      (normalizeId(s.groupId) === gid || matchesScheduleGroup(s, gid, exam, subjectsList)),
  );
  if (!grpEntries.length) return false;

  // 1. Completeness: required subjects or pattern sessions
  if (isCombined) {
    const configuredPatterns = (exam.selectedGroupPatterns && exam.selectedGroupPatterns[gid]) || [exam.examPattern];
    if (!configuredPatterns.length) return false;
    for (const pName of configuredPatterns) {
      if (!grpEntries.some((s) => s.patternName === pName || (s.subjectName && s.subjectName.includes(pName)))) {
        return false;
      }
    }
  } else {
    const groupSubs = getSelectedSubjectsForExam(exam, gid, subjectsList);
    if (!groupSubs.length) return false;
    for (const sub of groupSubs) {
      if (!grpEntries.some((s) => normalizeId(s.subjectId) === normalizeId(sub.id))) {
        return false;
      }
    }
  }

  // 2. Candidate strength calculation
  const reqStrength = getRequiredCandidateStrength(exam, gid, programsList, true, studentsList);
  if (reqStrength <= 0) return false;

  // 3. Detailed validation for every entry of this group
  for (const entry of grpEntries) {
    // Missing date or out of bounds
    if (!entry.date) return false;
    if (exam.startDate && entry.date < exam.startDate) return false;
    if (exam.endDate && entry.date > exam.endDate) return false;

    // Missing time or invalid time
    if (!entry.startTime || !entry.endTime || entry.startTime >= entry.endTime) return false;

    // Hall assignments must exist and not be empty
    let assignments = ensureArray(entry.hallAssignments);
    if (assignments.length === 0 && (entry.roomId || entry.hallId)) {
      assignments = [{ hallId: entry.roomId || entry.hallId }];
    }
    if (assignments.length === 0) return false;

    let totalAllocated = assignments.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0);
    if (totalAllocated === 0 && assignments.some((a) => a.hallId)) {
      let rem = reqStrength;
      assignments = assignments.map((a) => {
        const rObj = ensureArray(roomsList).find((r) => normalizeId(r.id) === normalizeId(a.hallId));
        const rCap = Number(rObj?.capacity) || 0;
        const count = rem > 0 ? (rCap > 0 ? Math.min(rem, rCap) : rem) : (rCap > 0 ? rCap : 1);
        rem -= count;
        return { ...a, candidateCount: count };
      });
      totalAllocated = 0;
    } else {
      totalAllocated = 0;
    }
    const seenHalls = new Set();
    const seenFaculty = new Set();

    for (const a of assignments) {
      if (!a.hallId) return false;
      const hid = normalizeId(a.hallId);
      if (seenHalls.has(hid)) return false;
      seenHalls.add(hid);

      const room = roomsList.find((r) => normalizeId(r.id) === hid);
      if (!room || room.isActive === false || normalizeStatus(room.status) === "INACTIVE") return false;

      const count = Number(a.candidateCount);
      if (!Number.isInteger(count) || count <= 0) return false;
      const roomCap = Number(room.capacity) || 0;
      if (roomCap > 0 && count > roomCap) return false;
      totalAllocated += count;

      // Invigilator count rule: 1-60 -> 1, >60 -> 2
      const neededInv = requiredInvigilatorCount(count);
      const validInvIds = (a.invigilatorIds || [])
        .map(normalizeId)
        .filter((id) => id && id !== "0" && id !== "undefined" && id !== "null");
      if (validInvIds.length < neededInv) return false;

      for (const fid of validInvIds) {
        if (seenFaculty.has(fid)) return false; // same faculty in 2 rooms
        seenFaculty.add(fid);

        const fac = facultyList.find((f) => normalizeId(f.id) === fid);
        if (!fac || fac.isActive === false || normalizeStatus(fac.status) === "INACTIVE") return false;

        // Own-subject faculty exclusion
        const entrySubjectIds = [entry.subjectId, ...(entry.includedSubjectIds || [])].map(normalizeId).filter(Boolean);
        if (entrySubjectIds.length > 0 && Array.isArray(fac.subjectsTaught) && fac.subjectsTaught.length > 0) {
          if (entrySubjectIds.some((sId) => fac.subjectsTaught.map(normalizeId).includes(sId))) {
            return false;
          }
        }
      }
    }

    // Allocated capacity must be sufficient
    if (totalAllocated < reqStrength) return false;

    // Combined checks
    if (isCombined) {
      if (!entry.includedSubjectIds || ensureArray(entry.includedSubjectIds).length === 0) {
        return false;
      }
      if (entry.date !== exam.startDate) return false;

      // Combined date/time differs across groups
      const otherGroupCombined = schedules.find(
        (s) =>
          normalizeId(s.examId) === normalizeId(exam.id) &&
          (!entry.id || normalizeId(s.id) !== normalizeId(entry.id)) &&
          (s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName)),
      );
      if (otherGroupCombined) {
        if (canonicalDate(otherGroupCombined.date || otherGroupCombined.examDate) !== canonicalDate(entry.date || entry.examDate)) return false;
        if (otherGroupCombined.startTime !== entry.startTime || otherGroupCombined.endTime !== entry.endTime) {
          return false;
        }
      }
    }

    // Run validateScheduleEntry (checking room overlaps, faculty overlaps, etc.)
    const errs = validateScheduleEntry(
      exam,
      entry,
      schedules,
      entry.id,
      roomsList,
      facultyList,
      true,
      subjectsList,
      groupsList,
    );
    if (errs.length > 0) return false;
  }

  return true;
};

const getGroupNames = (exam, groupsList = []) => {
  if (exam?.groupName && exam.groupName !== "—") return exam.groupName;
  if (exam?.group?.name && exam.group.name !== "—") return exam.group.name;
  const ids = ensureArray(exam?.groupIds || (exam?.groupId ? [exam?.groupId] : []));
  if (ids.length > 0) {
    const names = ids.map((gid) => nameOf(groupsList, gid)).filter((n) => n && n !== "—");
    if (names.length > 0) return names.join(", ");
  }
  return exam?.groupName || "—";
};

const getProgramNames = (exam, programsList = []) => {
  if (exam?.programName && exam.programName !== "—") return exam.programName;
  if (exam?.program?.name && exam.program.name !== "—") return exam.program.name;
  const ids = ensureArray(exam?.programIds || (exam?.programId ? [exam?.programId] : []));
  if (ids.length > 0) {
    const names = ids.map((pid) => nameOf(programsList, pid)).filter((n) => n && n !== "—");
    if (names.length > 0) return names.join(", ");
  }
  return exam?.programName || "—";
};

const getLevelNames = (exam, levelsList = []) => {
  if (exam?.academicLevelName && exam.academicLevelName !== "—") return exam.academicLevelName;
  if (exam?.levelName && exam.levelName !== "—") return exam.levelName;
  if (exam?.academicLevel?.name && exam.academicLevel.name !== "—") return exam.academicLevel.name;
  const ids = ensureArray(exam?.levelIds || (exam?.levelId ? [exam?.levelId] : []));
  if (ids.length > 0) {
    const names = ids.map((lid) => nameOf(levelsList, lid)).filter((n) => n && n !== "—");
    if (names.length > 0) return names.join(", ");
  }
  return exam?.academicLevelName || exam?.levelName || "—";
};

// Format time string to 8-character ISO string ("HH:mm:ss") for ASP.NET Core System.TimeOnly compatibility
const formatTimeOnly = (timeStr) => {
  if (!timeStr) return "09:00:00";
  const s = String(timeStr).trim();
  if (s.length === 5 && s.includes(":")) return `${s}:00`;
  if (s.length === 8) return s;
  const parts = s.split(":");
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const ss = parts[2] ? parts[2].padStart(2, "0") : "00";
    return `${hh}:${mm}:${ss}`;
  }
  return "09:00:00";
};

const normalizeScheduleRecord = (
  s,
  fallbackGroupId = null,
  examContext = null,
  allGroups = [],
  allSubjects = [],
  roomsList = [],
  facultyList = [],
  programsList = [],
  studentsList = [],
) => {
  const dateVal = s?.examDate ?? s?.date;
  const formattedDate = dateVal ? String(dateVal).split("T")[0] : "";
  const maxMarksVal = s?.maxMarks ?? s?.totalMarks ?? "100";
  const passMarksVal = s?.passingMarks ?? "35";
  let roomNameVal = s?.hall ?? s?.roomNumber ?? s?.roomName ?? s?.hallNames ?? "";
  if (roomNameVal === "—" || roomNameVal === "-") roomNameVal = "";
  let invigilatorVal = s?.invigilatorName ?? s?.invigilator ?? s?.facultyNames ?? "";
  if (invigilatorVal === "—" || invigilatorVal === "-") invigilatorVal = "";
  const rawHallAssignments = ensureArray(s?.hallAssignments);

  let resolvedGroupId = normalizeId(s?.groupId ?? fallbackGroupId);
  if (!resolvedGroupId && examContext) {
    const examGids = ensureArray(examContext.groupIds || (examContext.groupId ? [examContext.groupId] : [])).map(normalizeId).filter(Boolean);
    if (examGids.length === 1) {
      resolvedGroupId = examGids[0];
    } else if (examGids.length > 0) {
      if (s?.subjectId && Array.isArray(allSubjects) && allSubjects.length > 0) {
        const matched = allSubjects.find((sub) => normalizeId(sub.id ?? sub.subjectId) === normalizeId(s.subjectId));
        if (matched) {
          const subGids = ensureArray(matched.groupIds || (matched.groupId ? [matched.groupId] : [])).map(normalizeId).filter(Boolean);
          const common = subGids.find((g) => examGids.includes(g));
          if (common) resolvedGroupId = common;
        }
      }
      if (!resolvedGroupId) resolvedGroupId = examGids[0];
    }
  }
  if (!resolvedGroupId && s?.subjectId && Array.isArray(allSubjects) && allSubjects.length > 0) {
    const matched = allSubjects.find((sub) => normalizeId(sub.id ?? sub.subjectId) === normalizeId(s.subjectId));
    if (matched) {
      const subGids = ensureArray(matched.groupIds || (matched.groupId ? [matched.groupId] : [])).map(normalizeId).filter(Boolean);
      if (subGids.length > 0) {
        resolvedGroupId = subGids[0];
      }
    }
  }
  if (!resolvedGroupId && examContext?.groupId) {
    resolvedGroupId = normalizeId(examContext.groupId);
  }
  if (!resolvedGroupId && Array.isArray(allGroups) && allGroups.length > 0) {
    resolvedGroupId = normalizeId(allGroups[0]?.id ?? allGroups[0]?.groupId);
  }

  // Reconstruct hallAssignments if missing or empty, checking roomNameVal, hallNames, hallId, roomId, etc.
  let hallAssignments = [];
  if (rawHallAssignments.length > 0) {
    hallAssignments = rawHallAssignments.map((a) => {
      const rawHid = a?.hallId ?? a?.roomId;
      const validHid = rawHid !== undefined && rawHid !== null && String(rawHid).trim() !== "" ? normalizeId(rawHid) : "";
      return {
        hallId: validHid,
        hallName: a?.hallName || a?.roomName || a?.name || (validHid && roomsList?.length ? nameOf(roomsList, validHid) : ""),
        candidateCount: Number(a?.candidateCount) > 0 ? Number(a.candidateCount) : (Number(s?.candidateCount) > 0 ? Number(s.candidateCount) : 0),
        invigilatorIds: ensureArray(a?.invigilatorIds || a?.facultyIds)
          .map(normalizeId)
          .filter((id) => id && id !== "0" && id !== "undefined" && id !== "null"),
      };
    });
  } else {
    const rawDirectHid = s?.hallId ?? s?.roomId;
    const directHid = rawDirectHid !== undefined && rawDirectHid !== null && String(rawDirectHid).trim() !== "" ? normalizeId(rawDirectHid) : "";
    if (directHid) {
      const rawInvIds = ensureArray(
        s?.invigilatorIds || s?.facultyIds || (s?.invigilatorId ? [s.invigilatorId] : []) || (s?.facultyId ? [s.facultyId] : []),
      )
        .map(normalizeId)
        .filter((id) => id && id !== "0" && id !== "undefined" && id !== "null");

      hallAssignments = [
        {
          hallId: directHid,
          hallName: roomNameVal || (roomsList?.length ? nameOf(roomsList, directHid) : ""),
          candidateCount: Number(s?.candidateCount) > 0 ? Number(s.candidateCount) : 0,
          invigilatorIds: rawInvIds,
        },
      ];
    } else {
      hallAssignments = [];
      roomNameVal = "—";
      invigilatorVal = "—";
    }
  }

  // If hall assignments have 0 or missing candidateCount, restore based on required candidate strength & room capacity
  const targetReqStrength = getRequiredCandidateStrength(examContext, resolvedGroupId, programsList, false, studentsList);
  if (hallAssignments.length > 0) {
    let remainingToAllocate = targetReqStrength > 0 ? targetReqStrength : 0;
    hallAssignments = hallAssignments.map((a) => {
      let cCount = Number(a.candidateCount) || 0;
      if (cCount <= 0) {
        const roomObj = ensureArray(roomsList).find((r) => normalizeId(r.id) === normalizeId(a.hallId));
        const roomCap = Number(roomObj?.capacity) || 0;
        if (remainingToAllocate > 0) {
          cCount = roomCap > 0 ? Math.min(remainingToAllocate, roomCap) : remainingToAllocate;
          remainingToAllocate -= cCount;
        } else if (targetReqStrength > 0) {
          cCount = roomCap > 0 ? Math.min(targetReqStrength, roomCap) : targetReqStrength;
        } else {
          cCount = roomCap > 0 ? roomCap : 1;
        }
      }
      return {
        ...a,
        candidateCount: cCount,
      };
    });
  }

  if (hallAssignments.length > 0) {
    if (!roomNameVal || roomNameVal === "—") {
      roomNameVal = hallAssignments.map((a) => a.hallName).filter(Boolean).join(", ") || "—";
    }
    if (!invigilatorVal || invigilatorVal === "—") {
      const invIds = hallAssignments.flatMap((a) => a.invigilatorIds || []);
      if (invIds.length > 0 && facultyList?.length > 0) {
        invigilatorVal = invIds.map((id) => nameOf(facultyList, id)).filter((n) => n && n !== "—").join(", ") || "—";
      }
    }
  } else {
    roomNameVal = "—";
    invigilatorVal = "—";
  }

  const rawId = s?.examinationScheduleId ?? s?.examScheduleId ?? s?.scheduleId ?? s?.id;
  const stableId = rawId !== undefined && rawId !== null && String(rawId).trim() !== ""
    ? normalizeId(rawId)
    : `sch-${normalizeId(s?.examinationId ?? s?.examId ?? examContext?.id)}-${resolvedGroupId}-${normalizeId(s?.subjectId || s?.patternName || formattedDate)}`;

  const totalCandidatesAlloc = hallAssignments.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0);

  return {
    id: stableId,
    examId: normalizeId(s?.examinationId ?? s?.examId ?? examContext?.id),
    groupId: resolvedGroupId,
    subjectId: normalizeId(s?.subjectId),
    patternName: s?.patternName || "",
    includedSubjectIds: ensureArray(s?.includedSubjectIds).map(normalizeId),
    subjectName: s?.subjectName || "Subject",
    subjectCode: s?.subjectCode || "",
    date: formattedDate,
    startTime: s?.startTime ? String(s.startTime).substring(0, 5) : "09:00",
    endTime: s?.endTime ? String(s.endTime).substring(0, 5) : "12:00",
    totalMarks: String(maxMarksVal),
    passingMarks: String(passMarksVal),
    passPercentage: String(
      s?.passPercentage || Math.round((Number(passMarksVal) / (Number(maxMarksVal) || 100)) * 100) || "35",
    ),
    candidateCount: totalCandidatesAlloc,
    roomName: roomNameVal || "—",
    invigilatorName: invigilatorVal || "—",
    hallAssignments,
    mode: s?.examMode ?? s?.mode ?? "Written",
    scheduleMode: s?.scheduleMode || (s?.patternName ? "PATTERN_WISE" : "SUBJECT_WISE"),
  };
};

// Format schedule entry to strict backend API DTO
const formatScheduleDto = (s, targetExamId, facultyList = []) => {
  const isObj = s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName);
  const examNumericId = Number(targetExamId || s.examId);
  const groupNumericId = Number(s.groupId);
  const rawSubId = Number(s.subjectId);
  const subjectNumericId = !isNaN(rawSubId) && rawSubId > 0 ? rawSubId : 0;

  const assignments = ensureArray(s.hallAssignments);
  const firstAssignment = assignments[0];
  const rawRoomId = firstAssignment?.hallId ?? firstAssignment?.roomId ?? s.roomId;
  const numRoomId = Number(rawRoomId);
  const validRoomId = !isNaN(numRoomId) && numRoomId > 0 ? numRoomId : null;

  const rawInvId = firstAssignment?.invigilatorIds?.[0] ?? firstAssignment?.facultyId ?? s.invigilatorId;
  const numInvId = Number(rawInvId);
  const validInvId = !isNaN(numInvId) && numInvId > 0 ? numInvId : null;

  const hallName = (assignments.length > 0 ? assignments.map((a) => a.hallName).filter(Boolean).join(", ") : "") || s.hall || (s.roomName !== "—" ? s.roomName : "") || "";
  const invName = (assignments.length > 0 ? assignments.map((a) => (a.invigilatorIds || []).map((id) => nameOf(facultyList, id)).filter(Boolean).join(", ")).filter(Boolean).join(" | ") : "") || s.invigilator || (s.invigilatorName !== "—" ? s.invigilatorName : "") || "";
  const totalAllocatedCandidates = assignments.reduce(
    (sum, a) => sum + (Number(a.candidateCount) || 0),
    Number(s.candidateCount) || 0,
  );

  return {
    examinationId: isNaN(examNumericId) ? (targetExamId || s.examId) : examNumericId,
    groupId: isNaN(groupNumericId) ? s.groupId : groupNumericId,
    subjectId: subjectNumericId,
    patternName: s.patternName || "",
    includedSubjectIds: ensureArray(s.includedSubjectIds)
      .map((id) => {
        const numericId = Number(id);
        return Number.isNaN(numericId) ? id : numericId;
      })
      .filter(Boolean),
    examDate: s.date ? String(s.date).split("T")[0] : (s.examDate ? String(s.examDate).split("T")[0] : ""),
    startTime: formatTimeOnly(s.startTime),
    endTime: formatTimeOnly(s.endTime),
    maxMarks: Number(s.maxMarks ?? s.totalMarks) || 100,
    passingMarks: Number(s.passingMarks) || 35,
    passPercentage: Number(s.passPercentage) || 35,
    examMode: s.examMode || s.mode || (isObj ? "Objective" : "Written"),
    scheduleMode: s.scheduleMode || (isObj ? "PATTERN_WISE" : "SUBJECT_WISE"),
    roomId: validRoomId,
    roomNumber: hallName || "",
    hall: hallName || "",
    invigilatorId: validInvId,
    invigilator: invName || "",
    invigilatorName: invName || "",
    candidateCount: totalAllocatedCandidates,
    candidatesCount: totalAllocatedCandidates,
    capacity: totalAllocatedCandidates,
    hallAssignments: assignments.map((a) => {
      const hallNum = Number(a.hallId ?? a.roomId);
      return {
        hallId: isNaN(hallNum) ? (a.hallId ?? a.roomId) : hallNum,
        candidateCount: Number(a.candidateCount) || 0,
        invigilatorIds: ensureArray(a.invigilatorIds || a.facultyIds)
          .map(normalizeId)
          .filter((id) => id && id !== "0" && id !== "undefined" && id !== "null")
          .map((id) => {
            const invNum = Number(id);
            return isNaN(invNum) ? id : invNum;
          }),
      };
    }),
  };
};

// Persist bulk or single examination schedules to backend DB (Clean JSON array directly)
const saveSchedulesToBackend = async (examId, schedulesList, facultyList = []) => {
  if (!schedulesList || !schedulesList.length) {
    return [];
  }
  const dtoArray = schedulesList.map((s) => formatScheduleDto(s, examId, facultyList));
  const res = await apiClient.post(`/api/v1/examinations/${examId}/schedules`, dtoArray);
  return res.data?.data ?? res.data ?? [];
};

// Update existing schedule in backend DB
const updateScheduleInBackend = async (examId, scheduleId, scheduleData, facultyList = []) => {
  const dto = formatScheduleDto(scheduleData, examId, facultyList);
  const isNumericScheduleId = !isNaN(Number(scheduleId)) && Number(scheduleId) > 0 && !String(scheduleId).startsWith("sch-");
  if (isNumericScheduleId) {
    try {
      const res = await apiClient.put(`/api/v1/examinations/${examId}/schedules/${scheduleId}`, dto);
      return res.data?.data ?? res.data;
    } catch (err) {
      // Fallback to bulk/single POST upsert if PUT is unsupported
      const postRes = await apiClient.post(`/api/v1/examinations/${examId}/schedules`, [dto]);
      return postRes.data?.data ?? postRes.data;
    }
  }
  const res = await apiClient.post(`/api/v1/examinations/${examId}/schedules`, [dto]);
  return res.data?.data ?? res.data;
};

// Delete schedule from backend DB
const deleteScheduleFromBackend = async (examId, scheduleId) => {
  if (!scheduleId) return;
  const isNumericScheduleId = !isNaN(Number(scheduleId)) && Number(scheduleId) > 0 && !String(scheduleId).startsWith("sch-");
  if (isNumericScheduleId) {
    const res = await apiClient.delete(`/api/v1/examinations/${examId}/schedules/${scheduleId}`);
    return res.data;
  }
  try {
    const res = await apiClient.delete(`/api/v1/examinations/${examId}/schedules/${scheduleId}`);
    return res.data;
  } catch (e) {
    return null;
  }
};

const normalizeExamRecord = (e) => {
  const id = normalizeId(e?.examinationId ?? e?.id);
  const rawLevels = e?.academicLevelIds ?? e?.levelIds ?? e?.academicLevelId ?? e?.levelId;
  const levelIds = ensureArray(rawLevels).map(normalizeId);
  const rawGroups =
    e?.groupIds ??
    e?.groupId ??
    e?.courseGroupId ??
    e?.courseGroupIds ??
    (Array.isArray(e?.groups) ? e.groups.map((g) => g.id || g.groupId) : null) ??
    (Array.isArray(e?.groupProgramSelections) ? e.groupProgramSelections.map((g) => g.groupId) : (e?.groupProgramSelections && typeof e.groupProgramSelections === "object" ? Object.keys(e.groupProgramSelections) : null));
  const groupIds = ensureArray(rawGroups).map(normalizeId).filter(Boolean);
  const rawPrograms = e?.programIds ?? e?.programId;
  const programIds = ensureArray(rawPrograms).map(normalizeId);
  const rawSubjects = e?.selectedSubjectIds ?? e?.allocatedSubjectIds ?? e?.subjectIds;
  const selectedSubjectIds = ensureArray(rawSubjects).map(normalizeId);
  const rawSchedules = e?.schedules ?? e?.examinationSchedules;
  return {
    id,
    code: e?.examCode ?? e?.code ?? "",
    name: e?.examName ?? e?.name ?? "Examination",
    examCategory: e?.examCategory ?? e?.category ?? "Regular",
    customCategoryName: e?.customCategoryName || "",
    boardId: normalizeId(e?.boardId),
    yearId: normalizeId(e?.academicYearId ?? e?.yearId),
    levelIds,
    levelId: levelIds[0] || "",
    groupIds,
    groupId: groupIds[0] || "",
    programIds,
    programId: programIds[0] || "",
    groupName: e?.groupName || e?.group?.name || "",
    programName: e?.programName || e?.program?.name || "",
    academicLevelName: e?.academicLevelName || e?.levelName || e?.academicLevel?.name || "",
    selectedSubjectIds,
    groupProgramSelections: e?.groupProgramSelections || [],
    examType: e?.examType || "",
    selectedGroupPatterns: e?.selectedGroupPatterns || {},
    examPattern: e?.examPattern ?? e?.pattern ?? "",
    startDate: e?.startDate ? String(e.startDate).split("T")[0] : "",
    endDate: e?.endDate ? String(e.endDate).split("T")[0] : "",
    description: e?.description || "",
    status: normalizeStatus(e?.status || "DRAFT"),
    scheduleMode:
      e?.scheduleMode || getExaminationScheduleMode(e),
    schedules: ensureArray(rawSchedules).map((entry) => ({
      ...normalizeScheduleRecord(entry, groupIds[0] || e?.groupId, e, [], selectedSubjectIds),
      examId: id,
      groupId: normalizeId(entry.groupId || groupIds[0] || e?.groupId),
    })),
  };
};

export const pageConfig = {
  title: "Examination Management",
  subtitle: "Configure Intermediate college examinations and build conflict-free schedules.",
  breadcrumb: ["Examinations"],
};

// ---------- MAIN EXAMINATION PAGE COMPONENT ----------
export default function ExaminationPage() {
  const academicCtx = useAcademicContext();
  const {
    selectedBoard = null,
    selectedBoardId = null,
    selectedAcademicYear = null,
    selectedAcademicYearId = null,
  } = academicCtx;

  // Master state replacing static mock arrays
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [masterPatterns, setMasterPatterns] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [eligibleSubjects, setEligibleSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);

  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const mutationRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsError, setExamsError] = useState(null);
  const loadExamsAbortRef = useRef(null);

  // Clean React View State (No Window Router Hacks)
  const [viewMode, setViewMode] = useState("list"); // "list" | "add" | "edit"
  const [activeTab, setActiveTab] = useState("exams"); // "exams" | "schedule"
  const [editingExamId, setEditingExamId] = useState(null);

  const [examId, setExamId] = useState("");
  const [detail, setDetail] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [remove, setRemove] = useState(null);
  const [removeSchedule, setRemoveSchedule] = useState(null);
  const [cancelExamTarget, setCancelExamTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteScheduleLoading, setDeleteScheduleLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const [sch, setSch] = useState({
    groupId: "",
    subjectId: "",
    patternName: "",
    date: "",
    startTime: "09:00",
    endTime: "12:00",
    totalMarks: "100",
    passingMarks: "35",
    passPercentage: "35",
    hallAssignments: [],
    mode: "Written",
  });
  const [errors, setErrors] = useState({});

  const [filters, setFilters] = useState({ groupId: "", programId: "", levelId: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const loadExaminations = useCallback(async (isRetry = false) => {
    loadExamsAbortRef.current?.abort();
    const controller = new AbortController();
    loadExamsAbortRef.current = controller;
    const { signal } = controller;
    setExamsLoading(true);
    setExamsError(null);
    try {
      const response = await apiClient.get("/api/v1/examinations", { signal });
      if (signal.aborted) return;
      const raw = unwrap(response);
      const normalized = raw.map(normalizeExamRecord);
      setExams(normalized);
      setSchedules((previous) => normalized.flatMap((exam, index) =>
        Array.isArray(raw[index]?.schedules) || Array.isArray(raw[index]?.examinationSchedules)
          ? (exam.schedules || []).map((entry) => ({ ...entry, examId: exam.id }))
          : previous.filter((entry) => normalizeId(entry.examId) === exam.id)
      ));
      if (isRetry) showToast("Examinations reloaded successfully.", "success");
      return normalized;
    } catch (error) {
      if (signal.aborted) return;
      setExams([]);
      setSchedules([]);
      setExamsError(getApiErrorMessage(error) || "Failed to load examinations. Please retry.");
    } finally {
      if (!signal.aborted) setExamsLoading(false);
    }
  }, [showToast]);

  // Robust Student Fetching & Enrichment from Students, Admissions, and Active Endpoints
  const fetchStudentsList = useCallback(async () => {
    try {
      const [studentsRes, admissionsRes, activeStudentsRes] = await Promise.allSettled([
        apiClient.get("/api/v1/students"),
        apiClient.get("/api/v1/student-admissions"),
        apiClient.get("/api/v1/students/active"),
      ]);

      const rawStudents = studentsRes.status === "fulfilled" ? unwrap(studentsRes.value) : [];
      const rawAdmissions = admissionsRes.status === "fulfilled" ? unwrap(admissionsRes.value) : [];
      const rawActive = activeStudentsRes.status === "fulfilled" ? unwrap(activeStudentsRes.value) : [];

      const admissionsByStudentId = new Map();
      const admissionsByNumber = new Map();
      const admissionsByName = new Map();

      ensureArray(rawAdmissions).forEach((adm) => {
        const sId = normalizeId(adm.studentId ?? adm.id);
        const admNo = String(adm.admissionNo ?? adm.admissionNumber ?? "").trim();
        const admName = String(adm.studentName ?? adm.fullName ?? adm.name ?? "").trim().toLowerCase();
        if (sId) admissionsByStudentId.set(sId, adm);
        if (admNo) admissionsByNumber.set(admNo, adm);
        if (admName) admissionsByName.set(admName, adm);
      });

      const combinedRaw = [...ensureArray(rawStudents), ...ensureArray(rawActive)];
      if (combinedRaw.length === 0 && rawAdmissions.length > 0) {
        combinedRaw.push(...ensureArray(rawAdmissions));
      }

      const seenIds = new Set();
      const normalizedStudents = [];

      for (const s of combinedRaw) {
        const id = normalizeId(s.studentId ?? s.id ?? s._id);
        const admNo = String(s.admissionNo ?? s.admissionNumber ?? "").trim();
        const sName = String(s.studentName ?? s.fullName ?? s.name ?? "Student").trim();
        const dedupKey = id || admNo || sName.toLowerCase();
        if (!dedupKey || seenIds.has(dedupKey)) continue;
        seenIds.add(dedupKey);

        const adm = admissionsByStudentId.get(id) || admissionsByNumber.get(admNo) || admissionsByName.get(sName.toLowerCase()) || {};

        const groupId = normalizeId(s.groupId ?? s.GroupId ?? s.group?.id ?? s.courseGroupId ?? adm.groupId ?? adm.GroupId);
        const groupName = s.groupName ?? s.GroupName ?? s.group?.name ?? adm.groupName ?? adm.group ?? "";
        const programId = normalizeId(s.programId ?? s.ProgramId ?? s.programmeId ?? s.ProgrammeId ?? s.program?.id ?? s.programme?.id ?? adm.programId ?? adm.ProgramId ?? adm.programmeId);
        const programName = s.programName ?? s.ProgramName ?? s.programmeName ?? s.programme?.name ?? s.program?.name ?? adm.programName ?? adm.programme ?? "";
        const academicLevelId = normalizeId(s.academicLevelId ?? s.AcademicLevelId ?? s.levelId ?? s.LevelId ?? s.academicLevel?.id ?? adm.academicLevelId ?? adm.AcademicLevelId);
        const academicYearId = normalizeId(s.academicYearId ?? s.AcademicYearId ?? adm.academicYearId ?? adm.AcademicYearId);
        const status = s.status ?? s.studentStatus ?? s.Status ?? adm.status ?? "Active";

        normalizedStudents.push({
          id: id || admNo || `student-${dedupKey}`,
          studentId: id || admNo,
          name: sName,
          admissionNo: admNo,
          rollNo: s.rollNo ?? s.rollNumber ?? adm.rollNo ?? adm.rollNumber ?? "",
          academicLevelId,
          academicYearId,
          groupId,
          groupName,
          programId,
          programName,
          status,
          isActive: s.isActive !== false && normalizeStatus(status) !== "INACTIVE" && normalizeStatus(status) !== "SUSPENDED",
        });
      }

      // If admissions had records not present in students list, add them too
      ensureArray(rawAdmissions).forEach((adm) => {
        const id = normalizeId(adm.studentId ?? adm.id);
        const admNo = String(adm.admissionNo ?? adm.admissionNumber ?? "").trim();
        const sName = String(adm.studentName ?? adm.fullName ?? adm.name ?? "Student").trim();
        const dedupKey = id || admNo || sName.toLowerCase();
        if (dedupKey && !seenIds.has(dedupKey)) {
          seenIds.add(dedupKey);
          normalizedStudents.push({
            id: id || admNo || `adm-${dedupKey}`,
            studentId: id || admNo,
            name: sName,
            admissionNo: admNo,
            rollNo: adm.rollNo ?? adm.rollNumber ?? "",
            academicLevelId: normalizeId(adm.academicLevelId ?? adm.levelId),
            academicYearId: normalizeId(adm.academicYearId),
            groupId: normalizeId(adm.groupId ?? adm.group?.id),
            groupName: adm.groupName ?? "",
            programId: normalizeId(adm.programId ?? adm.programmeId ?? adm.program?.id),
            programName: adm.programName ?? adm.programmeName ?? "",
            status: adm.status ?? "Active",
            isActive: adm.isActive !== false && normalizeStatus(adm.status) !== "INACTIVE",
          });
        }
      });

      setStudents(normalizedStudents);
      return normalizedStudents;
    } catch (e) {
      console.warn("fetchStudentsList encountered an issue:", e);
      return [];
    }
  }, []);

  // 1. Initial Mount: Active Boards, Patterns, Exam Types, Rooms, Faculty, Academic Levels, Groups, Students
  useEffect(() => {
    let isMounted = true;
    const fetchInitialMasterData = async () => {
      setLoading(true);
      try {
        const [boardsRes, patternsRes, typesRes, roomsRes, facultyRes, levelsRes, groupsRes] =
          await Promise.allSettled([
            apiClient.get("/api/v1/boards/active").catch(() => apiClient.get("/api/v1/boards")),
            apiClient.get("/api/v1/examinations/patterns"),
            apiClient.get("/api/v1/examinations/types"),
            apiClient.get("/api/v1/rooms"),
            apiClient.get("/api/v1/staff", { params: { staffType: "Teaching" } }),
            apiClient.get("/api/v1/academic-levels"),
            apiClient.get("/api/v1/groups"),
          ]);

        if (!isMounted) return;

        // Fetch students and enrich with admissions
        await fetchStudentsList();

        if (boardsRes.status === "fulfilled") {
          const rawBoards = unwrap(boardsRes.value);
          const activeBoards = rawBoards
            .map((b) => ({
              id: normalizeId(b.boardId ?? b.id),
              name: b.boardName ?? b.name,
              code: b.boardCode ?? b.code ?? "",
              status: b.status,
              isActive:
                b.status == true ||
                b.status === "Active" ||
                b.status === "true" ||
                b.isActive == true ||
                b.isActive !== false,
            }))
            .filter((b) => b.isActive);
          setBoards(activeBoards);
        }

        if (patternsRes.status === "fulfilled") {
          setMasterPatterns(unwrap(patternsRes.value));
        }

        if (typesRes.status === "fulfilled") {
          setExamTypes(unwrap(typesRes.value));
        }

        if (roomsRes.status === "fulfilled") {
          const rawRooms = unwrap(roomsRes.value);
          setRooms(
            rawRooms
              .map((r) => ({
                id: normalizeId(r.roomId ?? r.id),
                name: r.name || `Room ${r.roomNumber || r.id}`,
                roomNumber: r.roomNumber || "",
                capacity: Number(r.capacity) || 0,
                type: r.type || "Exam Hall",
                levelId: r.levelId || "ALL",
                status: r.status || (r.isActive ? "Active" : "Inactive"),
                isActive: r.isActive !== false && normalizeStatus(r.status) !== "INACTIVE",
              }))
              .filter((r) => r.isActive),
          );
        }

        if (facultyRes.status === "fulfilled") {
          const rawFaculty = unwrap(facultyRes.value);
          setFaculty(
            rawFaculty
              .map((f) => ({
                id: normalizeId(f.facultyId ?? f.staffId ?? f.id),
                name: f.fullName ?? f.name,
                designation: f.designation || "Teaching Faculty",
                isActive: f.isActive !== false && normalizeStatus(f.status) !== "INACTIVE" && (!f.staffType || normalizeStatus(f.staffType) === "TEACHING"),
                subjectsTaught: (f.subjectsTaught || f.subjectIds || f.staffSubjectAllocations || []).map((s) => normalizeId(s.subjectId ?? s)),
              }))
              .filter((f) => f.isActive),
          );
        }


        if (levelsRes.status === "fulfilled") {
          const rawLevels = unwrap(levelsRes.value);
          setAcademicLevels(
            rawLevels.map((l) => ({
              id: normalizeId(l.academicLevelId ?? l.id),
              name: l.academicLevelName ?? l.levelName ?? l.name,
              code: l.levelCode ?? l.code ?? "",
              boardId: normalizeId(l.boardId),
            })),
          );
        }

        if (groupsRes.status === "fulfilled") {
          const rawGroups = unwrap(groupsRes.value);
          const mappedGroups = rawGroups.map((g) => {
            const gid = normalizeId(g.groupId ?? g.id);
            const progs = ensureArray(g.programs).map((p) => ({
              id: normalizeId(p.programId ?? p.id),
              name: p.programName ?? p.name,
              code: p.programCode ?? p.code ?? "",
              groupId: gid,
              candidateStrength: Number(p.candidateStrength ?? p.strength ?? p.capacity) || 0,
              capacity: Number(p.capacity ?? p.candidateStrength) || 0,
              isActive: p.isActive !== false,
              objectivePatternCodes: p.objectivePatternCodes || [],
            }));
            return {
              id: gid,
              name: g.groupName ?? g.name,
              code: g.groupCode ?? g.code ?? "",
              boardId: normalizeId(g.boardId),
              programs: progs,
              isActive: g.isActive !== false,
            };
          });
          setGroups(mappedGroups);

          const extractedPrograms = mappedGroups.flatMap((g) => g.programs || []);
          if (extractedPrograms.length > 0) {
            setPrograms(extractedPrograms);
          }

          try {
            const progsRes = await apiClient.get("/api/v1/programs");
            const rawProgs = unwrap(progsRes);
            if (Array.isArray(rawProgs) && rawProgs.length > 0) {
              setPrograms((prev) => {
                const map = new Map(prev.map((p) => [`${p.groupId}_${p.id}`, p]));
                rawProgs.forEach((rp) => {
                  const rId = normalizeId(rp.programId ?? rp.id);
                  const rGid = normalizeId(rp.groupId);
                  if (rGid) {
                    map.set(`${rGid}_${rId}`, {
                      id: rId,
                      name: rp.programName ?? rp.name,
                      code: rp.programCode ?? rp.code ?? "",
                      groupId: rGid,
                      candidateStrength: Number(rp.candidateStrength ?? rp.strength ?? rp.capacity) || 0,
                      capacity: Number(rp.capacity ?? rp.candidateStrength) || 0,
                      isActive: rp.isActive !== false,
                      objectivePatternCodes: rp.objectivePatternCodes || [],
                    });
                  } else {
                    // Enrich existing programs across groups without wiping out their groupId
                    Array.from(map.values()).forEach((p) => {
                      if (p.id === rId) {
                        if (rp.programName && !p.name) p.name = rp.programName;
                        if (rp.programCode && !p.code) p.code = rp.programCode;
                      }
                    });
                  }
                });
                return Array.from(map.values());
              });
            }
          } catch (error) { if (isMounted) showToast(getApiErrorMessage(error) || "Failed to load programs.", "error"); }
        }
      } catch (err) {
        showToast("Failed to load initial master data.", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialMasterData();
    loadExaminations();
    return () => {
      isMounted = false;
      if (loadExamsAbortRef.current) {
        loadExamsAbortRef.current.abort();
      }
    };
  }, [showToast, loadExaminations]);

  const query = search.trim().toLowerCase();

  const list = exams.filter(
    (exam) =>
      (!filters.groupId || (exam.groupIds || [exam.groupId]).map(normalizeId).includes(filters.groupId)) &&
      (!filters.programId || (exam.programIds || [exam.programId]).map(normalizeId).includes(filters.programId)) &&
      (!filters.levelId || (exam.levelIds || [exam.levelId]).map(normalizeId).includes(filters.levelId)) &&
      (!query ||
        [
          exam.code,
          exam.name,
          codeOf(boards, exam.boardId),
          getGroupNames(exam, groups),
          getLevelNames(exam, academicLevels),
          exam.examCategory,
          exam.examPattern,
          exam.status,
        ].some((val) => String(val || "").toLowerCase().includes(query))),
  );

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const shownExams = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = list.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(page * PAGE_SIZE, list.length);

  useEffect(() => setPage(1), [filters, search]);

  const changeFilter = (n, v) => {
    setFilters((x) => ({
      ...x,
      [n]: v,
      ...(n === "groupId" ? { programId: "" } : {}),
    }));
  };

  const handleOpenDetails = async (exam) => {
    try {
      const response = await apiClient.get("/api/v1/examinations/" + exam.id + "/schedules");
      const fallbackGid = exam.groupIds?.[0] || exam.groupId || groups[0]?.id;
      const entries = unwrap(response).map((entry) => ({
        ...normalizeScheduleRecord(entry, fallbackGid, exam, groups, eligibleSubjects, rooms, faculty, programs, students),
        examId: exam.id,
        groupId: normalizeId(entry.groupId || fallbackGid),
      }));
      setSchedules((previous) => [...previous.filter((entry) => entry.examId !== exam.id), ...entries]);
      setDetail({ exam, schedules: entries });
    } catch (error) {
      showToast(getApiErrorMessage(error) || "Failed to load examination details.", "error");
    }
  };

  const currentExam = exams.find((e) => String(e.id) === String(examId));

  // Preserves all draft schedules when navigating back to Examinations list
  const handleBackFromSchedule = () => {
    setExamId("");
    setSearch("");
    setFilters({ groupId: "", programId: "", levelId: "" });
    setPage(1);
    setActiveTab("exams");
    setEditing(null);
    setErrors({});
  };

  const printSchedule = async (targetExam = null) => {
    const targetExams = targetExam
      ? [targetExam]
      : exams.filter((item) => item.status === "SCHEDULED" || item.status === "COMPLETED");
    const filename = targetExam ? `${targetExam.name}_Schedule` : "Scheduled_Examinations";

    // Attempt backend export endpoint first if single exam export
    if (targetExam && targetExam.id) {
      try {
        const res = await apiClient.get(`/api/v1/examinations/${targetExam.id}/export/excel`, {
          responseType: "blob",
          timeout: 6000,
        });
        if (res.data && res.data.size > 0) {
          const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement("a");
          link.href = blobUrl;
          link.setAttribute("download", `${filename.replace(/\s+/g, "_")}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(blobUrl);
          showToast("Schedule exported to Excel successfully.", "success");
          return;
        }
      } catch (_) {
        // Fallback to client-side XLSX generation
      }
    }

    const ok = directExportScheduleExcel(targetExams, schedules, groups, filename);
    if (!ok) {
      showToast("No scheduled examinations are available to export.", "warning");
    } else {
      showToast("Schedule exported to Excel successfully.", "success");
    }
  };

  // Create or Update Examination API call
  const handleSaveExamRecord = async (newRecord, proceedToSchedule = false) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    try {
      if (editingExamId) {
        try {
          const original = exams.find((exam) => exam.id === normalizeId(editingExamId));
          if (!original || !["DRAFT", "SCHEDULED"].includes(original.status)) throw new Error("This examination is read-only.");
          const persisted = unwrap(await apiClient.get("/api/v1/examinations/" + editingExamId + "/schedules"));
          const scopeKeys = ["levelIds", "groupIds", "programIds", "selectedSubjectIds"];
          const changedScope = scopeKeys.some((key) => JSON.stringify(ensureArray(original[key]).map(normalizeId).sort()) !== JSON.stringify(ensureArray(newRecord[key]).map(normalizeId).sort())) || original.examCategory !== newRecord.examCategory || original.examPattern !== newRecord.examPattern;
          if (persisted.length && changedScope) throw new Error("Remove the persisted schedules before changing Groups, Programs, Subjects, or Pattern.");
          if (newRecord.boardId !== original.boardId || newRecord.yearId !== original.yearId) throw new Error("Board and Academic Year cannot be changed when editing.");
          await apiClient.put(`/api/v1/examinations/${editingExamId}`, {
            examName: newRecord.name,
            examCategory: newRecord.examCategory,
            customCategoryName: newRecord.customCategoryName,
            boardId: Number(newRecord.boardId) || newRecord.boardId,
            academicYearId: Number(newRecord.yearId) || newRecord.yearId,
            academicLevelIds: newRecord.levelIds.map((id) => Number(id) || id),
            groupIds: newRecord.groupIds.map((id) => Number(id) || id),
            programIds: newRecord.programIds.map((id) => Number(id) || id),
            selectedSubjectIds: newRecord.selectedSubjectIds.map((id) => Number(id) || id),
            groupProgramSelections: newRecord.groupProgramSelections,
            examPattern: newRecord.examPattern,
            examType: newRecord.examType,
            selectedGroupPatterns: newRecord.selectedGroupPatterns,
            startDate: newRecord.startDate,
            endDate: newRecord.endDate,
            description: newRecord.description,
            status: newRecord.status,
            scheduleMode: newRecord.scheduleMode,
          });
          await loadExaminations();
          showToast("Examination updated successfully.", "success");
          setViewMode("list");
          setEditingExamId(null);
        } catch (err) {
          const errMsg = getApiErrorMessage(err) || "Failed to update examination.";
          showToast(errMsg, "error");
        }
      } else {
        try {
          const res = await apiClient.post("/api/v1/examinations", {
            examName: newRecord.name,
            examCode: newRecord.examCode || undefined,
            examCategory: newRecord.examCategory,
            customCategoryName: newRecord.customCategoryName,
            boardId: Number(newRecord.boardId) || newRecord.boardId,
            academicYearId: Number(newRecord.yearId) || newRecord.yearId,
            academicLevelIds: newRecord.levelIds.map((id) => Number(id) || id),
            groupIds: newRecord.groupIds.map((id) => Number(id) || id),
            programIds: newRecord.programIds.map((id) => Number(id) || id),
            selectedSubjectIds: newRecord.selectedSubjectIds.map((id) => Number(id) || id),
            groupProgramSelections: newRecord.groupProgramSelections,
            examPattern: newRecord.examPattern,
            examType: newRecord.examType,
            selectedGroupPatterns: newRecord.selectedGroupPatterns,
            startDate: newRecord.startDate,
            endDate: newRecord.endDate,
            description: newRecord.description,
            status: "DRAFT",
            scheduleMode: newRecord.scheduleMode,
          });

          const createdPayload = res.data?.data || res.data || {};
          const createdId = normalizeId(createdPayload.examinationId ?? createdPayload.id);
          if (!createdId || createdId === "0") throw new Error("The backend did not return an examination ID. Reload before trying again.");
          const draftRecord = normalizeExamRecord(createdPayload);

          setExams((prev) => {
            const next = [draftRecord, ...prev];

            return next;
          });
          await loadExaminations();
          setSearch("");
          setFilters({ groupId: "", programId: "", levelId: "" });
          setPage(1);

          if (proceedToSchedule) {
            showToast("Examination created. Proceeding to scheduling.", "success");
            setExamId(String(draftRecord.id));
            setViewMode("list");
            setActiveTab("schedule");
          } else {
            showToast(
              "Examination created and saved as Draft. You can schedule it anytime from the Examinations list.",
              "success",
            );
            setViewMode("list");
            setActiveTab("exams");
          }
        } catch (err) {
          const errMsg = getApiErrorMessage(err) || "Failed to create examination.";
          showToast(errMsg, "error");
        }
      }
    } finally { mutationRef.current = false; }
  };

  // Delete Examination API Call (DRAFT or CANCELLED)
  const handleDeleteExam = async () => {
    if (!remove || deleteLoading || mutationRef.current) return;
    if (remove.status !== "DRAFT" && remove.status !== "CANCELLED") {
      showToast("Only DRAFT or CANCELLED examinations can be deleted.", "error");
      setRemove(null);
      return;
    }
    try {
      mutationRef.current = true;
      setDeleteLoading(true);
      await apiClient.delete(`/api/v1/examinations/${remove.id}`);
      setExams((prev) => {
        const next = prev.filter((item) => String(item.id) !== String(remove.id));

        return next;
      });
      setSchedules((prev) => prev.filter((item) => String(item.examId) !== String(remove.id)));
      showToast(remove.status === "CANCELLED" ? "Cancelled examination deleted." : "Draft examination deleted.", "success");
    } catch (err) {
      const errMsg = getApiErrorMessage(err) || "Failed to delete examination.";
      showToast(errMsg, "error");
    } finally {
      mutationRef.current = false;
      setDeleteLoading(false);
      setRemove(null);
    }
  };

  const handleCancelExam = async () => {
    if (!cancelExamTarget || cancelLoading || mutationRef.current) return;
    if (normalizeStatus(cancelExamTarget.status) !== "SCHEDULED") return;
    mutationRef.current = true;
    setCancelLoading(true);
    try {
      const response = await apiClient.patch(`/api/v1/examinations/${cancelExamTarget.id}/cancel`, {});
      const record = response.data?.data ?? response.data;
      const returnedStatus = record?.status || record?.examinationStatus || "CANCELLED";
      setExams((previous) => previous.map((exam) => String(exam.id) === String(cancelExamTarget.id) ? { ...exam, status: normalizeStatus(returnedStatus) } : exam));
      await loadExaminations();
      showToast(`Examination "${cancelExamTarget.name}" cancelled successfully.`, "success");
    } catch (error) {
      showToast(getApiErrorMessage(error) || "Failed to cancel examination.", "error");
    } finally {
      mutationRef.current = false;
      setCancelLoading(false);
      setCancelExamTarget(null);
    }
  };

  // Finalize Schedule API Call (Transitions DRAFT -> SCHEDULED)
  const handleFinalizeSchedule = async (targetExam) => {
    const examToFinalize = targetExam || currentExam || exams.find((e) => String(e.id) === String(examId));
    if (mutationRef.current || (examToFinalize && normalizeStatus(examToFinalize.status) !== "DRAFT")) return;
    if (!examToFinalize) {
      setExamId("");
      setActiveTab("exams");
      return;
    }
    try {
      mutationRef.current = true;
      // Validate persisted schedule identities before publishing.
      const examEntries = schedules.filter((s) => normalizeId(s.examId) === normalizeId(examToFinalize.id));
      if (examEntries.length === 0) {
        showToast(`Cannot finalize: "${examToFinalize.name}" has no scheduled exam sessions.`, "error");
        return;
      }

      // If eligibleSubjects is empty in parent state, derive readiness subjects from scheduled entries
      let readinessSubjects = eligibleSubjects;
      if (!readinessSubjects || !readinessSubjects.length) {
        readinessSubjects = examEntries.map((s) => ({
          id: normalizeId(s.subjectId),
          name: s.subjectName,
          code: s.subjectCode,
          groupIds: s.groupId ? [normalizeId(s.groupId)] : [],
        }));
      }

      const readiness = validateScheduleReadiness(examToFinalize, schedules, groups, readinessSubjects, rooms, faculty, programs, students);
      if (readiness.length) throw new Error(readiness.join(" "));
      if (examEntries.some((entry) => !entry.id)) throw new Error("Reload schedules before finalizing.");

      await apiClient.post(`/api/v1/examinations/${examToFinalize.id}/finalize-schedule`);
      await loadExaminations();
      setExamId("");
      setSearch("");
      setFilters({ groupId: "", programId: "", levelId: "" });
      setPage(1);
      showToast(`Schedule finalized for "${examToFinalize.name}"! Status updated to SCHEDULED.`, "success");
      setActiveTab("exams");
    } catch (err) {
      const errMsg = getApiErrorMessage(err) || `Failed to finalize schedule for "${examToFinalize.name}". Finalization aborted.`;
      showToast(errMsg, "error");
    } finally {
      mutationRef.current = false;
    }
  };

  // Load examination schedules from backend whenever examId changes
  useEffect(() => {
    if (!examId) return;
    let isCurrent = true;
    const abortCtrl = new AbortController();
    const loadExamSchedules = async () => {
      try {
        const res = await apiClient.get(`/api/v1/examinations/${examId}/schedules`, {
          signal: abortCtrl.signal,
          timeout: 6000,
        });
        if (!isCurrent) return;
        const payload = res.data?.data ?? res.data ?? [];
        let rawSchedules = [];
        if (Array.isArray(payload)) {
          rawSchedules = payload;
        } else if (Array.isArray(payload?.schedules)) {
          rawSchedules = payload.schedules;
        } else if (Array.isArray(payload?.examinationSchedules)) {
          rawSchedules = payload.examinationSchedules;
        }
        {
          const examCtx = exams.find((e) => normalizeId(e.id) === normalizeId(examId)) || currentExam;
          const fallbackGid = examCtx?.groupIds?.[0] || examCtx?.groupId || groups[0]?.id;
          const normalized = rawSchedules.map((entry) => {
            const norm = normalizeScheduleRecord(entry, fallbackGid, examCtx, groups, eligibleSubjects, rooms, faculty, programs, students);
            return {
              ...norm,
              examId: normalizeId(examId || norm.examId),
              groupId: normalizeId(norm.groupId || entry.groupId || fallbackGid),
            };
          });
          setSchedules((prev) => {
            const others = prev.filter((s) => normalizeId(s.examId) !== normalizeId(examId));
            return [...normalized, ...others];
          });
        }
      } catch (err) {
        if (!isCurrent || abortCtrl.signal.aborted) return;
        setSchedules((previous) => previous.filter((entry) => normalizeId(entry.examId) !== normalizeId(examId)));
        showToast(getApiErrorMessage(err) || "Failed to load schedules. Select the examination again to retry.", "error");
      }
    };
    loadExamSchedules();
    return () => {
      isCurrent = false;
      abortCtrl.abort();
    };
  }, [examId, showToast, exams, currentExam, groups, eligibleSubjects, rooms, faculty, programs, students]);

  const handleSaveSchedules = async (newSchedules, isEditingId = null, throwOnError = false) => {
    if (!newSchedules || !newSchedules.length) {
      showToast("At least one exam schedule entry is required.", "warning");
      return false;
    }
    const targetExamId = currentExam?.id || examId;
    if (!targetExamId || mutationRef.current || !["DRAFT", "SCHEDULED"].includes(normalizeStatus(currentExam?.status))) return false;
    mutationRef.current = true;
    try {
      if (isEditingId) {
        if (!schedules.some((entry) => entry.id === normalizeId(isEditingId) && entry.examId === normalizeId(targetExamId))) throw new Error("Reload the persisted schedule before editing.");
        await updateScheduleInBackend(targetExamId, isEditingId, newSchedules[0], faculty);
      } else {
        await saveSchedulesToBackend(targetExamId, newSchedules, faculty);
      }
      const response = await apiClient.get("/api/v1/examinations/" + targetExamId + "/schedules");
      const examCtx = currentExam || exams.find((e) => normalizeId(e.id) === normalizeId(targetExamId));
      const fallbackGid = examCtx?.groupIds?.[0] || examCtx?.groupId || groups[0]?.id;
      const records = unwrap(response).map((entry) => ({
        ...normalizeScheduleRecord(entry, fallbackGid, examCtx, groups, eligibleSubjects, rooms, faculty, programs, students),
        examId: normalizeId(targetExamId),
        groupId: normalizeId(entry.groupId || fallbackGid),
      }));
      if (records.some((entry) => !entry.id) || (!isEditingId && !records.length)) throw new Error("The backend did not return persisted schedules. Reload before trying again.");
      setSchedules((previous) => [...previous.filter((entry) => entry.examId !== normalizeId(targetExamId)), ...records]);
      setEditing(null);
      setSch((previous) => ({ ...previous, subjectId: "", patternName: "", date: "", hallAssignments: [] }));
      setErrors({});
      showToast("Schedule saved successfully.", "success");
      return true;
    } catch (error) {
      const conflict = parseBookingConflict(error, rooms, faculty);
      if (conflict) {
        const conflictRecord = {
          id: `ext-conflict-${conflict.roomId || conflict.facultyId}-${conflict.date}-${conflict.startTime}`,
          examId: "external-booked-exam",
          groupId: "external",
          date: conflict.date,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          hallAssignments: conflict.roomId ? [
            {
              hallId: conflict.roomId,
              hallName: conflict.rawIdentifier,
              candidateCount: 999,
              invigilatorIds: conflict.facultyId ? [conflict.facultyId] : [],
            },
            ...(conflict.rawIdentifier && normalizeId(conflict.rawIdentifier) !== normalizeId(conflict.roomId)
              ? [{ hallId: conflict.rawIdentifier, candidateCount: 999, invigilatorIds: [] }]
              : []),
          ] : [
            {
              hallId: "0",
              candidateCount: 0,
              invigilatorIds: conflict.facultyId ? [conflict.facultyId] : [],
            },
          ],
        };
        setSchedules((prev) => {
          if (prev.some((s) => s.id === conflictRecord.id)) return prev;
          return [...prev, conflictRecord];
        });
      }
      if (throwOnError) {
        throw error;
      }
      showToast(getApiErrorMessage(error) || "Failed to save schedules. Reload before retrying.", "error");
      return false;
    } finally {
      mutationRef.current = false;
    }
  };

  const handleUpdateScheduleHalls = async (updatedSchedule) =>
    handleSaveSchedules([updatedSchedule], updatedSchedule.id);

  // Delete schedule from backend DB
  const handleDeleteSchedule = async () => {
    if (!removeSchedule || deleteScheduleLoading || mutationRef.current) return;
    const owner = exams.find((exam) => exam.id === normalizeId(removeSchedule.examId || examId));
    if (!owner || !["DRAFT", "SCHEDULED"].includes(owner.status)) return;
    const targetExamId = removeSchedule.examId || examId;
    try {
      mutationRef.current = true;
      setDeleteScheduleLoading(true);
      await deleteScheduleFromBackend(targetExamId, removeSchedule.id);
      setSchedules((prev) => prev.filter((item) => String(item.id) !== String(removeSchedule.id)));
      showToast("Schedule removed successfully.", "success");
    } catch (err) {
      const message = getApiErrorMessage(err) || "Failed to remove schedule.";
      showToast(message, "error");
    } finally {
      mutationRef.current = false;
      setDeleteScheduleLoading(false);
      setRemoveSchedule(null);
    }
  };

  // Render Exam Scope Form (Create / Edit)
  if (viewMode === "add" || viewMode === "edit") {
    return (
      <ExamForm
        exams={exams}
        schedules={schedules}
        editId={editingExamId}
        boards={boards}
        academicYears={academicYears}
        academicLevels={academicLevels}
        groups={groups}
        programs={programs}
        masterPatterns={masterPatterns}
        examTypes={examTypes}
        rooms={rooms}
        faculty={faculty}
        showToast={showToast}
        onCancel={() => {
          setViewMode("list");
          setEditingExamId(null);
        }}
        onSave={handleSaveExamRecord}
      />
    );
  }

  return (
    <DashboardLayout
      title={activeTab === "schedule" ? "Exam Schedule" : "Examination Management"}
      subtitle={
        activeTab === "schedule"
          ? "Configure subject-wise or pattern-wise examination dates, timings, halls and invigilators."
          : "Create and manage academic examinations for Intermediate students."
      }
      breadcrumb={activeTab === "schedule" ? ["Examinations", "Exam Schedule"] : ["Examinations"]}
    >
      <div className="exam-tabs-row">
        <div className="exam-tabs" role="tablist" aria-label="Examination modules">
          <button
            role="tab"
            aria-selected={activeTab === "exams"}
            className={activeTab === "exams" ? "active" : ""}
            onClick={() => {
              if (activeTab === "schedule") {
                handleBackFromSchedule();
              } else {
                setActiveTab("exams");
              }
            }}
          >
            Examinations
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "schedule"}
            className={activeTab === "schedule" ? "active" : ""}
            onClick={() => setActiveTab("schedule")}
          >
            Exam Schedule
          </button>
        </div>
        {activeTab === "exams" && (
          <button
            className="cms-btn cms-btn-primary exam-header-create-btn"
            onClick={() => {
              setEditingExamId(null);
              setViewMode("add");
            }}
          >
            <Plus size={16} /> Create Examination
          </button>
        )}
      </div>

      {activeTab === "exams" ? (
        <div className="cms-card exam-list-card">
          <div className="exam-table-toolbar">
            <div className="exam-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, name, board, group, level, category or pattern..."
              />
            </div>

            <div className="exam-toolbar-filters">
              <div className="exam-toolbar-select">
                <SearchableSingleSelect
                  value={filters.groupId}
                  onChange={(v) => changeFilter("groupId", v)}
                  options={[
                    { id: "", name: "All Groups" },
                    ...groups.filter((g) => g.isActive !== false && (!selectedBoardId || !g.boardId || normalizeId(g.boardId) === normalizeId(selectedBoardId))),
                  ]}
                  placeholder="Select Group"
                />
              </div>
              <div className="exam-toolbar-select">
                <SearchableSingleSelect
                  value={filters.programId}
                  disabled={!filters.groupId}
                  onChange={(v) => changeFilter("programId", v)}
                  options={[{ id: "", name: "All Programs" }, ...getProgramsForGroups(programs, [filters.groupId], groups)]}
                  placeholder="Select Program"
                />
              </div>
              <div className="exam-toolbar-select">
                <SearchableSingleSelect
                  value={filters.levelId}
                  onChange={(v) => changeFilter("levelId", v)}
                  options={[{ id: "", name: "All Academic Levels" }, ...academicLevels]}
                  placeholder="Select Level"
                />
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-ghost exam-export-btn"
                onClick={() => printSchedule()}
                title="Export Examination List"
              >
                <Printer size={15} /> Export
              </button>
            </div>
          </div>

          <div className="cms-table-wrap">
            <table className="cms-table exam-list-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Exam Name</th>
                  <th>Academic Level(s)</th>
                  <th>Group(s)</th>
                  <th>Program(s)</th>
                  <th>Exam Category</th>
                  <th>Exam Pattern(s)</th>
                  <th>Exam Period</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shownExams.length ? (
                  shownExams.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span className="exam-cell-two-lines" title={e.code}>
                          {e.code}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={e.name}>
                          {e.name}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines exam-cell-academic-level" title={getLevelNames(e, academicLevels)}>
                          {getLevelNames(e, academicLevels)}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={getGroupNames(e, groups)}>
                          {getGroupNames(e, groups)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="exam-cell-two-lines"
                          title={getProgramNames(e, programs)}
                        >
                          {getProgramNames(e, programs)}
                        </span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines">{e.examCategory || "Regular"}</span>
                      </td>
                      <td>
                        <span className="exam-cell-two-lines" title={e.examPattern || "Standard Pattern"}>
                          {e.examPattern || "Standard Pattern"}
                        </span>
                      </td>
                      <td>
                        {d(e.startDate)}
                        <small className="exam-muted"> to {d(e.endDate)}</small>
                      </td>
                      <td className="exam-status-cell">
                        <StatusBadge value={e.status} />
                      </td>
                      <td>
                        <div className="cms-actions">
                          <button
                            className="cms-action-btn view"
                            title="View Details"
                            onClick={() => handleOpenDetails(e)}
                          >
                            <Eye size={15} />
                          </button>
                          {["DRAFT", "SCHEDULED"].includes(e.status) && (
                            <button
                              className="cms-action-btn"
                              title="Schedule / Reschedule Examination"
                              onClick={() => {
                                setExamId(String(e.id));
                                setActiveTab("schedule");
                                setEditing(null);
                              }}
                            >
                              <CalendarDays size={15} />
                            </button>
                          )}
                          {["DRAFT", "SCHEDULED"].includes(e.status) && (
                            <button
                              className="cms-action-btn edit"
                              title="Edit Examination Scope"
                              onClick={() => {
                                setEditingExamId(String(e.id));
                                setViewMode("edit");
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {["SCHEDULED", "COMPLETED"].includes(e.status) && (
                            <button
                              className="cms-action-btn"
                              title="Export Schedule Excel"
                              onClick={() => printSchedule(e)}
                            >
                              <Printer size={15} />
                            </button>
                          )}
                          {["DRAFT", "SCHEDULED"].includes(e.status) && (
                            <button
                              className="cms-action-btn warning"
                              title="Cancel Examination"
                              onClick={() => setCancelExamTarget(e)}
                            >
                              <Ban size={15} />
                            </button>
                          )}
                          {["DRAFT", "CANCELLED"].includes(e.status) && (
                            <button
                              className="cms-action-btn danger"
                              title={e.status === "CANCELLED" ? "Delete Cancelled Exam" : "Delete Draft"}
                              onClick={() => setRemove(e)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10">
                      <div className="cms-empty">
                        {examsLoading || loading ? (
                          <span>Loading examinations...</span>
                        ) : examsError ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "12px 0" }}>
                            <span style={{ color: "var(--cms-danger, #ef4444)", fontWeight: 500 }}>{examsError}</span>
                            <button
                              type="button"
                              className="cms-btn cms-btn-primary"
                              onClick={() => loadExaminations(true)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                            >
                              <RefreshCw size={14} /> Retry Fetching Examinations
                            </button>
                          </div>
                        ) : (
                          "No examinations match the current filters."
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="exam-list-pagination">
            <span className="exam-record-summary">
              Showing {rangeStart}–{rangeEnd} of {list.length} records
            </span>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="exam-schedule-back-link"
            onClick={handleBackFromSchedule}
          >
            <ArrowLeft size={15} /> Back to Examinations
          </button>
          <ScheduleSection
            exam={currentExam}
            exams={exams}
            schedules={schedules}
            examId={examId}
            onUpdateSchedule={handleUpdateScheduleHalls}
            onBack={handleBackFromSchedule}
            onEditPeriod={(targetExam) => setEditingExam(targetExam)}
            setExamId={(v) => {
              setExamId(v);
              setEditing(null);
              setErrors({});
              setSch({
                groupId: "",
                subjectId: "",
                patternName: "",
                date: "",
                startTime: "09:00",
                endTime: "12:00",
                totalMarks: "100",
                passingMarks: "35",
                passPercentage: "35",
                hallAssignments: [],
                mode: "Written",
              });
            }}
            sch={sch}
            setSch={setSch}
            errors={errors}
            setErrors={setErrors}
            editing={editing}
            onEdit={(s) => {
              setExamId(String(s.examId));
              setSch({
                ...s,
                groupId: String(s.groupId || ""),
                subjectId: String(s.subjectId || ""),
                patternName: String(s.patternName || ""),
                totalMarks: String(s.totalMarks || "100"),
                passingMarks: String(s.passingMarks ?? "35"),
                passPercentage: String(s.passPercentage || "35"),
                hallAssignments: s.hallAssignments || [],
              });
              setEditing(s.id);
              setErrors({});
            }}
            onCancelEdit={() => setEditing(null)}
            onSave={handleSaveSchedules}
            onRemove={(target) => setRemoveSchedule(target)}
            finalize={handleFinalizeSchedule}
            boards={boards}
            academicYears={academicYears}
            academicLevels={academicLevels}
            groups={groups}
            programs={programs}
            students={students}
            onRefreshStudents={fetchStudentsList}
            rooms={rooms}
            faculty={faculty}
            eligibleSubjects={eligibleSubjects}
            masterPatterns={masterPatterns}
            showToast={showToast}
          />
        </>
      )}

      {detail && (
        <ExamDetails
          exam={detail.exam}
          schedules={detail.schedules}
          boards={boards}
          academicYears={academicYears}
          academicLevels={academicLevels}
          groups={groups}
          close={() => setDetail(null)}
        />
      )}

      {editingExam && (
        <EditExamModal
          exam={editingExam}
          schedules={schedules}
          onClose={() => setEditingExam(null)}
          onSave={async (period) => {
            try {
              await apiClient.put(`/api/v1/examinations/${editingExam.id}`, {
                examName: editingExam.name || editingExam.examName,
                examCategory: editingExam.examCategory || "Regular",
                customCategoryName: editingExam.customCategoryName,
                boardId: Number(editingExam.boardId) || editingExam.boardId,
                academicYearId: Number(editingExam.yearId || editingExam.academicYearId) || editingExam.yearId,
                academicLevelIds: (editingExam.levelIds || editingExam.academicLevelIds || []).map((id) => Number(id) || id),
                groupIds: (editingExam.groupIds || []).map((id) => Number(id) || id),
                programIds: (editingExam.programIds || []).map((id) => Number(id) || id),
                selectedSubjectIds: (editingExam.selectedSubjectIds || []).map((id) => Number(id) || id),
                groupProgramSelections: editingExam.groupProgramSelections,
                examPattern: editingExam.examPattern,
                examType: editingExam.examType,
                selectedGroupPatterns: editingExam.selectedGroupPatterns,
                startDate: period.startDate,
                endDate: period.endDate,
                description: editingExam.description,
                status: editingExam.status,
                scheduleMode: editingExam.scheduleMode,
              });
              await loadExaminations();
              setEditingExam(null);
              showToast("Examination period updated.", "success");
            } catch (err) {
              const errMsg = getApiErrorMessage(err) || "Failed to update examination period.";
              showToast(errMsg, "error");
            }
          }}
        />
      )}

      {remove && (
        <ConfirmDialog
          title={remove.status === "CANCELLED" ? "Delete cancelled examination" : "Delete draft examination"}
          message={`Delete ${remove.name}? All associated schedules will be removed.`}
          onCancel={() => !deleteLoading && setRemove(null)}
          onConfirm={handleDeleteExam}
          loading={deleteLoading}
          confirmLabel="Confirm"
          loadingLabel="Confirming..."
          danger={true}
        />
      )}

      {cancelExamTarget && (
        <ConfirmDialog
          title="Cancel Examination"
          message={`Are you sure you want to cancel "${cancelExamTarget.name}"? This examination will be marked as CANCELLED and will become read-only.`}
          onCancel={() => !cancelLoading && setCancelExamTarget(null)}
          onConfirm={handleCancelExam}
          loading={cancelLoading}
          confirmLabel="Confirm"
          loadingLabel="Confirming..."
        />
      )}

      {removeSchedule && (
        <ConfirmDialog
          title="Remove schedule"
          message={`Remove the schedule for ${removeSchedule.subjectName}?`}
          onCancel={() => !deleteScheduleLoading && setRemoveSchedule(null)}
          onConfirm={handleDeleteSchedule}
          loading={deleteScheduleLoading}
          confirmLabel="Confirm"
          loadingLabel="Confirming..."
          danger={true}
        />
      )}

      <Toast
        message={typeof toast === "string" ? toast : toast.message}
        type={typeof toast === "string" ? "success" : toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </DashboardLayout>
  );
}

// ---------- SEARCHABLE SINGLE SELECT ----------
function SearchableSingleSelect({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  error,
  placeholder = "Select Option",
  showSearch = true,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find((o) => String(o.id) === String(value));
  const filteredOptions = options.filter((o) =>
    String(o.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={`cms-field ${error ? "has-error" : ""}`} ref={ref}>
      {label && <label>{label}</label>}
      <div className="cms-searchable-select">
        <button
          type="button"
          disabled={disabled}
          className="cms-searchable-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() =>
            setOpen((prev) => {
              if (prev) setSearch("");
              return !prev;
            })
          }
        >
          <span className="cms-truncate">
            {selectedOpt ? selectedOpt.name : placeholder}
          </span>
          <ChevronDown size={15} style={{ color: "#64748b", flexShrink: 0 }} />
        </button>

        {open && (
          <div className="cms-searchable-select-dropdown" style={{ zIndex: 100000 }}>
            {showSearch && (
              <div className="cms-searchable-select-search">
                <Search3DIcon size={14} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            <div className="cms-searchable-select-options" role="listbox">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.id) === String(value);
                  return (
                    <div
                      key={opt.id}
                      className={`cms-searchable-select-option ${isSelected ? "selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      title={opt.name}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onChange(opt.id);
                          setOpen(false);
                          setSearch("");
                        }
                      }}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span>{opt.name}</span>
                      {isSelected && <Check size={14} style={{ color: "#6F8400" }} />}
                    </div>
                  );
                })
              ) : (
                <div className="cms-searchable-no-options">No matches for "{search}"</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}

// ---------- SEARCHABLE MULTI SELECT ----------
function SearchableMultiSelect({
  label,
  selectedIds = [],
  onChange,
  options = [],
  disabled = false,
  error,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOptions = options.filter((o) => selectedIds.map(String).includes(String(o.id)));

  const toggleOption = (id) => {
    const strId = String(id);
    if (selectedIds.map(String).includes(strId)) {
      onChange(selectedIds.filter((item) => String(item) !== strId));
    } else {
      onChange([...selectedIds, strId]);
    }
  };

  const filteredOptions = options.filter(
    (o) =>
      String(o.name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(o.designation || "").toLowerCase().includes(search.toLowerCase()) ||
      String(o.code || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={`cms-field ${error ? "has-error" : ""}`} ref={ref}>
      {label && <label>{label}</label>}
      <div className="cms-searchable-select">
        <button
          type="button"
          disabled={disabled}
          className="cms-searchable-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() =>
            setOpen((prev) => {
              if (prev) setSearch("");
              return !prev;
            })
          }
        >
          <span className="cms-truncate">
            {selectedOptions.length > 0
              ? selectedOptions.map((o) => o.name).join(", ")
              : placeholder || `Select ${label?.replace(" *", "") || "Option(s)"}`}
          </span>
          <ChevronDown size={15} style={{ color: "#64748b", flexShrink: 0 }} />
        </button>

        {open && (
          <div className="cms-searchable-select-dropdown" style={{ zIndex: 100000 }}>
            <div className="cms-searchable-select-search">
              <Search3DIcon size={14} />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="cms-searchable-select-options" role="listbox" aria-multiselectable="true">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isChecked = selectedIds.map(String).includes(String(opt.id));
                  return (
                    <div
                      key={opt.id}
                      className={`cms-searchable-select-option ${isChecked ? "selected" : ""}`}
                      role="option"
                      aria-selected={isChecked}
                      title={opt.name}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") toggleOption(opt.id);
                      }}
                      onClick={() => toggleOption(opt.id)}
                    >
                      <div>
                        <span>{opt.name}</span>
                        {opt.designation && (
                          <small style={{ color: "#64748b", display: "block", fontSize: "11px" }}>
                            {opt.designation}
                          </small>
                        )}
                        {opt.capacity && (
                          <small style={{ color: "#64748b", display: "block", fontSize: "11px" }}>
                            Cap: {opt.capacity} ({opt.type || "Room"})
                          </small>
                        )}
                      </div>
                      {isChecked && <Check size={14} style={{ color: "#6F8400" }} />}
                    </div>
                  );
                })
              ) : (
                <div className="cms-searchable-no-options">No matches for "{search}"</div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}

// ---------- FORM COMPONENT WITH LIVE ACADEMIC CASCADING HIERARCHY ----------
function ExamForm({
  exams,
  schedules,
  editId,
  boards = [],
  academicYears = [],
  academicLevels = [],
  groups = [],
  programs = [],
  masterPatterns = [],
  examTypes = [],
  rooms = [],
  faculty = [],
  showToast,
  onSave,
  onCancel,
}) {
  const academicCtx = useAcademicContext();
  const {
    selectedBoard = null,
    selectedBoardId = null,
    selectedAcademicYear = null,
    selectedAcademicYearId = null,
  } = academicCtx;

  const existing = exams.find((e) => String(e.id) === String(editId));

  const initialGroupProgramSelections = useMemo(() => {
    if (!existing) return {};
    if (existing.groupProgramSelections && typeof existing.groupProgramSelections === "object" && !Array.isArray(existing.groupProgramSelections)) {
      return existing.groupProgramSelections;
    }
    if (Array.isArray(existing.groupProgramSelections)) {
      const map = {};
      existing.groupProgramSelections.forEach((item) => {
        if (item && item.groupId) {
          map[String(item.groupId)] = (item.programIds || []).map(String);
        }
      });
      return map;
    }
    if (existing.groupIds && existing.programIds) {
      const map = {};
      existing.groupIds.forEach((gid) => {
        map[String(gid)] = existing.programIds.map(String);
      });
      return map;
    }
    return {};
  }, [existing]);

  const defaultBoardId = useMemo(() => {
    if (selectedBoardId && boards.some((board) => normalizeId(board.id) === normalizeId(selectedBoardId))) return normalizeId(selectedBoardId);
    if (selectedBoard?.id && boards.some((board) => normalizeId(board.id) === normalizeId(selectedBoard.id))) return normalizeId(selectedBoard.id);
    const foundBoard = boards.find(
      (b) =>
        (selectedBoard?.code && String(b.code || "").trim().toLowerCase() === String(selectedBoard.code).trim().toLowerCase()) ||
        (selectedBoard?.name && String(b.name || "").trim().toLowerCase() === String(selectedBoard.name).trim().toLowerCase())
    );
    if (foundBoard) return normalizeId(foundBoard.id);
    return "";
  }, [boards, selectedBoardId, selectedBoard]);

  const defaultYearId = useMemo(() => {
    if (selectedAcademicYearId && academicYears.some((year) => normalizeId(year.id) === normalizeId(selectedAcademicYearId))) return normalizeId(selectedAcademicYearId);
    if (selectedAcademicYear?.id && academicYears.some((year) => normalizeId(year.id) === normalizeId(selectedAcademicYear.id))) return normalizeId(selectedAcademicYear.id);
    const foundYear = academicYears.find(
      (y) =>
        (selectedAcademicYear?.code && String(y.code || "").trim().toLowerCase() === String(selectedAcademicYear.code).trim().toLowerCase()) ||
        (selectedAcademicYear?.name && String(y.name || "").trim().toLowerCase() === String(selectedAcademicYear.name).trim().toLowerCase())
    );
    if (foundYear) return normalizeId(foundYear.id);
    return "";
  }, [academicYears, selectedAcademicYearId, selectedAcademicYear]);

  const [formYears, setFormYears] = useState(academicYears);
  const [formLevels, setFormLevels] = useState(academicLevels);
  const [formGroups, setFormGroups] = useState(groups);
  const [formPrograms, setFormPrograms] = useState(programs);
  const [formEligibleSubjects, setFormEligibleSubjects] = useState([]);

  const initialCategory = useMemo(() => {
    if (!existing) return "";
    const cat = existing.examCategory || "";
    if (["regular", "objective"].includes(cat.toLowerCase())) {
      return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    }
    return "Others";
  }, [existing]);

  const initialCustomCategory = useMemo(() => {
    if (!existing) return "";
    const cat = existing.examCategory || "";
    if (["regular", "objective"].includes(cat.toLowerCase())) {
      return existing.customCategoryName || "";
    }
    return existing.customCategoryName || cat;
  }, [existing]);

  const [examCodePreview, setExamCodePreview] = useState("");

  useEffect(() => {
    if (existing) return;
    let active = true;
    apiClient
      .get("/api/v1/settings/number-series/EXAM_CODE")
      .then((res) => {
        if (!active) return;
        const preview = res?.data?.data?.livePreview ?? res?.data?.livePreview;
        if (preview) setExamCodePreview(preview);
      })
      .catch(() => {
        // Silently handle error, fallback placeholder will be used
      });
    return () => {
      active = false;
    };
  }, [existing]);

  const [form, setForm] = useState(() =>
    existing
      ? {
        ...existing,
        examCategory: initialCategory,
        customCategoryName: initialCustomCategory,
        levelIds: existing.levelIds || (existing.levelId ? [existing.levelId] : []),
        groupIds: existing.groupIds || (existing.groupId ? [existing.groupId] : []),
        programIds: existing.programIds || (existing.programId ? [existing.programId] : []),
        selectedSubjectIds: existing.selectedSubjectIds || [],
        groupProgramSelections: initialGroupProgramSelections,
        selectedGroupPatterns: existing.selectedGroupPatterns || {},
        examPattern: existing.examPattern || "",
        examType: existing.examType || "",
      }
      : {
        code: "",
        name: "",
        examCategory: "", // MANUAL SELECTION ONLY: starts empty so user must explicitly choose
        customCategoryName: "",
        boardId: defaultBoardId,
        yearId: defaultYearId,
        levelId: "",
        levelIds: [],
        groupId: "",
        groupIds: [],
        programId: "",
        programIds: [],
        selectedSubjectIds: [],
        groupProgramSelections: {},
        selectedGroupPatterns: {},
        examPattern: "",
        examType: "",
        startDate: "",
        endDate: "",
        description: "",
        status: "DRAFT",
      },
  );

  useEffect(() => {
    if (existing) return;
    setForm((previous) => previous.boardId === defaultBoardId ? previous : {
      ...previous, boardId: defaultBoardId, yearId: "", levelIds: [], groupIds: [], programIds: [],
      selectedSubjectIds: [], groupProgramSelections: {}, selectedGroupPatterns: {}, examPattern: "",
    });
  }, [defaultBoardId, existing]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];

  // Resolve hierarchy against backend records for the selected board.
  useEffect(() => {
    let active = true;
    setFormYears([]);
    setFormLevels([]);
    setFormGroups([]);
    setFormPrograms([]);
    if (!form.boardId) return;
    const load = async () => {
      try {
        const [yearsResponse, levelsResponse, groupsResponse] = await Promise.all([
          apiClient.get("/api/v1/academic-years", { params: { boardId: form.boardId } }),
          apiClient.get("/api/v1/academic-levels", { params: { boardId: form.boardId } }),
          apiClient.get("/api/v1/groups/board/" + form.boardId),
        ]);
        if (!active) return;
        const belongsToBoard = (item) => item.isActive !== false && (!item.boardId || normalizeId(item.boardId) === normalizeId(form.boardId));
        setFormYears(unwrap(yearsResponse).filter(belongsToBoard).map((year) => ({ ...year, id: normalizeId(year.academicYearId ?? year.id), name: year.academicYearName ?? year.name })));
        setFormLevels(unwrap(levelsResponse).filter(belongsToBoard).map((level) => ({ ...level, id: normalizeId(level.academicLevelId ?? level.id), name: level.academicLevelName ?? level.levelName ?? level.name })));
        setFormGroups(unwrap(groupsResponse).filter(belongsToBoard).map((group) => ({ ...group, id: normalizeId(group.groupId ?? group.id), boardId: normalizeId(form.boardId), name: group.groupName ?? group.name, code: group.groupCode ?? group.code })));
      } catch (error) {
        if (active) showToast?.(getApiErrorMessage(error) || "Failed to load the selected Board's academic hierarchy.", "error");
      }
    };
    load();
    return () => { active = false; };
  }, [form.boardId, showToast]);

  useEffect(() => {
    if (existing) return;
    const selectedId = normalizeId(selectedAcademicYearId ?? selectedAcademicYear?.id);
    const year = formYears.find((item) => item.id === selectedId ||
      (selectedAcademicYear?.name && item.name === selectedAcademicYear.name) ||
      (selectedAcademicYear?.code && item.name === selectedAcademicYear.code));
    setForm((previous) => previous.yearId === (year?.id || "") ? previous : { ...previous, yearId: year?.id || "" });
  }, [formYears, selectedAcademicYearId, selectedAcademicYear, existing]);

  const availableGroups = useMemo(() => formGroups.filter((group) =>
    form.boardId && group.isActive !== false && normalizeId(group.boardId) === normalizeId(form.boardId)
  ), [formGroups, form.boardId]);

  // Group Tabs active tab state in Creation Form
  const [activeGroupTab, setActiveGroupTab] = useState(() => availableGroups[0]?.id || "");

  useEffect(() => {
    if (availableGroups.length > 0) {
      if (!activeGroupTab || !availableGroups.some((g) => normalizeId(g.id) === normalizeId(activeGroupTab))) {
        setActiveGroupTab(availableGroups[0].id);
      }
    }
  }, [availableGroups, activeGroupTab]);

  const activeGroupObj = availableGroups.find((g) => normalizeId(g.id) === normalizeId(activeGroupTab)) || availableGroups[0];

  // Group-scoped program selection helpers:
  const getSelectedProgramsForGroup = useCallback(
    (groupId) => {
      const gIdStr = String(groupId);
      const sel = form.groupProgramSelections || {};
      if (Array.isArray(sel)) {
        const found = sel.find((entry) => String(entry.groupId) === gIdStr);
        return found ? (found.programIds || []).map(String) : [];
      }
      return (sel[gIdStr] || []).map(String);
    },
    [form.groupProgramSelections],
  );

  const isProgramSelectedInGroup = useCallback(
    (groupId, programId) => {
      const progs = getSelectedProgramsForGroup(groupId);
      return progs.includes(String(programId));
    },
    [getSelectedProgramsForGroup],
  );

  const getGroupProgramCount = useCallback(
    (groupId) => {
      return getSelectedProgramsForGroup(groupId).length;
    },
    [getSelectedProgramsForGroup],
  );

  const toggleProgramInGroup = (groupId, programId) => {
    const gIdStr = String(groupId);
    const pIdStr = String(programId);
    setForm((prev) => {
      const currentMap = { ...(prev.groupProgramSelections && !Array.isArray(prev.groupProgramSelections) ? prev.groupProgramSelections : {}) };
      if (Array.isArray(prev.groupProgramSelections)) {
        prev.groupProgramSelections.forEach((entry) => {
          if (entry && entry.groupId) currentMap[String(entry.groupId)] = (entry.programIds || []).map(String);
        });
      }
      const existingInGroup = currentMap[gIdStr] || [];
      const updatedInGroup = existingInGroup.includes(pIdStr)
        ? existingInGroup.filter((id) => id !== pIdStr)
        : [...existingInGroup, pIdStr];

      if (updatedInGroup.length > 0) {
        currentMap[gIdStr] = updatedInGroup;
      } else {
        delete currentMap[gIdStr];
      }

      const activeGroupIds = Object.keys(currentMap);
      const allSelectedProgramIds = [...new Set(Object.values(currentMap).flat())];

      return {
        ...prev,
        groupProgramSelections: currentMap,
        selectedSubjectIds: [], selectedGroupPatterns: {}, examPattern: "",
        groupIds: activeGroupIds,
        programIds: allSelectedProgramIds,
        groupId: activeGroupIds[0] || "",
        programId: allSelectedProgramIds[0] || "",
      };
    });
    setErrors((prev) => ({ ...prev, groupIds: undefined, programIds: undefined }));
  };

  const selectAllProgramsForGroup = (groupId) => {
    const gIdStr = String(groupId);
    const targetGroup = availableGroups.find((g) => String(g.id) === gIdStr) || { id: groupId };
    const groupProgs = getProgramsForGroup(targetGroup);
    const allProgIds = groupProgs.map((p) => String(p.id));

    setForm((prev) => {
      const currentMap = { ...(prev.groupProgramSelections && !Array.isArray(prev.groupProgramSelections) ? prev.groupProgramSelections : {}) };
      if (Array.isArray(prev.groupProgramSelections)) {
        prev.groupProgramSelections.forEach((entry) => {
          if (entry && entry.groupId) currentMap[String(entry.groupId)] = (entry.programIds || []).map(String);
        });
      }
      const existingInGroup = currentMap[gIdStr] || [];
      const allSelected = allProgIds.length > 0 && allProgIds.every((pid) => existingInGroup.includes(pid));

      if (allSelected) {
        delete currentMap[gIdStr];
      } else {
        currentMap[gIdStr] = allProgIds;
      }

      const activeGroupIds = Object.keys(currentMap);
      const allSelectedProgramIds = [...new Set(Object.values(currentMap).flat())];

      return {
        ...prev,
        groupProgramSelections: currentMap,
        selectedSubjectIds: [], selectedGroupPatterns: {}, examPattern: "",
        groupIds: activeGroupIds,
        programIds: allSelectedProgramIds,
        groupId: activeGroupIds[0] || "",
        programId: allSelectedProgramIds[0] || "",
      };
    });
    setErrors((prev) => ({ ...prev, groupIds: undefined, programIds: undefined }));
  };

  // Load only programs belonging to the active group.
  useEffect(() => {
    if (!activeGroupTab || !form.boardId) return;
    let active = true;
    setFormPrograms((previous) => previous.filter((program) => normalizeId(program.groupId) !== normalizeId(activeGroupTab)));
    apiClient.get("/api/v1/groups/" + activeGroupTab + "/programs").then((response) => {
      if (!active) return;
      const programs = unwrap(response).filter((program) => program.isActive !== false && (!program.groupId || normalizeId(program.groupId) === normalizeId(activeGroupTab)))
        .map((program) => ({ ...program, id: normalizeId(program.programId ?? program.id), groupId: normalizeId(activeGroupTab), name: program.programName ?? program.name, code: program.programCode ?? program.code }));
      setFormPrograms((previous) => [...previous.filter((program) => normalizeId(program.groupId) !== normalizeId(activeGroupTab)), ...programs]);
    }).catch((error) => {
      if (active) showToast?.(getApiErrorMessage(error) || "Failed to load programs for the selected Group.", "error");
    });
    return () => { active = false; };
  }, [activeGroupTab, form.boardId, showToast]);

  const getProgramsForGroup = useCallback((group) => formPrograms.filter((program) =>
    program.isActive !== false && normalizeId(program.groupId) === normalizeId(group?.id)
  ), [formPrograms]);

  // 4. Context Subject Fetching
  const levelIdsKey = useMemo(
    () => (form.levelIds || []).map(normalizeId).sort().join(","),
    [form.levelIds],
  );

  const groupsToFetch = useMemo(() => {
    const activeInMap = Object.keys(form.groupProgramSelections || {}).filter(
      (gid) => (form.groupProgramSelections[gid] || []).length > 0,
    );
    if (activeInMap.length > 0) return activeInMap.map(normalizeId);
    if (form.groupIds && form.groupIds.length > 0) return form.groupIds.map(normalizeId);
    if (activeGroupTab) return [normalizeId(activeGroupTab)];
    return availableGroups.map((g) => normalizeId(g.id));
  }, [form.groupProgramSelections, form.groupIds, activeGroupTab, availableGroups]);

  const groupsToFetchKey = useMemo(() => [...groupsToFetch].sort().join(","), [groupsToFetch]);

  useEffect(() => {
    setFormEligibleSubjects([]);
    if (!form.boardId || !groupsToFetch.length || !levelIdsKey) return;
    let active = true;

    const fetchSubjects = async () => {
      try {
        const promises = [];
        groupsToFetch.forEach((gid) => {
          (form.levelIds || []).forEach((lid) => {
            promises.push(
              apiClient
                .get("/api/v1/Subjects/context", {
                  params: {
                    boardId: form.boardId,
                    groupId: gid,
                    academicLevelId: lid,
                  },
                })
                .catch(() =>
                  apiClient
                    .get("/api/v1/Subjects", {
                      params: {
                        boardId: form.boardId,
                        groupId: gid,
                        academicLevelId: lid,
                      },
                    })
                    .catch(() => apiClient.get(`/api/v1/Subjects/group/${gid}`))
                )
            );
          });
        });

        const results = await Promise.all(promises);
        const rawSubjects = results.flatMap((res) => unwrap(res));
        if (active) {
          const mapped = rawSubjects.map((s) => ({
            id: normalizeId(s.subjectId ?? s.id),
            name: s.subjectName ?? s.name,
            code: s.subjectCode ?? s.code ?? "",
            academicLevelIds: (s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [])).map(normalizeId),
            groupIds: (s.groupIds || (s.groupId ? [s.groupId] : (s.group ? [s.group.groupId || s.group.id] : []))).map(normalizeId),
            programIds: (s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId),
            facultyIds: (s.facultyIds || (s.facultyId ? [s.facultyId] : [])).map(normalizeId),
            isActive: s.isActive !== false,
          }));
          setFormEligibleSubjects(mapped);
        }
      } catch (err) {
        if (active) showToast?.(getApiErrorMessage(err) || "Failed to load subjects.", "error");
      }
    };
    fetchSubjects();
    return () => { active = false; };
  }, [form.boardId, form.levelIds, groupsToFetch, groupsToFetchKey, levelIdsKey, showToast]);

  // Eligible subjects considering Academic Level, Group, Program, and Category
  const eligibleSubjects = useMemo(
    () => getEligibleSubjects(form, formEligibleSubjects),
    [form, formEligibleSubjects],
  );

  useEffect(() => {
    setForm((previous) => {
      const selected = (previous.selectedSubjectIds || []).filter((id) => eligibleSubjects.some((subject) => subject.id === normalizeId(id)));
      return selected.length === (previous.selectedSubjectIds || []).length ? previous : { ...previous, selectedSubjectIds: selected };
    });
  }, [eligibleSubjects]);

  // Group subjects by Academic Level & Group for Tabbed Subject View
  const subjectTabGroups = useMemo(() => {
    if (!eligibleSubjects.length) return [];
    const map = new Map();
    const effectiveGroupIds = form.groupIds.length > 0
      ? form.groupIds.map(normalizeId)
      : (activeGroupTab ? [normalizeId(activeGroupTab)] : availableGroups.map((g) => normalizeId(g.id)));
    const effectiveLevelIds = form.levelIds.length > 0
      ? form.levelIds.map(normalizeId)
      : (formLevels[0]?.id ? [normalizeId(formLevels[0].id)] : []);

    eligibleSubjects.forEach((sub) => {
      const subLevelIds = (sub.academicLevelIds || []).map(normalizeId);
      const subGroupIds = (sub.groupIds || []).map(normalizeId);

      const targetLevels = subLevelIds.length > 0
        ? subLevelIds.filter((lid) => effectiveLevelIds.includes(lid))
        : effectiveLevelIds;
      const targetGroups = subGroupIds.length > 0
        ? subGroupIds.filter((gid) => effectiveGroupIds.includes(gid))
        : effectiveGroupIds;

      targetLevels.forEach((lid) => {
        targetGroups.forEach((gid) => {
          const key = `${lid}_${gid}`;
          if (!map.has(key)) {
            const levelName = nameOf(formLevels, lid).replace(/Intermediate\s*/i, "");
            const groupCode = codeOf(formGroups, gid) || nameOf(formGroups, gid);
            map.set(key, {
              key,
              label: `${levelName || "Year"} - ${groupCode || "Group"}`,
              subjects: [],
            });
          }
          if (!map.get(key).subjects.some((s) => String(s.id) === String(sub.id))) {
            map.get(key).subjects.push(sub);
          }
        });
      });
    });

    if (map.size === 0 && eligibleSubjects.length > 0) {
      return [
        {
          key: "all_eligible",
          label: "Eligible Subjects",
          subjects: eligibleSubjects,
        },
      ];
    }
    return Array.from(map.values());
  }, [eligibleSubjects, form.levelIds, form.groupIds, formLevels, formGroups, activeGroupTab, availableGroups]);

  const [activeSubjectTabKey, setActiveSubjectTabKey] = useState("");

  useEffect(() => {
    if (subjectTabGroups.length > 0) {
      if (!activeSubjectTabKey || !subjectTabGroups.some((g) => g.key === activeSubjectTabKey)) {
        setActiveSubjectTabKey(subjectTabGroups[0].key);
      }
    } else {
      setActiveSubjectTabKey("");
    }
  }, [subjectTabGroups, activeSubjectTabKey]);

  const currentSubjectTabGroup = subjectTabGroups.find((g) => g.key === activeSubjectTabKey) || subjectTabGroups[0];

  const combinedExamTypeOptions = useMemo(() => {
    const names = new Set();
    const list = [];
    (examTypes || []).forEach((et) => {
      const name = typeof et === "string" ? et : et?.name || et?.examTypeName || et?.type || "";
      if (name && !names.has(name.toLowerCase())) {
        names.add(name.toLowerCase());
        list.push({ id: name, name });
      }
    });
    list.push({ id: "Others", name: "Others" });
    return list;
  }, [examTypes]);

  const [selectedExamTypeOption, setSelectedExamTypeOption] = useState(() => {
    if (!form.examType) return "";
    const isStandard = combinedExamTypeOptions.some(
      (o) => o.id !== "Others" && o.name.toLowerCase() === form.examType.toLowerCase(),
    );
    return isStandard ? form.examType : "Others";
  });
  const [customExamType, setCustomExamType] = useState(() => {
    if (!form.examType) return "";
    const isStandard = combinedExamTypeOptions.some(
      (o) => o.id !== "Others" && o.name.toLowerCase() === form.examType.toLowerCase(),
    );
    return isStandard ? "" : form.examType;
  });

  const availablePatternOptions = useMemo(() => resolveGroupPatterns(activeGroupObj, form.examCategory, masterPatterns), [activeGroupObj, form.examCategory, masterPatterns]);

  const [selectedPatternOption, setSelectedPatternOption] = useState(() => {
    if (!form.examPattern) return "";
    const isStandard = availablePatternOptions.some(
      (o) => o.id !== "Others" && o.name.toLowerCase() === form.examPattern.toLowerCase(),
    );
    return isStandard ? form.examPattern : "Others";
  });
  const [customPattern, setCustomPattern] = useState(() => {
    if (!form.examPattern) return "";
    const isStandard = availablePatternOptions.some(
      (o) => o.id !== "Others" && o.name.toLowerCase() === form.examPattern.toLowerCase(),
    );
    return isStandard ? "" : form.examPattern;
  });

  // Automatically realign pattern if category changes and pattern is incompatible
  useEffect(() => {
    if (availablePatternOptions.length > 0 && selectedPatternOption !== "Others") {
      const isValid = availablePatternOptions.some(
        (o) => o.id !== "Others" && o.id.toLowerCase() === (form.examPattern || "").toLowerCase(),
      );
      if (!isValid && form.examPattern) {
        const first = "";
        setSelectedPatternOption(first);
        setForm((prev) => ({ ...prev, examPattern: first }));
      }
    }
  }, [availablePatternOptions, form.examPattern, selectedPatternOption]);

  const change = (n, v) => {
    setForm((x) => {
      const next = {
        ...x,
        [n]: v,
        ...(n === "boardId"
          ? { yearId: "", levelIds: [], groupIds: [], programIds: [], selectedSubjectIds: [], selectedGroupPatterns: {} }
          : {}),
        ...(n === "groupIds"
          ? {
            programIds: x.programIds.filter((id) =>
              getProgramsForGroups(formPrograms, v, availableGroups).some((p) => normalizeId(p.id) === normalizeId(id)),
            ),
          }
          : {}),
      };

      // Combined examinations (non-Regular) are conducted combinely on a single date, so startDate === endDate
      if (isCombinedExamination(next)) {
        if (n === "startDate") {
          next.endDate = v;
        } else if (n === "endDate") {
          next.endDate = next.startDate || v;
        } else if (n === "examCategory" || n === "customCategoryName") {
          next.endDate = next.startDate;
        }
      }

      if (n === "examCategory" && v !== "Others") {
        next.customCategoryName = "";
      }

      return next;
    });

    setErrors((x) => ({ ...x, [n]: undefined }));
  };

  // Point 6: Single Pattern Selection Rule per Group (single-select behavior while preserving array shape)
  const toggleGroupPattern = (groupId, patternName) => {
    setForm((prev) => {
      const gid = normalizeId(groupId);
      const currentPatterns = prev.selectedGroupPatterns?.[gid] || [];
      const updated = currentPatterns.length === 1 && currentPatterns[0] === patternName ? [] : [patternName];
      const nextGroupPatterns = { ...prev.selectedGroupPatterns, [gid]: updated };

      const firstPattern = Object.values(nextGroupPatterns).flat().filter(Boolean)[0] || prev.examPattern;
      return {
        ...prev,
        selectedGroupPatterns: nextGroupPatterns,
        examPattern: firstPattern,
      };
    });
    setErrors((x) => ({ ...x, examPattern: undefined }));
  };

  const toggleSubjectSelect = (subjectId) => {
    const strId = String(subjectId);
    setForm((prev) => {
      const current = prev.selectedSubjectIds || [];
      const updated = current.includes(strId) ? current.filter((id) => id !== strId) : [...current, strId];
      return { ...prev, selectedSubjectIds: updated };
    });
    setErrors((x) => ({ ...x, selectedSubjectIds: undefined }));
  };

  const selectAllSubjects = () => {
    setForm((prev) => ({
      ...prev,
      selectedSubjectIds: eligibleSubjects.map((s) => String(s.id)),
    }));
    setErrors((x) => ({ ...x, selectedSubjectIds: undefined }));
  };

  const deselectAllSubjects = () => {
    setForm((prev) => ({
      ...prev,
      selectedSubjectIds: [],
    }));
  };

  const save = async (e, proceedToSchedule = false) => {
    e.preventDefault();
    if (saving) return;
    const x = {};
    if (!form.name.trim()) x.name = "Exam Name is required.";
    if (!form.boardId) x.boardId = "Select a valid backend Board in the navbar.";
    if (!form.yearId) x.yearId = "Select a valid backend Academic Year in the navbar.";
    if (!["Regular", "Objective", "Others"].includes(form.examCategory)) {
      x.examCategory = "Select Regular, Objective, or Others.";
    }
    if (form.examCategory === "Others" && !form.customCategoryName?.trim()) {
      x.customCategoryName = "Please specify the custom category name.";
    }

    if (!form.levelIds || !form.levelIds.length) x.levelIds = "Select at least one Academic Level.";

    // Determine active groupIds strictly based on which groups have selected programs
    const activeGroupIds = Object.keys(form.groupProgramSelections || {}).filter(
      (gid) => (form.groupProgramSelections[gid] || []).length > 0,
    );

    if (!activeGroupIds || activeGroupIds.length === 0) {
      x.groupIds = "Select at least one Program in at least one Group to conduct the examination.";
    }

    const resolvedPattern = (selectedPatternOption === "Others" ? customPattern : form.examPattern).trim();
    if (!resolvedPattern) {
      x.examPattern = "Exam Pattern is required.";
    } else if (selectedPatternOption === "Others") {
      const isDup = availablePatternOptions.some(
        (o) => o.id !== "Others" && o.name.toLowerCase() === resolvedPattern.toLowerCase(),
      );
      if (isDup) {
        x.examPattern = "Custom pattern matches an existing standard pattern. Please select it from the dropdown.";
      }
    }

    const resolvedType = (selectedExamTypeOption === "Others" ? customExamType : form.examType).trim();
    if (!resolvedType) {
      x.examType = "Exam Type is required.";
    } else if (selectedExamTypeOption === "Others") {
      const isDup = combinedExamTypeOptions.some(
        (o) => o.id !== "Others" && o.name.toLowerCase() === resolvedType.toLowerCase(),
      );
      if (isDup) {
        x.examType = "Custom exam type matches an existing standard type. Please select it from the dropdown.";
      }
    }

    if (!form.selectedSubjectIds || form.selectedSubjectIds.length === 0) {
      x.selectedSubjectIds = "Select at least one subject for the examination.";
    }

    const resolvedCategory =
      form.examCategory === "Others" ? form.customCategoryName.trim() : form.examCategory.trim();

    const isCombined = isCombinedExamination({ examCategory: resolvedCategory });

    if (!form.startDate) x.startDate = "Start Date is required.";

    if (isCombined) {
      // Combined examinations derive the end date from the start date.
    } else {
      if (!form.endDate) x.endDate = "End Date is required.";
      if (form.startDate && form.endDate && form.startDate > form.endDate) {
        x.endDate = "End date must be on or after start date.";
      }
    }

    if (form.startDate && form.startDate < todayStr && !existing) {
      x.startDate = "Start Date cannot be in the past.";
    }

    if (Object.keys(x).length) return setErrors(x);

    let generatedExamCode = "";
    if (!existing) {
      if (activeGroupIds.length > 1) {
        showToast?.(
          "Multiple groups selected. Number Series generation currently requires a single group code or a backend multi-group rule.",
          "error",
        );
        return;
      }

      const singleGroupId = activeGroupIds[0];
      const targetGroup =
        formGroups.find((g) => normalizeId(g.id) === normalizeId(singleGroupId)) ||
        groups.find((g) => normalizeId(g.id) === normalizeId(singleGroupId));
      const groupCode = targetGroup?.code || targetGroup?.groupCode || "";

      const selectedYearObj =
        formYears.find((y) => normalizeId(y.id) === normalizeId(form.yearId)) ||
        academicYears.find((y) => normalizeId(y.id) === normalizeId(form.yearId));
      const academicYearDisplay =
        selectedYearObj?.name || selectedYearObj?.academicYearName || selectedYearObj?.code || "";

      setSaving(true);
      try {
        const genRes = await apiClient.post("/api/v1/settings/number-series/EXAM_CODE/generate-next", {
          group: groupCode,
          type: resolvedType,
          academicYear: academicYearDisplay,
        });

        const generatedNumber = genRes?.data?.data?.generatedNumber ?? genRes?.data?.generatedNumber;

        const hasUnresolvedToken =
          !generatedNumber || typeof generatedNumber !== "string" || /{[^}]+}/.test(generatedNumber);

        if (hasUnresolvedToken) {
          showToast?.(
            `Number Series returned an unresolved examination code: "${generatedNumber || ""}". Backend must map request parameters (such as group) in the Number Series generator. Creation halted.`,
            "error",
          );
          setSaving(false);
          return;
        }

        generatedExamCode = generatedNumber;
      } catch (genErr) {
        showToast?.(getApiErrorMessage(genErr) || "Failed to generate Examination Code from Number Series.", "error");
        setSaving(false);
        return;
      }
    }

    const groupProgArray = activeGroupIds.map((groupId) => ({
      groupId,
      programIds: (form.groupProgramSelections[groupId] || []).map(normalizeId),
    }));

    const flatProgramIds = [...new Set(groupProgArray.flatMap((g) => g.programIds))];

    const payload = {
      ...form,
      id: existing?.id,
      examCode: generatedExamCode || form.code || undefined,
      code: generatedExamCode || form.code || "",
      endDate: isCombined ? form.startDate : form.endDate,
      levelId: form.levelIds[0] || "",
      groupId: activeGroupIds[0] || "",
      programId: flatProgramIds[0] || "",
      name: form.name.trim(),
      examCategory: resolvedCategory,
      rawCategory: form.examCategory,
      customCategoryName: form.examCategory === "Others" ? resolvedCategory : "",
      examPattern: resolvedPattern || "Standard Pattern",
      examType: resolvedType || "Regular Exam",
      levelIds: [...new Set(form.levelIds.map(normalizeId))],
      groupIds: [...new Set(activeGroupIds.map(normalizeId))],
      programIds: flatProgramIds,
      selectedSubjectIds: [...new Set(form.selectedSubjectIds.map(normalizeId))],
      selectedGroupPatterns: form.selectedGroupPatterns,
      groupProgramSelections: groupProgArray,
      scheduleMode: isCombined ? "PATTERN_WISE" : "SUBJECT_WISE",
    };

    setSaving(true);
    await onSave(payload, proceedToSchedule);
    setSaving(false);
  };

  return (
    <DashboardLayout title={existing ? "Edit Examination Scope" : "Create Examination"} breadcrumb={["Examinations"]}>
      <button type="button" className="exam-back-text-link" onClick={onCancel}>
        <ArrowLeft size={15} /> Back to Examinations
      </button>

      <form className="cms-form-page examination-form-page" onSubmit={save}>
        <div className="cms-card">
          <div className="cms-card-body">
            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <div>
                  <h2>Academic Scope & Category Configuration</h2>
                  <p>Board and Academic Year are auto-fetched from active records. Configure remaining academic scope.</p>
                </div>
              </div>

              <div className="cms-form-grid cols-3" style={{ marginBottom: "20px" }}>
                <div>
                  <SearchableSingleSelect
                    label="Board *"
                    value={form.boardId}
                    disabled={true}
                    onChange={(v) => change("boardId", v)}
                    options={boards}
                    error={errors.boardId}
                    placeholder="Select Board"
                    showSearch={false}
                  />
                  <small style={{ color: "var(--cms-muted, #64748b)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    Locked to Navbar selection (read-only)
                  </small>
                </div>

                <div>
                  <SearchableSingleSelect
                    label="Academic Year *"
                    value={form.yearId}
                    disabled={true}
                    onChange={(v) => change("yearId", v)}
                    options={formYears}
                    error={errors.yearId}
                    placeholder="Select Academic Year"
                    showSearch={false}
                  />
                  <small style={{ color: "var(--cms-muted, #64748b)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    Locked to Navbar selection (read-only)
                  </small>
                </div>

                <div>
                  <SearchableSingleSelect
                    label="Exam Category *"
                    value={form.examCategory}
                    onChange={(v) => change("examCategory", v)}
                    options={[
                      { id: "Regular", name: "Regular" },
                      { id: "Objective", name: "Objective" },
                      { id: "Others", name: "Others" },
                    ]}
                    error={errors.examCategory}
                    placeholder="Select Category (Regular, Objective, Others)"
                  />
                  {form.examCategory === "Others" && (
                    <div className="exam-custom-input-wrap" style={{ marginTop: "8px" }}>
                      <Field
                        label="Custom Category Name *"
                        placeholder="e.g. Weekly Test, Unit Test, Slip Test..."
                        value={form.customCategoryName}
                        onChange={(v) => change("customCategoryName", v)}
                        error={errors.customCategoryName}
                      />
                    </div>
                  )}
                </div>
              </div>

              {form.boardId ? (
                <>
                  <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                    <label className="exam-scope-label">Academic Level(s) *</label>
                    <div className="exam-pills-row">
                      {formLevels.map((level) => {
                        const selected = form.levelIds.map(String).includes(String(level.id));
                        return (
                          <button
                            key={level.id}
                            type="button"
                            className={`exam-pill-btn ${selected ? "active" : ""}`}
                            onClick={() => {
                              const strId = String(level.id);
                              const nextLevels = selected
                                ? form.levelIds.filter((id) => String(id) !== strId)
                                : [...form.levelIds, strId];
                              change("levelIds", nextLevels);
                            }}
                          >
                            {selected ? <CheckSquare size={15} /> : <Square size={15} />}
                            <span>{level.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.levelIds && <span className="cms-error">{errors.levelIds}</span>}
                  </div>

                  {/* Group Tabs & Program Selection */}
                  <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                    <div className="exam-scope-header">
                      <label className="exam-scope-label">Groups & Conducted Programs *</label>
                      <span className="exam-scope-hint">
                        Select a Group tab (filtered by {codeOf(boards, form.boardId)}) to configure programs and pattern.
                      </span>
                    </div>

                    <div className="exam-group-tabs-bar">
                      {availableGroups.map((group) => {
                        const selectedCount = getGroupProgramCount(group.id);
                        const isActiveTab = String(group.id) === String(activeGroupTab);
                        const isGroupActive = selectedCount > 0;

                        return (
                          <button
                            key={group.id}
                            type="button"
                            className={`exam-group-tab-btn ${isActiveTab ? "current" : ""} ${isGroupActive ? "has-selections" : ""}`}
                            onClick={() => setActiveGroupTab(group.id)}
                          >
                            <span className="exam-group-code">{group.code}</span>
                            <span className="exam-group-name">{group.name.split(" ")[0]}</span>
                            {selectedCount > 0 && <span className="exam-group-badge">{selectedCount}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {activeGroupObj && (
                      <div className="exam-group-panel">
                        <div className="exam-group-panel-header">
                          <div>
                            <strong>
                              {activeGroupObj.name} ({activeGroupObj.code}) Program Selection
                            </strong>
                            <p>Select the program track to conduct this examination for.</p>
                          </div>
                          <div className="exam-group-panel-actions">
                            <button
                              type="button"
                              className="cms-btn cms-btn-ghost exam-mini-btn"
                              onClick={() => selectAllProgramsForGroup(activeGroupObj.id)}
                            >
                              {getProgramsForGroup(activeGroupObj).length > 0 &&
                                getProgramsForGroup(activeGroupObj).every((p) =>
                                  isProgramSelectedInGroup(activeGroupObj.id, p.id),
                                )
                                ? `Deselect All ${activeGroupObj.code}`
                                : `Select All ${activeGroupObj.code}`}
                            </button>
                          </div>
                        </div>

                        <div className="exam-program-pills-grid">
                          {getProgramsForGroup(activeGroupObj).map((program) => {
                            const isSelected = isProgramSelectedInGroup(activeGroupObj.id, program.id);
                            return (
                              <button
                                key={program.id}
                                type="button"
                                className={`exam-program-pill ${isSelected ? "selected" : ""}`}
                                onClick={() => toggleProgramInGroup(activeGroupObj.id, program.id)}
                              >
                                <div className="exam-program-pill-check">
                                  {isSelected ? <Check size={14} /> : <div className="exam-program-pill-empty" />}
                                </div>
                                <div className="exam-program-pill-info">
                                  <strong>{program.name}</strong>
                                  <small>Code: {program.code}</small>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Standardized Competitive Pattern Selection for this Group */}
                        {form.examCategory === "Objective" && (
                          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed var(--cms-border)" }}>
                            <label className="exam-scope-label" style={{ fontSize: "12px", marginBottom: "8px", display: "block" }}>
                              Competitive Pattern for {activeGroupObj.code || activeGroupObj.name} *
                            </label>
                            <div className="exam-pills-row">
                              {resolveGroupPatterns(activeGroupObj, "Objective", masterPatterns)
                                .filter((p) => p.id !== "Others")
                                .map((opt) => {
                                  const currentGrpPatterns = form.selectedGroupPatterns?.[normalizeId(activeGroupObj.id)] || [];
                                  const isSelected = currentGrpPatterns.includes(opt.name) || (currentGrpPatterns.length === 0 && form.examPattern === opt.name);
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      className={`exam-pill-btn ${isSelected ? "active" : ""}`}
                                      onClick={() => {
                                        toggleGroupPattern(activeGroupObj.id, opt.name);
                                        setSelectedPatternOption(opt.name);
                                      }}
                                    >
                                      {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                      <span>{opt.name}</span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Exam Pattern and Exam Type Selects */}
                        <div
                          className="cms-form-grid cols-2"
                          style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed var(--cms-border)" }}
                        >
                          <div>
                            <SearchableSingleSelect
                              label="Exam Pattern *"
                              value={selectedPatternOption}
                              onChange={(val) => {
                                setSelectedPatternOption(val);
                                if (val === "Others") {
                                  change("examPattern", customPattern || "");
                                } else {
                                  change("examPattern", val);
                                }
                              }}
                              options={availablePatternOptions}
                              error={errors.examPattern}
                              placeholder="Select Exam Pattern"
                              showSearch={true}
                            />
                            {selectedPatternOption === "Others" && (
                              <div className="exam-custom-input-wrap">
                                <Field
                                  label="Custom Exam Pattern Name *"
                                  placeholder="Enter custom pattern name..."
                                  value={customPattern}
                                  onChange={(val) => {
                                    setCustomPattern(val);
                                    change("examPattern", val);
                                  }}
                                  error={errors.examPattern}
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <SearchableSingleSelect
                              label="Exam Type *"
                              value={selectedExamTypeOption}
                              onChange={(val) => {
                                setSelectedExamTypeOption(val);
                                if (val === "Others") {
                                  change("examType", customExamType || "");
                                } else {
                                  change("examType", val);
                                }
                              }}
                              options={combinedExamTypeOptions}
                              error={errors.examType}
                              placeholder="Select Exam Type"
                              showSearch={true}
                            />
                            {selectedExamTypeOption === "Others" && (
                              <div className="exam-custom-input-wrap">
                                <Field
                                  label="Custom Exam Type Name *"
                                  placeholder="Enter custom exam type..."
                                  value={customExamType}
                                  onChange={(val) => {
                                    setCustomExamType(val);
                                    change("examType", val);
                                  }}
                                  error={errors.examType}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {errors.groupIds && <span className="cms-error">{errors.groupIds}</span>}
                    {errors.programIds && <span className="cms-error">{errors.programIds}</span>}
                  </div>
                </>
              ) : (
                <div
                  className="cms-empty"
                  style={{ padding: "20px", borderRadius: "10px", border: "1px dashed var(--cms-border)", marginBottom: "20px" }}
                >
                  Select Board and Academic Year above to load Academic Levels, Groups, Programs, and Subjects.
                </div>
              )}

              <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                <div
                  className="exam-scope-header"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <label className="exam-scope-label">
                      <BookOpen
                        size={16}
                        style={{ verticalAlign: "middle", marginRight: "6px", color: "var(--cms-primary)" }}
                      />
                      Eligible Subjects ({(form.selectedSubjectIds || []).length} of {eligibleSubjects.length} Selected) *
                    </label>
                    <span className="exam-scope-hint">
                      {form.examCategory === "Others"
                        ? "All subjects are displayed. Select manually which exams you want to conduct."
                        : String(form.examCategory || "").toLowerCase().includes("practical")
                          ? "Filtered subjects with practical laboratory facilities."
                          : String(form.examCategory || "").toLowerCase().includes("objective")
                            ? "Filtered core subjects (MPC, BiPC, MEC, CEC core) without languages."
                            : "Toggle subjects to conduct for this specific examination."}
                    </span>
                  </div>
                  {eligibleSubjects.length > 0 && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" className="cms-btn cms-btn-ghost exam-mini-btn" onClick={selectAllSubjects}>
                        Select All Subjects
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost exam-mini-btn"
                        onClick={deselectAllSubjects}
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                </div>

                {subjectTabGroups.length > 0 ? (
                  <div className="exam-subject-tabs-container">
                    <div className="exam-subject-tabs-header">
                      {subjectTabGroups.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          className={`exam-subject-tab-btn ${activeSubjectTabKey === group.key ? "active" : ""}`}
                          onClick={() => setActiveSubjectTabKey(group.key)}
                        >
                          <span>{group.label}</span>
                          <span className="exam-subject-tab-count">
                            {
                              group.subjects.filter((s) =>
                                (form.selectedSubjectIds || []).map(String).includes(String(s.id)),
                              ).length
                            }
                            /{group.subjects.length}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="exam-subject-tab-body">
                      {currentSubjectTabGroup?.subjects.map((subject) => {
                        const isSubjectSelected = (form.selectedSubjectIds || []).map(String).includes(String(subject.id));
                        return (
                          <div
                            key={subject.id}
                            className={`exam-subject-chip ${isSubjectSelected ? "selected" : "deselected"}`}
                            onClick={() => toggleSubjectSelect(subject.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="exam-subject-chip-header">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                  type="checkbox"
                                  checked={isSubjectSelected}
                                  onChange={() => { }}
                                  style={{
                                    cursor: "pointer",
                                    width: "16px",
                                    height: "16px",
                                    accentColor: "var(--cms-primary)",
                                  }}
                                />
                                <strong>{subject.name}</strong>
                              </div>
                              <span className="exam-subject-chip-code">{subject.code}</span>
                            </div>
                            <div className="exam-subject-chip-details">
                              <small className="exam-muted">
                                Faculty:{" "}
                                {(subject.facultyIds || []).map((fid) => nameOf(faculty, fid)).join(", ") || "Unassigned"}
                              </small>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    className="cms-empty"
                    style={{ padding: "16px", borderRadius: "10px", border: "1px dashed var(--cms-border)" }}
                  >
                    Select Academic Levels, Groups, and Programs above to preview eligible subjects.
                  </div>
                )}
                {errors.selectedSubjectIds && <span className="cms-error">{errors.selectedSubjectIds}</span>}
              </div>
            </section>

            <section className="cms-form-section">
              <div className="cms-form-section-heading">
                <div>
                  <h2>Examination Schedule Period & Details</h2>
                  <p>Specify the examination name and schedule period.</p>
                </div>
              </div>

              <div className="cms-form-grid cols-3">
                <Field
                  label="Examination Code"
                  value={existing ? (form.code || existing?.examCode || "") : ""}
                  placeholder={!existing ? (examCodePreview || "Code will be generated on save") : ""}
                  readOnly={true}
                />
                <Field
                  label="Exam Name *"
                  placeholder="e.g. Mid Term Examinations 2026"
                  value={form.name}
                  onChange={(v) => change("name", v)}
                  error={errors.name}
                />
                <Field
                  label="Start Date *"
                  type="date"
                  min={todayStr}
                  value={form.startDate}
                  onChange={(v) => change("startDate", v)}
                  error={errors.startDate}
                />
                {isCombinedExamination({ examCategory: form.examCategory, customCategoryName: form.customCategoryName }) ? (
                  <div className={`cms-field ${errors.endDate ? "has-error" : ""}`}>
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={form.startDate || ""}
                      readOnly
                      style={{ background: "var(--cms-subtle)", cursor: "not-allowed", opacity: 0.85 }}
                      title="Combined examinations are conducted on a single combined examination date."
                    />
                    <span style={{ fontSize: "11px", color: "var(--cms-muted)", marginTop: "4px", display: "block" }}>
                      Combined exam is conducted on a single date (matches start date)
                    </span>
                    {errors.endDate && <span className="cms-error">{errors.endDate}</span>}
                  </div>
                ) : (
                  <Field
                    label="End Date *"
                    type="date"
                    min={form.startDate || todayStr}
                    value={form.endDate}
                    onChange={(v) => change("endDate", v)}
                    error={errors.endDate}
                  />
                )}
                <Field
                  label="Description"
                  type="textarea"
                  placeholder="Optional exam notes or student instructions..."
                  value={form.description}
                  onChange={(v) => change("description", v)}
                />
              </div>
            </section>

            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel}>
                Cancel
              </button>
              {!existing ? (
                <>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ fontWeight: 600 }}
                    disabled={saving}
                    onClick={(e) => save(e, false)}
                  >
                    Save as Draft & View List
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    disabled={saving}
                    onClick={(e) => save(e, true)}
                  >
                    {saving ? "Saving..." : "Save & Proceed to Schedule"}
                  </button>
                </>
              ) : (
                <button className="cms-btn cms-btn-primary" disabled={saving}>
                  {saving ? "Updating..." : "Update Examination"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

// ---------- SCHEDULE SECTION COMPONENT ----------
function ScheduleSection({
  exam,
  exams,
  schedules,
  examId,
  setExamId,
  sch,
  setSch,
  errors,
  setErrors,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onRemove,
  finalize,
  onUpdateSchedule,
  onEditPeriod,
  boards = [],
  academicYears = [],
  academicLevels = [],
  groups = [],
  programs = [],
  students = [],
  rooms = [],
  faculty = [],
  eligibleSubjects = [],
  masterPatterns = [],
  showToast,
  onRefreshStudents = null,
}) {
  const entries = useMemo(() => {
    if (!exam) return [];
    return schedules
      .filter((s) => String(s.examId) === String(exam.id))
      .map((s) => {
        const rawAssignments = ensureArray(s.hallAssignments);
        const hasZeroCandidates = rawAssignments.some((a) => a.hallId && Number(a.candidateCount) <= 0);
        if (hasZeroCandidates || (rawAssignments.length === 0 && (s.roomId || s.hallId))) {
          const targetGid = normalizeId(s.groupId || exam.groupIds?.[0] || exam.groupId);
          const req = getRequiredCandidateStrength(exam, targetGid, programs, false, students);
          let rem = req;
          const baseAssignments = rawAssignments.length > 0 ? rawAssignments : [{ hallId: s.roomId || s.hallId }];
          const healedAssignments = baseAssignments.map((a) => {
            const rObj = ensureArray(rooms).find((r) => normalizeId(r.id) === normalizeId(a.hallId));
            const rCap = Number(rObj?.capacity) || 0;
            let cCount = Number(a.candidateCount) || 0;
            if (cCount <= 0) {
              cCount = rem > 0 ? (rCap > 0 ? Math.min(rem, rCap) : rem) : (rCap > 0 ? rCap : 1);
              rem -= cCount;
            }
            return {
              ...a,
              candidateCount: cCount,
            };
          });
          return {
            ...s,
            hallAssignments: healedAssignments,
          };
        }
        return s;
      });
  }, [exam, schedules, programs, students, rooms]);
  const isCombined = isCombinedExamination(exam);
  const isRegular = isRegularExamination(exam);
  const isObjective = String(getResolvedExamCategory(exam)).toLowerCase() === "objective";

  const [processing, setProcessing] = useState(false);
  const [readinessErrors, setReadinessErrors] = useState([]);
  const [editingHallsSchedule, setEditingHallsSchedule] = useState(null);

  // Draft schedules can be created; scheduled examinations can be rescheduled.
  const schedulableExams = useMemo(
    () => exams.filter((ex) => ["DRAFT", "SCHEDULED"].includes(normalizeStatus(ex.status))),
    [exams],
  );

  useEffect(() => {
    if (examId && (!exam || !["DRAFT", "SCHEDULED"].includes(normalizeStatus(exam.status)))) {
      setExamId("");
    }
  }, [examId, exam, setExamId]);

  // Exam Group Scope Tabs in Schedule View
  const examGroupIds = useMemo(() => (exam?.groupIds || [exam?.groupId]).filter(Boolean).map(normalizeId), [exam]);
  const examGroups = useMemo(
    () => groups.filter((g) => examGroupIds.includes(normalizeId(g.id))),
    [groups, examGroupIds],
  );

  const [selectedGroupId, setSelectedGroupId] = useState(() => examGroups[0]?.id || "");

  useEffect(() => {
    if (examGroups.length > 0 && !examGroups.some((g) => normalizeId(g.id) === normalizeId(selectedGroupId))) {
      setSelectedGroupId(examGroups[0].id);
    }
  }, [examGroups, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && sch.groupId !== selectedGroupId) {
      setSch((prev) => ({ ...prev, groupId: selectedGroupId, subjectId: "", patternName: "", hallAssignments: [] }));
    }
  }, [selectedGroupId, sch.groupId, setSch]);

  // Dynamically load eligible subjects for the current scheduling context
  const [sectionSubjects, setSectionSubjects] = useState(eligibleSubjects);

  useEffect(() => {
    setSectionSubjects([]);
    if (!exam?.boardId || !selectedGroupId || !exam?.levelIds?.length) return;
    let active = true;
    const fetchSectionSubjects = async () => {
      try {
        const promises = exam.levelIds.map((lid) =>
          apiClient
            .get("/api/v1/Subjects/context", {
              params: {
                boardId: exam.boardId,
                groupId: selectedGroupId,
                academicLevelId: lid,
              },
            })

        );
        const results = await Promise.all(promises);
        const raw = results.flatMap((r) => unwrap(r));
        if (active) {
          setSectionSubjects(
            raw.map((s) => ({
              id: normalizeId(s.subjectId ?? s.id),
              name: s.subjectName ?? s.name,
              code: s.subjectCode ?? s.code ?? "",
              academicLevelIds: (s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [])).map(normalizeId),
              groupIds: (s.groupIds || (s.groupId ? [s.groupId] : (selectedGroupId ? [selectedGroupId] : []))).map(normalizeId),
              programIds: (s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId),
              facultyIds: (s.facultyIds || (s.facultyId ? [s.facultyId] : [])).map(normalizeId),
              isActive: s.isActive !== false,
            })),
          );
        }
      } catch (err) {
        if (active) showToast?.(getApiErrorMessage(err) || "Failed to load scheduling subjects.", "error");
      }
    };
    fetchSectionSubjects();
    return () => { active = false; };
  }, [exam?.boardId, selectedGroupId, exam?.levelIds, showToast]);

  // Available patterns for the active group tab in Objective Mode
  const activeGroupPatterns = useMemo(() => {
    if (!exam) return [];
    return (exam.selectedGroupPatterns && exam.selectedGroupPatterns[selectedGroupId]) || [exam.examPattern];
  }, [exam, selectedGroupId]);

  // Active Group Subjects for Regular examinations
  const activeGroupSubjects = useMemo(
    () => (exam ? getSelectedSubjectsForExam(exam, selectedGroupId, sectionSubjects) : []),
    [exam, selectedGroupId, sectionSubjects],
  );

  const effectiveGroupSubjects = useMemo(
    () => (sectionSubjects && sectionSubjects.length > 0 ? sectionSubjects : eligibleSubjects),
    [sectionSubjects, eligibleSubjects],
  );

  // Filter entries strictly for the active individual group tab!
  const groupEntries = useMemo(
    () => entries.filter((s) => normalizeId(s.groupId) === normalizeId(selectedGroupId) || matchesScheduleGroup(s, selectedGroupId, exam, effectiveGroupSubjects)),
    [entries, selectedGroupId, exam, effectiveGroupSubjects],
  );

  const availableSubjectsToSchedule = useMemo(() => {
    return activeGroupSubjects.filter(
      (sub) => !groupEntries.some((s) => normalizeId(s.subjectId) === normalizeId(sub.id) && String(s.id) !== String(editing)),
    );
  }, [activeGroupSubjects, groupEntries, editing]);

  const existingCombinedSession = useMemo(() => {
    if (!exam || !isCombined) return null;
    return schedules.find(
      (s) =>
        normalizeId(s.examId) === normalizeId(exam.id) &&
        (s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName)) &&
        s.startTime && s.endTime,
    );
  }, [exam, isCombined, schedules]);

  const defaultSessionStartTime = existingCombinedSession ? existingCombinedSession.startTime : "09:00";
  const defaultSessionEndTime = existingCombinedSession ? existingCombinedSession.endTime : "12:00";

  // When scheduling a combined exam, ensure date defaults to exam.startDate and time to session timings
  useEffect(() => {
    if (isCombined && exam?.startDate && !editing) {
      setSch((prev) => ({
        ...prev,
        date: prev.date || exam.startDate,
        startTime: prev.startTime || defaultSessionStartTime,
        endTime: prev.endTime || defaultSessionEndTime,
      }));
    }
  }, [isCombined, exam?.startDate, defaultSessionStartTime, defaultSessionEndTime, editing, setSch]);

  const eligibleInvigilators = getEligibleInvigilators(schedules, sch, editing, faculty, sectionSubjects);
  const eligibleRooms = getEligibleRooms(schedules, sch, editing, exam, rooms);

  // Auto-allocate halls and invigilators in top form when date and times are set
  useEffect(() => {
    if (
      exam &&
      selectedGroupId &&
      sch.date &&
      sch.startTime &&
      sch.endTime &&
      !editing &&
      (!sch.hallAssignments || sch.hallAssignments.length === 0)
    ) {
      const autoAssigned = autoAssignHallsAndInvigilators(
        exam,
        selectedGroupId,
        sch.date,
        sch.startTime,
        sch.endTime,
        schedules,
        null,
        rooms,
        faculty,
        programs,
        {
          subjectId: sch.subjectId,
          includedSubjectIds: isCombined ? activeGroupSubjects.map((s) => s.id) : (sch.includedSubjectIds || []),
          subjectsList: sectionSubjects,
        },
        students,
      );
      if (autoAssigned && autoAssigned.length > 0) {
        setSch((prev) => ({ ...prev, hallAssignments: autoAssigned }));
      }
    }
  }, [exam, selectedGroupId, sch.date, sch.startTime, sch.endTime, sch.subjectId, isCombined, activeGroupSubjects, sectionSubjects, editing, rooms, faculty, programs, students, sch.hallAssignments, sch.includedSubjectIds, schedules, setSch]);

  const handleManualAutoAssignTopForm = () => {
    if (!exam) return;
    const targetDate = sch.date || exam.startDate;
    const targetStart = sch.startTime || defaultSessionStartTime || "09:00";
    const targetEnd = sch.endTime || defaultSessionEndTime || "12:00";

    if (!targetDate) {
      showToast?.("Please specify an examination date before auto-assigning halls.", "warning");
      return;
    }

    const autoAssigned = autoAssignHallsAndInvigilators(
      exam,
      selectedGroupId,
      targetDate,
      targetStart,
      targetEnd,
      schedules,
      editing,
      rooms,
      faculty,
      programs,
      {
        subjectId: sch.subjectId,
        includedSubjectIds: isCombined ? activeGroupSubjects.map((s) => s.id) : (sch.includedSubjectIds || []),
        subjectsList: sectionSubjects,
      },
      students,
    );
    if (!autoAssigned || autoAssigned.length === 0) {
      showToast?.("Cannot auto-allocate: insufficient hall capacity or available invigilators without conflicts.", "warning");
      return;
    }
    setSch((prev) => ({
      ...prev,
      date: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
      hallAssignments: autoAssigned,
    }));
    const totalCount = autoAssigned.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0);
    showToast?.(`Auto-assigned ${autoAssigned.length} hall(s) for ${totalCount} candidates with invigilators.`, "success");
  };

  // Auto-Generate Schedule Functionality (Group & Pattern-Wise)
  const autoGenerateSchedule = async () => {
    if (!exam || processing) return;
    if (entries.some((entry) => normalizeId(entry.groupId) === normalizeId(selectedGroupId) || matchesScheduleGroup(entry, selectedGroupId, exam, effectiveGroupSubjects))) {
      showToast?.("This Group already has saved schedules. Edit or remove those entries before automatic scheduling.", "error");
      return;
    }
    const currentGroupCode = codeOf(groups, selectedGroupId, "GROUP");

    // Exclude prior schedules for this exam and group so auto-assigner doesn't treat rooms as occupied by the same group's old schedules
    const otherGroupSchedules = schedules.filter(
      (s) => !(normalizeId(s.examId) === normalizeId(exam.id) && (normalizeId(s.groupId) === normalizeId(selectedGroupId) || matchesScheduleGroup(s, selectedGroupId, exam, effectiveGroupSubjects))),
    );

    setProcessing(true);
    try {
      const MAX_RETRIES = 10;
      let attempt = 0;
      const detectedConflicts = [];

      while (attempt < MAX_RETRIES) {
        attempt++;
        const generated = [];
        const batchSchedules = [...otherGroupSchedules, ...detectedConflicts];

        if (isCombined) {
          let allocationFailed = false;
          for (let idx = 0; idx < activeGroupPatterns.length; idx++) {
            const pName = activeGroupPatterns[idx];
            const autoAssigned = autoAssignHallsAndInvigilators(
              exam,
              selectedGroupId,
              exam.startDate,
              defaultSessionStartTime,
              defaultSessionEndTime,
              batchSchedules,
              null,
              rooms,
              faculty,
              programs,
              {
                includedSubjectIds: activeGroupSubjects.map((s) => s.id),
                subjectsList: sectionSubjects,
              },
              students,
            );
            if (!autoAssigned) {
              showToast?.(`Auto Schedule failed for Pattern "${pName}": Insufficient hall capacity or eligible invigilators without conflicts.`, "error");
              allocationFailed = true;
              break;
            }
            const hallNames = autoAssigned.map((a) => nameOf(rooms, a.hallId)).join(", ") || "Exam Hall(s)";
            const invigilatorNames =
              autoAssigned
                .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
                .join(" | ") || "Faculty Invigilators";

            const newEntry = {
              id: `draft-${selectedGroupId}-${idx}`,
              examId: exam.id,
              groupId: selectedGroupId,
              patternName: pName,
              includedSubjectIds: activeGroupSubjects.map((s) => String(s.id)),
              subjectName: `${currentGroupCode}: ${pName}`,
              subjectCode: `${isObjective ? "OBJ" : "COMB"}_${currentGroupCode}_${normalizeCodePart(pName)}`,
              date: exam.startDate,
              startTime: defaultSessionStartTime,
              endTime: defaultSessionEndTime,
              totalMarks: "300",
              passPercentage: "40",
              candidateCount: autoAssigned.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0),
              hallAssignments: autoAssigned,
              roomName: hallNames,
              invigilatorName: invigilatorNames,
              mode: isObjective ? "Objective" : (exam.examCategory || "Combined"),
              scheduleMode: "PATTERN_WISE",
            };
            generated.push(newEntry);
            batchSchedules.push(newEntry);
          }
          if (allocationFailed) return;
        } else {
          const dates = generateSequentialExamDates(exam.startDate, activeGroupSubjects.length);
          if (dates.length > 0 && exam.endDate && dates[dates.length - 1] > exam.endDate) {
            showToast?.(
              `Cannot auto-schedule ${activeGroupSubjects.length} subjects: Dates extend to ${d(dates[dates.length - 1])}, which exceeds the examination end date (${d(exam.endDate)}). Please click "Edit Period" to extend the exam end date.`,
              "warning",
            );
            return;
          }
          let allocationFailed = false;
          for (let idx = 0; idx < activeGroupSubjects.length; idx++) {
            const subject = activeGroupSubjects[idx];
            const sameSubOtherGroup = batchSchedules.find(
              (s) =>
                normalizeId(s.examId) === normalizeId(exam.id) &&
                normalizeId(s.subjectId) === normalizeId(subject.id) &&
                normalizeId(s.groupId) !== normalizeId(selectedGroupId) &&
                s.date && s.startTime && s.endTime,
            );
            const examDate = sameSubOtherGroup?.date || dates[idx] || exam.startDate;
            const examStartTime = sameSubOtherGroup?.startTime || "09:00";
            const examEndTime = sameSubOtherGroup?.endTime || "12:00";
            const autoAssigned = autoAssignHallsAndInvigilators(
              exam,
              selectedGroupId,
              examDate,
              examStartTime,
              examEndTime,
              batchSchedules,
              null,
              rooms,
              faculty,
              programs,
              {
                subjectId: subject.id,
                subjectsList: sectionSubjects,
              },
              students,
            );
            if (!autoAssigned) {
              showToast?.(`Auto Schedule failed for ${subject.name}: Insufficient hall capacity or eligible invigilators without conflicts.`, "error");
              allocationFailed = true;
              break;
            }
            const hallNames =
              autoAssigned.map((a) => nameOf(rooms, a.hallId)).join(", ") || "Exam Hall(s)";
            const invigilatorNames =
              autoAssigned
                .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
                .join(" | ") || "Faculty Invigilators";

            const newEntry = {
              id: `draft-${selectedGroupId}-${idx}`,
              examId: exam.id,
              groupId: selectedGroupId,
              subjectId: String(subject.id),
              subjectName: `[${currentGroupCode}] ${subject.name}`,
              subjectCode: subject.code,
              date: examDate,
              startTime: examStartTime,
              endTime: examEndTime,
              totalMarks: "100",
              passingMarks: "35",
              hallAssignments: autoAssigned,
              roomName: hallNames,
              invigilatorName: invigilatorNames,
              candidateCount: autoAssigned.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0),
              mode: "Written",
              scheduleMode: "SUBJECT_WISE",
            };
            generated.push(newEntry);
            batchSchedules.push(newEntry);
          }
          if (allocationFailed) return;
        }

        if (!generated.length) {
          showToast?.("No subjects or patterns found to auto-schedule.", "warning");
          return;
        }

        // Point 11: Auto generation must be atomic per group. Validate the complete generated batch before saving!
        const batchErrors = [];
        for (const entry of generated) {
          const errs = validateScheduleEntry(
            exam,
            entry,
            batchSchedules,
            entry.id,
            rooms,
            faculty,
            false,
            sectionSubjects,
            groups,
          );
          if (errs.length > 0) {
            batchErrors.push(`${entry.subjectName || "Schedule"}: ${errs[0]}`);
          }
        }
        if (batchErrors.length > 0) {
          showToast?.(`Auto Schedule generation aborted: ${batchErrors[0]}`, "error");
          return;
        }

        try {
          const saved = await onSave(generated, null, true);
          if (saved) {
            if (detectedConflicts.length > 0) {
              setSchedules((prev) => [...prev, ...detectedConflicts]);
            }
            break;
          } else {
            break;
          }
        } catch (saveErr) {
          const conflict = parseBookingConflict(saveErr, rooms, faculty);
          if (conflict && attempt < MAX_RETRIES) {
            const conflictEntry = {
              id: `ext-conflict-${conflict.roomId || conflict.facultyId}-${conflict.date}-${conflict.startTime}`,
              examId: "external-booked-exam",
              groupId: "external",
              date: conflict.date,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
              hallAssignments: conflict.roomId ? [
                {
                  hallId: conflict.roomId,
                  hallName: conflict.rawIdentifier,
                  candidateCount: 999,
                  invigilatorIds: conflict.facultyId ? [conflict.facultyId] : [],
                },
                ...(conflict.rawIdentifier && normalizeId(conflict.rawIdentifier) !== normalizeId(conflict.roomId)
                  ? [{ hallId: conflict.rawIdentifier, candidateCount: 999, invigilatorIds: [] }]
                  : []),
              ] : [
                {
                  hallId: "0",
                  candidateCount: 0,
                  invigilatorIds: conflict.facultyId ? [conflict.facultyId] : [],
                },
              ],
            };
            detectedConflicts.push(conflictEntry);
            setSchedules((prev) => {
              if (prev.some((s) => s.id === conflictEntry.id)) return prev;
              return [...prev, conflictEntry];
            });
            continue;
          } else {
            const errorMsg = getApiErrorMessage(saveErr) || "Failed to save auto-generated schedules.";
            showToast?.(errorMsg, "error");
            break;
          }
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    if (processing || !exam) return;
    const x = {};
    if (isCombined && !sch.patternName) x.patternName = "Select Examination Pattern.";
    if (!isCombined && !sch.subjectId) x.subjectId = "Required";
    if (!sch.date) x.date = "Required";
    if (!sch.startTime) x.startTime = "Required";
    if (!sch.endTime) x.endTime = "Required";

    let finalAssignments = sch.hallAssignments || [];
    if (!finalAssignments.length && sch.date && sch.startTime && sch.endTime) {
      finalAssignments = autoAssignHallsAndInvigilators(
        exam,
        selectedGroupId,
        sch.date,
        sch.startTime,
        sch.endTime,
        schedules,
        editing,
        rooms,
        faculty,
        programs,
        {
          subjectId: sch.subjectId,
          includedSubjectIds: isCombined ? activeGroupSubjects.map((s) => s.id) : (sch.includedSubjectIds || []),
          subjectsList: sectionSubjects,
        },
        students,
      ) || [];
    }

    const currentGroupCode = codeOf(groups, selectedGroupId, "GROUP");
    const includedSubjectIds = isCombined ? activeGroupSubjects.map((s) => normalizeId(s.id)) : [];
    const entry = {
      ...sch,
      hallAssignments: finalAssignments,
      groupId: selectedGroupId,
      includedSubjectIds,
      scheduleMode: isCombined ? "PATTERN_WISE" : "SUBJECT_WISE",
    };

    const validationMessages = validateScheduleEntry(
      exam,
      entry,
      schedules,
      editing,
      rooms,
      faculty,
      false,
      sectionSubjects,
      groups,
    );
    if (validationMessages.length) x.form = validationMessages.join(" ");

    if (Object.keys(x).length) return setErrors(x);

    const hallNames = finalAssignments.map((a) => nameOf(rooms, a.hallId)).join(", ") || "Unassigned Hall";
    const invigilatorNames =
      finalAssignments
        .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
        .join(" | ") || "Unassigned Faculty";

    setProcessing(true);
    try {
      if (isCombined) {
        const combinedSchedules = [
          {
            id: editing || "draft-entry",
            examId: exam.id,
            groupId: selectedGroupId,
            patternName: sch.patternName,
            includedSubjectIds,
            subjectName: `${currentGroupCode}: ${sch.patternName}`,
            subjectCode: `${isObjective ? "OBJ" : "COMB"}_${currentGroupCode}_${normalizeCodePart(sch.patternName)}`,
            date: sch.date,
            startTime: sch.startTime,
            endTime: sch.endTime,
            totalMarks: sch.totalMarks,
            passPercentage: sch.passPercentage,
            hallAssignments: finalAssignments,
            roomName: hallNames,
            invigilatorName: invigilatorNames,
            mode: sch.mode || (isObjective ? "Objective" : (exam.examCategory || "Combined")),
            scheduleMode: "PATTERN_WISE",
          },
        ];
        await onSave(combinedSchedules, editing, false);
      } else {
        const selectedSubject = sectionSubjects.find((s) => String(s.id) === String(sch.subjectId));
        const singleSchedule = [
          {
            id: editing || "draft-entry",
            examId: exam.id,
            groupId: selectedGroupId,
            subjectId: normalizeId(sch.subjectId),
            subjectName: `[${currentGroupCode}] ${selectedSubject?.name || "Subject"}`,
            subjectCode: selectedSubject?.code || "SUB",
            date: sch.date,
            startTime: sch.startTime,
            endTime: sch.endTime,
            totalMarks: sch.totalMarks,
            passingMarks: sch.passingMarks,
            hallAssignments: finalAssignments,
            roomName: hallNames,
            invigilatorName: invigilatorNames,
            mode: sch.mode || "Written",
            scheduleMode: "SUBJECT_WISE",
          },
        ];
        await onSave(singleSchedule, editing, false);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="exam-toolbar">
        <div>
          <h2>Exam Schedule & Postponement Editor</h2>
          <p>Configure or reschedule subject dates, timings, halls, and invigilator faculty group-wise.</p>
        </div>
        {exam && entries.length > 0 && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => {
                const ok = directExportScheduleExcel([exam], schedules, groups, `${exam.name}_Schedule`);
                if (ok) {
                  showToast?.("Schedule exported to Excel successfully.", "success");
                } else {
                  showToast?.("No schedules available to export.", "warning");
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Award size={15} /> Export Excel (.xlsx)
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => window.print()}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Printer size={15} /> Print Schedule
            </button>
          </div>
        )}
      </div>

      <div className="cms-card exam-schedule-card">
        <div className="cms-card-body">
          <SearchableSingleSelect
            label="Examination *"
            value={examId}
            onChange={setExamId}
            options={schedulableExams.map((ex) => ({
              ...ex,
              name: `${ex.name} (${ex.code}) [${ex.status}]`,
            }))}
            placeholder={
              schedulableExams.length
                ? "Select an examination to schedule / reschedule"
                : "No examinations available to schedule"
            }
          />

          {exam ? (
            <>
              <div
                className="exam-context"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <strong>
                    {exam.name} ({exam.code})
                  </strong>
                  <span>
                    {nameOf(boards, exam.boardId)} · Category: {exam.examCategory} · Levels:{" "}
                    {getLevelNames(exam, academicLevels)} · Groups: {getGroupNames(exam, groups)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                    <span>
                      Pattern: {exam.examPattern} · Period: {d(exam.startDate)} – {d(exam.endDate)}
                    </span>
                    {onEditPeriod && (
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost exam-mini-btn"
                        style={{ padding: "2px 8px", fontSize: "11px", height: "auto" }}
                        onClick={() => onEditPeriod(exam)}
                        title="Change examination time period dates"
                      >
                        <Pencil size={11} style={{ marginRight: "3px" }} /> Edit Period
                      </button>
                    )}
                  </span>
                </div>
                <StatusBadge value={exam.status} />
              </div>

              {/* Group Selector Bar */}
              <div className="exam-scope-block" style={{ marginBottom: "20px" }}>
                <div className="exam-scope-header">
                  <label className="exam-scope-label">Target Group Scheduling Tab *</label>
                  <span className="exam-scope-hint">
                    Select a group tab to configure session dates, times, halls, and faculty.
                  </span>
                </div>

                <div className="exam-group-tabs-bar">
                  {examGroups.map((group) => {
                    const isCurrentGroup = String(group.id) === String(selectedGroupId);
                    const groupSubs = getSelectedSubjectsForExam(exam, group.id, sectionSubjects);
                    const groupPatterns =
                      (exam.selectedGroupPatterns && exam.selectedGroupPatterns[group.id]) || [exam.examPattern];
                    const scheduledGroupCount = isCombined
                      ? entries.filter((s) => normalizeId(s.groupId) === normalizeId(group.id) || matchesScheduleGroup(s, group.id, exam, effectiveGroupSubjects)).length
                      : groupSubs.filter((sub) =>
                        entries.some(
                          (s) =>
                            (normalizeId(s.groupId) === normalizeId(group.id) || matchesScheduleGroup(s, group.id, exam, effectiveGroupSubjects)) &&
                            normalizeId(s.subjectId) === normalizeId(sub.id),
                        ),
                      ).length;
                    const totalGroupCount = isCombined ? groupPatterns.length : groupSubs.length;
                    // Point 16: Group readiness must validate all criteria (rows, dates, halls, capacity, invigilators), not just count
                    const isGroupReady = isGroupScheduleReady(
                      exam,
                      group.id,
                      schedules,
                      effectiveGroupSubjects,
                      rooms,
                      faculty,
                      programs,
                      groups,
                      students,
                    );

                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={`exam-group-tab-btn ${isCurrentGroup ? "current" : ""} ${isGroupReady ? "has-selections" : ""}`}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          if (editing) onCancelEdit();
                          setErrors({});
                        }}
                      >
                        {isGroupReady && <Check size={12} style={{ color: "var(--cms-green)" }} />}
                        <span className="exam-group-code">{group.code}</span>
                        <span className="exam-group-name">{group.name.split(" ")[0]}</span>
                        <span
                          className={`exam-group-badge exam-group-readiness-badge ${isGroupReady ? "ready" : "pending"}`}
                          style={{
                            background: isGroupReady ? "var(--cms-green)" : "var(--cms-primary)",
                          }}
                        >
                          {scheduledGroupCount}/{totalGroupCount} {isGroupReady ? "Ready" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Entry Form */}
              <form onSubmit={saveSchedule}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "14px", color: "var(--cms-text)" }}>
                    {editing ? "Edit / Postpone Schedule Entry for " : "Schedule Entry for "}
                    <strong>
                      {nameOf(groups, selectedGroupId)} ({codeOf(groups, selectedGroupId)})
                    </strong>
                  </h3>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {["DRAFT", "SCHEDULED"].includes(exam.status) &&
                      entries.filter((s) => normalizeId(s.groupId) === normalizeId(selectedGroupId) || matchesScheduleGroup(s, selectedGroupId, exam, effectiveGroupSubjects)).length === 0 && (
                        <button
                          type="button"
                          className="cms-btn cms-btn-primary"
                          disabled={processing}
                          onClick={autoGenerateSchedule}
                          style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <Wand2 size={14} /> {processing ? "Auto-Scheduling..." : `Auto-Schedule ${codeOf(groups, selectedGroupId)}`}
                        </button>
                      )}
                  </div>
                </div>

                <div className="cms-form-grid cols-3">
                  {isCombined ? (
                    <SearchableSingleSelect
                      label="Pattern Session *"
                      value={sch.patternName}
                      onChange={(v) => {
                        setSch((x) => ({ ...x, patternName: v }));
                        setErrors((x) => ({ ...x, patternName: undefined }));
                      }}
                      options={activeGroupPatterns.map((pName) => ({ id: pName, name: pName }))}
                      error={errors.patternName}
                      placeholder={`Select Pattern for ${codeOf(groups, selectedGroupId)}`}
                    />
                  ) : (
                    <SearchableSingleSelect
                      label="Subject *"
                      value={sch.subjectId}
                      onChange={(v) => {
                        const sameSubOtherGroup = !editing && schedules.find(
                          (s) =>
                            normalizeId(s.examId) === normalizeId(exam?.id) &&
                            normalizeId(s.subjectId) === normalizeId(v) &&
                            normalizeId(s.groupId) !== normalizeId(selectedGroupId) &&
                            s.date && s.startTime && s.endTime,
                        );
                        setSch((x) => ({
                          ...x,
                          subjectId: v,
                          ...(sameSubOtherGroup
                            ? {
                                date: sameSubOtherGroup.date,
                                startTime: sameSubOtherGroup.startTime,
                                endTime: sameSubOtherGroup.endTime,
                              }
                            : {}),
                        }));
                        setErrors((x) => ({
                          ...x,
                          subjectId: undefined,
                          ...(sameSubOtherGroup ? { date: undefined, startTime: undefined, endTime: undefined } : {}),
                        }));
                      }}
                      options={editing ? activeGroupSubjects : availableSubjectsToSchedule}
                      error={errors.subjectId}
                      placeholder={`Select ${codeOf(groups, selectedGroupId)} Subject`}
                    />
                  )}

                  <div className="cms-field">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={{ margin: 0 }}>Exam Date *</label>
                      {!isCombined && exam && activeGroupSubjects.length > 0 && (
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          style={{ padding: "2px 8px", fontSize: "11px", height: "auto", minHeight: "22px" }}
                          onClick={() => {
                            const existingDates = groupEntries
                              .filter((s) => String(s.id) !== String(editing))
                              .map((s) => s.date);
                            let nextDate = exam.startDate;
                            if (existingDates.length > 0) {
                              const maxDate = new Date(
                                Math.max(...existingDates.map((dt) => new Date(dt + "T00:00:00").getTime())),
                              );
                              maxDate.setDate(maxDate.getDate() + 1);
                              while (maxDate.getDay() === 0) maxDate.setDate(maxDate.getDate() + 1);
                              const yyyy = maxDate.getFullYear();
                              const mm = String(maxDate.getMonth() + 1).padStart(2, "0");
                              const dd = String(maxDate.getDate()).padStart(2, "0");
                              nextDate = `${yyyy}-${mm}-${dd}`;
                            }
                            if (nextDate <= exam.endDate) {
                              setSch((x) => ({ ...x, date: nextDate }));
                              setErrors((x) => ({ ...x, date: undefined }));
                            }
                          }}
                        >
                          <Sparkles size={12} /> Auto Next Date
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      min={exam.startDate}
                      max={exam.endDate}
                      value={isCombined && !editing ? (exam.startDate || sch.date) : sch.date}
                      readOnly={isCombined && !editing}
                      style={isCombined && !editing ? { background: "var(--cms-subtle)", opacity: 0.85 } : {}}
                      title={isCombined ? "Combined examinations are conducted on the common exam date." : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSch((x) => ({ ...x, date: v }));
                        setErrors((x) => ({ ...x, date: undefined }));
                      }}
                    />
                    {isCombined && (
                      <span style={{ fontSize: "11px", color: "var(--cms-muted)", marginTop: "4px", display: "block" }}>
                        Common exam date ({d(exam.startDate)})
                      </span>
                    )}
                    {errors.date && <span className="cms-error">{errors.date}</span>}
                  </div>

                  <Field
                    label="Start Time *"
                    type="time"
                    value={isCombined && !editing && existingCombinedSession ? existingCombinedSession.startTime : sch.startTime}
                    readOnly={isCombined && Boolean(existingCombinedSession) && !editing}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, startTime: v }));
                      setErrors((x) => ({ ...x, startTime: undefined }));
                    }}
                    error={errors.startTime}
                  />

                  <Field
                    label="End Time *"
                    type="time"
                    value={isCombined && !editing && existingCombinedSession ? existingCombinedSession.endTime : sch.endTime}
                    readOnly={isCombined && Boolean(existingCombinedSession) && !editing}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, endTime: v }));
                      setErrors((x) => ({ ...x, endTime: undefined }));
                    }}
                    error={errors.endTime}
                  />

                  <Field
                    label="Total Marks *"
                    type="number"
                    placeholder="e.g. 100 or 300"
                    value={sch.totalMarks}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, totalMarks: v }));
                      setErrors((x) => ({ ...x, totalMarks: undefined }));
                    }}
                    error={errors.totalMarks}
                  />

                  <Field
                    label={isCombined ? "Pass Percentage (%) *" : "Passing Marks *"}
                    type="number"
                    placeholder={isCombined ? "e.g. 40" : "e.g. 35"}
                    value={isCombined ? sch.passPercentage : sch.passingMarks}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, [isCombined ? "passPercentage" : "passingMarks"]: v }));
                      setErrors((x) => ({ ...x, [isCombined ? "passPercentage" : "passingMarks"]: undefined }));
                    }}
                    error={errors[isCombined ? "passPercentage" : "passingMarks"]}
                  />

                  {isCombined ? (
                    <Field label="Exam Mode" value={sch.mode || (isObjective ? "Objective" : (exam?.examCategory || "Combined"))} readOnly />

                  ) : (
                    <SearchableSingleSelect
                      label="Exam Mode"
                      value={sch.mode}
                      onChange={(v) => setSch((x) => ({ ...x, mode: v }))}
                      options={["Written"].map((name) => ({ id: name, name }))}
                    />
                  )}
                </div>

                <HallAssignmentEditor
                  assignments={sch.hallAssignments}
                  rooms={eligibleRooms}
                  faculty={eligibleInvigilators}
                  required={getRequiredCandidateStrength(exam, selectedGroupId, programs, false, students)}
                  enrolledStudentCount={getGroupStudents(exam, selectedGroupId, programs, students).length}
                  onRefreshStudents={onRefreshStudents}
                  onChange={(hallAssignments) => setSch((x) => ({ ...x, hallAssignments }))}
                  onAutoAssign={handleManualAutoAssignTopForm}
                />
                {errors.form && <div className="cms-error exam-form-error">{errors.form}</div>}

                <div className="cms-form-actions" style={{ marginTop: "16px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => {
                      setSch((current) => ({
                        groupId: selectedGroupId,
                        subjectId: "",
                        patternName: "",
                        date: "",
                        startTime: editing ? current.startTime : "09:00",
                        endTime: editing ? current.endTime : "12:00",
                        totalMarks: "100",
                        passingMarks: "35",
                        passPercentage: "35",
                        hallAssignments: [],
                        mode: "Written",
                      }));
                      if (editing) onCancelEdit();
                      setErrors({});
                    }}
                  >
                    {editing ? "Cancel Edit" : "Clear"}
                  </button>
                  <button className="cms-btn cms-btn-primary" disabled={processing}>
                    {processing
                      ? editing
                        ? "Updating..."
                        : "Saving..."
                      : editing
                        ? "Update / Postpone Entry"
                        : "Save Schedule Entry"}
                  </button>
                </div>
              </form>

              <ScheduleTable
                entries={groupEntries}
                groups={groups}
                canEdit={true}
                edit={onEdit}
                remove={onRemove}
                onEditHalls={(s) => setEditingHallsSchedule(s)}
              />

              {/* Print Area: Clean Printable Timetable Layout */}
              <div className="exam-print-area" aria-hidden="true">
                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <h1 style={{ fontSize: "18px", margin: "0 0 4px", fontWeight: "bold" }}>
                    COLLEGE EXAMINATION TIMETABLE / SCHEDULE
                  </h1>
                  <h2 style={{ fontSize: "14px", margin: "0 0 6px" }}>
                    {exam.name} ({exam.code}) — {nameOf(boards, exam.boardId)}
                  </h2>
                  <p style={{ fontSize: "12px", margin: 0, color: "#444" }}>
                    Category: <strong>{exam.examCategory}</strong> | Pattern: <strong>{exam.examPattern}</strong> | Type: <strong>{exam.examType || "Regular"}</strong> | Period: <strong>{d(exam.startDate)}</strong> to <strong>{d(exam.endDate)}</strong>
                  </p>
                  <p style={{ fontSize: "11px", margin: "4px 0 0", color: "#666" }}>
                    Academic Levels: {getLevelNames(exam, academicLevels)} | Groups: {getGroupNames(exam, groups)}
                  </p>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Group</th>
                      <th>Subject / Session</th>
                      <th>Subject Code</th>
                      <th>Exam Date</th>
                      <th>Timing</th>
                      <th>Exam Mode</th>
                      <th>Total Marks</th>
                      <th>Passing Marks</th>
                      <th>Room / Hall(s)</th>
                      <th>Invigilator Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>{idx + 1}</td>
                        <td><strong>{codeOf(groups, item.groupId)}</strong></td>
                        <td>{item.subjectName || item.patternName || "Session"}</td>
                        <td>{item.subjectCode || "—"}</td>
                        <td>{d(item.date)}</td>
                        <td>{item.startTime} – {item.endTime}</td>
                        <td>{item.mode || "Written"}</td>
                        <td>{item.totalMarks}</td>
                        <td>{item.passingMarks || (item.passPercentage ? `${item.passPercentage}%` : "—")}</td>
                        <td>
                          {item.roomName && item.roomName !== "—"
                            ? item.roomName
                            : (item.hallAssignments || [])
                              .map((a) => a.hallName || a.roomNumber || a.hallId)
                              .filter(Boolean)
                              .join(", ") || "—"}
                        </td>
                        <td>
                          {item.invigilatorName && item.invigilatorName !== "—"
                            ? item.invigilatorName
                            : (item.hallAssignments || [])
                              .flatMap((a) => a.invigilatorNames || a.invigilatorIds || [])
                              .filter(Boolean)
                              .join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span>Printed on: {new Date().toLocaleString()}</span>
                  <span>Verified & Approved by Examination Cell</span>
                </div>
              </div>

              <div
                className="exam-finalize"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>
                  {entries.length} subject/session schedule(s) configured across {examGroups.length} group(s)
                </span>
                {exam.status === "DRAFT" ? (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    disabled={processing}
                    style={{ marginLeft: "auto" }}
                    onClick={async () => {
                      const readinessSubs = (sectionSubjects && sectionSubjects.length > 0) ? sectionSubjects : eligibleSubjects;
                      const missing = validateScheduleReadiness(
                        exam,
                        schedules,
                        groups,
                        readinessSubs,
                        rooms,
                        faculty,
                        programs,
                        students,
                      );
                      setReadinessErrors(missing);
                      if (missing.length) return;
                      setProcessing(true);
                      try {
                        await finalize(exam);
                      } finally {
                        setProcessing(false);
                      }
                    }}
                  >
                    <Check size={15} style={{ marginRight: "4px" }} />
                    {processing ? "Finalizing Schedule..." : "Finalize Schedule"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ marginLeft: "auto" }}
                    disabled={true}
                    onClick={() => finalize(exam)}
                  >
                    <Check size={15} style={{ marginRight: "4px" }} />
                    Schedule Finalized
                  </button>
                )}
              </div>
              {readinessErrors.length > 0 && (
                <div className="exam-readiness-errors">
                  {readinessErrors.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="cms-empty" style={{ margin: "24px 0" }}>
              Select an examination to manage schedules or postpone subject dates.
            </div>
          )}
        </div>
      </div>

      {editingHallsSchedule && (
        <EditHallsModal
          schedule={editingHallsSchedule}
          exam={exam}
          schedules={schedules}
          rooms={rooms}
          faculty={faculty}
          programs={programs}
          subjects={sectionSubjects}
          students={students}
          onClose={() => setEditingHallsSchedule(null)}
          onSave={async (updatedSchedule) => {
            const saved = await onUpdateSchedule?.(updatedSchedule);
            if (saved) setEditingHallsSchedule(null);
            return saved;
          }}
        />
      )}
    </>
  );
}

// ---------- HALL ASSIGNMENT EDITOR ----------
function HallAssignmentEditor({
  assignments,
  rooms = [],
  faculty = [],
  required,
  enrolledStudentCount = null,
  onRefreshStudents = null,
  onChange,
  onAutoAssign,
}) {
  const allocated = assignments.reduce((sum, item) => sum + (Number(item.candidateCount) || 0), 0);
  const update = (index, patch) =>
    onChange(assignments.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const selectedHallIds = assignments.map((item) => normalizeId(item.hallId));

  return (
    <section className="exam-hall-section">
      <div className="exam-allocation-summary">
        <span>
          Group Candidate Capacity: <strong>{required} Candidates</strong>
          {enrolledStudentCount !== null && (
            <span
              style={{
                marginLeft: "8px",
                padding: "2px 8px",
                background: "rgba(99, 102, 241, 0.1)",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--cms-primary, #6366f1)",
              }}
            >
              {enrolledStudentCount} Enrolled Students
            </span>
          )}
        </span>
        <span>
          Allocated across halls: <strong>{allocated}</strong>
        </span>
        <span>
          Remaining: <strong>{Math.max(0, required - allocated)}</strong>
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {onRefreshStudents && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ fontSize: "12px", padding: "4px 8px" }}
              onClick={onRefreshStudents}
              title="Refresh student records from Admissions & Student Management"
            >
              <RefreshCw size={13} style={{ marginRight: "4px" }} /> Sync Students
            </button>
          )}
          {onAutoAssign && (
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onAutoAssign}>
              <Wand2 size={14} /> Auto-Assign Halls
            </button>
          )}
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => onChange([...assignments, { hallId: "", candidateCount: "", invigilatorIds: [] }])}
          >
            <Plus size={14} /> Add Room / Hall
          </button>
        </div>
      </div>

      {assignments.map((assignment, index) => (
        <div className="exam-hall-row" key={`${index}-${assignment.hallId}`}>
          <SearchableSingleSelect
            label="Room / Hall *"
            value={assignment.hallId}
            onChange={(hallId) => {
              const room = rooms.find((r) => normalizeId(r.id) === normalizeId(hallId));
              const roomCap = Number(room?.capacity) || 0;
              let candidateCount = assignment.candidateCount;
              if (!candidateCount || Number(candidateCount) === 0) {
                const alreadyAllocated = assignments.reduce(
                  (sum, item, i) => (i === index ? sum : sum + (Number(item.candidateCount) || 0)),
                  0
                );
                const remainingNeeded = Math.max(0, required - alreadyAllocated);
                candidateCount = roomCap > 0 && remainingNeeded > 0 ? Math.min(remainingNeeded, roomCap) : (roomCap || required || 1);
              }
              update(index, { hallId, candidateCount });
            }}
            options={rooms
              .filter(
                (room) =>
                  normalizeId(room.id) === normalizeId(assignment.hallId) ||
                  !selectedHallIds.includes(normalizeId(room.id)),
              )
              .map((room) => ({
                ...room,
                name: `${room.name} (${room.roomNumber}) · Capacity ${room.capacity}`,
              }))}
            placeholder="Select Exam Hall or Classroom"
          />

          <Field
            label="Candidate Count *"
            type="number"
            min="1"
            value={assignment.candidateCount}
            onChange={(candidateCount) => update(index, { candidateCount })}
          />

          <SearchableMultiSelect
            label="Invigilator Faculty *"
            selectedIds={assignment.invigilatorIds}
            onChange={(invigilatorIds) => update(index, { invigilatorIds })}
            options={faculty.filter(
              (person) =>
                !assignments.some(
                  (item, i) =>
                    i !== index && item.invigilatorIds.map(normalizeId).includes(normalizeId(person.id)),
                ),
            )}
            placeholder="Select Invigilator(s)"
          />

          <button
            type="button"
            className="cms-action-btn danger exam-remove-hall"
            title="Remove room"
            onClick={() => onChange(assignments.filter((_, i) => i !== index))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </section>
  );
}

// ---------- SCHEDULE TABLE (PAGINATED 6 PER PAGE) ----------
function ScheduleTable({ entries, groups = [], canEdit, edit, remove, onEditHalls }) {
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(entries.length / pageSize));
  const pagedEntries = entries.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = entries.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, entries.length);

  useEffect(() => setPage(1), [entries.length]);

  return (
    <div style={{ marginTop: "16px" }}>
      <div className="cms-table-wrap">
        <table className="cms-table exam-schedule-inner-table">
          <thead>
            <tr>
              <th>Subject / Pattern Session</th>
              <th>Group</th>
              <th>Exam Date</th>
              <th>Timing</th>
              <th>Total Marks</th>
              <th>Passing Marks / Pass %</th>
              <th>Room / Hall(s)</th>
              <th>Invigilator(s)</th>
              <th>Exam Mode</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pagedEntries.length ? (
              pagedEntries.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="exam-cell-two-lines" title={s.subjectName}>
                      {s.subjectName}
                    </span>
                    <small
                      className="exam-muted"
                      style={{ display: "block", fontSize: "11px", color: "var(--cms-muted)" }}
                    >
                      {s.subjectCode}
                    </small>
                  </td>
                  <td>
                    <span className="exam-cell-two-lines" title={nameOf(groups, s.groupId, "—")}>
                      {nameOf(groups, s.groupId, "—")}
                    </span>
                  </td>
                  <td>{d(s.date)}</td>
                  <td>
                    {s.startTime} - {s.endTime}
                  </td>
                  <td>{s.totalMarks || "100"}</td>
                  <td>
                    {s.scheduleMode === "PATTERN_WISE"
                      ? `${s.passPercentage}%`
                      : s.passingMarks}
                  </td>
                  <td>
                    <span className="exam-cell-two-lines" title={s.roomName}>
                      {s.roomName}
                    </span>
                  </td>
                  <td>
                    <span className="exam-cell-two-lines" title={s.invigilatorName || "—"}>
                      {s.invigilatorName || "—"}
                    </span>
                  </td>
                  <td>{s.mode || (s.scheduleMode === "PATTERN_WISE" ? "Combined" : "Written")}</td>
                  {canEdit && (
                    <td>
                      <div className="cms-actions">
                        <button
                          className="cms-action-btn"
                          title="Edit Halls & Invigilators"
                          onClick={() => onEditHalls?.(s)}
                          style={{ color: "var(--cms-primary)" }}
                        >
                          <Users size={15} />
                        </button>
                        <button
                          className="cms-action-btn edit"
                          title="Edit / Postpone Date"
                          onClick={() => edit(s)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button className="cms-action-btn danger" title="Remove" onClick={() => remove(s)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canEdit ? 10 : 9}>
                  <div className="cms-empty">No subjects or sessions scheduled yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {entries.length > pageSize && (
        <div
          className="exam-list-pagination"
          style={{ border: "1px solid var(--cms-border)", borderRadius: "0 0 12px 12px" }}
        >
          <span className="exam-record-summary">
            Showing {rangeStart}–{rangeEnd} of {entries.length} records (6 per page)
          </span>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- EDIT HALLS & INVIGILATORS MODAL ----------
function EditHallsModal({ schedule, exam, schedules, rooms = [], faculty = [], programs = [], subjects = [], students = [], onClose, onSave }) {
  const eligibleRooms = getEligibleRooms(schedules, schedule, schedule.id, exam, rooms);
  const eligibleFaculty = getEligibleInvigilators(schedules, schedule, schedule.id, faculty, subjects);
  const requiredStrength = getRequiredCandidateStrength(exam, schedule.groupId, programs, false, students);

  const [assignments, setAssignments] = useState(() => {
    const raw = (schedule.hallAssignments || []).map((a) => ({ ...a }));
    if (!raw.length) return [];
    let needed = requiredStrength;
    return raw.map((item) => {
      const existingCount = Number(item.candidateCount) || 0;
      if (existingCount > 0) {
        needed = Math.max(0, needed - existingCount);
        return item;
      }
      const room = rooms.find((r) => normalizeId(r.id) === normalizeId(item.hallId));
      const roomCap = Number(room?.capacity) || 40;
      const count = Math.min(needed > 0 ? needed : roomCap, roomCap);
      needed = Math.max(0, needed - count);
      return { ...item, candidateCount: count };
    });
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const handleAutoAssign = () => {
    const autoAssigned = autoAssignHallsAndInvigilators(
      exam,
      schedule.groupId,
      schedule.date,
      schedule.startTime,
      schedule.endTime,
      schedules,
      schedule.id,
      rooms,
      faculty,
      programs,
      {
        subjectId: schedule.subjectId,
        includedSubjectIds: schedule.includedSubjectIds,
        subjectsList: subjects,
      },
      students,
    );
    if (!autoAssigned) {
      setError("Cannot auto-allocate: insufficient hall capacity or available invigilators without conflicts.");
      return;
    }
    setAssignments(autoAssigned);
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    const valErrors = validateHallAssignments(
      assignments,
      exam,
      schedules,
      schedule,
      schedule.id,
      schedule.groupId,
      false,
      rooms,
      faculty,
      subjects,
    );
    const allocated = assignments.reduce((total, assignment) => total + Number(assignment.candidateCount || 0), 0);
    if (requiredStrength <= 0 || allocated < requiredStrength) valErrors.push("Hall allocation must cover the confirmed candidate strength.");
    for (const a of assignments) {
      const needed = requiredInvigilatorCount(a.candidateCount);
      const validInvCount = ensureArray(a.invigilatorIds).filter(
        (id) => id && normalizeId(id) !== "0" && normalizeId(id) !== "undefined" && normalizeId(id) !== "null",
      ).length;
      if (validInvCount < needed) {
        valErrors.push(
          `${nameOf(rooms, a.hallId, "Hall")} has ${a.candidateCount} candidates and requires at least ${needed} invigilator${needed > 1 ? "s" : ""}.`,
        );
      }
    }
    if (valErrors.length) {
      setError(valErrors.join(" "));
      return;
    }

    // Points 7, 8, 9: Validate assigned faculty for availability, simultaneous overlap & own-subject exclusion
    const eligibleFacultyIds = getEligibleInvigilators(schedules, schedule, schedule.id, faculty, subjects).map((f) => normalizeId(f.id));
    for (const a of assignments) {
      for (const id of a.invigilatorIds || []) {
        const nid = normalizeId(id);
        const fMember = faculty.find((f) => normalizeId(f.id) === nid);
        if (fMember && !eligibleFacultyIds.includes(nid)) {
          const isOverlapping = schedules.some(
            (s) =>
              (!schedule.id || normalizeId(s.id) !== normalizeId(schedule.id)) &&
              canonicalDate(s.date || s.examDate) === canonicalDate(schedule.date || schedule.examDate) &&
              hasTimeOverlap(schedule.startTime, schedule.endTime, s.startTime, s.endTime) &&
              getScheduleInvigilatorIds(s).includes(nid),
          );
          if (isOverlapping) {
            setError(`${fMember.name} is already invigilating another exam hall in an overlapping time slot.`);
          } else {
            const entrySubjectIds = [schedule?.subjectId, ...(schedule?.includedSubjectIds || [])].map(normalizeId).filter(Boolean);
            const teachesSubject = entrySubjectIds.length > 0 && Array.isArray(fMember.subjectsTaught) && entrySubjectIds.some((sId) => fMember.subjectsTaught.map(normalizeId).includes(sId));
            if (teachesSubject) {
              setError(`${fMember.name} teaches ${schedule.subjectName || "this subject"} and cannot invigilate their own subject examination.`);
            } else {
              setError(`${fMember.name} is not an active, available invigilator.`);
            }
          }
          return;
        }
      }
    }

    const hallNames = assignments.map((a) => nameOf(rooms, a.hallId)).join(", ") || "Unassigned Hall";
    const invigilatorNames =
      assignments
        .map((a) => `${nameOf(rooms, a.hallId)}: ${(a.invigilatorIds || []).map((id) => nameOf(faculty, id)).join(", ")}`)
        .join(" | ") || "Unassigned Faculty";

    const updated = {
      ...schedule,
      hallAssignments: assignments,
      roomName: hallNames,
      invigilatorName: invigilatorNames,
    };
    savingRef.current = true;
    setSaving(true);
    try { await onSave(updated); } finally { savingRef.current = false; setSaving(false); }
  };

  return (
    <Modal title={`Edit Halls & Invigilators: ${schedule.subjectName}`} onClose={onClose} className="exam-modal">
      <form onSubmit={handleSave}>
        <div
          style={{
            marginBottom: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--cms-muted)" }}>
            Exam Date: <strong>{d(schedule.date)}</strong> · Period:{" "}
            <strong>
              {schedule.startTime} - {schedule.endTime}
            </strong>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={handleAutoAssign}
            style={{ fontSize: "12px", padding: "4px 10px" }}
          >
            <Wand2 size={13} style={{ marginRight: "4px" }} /> Auto-Assign Halls & Invigilators
          </button>
        </div>

        <HallAssignmentEditor
          assignments={assignments}
          rooms={eligibleRooms}
          faculty={eligibleFaculty}
          required={requiredStrength}
          enrolledStudentCount={getGroupStudents(exam, schedule.groupId, programs, students).length}
          onChange={(newAssignments) => {
            setAssignments(newAssignments);
            setError("");
          }}
        />

        {error && (
          <div className="cms-error" style={{ marginTop: "12px" }}>
            {error}
          </div>
        )}

        <div className="cms-form-actions" style={{ marginTop: "18px" }}>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="cms-btn cms-btn-primary" disabled={saving}>
            {saving ? "Saving Examinations..." : "Save Hall & Invigilator Assignments"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- EXAM DETAILS MODAL ----------
function ExamDetails({ exam, schedules, boards = [], academicYears = [], academicLevels = [], groups = [], close }) {
  return (
    <Modal title="Examination Details" onClose={close} className="exam-modal">
      <section className="exam-view-summary">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <strong>
              {exam.name} ({exam.code})
            </strong>
            <p>
              Category: {exam.examCategory} · {nameOf(boards, exam.boardId)} · {nameOf(academicYears, exam.yearId)}
            </p>
            <p>
              Pattern: {exam.examPattern} {exam.examType ? `· Type: ${exam.examType}` : ""} · Levels: {getLevelNames(exam, academicLevels)} · Groups:{" "}
              {getGroupNames(exam, groups)}
            </p>
            <p>
              Period: {d(exam.startDate)} – {d(exam.endDate)}
            </p>
          </div>
          {schedules.length > 0 && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ fontSize: "12px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => directExportScheduleExcel([exam], schedules, groups, `${exam.name}_Schedule`)}
            >
              <Award size={14} /> Export Excel (.xlsx)
            </button>
          )}
        </div>
      </section>
      <ScheduleTable entries={schedules} groups={groups} canEdit={false} />
    </Modal>
  );
}

// ---------- EDIT EXAM PERIOD MODAL ----------
function EditExamModal({ exam, schedules, onClose, onSave }) {
  const isCombined = isCombinedExamination(exam);
  const [form, setForm] = useState({
    startDate: exam.startDate,
    endDate: isCombined ? exam.startDate : exam.endDate,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (!form.startDate) next.startDate = "Required";
    if (isCombined) {
      // Combined examinations derive the end date from the start date.
    } else {
      if (!form.endDate) next.endDate = "Required";
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        next.endDate = "End date must be on or after start date.";
      }
    }
    if (Object.keys(next).length) return setErrors(next);
    setSaving(true);
    try {
      await onSave({ ...form, endDate: isCombined ? form.startDate : form.endDate });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit Examination Period" onClose={onClose} className="exam-modal">
      <form onSubmit={save}>
        <div className="cms-form-grid">
          <Field
            label="Start Date *"
            type="date"
            value={form.startDate}
            onChange={(v) =>
              setForm((x) => ({
                ...x,
                startDate: v,
                ...(isCombined ? { endDate: v } : {}),
              }))
            }
            error={errors.startDate}
          />
          {isCombined ? (
            <div className="cms-field">
              <label>End Date *</label>
              <input
                type="date"
                value={form.startDate || ""}
                readOnly
                style={{ background: "var(--cms-subtle)", cursor: "not-allowed", opacity: 0.85 }}
                title="Combined examinations are conducted on a single combined examination date."
              />
              <span style={{ fontSize: "11px", color: "var(--cms-muted)", marginTop: "4px", display: "block" }}>
                Matches Start Date for combined single-day examination
              </span>
            </div>
          ) : (
            <Field
              label="End Date *"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(v) => setForm((x) => ({ ...x, endDate: v }))}
              error={errors.endDate}
            />
          )}
        </div>
        <div className="cms-form-actions">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary" disabled={saving}>
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- BASE FIELD COMPONENT ----------
function Field({ label, value, onChange, type = "text", error, readOnly, placeholder, min, max }) {
  return (
    <div className={`cms-field ${error ? "has-error" : ""}`}>
      {label && <label>{label}</label>}
      {type === "textarea" ? (
        <textarea
          value={value || ""}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          readOnly={readOnly}
          placeholder={placeholder}
          min={min}
          max={max}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
      {error && <span className="cms-error">{error}</span>}
    </div>
  );
}