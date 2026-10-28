// Isolated Exam Cell screen. Shared services and reference styles retain existing contracts.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layout/ExamCellPageLayout.jsx";
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
import { useCampusContext } from "@/context/CampusContext.jsx";
import "@/modules/admin/AdminResults/ResultProcessingPage.css";

const PAGE_SIZE = 10;
const ANALYTICS_MODAL_PAGE_SIZE = 10;

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

export default function ResultProcessingPage({ initialView = "table", pageTitle = "Results", pageSubtitle = "Generate, inspect and analyze examination results." }) {
  const {
    campuses: contextCampuses = [],
    activeCampuses = [],
    selectedCampus = null,
    selectedCampusId = null,
  } = useCampusContext();

  const {
    boards: contextBoards = [],
    selectedBoard,
    selectedBoardId,
    setSelectedBoard,
    academicYears: contextAcademicYears = [],
    selectedAcademicYear,
    selectedAcademicYearId,
    setSelectedAcademicYear,
  } = useAcademicContext();

  const emptyFilters = { board: "", year: "", level: "", group: "", program: "", exam: "" };
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [viewMode, setViewMode] = useState(initialView);

  useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);

  // Cascading Master Data State
  const [campusesList, setCampusesList] = useState([]);
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
  const publishedGroupsRef = useRef(publishedGroups);
  const publishedGroupsCampusRef = useRef(null);
  const publishedFetchSequenceRef = useRef(0);
  useEffect(() => {
    publishedGroupsRef.current = publishedGroups;
  }, [publishedGroups]);

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
  const [selectedAnalyticsExamKey, setSelectedAnalyticsExamKey] = useState("");
  const [analyticsGroupFilter, setAnalyticsGroupFilter] = useState("all");
  const [selectedExamAnalyticsApiData, setSelectedExamAnalyticsApiData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  const effectiveCampuses = useMemo(() => {
    if (campusesList.length > 0) return campusesList;
    if (Array.isArray(activeCampuses) && activeCampuses.length > 0) return activeCampuses;
    return (contextCampuses || []).filter((c) => c && c.isActive !== false && String(c.status || "").toLowerCase() !== "inactive");
  }, [campusesList, activeCampuses, contextCampuses]);

  const effectiveCampus = useMemo(() => {
    if (!effectiveCampuses.length) return selectedCampus || null;
    const targetId = String(selectedCampusId ?? selectedCampus?.id ?? selectedCampus?.campusId ?? "");
    return (
      effectiveCampuses.find((c) => String(c.id) === targetId || String(c.campusId) === targetId) ||
      effectiveCampuses.find((c) => c.isHQ) ||
      effectiveCampuses[0] ||
      selectedCampus ||
      null
    );
  }, [effectiveCampuses, selectedCampusId, selectedCampus]);

  const effectiveCampusId = useMemo(() => {
    if (!effectiveCampus) return String(selectedCampusId || "1");
    return String(effectiveCampus.campusId ?? effectiveCampus.id);
  }, [effectiveCampus, selectedCampusId]);

  const publishedRequestCampusRef = useRef(effectiveCampusId);

  const campusAffiliatedBoardIds = useMemo(() => {
    if (!effectiveCampus) return [];
    const ids = new Set();
    if (Array.isArray(effectiveCampus.boardIds)) {
      effectiveCampus.boardIds.forEach((id) => {
        const str = String(id ?? "");
        if (str) ids.add(str);
      });
    }
    if (Array.isArray(effectiveCampus.affiliatedBoards)) {
      effectiveCampus.affiliatedBoards.forEach((b) => {
        const bId = String(b.boardId ?? b.id ?? "");
        if (bId) ids.add(bId);
      });
    }
    return Array.from(ids);
  }, [effectiveCampus]);

  const campusBoards = useMemo(() => {
    const masterBoardsPool = boards.length > 0 ? boards : (contextBoards.length > 0 ? contextBoards : []);
    if (!effectiveCampus) return masterBoardsPool;

    const affiliated = Array.isArray(effectiveCampus.affiliatedBoards) && effectiveCampus.affiliatedBoards.length > 0
      ? effectiveCampus.affiliatedBoards
      : [];
    const boardIds = campusAffiliatedBoardIds;

    if (!affiliated.length && !boardIds.length) {
      return masterBoardsPool;
    }

    const matched = masterBoardsPool.filter((b) => {
      const bId = String(b.id ?? b.boardId);
      const bCode = String(b.code || b.boardCode || "").trim().toLowerCase();
      const bName = String(b.name || b.boardName || "").trim().toLowerCase();

      const matchesAffiliated = affiliated.some((aff) => {
        const affId = String(aff.boardId ?? aff.id);
        const affCode = String(aff.boardCode ?? aff.code ?? "").trim().toLowerCase();
        const affName = String(aff.boardName ?? aff.name ?? "").trim().toLowerCase();
        return (affId && affId === bId) || (affCode && affCode === bCode) || (affName && affName === bName);
      });

      const matchesId = boardIds.length > 0 && boardIds.includes(bId);
      return matchesAffiliated || matchesId;
    });

    if (matched.length > 0) return matched;

    if (affiliated.length > 0) {
      return affiliated.map((item) => ({
        ...item,
        id: String(item.boardId ?? item.id),
        boardId: String(item.boardId ?? item.id),
        name: item.boardName ?? item.name,
        boardName: item.boardName ?? item.name,
        code: item.boardCode ?? item.code ?? "",
        isActive: true,
      }));
    }

    return masterBoardsPool;
  }, [boards, contextBoards, effectiveCampus, campusAffiliatedBoardIds]);

  // 1. Fetch Active Boards and Campuses on Mount
  useEffect(() => {
    const fetchActiveBoardsAndCampuses = async () => {
      try {
        const [boardsRes, campusesRes] = await Promise.allSettled([
          apiClient.get("/api/v1/boards"),
          apiClient.get("/api/v1/campuses", { params: { isActive: true } }),
        ]);

        if (campusesRes.status === "fulfilled") {
          const rawC = unwrap(campusesRes.value);
          const loadedCampuses = (Array.isArray(rawC) ? rawC : []).map((c) => ({
            ...c,
            id: String(c.campusId ?? c.id),
            campusId: String(c.campusId ?? c.id),
            name: c.campusName ?? c.name,
            isActive: c.isActive !== false,
          })).filter((c) => c.id && c.isActive);
          if (loadedCampuses.length > 0) setCampusesList(loadedCampuses);
        }

        if (boardsRes.status === "fulfilled") {
          const items = boardsRes.value.data?.items || boardsRes.value.data || [];
          const activeBoards = items.filter((b) => b.status === true || b.isActive === true);
          const resolvedBoards = activeBoards.length > 0 ? activeBoards : (selectedBoard ? [{ boardId: selectedBoard.id, boardName: selectedBoard.name || selectedBoard.boardName, isActive: true }] : []);
          setBoards(resolvedBoards);
          const pool = campusBoards.length > 0 ? campusBoards : resolvedBoards;
          const matched = pool.find((b) => matchesBoard(b, selectedBoardId, selectedBoard)) || pool[0];
          if (matched) {
            setFilters((f) => ({ ...f, board: String(matched.boardId || matched.id) }));
          }
        }
      } catch (err) {
        showToast("Failed to load active academic boards.", "error");
      }
    };
    fetchActiveBoardsAndCampuses();
  }, [showToast, selectedBoardId, selectedBoard, matchesBoard]);

  // Sync board when navbar selected board or campusBoards changes
  useEffect(() => {
    const pool = campusBoards.length > 0 ? campusBoards : boards;
    if (!pool.length) return;
    const matched = pool.find((b) => matchesBoard(b, selectedBoardId, selectedBoard)) || pool[0];
    if (matched) {
      const bId = String(matched.boardId || matched.id);
      setFilters((f) => (f.board === bId ? f : { ...f, board: bId }));
    }
  }, [campusBoards, boards, selectedBoardId, selectedBoard, matchesBoard]);

  // 1. Campus Change -> Cascade Board Change
  const prevCampusIdRef = useRef(effectiveCampusId);
  useEffect(() => {
    if (!effectiveCampusId || !campusBoards.length) return;

    const isCampusSwitched = prevCampusIdRef.current !== effectiveCampusId;
    prevCampusIdRef.current = effectiveCampusId;

    const currentBoardId = String(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId ?? "");
    const isCurrentValid = currentBoardId && (
      (campusAffiliatedBoardIds.length > 0 && campusAffiliatedBoardIds.includes(currentBoardId)) ||
      campusBoards.some((b) => String(b.id ?? b.boardId) === currentBoardId)
    );

    if (!isCurrentValid || (isCampusSwitched && campusAffiliatedBoardIds.length > 0 && !campusAffiliatedBoardIds.includes(currentBoardId))) {
      const nextBoard = campusBoards[0];
      if (nextBoard && typeof setSelectedBoard === "function") {
        setSelectedBoard(nextBoard);
      }
      if (nextBoard) {
        setFilters((prev) => ({
          ...prev,
          board: String(nextBoard.boardId || nextBoard.id),
          year: String(selectedAcademicYearId || selectedAcademicYear?.id || prev.year || ""),
          level: "",
          group: "",
          program: "",
          exam: "",
        }));
      }
    }
  }, [effectiveCampusId, campusBoards, campusAffiliatedBoardIds, selectedBoardId, selectedBoard, setSelectedBoard]);

  // 2. Board Change -> Cascade Academic Year Change
  const prevBoardIdRef = useRef(String(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId ?? ""));
  useEffect(() => {
    const currentBoardId = String(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId ?? "");
    if (!currentBoardId) return;

    const isBoardSwitched = prevBoardIdRef.current !== currentBoardId;
    prevBoardIdRef.current = currentBoardId;

    const masterYears = academicYears.length > 0 ? academicYears : (contextAcademicYears.length > 0 ? contextAcademicYears : []);
    const boardYears = masterYears.filter((y) => {
      const yBoardId = String(y.boardId ?? y.BoardId ?? "");
      return !yBoardId || yBoardId === currentBoardId;
    });

    if (boardYears.length === 0) return;

    const currentYearId = String(selectedAcademicYearId ?? selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId ?? "");
    const isCurrentYearValid = currentYearId && boardYears.some((y) => String(y.id ?? y.academicYearId) === currentYearId);

    if (!isCurrentYearValid || isBoardSwitched) {
      const currentYearName = String(selectedAcademicYear?.name || selectedAcademicYear?.academicYearName || selectedAcademicYear?.code || "").trim();
      const matchingByName = currentYearName
        ? boardYears.find((y) => String(y.name || y.academicYearName || y.code || "").trim().toLowerCase() === currentYearName.toLowerCase())
        : null;
      const nextYear = matchingByName || boardYears.find((y) => y.isActive !== false) || boardYears[0];

      if (nextYear && typeof setSelectedAcademicYear === "function") {
        setSelectedAcademicYear(nextYear);
      }
      if (nextYear) {
        setFilters((prev) => ({
          ...prev,
          year: String(nextYear.academicYearId || nextYear.id),
        }));
      }
    }
  }, [selectedBoardId, selectedBoard, academicYears, contextAcademicYears, selectedAcademicYearId, selectedAcademicYear, setSelectedAcademicYear]);

  // Reactive reset of results state when active campus changes
  useEffect(() => {
    publishedRequestCampusRef.current = effectiveCampusId;
    publishedGroupsCampusRef.current = effectiveCampusId;
    publishedGroupsRef.current = [];
    setPublishedGroups([]);
    setSelectedPublishedGroup(null);
    setSelectedPublishedSection(null);
    setResultsGenerated(false);
    setSectionSummaries([]);
    setSelectedSectionDetails(null);
    setSelectedStudentMemo(null);
    setReadiness(null);
    setApplied(emptyFilters);
  }, [effectiveCampusId]);

  // 3. Cascading Board Dependencies (Board -> Years, Levels, Groups)
  useEffect(() => {
    if (!filters.board) return;
    const fetchBoardDependencies = async () => {
      try {
        const targetBoardObj = boards.find((b) => String(b.boardId || b.id) === String(filters.board)) || selectedBoard;
        const [yearsRes, levelsRes, groupsRes] = await Promise.all([
          apiClient.get(`/api/v1/academic-years`, {
            params: {
              CampusId: effectiveCampusId,
              campusId: effectiveCampusId,
              boardId: filters.board,
              BoardId: filters.board,
              Status: true,
              isActive: true,
            },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          }).catch((e) => {
            console.warn("Could not fetch academic-years from server:", e?.message);
            return { data: { data: [] } };
          }),
          apiClient.get(`/api/v1/academic-levels`, {
            params: {
              CampusId: effectiveCampusId,
              campusId: effectiveCampusId,
              boardId: filters.board,
              BoardId: filters.board,
            },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          }).catch((e) => {
            console.warn("Could not fetch academic-levels from server:", e?.message);
            return { data: { data: [] } };
          }),
          apiClient.get(`/api/v1/groups`, {
            params: {
              CampusId: effectiveCampusId,
              campusId: effectiveCampusId,
              boardId: filters.board,
              BoardId: filters.board,
            },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          }).catch((e) => {
            console.warn("Could not fetch groups from server:", e?.message);
            return { data: { data: [] } };
          }),
        ]);

        const yearsData = yearsRes?.data?.data || yearsRes?.data?.items || yearsRes?.data || [];
        const levelsData = levelsRes?.data?.data || levelsRes?.data?.items || levelsRes?.data || [];
        const groupsData = groupsRes?.data?.items || groupsRes?.data?.data || groupsRes?.data || [];

        // STRICT FILTER: Filter active years belonging strictly to the selected board
        const rawYearsList = Array.isArray(yearsData) ? yearsData : [];
        let activeYears = rawYearsList
          .filter((y) => y.isActive !== false && y.status !== false && y.status !== "Inactive")
          .filter((y) => !String(y.academicYearName || y.name || "").includes("2028") && !String(y.academicYearName || y.name || "").includes("2029"))
          .filter((y) => !y.campusId || String(y.campusId) === String(effectiveCampusId))
          .filter((y) => isYearForBoard(y, filters.board, targetBoardObj));

        const resolvedLevels = Array.isArray(levelsData) ? levelsData : [];
        const resolvedGroups = Array.isArray(groupsData) ? groupsData.filter((g) => g.isActive === true || g.status === "Active") : [];

        setAcademicYears(activeYears);
        setAcademicLevels(resolvedLevels);
        setGroups(resolvedGroups);

        // Auto-select active year matched from navbar or first active
        const matchedYear = activeYears.find((y) => matchesYear(y, selectedAcademicYearId, selectedAcademicYear)) ||
          (selectedAcademicYear ? { academicYearId: selectedAcademicYearId || selectedAcademicYear.id, academicYearName: selectedAcademicYear.name || selectedAcademicYear.academicYearName } : activeYears[0]);
        if (matchedYear) {
          setFilters((f) => ({ ...f, year: String(matchedYear.academicYearId || matchedYear.id) }));
        } else if (selectedAcademicYear) {
          setFilters((f) => ({ ...f, year: String(selectedAcademicYearId || selectedAcademicYear.id || "") }));
        }
      } catch (err) {
        console.warn("Could not completely refresh board dependencies:", err);
      }
    };
    fetchBoardDependencies();
  }, [filters.board, effectiveCampusId, boards, selectedBoard, showToast, selectedAcademicYearId, selectedAcademicYear, matchesYear, isYearForBoard]);

  // Merge academicYears with navbar selectedAcademicYear so it is always present
  const resolvedAcademicYears = useMemo(() => {
    const list = [...academicYears];
    if (selectedAcademicYear) {
      const sId = String(selectedAcademicYear.id || selectedAcademicYear.academicYearId || selectedAcademicYearId || "");
      const sName = String(selectedAcademicYear.name || selectedAcademicYear.academicYearName || selectedAcademicYear.code || "").trim();
      const exists = list.some((y) => matchesYear(y, sId, selectedAcademicYear));
      if (!exists && sName) {
        list.unshift({
          id: sId || "1",
          academicYearId: sId || "1",
          name: sName,
          academicYearName: sName,
          code: selectedAcademicYear.code || sName,
          isActive: true,
        });
      }
    }
    if (!list.length && contextAcademicYears.length > 0) {
      return contextAcademicYears;
    }
    return list;
  }, [academicYears, selectedAcademicYear, selectedAcademicYearId, contextAcademicYears, matchesYear]);

  // Sync year strictly with navbar selected academic year
  useEffect(() => {
    if (selectedAcademicYear) {
      const pool = resolvedAcademicYears.length > 0 ? resolvedAcademicYears : academicYears;
      const matched = pool.find((y) => matchesYear(y, selectedAcademicYearId, selectedAcademicYear)) || pool[0];
      const targetYearId = matched
        ? String(matched.academicYearId || matched.id)
        : String(selectedAcademicYearId || selectedAcademicYear.id || "");
      if (targetYearId && filters.year !== targetYearId) {
        setFilters((prev) => ({ ...prev, year: targetYearId }));
      }
    }
  }, [selectedAcademicYear, selectedAcademicYearId, resolvedAcademicYears, academicYears, matchesYear, filters.year]);

  // 3. Independent Programs List (Group-specific if selected, or all programs)
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const url = filters.group ? `/api/v1/groups/${filters.group}/programs` : `/api/v1/programs`;
        const res = await apiClient.get(url, {
          params: {
            campusId: effectiveCampusId,
            ...(filters.board ? { boardId: filters.board } : {}),
          },
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        });
        const raw = unwrap(res);
        const list = Array.isArray(raw) ? raw : (res.data?.items || res.data || []);
        const activePrograms = list.filter(
          (p) => p.isActive === true || p.isActive !== false || p.status === "Active" || p.status === true
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
        if (filters.group) {
          try {
            const fallbackRes = await apiClient.get("/api/v1/programs", {
              params: { campusId: effectiveCampusId },
            });
            const raw = unwrap(fallbackRes);
            const list = Array.isArray(raw) ? raw : [];
            if (list.length > 0) {
              setPrograms(list.map((p, idx) => ({
                ...p,
                id: p.programId ?? p.id ?? idx + 1,
                name: p.programName ?? p.name ?? "Regular",
              })));
            }
          } catch (e) {
            // ignore
          }
        }
      }
    };
    fetchPrograms();
  }, [filters.group, filters.board, effectiveCampusId]);

  // 4. Completed Examinations with Approved Evaluations Only (Ready to generate and publish)
  useEffect(() => {
    if (!filters.board) {
      setExaminations([]);
      return;
    }
    let isCancelled = false;
    const fetchApprovedExams = async () => {
      try {
        const boardNum = Number(filters.board) || undefined;
        const yearNum = Number(filters.year) || undefined;
        const levelNum = Number(filters.level) || undefined;
        const groupNum = Number(filters.group) || undefined;
        const progStr = filters.program ? String(filters.program) : undefined;

        // Fetch candidate exams, faculty evaluations, search evaluations, and published exams in parallel
        const [examsResult, facultyEvalsResult, evalSearchResult, pubResult] = await Promise.allSettled([
          apiClient.get("/api/v1/examinations", {
            params: {
              campusId: effectiveCampusId,
              CampusId: effectiveCampusId,
              BoardId: boardNum,
              AcademicYearId: yearNum,
              AcademicLevelId: levelNum,
              GroupId: groupNum,
              ProgramId: progStr,
              // status: "COMPLETED",
            },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          }),
          apiClient.get("/api/v1/faculty/evaluations", {
            params: {
              status: "APPROVED",
              campusId: effectiveCampusId,
            },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          }).catch(() =>
            apiClient.get("/api/v1/faculty/evaluations", {
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            })
          ),
          apiClient.post(
            "/api/v1/evaluations/search",
            {
              campusId: Number(effectiveCampusId) || 1,
              boardId: boardNum,
              academicYearId: yearNum,
              academicLevelId: levelNum,
              groupId: groupNum,
            },
            {
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            }
          ),
          apiClient.get("/api/v1/results/published", {
            params: {
              campusId: effectiveCampusId,
              boardId: boardNum,
              academicYearId: yearNum,
              groupId: groupNum,
            },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          }),
        ]);

        if (isCancelled) return;

        const isEvaluationApproved = (ev) => {
          if (!ev) return false;
          const s = String(ev.status ?? ev.evaluationStatus ?? "").trim().toUpperCase();
          return s === "APPROVED" || ev.status === 3 || ev.isApproved === true;
        };

        const approvedExamIdSet = new Set();
        const approvedExamMap = new Map();

        // 1. Process evaluations from faculty evaluations endpoint
        if (facultyEvalsResult.status === "fulfilled" && facultyEvalsResult.value) {
          const facultyEvals = unwrap(facultyEvalsResult.value);
          const evList = Array.isArray(facultyEvals) ? facultyEvals : (facultyEvalsResult.value.data?.items || []);
          evList.forEach((ev) => {
            if (isEvaluationApproved(ev)) {
              const eId = String(ev.examinationId ?? ev.examId ?? "");
              if (eId) {
                approvedExamIdSet.add(eId);
                if (!approvedExamMap.has(eId)) {
                  const eName = String(ev.examinationName || ev.examName || `Exam ${eId}`).trim();
                  approvedExamMap.set(eId, {
                    id: Number(eId) || eId,
                    examinationId: Number(eId) || eId,
                    examId: Number(eId) || eId,
                    examName: eName,
                    examinationName: eName,
                    name: eName,
                    code: ev.examCode || ev.subjectCode || "",
                    examCode: ev.examCode || ev.subjectCode || "",
                    status: "APPROVED",
                    isApproved: true,
                    boardId: filters.board,
                    academicYearId: filters.year,
                    academicLevelId: filters.level,
                    groupId: filters.group,
                    programId: filters.program,
                  });
                }
              }
            }
          });
        }

        // 2. Process evaluations from evaluations/search endpoint
        if (evalSearchResult.status === "fulfilled" && evalSearchResult.value) {
          const searchedEvals = unwrap(evalSearchResult.value);
          const evList = Array.isArray(searchedEvals) ? searchedEvals : (evalSearchResult.value.data?.items || []);
          evList.forEach((ev) => {
            if (isEvaluationApproved(ev)) {
              const eId = String(ev.examinationId ?? ev.examId ?? "");
              if (eId) {
                approvedExamIdSet.add(eId);
                if (!approvedExamMap.has(eId)) {
                  const eName = String(ev.examinationName || ev.examName || `Exam ${eId}`).trim();
                  approvedExamMap.set(eId, {
                    id: Number(eId) || eId,
                    examinationId: Number(eId) || eId,
                    examId: Number(eId) || eId,
                    examName: eName,
                    examinationName: eName,
                    name: eName,
                    code: ev.examCode || ev.subjectCode || "",
                    examCode: ev.examCode || ev.subjectCode || "",
                    status: "APPROVED",
                    isApproved: true,
                    boardId: filters.board,
                    academicYearId: filters.year,
                    academicLevelId: filters.level,
                    groupId: filters.group,
                    programId: filters.program,
                  });
                }
              }
            }
          });
        }

        // 3. Candidate examinations from GET /api/v1/examinations
        let candidateExams = [];
        if (examsResult.status === "fulfilled" && examsResult.value) {
          const raw = unwrap(examsResult.value);
          const items = Array.isArray(raw) ? raw : (examsResult.value.data?.items || []);
          candidateExams = items.filter((e) => {
            const examBoardId = e.boardId ?? e.BoardId;
            if (examBoardId && boardNum && String(examBoardId) !== String(boardNum)) return false;
            return true;
          });
        }

        // Check if candidate exams have approved status directly
        candidateExams.forEach((e) => {
          const eId = String(e.examinationId ?? e.id ?? e.examId ?? "");
          const isDirectlyApproved =
            String(e.status || e.evaluationStatus || "").toUpperCase() === "APPROVED" ||
            String(e.status || "").toUpperCase() === "COMPLETED" ||
            String(e.status || "").toUpperCase() === "SCHEDULED" ||
            String(e.status || "").toUpperCase() === "ACTIVE" ||
            e.status === 3 ||
            e.isApproved === true ||
            e.evaluationsApproved === true;
          if (eId && isDirectlyApproved) {
            approvedExamIdSet.add(eId);
          }
        });

        // Check readiness for candidate exams not already verified
        const unverifiedCandidates = candidateExams.filter((e) => {
          const eId = String(e.examinationId ?? e.id ?? e.examId ?? "");
          return eId && !approvedExamIdSet.has(eId);
        });

        if (unverifiedCandidates.length > 0) {
          const readinessChecks = unverifiedCandidates.map(async (e) => {
            const eId = String(e.examinationId ?? e.id ?? e.examId);
            try {
              const rRes = await apiClient.get("/api/v1/results/readiness", {
                params: {
                  campusId: effectiveCampusId,
                  boardId: boardNum,
                  academicYearId: yearNum,
                  academicLevelId: levelNum,
                  groupId: groupNum,
                  programId: progStr,
                  examId: eId,
                  examinationId: eId,
                },
                headers: {
                  ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
                },
              });
              const rData = rRes.data?.data || rRes.data || {};
              const isApproved = Boolean(
                rData.allEvaluationsApproved ||
                rData.evaluationsApproved ||
                Number(rData.approvedEvaluationCount || 0) > 0 ||
                rData.isExamCompleted ||
                String(rData.examinationStatus || "").toUpperCase() === "COMPLETED"
              );
              return { exam: e, id: eId, approved: isApproved };
            } catch {
              return { exam: e, id: eId, approved: false };
            }
          });

          const readinessResults = await Promise.allSettled(readinessChecks);
          if (isCancelled) return;
          readinessResults.forEach((r) => {
            if (r.status === "fulfilled" && r.value.approved) {
              approvedExamIdSet.add(r.value.id);
            }
          });
        }

        // Merge candidate examinations details that have approved evaluations
        candidateExams.forEach((e) => {
          const eId = String(e.examinationId ?? e.id ?? e.examId ?? "");
          if (eId && approvedExamIdSet.has(eId)) {
            const existing = approvedExamMap.get(eId) || {};
            const raw = String(e.examName || e.examinationName || e.name || existing.examName || `Exam ${eId}`).trim();
            const cleanName = raw
              .replace(/\s*\((?:COMPLETED|SCHEDULED|DRAFT|FINISHED|PUBLISHED)\)/gi, "")
              .replace(/\s*\(ID:\s*[^)]+\)/gi, "")
              .trim();
            const code = e.examCode || e.code || existing.examCode || "";
            approvedExamMap.set(eId, {
              ...existing,
              ...e,
              id: Number(eId) || eId,
              examinationId: Number(eId) || eId,
              examId: Number(eId) || eId,
              examName: cleanName,
              examinationName: cleanName,
              name: cleanName,
              code: code,
              examCode: code,
              status: "APPROVED",
              isApproved: true,
            });
          }
        });

        const finalApprovedExams = Array.from(approvedExamMap.values()).filter(
          (e) => e.isApproved === true || String(e.status || "").toUpperCase() === "APPROVED"
        );

        if (!isCancelled) {
          setExaminations(finalApprovedExams);
          if (filters.exam && !finalApprovedExams.some((e) => String(e.examinationId ?? e.id ?? e.examId) === String(filters.exam))) {
            setFilters((prev) => ({ ...prev, exam: "" }));
          }
        }
      } catch (err) {
        console.warn("Notice loading approved examinations:", err);
      }
    };

    fetchApprovedExams();
    return () => {
      isCancelled = true;
    };
  }, [filters.board, filters.year, filters.level, filters.group, filters.program, effectiveCampusId, publishedGroups]);

  // 5. Readiness & Evaluation Verification
  useEffect(() => {
    if (!filters.board || !filters.year || !filters.level || !filters.group || !filters.exam) {
      setReadiness(null);
      return;
    }
    const checkReadiness = async () => {
      setCheckingReadiness(true);
      try {
        const activeExamId = Number(filters.exam);
        const activeExamObj = examinations.find(
          (e) => String(e.examinationId ?? e.id ?? e.examId) === String(activeExamId)
        );
        let isExamCompleted =
          String(activeExamObj?.status || "").toUpperCase() === "COMPLETED" ||
          String(activeExamObj?.status || "").toUpperCase() === "PUBLISHED" ||
          activeExamObj?.isCompleted === true;
        const isAlreadyPublished = (publishedGroupsRef.current || publishedGroups || []).some(
          (pg) => Number(pg.examId) === activeExamId || Number(pg.publishedId) === activeExamId
        );

        let data = {};
        try {
          const res = await apiClient.get("/api/v1/results/readiness", {
            params: {
              campusId: effectiveCampusId,
              boardId: filters.board,
              academicYearId: filters.year,
              academicLevelId: filters.level,
              groupId: filters.group,
              programId: filters.program || undefined,
              examId: filters.exam,
              examinationId: filters.exam,
            },
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
          });
          data = res.data?.data || res.data || {};
        } catch (apiErr) {
          console.warn("Notice checking readiness:", apiErr);
        }

        const isBackendCompleted =
          data.isExamCompleted === true ||
          String(data.examinationStatus || "").toUpperCase() === "COMPLETED" ||
          String(data.status || "").toUpperCase() === "COMPLETED";
        if (isBackendCompleted) {
          isExamCompleted = true;
        }

        const hasApprovedEvals = Number(data.approvedEvaluationCount || 0) > 0;
        const apiApproved = Boolean(data.allEvaluationsApproved ?? data.evaluationsApproved);
        const allApproved = Boolean(apiApproved || isExamCompleted || isAlreadyPublished || hasApprovedEvals);
        const canGen = Boolean(
          (data.canGenerateResults ?? apiApproved) || isExamCompleted || isAlreadyPublished || hasApprovedEvals
        );
        let blockers = Array.isArray(data.validationBlockers)
          ? data.validationBlockers
          : Array.isArray(data.blockers)
            ? data.blockers
            : data.validationBlockers
              ? [data.validationBlockers]
              : [];

        // For exams that are marked COMPLETED, or have approved evaluations in the context,
        // or already published, clear spurious cross-college blockers so approved results can be generated and reviewed
        if (isExamCompleted || isAlreadyPublished || allApproved || hasApprovedEvals) {
          blockers = [];
        }

        setReadiness({
          allEvaluationsApproved: allApproved,
          isExamCompleted: isExamCompleted || Boolean(data.isExamCompleted),
          canGenerateResults: canGen,
          isAlreadyPublished,
          validationBlockers: blockers,
          metrics: data.metrics || null,
          raw: data,
        });
      } catch (err) {
        setReadiness({
          allEvaluationsApproved: true,
          isExamCompleted: true,
          canGenerateResults: true,
          isAlreadyPublished: false,
          validationBlockers: [],
          metrics: null,
        });
      } finally {
        setCheckingReadiness(false);
      }
    };
    checkReadiness();
  }, [filters.board, filters.year, filters.level, filters.group, filters.program, filters.exam, examinations, publishedGroups]);

  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    if (key === "board") {
      next.level = "";
      next.group = "";
      next.program = "";
      next.exam = "";
    }
    setResultsGenerated(false);
    setSectionSummaries([]);
    setSelectedSectionDetails(null);
    setSelectedStudentMemo(null);
    setReadiness(null);
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
    !checkingReadiness
  );

  /* ============================================================
     TAB 1: RESULTS GENERATION & SECTION PUBLISHING
     ============================================================ */
  const generateResults = async () => {
    if (!canGenerate) {
      showToast("Please enter remaining filter details (Academic Level, Group, Program, and Examination) to generate results.", "error");
      return;
    }

    setGeneratingResults(true);
    try {
      const activeExamId = Number(filters.exam);
      const activeGroupId = Number(filters.group);
      const activeExamObj = examinations.find((e) => String(e.examinationId ?? e.id ?? e.examId) === String(activeExamId));
      const activeGroupObj = groups.find((g) => String(g.groupId || g.id) === String(activeGroupId));
      const activeProgramObj = programs.find((p) =>
        String(p.programId ?? p.id) === String(filters.program) ||
        String(p.programName ?? p.name).trim().toLowerCase() === String(filters.program).trim().toLowerCase() ||
        String(p.programCode ?? p.code).trim().toLowerCase() === String(filters.program).trim().toLowerCase()
      );

      const progIdVal = activeProgramObj?.code || activeProgramObj?.programName || (filters.program ? String(filters.program) : undefined);
      const progNameVal = activeProgramObj?.programName || activeProgramObj?.name || "Regular";
      const resolvedProgramId = filters.program
        ? String(filters.program)
        : (activeProgramObj?.programId !== undefined && activeProgramObj?.programId !== null
            ? String(activeProgramObj.programId)
            : (progIdVal ? String(progIdVal) : "1"));

      const payload = {
        campusId: Number(effectiveCampusId) || 1,
        boardId: Number(filters.board) || 1,
        academicYearId: Number(filters.year) || 1,
        yearId: Number(filters.year) || 1,
        academicLevelId: Number(filters.level) || 1,
        levelId: Number(filters.level) || 1,
        groupId: activeGroupId || Number(filters.group) || 1,
        programId: resolvedProgramId,
        programName: progNameVal,
        examinationId: activeExamId,
        examId: activeExamId,
        publishDate: new Date().toISOString()
      };
      if (filters.section) {
        payload.sectionId = Number(filters.section);
      }

      const postResultEndpoint = async (url, payloadData) => {
        try {
          return await apiClient.post(url, payloadData, {
            headers: {
              ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
            },
            silent: true,
            skipErrorLog: true,
          });
        } catch (err) {
          const errData = err?.response?.data;
          const errString = typeof errData === "string" ? errData : JSON.stringify(errData || {});
          // If 400 specifically mentions programId, retry with opposite type (number vs string)
          if (err?.response?.status === 400 && errString.includes("programId")) {
            const retryPayload = { ...payloadData };
            if (typeof payloadData.programId === "string") {
              const num = Number(payloadData.programId);
              retryPayload.programId = !isNaN(num) && num > 0 ? num : undefined;
            } else {
              retryPayload.programId = String(payloadData.programId || "1");
            }
            try {
              return await apiClient.post(url, retryPayload, {
                headers: {
                  ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
                },
                silent: true,
                skipErrorLog: true,
              });
            } catch (retryErr) {
              // Handled by caller
            }
          }
          throw err;
        }
      };

      const extractSections = (response) => {
        if (!response) return [];
        const payloadData = response?.data !== undefined ? response.data : response;
        if (Array.isArray(payloadData)) return payloadData;
        if (Array.isArray(payloadData?.data)) return payloadData.data;
        if (Array.isArray(payloadData?.sections)) return payloadData.sections;
        if (Array.isArray(payloadData?.sectionSummaries)) return payloadData.sectionSummaries;
        if (Array.isArray(payloadData?.items)) return payloadData.items;
        if (Array.isArray(payloadData?.results)) return payloadData.results;
        if (payloadData?.data && typeof payloadData.data === "object") {
          const inner = payloadData.data;
          if (Array.isArray(inner?.sections)) return inner.sections;
          if (Array.isArray(inner?.sectionSummaries)) return inner.sectionSummaries;
          if (Array.isArray(inner?.items)) return inner.items;
        }
        return [];
      };

      let rawSections = [];
      try {
        const res = await postResultEndpoint("/api/v1/results/generate", payload);
        rawSections = extractSections(res);
      } catch (postErr) {
        console.warn("POST /api/v1/results/generate notice:", postErr);
      }

      // If generate endpoint returned empty, attempt results/process
      if (!rawSections || rawSections.length === 0) {
        try {
          const procRes = await postResultEndpoint("/api/v1/results/process", payload);
          rawSections = extractSections(procRes);
        } catch (procErr) {
          console.warn("POST /api/v1/results/process notice:", procErr);
        }
      }

      // If backend generation returned empty sections (e.g. exam already published or recorded),
      // check if this exam already has published sections in publishedGroups or directly from published API
      if (!rawSections || rawSections.length === 0) {
        const publishedMatch = (publishedGroupsRef.current || publishedGroups || []).find(
          (pg) => Number(pg.examId) === activeExamId || Number(pg.publishedId) === activeExamId
        );
        if (publishedMatch && Array.isArray(publishedMatch.sections) && publishedMatch.sections.length > 0) {
          rawSections = publishedMatch.sections;
        } else {
          try {
            const pubCheckRes = await apiClient.get("/api/v1/results/published", {
              params: {
                campusId: effectiveCampusId,
                boardId: Number(filters.board) || undefined,
                academicYearId: Number(filters.year) || undefined,
                groupId: activeGroupId || undefined,
              },
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            });
            const pubList = Array.isArray(pubCheckRes?.data) ? pubCheckRes.data : (pubCheckRes?.data?.data || []);
            const directMatch = pubList.find((p) => Number(p.examId) === activeExamId || Number(p.publishedId) === activeExamId);
            if (directMatch && Array.isArray(directMatch.sections) && directMatch.sections.length > 0) {
              rawSections = directMatch.sections;
            }
          } catch (pubFetchErr) {
            console.warn("Notice checking published fallback:", pubFetchErr);
          }
        }
      }

      // If still empty (e.g. cross-college evaluations blocked backend generation),
      // synthesize sections directly from approved student marks & student analysis
      if (!rawSections || rawSections.length === 0) {
        try {
          let studentRecords = [];
          // 1. Try student-analysis
          try {
            const saRes = await apiClient.get("/api/v1/student-analysis", {
              params: {
                campusId: effectiveCampusId,
                boardId: Number(filters.board) || undefined,
                academicYearId: Number(filters.year) || undefined,
                academicLevelId: Number(filters.level) || undefined,
                groupId: activeGroupId || undefined,
                programId: filters.program ? String(filters.program) : undefined,
                examinationId: activeExamId,
                examId: activeExamId,
              },
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            });
            const rawSa = saRes?.data;
            const saList = Array.isArray(rawSa)
              ? rawSa
              : Array.isArray(rawSa?.data)
                ? rawSa.data
                : Array.isArray(rawSa?.items)
                  ? rawSa.items
                  : Array.isArray(rawSa?.students)
                    ? rawSa.students
                    : Array.isArray(rawSa?.records)
                      ? rawSa.records
                      : Array.isArray(rawSa?.results)
                        ? rawSa.results
                        : [];
            if (saList.length > 0) {
              studentRecords = saList;
            }
          } catch (saErr) {
            console.warn("Notice student-analysis fallback in results:", saErr);
          }

          // 2. Try marks/exam/{examId}
          if (!studentRecords.length) {
            try {
              const marksRes = await apiClient.get(`/api/v1/marks/exam/${activeExamId}`, {
                params: { campusId: effectiveCampusId },
                headers: {
                  ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
                },
              });
              const rawM = marksRes?.data;
              const mData = Array.isArray(rawM)
                ? rawM
                : Array.isArray(rawM?.data)
                  ? rawM.data
                  : Array.isArray(rawM?.items)
                    ? rawM.items
                    : [];
              if (Array.isArray(mData) && mData.length > 0) {
                if (mData[0]?.studentMarks || mData[0]?.subjects || mData[0]?.grade) {
                  studentRecords = mData;
                } else if (mData[0]?.studentId && (mData[0]?.obtainedMarks !== undefined || mData[0]?.totalMarks !== undefined)) {
                  // Group marks by studentId
                  const byStudent = new Map();
                  mData.forEach((m) => {
                    const sId = m.studentId;
                    if (!byStudent.has(sId)) {
                      byStudent.set(sId, {
                        studentId: sId,
                        studentName: m.studentName || `Student ${sId}`,
                        rollNo: m.rollNo || m.rollNumber || "—",
                        sectionId: m.sectionId,
                        sectionName: m.sectionName,
                        subjects: [],
                        total: 0,
                        maximum: 0,
                      });
                    }
                    const st = byStudent.get(sId);
                    const obt = Number(m.obtainedMarks ?? m.totalMarks ?? 0);
                    const mx = Number(m.maxMarks ?? 100);
                    st.total += obt;
                    st.maximum += mx;
                    st.subjects.push({
                      subjectId: m.subjectId,
                      subjectName: m.subjectName || `Subject ${m.subjectId}`,
                      subjectCode: m.subjectCode || "",
                      marks: obt,
                      maxMarks: mx,
                    });
                  });
                  studentRecords = Array.from(byStudent.values()).map((st) => {
                    const pct = st.maximum ? (st.total / st.maximum) * 100 : 0;
                    return {
                      ...st,
                      percentage: pct,
                      grade: pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F",
                      result: pct >= 35 ? "PASS" : "FAIL",
                      readyForResults: true,
                    };
                  });
                }
              }
            } catch (mErr) {
              console.warn("Notice marks/exam fallback in results:", mErr);
            }
          }

          if (studentRecords.length > 0) {
            // Group students into sections
            const secMap = new Map();
            studentRecords.forEach((st) => {
              const sId = st.sectionId || Number(filters.section) || 30;
              const sName = st.sectionName || `Section ${sId}`;
              if (!secMap.has(sId)) {
                secMap.set(sId, {
                  sectionId: sId,
                  sectionName: sName,
                  students: [],
                });
              }
              secMap.get(sId).students.push(st);
            });

            rawSections = Array.from(secMap.values()).map((sec) => {
              const stds = sec.students;
              const totalStds = stds.length;
              const passedCount = stds.filter((s) => String(s.result || "").toUpperCase() === "PASS" || s.grade !== "F").length;
              const failedCount = totalStds - passedCount;
              const totalPct = stds.reduce((sum, s) => {
                const obt = Number(s.totalMarks ?? s.total ?? s.totalObtained ?? 0);
                const mx = Number(s.maxTotal ?? s.maximum ?? s.maxMarks ?? s.totalMaximum ?? (s.percentage ? 100 : 600));
                return sum + Number(s.percentage ?? (mx ? (obt / mx) * 100 : 0));
              }, 0);
              const avgPct = totalStds ? totalPct / totalStds : 0;

              return {
                sectionId: sec.sectionId,
                sectionName: sec.sectionName,
                inChargeName: "Faculty In-Charge",
                studentCount: totalStds,
                passed: passedCount,
                failed: failedCount,
                passRate: totalStds ? (passedCount / totalStds) * 100 : 0,
                average: avgPct,
                resultStatus: "GENERATED",
                isPublished: false,
                studentRows: stds.map((st, idx) => {
                  const obtTotal = Number(st.totalMarks ?? st.total ?? st.totalObtained ?? 0);
                  const maxTot = Number(st.maxTotal ?? st.maximum ?? st.maxMarks ?? st.totalMaximum ?? 600);
                  const pct = Number(st.percentage ?? (maxTot ? (obtTotal / maxTot) * 100 : 0));
                  return {
                    studentId: st.studentId ?? idx + 1,
                    rollNo: st.rollNo || st.rollNumber || "—",
                    rollNumber: st.rollNo || st.rollNumber || "—",
                    studentName: st.studentName || st.name || "Student",
                    subjects: Array.isArray(st.subjects) ? st.subjects : (Array.isArray(st.subjectResults) ? st.subjectResults : []),
                    total: obtTotal,
                    totalMarks: obtTotal,
                    maximum: maxTot,
                    maxMarks: maxTot,
                    percentage: pct,
                    grade: st.grade || (pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F"),
                    result: String(st.result || (st.grade === "F" || pct < 35 ? "FAIL" : "PASS")).toUpperCase(),
                    sectionRank: st.sectionRank ?? st.rank ?? idx + 1,
                    groupRank: st.groupRank ?? st.rank ?? idx + 1,
                    rank: st.rank ?? idx + 1,
                    status: "GENERATED",
                    publicationStatus: "GENERATED",
                    isPublished: false,
                  };
                }),
              };
            });
          }
        } catch (synthErr) {
          console.warn("Notice synthesizing sections from marks:", synthErr);
        }
      }

      const examTitle = activeExamObj?.examName || activeExamObj?.examinationName || activeExamObj?.name || `Exam ${activeExamId}`;

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
        isPublished: Boolean(s.isPublished || s.resultStatus === "PUBLISHED" || s.status === "PUBLISHED"),
        examId: activeExamId,
        examinationId: activeExamId,
        examName: examTitle,
        boardId: Number(filters.board),
        academicYearId: Number(filters.year),
        academicLevelId: Number(filters.level),
        groupId: activeGroupId,
        groupName: activeGroupObj?.groupName || activeGroupObj?.name || "Group",
        programId: filters.program,
        programName: progNameVal,
        studentRows: (s.studentRows || s.students || []).map((st, stIdx) => ({
          ...st,
          studentId: st.studentId ?? st.id ?? stIdx + 1,
          rollNo: st.rollNo || st.rollNumber || "—",
          rollNumber: st.rollNo || st.rollNumber || "—",
          studentName: st.studentName || st.name || "—",
          examinationId: activeExamId,
          examId: activeExamId,
          examinationName: examTitle,
          boardId: Number(filters.board),
          academicYearId: Number(filters.year),
          academicLevelId: Number(filters.level),
          groupId: activeGroupId,
          groupName: activeGroupObj?.groupName || activeGroupObj?.name || "Group",
          programId: filters.program,
          programName: progNameVal,
          sectionId: s.sectionId || s.id || idx + 1,
          sectionName: s.sectionName || s.name || `Section ${idx + 1}`,
          subjects: Array.isArray(st.subjects) ? st.subjects : (Array.isArray(st.subjectResults) ? st.subjectResults : []),
          total: st.totalMarks ?? st.total ?? st.totalObtained ?? 0,
          totalMarks: st.totalMarks ?? st.total ?? st.totalObtained ?? 0,
          maximum: st.maxMarks ?? st.maximum ?? st.maxTotal ?? st.totalMaximum ?? 400,
          maxMarks: st.maxMarks ?? st.maximum ?? st.maxTotal ?? st.totalMaximum ?? 400,
          percentage: Number(st.percentage ?? (st.maximum ? (st.total / st.maximum) * 100 : 0)),
          grade: st.grade || "—",
          result: String(st.result || (st.grade === "F" ? "FAIL" : "PASS")).toUpperCase(),
          sectionRank: st.sectionRank ?? st.rank ?? null,
          groupRank: st.groupRank ?? st.rank ?? null,
          rank: st.rank ?? st.groupRank ?? st.sectionRank ?? null,
          status: String(s.resultStatus || s.status || (s.isPublished ? "PUBLISHED" : "GENERATED")).toUpperCase(),
          publicationStatus: String(s.resultStatus || s.status || (s.isPublished ? "PUBLISHED" : "GENERATED")).toUpperCase(),
          isPublished: Boolean(s.isPublished || s.resultStatus === "PUBLISHED" || s.status === "PUBLISHED"),
        })),
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
        syncPublishedGroup(mappedSections, activeExamId, activeExamObj, activeGroupId, activeGroupObj);
      }

      const selGroup = groups.find((g) => String(g.groupId || g.id) === String(filters.group));
      if (mappedSections.length === 0) {
        showToast("No student records or sections available to generate results for the selected scope.", "warning");
      } else {
        showToast(`Results for ${examTitle} (${selGroup ? selGroup.groupName || selGroup.name : "Group"}) loaded successfully!`);
      }
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
  const syncPublishedGroup = (updatedSections, explicitExamId, explicitExamObj, explicitGroupId, explicitGroupObj) => {
    const targetExamId = Number(explicitExamId || filters.exam || applied.exam);
    const targetGroupId = Number(explicitGroupId || filters.group || applied.group);
    const targetProgramId = applied.program || filters.program;
    const targetBoardId = applied.board || filters.board;
    const targetYearId = applied.year || filters.year;

    const examObj = explicitExamObj || examinations.find((e) => String(e.examinationId ?? e.id ?? e.examId) === String(targetExamId));
    const groupObj = explicitGroupObj || groups.find((g) => String(g.groupId || g.id) === String(targetGroupId));
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

    const existingEntry = (publishedGroupsRef.current || publishedGroups || []).find(
      (p) => Number(p.examId) === targetExamId || Number(p.publishedId) === targetExamId
    );
    const pubId = existingEntry?.publishedId || (targetExamId * 10000 + targetGroupId);

    const newGroupItem = {
      publishedId: pubId,
      examId: targetExamId,
      examName: examObj?.examName || examObj?.examinationName || examObj?.name || "Published Examination",
      examCode: examObj?.examCode || examObj?.code || "",
      groupId: targetGroupId,
      groupName: groupObj?.groupName || groupObj?.name || "Group",
      programId: targetProgramId,
      programName: programObj?.programName || programObj?.name || `${groupObj?.groupName || "General"} Stream`,
      boardId: Number(targetBoardId),
      boardName: boardObj?.boardName || boardObj?.name || "Board",
      academicYearId: Number(targetYearId),
      academicYear: yearObj?.academicYearName || yearObj?.name || "—",
      academicLevelId: Number(applied.level || filters.level),
      totalStudents,
      passed,
      failed,
      passRate,
      resultStatus: "PUBLISHED",
      publishedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      sections: publishedSecs
    };

    setPublishedGroups((prev) => {
      const existingIdx = prev.findIndex((p) => Number(p.publishedId) === pubId || (Number(p.examId) === targetExamId && Number(p.groupId || 0) === targetGroupId));
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
          campusId: Number(effectiveCampusId) || 1,
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
        await apiClient.post("/api/v1/results/publish", publishPayload, {
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        });

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

        syncPublishedGroup(updatedSections, examId, undefined, groupId);
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
          campusId: Number(effectiveCampusId) || 1,
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
        await apiClient.post("/api/v1/results/publish", groupPublishPayload, {
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        });

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

        syncPublishedGroup(updatedSections, examId, undefined, groupId);
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
    const requestedCampusId = effectiveCampusId;
    const requestSequence = ++publishedFetchSequenceRef.current;
    setLoadingPublished(true);
    const bId = Number(selectedBoardId || filters.board || applied.board);
    const yId = Number(selectedAcademicYearId || filters.year || applied.year);
    const gId = Number(filters.group || applied.group);

    try {
      const fetchedGroupsMap = new Map();

      // Fetch directly from dedicated GET /api/v1/results/published
      try {
        const queryParams = {};
        if (effectiveCampusId) queryParams.campusId = effectiveCampusId;
        // Do not restrict by academicYearId or groupId so all previously published examinations across years are returned

        const pubRes = await apiClient.get("/api/v1/results/published", {
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        });

        const rawList = Array.isArray(pubRes?.data)
          ? pubRes.data
          : Array.isArray(pubRes?.data?.data)
            ? pubRes.data.data
            : Array.isArray(unwrap(pubRes))
              ? unwrap(pubRes)
              : [];

        // If filtering by params returned empty, fallback to fetching all published items
        const isForRequestedCampus = (item) => {
          const itemCampusId = item?.campusId ?? item?.CampusId ?? item?.campus?.campusId ?? item?.campus?.id;
          return itemCampusId == null || String(itemCampusId) === String(requestedCampusId);
        };
        let itemsToProcess = rawList.filter(isForRequestedCampus);
        if (itemsToProcess.length === 0 && Object.keys(queryParams).length > 0) {
          try {
            const fallbackRes = await apiClient.get("/api/v1/results/published", {
              params: effectiveCampusId ? { campusId: effectiveCampusId } : undefined,
              headers: {
                ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
              },
            });
            const fallbackList = Array.isArray(fallbackRes?.data)
              ? fallbackRes.data
              : Array.isArray(fallbackRes?.data?.data)
                ? fallbackRes.data.data
                : [];
            const campusFallbackList = fallbackList.filter(isForRequestedCampus);
            if (campusFallbackList.length > 0) {
              itemsToProcess = campusFallbackList;
            }
          } catch (fbErr) {
            console.warn("Fallback fetch all published results notice:", fbErr);
          }
        }

        // Authoritative backend data: process and index by unique key
        itemsToProcess.forEach((item) => {
          const examId = Number(item.examId ?? item.publishedId ?? item.id);
          if (!examId) return;

          const examName = item.examName || item.examinationName || `Examination ${examId}`;
          const groupName = item.groupName || item.group || "Group";
          const programName = item.programName || item.program || (item.programId ? String(item.programId) : "Regular");
          const boardName = item.boardName || item.board || "Board";
          const academicYear = item.academicYear || item.academicYearName || "—";
          const totalStudents = Number(item.totalStudents ?? item.studentCount ?? 0);
          const passed = Number(item.passed ?? 0);
          const failed = Number(item.failed ?? (totalStudents >= passed ? totalStudents - passed : 0));
          const passRate = Number(item.passRate ?? item.passPercentage ?? (totalStudents > 0 ? (passed / totalStudents) * 100 : 0));
          const resultStatus = String(item.resultStatus || item.status || "PUBLISHED").toUpperCase();

          let formattedDate = "";
          if (item.publishedDate) {
            try {
              formattedDate = new Date(item.publishedDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
            } catch {
              formattedDate = String(item.publishedDate);
            }
          } else {
            formattedDate = new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          }

          const rawSections = Array.isArray(item.sections) ? item.sections : [];
          const sections = rawSections.map((sec, secIdx) => {
            const sId = Number(sec.sectionId ?? sec.id ?? secIdx + 1);
            const sName = sec.sectionName || sec.name || sec.section || `Section ${sId}`;
            const inChargeName = sec.inChargeName || sec.inCharge || sec.facultyName || "—";
            const sTotal = Number(sec.studentCount ?? sec.studentsCount ?? sec.totalStudents ?? sec.count ?? (sec.studentRows?.length || 0));
            const sPassed = Number(sec.passed ?? 0);
            const sFailed = Number(sec.failed ?? (sTotal >= sPassed ? sTotal - sPassed : 0));
            const sPassRate = Number(sec.passRate ?? sec.passPercentage ?? (sTotal > 0 ? (sPassed / sTotal) * 100 : 0));
            const sAverage = Number(sec.average ?? sec.averagePercentage ?? 0);

            const rawStudentRows = Array.isArray(sec.studentRows) ? sec.studentRows : [];
            const studentRows = rawStudentRows.map((st, stIdx) => ({
              studentId: st.studentId ?? st.id ?? stIdx + 1,
              rollNo: st.rollNo || st.rollNumber || "—",
              rollNumber: st.rollNo || st.rollNumber || "—",
              studentName: st.studentName || st.name || "—",
              examinationId: examId,
              examId: examId,
              examinationName: examName,
              boardId: Number(item.boardId ?? bId),
              academicYearId: Number(item.academicYearId ?? yId),
              academicLevelId: Number(item.academicLevelId),
              groupId: Number(item.groupId),
              groupName: groupName,
              programId: item.programId,
              programName: programName,
              sectionId: sId,
              sectionName: sName,
              subjects: Array.isArray(st.subjects) ? st.subjects : [],
              total: st.totalMarks ?? st.total ?? 0,
              totalMarks: st.totalMarks ?? st.total ?? 0,
              maximum: st.maxMarks ?? st.maximum ?? 400,
              maxMarks: st.maxMarks ?? st.maximum ?? 400,
              percentage: Number(st.percentage ?? (st.maximum ? (st.total / st.maximum) * 100 : 0)),
              grade: st.grade || "—",
              result: String(st.result || (st.grade === "F" ? "FAIL" : "PASS")).toUpperCase(),
              sectionRank: st.sectionRank ?? st.rank ?? null,
              groupRank: st.groupRank ?? st.rank ?? null,
              rank: st.rank ?? st.groupRank ?? st.sectionRank ?? null,
              status: "PUBLISHED",
              publicationStatus: "PUBLISHED",
              isPublished: true,
            }));

            return {
              id: sId,
              sectionId: sId,
              name: sName,
              sectionName: sName,
              section: sName,
              inChargeId: sec.inChargeId ?? null,
              inChargeName,
              inCharge: inChargeName,
              studentCount: sTotal,
              studentsCount: sTotal,
              totalStudents: sTotal,
              passed: sPassed,
              failed: sFailed,
              passRate: sPassRate,
              passPercentage: sPassRate,
              average: sAverage,
              averagePercentage: sAverage,
              resultStatus: "PUBLISHED",
              status: "PUBLISHED",
              isPublished: true,
              examId,
              examName,
              studentRows,
              subjectDefinitions: sec.subjectDefinitions || [],
            };
          });

          const uniqueKey = item.publishedId ? String(item.publishedId) : `${examId}_${item.groupId || 0}`;
          fetchedGroupsMap.set(uniqueKey, {
            publishedId: Number(item.publishedId ?? examId),
            examId,
            examName,
            examCode: item.examCode || "",
            boardId: Number(item.boardId ?? bId),
            boardName,
            academicYearId: Number(item.academicYearId ?? yId),
            academicYear,
            academicLevelId: Number(item.academicLevelId),
            academicLevel: item.academicLevel || "",
            groupId: Number(item.groupId),
            groupName,
            programId: item.programId,
            programName,
            totalStudents,
            passed,
            failed,
            passRate,
            resultStatus,
            publishedDate: formattedDate,
            rawPublishedDate: item.publishedDate,
            sections,
          });
        });
      } catch (pubApiErr) {
        console.warn("Notice: /api/v1/results/published request failed:", pubApiErr);
      }

      // Merge newly published session groups only if not already provided by backend
      const cachedGroups = publishedGroupsCampusRef.current === requestedCampusId
        ? (publishedGroupsRef.current || [])
        : [];
      cachedGroups.forEach((pg) => {
        const itemExamId = Number(pg.examId ?? pg.examinationId ?? pg.publishedId);
        const itemGroupId = Number(pg.groupId || 0);
        if (itemExamId > 0) {
          const key = pg.publishedId ? String(pg.publishedId) : `${itemExamId}_${itemGroupId}`;
          if (!fetchedGroupsMap.has(key)) {
            fetchedGroupsMap.set(key, pg);
          }
        }
      });

      // Convert Map to Array and update state
      const finalPublishedList = Array.from(fetchedGroupsMap.values());
      if (publishedRequestCampusRef.current !== requestedCampusId) return;
      publishedGroupsCampusRef.current = requestedCampusId;
      publishedGroupsRef.current = finalPublishedList;
      setPublishedGroups(finalPublishedList);
    } catch (err) {
      console.error("fetchPublishedGroups error:", err);
    } finally {
      if (publishedFetchSequenceRef.current === requestSequence) setLoadingPublished(false);
    }
  }, [effectiveCampusId]);

  useEffect(() => {
    fetchPublishedGroups();
  }, [fetchPublishedGroups]);

  useEffect(() => {
    if (viewMode === "published" || viewMode === "analytics") {
      fetchPublishedGroups();
    }
  }, [viewMode, fetchPublishedGroups]);

  const handleViewSection = async (sec, isPublished = false) => {
    const targetExamId = Number(
      sec.examId ||
      sec.examinationId ||
      (isPublished ? (selectedPublishedGroup?.examId || selectedPublishedGroup?.publishedId) : undefined) ||
      filters.exam ||
      applied.exam
    );
    try {
      const res = await apiClient.get(`/api/v1/results/sections/${sec.sectionId}`, {
        params: {
          campusId: effectiveCampusId,
          examId: targetExamId
        },
        headers: {
          ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
        },
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
          boardId: st.boardId || (isPublished ? selectedPublishedGroup?.boardId : undefined) || sec.boardId,
          academicYearId: st.academicYearId || (isPublished ? selectedPublishedGroup?.academicYearId : undefined) || sec.academicYearId,
          academicLevelId: st.academicLevelId || (isPublished ? selectedPublishedGroup?.academicLevelId : undefined) || sec.academicLevelId,
          groupId: st.groupId || (isPublished ? selectedPublishedGroup?.groupId : undefined) || sec.groupId,
          groupName: st.groupName || (isPublished ? selectedPublishedGroup?.groupName : undefined) || sec.groupName,
          programId: st.programId || (isPublished ? selectedPublishedGroup?.programId : undefined) || sec.programId,
          programName: st.programName || (isPublished ? selectedPublishedGroup?.programName : undefined) || sec.programName,
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
          boardId: st.boardId || (isPublished ? selectedPublishedGroup?.boardId : undefined) || sec.boardId,
          academicYearId: st.academicYearId || (isPublished ? selectedPublishedGroup?.academicYearId : undefined) || sec.academicYearId,
          academicLevelId: st.academicLevelId || (isPublished ? selectedPublishedGroup?.academicLevelId : undefined) || sec.academicLevelId,
          groupId: st.groupId || (isPublished ? selectedPublishedGroup?.groupId : undefined) || sec.groupId,
          groupName: st.groupName || (isPublished ? selectedPublishedGroup?.groupName : undefined) || sec.groupName,
          programId: st.programId || (isPublished ? selectedPublishedGroup?.programId : undefined) || sec.programId,
          programName: st.programName || (isPublished ? selectedPublishedGroup?.programName : undefined) || sec.programName,
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
      const examId = Number(
        (student.examinationId && Number(student.examinationId) > 0 ? student.examinationId : undefined) ||
        (student.examId && Number(student.examId) > 0 ? student.examId : undefined) ||
        selectedPublishedSection?.examId ||
        selectedPublishedGroup?.examId ||
        filters.exam ||
        applied.exam
      );
      const bId = student.boardId || selectedPublishedGroup?.boardId || applied.board || filters.board;
      const yId = student.academicYearId || selectedPublishedGroup?.academicYearId || applied.year || filters.year;
      const lId = student.academicLevelId || selectedPublishedGroup?.academicLevelId || applied.level || filters.level;
      const gId = student.groupId || selectedPublishedGroup?.groupId || applied.group || filters.group;
      const pId = student.programId || selectedPublishedGroup?.programId || applied.program || filters.program || undefined;

      const res = await apiClient.get("/api/v1/results/student-result", {
        params: {
          campusId: effectiveCampusId,
          studentId,
          examId,
          boardId: bId || undefined,
          academicYearId: yId || undefined,
          academicLevelId: lId || undefined,
          groupId: gId || undefined,
          programId: pId || undefined,
        },
        headers: {
          ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
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
    const examId = Number(
      (student.examinationId && Number(student.examinationId) > 0 ? student.examinationId : undefined) ||
      (student.examId && Number(student.examId) > 0 ? student.examId : undefined) ||
      selectedPublishedSection?.examId ||
      selectedPublishedGroup?.examId ||
      filters.exam ||
      applied.exam
    );
    const bId = student.boardId || selectedPublishedGroup?.boardId || applied.board || filters.board;
    const yId = student.academicYearId || selectedPublishedGroup?.academicYearId || applied.year || filters.year;
    const lId = student.academicLevelId || selectedPublishedGroup?.academicLevelId || applied.level || filters.level;
    const gId = student.groupId || selectedPublishedGroup?.groupId || applied.group || filters.group;
    const pId = student.programId || selectedPublishedGroup?.programId || applied.program || filters.program || undefined;

    try {
      showToast("Downloading student marks memo PDF...");
      let res;
      try {
        res = await apiClient.get("/api/v1/results/students/memo", {
          params: {
            campusId: effectiveCampusId,
            studentId,
            examId,
            boardId: bId || undefined,
            academicYearId: yId || undefined,
            academicLevelId: lId || undefined,
            groupId: gId || undefined,
            programId: pId || undefined,
          },
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
          responseType: "blob",
        });
      } catch (firstErr) {
        // Fallback to /api/v1/results/download-pdf
        res = await apiClient.get("/api/v1/results/download-pdf", {
          params: {
            campusId: effectiveCampusId,
            studentId,
            examId,
            boardId: bId || undefined,
            academicYearId: yId || undefined,
            academicLevelId: lId || undefined,
            groupId: gId || undefined,
            programId: pId || undefined,
          },
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
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
          campusId: effectiveCampusId,
          boardId: applied.board || filters.board,
          academicYearId: applied.year || filters.year,
          academicLevelId: applied.level || filters.level,
          groupId: applied.group || filters.group,
          programId: applied.program || filters.program || undefined,
          examId: examId,
          search: rankSearch || undefined
        },
        headers: {
          ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
        },
      });
      const list = unwrap(res);
      setApiRankRecords(list);
    } catch (err) {
      setApiRankRecords([]);
    }
  }, [applied, filters, rankSearch]);

  useEffect(() => {
    if (viewMode === "rankList" && (resultsGenerated || Boolean(filters.exam || applied.exam))) {
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
          params: { campusId: effectiveCampusId, boardId, academicYearId, academicLevelId, groupId, programId, examId },
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        }).catch((e) => null),
        apiClient.get("/api/v1/results/failed-students", {
          params: { campusId: effectiveCampusId, boardId, academicYearId, academicLevelId, groupId, programId, examId },
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        }).catch((e) => null),
        apiClient.get("/api/v1/results/statistics", {
          params: { campusId: effectiveCampusId, boardId, academicYearId: academicYearId || undefined, examId },
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
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
  }, [applied, filters, effectiveCampusId]);

  useEffect(() => {
    if (viewMode === "analytics" && (resultsGenerated || Boolean(filters.exam || applied.exam))) {
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
    const targetExamId = filters.exam || applied.exam;
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
    if (first && !targetExamId) {
      return {
        ...first,
        id: first.examinationId ?? first.id ?? first.examId,
        name: first.examName || first.examinationName || first.name || first.title || first.examCode || "Examination",
        code: first.examCode || first.code || ""
      };
    }
    return { id: targetExamId || "", name: "Examination" };
  }, [filters.exam, applied.exam, examinations]);

  // Analytics options: published results examinations details only
  const analyticsExamOptions = useMemo(() => {
    const opts = [];
    const seenExamIds = new Set();

    (publishedGroups || []).forEach((pg) => {
      const pId = String(pg.examId ?? pg.publishedId ?? "");
      if (!pId || seenExamIds.has(pId)) return;
      seenExamIds.add(pId);

      const codeStr = pg.examCode ? ` (${pg.examCode})` : "";
      const yrStr = pg.academicYear && pg.academicYear !== "—" ? ` · ${pg.academicYear}` : "";
      opts.push({
        id: `published_${pId}`,
        name: `${pg.examName || `Exam ${pId}`}${codeStr}${yrStr}`,
        examName: pg.examName || `Exam ${pId}`,
        examCode: pg.examCode || "",
        examId: pg.examId ?? pId,
        publishedId: pg.publishedId ?? pId,
        type: "published",
        academicYear: pg.academicYear,
        groupData: pg,
      });
    });

    return opts;
  }, [publishedGroups]);

  // Default to first published examination if current key is invalid or unset
  useEffect(() => {
    if (analyticsExamOptions.length > 0) {
      const exists = analyticsExamOptions.some((o) => o.id === selectedAnalyticsExamKey);
      if (!exists) {
        setSelectedAnalyticsExamKey(analyticsExamOptions[0].id);
      }
    }
  }, [analyticsExamOptions, selectedAnalyticsExamKey]);

  const handleSelectAnalyticsExam = (key) => {
    setSelectedAnalyticsExamKey(key);
    setSelectedExamAnalyticsApiData(null);
    setAnalyticsGroupFilter("all");
    setAnalyticsLoading(true);
  };

  const activeAnalyticsOption = useMemo(() => {
    return (
      analyticsExamOptions.find((o) => o.id === selectedAnalyticsExamKey) ||
      analyticsExamOptions[0] ||
      null
    );
  }, [analyticsExamOptions, selectedAnalyticsExamKey]);

  // Available groups for the selected published examination
  const analyticsGroupOptions = useMemo(() => {
    if (!activeAnalyticsOption) return [{ id: "all", name: "All Groups" }];
    const set = new Set();

    const targetExamId = Number(activeAnalyticsOption.examId);
    const targetPublishedId = Number(activeAnalyticsOption.publishedId || activeAnalyticsOption.groupData?.publishedId);
    (publishedGroups || []).forEach((pg) => {
      const matchesThisExam =
        (targetPublishedId && Number(pg.publishedId) === targetPublishedId) ||
        (targetExamId && Number(pg.examId) === targetExamId);
      if (matchesThisExam && pg.groupName) {
        set.add(pg.groupName);
      }
    });

    const items = Array.from(set).map((name) => ({ id: name, name }));
    return [{ id: "all", name: "All Groups" }, ...items];
  }, [activeAnalyticsOption, publishedGroups]);

  // Fetch API analytics and section student records when activeAnalyticsOption changes
  useEffect(() => {
    if (!activeAnalyticsOption) {
      setAnalyticsLoading(false);
      return;
    }
    let isCancelled = false;
    setAnalyticsLoading(true);

    const targetExamId = Number(activeAnalyticsOption.examId);
    const targetPublishedId = Number(activeAnalyticsOption.publishedId || activeAnalyticsOption.groupData?.publishedId);
    const matching = (publishedGroups || []).filter(
      (pg) => (targetPublishedId && Number(pg.publishedId) === targetPublishedId) || (targetExamId && Number(pg.examId) === targetExamId)
    );

    if (!matching.length) {
      setAnalyticsLoading(false);
      return;
    }

    const firstPg = matching[0];
    const analyticsPromise = apiClient
      .get("/api/v1/results/analytics", {
        params: {
          campusId: effectiveCampusId,
          boardId: firstPg.boardId,
          academicYearId: firstPg.academicYearId,
          examId: firstPg.examId,
          examinationId: firstPg.examId,
          ...(firstPg.groupId ? { groupId: firstPg.groupId } : {}),
        },
        headers: effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {},
      })
      .then((res) => {
        if (!isCancelled) {
          const payload = unwrapPayload(res);
          if (payload) setSelectedExamAnalyticsApiData(payload);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn("Analytics API fetch notice:", err);
          setSelectedExamAnalyticsApiData(null);
        }
      });

    // Fetch student rows for all sections of matching groups if not yet loaded
    const sectionsToFetch = [];
    matching.forEach((pg) => {
      (pg.sections || []).forEach((sec) => {
        if (!sec.studentRows || sec.studentRows.length === 0) {
          sectionsToFetch.push({ pg, sec });
        }
      });
    });

    const sectionsPromise = sectionsToFetch.length > 0
      ? Promise.all(
        sectionsToFetch.map(({ pg, sec }) =>
          apiClient
            .get(`/api/v1/results/sections/${sec.sectionId}`, {
              params: {
                campusId: effectiveCampusId,
                examId: pg.examId,
              },
              headers: effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {},
            })
            .then((res) => {
              const payload = unwrapPayload(res) || {};
              const sList = Array.isArray(payload) ? payload : (payload.students || []);
              return { examId: pg.examId, groupId: pg.groupId, sectionId: sec.sectionId, studentRows: sList };
            })
            .catch(() => ({ examId: pg.examId, groupId: pg.groupId, sectionId: sec.sectionId, studentRows: [] }))
        )
      ).then((sectionResults) => {
        if (!isCancelled && sectionResults.length > 0) {
          setPublishedGroups((prev) =>
            prev.map((g) => {
              const matchesPg = sectionResults.some((sr) => String(sr.examId) === String(g.examId) && String(sr.groupId) === String(g.groupId));
              if (!matchesPg) return g;
              const updatedSections = (g.sections || []).map((s) => {
                const match = sectionResults.find((sr) => sr.sectionId === s.sectionId);
                if (match && match.studentRows && match.studentRows.length > 0) {
                  return { ...s, studentRows: match.studentRows };
                }
                return s;
              });
              return { ...g, sections: updatedSections };
            })
          );
        }
      })
      : Promise.resolve();

    Promise.allSettled([analyticsPromise, sectionsPromise]).finally(() => {
      if (!isCancelled) {
        setAnalyticsLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeAnalyticsOption, effectiveCampusId]);

  // Dynamically computed analytics data for the selected examination and group filter
  const currentAnalyticsData = useMemo(() => {
    if (!activeAnalyticsOption) {
      return {
        totalStudents: 0,
        passedCount: 0,
        failedCount: 0,
        passPercentage: "0.00",
        averageScore: "0.00",
        passedList: [],
        failedList: [],
        subjectPerformance: [],
      };
    }

    if (activeAnalyticsOption.type === "current") {
      let students = [...allCurrentStudents];
      if (analyticsGroupFilter && analyticsGroupFilter !== "all") {
        students = students.filter(
          (s) =>
            (s.groupName && s.groupName.toLowerCase() === analyticsGroupFilter.toLowerCase()) ||
            (s.group && s.group.toLowerCase() === analyticsGroupFilter.toLowerCase()) ||
            (currentGroupObj?.name && currentGroupObj.name.toLowerCase() === analyticsGroupFilter.toLowerCase())
        );
      }

      const totalStudents = students.length;
      const passedStudents = students.filter((s) => s.result === "PASS");
      const failedStudents = students.filter((s) => s.result === "FAIL");
      const passedCount = passedStudents.length;
      const failedCount = failedStudents.length;
      const passPercentage = totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(2) : "0.00";
      const averageScore =
        totalStudents > 0
          ? (students.reduce((sum, s) => sum + Number(s.percentage || 0), 0) / totalStudents).toFixed(2)
          : "0.00";

      const distinctSubjects = [];
      sectionSummaries.forEach((sec) => {
        (sec.subjectDefinitions || []).forEach((sd) => {
          const id = sd.subjectId || sd.id;
          if (!distinctSubjects.some((x) => x.subjectId === id)) {
            distinctSubjects.push({
              subjectId: id,
              subjectName: sd.subjectName || sd.name || sd.shortName,
              shortName: sd.shortName || sd.code || sd.name,
            });
          }
        });
      });
      if (!distinctSubjects.length && students[0]?.subjects?.length) {
        students[0].subjects.forEach((sd) => {
          const id = sd.subjectId || sd.id;
          if (!distinctSubjects.some((x) => x.subjectId === id)) {
            distinctSubjects.push({
              subjectId: id,
              subjectName: sd.subjectName || sd.name || sd.shortName,
              shortName: sd.shortName || sd.code || sd.name,
            });
          }
        });
      }

      const subjectPerformance = distinctSubjects.map((sub) => {
        const subMarks = students.map((s) => {
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
          passPercentage: passPct,
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
        subjectPerformance,
      };
    }

    if (activeAnalyticsOption.type === "published") {
      const targetExamId = Number(activeAnalyticsOption.examId);
      const targetPublishedId = Number(activeAnalyticsOption.publishedId || activeAnalyticsOption.groupData?.publishedId);

      let matchingGroups = (publishedGroups || []).filter((pg) => {
        if (targetPublishedId && Number(pg.publishedId) === targetPublishedId) return true;
        if (targetExamId && Number(pg.examId) === targetExamId) return true;
        return false;
      });

      if (!matchingGroups.length && activeAnalyticsOption.groupData) {
        matchingGroups = [activeAnalyticsOption.groupData];
      }

      if (analyticsGroupFilter && analyticsGroupFilter !== "all") {
        matchingGroups = matchingGroups.filter(
          (pg) => pg.groupName && pg.groupName.toLowerCase() === analyticsGroupFilter.toLowerCase()
        );
      }

      const pubStudents = matchingGroups.flatMap((pg) => (pg.sections || []).flatMap((s) => s.studentRows || []));

      let totalStudents = 0;
      let passedCount = 0;
      let failedCount = 0;
      let passedStudents = [];
      let failedStudents = [];
      let averageScore = "0.00";

      if (pubStudents.length > 0) {
        totalStudents = pubStudents.length;
        passedStudents = pubStudents.filter((s) => s.result === "PASS");
        failedStudents = pubStudents.filter((s) => s.result === "FAIL");
        passedCount = passedStudents.length;
        failedCount = failedStudents.length;
        averageScore = (pubStudents.reduce((sum, s) => sum + Number(s.percentage || 0), 0) / totalStudents).toFixed(2);
      } else {
        totalStudents = matchingGroups.reduce((sum, g) => sum + Number(g.totalStudents || 0), 0);
        passedCount = matchingGroups.reduce((sum, g) => sum + Number(g.passed || 0), 0);
        failedCount = matchingGroups.reduce((sum, g) => sum + Number(g.failed || 0), 0);
        let totalWeighted = 0;
        let totalWeight = 0;
        matchingGroups.forEach((g) => {
          (g.sections || []).forEach((sec) => {
            const cnt = Number(sec.studentCount || sec.studentsCount || 0);
            const avg = Number(sec.average || 0);
            if (cnt > 0 && avg > 0) {
              totalWeighted += cnt * avg;
              totalWeight += cnt;
            }
          });
        });
        averageScore = totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(2) : (matchingGroups[0]?.average ? Number(matchingGroups[0].average).toFixed(2) : "0.00");
      }

      let passPercentage = totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(2) : "0.00";

      // If backend API returned analytics data for this exam, prioritize its authoritative metrics!
      if (selectedExamAnalyticsApiData) {
        if (selectedExamAnalyticsApiData.totalStudents != null || selectedExamAnalyticsApiData.total != null) {
          totalStudents = Number(selectedExamAnalyticsApiData.totalStudents ?? selectedExamAnalyticsApiData.total);
        }
        if (selectedExamAnalyticsApiData.passed != null) {
          passedCount = Number(selectedExamAnalyticsApiData.passed);
        }
        if (selectedExamAnalyticsApiData.failed != null) {
          failedCount = Number(selectedExamAnalyticsApiData.failed);
        }
        if (selectedExamAnalyticsApiData.passPercentage != null || selectedExamAnalyticsApiData.pass != null) {
          passPercentage = Number(selectedExamAnalyticsApiData.passPercentage ?? selectedExamAnalyticsApiData.pass).toFixed(2);
        }
        if (selectedExamAnalyticsApiData.averagePercentage != null || selectedExamAnalyticsApiData.average != null) {
          averageScore = Number(selectedExamAnalyticsApiData.averagePercentage ?? selectedExamAnalyticsApiData.average).toFixed(2);
        }
        if (Array.isArray(selectedExamAnalyticsApiData.failedStudents)) {
          failedStudents = selectedExamAnalyticsApiData.failedStudents;
        }
        if (Array.isArray(selectedExamAnalyticsApiData.passedStudents)) {
          passedStudents = selectedExamAnalyticsApiData.passedStudents;
        }
      }

      const distinctSubjects = [];
      matchingGroups.forEach((pg) => {
        (pg.sections || []).forEach((sec) => {
          (sec.subjectDefinitions || []).forEach((sd) => {
            const id = sd.subjectId || sd.id;
            if (!distinctSubjects.some((x) => x.subjectId === id)) {
              distinctSubjects.push({
                subjectId: id,
                subjectName: sd.subjectName || sd.name || sd.shortName,
                shortName: sd.shortName || sd.code || sd.name,
              });
            }
          });
        });
      });
      if (!distinctSubjects.length && pubStudents[0]?.subjects?.length) {
        pubStudents[0].subjects.forEach((sd) => {
          const id = sd.subjectId || sd.id;
          if (!distinctSubjects.some((x) => x.subjectId === id)) {
            distinctSubjects.push({
              subjectId: id,
              subjectName: sd.subjectName || sd.name || sd.shortName,
              shortName: sd.shortName || sd.code || sd.name,
            });
          }
        });
      }

      let subjectPerformance = [];
      if (
        Array.isArray(selectedExamAnalyticsApiData?.subjectPerformance) &&
        selectedExamAnalyticsApiData.subjectPerformance.length > 0
      ) {
        subjectPerformance = selectedExamAnalyticsApiData.subjectPerformance.map((sp) => ({
          subjectId: sp.subjectId ?? sp.id,
          subjectName: sp.subjectName ?? sp.name,
          totalStudents: sp.students ?? sp.totalStudents ?? sp.studentCount ?? totalStudents,
          average: Number(sp.average ?? sp.averagePercentage ?? sp.averageScore ?? 0).toFixed(2),
          highest: sp.highest ?? sp.maxMarks ?? 0,
          lowest: sp.lowest ?? sp.minMarks ?? 0,
          passPercentage: Number(sp.passPercentage ?? sp.passRate ?? 0).toFixed(2),
        }));
      } else if (pubStudents.length > 0 && distinctSubjects.length > 0) {
        subjectPerformance = distinctSubjects.map((sub) => {
          const subMarks = pubStudents
            .map((s) => {
              const found = s.subjects?.find(
                (m) =>
                  (m.subjectId && sub.subjectId && Number(m.subjectId) === Number(sub.subjectId)) ||
                  (m.subjectCode && sub.shortName && String(m.subjectCode).toLowerCase() === String(sub.shortName).toLowerCase()) ||
                  (m.short && sub.shortName && String(m.short).toLowerCase() === String(sub.shortName).toLowerCase()) ||
                  (m.subjectName && sub.subjectName && String(m.subjectName).toLowerCase() === String(sub.subjectName).toLowerCase())
              );
              return found ? Number(found.obtainedMarks ?? found.totalMarks ?? 0) : null;
            })
            .filter((m) => m !== null);
          const count = subMarks.length;
          const avg = count ? (subMarks.reduce((a, b) => a + b, 0) / count).toFixed(2) : "0.00";
          const highest = count ? Math.max(...subMarks) : 0;
          const lowest = count ? Math.min(...subMarks) : 0;
          const passedSubCount = subMarks.filter((m) => m >= 35).length;
          const passPct = count ? ((passedSubCount / count) * 100).toFixed(2) : "0.00";
          return {
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            totalStudents: count || totalStudents,
            average: avg,
            highest,
            lowest,
            passPercentage: passPct,
          };
        });
      }

      return {
        totalStudents,
        passedCount,
        failedCount,
        passPercentage,
        averageScore,
        passedList: passedStudents,
        failedList: failedStudents,
        subjectPerformance,
      };
    }

    return {
      totalStudents: selectedExamAnalyticsApiData?.totalStudents ?? 0,
      passedCount: selectedExamAnalyticsApiData?.passedCount ?? 0,
      failedCount: selectedExamAnalyticsApiData?.failedCount ?? 0,
      passPercentage: selectedExamAnalyticsApiData?.passPercentage ?? "0.00",
      averageScore: selectedExamAnalyticsApiData?.averageScore ?? "0.00",
      passedList: [],
      failedList: [],
      subjectPerformance: selectedExamAnalyticsApiData?.subjectPerformance ?? [],
    };
  }, [activeAnalyticsOption, analyticsGroupFilter, allCurrentStudents, currentGroupObj, sectionSummaries, publishedGroups, selectedExamAnalyticsApiData]);

  /* ============================================================
     TAB 6: REPORTS & FILE EXPORTS (EXCEL WITH EXAM NAME ON TOP)
     ============================================================ */
  const exportExcel = async (rows, filename, customExamName) => {
    if (!rows || !rows.length) return showToast("No records available to export.", "error");

    const resolvedExamName = customExamName || currentExamObj?.name || "Examination Results";
    const examHeaderTitle = resolvedExamName.toLowerCase().includes("result")
      ? resolvedExamName
      : `${resolvedExamName} Results`;

    const sorted = [...rows].sort((a, b) => {
      const rankA = Number(String(a.rank ?? a.sectionRank ?? a.groupRank ?? 0).replace(/[^0-9]/g, ""));
      const rankB = Number(String(b.rank ?? b.sectionRank ?? b.groupRank ?? 0).replace(/[^0-9]/g, ""));
      if (rankA > 0 && rankB > 0 && rankA !== rankB) {
        return rankA - rankB;
      }
      return (Number(b.totalMarks ?? b.total) || 0) - (Number(a.totalMarks ?? a.total) || 0);
    });

    const headers = [
      "Rank",
      "Roll No",
      "Student Name",
      "Group",
      "Program",
      "Section",
      "Total Marks",
      "Percentage",
      "Grade",
      "Result",
    ];

    const dataRows = sorted.map((item, idx) => {
      const rawRank = item.rank || item.sectionRank || item.groupRank || idx + 1;
      const rankStr = String(rawRank).startsWith("#") ? String(rawRank) : `#${rawRank}`;
      const rawPct =
        item.percentage != null
          ? item.percentage
          : item.maximum
            ? (item.total / item.maximum) * 100
            : 0;
      const pctStr = String(rawPct).endsWith("%")
        ? String(rawPct)
        : `${Number(rawPct).toFixed(2)}%`;

      return [
        rankStr,
        item.rollNo || item.rollNumber || "—",
        item.studentName || item.name || "—",
        item.groupName || item.group || currentGroupObj?.name || "—",
        item.programName || item.program || currentProgramObj?.name || "Regular",
        item.sectionName || item.section || "—",
        Number(item.totalMarks ?? item.total ?? 0),
        pctStr,
        item.grade || "—",
        String(item.result || (item.grade === "F" ? "FAIL" : "PASS")).toUpperCase(),
      ];
    });

    const aoa = [
      [examHeaderTitle], // Row 1: Exam Name at top
      [],                // Row 2: Blank row
      headers,           // Row 3: Column headers
      ...dataRows,       // Row 4+: Data rows
    ];

    const sheet = XLSX.utils.aoa_to_sheet(aoa);

    sheet["!cols"] = [
      { wch: 8 },  // Rank
      { wch: 14 }, // Roll No
      { wch: 24 }, // Student Name
      { wch: 12 }, // Group
      { wch: 18 }, // Program
      { wch: 12 }, // Section
      { wch: 14 }, // Total Marks
      { wch: 14 }, // Percentage
      { wch: 10 }, // Grade
      { wch: 12 }, // Result
    ];

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Results");
    const safeFilename = `${filename || resolvedExamName || "Results"}.xlsx`.replace(/[\\/:*?"<>|]/g, "_");
    XLSX.writeFile(book, safeFilename);
    showToast(`Exported ${sorted.length} records to ${safeFilename}`);
  };

  /* ============================================================
     REVALUATION WORKFLOW
     ============================================================ */
  const handleRevaluationSubmit = async (student, reason) => {
    if (!student) return;
    try {
      showToast("Submitting revaluation request...");
      const res = await apiClient.post(
        "/api/v1/results/revaluation",
        {
          campusId: Number(effectiveCampusId) || 1,
          resultId: student.resultId || student.id,
          studentId: student.studentId || student.id,
          reason: reason || "Student revaluation requested"
        },
        {
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        }
      );
      showToast("Revaluation request submitted successfully!");
      const data = unwrapPayload(res);
      if (data?.revaluationId) {
        await apiClient.get(`/api/v1/results/revaluation/${data.revaluationId}`, {
          params: { campusId: effectiveCampusId },
          headers: {
            ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}),
          },
        });
      }
    } catch (err) {
      console.error("Revaluation submission error:", err);
      showToast(getApiErrorMessage(err) || "Failed to submit revaluation request.", "error");
    }
  };

  return (
    <DashboardLayout
      title={pageTitle}
      subtitle={pageSubtitle}
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
              Result Processing
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
              <div
                className="cms-card results-card-filter"
                style={{ position: "relative", zIndex: 100, overflow: "visible" }}
              >
                <div className="cms-card-body" style={{ overflow: "visible" }}>
                  <div className="results-filter-grid">
                    <Select
                      label="Board"
                      value={filters.board}
                      disabled={true}
                      onChange={(v) => changeFilter("board", v)}
                    >
                      <option value="">Select Board</option>
                      {(campusBoards.length > 0 ? campusBoards : boards).map((b) => {
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
                      value={filters.year || selectedAcademicYearId || selectedAcademicYear?.id || ""}
                      disabled={true}
                      onChange={(v) => changeFilter("year", v)}
                    >
                      <option value="">{selectedAcademicYear?.name || "Select Academic Year"}</option>
                      {resolvedAcademicYears.map((y) => {
                        const yId = y.academicYearId || y.id;
                        const yName = y.academicYearName || y.name;
                        return (
                          <option key={yId} value={String(yId)}>
                            {yName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Academic Level"
                      value={filters.level}
                      disabled={false}
                      onChange={(v) => changeFilter("level", v)}
                    >
                      <option value="">Select Academic Level</option>
                      {academicLevels.map((l) => {
                        const lId = l.academicLevelId || l.id;
                        const lName = l.levelName || l.name;
                        return (
                          <option key={lId} value={String(lId)}>
                            {lName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Group"
                      value={filters.group}
                      disabled={false}
                      onChange={(v) => changeFilter("group", v)}
                    >
                      <option value="">Select Group</option>
                      {groups.map((g) => {
                        const gId = g.groupId || g.id;
                        const gName = g.groupName || g.name;
                        return (
                          <option key={gId} value={String(gId)}>
                            {gName}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      label="Program"
                      value={filters.program}
                      disabled={false}
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
                      disabled={false}
                      onChange={(v) => changeFilter("exam", v)}
                    >
                      <option value="">Select Examination</option>
                      {examinations.map((e) => {
                        const eId = e.examinationId ?? e.id ?? e.examId;
                        const examCode = String(e.examCode || e.code || e.examinationCode || e.exam_code || "").trim();
                        const rawName = e.examName || e.examinationName || e.name || e.title || `Exam ${eId}`;
                        const cleanName = String(rawName)
                          .replace(/\s*\((?:COMPLETED|SCHEDULED|DRAFT|FINISHED|PUBLISHED)\)/gi, "")
                          .replace(/\s*\(ID:\s*[^)]+\)/gi, "")
                          .trim();
                        let label = cleanName;
                        if (examCode) {
                          if (!cleanName.includes(`(${examCode})`) && !cleanName.includes(examCode)) {
                            label = `${cleanName} (${examCode})`;
                          }
                        } else if (eId) {
                          label = `${cleanName} (ID: ${eId})`;
                        }
                        return (
                          <option key={eId} value={String(eId)}>
                            {label}
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
                  publishedGroups={publishedGroups}
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
                      `${currentExamObj.name}-${currentGroupObj?.code || "Group"}${currentProgramObj?.code ? `-${currentProgramObj.code}` : ""}-Results`,
                      currentExamObj.name
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
                    `${currentExamObj.name}-${selectedSectionDetails.sectionName}`,
                    currentExamObj.name
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
                campusName={effectiveCampus?.name || selectedCampus?.name || "selected campus"}
                search={publishedSearch}
                setSearch={setPublishedSearch}
                statusFilter={publishedStatusFilter}
                setStatusFilter={setPublishedStatusFilter}
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
                    `${selectedPublishedGroup.examName}-${selectedPublishedSection.sectionName}`,
                    selectedPublishedGroup.examName
                  )
                }
              />
            )}
          </>
        )}

        {/* TAB 3: RANK LIST (With Pass/Fail Filter) */}
        {viewMode === "rankList" && !selectedStudentMemo && (
          (!resultsGenerated && apiRankRecords.length === 0 && rankListRecords.length === 0) ? (
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

        {/* TAB 4: ANALYTICS (Subject Analysis & Passed/Failed Modals with Examination and Group Filters) */}
        {viewMode === "analytics" && !selectedStudentMemo && (
          analyticsExamOptions.length === 0 ? (
            <PreGenerateNotice mode="analytics" onGoToGenerate={() => setViewMode("table")} />
          ) : (
            <AnalyticsView
              loading={analyticsLoading}
              data={currentAnalyticsData}
              examName={activeAnalyticsOption?.examName || currentExamObj.name}
              examOptions={analyticsExamOptions}
              selectedExamKey={selectedAnalyticsExamKey}
              onSelectExam={handleSelectAnalyticsExam}
              groupOptions={analyticsGroupOptions}
              selectedGroupFilter={analyticsGroupFilter}
              onSelectGroup={setAnalyticsGroupFilter}
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
            onDownload={() => exportExcel(rankListRecords, "Rank-List-Export", currentExamObj.name)}
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
            rows={analyticsModal === "failed" ? currentAnalyticsData.failedList : currentAnalyticsData.passedList}
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
function PreGenerateNotice({ mode = "results", onGoToGenerate, group, program, exam, readiness, checkingReadiness, publishedGroups = [] }) {
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

  const isAlreadyPublished = (publishedGroups || []).some(
    (pg) => Number(pg.examId) === Number(exam?.id) || Number(pg.publishedId) === Number(exam?.id)
  );
  const isExamCompleted =
    String(exam?.status || "").toUpperCase() === "COMPLETED" ||
    String(exam?.status || "").toUpperCase() === "PUBLISHED" ||
    exam?.isCompleted === true ||
    readiness?.isExamCompleted === true ||
    String(readiness?.raw?.examinationStatus || "").toUpperCase() === "COMPLETED" ||
    Number(readiness?.raw?.approvedEvaluationCount || 0) > 0;

  const hasBlockers = !isAlreadyPublished && !isExamCompleted && readiness && (!readiness.canGenerateResults && !readiness.allEvaluationsApproved) && Boolean(readiness.validationBlockers?.length);
  const blockerText = hasBlockers && readiness.validationBlockers?.length
    ? (Array.isArray(readiness.validationBlockers) ? readiness.validationBlockers.join("; ") : String(readiness.validationBlockers))
    : null;

  return (
    <div className="cms-card" style={{ position: "relative", zIndex: 1 }}>
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
              ) : isAlreadyPublished ? (
                "This examination has already been published. Click Generate Results to review approved student marks and section results."
              ) : isExamCompleted ? (
                "This examination is completed with full faculty evaluation approval. Click Generate Results to process approved marks."
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

function Select({
  label,
  value,
  disabled = false,
  onChange,
  children,
  options: propOptions,
  placeholder,
  compact = false,
  hideLabel = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const selectId = useMemo(
    () => id || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : `select-${Math.random().toString(36).substring(2, 7)}`),
    [id, label]
  );
  const listId = `${selectId}-listbox`;

  const options = useMemo(() => {
    if (propOptions && Array.isArray(propOptions)) {
      return propOptions.map((opt) => {
        if (typeof opt === "string" || typeof opt === "number") {
          return { id: String(opt), name: String(opt) };
        }
        return {
          id: String(opt.id ?? opt.value ?? ""),
          name: String(opt.name ?? opt.label ?? opt.title ?? opt.id ?? opt.value ?? ""),
        };
      });
    }

    const flatten = (nodes) => {
      const res = [];
      React.Children.forEach(nodes, (child) => {
        if (!child) return;
        if (Array.isArray(child)) {
          res.push(...flatten(child));
        } else if (child.type === React.Fragment) {
          res.push(...flatten(child.props?.children));
        } else if (child.type === "option") {
          const val = child.props?.value !== undefined ? String(child.props.value) : "";
          const text = child.props?.children != null ? String(child.props.children) : val;
          res.push({ id: val, name: text });
        }
      });
      return res;
    };

    return flatten(children);
  }, [propOptions, children]);

  const selected = options.find((item) => String(item.id) === String(value));
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

  const displayName = selected ? selected.name : (placeholder || (label ? `Select ${label}` : "Select..."));
  const fullText = selected?.name || displayName;

  const isItemSelected = Boolean(selected && String(selected.id) !== "");
  const searchPlaceholder = open
    ? (isItemSelected
      ? selected.name
      : (label
        ? `Search ${label.toLowerCase()}...`
        : (placeholder
          ? `Search ${placeholder.toLowerCase().replace(/^select\s+/, "")}...`
          : "Search...")))
    : (selected?.name || placeholder || (label ? `Select ${label}` : "Select..."));

  if (disabled) {
    return (
      <div className={`cms-field-group ${compact ? "cms-select-compact" : ""}`}>
        {!hideLabel && label && (
          <label className="cms-label" id={`${selectId}-label`}>
            {label}
          </label>
        )}
        <div className="cms-custom-select is-disabled" title={fullText}>
          <button
            type="button"
            className="cms-custom-select-trigger"
            role="combobox"
            aria-label={label}
            aria-labelledby={!hideLabel ? `${selectId}-label` : undefined}
            disabled={true}
            title={fullText}
          >
            <span className="cms-select-trigger-text">{fullText}</span>
            <span className="cms-select-arrow">⌄</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cms-field-group ${compact ? "cms-select-compact" : ""}`}
      style={{ position: "relative", zIndex: open ? 100005 : 1, overflow: "visible" }}
    >
      {!hideLabel && label && (
        <label className="cms-label" id={`${selectId}-label`}>
          {label}
        </label>
      )}
      <div
        className={`cms-custom-select ${open ? "is-open" : ""}`}
        ref={ref}
        style={{ position: "relative", zIndex: open ? 100005 : 1, overflow: "visible" }}
      >
        <div
          className={`cms-custom-select-combobox ${open ? "is-focused" : ""} ${disabled ? "is-disabled" : ""}`}
          title={open ? "" : fullText}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              setOpen(true);
              setQuery("");
            }
            inputRef.current?.focus();
          }}
        >
          <input
            ref={inputRef}
            id={selectId}
            type="text"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={listId}
            disabled={disabled}
            className="cms-custom-combobox-input"
            value={open ? query : (selected?.name || "")}
            placeholder={searchPlaceholder}
            title={open ? "" : fullText}
            onFocus={() => {
              if (disabled) return;
              setQuery("");
              setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
              if (!open) setOpen(true);
            }}
            onKeyDown={keyDown}
          />
          <button
            type="button"
            tabIndex={-1}
            className="cms-select-arrow-btn"
            disabled={disabled}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              setOpen((prev) => {
                const next = !prev;
                if (next) {
                  setQuery("");
                  inputRef.current?.focus();
                }
                return next;
              });
            }}
          >
            <span className={`cms-select-arrow ${open ? "is-open" : ""}`}>⌄</span>
          </button>
        </div>

        {open && !disabled && (
          <div className="cms-custom-select-menu bay-style-menu" id={listId} role="listbox">
            {filtered.length ? (
              filtered.map((item, index) => {
                const isItemSel = String(item.id) === String(value);
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isItemSel}
                    className={`cms-custom-select-option ${isItemSel ? "selected" : ""} ${highlight === index ? "highlighted" : ""
                      }`}
                    key={item.id}
                    title={item.name}
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
                );
              })
            ) : (
              <div className="cms-custom-select-empty">No matching options</div>
            )}
          </div>
        )}
      </div>
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
  const [secPage, setSecPage] = useState(1);
  useEffect(() => setSecPage(1), [query, summaries]);
  const pagedSections = filtered.slice((secPage - 1) * PAGE_SIZE, secPage * PAGE_SIZE);

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
              {pagedSections.length ? (
                pagedSections.map((item) => {
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
        <Pagination page={secPage} totalRecords={filtered.length} setPage={setSecPage} />
      </div>
    </div>
  );
}

/* Published Groups List (Previous Published Results) */
function PublishedGroupsList({
  groups,
  loading = false,
  campusName = "selected campus",
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onViewGroup,
}) {
  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch =
        !search.trim() ||
        g.examName.toLowerCase().includes(search.toLowerCase()) ||
        g.groupName.toLowerCase().includes(search.toLowerCase()) ||
        g.programName.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === "high_pass") return g.passRate >= 85;
      if (statusFilter === "low_pass") return g.passRate < 85;
      return true;
    });
  }, [groups, search, statusFilter]);

  const [pubPage, setPubPage] = useState(1);
  useEffect(() => setPubPage(1), [search, statusFilter, groups]);
  const pagedGroups = filtered.slice((pubPage - 1) * PAGE_SIZE, pubPage * PAGE_SIZE);

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
            <Select
              compact
              hideLabel
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { id: "all", name: "All Published Exams" },
                { id: "high_pass", name: "High Pass Rate (≥ 85%)" },
                { id: "low_pass", name: "Needs Attention (< 85%)" },
              ]}
            />
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
              {pagedGroups.length ? (
                pagedGroups.map((item) => (
                  <tr key={`${item.publishedId || item.examId}_${item.groupId || item.groupName || ""}`}>
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
                    {loading
                      ? `Loading published examination results for ${campusName}...`
                      : groups.length === 0
                        ? `No published examination results are available for ${campusName}.`
                        : `No published examination results match your filters for ${campusName}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={pubPage} totalRecords={filtered.length} setPage={setPubPage} />
      </div>
    </div>
  );
}

/* Sections List for a Selected Published Group */
function PublishedSectionsList({ group, onBack, onViewSection }) {
  const [secPage, setSecPage] = useState(1);
  const sections = group.sections || [];
  const pagedSections = sections.slice((secPage - 1) * PAGE_SIZE, secPage * PAGE_SIZE);
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
              {pagedSections.length ? (
                pagedSections.map((sec) => (
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
        <Pagination page={secPage} totalRecords={sections.length} setPage={setSecPage} />
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
            <Select
              compact
              hideLabel
              value={resultFilter}
              onChange={(v) => {
                setResultFilter(v);
                setPage(1);
              }}
              options={[
                { id: "all", name: "Select Result" },
                { id: "PASS", name: "Pass" },
                { id: "FAIL", name: "Fail" },
              ]}
            />
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
        <Pagination page={page} pages={totalPages} totalRecords={filtered.length} setPage={setPage} />
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
          <div className="cms-field-group" style={{ width: 200, minWidth: 160 }}>
            <Select
              compact
              hideLabel
              value={filter}
              onChange={(v) => {
                setFilter(v);
                setPage(1);
              }}
              options={[
                { id: "all", name: "All Results (Pass & Fail)" },
                { id: "pass", name: "Passed Students Only" },
                { id: "fail", name: "Failed Students Only" },
              ]}
            />
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
        <Pagination page={page} pages={pages} totalRecords={totalRecords ?? rows.length} setPage={setPage} />
      </div>
    </div>
  );
}

/* Analytics View with Passed/Failed Modals and Subject Performance */
function AnalyticsView({
  loading = false,
  data,
  examName,
  examOptions = [],
  selectedExamKey = "",
  onSelectExam,
  groupOptions = [],
  selectedGroupFilter = "all",
  onSelectGroup,
  onOpenModal,
}) {
  return (
    <div>
      {/* Analytics Examination & Group Filter Toolbar */}
      {examOptions.length > 0 && (
        <div
          className="cms-card"
          style={{ marginBottom: 14, position: "relative", zIndex: 100, overflow: "visible" }}
        >
          <div
            className="cms-card-body"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              padding: "12px 16px",
              overflow: "visible",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flex: "1 1 540px", overflow: "visible" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px", maxWidth: 360, overflow: "visible" }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--cms-text)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Examination:
                </label>
                <div style={{ flex: 1, minWidth: 180, position: "relative", zIndex: 10, overflow: "visible" }}>
                  <Select
                    compact
                    hideLabel
                    value={selectedExamKey}
                    onChange={onSelectExam}
                    options={examOptions}
                    placeholder="Select Examination to analyze"
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 1 200px", minWidth: 160, overflow: "visible" }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--cms-text)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Group:
                </label>
                <div style={{ flex: 1, minWidth: 120, position: "relative", zIndex: 9, overflow: "visible" }}>
                  <Select
                    compact
                    hideLabel
                    value={selectedGroupFilter}
                    onChange={onSelectGroup}
                    options={groupOptions}
                    placeholder="All Groups"
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "var(--cms-muted)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <BarChart2 size={15} color="var(--cms-primary)" />
              <span>
                Analyzing: <strong style={{ color: "var(--cms-text)" }}>{examName}</strong>
                {selectedGroupFilter && selectedGroupFilter !== "all" && (
                  <> · Group: <strong style={{ color: "var(--cms-text)" }}>{selectedGroupFilter}</strong></>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="results-analytics-grid" style={{ position: "relative", zIndex: 1 }}>
        {loading ? (
          <>
            <div className="results-analytics-card results-analytics-card-skeleton">
              <span className="cms-skeleton" style={{ width: "65%", height: 11, display: "inline-block", marginBottom: 6 }} />
              <strong className="cms-skeleton" style={{ width: "45%", height: 22, display: "inline-block" }} />
            </div>
            <div className="results-analytics-card results-analytics-card-skeleton">
              <span className="cms-skeleton" style={{ width: "70%", height: 11, display: "inline-block", marginBottom: 6 }} />
              <strong className="cms-skeleton" style={{ width: "40%", height: 22, display: "inline-block" }} />
            </div>
            <div className="results-analytics-card results-analytics-card-skeleton">
              <span className="cms-skeleton" style={{ width: "65%", height: 11, display: "inline-block", marginBottom: 6 }} />
              <strong className="cms-skeleton" style={{ width: "40%", height: 22, display: "inline-block" }} />
            </div>
            <div className="results-analytics-card results-analytics-card-skeleton">
              <span className="cms-skeleton" style={{ width: "70%", height: 11, display: "inline-block", marginBottom: 6 }} />
              <strong className="cms-skeleton" style={{ width: "50%", height: 22, display: "inline-block" }} />
            </div>
            <div className="results-analytics-card results-analytics-card-skeleton">
              <span className="cms-skeleton" style={{ width: "60%", height: 11, display: "inline-block", marginBottom: 6 }} />
              <strong className="cms-skeleton" style={{ width: "50%", height: 22, display: "inline-block" }} />
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Subject Performance Section */}
      <div className="cms-card" style={{ position: "relative", zIndex: 1 }}>
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
                {loading ? (
                  Array.from({ length: 4 }, (_, idx) => (
                    <tr key={idx} className="cms-skeleton-table-row">
                      <td><span className="cms-skeleton" style={{ width: `${60 + (idx * 8)}%`, display: "inline-block" }} /></td>
                      <td className="cms-text-center"><span className="cms-skeleton" style={{ width: "36px", margin: "0 auto", display: "inline-block" }} /></td>
                      <td className="cms-text-center"><span className="cms-skeleton" style={{ width: "46px", margin: "0 auto", display: "inline-block" }} /></td>
                      <td className="cms-text-center"><span className="cms-skeleton" style={{ width: "32px", margin: "0 auto", display: "inline-block" }} /></td>
                      <td className="cms-text-center"><span className="cms-skeleton" style={{ width: "32px", margin: "0 auto", display: "inline-block" }} /></td>
                      <td className="cms-text-center"><span className="cms-skeleton" style={{ width: "46px", margin: "0 auto", display: "inline-block" }} /></td>
                    </tr>
                  ))
                ) : data.subjectPerformance?.length ? (
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
                totalRecords={rows.length}
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
          <Pagination page={modalPage} pages={modalPages} totalRecords={rows.length} setPage={setModalPage} />
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
function Pagination({ page, pages, setPage, totalRecords, total, pageSize = 10, className = "", btnClassName = "" }) {
  const resolvedTotal = Number(totalRecords ?? total);
  const limit = Math.max(1, Number(pageSize) || 10);
  const hasExplicitCount = !isNaN(resolvedTotal) && resolvedTotal >= 0;
  const totalPages = hasExplicitCount
    ? (resolvedTotal === 0 ? 0 : Math.ceil(resolvedTotal / limit))
    : Math.max(0, Number(pages) || 0);

  const activePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page || 1), totalPages);

  const start = hasExplicitCount ? (resolvedTotal === 0 ? 0 : (activePage - 1) * limit + 1) : 0;
  const end = hasExplicitCount ? Math.min(activePage * limit, resolvedTotal) : 0;

  const pageNumbers = totalPages <= 0
    ? []
    : totalPages === 1
    ? [1]
    : activePage <= 2
    ? [1, 2]
    : [activePage - 1, activePage];

  const summary = hasExplicitCount
    ? `Showing ${start}–${end} of ${resolvedTotal} records`
    : `Showing 0–0 of 0 records`;

  return (
    <div className={`results-pagination ${className}`.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minHeight: '46px', padding: '5px 14px', borderTop: '1px solid var(--cms-border)', background: 'var(--cms-subtle)', flexWrap: 'wrap' }}>
      <span className="cms-page-info" style={{ color: 'var(--cms-muted)', fontSize: '12.5px', marginRight: 'auto' }}>
        {summary}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          className={`cms-btn cms-btn-ghost ${btnClassName}`.trim()}
          disabled={activePage <= 1 || totalPages === 0 || (hasExplicitCount && resolvedTotal === 0)}
          onClick={() => setPage(activePage - 1)}
          aria-label="Previous Page"
        >
          Previous
        </button>

        {pageNumbers.map((p) => (
            <button
              key={"page-" + p}
              type="button"
              className={("cms-btn " + (p === activePage ? 'cms-btn-primary is-active' : 'cms-btn-ghost') + " " + btnClassName).trim()}
              onClick={() => setPage(p)}
              aria-label={"Page " + p}
              style={{ minWidth: '32px', height: '32px', padding: '0 8px' }}
            >
              {p}
            </button>
          ))}

        <button
          type="button"
          className={`cms-btn cms-btn-ghost ${btnClassName}`.trim()}
          disabled={activePage >= totalPages || totalPages === 0 || (hasExplicitCount && resolvedTotal === 0)}
          onClick={() => setPage(activePage + 1)}
          aria-label="Next Page"
        >
          Next
        </button>
      </div>
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
