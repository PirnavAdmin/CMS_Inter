import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { SkeletonButton, SkeletonPage, SkeletonRow } from "@/components/common/Ui.jsx";
import * as XLSX from "xlsx";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "./MarksEntryPage.css";

const PAGE_SIZE = 5;
const normalizeId = (value) => String(value ?? "");
const isActiveRecord = (item) => item?.isActive !== false && item?.status !== false;
const evaluationKey = (item) => `${item.examinationId}:${item.sectionId}:${item.subjectId}`;
const eq = (a, b) => normalizeId(a) === normalizeId(b);
const grade = (value) =>
  value >= 90 ? "A+" : value >= 80 ? "A" : value >= 70 ? "B+" : value >= 60 ? "B" : value >= 50 ? "C" : value >= 40 ? "D" : "F";
const editableStatuses = ["NOT STARTED", "DRAFT", "REJECTED"];

const buildMarksPayload = (workspace, evalId, campusId = null) => {
  const effectiveCampusId = Number(campusId || workspace?.campusId) || 1;
  const isObjective = workspace?.mode === "OBJECTIVE";
  const formattedMarks = (workspace?.rows || []).map((row) => {
    const isAbsent = Boolean(row.absent);
    const internal = isAbsent || isObjective ? 0 : Math.round(Number(row.internal || 0));
    const practical = isAbsent || isObjective ? 0 : Math.round(Number(row.practical || 0));
    const theory = isAbsent || isObjective ? 0 : Math.round(Number(row.theory || 0));
    const total = isAbsent
      ? 0
      : isObjective
        ? Math.round(Number(row.obtainedMarks || 0))
        : Math.round(Number(row.total || 0));

    return {
      campusId: effectiveCampusId,
      studentId: Number(row.studentId),
      internalMarks: internal,
      practicalMarks: practical,
      theoryMarks: theory,
      internal,
      practical,
      theory,
      obtainedMarks: total,
      totalMarks: total,
      maxMarks: Math.round(Number(workspace?.maxMarks || 100)),
      status: isAbsent ? "ABSENT" : "PRESENT",
      isAbsent,
      remarks: String(row.remarks || "").trim(),
    };
  });

  return {
    campusId: effectiveCampusId,
    evaluationId: String(evalId || workspace?.evaluationId || ""),
    rowVersion: Number(workspace?.rowVersion || 0),
    remarks: "Marks Entry",
    students: formattedMarks,
    marks: formattedMarks,
    marksList: formattedMarks,
    studentMarks: formattedMarks,
  };
};

const buildAdminMarksPayload = (workspace, campusId = null) => {
  const effectiveCampusId = Number(campusId || workspace?.campusId) || 1;
  const isObjective = workspace?.mode === "OBJECTIVE";
  const studentMarks = (workspace?.rows || []).map((row) => {
    const isAbsent = Boolean(row.absent);
    const internal = isAbsent || isObjective ? 0 : Number(row.internal || 0);
    const practical = isAbsent || isObjective ? 0 : Number(row.practical || 0);
    const theory = isAbsent || isObjective ? 0 : Number(row.theory || 0);
    const total = isAbsent
      ? 0
      : isObjective
        ? Number(row.obtainedMarks || 0)
        : Number(row.total || 0);

    return {
      campusId: effectiveCampusId,
      ...(row.markId ? { markId: Number(row.markId) } : {}),
      studentId: Number(row.studentId),
      internalMarks: internal,
      practicalMarks: practical,
      theoryMarks: theory,
      internal,
      practical,
      theory,
      obtainedMarks: total,
      totalMarks: total,
      maxMarks: Number(workspace?.maxMarks || 100),
      isAbsent,
      remarks: String(row.remarks || "").trim(),
    };
  });

  return {
    campusId: effectiveCampusId,
    studentMarks,
    students: studentMarks,
  };
};

const unwrapRecords = (response) => {
  if (!response) return [];
  const payload = response.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const validateMarksConfiguration = (config) =>
  config?.mode === "REGULAR" &&
    Number(config.internalMax || 0) + Number(config.practicalMax || 0) + Number(config.theoryMax || 0) !==
    Number(config.maxMarks || 0)
    ? "Configured component maxima do not equal Total Maximum Marks."
    : "";

const numericMark = (value) =>
  value !== "" &&
  value !== null &&
  value !== undefined &&
  /^(?:\d+|\d+\.\d{1,2})$/.test(String(value)) &&
  Number.isFinite(Number(value));

const validateMarksRows = (workspace, complete) => {
  const errors = {};
  if (!workspace?.rows) return errors;
  const isObjective = workspace.mode === "OBJECTIVE";
  workspace.rows.forEach((row) => {
    if (row.absent) return;
    const fields = isObjective
      ? [["Objective Marks", "obtainedMarks", workspace.maxMarks]]
      : [
        ["internal", "internal", workspace.internalMax],
        ...(workspace.practicalMax ? [["practical", "practical", workspace.practicalMax]] : []),
        ["theory", "theory", workspace.theoryMax],
      ];
    const list = [];
    fields.forEach(([label, key, max]) => {
      const val = row[key];
      if (val === "" || val === null || val === undefined) {
        if (complete) list.push(`${label} is required`);
      } else if (!numericMark(val) || Number(val) < 0 || Number(val) > Number(max)) {
        list.push(`${label} must be between 0 and ${max} with at most two decimals`);
      }
    });
    if ((row.remarks || "").trim().length > 250) list.push("Remarks cannot exceed 250 characters");
    if (list.length) errors[row.studentId] = list;
  });
  return errors;
};

const calculateStudentSubjectResult = (row, workspace) => {
  if (!row || !workspace) return { obtained: 0, percentage: 0, grade: "F", result: "FAIL" };
  const maxMarks = Math.max(1, Number(workspace.maxMarks || 100));
  const isAbsent = Boolean(row.absent);
  const obtainedVal = workspace.mode === "OBJECTIVE" ? row.obtainedMarks : row.total;
  const obtained = isAbsent ? 0 : (obtainedVal === "" || obtainedVal === null || obtainedVal === undefined ? "" : Number(obtainedVal));
  const numericObtained = obtained === "" ? 0 : Number(obtained);
  const percentage = obtained === "" ? 0 : (numericObtained / maxMarks) * 100;
  return {
    obtained,
    percentage,
    grade: grade(percentage),
    result: !isAbsent && obtained !== "" && percentage >= (Number(workspace.passPercentage) || 35) ? "PASS" : "FAIL",
  };
};

const isObjectiveExamination = (schedule, exam) => {
  const schedMode = String(schedule?.scheduleMode || schedule?.mode || "").trim().toUpperCase();
  if (["PATTERN_WISE", "COMBINED", "COMBINED_OBJECTIVE", "OBJECTIVE"].includes(schedMode)) return true;
  if (schedMode === "SUBJECT_WISE" || schedMode === "REGULAR") return false;

  const examMode = String(exam?.scheduleMode || exam?.mode || "").trim().toUpperCase();
  if (["PATTERN_WISE", "COMBINED", "COMBINED_OBJECTIVE", "OBJECTIVE"].includes(examMode)) return true;
  if (examMode === "SUBJECT_WISE" || examMode === "REGULAR") return false;

  const modeAttr = String(schedule?.examMode || exam?.examMode || "").trim().toLowerCase();
  if (modeAttr === "objective" || modeAttr.includes("objective")) return true;

  const cat = String(
    schedule?.examCategory || schedule?.category || exam?.examCategory || exam?.category || exam?.categoryName || ""
  ).trim().toLowerCase();
  if (cat === "objective" || cat === "combined" || cat.includes("objective")) return true;

  return false;
};

const isLanguageSubject = (s) => {
  if (!s) return false;
  if (s.language === true || s.language === 1 || String(s.language).toLowerCase() === "true") return true;
  if (s.isLanguage === true || s.isLanguage === 1 || String(s.isLanguage).toLowerCase() === "true") return true;
  const rawType = String(s.subjectType || s.type || s.category || "").trim().toUpperCase();
  if (rawType === "LANGUAGE" || rawType.includes("LANGUAGE")) return true;
  const name = String(s.name || s.subjectName || "").trim().toLowerCase();
  const code = String(s.code || s.subjectCode || "").trim().toUpperCase();
  const languagePattern = /\b(english|sanskrit|telugu|hindi|urdu|french|arabic|tamil|kannada|marathi|second\s*language|first\s*language|language)\b/i;
  const codePattern = /^(ENG|SANS|SAN|TEL|HIN|URD|FRE|ARA|TAM|KAN|MAR|SL|FL|LANG)/i;
  return languagePattern.test(name) || codePattern.test(code);
};

const fetchAndBuildSubjectConfigs = async (examId, sectionId, effectiveExam, schedules = [], effectiveCampusId = null) => {
  const baseSchedule = schedules?.[0] || null;
  const isObjective = isObjectiveExamination(baseSchedule, effectiveExam);

  // 1. REGULAR EXAM: Use individual schedules directly for marks entry
  if (!isObjective) {
    const configs = [];
    const seenSubjects = new Set();
    (schedules || []).forEach((s) => {
      const subjId = normalizeId(s.subjectId);
      if (!subjId || seenSubjects.has(subjId)) return;
      seenSubjects.add(subjId);

      configs.push({
        id: `cfg-${examId}-${subjId}`,
        examinationId: examId,
        sectionId: sectionId,
        subjectId: subjId,
        subjectName: s.subjectName || `Subject ${subjId}`,
        subjectCode: s.subjectCode || "",
        mode: "REGULAR",
        maxMarks: Number(s.maxMarks || 100),
        passPercentage: Number(s.passingMarks ? (s.passingMarks / s.maxMarks) * 100 : 35),
        internalMax: Number(s.internalMax ?? 20),
        practicalMax: Number(s.practicalMax ?? (s.isPractical ? 30 : 0)),
        theoryMax: Number(
          s.theoryMax ??
          Math.max(
            0,
            Number(s.maxMarks || 100) -
            Number(s.internalMax ?? 20) -
            Number(s.practicalMax ?? (s.isPractical ? 30 : 0))
          )
        ),
        facultyName: s.invigilatorName || s.invigilator || s.facultyName || "",
        facultyId: s.invigilatorId || s.facultyId || "",
        examScheduleId: s.examScheduleId || s.id,
      });
    });
    return configs;
  }

  // 2. OBJECTIVE EXAM: Configure all included subjects for marks entry
  const baseFacultyName = baseSchedule?.invigilatorName || baseSchedule?.invigilator || baseSchedule?.facultyName || "";
  const baseFacultyId = baseSchedule?.invigilatorId || baseSchedule?.facultyId || "";
  const baseScheduleId = baseSchedule?.examScheduleId || baseSchedule?.id;
  const baseMaxMarks = Number(baseSchedule?.maxMarks || effectiveExam?.totalMarks || 100);
  const basePassingMarks = Number(
    baseSchedule?.passingMarks ||
    (effectiveExam?.totalMarks && effectiveExam?.passPercentage
      ? (effectiveExam.totalMarks * effectiveExam.passPercentage) / 100
      : 35)
  );
  const basePassPercentage = baseMaxMarks > 0 ? (basePassingMarks / baseMaxMarks) * 100 : (effectiveExam?.passPercentage || 35);

  // Gather included subject IDs and track session schedule mapping
  const explicitIncludedIds = [];
  const scheduleByIncludedSubject = new Map();

  (schedules || []).forEach((s) => {
    const directSubId = normalizeId(s.subjectId);
    if (directSubId && !scheduleByIncludedSubject.has(directSubId)) {
      scheduleByIncludedSubject.set(directSubId, s);
    }
    if (Array.isArray(s.includedSubjectIds)) {
      s.includedSubjectIds.forEach((id) => {
        const nid = normalizeId(id);
        if (nid) {
          if (!explicitIncludedIds.includes(nid)) {
            explicitIncludedIds.push(nid);
          }
          if (!scheduleByIncludedSubject.has(nid)) {
            scheduleByIncludedSubject.set(nid, s);
          }
        }
      });
    }
  });

  if (explicitIncludedIds.length === 0) {
    const rawSel =
      effectiveExam?.groupSubjectSelections?.[normalizeId(effectiveExam?.groupId)] ??
      effectiveExam?.selectedSubjectIds ??
      effectiveExam?.allocatedSubjectIds ??
      effectiveExam?.subjectIds;
    if (Array.isArray(rawSel)) {
      rawSel.forEach((id) => {
        const nid = normalizeId(id);
        if (nid && !explicitIncludedIds.includes(nid)) {
          explicitIncludedIds.push(nid);
        }
      });
    }
  }

  // Fetch subject metadata from backend
  let allSubjectsList = [];
  try {
    const eligibleRes = await apiClient.get(`/api/v1/examinations/${examId}/eligible-subjects`, {
      headers: effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {},
      skipGlobalLoader: true,
    }).catch(() => null);
    allSubjectsList = unwrapRecords(eligibleRes);
  } catch (e) {
    console.warn("Could not fetch eligible subjects for objective exam:", e);
  }

  if (!allSubjectsList.length && effectiveExam?.groupId) {
    try {
      const groupSubsRes = await apiClient.get(`/api/v1/subjects/group/${encodeURIComponent(effectiveExam.groupId)}`, {
        skipGlobalLoader: true,
      }).catch(() => null);
      allSubjectsList = unwrapRecords(groupSubsRes);
    } catch (e) {
      console.warn("Could not fetch group subjects:", e);
    }
  }

  if (!allSubjectsList.length) {
    try {
      const subsRes = await apiClient.get("/api/v1/subjects", {
        skipGlobalLoader: true,
      }).catch(() => null);
      allSubjectsList = unwrapRecords(subsRes);
    } catch (e) {
      console.warn("Could not fetch all subjects:", e);
    }
  }

  // Populate subject lookup Map
  const subjectMap = new Map();
  allSubjectsList.forEach((sub) => {
    const id = normalizeId(sub.subjectId ?? sub.id);
    if (id) {
      subjectMap.set(id, {
        subjectId: id,
        subjectName: sub.subjectName || sub.name || `Subject ${id}`,
        subjectCode: sub.subjectCode || sub.code || "",
        maxMarks: Number(sub.totalMarks || sub.maxMarks || baseMaxMarks),
        passingMarks: Number(sub.passingMarks || basePassingMarks),
        isPractical: Boolean(sub.isPractical),
        isLanguage: isLanguageSubject(sub),
      });
    }
  });

  // Seed or override from schedules for exact invigilators/names
  (schedules || []).forEach((s) => {
    const id = normalizeId(s.subjectId);
    if (id) {
      const existing = subjectMap.get(id);
      subjectMap.set(id, {
        subjectId: id,
        subjectName: s.subjectName || existing?.subjectName || `Subject ${id}`,
        subjectCode: s.subjectCode || existing?.subjectCode || "",
        maxMarks: Number(s.maxMarks || existing?.maxMarks || baseMaxMarks),
        passingMarks: Number(s.passingMarks || existing?.passingMarks || basePassingMarks),
        isPractical: Boolean(s.isPractical ?? existing?.isPractical),
        isLanguage: existing?.isLanguage ?? isLanguageSubject(s),
        facultyName: s.invigilatorName || s.invigilator || s.facultyName || baseFacultyName,
        facultyId: s.invigilatorId || s.facultyId || baseFacultyId,
        examScheduleId: s.examScheduleId || s.id || baseScheduleId,
      });
    }
  });

  const configs = [];
  const seenSubjects = new Set();

  if (explicitIncludedIds.length > 0) {
    explicitIncludedIds.forEach((subId) => {
      if (seenSubjects.has(subId)) return;
      seenSubjects.add(subId);

      const subInfo = subjectMap.get(subId);
      const owningSchedule = scheduleByIncludedSubject.get(subId) || baseSchedule;
      const max = Number(subInfo?.maxMarks || owningSchedule?.maxMarks || baseMaxMarks || 100);
      const passMarks = Number(subInfo?.passingMarks || owningSchedule?.passingMarks || basePassingMarks || 35);
      const passPct = max > 0 ? (passMarks / max) * 100 : basePassPercentage;

      configs.push({
        id: `cfg-${examId}-${subId}`,
        examinationId: examId,
        sectionId: sectionId,
        subjectId: subId,
        subjectName: subInfo?.subjectName || (eq(owningSchedule?.subjectId, subId) ? owningSchedule?.subjectName : `Subject ${subId}`),
        subjectCode: subInfo?.subjectCode || (eq(owningSchedule?.subjectId, subId) ? owningSchedule?.subjectCode : ""),
        mode: "OBJECTIVE",
        maxMarks: max,
        passPercentage: passPct,
        internalMax: 0,
        practicalMax: 0,
        theoryMax: 0,
        facultyName: subInfo?.facultyName || owningSchedule?.invigilatorName || owningSchedule?.invigilator || owningSchedule?.facultyName || baseFacultyName,
        facultyId: subInfo?.facultyId || owningSchedule?.invigilatorId || owningSchedule?.facultyId || baseFacultyId,
        examScheduleId: subInfo?.examScheduleId || owningSchedule?.examScheduleId || owningSchedule?.id || baseScheduleId,
      });
    });
  } else if (subjectMap.size > 0) {
    const allSubs = Array.from(subjectMap.values());
    const nonLanguageSubs = allSubs.filter((s) => !s.isLanguage);
    const targetSubs = nonLanguageSubs.length > 0 ? nonLanguageSubs : allSubs;

    targetSubs.forEach((subInfo) => {
      const subId = subInfo.subjectId;
      if (seenSubjects.has(subId)) return;
      seenSubjects.add(subId);

      const owningSchedule = scheduleByIncludedSubject.get(subId) || baseSchedule;
      const max = Number(subInfo.maxMarks || owningSchedule?.maxMarks || baseMaxMarks || 100);
      const passMarks = Number(subInfo.passingMarks || owningSchedule?.passingMarks || basePassingMarks || 35);
      const passPct = max > 0 ? (passMarks / max) * 100 : basePassPercentage;

      configs.push({
        id: `cfg-${examId}-${subId}`,
        examinationId: examId,
        sectionId: sectionId,
        subjectId: subId,
        subjectName: subInfo.subjectName,
        subjectCode: subInfo.subjectCode,
        mode: "OBJECTIVE",
        maxMarks: max,
        passPercentage: passPct,
        internalMax: 0,
        practicalMax: 0,
        theoryMax: 0,
        facultyName: subInfo.facultyName || owningSchedule?.invigilatorName || owningSchedule?.invigilator || owningSchedule?.facultyName || baseFacultyName,
        facultyId: subInfo.facultyId || owningSchedule?.invigilatorId || owningSchedule?.facultyId || baseFacultyId,
        examScheduleId: subInfo.examScheduleId || owningSchedule?.examScheduleId || owningSchedule?.id || baseScheduleId,
      });
    });
  } else {
    (schedules || []).forEach((s) => {
      const subjId = normalizeId(s.subjectId);
      if (!subjId || seenSubjects.has(subjId)) return;
      seenSubjects.add(subjId);

      configs.push({
        id: `cfg-${examId}-${subjId}`,
        examinationId: examId,
        sectionId: sectionId,
        subjectId: subjId,
        subjectName: s.subjectName || `Subject ${subjId}`,
        subjectCode: s.subjectCode || "",
        mode: "OBJECTIVE",
        maxMarks: Number(s.maxMarks || 100),
        passPercentage: Number(s.passingMarks ? (s.passingMarks / s.maxMarks) * 100 : 35),
        internalMax: 0,
        practicalMax: 0,
        theoryMax: 0,
        facultyName: s.invigilatorName || s.invigilator || s.facultyName || "",
        facultyId: s.invigilatorId || s.facultyId || "",
        examScheduleId: s.examScheduleId || s.id,
      });
    });
  }

  return configs;
};

const formatExamDropdownLabel = (exam) => {
  if (!exam) return "Examination";
  const examId = normalizeId(exam.id ?? exam.examinationId ?? exam.examId);
  const examCode = String(exam.examCode || exam.code || exam.examinationCode || exam.exam_code || "").trim();
  const rawName = exam.name || exam.examName || exam.examinationName || "Examination";
  const cleanedName = rawName
    .replace(/\s*\((?:COMPLETED|SCHEDULED|DRAFT|FINISHED|PUBLISHED)\)/gi, "")
    .replace(/\s*\(ID:\s*[^)]+\)/gi, "")
    .trim();

  if (examCode) {
    if (cleanedName.includes(`(${examCode})`) || cleanedName.includes(examCode)) {
      return cleanedName;
    }
    return `${cleanedName} (${examCode})`;
  }
  return examId ? `${cleanedName} (ID: ${examId})` : cleanedName;
};

const fetchAuthoritativeSectionStudents = async (filters = {}, campusId = null) => {
  const sectionId = filters.section;
  if (!sectionId) return [];

  const studentMap = new Map();

  const addRecords = (records) => {
    (records || []).forEach((s) => {
      const sId = normalizeId(s.studentId ?? s.id);
      if (!sId) return;
      if (s.isActive === false || String(s.status || "").toLowerCase() === "inactive") return;
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          admissionNo: s.admissionNo ?? s.admissionNumber ?? "",
          rollNo: String(s.rollNumber ?? s.rollNo ?? s.roll ?? "").trim(),
          studentName: s.studentName ?? s.fullName ?? s.name ?? "Student",
          isActive: true,
          allocatedDate: s.allocatedDate || s.allocationDate || s.assignedDate || s.createdAt || s.createdDate || s.admissionDate || null,
        });
      }
    });
  };

  // Section Students API call matching Student Management (/api/v1/students)
  try {
    const fetchSize = 100;
    for (let pageNumber = 1; ; pageNumber += 1) {
      const params = {
        boardId: filters.board ? Number(filters.board) : undefined,
        academicYearId: filters.year ? Number(filters.year) : undefined,
        ...(filters.level ? { academicLevelId: Number(filters.level) } : {}),
        ...(filters.group ? { groupId: Number(filters.group) } : {}),
        ...(filters.program ? { programId: Number(filters.program) } : {}),
        sectionId: Number(sectionId) || sectionId,
        campusId: campusId ? Number(campusId) : undefined,
        pageNumber,
        pageSize: fetchSize,
      };
      const res = await apiClient.get(apiEndpoints.students?.list || "/api/v1/students", {
        params,
        skipGlobalLoader: true,
      });
      const payload = res.data?.data ?? res.data?.Data ?? res.data ?? {};
      const batch = Array.isArray(payload)
        ? payload
        : payload.items ?? payload.Items ?? payload.results ?? payload.Results ?? payload.$values ?? [];
      addRecords(batch);
      const total = payload.totalCount ?? payload.TotalCount;
      if (!batch.length || (total != null ? studentMap.size >= Number(total) : batch.length < fetchSize)) break;
    }
  } catch (err) {
    console.warn("Notice: could not query students endpoint:", err);
  }

  const list = Array.from(studentMap.values());
  list.sort((a, b) => {
    if (a.rollNo && b.rollNo) {
      const cmp = a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });
      if (cmp !== 0) return cmp;
    }
    return (a.studentName || "").localeCompare(b.studentName || "");
  });

  return list;
};

