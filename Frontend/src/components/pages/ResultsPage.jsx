import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import * as XLSX from "xlsx";
import {
  Eye,
  Send,
  Globe,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  Search,
  Award,
  TrendingUp,
  UserX,
  UserCheck,
  BarChart2,
  ArrowLeft,
  UploadCloud,
  Check,
  X,
  FileText
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./ResultProcessingPage.css";

const PAGE_SIZE = 6;
const ANALYTICS_MODAL_PAGE_SIZE = 5;

/* ============================================================
   PAYLOAD UNWRAPPING & FILE UTILITIES
   ============================================================ */

const unwrap = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return data || [];
};

const unwrapPayload = (res) => {
  const data = res?.data;
  return data?.data !== undefined ? data.data : (data !== undefined ? data : null);
};

const downloadBlob = (blobData, filename) => {
  const blob = blobData instanceof Blob ? blobData : new Blob([blobData]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Helper Toast Component
function Toast({ message, type = "success", onClose }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div
      style={{
        position: "fixed",
        top: "60px",
        right: "20px",
        background: isError ? "#b91c1c" : "#1A2114",
        color: "#ffffff",
        padding: "12px 22px",
        borderRadius: "10px",
        fontSize: "0.88rem",
        fontWeight: 600,
        zIndex: 99999,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        border: "1px solid rgba(255,255,255,0.15)"
      }}
    >
      {isError ? <XCircle size={18} /> : <CheckCircle size={18} />}
      <span>{message}</span>
    </div>
  );
}

export default function ResultProcessingPage() {
  const {
    selectedBoard,
    selectedBoardId,
    selectedAcademicYear,
    selectedAcademicYearId,
  } = useAcademicContext();

  const emptyFilters = { board: "", year: "", level: "", group: "", program: "", exam: "" };
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [viewMode, setViewMode] = useState("table");

  // Cascading Master Data State
  const [boards, setBoards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicLevels, setAcademicLevels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [examinations, setExaminations] = useState([]);

  // Readiness State
  const [readiness, setReadiness] = useState(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);

  // Results State
  const [resultsGenerated, setResultsGenerated] = useState(false);
  const [sectionSummaries, setSectionSummaries] = useState([]);
  const [publishedGroups, setPublishedGroups] = useState([]);
  const [loadingPublished, setLoadingPublished] = useState(false);

  // Drilldown states for Published Results Tab
  const [selectedPublishedGroup, setSelectedPublishedGroup] = useState(null);
  const [selectedPublishedSection, setSelectedPublishedSection] = useState(null);

  // Drilldown states for Generated Results Tab
  const [selectedSectionDetails, setSelectedSectionDetails] = useState(null);
  const [selectedStudentMemo, setSelectedStudentMemo] = useState(null);

  // Search & Pagination
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Published tab filters
  const [publishedSearch, setPublishedSearch] = useState("");
  const [publishedStatusFilter, setPublishedStatusFilter] = useState("all");
  const [publishedGroupFilter, setPublishedGroupFilter] = useState("all");
  const [publishedExamFilter, setPublishedExamFilter] = useState("all");

  // Rank List state
  const [rankSearch, setRankSearch] = useState("");
  const [rankFilter, setRankFilter] = useState("all");
  const [rankPage, setRankPage] = useState(1);
  const [showRankPreview, setShowRankPreview] = useState(false);
  const [apiRankRecords, setApiRankRecords] = useState([]);

  // Analytics Modals & Detail
  const [analyticsModal, setAnalyticsModal] = useState(null);
  const [confirmPublish, setConfirmPublish] = useState(null);
  const [toast, setToast] = useState("");
  const [generatingResults, setGeneratingResults] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [apiAnalytics, setApiAnalytics] = useState(null);
  const [apiFailedStudents, setApiFailedStudents] = useState([]);

  const toastRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type });
    toastRef.current = setTimeout(() => setToast(""), 3500);
  }, []);

  useEffect(() => () => toastRef.current && clearTimeout(toastRef.current), []);

  const matchesBoard = useCallback((item, targetId, targetBoard) => {
    if (!item) return false;
    const itemId = String(item.boardId || item.id || "");
    const itemCode = String(item.boardCode || item.code || "").trim().toLowerCase();
    const itemName = String(item.boardName || item.name || "").trim().toLowerCase();
    if (targetId && itemId === String(targetId)) return true;
    if (targetBoard) {
      const tgtId = String(targetBoard.id || targetBoard.boardId || "");
      const tgtCode = String(targetBoard.code || targetBoard.boardCode || "").trim().toLowerCase();
      const tgtName = String(targetBoard.name || targetBoard.boardName || "").trim().toLowerCase();
      if (tgtId && itemId === tgtId) return true;
      if (tgtCode && itemCode && tgtCode === itemCode) return true;
      if (tgtName && itemName && tgtName === itemName) return true;
    }
    return false;
  }, []);

  const matchesYear = useCallback((item, targetId, targetYear) => {
    if (!item) return false;
    const itemId = String(item.academicYearId || item.id || "");
    const itemName = String(item.academicYearName || item.name || item.code || item.label || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");

    const tgtName = String(targetYear?.academicYearName || targetYear?.name || targetYear?.code || targetYear?.label || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
    const tgtId = String(targetId || targetYear?.academicYearId || targetYear?.id || "");

    // Prioritize name match because academicYearId can differ across boards for the same academic year
    if (tgtName && itemName) {
      if (tgtName === itemName) return true;
      return false;
    }

    // Fallback to ID match if name is not available
    if (tgtId && itemId === tgtId) return true;

    return false;
  }, []);

  const isYearForBoard = useCallback((y, targetBoardId, boardObj) => {
    if (!y || !targetBoardId) return true;

    // 1. Direct boardId / BoardId check
    const yBoardId = y.boardId ?? y.BoardId ?? (typeof y.board === "object" ? (y.board?.boardId || y.board?.id) : null);
    if (yBoardId !== undefined && yBoardId !== null && String(yBoardId).trim() !== "") {
      return String(yBoardId).trim() === String(targetBoardId).trim();
    }

    // 2. Check boardIds array if present
    const yBoardIds = y.boardIds || y.BoardIds || (Array.isArray(y.boards) ? y.boards : null);
    if (Array.isArray(yBoardIds) && yBoardIds.length > 0) {
      return yBoardIds.some((id) => {
        const val = typeof id === "object" ? (id?.boardId ?? id?.id) : id;
        return String(val).trim() === String(targetBoardId).trim();
      });
    }

    // 3. Check boardCode / boardName match against board object
    if (boardObj) {
      const targetCode = String(boardObj.boardCode || boardObj.code || "").trim().toLowerCase();
      const targetName = String(boardObj.boardName || boardObj.name || "").trim().toLowerCase();

      const yCode = String(y.boardCode || y.BoardCode || (typeof y.board === "object" ? y.board?.code : "")).trim().toLowerCase();
      if (targetCode && yCode && targetCode === yCode) return true;

      const yName = String(y.boardName || y.BoardName || (typeof y.board === "string" ? y.board : y.board?.name || "")).trim().toLowerCase();
      if (targetName && yName && targetName === yName) return true;

      if (Array.isArray(y.boardNames) && targetName) {
        if (y.boardNames.some((n) => String(n).trim().toLowerCase() === targetName)) return true;
      }
    }

    // Fallback: If year object has no board properties at all, allow it
    const hasAnyBoardProp = (
      (y.boardId !== undefined && y.boardId !== null) ||
      (y.BoardId !== undefined && y.BoardId !== null) ||
      Boolean(y.boardCode) ||
      Boolean(y.BoardCode) ||
      Boolean(y.boardName) ||
      Boolean(y.BoardName) ||
      (Array.isArray(y.boardNames) && y.boardNames.length > 0) ||
      (Array.isArray(y.boardIds) && y.boardIds.length > 0) ||
      (y.board !== undefined && y.board !== null)
    );

    return !hasAnyBoardProp;
  }, []);

  /* ============================================================
     1. CASCADING DATA FETCHING & HIERARCHY FLOW
     ============================================================ */

  // 1. Fetch Active Boards on Mount
  useEffect(() => {
    const fetchActiveBoards = async () => {
      try {
        const res = await apiClient.get("/api/v1/boards");
        const items = res.data?.items || res.data || [];
        const activeBoards = items.filter((b) => b.status === true || b.isActive === true);
        const resolvedBoards = activeBoards.length > 0 ? activeBoards : (selectedBoard ? [{ boardId: selectedBoard.id, boardName: selectedBoard.name || selectedBoard.boardName, isActive: true }] : []);
        setBoards(resolvedBoards);
        const matched = resolvedBoards.find((b) => matchesBoard(b, selectedBoardId, selectedBoard)) || resolvedBoards[0];
        if (matched) {
          setFilters((f) => ({ ...f, board: String(matched.boardId || matched.id) }));
        }
      } catch (err) {
        showToast("Failed to load active academic boards.", "error");
      }
    };
    fetchActiveBoards();
  }, [showToast, selectedBoardId, selectedBoard, matchesBoard]);

  // Sync board when navbar selected board changes
  useEffect(() => {
    if (!boards.length) return;
    const matched = boards.find((b) => matchesBoard(b, selectedBoardId, selectedBoard));
    if (matched) {
      const bId = String(matched.boardId || matched.id);
      setFilters((f) => (f.board === bId ? f : { ...f, board: bId }));
    }
  }, [boards, selectedBoardId, selectedBoard, matchesBoard]);

  // 2. Cascading Board Dependencies (Board -> Years, Levels, Groups)
  useEffect(() => {
    if (!filters.board) return;
    const fetchBoardDependencies = async () => {
      try {
        const targetBoardObj = boards.find((b) => String(b.boardId || b.id) === String(filters.board)) || selectedBoard;
        const [yearsRes, levelsRes, groupsRes] = await Promise.all([
          apiClient.get(`/api/v1/academic-years`, { params: { boardId: filters.board, BoardId: filters.board } }),
          apiClient.get(`/api/v1/academic-levels`, { params: { boardId: filters.board, BoardId: filters.board } }),
          apiClient.get(`/api/v1/groups`, { params: { boardId: filters.board, BoardId: filters.board } }),
        ]);

        const yearsData = yearsRes.data?.data || yearsRes.data?.items || yearsRes.data || [];
        const levelsData = levelsRes.data?.data || levelsRes.data?.items || levelsRes.data || [];
        const groupsData = groupsRes.data?.items || groupsRes.data || [];

        // STRICT FILTER: Filter active years belonging strictly to the selected board
        const rawYearsList = Array.isArray(yearsData) ? yearsData : [];
        const activeYears = rawYearsList
          .filter((y) => y.isActive === true || y.status === "Active" || y.status === true)
          .filter((y) => isYearForBoard(y, filters.board, targetBoardObj));

        setAcademicYears(activeYears);
        setAcademicLevels(levelsData);
        setGroups(groupsData.filter((g) => g.isActive === true || g.status === "Active"));

        // Auto-select active year matched from navbar or first active
        const matchedYear = activeYears.find((y) => matchesYear(y, selectedAcademicYearId, selectedAcademicYear)) || activeYears[0];
        if (matchedYear) {
          setFilters((f) => ({ ...f, year: String(matchedYear.academicYearId || matchedYear.id) }));
        } else {
          setFilters((f) => ({ ...f, year: "" }));
        }
      } catch (err) {
        showToast("Failed to load board academic hierarchy.", "error");
      }
    };
    fetchBoardDependencies();
  }, [filters.board, boards, selectedBoard, showToast, selectedAcademicYearId, selectedAcademicYear, matchesYear, isYearForBoard]);

  // Sync year when navbar selected academic year changes or when academicYears changes
  useEffect(() => {
    if (!academicYears.length) return;
    const matched = academicYears.find((y) => matchesYear(y, selectedAcademicYearId, selectedAcademicYear)) || academicYears[0];
    if (matched) {
      const yId = String(matched.academicYearId || matched.id);
      setFilters((f) => (f.year === yId ? f : { ...f, year: yId }));
    }
  }, [academicYears, selectedAcademicYearId, selectedAcademicYear, matchesYear]);

  // 3. Group -> Program Dependency (NEW)
  useEffect(() => {
    if (!filters.group) {
      setPrograms([]);
      return;
    }
    const fetchGroupPrograms = async () => {
      try {
        const res = await apiClient.get(`/api/v1/groups/${filters.group}/programs`);
        const raw = unwrap(res);
        const list = Array.isArray(raw) ? raw : (res.data?.items || res.data || []);
        const activePrograms = list.filter(
          (p) => p.isActive === true || p.isActive !== false || p.status === "Active" || p.status === true,
        );
        const mappedPrograms = activePrograms.map((p, idx) => {
          const rawId = p.programId ?? p.ProgramId ?? p.id ?? p.Id ?? p.program_id;
          const numId = Number(rawId);
          const validId = !isNaN(numId) && numId > 0 ? numId : (rawId || idx + 1);
          const name = p.programName ?? p.ProgramName ?? p.name ?? p.Name ?? p.title ?? p.Title ?? p.programCode ?? "Regular";
          return {
            ...p,
            id: validId,
            programId: validId,
            name,
            programName: name,
            code: p.programCode ?? p.ProgramCode ?? p.code ?? "",
          };
        });
        setPrograms(mappedPrograms);
      } catch (err) {
        showToast("Failed to load programs for selected group.", "error");
      }
    };
    fetchGroupPrograms();
  }, [filters.group, showToast]);

  // Auto-sync child filter selections if they no longer exist in updated parent data lists
  useEffect(() => {
    if (filters.year && academicYears.length > 0 && !academicYears.some((y) => String(y.academicYearId || y.id) === String(filters.year))) {
      const fallback = academicYears.find((y) => matchesYear(y, selectedAcademicYearId, selectedAcademicYear)) || academicYears[0];
      setFilters((f) => ({ ...f, year: fallback ? String(fallback.academicYearId || fallback.id) : "", exam: "" }));
    }
  }, [academicYears, filters.year, selectedAcademicYearId, selectedAcademicYear, matchesYear]);

  useEffect(() => {
    if (filters.group && groups.length > 0 && !groups.some((g) => String(g.groupId || g.id) === String(filters.group))) {
      setFilters((f) => ({ ...f, group: "", program: "", exam: "" }));
    }
  }, [groups, filters.group]);

  useEffect(() => {
    if (filters.program && programs.length > 0 && !programs.some((p) => String(p.programId ?? p.id) === String(filters.program))) {
      setFilters((f) => ({ ...f, program: "", exam: "" }));
    }
  }, [programs, filters.program]);

  useEffect(() => {
    if (filters.exam && examinations.length > 0 && !examinations.some((e) => String(e.examinationId ?? e.id ?? e.examId) === String(filters.exam))) {
      setFilters((f) => ({ ...f, exam: "" }));
    }
  }, [examinations, filters.exam]);

  // 4. Completed Examinations Filter (Group/Program -> Completed Examinations)
  useEffect(() => {
    if (!filters.board || !filters.year || !filters.group) {
      setExaminations([]);
      return;
    }
    const fetchCompletedExams = async () => {
      try {
        const res = await apiClient.get("/api/v1/examinations", {
          params: {
            BoardId: filters.board,
            AcademicYearId: filters.year,
            AcademicLevelId: filters.level || undefined,
            GroupId: filters.group,
            ProgramId: filters.program || undefined,
          },
        });
        const raw = unwrap(res);
        const items = Array.isArray(raw) ? raw : (res.data?.items || res.data || []);
        const matchingItems = items.filter((e) => {
          const examBoardId = e.boardId ?? e.BoardId;
          if (examBoardId && String(examBoardId) !== String(filters.board)) return false;
          const examYearId = e.academicYearId ?? e.AcademicYearId ?? e.yearId;
          if (examYearId && String(examYearId) !== String(filters.year)) return false;
          return true;
        });
        // STRICT FILTER: Completed Examinations
        const completedOnly = matchingItems.filter((e) => {
          const s = String(e.status ?? e.examStatus ?? e.examinationStatus ?? "").trim().toUpperCase();
          return s === "COMPLETED" || s === "FINISHED" || s === "PUBLISHED" || e.isCompleted === true;
        });
        const finalExams = (completedOnly.length > 0 ? completedOnly : matchingItems).map((e) => ({
          ...e,
          id: e.examinationId ?? e.id ?? e.examId,
          examinationId: e.examinationId ?? e.id ?? e.examId,
          examName: e.examName || e.examinationName || e.name || e.title || e.examCode || "Examination",
          examinationName: e.examName || e.examinationName || e.name || e.title || e.examCode || "Examination",
          name: e.examName || e.examinationName || e.name || e.title || e.examCode || "Examination",
          code: e.examCode || e.code || "",
          examCode: e.examCode || e.code || "",
        }));
        setExaminations(finalExams);
      } catch (err) {
        showToast("Failed to load completed examinations.", "error");
      }
    };
    fetchCompletedExams();
  }, [filters.board, filters.year, filters.level, filters.group, filters.program, showToast]);

  // 5. Readiness & Evaluation Verification
  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group || !filters.exam) {
      setReadiness(null);
      return;
    }
    const checkReadiness = async () => {
      setCheckingReadiness(true);
      try {
        const res = await apiClient.get("/api/v1/results/readiness", {
          params: {
            boardId: filters.board,
            academicYearId: filters.year,
            academicLevelId: filters.level,
            groupId: filters.group,
            programId: filters.program || undefined,
            examId: filters.exam,
          },
        });
        const data = res.data?.data || res.data || {};
        const allApproved = Boolean(data.allEvaluationsApproved ?? data.evaluationsApproved ?? true);
        const canGen = Boolean(data.canGenerateResults ?? (allApproved && data.canGenerate !== false));
        const blockers = Array.isArray(data.validationBlockers)
          ? data.validationBlockers
          : Array.isArray(data.blockers)
            ? data.blockers
            : data.validationBlockers
              ? [data.validationBlockers]
              : [];

        setReadiness({
          allEvaluationsApproved: allApproved,
          canGenerateResults: canGen,
          validationBlockers: blockers,
          metrics: data.metrics || null,
        });
      } catch (err) {
        setReadiness({
          allEvaluationsApproved: true,
          canGenerateResults: true,
          validationBlockers: [],
          metrics: null,
        });
      } finally {
        setCheckingReadiness(false);
      }
    };
    checkReadiness();
  }, [filters.board, filters.year, filters.level, filters.group, filters.program, filters.exam]);

  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    if (key === "board") {
      next.year = "";
      next.level = "";
      next.group = "";
      next.program = "";
      next.exam = "";
      setResultsGenerated(false);
      setSectionSummaries([]);
      setSelectedSectionDetails(null);
      setSelectedStudentMemo(null);
      setReadiness(null);
    } else if (key === "year") {
      next.level = "";
      next.group = "";
      next.program = "";
      next.exam = "";
      setResultsGenerated(false);
      setSectionSummaries([]);
      setSelectedSectionDetails(null);
      setSelectedStudentMemo(null);
      setReadiness(null);
    } else if (key === "level") {
      next.group = "";
      next.program = "";
      next.exam = "";
      setResultsGenerated(false);
      setSectionSummaries([]);
      setSelectedSectionDetails(null);
      setSelectedStudentMemo(null);
      setReadiness(null);
    } else if (key === "group") {
      next.program = "";
      next.exam = "";
      setResultsGenerated(false);
      setSectionSummaries([]);
      setSelectedSectionDetails(null);
      setSelectedStudentMemo(null);
      setReadiness(null);
    } else if (key === "program") {
      next.exam = "";
      setResultsGenerated(false);
      setSectionSummaries([]);
      setSelectedSectionDetails(null);
      setSelectedStudentMemo(null);
      setReadiness(null);
    } else if (key === "exam") {
      setResultsGenerated(false);
      setSectionSummaries([]);
      setSelectedSectionDetails(null);
      setSelectedStudentMemo(null);
      setReadiness(null);
    }
    setFilters(next);
  };

  const isGroupValid = Boolean(
    filters.group && (!groups.length || groups.some((g) => String(g.groupId || g.id) === String(filters.group)))
  );
  const isProgramRequired = programs.length > 0;
  const hasProgramIfRequired =
    !isProgramRequired ||
    Boolean(
      filters.program &&
      (!programs.length ||
        programs.some(
          (p) =>
            String(p.programId ?? p.id) === String(filters.program) ||
            String(p.programName ?? p.name).trim().toLowerCase() === String(filters.program).trim().toLowerCase(),
        )),
    );
  const isExamValid = Boolean(
    filters.exam && (!examinations.length || examinations.some((e) => String(e.examinationId ?? e.id ?? e.examId) === String(filters.exam)))
  );

  const canGenerate = Boolean(
    filters.board &&
    filters.year &&
    filters.level &&
    isGroupValid &&
    hasProgramIfRequired &&
    isExamValid &&
    (readiness === null || readiness.canGenerateResults)
  );

  /* ============================================================
     TAB 1: RESULTS GENERATION & SECTION PUBLISHING
     ============================================================ */
  const generateResults = async () => {
    if (!canGenerate) {
      showToast("Please enter remaining filter details (Academic Level, Group, Program, and Examination) to generate results.", "error");
      return;
    }
    if (readiness && !readiness.canGenerateResults) {
      const blockers = readiness.validationBlockers?.length
        ? readiness.validationBlockers.join("; ")
        : "Evaluations are not approved yet. Results cannot be generated.";
      showToast(blockers, "error");
      return;
    }

    setGeneratingResults(true);
    try {
      const resProgId = (() => {
        if (!filters.program) return undefined;
        const found = programs.find((p) =>
          String(p.programId ?? p.id) === String(filters.program) ||
          String(p.programName ?? p.name).trim().toLowerCase() === String(filters.program).trim().toLowerCase() ||
          String(p.programCode ?? p.code).trim().toLowerCase() === String(filters.program).trim().toLowerCase()
        );
        if (found) {
          const rawId = found.programId ?? found.id ?? filters.program;
          return String(rawId);
        }
        return String(filters.program);
      })();

      const payload = {
        boardId: Number(filters.board) || filters.board,
        academicYearId: Number(filters.year) || filters.year,
        academicLevelId: Number(filters.level) || filters.level,
        groupId: Number(filters.group) || filters.group,
        ...(resProgId ? { programId: String(resProgId) } : {}),
        examinationId: Number(filters.exam) || filters.exam,
        examId: Number(filters.exam) || filters.exam,
        publishDate: new Date().toISOString()
      };

      const res = await apiClient.post("/api/v1/results/generate", payload);
      const data = unwrapPayload(res);
      const rawSections = Array.isArray(data)
        ? data
        : Array.isArray(data?.sections)
          ? data.sections
          : Array.isArray(data?.sectionSummaries)
            ? data.sectionSummaries
            : Array.isArray(data?.items)
              ? data.items
              : [];

      const mappedSections = rawSections.map((s, idx) => ({
        sectionId: s.sectionId || s.id || idx + 1,
        sectionName: s.sectionName || s.name || `Section ${idx + 1}`,
        inChargeName: s.inChargeName || s.facultyName || s.inCharge || "—",
        studentCount: s.studentCount ?? s.totalStudents ?? s.studentsCount ?? (s.studentRows?.length || 0),
        passed: s.passed ?? s.passedCount ?? s.passCount ?? 0,
        failed: s.failed ?? s.failedCount ?? s.failCount ?? 0,
        passRate: Number(s.passRate ?? s.passPercentage ?? (s.studentCount ? ((s.passed / s.studentCount) * 100) : 0)),
        average: Number(s.average ?? s.averagePercentage ?? s.averageScore ?? 0),
        resultStatus: String(s.resultStatus || s.status || (s.isPublished ? "PUBLISHED" : "GENERATED")).toUpperCase(),
        studentRows: s.studentRows || s.students || [],
        subjectDefinitions: s.subjectDefinitions || s.subjects || []
      }));

      setApplied({ ...filters });
      setSectionSummaries(mappedSections);
      setResultsGenerated(true);
      setSelectedSectionDetails(null);
      setSelectedStudentMemo(null);
      setPage(1);

      // If any returned section is already published, immediately sync to Published Results
      const anyPublished = mappedSections.some(
        (s) => s.resultStatus === "PUBLISHED" || s.isPublished
      );
      if (anyPublished) {
        syncPublishedGroup(mappedSections);
      }

      const selGroup = groups.find((g) => String(g.groupId || g.id) === String(filters.group));
      showToast(`Approved marks fetched from Marks Evaluation. ${selGroup ? selGroup.groupName || selGroup.name : "Group"} section-wise results generated successfully!`);
    } catch (err) {
      console.error("Result generation error:", err);
      showToast(getApiErrorMessage(err) || "Failed to generate results.", "error");
    } finally {
      setGeneratingResults(false);
    }
  };

  // Section-Wise Publishing Handler
  const handlePublishSection = (section) => {
    setConfirmPublish({ type: "section", data: section });
  };

  // Group-Wise Publishing Handler
  const handlePublishGroup = () => {
    setConfirmPublish({ type: "group", data: sectionSummaries });
  };

  // Helper to sync published records into Tab 2 (Published Groups) in-memory state
  const syncPublishedGroup = (updatedSections) => {
    const targetExamId = applied.exam || filters.exam;
    const targetGroupId = applied.group || filters.group;
    const targetProgramId = applied.program || filters.program;
    const targetBoardId = applied.board || filters.board;
    const targetYearId = applied.year || filters.year;

    const examObj = examinations.find((e) => String(e.examinationId ?? e.id ?? e.examId) === String(targetExamId));
    const groupObj = groups.find((g) => String(g.groupId || g.id) === String(targetGroupId));
    const programObj = programs.find((p) => String(p.programId || p.id) === String(targetProgramId));
    const boardObj = boards.find((b) => String(b.boardId || b.id) === String(targetBoardId));
    const yearObj = academicYears.find((y) => String(y.academicYearId || y.id) === String(targetYearId));

    const publishedSecs = (updatedSections || sectionSummaries).filter(
      (s) => s.resultStatus === "PUBLISHED" || s.isPublished
    );
    if (!publishedSecs.length) return;

    const totalStudents = publishedSecs.reduce((sum, s) => sum + Number(s.studentCount || 0), 0);
    const passed = publishedSecs.reduce((sum, s) => sum + Number(s.passed || 0), 0);
    const failed = publishedSecs.reduce((sum, s) => sum + Number(s.failed || 0), 0);
    const passRate = totalStudents > 0 ? (passed / totalStudents) * 100 : 0;

    const newGroupItem = {
      publishedId: Number(targetExamId) || Date.now(),
      examId: Number(targetExamId),
      examName: examObj?.examName || examObj?.examinationName || examObj?.name || "Published Examination",
      groupName: groupObj?.groupName || groupObj?.name || "Group",
      programName: programObj?.programName || programObj?.name || `${groupObj?.groupName || "General"} Stream`,
      boardName: boardObj?.boardName || boardObj?.name || "Board",
      academicYear: yearObj?.academicYearName || yearObj?.name || "—",
      totalStudents,
      passed,
      failed,
      passRate,
      resultStatus: "PUBLISHED",
      publishedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      sections: publishedSecs
    };

    setPublishedGroups((prev) => {
      const existingIdx = prev.findIndex((p) => String(p.examId) === String(targetExamId));
      if (existingIdx >= 0) {
        const nextList = [...prev];
        nextList[existingIdx] = { ...nextList[existingIdx], ...newGroupItem };
        return nextList;
      }
      return [newGroupItem, ...prev];
    });
  };

  const confirmActionPublish = async () => {
    if (!confirmPublish) return;
    setActionLoading("PUBLISH");
    try {
      if (confirmPublish.type === "section") {
        const section = confirmPublish.data;
        const secId = Number(section.sectionId);
        const examId = Number(applied.exam || filters.exam);
        const boardId = Number(applied.board || filters.board) || undefined;
        const academicYearId = Number(applied.year || filters.year) || undefined;
        const academicLevelId = Number(applied.level || filters.level) || undefined;
        const groupId = Number(applied.group || filters.group) || undefined;
        const programId = String(applied.program || filters.program || "");

        const publishPayload = {
          boardId: boardId || 1,
          academicYearId: academicYearId || 1,
          academicLevelId: academicLevelId || 1,
          groupId: groupId || 1,
          ...(programId ? { programId: String(programId) } : {}),
          sectionId: secId,
          examinationId: examId,
          examId: examId,
          publishDate: new Date().toISOString()
        };

        // Single Publishing API: Use ONLY POST /api/v1/results/publish
        await apiClient.post("/api/v1/results/publish", publishPayload);

        const updatedSections = sectionSummaries.map((sec) =>
          sec.sectionId === secId
            ? {
              ...sec,
              resultStatus: "PUBLISHED",
              isPublished: true,
              studentRows: (sec.studentRows || []).map((st) => ({
                ...st,
                publicationStatus: "PUBLISHED",
                status: "PUBLISHED"
              }))
            }
            : sec
        );

        setSectionSummaries(updatedSections);

        if (selectedSectionDetails && selectedSectionDetails.sectionId === secId) {
          setSelectedSectionDetails((prev) => ({
            ...prev,
            resultStatus: "PUBLISHED",
            isPublished: true,
            studentRows: (prev.studentRows || []).map((st) => ({
              ...st,
              publicationStatus: "PUBLISHED",
              status: "PUBLISHED"
            }))
          }));
        }

        syncPublishedGroup(updatedSections);
        fetchPublishedGroups();
        showToast(`Results for ${section.sectionName} published successfully! Students can now view their marks.`);
      } else if (confirmPublish.type === "group") {
        const examId = Number(applied.exam || filters.exam);
        const boardId = Number(applied.board || filters.board) || undefined;
        const academicYearId = Number(applied.year || filters.year) || undefined;
        const academicLevelId = Number(applied.level || filters.level) || undefined;
        const groupId = Number(applied.group || filters.group) || undefined;
        const programId = String(applied.program || filters.program || "");

        const groupPublishPayload = {
          boardId: boardId || 1,
          academicYearId: academicYearId || 1,
          academicLevelId: academicLevelId || 1,
          groupId: groupId || 1,
          ...(programId ? { programId: String(programId) } : {}),
          examinationId: examId,
          examId: examId,
          publishDate: new Date().toISOString()
        };

        // Single Publishing API: Use ONLY POST /api/v1/results/publish (omits sectionId)
        await apiClient.post("/api/v1/results/publish", groupPublishPayload);

        const updatedSections = sectionSummaries.map((sec) => ({
          ...sec,
          resultStatus: "PUBLISHED",
          isPublished: true,
          studentRows: (sec.studentRows || []).map((st) => ({
            ...st,
            publicationStatus: "PUBLISHED",
            status: "PUBLISHED"
          }))
        }));

        setSectionSummaries(updatedSections);

        if (selectedSectionDetails) {
          setSelectedSectionDetails((prev) => ({
            ...prev,
            resultStatus: "PUBLISHED",
            isPublished: true,
            studentRows: (prev.studentRows || []).map((st) => ({
              ...st,
              publicationStatus: "PUBLISHED",
              status: "PUBLISHED"
            }))
          }));
        }

        syncPublishedGroup(updatedSections);
        fetchPublishedGroups();
        showToast("Group results published successfully to all students!");
      }
    } catch (err) {
      console.error("Publish results error:", err);
      showToast(getApiErrorMessage(err) || "Failed to publish results.", "error");
    } finally {
      setActionLoading("");
      setConfirmPublish(null);
    }
  };

  /* ============================================================
     TAB 2: PUBLISHED RESULTS & SECTION STUDENT BREAKDOWN
     ============================================================ */
  const fetchPublishedGroups = useCallback(async () => {
    setLoadingPublished(true);
    const bId = Number(selectedBoardId || filters.board || applied.board);
    const yId = Number(selectedAcademicYearId || filters.year || applied.year);

    try {
      // 1. Discover completed/published examinations directly from database for the active board
      let examList = [];
      try {
        const examRes = await apiClient.get("/api/v1/examinations", {
          params: {
            BoardId: bId || undefined,
          },
        });
        const rawEx = unwrap(examRes);
        const exItems = Array.isArray(rawEx) ? rawEx : (examRes.data?.items || examRes.data || []);
        const completed = exItems.filter((e) => {
          const s = String(e.status ?? e.examStatus ?? e.examinationStatus ?? "").trim().toUpperCase();
          return s === "COMPLETED" || s === "FINISHED" || s === "PUBLISHED" || e.isCompleted === true;
        });
        examList = (completed.length > 0 ? completed : exItems).map((e) => ({
          ...e,
          id: e.examinationId ?? e.id ?? e.examId,
          examinationId: e.examinationId ?? e.id ?? e.examId,
          examName: e.examName || e.examinationName || e.name || e.title || e.examCode || "Examination",
          examCode: e.examCode || e.code || "",
        }));
      } catch (e) {
        console.warn("Notice: fetch examinations in fetchPublishedGroups:", e);
      }

      // Collect all fetched published group objects from backend database
      const fetchedGroupsMap = new Map();

      // Helper to build sections from individual student records if not pre-grouped
      const groupRecordsIntoSections = (records, fallbackExamId, examName) => {
        const sectionsMap = new Map();
        records.forEach((rec, idx) => {
          const sId = rec.sectionId || rec.section_id || 1;
          const sName = rec.sectionName || rec.section || `Section ${sId}`;
          if (!sectionsMap.has(sId)) {
            sectionsMap.set(sId, {
              sectionId: sId,
              sectionName: sName,
              inChargeName: rec.inChargeName || rec.facultyName || rec.inCharge || "—",
              examId: fallbackExamId,
              examName: examName,
              studentRows: [],
              subjectDefinitions: rec.subjectDefinitions || rec.subjects || [],
            });
          }
          const sec = sectionsMap.get(sId);
          sec.studentRows.push({
            studentId: rec.studentId || rec.id || idx + 1,
            rollNo: rec.rollNo || rec.rollNumber || "—",
            studentName: rec.studentName || rec.name || "—",
            examinationName: rec.examinationName || rec.examName || examName,
            examinationId: fallbackExamId,
            examId: fallbackExamId,
            sectionName: sName,
            sectionId: sId,
            total: rec.totalMarks ?? rec.total ?? 0,
            maximum: rec.maximumMarks ?? rec.maximum ?? 500,
            percentage: Number(rec.percentage ?? (rec.maximumMarks ? (rec.totalMarks / rec.maximumMarks) * 100 : 0)),
            grade: rec.grade || "—",
            result: String(rec.resultStatus || rec.result || "PASS").toUpperCase(),
            sectionRank: rec.sectionRank || rec.rank || sec.studentRows.length + 1,
            groupRank: rec.groupRank || rec.rank || idx + 1,
            publicationStatus: "PUBLISHED",
            status: "PUBLISHED",
            subjects: rec.subjects || [],
          });
        });

        return Array.from(sectionsMap.values()).map((sec) => {
          const total = sec.studentRows.length;
          const passed = sec.studentRows.filter((st) => String(st.result).toUpperCase() === "PASS").length;
          const failed = total - passed;
          const passRate = total > 0 ? (passed / total) * 100 : 0;
          const avgScore = total > 0 ? (sec.studentRows.reduce((sum, st) => sum + Number(st.percentage || 0), 0) / total) : 0;
          return {
            ...sec,
            studentCount: total,
            passed,
            failed,
            passRate,
            average: avgScore,
            resultStatus: "PUBLISHED",
            isPublished: true,
          };
        });
      };

      // 2. Query /api/v1/results/published endpoint from backend database (fetches ALL previous published results)
      try {
        const pubRes = await apiClient.get("/api/v1/results/published", {
          params: {
            boardId: bId || undefined,
          },
        });
        const pubData = unwrapPayload(pubRes);
        const pubItems = Array.isArray(pubData) ? pubData : (pubData?.items || pubData?.groups || []);
        if (pubItems.length > 0) {
          pubItems.forEach((item) => {
            const itemExamId = Number(item.examId ?? item.examinationId ?? item.publishedId);
            const uniqueKey = item.publishedId || `${itemExamId}_${item.groupId || item.groupName || ""}`;
            if (itemExamId > 0) {
              fetchedGroupsMap.set(uniqueKey, {
                publishedId: item.publishedId || itemExamId,
                examId: itemExamId,
                examName: item.examName || item.examinationName || item.name || "Published Examination",
                groupName: item.groupName || item.name || "Group",
                programName: item.programName || `${item.groupName || "General"} Stream`,
                boardName: item.boardName || "Board",
                academicYear: item.academicYearName || item.academicYear || "—",
                totalStudents: item.totalStudents ?? (item.sections?.reduce((acc, s) => acc + (s.studentCount || 0), 0) ?? 0),
                passed: item.passed ?? (item.sections?.reduce((acc, s) => acc + (s.passed || 0), 0) ?? 0),
                failed: item.failed ?? (item.sections?.reduce((acc, s) => acc + (s.failed || 0), 0) ?? 0),
                passRate: Number(item.passRate ?? item.passPercentage ?? 0),
                resultStatus: "PUBLISHED",
                publishedDate: item.publishedDate
                  ? new Date(item.publishedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
                boardId: item.boardId || bId,
                academicYearId: item.academicYearId || yId,
                academicLevelId: item.academicLevelId,
                groupId: item.groupId,
                programId: item.programId,
                sections: Array.isArray(item.sections)
                  ? item.sections.map((sec, sIdx) => ({
                    sectionId: sec.sectionId || sec.id || sIdx + 1,
                    sectionName: sec.sectionName || sec.name || `Section ${sIdx + 1}`,
                    inChargeName: sec.inChargeName || sec.facultyName || sec.inCharge || "—",
                    studentCount: sec.studentCount ?? (sec.studentRows?.length || 0),
                    passed: sec.passed ?? 0,
                    failed: sec.failed ?? 0,
                    passRate: Number(sec.passRate ?? 0),
                    average: Number(sec.average ?? 0),
                    resultStatus: "PUBLISHED",
                    isPublished: true,
                    examId: itemExamId,
                    examName: item.examName || item.examinationName,
                    studentRows: sec.studentRows || [],
                    subjectDefinitions: sec.subjectDefinitions || [],
                  }))
                  : [],
              });
            }
          });
        }
      } catch (e) {
        // Fallback continues to /generate and /results
      }

      // 3. Inspect candidate exams in database via /api/v1/results/generate and /api/v1/results for previous results
      const examQueue = (examList || []).map((e) => Number(e.examinationId ?? e.id ?? e.examId)).filter((id) => id > 0);

      for (const currentExamId of examQueue) {
        let detectedSections = [];
        const targetExamObj = examList.find((e) => String(e.examinationId ?? e.id ?? e.examId) === String(currentExamId));
        const examName = targetExamObj?.examName || targetExamObj?.examinationName || targetExamObj?.name || "Published Examination";

        // 3a. Check backend database generate response for published sections
        try {
          const genRes = await apiClient.post("/api/v1/results/generate", {
            boardId: bId || undefined,
            examId: currentExamId,
          });
          const rawData = unwrapPayload(genRes);
          const rawSections = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData?.sections)
              ? rawData.sections
              : Array.isArray(rawData?.sectionSummaries)
                ? rawData.sectionSummaries
                : [];

          const pubSecs = rawSections
            .filter((s) => s.isPublished || String(s.resultStatus || s.status).toUpperCase() === "PUBLISHED")
            .map((s, idx) => ({
              sectionId: s.sectionId || s.id || idx + 1,
              sectionName: s.sectionName || s.name || `Section ${idx + 1}`,
              inChargeName: s.inChargeName || s.facultyName || s.inCharge || "—",
              studentCount: s.studentCount ?? s.totalStudents ?? s.studentsCount ?? (s.studentRows?.length || 0),
              passed: s.passed ?? s.passedCount ?? s.passCount ?? 0,
              failed: s.failed ?? s.failedCount ?? s.failCount ?? 0,
              passRate: Number(s.passRate ?? s.passPercentage ?? (s.studentCount ? ((s.passed / s.studentCount) * 100) : 0)),
              average: Number(s.average ?? s.averagePercentage ?? s.averageScore ?? 0),
              resultStatus: "PUBLISHED",
              isPublished: true,
              examId: currentExamId,
              examName: examName,
              studentRows: (s.studentRows || s.students || []).map((st) => ({
                ...st,
                examinationId: currentExamId,
                examId: currentExamId,
                examinationName: examName,
              })),
              subjectDefinitions: s.subjectDefinitions || s.subjects || [],
            }));

          if (pubSecs.length > 0) {
            detectedSections = pubSecs;
          }
        } catch (err) {
          // Silent fallback
        }

        // 3b. Query /api/v1/results from database
        let resultsApiStudents = [];
        try {
          const res = await apiClient.get("/api/v1/results", {
            params: {
              boardId: bId || undefined,
              examId: currentExamId,
              pageNumber: 1,
              pageSize: 100,
            },
          });
          const payload = unwrapPayload(res) || {};
          const records = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.results)
              ? payload.results
              : Array.isArray(payload.items)
                ? payload.items
                : [];

          if (records.length > 0) {
            resultsApiStudents = records;
            if (detectedSections.length === 0) {
              detectedSections = groupRecordsIntoSections(records, currentExamId, examName);
            }
          }
        } catch (err) {
          // Silent fallback
        }

        // If we have published sections or student records for this exam, build or update group item
        if (detectedSections.length > 0 || resultsApiStudents.length > 0) {
          const targetGroup = groups.find((g) => String(g.groupId || g.id) === String(targetExamObj?.groupId || detectedSections[0]?.groupId));
          const targetBoard = boards.find((b) => String(b.boardId || b.id) === String(bId || targetExamObj?.boardId));
          const targetYear = academicYears.find((y) => String(y.academicYearId || y.id) === String(yId || targetExamObj?.academicYearId));

          const totalStudents = detectedSections.reduce((sum, s) => sum + Number(s.studentCount || 0), 0) || resultsApiStudents.length;
          const passed = detectedSections.reduce((sum, s) => sum + Number(s.passed || 0), 0) || resultsApiStudents.filter((r) => String(r.resultStatus || "").toLowerCase() === "pass").length;
          const failed = totalStudents >= passed ? (totalStudents - passed) : 0;
          const passRate = totalStudents > 0 ? (passed / totalStudents) * 100 : 0;

          const uniqueKey = `${currentExamId}_${targetGroup?.groupId || detectedSections[0]?.groupId || "default"}`;
          if (!fetchedGroupsMap.has(uniqueKey)) {
            const groupItem = {
              publishedId: currentExamId,
              examId: currentExamId,
              examName,
              groupName: targetGroup?.groupName || targetGroup?.name || detectedSections[0]?.groupName || "Group",
              programName: targetGroup ? `${targetGroup.groupName || targetGroup.name} Stream` : (detectedSections[0]?.groupName ? `${detectedSections[0].groupName} Stream` : "General Stream"),
              boardName: targetBoard?.boardName || targetBoard?.name || "Board",
              academicYear: targetYear?.academicYearName || targetYear?.name || "—",
              totalStudents,
              passed,
              failed,
              passRate,
              resultStatus: "PUBLISHED",
              publishedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
              boardId: bId,
              academicYearId: yId,
              sections: detectedSections,
            };

            fetchedGroupsMap.set(uniqueKey, groupItem);
          }
        }
      }

      // Convert Map to Array and update state from database
      const finalPublishedList = Array.from(fetchedGroupsMap.values());
      setPublishedGroups(finalPublishedList);
    } finally {
      setLoadingPublished(false);
    }
  }, [groups, boards, academicYears, selectedBoardId, selectedAcademicYearId]);

  useEffect(() => {
    if (viewMode === "published") {
      fetchPublishedGroups();
    }
  }, [viewMode, fetchPublishedGroups]);

  const handleViewSection = async (sec, isPublished = false) => {
    const targetExamId = sec.examId || (isPublished ? selectedPublishedGroup?.examId : undefined) || applied.exam || filters.exam;
    try {
      const res = await apiClient.get(`/api/v1/results/sections/${sec.sectionId}`, {
        params: { examId: targetExamId },
      });
      const payload = unwrapPayload(res) || {};
      const studentsList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.studentRows)
          ? payload.studentRows
          : Array.isArray(payload.students)
            ? payload.students
            : Array.isArray(payload.items)
              ? payload.items
              : (sec.studentRows?.length ? sec.studentRows : []);

      const subjectDefs = (payload.subjectDefinitions?.length && payload.subjectDefinitions) ||
        (payload.subjects?.length && payload.subjects) ||
        (sec.subjectDefinitions?.length && sec.subjectDefinitions) || [];

      const enrichedSection = {
        ...sec,
        examId: targetExamId,
        studentRows: (studentsList.length > 0 ? studentsList : (sec.studentRows || [])).map((st) => ({
          ...st,
          examinationId: targetExamId,
          examId: targetExamId,
          examinationName: st.examinationName || sec.examName || selectedPublishedGroup?.examName || currentExamObj.name,
          sectionName: st.sectionName || sec.sectionName,
          sectionId: st.sectionId || sec.sectionId,
        })),
        subjectDefinitions: subjectDefs,
      };

      if (isPublished) {
        setSelectedPublishedSection(enrichedSection);
      } else {
        setSelectedSectionDetails(enrichedSection);
      }
    } catch (err) {
      const fallbackSection = {
        ...sec,
        examId: targetExamId,
        studentRows: (sec.studentRows || []).map((st) => ({
          ...st,
          examinationId: targetExamId,
          examId: targetExamId,
          examinationName: st.examinationName || sec.examName || selectedPublishedGroup?.examName || currentExamObj.name,
          sectionName: st.sectionName || sec.sectionName,
          sectionId: st.sectionId || sec.sectionId,
        })),
      };
      if (isPublished) {
        setSelectedPublishedSection(fallbackSection);
      } else {
        setSelectedSectionDetails(fallbackSection);
      }
    }
  };

  /* ============================================================
     TAB 3: STUDENT MARKS MEMO
     ============================================================ */
  const handleViewStudentMemo = async (student) => {
    try {
      const studentId = student.studentId || student.id;
      const examId = student.examinationId || student.examId || selectedPublishedGroup?.examId || applied.exam || filters.exam;
      const bId = student.boardId || selectedPublishedGroup?.boardId || applied.board || filters.board;
      const yId = student.academicYearId || selectedPublishedGroup?.academicYearId || applied.year || filters.year;
      const lId = student.academicLevelId || selectedPublishedGroup?.academicLevelId || applied.level || filters.level;
      const gId = student.groupId || selectedPublishedGroup?.groupId || applied.group || filters.group;
      const pId = student.programId || selectedPublishedGroup?.programId || applied.program || filters.program || undefined;

      const res = await apiClient.get("/api/v1/results/student-result", {
        params: {
          studentId,
          examId,
          boardId: bId || undefined,
          academicYearId: yId || undefined,
          academicLevelId: lId || undefined,
          groupId: gId || undefined,
          programId: pId || undefined,
        },
      });
      const memoData = unwrapPayload(res);
      const examTitle = memoData?.examinationName || student.examinationName || selectedPublishedGroup?.examName || currentExamObj.name;
      if (memoData && typeof memoData === "object" && (memoData.studentId || memoData.studentName)) {
        setSelectedStudentMemo({
          ...student,
          ...memoData,
          examinationName: examTitle,
          subjects: memoData.subjects || student.subjects || [],
        });
      } else {
        setSelectedStudentMemo({
          ...student,
          examinationName: examTitle,
        });
      }
    } catch (err) {
      setSelectedStudentMemo({
        ...student,
        examinationName: student.examinationName || selectedPublishedGroup?.examName || currentExamObj.name,
      });
    }
  };

  const handleDownloadStudentMemo = async (student) => {
    if (!student) return;
    const studentId = student.studentId || student.id;
    const examId = student.examinationId || student.examId || applied.exam || filters.exam;
    try {
      showToast("Downloading student marks memo PDF...");
      let res;
      try {
        res = await apiClient.get("/api/v1/results/students/memo", {
          params: {
            studentId,
            examId,
            boardId: bId || undefined,
            academicYearId: yId || undefined,
            academicLevelId: lId || undefined,
            groupId: gId || undefined,
            programId: pId || undefined,
          },
          responseType: "blob",
        });
      } catch (firstErr) {
        // Fallback to /api/v1/results/download-pdf
        res = await apiClient.get("/api/v1/results/download-pdf", {
          params: {
            studentId,
            examId,
            boardId: bId || undefined,
            academicYearId: yId || undefined,
            academicLevelId: lId || undefined,
            groupId: gId || undefined,
            programId: pId || undefined,
          },
          responseType: "blob",
        });
      }
      downloadBlob(res.data, `ResultMemo_${student.rollNo || studentId}.pdf`);
      showToast("Marks memo downloaded successfully!");
    } catch (err) {
      console.error("Download memo error:", err);
      showToast(getApiErrorMessage(err) || "Failed to download student memo PDF.", "error");
    }
  };

  /* ============================================================
     TAB 4: RANK LIST & LEADERBOARD
     ============================================================ */
  const allCurrentStudents = useMemo(() => {
    return sectionSummaries.flatMap((s) => s.studentRows || []);
  }, [sectionSummaries]);

  const fetchRankList = useCallback(async () => {
    const examId = applied.exam || filters.exam;
    if (!examId) return;
    try {
      const res = await apiClient.get("/api/v1/results/rank-list", {
        params: {
          boardId: applied.board || filters.board,
          academicYearId: applied.year || filters.year,
          academicLevelId: applied.level || filters.level,
          groupId: applied.group || filters.group,
          programId: applied.program || filters.program || undefined,
          examId: examId,
          search: rankSearch || undefined
        }
      });
      const list = unwrap(res);
      setApiRankRecords(list);
    } catch (err) {
      setApiRankRecords([]);
    }
  }, [applied, filters, rankSearch]);

  useEffect(() => {
    if (viewMode === "rankList" && resultsGenerated) {
      fetchRankList();
    }
  }, [viewMode, resultsGenerated, fetchRankList]);

  const rankListRecords = useMemo(() => {
    let rows = [];
    if (apiRankRecords.length > 0) {
      rows = apiRankRecords.map((r, idx) => ({
        studentId: r.studentId || r.id || idx + 1,
        rollNo: r.rollNo || r.rollNumber || "—",
        studentName: r.studentName || r.name || "—",
        examinationName: r.examinationName || r.examName || "Examination",
        sectionName: r.sectionName || "—",
        total: r.totalMarks ?? r.total ?? 0,
        maximum: r.maximumMarks ?? r.maximum ?? 500,
        percentage: Number(r.percentage ?? (r.maximumMarks ? (r.totalMarks / r.maximumMarks) * 100 : 0)),
        grade: r.grade || "—",
        result: String(r.resultStatus || r.result || "PASS").toUpperCase(),
        rank: r.rank || r.groupRank || idx + 1,
        subjects: r.subjects || []
      }));
    } else {
      rows = [...allCurrentStudents].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
      rows.forEach((r, idx) => {
        r.rank = idx + 1;
      });
    }

    if (rankFilter === "pass") {
      rows = rows.filter((r) => r.result === "PASS");
    } else if (rankFilter === "fail") {
      rows = rows.filter((r) => r.result === "FAIL");
    }

    if (rankSearch.trim()) {
      const term = rankSearch.trim().toLowerCase();
      rows = rows.filter(
        (item) =>
          (item.studentName && item.studentName.toLowerCase().includes(term)) ||
          (item.rollNo && item.rollNo.toLowerCase().includes(term)) ||
          (item.sectionName && item.sectionName.toLowerCase().includes(term)) ||
          String(item.rank).includes(term)
      );
    }
    return rows;
  }, [apiRankRecords, allCurrentStudents, rankFilter, rankSearch]);

  const pagedRanks = useMemo(() => {
    const start = (rankPage - 1) * PAGE_SIZE;
    return rankListRecords.slice(start, start + PAGE_SIZE);
  }, [rankListRecords, rankPage]);

  const rankPages = Math.max(1, Math.ceil(rankListRecords.length / PAGE_SIZE));

  /* ============================================================
     TAB 5: ANALYTICS & FAILED STUDENTS
     ============================================================ */
  const fetchAnalyticsData = useCallback(async () => {
    const examId = applied.exam || filters.exam;
    const boardId = applied.board || filters.board;
    const academicYearId = applied.year || filters.year;
    const academicLevelId = applied.level || filters.level;
    const groupId = applied.group || filters.group;
    const programId = applied.program || filters.program || undefined;

    if (!examId) return;

    try {
      const [analyticsRes, failedRes] = await Promise.all([
        apiClient.get("/api/v1/results/analytics", {
          params: { boardId, academicYearId, academicLevelId, groupId, programId, examId }
        }).catch((e) => null),
        apiClient.get("/api/v1/results/failed-students", {
          params: { boardId, academicYearId, academicLevelId, groupId, programId, examId }
        }).catch((e) => null),
        apiClient.get("/api/v1/results/statistics", {
          params: { boardId, academicYearId: academicYearId || undefined }
        }).catch((e) => null)
      ]);

      if (analyticsRes) {
        setApiAnalytics(unwrapPayload(analyticsRes));
      }
      if (failedRes) {
        setApiFailedStudents(unwrap(failedRes));
      }
    } catch (err) {
      console.warn("Analytics fetch notice:", err);
    }
  }, [applied, filters]);

  useEffect(() => {
    if (viewMode === "analytics" && resultsGenerated) {
      fetchAnalyticsData();
    }
  }, [viewMode, resultsGenerated, fetchAnalyticsData]);

  const analyticsData = useMemo(() => {
    const totalStudents = apiAnalytics?.totalStudents ?? allCurrentStudents.length;
    const passedStudents = allCurrentStudents.filter((s) => s.result === "PASS");
    const failedStudents = apiFailedStudents.length > 0
      ? apiFailedStudents
      : allCurrentStudents.filter((s) => s.result === "FAIL");

    const passedCount = apiAnalytics?.passedCount ?? passedStudents.length;
    const failedCount = apiAnalytics?.failedCount ?? failedStudents.length;
    const passPercentage = apiAnalytics?.passPercentage ?? (totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(2) : "0.00");
    const averageScore = apiAnalytics?.averageScore ?? (totalStudents > 0 ? (allCurrentStudents.reduce((sum, s) => sum + Number(s.percentage || 0), 0) / totalStudents).toFixed(2) : "0.00");

    const distinctSubjects = [];
    sectionSummaries.forEach((sec) => {
      (sec.subjectDefinitions || []).forEach((sd) => {
        const id = sd.subjectId || sd.id;
        if (!distinctSubjects.some((x) => x.subjectId === id)) {
          distinctSubjects.push({
            subjectId: id,
            subjectName: sd.subjectName || sd.name || sd.shortName,
            shortName: sd.shortName || sd.code || sd.name
          });
        }
      });
    });

    if (!distinctSubjects.length && allCurrentStudents[0]?.subjects?.length) {
      allCurrentStudents[0].subjects.forEach((sd) => {
        const id = sd.subjectId || sd.id;
        if (!distinctSubjects.some((x) => x.subjectId === id)) {
          distinctSubjects.push({
            subjectId: id,
            subjectName: sd.subjectName || sd.name || sd.shortName,
            shortName: sd.shortName || sd.code || sd.name
          });
        }
      });
    }

    const subjectPerformance = Array.isArray(apiAnalytics?.subjectPerformance) && apiAnalytics.subjectPerformance.length
      ? apiAnalytics.subjectPerformance
      : distinctSubjects.map((sub) => {
        const subMarks = allCurrentStudents.map((s) => {
          const found = s.subjects?.find((m) => m.subjectId === sub.subjectId || m.shortName === sub.shortName);
          return found ? Number(found.obtainedMarks || 0) : 0;
        });
        const avg = subMarks.length ? (subMarks.reduce((a, b) => a + b, 0) / subMarks.length).toFixed(2) : 0;
        const highest = subMarks.length ? Math.max(...subMarks, 0) : 0;
        const lowest = subMarks.length ? Math.min(...subMarks, 0) : 0;
        const passedSubCount = subMarks.filter((m) => m >= 35).length;
        const passPct = subMarks.length ? ((passedSubCount / subMarks.length) * 100).toFixed(2) : 0;

        return {
          subjectId: sub.subjectId,
          subjectName: sub.subjectName,
          totalStudents: subMarks.length,
          average: avg,
          highest,
          lowest,
          passPercentage: passPct
        };
      });

    return {
      totalStudents,
      passedCount,
      failedCount,
      passPercentage,
      averageScore,
      passedList: passedStudents,
      failedList: failedStudents,
      subjectPerformance
    };
  }, [apiAnalytics, apiFailedStudents, allCurrentStudents, sectionSummaries]);

  /* ============================================================
     TAB 6: REPORTS & FILE EXPORTS
     ============================================================ */
  const exportExcel = async (rows, filename) => {
    const examId = applied.exam || filters.exam;
    const boardId = applied.board || filters.board;
    const academicYearId = applied.year || filters.year;
    const academicLevelId = applied.level || filters.level;
    const groupId = applied.group || filters.group;

    try {
      showToast("Downloading Results Excel file...");
      const res = await apiClient.get("/api/v1/results/export-excel", {
        params: {
          boardId: boardId || undefined,
          academicYearId: academicYearId || undefined,
          academicLevelId: academicLevelId || undefined,
          groupId: groupId || undefined,
          examId: examId || undefined,
        },
        responseType: "blob",
      });
      if (res.data && res.data.size > 0) {
        downloadBlob(res.data, `${filename || "Results"}_${Date.now()}.xlsx`);
        showToast("Results exported to Excel successfully!");
        return;
      }
    } catch (err) {
      console.warn("Backend Excel export fallback to client XLSX:", err);
    }

    // Client XLSX Fallback
    if (!rows || !rows.length) return showToast("No records available to export.", "error");

    const sorted = [...rows].sort((a, b) => {
      const rankA = Number(a.rank ?? a.sectionRank ?? a.groupRank ?? 0);
      const rankB = Number(b.rank ?? b.sectionRank ?? b.groupRank ?? 0);
      if (rankA > 0 && rankB > 0 && rankA !== rankB) {
        return rankA - rankB;
      }
      return (Number(b.total) || 0) - (Number(a.total) || 0);
    });

    const exportData = sorted.map((item, idx) => ({
      Rank: item.rank || item.sectionRank || item.groupRank || idx + 1,
      RollNo: item.rollNo || "—",
      StudentName: item.studentName || "—",
      Group: item.groupName || "—",
      Section: item.sectionName || "—",
      TotalMarks: item.total ?? 0,
      Percentage: `${item.percentage}%`,
      Grade: item.grade || "—",
      Result: item.result || "—"
    }));

    const sheet = XLSX.utils.json_to_sheet(exportData);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Results");
    XLSX.writeFile(book, `${filename || "Results"}.xlsx`);
    showToast(`Exported ${sorted.length} records to ${filename || "Results"}.xlsx`);
  };

  /* ============================================================
     REVALUATION WORKFLOW
     ============================================================ */
  const handleRevaluationSubmit = async (student, reason) => {
    if (!student) return;
    try {
      showToast("Submitting revaluation request...");
      const res = await apiClient.post("/api/v1/results/revaluation", {
        resultId: student.resultId || student.id,
        studentId: student.studentId || student.id,
        reason: reason || "Student revaluation requested"
      });
      showToast("Revaluation request submitted successfully!");
      const data = unwrapPayload(res);
      if (data?.revaluationId) {
        await apiClient.get(`/api/v1/results/revaluation/${data.revaluationId}`);
      }
    } catch (err) {
      console.error("Revaluation submission error:", err);
      showToast(getApiErrorMessage(err) || "Failed to submit revaluation request.", "error");
    }
  };

  const currentGroupObj = useMemo(() => {
    const targetGroupId = resultsGenerated ? (applied.group || filters.group) : (filters.group || applied.group);
    const found = groups.find((g) => String(g.groupId || g.id) === String(targetGroupId));
    if (found) {
      return {
        ...found,
        id: found.groupId || found.id,
        name: found.groupName || found.name,
        code: found.groupCode || found.code || ""
      };
    }
    return null;
  }, [resultsGenerated, applied.group, filters.group, groups]);

  const currentProgramObj = useMemo(() => {
    const targetProgramId = resultsGenerated ? (applied.program || filters.program) : (filters.program || applied.program);
    const found = programs.find((p) => String(p.programId || p.id) === String(targetProgramId));
    if (found) {
      return {
        ...found,
        id: found.programId || found.id,
        name: found.programName || found.name || found.title,
        code: found.programCode || found.code || ""
      };
    }
    return null;
  }, [resultsGenerated, applied.program, filters.program, programs]);

  const currentExamObj = useMemo(() => {
    const targetExamId = resultsGenerated ? (applied.exam || filters.exam) : (filters.exam || applied.exam);
    const found = examinations.find((e) => String(e.examinationId ?? e.id ?? e.examId) === String(targetExamId));
    if (found) {
      return {
        ...found,
        id: found.examinationId ?? found.id ?? found.examId,
        name: found.examName || found.examinationName || found.name || found.title || found.examCode || "Examination",
        code: found.examCode || found.code || ""
      };
    }
    const first = examinations[0];
    if (first) {
      return {
        ...first,
        id: first.examinationId ?? first.id ?? first.examId,
        name: first.examName || first.examinationName || first.name || first.title || first.examCode || "Examination",
        code: first.examCode || first.code || ""
      };
    }
    return { id: "", name: "Examination" };
  }, [resultsGenerated, applied.exam, filters.exam, examinations]);

  return (
    <DashboardLayout
      title="Results Management"
      subtitle="Generate, publish, inspect and analyze examination results"
      breadcrumb={["Examinations", "Result Processing"]}
    >
      <div className="results-page">
        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast("")} />}

        {/* Navigation View Tabs */}
        <div className="results-tabs-row">
          <div className="results-view-tabs" role="tablist" aria-label="Results modules navigation">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "table"}
              className={`results-view-tab ${viewMode === "table" ? "is-active results-view-tab-active" : ""}`}
              onClick={() => {
                setViewMode("table");
                setSelectedStudentMemo(null);
                setSelectedSectionDetails(null);
              }}
            >
              <FileText size={16} style={{ marginRight: 6 }} />
              Results Processing
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "published"}
              className={`results-view-tab ${viewMode === "published" ? "is-active results-view-tab-active" : ""}`}
              onClick={() => {
                setViewMode("published");
                setSelectedPublishedGroup(null);
                setSelectedPublishedSection(null);
                setSelectedStudentMemo(null);
                fetchPublishedGroups();
              }}
            >
              <Globe size={16} style={{ marginRight: 6 }} />
              Published Results
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "rankList"}
              className={`results-view-tab ${viewMode === "rankList" ? "is-active results-view-tab-active" : ""}`}
              onClick={() => {
                setViewMode("rankList");
                setSelectedStudentMemo(null);
              }}
            >
              <Award size={16} style={{ marginRight: 6 }} />
              Rank List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "analytics"}
              className={`results-view-tab ${viewMode === "analytics" ? "is-active results-view-tab-active" : ""}`}
              onClick={() => {
                setViewMode("analytics");
                setSelectedStudentMemo(null);
              }}
            >
              <BarChart2 size={16} style={{ marginRight: 6 }} />
              Analytics
            </button>
          </div>
        </div>

        {/* TAB 1: RESULTS PROCESSING (Current Result Generation) */}
        {viewMode === "table" && !selectedStudentMemo && (
          <>
            {!selectedSectionDetails && (
              <div className="cms-card">
                <div className="cms-card-body">
                  <div className="results-filter-grid">
                    <Select
                      label="Board"
                      value={filters.board}
                      disabled={true}
                      onChange={(v) => changeFilter("board", v)}
                    >
                      <option value="">Select Board</option>
                      {boards.map((b) => {
                        const bId = b.boardId || b.id;
                        const bName = b.boardName || b.name;
                        return (
                          <option key={bId} value={bId}>
                            {bName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Academic Year"
                      value={filters.year}
                      disabled={true}
                      onChange={(v) => changeFilter("year", v)}
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map((y) => {
                        const yId = y.academicYearId || y.id;
                        const yName = y.academicYearName || y.name;
                        return (
                          <option key={yId} value={yId}>
                            {yName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Academic Level"
                      value={filters.level}
                      disabled={!filters.year}
                      onChange={(v) => changeFilter("level", v)}
                    >
                      <option value="">Select Academic Level</option>
                      {academicLevels.map((l) => {
                        const lId = l.academicLevelId || l.id;
                        const lName = l.levelName || l.name;
                        return (
                          <option key={lId} value={lId}>
                            {lName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Group"
                      value={filters.group}
                      disabled={!filters.level}
                      onChange={(v) => changeFilter("group", v)}
                    >
                      <option value="">Select Group</option>
                      {groups.map((g) => {
                        const gId = g.groupId || g.id;
                        const gName = g.groupName || g.name;
                        return (
                          <option key={gId} value={gId}>
                            {gName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Program"
                      value={filters.program}
                      disabled={!filters.group}
                      onChange={(v) => changeFilter("program", v)}
                    >
                      <option value="">{programs.length === 0 && filters.group ? "No Programs" : "Select Program"}</option>
                      {programs.map((p) => {
                        const pId = p.programId ?? p.id;
                        const pName = p.programName || p.name || p.title;
                        return (
                          <option key={pId} value={String(pId)}>
                            {pName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Examination"
                      value={filters.exam}
                      disabled={!filters.group || (programs.length > 0 && !filters.program)}
                      onChange={(v) => changeFilter("exam", v)}
                    >
                      <option value="">Select Examination</option>
                      {examinations.map((e) => {
                        const eId = e.examinationId ?? e.id ?? e.examId;
                        const eName = e.examName || e.examinationName || e.name || e.title || e.examCode || `Exam ${eId}`;
                        return (
                          <option key={eId} value={eId}>
                            {eName}
                          </option>
                        );
                      })}
                    </Select>
                  </div>
                  <div className="results-filter-actions-row">
                    <button
                      className="cms-btn cms-btn-primary results-generate-btn"
                      disabled={generatingResults || !canGenerate}
                      onClick={generateResults}
                    >
                      {generatingResults ? "Generating..." : "Generate Results"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!selectedSectionDetails ? (
              !resultsGenerated ? (
                <PreGenerateNotice
                  group={currentGroupObj}
                  program={currentProgramObj}
                  exam={currentExamObj}
                  readiness={readiness}
                  checkingReadiness={checkingReadiness}
                />
              ) : (
                <SectionsTable
                  summaries={sectionSummaries}
                  exam={currentExamObj}
                  group={currentGroupObj}
                  program={currentProgramObj}
                  query={query}
                  setQuery={setQuery}
                  onViewSection={(sec) => handleViewSection(sec, false)}
                  onPublishSection={handlePublishSection}
                  onPublishGroup={handlePublishGroup}
                  onExcel={() =>
                    exportExcel(
                      sectionSummaries.flatMap((s) => s.studentRows || []),
                      `${currentExamObj.name}-${currentGroupObj?.code || "Group"}${currentProgramObj?.code ? `-${currentProgramObj.code}` : ""}-Results`
                    )
                  }
                />
              )
            ) : (
              <SectionStudentsView
                section={selectedSectionDetails}
                exam={currentExamObj}
                onBack={() => setSelectedSectionDetails(null)}
                onViewStudent={(student) => handleViewStudentMemo(student)}
                onExcel={(rowsToExport) =>
                  exportExcel(
                    rowsToExport || selectedSectionDetails.studentRows || [],
                    `${currentExamObj.name}-${selectedSectionDetails.sectionName}`
                  )
                }
              />
            )}
          </>
        )}

        {/* TAB 2: PUBLISHED RESULTS (Group-Wise Previous Published Exams) */}
        {viewMode === "published" && !selectedStudentMemo && (
          <>
            {!selectedPublishedGroup && (
              <PublishedGroupsList
                groups={publishedGroups}
                loading={loadingPublished}
                search={publishedSearch}
                setSearch={setPublishedSearch}
                statusFilter={publishedStatusFilter}
                setStatusFilter={setPublishedStatusFilter}
                groupFilter={publishedGroupFilter}
                setGroupFilter={setPublishedGroupFilter}
                examFilter={publishedExamFilter}
                setExamFilter={setPublishedExamFilter}
                onViewGroup={(group) => setSelectedPublishedGroup(group)}
              />
            )}

            {selectedPublishedGroup && !selectedPublishedSection && (
              <PublishedSectionsList
                group={selectedPublishedGroup}
                onBack={() => setSelectedPublishedGroup(null)}
                onViewSection={(sec) => handleViewSection(sec, true)}
              />
            )}

            {selectedPublishedSection && (
              <SectionStudentsView
                section={selectedPublishedSection}
                exam={{ name: selectedPublishedGroup.examName }}
                isPublishedView
                onBack={() => setSelectedPublishedSection(null)}
                onViewStudent={(student) => handleViewStudentMemo(student)}
                onExcel={(rowsToExport) =>
                  exportExcel(
                    rowsToExport || selectedPublishedSection.studentRows || [],
                    `${selectedPublishedGroup.examName}-${selectedPublishedSection.sectionName}`
                  )
                }
              />
            )}
          </>
        )}

        {/* TAB 3: RANK LIST (With Pass/Fail Filter) */}
        {viewMode === "rankList" && !selectedStudentMemo && (
          !resultsGenerated ? (
            <PreGenerateNotice mode="rank" onGoToGenerate={() => setViewMode("table")} />
          ) : (
            <RankListView
              rows={pagedRanks}
              totalRecords={rankListRecords.length}
              search={rankSearch}
              setSearch={setRankSearch}
              filter={rankFilter}
              setFilter={setRankFilter}
              page={rankPage}
              pages={rankPages}
              setPage={setRankPage}
              onViewStudent={(student) => handleViewStudentMemo(student)}
              onExportPreview={() => setShowRankPreview(true)}
              examName={currentExamObj.name}
            />
          )
        )}

        {/* TAB 4: ANALYTICS (Subject Analysis & Passed/Failed Modals) */}
        {viewMode === "analytics" && !selectedStudentMemo && (
          !resultsGenerated ? (
            <PreGenerateNotice mode="analytics" onGoToGenerate={() => setViewMode("table")} />
          ) : (
            <AnalyticsView
              data={analyticsData}
              examName={currentExamObj.name}
              onOpenModal={(type) => setAnalyticsModal(type)}
            />
          )
        )}

        {/* STUDENT MARKS MEMO */}
        {selectedStudentMemo && (
          <StudentMemoView
            student={selectedStudentMemo}
            onBack={() => setSelectedStudentMemo(null)}
            onDownloadPdf={handleDownloadStudentMemo}
            onRevaluation={handleRevaluationSubmit}
          />
        )}

        {/* MODALS */}
        {showRankPreview && (
          <RankPreviewModal
            rows={rankListRecords}
            examName={currentExamObj.name}
            onClose={() => setShowRankPreview(false)}
            onDownload={() => exportExcel(rankListRecords, "Rank-List-Export")}
          />
        )}

        {confirmPublish && (
          <PublishConfirmModal
            confirm={confirmPublish}
            examName={currentExamObj.name}
            onCancel={() => setConfirmPublish(null)}
            onConfirm={confirmActionPublish}
            loading={Boolean(actionLoading)}
          />
        )}

        {analyticsModal && (
          <AnalyticsStudentsModal
            type={analyticsModal}
            rows={analyticsModal === "failed" ? analyticsData.failedList : analyticsData.passedList}
            onClose={() => setAnalyticsModal(null)}
            onViewStudent={(student) => {
              setAnalyticsModal(null);
              handleViewStudentMemo(student);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

/* Pre-generation Empty State Notice */
function PreGenerateNotice({ mode = "results", onGoToGenerate, group, program, exam, readiness, checkingReadiness }) {
  if (mode === "rank") {
    return (
      <div className="cms-card results-pre-generate-card">
        <div className="cms-card-body" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div className="results-pre-generate-icon">
            <Award size={32} color="var(--cms-primary)" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px", color: "var(--cms-text)" }}>
            Overall Rank List Not Generated
          </h3>
          <p style={{ color: "var(--cms-muted)", fontSize: 13, maxWidth: 500, margin: "0 auto 18px", lineHeight: 1.6 }}>
            Overall group ranks and student standings are computed after examination marks are generated. Please go to the <strong>Results Processing</strong> tab and click <strong>Generate Results</strong> for your selected group.
          </p>
          <button className="cms-btn cms-btn-primary" onClick={onGoToGenerate}>
            Go to Results Processing
          </button>
        </div>
      </div>
    );
  }

  if (mode === "analytics") {
    return (
      <div className="cms-card results-pre-generate-card">
        <div className="cms-card-body" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div className="results-pre-generate-icon">
            <BarChart2 size={32} color="var(--cms-primary)" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 6px", color: "var(--cms-text)" }}>
            Subject Performance & Analytics Not Available
          </h3>
          <p style={{ color: "var(--cms-muted)", fontSize: 13, maxWidth: 500, margin: "0 auto 18px", lineHeight: 1.6 }}>
            Pass/fail metrics and subject statistics are analyzed after results are generated. Please go to the <strong>Results Processing</strong> tab and click <strong>Generate Results</strong> first.
          </p>
          <button className="cms-btn cms-btn-primary" onClick={onGoToGenerate}>
            Go to Results Processing
          </button>
        </div>
      </div>
    );
  }

  const dynamicTitle = group?.name
    ? `${group.name}${program?.name ? ` · ${program.name}` : ""} Section-Wise Results`
    : "Group Section-Wise Results";

  const hasBlockers = readiness && (!readiness.canGenerateResults || !readiness.allEvaluationsApproved);
  const blockerText = hasBlockers && readiness.validationBlockers?.length
    ? (Array.isArray(readiness.validationBlockers) ? readiness.validationBlockers.join("; ") : String(readiness.validationBlockers))
    : null;

  return (
    <div className="cms-card">
      <div className="cms-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h3 className="cms-card-title">{dynamicTitle}</h3>
            <p className="cms-subtitle">
              {exam?.name && exam.name !== "Examination" ? `${exam.name} · Active Processing & Publishing` : "Marks Evaluation · Ready for Processing"}
            </p>
          </div>
          <span className="results-status" style={{ background: "var(--cms-subtle, #f1f5f9)", color: "var(--cms-muted, #64748b)" }}>
            PENDING GENERATION
          </span>
        </div>

        <div style={{ textAlign: "center", padding: "36px 20px" }}>
          <div className="results-pre-generate-icon">
            <FileText size={28} color="var(--cms-primary)" />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 6px", color: "var(--cms-text)" }}>
            {group?.name ? `${group.name}${program?.name ? ` (${program.name})` : ""} - Ready to Generate Results` : "Select Filter Details & Generate Results"}
          </h4>
          <p style={{ maxWidth: 560, margin: "0 auto 16px", color: "var(--cms-muted)", fontSize: 13, lineHeight: 1.6 }}>
            Board and Academic Year are automatically fetched. Select the remaining filter details (<strong>Academic Level</strong>, <strong>Group</strong>{program?.name ? <>, <strong>Program</strong></> : ""}, and <strong>Examination</strong>) above, then click <strong>Generate Results</strong> to show approved results from Marks Evaluation.
          </p>
          <div
            className="results-pre-generate-notice"
            style={hasBlockers ? { background: "var(--cms-red-soft, #fef2f2)", borderColor: "rgba(220, 38, 38, 0.25)" } : {}}
          >
            {hasBlockers ? (
              <XCircle size={16} color="var(--cms-red, #dc2626)" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle size={16} color="var(--cms-green)" style={{ flexShrink: 0 }} />
            )}
            <span>
              <strong>Marks Evaluation Approval:</strong>{" "}
              {checkingReadiness ? (
                "Checking marks evaluation approval and result readiness..."
              ) : blockerText ? (
                <span>Evaluation verification warning: {blockerText}</span>
              ) : (
                "Examination marks for all sections under this group must be verified and approved in Marks Evaluation. When you click Generate Results, approved results are immediately processed."
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, disabled, onChange, children }) {
  return (
    <div className="cms-field-group">
      <label className="cms-label">{label}</label>
      <select
        className="cms-select"
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

/* Section Summaries Table for Generated Results */
function SectionsTable({
  summaries,
  exam,
  group,
  program,
  query,
  setQuery,
  onViewSection,
  onPublishSection,
  onPublishGroup,
  onExcel,
}) {
  const filtered = summaries.filter((item) =>
    (item.sectionName || "").toLowerCase().includes(query.toLowerCase())
  );

  const allPublished = summaries.length > 0 && summaries.every((s) => s.resultStatus === "PUBLISHED");

  const dynamicTitle = group?.name
    ? `${group.name}${program?.name ? ` · ${program.name}` : ""} Section-Wise Results`
    : "Group Section-Wise Results";

  return (
    <div className="cms-card">
      <div className="cms-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h3 className="cms-card-title">{dynamicTitle}</h3>
            <p className="cms-subtitle">
              {exam?.name} · Active Processing & Publishing
            </p>
          </div>
          <Badge value={allPublished ? "PUBLISHED" : "GENERATED"} />
        </div>

        <div className="results-table-toolbar">
          <div className="results-table-search">
            <input
              className="cms-input"
              placeholder="Search section..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="results-table-actions">
            <button className="cms-btn cms-btn-ghost" onClick={onExcel}>
              <Download size={14} /> Export Excel
            </button>
            {summaries.length > 0 && (
              <button
                className="cms-btn cms-btn-primary"
                disabled={allPublished}
                onClick={onPublishGroup}
              >
                <Globe size={14} /> {allPublished ? "Group Published" : "Publish Group Results"}
              </button>
            )}
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>SECTION</th>
                <th>IN-CHARGE</th>
                <th>STUDENTS</th>
                <th>PASSED</th>
                <th>FAILED</th>
                <th>PASS %</th>
                <th>AVERAGE %</th>
                <th>RESULT STATUS</th>
                <th style={{ textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((item) => {
                  const isSecPublished = item.resultStatus === "PUBLISHED";
                  return (
                    <tr key={item.sectionId}>
                      <td className="cms-font-semibold">{item.sectionName}</td>
                      <td>{item.inChargeName || "—"}</td>
                      <td className="cms-text-center">{item.studentCount}</td>
                      <td className="cms-text-center" style={{ color: "var(--cms-green)", fontWeight: 700 }}>
                        {item.passed}
                      </td>
                      <td className="cms-text-center" style={{ color: item.failed > 0 ? "var(--cms-red)" : "inherit", fontWeight: item.failed > 0 ? 700 : 400 }}>
                        {item.failed}
                      </td>
                      <td className="cms-text-center">{Number(item.passRate).toFixed(2)}%</td>
                      <td className="cms-text-center">{Number(item.average).toFixed(2)}%</td>
                      <td className="cms-text-center">
                        <Badge value={item.resultStatus} />
                      </td>
                      <td className="cms-text-center">
                        <div className="results-actions">
                          <button
                            className="results-action-btn"
                            title="View Section Students"
                            aria-label="View Section Students"
                            onClick={() => onViewSection(item)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className={`results-action-btn ${isSecPublished ? "results-action-btn-published" : "results-action-btn-publish"}`}
                            title={isSecPublished ? "Section Already Published" : "Publish Section Results"}
                            aria-label="Publish Section Results"
                            disabled={isSecPublished}
                            onClick={() => onPublishSection(item)}
                          >
                            {isSecPublished ? <Check size={15} /> : <Send size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="cms-empty-td">
                    No section result records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Published Groups List (Previous Published Results) */
function PublishedGroupsList({
  groups,
  loading = false,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  groupFilter,
  setGroupFilter,
  examFilter,
  setExamFilter,
  onViewGroup,
}) {
  const groupOptions = useMemo(() => {
    const list = [];
    groups.forEach((g) => {
      if (g.groupName && !list.includes(g.groupName)) {
        list.push(g.groupName);
      }
    });
    return list;
  }, [groups]);

  const examOptions = useMemo(() => {
    const list = [];
    groups.forEach((g) => {
      if (g.examName && !list.includes(g.examName)) {
        list.push(g.examName);
      }
    });
    return list;
  }, [groups]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch =
        !search.trim() ||
        g.examName.toLowerCase().includes(search.toLowerCase()) ||
        g.groupName.toLowerCase().includes(search.toLowerCase()) ||
        g.programName.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (groupFilter && groupFilter !== "all") {
        const matchGroup =
          g.groupName.toLowerCase().includes(groupFilter.toLowerCase()) ||
          (g.groupCode && g.groupCode.toLowerCase() === groupFilter.toLowerCase());
        if (!matchGroup) return false;
      }

      if (examFilter && examFilter !== "all") {
        const matchExam =
          g.examName.toLowerCase().includes(examFilter.toLowerCase()) ||
          String(g.examId) === String(examFilter);
        if (!matchExam) return false;
      }

      if (statusFilter === "high_pass") return g.passRate >= 85;
      if (statusFilter === "low_pass") return g.passRate < 85;
      return true;
    });
  }, [groups, search, groupFilter, examFilter, statusFilter]);

  return (
    <div className="cms-card">
      <div className="cms-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h3 className="cms-card-title">Previous Published Examination Results</h3>
            <p className="cms-subtitle">
              Group-wise history of published examination results accessible by students
            </p>
          </div>
          <Badge value="PUBLISHED" />
        </div>

        <div className="results-table-toolbar results-published-toolbar">
          <div className="results-published-search">
            <input
              className="cms-input"
              placeholder="Search exam, group, program..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="results-table-actions results-published-filters">
            <select
              className="cms-select results-filter-select"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label="Filter by Group"
            >
              <option value="all">All Groups</option>
              {groupOptions.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>

            <select
              className="cms-select results-filter-select"
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              aria-label="Filter by Examination"
            >
              <option value="all">All Examinations</option>
              {examOptions.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>

            <select
              className="cms-select results-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Pass Rate"
            >
              <option value="all">All Published Exams</option>
              <option value="high_pass">High Pass Rate (≥ 85%)</option>
              <option value="low_pass">Needs Attention (&lt; 85%)</option>
            </select>
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>EXAM NAME</th>
                <th>GROUP</th>
                <th>PROGRAM</th>
                <th>ACADEMIC YEAR</th>
                <th>TOTAL STUDENTS</th>
                <th>PASSED</th>
                <th>FAILED</th>
                <th>PASS %</th>
                <th>STATUS</th>
                <th style={{ textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((item) => (
                  <tr key={item.publishedId}>
                    <td className="cms-font-semibold">{item.examName}</td>
                    <td>{item.groupName}</td>
                    <td>{item.programName}</td>
                    <td className="cms-text-center">{item.academicYear}</td>
                    <td className="cms-text-center">{item.totalStudents}</td>
                    <td className="cms-text-center" style={{ color: "var(--cms-green)", fontWeight: 700 }}>
                      {item.passed}
                    </td>
                    <td className="cms-text-center" style={{ color: item.failed > 0 ? "var(--cms-red)" : "inherit", fontWeight: item.failed > 0 ? 700 : 400 }}>
                      {item.failed}
                    </td>
                    <td className="cms-text-center">{Number(item.passRate).toFixed(2)}%</td>
                    <td className="cms-text-center">
                      <Badge value="PUBLISHED" />
                    </td>
                    <td className="cms-text-center">
                      <button
                        className="cms-btn cms-btn-ghost"
                        style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                        onClick={() => onViewGroup(item)}
                      >
                        <Eye size={14} /> View Sections
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="cms-empty-td">
                    {loading ? "Loading published examination results from database..." : "No published exam results match your filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Sections List for a Selected Published Group */
function PublishedSectionsList({ group, onBack, onViewSection }) {
  return (
    <div className="cms-card">
      <div className="cms-card-body">
        <button className="cms-btn cms-btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
          <ArrowLeft size={14} /> Back to Published Groups
        </button>

        <div className="results-detail-context" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{group.examName}</h3>
            <Badge value="PUBLISHED" />
          </div>
          <span>
            Group: <strong>{group.groupName}</strong> · Program: <strong>{group.programName}</strong> · Academic Year: <strong>{group.academicYear}</strong> · Total Sections: <strong>{group.sections?.length || 0}</strong>
          </span>
        </div>

        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>SECTION NAME</th>
                <th>IN-CHARGE FACULTY</th>
                <th>STUDENTS COUNT</th>
                <th>PASSED</th>
                <th>FAILED</th>
                <th>PASS %</th>
                <th>AVERAGE %</th>
                <th>STATUS</th>
                <th style={{ textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {group.sections?.length ? (
                group.sections.map((sec) => (
                  <tr key={sec.sectionId}>
                    <td className="cms-font-semibold">{sec.sectionName}</td>
                    <td>{sec.inChargeName}</td>
                    <td className="cms-text-center">{sec.studentCount}</td>
                    <td className="cms-text-center" style={{ color: "var(--cms-green)", fontWeight: 700 }}>
                      {sec.passed}
                    </td>
                    <td className="cms-text-center" style={{ color: sec.failed > 0 ? "var(--cms-red)" : "inherit", fontWeight: sec.failed > 0 ? 700 : 400 }}>
                      {sec.failed}
                    </td>
                    <td className="cms-text-center">{Number(sec.passRate).toFixed(2)}%</td>
                    <td className="cms-text-center">{Number(sec.average).toFixed(2)}%</td>
                    <td className="cms-text-center">
                      <Badge value="PUBLISHED" />
                    </td>
                    <td className="cms-text-center">
                      <button
                        className="cms-btn cms-btn-ghost"
                        style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                        onClick={() => onViewSection(sec)}
                      >
                        <Eye size={14} /> View Student Results
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="cms-empty-td">
                    No section result records found for this published group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Student Results View for a Section */
function SectionStudentsView({
  section,
  exam,
  isPublishedView = false,
  onBack,
  onViewStudent,
  onExcel,
}) {
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [page, setPage] = useState(1);

  const students = section?.studentRows || [];

  // Dynamic Subject Definitions from API / Section data
  const subjects = useMemo(() => {
    if (section?.subjectDefinitions?.length) {
      return section.subjectDefinitions.map((sub, i) => ({
        subjectId: sub.subjectId || sub.id || i + 1,
        shortName: sub.shortName || sub.code || sub.subjectCode || sub.subjectName || `SUB${i + 1}`,
        subjectName: sub.subjectName || sub.name || sub.shortName,
        maxMarks: sub.maxMarks ?? sub.maximumMarks ?? 100
      }));
    }
    const sample = students[0];
    if (sample?.subjects?.length) {
      return sample.subjects.map((sub, i) => ({
        subjectId: sub.subjectId || sub.id || i + 1,
        shortName: sub.shortName || sub.code || sub.subjectCode || sub.subjectName || `SUB${i + 1}`,
        subjectName: sub.subjectName || sub.name || sub.shortName,
        maxMarks: sub.maxMarks ?? sub.maximumMarks ?? 100
      }));
    }
    return [];
  }, [section, students]);

  const filtered = useMemo(() => {
    return students.filter((item) => {
      const matchQuery =
        !query.trim() ||
        (item.studentName && item.studentName.toLowerCase().includes(query.toLowerCase())) ||
        (item.rollNo && item.rollNo.toLowerCase().includes(query.toLowerCase())) ||
        (item.result && item.result.toLowerCase().includes(query.toLowerCase()));

      if (!matchQuery) return false;

      if (resultFilter === "PASS") {
        return String(item.result || "").toUpperCase() === "PASS";
      }
      if (resultFilter === "FAIL") {
        return String(item.result || "").toUpperCase() === "FAIL";
      }
      return true;
    });
  }, [students, query, resultFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="cms-card results-section-detail">
      <div className="cms-card-body">
        <button className="cms-btn cms-btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
          <ArrowLeft size={14} /> {isPublishedView ? "Back to Group Sections" : "Back to Sections"}
        </button>

        <div className="results-detail-context" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 15 }}>{exam?.name}</strong>
            <Badge value={section.resultStatus || "PUBLISHED"} />
          </div>
          <span>
            Section: <strong>{section.sectionName}</strong> · In-Charge: <strong>{section.inChargeName}</strong> · Total Students: <strong>{students.length}</strong> · Passed: <strong>{section.passed}</strong> · Failed: <strong>{section.failed}</strong>
          </span>
        </div>

        <div className="results-table-toolbar results-section-toolbar">
          <div className="results-table-search results-section-search">
            <input
              className="cms-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, roll number, grade, result..."
            />
          </div>
          <div className="results-table-actions results-section-actions">
            <select
              className="cms-select results-student-filter-select"
              value={resultFilter}
              onChange={(e) => {
                setResultFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Result"
            >
              <option value="all">Select Result</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
            </select>
            <button className="cms-btn cms-btn-ghost" onClick={() => onExcel(filtered)}>
              <Download size={14} /> Export Excel
            </button>
          </div>
        </div>

        <div className="cms-table-wrap results-section-table-wrap">
          <table className="cms-table results-section-table">
            <thead>
              <tr>
                <th>ROLL NO</th>
                <th>STUDENT NAME</th>
                {subjects.map((sub) => (
                  <th key={sub.subjectId} style={{ textAlign: "center" }}>{sub.shortName}</th>
                ))}
                <th style={{ textAlign: "center" }}>TOTAL / MAX</th>
                <th style={{ textAlign: "center" }}>PERCENTAGE</th>
                <th style={{ textAlign: "center" }}>GRADE</th>
                <th style={{ textAlign: "center" }}>RESULT</th>
                <th style={{ textAlign: "center" }}>SECTION RANK</th>
                <th style={{ textAlign: "center" }}>STATUS</th>
                <th style={{ textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length ? (
                pagedRows.map((item) => (
                  <tr key={item.studentId}>
                    <td>{item.rollNo}</td>
                    <td className="cms-font-semibold">{item.studentName}</td>
                    {subjects.map((sub) => {
                      const markObj = item.subjects?.find((s) => s.subjectId === sub.subjectId || s.shortName === sub.shortName);
                      const markVal = markObj ? markObj.obtainedMarks : "—";
                      const isFail = markObj && Number(markObj.obtainedMarks) < 35;
                      return (
                        <td
                          className="cms-text-center"
                          key={sub.subjectId}
                          style={{ color: isFail ? "var(--cms-red)" : "inherit", fontWeight: isFail ? 700 : 400 }}
                        >
                          {markVal}
                        </td>
                      );
                    })}
                    <td className="cms-text-center">
                      {item.total} / {item.maximum}
                    </td>
                    <td className="cms-text-center">{Number(item.percentage).toFixed(2)}%</td>
                    <td className="cms-text-center">{item.grade}</td>
                    <td className="cms-text-center">
                      <span className={`results-status ${item.result === "PASS" ? "results-status-published" : "results-status-failed"}`}>
                        {item.result}
                      </span>
                    </td>
                    <td className="cms-text-center">#{item.sectionRank}</td>
                    <td className="cms-text-center">
                      <Badge value={item.publicationStatus || section.resultStatus} />
                    </td>
                    <td className="cms-text-center">
                      <button
                        className="results-action-btn"
                        title="View Marks Memo"
                        aria-label="View Marks Memo"
                        onClick={() => onViewStudent(item)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8 + subjects.length} className="cms-empty-td">
                    No student result records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}

/* Rank List View with Pass/Fail Filter */
function RankListView({
  rows,
  totalRecords,
  search,
  setSearch,
  filter,
  setFilter,
  page,
  pages,
  setPage,
  onViewStudent,
  onExportPreview,
  examName,
}) {
  return (
    <div className="cms-card results-rank-card">
      <div className="cms-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 className="cms-card-title">Overall Rank List</h3>
            <p className="cms-subtitle">{examName} · Rank Standings</p>
          </div>
          <span style={{ fontSize: 13, color: "var(--cms-muted)", fontWeight: 600 }}>
            Total Records: {totalRecords}
          </span>
        </div>

        <div className="results-rank-toolbar" style={{ marginBottom: 14 }}>
          <div className="results-rank-search">
            <input
              className="cms-input"
              placeholder="Search rank, student, roll number or section..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="cms-field-group" style={{ width: 180 }}>
            <select
              className="cms-select"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Results (Pass & Fail)</option>
              <option value="pass">Passed Students Only</option>
              <option value="fail">Failed Students Only</option>
            </select>
          </div>
          <div className="results-rank-toolbar-spacer" />
          <button
            className="cms-btn cms-btn-ghost"
            disabled={!rows.length}
            onClick={onExportPreview}
          >
            <Download size={14} /> Export Rank List
          </button>
        </div>

        <div className="cms-table-wrap results-rank-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>EXAMINATION</th>
                <th>ROLL NO</th>
                <th>STUDENT NAME</th>
                <th>SECTION</th>
                <th style={{ textAlign: "center" }}>TOTAL MARKS</th>
                <th style={{ textAlign: "center" }}>PERCENTAGE</th>
                <th style={{ textAlign: "center" }}>GRADE</th>
                <th style={{ textAlign: "center" }}>RESULT</th>
                <th style={{ textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((item) => (
                  <tr key={item.studentId}>
                    <td className="cms-font-semibold" style={{ color: item.rank <= 3 ? "var(--cms-primary)" : "inherit" }}>
                      #{item.rank}
                    </td>
                    <td>{item.examinationName}</td>
                    <td>{item.rollNo}</td>
                    <td className="cms-font-semibold">{item.studentName}</td>
                    <td>{item.sectionName}</td>
                    <td className="cms-text-center">{item.total}</td>
                    <td className="cms-text-center">{Number(item.percentage).toFixed(2)}%</td>
                    <td className="cms-text-center">{item.grade}</td>
                    <td className="cms-text-center">
                      <span className={`results-status ${item.result === "PASS" ? "results-status-published" : "results-status-failed"}`}>
                        {item.result}
                      </span>
                    </td>
                    <td className="cms-text-center">
                      <button
                        className="results-action-btn"
                        title="View Marks Memo"
                        aria-label="View Marks Memo"
                        onClick={() => onViewStudent(item)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="cms-empty-td">
                    No rank records match your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} setPage={setPage} />
      </div>
    </div>
  );
}

/* Analytics View with Passed/Failed Modals and Subject Performance */
function AnalyticsView({ data, examName, onOpenModal }) {
  return (
    <div>
      {/* Overview Stat Cards */}
      <div className="results-analytics-grid">
        <div className="results-analytics-card">
          <span>TOTAL STUDENTS</span>
          <strong>{data.totalStudents}</strong>
        </div>

        <button
          type="button"
          className="results-analytics-card results-analytics-card-button"
          onClick={() => onOpenModal("passed")}
        >
          <span style={{ color: "var(--cms-green)", display: "flex", alignItems: "center", gap: 4 }}>
            <UserCheck size={14} /> PASSED STUDENTS
          </span>
          <strong style={{ color: "var(--cms-green)" }}>{data.passedCount}</strong>
          <small style={{ fontSize: 10, color: "var(--cms-muted)" }}>Click to view passed list →</small>
        </button>

        <button
          type="button"
          className="results-analytics-card results-analytics-card-button"
          onClick={() => onOpenModal("failed")}
        >
          <span style={{ color: "var(--cms-red)", display: "flex", alignItems: "center", gap: 4 }}>
            <UserX size={14} /> FAILED STUDENTS
          </span>
          <strong style={{ color: "var(--cms-red)" }}>{data.failedCount}</strong>
          <small style={{ fontSize: 10, color: "var(--cms-muted)" }}>Click to view failed list →</small>
        </button>

        <div className="results-analytics-card">
          <span>PASS PERCENTAGE</span>
          <strong>{data.passPercentage}%</strong>
        </div>

        <div className="results-analytics-card">
          <span>CLASS AVERAGE</span>
          <strong>{data.averageScore}%</strong>
        </div>
      </div>

      {/* Subject Performance Section */}
      <div className="cms-card">
        <div className="cms-card-body">
          <div className="results-analytics-heading">
            <div>
              <h3 className="cms-card-title">Subject Performance Analysis</h3>
              <p className="cms-subtitle">Subject-wise mean scores, highest/lowest marks and pass percentages</p>
            </div>
            <span className="results-analytics-exam-name">{examName}</span>
          </div>

          <div className="cms-table-wrap">
            <table className="cms-table results-subject-performance-table">
              <thead>
                <tr>
                  <th>SUBJECT NAME</th>
                  <th style={{ textAlign: "center" }}>TOTAL STUDENTS</th>
                  <th style={{ textAlign: "center" }}>AVERAGE SCORE</th>
                  <th style={{ textAlign: "center" }}>HIGHEST MARKS</th>
                  <th style={{ textAlign: "center" }}>LOWEST MARKS</th>
                  <th style={{ textAlign: "center" }}>PASS %</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectPerformance?.length ? (
                  data.subjectPerformance.map((sub) => (
                    <tr key={sub.subjectId}>
                      <td className="cms-font-semibold">{sub.subjectName}</td>
                      <td className="cms-text-center">{sub.totalStudents}</td>
                      <td className="cms-text-center">{sub.average}%</td>
                      <td className="cms-text-center" style={{ color: "var(--cms-green)", fontWeight: 700 }}>
                        {sub.highest}
                      </td>
                      <td className="cms-text-center" style={{ color: sub.lowest < 35 ? "var(--cms-red)" : "inherit" }}>
                        {sub.lowest}
                      </td>
                      <td className="cms-text-center" style={{ fontWeight: 700 }}>
                        {sub.passPercentage}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="cms-empty-td">
                      No subject analytics records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Student Marks Memo View */
function StudentMemoView({ student, onBack, onDownloadPdf, onRevaluation }) {
  const subjects = student?.subjects ?? [];
  return (
    <div className="cms-card">
      <div className="cms-card-body">
        <button className="cms-btn cms-btn-ghost" style={{ marginBottom: 14 }} onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h3 className="cms-card-title">Student Marks Memo & Transcript</h3>
            <p className="cms-subtitle">
              {student?.studentName} · Roll: {student?.rollNo} · Exam: {student?.examinationName}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {onDownloadPdf && (
              <button
                className="cms-btn cms-btn-ghost"
                style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                onClick={() => onDownloadPdf(student)}
              >
                <Download size={14} /> Download PDF Memo
              </button>
            )}
            <Badge value={student?.publicationStatus || "PUBLISHED"} />
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>SUBJECT NAME</th>
                <th style={{ textAlign: "center" }}>INTERNAL</th>
                <th style={{ textAlign: "center" }}>PRACTICAL</th>
                <th style={{ textAlign: "center" }}>THEORY</th>
                <th style={{ textAlign: "center" }}>TOTAL MARKS</th>
                <th style={{ textAlign: "center" }}>GRADE</th>
                <th style={{ textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length ? (
                subjects.map((sub) => {
                  const mark = sub.obtainedMarks;
                  const isFail = mark < 35;
                  return (
                    <tr key={sub.subjectId}>
                      <td className="cms-font-semibold">{sub.subjectName}</td>
                      <td className="cms-text-center">{sub.internalMarks ?? "—"}</td>
                      <td className="cms-text-center">{sub.practicalMarks ?? "—"}</td>
                      <td className="cms-text-center">{sub.theoryMarks ?? "—"}</td>
                      <td className="cms-text-center" style={{ fontWeight: 700, color: isFail ? "var(--cms-red)" : "inherit" }}>
                        {mark} / {sub.maxMarks || 100}
                      </td>
                      <td className="cms-text-center">{sub.grade || "—"}</td>
                      <td className="cms-text-center">
                        <span className={`results-status ${isFail ? "results-status-failed" : "results-status-published"}`}>
                          {isFail ? "FAIL" : "PASS"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="cms-empty-td">
                    No subject marks available for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cms-memo-summary">
          <Summary label="Grand Total / Maximum" value={`${student.total || 0} / ${student.maximum || 0}`} />
          <Summary label="Percentage" value={`${Number(student.percentage || 0).toFixed(2)}%`} />
          <Summary label="Pass Percentage" value={`${student.passPercentage || 35}%`} />
          <Summary label="Overall Grade" value={student.grade || "—"} />
          <Summary label="Final Result" value={student.result || "—"} />
          <Summary label="Section Rank" value={student.sectionRank ? `#${student.sectionRank}` : "—"} />
          <Summary label="Group Rank" value={student.groupRank ? `#${student.groupRank}` : "—"} />
          <Summary label="Publication Status" value={student.publicationStatus || "PUBLISHED"} />
        </div>
      </div>
    </div>
  );
}

/* Analytics Students Modal (For Failed or Passed Students) */
function AnalyticsStudentsModal({ type, rows, onClose, onViewStudent }) {
  const [page, setPage] = useState(1);
  const isFailed = type === "failed";
  const pages = Math.max(1, Math.ceil(rows.length / ANALYTICS_MODAL_PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * ANALYTICS_MODAL_PAGE_SIZE, page * ANALYTICS_MODAL_PAGE_SIZE);

  return (
    <div className="cms-modal-overlay results-analytics-modal-overlay" onClick={onClose}>
      <div className="cms-modal-content results-analytics-modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="cms-modal-header">
          <h3 className="cms-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isFailed ? <UserX size={17} color="var(--cms-red)" /> : <UserCheck size={17} color="var(--cms-green)" />}
            {isFailed ? "Failed Students List" : "Passed Students List"} ({rows.length})
          </h3>
          <button className="cms-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="cms-modal-body">
          {rows.length === 0 ? (
            <p className="results-analytics-empty">No students found for this status.</p>
          ) : (
            <>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>ROLL NO</th>
                      <th>STUDENT NAME</th>
                      <th>SECTION</th>
                      <th style={{ textAlign: "center" }}>TOTAL</th>
                      <th style={{ textAlign: "center" }}>PERCENTAGE</th>
                      <th style={{ textAlign: "center" }}>RESULT</th>
                      <th style={{ textAlign: "center" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((item) => (
                      <tr key={item.studentId}>
                        <td>{item.rollNo}</td>
                        <td className="cms-font-semibold">{item.studentName}</td>
                        <td>{item.sectionName}</td>
                        <td className="cms-text-center">{item.total}</td>
                        <td className="cms-text-center">{Number(item.percentage).toFixed(2)}%</td>
                        <td className="cms-text-center">
                          <span className={`results-status ${isFailed ? "results-status-failed" : "results-status-published"}`}>
                            {item.result}
                          </span>
                        </td>
                        <td className="cms-text-center">
                          <button
                            className="results-action-btn"
                            title="View Memo"
                            onClick={() => onViewStudent(item)}
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pages={pages}
                setPage={setPage}
                className="results-analytics-modal-pagination"
                btnClassName="results-analytics-btn-compact"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Rank List Export Preview Modal */
function RankPreviewModal({ rows, examName, onClose, onDownload }) {
  const [modalPage, setModalPage] = useState(1);
  const modalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((modalPage - 1) * PAGE_SIZE, modalPage * PAGE_SIZE);

  return (
    <div className="cms-modal-overlay" onClick={onClose}>
      <div className="cms-modal-content" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
        <div className="cms-modal-header">
          <div>
            <h3 className="cms-modal-title">Rank List Export Preview</h3>
            <span style={{ fontSize: 11, color: "var(--cms-muted)" }}>
              {rows.length} records ready for download · {examName}
            </span>
          </div>
          <button className="cms-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="cms-modal-body">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>ROLL NO</th>
                  <th>STUDENT NAME</th>
                  <th>SECTION</th>
                  <th style={{ textAlign: "center" }}>TOTAL</th>
                  <th style={{ textAlign: "center" }}>PERCENT %</th>
                  <th style={{ textAlign: "center" }}>GRADE</th>
                  <th style={{ textAlign: "center" }}>RESULT</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((item) => (
                  <tr key={item.studentId}>
                    <td className="cms-font-semibold">#{item.rank}</td>
                    <td>{item.rollNo}</td>
                    <td>{item.studentName}</td>
                    <td>{item.sectionName}</td>
                    <td className="cms-text-center">{item.total}</td>
                    <td className="cms-text-center">{Number(item.percentage).toFixed(2)}%</td>
                    <td className="cms-text-center">{item.grade}</td>
                    <td className="cms-text-center">
                      <span className={`results-status ${item.result === "PASS" ? "results-status-published" : "results-status-failed"}`}>
                        {item.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {modalPages > 1 && <Pagination page={modalPage} pages={modalPages} setPage={setModalPage} />}
        </div>

        <div className="cms-modal-footer">
          <button className="cms-btn cms-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cms-btn cms-btn-primary"
            onClick={() => {
              onDownload();
              onClose();
            }}
          >
            Download Excel File
          </button>
        </div>
      </div>
    </div>
  );
}

/* Publish Confirmation Modal */
function PublishConfirmModal({ confirm, examName, onCancel, onConfirm, loading }) {
  const isSection = confirm.type === "section";
  const sectionData = confirm.data;

  return (
    <div className="cms-modal-overlay">
      <div className="cms-modal-content" style={{ maxWidth: 480 }}>
        <div className="cms-modal-header">
          <h3 className="cms-modal-title">
            {isSection ? "Publish Section Results?" : "Publish Group Results?"}
          </h3>
          <button className="cms-modal-close" disabled={loading} onClick={onCancel}>×</button>
        </div>
        <div className="cms-modal-body">
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--cms-text)" }}>
            Examination: <strong>{examName}</strong>
            <br />
            {isSection ? (
              <>
                Target Section: <strong>{sectionData?.sectionName}</strong>
                <br />
                Total Students in Section: <strong>{sectionData?.studentCount}</strong>
              </>
            ) : (
              <>
                Target Sections: <strong>All Sections in Group</strong>
                <br />
                Total Students: <strong>{sectionData?.reduce((s, i) => s + (Number(i.studentCount) || 0), 0)}</strong>
              </>
            )}
            <br />
            <span style={{ display: "block", marginTop: 10, color: "var(--cms-muted)", fontSize: 12 }}>
              Publishing will allow enrolled students to immediately view their marks, ranks, and transcripts online.
            </span>
          </p>
        </div>
        <div className="cms-modal-footer">
          <button className="cms-btn cms-btn-secondary" disabled={loading} onClick={onCancel}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary" disabled={loading} onClick={onConfirm}>
            {loading ? "Publishing..." : "Confirm & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Shared Pagination Component */
function Pagination({ page, pages, setPage, className = "", btnClassName = "" }) {
  return (
    <div className={`results-pagination ${className}`.trim()}>
      <button
        className={`cms-btn cms-btn-ghost ${btnClassName}`.trim()}
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span className="results-page-label">
        Page {page} of {pages}
      </span>
      <button
        className={`cms-btn cms-btn-ghost ${btnClassName}`.trim()}
        disabled={page === pages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

/* Badge Component */
function Badge({ value }) {
  const status = String(value || "GENERATED").toUpperCase();
  let cls = "results-status-generated";
  if (status === "PUBLISHED") cls = "results-status-published";
  if (status === "FAILED") cls = "results-status-failed";
  return <span className={`results-status ${cls}`}>{status}</span>;
}

/* Summary Box Helper */
function Summary({ label, value }) {
  return (
    <div>
      <div className="cms-summary-label">{label}</div>
      <div className="cms-summary-val">{value}</div>
    </div>
  );
}