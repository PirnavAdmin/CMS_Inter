import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import * as XLSX from "xlsx";
import "./MarksEntryPage.css";

const PAGE_SIZE = 5;
const normalizeId = (value) => String(value ?? "");
const isActiveRecord = (item) => item?.isActive !== false && item?.status !== false;
const evaluationKey = (item) => `${item.examinationId}:${item.sectionId}:${item.subjectId}`;
const eq = (a, b) => normalizeId(a) === normalizeId(b);
const grade = (value) =>
  value >= 90 ? "A+" : value >= 80 ? "A" : value >= 70 ? "B+" : value >= 60 ? "B" : value >= 50 ? "C" : value >= 40 ? "D" : "F";
const editableStatuses = ["NOT STARTED", "DRAFT", "REJECTED"];

const buildMarksPayload = (workspace, evalId) => {
  const formattedMarks = (workspace?.rows || []).map((row) => {
    const isAbsent = Boolean(row.absent);
    const internal = isAbsent || workspace?.mode === "OBJECTIVE" ? 0 : Math.round(Number(row.internal || 0));
    const practical = isAbsent || workspace?.mode === "OBJECTIVE" ? 0 : Math.round(Number(row.practical || 0));
    const theory = isAbsent
      ? 0
      : workspace?.mode === "OBJECTIVE"
      ? Math.round(Number(row.obtainedMarks || 0))
      : Math.round(Number(row.theory || 0));
    const total = isAbsent
      ? 0
      : workspace?.mode === "OBJECTIVE"
      ? Math.round(Number(row.obtainedMarks || 0))
      : Math.round(Number(row.total || 0));

    return {
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
    evaluationId: String(evalId || workspace?.evaluationId || ""),
    rowVersion: Number(workspace?.rowVersion || 0),
    remarks: "Marks Entry",
    students: formattedMarks,
    marks: formattedMarks,
    marksList: formattedMarks,
    studentMarks: formattedMarks,
  };
};

const buildAdminMarksPayload = (workspace) => {
  const studentMarks = (workspace?.rows || []).map((row) => {
    const isAbsent = Boolean(row.absent);
    const internal = isAbsent || workspace?.mode === "OBJECTIVE" ? 0 : Number(row.internal || 0);
    const practical = isAbsent || workspace?.mode === "OBJECTIVE" ? 0 : Number(row.practical || 0);
    const theory = isAbsent
      ? 0
      : workspace?.mode === "OBJECTIVE"
      ? Number(row.obtainedMarks || 0)
      : Number(row.theory || 0);
    const total = isAbsent
      ? 0
      : workspace?.mode === "OBJECTIVE"
      ? Number(row.obtainedMarks || 0)
      : Number(row.total || 0);

    return {
      ...(row.markId ? { markId: Number(row.markId) } : {}),
      studentId: Number(row.studentId),
      internal,
      practical,
      theory,
      obtainedMarks: total,
      maxMarks: Number(workspace?.maxMarks || 100),
      isAbsent,
      remarks: String(row.remarks || "").trim(),
    };
  });

  return {
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
  workspace.rows.forEach((row) => {
    if (row.absent) return;
    const fields =
      workspace.mode === "OBJECTIVE"
        ? [["obtainedMarks", workspace.maxMarks]]
        : [
            ["internal", workspace.internalMax],
            ...(workspace.practicalMax ? [["practical", workspace.practicalMax]] : []),
            ["theory", workspace.theoryMax],
          ];
    const list = [];
    fields.forEach(([key, max]) => {
      if (row[key] === "" || row[key] === null || row[key] === undefined) {
        if (complete) list.push(`${key} is required`);
      } else if (!numericMark(row[key]) || Number(row[key]) < 0 || Number(row[key]) > Number(max)) {
        list.push(`${key} must be between 0 and ${max} with at most two decimals`);
      }
    });
    if ((row.remarks || "").trim().length > 250) list.push("Remarks cannot exceed 250 characters");
    if (list.length) errors[row.studentId] = list;
  });
  return errors;
};

const calculateStudentSubjectResult = (row, workspace) => {
  if (!row || !workspace) return { obtained: 0, percentage: 0, grade: "F", result: "FAIL" };
  const obtained = row.absent ? 0 : Number(workspace.mode === "OBJECTIVE" ? row.obtainedMarks : row.total);
  const percentage = workspace.maxMarks ? (obtained / workspace.maxMarks) * 100 : 0;
  return {
    obtained,
    percentage,
    grade: grade(percentage),
    result: !row.absent && percentage >= (workspace.passPercentage || 35) ? "PASS" : "FAIL",
  };
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
    .filter((row) => !row.absent)
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
function useAcademicFilterState(allBoards = [], guard = (fn) => fn(), onReset = () => {}) {
  const {
    selectedBoard,
    selectedBoardId,
    selectedAcademicYear,
    selectedAcademicYearId,
  } = useAcademicContext();

  const [filters, setFilters] = useState({
    board: "",
    year: "",
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

  // Auto-select board when allBoards loads or navbar board changes
  useEffect(() => {
    if (allBoards.length > 0) {
      const targetBoard = allBoards.find(
        (b) =>
          eq(b.id, selectedBoardId) ||
          (selectedBoard?.code && String(b.code || "").trim().toLowerCase() === String(selectedBoard.code).trim().toLowerCase()) ||
          (selectedBoard?.name && String(b.name || "").trim().toLowerCase() === String(selectedBoard.name).trim().toLowerCase())
      ) || allBoards.find((b) => b.isActive) || allBoards[0];

      if (targetBoard && !eq(filters.board, targetBoard.id)) {
        setFilters((prev) => ({ ...prev, board: targetBoard.id }));
      }
    }
  }, [allBoards, selectedBoardId, selectedBoard, filters.board]);

  // Load Years, Levels, Groups when Board changes
  useEffect(() => {
    if (!filters.board) {
      setYears([]);
      setLevels([]);
      setGroups([]);
      return;
    }

    let isMounted = true;
    const loadBoardDeps = async () => {
      const selectedBoard = allBoards.find((b) => eq(b.id, filters.board));

      // Fetch Years
      try {
        const yearsRes = await apiClient
          .get(apiEndpoints.academicYears.active, {
            params: { boardId: filters.board, isActive: true },
          })
          .catch(() => apiClient.get(apiEndpoints.academicYears.getAll));
        const rawYears = unwrapRecords(yearsRes);
        const listYears = rawYears
          .map((y) => ({
            id: normalizeId(y.academicYearId ?? y.id),
            name: y.academicYearName ?? y.name,
            boardId: normalizeId(y.boardId),
            isActive: y.isActive !== false,
            isCurrent: Boolean(y.isCurrent),
          }))
          .filter((y) => y.isActive && (!y.boardId || eq(y.boardId, filters.board)));

        if (isMounted) {
          setYears(listYears);
          const targetYear = listYears.find(
            (y) =>
              eq(y.id, selectedAcademicYearId) ||
              (selectedAcademicYear?.name && String(y.name || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "") === String(selectedAcademicYear.name).trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "")) ||
              (selectedAcademicYear?.code && String(y.name || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "") === String(selectedAcademicYear.code).trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, ""))
          ) || listYears.find((y) => y.isCurrent) || listYears[0];

          setFilters((prev) => ({
            ...prev,
            year: targetYear ? targetYear.id : "",
          }));
        }
      } catch (err) {
        console.error("Error fetching academic years:", err);
        if (isMounted) setYears([]);
      }

      // Fetch Levels
      try {
        let levelItems = [];
        const levelsRes = await apiClient
          .get(
            apiEndpoints.academicLevels?.getByBoard
              ? apiEndpoints.academicLevels.getByBoard(filters.board)
              : `/api/v1/academic-levels?boardId=${filters.board}`
          )
          .catch(() =>
            apiClient.get(apiEndpoints.academicLevels?.getAll || "/api/v1/academic-levels", {
              params: { boardId: filters.board },
            })
          )
          .catch(() => apiClient.get(`/api/v1/boards/${encodeURIComponent(filters.board)}/academic-levels`));

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
        }

        if (isMounted) setLevels(levelItems.filter((l) => l.isActive));
      } catch (err) {
        console.error("Error fetching academic levels:", err);
        if (isMounted) setLevels([]);
      }

      // Fetch Groups
      try {
        const groupsRes = await apiClient
          .get(
            apiEndpoints.groups?.getByBoard
              ? apiEndpoints.groups.getByBoard(filters.board)
              : `/api/v1/groups?boardId=${filters.board}`
          )
          .catch(() =>
            apiClient.get(apiEndpoints.groups.list, {
              params: { boardId: filters.board, isActive: true },
            })
          );

        const rawGroups = unwrapRecords(groupsRes);
        const listGroups = rawGroups
          .map((g) => ({
            id: normalizeId(g.groupId ?? g.id),
            name: g.groupName ? `${g.groupName}${g.groupCode ? ` (${g.groupCode})` : ""}` : g.name,
            groupName: g.groupName ?? g.name,
            groupCode: g.groupCode ?? "",
            boardId: normalizeId(g.boardId),
            programs: g.programs || [],
            isActive: g.isActive !== false,
          }))
          .filter((g) => g.isActive && (!g.boardId || eq(g.boardId, filters.board)));

        if (isMounted) setGroups(listGroups);
      } catch (err) {
        console.error("Error fetching groups:", err);
        if (isMounted) setGroups([]);
      }
    };

    loadBoardDeps();
    return () => {
      isMounted = false;
    };
  }, [filters.board, allBoards]);

  // Load Programs when Group changes
  useEffect(() => {
    if (!filters.group) {
      setPrograms([]);
      return;
    }

    let isMounted = true;
    const loadPrograms = async () => {
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
        setPrograms(list);
        return;
      }

      try {
        const res = await apiClient.get(
          apiEndpoints.programs?.byGroup
            ? apiEndpoints.programs.byGroup(filters.group)
            : apiEndpoints.groups.getPrograms(filters.group)
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
      } catch (err) {
        console.error("Error fetching programs:", err);
        if (isMounted) setPrograms([]);
      }
    };

    loadPrograms();
    return () => {
      isMounted = false;
    };
  }, [filters.group, groups]);

  // Load Sections and Exams when Board, Year, Level, Group, Program are set
  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group || !filters.program) {
      setSections([]);
      setExams([]);
      return;
    }

    let isMounted = true;
    const loadSectionsAndExams = async () => {
      // 1. Fetch Sections
      try {
        const res = await apiClient.get(apiEndpoints.sections.getAll, {
          params: {
            BoardId: filters.board,
            AcademicYearId: filters.year,
            AcademicLevelId: filters.level,
            GroupId: filters.group,
            ProgramId: filters.program,
            IsActive: true,
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

      // 2. Fetch Completed Examinations strictly matching academic scope
      try {
        const examsRes = await apiClient.get(apiEndpoints.examinations.getAll, {
          params: {
            boardId: filters.board,
            academicYearId: filters.year,
            academicLevelId: filters.level,
            groupId: filters.group,
            programId: filters.program || undefined,
            status: "COMPLETED",
          },
        });
        const rawExams = unwrapRecords(examsRes);
        const examList = (rawExams.length ? rawExams : [])
          .map((e) => {
            const rawStatus = String(e.status ?? e.examStatus ?? e.examinationStatus ?? "").trim().toUpperCase();
            const examCode = e.examCode ?? e.code ?? "";
            const examName = e.examName ?? e.examinationName ?? e.name ?? "Examination";
            return {
              id: normalizeId(e.examinationId ?? e.id ?? e.examId),
              code: examCode,
              examCode: examCode,
              name: examName,
              examName: examName,
              status: rawStatus || (e.isCompleted ? "COMPLETED" : "DRAFT"),
              boardId: normalizeId(e.boardId ?? e.BoardId),
              academicYearId: normalizeId(e.academicYearId ?? e.AcademicYearId ?? e.yearId),
              academicLevelId: normalizeId(e.academicLevelId ?? e.AcademicLevelId),
              groupId: normalizeId(e.groupId ?? e.GroupId),
              programId: normalizeId(e.programId ?? e.ProgramId),
              schedules: e.schedules || e.examinationSchedules || [],
              isActive: e.isActive !== false,
              isCompleted: Boolean(e.isCompleted),
            };
          })
          .filter((e) => {
            if (!e.isActive) return false;
            // STRICT FILTER: Only Completed Examinations
            const isCompleted =
              e.status === "COMPLETED" ||
              e.status === "FINISHED" ||
              e.status === "PUBLISHED" ||
              e.isCompleted === true;
            if (!isCompleted || e.status === "SCHEDULED" || e.status === "DRAFT") return false;

            // Strict matching of academic scope when fields exist on exam
            if (filters.board && e.boardId && !eq(e.boardId, filters.board)) return false;
            if (filters.year && e.academicYearId && !eq(e.academicYearId, filters.year)) return false;
            if (filters.level && e.academicLevelId && !eq(e.academicLevelId, filters.level)) return false;
            if (filters.group && e.groupId && !eq(e.groupId, filters.group)) return false;
            if (filters.program && e.programId && !eq(e.programId, filters.program)) return false;

            return true;
          });

        if (isMounted) {
          setExams(examList);
          setFilters((prev) => {
            if (prev.exam && examList.some((e) => eq(e.id, prev.exam))) return prev;
            return { ...prev, exam: examList[0]?.id || "" };
          });
        }
      } catch (err) {
        console.error("Error fetching examinations:", err);
        if (isMounted) setExams([]);
      }
    };

    loadSectionsAndExams();
    return () => {
      isMounted = false;
    };
  }, [filters.board, filters.year, filters.level, filters.group, filters.program]);

  // Sync year when navbar selected academic year changes
  useEffect(() => {
    if (years.length > 0) {
      const targetYear = years.find(
        (y) =>
          eq(y.id, selectedAcademicYearId) ||
          (selectedAcademicYear?.name && String(y.name || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "") === String(selectedAcademicYear.name).trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "")) ||
          (selectedAcademicYear?.code && String(y.name || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "") === String(selectedAcademicYear.code).trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, ""))
      );
      if (targetYear && !eq(filters.year, targetYear.id)) {
        setFilters((prev) => ({ ...prev, year: targetYear.id }));
      }
    }
  }, [years, selectedAcademicYearId, selectedAcademicYear, filters.year]);

  // Change filter handler with cascading resets and invalidating applied state
  const changeFilter = (key, value) =>
    guard(() => {
      onReset();
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        const children = {
          board: ["group", "program", "section", "exam"],
          year: ["section", "exam"],
          level: ["section", "exam"],
          group: ["program", "section", "exam"],
          program: ["section", "exam"],
          section: [],
          exam: [],
        };
        (children[key] || []).forEach((child) => {
          next[child] = "";
        });
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

export default function MarksEntryPage() {
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
          .get(apiEndpoints.boards.active)
          .catch(() => apiClient.get(apiEndpoints.boards.list));
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

        if (isMounted) setAllBoards(loadedBoards);
      } catch (err) {
        console.error("Error loading boards:", err);
      }
    };
    loadBoards();
    return () => {
      isMounted = false;
    };
  }, []);

  // ==========================================
  // TAB 1: MARKS ENTRY STATE & WORKFLOW
  // ==========================================
  const [entryApplied, setEntryApplied] = useState(false);
  const [entryStudents, setEntryStudents] = useState([]);
  const [entryConfigs, setEntryConfigs] = useState([]);
  const [entryExamId, setEntryExamId] = useState("");
  const [entrySubjectId, setEntrySubjectId] = useState("");
  const [entryPage, setEntryPage] = useState(1);

  const entry = useAcademicFilterState(allBoards, guard, () => setEntryApplied(false));

  // Helper to load schedules & search evaluations for an examination in Marks Entry
  const loadExamConfigsAndEvaluations = async (examId, sectionId, examList = entry.exams, studentList = entryStudents) => {
    if (!examId || !sectionId) return;
    const selectedExam = examList.find((e) => eq(e.id, examId));
    let schedules = selectedExam?.schedules || [];

    if (!schedules.length) {
      try {
        const detailRes = await apiClient.get(`/api/v1/examinations/${examId}`).catch(() => null);
        const detail = detailRes?.data || detailRes;
        if (detail?.schedules?.length) {
          schedules = detail.schedules;
        }
      } catch (e) {
        console.warn("Could not fetch exam schedules:", e);
      }
    }

    const configs = schedules.map((s) => ({
      id: `cfg-${examId}-${s.subjectId}`,
      examinationId: examId,
      sectionId: sectionId,
      subjectId: normalizeId(s.subjectId),
      subjectName: s.subjectName || `Subject ${s.subjectId}`,
      subjectCode: s.subjectCode || "",
      mode: s.scheduleMode === "COMBINED" ? "OBJECTIVE" : "REGULAR",
      maxMarks: Number(s.maxMarks || 100),
      passPercentage: Number(s.passingMarks ? (s.passingMarks / s.maxMarks) * 100 : 35),
      internalMax: Number(s.internalMax ?? 20),
      practicalMax: Number(s.practicalMax ?? (s.isPractical ? 30 : 0)),
      theoryMax: Number(s.theoryMax ?? (Number(s.maxMarks || 100) - 20)),
      facultyName: s.invigilatorName || s.invigilator || s.facultyName || "",
      facultyId: s.invigilatorId || s.facultyId || "",
    }));

    setEntryConfigs(configs);
    setEntrySubjectId((prev) => (configs.some((c) => eq(c.subjectId, prev)) ? prev : configs[0]?.subjectId || ""));

    // Search existing evaluations
    try {
      const evalSearchUrl = apiEndpoints.evaluations?.search || "/api/v1/evaluations/search";
      const evalSearchRes = await apiClient
        .post(evalSearchUrl, {
          boardId: Number(entry.filters.board),
          academicYearId: Number(entry.filters.year),
          academicLevelId: Number(entry.filters.level),
          groupId: Number(entry.filters.group),
          sectionId: Number(sectionId),
          examinationId: Number(examId),
        })
        .catch(() => apiClient.get("/api/v1/faculty/evaluations"));

      const existingEvals = unwrapRecords(evalSearchRes);
      const evalMap = {};
      existingEvals.forEach((ev) => {
        const parts = String(ev.evaluationId || "").split("_");
        const evSubId = normalizeId(ev.subjectId ?? (parts.length >= 3 ? parts[0] : ""));
        const evSecId = normalizeId(ev.sectionId ?? (parts.length >= 3 ? parts[1] : sectionId));
        const evExamId = normalizeId(ev.examinationId ?? ev.examId ?? (parts.length >= 3 ? parts[2] : examId));
        const key = evaluationKey({ examinationId: evExamId, sectionId: evSecId, subjectId: evSubId });
        evalMap[key] = {
          evaluationId: ev.evaluationId || `${evSubId}_${evSecId}_${evExamId}`,
          examinationId: evExamId,
          sectionId: evSecId,
          subjectId: evSubId,
          facultyId: ev.facultyId,
          faculty: { name: ev.facultyName || "Assigned Faculty", employeeCode: ev.facultyCode || "" },
          subject: { id: evSubId, name: ev.subjectName || `Subject ${evSubId}`, code: ev.subjectCode || "" },
          status: String(ev.status || "DRAFT").trim().toUpperCase(),
          mode: ev.examPattern === "OBJECTIVE" || ev.mode === "OBJECTIVE" ? "OBJECTIVE" : "REGULAR",
          maxMarks: Number(ev.subjectMaxMarks || ev.totalMarks || ev.maxMarks || 100),
          internalMax: Number(ev.internalMax ?? 20),
          practicalMax: Number(ev.practicalMax ?? (ev.isPractical ? 30 : 0)),
          theoryMax: Number(ev.theoryMax ?? (ev.isPractical ? 50 : 80)),
          passPercentage: Number(ev.examPassPercentage || ev.passPercentage || 35),
          rejectionReason: ev.rejectionReason || "",
          adminReviewMessage: ev.adminReviewMessage || "",
          remarks: ev.remarks || "",
          averageMarks: ev.averageMarks,
          average: ev.averageMarks !== undefined && ev.averageMarks !== null ? String(ev.averageMarks) : "—",
          highestMarks: ev.highestMarks,
          highest: ev.highestMarks !== undefined && ev.highestMarks !== null ? String(ev.highestMarks) : "—",
          lowestMarks: ev.lowestMarks,
          lowest: ev.lowestMarks !== undefined && ev.lowestMarks !== null ? String(ev.lowestMarks) : "—",
          totalStudents: ev.totalStudents ?? studentList.length,
          presentStudents: ev.presentStudents ?? 0,
          absentStudents: ev.absentStudents ?? 0,
          studentsCount: ev.totalStudents || studentList.length,
          rows: ev.rows || [],
          dirty: false,
          validationErrors: {},
          updatedAt: ev.lastSubmittedAt || ev.updatedAt || new Date().toISOString(),
        };
      });

      setWorkspaces((prev) => ({ ...prev, ...evalMap }));
    } catch (err) {
      console.warn("Notice: evaluation search:", err);
    }
  };

  // Button Click Action: "Enter Marks" (Enabled when 6 filters selected)
  const applyEntryContext = async () => {
    if (!entry.filters.section || processing) return;
    setProcessing("ENTER_MARKS");
    try {
      // 1. Fetch Students for the selected section
      const studentsRes = await apiClient
        .get(apiEndpoints.students.getBySection(entry.filters.section))
        .catch(() => apiClient.get(`/api/v1/students/section/${entry.filters.section}`));
      const rawStudents = unwrapRecords(studentsRes);
      const studentList = (rawStudents || [])
        .map((s) => ({
          studentId: s.studentId ?? s.id,
          admissionNo: s.admissionNo ?? "",
          rollNo: String(s.rollNo ?? s.rollNumber ?? ""),
          studentName: s.studentName ?? s.fullName ?? s.name ?? "Student",
          isActive: s.isActive !== false,
        }))
        .filter((s) => s.isActive)
        .sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }));

      setEntryStudents(studentList);

      // 2. Fetch Completed Examinations strictly matching academic scope
      const examsRes = await apiClient.get(apiEndpoints.examinations.getAll, {
        params: {
          boardId: entry.filters.board,
          academicYearId: entry.filters.year,
          academicLevelId: entry.filters.level,
          groupId: entry.filters.group,
          programId: entry.filters.program || undefined,
          status: "COMPLETED",
        },
      });
      const rawExams = unwrapRecords(examsRes);
      const examList = (rawExams || [])
        .map((e) => {
          const rawStatus = String(e.status ?? e.examStatus ?? e.examinationStatus ?? "").trim().toUpperCase();
          const examCode = e.examCode ?? e.code ?? "";
          const examName = e.examName ?? e.examinationName ?? e.name ?? "Examination";
          return {
            id: normalizeId(e.examinationId ?? e.id ?? e.examId),
            code: examCode,
            examCode: examCode,
            name: examName,
            examName: examName,
            status: rawStatus || (e.isCompleted ? "COMPLETED" : "DRAFT"),
            boardId: normalizeId(e.boardId ?? e.BoardId),
            academicYearId: normalizeId(e.academicYearId ?? e.AcademicYearId ?? e.yearId),
            academicLevelId: normalizeId(e.academicLevelId ?? e.AcademicLevelId),
            groupId: normalizeId(e.groupId ?? e.GroupId),
            programId: normalizeId(e.programId ?? e.ProgramId),
            schedules: e.schedules || e.examinationSchedules || [],
            isActive: e.isActive !== false,
            isCompleted: Boolean(e.isCompleted),
          };
        })
        .filter((e) => {
          if (!e.isActive) return false;
          const isCompleted =
            e.status === "COMPLETED" ||
            e.status === "FINISHED" ||
            e.status === "PUBLISHED" ||
            e.isCompleted === true;
          if (!isCompleted || e.status === "SCHEDULED" || e.status === "DRAFT") return false;

          if (entry.filters.board && e.boardId && !eq(e.boardId, entry.filters.board)) return false;
          if (entry.filters.year && e.academicYearId && !eq(e.academicYearId, entry.filters.year)) return false;
          if (entry.filters.level && e.academicLevelId && !eq(e.academicLevelId, entry.filters.level)) return false;
          if (entry.filters.group && e.groupId && !eq(e.groupId, entry.filters.group)) return false;
          if (entry.filters.program && e.programId && !eq(e.programId, entry.filters.program)) return false;

          return true;
        });

      const chosenExamId = entryExamId && examList.some((e) => eq(e.id, entryExamId))
        ? entryExamId
        : examList[0]?.id || "";
      setEntryExamId(chosenExamId);
      if (entry.setExams) entry.setExams(examList);

      // 3. Load configs and search evaluations
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
    }
  };

  // Change Examination inside Marks Entry Workspace
  const changeEntryExam = (newExamId) => {
    guard(async () => {
      setEntryExamId(newExamId);
      setEntrySubjectId("");
      setEntryPage(1);
      if (newExamId && entry.filters.section) {
        await loadExamConfigsAndEvaluations(newExamId, entry.filters.section, entry.exams, entryStudents);
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
    if (!entryApplied || !entry.filters.section || !entryExamId || !entrySubjectId) return;
    const config = entryConfigs.find((c) => eq(c.subjectId, entrySubjectId));
    if (!config) return;

    const currentWs = workspaces[workspaceKey];
    if (currentWs && currentWs.rows?.length) return; // already loaded

    let isMounted = true;
    const loadWorkspaceMarks = async () => {
      let loadedRows = [];
      let evalStatus = currentWs?.status || "NOT STARTED";
      const compositeEvalId = `${config.subjectId}_${entry.filters.section}_${entryExamId}`;
      let evalId = currentWs?.evaluationId || compositeEvalId;
      let rowVer = 0;

      // 1. Authoritative: Fetch student marks directly from /api/v1/marks/exam/{examId} (always 200 OK)
      try {
        const marksRes = await apiClient.get(`/api/v1/marks/exam/${entryExamId}`);
        const allExamMarks = unwrapRecords(marksRes);
        const subjMarks = allExamMarks.filter(
          (m) => eq(m.subjectId, config.subjectId) && eq(m.sectionId, entry.filters.section) && m.isActive !== false
        );
        if (subjMarks.length) {
          evalStatus =
            subjMarks[0].evaluationStatus ||
            currentWs?.status ||
            (subjMarks[0].status === 1 ? "SUBMITTED" : "DRAFT");
          loadedRows = subjMarks.map((m) => {
            const secStudent = entryStudents.find((s) => eq(s.studentId, m.studentId));
            return {
              markId: m.markId,
              studentId: m.studentId,
              rollNo: String(m.rollNo || secStudent?.rollNo || ""),
              studentName: m.studentName || secStudent?.studentName || "Student",
              internal: m.internalMarks ?? m.internal ?? "",
              practical: m.practicalMarks ?? m.practical ?? 0,
              theory: m.theoryMarks ?? m.theory ?? "",
              obtainedMarks: m.obtainedMarks ?? m.totalMarks ?? m.total ?? "",
              total: m.totalMarks ?? m.total ?? "",
              absent: Boolean(m.isAbsent || m.absent),
              remarks: m.remarks || "",
              autoAbsentRemark: false,
            };
          });
        }
      } catch (err) {
        console.warn("Could not query exam marks:", err);
      }

      // 2. Only if marks table has no rows and an existing evaluation is confirmed by search, query evaluation students
      if (!loadedRows.length && currentWs?.evaluationId && currentWs.status !== "NOT STARTED") {
        try {
          const evalStudentsUrl = apiEndpoints.evaluations?.students
            ? apiEndpoints.evaluations.students(evalId)
            : `/api/v1/evaluations/${evalId}/students`;
          const evalStudentsRes = await apiClient.get(evalStudentsUrl);
          const resData = evalStudentsRes?.data || {};
          evalStatus = resData.status || evalStatus;
          rowVer = resData.rowVersion || rowVer;
          const markItems = resData.students || resData.marksList || [];
          if (markItems.length) {
            loadedRows = markItems.map((m) => ({
              markId: m.markId,
              studentId: m.studentId,
              rollNo: String(m.rollNo || ""),
              studentName: m.studentName || "",
              internal: m.internalMarks ?? m.internal ?? "",
              practical: m.practicalMarks ?? m.practical ?? 0,
              theory: m.theoryMarks ?? m.theory ?? "",
              obtainedMarks: m.obtainedMarks ?? m.totalMarks ?? m.total ?? "",
              total: m.totalMarks ?? m.total ?? "",
              absent: Boolean(m.isAbsent || m.absent),
              remarks: m.remarks || "",
              autoAbsentRemark: false,
            }));
          }
        } catch {
          // Evaluation records not yet initialized; proceed to entryStudents fallback cleanly
        }
      }

      // 3. Fallback to entryStudents
      if (!loadedRows.length) {
        loadedRows = entryStudents.map((s) => ({
          studentId: s.studentId,
          rollNo: s.rollNo,
          studentName: s.studentName,
          internal: "",
          practical: config.practicalMax ? "" : 0,
          theory: "",
          obtainedMarks: "",
          total: "",
          absent: false,
          remarks: "",
          autoAbsentRemark: false,
        }));
      } else {
        const missingStudents = entryStudents.filter((s) => !loadedRows.some((r) => eq(r.studentId, s.studentId)));
        if (missingStudents.length > 0) {
          const extraRows = missingStudents.map((s) => ({
            studentId: s.studentId,
            rollNo: s.rollNo,
            studentName: s.studentName,
            internal: "",
            practical: config.practicalMax ? "" : 0,
            theory: "",
            obtainedMarks: "",
            total: "",
            absent: false,
            remarks: "",
            autoAbsentRemark: false,
          }));
          loadedRows = [...loadedRows, ...extraRows].sort((a, b) =>
            String(a.rollNo || "").localeCompare(String(b.rollNo || ""), undefined, { numeric: true })
          );
        }
      }

      if (!isMounted) return;
      setWorkspaces((all) => ({
        ...all,
        [workspaceKey]: {
          evaluationId: evalId,
          examinationId: entryExamId,
          sectionId: entry.filters.section,
          subjectId: config.subjectId,
          facultyId: config.facultyId || "1",
          faculty: { name: config.facultyName || "Assigned Faculty", employeeCode: "" },
          subject: { id: config.subjectId, name: config.subjectName, code: config.subjectCode },
          status: evalStatus,
          mode: config.mode,
          maxMarks: config.maxMarks,
          internalMax: config.internalMax,
          practicalMax: config.practicalMax,
          theoryMax: config.theoryMax,
          passPercentage: config.passPercentage,
          rejectionReason: currentWs?.rejectionReason || "",
          rows: loadedRows,
          dirty: false,
          validationErrors: {},
          rowVersion: rowVer,
          updatedAt: new Date().toISOString(),
        },
      }));
    };

    loadWorkspaceMarks();
    return () => {
      isMounted = false;
    };
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

        const bulkPayload = {
          marks: missingRows.map((row) => {
            const isAbsent = Boolean(row.absent);
            const intMarks = isAbsent ? 0 : Math.round(Number(row.internal || 0));
            const pracMarks = isAbsent ? 0 : Math.round(Number(row.practical || 0));
            const theoMarks = isAbsent
              ? 0
              : ws.mode === "OBJECTIVE"
              ? Math.round(Number(row.obtainedMarks || 0))
              : Math.round(Number(row.theory || 0));
            const totalMarks = isAbsent
              ? 0
              : ws.mode === "OBJECTIVE"
              ? Math.round(Number(row.obtainedMarks || 0))
              : Math.round(Number(row.total || 0));

            return {
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

        await apiClient.post("/api/v1/marks/bulk", bulkPayload);
      }

      return compositeId;
    } catch (err) {
      console.error("ensurePersistedMarks error:", err);
      throw err;
    }
  };

  // Update cell in Marks Entry
  const updateRow = (studentId, field, value) => {
    if (!workspace || (!editableStatuses.includes(workspace.status) && editingKey !== workspaceKey)) return;
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
                    internal: "",
                    practical: current.practicalMax ? "" : 0,
                    theory: "",
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
          const totVal = findVal(/^(marks|total|obtained|obtained\s*marks|total\s*marks)$/i);
          const absVal = findVal(/^(absent|is\s*absent|isabsent)$/i);
          const remVal = findVal(/^(remarks|remark|comments)$/i);

          const isAbsent =
            absVal === true ||
            String(absVal).toLowerCase() === "yes" ||
            String(absVal).toLowerCase() === "true" ||
            String(totVal).toLowerCase() === "abs";

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

          const internal = intVal !== undefined && intVal !== "" ? String(intVal) : studentRow.internal;
          const practical = workspace.practicalMax
            ? pracVal !== undefined && pracVal !== ""
              ? String(pracVal)
              : studentRow.practical
            : 0;
          const theory = theoVal !== undefined && theoVal !== "" ? String(theoVal) : studentRow.theory;

          let total = "";
          if (workspace.mode === "REGULAR") {
            const fields = [internal, ...(workspace.practicalMax ? [practical] : []), theory];
            total = fields.every((n) => numericMark(n)) ? fields.reduce((sum, n) => sum + Number(n), 0) : "";
          } else {
            total = totVal !== undefined && totVal !== "" ? String(totVal) : studentRow.total;
          }

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

      const payload = buildMarksPayload(workspace, evalId);

      const saveMarksUrl = apiEndpoints.evaluations?.saveMarks
        ? apiEndpoints.evaluations.saveMarks(evalId)
        : `/api/v1/faculty/evaluations/${evalId}/marks`;

      try {
        await apiClient.put(saveMarksUrl, payload);
      } catch (putErr) {
        // If faculty endpoint fails (e.g. backend LINQ ExamId bug on SaveFacultyDraftMarksAsync), persist via evaluation marks editor
        const adminPayload = buildAdminMarksPayload(workspace);
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

      notify("Subject draft saved.");
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

      const marksPayload = buildMarksPayload(workspace, evalId);

      const saveMarksUrl = apiEndpoints.evaluations?.saveMarks
        ? apiEndpoints.evaluations.saveMarks(evalId)
        : `/api/v1/faculty/evaluations/${evalId}/marks`;

      try {
        await apiClient.put(saveMarksUrl, marksPayload);
      } catch (putErr) {
        // If faculty endpoint fails (e.g. backend LINQ ExamId bug), persist via evaluation marks editor
        const adminPayload = buildAdminMarksPayload(workspace);
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

      notify("Subject marks submitted.");
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

      const adminPayload = buildAdminMarksPayload(workspace);
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
  // TAB 2 & 3: MARKS EVALUATION & STUDENT ANALYSIS
  // ==========================================
  const [evalApplied, setEvalApplied] = useState(false);
  const [evalConfigs, setEvalConfigs] = useState([]);
  const [evalStudents, setEvalStudents] = useState([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState("");
  const [backendAnalysis, setBackendAnalysis] = useState([]);

  const [evaluationPage, setEvaluationPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const evalState = useAcademicFilterState(allBoards, guard, () => setEvalApplied(false));

  // Button Click Action: "Check Evaluations" (Enabled when all 7 filters selected)
  const applyEvalContext = async () => {
    if (!evalState.filters.section || !evalState.filters.exam || processing) return;
    setProcessing("CHECK_EVALUATIONS");
    try {
      // 1. Fetch Students
      const studRes = await apiClient
        .get(apiEndpoints.students.getBySection(evalState.filters.section))
        .catch(() => apiClient.get(`/api/v1/students/section/${evalState.filters.section}`));
      const rawStudents = unwrapRecords(studRes);
      const studentList = (rawStudents || [])
        .map((s) => ({
          studentId: s.studentId ?? s.id,
          admissionNo: s.admissionNo ?? "",
          rollNo: String(s.rollNo ?? s.rollNumber ?? ""),
          studentName: s.studentName ?? s.fullName ?? s.name ?? "Student",
          isActive: s.isActive !== false,
        }))
        .filter((s) => s.isActive)
        .sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }));

      setEvalStudents(studentList);

      // 2. Fetch Exam details & schedules/configs
      const selectedExam = evalState.exams.find((e) => eq(e.id, evalState.filters.exam));
      let schedules = selectedExam?.schedules || [];
      if (!schedules.length) {
        try {
          const detailRes = await apiClient.get(`/api/v1/examinations/${evalState.filters.exam}`).catch(() => null);
          const detail = detailRes?.data || detailRes;
          if (detail?.schedules?.length) {
            schedules = detail.schedules;
          }
        } catch (e) {
          console.warn("Could not fetch schedules for evaluation:", e);
        }
      }

      const configs = schedules.map((s) => ({
        id: `cfg-${evalState.filters.exam}-${s.subjectId}`,
        examinationId: evalState.filters.exam,
        sectionId: evalState.filters.section,
        subjectId: normalizeId(s.subjectId),
        subjectName: s.subjectName || `Subject ${s.subjectId}`,
        subjectCode: s.subjectCode || "",
        mode: s.scheduleMode === "COMBINED" ? "OBJECTIVE" : "REGULAR",
        maxMarks: Number(s.maxMarks || 100),
        passPercentage: Number(s.passingMarks ? (s.passingMarks / s.maxMarks) * 100 : 35),
        internalMax: Number(s.internalMax ?? 20),
        practicalMax: Number(s.practicalMax ?? (s.isPractical ? 30 : 0)),
        theoryMax: Number(s.theoryMax ?? (Number(s.maxMarks || 100) - 20)),
        facultyName: s.invigilatorName || s.invigilator || s.facultyName || "",
        facultyId: s.invigilatorId || s.facultyId || "",
      }));

      setEvalConfigs(configs);

      // 3. Search evaluations
      const evalSearchUrl = apiEndpoints.evaluations?.search || "/api/v1/evaluations/search";
      const evalSearchRes = await apiClient
        .post(evalSearchUrl, {
          boardId: Number(evalState.filters.board),
          academicYearId: Number(evalState.filters.year),
          academicLevelId: Number(evalState.filters.level),
          groupId: Number(evalState.filters.group),
          sectionId: Number(evalState.filters.section),
          examinationId: Number(evalState.filters.exam),
        })
        .catch(() => apiClient.get("/api/v1/faculty/evaluations"));

      const existingEvals = unwrapRecords(evalSearchRes);
      const evalMap = {};
      existingEvals.forEach((ev) => {
        const parts = String(ev.evaluationId || "").split("_");
        const evSubId = normalizeId(ev.subjectId ?? (parts.length >= 3 ? parts[0] : ""));
        const evSecId = normalizeId(ev.sectionId ?? (parts.length >= 3 ? parts[1] : evalState.filters.section));
        const evExamId = normalizeId(ev.examinationId ?? ev.examId ?? (parts.length >= 3 ? parts[2] : evalState.filters.exam));
        const key = evaluationKey({ examinationId: evExamId, sectionId: evSecId, subjectId: evSubId });

        evalMap[key] = {
          evaluationId:
            ev.evaluationId || `${evSubId}_${evSecId}_${evExamId}`,
          examinationId: evExamId,
          sectionId: evSecId,
          subjectId: evSubId,
          facultyId: ev.facultyId,
          faculty: { name: ev.facultyName || "Assigned Faculty", employeeCode: ev.facultyCode || "" },
          subject: { id: evSubId, name: ev.subjectName || `Subject ${evSubId}`, code: ev.subjectCode || "" },
          status: String(ev.status || "DRAFT").trim().toUpperCase(),
          mode: ev.examPattern === "OBJECTIVE" || ev.mode === "OBJECTIVE" ? "OBJECTIVE" : "REGULAR",
          maxMarks: Number(ev.subjectMaxMarks || ev.totalMarks || ev.maxMarks || 100),
          internalMax: Number(ev.internalMax ?? 20),
          practicalMax: Number(ev.practicalMax ?? (ev.isPractical ? 30 : 0)),
          theoryMax: Number(ev.theoryMax ?? (ev.isPractical ? 50 : 80)),
          passPercentage: Number(ev.examPassPercentage || ev.passPercentage || 35),
          rejectionReason: ev.rejectionReason || "",
          adminReviewMessage: ev.adminReviewMessage || "",
          remarks: ev.remarks || "",
          averageMarks: ev.averageMarks,
          average: ev.averageMarks !== undefined && ev.averageMarks !== null ? String(ev.averageMarks) : "—",
          highestMarks: ev.highestMarks,
          highest: ev.highestMarks !== undefined && ev.highestMarks !== null ? String(ev.highestMarks) : "—",
          lowestMarks: ev.lowestMarks,
          lowest: ev.lowestMarks !== undefined && ev.lowestMarks !== null ? String(ev.lowestMarks) : "—",
          totalStudents: ev.totalStudents ?? studentList.length,
          presentStudents: ev.presentStudents ?? 0,
          absentStudents: ev.absentStudents ?? 0,
          studentsCount: ev.totalStudents || studentList.length,
          rows: ev.rows || [],
          dirty: false,
          validationErrors: {},
          updatedAt: ev.lastSubmittedAt || ev.updatedAt || new Date().toISOString(),
        };
      });

      // Synchronize evalConfigs with any returned evaluations not present in schedules
      const updatedConfigs = [...configs];
      existingEvals.forEach((ev) => {
        const parts = String(ev.evaluationId || "").split("_");
        const evSubId = normalizeId(ev.subjectId ?? (parts.length >= 3 ? parts[0] : ""));
        if (evSubId && !updatedConfigs.some((c) => eq(c.subjectId, evSubId))) {
          updatedConfigs.push({
            id: `cfg-${evalState.filters.exam}-${evSubId}`,
            examinationId: evalState.filters.exam,
            sectionId: evalState.filters.section,
            subjectId: evSubId,
            subjectName: ev.subjectName || `Subject ${evSubId}`,
            subjectCode: ev.subjectCode || "",
            mode: ev.examPattern === "OBJECTIVE" || ev.mode === "OBJECTIVE" ? "OBJECTIVE" : "REGULAR",
            maxMarks: Number(ev.subjectMaxMarks || ev.totalMarks || ev.maxMarks || 100),
            passPercentage: Number(ev.examPassPercentage || ev.passPercentage || 35),
            internalMax: Number(ev.internalMax ?? 20),
            practicalMax: Number(ev.practicalMax ?? (ev.isPractical ? 30 : 0)),
            theoryMax: Number(ev.theoryMax ?? (ev.isPractical ? 50 : 80)),
            facultyName: ev.facultyName || "",
            facultyId: ev.facultyId || "",
          });
        }
      });
      setEvalConfigs(updatedConfigs);
      setWorkspaces((prev) => ({ ...prev, ...evalMap }));

      // 4. Fetch Student Analysis if available
      try {
        const analysisUrl = apiEndpoints.studentAnalysis?.getAll || "/api/v1/student-analysis";
        const analysisRes = await apiClient.get(analysisUrl, {
          params: {
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
      const key = evaluationKey({
        examinationId: evalState.filters.exam,
        sectionId: evalState.filters.section,
        subjectId: config.subjectId,
      });
      const ws = workspaces[key];
      if (ws && ["SUBMITTED", "VERIFIED", "APPROVED", "REJECTED"].includes(String(ws.status || "").toUpperCase())) {
        items.push({ ...ws, ...calculateEvaluationStatistics(ws) });
        seenSubjects.add(normalizeId(config.subjectId));
      }
    });

    // Also collect any evaluations in workspaces for this exam & section not in evalConfigs
    Object.values(workspaces || {}).forEach((ws) => {
      if (
        ws &&
        eq(ws.examinationId, evalState.filters.exam) &&
        eq(ws.sectionId, evalState.filters.section) &&
        !seenSubjects.has(normalizeId(ws.subjectId)) &&
        ["SUBMITTED", "VERIFIED", "APPROVED", "REJECTED"].includes(String(ws.status || "").toUpperCase())
      ) {
        items.push({ ...ws, ...calculateEvaluationStatistics(ws) });
        seenSubjects.add(normalizeId(ws.subjectId));
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
      notify(`Evaluation ${nextStatus.toLowerCase()}.`);
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
    const targetEvaluations = evalFilteredEvaluations.filter((item) => item.status === from);
    const keys = targetEvaluations.map(evaluationKey);
    setProcessing(to === "VERIFIED" ? "VERIFY_ALL" : "APPROVE_ALL");

    try {
      if (to === "VERIFIED") {
        const verifyAllUrl = apiEndpoints.evaluations?.verifyAll || "/api/v1/evaluations/verify-all";
        await apiClient.post(verifyAllUrl, {
          boardId: Number(evalState.filters.board),
          academicYearId: Number(evalState.filters.year),
          academicLevelId: Number(evalState.filters.level),
          groupId: Number(evalState.filters.group),
          sectionId: Number(evalState.filters.section),
          examinationId: Number(evalState.filters.exam),
        });
      } else if (to === "APPROVED") {
        const approveAllUrl = apiEndpoints.evaluations?.approveAll || "/api/v1/evaluations/approve-all";
        await apiClient.post(approveAllUrl, {
          boardId: Number(evalState.filters.board),
          academicYearId: Number(evalState.filters.year),
          academicLevelId: Number(evalState.filters.level),
          groupId: Number(evalState.filters.group),
          sectionId: Number(evalState.filters.section),
          examinationId: Number(evalState.filters.exam),
        });
      }

      setWorkspaces((all) => {
        const next = { ...all };
        keys.forEach((key) => {
          if (next[key]) next[key] = { ...next[key], status: to };
        });
        return next;
      });
      setModal(null);
      notify(`${keys.length} evaluation(s) ${to.toLowerCase()}.`);
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    } finally {
      setProcessing("");
    }
  };

  // Fallback Student Analysis from in-memory workspaces & students
  const fallbackAnalysis = useMemo(() => {
    if (!evalApplied || !evalState.filters.section || !evalState.filters.exam) return [];
    return evalStudents.map((student) => {
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
    });
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

  // Subject options in Marks Entry Workspace with Faculty Name & Faculty ID
  const entrySubjectOptions = entryConfigs.map((config) => {
    const ws =
      workspaces[
        evaluationKey({
          examinationId: entryExamId,
          sectionId: entry.filters.section,
          subjectId: config.subjectId,
        })
      ];
    const status = ws?.status || "NOT STARTED";
    const facultyInfo = config.facultyName
      ? ` — Faculty: ${config.facultyName}${config.facultyId ? ` (ID: ${config.facultyId})` : ""}`
      : "";
    return {
      id: config.subjectId,
      name: `${config.subjectName} (${config.subjectCode})${facultyInfo} — ${status}`,
    };
  });

  const meta = {
    entry: ["Marks Entry", "Enter and submit subject-wise examination marks"],
    evaluation: ["Marks Evaluation", "Verify, reject, and approve submitted marks"],
    students: ["Student Analysis", "View approved student results and subject details"],
  }[tab];

  return (
    <DashboardLayout title={meta[0]} subtitle={meta[1]}>
      <div className="cms-marks-entry">
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
        {/* MAIN NAVIGATION TABS (Ref Screenshots 1, 2, 5)           */}
        {/* ======================================================== */}
        <div className="cms-tabs-row">
          <div className="cms-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "entry"}
              className={tab === "entry" ? "active" : ""}
              onClick={() => guard(() => setTab("entry"))}
            >
              Marks Entry
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "evaluation"}
              className={tab === "evaluation" ? "active" : ""}
              onClick={() => guard(() => setTab("evaluation"))}
            >
              Marks Evaluation
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "students"}
              className={tab === "students" ? "active" : ""}
              onClick={() => guard(() => setTab("students"))}
            >
              Student Analysis
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
              boards={allBoards}
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
                  setEntryPage={setEntryPage}
                  updateRow={updateRow}
                  processing={processing}
                  onBulkImport={() => fileInputRef.current?.click()}
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
        {/* TAB 2 & 3: MARKS EVALUATION & STUDENT ANALYSIS WORKFLOWS */}
        {/* ======================================================== */}
        {(tab === "evaluation" || tab === "students") && (
          <>
            {/* Filter Card (7 Dropdowns + Check Evaluations Action Button) */}
            <FilterCard
              mode="evaluation"
              filters={evalState.filters}
              boards={allBoards}
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

                {/* Sub-Tab 1: Faculty Evaluations (Ref Screenshots 1 & 3) */}
                {tab === "evaluation" &&
                  (selectedEvaluation ? (
                    <EvaluationDetails
                      item={selectedEvaluation}
                      page={detailPage}
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
                      setPage={setEvaluationPage}
                      onView={async (item) => {
                        let targetItem = item;
                        if (!item.rows?.length) {
                          const evalId =
                            item.evaluationId ||
                            `${item.subjectId}_${item.sectionId || evalState.filters.section}_${
                              item.examinationId || evalState.filters.exam
                            }`;
                          try {
                            const evalStudentsUrl = apiEndpoints.evaluations?.students
                              ? apiEndpoints.evaluations.students(evalId)
                              : `/api/v1/evaluations/${evalId}/students`;
                            let markItems = [];
                            try {
                              const res = await apiClient.get(evalStudentsUrl);
                              markItems = res.data?.students || res.data?.marksList || [];
                            } catch {
                              // If evaluation endpoint records not ready, load from marks table
                              const marksRes = await apiClient.get(
                                `/api/v1/marks/exam/${item.examinationId || evalState.filters.exam}`
                              );
                              const allExamMarks = unwrapRecords(marksRes);
                              markItems = allExamMarks.filter(
                                (m) =>
                                  eq(m.subjectId, item.subjectId) &&
                                  eq(m.sectionId, item.sectionId || evalState.filters.section) &&
                                  m.isActive !== false
                              );
                            }

                            if (markItems.length) {
                              const rows = markItems.map((m) => ({
                                markId: m.markId,
                                studentId: m.studentId,
                                rollNo: String(m.rollNo || ""),
                                studentName: m.studentName || "",
                                internal: m.internalMarks ?? m.internal ?? "",
                                practical: m.practicalMarks ?? m.practical ?? 0,
                                theory: m.theoryMarks ?? m.theory ?? "",
                                obtainedMarks: m.obtainedMarks ?? m.totalMarks ?? m.total ?? "",
                                total: m.totalMarks ?? m.total ?? "",
                                absent: Boolean(m.isAbsent || m.absent),
                                remarks: m.remarks || "",
                              }));
                              targetItem = { ...item, rows };
                              const key = evaluationKey(item);
                              setWorkspaces((all) => ({ ...all, [key]: { ...all[key], rows } }));
                            }
                          } catch (err) {
                            console.warn("Notice: could not fetch evaluation student details:", err);
                          }
                        }
                        setSelectedEvaluation(targetItem);
                        setDetailPage(1);
                      }}
                      readiness={evalReadiness}
                      onBulk={setModal}
                      processing={processing}
                    />
                  ))}

                {/* Sub-Tab 2: Student Analysis (Ref Screenshots 2 & 4) */}
                {tab === "students" &&
                  (selectedStudent ? (
                    <StudentDetails
                      student={selectedStudent}
                      page={detailPage}
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
                      setPage={setStudentPage}
                      onView={handleViewStudentDetails}
                    />
                  ) : (
                    <Empty text="Student analysis will be available after all required subject evaluations are approved (or once generated in the backend)." />
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
          />
        )}

        {modal === "VERIFY_ALL" && (
          <Confirm
            title="Verify Submitted"
            text="Verify all submitted evaluations for this section?"
            onCancel={() => setModal(null)}
            onConfirm={() => bulkTransition("SUBMITTED", "VERIFIED")}
          />
        )}

        {modal === "APPROVE_ALL" && (
          <Confirm
            title="Approve Verified"
            text="Approve all verified evaluations for this section?"
            onCancel={() => setModal(null)}
            onConfirm={() => bulkTransition("VERIFIED", "APPROVED")}
          />
        )}
      </div>
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
    { key: "level", label: "Academic Level", options: levels, disabled: !filters.board },
    { key: "group", label: "Group", options: groups, disabled: !filters.board },
    { key: "program", label: "Program", options: programs, disabled: !filters.group },
    { key: "section", label: "Section", options: sections, disabled: !filters.program },
    ...(mode === "evaluation"
      ? [
          {
            key: "exam",
            label: "Completed Examination",
            options: (exams || []).map((exam) => {
              const code = exam.code || exam.examCode || "";
              const baseName = exam.name || exam.examName || "Examination";
              const displayName = code && !baseName.includes(code) ? `${baseName} (${code})` : baseName;
              return { ...exam, name: displayName };
            }),
            disabled: !filters.program,
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

  const groupTitle = group?.name || group?.groupName || "Academic Group";
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
        <strong className="cms-context-title">{groupTitle}</strong>
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
  setEntryPage,
  updateRow,
  processing,
  onBulkImport,
  onEdit,
  onCancelEdit,
  onSaveChanges,
  onSave,
  onSubmit,
}) {
  const rows = workspace?.rows?.slice((entryPage - 1) * PAGE_SIZE, entryPage * PAGE_SIZE) || [];
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
            options={exams.map((exam) => {
              const code = exam.code || exam.examCode || "";
              const baseName = exam.name || exam.examName || "Examination";
              const displayName = code && !baseName.includes(code) ? `${baseName} (${code})` : baseName;
              return { ...exam, name: displayName };
            })}
            onChange={changeExam}
          />
          <SearchableSelect
            id="marks-subject"
            label="SUBJECT"
            value={subjectId}
            options={subjectOptions}
            disabled={!subjectOptions?.length}
            onChange={changeSubject}
            emptyText="No subjects configured for selected examination."
          />
        </div>
        <div className="cms-bulk-actions">
          <button
            type="button"
            className="cms-btn cms-btn-secondary cms-btn-bulk-import"
            disabled={Boolean(processing) || !subjectId || locked}
            onClick={onBulkImport}
            title="Import student marks from an Excel (.xlsx, .xls) file"
          >
            Bulk Import
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-secondary"
            disabled={Boolean(processing) || !subjectId || blocked || !editableStatuses.includes(workspace?.status)}
            onClick={onSave}
          >
            {processing === "SAVE_DRAFT" ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={Boolean(processing) || !subjectId || blocked || !editableStatuses.includes(workspace?.status)}
            onClick={onSubmit}
          >
            {processing === "SUBMIT" ? "Submitting..." : "Submit Subject"}
          </button>
        </div>
      </div>

      {!workspace ? (
        <Empty
          text={
            subjectOptions.length
              ? "Select a Subject to load its marks workspace."
              : "No subjects are configured for the selected examination."
          }
        />
      ) : (
        <>
          {validateMarksConfiguration(workspace) && (
            <div className="cms-config-error">{validateMarksConfiguration(workspace)}</div>
          )}
          {!workspace.rows.length && (
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
            {workspace.status === "SUBMITTED" && !editing && !blocked && (
              <div className="cms-entry-edit-action">
                <button
                  type="button"
                  className="cms-btn cms-btn-secondary"
                  disabled={Boolean(processing)}
                  onClick={onEdit}
                >
                  Edit Submitted Marks
                </button>
              </div>
            )}
          </div>

          <Table
            heads={[
              "ROLL NO",
              "STUDENT",
              ...(workspace.mode === "REGULAR"
                ? ["INTERNAL", ...(workspace.practicalMax ? ["PRACTICAL"] : []), "THEORY", "TOTAL"]
                : ["OBTAINED", "MAXIMUM"]),
              "PERCENTAGE",
              "ABSENT",
              "REMARKS",
            ]}
          >
            {rows.map((row) => (
              <MarkRow
                key={row.studentId}
                row={row}
                workspace={workspace}
                locked={locked || blocked}
                update={(field, value) => updateRow(row.studentId, field, value)}
              />
            ))}
          </Table>

          <Pagination
            page={entryPage}
            total={Math.ceil(workspace.rows.length / PAGE_SIZE)}
            setPage={setEntryPage}
            summaryText={lockedText}
          />

          {editing && (
            <div className="cms-marks-actions">
              <button
                type="button"
                className="cms-btn cms-btn-secondary"
                disabled={Boolean(processing)}
                onClick={onCancelEdit}
              >
                Cancel Edit
              </button>
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
      <td>{row.rollNo}</td>
      <td>
        {row.studentName}
        {workspace.validationErrors[row.studentId]?.map((error) => (
          <small className="cms-row-error" key={error}>
            {error}
          </small>
        ))}
      </td>
      {workspace.mode === "REGULAR" ? (
        <>
          <Num value={row.internal} disabled={locked || row.absent} onChange={(value) => update("internal", value)} />
          {workspace.practicalMax > 0 && (
            <Num
              value={row.practical}
              disabled={locked || row.absent}
              onChange={(value) => update("practical", value)}
            />
          )}
          <Num value={row.theory} disabled={locked || row.absent} onChange={(value) => update("theory", value)} />
          <td>{row.absent ? "ABS" : row.total === "" ? "—" : row.total}</td>
        </>
      ) : (
        <>
          <Num
            value={row.obtainedMarks}
            disabled={locked || row.absent}
            onChange={(value) => update("obtainedMarks", value)}
          />
          <td>{workspace.maxMarks}</td>
        </>
      )}
      <td>{row.absent ? "ABS" : row.total === "" ? "—" : `${result.percentage.toFixed(2)}%`}</td>
      <td>
        <input
          type="checkbox"
          className="cms-checkbox"
          checked={row.absent}
          disabled={locked}
          onChange={(event) => update("absent", event.target.checked)}
        />
      </td>
      <td>
        <input
          className="cms-remarks-input"
          value={row.remarks}
          maxLength={250}
          disabled={locked}
          onChange={(event) => update("remarks", event.target.value)}
        />
      </td>
    </tr>
  );
}

// Sub-Tab 1: Faculty Evaluations (Ref Screenshot 1)
function EvaluationList({ rows, search, setSearch, page, setPage, onView, readiness, onBulk, processing }) {
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalCount = rows.length;
  const startRange = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRange = Math.min(page * PAGE_SIZE, totalCount);
  const distinctSubjectCount = new Set(rows.map((item) => item.subjectId || item.subject?.id)).size;

  const evalText = totalCount === 1 ? "evaluation" : "evaluations";
  const subjText = distinctSubjectCount === 1 ? "subject" : "subjects";
  const summaryText = `Showing ${startRange}–${endRange} of ${totalCount} ${evalText} submitted from ${distinctSubjectCount} ${subjText}`;

  return (
    <section className="cms-card cms-main-card">
      <div className="cms-table-toolbar">
        <SearchBox value={search} onChange={setSearch} />
        <div className="cms-bulk-actions">
          <button
            type="button"
            className="cms-btn cms-btn-info"
            disabled={Boolean(processing) || !readiness.submittedCount}
            onClick={() => onBulk("VERIFY_ALL")}
          >
            {processing === "VERIFY_ALL" ? "Verifying..." : `Verify ${readiness.submittedCount} Submitted`}
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-success"
            disabled={Boolean(processing) || !readiness.verifiedCount}
            onClick={() => onBulk("APPROVE_ALL")}
          >
            {processing === "APPROVE_ALL" ? "Approving..." : `Approve ${readiness.verifiedCount} Verified`}
          </button>
        </div>
      </div>
      <Table heads={["SUBJECT", "FACULTY", "STUDENTS", "AVERAGE / MAXIMUM", "HIGHEST", "LOWEST", "STATUS", "ACTIONS"]}>
        {shown.length ? (
          shown.map((item) => (
            <tr key={evaluationKey(item)}>
              <td>
                {item.subject?.name}
                <small className="cms-row-subtitle">{item.subject?.code}</small>
              </td>
              <td>
                {item.faculty?.name || "—"}
                {item.facultyId ? (
                  <span className="cms-faculty-id"> (ID: {item.facultyId})</span>
                ) : null}
              </td>
              <td>{item.studentsCount}</td>
              <td>
                {item.average} / {item.maxMarks}
              </td>
              <td>{item.highest}</td>
              <td>{item.lowest}</td>
              <td>
                <Badge status={item.status} />
              </td>
              <td>
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
          <EmptyRow span={8} text="No submitted evaluations are available for this context." />
        )}
      </Table>
      <Pagination
        page={page}
        total={Math.ceil(rows.length / PAGE_SIZE)}
        setPage={setPage}
        summaryText={summaryText}
      />
    </section>
  );
}

// Subject Marks Breakdown (Ref Screenshot 3)
function EvaluationDetails({ item, page, setPage, onBack, onAction, processing }) {
  const rows = item.rows?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || [];
  return (
    <section className="cms-card cms-main-card">
      <Back onClick={onBack} title={`${item.subject?.name || "Subject"} Marks Breakdown`} />
      <Table
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
            <td>{row.rollNo}</td>
            <td>{row.studentName}</td>
            {item.mode === "REGULAR" && (
              <>
                <td>{row.absent ? "—" : row.internal}</td>
                {item.practicalMax > 0 && <td>{row.absent ? "—" : row.practical}</td>}
                <td>{row.absent ? "—" : row.theory}</td>
              </>
            )}
            <td>{row.absent ? "ABS" : row.total}</td>
            <td>{row.remarks || "—"}</td>
            <td>{row.absent ? "Yes" : "No"}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={Math.ceil((item.rows?.length || 0) / PAGE_SIZE)} setPage={setPage} />
      <div className="cms-modal-actions">
        {item.status === "SUBMITTED" && (
          <>
            <button
              type="button"
              className="cms-btn cms-btn-info"
              disabled={Boolean(processing)}
              onClick={() => onAction("VERIFY")}
            >
              Verify Evaluation
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              disabled={Boolean(processing)}
              onClick={() => onAction("REJECT")}
            >
              Reject Evaluation
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
              Approve Evaluation
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-danger"
              disabled={Boolean(processing)}
              onClick={() => onAction("REJECT")}
            >
              Reject Evaluation
            </button>
          </>
        )}
        <Badge status={item.status} />
      </div>
    </section>
  );
}

// Sub-Tab 2: Student Analysis Table (Ref Screenshot 2)
function StudentList({ rows, subjects = [], search, setSearch, page, setPage, onView }) {
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <section className="cms-card cms-main-card">
      <div className="cms-table-toolbar">
        <SearchBox value={search} onChange={setSearch} />
      </div>
      <Table
        heads={[
          "ROLL NO",
          "STUDENT",
          ...subjects.map((sub) => (sub.subjectName || sub.name || "SUBJECT").toUpperCase()),
          "TOTAL OBTAINED / MAXIMUM",
          "PERCENTAGE",
          "GRADE",
          "RESULT",
          "ACTIONS",
        ]}
      >
        {shown.length ? (
          shown.map((student) => (
            <tr key={student.studentId}>
              <td>{student.rollNo}</td>
              <td>{student.studentName}</td>
              {subjects.map((sub) => {
                const subId = sub.subjectId || sub.id;
                const res = student.subjectResults?.find((item) => eq(item.subjectId, subId));
                return (
                  <td key={subId}>
                    {!res ? "—" : res.isAbsent ? "ABS" : `${res.obtained} / ${res.maxMarks}`}
                  </td>
                );
              })}
              <td>
                {student.totalObtained} / {student.totalMaximum}
              </td>
              <td>{Number(student.percentage || 0).toFixed(2)}%</td>
              <td>{student.grade}</td>
              <td>
                <Result status={student.result} />
              </td>
              <td>
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
      <Pagination page={page} total={Math.ceil(rows.length / PAGE_SIZE)} setPage={setPage} />
    </section>
  );
}

// Detailed Student Performance Report (Ref Screenshot 4)
function StudentDetails({ student, page, setPage, onBack }) {
  const rows = (student.subjectResults || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
      <Table heads={["SUBJECT", "CODE", "MODE", "OBTAINED / MAXIMUM", "PASS %", "PERCENTAGE", "GRADE", "RESULT"]}>
        {rows.map((item) => (
          <tr key={item.subjectId}>
            <td>{item.subjectName}</td>
            <td>{item.subjectCode}</td>
            <td>{item.mode}</td>
            <td>{item.isAbsent ? "ABS" : `${item.obtained} / ${item.maxMarks}`}</td>
            <td>{item.passPercentage}%</td>
            <td>{item.isAbsent ? "ABS" : `${Number(item.percentage || 0).toFixed(2)}%`}</td>
            <td>{item.grade}</td>
            <td>
              <Result status={item.result} />
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={Math.ceil((student.subjectResults?.length || 0) / PAGE_SIZE)} setPage={setPage} />
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const listId = `${id}-listbox`;

  const filtered = options.filter((item) => (item.name || "").toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.find((item) => eq(item.id, value));

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
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (!open) return setOpen(true);
      if (filtered.length) {
        setHighlight((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length);
      }
    } else if (event.key === "Enter" && open && filtered[highlight]) {
      event.preventDefault();
      onChange(filtered[highlight].id);
      setOpen(false);
      setQuery("");
    }
  };

  const displayName = selected?.name || `Select ${label}`;

  return (
    <div className={`cms-field-group ${compact ? "cms-entry-select-compact" : ""}`}>
      {!hideLabel && (
        <label className="cms-field-label" id={`${id}-label`}>
          {label}
        </label>
      )}
      <div className={`cms-custom-select ${open ? "is-open" : ""}`} ref={ref}>
        <button
          type="button"
          className="cms-custom-select-trigger"
          role="combobox"
          aria-label={label}
          aria-labelledby={!hideLabel ? `${id}-label` : undefined}
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          title={displayName}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={keyDown}
        >
          <span className="cms-select-trigger-text">{displayName}</span>
          <span className="cms-select-arrow">⌄</span>
        </button>
        {open && (
          <div className="cms-custom-select-menu">
            <input
              autoFocus
              className="cms-custom-select-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              onKeyDown={keyDown}
              placeholder="Search..."
            />
            <div className="cms-custom-select-options" id={listId} role="listbox">
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className="cms-custom-select-option"
                title={`Select ${label}`}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
              >
                Select {label}
              </button>
              {filtered.length ? (
                filtered.map((item, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={eq(item.id, value)}
                    title={item.name}
                    className={`cms-custom-select-option ${eq(item.id, value) ? "selected" : ""} ${
                      highlight === index ? "highlighted" : ""
                    }`}
                    key={item.id}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {item.name}
                  </button>
                ))
              ) : (
                <div className="cms-custom-select-empty">{emptyText}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Num = ({ value, disabled, onChange }) => (
  <td>
    <input
      type="text"
      inputMode="decimal"
      className="cms-number-input"
      value={value}
      disabled={disabled}
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

const Table = ({ heads, children }) => (
  <div className="cms-table-container">
    <table className="cms-table">
      <thead>
        <tr>
          {heads.map((head, index) => (
            <th key={`${head}-${index}`}>{head}</th>
          ))}
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

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

function Pagination({ page, total, setPage, summaryText }) {
  useEffect(() => {
    if (total) setPage((current) => Math.min(current, total));
  }, [total, setPage]);

  if (!total && !summaryText) return null;

  return (
    <div className="cms-pagination">
      <div className="cms-pagination-summary-left">
        {summaryText ? <span className="cms-eval-summary-text">{summaryText}</span> : null}
      </div>
      {total > 0 && (
        <div className="cms-pagination-controls">
          <button
            type="button"
            className="cms-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span className="cms-page-info">
            {page} / {total}
          </span>
          <button
            type="button"
            className="cms-page-btn"
            disabled={page >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const Confirm = ({ title, text, onCancel, onConfirm }) => (
  <div className="cms-overlay">
    <div className="cms-modal">
      <div className="cms-modal-head">
        <h3>{title}</h3>
      </div>
      <div className="cms-modal-body">{text}</div>
      <div className="cms-modal-foot">
        <button type="button" className="cms-btn cms-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="cms-btn cms-btn-primary" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </div>
  </div>
);

const Message = ({ action, value, setValue, onCancel, onConfirm }) => (
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
        />
      </div>
      <div className="cms-modal-foot">
        <button type="button" className="cms-btn cms-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          disabled={action === "REJECT" && !value.trim()}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);