const reconcileRosterWithMarks = (roster = [], marks = [], config = {}, existingRows = []) => {
  const marksMap = new Map();
  (marks || []).forEach((m) => {
    const sId = normalizeId(m.studentId ?? m.id);
    if (sId) marksMap.set(sId, m);
  });

  const existingMap = new Map();
  (existingRows || []).forEach((r) => {
    const sId = normalizeId(r.studentId);
    if (sId) existingMap.set(sId, r);
  });

  const isObjective = config?.mode === "OBJECTIVE";

  return (roster || []).map((student) => {
    const sId = normalizeId(student.studentId ?? student.id);
    const existing = existingMap.get(sId);
    const mark = marksMap.get(sId);

    // If existing in-memory row was modified by user, preserve user input
    if (
      existing &&
      (existing.dirty ||
        existing.internal !== "" ||
        existing.theory !== "" ||
        existing.obtainedMarks !== "" ||
        existing.absent)
    ) {
      return {
        ...existing,
        rollNo: String(student.rollNo || existing.rollNo || ""),
        studentName: student.studentName || existing.studentName || "Student",
        markId: existing.markId ?? mark?.markId,
        ...(isObjective
          ? {
            obtainedMarks: existing.obtainedMarks,
            total: existing.obtainedMarks,
            internal: 0,
            practical: 0,
            theory: 0,
          }
          : {}),
      };
    }

    // If saved mark record exists from backend
    if (mark) {
      const isAbsent = Boolean(mark.isAbsent || mark.absent);
      const obtained = isAbsent ? "" : (mark.obtainedMarks ?? mark.totalMarks ?? mark.total ?? "");
      const internal = isAbsent || isObjective ? (isObjective ? 0 : "") : (mark.internalMarks ?? mark.internal ?? "");
      const practical = isAbsent || isObjective ? 0 : (mark.practicalMarks ?? mark.practical ?? (config?.practicalMax ? "" : 0));
      const theory = isAbsent || isObjective ? (isObjective ? 0 : "") : (mark.theoryMarks ?? mark.theory ?? "");
      const total = isAbsent ? "" : (isObjective ? obtained : (mark.totalMarks ?? mark.total ?? obtained));

      return {
        markId: mark.markId,
        studentId: sId,
        rollNo: String(student.rollNo || mark.rollNo || ""),
        studentName: student.studentName || mark.studentName || "Student",
        internal,
        practical,
        theory,
        obtainedMarks: obtained,
        total,
        absent: isAbsent,
        remarks: mark.remarks || "",
        autoAbsentRemark: false,
      };
    }

    // Newly eligible student or student without marks record
    return {
      studentId: sId,
      rollNo: String(student.rollNo || ""),
      studentName: student.studentName || "Student",
      internal: isObjective ? 0 : "",
      practical: isObjective ? 0 : (config?.practicalMax ? "" : 0),
      theory: isObjective ? 0 : "",
      obtainedMarks: "",
      total: "",
      absent: false,
      remarks: "",
      autoAbsentRemark: false,
    };
  });
};

const calculateEvaluationStatistics = (workspace) => {
  if (!workspace?.rows?.length) {
    const totalCount = Number(workspace?.totalStudents ?? workspace?.studentsCount ?? 0);
    const avg =
      workspace?.averageMarks !== undefined && workspace?.averageMarks !== null
        ? String(workspace.averageMarks)
        : workspace?.average ?? "—";
    const high =
      workspace?.highestMarks !== undefined && workspace?.highestMarks !== null
        ? String(workspace.highestMarks)
        : workspace?.highest ?? "—";
    const low =
      workspace?.lowestMarks !== undefined && workspace?.lowestMarks !== null
        ? String(workspace.lowestMarks)
        : workspace?.lowest ?? "—";
    return {
      studentsCount: totalCount,
      average: avg,
      highest: high,
      lowest: low,
    };
  }
  const values = workspace.rows
    .filter((row) => !row.absent && (row.total !== "" || row.obtainedMarks !== ""))
    .map((row) => Number(workspace.mode === "OBJECTIVE" ? row.obtainedMarks : row.total))
    .filter(Number.isFinite);
  return {
    studentsCount: workspace.rows.length,
    average: values.length
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
      : workspace?.averageMarks !== undefined && workspace?.averageMarks !== null
        ? String(workspace.averageMarks)
        : workspace?.average ?? "—",
    highest: values.length
      ? Math.max(...values)
      : workspace?.highestMarks !== undefined && workspace?.highestMarks !== null
        ? String(workspace.highestMarks)
        : workspace?.highest ?? "—",
    lowest: values.length
      ? Math.min(...values)
      : workspace?.lowestMarks !== undefined && workspace?.lowestMarks !== null
        ? String(workspace.lowestMarks)
        : workspace?.lowest ?? "—",
  };
};

const calculateReadiness = (configs = [], workspaces = {}) => {
  const statuses = configs.map(
    (config) =>
      workspaces[evaluationKey({ examinationId: config.examinationId, sectionId: config.sectionId, subjectId: config.subjectId })]
        ?.status || "NOT STARTED"
  );
  const count = (status) => statuses.filter((item) => item === status).length;
  const requiredSubjectCount = configs.length;
  const approvedCount = count("APPROVED");
  return {
    requiredSubjectCount,
    notStartedCount: count("NOT STARTED"),
    draftCount: count("DRAFT"),
    submittedCount: count("SUBMITTED"),
    verifiedCount: count("VERIFIED"),
    approvedCount,
    rejectedCount: count("REJECTED"),
    allRequiredApproved: requiredSubjectCount > 0 && approvedCount === requiredSubjectCount,
    readyForResults: requiredSubjectCount > 0 && approvedCount === requiredSubjectCount,
  };
};

const isLegalStatusTransition = (from, to) =>
  ({
    "NOT STARTED": ["DRAFT", "SUBMITTED"],
    DRAFT: ["DRAFT", "SUBMITTED"],
    REJECTED: ["REJECTED", "SUBMITTED"],
    SUBMITTED: ["SUBMITTED", "VERIFIED", "REJECTED"],
    VERIFIED: ["APPROVED", "REJECTED"],
    APPROVED: [],
  }[from] || []).includes(to);

