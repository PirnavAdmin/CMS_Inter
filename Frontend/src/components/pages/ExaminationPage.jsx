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
import { ConfirmDialog, Modal, SkeletonRow, StatusBadge, Toast } from "../common/Ui.jsx";
import "./ExaminationPage.css";

const PAGE_SIZE = 5;

import {
  ensureArray,
  unwrap,
  d,
  normalizeId,
  normalizeStatus,
  normalizeCodePart,
  canonicalDate,
  formatTimeOnly,
  parseTimeToMinutes,
  hasTimeOverlap,
  requiredInvigilatorCount,
  isCombinedExamination,
  isRegularExamination,
  getExaminationScheduleMode,
  getResolvedExamCategory,
  isLanguageSubject,
  getGroupStudents,
  getRequiredCandidateStrength,
  canonicalizeScope,
} from "@/utils/examinationUtils.js";

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

const isEntityActive = (item, isGuaranteedActiveEndpoint = false) => {
  if (!item) return false;
  const inactiveValues = [false, 0, "false", "0", "inactive", "Inactive", "INACTIVE", "disabled", "Disabled"];
  const activeValues = [true, 1, "true", "1", "active", "Active", "ACTIVE", "enabled", "Enabled"];

  const checkVal = (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (inactiveValues.includes(v)) return false;
    if (activeValues.includes(v)) return true;
    return null;
  };

  const statusVal = checkVal(item.status);
  const isActiveVal = checkVal(item.isActive);
  const activeFieldVal = checkVal(item.active);

  if (statusVal === false || isActiveVal === false || activeFieldVal === false) {
    return false;
  }
  if (statusVal === true || isActiveVal === true || activeFieldVal === true) {
    return true;
  }
  if (isGuaranteedActiveEndpoint) return true;
  return false;
};


