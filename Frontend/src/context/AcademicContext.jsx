import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthToken } from "@/features/authStorage.js";

const AcademicContext = createContext(null);
const BOARD_STORAGE_KEY = "cms_selected_board";
const YEAR_STORAGE_KEY = "cms_selected_academic_year";

const BOARD_CODE_TO_NAME = {
  bieap: "Board of Intermediate Education, Andhra Pradesh",
  tgbie: "Telangana Board of Intermediate Education",
  tsbie: "Telangana Board of Intermediate Education",
  cbse: "Central Board of Secondary Education",
  cisce: "Council for the Indian School Certificate Examinations",
  icse: "Council for the Indian School Certificate Examinations",
  "puc-ka": "Karnataka Pre-University Education",
  "dge-tn": "Tamil Nadu State Board – Higher Secondary",
  "state board": "State Board of Intermediate Education",
};

const DEFAULT_BOARDS = [
  { id: "1", code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh", boardName: "Board of Intermediate Education, Andhra Pradesh" },
  { id: "2", code: "TGBIE", name: "Telangana Board of Intermediate Education", boardName: "Telangana Board of Intermediate Education" },
  { id: "3", code: "CBSE", name: "Central Board of Secondary Education", boardName: "Central Board of Secondary Education" },
  { id: "4", code: "CISCE", name: "Council for the Indian School Certificate Examinations", boardName: "Council for the Indian School Certificate Examinations" },
  { id: "5", code: "PUC-KA", name: "Karnataka Pre-University Education", boardName: "Karnataka Pre-University Education" },
  { id: "6", code: "DGE-TN", name: "Tamil Nadu State Board – Higher Secondary", boardName: "Tamil Nadu State Board – Higher Secondary" },
];

const DEFAULT_ACADEMIC_YEARS = [
  { id: "1", code: "2026-2027", name: "2026-2027", label: "2026-2027" },
  { id: "2", code: "2025-2026", name: "2025-2026", label: "2025-2026" },
  { id: "3", code: "2024-2025", name: "2024-2025", label: "2024-2025" },
];

// Board/academic-year APIs are not entirely consistent about envelopes. Some
// deployments return `Items`, while others wrap that result in `data`/`Data`.
// Unwrap the known response shapes before deciding the list is empty.
const asList = (response) => {
  const unwrap = (value, depth = 0) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object" || depth > 4) return [];

    for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values"]) {
      if (Array.isArray(value[key])) return value[key];
    }
    for (const key of ["data", "Data", "result", "Result", "payload", "Payload"]) {
      const nested = unwrap(value[key], depth + 1);
      if (nested.length) return nested;
    }
    return [];
  };

  return unwrap(response?.data ?? response);
};
const valueOf = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null);
const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
const isActive = (item) => {
  const value = valueOf(item, "isActive", "IsActive", "active", "Active", "status", "Status");
  const text = String(value ?? "").trim().toLowerCase();
  return value == null || !(value === false || value === 0 || text === "false" || text === "inactive");
};
const boardIdOf = (board) => valueOf(board, "id", "boardId", "BoardId");
const yearIdOf = (year) => valueOf(year, "id", "academicYearId", "AcademicYearId");
const readStored = (key) => { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : null; } catch { return null; } };
const persist = (key, value) => { try { if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key); } catch { /* storage can be unavailable */ } };
const mapBoard = (item, index) => {
  const id = valueOf(item, "boardId", "BoardId", "id", "Id") ?? index + 1;
  const rawCode = valueOf(item, "boardCode", "BoardCode", "code", "Code") ?? `BOARD-${id}`;
  const rawName = valueOf(item, "boardName", "BoardName", "fullName", "FullName", "name", "Name");
  const codeKey = String(rawCode).trim().toLowerCase();
  const nameKey = String(rawName || "").trim().toLowerCase();
  const resolvedName = (rawName && rawName !== rawCode) ? rawName : (BOARD_CODE_TO_NAME[codeKey] || BOARD_CODE_TO_NAME[nameKey] || rawName || rawCode);
  return { ...item, id: String(id), code: String(rawCode), name: String(resolvedName), boardName: String(resolvedName) };
};
const mapYear = (item, index) => {
  const id = valueOf(item, "academicYearId", "AcademicYearId", "id", "Id") ?? index + 1;
  const name = valueOf(item, "academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "code", "Code") ?? id;
  return { ...item, id: String(id), code: String(name), name: String(name), label: String(name) };
};
const uniqueById = (items = []) => Array.from(items.reduce((lookup, item) => {
  const id = String(item?.id ?? "").trim();
  const identity = id || normalize(item?.code ?? item?.name ?? item?.label);
  if (identity && !lookup.has(identity)) lookup.set(identity, item);
  return lookup;
}, new Map()).values());
const sameBoard = (left, right) => String(boardIdOf(left) ?? "") === String(boardIdOf(right) ?? "") || normalize(left?.code ?? left?.name ?? left?.boardName) === normalize(right?.code ?? right?.name ?? right?.boardName);
const sameYear = (left, right) => String(yearIdOf(left) ?? "") === String(yearIdOf(right) ?? "") || normalize(left?.code ?? left?.name ?? left?.label) === normalize(right?.code ?? right?.name ?? right?.label);

export function AcademicProvider({ children }) {
  useLocation();
  // Re-evaluate storage when navigation occurs after login/logout. Academic
  // masters are private application data and should not load on public pages.
  const isAuthenticated = Boolean(getAuthToken());
  const [boards, setBoards] = useState(() => uniqueById(readStored("cms_cached_boards") || DEFAULT_BOARDS));
  const [academicYears, setAcademicYears] = useState(() => uniqueById(readStored("cms_cached_academic_years") || DEFAULT_ACADEMIC_YEARS));
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [academicYearsLoading, setAcademicYearsLoading] = useState(false);
  const [boardsError, setBoardsError] = useState("");
  const [academicYearsError, setAcademicYearsError] = useState("");
  const [selectedBoard, setSelectedBoardState] = useState(() => readStored(BOARD_STORAGE_KEY) || DEFAULT_BOARDS[0]);
  const [selectedAcademicYear, setSelectedAcademicYearState] = useState(() => readStored(YEAR_STORAGE_KEY) || DEFAULT_ACADEMIC_YEARS[0]);
  const [refreshToken, setRefreshToken] = useState(0);
  const selectedBoardId = boardIdOf(selectedBoard);
  const selectedAcademicYearId = yearIdOf(selectedAcademicYear);
  const refreshAcademicContext = useCallback(() => setRefreshToken((value) => value + 1), []);

  const setSelectedBoard = useCallback((boardOrId) => {
    const board = typeof boardOrId === "object" && boardOrId !== null ? boardOrId : boards.find((item) => String(item.id) === String(boardOrId) || String(item.code) === String(boardOrId) || String(item.name) === String(boardOrId)) ?? null;
    setSelectedBoardState(board);
    persist(BOARD_STORAGE_KEY, board);
  }, [boards]);

  const setSelectedAcademicYear = useCallback((yearOrId) => {
    const year = typeof yearOrId === "object" && yearOrId !== null ? yearOrId : academicYears.find((item) => String(item.id) === String(yearOrId) || normalize(item.code) === normalize(yearOrId) || normalize(item.name) === normalize(yearOrId)) ?? null;
    setSelectedAcademicYearState(year);
    persist(YEAR_STORAGE_KEY, year);
  }, [academicYears]);

  useEffect(() => {
    window.addEventListener("cms_academic_masters_updated", refreshAcademicContext);
    return () => window.removeEventListener("cms_academic_masters_updated", refreshAcademicContext);
  }, [refreshAcademicContext]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBoardsLoading(false);
      return undefined;
    }
    let active = true;
    setBoardsLoading(true);
    setBoardsError("");
    apiClient.get(apiEndpoints.boards.list, { params: { Status: true, PageNumber: 1, PageSize: 100 } }).then((response) => {
      if (!active) return;
      const fetched = uniqueById(asList(response).filter(isActive).map(mapBoard));
      const nextBoards = fetched.length ? fetched : DEFAULT_BOARDS;
      setBoards(nextBoards);
      persist("cms_cached_boards", nextBoards);
      setSelectedBoardState((current) => {
        const next = nextBoards.find((board) => sameBoard(board, current)) ?? nextBoards[0];
        persist(BOARD_STORAGE_KEY, next);
        return next;
      });
    }).catch(() => {
      if (!active) return;
      const fallbackBoards = uniqueById(readStored("cms_cached_boards") || DEFAULT_BOARDS);
      setBoards(fallbackBoards);
      setBoardsError("");
      setSelectedBoardState((current) => {
        const next = fallbackBoards.find((board) => sameBoard(board, current)) ?? fallbackBoards[0];
        persist(BOARD_STORAGE_KEY, next);
        return next;
      });
    }).finally(() => active && setBoardsLoading(false));
    return () => { active = false; };
  }, [isAuthenticated, refreshToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAcademicYearsLoading(false);
      return undefined;
    }
    let active = true;
    const effectiveBoardId = selectedBoardId || boardIdOf(selectedBoard) || "1";
    setAcademicYearsLoading(true);
    setAcademicYearsError("");
    const loadYears = async () => {
      try {
        return await apiClient.get(apiEndpoints.academicYears.active, {
          params: { boardId: effectiveBoardId, isActive: true },
        });
      } catch {
        return apiClient.get(apiEndpoints.academicYears.list, {
          params: { boardId: effectiveBoardId, isActive: true, Status: true },
        });
      }
    };

    loadYears().then((response) => {
      if (!active) return;
      const fetched = uniqueById(asList(response).filter((year) => {
        const boardId = valueOf(year, "boardId", "BoardId");
        return (boardId == null || String(boardId) === String(effectiveBoardId)) && isActive(year);
      }).map(mapYear));
      const nextYears = fetched.length ? fetched : DEFAULT_ACADEMIC_YEARS;
      setAcademicYears(nextYears);
      persist("cms_cached_academic_years", nextYears);
      setSelectedAcademicYearState((current) => {
        const next = nextYears.find((year) => sameYear(year, current)) ?? nextYears[0];
        persist(YEAR_STORAGE_KEY, next);
        return next;
      });
    }).catch(() => {
      if (!active) return;
      const fallbackYears = uniqueById(readStored("cms_cached_academic_years") || DEFAULT_ACADEMIC_YEARS);
      setAcademicYears(fallbackYears);
      setAcademicYearsError("");
      setSelectedAcademicYearState((current) => {
        const next = fallbackYears.find((year) => sameYear(year, current)) ?? fallbackYears[0];
        persist(YEAR_STORAGE_KEY, next);
        return next;
      });
    }).finally(() => active && setAcademicYearsLoading(false));
    return () => { active = false; };
  }, [isAuthenticated, selectedBoardId, selectedBoard, refreshToken]);

  const value = useMemo(() => ({
    boards, academicYears, selectedBoard, selectedBoardId, selectedAcademicYear, selectedAcademicYearId,
    setSelectedBoard, setSelectedAcademicYear, boardsLoading, academicYearsLoading, boardsError, academicYearsError, refreshAcademicContext,
  }), [academicYears, academicYearsError, academicYearsLoading, boards, boardsError, boardsLoading, refreshAcademicContext, selectedAcademicYear, selectedAcademicYearId, selectedBoard, selectedBoardId, setSelectedAcademicYear, setSelectedBoard]);
  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}

export function useAcademicContext() {
  const context = useContext(AcademicContext);
  return context ?? {
    boards: [], academicYears: [], selectedBoard: null, selectedBoardId: undefined,
    selectedAcademicYear: null, selectedAcademicYearId: undefined, boardsLoading: false, academicYearsLoading: false,
    boardsError: "", academicYearsError: "",
    setSelectedBoard: () => {}, setSelectedAcademicYear: () => {}, refreshAcademicContext: () => {},
  };
}