// Reusable Hook for Independent Academic Cascading Filters
function useAcademicFilterState(allBoards = [], guard = (fn) => fn(), onReset = () => { }) {
  const {
    selectedCampus,
    selectedCampusId,
  } = useCampusContext();

  const {
    selectedBoard,
    selectedBoardId,
    selectedAcademicYear,
    selectedAcademicYearId,
    boards: contextBoards = [],
    academicYears: contextAcademicYears = [],
  } = useAcademicContext();

  const activeCampusId = normalizeId((selectedCampusId ?? selectedCampus?.campusId ?? selectedCampus?.id) || "1");

  const effectiveBoardId = useMemo(() => {
    return normalizeId(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId ?? (allBoards[0]?.id || ""));
  }, [selectedBoardId, selectedBoard, allBoards]);

  const effectiveYearId = useMemo(() => {
    return normalizeId(selectedAcademicYearId ?? selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId ?? "");
  }, [selectedAcademicYearId, selectedAcademicYear]);

  const [filters, setFilters] = useState({
    board: effectiveBoardId,
    year: effectiveYearId,
    level: "",
    group: "",
    program: "",
    section: "",
    exam: "",
  });
  const [years, setYears] = useState([]);
  const [levels, setLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [exams, setExams] = useState([]);

  // Auto-sync board from navbar context
  useEffect(() => {
    if (effectiveBoardId && !eq(filters.board, effectiveBoardId)) {
      setFilters((prev) => ({ ...prev, board: effectiveBoardId }));
    } else if (!filters.board && allBoards.length > 0) {
      const match = allBoards.find(
        (b) =>
          eq(b.id, selectedBoardId) ||
          (selectedBoard?.code && String(b.code || "").trim().toLowerCase() === String(selectedBoard.code).trim().toLowerCase()) ||
          (selectedBoard?.name && String(b.name || "").trim().toLowerCase() === String(selectedBoard.name).trim().toLowerCase())
      ) || allBoards[0];
      if (match) {
        setFilters((prev) => ({ ...prev, board: normalizeId(match.id || match.boardId) }));
      }
    }
  }, [effectiveBoardId, selectedBoardId, selectedBoard, allBoards, filters.board]);

  // Auto-sync academic year from navbar context
  useEffect(() => {
    if (effectiveYearId && !eq(filters.year, effectiveYearId)) {
      setFilters((prev) => ({ ...prev, year: effectiveYearId }));
    }
  }, [effectiveYearId, filters.year]);

  // Load Years for Campus & Board
  useEffect(() => {
    const currentBoard = filters.board || effectiveBoardId;
    let isMounted = true;

    const loadYears = async () => {
      try {
        const yearsRes = await apiClient
          .get("/api/v1/academic-years", {
            params: {
              CampusId: activeCampusId,
              campusId: activeCampusId,
              boardId: currentBoard || undefined,
              BoardId: currentBoard || undefined,
              isActive: true,
              Status: true,
            },
            headers: {
              ...(activeCampusId ? { "X-Campus-Id": String(activeCampusId) } : {}),
            },
          })
          .catch(() => apiClient.get("/api/v1/academic-years"))
          .catch(() => null);

        const rawYears = unwrapRecords(yearsRes);
        let listYears = rawYears
          .map((y) => ({
            id: normalizeId(y.academicYearId ?? y.id),
            name: y.academicYearName ?? y.name,
            boardId: normalizeId(y.boardId),
            campusId: normalizeId(y.campusId),
            isActive: y.isActive !== false && y.status !== false && y.status !== "Inactive",
            isCurrent: Boolean(y.isCurrent),
          }))
          .filter((y) => {
            if (!y.isActive) return false;
            if (String(y.name || "").includes("2028") || String(y.name || "").includes("2029")) return false;
            if (activeCampusId && y.campusId && normalizeId(y.campusId) !== normalizeId(activeCampusId)) return false;
            if (currentBoard && y.boardId && !eq(y.boardId, currentBoard)) return false;
            return true;
          });

        // Ensure selectedAcademicYear from navbar is in the years list
        if (selectedAcademicYear) {
          const sId = normalizeId(selectedAcademicYearId ?? selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId);
          const sName = selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || selectedAcademicYear?.code || "Academic Year";
          const exists = listYears.some((y) => eq(y.id, sId));
          if (!exists && sId) {
            listYears.unshift({
              id: sId,
              name: sName,
              isActive: true,
            });
          }
        }
        if (!listYears.length && contextAcademicYears.length > 0) {
          listYears = contextAcademicYears.map((y) => ({
            id: normalizeId(y.academicYearId ?? y.id),
            name: y.academicYearName ?? y.name,
            isActive: true,
          }));
        }

        if (isMounted) {
          setYears(listYears);
          const targetYear = listYears.find((y) => eq(y.id, effectiveYearId)) || listYears[0];
          if (targetYear && !filters.year) {
            setFilters((prev) => ({ ...prev, year: targetYear.id }));
          }
        }
      } catch (err) {
        console.error("Error fetching academic years:", err);
        if (isMounted) {
          if (selectedAcademicYear) {
            setYears([{
              id: normalizeId(selectedAcademicYearId ?? selectedAcademicYear?.id),
              name: selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || "Academic Year",
              isActive: true,
            }]);
          } else {
            setYears([]);
          }
        }
      }
    };

    loadYears();
    return () => {
      isMounted = false;
    };
  }, [filters.board, effectiveBoardId, activeCampusId, selectedAcademicYear, selectedAcademicYearId, effectiveYearId, contextAcademicYears]);

  // Load Levels (Independent)
  useEffect(() => {
    const currentBoard = filters.board || effectiveBoardId;
    let isMounted = true;

    const loadLevels = async () => {
      try {
        let levelItems = [];
        const levelsRes = await apiClient
          .get(`/api/v1/academic-levels`, {
            params: {
              CampusId: activeCampusId,
              campusId: activeCampusId,
              ...(currentBoard ? { boardId: currentBoard, BoardId: currentBoard } : {}),
            },
            headers: {
              ...(activeCampusId ? { "X-Campus-Id": String(activeCampusId) } : {}),
            },
          })
          .catch(() => (currentBoard ? apiClient.get(`/api/v1/boards/${encodeURIComponent(currentBoard)}/academic-levels`) : null))
          .catch(() => null);

        const rawLevels = unwrapRecords(levelsRes);
        if (rawLevels.length) {
          levelItems = rawLevels.map((l) => ({
            id: normalizeId(l.academicLevelId ?? l.id),
            name: l.levelName ?? l.name,
            isActive: l.isActive !== false,
          }));
        } else if (selectedBoard?.academicLevelIds?.length) {
          levelItems = selectedBoard.academicLevelIds.map((id, idx) => ({
            id: normalizeId(id),
            name: selectedBoard.academicLevelNames?.[idx] || `Level ${id}`,
            isActive: true,
          }));
        } else {
          levelItems = [
            { id: "1", name: "1st Year", isActive: true },
            { id: "2", name: "2nd Year", isActive: true },
          ];
        }

        if (isMounted) setLevels(levelItems.filter((l) => l.isActive));
      } catch (err) {
        console.error("Error fetching academic levels:", err);
        if (isMounted) {
          setLevels([
            { id: "1", name: "1st Year", isActive: true },
            { id: "2", name: "2nd Year", isActive: true },
          ]);
        }
      }
    };

    loadLevels();
    return () => {
      isMounted = false;
    };
  }, [filters.board, effectiveBoardId, activeCampusId, selectedBoard]);

  // Load Groups (Independent)
  useEffect(() => {
    const currentBoard = filters.board || effectiveBoardId;
    let isMounted = true;

    const loadGroups = async () => {
      try {
        const groupsRes = await apiClient
          .get("/api/v1/groups", {
            params: {
              CampusId: activeCampusId,
              campusId: activeCampusId,
              ...(currentBoard ? { boardId: currentBoard, BoardId: currentBoard } : {}),
              isActive: true,
            },
            headers: {
              ...(activeCampusId ? { "X-Campus-Id": String(activeCampusId) } : {}),
            },
          })
          .catch(() => apiClient.get("/api/v1/groups"))
          .catch(() => null);

        const rawGroups = unwrapRecords(groupsRes);
        const listGroups = rawGroups
          .map((g) => ({
            id: normalizeId(g.groupId ?? g.id),
            name: g.groupName ?? g.name ?? "",
            groupName: g.groupName ?? g.name ?? "",
            groupCode: g.groupCode ?? "",
            boardId: normalizeId(g.boardId),
            programs: g.programs || [],
            isActive: g.isActive !== false,
          }))
          .filter((g) => g.isActive && (!g.boardId || !currentBoard || eq(g.boardId, currentBoard)));

        if (isMounted) setGroups(listGroups);
      } catch (err) {
        console.error("Error fetching groups:", err);
        if (isMounted) setGroups([]);
      }
    };

    loadGroups();
    return () => {
      isMounted = false;
    };
  }, [filters.board, effectiveBoardId, activeCampusId]);

  // Load Programs (Independent: group-specific if group is selected, otherwise all programs for campus/board)
  useEffect(() => {
    let isMounted = true;
    const currentBoard = filters.board || effectiveBoardId;

    const loadPrograms = async () => {
      if (filters.group) {
        const selectedGroup = groups.find((g) => eq(g.id, filters.group));
        if (selectedGroup?.programs?.length) {
          const list = selectedGroup.programs
            .map((p) => ({
              id: normalizeId(p.programId ?? p.id),
              name: p.programName ?? p.name,
              groupId: filters.group,
              isActive: p.isActive !== false,
            }))
            .filter((p) => p.isActive);
          if (isMounted) setPrograms(list);
          return;
        }

        try {
          const res = await apiClient
            .get(`/api/v1/groups/${encodeURIComponent(filters.group)}/programs`)
            .catch(() =>
              apiClient.get("/api/v1/programs", {
                params: {
                  campusId: activeCampusId || undefined,
                  boardId: currentBoard || undefined,
                  groupId: filters.group,
                },
                headers: {
                  ...(activeCampusId ? { "X-Campus-Id": String(activeCampusId) } : {}),
                },
              })
            );
          const raw = unwrapRecords(res);
          const list = raw
            .map((p) => ({
              id: normalizeId(p.programId ?? p.id),
              name: p.programName ?? p.name,
              groupId: filters.group,
              isActive: p.isActive !== false,
            }))
            .filter((p) => p.isActive && (!p.groupId || eq(p.groupId, filters.group)));

          if (isMounted) setPrograms(list);
          return;
        } catch (err) {
          console.error("Error fetching group programs:", err);
        }
      }

      // If no group selected or fallback: load all active programs
      try {
        const res = await apiClient
          .get("/api/v1/programs", {
            params: {
              campusId: activeCampusId || undefined,
              boardId: currentBoard || undefined,
            },
            headers: {
              ...(activeCampusId ? { "X-Campus-Id": String(activeCampusId) } : {}),
            },
          })
          .catch(() => null);

        const raw = unwrapRecords(res);
        const list = raw
          .map((p) => ({
            id: normalizeId(p.programId ?? p.id),
            name: p.programName ?? p.name,
            groupId: p.groupId,
            isActive: p.isActive !== false,
          }))
          .filter((p) => p.isActive);

        if (isMounted) setPrograms(list);
      } catch (err) {
        console.error("Error fetching programs:", err);
        if (isMounted) setPrograms([]);
      }
    };

    loadPrograms();
    return () => {
      isMounted = false;
    };
  }, [filters.group, filters.board, effectiveBoardId, groups, activeCampusId]);

  // Load Sections (Independent: queries with whatever filters are set)
  useEffect(() => {
    let isMounted = true;
    const currentBoard = filters.board || effectiveBoardId;
    const currentYear = filters.year || effectiveYearId;

    const loadSections = async () => {
      try {
        const res = await apiClient.get(apiEndpoints.sections?.getAll || "/api/v1/Sections", {
          params: {
            campusId: activeCampusId || undefined,
            CampusId: activeCampusId || undefined,
            BoardId: currentBoard || undefined,
            AcademicYearId: currentYear || undefined,
            AcademicLevelId: filters.level || undefined,
            GroupId: filters.group || undefined,
            ProgramId: filters.program || undefined,
            IsActive: true,
          },
          headers: {
            ...(activeCampusId ? { "X-Campus-Id": String(activeCampusId) } : {}),
          },
        });
        const raw = unwrapRecords(res);
        const list = raw
          .map((s) => ({
            id: normalizeId(s.sectionId ?? s.id),
            name: s.sectionName ?? s.name,
            inchargeId: s.inchargeId ?? s.facultyId,
            inchargeName: s.inchargeName ?? s.facultyName,
            groupId: normalizeId(s.groupId),
            programId: normalizeId(s.programId),
            academicLevelId: normalizeId(s.academicLevelId),
            academicYearId: normalizeId(s.academicYearId),
            boardId: normalizeId(s.boardId),
            isActive: s.isActive !== false,
          }))
          .filter((s) => s.isActive);

        if (isMounted) setSections(list);
      } catch (err) {
        console.error("Error fetching sections:", err);
        if (isMounted) setSections([]);
      }
    };

    loadSections();
    return () => {
      isMounted = false;
    };
  }, [filters.board, filters.year, filters.level, filters.group, filters.program, effectiveBoardId, effectiveYearId, activeCampusId]);

  // Load Completed Examinations (Independent: queries with whatever filters are set)
  useEffect(() => {
    let isMounted = true;
    const currentBoard = filters.board || effectiveBoardId;
    const currentYear = filters.year || effectiveYearId;

    const loadExams = async () => {
      try {
        const examsRes = await apiClient.get(apiEndpoints.examinations?.getAll || "/api/v1/examinations", {
          params: {
            campusId: activeCampusId || undefined,
            CampusId: activeCampusId || undefined,
            boardId: currentBoard || undefined,
            BoardId: currentBoard || undefined,
            academicYearId: currentYear || undefined,
            AcademicYearId: currentYear || undefined,
            academicLevelId: filters.level || undefined,
            AcademicLevelId: filters.level || undefined,
            groupId: filters.group || undefined,
            GroupId: filters.group || undefined,
            programId: filters.program || undefined,
            ProgramId: filters.program || undefined,
            status: "COMPLETED",
          },
          headers: {
            ...(activeCampusId ? { "X-Campus-Id": String(activeCampusId) } : {}),
          },
        });
        const rawExams = unwrapRecords(examsRes);
        const examList = (rawExams.length ? rawExams : [])
          .map((e) => {
            const rawStatus = String(e.status ?? e.examStatus ?? e.examinationStatus ?? "").trim().toUpperCase();
            const examCode = e.examCode ?? e.code ?? "";
            const examName = e.examName ?? e.examinationName ?? e.name ?? "Examination";
            const examId = normalizeId(e.examinationId ?? e.id ?? e.examId);
            return {
              ...e,
              id: examId,
              examinationId: examId,
              code: examCode,
              examCode: examCode,
              name: examName,
              examName: examName,
              status: rawStatus,
              scheduleMode: e.scheduleMode || e.mode || "",
              examPattern: e.examPattern || e.pattern || e.patternName || "",
              examCategory: e.examCategory || e.category || "",
              boardId: normalizeId(e.boardId ?? e.BoardId),
              academicYearId: normalizeId(e.academicYearId ?? e.AcademicYearId ?? e.yearId),
              academicYearName: e.academicYearName ?? e.academicYear ?? "",
              academicLevelId: normalizeId(e.academicLevelId ?? e.AcademicLevelId),
              groupId: normalizeId(e.groupId ?? e.GroupId),
              programId: normalizeId(e.programId ?? e.ProgramId),
              schedules: e.schedules || e.examinationSchedules || [],
              selectedSubjectIds: e.selectedSubjectIds || e.selectedSubjectIdList || [],
              isActive: e.isActive !== false,
              isCompleted: Boolean(e.isCompleted || rawStatus === "COMPLETED"),
            };
          })
          .filter((e) => {
            if (!e.isActive) return false;
            // STRICT FILTER: Only genuinely Completed Examinations
            const isCompleted = e.status === "COMPLETED" || e.isCompleted === true;
            if (!isCompleted || e.status === "SCHEDULED" || e.status === "DRAFT" || e.status === "PUBLISHED") return false;

            if (currentBoard && e.boardId && !eq(e.boardId, currentBoard)) return false;
            if (currentYear && e.academicYearId && !eq(e.academicYearId, currentYear)) return false;
            if (filters.level && e.academicLevelId && !eq(e.academicLevelId, filters.level)) return false;
            if (filters.group && e.groupId && !eq(e.groupId, filters.group)) return false;
            if (filters.program && e.programId && !eq(e.programId, filters.program)) return false;

            return true;
          });

        if (isMounted) {
          setExams(examList);
          setFilters((prev) => {
            if (prev.exam && !examList.some((e) => eq(e.id, prev.exam))) {
              return { ...prev, exam: "" };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Error fetching examinations:", err);
        if (isMounted) setExams([]);
      }
    };

    loadExams();
    return () => {
      isMounted = false;
    };
  }, [filters.board, filters.year, filters.level, filters.group, filters.program, effectiveBoardId, effectiveYearId, activeCampusId]);

  // Reset non-navbar filters only when navbar selected campus changes
  const initialCampusRef = useRef(activeCampusId);
  useEffect(() => {
    if (initialCampusRef.current === activeCampusId) return;
    initialCampusRef.current = activeCampusId;
    onReset();
    setFilters((prev) => ({
      board: effectiveBoardId || prev.board,
      year: effectiveYearId || prev.year,
      level: "",
      group: "",
      program: "",
      section: "",
      exam: "",
    }));
  }, [activeCampusId, effectiveBoardId, effectiveYearId]);

  // Change filter handler (Clears dependent section/exam when higher-level context changes)
  const changeFilter = (key, value) =>
    guard(() => {
      onReset();
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "level" || key === "group" || key === "program") {
          next.section = "";
          next.exam = "";
        } else if (key === "section") {
          next.exam = "";
        }
        return next;
      });
    });

  return {
    filters,
    setFilters,
    years,
    levels,
    groups,
    programs,
    sections,
    exams,
    setExams,
    changeFilter,
  };
}

export default function MarksEntryPage({ embedded = false } = {}) {
  const {
    campuses: contextCampuses = [],
    activeCampuses = [],
    selectedCampus = null,
    selectedCampusId = null,
  } = useCampusContext();

  const academicCtx = useAcademicContext();
  const {
    selectedBoard = null,
    selectedBoardId = null,
    setSelectedBoard = () => { },
    selectedAcademicYear = null,
    selectedAcademicYearId = null,
    setSelectedAcademicYear = () => { },
    boards: contextBoards = [],
    academicYears: contextAcademicYears = [],
  } = academicCtx;

  const effectiveCampuses = useMemo(() => {
    if (Array.isArray(activeCampuses) && activeCampuses.length > 0) return activeCampuses;
    return (contextCampuses || []).filter((c) => c && c.isActive !== false && String(c.status || "").toLowerCase() !== "inactive");
  }, [activeCampuses, contextCampuses]);

  const effectiveCampus = useMemo(() => {
    const targetId = normalizeId(selectedCampusId ?? selectedCampus?.id ?? selectedCampus?.campusId);
    if (targetId) {
      const match = effectiveCampuses.find((c) => normalizeId(c.id) === targetId || normalizeId(c.campusId) === targetId);
      if (match) return match;
      if (selectedCampus && (normalizeId(selectedCampus.id) === targetId || normalizeId(selectedCampus.campusId) === targetId)) {
        return selectedCampus;
      }
      return { id: targetId, campusId: targetId, name: selectedCampus?.name || `Campus ${targetId}` };
    }
    return selectedCampus || effectiveCampuses.find((c) => c.isHQ) || effectiveCampuses[0] || null;
  }, [effectiveCampuses, selectedCampusId, selectedCampus]);

  const effectiveCampusId = useMemo(() => {
    const rawId = selectedCampusId ?? selectedCampus?.id ?? selectedCampus?.campusId ?? effectiveCampus?.campusId ?? effectiveCampus?.id;
    return normalizeId(rawId || "1");
  }, [effectiveCampus, selectedCampus, selectedCampusId]);

  // Navigation Tabs (Ref Screenshots 1, 2, 5): "entry" | "evaluation" | "students"
  const [tab, setTab] = useState("entry");

  // Initial Master Boards (Loaded once on mount)
  const [allBoards, setAllBoards] = useState([]);

  // Shared UI Notifications and Unsaved Modals
  const [toast, setToast] = useState(null);
  const [pending, setPending] = useState(null);
  const [processing, setProcessing] = useState("");
  const [editingKey, setEditingKey] = useState("");
  const snapshots = useRef({});
  const timer = useRef(null);
  const fileInputRef = useRef(null);

  // Central in-memory workspaces store for subject marks and evaluations
  const [workspaces, setWorkspaces] = useState({});

  const notify = (text, type = "success") => {
    clearTimeout(timer.current);
    setToast({ text, type });
    timer.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const dirty = Object.values(workspaces).some((item) => item.dirty);
  const guard = (action) => (dirty ? setPending(() => action) : action());

  // 1. Initial Load: Fetch All Active Boards
  useEffect(() => {
    let isMounted = true;
    const loadBoards = async () => {
      try {
        const boardsRes = await apiClient
          .get("/api/v1/boards")
          .catch(() => apiClient.get("/api/v1/academic-boards"))
          .catch(() => null);
        const raw = unwrapRecords(boardsRes);
        const loadedBoards = raw
          .map((b) => ({
            id: normalizeId(b.boardId ?? b.id),
            name: b.boardName ?? b.name,
            code: b.boardCode ?? b.code,
            isActive: b.status !== false && b.isActive !== false,
            academicLevelIds: b.academicLevelIds,
            academicLevelNames: b.academicLevelNames,
          }))
          .filter((b) => b.isActive);

        if (isMounted) {
          if (loadedBoards.length > 0) {
            setAllBoards(loadedBoards);
          } else if (contextBoards.length > 0) {
            setAllBoards(contextBoards);
          } else if (selectedBoard) {
            setAllBoards([{
              id: normalizeId(selectedBoard.id ?? selectedBoard.boardId),
              boardId: normalizeId(selectedBoard.id ?? selectedBoard.boardId),
              name: selectedBoard.name ?? selectedBoard.boardName ?? "Board",
              code: selectedBoard.code ?? selectedBoard.boardCode ?? "",
              isActive: true,
            }]);
          }
        }
      } catch (err) {
        console.error("Error loading boards:", err);
        if (isMounted) {
          if (contextBoards.length > 0) {
            setAllBoards(contextBoards);
          } else if (selectedBoard) {
            setAllBoards([{
              id: normalizeId(selectedBoard.id ?? selectedBoard.boardId),
              boardId: normalizeId(selectedBoard.id ?? selectedBoard.boardId),
              name: selectedBoard.name ?? selectedBoard.boardName ?? "Board",
              code: selectedBoard.code ?? selectedBoard.boardCode ?? "",
              isActive: true,
            }]);
          }
        }
      }
    };
    loadBoards();
    return () => {
      isMounted = false;
    };
  }, [contextBoards, selectedBoard]);

  const campusAffiliatedBoardIds = useMemo(() => {
    if (!effectiveCampus) return [];
    const ids = new Set();
    if (Array.isArray(effectiveCampus.boardIds)) {
      effectiveCampus.boardIds.forEach((id) => id && ids.add(normalizeId(id)));
    }
    if (Array.isArray(effectiveCampus.affiliatedBoards)) {
      effectiveCampus.affiliatedBoards.forEach((b) => {
        const bId = normalizeId(b.boardId ?? b.id);
        if (bId) ids.add(bId);
      });
    }
    return Array.from(ids);
  }, [effectiveCampus]);

  // Derive boards affiliated with active campus
  const campusBoards = useMemo(() => {
    const fallbackList = selectedBoard ? [{
      id: normalizeId(selectedBoard.id ?? selectedBoard.boardId),
      boardId: normalizeId(selectedBoard.id ?? selectedBoard.boardId),
      name: selectedBoard.name ?? selectedBoard.boardName ?? "Board",
      code: selectedBoard.code ?? selectedBoard.boardCode ?? "",
      isActive: true,
    }] : [];
    const masterBoardsPool = allBoards.length > 0 ? allBoards : (contextBoards.length > 0 ? contextBoards : fallbackList);
    if (!effectiveCampus) return masterBoardsPool;

    const affiliated = Array.isArray(effectiveCampus.affiliatedBoards) && effectiveCampus.affiliatedBoards.length > 0
      ? effectiveCampus.affiliatedBoards
      : [];
    const boardIds = campusAffiliatedBoardIds;

    if (!affiliated.length && !boardIds.length) return masterBoardsPool;

    const matched = masterBoardsPool.filter((b) => {
      const bId = normalizeId(b.id ?? b.boardId);
      const bCode = String(b.code || "").trim().toLowerCase();
      const bName = String(b.name || "").trim().toLowerCase();
      const matchesAff = affiliated.some((aff) => {
        const affId = normalizeId(aff.boardId ?? aff.id);
        const affCode = String(aff.boardCode ?? aff.code ?? "").trim().toLowerCase();
        const affName = String(aff.boardName ?? aff.name ?? "").trim().toLowerCase();
        return (affId && affId === bId) || (affCode && affCode === bCode) || (affName && affName === bName);
      });
      const matchesId = boardIds.length > 0 && boardIds.includes(bId);
      return matchesAff || matchesId;
    });

    if (matched.length > 0) return matched;

    if (affiliated.length > 0) {
      return affiliated.map((item) => ({
        ...item,
        id: normalizeId(item.boardId ?? item.id),
        boardId: normalizeId(item.boardId ?? item.id),
        name: item.boardName ?? item.name,
        code: item.boardCode ?? item.code ?? "",
        isActive: true,
      }));
    }

    return masterBoardsPool;
  }, [allBoards, contextBoards, effectiveCampus, campusAffiliatedBoardIds]);

  // 1. Campus Change -> Cascade Board Change
  const prevCampusIdRef = useRef(effectiveCampusId);
  useEffect(() => {
    if (!effectiveCampusId || !campusBoards.length) return;

    const isCampusSwitched = prevCampusIdRef.current !== effectiveCampusId;
    prevCampusIdRef.current = effectiveCampusId;

    const currentBoardId = normalizeId(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId);
    const isCurrentValid = currentBoardId && (
      (campusAffiliatedBoardIds.length > 0 && campusAffiliatedBoardIds.includes(currentBoardId)) ||
      campusBoards.some((b) => normalizeId(b.id ?? b.boardId) === currentBoardId)
    );

    if (!isCurrentValid || (isCampusSwitched && !campusAffiliatedBoardIds.includes(currentBoardId))) {
      const nextBoard = campusBoards[0];
      if (nextBoard && typeof setSelectedBoard === "function") {
        setSelectedBoard(nextBoard);
      }
    }
  }, [effectiveCampusId, campusBoards, campusAffiliatedBoardIds, selectedBoardId, selectedBoard, setSelectedBoard]);

  // 2. Board Change -> Cascade Academic Year Change
  const prevBoardIdRef = useRef(normalizeId(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId));
  useEffect(() => {
    const currentBoardId = normalizeId(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId);
    if (!currentBoardId) return;

    const isBoardSwitched = prevBoardIdRef.current !== currentBoardId;
    prevBoardIdRef.current = currentBoardId;

    const masterYears = contextAcademicYears.length > 0 ? contextAcademicYears : [];
    const boardYears = masterYears.filter((y) => {
      const yBoardId = normalizeId(y.boardId ?? y.BoardId);
      return !yBoardId || yBoardId === currentBoardId;
    });

    if (boardYears.length === 0) return;

    const currentYearId = normalizeId(selectedAcademicYearId ?? selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId);
    const isCurrentYearValid = currentYearId && boardYears.some((y) => normalizeId(y.id ?? y.academicYearId) === currentYearId);

    if (!isCurrentYearValid || isBoardSwitched) {
      const currentYearName = String(selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || selectedAcademicYear?.code || "").trim();
      const matchingByName = currentYearName
        ? boardYears.find((y) => String(y.name || y.code || "").trim().toLowerCase() === currentYearName.toLowerCase())
        : null;
      const nextYear = matchingByName || boardYears.find((y) => y.isActive !== false) || boardYears[0];

      if (nextYear && typeof setSelectedAcademicYear === "function") {
        setSelectedAcademicYear(nextYear);
      }
    }
  }, [selectedBoardId, selectedBoard, contextAcademicYears, selectedAcademicYearId, selectedAcademicYear, setSelectedAcademicYear]);

  // ==========================================
  // TAB 1: MARKS ENTRY STATE & WORKFLOW
  // ==========================================
  const [entryApplied, setEntryApplied] = useState(false);
  const [entryStudents, setEntryStudents] = useState([]);
  const [entryConfigs, setEntryConfigs] = useState([]);
  const [entryExamId, setEntryExamId] = useState("");
  const [entrySubjectId, setEntrySubjectId] = useState("");
  const [entryPage, setEntryPage] = useState(1);
  const [entryPageSize, setEntryPageSize] = useState(5);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const activeFetchRef = useRef(0);

  // Bulk Import Modal State (Ref Image 5)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const entry = useAcademicFilterState(campusBoards.length > 0 ? campusBoards : allBoards, guard, () => setEntryApplied(false));

  // Helper to load schedules & search evaluations for an examination in Marks Entry
  const loadExamConfigsAndEvaluations = async (examId, sectionId, examList = entry.exams, studentList = entryStudents) => {
    if (!examId || !sectionId) return;
    const selectedExam = examList.find((e) => eq(e.id, examId));
    let schedules = selectedExam?.schedules || [];
    let examDetail = null;

    try {
      const detailRes = await apiClient.get(`/api/v1/examinations/${examId}`).catch(() => null);
      examDetail = detailRes?.data || detailRes;
      if (examDetail?.schedules?.length) {
        schedules = examDetail.schedules;
      } else if (examDetail?.examinationSchedules?.length) {
        schedules = examDetail.examinationSchedules;
      }
    } catch (e) {
      console.warn("Could not fetch exam schedules:", e);
    }

    const effectiveExam = examDetail || selectedExam;

    const configs = await fetchAndBuildSubjectConfigs(examId, sectionId, effectiveExam, schedules, effectiveCampusId);

    setEntryConfigs(configs);
    const chosenSubjectId = configs.some((c) => eq(c.subjectId, entrySubjectId)) ? entrySubjectId : configs[0]?.subjectId || "";
    setEntrySubjectId(chosenSubjectId);

    // Search existing evaluations & marks in parallel
    try {
      const evalSearchUrl = apiEndpoints.evaluations?.search || "/api/v1/evaluations/search";
      const [evalSearchRes, marksRes] = await Promise.all([
        apiClient
          .post(
            evalSearchUrl,
            {
              campusId: Number(effectiveCampusId) || 1,
              boardId: Number(entry.filters.board),
              academicYearId: Number(entry.filters.year),
              academicLevelId: Number(entry.filters.level),
              groupId: Number(entry.filters.group),
              sectionId: Number(sectionId),
              examinationId: Number(examId),
            },
            {
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            }
          )
          .catch(() =>
            apiClient
              .get("/api/v1/faculty/evaluations", {
                headers: {
                  ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
                },
              })
              .catch(() => null)
          ),
        apiClient
          .get(`/api/v1/marks/exam/${examId}`, {
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          })
          .catch(() =>
            apiClient
              .get(`/api/v1/marks?examinationId=${examId}`, {
                headers: {
                  ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
                },
              })
              .catch(() => null)
          ),
      ]);

      const existingEvals = unwrapRecords(evalSearchRes) || [];
      const allExamMarks = unwrapRecords(marksRes) || [];

      setWorkspaces((prev) => {
        const next = { ...prev };

        configs.forEach((config) => {
          const key = evaluationKey({ examinationId: examId, sectionId, subjectId: config.subjectId });
          const ev = existingEvals.find((e) => {
            const parts = String(e.evaluationId || "").split("_");
            const evSubId = normalizeId(e.subjectId ?? (parts.length >= 3 ? parts[0] : ""));
            const evSecId = normalizeId(e.sectionId ?? (parts.length >= 3 ? parts[1] : sectionId));
            const evExamId = normalizeId(e.examinationId ?? e.examId ?? (parts.length >= 3 ? parts[2] : examId));
            return eq(evSubId, config.subjectId) && eq(evSecId, sectionId) && eq(evExamId, examId);
          });

          const subjMarks = allExamMarks.filter(
            (m) =>
              eq(m.subjectId, config.subjectId) &&
              (!m.sectionId || eq(m.sectionId, sectionId)) &&
              m.isActive !== false
          );

          const reconciledRows = reconcileRosterWithMarks(studentList, subjMarks, config, prev[key]?.rows);

          const hasRecordedMarks = (reconciledRows || []).some((r) =>
            r.absent ||
            (r.obtainedMarks !== "" && r.obtainedMarks !== null && r.obtainedMarks !== undefined && Number(r.obtainedMarks) > 0) ||
            (r.theory !== "" && r.theory !== null && r.theory !== undefined && Number(r.theory) > 0) ||
            (r.internal !== "" && r.internal !== null && r.internal !== undefined && Number(r.internal) > 0) ||
            (r.practical !== "" && r.practical !== null && r.practical !== undefined && Number(r.practical) > 0) ||
            (r.total !== "" && r.total !== null && r.total !== undefined && Number(r.total) > 0)
          );

          let evalStatus = "NOT STARTED";
          if (hasRecordedMarks) {
            evalStatus = ev ? String(ev.status || "DRAFT").trim().toUpperCase() : "DRAFT";
            if (subjMarks.length > 0) {
              evalStatus =
                ev?.status ||
                subjMarks[0].evaluationStatus ||
                (subjMarks[0].status === 3 ? "APPROVED" : subjMarks[0].status === 1 ? "SUBMITTED" : "DRAFT");
            }
          }

          next[key] = {
            evaluationId: ev?.evaluationId || `${config.subjectId}_${sectionId}_${examId}`,
            examinationId: examId,
            sectionId: sectionId,
            subjectId: config.subjectId,
            facultyId: config.facultyId || ev?.facultyId || "1",
            faculty: { name: config.facultyName || ev?.facultyName || "Assigned Faculty", employeeCode: ev?.facultyCode || "" },
            subject: { id: config.subjectId, name: config.subjectName, code: config.subjectCode },
            status: evalStatus,
            mode: config.mode,
            maxMarks: config.maxMarks,
            internalMax: config.internalMax,
            practicalMax: config.practicalMax,
            theoryMax: config.theoryMax,
            passPercentage: config.passPercentage,
            rejectionReason: ev?.rejectionReason || "",
            adminReviewMessage: ev?.adminReviewMessage || "",
            remarks: ev?.remarks || "",
            averageMarks: ev?.averageMarks,
            average: ev?.averageMarks !== undefined && ev?.averageMarks !== null ? String(ev.averageMarks) : "—",
            highestMarks: ev?.highestMarks,
            highest: ev?.highestMarks !== undefined && ev?.highestMarks !== null ? String(ev.highestMarks) : "—",
            lowestMarks: ev?.lowestMarks,
            lowest: ev?.lowestMarks !== undefined && ev?.lowestMarks !== null ? String(ev.lowestMarks) : "—",
            totalStudents: studentList.length,
            presentStudents: subjMarks.filter((m) => !m.isAbsent && !m.absent && (m.obtainedMarks !== "" || m.totalMarks !== "" || m.total !== "")).length,
            absentStudents: subjMarks.filter((m) => Boolean(m.isAbsent || m.absent)).length,
            studentsCount: studentList.length,
            rows: reconciledRows,
            dirty: false,
            validationErrors: {},
            rowVersion: ev?.rowVersion || prev[key]?.rowVersion || 0,
            updatedAt: ev?.lastSubmittedAt || ev?.updatedAt || new Date().toISOString(),
          };
        });

        return next;
      });
    } catch (err) {
      console.warn("Notice: evaluation search:", err);
    }
  };

  // Button Click Action: "Enter Marks" (Enabled when 6 filters selected)
  const applyEntryContext = async () => {
    if (!entry.filters.section || processing) return;
    setProcessing("ENTER_MARKS");
    setLoadingWorkspace(true);
    try {
      const effectiveEntryFilters = {
        board: entry.filters.board || effectiveBoardId,
        year: entry.filters.year || effectiveYearId,
        level: entry.filters.level,
        group: entry.filters.group,
        program: entry.filters.program,
        section: entry.filters.section,
      };
      // 1. Fetch Students for the selected section matching Student Management
      const studentList = await fetchAuthoritativeSectionStudents(effectiveEntryFilters, effectiveCampusId);
      setEntryStudents(studentList);

      // 2. Fetch Completed Examinations strictly matching academic scope
      const examsRes = await apiClient.get(apiEndpoints.examinations.getAll, {
        params: {
          campusId: effectiveCampusId || undefined,
          CampusId: effectiveCampusId || undefined,
          boardId: effectiveEntryFilters.board,
          BoardId: effectiveEntryFilters.board,
          academicYearId: effectiveEntryFilters.year,
          AcademicYearId: effectiveEntryFilters.year,
          academicLevelId: effectiveEntryFilters.level,
          AcademicLevelId: effectiveEntryFilters.level,
          groupId: effectiveEntryFilters.group,
          GroupId: effectiveEntryFilters.group,
          programId: effectiveEntryFilters.program || undefined,
          ProgramId: effectiveEntryFilters.program || undefined,
          status: "COMPLETED",
          Status: "COMPLETED",
        },
        skipGlobalLoader: true,
      });
      const rawExams = unwrapRecords(examsRes);
      const examList = (rawExams || [])
        .map((e) => {
          const rawStatus = String(e.status ?? e.examStatus ?? e.examinationStatus ?? "").trim().toUpperCase();
          const examCode = e.examCode ?? e.code ?? "";
          const examName = e.examName ?? e.examinationName ?? e.name ?? "Examination";
          const examId = normalizeId(e.examinationId ?? e.id ?? e.examId);
          return {
            ...e,
            id: examId,
            examinationId: examId,
            code: examCode,
            examCode: examCode,
            name: examName,
            examName: examName,
            status: rawStatus,
            scheduleMode: e.scheduleMode || e.mode || "",
            examPattern: e.examPattern || e.pattern || e.patternName || "",
            examCategory: e.examCategory || e.category || "",
            startDate: e.startDate || e.examStartDate || e.examDate || null,
            endDate: e.endDate || e.examEndDate || e.completionDate || null,
            boardId: normalizeId(e.boardId ?? e.BoardId),
            academicYearId: normalizeId(e.academicYearId ?? e.AcademicYearId ?? e.yearId),
            academicLevelId: normalizeId(e.academicLevelId ?? e.AcademicLevelId),
            groupId: normalizeId(e.groupId ?? e.GroupId),
            programId: normalizeId(e.programId ?? e.ProgramId),
            schedules: e.schedules || e.examinationSchedules || [],
            selectedSubjectIds: e.selectedSubjectIds || e.selectedSubjectIdList || [],
            isActive: e.isActive !== false,
            isCompleted: Boolean(e.isCompleted || rawStatus === "COMPLETED"),
          };
        })
        .filter((e) => {
          if (!e.isActive) return false;
          // STRICT FILTER: Only genuinely Completed Examinations
          const isCompleted = e.status === "COMPLETED" || e.isCompleted === true;
          if (!isCompleted || e.status === "SCHEDULED" || e.status === "DRAFT" || e.status === "PUBLISHED") return false;

          if (entry.filters.board && e.boardId && !eq(e.boardId, entry.filters.board)) return false;
          if (entry.filters.year && e.academicYearId && !eq(e.academicYearId, entry.filters.year)) return false;
          if (entry.filters.level && e.academicLevelId && !eq(e.academicLevelId, entry.filters.level)) return false;
          if (entry.filters.group && e.groupId && !eq(e.groupId, entry.filters.group)) return false;
          if (entry.filters.program && e.programId && !eq(e.programId, entry.filters.program)) return false;

          return true;
        });

      const chosenExamId = entryExamId && examList.some((e) => eq(e.id, entryExamId))
        ? entryExamId
        : "";
      setEntryExamId(chosenExamId);
      if (entry.setExams) entry.setExams(examList);

      // 3. Load configs and search evaluations if exam is chosen
      if (chosenExamId) {
        await loadExamConfigsAndEvaluations(chosenExamId, entry.filters.section, examList, studentList);
      }

      setEntryApplied(true);
      setEntryPage(1);
      notify("Marks Entry workspace loaded.");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
      setLoadingWorkspace(false);
    }
  };

  // Change Examination inside Marks Entry Workspace
  const changeEntryExam = (newExamId) => {
    guard(async () => {
      setEntryExamId(newExamId);
      setEntrySubjectId("");
      setEntryPage(1);
      setLoadingWorkspace(true);
      try {
        if (newExamId && entry.filters.section) {
          await loadExamConfigsAndEvaluations(newExamId, entry.filters.section, entry.exams, entryStudents);
        }
      } finally {
        setLoadingWorkspace(false);
      }
    });
  };

  // Current Workspace for Marks Entry
  const workspaceKey =
    entrySubjectId && entry.filters.section && entryExamId
      ? evaluationKey({ examinationId: entryExamId, sectionId: entry.filters.section, subjectId: entrySubjectId })
      : "";
  const workspace = workspaces[workspaceKey];

  // Load subject workspace student marks rows
  useEffect(() => {
    if (!entryApplied || !entry.filters.section || !entryExamId || !entrySubjectId) {
      setLoadingWorkspace(false);
      return;
    }
    const config = entryConfigs.find((c) => eq(c.subjectId, entrySubjectId));
    if (!config) {
      setLoadingWorkspace(false);
      return;
    }

    const currentWs = workspaces[workspaceKey];
    if (currentWs && currentWs.rows?.length === entryStudents.length && !currentWs.dirty) {
      setLoadingWorkspace(false);
      return; // already fully loaded and reconciled
    }

    const fetchId = ++activeFetchRef.current;
    setLoadingWorkspace(true);

    const loadWorkspaceMarks = async () => {
      let loadedRows = [];
      let evalStatus = currentWs?.status || "NOT STARTED";
      const compositeEvalId = `${config.subjectId}_${entry.filters.section}_${entryExamId}`;
      let evalId = currentWs?.evaluationId || compositeEvalId;
      let rowVer = 0;

      try {
        let rawMarks = [];
        // 1. Authoritative: Fetch student marks directly from /api/v1/marks/exam/{entryExamId}
        try {
          const marksRes = await apiClient
            .get(`/api/v1/marks/exam/${entryExamId}`, { params: { campusId: effectiveCampusId } })
            .catch(() => apiClient.get(`/api/v1/marks?examinationId=${entryExamId}`, { params: { campusId: effectiveCampusId } }).catch(() => null));
          const allExamMarks = unwrapRecords(marksRes) || [];
          const subjMarks = allExamMarks.filter(
            (m) =>
              eq(m.subjectId, config.subjectId) &&
              (!m.sectionId || eq(m.sectionId, entry.filters.section)) &&
              m.isActive !== false
          );
          if (subjMarks.length) {
            rawMarks = subjMarks;
            evalStatus =
              subjMarks[0].evaluationStatus ||
              currentWs?.status ||
              (subjMarks[0].status === 3 ? "APPROVED" : subjMarks[0].status === 1 ? "SUBMITTED" : "DRAFT");
          }
        } catch (err) {
          console.warn("Could not query exam marks:", err);
        }

        // 2. Only if marks table has no rows and an existing evaluation is confirmed by search, query evaluation students
        if (!rawMarks.length && currentWs?.evaluationId && currentWs.status !== "NOT STARTED") {
          try {
            const evalStudentsUrl = apiEndpoints.evaluations?.students
              ? apiEndpoints.evaluations.students(evalId)
              : `/api/v1/evaluations/${evalId}/students`;
            const evalStudentsRes = await apiClient.get(evalStudentsUrl, { params: { campusId: effectiveCampusId } });
            const resData = evalStudentsRes?.data || {};
            evalStatus = resData.status || evalStatus;
            rowVer = resData.rowVersion || rowVer;
            const markItems = resData.students || resData.marksList || [];
            if (markItems.length) {
              rawMarks = markItems;
            }
          } catch {
            // Evaluation records not yet initialized
          }
        }

        // Reconcile complete authoritative section roster with marks
        loadedRows = reconcileRosterWithMarks(
          entryStudents,
          rawMarks,
          config,
          currentWs?.rows
        );

        if (fetchId !== activeFetchRef.current) return;

        const hasAnyEnteredMarks = (loadedRows || []).some((r) =>
          r.absent ||
          (r.obtainedMarks !== "" && r.obtainedMarks !== null && r.obtainedMarks !== undefined && Number(r.obtainedMarks) > 0) ||
          (r.theory !== "" && r.theory !== null && r.theory !== undefined && Number(r.theory) > 0) ||
          (r.internal !== "" && r.internal !== null && r.internal !== undefined && Number(r.internal) > 0) ||
          (r.practical !== "" && r.practical !== null && r.practical !== undefined && Number(r.practical) > 0) ||
          (r.total !== "" && r.total !== null && r.total !== undefined && Number(r.total) > 0)
        );

        if (!hasAnyEnteredMarks) {
          evalStatus = "NOT STARTED";
        }

        setWorkspaces((all) => {
          const existing = all[workspaceKey] || {};
          return {
            ...all,
            [workspaceKey]: {
              ...existing,
              evaluationId: evalId,
              examinationId: entryExamId,
              sectionId: entry.filters.section,
              subjectId: config.subjectId,
              facultyId: config.facultyId || existing.facultyId || "1",
              faculty: { name: config.facultyName || existing.faculty?.name || "Assigned Faculty", employeeCode: "" },
              subject: { id: config.subjectId, name: config.subjectName, code: config.subjectCode },
              status: evalStatus,
              mode: config.mode,
              maxMarks: config.maxMarks,
              internalMax: config.internalMax,
              practicalMax: config.practicalMax,
              theoryMax: config.theoryMax,
              passPercentage: config.passPercentage,
              rejectionReason: existing.rejectionReason || currentWs?.rejectionReason || "",
              rows: loadedRows,
              dirty: false,
              validationErrors: {},
              rowVersion: rowVer,
              updatedAt: new Date().toISOString(),
            },
          };
        });
      } finally {
        if (fetchId === activeFetchRef.current) {
          setLoadingWorkspace(false);
        }
      }
    };

    loadWorkspaceMarks();
  }, [entryApplied, entry.filters.section, entryExamId, entrySubjectId, entryConfigs, entryStudents, workspaceKey]);

  // Master lookup helper
  const getMasterName = (list, id, fallback = "") => {
    if (!id) return fallback;
    const item = list.find(
      (x) =>
        eq(x.id, id) ||
        eq(x.boardId, id) ||
        eq(x.academicYearId, id) ||
        eq(x.academicLevelId, id) ||
        eq(x.groupId, id) ||
        eq(x.sectionId, id)
    );
    return (
      item?.name ||
      item?.boardName ||
      item?.yearName ||
      item?.levelName ||
      item?.groupName ||
      item?.sectionName ||
      fallback
    );
  };

  // Ensure mark records are created/persisted in backend DB
  const ensurePersistedMarks = async (ws) => {
    if (!ws || !ws.rows?.length) return ws?.evaluationId;
    const examIdNum = Number(ws.examinationId || entryExamId);
    const subjectIdNum = Number(ws.subjectId);
    const sectionIdNum = Number(ws.sectionId || entry.filters.section);
    const compositeId = `${subjectIdNum}_${sectionIdNum}_${examIdNum}`;

    if (!examIdNum || !subjectIdNum || !sectionIdNum) {
      return ws.evaluationId || compositeId;
    }

    try {
      let existingMarks = [];
      try {
        const res = await apiClient.get(`/api/v1/marks/exam/${examIdNum}`);
        const raw = unwrapRecords(res);
        existingMarks = raw.filter(
          (m) => eq(m.subjectId, subjectIdNum) && eq(m.sectionId, sectionIdNum) && m.isActive !== false
        );
      } catch (e) {
        console.warn("Could not query existing marks:", e);
      }

      const missingRows = ws.rows.filter((row) => !existingMarks.some((m) => eq(m.studentId, row.studentId)));

      if (missingRows.length > 0) {
        const selectedExam = (entry.exams || []).find((e) => eq(e.id, examIdNum));
        const selectedSec = (entry.sections || []).find((s) => eq(s.id, sectionIdNum));

        const boardId = Number(selectedExam?.boardId || selectedSec?.boardId || entry.filters.board || 1);
        const academicYearId = Number(
          selectedExam?.academicYearId || selectedSec?.academicYearId || entry.filters.year || 9
        );
        const academicLevelId = Number(
          selectedExam?.academicLevelId || selectedSec?.academicLevelId || entry.filters.level || 1
        );
        const groupId = Number(selectedExam?.groupId || selectedSec?.groupId || entry.filters.group || 1);
        const facultyId = Number(ws.facultyId || 1);

        const boardName = getMasterName(allBoards, boardId, "Board");
        const levelName = getMasterName(entry.levels, academicLevelId, "Academic Level");
        const yearName = getMasterName(entry.years, academicYearId, "Academic Year");

        const campusId = Number(effectiveCampusId) || 1;

        const bulkPayload = {
          campusId,
          marks: missingRows.map((row) => {
            const isAbsent = Boolean(row.absent);
            const isObjective = ws.mode === "OBJECTIVE";
            const intMarks = isAbsent || isObjective ? 0 : Math.round(Number(row.internal || 0));
            const pracMarks = isAbsent || isObjective ? 0 : Math.round(Number(row.practical || 0));
            const theoMarks = isAbsent || isObjective ? 0 : Math.round(Number(row.theory || 0));
            const totalMarks = isAbsent
              ? 0
              : isObjective
                ? Math.round(Number(row.obtainedMarks || 0))
                : Math.round(Number(row.total || 0));

            return {
              campusId,
              studentId: Number(row.studentId),
              examinationId: examIdNum,
              subjectId: subjectIdNum,
              sectionId: sectionIdNum,
              boardId,
              academicYearId,
              academicLevelId,
              groupId,
              facultyId,
              board: boardName,
              academicLevel: levelName,
              academicYear: yearName,
              rollNo: String(row.rollNo || "").trim(),
              studentName: String(row.studentName || "Student").trim(),
              maxMarks: Math.round(Number(ws.maxMarks || 100)),
              passingMarks: Math.ceil((Number(ws.maxMarks || 100) * Number(ws.passPercentage || 35)) / 100),
              theoryMarks: theoMarks,
              practicalMarks: pracMarks,
              internalMarks: intMarks,
              obtainedMarks: totalMarks,
              totalMarks: totalMarks,
              isAbsent,
              remarks: String(row.remarks || "").trim(),
            };
          }),
        };

        await apiClient.post("/api/v1/marks/bulk", bulkPayload, {
          headers: {
            ...(campusId ? { "X-Campus-Id": String(campusId) } : {}),
          },
        });
      }

      return compositeId;
    } catch (err) {
      console.error("ensurePersistedMarks error:", err);
      throw err;
    }
  };

  // Update cell in Marks Entry
  const updateRow = (studentId, field, value) => {
    if (!workspace) return;
    const currentRow = workspace.rows?.find((r) => eq(r.studentId, studentId));
    const isNewStudentRow = !currentRow?.markId;
    const isAllowed =
      editableStatuses.includes(workspace.status) ||
      editingKey === workspaceKey ||
      (workspace.status === "SUBMITTED" && isNewStudentRow);
    if (!isAllowed) return;
    setWorkspaces((all) => {
      const current = all[workspaceKey];
      if (!current) return all;
      return {
        ...all,
        [workspaceKey]: {
          ...current,
          dirty: true,
          validationErrors: {},
          rows: current.rows.map((row) => {
            if (!eq(row.studentId, studentId)) return row;
            if (field === "absent") {
              return value
                ? {
                  ...row,
                  absent: true,
                  internal: 0,
                  practical: 0,
                  theory: 0,
                  obtainedMarks: 0,
                  total: 0,
                  remarks: row.remarks || "Absent",
                  autoAbsentRemark: !row.remarks,
                }
                : {
                  ...row,
                  absent: false,
                  internal: current.mode === "OBJECTIVE" ? 0 : "",
                  practical: current.mode === "OBJECTIVE" ? 0 : (current.practicalMax ? "" : 0),
                  theory: current.mode === "OBJECTIVE" ? 0 : "",
                  obtainedMarks: "",
                  total: "",
                  remarks: row.autoAbsentRemark ? "" : row.remarks,
                  autoAbsentRemark: false,
                };
            }
            const next = { ...row, [field]: field === "remarks" ? value.slice(0, 250) : value };
            if (field === "remarks") next.autoAbsentRemark = false;
            if (current.mode === "REGULAR") {
              const fields = ["internal", ...(current.practicalMax ? ["practical"] : []), "theory"];
              next.total = fields.every((name) => numericMark(next[name]))
                ? fields.reduce((sum, name) => sum + Number(next[name]), 0)
                : "";
              next.obtainedMarks = next.total;
            } else if (field === "obtainedMarks") {
              next.total = value;
              next.obtainedMarks = value;
              next.internal = 0;
              next.practical = 0;
              next.theory = 0;
            }
            return next;
          }),
        },
      };
    });
  };

  // Excel Bulk Import
  const handleExcelImport = (event) => {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!jsonRows || !jsonRows.length) {
          notify("The uploaded Excel sheet contains no data rows.", "error");
          return;
        }

        let matchedCount = 0;
        const updatedRows = workspace.rows.map((studentRow) => {
          const matchedItem = jsonRows.find((excelRow) => {
            const rollKey = Object.keys(excelRow).find((k) => /^(roll\s*no|roll|rollnumber|roll_no)$/i.test(k.trim()));
            const admKey = Object.keys(excelRow).find((k) =>
              /^(adm\s*no|admission|admission_no|admissionno)$/i.test(k.trim())
            );
            const nameKey = Object.keys(excelRow).find((k) => /^(name|student\s*name|studentname)$/i.test(k.trim()));

            if (rollKey && excelRow[rollKey] && eq(excelRow[rollKey], studentRow.rollNo)) return true;
            if (admKey && excelRow[admKey] && eq(excelRow[admKey], studentRow.admissionNo)) return true;
            if (
              nameKey &&
              excelRow[nameKey] &&
              String(excelRow[nameKey]).trim().toLowerCase() === studentRow.studentName.trim().toLowerCase()
            )
              return true;
            return false;
          });

          if (!matchedItem) return studentRow;
          matchedCount += 1;

          const findVal = (regex) => {
            const k = Object.keys(matchedItem).find((key) => regex.test(key.trim()));
            return k !== undefined ? matchedItem[k] : undefined;
          };

          const intVal = findVal(/^(internal|internal\s*marks|internalmarks)$/i);
          const pracVal = findVal(/^(practical|practical\s*marks|practicalmarks)$/i);
          const theoVal = findVal(/^(theory|theory\s*marks|theorymarks)$/i);
          const objVal = findVal(/^(objective|objective\s*marks|objectivemarks|marks|total|obtained|obtained\s*marks|total\s*marks)$/i);
          const absVal = findVal(/^(absent|is\s*absent|isabsent)$/i);
          const remVal = findVal(/^(remarks|remark|comments)$/i);

          const isAbsent =
            absVal === true ||
            String(absVal).toLowerCase() === "yes" ||
            String(absVal).toLowerCase() === "true" ||
            String(totVal).toLowerCase() === "abs" ||
            String(objVal).toLowerCase() === "abs";

          if (isAbsent) {
            return {
              ...studentRow,
              absent: true,
              internal: 0,
              practical: 0,
              theory: 0,
              obtainedMarks: 0,
              total: 0,
              remarks: remVal !== undefined && remVal !== "" ? String(remVal) : "Absent",
            };
          }

          if (workspace.mode === "OBJECTIVE") {
            const entered = objVal !== undefined && objVal !== "" ? String(objVal) : studentRow.obtainedMarks;
            return {
              ...studentRow,
              absent: false,
              internal: 0,
              practical: 0,
              theory: 0,
              obtainedMarks: entered,
              total: entered,
              remarks: remVal !== undefined && remVal !== "" ? String(remVal) : studentRow.remarks,
            };
          }

          const internal = intVal !== undefined && intVal !== "" ? String(intVal) : studentRow.internal;
          const practical = workspace.practicalMax
            ? pracVal !== undefined && pracVal !== ""
              ? String(pracVal)
              : studentRow.practical
            : 0;
          const theory = theoVal !== undefined && theoVal !== "" ? String(theoVal) : studentRow.theory;

          const fields = [internal, ...(workspace.practicalMax ? [practical] : []), theory];
          const total = fields.every((n) => numericMark(n)) ? fields.reduce((sum, n) => sum + Number(n), 0) : "";

          return {
            ...studentRow,
            absent: false,
            internal,
            practical,
            theory,
            obtainedMarks: total,
            total,
            remarks: remVal !== undefined && remVal !== "" ? String(remVal) : studentRow.remarks,
          };
        });

        setWorkspaces((all) => ({
          ...all,
          [workspaceKey]: {
            ...all[workspaceKey],
            dirty: true,
            validationErrors: {},
            rows: updatedRows,
          },
        }));

        notify(`Imported marks for ${matchedCount} student(s) from Excel.`);
      } catch (err) {
        console.error("Excel import parse error:", err);
        notify("Failed to parse Excel file. Please ensure valid .xlsx format.", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download Marks Excel Template for Bulk Import (Ref Image 5)
  const downloadMarksTemplate = () => {
    if (!workspace) return;
    const currentRows = workspace.rows || [];
    const isObjective = workspace.mode === "OBJECTIVE";
    const templateRows = currentRows.map((r) => {
      const obj = {
        "Roll No": r.rollNo || "",
        "Student Name": r.studentName || "",
      };
      if (!isObjective) {
        obj[`Internal (Max ${workspace.internalMax})`] = r.internal !== "" ? r.internal : "";
        if (workspace.practicalMax > 0) {
          obj[`Practical (Max ${workspace.practicalMax})`] = r.practical !== "" ? r.practical : "";
        }
        obj[`Theory (Max ${workspace.theoryMax})`] = r.theory !== "" ? r.theory : "";
      } else {
        obj[`Objective Marks (Max ${workspace.maxMarks})`] = r.obtainedMarks !== "" ? r.obtainedMarks : "";
      }
      obj["Absent"] = r.absent ? "Yes" : "No";
      obj["Remarks"] = r.remarks || "";
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(
      templateRows.length
        ? templateRows
        : [
          {
            "Roll No": "MPC2501",
            "Student Name": "Aarav Sharma",
            ...(!isObjective
              ? {
                [`Internal (Max ${workspace.internalMax})`]: 15,
                ...(workspace.practicalMax > 0 ? { [`Practical (Max ${workspace.practicalMax})`]: 20 } : {}),
                [`Theory (Max ${workspace.theoryMax})`]: 50,
              }
              : {
                [`Objective Marks (Max ${workspace.maxMarks})`]: 85,
              }),
            "Absent": "No",
            "Remarks": "Good",
          },
        ]
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Marks");
    const subCode = workspace.subject?.code || "Marks";
    XLSX.writeFile(workbook, `${subCode}_Marks_Template.xlsx`);
  };

  // Validate File in Bulk Import Modal
  const validateBulkFile = () => {
    if (!bulkFile || !workspace) return;
    setIsValidating(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!jsonRows || !jsonRows.length) {
          setValidationResult({
            isValid: false,
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            duplicateRows: 0,
            errors: [{ row: 0, message: "Uploaded sheet contains no data rows." }],
            validPayloads: [],
          });
          return;
        }

        const errors = [];
        const validPayloads = [];
        const seenRolls = new Set();
        let duplicateRows = 0;

        jsonRows.forEach((excelRow, index) => {
          const rowNum = index + 2;
          const rollKey = Object.keys(excelRow).find((k) => /^(roll\s*no|roll|rollnumber|roll_no)$/i.test(k.trim()));
          const nameKey = Object.keys(excelRow).find((k) => /^(name|student\s*name|studentname)$/i.test(k.trim()));

          const rollVal = rollKey ? String(excelRow[rollKey]).trim() : "";
          const nameVal = nameKey ? String(excelRow[nameKey]).trim() : "";

          if (!rollVal && !nameVal) return;

          if (rollVal && seenRolls.has(rollVal.toLowerCase())) {
            duplicateRows += 1;
            errors.push({ row: rowNum, message: `Duplicate Roll No "${rollVal}".` });
            return;
          }
          if (rollVal) seenRolls.add(rollVal.toLowerCase());

          const targetStudent = workspace.rows.find((r) =>
            (rollVal && eq(r.rollNo, rollVal)) ||
            (nameVal && String(r.studentName).trim().toLowerCase() === nameVal.toLowerCase())
          );

          if (!targetStudent) {
            errors.push({ row: rowNum, message: `Student "${rollVal || nameVal}" not found in current section workspace.` });
            return;
          }

          const findVal = (regex) => {
            const k = Object.keys(excelRow).find((key) => regex.test(key.trim()));
            return k !== undefined ? excelRow[k] : undefined;
          };

          const intVal = findVal(/^(internal|internal\s*marks|internalmarks)/i);
          const pracVal = findVal(/^(practical|practical\s*marks|practicalmarks)/i);
          const theoVal = findVal(/^(theory|theory\s*marks|theorymarks)/i);
          const objVal = findVal(/^(objective|objective\s*marks|objectivemarks|marks|total|obtained|obtained\s*marks|total\s*marks)/i);
          const absVal = findVal(/^(absent|is\s*absent|isabsent)$/i);
          const remVal = findVal(/^(remarks|remark|comments)$/i);

          const isAbsent =
            absVal === true ||
            String(absVal).toLowerCase() === "yes" ||
            String(absVal).toLowerCase() === "true" ||
            String(totVal).toLowerCase() === "abs" ||
            String(objVal).toLowerCase() === "abs";

          let internal = isAbsent || workspace.mode === "OBJECTIVE" ? 0 : intVal !== undefined && intVal !== "" ? String(intVal) : targetStudent.internal;
          let practical = isAbsent || workspace.mode === "OBJECTIVE"
            ? 0
            : workspace.practicalMax
              ? pracVal !== undefined && pracVal !== ""
                ? String(pracVal)
                : targetStudent.practical
              : 0;
          let theory = isAbsent || workspace.mode === "OBJECTIVE" ? 0 : theoVal !== undefined && theoVal !== "" ? String(theoVal) : targetStudent.theory;
          let total = isAbsent ? 0 : "";

          let rowHasError = false;
          if (!isAbsent) {
            if (workspace.mode === "REGULAR") {
              if (internal !== "" && (isNaN(Number(internal)) || Number(internal) < 0 || Number(internal) > workspace.internalMax)) {
                errors.push({ row: rowNum, message: `Internal marks (${internal}) must be between 0 and ${workspace.internalMax}.` });
                rowHasError = true;
              }
              if (workspace.practicalMax > 0 && practical !== "" && (isNaN(Number(practical)) || Number(practical) < 0 || Number(practical) > workspace.practicalMax)) {
                errors.push({ row: rowNum, message: `Practical marks (${practical}) must be between 0 and ${workspace.practicalMax}.` });
                rowHasError = true;
              }
              if (theory !== "" && (isNaN(Number(theory)) || Number(theory) < 0 || Number(theory) > workspace.theoryMax)) {
                errors.push({ row: rowNum, message: `Theory marks (${theory}) must be between 0 and ${workspace.theoryMax}.` });
                rowHasError = true;
              }
              const fields = [internal, ...(workspace.practicalMax ? [practical] : []), theory];
              total = fields.every((n) => numericMark(n)) ? fields.reduce((sum, n) => sum + Number(n), 0) : "";
            } else {
              const obtained = objVal !== undefined && objVal !== "" ? String(objVal) : targetStudent.obtainedMarks;
              if (obtained !== "" && (isNaN(Number(obtained)) || Number(obtained) < 0 || Number(obtained) > workspace.maxMarks)) {
                errors.push({ row: rowNum, message: `Objective marks (${obtained}) must be between 0 and ${workspace.maxMarks}.` });
                rowHasError = true;
              }
              total = obtained;
            }
          }

          if (!rowHasError) {
            validPayloads.push({
              studentId: targetStudent.studentId,
              rollNo: targetStudent.rollNo,
              studentName: targetStudent.studentName,
              internal: isAbsent || workspace.mode === "OBJECTIVE" ? 0 : internal,
              practical: isAbsent || workspace.mode === "OBJECTIVE" ? 0 : practical,
              theory: isAbsent || workspace.mode === "OBJECTIVE" ? 0 : theory,
              obtainedMarks: total,
              total,
              absent: isAbsent,
              remarks: remVal !== undefined && remVal !== "" ? String(remVal) : isAbsent ? "Absent" : targetStudent.remarks,
              autoAbsentRemark: isAbsent,
            });
          }
        });

        const totalValid = validPayloads.length;
        const totalInvalid = errors.length;

        setValidationResult({
          isValid: totalValid > 0 && totalInvalid === 0,
          totalRows: jsonRows.length,
          validRows: totalValid,
          invalidRows: totalInvalid,
          duplicateRows,
          errors,
          validPayloads,
        });
      } catch (err) {
        setValidationResult({
          isValid: false,
          totalRows: 0,
          validRows: 0,
          invalidRows: 1,
          duplicateRows: 0,
          errors: [{ row: 0, message: "Could not parse Excel/CSV file. Ensure a valid file format." }],
          validPayloads: [],
        });
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsArrayBuffer(bulkFile);
  };

  // Apply Validated Bulk Import
  const handleApplyBulkImport = () => {
    if (!validationResult || !validationResult.validPayloads?.length || !workspace) return;
    setIsImporting(true);
    try {
      const payloadMap = new Map();
      validationResult.validPayloads.forEach((p) => {
        payloadMap.set(normalizeId(p.studentId), p);
      });

      const updatedRows = workspace.rows.map((r) => {
        const found = payloadMap.get(normalizeId(r.studentId));
        return found ? { ...r, ...found } : r;
      });

      setWorkspaces((all) => ({
        ...all,
        [workspaceKey]: {
          ...all[workspaceKey],
          dirty: true,
          validationErrors: {},
          rows: updatedRows,
        },
      }));

      notify(`Successfully imported marks for ${validationResult.validPayloads.length} student(s).`);
      setShowBulkModal(false);
      setBulkFile(null);
      setValidationResult(null);
    } catch (err) {
      notify("Failed to apply imported marks.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  // Save Draft Handler
  const saveSingleDraft = async () => {
    if (!workspace || processing || !editableStatuses.includes(workspace.status)) return;
    const configError = validateMarksConfiguration(workspace);
    const errors = validateMarksRows(workspace, false);
    if (configError || !workspace.rows.length || Object.keys(errors).length) {
      setWorkspaces((all) => ({
        ...all,
        [workspaceKey]: { ...all[workspaceKey], validationErrors: errors },
      }));
      return notify(
        configError ||
        (!workspace.rows.length
          ? "No active students are available for the selected section."
          : "Complete and correct all marks before continuing."),
        "error"
      );
    }

    setProcessing("SAVE_DRAFT");
    try {
      const resolvedEvalId = await ensurePersistedMarks(workspace);
      const evalId =
        resolvedEvalId ||
        workspace.evaluationId ||
        `${workspace.subjectId}_${workspace.sectionId}_${workspace.examinationId}`;

      const payload = buildMarksPayload(workspace, evalId, effectiveCampusId);

      const saveMarksUrl = apiEndpoints.evaluations?.saveMarks
        ? apiEndpoints.evaluations.saveMarks(evalId)
        : `/api/v1/faculty/evaluations/${evalId}/marks`;

      try {
        await apiClient.put(saveMarksUrl, payload);
      } catch (putErr) {
        // If faculty endpoint fails (e.g. backend LINQ ExamId bug on SaveFacultyDraftMarksAsync), persist via evaluation marks editor
        const adminPayload = buildAdminMarksPayload(workspace, effectiveCampusId);
        await apiClient.put(`/api/v1/evaluations/${evalId}/marks`, adminPayload);
      }

      const nextStatus = workspace.status === "NOT STARTED" ? "DRAFT" : workspace.status;
      setWorkspaces((all) => {
        const item = all[workspaceKey];
        const next = {
          ...item,
          evaluationId: evalId,
          status: nextStatus,
          dirty: false,
          rows: item.rows.map((row) => ({ ...row, remarks: row.remarks.trim() })),
          updatedAt: new Date().toISOString(),
        };
        snapshots.current[workspaceKey] = next;
        return { ...all, [workspaceKey]: next };
      });

      notify("Subject draft saved successfully.");
    } catch (err) {
      console.error("Save draft error:", err);
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // Submit Subject Handler
  const submitSingleSubject = async () => {
    if (!workspace || processing || !editableStatuses.includes(workspace.status)) return;
    const configError = validateMarksConfiguration(workspace);
    const errors = validateMarksRows(workspace, true);
    if (configError || !workspace.rows.length || Object.keys(errors).length) {
      setWorkspaces((all) => ({
        ...all,
        [workspaceKey]: { ...all[workspaceKey], validationErrors: errors },
      }));
      return notify(
        configError ||
        (!workspace.rows.length
          ? "No active students are available for the selected section."
          : "Complete and correct all marks before continuing."),
        "error"
      );
    }

    setProcessing("SUBMIT");
    try {
      const resolvedEvalId = await ensurePersistedMarks(workspace);
      const evalId =
        resolvedEvalId ||
        workspace.evaluationId ||
        `${workspace.subjectId}_${workspace.sectionId}_${workspace.examinationId}`;

      const marksPayload = buildMarksPayload(workspace, evalId, effectiveCampusId);

      const saveMarksUrl = apiEndpoints.evaluations?.saveMarks
        ? apiEndpoints.evaluations.saveMarks(evalId)
        : `/api/v1/faculty/evaluations/${evalId}/marks`;

      try {
        await apiClient.put(saveMarksUrl, marksPayload);
      } catch (putErr) {
        // If faculty endpoint fails (e.g. backend LINQ ExamId bug), persist via evaluation marks editor
        const adminPayload = buildAdminMarksPayload(workspace, effectiveCampusId);
        await apiClient.put(`/api/v1/evaluations/${evalId}/marks`, adminPayload);
      }

      const submitUrl = apiEndpoints.evaluations?.submit
        ? apiEndpoints.evaluations.submit(evalId)
        : `/api/v1/faculty/evaluations/${evalId}/submit`;

      await apiClient.post(submitUrl);

      setWorkspaces((all) => {
        const item = all[workspaceKey];
        const next = {
          ...item,
          evaluationId: evalId,
          status: "SUBMITTED",
          dirty: false,
          rows: item.rows.map((row) => ({ ...row, remarks: row.remarks.trim() })),
          updatedAt: new Date().toISOString(),
        };
        snapshots.current[workspaceKey] = next;
        return { ...all, [workspaceKey]: next };
      });

      notify("Subject marks submitted successfully.");
    } catch (err) {
      console.error("Submit subject error:", err);
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // Admin Edit Submitted Marks
  const startSubmittedEdit = () => {
    if (workspace?.status !== "SUBMITTED") return;
    snapshots.current[workspaceKey] = structuredClone(workspace);
    setEditingKey(workspaceKey);
  };

  const cancelSubmittedEdit = () => {
    setWorkspaces((all) => ({ ...all, [workspaceKey]: snapshots.current[workspaceKey] || all[workspaceKey] }));
    setEditingKey("");
  };

  const saveSubmittedEdit = async () => {
    if (editingKey !== workspaceKey || processing) return;
    const errors = validateMarksRows(workspace, true);
    if (Object.keys(errors).length) {
      setWorkspaces((all) => ({ ...all, [workspaceKey]: { ...all[workspaceKey], validationErrors: errors } }));
      return notify("Complete and correct all marks before continuing.", "error");
    }

    setProcessing("SAVE_EDIT");
    try {
      const resolvedEvalId = await ensurePersistedMarks(workspace);
      const evalId =
        resolvedEvalId ||
        workspace.evaluationId ||
        `${workspace.subjectId}_${workspace.sectionId}_${workspace.examinationId}`;

      const adminPayload = buildAdminMarksPayload(workspace, effectiveCampusId);
      const adminSaveUrl = `/api/v1/evaluations/${evalId}/marks`;

      await apiClient.put(adminSaveUrl, adminPayload);

      setWorkspaces((all) => {
        const next = {
          ...all[workspaceKey],
          evaluationId: evalId,
          status: "SUBMITTED",
          dirty: false,
          updatedAt: new Date().toISOString(),
        };
        snapshots.current[workspaceKey] = next;
        return { ...all, [workspaceKey]: next };
      });
      setEditingKey("");
      notify("Submitted marks updated successfully.");
    } catch (err) {
      console.error("Save edit error:", err);
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // ==========================================
  // TAB 2: MARKS EVALUATION & STUDENT ANALYSIS
  // ==========================================
  const [evalApplied, setEvalApplied] = useState(false);
  const [evalConfigs, setEvalConfigs] = useState([]);
  const [evalStudents, setEvalStudents] = useState([]);
  const [evalSubTab, setEvalSubTab] = useState("evaluation"); // "evaluation" | "students"
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState("");
  const [backendAnalysis, setBackendAnalysis] = useState([]);

  const [evaluationPage, setEvaluationPage] = useState(1);
  const [evaluationPageSize, setEvaluationPageSize] = useState(5);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(5);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(5);
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const evalState = useAcademicFilterState(campusBoards.length > 0 ? campusBoards : allBoards, guard, () => setEvalApplied(false));

  // Handle Switching Between Main Tabs: Reset cascading filters from scratch (preserving Board and Year)
  const handleTabChange = (nextTab) => {
    if (nextTab === tab) return;
    guard(() => {
      setTab(nextTab);
      if (nextTab === "entry") {
        entry.setFilters((prev) => ({
          board: prev.board,
          year: prev.year,
          level: "",
          group: "",
          program: "",
          section: "",
          exam: "",
        }));
        setEntryApplied(false);
        setEntryExamId("");
        setEntrySubjectId("");
        setEntryConfigs([]);
        setEntryStudents([]);
        setEntryPage(1);
      } else {
        evalState.setFilters((prev) => ({
          board: prev.board,
          year: prev.year,
          level: "",
          group: "",
          program: "",
          section: "",
          exam: "",
        }));
        setEvalApplied(false);
        setEvalConfigs([]);
        setEvalStudents([]);
        setSelectedEvaluation(null);
        setSelectedStudent(null);
        setEvalSubTab("evaluation");
        setEvaluationPage(1);
        setStudentPage(1);
        setDetailPage(1);
      }
    });
  };

  // Button Click Action: "Check Evaluations" (Enabled when all 7 filters selected)
  const applyEvalContext = async () => {
    if (!evalState.filters.section || !evalState.filters.exam || processing) return;
    setProcessing("CHECK_EVALUATIONS");
    try {
      const effectiveEvalFilters = {
        board: evalState.filters.board || effectiveBoardId,
        year: evalState.filters.year || effectiveYearId,
        level: evalState.filters.level,
        group: evalState.filters.group,
        program: evalState.filters.program,
        section: evalState.filters.section,
        exam: evalState.filters.exam,
      };
      // 1. Fetch Students matching Student Management
      const studentList = await fetchAuthoritativeSectionStudents(effectiveEvalFilters, effectiveCampusId);
      setEvalStudents(studentList);

      // 2. Fetch Exam details & schedules/configs
      const selectedExam = evalState.exams.find((e) => eq(e.id, evalState.filters.exam));
      let schedules = selectedExam?.schedules || [];
      let examDetail = null;
      try {
        const detailRes = await apiClient
          .get(`/api/v1/examinations/${evalState.filters.exam}`, {
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
            skipGlobalLoader: true,
          })
          .catch(() => null);
        examDetail = detailRes?.data || detailRes;
        if (examDetail?.schedules?.length) {
          schedules = examDetail.schedules;
        } else if (examDetail?.examinationSchedules?.length) {
          schedules = examDetail.examinationSchedules;
        }
      } catch (e) {
        console.warn("Could not fetch schedules for evaluation:", e);
      }

      const effectiveExam = examDetail || selectedExam;

      const configs = await fetchAndBuildSubjectConfigs(
        evalState.filters.exam,
        evalState.filters.section,
        effectiveExam,
        schedules,
        effectiveCampusId
      );

      setEvalConfigs(configs);

      // 3. Search evaluations & fetch marks
      const evalSearchUrl = apiEndpoints.evaluations?.search || "/api/v1/evaluations/search";
      const [evalSearchRes, marksRes] = await Promise.all([
        apiClient
          .post(
            evalSearchUrl,
            {
              campusId: Number(effectiveCampusId) || 1,
              boardId: Number(evalState.filters.board),
              academicYearId: Number(evalState.filters.year),
              academicLevelId: Number(evalState.filters.level),
              groupId: Number(evalState.filters.group),
              sectionId: Number(evalState.filters.section),
              examinationId: Number(evalState.filters.exam),
            },
            {
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            }
          )
          .catch(() =>
            apiClient.get("/api/v1/faculty/evaluations", {
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            }).catch(() => null)
          ),
        apiClient
          .get(`/api/v1/marks/exam/${evalState.filters.exam}`, {
            params: { campusId: effectiveCampusId },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          })
          .catch(() => null),
      ]);

      const existingEvals = unwrapRecords(evalSearchRes) || [];
      const allExamMarks = unwrapRecords(marksRes) || [];
      const evalMap = {};

      configs.forEach((config) => {
        const key = evaluationKey({
          examinationId: evalState.filters.exam,
          sectionId: evalState.filters.section,
          subjectId: config.subjectId,
        });

        const ev = existingEvals.find((e) => {
          const parts = String(e.evaluationId || "").split("_");
          const evSubId = normalizeId(e.subjectId ?? (parts.length >= 3 ? parts[0] : ""));
          const evSecId = normalizeId(e.sectionId ?? (parts.length >= 3 ? parts[1] : evalState.filters.section));
          const evExamId = normalizeId(e.examinationId ?? e.examId ?? (parts.length >= 3 ? parts[2] : evalState.filters.exam));
          return eq(evSubId, config.subjectId) && eq(evSecId, evalState.filters.section) && eq(evExamId, evalState.filters.exam);
        });

        const subjMarks = allExamMarks.filter(
          (m) =>
            eq(m.subjectId, config.subjectId) &&
            (!m.sectionId || eq(m.sectionId, evalState.filters.section)) &&
            m.isActive !== false
        );

        const reconciledRows = reconcileRosterWithMarks(studentList, subjMarks, config);

        const hasRecordedMarks = (reconciledRows || []).some((r) =>
          r.absent ||
          (r.obtainedMarks !== "" && r.obtainedMarks !== null && r.obtainedMarks !== undefined && Number(r.obtainedMarks) > 0) ||
          (r.theory !== "" && r.theory !== null && r.theory !== undefined && Number(r.theory) > 0) ||
          (r.internal !== "" && r.internal !== null && r.internal !== undefined && Number(r.internal) > 0) ||
          (r.practical !== "" && r.practical !== null && r.practical !== undefined && Number(r.practical) > 0) ||
          (r.total !== "" && r.total !== null && r.total !== undefined && Number(r.total) > 0)
        );

        let evalStatus = "NOT STARTED";
        if (hasRecordedMarks) {
          evalStatus = ev ? String(ev.status || "DRAFT").trim().toUpperCase() : "DRAFT";
          if (subjMarks.length > 0 && evalStatus === "NOT STARTED") {
            evalStatus =
              subjMarks[0].evaluationStatus ||
              (subjMarks[0].status === 3 ? "APPROVED" : subjMarks[0].status === 1 ? "SUBMITTED" : "DRAFT");
          }
        }
        const presentCount = subjMarks.filter(
          (m) => !m.isAbsent && !m.absent && (m.obtainedMarks !== "" || m.totalMarks !== "" || m.total !== "")
        ).length;
        const absentCount = subjMarks.filter((m) => Boolean(m.isAbsent || m.absent)).length;

        evalMap[key] = {
          evaluationId: ev?.evaluationId || `${config.subjectId}_${evalState.filters.section}_${evalState.filters.exam}`,
          examinationId: evalState.filters.exam,
          sectionId: evalState.filters.section,
          subjectId: config.subjectId,
          facultyId: config.facultyId || ev?.facultyId || "1",
          faculty: { name: config.facultyName || ev?.facultyName || "Assigned Faculty", employeeCode: ev?.facultyCode || "" },
          subject: { id: config.subjectId, name: config.subjectName, code: config.subjectCode },
          status: evalStatus,
          mode: config.mode,
          maxMarks: config.maxMarks,
          internalMax: config.internalMax,
          practicalMax: config.practicalMax,
          theoryMax: config.theoryMax,
          passPercentage: config.passPercentage,
          rejectionReason: ev?.rejectionReason || "",
          adminReviewMessage: ev?.adminReviewMessage || "",
          remarks: ev?.remarks || "",
          averageMarks: ev?.averageMarks,
          average: ev?.averageMarks !== undefined && ev?.averageMarks !== null ? String(ev.averageMarks) : "—",
          highestMarks: ev?.highestMarks,
          highest: ev?.highestMarks !== undefined && ev?.highestMarks !== null ? String(ev.highestMarks) : "—",
          lowestMarks: ev?.lowestMarks,
          lowest: ev?.lowestMarks !== undefined && ev?.lowestMarks !== null ? String(ev.lowestMarks) : "—",
          totalStudents: studentList.length,
          presentStudents: presentCount,
          absentStudents: absentCount,
          studentsCount: studentList.length,
          rows: reconciledRows,
          dirty: false,
          validationErrors: {},
          updatedAt: ev?.lastSubmittedAt || ev?.updatedAt || new Date().toISOString(),
        };
      });

      setWorkspaces((prev) => ({ ...prev, ...evalMap }));

      // 4. Fetch Student Analysis if available
      try {
        const analysisUrl = apiEndpoints.studentAnalysis?.getAll || "/api/v1/student-analysis";
        const analysisRes = await apiClient.get(analysisUrl, {
          params: {
            campusId: effectiveCampusId || undefined,
            boardId: evalState.filters.board,
            academicYearId: evalState.filters.year,
            academicLevelId: evalState.filters.level,
            groupId: evalState.filters.group,
            sectionId: evalState.filters.section,
            examinationId: evalState.filters.exam,
          },
        });
        const rawAnalysis = unwrapRecords(analysisRes);
        if (rawAnalysis.length) {
          setBackendAnalysis(rawAnalysis);
        }
      } catch (err) {
        console.warn("Student analysis fetch note:", err);
      }

      setEvalApplied(true);
      setSelectedEvaluation(null);
      setSelectedStudent(null);
      setEvaluationPage(1);
      setStudentPage(1);
      setEvalSubTab("evaluation");
      notify("Evaluations loaded for selected examination.");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // Derived evaluations for current evaluation context
  const evalReadiness = calculateReadiness(evalConfigs, workspaces);

  const evaluationItems = useMemo(() => {
    if (!evalApplied || !evalState.filters.section || !evalState.filters.exam) return [];
    const items = [];
    const seenSubjects = new Set();

    (evalConfigs || []).forEach((config) => {
      const subjId = normalizeId(config.subjectId);
      if (!subjId || seenSubjects.has(subjId)) return;
      seenSubjects.add(subjId);

      const key = evaluationKey({
        examinationId: evalState.filters.exam,
        sectionId: evalState.filters.section,
        subjectId: subjId,
      });
      const ws = workspaces[key];
      if (ws && ["SUBMITTED", "VERIFIED", "APPROVED", "REJECTED"].includes(String(ws.status || "").toUpperCase())) {
        items.push({ ...ws, ...calculateEvaluationStatistics(ws) });
      }
    });

    return items;
  }, [evalApplied, evalState.filters.section, evalState.filters.exam, evalConfigs, workspaces]);

  const evalFilteredEvaluations = evaluationItems.filter((item) =>
    `${item.subject?.name || item.subjectName || ""} ${item.subject?.code || item.subjectCode || ""} ${item.faculty?.name || item.facultyName || ""} ${item.status || ""}`
      .toLowerCase()
      .includes(evaluationSearch.trim().toLowerCase())
  );

  // Single Evaluation Transition (Verify, Approve, Reject)
  const transition = async (action) => {
    const item = selectedEvaluation;
    if (!item || processing) return;
    const nextStatus = { VERIFY: "VERIFIED", APPROVE: "APPROVED", REJECT: "REJECTED" }[action];
    if (!isLegalStatusTransition(item.status, nextStatus)) return notify("Invalid evaluation transition.", "error");
    if (action === "REJECT" && (!message.trim() || message.trim().length > 500)) {
      return notify("Enter a rejection reason of up to 500 characters.", "error");
    }

    setProcessing(action);
    try {
      const evalId =
        item.evaluationId ||
        `${item.subjectId}_${item.sectionId || evalState.filters.section}_${item.examinationId || evalState.filters.exam}`;
      if (action === "VERIFY") {
        const verifyUrl = apiEndpoints.evaluations?.verify
          ? apiEndpoints.evaluations.verify(evalId)
          : `/api/v1/evaluations/${evalId}/verify`;
        await apiClient.post(verifyUrl, null, { params: { message } });
      } else if (action === "APPROVE") {
        const approveUrl = apiEndpoints.evaluations?.approve
          ? apiEndpoints.evaluations.approve(evalId)
          : `/api/v1/evaluations/${evalId}/approve`;
        await apiClient.post(approveUrl);
      } else if (action === "REJECT") {
        const rejectUrl = apiEndpoints.evaluations?.reject
          ? apiEndpoints.evaluations.reject(evalId)
          : `/api/v1/evaluations/${evalId}/reject`;
        await apiClient.post(rejectUrl, {
          remarks: message.trim(),
          reason: message.trim(),
          message: message.trim(),
          notifyFaculty: true,
        });
      }

      const key = evaluationKey(item);
      setWorkspaces((all) => ({
        ...all,
        [key]: {
          ...all[key],
          status: nextStatus,
          rejectionReason: action === "REJECT" ? message.trim() : all[key]?.rejectionReason || "",
          dirty: false,
        },
      }));
      setSelectedEvaluation((current) => ({
        ...current,
        status: nextStatus,
        rejectionReason: action === "REJECT" ? message.trim() : current.rejectionReason,
      }));
      setModal(null);
      setMessage("");
      notify(`Evaluation ${nextStatus.toLowerCase()} successfully.`);
    } catch (err) {
      console.error("Evaluation transition error:", err);
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // Bulk Transitions (Verify All, Approve All)
  const bulkTransition = async (from, to) => {
    if (processing) return;
    const targetEvaluations = evaluationItems.filter((item) => {
      const st = String(item.status || "").toUpperCase();
      if (to === "APPROVED") {
        return st === "VERIFIED" || (from && st === String(from).toUpperCase());
      }
      return st === String(from || "").toUpperCase();
    });
    const keys = targetEvaluations.map(evaluationKey);
    setProcessing(to === "VERIFIED" ? "VERIFY_ALL" : "APPROVE_ALL");

    try {
      if (to === "VERIFIED") {
        const verifyAllUrl = apiEndpoints.evaluations?.verifyAll || "/api/v1/evaluations/verify-all";
        const verifyPayload = {
          campusId: Number(effectiveCampusId) || 1,
          boardId: Number(evalState.filters.board || effectiveBoardId) || 0,
          academicYearId: Number(evalState.filters.year || effectiveYearId) || 0,
          academicLevelId: Number(evalState.filters.level) || 0,
          levelId: Number(evalState.filters.level) || 0,
          programId: Number(evalState.filters.program) || 0,
          groupId: Number(evalState.filters.group) || 0,
          sectionId: Number(evalState.filters.section) || 0,
          examinationId: Number(evalState.filters.exam) || 0,
          examId: Number(evalState.filters.exam) || 0,
          subjectId: 0,
          studentId: 0,
          facultyId: 0,
          status: from || "SUBMITTED",
          pageNumber: 0,
          pageSize: 0,
        };
        await apiClient.post(verifyAllUrl, verifyPayload, {
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        }).catch((err) => console.warn("Verify-all bulk endpoint notice:", err));

        // Execute individual verify for each target evaluation
        const verifyPromises = targetEvaluations.map(async (item) => {
          const evalId =
            item.evaluationId ||
            `${item.subjectId}_${item.sectionId || evalState.filters.section}_${item.examinationId || evalState.filters.exam}`;
          const verifyUrl = apiEndpoints.evaluations?.verify
            ? apiEndpoints.evaluations.verify(evalId)
            : `/api/v1/evaluations/${evalId}/verify`;
          return apiClient.post(verifyUrl, null, { params: { message: "Verified" } }).catch((err) => {
            console.warn(`Individual verify notice for ${evalId}:`, err);
          });
        });
        await Promise.allSettled(verifyPromises);
      } else if (to === "APPROVED") {
        const approveAllUrl = apiEndpoints.evaluations?.approveAll || "/api/v1/evaluations/approve-all";
        const approvePayload = {
          campusId: Number(effectiveCampusId) || 1,
          boardId: Number(evalState.filters.board || effectiveBoardId) || 0,
          academicYearId: Number(evalState.filters.year || effectiveYearId) || 0,
          academicLevelId: Number(evalState.filters.level) || 0,
          levelId: Number(evalState.filters.level) || 0,
          programId: Number(evalState.filters.program) || 0,
          groupId: Number(evalState.filters.group) || 0,
          sectionId: Number(evalState.filters.section) || 0,
          examinationId: Number(evalState.filters.exam) || 0,
          examId: Number(evalState.filters.exam) || 0,
          subjectId: 0,
          studentId: 0,
          facultyId: 0,
          status: from || "VERIFIED",
          pageNumber: 0,
          pageSize: 0,
        };
        await apiClient.post(approveAllUrl, approvePayload, {
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        }).catch((err) => console.warn("Approve-all bulk endpoint notice:", err));

        // In addition, execute individual approval calls for every target evaluation
        // User confirmed: "individual approval works perfectly"
        const approvePromises = targetEvaluations.map(async (item) => {
          const evalId =
            item.evaluationId ||
            `${item.subjectId}_${item.sectionId || evalState.filters.section}_${item.examinationId || evalState.filters.exam}`;
          const approveUrl = apiEndpoints.evaluations?.approve
            ? apiEndpoints.evaluations.approve(evalId)
            : `/api/v1/evaluations/${evalId}/approve`;
          return apiClient.post(approveUrl).catch((err) => {
            console.warn(`Individual approve notice for ${evalId}:`, err);
          });
        });
        await Promise.allSettled(approvePromises);
      }

      setWorkspaces((all) => {
        const next = { ...all };
        targetEvaluations.forEach((item) => {
          const key = evaluationKey(item);
          if (next[key]) next[key] = { ...next[key], status: to };
        });
        return next;
      });

      // Re-fetch authoritative evaluations from backend
      try {
        const evalSearchUrl = apiEndpoints.evaluations?.search || "/api/v1/evaluations/search";
        const freshRes = await apiClient.post(
          evalSearchUrl,
          {
            campusId: Number(effectiveCampusId) || 1,
            boardId: Number(evalState.filters.board),
            academicYearId: Number(evalState.filters.year),
            academicLevelId: Number(evalState.filters.level),
            groupId: Number(evalState.filters.group),
            sectionId: Number(evalState.filters.section),
            examinationId: Number(evalState.filters.exam),
          },
          {
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          }
        ).catch(() => null);
        const freshEvals = unwrapRecords(freshRes);
        if (freshEvals && freshEvals.length > 0) {
          setWorkspaces((all) => {
            const next = { ...all };
            freshEvals.forEach((fe) => {
              const parts = String(fe.evaluationId || "").split("_");
              const sId = normalizeId(fe.subjectId ?? (parts.length >= 3 ? parts[0] : ""));
              const secId = normalizeId(fe.sectionId ?? (parts.length >= 3 ? parts[1] : evalState.filters.section));
              const exId = normalizeId(fe.examinationId ?? fe.examId ?? (parts.length >= 3 ? parts[2] : evalState.filters.exam));
              const k = evaluationKey({ examinationId: exId, sectionId: secId, subjectId: sId });
              if (next[k]) {
                next[k] = {
                  ...next[k],
                  status: String(fe.status || fe.statusCode || to).toUpperCase(),
                  rejectionReason: fe.rejectionReason || next[k].rejectionReason,
                  adminReviewMessage: fe.adminReviewMessage || next[k].adminReviewMessage,
                };
              }
            });
            return next;
          });
        }
      } catch (syncErr) {
        console.warn("Notice syncing fresh evaluations:", syncErr);
      }

      setModal(null);
      notify(`${keys.length || "All"} evaluation(s) ${to.toLowerCase()} successfully.`);
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // Fallback Student Analysis from in-memory workspaces & students
  const fallbackAnalysis = useMemo(() => {
    if (!evalApplied || !evalState.filters.section || !evalState.filters.exam) return [];
    return evalStudents
      .map((student) => {
        let hasAnyExamRecord = false;
        const subjectResults = evalConfigs.map((config) => {
          const ws =
            workspaces[
            evaluationKey({
              examinationId: evalState.filters.exam,
              sectionId: evalState.filters.section,
              subjectId: config.subjectId,
            })
            ];
          const row = ws?.rows?.find((item) => eq(item.studentId, student.studentId));
          if (row) hasAnyExamRecord = true;
          const res = calculateStudentSubjectResult(row, ws);
          return {
            ...res,
            subjectId: config.subjectId,
            subjectName: config.subjectName,
            subjectCode: config.subjectCode,
            mode: config.mode,
            maxMarks: config.maxMarks,
            passPercentage: config.passPercentage,
            isAbsent: Boolean(row?.absent),
          };
        });

        // If subjects have marks entered, but this student has zero records in any subject,
        // they did not take the exam (newly assigned student) -> exclude from analysis!
        const anyConfigHasRows = evalConfigs.some((c) => {
          const ws =
            workspaces[
            evaluationKey({
              examinationId: evalState.filters.exam,
              sectionId: evalState.filters.section,
              subjectId: c.subjectId,
            })
            ];
          return ws?.rows?.length > 0;
        });
        if (anyConfigHasRows && !hasAnyExamRecord) {
          return null;
        }

        const totalObtained = subjectResults.reduce((sum, item) => sum + item.obtained, 0);
        const totalMaximum = evalConfigs.reduce((sum, item) => sum + item.maxMarks, 0);
        const percentage = totalMaximum ? (totalObtained / totalMaximum) * 100 : 0;
        const pass = subjectResults.every((item) => item.result === "PASS");

        return {
          studentId: student.studentId,
          rollNo: student.rollNo,
          studentName: student.studentName,
          subjectResults,
          totalObtained,
          totalMaximum,
          percentage,
          grade: !pass ? "F" : grade(percentage),
          result: pass ? "PASS" : "FAIL",
        };
      })
      .filter(Boolean);
  }, [evalApplied, evalState.filters.section, evalState.filters.exam, evalStudents, evalConfigs, workspaces]);

  const analysis = backendAnalysis.length
    ? backendAnalysis.map((item) => ({
      studentId: item.studentId,
      rollNo: item.rollNo,
      studentName: item.studentName,
      totalObtained: item.totalMarks ?? item.total ?? 0,
      totalMaximum: item.maxTotal ?? item.maximum ?? 100,
      percentage: Number(item.percentage || 0),
      grade: item.grade || "F",
      result: item.result || "FAIL",
      subjectResults: (item.subjects || []).map((s) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        mode: "REGULAR",
        obtained: s.marks,
        maxMarks: 100,
        passPercentage: 35,
        percentage: s.marks,
        grade: grade(s.marks),
        result: s.marks >= 35 ? "PASS" : "FAIL",
        isAbsent: false,
      })),
    }))
    : fallbackAnalysis;

  // View Detailed Student Analysis Report
  const handleViewStudentDetails = async (student) => {
    try {
      const detailsUrl = apiEndpoints.studentAnalysis?.details
        ? apiEndpoints.studentAnalysis.details(student.studentId)
        : `/api/v1/student-analysis/${student.studentId}/details`;
      const res = await apiClient.get(detailsUrl, {
        params: {
          examinationId: evalState.filters.exam,
          academicYearId: evalState.filters.year,
          groupId: evalState.filters.group,
          sectionId: evalState.filters.section,
          boardId: evalState.filters.board,
          academicLevelId: evalState.filters.level,
        },
      });
      const data = res.data || {};
      if (data.subjects?.length) {
        setSelectedStudent({
          studentId: data.studentId,
          rollNo: data.rollNo || student.rollNo,
          studentName: data.studentName || student.studentName,
          totalObtained: data.totalMarks ?? student.totalObtained,
          totalMaximum: data.maxMarks ?? student.totalMaximum,
          percentage: data.percentage ?? student.percentage,
          grade: data.grade ?? student.grade,
          result: data.result ?? student.result,
          examinationName:
            data.examName || evalState.exams.find((e) => eq(e.id, evalState.filters.exam))?.name || "Examination",
          sectionName:
            data.sectionName ||
            evalState.sections.find((s) => eq(s.id, evalState.filters.section))?.name ||
            "Section",
          subjectResults: data.subjects.map((sub) => ({
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            subjectCode: sub.subjectCode,
            mode: sub.mode || "REGULAR",
            obtained: sub.totalMarks ?? sub.obtainedMarks ?? sub.marks,
            maxMarks: sub.maxMarks || 100,
            passPercentage: sub.passPercentage || 35,
            percentage: sub.percentage || 0,
            grade: sub.grade || "—",
            result: sub.result || "PASS",
            isAbsent: Boolean(sub.isAbsent),
          })),
        });
        setDetailPage(1);
        return;
      }
    } catch (err) {
      console.warn("Could not fetch detailed student analysis from API, using local breakdown:", err);
    }

    setSelectedStudent({
      ...student,
      examinationName: evalState.exams.find((item) => eq(item.id, evalState.filters.exam))?.name,
      sectionName: evalState.sections.find((item) => eq(item.id, evalState.filters.section))?.name,
    });
    setDetailPage(1);
  };

  const filteredStudents = analysis.filter((item) =>
    `${item.rollNo} ${item.studentName} ${item.result} ${item.grade}`
      .toLowerCase()
      .includes(studentSearch.trim().toLowerCase())
  );

  // Subject options in Marks Entry Workspace with Faculty Name & Faculty ID (without status suffix)
  const entrySubjectOptions = entryConfigs.map((config) => {
    const facultyInfo = config.facultyName
      ? ` — Faculty: ${config.facultyName}${config.facultyId ? ` (ID: ${config.facultyId})` : ""}`
      : "";
    return {
      id: config.subjectId,
      name: `${config.subjectName} (${config.subjectCode})${facultyInfo}`,
    };
  });

  const meta = {
    entry: ["Marks Entry", "Enter and submit subject-wise examination marks"],
    evaluation: ["Marks Evaluation", "Verify, reject, and approve submitted marks"],
  }[tab] || ["Marks Entry", "Enter and submit subject-wise examination marks"];

  const content = (
    <div className={`cms-marks-entry ${embedded ? "cms-marks-entry-embedded" : ""}`}>
      {toast && (
        <div className={`cms-toast-banner cms-toast-${toast.type}`} aria-live="polite">
          {toast.text}
        </div>
      )}

      {/* Hidden Excel File Input for Bulk Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleExcelImport}
        className="cms-file-input-hidden"
        style={{ display: "none" }}
      />

      {/* ======================================================== */}
      {/* MAIN NAVIGATION TABS (Globally only 2 Tabs)              */}
      {/* ======================================================== */}
      <div className="cms-tabs-row">
        <div className="cms-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "entry"}
            className={`cms-tab-btn ${tab === "entry" ? "active" : ""}`}
            onClick={() => handleTabChange("entry")}
          >
            Marks Entry
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "evaluation"}
            className={`cms-tab-btn ${tab === "evaluation" ? "active" : ""}`}
            onClick={() => handleTabChange("evaluation")}
          >
            Marks Evaluation
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MARKS ENTRY WORKFLOW                              */}
      {/* ======================================================== */}
      {tab === "entry" && (
        <>
          {/* Filter Card (6 Dropdowns + Enter Marks Action Button) */}
          <FilterCard
            mode="entry"
            filters={entry.filters}
            boards={campusBoards.length > 0 ? campusBoards : allBoards}
            years={entry.years}
            levels={entry.levels}
            groups={entry.groups}
            programs={entry.programs}
            sections={entry.sections}
            changeFilter={entry.changeFilter}
            actionLabel="Enter Marks"
            onAction={applyEntryContext}
            actionDisabled={
              !entry.filters.board ||
              !entry.filters.year ||
              !entry.filters.level ||
              !entry.filters.group ||
              !entry.filters.program ||
              !entry.filters.section
            }
            processing={processing === "ENTER_MARKS"}
            title="Academic Context"
            subtitle="Select the academic scope before opening Marks Entry."
          />

          {!entryApplied ? (
            <Empty text="Select all academic filters and click Enter Marks." />
          ) : (
            <>
              <Context
                context={{ ...entry.filters, exam: entryExamId }}
                masters={{
                  groups: entry.groups,
                  programs: entry.programs,
                  sections: entry.sections,
                  exams: entry.exams,
                }}
              />

              {/* Marks Entry Workspace (Ref Screenshot 5) */}
              <Entry
                exams={entry.exams}
                examId={entryExamId}
                changeExam={changeEntryExam}
                subjectOptions={entrySubjectOptions}
                subjectId={entrySubjectId}
                changeSubject={(value) =>
                  guard(() => {
                    setEntrySubjectId(value);
                    setEntryPage(1);
                  })
                }
                workspace={workspace}
                editing={editingKey === workspaceKey}
                entryPage={entryPage}
                entryPageSize={entryPageSize}
                setEntryPage={setEntryPage}
                setEntryPageSize={setEntryPageSize}
                updateRow={updateRow}
                processing={processing}
                loadingWorkspace={loadingWorkspace}
                onBulkImport={() => {
                  setBulkFile(null);
                  setValidationResult(null);
                  setShowBulkModal(true);
                }}
                onEdit={startSubmittedEdit}
                onCancelEdit={cancelSubmittedEdit}
                onSaveChanges={saveSubmittedEdit}
                onSave={saveSingleDraft}
                onSubmit={submitSingleSubject}
              />
            </>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MARKS EVALUATION (WITH INNER SUB-TABS)            */}
      {/* ======================================================== */}
      {tab === "evaluation" && (
        <>
          {/* Filter Card (7 Dropdowns + Check Evaluations Action Button) */}
          <FilterCard
            mode="evaluation"
            filters={evalState.filters}
            boards={campusBoards.length > 0 ? campusBoards : allBoards}
            years={evalState.years}
            levels={evalState.levels}
            groups={evalState.groups}
            programs={evalState.programs}
            sections={evalState.sections}
            exams={evalState.exams}
            changeFilter={evalState.changeFilter}
            actionLabel="Check Evaluations"
            onAction={applyEvalContext}
            actionDisabled={
              !evalState.filters.board ||
              !evalState.filters.year ||
              !evalState.filters.level ||
              !evalState.filters.group ||
              !evalState.filters.program ||
              !evalState.filters.section ||
              !evalState.filters.exam
            }
            processing={processing === "CHECK_EVALUATIONS"}
            title="Academic Context & Examination"
            subtitle="Select the academic scope and completed examination to check evaluations."
          />

          {!evalApplied ? (
            <Empty text="Select all 7 filters and click Check Evaluations to view submitted marks." />
          ) : (
            <>
              <Context
                context={evalState.filters}
                masters={{
                  groups: evalState.groups,
                  programs: evalState.programs,
                  sections: evalState.sections,
                  exams: evalState.exams,
                }}
              />

              {/* Sub-Tab 1: Faculty Evaluations */}
              {evalSubTab === "evaluation" &&
                (selectedEvaluation ? (
                  <EvaluationDetails
                    item={selectedEvaluation}
                    page={detailPage}
                    pageSize={detailPageSize}
                    setPageSize={setDetailPageSize}
                    setPage={setDetailPage}
                    onBack={() => setSelectedEvaluation(null)}
                    onAction={(action) =>
                      action === "APPROVE" ? transition(action) : (setModal(action), setMessage(""))
                    }
                    processing={processing}
                  />
                ) : (
                  <EvaluationList
                    rows={evalFilteredEvaluations}
                    search={evaluationSearch}
                    setSearch={(value) => {
                      setEvaluationSearch(value);
                      setEvaluationPage(1);
                    }}
                    page={evaluationPage}
                    pageSize={evaluationPageSize}
                    setPageSize={setEvaluationPageSize}
                    setPage={setEvaluationPage}
                    onView={async (item) => {
                      let targetItem = item;
                      const key = evaluationKey(item);
                      let markItems = [];
                      const evalId =
                        item.evaluationId ||
                        `${item.subjectId}_${item.sectionId || evalState.filters.section}_${item.examinationId || evalState.filters.exam
                        }`;
                      try {
                        const evalStudentsUrl = apiEndpoints.evaluations?.students
                          ? apiEndpoints.evaluations.students(evalId)
                          : `/api/v1/evaluations/${evalId}/students`;
                        try {
                          const res = await apiClient.get(evalStudentsUrl, { params: { campusId: effectiveCampusId } });
                          markItems = res.data?.students || res.data?.marksList || [];
                        } catch {
                          // If evaluation endpoint records not ready, load from marks table
                          const marksRes = await apiClient.get(
                            `/api/v1/marks/exam/${item.examinationId || evalState.filters.exam}`,
                            { params: { campusId: effectiveCampusId } }
                          );
                          const allExamMarks = unwrapRecords(marksRes);
                          markItems = allExamMarks.filter(
                            (m) =>
                              eq(m.subjectId, item.subjectId) &&
                              eq(m.sectionId, item.sectionId || evalState.filters.section) &&
                              m.isActive !== false
                          );
                        }

                        const rows = reconcileRosterWithMarks(evalStudents, markItems, item, item.rows);
                        targetItem = {
                          ...item,
                          rows,
                          totalStudents: evalStudents.length,
                          studentsCount: evalStudents.length,
                        };
                        setWorkspaces((all) => ({
                          ...all,
                          [key]: {
                            ...all[key],
                            rows,
                            totalStudents: evalStudents.length,
                            studentsCount: evalStudents.length,
                          },
                        }));
                      } catch (err) {
                        console.warn("Notice: could not fetch evaluation student details:", err);
                      }

                      setSelectedEvaluation(targetItem);
                      setDetailPage(1);
                    }}
                    readiness={evalReadiness}
                    onBulk={setModal}
                    processing={processing}
                    subTab={evalSubTab}
                    setSubTab={(st) => {
                      setEvalSubTab(st);
                      setSelectedEvaluation(null);
                      setSelectedStudent(null);
                    }}
                  />
                ))}

              {/* Sub-Tab 2: Student Analysis */}
              {evalSubTab === "students" &&
                (selectedStudent ? (
                  <StudentDetails
                    student={selectedStudent}
                    page={detailPage}
                    pageSize={detailPageSize}
                    setPageSize={setDetailPageSize}
                    setPage={setDetailPage}
                    onBack={() => setSelectedStudent(null)}
                  />
                ) : evalReadiness.readyForResults || backendAnalysis.length > 0 ? (
                  <StudentList
                    rows={filteredStudents}
                    subjects={evalConfigs}
                    search={studentSearch}
                    setSearch={(value) => {
                      setStudentSearch(value);
                      setStudentPage(1);
                    }}
                    page={studentPage}
                    pageSize={studentPageSize}
                    setPageSize={setStudentPageSize}
                    setPage={setStudentPage}
                    onView={handleViewStudentDetails}
                    subTab={evalSubTab}
                    setSubTab={(st) => {
                      setEvalSubTab(st);
                      setSelectedEvaluation(null);
                      setSelectedStudent(null);
                    }}
                    processing={processing}
                  />
                ) : (
                  <section className="cms-card cms-main-card">
                    <div className="cms-eval-table-toolbar">
                      <div className="cms-eval-toolbar-left">
                        <div className="cms-subtab-pill-group">
                          <button
                            type="button"
                            className={`cms-subtab-pill-btn ${evalSubTab === "evaluation" ? "active" : ""}`}
                            onClick={() => setEvalSubTab("evaluation")}
                          >
                            Evaluation
                          </button>
                          <button
                            type="button"
                            className={`cms-subtab-pill-btn ${evalSubTab === "students" ? "active" : ""}`}
                            onClick={() => setEvalSubTab("students")}
                          >
                            Student Analysis
                          </button>
                        </div>
                      </div>
                    </div>
                    <Empty text="Student analysis will be available after all required subject evaluations are approved (or once generated in the backend)." />
                  </section>
                ))}
            </>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* MODALS & OVERLAYS                                        */}
      {/* ======================================================== */}
      {pending && (
        <Confirm
          title="Unsaved Marks"
          text="Unsaved marks exist. Discard them and continue?"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const action = pending;
            setWorkspaces((all) =>
              Object.fromEntries(
                Object.entries(all).map(([key, value]) => [
                  key,
                  value.dirty ? snapshots.current[key] || { ...value, dirty: false } : value,
                ])
              )
            );
            setPending(null);
            notify("Unsaved marks discarded.", "info");
            action();
          }}
        />
      )}

      {["VERIFY", "REJECT"].includes(modal) && (
        <Message
          action={modal}
          value={message}
          setValue={setMessage}
          onCancel={() => setModal(null)}
          onConfirm={() => transition(modal)}
          processing={Boolean(processing)}
        />
      )}

      {modal === "VERIFY_ALL" && (
        <Confirm
          title="Verify Submitted"
          text="Verify all submitted evaluations for this section?"
          onCancel={() => setModal(null)}
          onConfirm={() => bulkTransition("SUBMITTED", "VERIFIED")}
          processing={Boolean(processing)}
        />
      )}

      {modal === "APPROVE_ALL" && (
        <Confirm
          title="Approve Verified"
          text="Approve all verified evaluations for this section?"
          onCancel={() => setModal(null)}
          onConfirm={() => bulkTransition("VERIFIED", "APPROVED")}
          processing={Boolean(processing)}
        />
      )}

      {showBulkModal && (
        <BulkImportModal
          workspace={workspace}
          file={bulkFile}
          setFile={setBulkFile}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          isValidating={isValidating}
          validationResult={validationResult}
          setValidationResult={setValidationResult}
          isImporting={isImporting}
          onDownloadTemplate={downloadMarksTemplate}
          onValidate={validateBulkFile}
          onApply={handleApplyBulkImport}
          onClose={() => {
            setShowBulkModal(false);
            setBulkFile(null);
            setValidationResult(null);
          }}
        />
      )}
    </div>
  );

  return embedded ? content : (
    <DashboardLayout title={meta[0]} subtitle={meta[1]}>
      {content}
    </DashboardLayout>
  );
}

// FilterCard with Dynamic Action Button (Enter Marks / Check Evaluations)
function FilterCard({
  mode = "entry",
  filters,
  boards,
  years,
  levels,
  groups,
  programs,
  sections,
  exams,
  changeFilter,
  actionLabel,
  onAction,
  actionDisabled,
  processing,
  title,
  subtitle,
}) {
  const fields = [
    { key: "board", label: "Board", options: boards, disabled: true },
    { key: "year", label: "Academic Year", options: years, disabled: true },
    { key: "level", label: "Academic Level", options: levels, disabled: false },
    { key: "group", label: "Group", options: groups, disabled: false },
    { key: "program", label: "Program", options: programs, disabled: false },
    { key: "section", label: "Section", options: sections, disabled: false },
    ...(mode === "evaluation"
      ? [
        {
          key: "exam",
          label: "Completed Examination",
          options: (exams || []).map((exam) => ({
            ...exam,
            name: formatExamDropdownLabel(exam),
          })),
          disabled: false,
        },
      ]
      : []),
  ];

  return (
    <section className="cms-card cms-card-filter">
      <div className="cms-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {onAction && (
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={Boolean(actionDisabled || processing)}
            onClick={onAction}
          >
            {processing ? "Loading..." : actionLabel}
          </button>
        )}
      </div>
      <div className="cms-filter-grid">
        {fields.map((field) => (
          <SearchableSelect
            key={field.key}
            id={`marks-${field.key}`}
            label={field.label}
            value={filters[field.key]}
            options={field.options}
            disabled={field.disabled}
            onChange={(value) => changeFilter(field.key, value)}
          />
        ))}
      </div>
    </section>
  );
}

// Context summary banner (Ref Screenshots 1-5)
function Context({ context, masters }) {
  const group = (masters.groups || []).find((g) => eq(g.id, context.group));
  const program = (masters.programs || []).find((p) => eq(p.id, context.program));
  const section = (masters.sections || []).find((s) => eq(s.id, context.section));
  const exam = (masters.exams || []).find((e) => eq(e.id, context.exam));

  const rawGroupTitle = group?.groupName || group?.name || "Academic Group";
  const groupTitle = group?.groupCode && rawGroupTitle.includes(`(${group.groupCode})`)
    ? rawGroupTitle.replace(`(${group.groupCode})`, "").trim()
    : rawGroupTitle;
  const examCode = exam?.code || exam?.examCode || "";
  const examBaseName = exam?.name || exam?.examName || "";
  const examLabel = examCode && !examBaseName.includes(examCode) ? `${examBaseName} (${examCode})` : examBaseName;
  const subtitle = [
    program?.name || program?.programName,
    section?.name || section?.sectionName,
    examLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="cms-context-summary">
      <div className="cms-context-content">
        <strong className="cms-context-title" style={{ marginRight: 6 }}>{groupTitle}</strong>
        <span className="cms-context-subtitle">{subtitle || "—"}</span>
      </div>
    </section>
  );
}

// Marks Entry Workspace (Ref Screenshot 5)
function Entry({
  exams = [],
  examId,
  changeExam,
  subjectOptions = [],
  subjectId,
  changeSubject,
  workspace,
  editing,
  entryPage,
  entryPageSize,
  setEntryPage,
  setEntryPageSize,
  updateRow,
  processing,
  loadingWorkspace = false,
  onBulkImport,
  onEdit,
  onCancelEdit,
  onSaveChanges,
  onSave,
  onSubmit,
}) {
  const pageSize = entryPageSize || 5;
  const rows = workspace?.rows?.slice((entryPage - 1) * pageSize, entryPage * pageSize) || [];
  const locked = workspace && !editableStatuses.includes(workspace.status) && !editing;
  const blocked = !workspace?.rows?.length || Boolean(validateMarksConfiguration(workspace));
  const lockedText = locked ? `This ${workspace.status.toLowerCase()} subject is read-only.` : "";

  return (
    <section className="cms-card cms-main-card">
      <div className="cms-workspace-actions">
        <div className="cms-entry-selects">
          <SearchableSelect
            id="marks-examination"
            label="EXAMINATION"
            value={examId}
            options={exams.map((exam) => ({
              ...exam,
              name: formatExamDropdownLabel(exam),
            }))}
            compact
            onChange={changeExam}
          />
          <SearchableSelect
            id="marks-subject"
            label="SUBJECT"
            value={subjectId}
            options={subjectOptions}
            disabled={!subjectOptions?.length}
            compact
            onChange={changeSubject}
            emptyText="No subjects configured for selected examination."
          />
        </div>
        <div className="cms-bulk-actions">
          <button
            type="button"
            className="cms-btn cms-btn-secondary cms-btn-bulk-import"
            disabled={Boolean(processing) || !subjectId || locked || loadingWorkspace}
            onClick={onBulkImport}
            title="Import student marks from an Excel (.xlsx, .xls) file"
          >
            Bulk Import
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-secondary"
            disabled={Boolean(processing) || !subjectId || blocked || !editableStatuses.includes(workspace?.status) || loadingWorkspace}
            onClick={onSave}
          >
            {processing === "SAVE_DRAFT" ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={Boolean(processing) || !subjectId || blocked || !editableStatuses.includes(workspace?.status) || loadingWorkspace}
            onClick={onSubmit}
          >
            {processing === "SUBMIT" ? "Submitting..." : "Submit Subject"}
          </button>
        </div>
      </div>

      {!workspace ? (
        loadingWorkspace ? (
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>ROLL NO</th>
                  <th>STUDENT</th>
                  <th>INTERNAL / 20</th>
                  <th>THEORY / 80</th>
                  <th>TOTAL / 100</th>
                  <th>PERCENTAGE</th>
                  <th>ABSENT</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, index) => (
                  <SkeletonRow key={index} columns={8} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            text={
              subjectOptions.length
                ? "Select a Subject to load its marks workspace."
                : "No subjects are configured for the selected examination."
            }
          />
        )
      ) : (
        <>
          {validateMarksConfiguration(workspace) && (
            <div className="cms-config-error">{validateMarksConfiguration(workspace)}</div>
          )}
          {!workspace?.rows?.length && !loadingWorkspace && (
            <div className="cms-config-error">No active students are available for the selected section.</div>
          )}

          <div className="cms-entry-toolbar">
            <div className="cms-config-summary">
              <Badge status={workspace.status} />
              <span>
                {workspace.faculty?.name || "Faculty"}
                {workspace.facultyId ? ` (EMP-${workspace.facultyId})` : ""} · {workspace.mode} · Maximum{" "}
                {workspace.maxMarks} · Pass {workspace.passPercentage}%
              </span>
            </div>
            {workspace.status === "SUBMITTED" && !editing && !blocked && !loadingWorkspace && (
              <div className="cms-entry-edit-action">
                {workspace.dirty ? (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    disabled={Boolean(processing)}
                    onClick={onSaveChanges}
                  >
                    {processing === "SAVE_EDIT" ? "Saving..." : "Save Submitted Marks"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cms-btn cms-btn-secondary"
                    disabled={Boolean(processing)}
                    onClick={onEdit}
                  >
                    Edit Submitted Marks
                  </button>
                )}
              </div>
            )}
          </div>

          <Table
            heads={[
              "ROLL NO",
              "STUDENT",
              ...(workspace?.mode === "REGULAR"
                ? [
                  `INTERNAL / ${workspace?.internalMax ?? 20}`,
                  ...(workspace?.practicalMax ? [`PRACTICAL / ${workspace?.practicalMax}`] : []),
                  `THEORY / ${workspace?.theoryMax ?? (Number(workspace?.maxMarks || 100) - Number(workspace?.internalMax || 20))}`,
                  `TOTAL / ${workspace?.maxMarks || 100}`,
                ]
                : [`Objective Marks / ${workspace?.maxMarks || 100}`]),
              "PERCENTAGE",
              "ABSENT",
              "REMARKS",
            ]}
          >
            {loadingWorkspace ? (
              <LoadingRow
                span={workspace?.mode === "REGULAR" ? (workspace?.practicalMax ? 9 : 8) : 6}
                count={Math.min(6, pageSize || 5)}
              />
            ) : rows.length ? (
              rows.map((row) => (
                <MarkRow
                  key={row.studentId}
                  row={row}
                  workspace={workspace}
                  locked={(locked && Boolean(row.markId)) || blocked}
                  update={(field, value) => updateRow(row.studentId, field, value)}
                />
              ))
            ) : (
              <EmptyRow
                span={workspace?.mode === "REGULAR" ? (workspace?.practicalMax ? 9 : 8) : 6}
                text={locked ? lockedText : "No active students are available for the selected section."}
              />
            )}
          </Table>

          {!loadingWorkspace && (
            <DynamicPagination
              page={entryPage}
              pageSize={pageSize}
              setPageSize={setEntryPageSize}
              totalItems={workspace?.rows?.length || 0}
              setPage={setEntryPage}
              summaryText={lockedText}
            />
          )}

          {(editing || (workspace?.status === "SUBMITTED" && workspace?.dirty)) && (
            <div className="cms-marks-actions">
              {editing && (
                <button
                  type="button"
                  className="cms-btn cms-btn-secondary"
                  disabled={Boolean(processing)}
                  onClick={onCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={Boolean(processing) || blocked}
                onClick={onSaveChanges}
              >
                {processing === "SAVE_EDIT" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MarkRow({ row, workspace, locked, update }) {
  const result = row.absent ? null : calculateStudentSubjectResult(row, workspace);
  return (
    <tr>
      <td className="cms-cell-center">{row.rollNo}</td>
      <td>
        {row.studentName}
        {workspace.validationErrors?.[row.studentId]?.map((error) => (
          <small className="cms-row-error" key={error}>
            {error}
          </small>
        ))}
      </td>
      {workspace.mode === "REGULAR" ? (
        <>
          <Num value={row.internal} disabled={locked || row.absent} title="Internal Marks" onChange={(value) => update("internal", value)} />
          {workspace.practicalMax > 0 && (
            <Num
              value={row.practical}
              disabled={locked || row.absent}
              title="Practical Marks"
              onChange={(value) => update("practical", value)}
            />
          )}
          <Num value={row.theory} disabled={locked || row.absent} title="Theory Marks" onChange={(value) => update("theory", value)} />
          <td className="cms-cell-center">{row.absent ? "ABS" : row.total === "" ? "—" : row.total}</td>
        </>
      ) : (
        <Num
          value={row.obtainedMarks}
          disabled={locked || row.absent}
          title="Objective Marks"
          onChange={(value) => update("obtainedMarks", value)}
        />
      )}
      <td className="cms-cell-center">
        {row.absent
          ? "ABS"
          : (workspace.mode === "OBJECTIVE" ? row.obtainedMarks : row.total) === ""
            ? "—"
            : `${result?.percentage !== undefined && Number.isFinite(Number(result.percentage)) ? Number(result.percentage).toFixed(2) : "0.00"}%`}
      </td>
      <td className="cms-cell-center">
        <input
          type="checkbox"
          className="cms-checkbox"
          checked={row.absent}
          disabled={locked}
          onChange={(event) => update("absent", event.target.checked)}
        />
      </td>
      <td className="cms-cell-center">
        <input
          className="cms-remarks-input"
          value={row.remarks}
          maxLength={250}
          disabled={locked}
          placeholder="Remarks"
          title="Remarks"
          aria-label="Student remarks"
          onChange={(event) => update("remarks", event.target.value)}
        />
      </td>
    </tr>
  );
}

// Sub-Tab 1: Faculty Evaluations (Ref Screenshot 1 & media_1789110791481)
function EvaluationList({
  rows,
  search,
  setSearch,
  page,
  pageSize = 5,
  setPage,
  setPageSize,
  onView,
  readiness,
  onBulk,
  processing,
  subTab,
  setSubTab,
}) {
  const currentLimit = pageSize || 5;
  const shown = rows.slice((page - 1) * currentLimit, page * currentLimit);
  const distinctSubjectCount = new Set(rows.map((item) => item.subjectId || item.subject?.id)).size;
  const subjText = distinctSubjectCount === 1 ? "subject" : "subjects";
  const summaryText = `${distinctSubjectCount} ${subjText}`;

  return (
    <section className="cms-card cms-main-card">
      <div className="cms-eval-table-toolbar">
        <div className="cms-eval-toolbar-left">
          {setSubTab && (
            <div className="cms-subtab-pill-group">
              <button
                type="button"
                className={`cms-subtab-pill-btn ${subTab === "evaluation" ? "active" : ""}`}
                onClick={() => setSubTab("evaluation")}
              >
                Evaluation
              </button>
              <button
                type="button"
                className={`cms-subtab-pill-btn ${subTab === "students" ? "active" : ""}`}
                onClick={() => setSubTab("students")}
              >
                Student Analysis
              </button>
            </div>
          )}
          <div className="cms-bulk-actions">
            {readiness?.submittedCount > 0 && (
              <button
                type="button"
                className="cms-btn cms-btn-info"
                disabled={Boolean(processing)}
                onClick={() => onBulk("VERIFY_ALL")}
              >
                {processing === "VERIFY_ALL" ? "Verifying..." : `Verify ${readiness.submittedCount} Submitted`}
              </button>
            )}
            <button
              type="button"
              className="cms-btn cms-btn-success"
              disabled={Boolean(processing) || !readiness?.verifiedCount}
              onClick={() => onBulk("APPROVE_ALL")}
            >
              {processing === "APPROVE_ALL" ? "Approving..." : readiness?.verifiedCount ? `Approve ${readiness.verifiedCount} Verified` : "Approve All"}
            </button>
          </div>
        </div>
        <div className="cms-eval-search">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search subject, faculty, status..."
          />
        </div>
      </div>
      <Table className="cms-table-eval" heads={["SUBJECT", "FACULTY", "STUDENTS", "AVERAGE / MAXIMUM", "HIGHEST", "LOWEST", "STATUS", "ACTIONS"]}>
        {processing === "CHECK_EVALUATIONS" ? (
          <LoadingRow span={8} count={5} />
        ) : shown.length ? (
          shown.map((item) => (
            <tr key={evaluationKey(item)}>
              <td>
                {item.subject?.name}
                <small className="cms-row-subtitle">{item.subject?.code}</small>
              </td>
              <td>
                <div>{item.faculty?.name || "—"}</div>
                {(item.faculty?.code || item.facultyId) ? (
                  <small className="cms-row-subtitle">
                    {item.faculty?.code || `EMP-${item.facultyId}`}
                  </small>
                ) : null}
              </td>
              <td className="cms-cell-center">{item.studentsCount}</td>
              <td className="cms-cell-center">
                {item.average} / {item.maxMarks}
              </td>
              <td className="cms-cell-center">{item.highest}</td>
              <td className="cms-cell-center">{item.lowest}</td>
              <td className="cms-cell-center">
                <Badge status={item.status} />
              </td>
              <td className="cms-cell-center">
                <button
                  type="button"
                  className="cms-action-btn"
                  onClick={() => onView(item)}
                  aria-label="View Evaluation"
                >
                  <IconEye />
                </button>
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow
            span={8}
            text={
              search
                ? "No evaluations found matching search criteria."
                : "No submitted evaluations are available for this context."
            }
          />
        )}
      </Table>
      <DynamicPagination
        page={page}
        pageSize={currentLimit}
        setPageSize={setPageSize}
        totalItems={rows.length}
        setPage={setPage}
        summaryText={summaryText}
      />
    </section>
  );
}

// Subject Marks Breakdown (Ref Screenshot 3)
function EvaluationDetails({ item, page, pageSize = 5, setPage, setPageSize, onBack, onAction, processing }) {
  const currentLimit = pageSize || 5;
  const rows = item.rows?.slice((page - 1) * currentLimit, page * currentLimit) || [];
  return (
    <section className="cms-card cms-main-card">
      <Back onClick={onBack} title={`${item.subject?.name || "Subject"} Marks Breakdown`} />
      <Table
        className="cms-table-eval"
        heads={[
          "ROLL NO",
          "STUDENT",
          ...(item.mode === "REGULAR" ? ["INTERNAL", ...(item.practicalMax ? ["PRACTICAL"] : []), "THEORY"] : []),
          "OBTAINED",
          "REMARKS",
          "ABSENT",
        ]}
      >
        {rows.map((row) => (
          <tr key={row.studentId}>
            <td className="cms-cell-center">{row.rollNo}</td>
            <td>{row.studentName}</td>
            {item.mode === "REGULAR" && (
              <>
                <td className="cms-cell-center">{row.absent ? "—" : row.internal}</td>
                {item.practicalMax > 0 && <td className="cms-cell-center">{row.absent ? "—" : row.practical}</td>}
                <td className="cms-cell-center">{row.absent ? "—" : row.theory}</td>
              </>
            )}
            <td className="cms-cell-center">{row.absent ? "ABS" : (row.total !== "" && row.total !== null && row.total !== undefined ? row.total : (row.obtainedMarks ?? "—"))}</td>
            <td className="cms-cell-center">{row.remarks || "—"}</td>
            <td className="cms-cell-center">{row.absent ? "Yes" : "No"}</td>
          </tr>
        ))}
      </Table>
      <DynamicPagination
        page={page}
        pageSize={currentLimit}
        setPageSize={setPageSize}
        totalItems={item.rows?.length || 0}
        setPage={setPage}
      />
      <div className="cms-modal-actions">
        {item.status === "SUBMITTED" && (
          <>
            <button
              type="button"
              className="cms-btn cms-btn-info"
              disabled={Boolean(processing)}
              onClick={() => onAction("VERIFY")}
            >
              {processing === "VERIFY" ? "Verifying..." : "Verify Evaluation"}
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              disabled={Boolean(processing)}
              onClick={() => onAction("REJECT")}
            >
              {processing === "REJECT" ? "Rejecting..." : "Reject Evaluation"}
            </button>
          </>
        )}
        {item.status === "VERIFIED" && (
          <>
            <button
              type="button"
              className="cms-btn cms-btn-success"
              disabled={Boolean(processing)}
              onClick={() => onAction("APPROVE")}
            >
              {processing === "APPROVE" ? "Approving..." : "Approve Evaluation"}
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              disabled={Boolean(processing)}
              onClick={() => onAction("REJECT")}
            >
              {processing === "REJECT" ? "Rejecting..." : "Reject Evaluation"}
            </button>
          </>
        )}
        <Badge status={item.status} />
      </div>
    </section>
  );
}

// Sub-Tab 2: Student Analysis Table (Ref Screenshot 2 & media_1789110791481)
function StudentList({
  rows,
  subjects = [],
  search,
  setSearch,
  page,
  pageSize = 5,
  setPage,
  setPageSize,
  onView,
  subTab,
  setSubTab,
  processing,
}) {
  const currentLimit = pageSize || 5;
  const shown = rows.slice((page - 1) * currentLimit, page * currentLimit);
  return (
    <section className="cms-card cms-main-card">
      <div className="cms-eval-table-toolbar">
        <div className="cms-eval-toolbar-left">
          {setSubTab && (
            <div className="cms-subtab-pill-group">
              <button
                type="button"
                className={`cms-subtab-pill-btn ${subTab === "evaluation" ? "active" : ""}`}
                onClick={() => setSubTab("evaluation")}
              >
                Evaluation
              </button>
              <button
                type="button"
                className={`cms-subtab-pill-btn ${subTab === "students" ? "active" : ""}`}
                onClick={() => setSubTab("students")}
              >
                Student Analysis
              </button>
            </div>
          )}
        </div>
        <div className="cms-eval-search">
          <SearchBox value={search} onChange={setSearch} placeholder="Search students..." />
        </div>
      </div>
      <Table
        className="cms-table-eval"
        heads={[
          "ROLL NO",
          "STUDENT",
          ...subjects.map((sub) => (sub.subjectName || sub.name || "SUBJECT").toUpperCase()),
          "OBTAINED MARKS",
          "PERCENTAGE",
          "GRADE",
          "RESULT",
          "ACTIONS",
        ]}
      >
        {processing === "CHECK_EVALUATIONS" ? (
          <LoadingRow span={7 + subjects.length} count={5} />
        ) : shown.length ? (
          shown.map((student) => (
            <tr key={student.studentId}>
              <td className="cms-cell-center">{student.rollNo}</td>
              <td>{student.studentName}</td>
              {subjects.map((sub) => {
                const subId = sub.subjectId || sub.id;
                const res = student.subjectResults?.find((item) => eq(item.subjectId, subId));
                return (
                  <td key={subId} className="cms-cell-center">
                    {!res ? "—" : res.isAbsent ? "ABS" : res.obtained}
                  </td>
                );
              })}
              <td className="cms-cell-center">
                {student.totalObtained} / {student.totalMaximum}
              </td>
              <td className="cms-cell-center">{Number(student.percentage || 0).toFixed(2)}%</td>
              <td className="cms-cell-center">{student.grade}</td>
              <td className="cms-cell-center">
                <Result status={student.result} />
              </td>
              <td className="cms-cell-center">
                <button
                  type="button"
                  className="cms-action-btn"
                  aria-label={`View ${student.studentName} result`}
                  onClick={() => onView(student)}
                >
                  <IconEye />
                </button>
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow span={7 + subjects.length} text="No approved student results match the current search." />
        )}
      </Table>
      <DynamicPagination
        page={page}
        pageSize={currentLimit}
        setPageSize={setPageSize}
        totalItems={rows.length}
        setPage={setPage}
      />
    </section>
  );
}

// Detailed Student Performance Report (Ref Screenshot 4)
function StudentDetails({ student, page, pageSize = 5, setPage, setPageSize, onBack }) {
  const currentLimit = pageSize || 5;
  const rows = (student.subjectResults || []).slice((page - 1) * currentLimit, page * currentLimit);
  return (
    <section className="cms-card cms-main-card">
      <Back onClick={onBack} title="Detailed Student Performance Report" />
      <div className="cms-detail-grid">
        <Card label="ROLL NUMBER" value={student.rollNo} />
        <Card label="STUDENT NAME" value={student.studentName} />
        <Card label="EXAMINATION" value={student.examinationName} />
        <Card label="SECTION" value={student.sectionName} />
        <Card label="TOTAL" value={`${student.totalObtained} / ${student.totalMaximum}`} />
        <Card label="PERCENTAGE" value={`${Number(student.percentage || 0).toFixed(2)}%`} />
        <Card label="GRADE" value={student.grade} />
        <Card label="RESULT" value={<Result status={student.result} />} />
      </div>
      <Table className="cms-table-eval" heads={["SUBJECT", "CODE", "MODE", "OBTAINED / MAXIMUM", "PASS %", "PERCENTAGE", "GRADE", "RESULT"]}>
        {rows.map((item) => (
          <tr key={item.subjectId}>
            <td>{item.subjectName}</td>
            <td className="cms-cell-center">{item.subjectCode}</td>
            <td className="cms-cell-center">{item.mode}</td>
            <td className="cms-cell-center">{item.isAbsent ? "ABS" : `${item.obtained} / ${item.maxMarks}`}</td>
            <td className="cms-cell-center">{item.passPercentage}%</td>
            <td className="cms-cell-center">{item.isAbsent ? "ABS" : `${Number(item.percentage || 0).toFixed(2)}%`}</td>
            <td className="cms-cell-center">{item.grade}</td>
            <td className="cms-cell-center">
              <Result status={item.result} />
            </td>
          </tr>
        ))}
      </Table>
      <DynamicPagination
        page={page}
        pageSize={currentLimit}
        setPageSize={setPageSize}
        totalItems={student.subjectResults?.length || 0}
        setPage={setPage}
      />
    </section>
  );
}

function SearchableSelect({
  id,
  label,
  value,
  options = [],
  disabled,
  onChange,
  emptyText = "No matching options",
  hideLabel = false,
  compact = false,
}) {
  const { selectedBoard, selectedAcademicYear } = useAcademicContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const listId = `${id}-listbox`;

  const selected = options.find((item) => eq(item.id, value));
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((item) => (item.name || "").toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, options]);

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!ref.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const keyDown = (event) => {
    if (disabled) return;
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length) {
        setHighlight((current) =>
          (current + (event.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length
        );
      }
    } else if (event.key === "Enter") {
      if (open && filtered[highlight]) {
        event.preventDefault();
        onChange(filtered[highlight].id);
        setOpen(false);
        setQuery("");
      }
    }
  };

  const isBoard = id === "marks-board";
  const isYear = id === "marks-year";
  const isBoardOrYear = isBoard || isYear;

  let displayName = selected?.name || `Select ${label}`;
  if (isBoard) {
    displayName = selected?.name || selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || displayName;
  } else if (isYear) {
    displayName = selected?.name || selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || selectedAcademicYear?.code || displayName;
  }

  // Board and Academic Year remain as disabled dropdown triggers (matching Image 2)
  if (isBoardOrYear) {
    return (
      <div className={`cms-field-group ${compact ? "cms-entry-select-compact" : ""}`}>
        {!hideLabel && (
          <label className="cms-field-label" id={`${id}-label`}>
            {label}
          </label>
        )}
        <div className="cms-custom-select is-disabled">
          <button
            type="button"
            className="cms-custom-select-trigger"
            role="combobox"
            aria-label={label}
            aria-labelledby={!hideLabel ? `${id}-label` : undefined}
            disabled={true}
          >
            <span className="cms-select-trigger-text">{displayName}</span>
            <span className="cms-select-arrow">⌄</span>
          </button>
        </div>
      </div>
    );
  }

  // All remaining dropdowns styled and structured like the first reference (without search icon)
  return (
    <div className={`cms-field-group ${compact ? "cms-entry-select-compact" : ""}`}>
      {!hideLabel && (
        <label className="cms-field-label" id={`${id}-label`}>
          {label}
        </label>
      )}
      <div className={`cms-custom-select ${open ? "is-open" : ""}`} ref={ref}>
        <div
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-label={label}
          className={`cms-custom-select-combobox ${open ? "is-focused" : ""} ${disabled ? "is-disabled" : ""}`}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
            setQuery("");
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (!open && (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ")) {
              e.preventDefault();
              setOpen(true);
              setQuery("");
            }
          }}
        >
          {open ? (
            <input
              ref={inputRef}
              id={id}
              type="text"
              role="searchbox"
              aria-label={label}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={disabled}
              className="cms-custom-combobox-input"
              value={query}
              placeholder={selected?.name || `Search ${label.toLowerCase()}...`}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={keyDown}
            />
          ) : (
            <span className={`cms-custom-combobox-value ${!selected ? "is-placeholder" : ""}`}>
              {selected?.name || `Select ${label}`}
            </span>
          )}
          <button
            type="button"
            tabIndex={-1}
            className="cms-select-arrow-btn"
            disabled={disabled}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              setOpen((prev) => !prev);
              setQuery("");
            }}
          >
            <span className={`cms-select-arrow ${open ? "is-open" : ""}`}>⌄</span>
          </button>
        </div>

        {open && !disabled && (
          <div className="cms-custom-select-menu bay-style-menu" id={listId} role="listbox">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={`cms-custom-select-option ${!value ? "selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="cms-option-text">Select {label}</span>
            </button>
            {filtered.length ? (
              filtered.map((item, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={eq(item.id, value)}
                  className={`cms-custom-select-option ${eq(item.id, value) ? "selected" : ""} ${highlight === index ? "highlighted" : ""
                    }`}
                  key={item.id}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(item.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="cms-option-text">{item.name}</span>
                </button>
              ))
            ) : (
              <div className="cms-custom-select-empty">{emptyText}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const Num = ({ value, disabled, onChange, title = "Marks input" }) => (
  <td className="cms-cell-center">
    <input
      type="text"
      inputMode="decimal"
      className="cms-number-input"
      value={value}
      disabled={disabled}
      title={title}
      aria-label={title || "Marks input"}
      onChange={(event) => onChange(event.target.value)}
    />
  </td>
);

const SearchBox = ({ value, onChange }) => (
  <div className="cms-search-wrap">
    <input
      className="cms-search-input cms-search-input-plain"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search records..."
    />
  </div>
);

const Table = ({ heads, children, className = "" }) => (
  <div className={`cms-table-container ${className ? `${className}-container` : ""}`}>
    <table className={`cms-table ${className}`.trim()}>
      <thead>
        <tr>
          {heads.map((head, index) => {
            const headStr = String(head || "").toUpperCase();
            const isLeftAligned =
              headStr.startsWith("STUDENT") ||
              headStr.startsWith("FACULTY") ||
              headStr.startsWith("SUBJECT") ||
              headStr.includes("STUDENT NAME") ||
              headStr.includes("FACULTY NAME");
            return (
              <th key={`${head}-${index}`} className={isLeftAligned ? "" : "cms-th-center"}>
                {head}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Badge = ({ status }) => (
  <span className={`cms-badge-status cms-status-${(status || "draft").toLowerCase().replaceAll(" ", "-")}`}>
    <span className="cms-badge-dot" />
    {status}
  </span>
);

const Result = ({ status }) => (
  <span className={`cms-result cms-result-${(status || "pass").toLowerCase()}`}>{status}</span>
);

const Card = ({ label, value }) => (
  <div className="cms-detail-card">
    <span className="cms-detail-label">{label}</span>
    <span className="cms-detail-value">{value}</span>
  </div>
);

const Back = ({ onClick, title }) => (
  <div className="cms-details-header">
    <button type="button" className="cms-back-btn" onClick={onClick}>
      ← Back
    </button>
    <h2 className="cms-details-title">{title}</h2>
  </div>
);

const Empty = ({ text }) => <div className="cms-card cms-empty-card">{text}</div>;
const EmptyRow = ({ span, text }) => (
  <tr>
    <td colSpan={span} className="cms-empty-td">
      {text}
    </td>
  </tr>
);
const LoadingRow = ({ span, count = 5 }) => (
  <>
    {Array.from({ length: count }, (_, idx) => (
      <SkeletonRow key={idx} columns={span} />
    ))}
  </>
);

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconUpload = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconFileSpreadsheet = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="10" y1="9" x2="11" y2="9" />
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

function DynamicPagination({ page, pageSize = 5, setPageSize, totalItems = 0, setPage, summaryText }) {
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState(String(pageSize || 5));

  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize || 5)));

  useEffect(() => {
    if (totalPages && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page, setPage]);

  const start = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = totalItems > 0 ? Math.min(page * pageSize, totalItems) : 0;

  return (
    <div className="cms-pagination">
      <div className="cms-pagination-summary-left">
        <span className="cms-sec-record-summary">
          Showing {start}–{end} of {totalItems} records
        </span>
        {summaryText ? (
          <span className="cms-eval-summary-text" style={{ marginLeft: 12 }}>
            ({summaryText})
          </span>
        ) : null}
      </div>

      <div className="cms-pagination-controls">
        {setPageSize && (
          <div className="cms-sec-page-size-wrap">
            <span className="cms-sec-page-size-label">Per page:</span>
            <select
              className="cms-sec-page-size-select"
              aria-label="Records per page"
              value={isCustom ? "custom" : pageSize}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setIsCustom(true);
                  setCustomInput(String(pageSize));
                } else {
                  setIsCustom(false);
                  setPageSize(Number(val));
                  setPage(1);
                }
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value="custom">Custom</option>
            </select>
            {isCustom && (
              <input
                type="number"
                min="1"
                max="200"
                className="cms-sec-page-size-custom-input"
                value={customInput}
                placeholder="Qty"
                aria-label="Custom records per page"
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomInput(val);
                  const num = parseInt(val, 10);
                  if (Number.isInteger(num) && num > 0) {
                    setPageSize(num);
                    setPage(1);
                  }
                }}
              />
            )}
          </div>
        )}

        <button
          type="button"
          className="cms-page-btn"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span className="cms-page-info">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="cms-page-btn"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Pagination(props) {
  return (
    <DynamicPagination
      page={props.page}
      pageSize={PAGE_SIZE}
      totalItems={(props.total || 0) * PAGE_SIZE}
      setPage={props.setPage}
      summaryText={props.summaryText}
    />
  );
}

function BulkImportModal({
  workspace,
  file,
  setFile,
  isDragging,
  setIsDragging,
  isValidating,
  validationResult,
  setValidationResult,
  isImporting,
  onDownloadTemplate,
  onValidate,
  onApply,
  onClose,
}) {
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setValidationResult(null);
    }
  };

  return (
    <div className="cms-overlay" onClick={onClose}>
      <div
        className="cms-modal cms-import-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-marks-title"
      >
        <div className="cms-modal-head">
          <div>
            <h3 id="upload-marks-title">Upload &amp; Import Marks</h3>
            <p className="cms-room-modal-subtitle">
              Upload an Excel (.xlsx, .xls) file to validate and bulk import marks for{" "}
              <strong>{workspace?.subject?.name || "the selected subject"}</strong>.
            </p>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            style={{ width: 32, height: 32, padding: 0 }}
            onClick={onClose}
            disabled={isImporting || isValidating}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="cms-modal-body">
          <div className="cms-room-template-action">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ fontSize: 12, height: 28, padding: "0 8px", gap: 5 }}
              onClick={onDownloadTemplate}
            >
              <Download size={13} />
              Download Excel Template
            </button>
          </div>

          {!file ? (
            <div
              className={`cms-room-dropzone ${isDragging ? "is-dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setValidationResult(null);
                  }
                }}
              />
              <div className="cms-room-dropzone-icon">
                <Upload size={20} />
              </div>
              <span className="cms-room-dropzone-title">Click to upload or drag &amp; drop file</span>
              <span className="cms-room-dropzone-subtitle">Supported formats: .xlsx, .xls, .csv</span>
            </div>
          ) : (
            <div className="cms-room-file-card">
              <div className="cms-room-file-card-info">
                <FileSpreadsheet size={24} color="var(--cms-primary, #6F8400)" />
                <div className="cms-room-file-card-details">
                  <span className="cms-room-file-name">{file.name}</span>
                  <span className="cms-room-file-meta">
                    {(file.size / 1024).toFixed(1)} KB • Ready for validation
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ height: 28, padding: "0 10px", fontSize: 12 }}
                onClick={() => {
                  setFile(null);
                  setValidationResult(null);
                }}
                disabled={isValidating || isImporting}
              >
                Change File
              </button>
            </div>
          )}

          {validationResult && (
            <>
              <div className="cms-room-verify-summary">
                <div className="cms-room-summary-pill">
                  <strong>{validationResult.totalRows}</strong>
                  <span>Total Rows</span>
                </div>
                <div className="cms-room-summary-pill valid">
                  <strong>{validationResult.validRows}</strong>
                  <span>Valid</span>
                </div>
                <div className="cms-room-summary-pill invalid">
                  <strong>{validationResult.invalidRows}</strong>
                  <span>Errors</span>
                </div>
                <div className="cms-room-summary-pill duplicate">
                  <strong>{validationResult.duplicateRows}</strong>
                  <span>Duplicates</span>
                </div>
              </div>

              {validationResult.errors?.length > 0 && (
                <div className="cms-room-error-log">
                  {validationResult.errors.map((err, i) => (
                    <div key={i} className="cms-room-error-item">
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>
                        {err.row > 0 ? `Row ${err.row}: ` : ""}
                        {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="cms-modal-foot">
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={onClose}
            disabled={isImporting || isValidating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-outline"
            onClick={onValidate}
            disabled={!file || isValidating || isImporting}
          >
            {isValidating ? (
              <SkeletonButton width={92} />
            ) : (
              <>
                <CheckCircle2 size={14} />
                Validate File
              </>
            )}
          </button>
          {validationResult?.isValid && validationResult?.validPayloads?.length > 0 && (
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={onApply}
              disabled={isImporting}
            >
              {isImporting ? (
                <SkeletonButton width={128} />
              ) : (
                <>
                  <Upload size={14} />
                  Import {validationResult.validPayloads.length} Marks
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const Confirm = ({ title, text, onCancel, onConfirm, processing = false }) => (
  <div className="cms-overlay">
    <div className="cms-modal">
      <div className="cms-modal-head">
        <h3>{title}</h3>
      </div>
      <div className="cms-modal-body">{text}</div>
      <div className="cms-modal-foot">
        <button type="button" className="cms-btn cms-btn-secondary" onClick={onCancel} disabled={processing}>
          Cancel
        </button>
        <button type="button" className="cms-btn cms-btn-primary" onClick={onConfirm} disabled={processing}>
          {processing ? "Processing..." : "Confirm"}
        </button>
      </div>
    </div>
  </div>
);

const Message = ({ action, value, setValue, onCancel, onConfirm, processing = false }) => (
  <div className="cms-overlay">
    <div className="cms-modal">
      <div className="cms-modal-head">
        <h3>{action === "VERIFY" ? "Verify Evaluation" : "Reject Evaluation"}</h3>
      </div>
      <div className="cms-modal-body">
        <textarea
          className="cms-marks-textarea"
          rows="4"
          maxLength={500}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={action === "REJECT" ? "Rejection reason" : "Optional verification note"}
          disabled={processing}
        />
      </div>
      <div className="cms-modal-foot">
        <button type="button" className="cms-btn cms-btn-secondary" onClick={onCancel} disabled={processing}>
          Cancel
        </button>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={processing || (action === "REJECT" && !value.trim())}
          onClick={onConfirm}
        >
          {processing ? (action === "REJECT" ? "Rejecting..." : "Verifying...") : "Confirm"}
        </button>
      </div>
    </div>
  </div>
);