const getEligibleSubjects = (exam, subjectsList = []) => {
  if (!exam) return [];
  const levelIds = ensureArray(exam.levelIds || [exam.levelId]).filter(Boolean).map(normalizeId);
  const groupIds = ensureArray(exam.groupIds || [exam.groupId]).filter(Boolean).map(normalizeId);
  const programIds = ensureArray(exam.programIds || [exam.programId]).filter(Boolean).map(normalizeId);

  return ensureArray(subjectsList).filter((s) => {
    if (s.isActive === false) return false;
    if (isCombinedExamination(exam) && isLanguageSubject(s)) return false;
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
  if (!exam) return [];
  const rawSel = exam?.groupSubjectSelections?.[normalizeId(targetGroupId)] ?? exam?.selectedSubjectIds ?? exam?.allocatedSubjectIds ?? exam?.subjectIds;
  if (!rawSel || ensureArray(rawSel).length === 0) {
    return [];
  }
  const allEligible = getEligibleSubjects(exam, subjectsList);
  const selIds = ensureArray(rawSel).map(normalizeId);
  let subjects = allEligible.filter((s) => selIds.includes(normalizeId(s.id)));
  if (targetGroupId) {
    subjects = subjects.filter((s) => {
      const sGroupIds = ensureArray(s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId);
      return sGroupIds.includes(normalizeId(targetGroupId));
    });
  }
  return subjects;
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

// Helper to identify if schedule s is the one currently being edited or a sibling in the same combined session
const isSameSessionOrSelf = (s, entry, editingId = null, exam = null) => {
  if (!s || !entry) return false;
  const sId = normalizeId(s.id);
  if (editingId && sId === normalizeId(editingId)) return true;
  if (entry.id && sId === normalizeId(entry.id)) return true;
  const targetIds = ensureArray(entry.allScheduleIds).map(normalizeId);
  if (sId && targetIds.includes(sId)) return true;
  if (s.sessionId && entry.sessionId && String(s.sessionId) === String(entry.sessionId)) return true;
  if (
    Boolean(editingId || entry.id) &&
    exam &&
    isCombinedExamination(exam) &&
    normalizeId(s.examId) === normalizeId(exam.id) &&
    normalizeId(s.groupId) === normalizeId(entry.groupId) &&
    canonicalDate(s.date || s.examDate) === canonicalDate(entry.date || entry.examDate) &&
    s.startTime === entry.startTime &&
    s.endTime === entry.endTime &&
    (s.patternName === entry.patternName || !s.patternName || !entry.patternName)
  ) {
    return true;
  }
  return false;
};

// Verification helper: Checks if a room/venue is suitable for examination conduction (Active Classrooms and Examination Halls)
const isExamEligibleRoom = (room) => {
  if (!room) return false;
  const isAct =
    room.isActive !== false &&
    !["INACTIVE", "DISABLED", "0", "FALSE"].includes(normalizeStatus(room.status));
  if (!isAct) return false;

  const cap = Number(room.capacity);
  if (isNaN(cap) || cap <= 0) return false;

  if (room.isAssignedToSection === true) return false;

  const type = String(room.roomType || room.type || "").trim().toLowerCase();
  const name = String(room.name || room.roomName || room.roomNumber || "").trim().toLowerCase();

  // Exclude non-exam venues: Laboratories, computer labs, libraries, staff rooms, offices, canteens, restrooms
  const isExcluded = ["laboratory", "lab", "computer lab", "library", "staff room", "office", "store", "canteen", "restroom"].some(
    (ex) => type === ex || (type.includes(ex) && !type.includes("hall") && !type.includes("exam"))
  );
  if (isExcluded) return false;

  // Must be a Classroom, Examination Hall, Exam Hall, Seminar Hall, Auditorium, or general classroom/room
  const isClassroomOrHall =
    !type ||
    type.includes("class") ||
    type.includes("exam") ||
    type.includes("hall") ||
    type.includes("auditorium") ||
    type === "room" ||
    name.includes("room") ||
    name.includes("hall") ||
    name.includes("class");

  return isClassroomOrHall;
};

// Strict Hall Conflict Semantics: Room is UNAVAILABLE if another schedule uses it during overlapping time
const getEligibleRooms = (schedules, entry, editingId = null, exam = null, roomsList = []) => {
  const selectedLevels = (exam?.levelIds || [exam?.levelId]).filter(Boolean).map(normalizeId);
  const entryDate = canonicalDate(entry?.date || entry?.examDate);
  return ensureArray(roomsList).filter((room) => {
    if (!room) return false;
    // Must be active and suitable for examinations (Classroom or Examination Hall)
    if (!isExamEligibleRoom(room)) return false;

    // Level filtering: If room is level specific (not ALL, not 0, not empty), exam must include that level
    const roomLevel = normalizeStatus(room.levelId);
    if (room.levelId && !["ALL", "0", "", "NULL", "UNDEFINED"].includes(roomLevel)) {
      if (selectedLevels.length > 0 && !selectedLevels.includes(normalizeId(room.levelId))) {
        return false;
      }
    }
    // Strict Hall conflict check: Cannot share Hall with any other concurrent schedule
    if (!entryDate || !entry?.startTime || !entry?.endTime) return true;
    const isOccupiedByAnotherSchedule = schedules.some(
      (s) =>
        !isSameSessionOrSelf(s, entry, editingId, exam) &&
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

    if (entryDate) {
      const isAssignedConcurrently = schedules.some(
        (s) =>
          !isSameSessionOrSelf(s, entry, editingId) &&
          canonicalDate(s.date || s.examDate) === entryDate &&
          (entry?.startTime && entry?.endTime && s.startTime && s.endTime
            ? hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime)
            : true) &&
          getScheduleInvigilatorIds(s).includes(fId),
      );
      if (isAssignedConcurrently) return false;
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
        "Subject/Pattern": s.subjectName ? `${s.subjectName}${s.combinedSubjectsDisplay ? " (" + s.combinedSubjectsDisplay + ")" : (s.subjectCode && s.subjectCode !== s.subjectName ? " [" + s.subjectCode + "]" : "")}` : (s.patternName || "—"),
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
          !isSameSessionOrSelf(s, entry, editingId, exam) &&
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

      // Cross-schedule concurrent faculty assignment check
      if (entryDate && entry?.startTime && entry?.endTime) {
        const conflictingFacSchedule = schedules.find(
          (s) =>
            !isSameSessionOrSelf(s, entry, editingId, exam) &&
            canonicalDate(s.date || s.examDate) === entryDate &&
            hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime) &&
            getScheduleInvigilatorIds(s).includes(nid),
        );
        if (conflictingFacSchedule) {
          const otherHall = conflictingFacSchedule.roomName || "another hall";
          messages.push(
            `${facName} is already assigned to invigilate in ${otherHall} during ${conflictingFacSchedule.startTime}–${conflictingFacSchedule.endTime}. Faculty cannot cover concurrent halls.`,
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
  if (schedules.some((saved) => !isSameSessionOrSelf(saved, entry, editingId, exam) && normalizeId(saved.examId) === normalizeId(exam.id) && normalizeId(saved.groupId) === normalizeId(entry.groupId) && (entry.patternName ? saved.patternName === entry.patternName : entry.subjectId && normalizeId(saved.subjectId) === normalizeId(entry.subjectId)))) messages.push("This subject or pattern already has a schedule. Edit the saved entry to reschedule it.");
  const isCombined = isCombinedExamination(exam);
  const isRegular = isRegularExamination(exam);
  const entryDate = canonicalDate(entry?.date || entry?.examDate);

  if (!entryDate || (exam.startDate && entryDate < canonicalDate(exam.startDate)) || (exam.endDate && entryDate > canonicalDate(exam.endDate)))
    messages.push("Exam date must be within the examination period.");

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

  // Same-Day Subject Schedule Non-Overlap Validation per Group
  if (isRegular && entryDate && !isCombined && entry.startTime && entry.endTime) {
    const overlappingDateSchedule = schedules.find(
      (s) =>
        normalizeId(s.examId) === normalizeId(exam.id) &&
        !isSameSessionOrSelf(s, entry, editingId, exam) &&
        normalizeId(s.groupId) === normalizeId(entry.groupId) &&
        canonicalDate(s.date || s.examDate) === entryDate &&
        hasTimeOverlap(entry.startTime, entry.endTime, s.startTime, s.endTime),
    );
    if (overlappingDateSchedule) {
      const groupName = nameOf(groupsList, entry.groupId, "this group");
      messages.push(
        `Time conflict on ${d(entryDate)} for ${groupName}: Overlaps with ${overlappingDateSchedule.subjectName || "another session"} (${overlappingDateSchedule.startTime}–${overlappingDateSchedule.endTime}).`,
      );
    }
  }

  if (isCombined) {
    if (isFinalizing && entry.combinedConfigurationVerified === false) messages.push("The server did not return the combined subjects, pattern and group. Backend persistence must be corrected before finalization.");
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
              !isSameSessionOrSelf(s, entry, editingId, exam) &&
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

const matchesScheduleGroup = (schedule, targetGroupId, exam = null, subjectsList = []) => {
  if (!schedule || !targetGroupId) return false;
  const targetGid = normalizeId(targetGroupId);
  if (schedule.groupId) return normalizeId(schedule.groupId) === targetGid;

  if (exam && isCombinedExamination(exam)) {
    const grpPatterns = ensureArray(exam.selectedGroupPatterns?.[targetGid]).filter(Boolean).map((p) => String(p).trim().toLowerCase());
    const schPattern = String(schedule.patternName || "").trim().toLowerCase();
    if (schPattern && grpPatterns.includes(schPattern)) return true;
  }

  if (schedule.subjectId && exam) {
    const groupSubs = getSelectedSubjectsForExam(exam, targetGid, subjectsList);
    if (groupSubs.some((sub) => normalizeId(sub.id) === normalizeId(schedule.subjectId))) return true;
  }

  const ids = ensureArray(exam?.groupIds || [exam?.groupId]).filter(Boolean).map(normalizeId);
  return ids.length === 1 && ids[0] === targetGid;
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

    const combinedEntries = entries.filter((s) => s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName));
    if (combinedEntries.length > 0) {
      const canonicalExamDate = canonicalDate(exam.startDate);
      const referenceStart = formatTimeOnly(combinedEntries[0].startTime);
      const referenceEnd = formatTimeOnly(combinedEntries[0].endTime);

      combinedEntries.forEach((entry) => {
        const entryDate = canonicalDate(entry.date || entry.examDate);
        if (canonicalExamDate && entryDate !== canonicalExamDate) {
          const gName = nameOf(groupsList, entry.groupId, `Group ${entry.groupId}`);
          messages.push(`[${gName}] Objective schedule date (${entryDate || "unset"}) must match examination start date (${canonicalExamDate}).`);
        }
        if (formatTimeOnly(entry.startTime) !== referenceStart || formatTimeOnly(entry.endTime) !== referenceEnd) {
          const gName = nameOf(groupsList, entry.groupId, `Group ${entry.groupId}`);
          messages.push(`[${gName}] All Objective groups must share the exact same start time (${referenceStart}) and end time (${referenceEnd}).`);
        }
      });
    }
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
        const allocatedStrength = ensureArray(entry.hallAssignments).reduce(
          (total, assignment) => total + (Number(assignment.candidateCount) || 0),
          0,
        );
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

    let totalAllocated = 0;
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
      if (canonicalDate(entry.date || entry.examDate) !== canonicalDate(exam.startDate)) return false;

      // Combined date/time differs across groups
      const otherGroupCombined = schedules.find(
        (s) =>
          normalizeId(s.examId) === normalizeId(exam.id) &&
          (!entry.id || normalizeId(s.id) !== normalizeId(entry.id)) &&
          (s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName)),
      );
      if (otherGroupCombined) {
        if (canonicalDate(otherGroupCombined.date || otherGroupCombined.examDate) !== canonicalDate(entry.date || entry.examDate)) return false;
        if (formatTimeOnly(otherGroupCombined.startTime) !== formatTimeOnly(entry.startTime) || formatTimeOnly(otherGroupCombined.endTime) !== formatTimeOnly(entry.endTime)) {
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

  const examGids = ensureArray(examContext?.groupIds || [examContext?.groupId]).filter(Boolean).map(normalizeId);
  let resolvedGroupId = normalizeId(s?.groupId);
  if (!resolvedGroupId && examGids.length === 1) resolvedGroupId = examGids[0];
  if (!resolvedGroupId && examContext?.selectedGroupPatterns) {
    const sPattern = String(s?.patternName || "").trim().toLowerCase();
    if (sPattern) {
      for (const gid of examGids) {
        const patterns = ensureArray(examContext.selectedGroupPatterns[gid]).map((p) => String(p).trim().toLowerCase());
        if (patterns.includes(sPattern)) {
          resolvedGroupId = gid;
          break;
        }
      }
    }
  }
  if (!resolvedGroupId && s?.subjectId) {
    const matchingGroups = new Set([...allSubjects, ...ensureArray(examContext?.selectedSubjectDetails)]
      .filter((subject) => typeof subject === "object" && normalizeId(subject.id ?? subject.subjectId) === normalizeId(s.subjectId))
      .flatMap((subject) => ensureArray(subject.groupIds || [subject.groupId]).map(normalizeId))
      .filter((id) => examGids.includes(id)));
    if (matchingGroups.size === 1) resolvedGroupId = [...matchingGroups][0];
  }
  if (!resolvedGroupId) resolvedGroupId = normalizeId(fallbackGroupId) || examGids[0] || "";

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

  const combined = ["PATTERN_WISE", "COMBINED_OBJECTIVE"].includes(normalizeStatus(s?.scheduleMode)) || isCombinedExamination(examContext);
  const configuredPattern = ensureArray(examContext?.selectedGroupPatterns?.[resolvedGroupId])[0] || examContext?.examPattern || "";
  const patternName = s?.patternName || (combined ? configuredPattern : "");

  const rawIncludedSubjectIds = s?.includedSubjectIds ?? s?.subjectIds;
  const includedSubjectIds = ensureArray(rawIncludedSubjectIds).map(normalizeId).filter(Boolean);

  // Strict verification: only true if backend response contains complete persisted scope
  let isVerified = false;
  if (combined) {
    const hasValidGroup = Boolean(resolvedGroupId && examGids.includes(resolvedGroupId));
    const hasPattern = Boolean(patternName);
    const hasIncludedSubs = Array.isArray(includedSubjectIds) && includedSubjectIds.length > 0;
    const hasValidDate = Boolean(formattedDate && (!examContext?.startDate || formattedDate === canonicalDate(examContext.startDate)));
    const hasValidTime = Boolean(s?.startTime && s?.endTime);
    const hasHalls = hallAssignments.length > 0 && hallAssignments.every((a) => a.hallId);
    isVerified = hasValidGroup && hasPattern && hasIncludedSubs && hasValidDate && hasValidTime && hasHalls;
  } else {
    const hasValidGroup = Boolean(resolvedGroupId && examGids.includes(resolvedGroupId));
    const hasSubject = Boolean(s?.subjectId);
    const hasValidDate = Boolean(formattedDate);
    const hasValidTime = Boolean(s?.startTime && s?.endTime);
    const hasHalls = hallAssignments.length > 0 && hallAssignments.every((a) => a.hallId);
    isVerified = hasValidGroup && hasSubject && hasValidDate && hasValidTime && hasHalls;
  }

  const subjectsSource = [...allSubjects, ...ensureArray(examContext?.selectedSubjectDetails)];
  const includedNames = includedSubjectIds.map((id) => nameOf(subjectsSource, id, "")).filter(Boolean);
  const includedCodes = includedSubjectIds.map((id) => codeOf(subjectsSource, id, "")).filter(Boolean);
  const combinedSessionName = patternName || "Combined Pattern";
  const combinedSessionCodes = includedCodes.length > 0 ? includedCodes.join(" + ") : (s?.subjectCode || "");
  const combinedSessionSubjects = includedNames.length > 0 ? includedNames.join(" + ") : "";

  return {
    id: stableId,
    examId: normalizeId(s?.examinationId ?? s?.examId ?? examContext?.id),
    groupId: resolvedGroupId,
    subjectId: normalizeId(s?.subjectId),
    patternName,
    includedSubjectIds,
    combinedConfigurationVerified: isVerified,
    subjectName: combined ? combinedSessionName : (s?.subjectName || "Subject"),
    subjectCode: combined ? combinedSessionCodes : (s?.subjectCode || ""),
    combinedSubjectsDisplay: combinedSessionSubjects,
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
    mode: s?.examMode ?? s?.mode ?? (combined ? "Objective" : "Written"),
    scheduleMode: s?.scheduleMode || (s?.patternName || combined ? "PATTERN_WISE" : "SUBJECT_WISE"),
  };
};

// Format schedule entry to strict backend API DTO
const formatScheduleDto = (s, targetExamId, facultyList = [], roomsList = []) => {
  const isObj = s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName);
  const examNumericId = Number(targetExamId || s.examId);
  const groupNumericId = Number(s.groupId);
  const rawSubId = Number(s.subjectId);
  const subjectNumericId = !isNaN(rawSubId) && rawSubId > 0 ? rawSubId : 0;

  const assignments = ensureArray(s.hallAssignments);
  const firstAssignment = assignments[0];
  const rawRoomId = firstAssignment?.hallId ?? firstAssignment?.roomId ?? s.roomId ?? s.hallId;
  const numRoomId = Number(rawRoomId);
  const validRoomId = !isNaN(numRoomId) && numRoomId > 0 ? numRoomId : null;

  const rawInvId = firstAssignment?.invigilatorIds?.[0] ?? firstAssignment?.facultyId ?? s.invigilatorId;
  const numInvId = Number(rawInvId);
  const validInvId = !isNaN(numInvId) && numInvId > 0 ? numInvId : null;

  // Resolve room name from firstAssignment, roomsList, or schedule
  const resolvedRoomObj = (roomsList.length && validRoomId)
    ? roomsList.find((r) => normalizeId(r.id) === normalizeId(validRoomId) || normalizeId(r.roomId) === normalizeId(validRoomId))
    : null;
  const resolvedRoomName = resolvedRoomObj?.roomNumber || resolvedRoomObj?.roomName || resolvedRoomObj?.name || (validRoomId && roomsList.length ? nameOf(roomsList, validRoomId, "") : "");

  const assignmentsHallNames = assignments
    .map((a) => a.hallName || a.roomName || a.roomNumber || (roomsList.length ? nameOf(roomsList, a.hallId ?? a.roomId, "") : ""))
    .filter(Boolean)
    .join(", ");

  const hallName =
    (assignments.length > 0
      ? (firstAssignment?.hallName ||
        firstAssignment?.roomName ||
        firstAssignment?.roomNumber ||
        resolvedRoomName ||
        assignmentsHallNames ||
        "")
      : "") ||
    (s.roomName && s.roomName !== "—" && s.roomName !== "-" ? s.roomName : "") ||
    s.roomNumber ||
    s.hall ||
    "";

  // Resolve invigilator name from firstAssignment, facultyList, or schedule
  const resolvedInvObj = (facultyList.length && validInvId)
    ? facultyList.find((f) => normalizeId(f.id) === normalizeId(validInvId))
    : null;
  const resolvedInvName = resolvedInvObj?.name || (validInvId && facultyList.length ? nameOf(facultyList, validInvId, "") : "");

  const assignmentsInvNames = assignments
    .map((a) =>
      ensureArray(a.invigilatorIds || a.facultyIds)
        .map((id) => (facultyList.length ? nameOf(facultyList, id, "") : ""))
        .filter(Boolean)
        .join(", ")
    )
    .filter(Boolean)
    .join(" | ");

  const invName =
    (assignments.length > 0
      ? (firstAssignment?.invigilatorName ||
        firstAssignment?.invigilator ||
        resolvedInvName ||
        assignmentsInvNames ||
        "")
      : "") ||
    (s.invigilatorName && s.invigilatorName !== "—" && s.invigilatorName !== "-" ? s.invigilatorName : "") ||
    s.invigilator ||
    "";

  const totalAllocatedCandidates = assignments.length > 0
    ? assignments.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0)
    : (Number(s.candidateCount) || 0);

  return {
    examinationId: isNaN(examNumericId) ? (targetExamId || s.examId) : examNumericId,
    groupId: isNaN(groupNumericId) ? s.groupId : groupNumericId,
    subjectId: subjectNumericId > 0 ? subjectNumericId : 0,
    patternName: s.patternName || "",
    includedSubjectIds: ensureArray(s.includedSubjectIds)
      .map((id) => {
        const numericId = Number(id);
        return Number.isNaN(numericId) ? id : numericId;
      })
      .filter(Boolean),
    date: s.date ? String(s.date).split("T")[0] : (s.examDate ? String(s.examDate).split("T")[0] : ""),
    examDate: s.date ? String(s.date).split("T")[0] : (s.examDate ? String(s.examDate).split("T")[0] : ""),
    startTime: formatTimeOnly(s.startTime),
    endTime: formatTimeOnly(s.endTime),
    maxMarks: Number(s.maxMarks ?? s.totalMarks) || 100,
    passingMarks: s.passingMarks !== undefined && s.passingMarks !== null && s.passingMarks !== "" ? Number(s.passingMarks) : 35,
    passPercentage: Number(s.passPercentage) || 35,
    examMode: s.examMode || s.mode || (isObj ? "Objective" : "Written"),
    scheduleMode: s.scheduleMode || (isObj ? "PATTERN_WISE" : "SUBJECT_WISE"),
    roomId: validRoomId,
    roomNumber: hallName || "",
    hall: hallName || "",
    venue: hallName || "",
    invigilatorId: validInvId,
    invigilator: invName || "",
    invigilatorName: invName || "",
    candidateCount: totalAllocatedCandidates,
    candidatesCount: totalAllocatedCandidates,
    capacity: totalAllocatedCandidates,
    hallAssignments: assignments.map((a) => {
      const hallNum = Number(a.hallId ?? a.roomId);
      const hId = isNaN(hallNum) ? (a.hallId ?? a.roomId) : hallNum;
      const hName = a.hallName || a.roomName || (roomsList.length ? nameOf(roomsList, hId, "") : "");
      return {
        hallId: hId,
        hallName: hName,
        roomName: hName,
        roomNumber: hName,
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

// Persist bulk or single examination schedules to backend DB (Batch endpoint for combined objective exams)
const saveSchedulesToBackend = async (examId, schedulesList, facultyList = [], roomsList = []) => {
  if (!schedulesList || !schedulesList.length) {
    return [];
  }

  const results = [];
  const standardDtoList = [];

  for (const s of schedulesList) {
    const isCombinedSchedule =
      s.scheduleMode === "PATTERN_WISE" ||
      Boolean(s.patternName) ||
      (Array.isArray(s.includedSubjectIds) && s.includedSubjectIds.length > 1);

    if (isCombinedSchedule && Array.isArray(s.includedSubjectIds) && s.includedSubjectIds.length > 0) {
      const validSubIds = s.includedSubjectIds
        .map(Number)
        .filter((id) => !isNaN(id) && id > 0);

      const dto = formatScheduleDto(s, examId, facultyList, roomsList);

      const batchPayload = {
        examinationId: Number(examId),
        groupId: Number(s.groupId) || s.groupId,
        subjectIds: validSubIds,
        examDate: canonicalDate(s.date || s.examDate),
        date: canonicalDate(s.date || s.examDate),
        startTime: formatTimeOnly(s.startTime),
        endTime: formatTimeOnly(s.endTime),
        scheduleMode: "PATTERN_WISE",
        sessionId: s.sessionId || `SESSION-${s.patternName || "PATTERN"}-${s.groupId || ""}`,
        patternName: s.patternName || "",
        roomId: dto.roomId,
        hall: dto.hall,
        roomNumber: dto.roomNumber,
        venue: dto.venue,
        invigilatorId: dto.invigilatorId,
        invigilator: dto.invigilator,
        invigilatorName: dto.invigilatorName,
        candidateCount: dto.candidateCount,
        candidatesCount: dto.candidateCount,
        capacity: dto.candidateCount,
        hallAssignments: dto.hallAssignments,
        examMode: "Objective",
        mode: "Objective",
        maxMarks: Number(s.maxMarks ?? s.totalMarks) || 300,
        totalMarks: Number(s.maxMarks ?? s.totalMarks) || 300,
        passingMarks: s.passingMarks !== undefined && s.passingMarks !== null && s.passingMarks !== "" ? Number(s.passingMarks) : 35,
        passPercentage: Number(s.passPercentage) || 40,
      };

      const batchRes = await apiClient.post(`/api/v1/examinations/${examId}/schedules/batch`, batchPayload);
      const created = batchRes.data?.data ?? batchRes.data ?? [];
      results.push(...ensureArray(created));
    } else {
      standardDtoList.push(formatScheduleDto(s, examId, facultyList, roomsList));
    }
  }

  if (standardDtoList.length > 0) {
    const res = await apiClient.post(`/api/v1/examinations/${examId}/schedules`, standardDtoList);
    const standardCreated = res.data?.data ?? res.data ?? [];
    results.push(...ensureArray(standardCreated));
  }

  return results;
};

// Update existing schedule in backend DB
const updateScheduleInBackend = async (examId, scheduleId, scheduleData, facultyList = [], roomsList = []) => {
  const targetIds = ensureArray(scheduleData?.allScheduleIds || [scheduleId]).filter(Boolean);
  let lastRes = null;
  for (let i = 0; i < targetIds.length; i++) {
    const sId = targetIds[i];
    const isNumericScheduleId = !isNaN(Number(sId)) && Number(sId) > 0 && !String(sId).startsWith("sch-");
    if (isNumericScheduleId) {
      const subIdForThis = scheduleData?.allSubjectIds?.[i] ?? scheduleData?.subjectId;
      const dto = formatScheduleDto({
        ...scheduleData,
        id: sId,
        ...(subIdForThis ? { subjectId: subIdForThis } : {}),
      }, examId, facultyList, roomsList);
      const res = await apiClient.put(`/api/v1/examinations/${examId}/schedules/${sId}`, dto);
      lastRes = res.data?.data ?? res.data;
    }
  }
  if (!lastRes) {
    const dto = formatScheduleDto(scheduleData, examId, facultyList, roomsList);
    const res = await apiClient.post(`/api/v1/examinations/${examId}/schedules`, [dto]);
    lastRes = res.data?.data ?? res.data;
  }
  return lastRes;
};

// Delete schedule from backend DB
const deleteScheduleFromBackend = async (examId, scheduleId) => {
  if (!scheduleId) return;
  const isNumericScheduleId = !isNaN(Number(scheduleId)) && Number(scheduleId) > 0 && !String(scheduleId).startsWith("sch-") && !String(scheduleId).startsWith("draft-");
  if (isNumericScheduleId) {
    const res = await apiClient.delete(`/api/v1/examinations/${examId}/schedules/${scheduleId}`);
    return res.data;
  }
  return { success: true };
};

const normalizeExamRecord = (e) => {
  const id = normalizeId(e?.examinationId ?? e?.id);
  const rawLevels =
    e?.academicLevelIds ??
    e?.levelIds ??
    e?.academicLevelId ??
    e?.levelId ??
    (Array.isArray(e?.academicLevels) ? e.academicLevels.map((l) => l.id || l.academicLevelId) : null) ??
    (e?.academicLevel?.id ? [e.academicLevel.id] : null);
  const levelIds = ensureArray(rawLevels).map(normalizeId).filter(Boolean);
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
  const rawCat =
    e?.examCategory ??
    e?.category ??
    e?.examinationCategory ??
    e?.exam_category ??
    e?.categoryName ??
    e?.rawCategory;

  const resolvedExamCategory = rawCat ? String(rawCat).trim() : (getResolvedExamCategory(e) || "Regular");
  const pat = e?.examPattern ?? e?.pattern ?? "";
  const rawGroupPatterns = e?.selectedGroupPatterns || {};
  const selectedGroupPatterns = { ...rawGroupPatterns };
  if (pat && Object.keys(selectedGroupPatterns).length === 0) {
    groupIds.forEach((gid) => {
      selectedGroupPatterns[String(gid)] = [pat];
    });
  }

  return {
    id,
    code: e?.examCode ?? e?.code ?? "",
    name: e?.examName ?? e?.name ?? "Examination",
    examCategory: resolvedExamCategory,
    customCategoryName: e?.customCategoryName || "",
    boardId: normalizeId(e?.boardId),
    yearId: normalizeId(e?.academicYearId ?? e?.yearId),
    academicYearId: normalizeId(e?.academicYearId ?? e?.yearId),
    academicLevelIds: levelIds,
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
    groupSubjectSelections: e?.groupSubjectSelections || {},
    selectedSubjectDetails: ensureArray(e?.selectedSubjectDetails),
    groupProgramSelections: e?.groupProgramSelections || [],
    examType: e?.examType || "",
    selectedGroupPatterns,
    examPattern: pat,
    startDate: e?.startDate ? String(e.startDate).split("T")[0] : "",
    endDate: e?.endDate ? String(e.endDate).split("T")[0] : "",
    description: e?.description || "",
    status: normalizeStatus(e?.status || "DRAFT"),
    scheduleMode:
      e?.scheduleMode || getExaminationScheduleMode(e),
    schedules: ensureArray(rawSchedules).map((entry) => ({
      ...normalizeScheduleRecord(entry, groupIds[0] || e?.groupId, e, [], selectedSubjectIds),
      examId: id,
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
    academicYears: contextAcademicYears = [],
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
      const normalized = raw.map((record) => normalizeExamRecord(record));
      setExams(normalized);
      const initialSchedules = normalized.flatMap((exam, index) =>
        Array.isArray(raw[index]?.schedules) || Array.isArray(raw[index]?.examinationSchedules)
          ? (exam.schedules || []).map((entry) => ({ ...entry, examId: exam.id }))
          : []
      );
      if (initialSchedules.length > 0) {
        setSchedules(initialSchedules);
      }
      // Concurrently fetch schedule rows for active examinations to ensure room/hall occupancy is fully known
      const activeExams = normalized.filter((e) => ["DRAFT", "SCHEDULED"].includes(e.status));
      Promise.allSettled(
        activeExams.map((e) =>
          apiClient.get(`/api/v1/examinations/${e.id}/schedules`, { signal }).then((res) => {
            const sRaw = unwrap(res);
            const fallbackGid = e.groupIds?.[0] || e.groupId;
            return sRaw.map((entry) => ({
              ...normalizeScheduleRecord(entry, fallbackGid, e, [], []),
              examId: e.id,
            }));
          }).catch(() => [])
        )
      ).then((results) => {
        if (signal.aborted) return;
        const fetchedSchedules = results
          .filter((r) => r.status === "fulfilled")
          .flatMap((r) => r.value);
        if (fetchedSchedules.length > 0) {
          setSchedules((prev) => {
            const map = new Map();
            prev.forEach((s) => map.set(normalizeId(s.id), s));
            fetchedSchedules.forEach((s) => map.set(normalizeId(s.id), s));
            return Array.from(map.values());
          });
        }
      });
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

  // Robust Room & Exam Hall Fetching via GET /api/v1/rooms
  const fetchRoomsList = useCallback(async (filters = {}) => {
    try {
      const params = {};
      if (filters?.building) params.Building = filters.building;
      if (filters?.blockName || filters?.block) params.BlockName = filters.blockName || filters.block;
      if (filters?.floor) params.Floor = filters.floor;
      if (filters?.roomType) params.RoomType = filters.roomType;
      if (filters?.status) params.Status = filters.status;
      if (filters?.isActive !== undefined) params.IsActive = filters.isActive;
      if (filters?.search || filters?.searchTerm) params.SearchTerm = filters.search || filters.searchTerm;

      const response = await apiClient.get("/api/v1/rooms", {
        params: Object.keys(params).length ? params : undefined,
      });

      const rawRoomsList = unwrap(response);
      const seenKeys = new Set();
      const normalizedRooms = [];

      for (const r of rawRoomsList) {
        if (!r) continue;
        const id = normalizeId(r.roomId ?? r.RoomId ?? r.id ?? r.Id ?? r._id);
        const roomNo = String(r.roomNumber ?? r.RoomNumber ?? r.roomCode ?? r.RoomCode ?? r.roomNo ?? r.RoomNo ?? "").trim();
        const dedupKey = id || roomNo.toLowerCase();
        if (!dedupKey || seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);

        const rawName = String(r.roomName ?? r.RoomName ?? r.name ?? r.Name ?? "").trim();
        const roomName = rawName || (roomNo ? `Room ${roomNo}` : `Room ${id}`);
        const roomType = String(r.roomType ?? r.RoomType ?? r.type ?? r.Type ?? r.room_type ?? "Classroom").trim();
        const capacity = Number(r.capacity ?? r.Capacity ?? r.roomCapacity ?? r.maxCapacity ?? 0) || 0;
        const blockName = String(r.blockName ?? r.BlockName ?? r.buildingName ?? r.BuildingName ?? r.building ?? r.Building ?? r.block ?? r.Block ?? "").trim();
        const floor = String(r.floor ?? r.Floor ?? "").trim();

        const rawIsActive = r.isActive ?? r.IsActive;
        const rawStatus = r.status ?? r.Status;
        const isAct =
          rawIsActive === true ||
          String(rawIsActive) === "1" ||
          String(rawIsActive).toLowerCase() === "true" ||
          String(rawStatus || "").toLowerCase() === "active" ||
          String(rawStatus || "").toLowerCase() === "enabled" ||
          (rawIsActive == null && rawStatus == null);

        const status = isAct ? "Active" : "Inactive";

        normalizedRooms.push({
          id: id || `room-${dedupKey}`,
          roomId: id,
          name: roomName,
          roomName,
          roomNumber: roomNo || roomName,
          roomCode: String(r.roomCode ?? r.RoomCode ?? "").trim(),
          capacity: capacity || 40,
          roomType: roomType || "Classroom",
          type: roomType || "Classroom",
          blockName,
          block: blockName,
          building: blockName,
          buildingName: blockName,
          floor,
          levelId: r.levelId || r.LevelId ? normalizeId(r.levelId ?? r.LevelId) : "ALL",
          status,
          isActive: isAct,
        });
      }

      setRooms(normalizedRooms);
      return normalizedRooms;
    } catch (e) {
      console.warn("fetchRoomsList encountered an issue:", e);
      return [];
    }
  }, []);

  // 1. Initial Mount: Active Boards, Patterns, Exam Types, Rooms, Faculty, Academic Levels, Groups, Students
  useEffect(() => {
    let isMounted = true;
    const fetchInitialMasterData = async () => {
      setLoading(true);
      try {
        const [boardsRes, yearsRes, patternsRes, typesRes, facultyRes, levelsRes, groupsRes, subjectsRes] =
          await Promise.allSettled([
            apiClient.get("/api/v1/boards/active").catch(() => apiClient.get("/api/v1/boards")),
            apiClient.get("/api/v1/academic-years").catch(() => null),
            apiClient.get("/api/v1/examinations/patterns"),
            apiClient.get("/api/v1/examinations/types"),
            apiClient.get("/api/v1/staff", { params: { staffType: "Teaching" } }),
            apiClient.get("/api/v1/academic-levels"),
            apiClient.get("/api/v1/groups"),
            apiClient.get("/api/v1/subjects").catch(() => null),
          ]);

        if (!isMounted) return;

        // Fetch students and enrich with admissions
        await fetchStudentsList();
        // Fetch active classrooms and examination halls
        await fetchRoomsList();

        if (boardsRes.status === "fulfilled") {
          const rawBoards = unwrap(boardsRes.value);
          const isGuaranteedActive = Boolean(boardsRes.value?.config?.url?.includes("/active"));
          const activeBoards = rawBoards
            .filter((b) => isEntityActive(b, isGuaranteedActive))
            .map((b) => ({
              id: normalizeId(b.boardId ?? b.id),
              name: b.boardName ?? b.name,
              code: b.boardCode ?? b.code ?? "",
              status: b.status,
              isActive: true,
            }));
          setBoards(activeBoards);
        }

        if (yearsRes?.status === "fulfilled" && yearsRes.value) {
          const rawYears = unwrap(yearsRes.value);
          const mappedYears = rawYears
            .map((y) => ({
              id: normalizeId(y.academicYearId ?? y.id),
              name: y.academicYearName ?? y.yearName ?? y.name,
              code: y.code ?? y.academicYearName ?? y.name,
              boardId: normalizeId(y.boardId),
              isActive: y.isActive !== false,
            }))
            .filter((y) => y.name);
          if (mappedYears.length > 0) {
            setAcademicYears(mappedYears);
          }
        }

        if (patternsRes.status === "fulfilled") {
          setMasterPatterns(unwrap(patternsRes.value));
        }

        if (typesRes.status === "fulfilled") {
          setExamTypes(unwrap(typesRes.value));
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

        if (subjectsRes?.status === "fulfilled" && subjectsRes.value) {
          const rawSubjects = unwrap(subjectsRes.value);
          setEligibleSubjects(
            ensureArray(rawSubjects).map((s) => ({
              id: normalizeId(s.subjectId ?? s.id),
              name: s.subjectName ?? s.name,
              code: s.subjectCode ?? s.code ?? "",
              academicLevelIds: ensureArray(s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [])).map(normalizeId),
              groupIds: ensureArray(s.groupIds || (s.groupId ? [s.groupId] : [])).map(normalizeId),
              programIds: ensureArray(s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId),
              facultyIds: ensureArray(s.facultyIds || (s.facultyId ? [s.facultyId] : [])).map(normalizeId),
              isActive: s.isActive !== false,
            })),
          );
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
  }, [showToast, loadExaminations, fetchRoomsList, fetchStudentsList]);

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
          const origScope = canonicalizeScope(original);
          const newScope = canonicalizeScope(newRecord);
          const changedScope =
            JSON.stringify(origScope) !== JSON.stringify(newScope) ||
            getResolvedExamCategory(original) !== getResolvedExamCategory(newRecord) ||
            (original.examPattern || "") !== (newRecord.examPattern || "");
          if (persisted.length && changedScope) throw new Error("Remove the persisted schedules before changing Groups, Programs, Subjects, or Pattern.");
          if (newRecord.boardId !== original.boardId || newRecord.yearId !== original.yearId) throw new Error("Board and Academic Year cannot be changed when editing.");

          // Identify schedules falling outside the new examination window
          const outOfRange = persisted.filter((s) => {
            const sDate = canonicalDate(s.examDate || s.date);
            return sDate && (sDate < newRecord.startDate || sDate > newRecord.endDate);
          });
          if (outOfRange.length > 0) {
            if (isCombinedExamination(newRecord)) {
              for (const s of outOfRange) {
                const sId = s.examScheduleId || s.id;
                if (sId) {
                  await updateScheduleInBackend(editingExamId, sId, {
                    ...s,
                    date: newRecord.startDate,
                    examDate: newRecord.startDate,
                  }, faculty, rooms);
                }
              }
            } else {
              for (const s of outOfRange) {
                const sId = s.examScheduleId || s.id;
                if (sId) {
                  await deleteScheduleFromBackend(editingExamId, sId);
                }
              }
            }
          }

          await apiClient.put(`/api/v1/examinations/${editingExamId}`, {
            examName: newRecord.name,
            name: newRecord.name,
            examCategory: newRecord.examCategory,
            category: newRecord.examCategory,
            examinationCategory: newRecord.examCategory,
            exam_category: newRecord.examCategory,
            categoryName: newRecord.examCategory,
            rawCategory: newRecord.rawCategory || newRecord.examCategory,
            customCategoryName: newRecord.customCategoryName,
            boardId: Number(newRecord.boardId) || newRecord.boardId,
            academicYearId: Number(newRecord.yearId) || newRecord.yearId,
            academicLevelIds: newRecord.levelIds.map((id) => Number(id) || id),
            groupIds: newRecord.groupIds.map((id) => Number(id) || id),
            programIds: newRecord.programIds.map((id) => Number(id) || id),
            selectedSubjectIds: newRecord.selectedSubjectIds.map((id) => Number(id) || id),
            groupProgramSelections: newRecord.groupProgramSelections,
            examPattern: newRecord.examPattern,
            pattern: newRecord.examPattern,
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
            name: newRecord.name,
            examCategory: newRecord.examCategory,
            category: newRecord.examCategory,
            examinationCategory: newRecord.examCategory,
            exam_category: newRecord.examCategory,
            categoryName: newRecord.examCategory,
            rawCategory: newRecord.rawCategory || newRecord.examCategory,
            customCategoryName: newRecord.customCategoryName,
            boardId: Number(newRecord.boardId) || newRecord.boardId,
            academicYearId: Number(newRecord.yearId) || newRecord.yearId,
            academicLevelIds: newRecord.levelIds.map((id) => Number(id) || id),
            groupIds: newRecord.groupIds.map((id) => Number(id) || id),
            programIds: newRecord.programIds.map((id) => Number(id) || id),
            selectedSubjectIds: newRecord.selectedSubjectIds.map((id) => Number(id) || id),
            groupProgramSelections: newRecord.groupProgramSelections,
            examPattern: newRecord.examPattern,
            pattern: newRecord.examPattern,
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

          let createdRecord = null;
          try {
            const detailRes = await apiClient.get(`/api/v1/examinations/${createdId}`);
            const backendExam = unwrap(detailRes);
            if (backendExam && (backendExam.id || backendExam.examinationId)) {
              createdRecord = normalizeExamRecord(backendExam);
            }
          } catch {
            // Fallback to normalized payload if direct fetch unavailable
          }

          const draftRecord = createdRecord || normalizeExamRecord({
            ...newRecord,
            ...createdPayload,
            id: createdId,
            examinationId: createdId,
            status: "DRAFT",
          });

          setExams((prev) => [draftRecord, ...prev.filter((e) => normalizeId(e.id) !== createdId)]);
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
              groupId: norm.groupId,
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
        await updateScheduleInBackend(targetExamId, isEditingId, newSchedules[0], faculty, rooms);
      } else {
        await saveSchedulesToBackend(targetExamId, newSchedules, faculty, rooms);
      }
      const response = await apiClient.get("/api/v1/examinations/" + targetExamId + "/schedules");
      const examCtx = currentExam || exams.find((e) => normalizeId(e.id) === normalizeId(targetExamId));
      const fallbackGid = examCtx?.groupIds?.[0] || examCtx?.groupId || groups[0]?.id;
      const records = unwrap(response).map((entry) => ({
        ...normalizeScheduleRecord(entry, fallbackGid, examCtx, groups, eligibleSubjects, rooms, faculty, programs, students),
        examId: normalizeId(targetExamId),
      }));
      if (records.some((entry) => !entry.id) || (!isEditingId && !records.length)) throw new Error("The backend did not return persisted schedules. Reload before trying again.");
      setSchedules((previous) => [...previous.filter((entry) => entry.examId !== normalizeId(targetExamId)), ...records]);
      if (newSchedules.some((entry) => entry.scheduleMode === "PATTERN_WISE") && records.some((entry) => entry.combinedConfigurationVerified === false)) {
        throw new Error("The server wrote a session but returned only a scalar subject. Combined subject/group/pattern persistence is incomplete. Do not retry creation; backend support is required to correct this saved session.");
      }
      setEditing(null);
      setSch((previous) => ({ ...previous, subjectId: "", patternName: "", date: "", hallAssignments: [] }));
      setErrors({});
      showToast("Schedule saved successfully.", "success");
      return true;
    } catch (error) {
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
    handleSaveSchedules([updatedSchedule], updatedSchedule.id, true);

  // Delete schedule from backend DB
  const handleDeleteSchedule = async () => {
    if (!removeSchedule || deleteScheduleLoading || mutationRef.current) return;
    const owner = exams.find((exam) => exam.id === normalizeId(removeSchedule.examId || examId));
    if (!owner || !["DRAFT", "SCHEDULED"].includes(owner.status)) return;
    const targetExamId = removeSchedule.examId || examId;
    try {
      mutationRef.current = true;
      setDeleteScheduleLoading(true);
      const idsToDelete = ensureArray(removeSchedule.allScheduleIds || removeSchedule.scheduleIds || [removeSchedule.id]).filter(Boolean);
      for (const sId of idsToDelete) {
        await deleteScheduleFromBackend(targetExamId, sId);
      }
      setSchedules((prev) => prev.filter((item) => !idsToDelete.map(String).includes(String(item.id))));
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
        academicYears={academicYears.length > 0 ? academicYears : contextAcademicYears}
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
                {examsLoading || loading ? (
                  <ExaminationTableSkeleton />
                ) : shownExams.length ? (
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
                                const currentCtxBoardId = normalizeId(selectedBoardId ?? (selectedBoard?.boardId ?? selectedBoard?.id));
                                const currentCtxYearId = normalizeId(selectedAcademicYearId ?? (selectedAcademicYear?.academicYearId ?? selectedAcademicYear?.id));
                                if (e.boardId && currentCtxBoardId && normalizeId(e.boardId) !== currentCtxBoardId) {
                                  showToast("Please switch to the matching Board in the navigation bar before scheduling this examination.", "warning");
                                  return;
                                }
                                if (e.yearId && currentCtxYearId && normalizeId(e.yearId) !== currentCtxYearId) {
                                  showToast("Please switch to the matching Academic Year in the navigation bar before scheduling this examination.", "warning");
                                  return;
                                }
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
                                const currentCtxBoardId = normalizeId(selectedBoardId ?? (selectedBoard?.boardId ?? selectedBoard?.id));
                                const currentCtxYearId = normalizeId(selectedAcademicYearId ?? (selectedAcademicYear?.academicYearId ?? selectedAcademicYear?.id));
                                if (e.boardId && currentCtxBoardId && normalizeId(e.boardId) !== currentCtxBoardId) {
                                  showToast("Please switch to the matching Board in the navigation bar before editing this examination.", "warning");
                                  return;
                                }
                                if (e.yearId && currentCtxYearId && normalizeId(e.yearId) !== currentCtxYearId) {
                                  showToast("Please switch to the matching Academic Year in the navigation bar before editing this examination.", "warning");
                                  return;
                                }
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
                        {examsError ? (
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
              const targetExam = exams.find((e) => normalizeId(e.id) === normalizeId(s.examId)) || currentExam;
              const reqStrength = getRequiredCandidateStrength(targetExam, s.groupId, programs, false, students, {
                subjectId: s.subjectId,
                includedSubjectIds: s.includedSubjectIds,
              });
              const rawAssignments = ensureArray(s.hallAssignments);
              let finalAssignments = rawAssignments.map((a) => ({
                ...a,
                hallId: a.hallId ? String(a.hallId) : (s.roomId || s.hallId ? String(s.roomId || s.hallId) : ""),
                candidateCount: Number(a.candidateCount) || Number(s.candidateCount) || reqStrength || 0,
                invigilatorIds: (a.invigilatorIds && a.invigilatorIds.length > 0)
                  ? a.invigilatorIds.map(String)
                  : ((s.invigilatorId || s.facultyId) ? [String(s.invigilatorId || s.facultyId)] : []),
              }));
              if (finalAssignments.length === 0 && (s.roomId || s.hallId || s.roomNumber || s.roomName || s.hall)) {
                finalAssignments = [
                  {
                    id: `hall-${s.roomId || s.hallId || Date.now()}`,
                    hallId: s.roomId || s.hallId ? String(s.roomId || s.hallId) : "",
                    hallName: s.roomNumber || s.hall || s.roomName || "",
                    candidateCount: Number(s.candidateCount || s.allocatedCount || s.totalCandidates || reqStrength) || reqStrength || 0,
                    invigilatorIds: (s.invigilatorId || s.facultyId) ? [String(s.invigilatorId || s.facultyId)] : [],
                  },
                ];
              }
              setSch({
                ...s,
                groupId: String(s.groupId || ""),
                subjectId: String(s.subjectId || ""),
                patternName: String(s.patternName || ""),
                date: s.date ? String(s.date).split("T")[0] : (s.examDate ? String(s.examDate).split("T")[0] : ""),
                startTime: s.startTime ? (s.startTime.length === 5 ? s.startTime : s.startTime.slice(0, 5)) : "09:00",
                endTime: s.endTime ? (s.endTime.length === 5 ? s.endTime : s.endTime.slice(0, 5)) : "12:00",
                totalMarks: String(s.totalMarks || s.maxMarks || "100"),
                passingMarks: String(s.passingMarks ?? "35"),
                passPercentage: String(s.passPercentage || "35"),
                hallAssignments: finalAssignments,
                allScheduleIds: s.allScheduleIds || [s.id],
              });
              setEditing(s.id);
              setErrors({});
              try {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } catch {
                /* ignore scroll error */
              }
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
            onRefreshRooms={fetchRoomsList}
            setSchedules={setSchedules}
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
              const examId = editingExam.id;
              // 1. Fetch current persisted schedules from backend
              let existingSchedules = [];
              try {
                const schedRes = await apiClient.get(`/api/v1/examinations/${examId}/schedules`);
                existingSchedules = unwrap(schedRes);
              } catch (e) {
                existingSchedules = schedules.filter((s) => normalizeId(s.examId) === normalizeId(examId));
              }

              // 2. Identify schedules that fall outside the new examination window [period.startDate, period.endDate]
              const outOfRange = existingSchedules.filter((s) => {
                const sDate = canonicalDate(s.examDate || s.date);
                return sDate && (sDate < period.startDate || sDate > period.endDate);
              });

              // 3. If out of range schedules exist, delete them first from backend so PUT doesn't reject with 400
              if (outOfRange.length > 0) {
                for (const s of outOfRange) {
                  const sId = s.examScheduleId || s.id;
                  if (sId) {
                    try {
                      await deleteScheduleFromBackend(examId, sId);
                    } catch (delErr) {
                      // Silently continue deleting remaining
                    }
                  }
                }
              }

              // 4. Update the examination record
              await apiClient.put(`/api/v1/examinations/${examId}`, {
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

              // 5. For combined/objective examinations, re-create the session on the new start date
              const isComb = isCombinedExamination(editingExam);
              if (isComb && outOfRange.length > 0) {
                try {
                  const targetGid = editingExam.groupIds?.[0] || editingExam.groupId;
                  const firstSched = outOfRange[0];
                  const remapped = [
                    {
                      id: "draft-recreated-entry",
                      examId,
                      groupId: targetGid,
                      patternName: editingExam.examPattern || firstSched.patternName,
                      includedSubjectIds: (editingExam.selectedSubjectIds || []).map(String),
                      date: period.startDate,
                      startTime: firstSched.startTime || "09:00:00",
                      endTime: firstSched.endTime || "12:00:00",
                      totalMarks: firstSched.totalMarks || firstSched.maxMarks || "300",
                      passPercentage: firstSched.passPercentage || "40",
                      passingMarks: firstSched.passingMarks || "35",
                      hallAssignments: [
                        {
                          hallId: firstSched.roomId ? String(firstSched.roomId) : "",
                          hallName: firstSched.roomNumber || firstSched.hall || "",
                          candidateCount: Number(firstSched.candidateCount) || getRequiredCandidateStrength(editingExam, targetGid, programs, false, students) || 0,
                          invigilatorIds: firstSched.invigilatorId ? [String(firstSched.invigilatorId)] : [],
                        },
                      ],
                      roomId: firstSched.roomId,
                      hall: firstSched.roomNumber || firstSched.hall,
                      invigilatorId: firstSched.invigilatorId,
                      invigilator: firstSched.invigilatorName || firstSched.invigilator,
                      mode: firstSched.examMode || editingExam.examCategory || "Objective",
                      scheduleMode: "PATTERN_WISE",
                    },
                  ];
                  await saveSchedulesToBackend(examId, remapped, faculty);
                } catch (recreateErr) {
                  // If re-creation failed, schedules list will be reloaded
                }
              }

              await loadExaminations();
              setEditingExam(null);
              showToast("Examination period updated successfully.", "success");
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
  placeholder,
  showSearch = true,
  emptyText,
  onRefresh,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const selectedOpt = useMemo(() => {
    return options.find((o) => String(o.id) === String(value));
  }, [options, value]);

  useEffect(() => {
    if (selectedOpt) {
      setSearch(selectedOpt.name || "");
    } else if (!value) {
      setSearch("");
    }
  }, [selectedOpt, value]);

  const commitMatch = useCallback((currentSearch) => {
    if (disabled) return;
    const q = (currentSearch ?? search ?? "").trim().toLowerCase();
    if (!q) {
      if (!selectedOpt) setSearch("");
      return;
    }
    const exact = options.find((o) => o.name.toLowerCase() === q || String(o.id).toLowerCase() === q);
    if (exact) {
      setSearch(exact.name || "");
      if (String(exact.id) !== String(value)) {
        onChange?.(exact.id);
      }
    } else {
      const partial = options.find((o) => o.name.toLowerCase().includes(q));
      if (partial) {
        setSearch(partial.name || "");
        if (String(partial.id) !== String(value)) {
          onChange?.(partial.id);
        }
      } else if (selectedOpt) {
        setSearch(selectedOpt.name || "");
      } else {
        setSearch("");
      }
    }
  }, [search, options, selectedOpt, onChange, disabled, value]);

  useEffect(() => {
    if (disabled) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        commitMatch();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [commitMatch, disabled]);

  const filteredOptions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q || (selectedOpt && selectedOpt.name && selectedOpt.name.toLowerCase() === q)) {
      return options;
    }
    return options.filter((o) =>
      String(o.name || "").toLowerCase().includes(q),
    );
  }, [options, search, selectedOpt]);

  const handleSelect = (opt) => {
    setSearch(opt.name || "");
    onChange?.(opt.id);
    setOpen(false);
  };

  const dynamicPlaceholder = placeholder || `Search or select ${String(label || "option").toLowerCase().replace(" *", "")}...`;

  return (
    <div className={`cms-field ${error ? "has-error" : ""}`} ref={ref}>
      {label && <label>{label}</label>}
      <div className="cms-searchable-select">
        <div
          className={`cms-searchable-select-trigger staff-search-input-wrap ${open ? "is-active" : ""}`}
          style={{ ...(error ? { borderColor: "#ef4444" } : {}), cursor: disabled ? "not-allowed" : "pointer" }}
          onClick={() => {
            if (disabled) return;
            if (options.length === 0 && onRefresh) {
              onRefresh();
            }
            setOpen((prev) => !prev);
            const inputEl = ref.current?.querySelector("input");
            if (inputEl) inputEl.focus();
          }}
        >
          <Search className="staff-search-icon" aria-hidden="true" size={14} />
          <input
            type="text"
            disabled={disabled}
            value={search}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) setOpen(true);
            }}
            onFocus={(e) => {
              if (disabled) return;
              setOpen(true);
              try {
                e.target.select();
              } catch {
                /* ignore focus error */
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              setOpen(true);
              const exact = options.find((o) => o.name.toLowerCase() === val.trim().toLowerCase());
              if (exact) {
                onChange?.(exact.id);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  handleSelect(filteredOptions[0]);
                } else {
                  commitMatch();
                  setOpen(false);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={dynamicPlaceholder}
            autoComplete="off"
          />
          <ChevronDown
            className="staff-dropdown-caret"
            size={14}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              setOpen((prev) => !prev);
              const inputEl = ref.current?.querySelector("input");
              if (inputEl) inputEl.focus();
            }}
          />
        </div>

        {open && !disabled && (
          <div
            className="cms-searchable-select-dropdown staff-search-dropdown-menu"
            style={{
              backgroundColor: "#ffffff",
              background: "#ffffff",
              opacity: 1,
              zIndex: 100000,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)",
              border: "1.5px solid var(--cms-border, #d1d5db)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div className="cms-searchable-select-options" role="listbox" style={{ background: "#ffffff", opacity: 1, maxHeight: "220px", overflowY: "auto" }}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.id) === String(value);
                  return (
                    <div
                      key={opt.id}
                      className={`cms-searchable-select-option staff-search-dropdown-item ${isSelected ? "selected is-selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      title={opt.name}
                      style={{
                        backgroundColor: isSelected ? "var(--cms-primary-soft, #f0fdf4)" : "#ffffff",
                        color: isSelected ? "var(--cms-primary, #6F8400)" : "var(--cms-text, #1e293b)",
                        fontWeight: isSelected ? "600" : "normal",
                        cursor: "pointer",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(opt);
                      }}
                    >
                      <span>{opt.name}</span>
                      {isSelected && <Check size={14} style={{ color: "#6F8400" }} />}
                    </div>
                  );
                })
              ) : (
                <div className="cms-searchable-no-options staff-search-dropdown-empty" style={{ backgroundColor: "#ffffff", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px", alignItems: "center", textAlign: "center" }}>
                  <span>{emptyText || "No options found"}</span>
                  {onRefresh && (
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      style={{ fontSize: "11px", padding: "2px 8px", height: "auto", minHeight: "22px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefresh();
                      }}
                    >
                      <RefreshCw size={11} style={{ marginRight: "4px" }} /> Refresh Options
                    </button>
                  )}
                </div>
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
          <div
            className="cms-searchable-select-dropdown"
            style={{
              backgroundColor: "#ffffff",
              background: "#ffffff",
              opacity: 1,
              zIndex: 100000,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)",
              border: "1.5px solid var(--cms-border, #d1d5db)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div className="cms-searchable-select-search" style={{ backgroundColor: "#ffffff" }}>
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
    academicYears: contextAcademicYears = [],
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

  const contextBoardId = useMemo(() => {
    const raw = selectedBoardId ?? (selectedBoard?.boardId ?? selectedBoard?.id);
    return raw ? normalizeId(raw) : "";
  }, [selectedBoardId, selectedBoard]);

  const contextYearId = useMemo(() => {
    const raw = selectedAcademicYearId ?? (selectedAcademicYear?.academicYearId ?? selectedAcademicYear?.id);
    return raw ? normalizeId(raw) : "";
  }, [selectedAcademicYearId, selectedAcademicYear]);

  const isContextBoardActive = useMemo(() => {
    if (!contextBoardId) return false;
    if (boards.length === 0) return true;
    return boards.some((b) => normalizeId(b.id) === contextBoardId);
  }, [boards, contextBoardId]);

  const defaultBoardId = useMemo(() => {
    if (!contextBoardId) return "";
    if (boards.length > 0 && !boards.some((b) => normalizeId(b.id) === contextBoardId)) {
      return "";
    }
    return contextBoardId;
  }, [boards, contextBoardId]);

  const availableYears = useMemo(() => {
    const list = [...ensureArray(academicYears), ...ensureArray(contextAcademicYears)];
    if (selectedAcademicYear) {
      const curId = normalizeId(selectedAcademicYearId ?? selectedAcademicYear.id);
      const curName = selectedAcademicYear.name || selectedAcademicYear.code || selectedAcademicYear.academicYearName;
      if (curId && !list.some((y) => normalizeId(y.id) === curId)) {
        list.unshift({ id: curId, name: curName || `Academic Year ${curId}`, code: curName || `Academic Year ${curId}` });
      }
    }
    if (existing) {
      const exYearId = normalizeId(existing.yearId ?? existing.academicYearId);
      const exYearName = existing.academicYearName || existing.yearName || nameOf(academicYears, exYearId) || `Academic Year ${exYearId}`;
      if (exYearId && !list.some((y) => normalizeId(y.id) === exYearId)) {
        list.unshift({ id: exYearId, name: exYearName, code: exYearName });
      }
    }
    const seen = new Set();
    return list.filter((y) => {
      const k = normalizeId(y.id);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [academicYears, contextAcademicYears, selectedAcademicYear, selectedAcademicYearId, existing]);

  const defaultYearId = useMemo(() => {
    return contextYearId || "";
  }, [contextYearId]);

  const [formYears, setFormYears] = useState(availableYears);
  const [formLevels, setFormLevels] = useState([]);
  const [formGroups, setFormGroups] = useState([]);
  const [formPrograms, setFormPrograms] = useState([]);
  const [formEligibleSubjects, setFormEligibleSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState(null);
  const subjectRequestSeqRef = useRef("");

  const initialLevelIds = useMemo(() => {
    if (!existing) return [];
    const raw =
      (existing.levelIds?.length ? existing.levelIds : null) ??
      (existing.academicLevelIds?.length ? existing.academicLevelIds : null) ??
      (existing.levelId ? [existing.levelId] : null) ??
      (existing.academicLevelId ? [existing.academicLevelId] : null) ??
      (Array.isArray(existing.academicLevels) ? existing.academicLevels.map((l) => l.id || l.academicLevelId) : null);
    const ids = ensureArray(raw).map(normalizeId).filter(Boolean);
    if (ids.length > 0) return ids;
    if (existing.academicLevelName || existing.levelName) {
      const targetName = String(existing.academicLevelName || existing.levelName).trim().toLowerCase();
      const matched = (academicLevels || []).find(
        (l) => String(l.name || l.academicLevelName || "").trim().toLowerCase() === targetName,
      );
      if (matched) return [normalizeId(matched.id)];
    }
    return [];
  }, [existing, academicLevels]);

  const initialGroupPatterns = useMemo(() => {
    if (!existing) return {};
    const map = { ...(existing.selectedGroupPatterns || {}) };
    const pat = existing.examPattern || existing.pattern;
    if (pat) {
      const gids = ensureArray(existing.groupIds || (existing.groupId ? [existing.groupId] : []));
      gids.forEach((gid) => {
        const k = normalizeId(gid);
        if (!map[k] || !map[k].length) map[k] = [pat];
      });
    }
    return map;
  }, [existing]);

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
        boardId: normalizeId(existing.boardId || defaultBoardId),
        yearId: normalizeId(existing.yearId ?? existing.academicYearId ?? defaultYearId),
        academicYearId: normalizeId(existing.yearId ?? existing.academicYearId ?? defaultYearId),
        examCategory: initialCategory,
        customCategoryName: initialCustomCategory,
        levelIds: initialLevelIds,
        levelId: initialLevelIds[0] || "",
        groupIds: existing.groupIds || (existing.groupId ? [existing.groupId] : []),
        programIds: existing.programIds || (existing.programId ? [existing.programId] : []),
        selectedSubjectIds: existing.selectedSubjectIds || [],
        groupProgramSelections: initialGroupProgramSelections,
        selectedGroupPatterns: initialGroupPatterns,
        examPattern: existing.examPattern || existing.pattern || "",
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
    setForm((previous) => {
      const nextBoardId = defaultBoardId || "";
      const nextYearId = defaultYearId || "";

      // If context board changes or clears:
      if (normalizeId(previous.boardId) !== normalizeId(nextBoardId)) {
        return {
          ...previous,
          boardId: nextBoardId,
          yearId: nextYearId,
          levelId: "",
          levelIds: [],
          groupId: "",
          groupIds: [],
          programId: "",
          programIds: [],
          selectedSubjectIds: [],
          groupProgramSelections: {},
          selectedGroupPatterns: {},
        };
      }

      // If only context year changes:
      if (normalizeId(previous.yearId) !== normalizeId(nextYearId)) {
        return {
          ...previous,
          yearId: nextYearId,
        };
      }

      return previous;
    });
  }, [defaultBoardId, defaultYearId, existing]);

  useEffect(() => {
    if (!existing) return;
    setForm((prev) => {
      const updates = {};
      const targetYear = normalizeId(existing.yearId ?? existing.academicYearId);
      if (targetYear && normalizeId(prev.yearId) !== targetYear) {
        updates.yearId = targetYear;
        updates.academicYearId = targetYear;
      }
      if ((!prev.levelIds || prev.levelIds.length === 0) && initialLevelIds.length > 0) {
        updates.levelIds = initialLevelIds;
        updates.levelId = initialLevelIds[0];
      }
      if ((!prev.selectedSubjectIds || prev.selectedSubjectIds.length === 0) && existing.selectedSubjectIds?.length > 0) {
        updates.selectedSubjectIds = existing.selectedSubjectIds;
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [existing, initialLevelIds]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const todayStr = new Date().toISOString().split("T")[0];

  // Resolve hierarchy against backend records for the selected board.
  useEffect(() => {
    let active = true;
    if (!form.boardId) {
      setFormLevels([]);
      setFormGroups([]);
      setHierarchyLoading(false);
      setHierarchyError(null);
      return;
    }

    setHierarchyLoading(true);
    setHierarchyError(null);

    const load = async () => {
      try {
        const [yearsResponse, levelsResponse, groupsResponse] = await Promise.allSettled([
          apiClient.get("/api/v1/academic-years", { params: { boardId: form.boardId } }),
          apiClient.get("/api/v1/academic-levels", { params: { boardId: form.boardId } }),
          apiClient.get("/api/v1/groups/board/" + form.boardId),
        ]);
        if (!active) return;

        const belongsToBoard = (item) => item && item.isActive !== false && (!item.boardId || normalizeId(item.boardId) === normalizeId(form.boardId));

        // Process years
        if (yearsResponse.status === "fulfilled") {
          const unwrappedYears = unwrap(yearsResponse.value).filter(belongsToBoard).map((year) => ({
            ...year,
            id: normalizeId(year.academicYearId ?? year.id),
            name: year.academicYearName ?? year.yearName ?? year.name,
          }));
          if (selectedAcademicYear) {
            const curId = normalizeId(selectedAcademicYearId ?? selectedAcademicYear.id);
            const curName = selectedAcademicYear.name || selectedAcademicYear.code || selectedAcademicYear.academicYearName;
            if (curId && !unwrappedYears.some((y) => normalizeId(y.id) === curId)) {
              unwrappedYears.unshift({ id: curId, name: curName || `Academic Year ${curId}`, code: curName || `Academic Year ${curId}` });
            }
          }
          if (existing) {
            const exYearId = normalizeId(existing.yearId ?? existing.academicYearId);
            const exYearName = existing.academicYearName || existing.yearName || nameOf(academicYears, exYearId) || `Academic Year ${exYearId}`;
            if (exYearId && !unwrappedYears.some((y) => normalizeId(y.id) === exYearId)) {
              unwrappedYears.unshift({ id: exYearId, name: exYearName, code: exYearName });
            }
          }
          setFormYears(unwrappedYears);
        }

        // Process levels
        if (levelsResponse.status === "fulfilled") {
          const unwrappedLevels = unwrap(levelsResponse.value).filter(belongsToBoard).map((level) => ({
            ...level,
            id: normalizeId(level.academicLevelId ?? level.id),
            name: level.academicLevelName ?? level.levelName ?? level.name,
          }));
          if (existing) {
            const exLevelIds = ensureArray(existing.levelIds || existing.academicLevelIds || (existing.levelId ? [existing.levelId] : [])).map(normalizeId);
            exLevelIds.forEach((lid) => {
              if (lid && !unwrappedLevels.some((l) => normalizeId(l.id) === lid)) {
                const lName = nameOf(academicLevels, lid) || existing.academicLevelName || `Academic Level ${lid}`;
                unwrappedLevels.push({ id: lid, name: lName });
              }
            });
          }
          setFormLevels(unwrappedLevels);
        } else {
          setFormLevels([]);
          setHierarchyError("Failed to load academic levels for the selected Board.");
        }

        // Process groups
        if (groupsResponse.status === "fulfilled") {
          const unwrappedGroups = unwrap(groupsResponse.value).filter(belongsToBoard).map((group) => ({
            ...group,
            id: normalizeId(group.groupId ?? group.id),
            boardId: normalizeId(form.boardId),
            name: group.groupName ?? group.name,
            code: group.groupCode ?? group.code,
          }));
          // Valid empty response must be applied as empty array!
          setFormGroups(unwrappedGroups);
        } else {
          setFormGroups([]);
          setHierarchyError((prev) => prev || "Failed to load groups for the selected Board.");
        }
      } catch (error) {
        if (active) {
          setFormLevels([]);
          setFormGroups([]);
          setHierarchyError(getApiErrorMessage(error) || "Failed to load hierarchy.");
          showToast?.(getApiErrorMessage(error) || "Failed to load the selected Board's academic hierarchy.", "error");
        }
      } finally {
        if (active) setHierarchyLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [form.boardId, selectedAcademicYear, selectedAcademicYearId, showToast, existing, academicYears, academicLevels]);

  useEffect(() => {
    if (availableYears.length > 0) {
      setFormYears((prev) => {
        const merged = [...prev];
        availableYears.forEach((y) => {
          if (!merged.some((m) => normalizeId(m.id) === normalizeId(y.id))) {
            merged.push(y);
          }
        });
        return merged;
      });
    }
  }, [availableYears]);

  useEffect(() => {
    if (existing) return;
    const targetYearId = defaultYearId || normalizeId(selectedAcademicYearId ?? selectedAcademicYear?.id);
    if (!targetYearId) return;
    setForm((previous) => (previous.yearId === targetYearId ? previous : { ...previous, yearId: targetYearId }));
  }, [defaultYearId, selectedAcademicYearId, selectedAcademicYear, existing]);

  const availableGroups = useMemo(() => formGroups.filter((group) =>
    form.boardId && group.isActive !== false && normalizeId(group.boardId) === normalizeId(form.boardId)
  ), [formGroups, form.boardId]);

  const preferredGroupTab = useMemo(() => {
    if (existing) {
      const gid = existing.groupIds?.[0] || existing.groupId;
      if (gid) return normalizeId(gid);
    }
    return availableGroups[0]?.id || "";
  }, [existing, availableGroups]);

  // Group Tabs active tab state in Creation Form
  const [activeGroupTab, setActiveGroupTab] = useState(() => preferredGroupTab);

  useEffect(() => {
    if (availableGroups.length > 0) {
      const configuredGid = (form.groupIds || []).find((gid) =>
        availableGroups.some((g) => normalizeId(g.id) === normalizeId(gid)),
      );
      if (!activeGroupTab || !availableGroups.some((g) => normalizeId(g.id) === normalizeId(activeGroupTab))) {
        setActiveGroupTab(configuredGid ? normalizeId(configuredGid) : availableGroups[0].id);
      }
    }
  }, [availableGroups, activeGroupTab, form.groupIds]);

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
        selectedSubjectIds: prev.selectedSubjectIds || [],
        selectedGroupPatterns: prev.selectedGroupPatterns || {},
        examPattern: prev.examPattern || "",
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
        selectedSubjectIds: prev.selectedSubjectIds || [],
        selectedGroupPatterns: prev.selectedGroupPatterns || {},
        examPattern: prev.examPattern || "",
        groupIds: activeGroupIds,
        programIds: allSelectedProgramIds,
        groupId: activeGroupIds[0] || "",
        programId: allSelectedProgramIds[0] || "",
      };
    });
    setErrors((prev) => ({ ...prev, groupIds: undefined, programIds: undefined }));
  };

  // Load programs for all configured groups
  const groupIdsToFetchPrograms = useMemo(() => {
    const set = new Set();
    if (activeGroupTab) set.add(normalizeId(activeGroupTab));
    ensureArray(form.groupIds).forEach((gid) => gid && set.add(normalizeId(gid)));
    if (existing) {
      ensureArray(existing.groupIds).forEach((gid) => gid && set.add(normalizeId(gid)));
      if (existing.groupId) set.add(normalizeId(existing.groupId));
    }
    return Array.from(set);
  }, [activeGroupTab, form.groupIds, existing]);

  const groupIdsToFetchKey = useMemo(() => [...groupIdsToFetchPrograms].sort().join(","), [groupIdsToFetchPrograms]);

  useEffect(() => {
    if (!groupIdsToFetchPrograms.length || !form.boardId) return;
    let active = true;

    Promise.allSettled(
      groupIdsToFetchPrograms.map((gid) =>
        apiClient.get("/api/v1/groups/" + gid + "/programs").then((response) => {
          return unwrap(response)
            .filter((program) => program.isActive !== false && (!program.groupId || normalizeId(program.groupId) === normalizeId(gid)))
            .map((program) => ({
              ...program,
              id: normalizeId(program.programId ?? program.id),
              groupId: normalizeId(gid),
              name: program.programName ?? program.name,
              code: program.programCode ?? program.code,
            }));
        })
      )
    ).then((results) => {
      if (!active) return;
      const loaded = results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value);
      setFormPrograms((previous) => {
        const map = new Map();
        previous.forEach((p) => map.set(`${normalizeId(p.groupId)}_${normalizeId(p.id)}`, p));
        loaded.forEach((p) => map.set(`${normalizeId(p.groupId)}_${normalizeId(p.id)}`, p));
        return Array.from(map.values());
      });
    }).catch((error) => {
      if (active) showToast?.(getApiErrorMessage(error) || "Failed to load programs for the selected Groups.", "error");
    });

    return () => { active = false; };
  }, [groupIdsToFetchKey, groupIdsToFetchPrograms, form.boardId, showToast]);

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
    if (form.groupId) return [normalizeId(form.groupId)];
    return [];
  }, [form.groupProgramSelections, form.groupIds, form.groupId]);

  const groupsToFetchKey = useMemo(() => [...groupsToFetch].sort().join(","), [groupsToFetch]);

  useEffect(() => {
    if (!form.boardId || !groupsToFetch.length || !levelIdsKey) {
      setFormEligibleSubjects([]);
      setSubjectsLoading(false);
      setSubjectsError(null);
      return;
    }
    let active = true;
    setSubjectsLoading(true);
    setSubjectsError(null);

    const currentReqKey = `${form.boardId}_${groupsToFetchKey}_${levelIdsKey}`;
    subjectRequestSeqRef.current = currentReqKey;

    const fetchSubjects = async () => {
      try {
        const promises = [];
        groupsToFetch.forEach((gid) => {
          (form.levelIds || []).forEach((lid) => {
            promises.push(
              apiClient
                .get("/api/v1/subjects/context", {
                  params: {
                    boardId: form.boardId,
                    groupId: gid,
                    academicLevelId: lid,
                  },
                })
                .then((res) => ({ res, gid, lid }))
                .catch(() =>
                  apiClient
                    .get("/api/v1/subjects", {
                      params: {
                        boardId: form.boardId,
                        groupId: gid,
                        academicLevelId: lid,
                      },
                    })
                    .then((res) => ({ res, gid, lid }))
                )
            );
          });
        });

        const results = await Promise.all(promises);
        if (!active || subjectRequestSeqRef.current !== currentReqKey) return;

        const allMapped = [];
        const seenScoped = new Set();

        results.forEach(({ res, gid, lid }) => {
          const rawSubjects = unwrap(res);
          rawSubjects.forEach((s) => {
            const sid = normalizeId(s.subjectId ?? s.id);
            if (!sid) return;
            const scopedKey = `${sid}_${gid}_${lid}`;
            if (seenScoped.has(scopedKey)) return;
            seenScoped.add(scopedKey);

            const sLevelIds = ensureArray(s.academicLevelIds || (s.academicLevelId ? [s.academicLevelId] : [lid])).map(normalizeId);
            const sGroupIds = ensureArray(s.groupIds || (s.groupId ? [s.groupId] : (s.group ? [s.group.groupId || s.group.id] : [gid]))).map(normalizeId);

            allMapped.push({
              ...s,
              id: sid,
              name: s.subjectName ?? s.name,
              code: s.subjectCode ?? s.code ?? "",
              academicLevelIds: sLevelIds.includes(lid) ? sLevelIds : [...sLevelIds, lid],
              groupIds: sGroupIds.includes(gid) ? sGroupIds : [...sGroupIds, gid],
              programIds: (s.programIds || (s.programId ? [s.programId] : [])).map(normalizeId),
              facultyIds: (s.facultyIds || (s.facultyId ? [s.facultyId] : [])).map(normalizeId),
              isActive: s.isActive !== false,
            });
          });
        });

        setFormEligibleSubjects(allMapped);
        setSubjectsLoading(false);
      } catch (err) {
        if (active && subjectRequestSeqRef.current === currentReqKey) {
          setSubjectsError(getApiErrorMessage(err) || "Failed to load subjects.");
          setSubjectsLoading(false);
          showToast?.(getApiErrorMessage(err) || "Failed to load subjects.", "error");
        }
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

  const change = (n, v) => {
    if (n === "boardId" || n === "yearId") {
      if (existing) return;
    }
    setForm((x) => {
      if (n === "boardId" && normalizeId(x.boardId) === normalizeId(v)) return x;
      if (n === "yearId" && normalizeId(x.yearId) === normalizeId(v)) return x;
      const next = {
        ...x,
        [n]: v,
        ...(n === "boardId" && normalizeId(x.boardId) !== normalizeId(v)
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
          // Filter out language subjects from form.selectedSubjectIds when switching to Objective/Combined
          if (Array.isArray(x.selectedSubjectIds) && x.selectedSubjectIds.length > 0) {
            next.selectedSubjectIds = x.selectedSubjectIds.filter((id) => {
              const sub = formEligibleSubjects.find((s) => normalizeId(s.id) === normalizeId(id));
              return !isLanguageSubject(sub);
            });
          }
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

  const currentTabSubjects = useMemo(() => {
    if (subjectTabGroups.length > 0 && activeSubjectTabKey) {
      const activeGroup = subjectTabGroups.find((g) => g.key === activeSubjectTabKey);
      if (activeGroup?.subjects?.length > 0) return activeGroup.subjects;
    }
    return eligibleSubjects;
  }, [subjectTabGroups, activeSubjectTabKey, eligibleSubjects]);

  const selectAllSubjects = () => {
    const idsToAdd = currentTabSubjects.map((s) => String(s.id));
    setForm((prev) => {
      const current = prev.selectedSubjectIds || [];
      const merged = Array.from(new Set([...current, ...idsToAdd]));
      return { ...prev, selectedSubjectIds: merged };
    });
    setErrors((x) => ({ ...x, selectedSubjectIds: undefined }));
  };

  const deselectAllSubjects = () => {
    const idsToRemove = new Set(currentTabSubjects.map((s) => String(s.id)));
    setForm((prev) => ({
      ...prev,
      selectedSubjectIds: (prev.selectedSubjectIds || []).filter((id) => !idsToRemove.has(String(id))),
    }));
  };

  const save = async (e, proceedToSchedule = false) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (isSubmittingRef.current || saving) return;
    isSubmittingRef.current = true;
    if (subjectsLoading) {
      showToast?.("Please wait while eligible subjects are loading.", "warning");
      isSubmittingRef.current = false;
      return;
    }
    if (subjectsError) {
      showToast?.("Cannot save examination while subject loading has failed.", "error");
      isSubmittingRef.current = false;
      return;
    }

    const x = {};
    const activeContextBoardId = normalizeId(selectedBoardId ?? (selectedBoard?.boardId ?? selectedBoard?.id));
    const activeContextYearId = normalizeId(selectedAcademicYearId ?? (selectedAcademicYear?.academicYearId ?? selectedAcademicYear?.id));

    if (!form.name.trim()) x.name = "Exam Name is required.";
    if (!existing) {
      if (!activeContextBoardId || (boards.length > 0 && !boards.some((b) => normalizeId(b.id) === activeContextBoardId))) {
        x.boardId = "Select a valid active Board in the navbar.";
      }
      if (!activeContextYearId) {
        x.yearId = "Select a valid active Academic Year in the navbar.";
      }
    } else {
      if (!form.boardId) x.boardId = "Board is required.";
      if (!form.yearId) x.yearId = "Academic Year is required.";
    }
    if (!["Regular", "Objective", "Others"].includes(form.examCategory)) {
      x.examCategory = "Select Regular, Objective, or Others.";
    }
    if (form.examCategory === "Others" && !form.customCategoryName?.trim()) {
      x.customCategoryName = "Please specify the custom category name.";
    }

    if (!form.levelIds || !form.levelIds.length) x.levelIds = "Select at least one Academic Level.";

    const isRegular = isRegularExamination(form);
    const effectiveGroupSelections = { ...(form.groupProgramSelections || {}) };
    let activeGroupIds = Object.keys(effectiveGroupSelections).filter(
      (gid) => (effectiveGroupSelections[gid] || []).length > 0,
    );

    if (isRegular) {
      const selectedGids = ensureArray(
        form.groupIds && form.groupIds.length > 0 ? form.groupIds : []
      ).map(normalizeId);

      if (selectedGids.length > 0) {
        activeGroupIds = selectedGids;
        selectedGids.forEach((gid) => {
          if (!effectiveGroupSelections[gid] || effectiveGroupSelections[gid].length === 0) {
            const gObj = availableGroups.find((g) => normalizeId(g.id) === gid) || { id: gid };
            const progs = getProgramsForGroup(gObj);
            if (progs.length > 0) {
              effectiveGroupSelections[gid] = progs.map((p) => normalizeId(p.id));
            }
          }
        });
      }
    }

    if (!activeGroupIds || activeGroupIds.length === 0) {
      x.groupIds = isRegular
        ? "Select at least one Group to conduct the examination."
        : "Select at least one Program in at least one Group to conduct the examination.";
    }

    let allGroupPatterns = [];
    if (!isRegular) {
      let missingPattern = false;
      activeGroupIds.forEach((gid) => {
        const grpPattern = form.selectedGroupPatterns?.[normalizeId(gid)]?.[0]?.trim();
        if (!grpPattern) {
          x[`pattern_${normalizeId(gid)}`] = "Exam Pattern is required for this group.";
          missingPattern = true;
        }
      });
      allGroupPatterns = Object.values(form.selectedGroupPatterns || {})
        .flat()
        .map((p) => String(p).trim())
        .filter(Boolean);
      if (missingPattern || (!allGroupPatterns.length && !(form.examPattern || "").trim())) {
        x.examPattern = "Exam Pattern is required for each selected group.";
      }
    }
    const resolvedPattern = allGroupPatterns.join(", ") || (form.examPattern || "").trim();

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

    for (const gid of activeGroupIds) {
      if (!getSelectedSubjectsForExam(form, gid, eligibleSubjects).length) x.selectedSubjectIds = "Select eligible subjects for every configured group. Objective examinations exclude languages.";
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

    if (Object.keys(x).length) {
      isSubmittingRef.current = false;
      return setErrors(x);
    }

    const groupProgArray = activeGroupIds.map((groupId) => ({
      groupId,
      programIds: (effectiveGroupSelections[groupId] || []).map(normalizeId),
    }));

    const flatProgramIds = [...new Set(groupProgArray.flatMap((g) => g.programIds))];

    const payload = {
      ...form,
      id: existing?.id,
      examCode: existing?.examCode || existing?.code || undefined,
      code: existing?.examCode || existing?.code || undefined,
      endDate: isCombined ? form.startDate : form.endDate,
      levelId: form.levelIds[0] || "",
      groupId: activeGroupIds[0] || "",
      programId: flatProgramIds[0] || "",
      name: form.name.trim(),
      examCategory: resolvedCategory,
      rawCategory: form.examCategory,
      customCategoryName: form.examCategory === "Others" ? resolvedCategory : "",
      examPattern: resolvedPattern || (isRegular ? "Regular" : "Standard Pattern"),
      examType: resolvedType || "Regular Exam",
      levelIds: [...new Set(form.levelIds.map(normalizeId))],
      groupIds: [...new Set(activeGroupIds.map(normalizeId))],
      programIds: flatProgramIds,
      selectedSubjectIds: [...new Set(eligibleSubjects.filter((subject) => form.selectedSubjectIds.map(normalizeId).includes(normalizeId(subject.id))).map((subject) => normalizeId(subject.id)))],
      groupSubjectSelections: Object.fromEntries(activeGroupIds.map((gid) => [gid, getSelectedSubjectsForExam(form, gid, eligibleSubjects).map((subject) => normalizeId(subject.id))])),
      selectedSubjectDetails: eligibleSubjects.filter((subject) => form.selectedSubjectIds.map(normalizeId).includes(normalizeId(subject.id))).map((subject) => ({ id: subject.id, name: subject.name, code: subject.code, groupIds: subject.groupIds, academicLevelIds: subject.academicLevelIds, language: subject.language, subjectType: subject.subjectType })),
      selectedGroupPatterns: Object.fromEntries(activeGroupIds.map((gid) => {
        const configured = ensureArray(form.selectedGroupPatterns?.[gid]).filter(Boolean);
        const pattern = configured[0] && configured[0] !== "Others" ? configured[0] : resolvedPattern;
        return [gid, pattern ? [pattern] : []];
      })),
      groupProgramSelections: groupProgArray,
      scheduleMode: isCombined ? "PATTERN_WISE" : "SUBJECT_WISE",
    };

    try {
      setSaving(true);
      await onSave(payload, proceedToSchedule);
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <DashboardLayout title={existing ? "Edit Examination Scope" : "Create Examination"} breadcrumb={["Examinations"]}>
      <button type="button" className="exam-back-text-link" onClick={onCancel}>
        <ArrowLeft size={15} /> Back to Examinations
      </button>

      <form className="cms-form-page examination-form-page" onSubmit={(e) => save(e, true)}>
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
                      {formLevels.length === 0 ? (
                        <div style={{ color: "var(--cms-muted, #64748b)", fontSize: "13px", padding: "6px 0" }}>
                          {hierarchyLoading ? "Loading academic levels for selected Board..." : "No academic levels configured for this Board."}
                        </div>
                      ) : (
                        formLevels.map((level) => {
                          const strId = normalizeId(level.id);
                          const currentLevels = ensureArray(form.levelIds).map(normalizeId);
                          const selected = currentLevels.includes(strId);
                          return (
                            <button
                              key={level.id}
                              type="button"
                              className={`exam-pill-btn ${selected ? "active" : ""}`}
                              onClick={() => {
                                const nextLevels = selected
                                  ? currentLevels.filter((id) => id !== strId)
                                  : [...currentLevels, strId];
                                setForm((prev) => ({
                                  ...prev,
                                  levelIds: nextLevels,
                                  levelId: nextLevels[0] || "",
                                }));
                                setErrors((prev) => ({ ...prev, levelIds: undefined }));
                              }}
                            >
                              {selected ? <CheckSquare size={15} /> : <Square size={15} />}
                              <span>{level.name}</span>
                            </button>
                          );
                        })
                      )}
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

                        {/* Exam Pattern and Exam Type Selects */}
                        <div
                          className="cms-form-grid cols-2"
                          style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed var(--cms-border)" }}
                        >
                          <div>
                            {form.examCategory === "Objective" ? (
                              <div>
                                <Field
                                  label={`Exam Pattern for ${activeGroupObj.code || activeGroupObj.name} *`}
                                  placeholder={`Enter pattern for ${activeGroupObj.code || activeGroupObj.name} (e.g. JEE Main, NEET, EAMCET)`}
                                  value={
                                    form.selectedGroupPatterns?.[normalizeId(activeGroupObj.id)]?.[0] ||
                                    form.selectedGroupPatterns?.[activeGroupObj.id]?.[0] ||
                                    form.examPattern ||
                                    ""
                                  }
                                  onChange={(val) => {
                                    const gid = normalizeId(activeGroupObj.id);
                                    setForm((prev) => {
                                      const nextGroupPatterns = {
                                        ...(prev.selectedGroupPatterns || {}),
                                        [gid]: val ? [val] : [],
                                      };
                                      const allPatterns = Object.values(nextGroupPatterns)
                                        .flat()
                                        .map((p) => String(p).trim())
                                        .filter(Boolean);
                                      return {
                                        ...prev,
                                        selectedGroupPatterns: nextGroupPatterns,
                                        examPattern: allPatterns.join(", ") || val,
                                      };
                                    });
                                    setErrors((prev) => ({
                                      ...prev,
                                      [`pattern_${gid}`]: undefined,
                                      examPattern: undefined,
                                    }));
                                  }}
                                  error={errors[`pattern_${normalizeId(activeGroupObj.id)}`] || errors.examPattern}
                                />
                                <small style={{ color: "var(--cms-muted, #64748b)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                                  Enter manual competitive pattern for {activeGroupObj.name}
                                </small>
                              </div>
                            ) : (
                              <div>
                                <Field
                                  label={`Exam Pattern for ${activeGroupObj.code || activeGroupObj.name}`}
                                  value="Regular Academic Pattern"
                                  readOnly
                                  disabled
                                />
                                <small style={{ color: "var(--cms-muted, #64748b)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                                  Regular examinations are conducted subject-wise
                                </small>
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
                    type="submit"
                    className="cms-btn cms-btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Creating..." : "Create Examination & Proceed to Schedule"}
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
  setSchedules,
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
  onRefreshRooms = null,
}) {
  const entries = useMemo(() => {
    if (!exam) return [];
    return schedules.filter((s) => String(s.examId) === String(exam.id));
  }, [exam, schedules]);
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
    if (editing && sch.groupId && normalizeId(sch.groupId) !== normalizeId(selectedGroupId)) {
      setSelectedGroupId(sch.groupId);
    } else if (!editing && selectedGroupId && normalizeId(sch.groupId) !== normalizeId(selectedGroupId)) {
      setSch((prev) => ({ ...prev, groupId: selectedGroupId, subjectId: "", patternName: "", hallAssignments: [] }));
    }
  }, [selectedGroupId, sch.groupId, editing, setSch]);

  // Auto-fetch active classrooms and examination halls if not yet loaded
  useEffect(() => {
    if (rooms.length === 0 && onRefreshRooms) {
      onRefreshRooms();
    }
  }, [rooms.length, onRefreshRooms]);

  // Dynamically load eligible subjects for the current scheduling context
  const [sectionSubjects, setSectionSubjects] = useState([]);

  useEffect(() => {
    setSectionSubjects([]);
    if (!exam?.boardId || !selectedGroupId || !exam?.levelIds?.length) return;
    let active = true;
    const fetchSectionSubjects = async () => {
      try {
        const promises = exam.levelIds.map((lid) =>
          apiClient
            .get("/api/v1/subjects/context", {
              params: {
                boardId: exam.boardId,
                groupId: selectedGroupId,
                academicLevelId: lid,
              },
            })
            .catch(() =>
              apiClient.get("/api/v1/subjects", {
                params: {
                  boardId: exam.boardId,
                  groupId: selectedGroupId,
                  academicLevelId: lid,
                },
              })
            )
        );
        const results = await Promise.all(promises);
        const raw = results.flatMap((r) => unwrap(r));
        if (active) {
          setSectionSubjects(
            raw.map((s) => ({
              ...s,
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
    const gid = normalizeId(selectedGroupId);
    const grpPattern =
      exam.selectedGroupPatterns &&
      (exam.selectedGroupPatterns[gid] || exam.selectedGroupPatterns[selectedGroupId]);
    if (grpPattern && ensureArray(grpPattern).filter(Boolean).length > 0) {
      return ensureArray(grpPattern).map((p) => String(p).trim()).filter(Boolean);
    }
    if (examGroupIds.length === 1 && exam.examPattern) return [String(exam.examPattern).trim()].filter(Boolean);
    return [];
  }, [exam, selectedGroupId, examGroupIds.length]);

  // Auto-select pattern for this group if pattern is not yet selected
  useEffect(() => {
    if (isCombined && activeGroupPatterns.length > 0 && !activeGroupPatterns.includes(sch.patternName) && !editing) {
      setSch((prev) => ({ ...prev, patternName: activeGroupPatterns[0] }));
    }
  }, [isCombined, activeGroupPatterns, sch.patternName, editing, setSch]);

  const effectiveSectionSubjects = useMemo(
    () => (sectionSubjects && sectionSubjects.length > 0 ? sectionSubjects : []),
    [sectionSubjects],
  );

  // Active Group Subjects for Regular examinations
  const activeGroupSubjects = useMemo(
    () => (exam ? getSelectedSubjectsForExam(exam, selectedGroupId, effectiveSectionSubjects) : []),
    [exam, selectedGroupId, effectiveSectionSubjects],
  );

  const effectiveGroupSubjects = useMemo(
    () => (sectionSubjects && sectionSubjects.length > 0 ? sectionSubjects : []),
    [sectionSubjects],
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

  const anyCombinedSessionForExam = useMemo(() => {
    if (!exam || !isCombined) return null;
    return schedules.find(
      (s) =>
        normalizeId(s.examId) === normalizeId(exam.id) &&
        (s.scheduleMode === "PATTERN_WISE" || Boolean(s.patternName)) &&
        s.startTime && s.endTime,
    );
  }, [exam, isCombined, schedules]);

  const defaultSessionStartTime = anyCombinedSessionForExam ? anyCombinedSessionForExam.startTime : "09:00";
  const defaultSessionEndTime = anyCombinedSessionForExam ? anyCombinedSessionForExam.endTime : "12:00";

  // When scheduling a combined exam, ensure date defaults to exam.startDate and time to session timings
  useEffect(() => {
    if (isCombined && exam?.startDate && !editing) {
      setSch((prev) => ({
        ...prev,
        date: exam.startDate,
        startTime: anyCombinedSessionForExam ? anyCombinedSessionForExam.startTime : (prev.startTime || defaultSessionStartTime),
        endTime: anyCombinedSessionForExam ? anyCombinedSessionForExam.endTime : (prev.endTime || defaultSessionEndTime),
      }));
    }
  }, [isCombined, exam?.startDate, anyCombinedSessionForExam, defaultSessionStartTime, defaultSessionEndTime, editing, setSch]);

  const eligibleInvigilators = getEligibleInvigilators(schedules, sch, editing, faculty, sectionSubjects);
  const eligibleRooms = getEligibleRooms(schedules, sch, editing, exam, rooms);

  // Auto-allocate halls and invigilators in top form when date and times are set
  const autoAssignedSlotRef = useRef("");
  useEffect(() => {
    const slotKey = `${selectedGroupId}_${sch.date}_${sch.startTime}_${sch.endTime}`;
    if (
      exam &&
      selectedGroupId &&
      sch.date &&
      sch.startTime &&
      sch.endTime &&
      !editing &&
      (!sch.hallAssignments || sch.hallAssignments.length === 0) &&
      autoAssignedSlotRef.current !== slotKey
    ) {
      autoAssignedSlotRef.current = slotKey;
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

            const levelDisplay = getLevelNames(exam, academicLevels);
            const subjectDisplay = activeGroupSubjects.map((s) => s.name).join(" + ") || "Combined Core Subjects";
            const combinedSessionName = levelDisplay && levelDisplay !== "—"
              ? `${levelDisplay} · ${currentGroupCode} · ${pName} — ${subjectDisplay}`
              : `${currentGroupCode} · ${pName} — ${subjectDisplay}`;

            const newEntry = {
              id: `draft-${selectedGroupId}-${idx}`,
              examId: exam.id,
              groupId: selectedGroupId,
              patternName: pName,
              includedSubjectIds: activeGroupSubjects.map((s) => String(s.id)),
              subjectName: combinedSessionName,
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
            break;
          } else {
            break;
          }
        } catch (saveErr) {
          const errorMsg = getApiErrorMessage(saveErr) || "Failed to save auto-generated schedules.";
          showToast?.(errorMsg, "error");
          break;
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
    if (isCombined) {
      if (!sch.patternName) x.patternName = "Select Examination Pattern.";
      if (!activeGroupSubjects.length) x.patternName = "No saved selected subjects found for this group to schedule in this pattern session.";
      if (exam?.startDate && canonicalDate(sch.date) !== canonicalDate(exam.startDate)) {
        x.date = `Objective examinations must be scheduled on the examination start date (${canonicalDate(exam.startDate)}).`;
      }
      if (anyCombinedSessionForExam) {
        if (formatTimeOnly(sch.startTime) !== formatTimeOnly(anyCombinedSessionForExam.startTime)) {
          x.startTime = `Start time must match existing objective session timing (${formatTimeOnly(anyCombinedSessionForExam.startTime)}).`;
        }
        if (formatTimeOnly(sch.endTime) !== formatTimeOnly(anyCombinedSessionForExam.endTime)) {
          x.endTime = `End time must match existing objective session timing (${formatTimeOnly(anyCombinedSessionForExam.endTime)}).`;
        }
      }
    }
    if (!isCombined) {
      if (!sch.subjectId) {
        x.subjectId = "Required";
      } else {
        const isSubjectInSavedSet = activeGroupSubjects.some(
          (s) => normalizeId(s.id) === normalizeId(sch.subjectId),
        );
        if (!isSubjectInSavedSet) {
          x.subjectId = "Subject is not part of the saved selected subjects for this examination.";
        }
      }
    }
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
    const includedSubjectIds = isCombined ? Array.from(new Set(activeGroupSubjects.map((s) => normalizeId(s.id)))) : [];
    const entry = {
      ...sch,
      date: isCombined && !editing ? (canonicalDate(exam.startDate) || sch.date) : sch.date,
      startTime: isCombined && anyCombinedSessionForExam && !editing ? (anyCombinedSessionForExam.startTime || sch.startTime) : sch.startTime,
      endTime: isCombined && anyCombinedSessionForExam && !editing ? (anyCombinedSessionForExam.endTime || sch.endTime) : sch.endTime,
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

    const enrichedAssignments = finalAssignments.map((a) => {
      const rId = a.hallId || a.roomId;
      const rObj = rooms.find((r) => normalizeId(r.id) === normalizeId(rId) || normalizeId(r.roomId) === normalizeId(rId));
      const rName = rObj?.roomNumber || rObj?.roomName || rObj?.name || a.hallName || (rId ? nameOf(rooms, rId, "") : "");

      const invIds = ensureArray(a.invigilatorIds || a.facultyIds).map(normalizeId).filter(Boolean);
      const invNames = invIds
        .map((fid) => {
          const fObj = faculty.find((f) => normalizeId(f.id) === fid);
          return fObj?.name || nameOf(faculty, fid, "");
        })
        .filter(Boolean)
        .join(", ");

      return {
        ...a,
        hallId: rId,
        roomId: rId,
        hallName: rName,
        roomName: rName,
        roomNumber: rName,
        invigilatorIds: invIds,
        facultyIds: invIds,
        invigilatorName: invNames,
        invigilator: invNames,
      };
    });

    const firstAss = enrichedAssignments[0];
    const firstRoomId = firstAss?.hallId || firstAss?.roomId;
    const firstRoomName = firstAss?.hallName || firstAss?.roomNumber || (firstRoomId ? nameOf(rooms, firstRoomId, "") : "");
    const firstInvId = firstAss?.invigilatorIds?.[0];
    const firstInvName = firstInvId ? (faculty.find((f) => normalizeId(f.id) === normalizeId(firstInvId))?.name || nameOf(faculty, firstInvId, "")) : "";

    const hallNames = enrichedAssignments.map((a) => a.hallName).filter(Boolean).join(", ") || firstRoomName || "Unassigned Hall";
    const invigilatorNames =
      enrichedAssignments
        .map((a) => `${a.hallName || "Hall"}: ${a.invigilatorName || "Unassigned"}`)
        .filter(Boolean)
        .join(" | ") || firstInvName || "Unassigned Faculty";

    setProcessing(true);
    try {
      if (isCombined) {
        const levelDisplay = getLevelNames(exam, academicLevels);
        const subjectDisplay = activeGroupSubjects.map((s) => s.name).join(" + ") || "Combined Core Subjects";
        const combinedSessionName = levelDisplay && levelDisplay !== "—"
          ? `${levelDisplay} · ${currentGroupCode} · ${sch.patternName} — ${subjectDisplay}`
          : `${currentGroupCode} · ${sch.patternName} — ${subjectDisplay}`;

        const combinedSchedules = [
          {
            id: editing || "draft-entry",
            examId: exam.id,
            groupId: selectedGroupId,
            patternName: sch.patternName,
            includedSubjectIds,
            subjectName: combinedSessionName,
            subjectCode: `${isObjective ? "OBJ" : "COMB"}_${currentGroupCode}_${normalizeCodePart(sch.patternName)}`,
            date: sch.date,
            startTime: sch.startTime,
            endTime: sch.endTime,
            totalMarks: sch.totalMarks,
            passPercentage: sch.passPercentage,
            candidateCount: enrichedAssignments.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0),
            hallAssignments: enrichedAssignments,
            roomId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
            hallId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
            roomNumber: firstRoomName || hallNames,
            hall: firstRoomName || hallNames,
            venue: firstRoomName || hallNames,
            roomName: hallNames,
            invigilatorId: firstInvId ? Number(firstInvId) || firstInvId : null,
            invigilator: firstInvName || invigilatorNames,
            invigilatorName: invigilatorNames,
            mode: sch.mode || (isObjective ? "Objective" : (exam.examCategory || "Combined")),
            scheduleMode: "PATTERN_WISE",
            allScheduleIds: sch.allScheduleIds || (editing ? [editing] : []),
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
            candidateCount: enrichedAssignments.reduce((sum, a) => sum + (Number(a.candidateCount) || 0), 0),
            hallAssignments: enrichedAssignments,
            roomId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
            hallId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
            roomNumber: firstRoomName || hallNames,
            hall: firstRoomName || hallNames,
            venue: firstRoomName || hallNames,
            roomName: hallNames,
            invigilatorId: firstInvId ? Number(firstInvId) || firstInvId : null,
            invigilator: firstInvName || invigilatorNames,
            invigilatorName: invigilatorNames,
            mode: sch.mode || "Written",
            scheduleMode: "SUBJECT_WISE",
            allScheduleIds: sch.allScheduleIds || (editing ? [editing] : []),
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
                      ? groupPatterns.filter((pat) =>
                        entries.some(
                          (s) =>
                            (normalizeId(s.groupId) === normalizeId(group.id) || matchesScheduleGroup(s, group.id, exam, effectiveGroupSubjects)) &&
                            (!pat || !s.patternName || String(s.patternName).trim().toLowerCase() === String(pat).trim().toLowerCase()),
                        ),
                      ).length
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
                          setSch((prev) => ({
                            ...prev,
                            groupId: group.id,
                            subjectId: "",
                            patternName: "",
                            hallAssignments: [],
                          }));
                          if (editing) onCancelEdit();
                          setErrors({});
                        }}
                      >
                        {isGroupReady && <Check size={12} style={{ color: "var(--cms-green)" }} />}
                        {getLevelNames(exam, academicLevels) !== "—" && (
                          <span className="exam-scope-level-tag">{getLevelNames(exam, academicLevels)}</span>
                        )}
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
                        setSch((x) => ({ ...x, patternName: v, subjectId: "", hallAssignments: [], includedSubjectIds: [] }));
                        setErrors((x) => ({ ...x, patternName: undefined }));
                      }}
                      options={activeGroupPatterns.map((pName) => ({ id: pName, name: activeGroupSubjects.length ? `${pName}: ${activeGroupSubjects.map((subject) => subject.name).join(" + ")}` : pName }))}
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
                    value={isCombined && !editing && anyCombinedSessionForExam ? anyCombinedSessionForExam.startTime : sch.startTime}
                    readOnly={isCombined && Boolean(anyCombinedSessionForExam) && !editing}
                    onChange={(v) => {
                      setSch((x) => ({ ...x, startTime: v }));
                      setErrors((x) => ({ ...x, startTime: undefined }));
                    }}
                    error={errors.startTime}
                  />

                  <Field
                    label="End Time *"
                    type="time"
                    value={isCombined && !editing && anyCombinedSessionForExam ? anyCombinedSessionForExam.endTime : sch.endTime}
                    readOnly={isCombined && Boolean(anyCombinedSessionForExam) && !editing}
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
                  onRefreshRooms={onRefreshRooms}
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
                canEdit={exam?.status === "DRAFT"}
                edit={onEdit}
                remove={onRemove}
                onEditHalls={(s) => setEditingHallsSchedule(s)}
                exam={exam}
                schedules={schedules}
                rooms={rooms}
                onRefreshRooms={onRefreshRooms}
                faculty={faculty}
                programs={programs}
                subjects={sectionSubjects}
                students={students}
                onUpdateSchedule={onUpdateSchedule}
                showToast={showToast}
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
          onRefreshRooms={onRefreshRooms}
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
  onRefreshRooms = null,
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
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
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
          {onRefreshRooms && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ fontSize: "12px", padding: "4px 8px" }}
              onClick={onRefreshRooms}
              title="Refresh active classrooms and examination halls from system"
            >
              <RefreshCw size={13} style={{ marginRight: "4px" }} /> Sync Halls
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
            onClick={() => {
              if (rooms.length === 0 && onRefreshRooms) {
                onRefreshRooms();
              }
              onChange([...assignments, { hallId: "", candidateCount: "", invigilatorIds: [] }]);
            }}
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
              const room = rooms.find((r) => normalizeId(r.id) === normalizeId(hallId) || normalizeId(r.roomId) === normalizeId(hallId));
              const rName = room?.roomNumber || room?.roomName || room?.name || "";
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
              update(index, {
                hallId,
                roomId: hallId,
                hallName: rName,
                roomName: rName,
                roomNumber: rName,
                candidateCount,
              });
            }}
            options={rooms
              .filter(
                (room) =>
                  normalizeId(room.id) === normalizeId(assignment.hallId) ||
                  !selectedHallIds.includes(normalizeId(room.id)),
              )
              .map((room) => {
                const roomTypeLabel = room.roomType || room.type || "Classroom";
                const blockInfo = room.blockName ? ` · ${room.blockName}` : "";
                const roomNum = room.roomNumber && !room.name.includes(room.roomNumber) ? ` (${room.roomNumber})` : "";
                return {
                  ...room,
                  name: `${room.name}${roomNum} · ${roomTypeLabel} · Capacity ${room.capacity}${blockInfo}`,
                };
              })}
            placeholder="Select Exam Hall or Classroom"
            emptyText="No active classrooms or examination halls found"
            onRefresh={onRefreshRooms}
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
            onChange={(invigilatorIds) => {
              const facultyNames = ensureArray(invigilatorIds)
                .map((id) => {
                  const f = faculty.find((fac) => normalizeId(fac.id) === normalizeId(id));
                  return f?.name || nameOf(faculty, id, "");
                })
                .filter(Boolean)
                .join(", ");
              update(index, {
                invigilatorIds,
                facultyIds: invigilatorIds,
                invigilatorName: facultyNames,
                invigilator: facultyNames,
              });
            }}
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
// ---------- SCHEDULE TABLE (PAGINATED 6 PER PAGE WITH INLINE TABLE EDITING) ----------
function ScheduleTable({
  entries,
  groups = [],
  canEdit = true,
  edit,
  remove,
  onEditHalls,
  exam = null,
  schedules = [],
  rooms = [],
  onRefreshRooms = null,
  faculty = [],
  programs = [],
  subjects = [],
  students = [],
  onUpdateSchedule = null,
  showToast = null,
}) {
  const displayEntries = useMemo(() => {
    if (!entries || !entries.length) return [];
    const patternSessionMap = new Map();
    const result = [];

    entries.forEach((item) => {
      const isPatternWise =
        item.scheduleMode === "PATTERN_WISE" ||
        Boolean(item.patternName) ||
        (Array.isArray(item.includedSubjectIds) && item.includedSubjectIds.length > 1);

      if (!isPatternWise) {
        result.push(item);
        return;
      }

      const slotDate = canonicalDate(item.date || item.examDate);
      const slotStart = formatTimeOnly(item.startTime);
      const slotEnd = formatTimeOnly(item.endTime);
      const slotKey = `${normalizeId(item.examId)}_${normalizeId(item.groupId)}_${slotDate}_${slotStart}_${slotEnd}_${item.patternName || ""}`;

      const itemAssignments = (item.hallAssignments && item.hallAssignments.length > 0)
        ? item.hallAssignments
        : (item.roomId || item.hallId)
          ? [{
            hallId: item.hallId || item.roomId,
            roomId: item.hallId || item.roomId,
            hallName: item.roomNumber || item.roomName || item.hall || "",
            roomName: item.roomNumber || item.roomName || item.hall || "",
            roomNumber: item.roomNumber || item.roomName || item.hall || "",
            candidateCount: item.candidateCount,
            invigilatorIds: item.invigilatorIds || (item.invigilatorId ? [item.invigilatorId] : []),
            invigilatorName: item.invigilatorName || item.invigilator || "",
          }]
          : [];

      if (!patternSessionMap.has(slotKey)) {
        const sessionCopy = {
          ...item,
          date: slotDate || item.date,
          startTime: slotStart || item.startTime,
          endTime: slotEnd || item.endTime,
          allScheduleIds: item.id ? [item.id] : [],
          allSubjectIds: item.subjectId ? [item.subjectId] : (item.includedSubjectIds || []),
          allSubjectCodes: item.subjectCode ? [item.subjectCode] : [],
          allSubjectNames: item.subjectName ? [item.subjectName] : [],
          allHallAssignments: [...itemAssignments],
        };
        patternSessionMap.set(slotKey, sessionCopy);
        result.push(sessionCopy);
      } else {
        const existing = patternSessionMap.get(slotKey);
        if (item.id && !existing.allScheduleIds.includes(item.id)) {
          existing.allScheduleIds.push(item.id);
        }
        if (item.subjectId && !existing.allSubjectIds.includes(item.subjectId)) {
          existing.allSubjectIds.push(item.subjectId);
        }
        (item.includedSubjectIds || []).forEach((sId) => {
          if (!existing.allSubjectIds.includes(sId)) {
            existing.allSubjectIds.push(sId);
          }
        });
        if (item.subjectCode && !existing.allSubjectCodes.includes(item.subjectCode)) {
          existing.allSubjectCodes.push(item.subjectCode);
        }
        if (item.subjectName && !existing.allSubjectNames.includes(item.subjectName)) {
          existing.allSubjectNames.push(item.subjectName);
        }
        itemAssignments.forEach((ass) => {
          const assHallId = normalizeId(ass.hallId || ass.roomId);
          const existingAss = existing.allHallAssignments.find(
            (e) => normalizeId(e.hallId || e.roomId) === assHallId
          );
          if (existingAss) {
            existingAss.candidateCount = (Number(existingAss.candidateCount) || 0) + (Number(ass.candidateCount) || 0);
            const mergedInv = ensureArray(existingAss.invigilatorIds || existingAss.facultyIds);
            ensureArray(ass.invigilatorIds || ass.facultyIds).forEach((fid) => {
              if (!mergedInv.includes(fid)) mergedInv.push(fid);
            });
            existingAss.invigilatorIds = mergedInv;
          } else {
            existing.allHallAssignments.push({ ...ass });
          }
        });
      }
    });

    return result.map((item) => {
      const mergedAssignments = (item.allHallAssignments && item.allHallAssignments.length > 0)
        ? item.allHallAssignments
        : (item.hallAssignments && item.hallAssignments.length > 0 ? item.hallAssignments : []);

      const hallDisplay = mergedAssignments.length > 0
        ? mergedAssignments
          .map((a) => a.hallName || a.roomName || a.roomNumber || (a.hallId ? nameOf(rooms, a.hallId, "") : ""))
          .filter(Boolean)
          .join(", ")
        : item.roomName;

      const invDisplay = mergedAssignments.length > 0
        ? mergedAssignments
          .map((a) => {
            const hName = a.hallName || a.roomName || a.roomNumber || "";
            const invIds = ensureArray(a.invigilatorIds || a.facultyIds);
            const invNameStr = a.invigilatorName || a.invigilator || invIds.map((fid) => nameOf(faculty, fid, "")).filter(Boolean).join(", ");
            return hName && invNameStr ? `${hName}: ${invNameStr}` : (invNameStr || hName);
          })
          .filter(Boolean)
          .join(" | ")
        : item.invigilatorName;

      const combinedCodes = (item.allSubjectCodes && item.allSubjectCodes.length > 0)
        ? item.allSubjectCodes.filter(Boolean).join(" + ")
        : item.subjectCode;
      const combinedNames = (item.allSubjectNames && item.allSubjectNames.length > 0)
        ? item.allSubjectNames.filter(Boolean).join(" + ")
        : item.combinedSubjectsDisplay;

      return {
        ...item,
        subjectCode: combinedCodes || item.subjectCode,
        subjectName: item.patternName || item.subjectName,
        combinedSubjectsDisplay: combinedNames || item.combinedSubjectsDisplay,
        hallAssignments: mergedAssignments.length > 0 ? mergedAssignments : item.hallAssignments,
        roomName: hallDisplay || item.roomName,
        invigilatorName: invDisplay || item.invigilatorName,
      };
    });
  }, [entries, rooms, faculty]);

  const [page, setPage] = useState(1);
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(displayEntries.length / pageSize));
  const pagedEntries = displayEntries.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = displayEntries.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, displayEntries.length);

  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineAssignments, setInlineAssignments] = useState([]);
  const [inlineError, setInlineError] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  useEffect(() => setPage(1), [displayEntries.length]);

  const isExamScheduled = exam && normalizeStatus(exam.status) === "SCHEDULED";
  const canEditAny = canEdit || isExamScheduled;

  const handleToggleInlineEdit = (s) => {
    if (inlineEditId === s.id) {
      setInlineEditId(null);
      setInlineAssignments([]);
      setInlineError("");
      return;
    }
    const reqStrength = getRequiredCandidateStrength(exam, s.groupId, programs, false, students, {
      subjectId: s.subjectId,
      includedSubjectIds: s.includedSubjectIds,
      subjectsList: subjects,
    });
    const raw = (s.hallAssignments || []).map((a) => ({ ...a }));
    let initial = [];
    if (raw.length) {
      let needed = reqStrength;
      initial = raw.map((item) => {
        const existingCount = Number(item.candidateCount) || 0;
        if (existingCount > 0) {
          needed = Math.max(0, needed - existingCount);
          return {
            ...item,
            hallId: normalizeId(item.hallId ?? item.roomId),
            candidateCount: existingCount,
            invigilatorIds: ensureArray(item.invigilatorIds || item.facultyIds).map(normalizeId).filter((id) => id && id !== "0"),
          };
        }
        const room = rooms.find((r) => normalizeId(r.id) === normalizeId(item.hallId ?? item.roomId));
        const roomCap = Number(room?.capacity) || 0;
        const count = roomCap > 0 ? Math.min(needed > 0 ? needed : roomCap, roomCap) : needed;
        needed = Math.max(0, needed - count);
        return {
          ...item,
          hallId: normalizeId(item.hallId ?? item.roomId),
          candidateCount: count,
          invigilatorIds: ensureArray(item.invigilatorIds || item.facultyIds).map(normalizeId).filter((id) => id && id !== "0"),
        };
      });
    } else if (s.hallId || s.roomId) {
      const hid = normalizeId(s.hallId || s.roomId);
      initial = [{
        hallId: hid,
        candidateCount: Number(s.candidateCount) || reqStrength || 0,
        invigilatorIds: ensureArray(s.invigilatorIds || s.facultyIds || (s.invigilatorId ? [s.invigilatorId] : [])).map(normalizeId).filter((id) => id && id !== "0"),
      }];
    } else {
      initial = [{ hallId: "", candidateCount: "", invigilatorIds: [] }];
    }

    setInlineEditId(s.id);
    setInlineAssignments(initial);
    setInlineError("");
  };

  const handleInlineAutoAssign = (s) => {
    const autoAssigned = autoAssignHallsAndInvigilators(
      exam,
      s.groupId,
      s.date,
      s.startTime,
      s.endTime,
      schedules,
      s.id,
      rooms,
      faculty,
      programs,
      {
        subjectId: s.subjectId,
        includedSubjectIds: s.includedSubjectIds,
        subjectsList: subjects,
      },
      students,
    );
    if (!autoAssigned || !autoAssigned.length) {
      setInlineError("Cannot auto-allocate: insufficient hall capacity or available invigilators without conflicts.");
      return;
    }
    setInlineAssignments(autoAssigned);
    setInlineError("");
  };

  const handleInlineSave = async (s) => {
    if (inlineSaving) return;
    const reqStrength = getRequiredCandidateStrength(exam, s.groupId, programs, false, students, {
      subjectId: s.subjectId,
      includedSubjectIds: s.includedSubjectIds,
      subjectsList: subjects,
    });
    const valErrors = validateHallAssignments(
      inlineAssignments,
      exam,
      schedules,
      s,
      s.id,
      s.groupId,
      false,
      rooms,
      faculty,
      subjects,
    );
    const allocated = inlineAssignments.reduce((total, a) => total + Number(a.candidateCount || 0), 0);
    if (reqStrength > 0 && allocated < reqStrength) {
      valErrors.push(`Hall allocation must cover confirmed candidate strength (${allocated}/${reqStrength}).`);
    }
    for (const a of inlineAssignments) {
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

    const eligibleFacultyIds = getEligibleInvigilators(schedules, s, s.id, faculty, subjects).map((f) => normalizeId(f.id));
    for (const a of inlineAssignments) {
      for (const id of a.invigilatorIds || []) {
        const nid = normalizeId(id);
        const fMember = faculty.find((f) => normalizeId(f.id) === nid);
        if (fMember && !eligibleFacultyIds.includes(nid)) {
          const isAssignedSameDay = schedules.some(
            (other) =>
              !isSameSessionOrSelf(other, s, s.id, exam) &&
              canonicalDate(other.date || other.examDate) === canonicalDate(s.date || s.examDate) &&
              hasTimeOverlap(s.startTime, s.endTime, other.startTime, other.endTime) &&
              getScheduleInvigilatorIds(other).includes(nid),
          );
          if (isAssignedSameDay) {
            valErrors.push(`${fMember.name} is already assigned to invigilate another hall on this date. The same faculty cannot be assigned to two halls on the same day.`);
          } else {
            const entrySubjectIds = [s?.subjectId, ...(s?.includedSubjectIds || [])].map(normalizeId).filter(Boolean);
            const teachesSubject = entrySubjectIds.length > 0 && Array.isArray(fMember.subjectsTaught) && entrySubjectIds.some((sId) => fMember.subjectsTaught.map(normalizeId).includes(sId));
            if (teachesSubject) {
              valErrors.push(`${fMember.name} teaches ${s.subjectName || "this subject"} and cannot invigilate their own subject examination.`);
            } else {
              valErrors.push(`${fMember.name} is not an available invigilator.`);
            }
          }
        }
      }
    }

    if (valErrors.length) {
      setInlineError(valErrors.join(" "));
      return;
    }

    const enrichedAssignments = inlineAssignments.map((a) => {
      const rId = a.hallId || a.roomId;
      const rObj = rooms.find((r) => normalizeId(r.id) === normalizeId(rId) || normalizeId(r.roomId) === normalizeId(rId));
      const rName = rObj?.roomNumber || rObj?.roomName || rObj?.name || a.hallName || (rId ? nameOf(rooms, rId, "") : "");

      const invIds = ensureArray(a.invigilatorIds || a.facultyIds).map(normalizeId).filter(Boolean);
      const invNames = invIds
        .map((fid) => {
          const fObj = faculty.find((f) => normalizeId(f.id) === fid);
          return fObj?.name || nameOf(faculty, fid, "");
        })
        .filter(Boolean)
        .join(", ");

      return {
        ...a,
        hallId: rId,
        roomId: rId,
        hallName: rName,
        roomName: rName,
        roomNumber: rName,
        invigilatorIds: invIds,
        facultyIds: invIds,
        invigilatorName: invNames,
        invigilator: invNames,
      };
    });

    const firstAss = enrichedAssignments[0];
    const firstRoomId = firstAss?.hallId || firstAss?.roomId;
    const firstRoomName = firstAss?.hallName || firstAss?.roomNumber || (firstRoomId ? nameOf(rooms, firstRoomId, "") : "");
    const firstInvId = firstAss?.invigilatorIds?.[0];
    const firstInvName = firstInvId ? (faculty.find((f) => normalizeId(f.id) === normalizeId(firstInvId))?.name || nameOf(faculty, firstInvId, "")) : "";

    const hallNames = enrichedAssignments.map((a) => a.hallName).filter(Boolean).join(", ") || firstRoomName || "Unassigned Hall";
    const invigilatorNames =
      enrichedAssignments
        .map((a) => `${a.hallName || "Hall"}: ${a.invigilatorName || "Unassigned"}`)
        .filter(Boolean)
        .join(" | ") || firstInvName || "Unassigned Faculty";

    const updatedSchedule = {
      ...s,
      hallAssignments: enrichedAssignments,
      roomId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
      hallId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
      roomNumber: firstRoomName || hallNames,
      hall: firstRoomName || hallNames,
      venue: firstRoomName || hallNames,
      roomName: hallNames,
      invigilatorId: firstInvId ? Number(firstInvId) || firstInvId : null,
      invigilator: firstInvName || invigilatorNames,
      invigilatorName: invigilatorNames,
      candidateCount: allocated,
    };

    setInlineSaving(true);
    try {
      const success = await onUpdateSchedule?.(updatedSchedule);
      if (success !== false) {
        setInlineEditId(null);
        setInlineAssignments([]);
        setInlineError("");
        showToast?.("Halls and invigilators updated successfully inside the table.", "success");
      }
    } catch (err) {
      setInlineError(getApiErrorMessage(err) || "Failed to update hall assignments.");
    } finally {
      setInlineSaving(false);
    }
  };

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
              {canEditAny && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pagedEntries.length ? (
              pagedEntries.map((s) => (
                <React.Fragment key={s.id}>
                  <tr className={inlineEditId === s.id ? "exam-row-editing" : ""}>
                    <td>
                      <span
                        className="exam-cell-two-lines"
                        title={s.combinedSubjectsDisplay ? `${s.subjectName}: ${s.combinedSubjectsDisplay}` : s.subjectName}
                      >
                        {s.subjectName}
                      </span>
                      <small
                        className="exam-muted"
                        style={{ display: "block", fontSize: "11px", color: "var(--cms-muted)" }}
                        title={s.combinedSubjectsDisplay || s.subjectCode}
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
                    {canEditAny && (
                      <td>
                        <div className="cms-actions">
                          <button
                            className={`cms-action-btn ${inlineEditId === s.id ? "active" : ""}`}
                            title="Edit Halls & Invigilators (Inside Table)"
                            onClick={() => {
                              if (onUpdateSchedule) {
                                handleToggleInlineEdit(s);
                              } else {
                                onEditHalls?.(s);
                              }
                            }}
                            style={{ color: "var(--cms-primary)" }}
                          >
                            <Users size={15} />
                          </button>
                          {canEdit && (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {inlineEditId === s.id && (
                    <tr className="exam-inline-editor-row" key={`inline-edit-${s.id}`}>
                      <td colSpan={canEditAny ? 10 : 9}>
                        <div className="exam-inline-table-editor">
                          <div className="exam-inline-editor-header">
                            <div className="exam-inline-session-info">
                              <span>Session: <strong>{s.subjectName || s.patternName}</strong></span>
                              <span>Exam Date: <strong>{d(s.date)}</strong></span>
                              <span>Timing: <strong>{s.startTime} - {s.endTime}</strong></span>
                              <span>Required: <strong>{getRequiredCandidateStrength(exam, s.groupId, programs, false, students, { subjectId: s.subjectId, includedSubjectIds: s.includedSubjectIds, subjectsList: subjects })} Candidates</strong></span>
                            </div>
                            <div className="exam-inline-header-actions">
                              <button
                                type="button"
                                className="cms-btn cms-btn-ghost"
                                style={{ fontSize: "12px", padding: "4px 10px" }}
                                onClick={() => handleInlineAutoAssign(s)}
                              >
                                <Wand2 size={13} style={{ marginRight: "4px" }} /> Auto-Assign Halls
                              </button>
                              <button
                                type="button"
                                className="cms-btn cms-btn-ghost"
                                style={{ fontSize: "12px", padding: "4px 10px" }}
                                onClick={() => setInlineAssignments((prev) => [...prev, { hallId: "", candidateCount: "", invigilatorIds: [] }])}
                              >
                                <Plus size={13} style={{ marginRight: "4px" }} /> Add Room
                              </button>
                            </div>
                          </div>

                          <div className="exam-inline-assignments-list">
                            <HallAssignmentEditor
                              assignments={inlineAssignments}
                              rooms={getEligibleRooms(schedules, s, s.id, exam, rooms)}
                              faculty={getEligibleInvigilators(schedules, s, s.id, faculty, subjects)}
                              required={getRequiredCandidateStrength(exam, s.groupId, programs, false, students, { subjectId: s.subjectId, includedSubjectIds: s.includedSubjectIds, subjectsList: subjects })}
                              enrolledStudentCount={getGroupStudents(exam, s.groupId, programs, students).length}
                              onRefreshRooms={onRefreshRooms}
                              onChange={(newAssignments) => {
                                setInlineAssignments(newAssignments);
                                setInlineError("");
                              }}
                            />
                          </div>

                          {inlineError && (
                            <div className="cms-error" style={{ margin: "10px 0" }}>
                              {inlineError}
                            </div>
                          )}

                          <div className="exam-inline-editor-actions">
                            <button
                              type="button"
                              className="cms-btn cms-btn-ghost"
                              onClick={() => {
                                setInlineEditId(null);
                                setInlineAssignments([]);
                                setInlineError("");
                              }}
                              disabled={inlineSaving}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="cms-btn cms-btn-primary"
                              onClick={() => handleInlineSave(s)}
                              disabled={inlineSaving}
                            >
                              {inlineSaving ? "Saving..." : "Save Assignments"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={canEditAny ? 10 : 9}>
                  <div className="cms-empty">No subjects or sessions scheduled yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {displayEntries.length > pageSize && (
        <div
          className="exam-list-pagination"
          style={{ border: "1px solid var(--cms-border)", borderRadius: "0 0 12px 12px" }}
        >
          <span className="exam-record-summary">
            Showing {rangeStart}–{rangeEnd} of {displayEntries.length} records (6 per page)
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
function EditHallsModal({ schedule, exam, schedules, rooms = [], onRefreshRooms = null, faculty = [], programs = [], subjects = [], students = [], onClose, onSave }) {
  const eligibleRooms = getEligibleRooms(schedules, schedule, schedule.id, exam, rooms);
  const eligibleFaculty = getEligibleInvigilators(schedules, schedule, schedule.id, faculty, subjects);
  const requiredStrength = getRequiredCandidateStrength(exam, schedule.groupId, programs, false, students, {
    subjectId: schedule.subjectId,
    includedSubjectIds: schedule.includedSubjectIds,
    subjectsList: subjects,
  });

  const [assignments, setAssignments] = useState(() => {
    let raw = (schedule.hallAssignments || []).map((a) => ({ ...a }));
    if (!raw.length && (schedule.roomId || schedule.hallId)) {
      raw = [
        {
          hallId: normalizeId(schedule.roomId || schedule.hallId),
          candidateCount: Number(schedule.candidateCount) || requiredStrength || 0,
          invigilatorIds: schedule.invigilatorId ? [normalizeId(schedule.invigilatorId)] : [],
        },
      ];
    }
    if (!raw.length) return [];
    let needed = requiredStrength;
    return raw.map((item) => {
      const existingCount = Number(item.candidateCount) || 0;
      if (existingCount > 0) {
        needed = Math.max(0, needed - existingCount);
        return item;
      }
      const room = rooms.find((r) => normalizeId(r.id) === normalizeId(item.hallId));
      const roomCap = Number(room?.capacity) || 0;
      const count = roomCap > 0 ? Math.min(needed > 0 ? needed : roomCap, roomCap) : needed;
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
    if (savingRef.current || saving) return;
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
    const allocated = assignments.reduce((total, a) => total + Number(a.candidateCount || 0), 0);
    if (requiredStrength > 0 && allocated < requiredStrength) valErrors.push("Hall allocation must cover the confirmed candidate strength.");
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
              !isSameSessionOrSelf(s, schedule, schedule.id, exam) &&
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

    const enrichedAssignments = assignments.map((a) => {
      const rId = a.hallId || a.roomId;
      const rObj = rooms.find((r) => normalizeId(r.id) === normalizeId(rId) || normalizeId(r.roomId) === normalizeId(rId));
      const rName = rObj?.roomNumber || rObj?.roomName || rObj?.name || a.hallName || (rId ? nameOf(rooms, rId, "") : "");

      const invIds = ensureArray(a.invigilatorIds || a.facultyIds).map(normalizeId).filter(Boolean);
      const invNames = invIds
        .map((fid) => {
          const fObj = faculty.find((f) => normalizeId(f.id) === fid);
          return fObj?.name || nameOf(faculty, fid, "");
        })
        .filter(Boolean)
        .join(", ");

      return {
        ...a,
        hallId: rId,
        roomId: rId,
        hallName: rName,
        roomName: rName,
        roomNumber: rName,
        invigilatorIds: invIds,
        facultyIds: invIds,
        invigilatorName: invNames,
        invigilator: invNames,
      };
    });

    const firstAss = enrichedAssignments[0];
    const firstRoomId = firstAss?.hallId || firstAss?.roomId;
    const firstRoomName = firstAss?.hallName || firstAss?.roomNumber || (firstRoomId ? nameOf(rooms, firstRoomId, "") : "");
    const firstInvId = firstAss?.invigilatorIds?.[0];
    const firstInvName = firstInvId ? (faculty.find((f) => normalizeId(f.id) === normalizeId(firstInvId))?.name || nameOf(faculty, firstInvId, "")) : "";

    const hallNames = enrichedAssignments.map((a) => a.hallName).filter(Boolean).join(", ") || firstRoomName || "Unassigned Hall";
    const invigilatorNames =
      enrichedAssignments
        .map((a) => `${a.hallName || "Hall"}: ${a.invigilatorName || "Unassigned"}`)
        .filter(Boolean)
        .join(" | ") || firstInvName || "Unassigned Faculty";

    const updated = {
      ...schedule,
      hallAssignments: enrichedAssignments,
      roomId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
      hallId: firstRoomId ? Number(firstRoomId) || firstRoomId : null,
      roomNumber: firstRoomName || hallNames,
      hall: firstRoomName || hallNames,
      venue: firstRoomName || hallNames,
      roomName: hallNames,
      invigilatorId: firstInvId ? Number(firstInvId) || firstInvId : null,
      invigilator: firstInvName || invigilatorNames,
      invigilatorName: invigilatorNames,
      candidateCount: allocated,
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
          onRefreshRooms={onRefreshRooms}
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
