import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import "./BoardAcademicYearManagementPage.css";

const PAGE_SIZE = 5;
const API_VERSION = "1.0";
const ACADEMIC_YEAR_API = {
  list: "/api/v1/academic-years",
  create: "/api/v1/academic-years",
  active: "/api/v1/academic-years/active",
  byId: (id) => `/api/v1/academic-years/${id}`,
  delete: (id) => `/api/v1/academic-years/${id}`,
  activate: (id) => `/api/v1/academic-years/${id}/activate`,
  deactivate: (id) => `/api/v1/academic-years/${id}/deactivate`,
};
const BOARD_API = {
  list: "/api/v1/boards",
  create: "/api/v1/boards",
  byId: (id) => `/api/v1/boards/${id}`,
  status: (id) => `/api/v1/boards/${id}/status`,
  summary: "/api/v1/boards/summary",
  countries: "/api/v1/boards/countries",
  formData: "/api/v1/boards/form-data",
  states: (countryId) => `/api/v1/boards/states/${countryId}`,
  academicPatterns: "/api/v1/boards/academic-patterns",
  academicLevels: "/api/v1/boards/academic-levels",
  gradingSystems: "/api/v1/boards/grading-systems",
  validateBoardCode: "/api/v1/boards/validate-board-code",
  history: (id) => `/api/v1/boards/${id}/history`,
};
const INDIA_REGION_ORDER = [
  "All India",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];
const INDIA_REGION_NAMES = new Set(INDIA_REGION_ORDER);
const ALL_INDIA_STATE_ID = "__ALL_INDIA__";
const BOARD_ACADEMIC_LEVEL_ORDER = [
  "Intermediate 1st Year", "Intermediate 2nd Year", "Class XI", "Class XII",
  "Class XII / ISC", "Senior Secondary", "1st PUC", "2nd PUC", "Plus One", "Plus Two",
  "Higher Secondary 1st Year", "Higher Secondary 2nd Year", "Std XI", "Std XII",
  "+2 First Year", "+2 Second Year", "Plus One / Class XI", "Plus Two / Class XII",
];
const PRIMARY_BOARD_LEVEL_NAMES = new Set([
  "Intermediate 1st Year", "Intermediate 2nd Year", "Class XI", "Class XII",
  "Senior Secondary", "1st PUC", "2nd PUC", "Higher Secondary 1st Year",
  "Higher Secondary 2nd Year",
]);
const FRONTEND_BOARD_LEVELS = [
  "Intermediate 1st Year", "Intermediate 2nd Year", "Class XI", "Class XII",
  "Senior Secondary", "1st PUC", "2nd PUC", "Higher Secondary 1st Year",
  "Higher Secondary 2nd Year",
];
const DEFAULT_BOARD_CONFIG = {
  "Board of Intermediate Education, Andhra Pradesh": {
    boardCode: "BIEAP", boardType: "State Board", stateName: "Andhra Pradesh",
    academicLevelNames: ["Intermediate 1st Year", "Intermediate 2nd Year"],
  },
  "Telangana Board of Intermediate Education": {
    boardCode: "TGBIE", boardType: "State Board", stateName: "Telangana",
    academicLevelNames: ["Intermediate 1st Year", "Intermediate 2nd Year"],
  },
  "Central Board of Secondary Education": {
    boardCode: "CBSE", boardType: "Central Board", stateName: "All India",
    academicLevelNames: ["Class XI", "Class XII"],
  },
  "Council for the Indian School Certificate Examinations": {
    boardCode: "CISCE", boardType: "National / Central Board", stateName: "All India",
    academicLevelNames: ["Class XI", "Class XII"],
  },
  "Karnataka Pre-University Education / PUC System": {
    boardCode: "PUC-KA", boardType: "State Board", stateName: "Karnataka",
    academicLevelNames: ["1st PUC", "2nd PUC"],
  },
  "Tamil Nadu State Board – Higher Secondary": {
    boardCode: "DGE-TN", boardType: "State Board", stateName: "Tamil Nadu",
    academicLevelNames: ["Higher Secondary 1st Year", "Higher Secondary 2nd Year"],
  },
};
const normalizeMasterName = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const NORMALIZED_DEFAULT_BOARD_CONFIG = Object.fromEntries(
  Object.entries(DEFAULT_BOARD_CONFIG).map(([name, config]) => [normalizeMasterName(name), config]),
);
const CUSTOM_BOARD_VALUE = "__custom_board__";
const OTHER_COUNTRY_VALUE = "__other_country__";
const BOARD_NAME_OPTIONS = [
  ...Object.keys(DEFAULT_BOARD_CONFIG).map((boardName) => ({ value: boardName, label: boardName })),
  { value: CUSTOM_BOARD_VALUE, label: "Others" },
];

const emptyBoardForm = {
  boardName: "",
  boardCode: "",
  boardType: "",
  description: "",
  countryId: "",
  stateId: "",
  academicPatternId: "",
  academicLevelIds: [],
  internalAssessment: false,
  practicalExams: false,
  boardExams: false,
  passPercentage: "",
  gradingSystemId: "",
  rankCalculation: false,
  status: "",
  rowVersion: null,
};

/* Board rows and form masters intentionally start empty. The Board API is the only data source. */
const mapBoardListItem = (item = {}) => ({
  id: item.boardId ?? item.BoardId ?? item.id ?? item.Id,
  board: item.boardName ?? item.BoardName ?? "",
  code: item.boardCode ?? item.BoardCode ?? "",
  type: item.boardType || item.BoardType || NORMALIZED_DEFAULT_BOARD_CONFIG[
    normalizeMasterName(item.boardName ?? item.BoardName ?? "")
  ]?.boardType || "",
  countryId: item.countryId ?? item.CountryId ?? null,
  country: item.countryName ?? item.CountryName ?? "",
  stateId: item.stateId ?? item.StateId ?? null,
  state: item.stateName ?? item.StateName ?? "",
  pattern: item.academicPatternName ?? item.AcademicPatternName ?? "",
  level: (item.academicLevelNames ?? item.AcademicLevelNames ?? []).join?.(", ") || "",
  status: (item.status ?? item.Status) === false ? "Inactive" : "Active",
  rowVersion: item.rowVersion ?? item.RowVersion ?? null,
  createdDate: item.createdDate ?? item.CreatedDate ?? null,
});

const mapBoardDetails = (item = {}) => ({
  ...mapBoardListItem(item),
  description: item.description ?? item.Description ?? "",
  academicPatternId: item.academicPatternId ?? item.AcademicPatternId ?? null,
  academicLevelIds: item.academicLevelIds ?? item.AcademicLevelIds ?? [],
  level: (item.academicLevelNames ?? item.AcademicLevelNames ?? []).join(", "),
  internalAssessment: Boolean(item.internalAssessment ?? item.InternalAssessment),
  practicalExams: Boolean(item.practicalExams ?? item.PracticalExams),
  boardExams: Boolean(item.boardExams ?? item.BoardExams),
  passPercentage: item.passPercentage ?? item.PassPercentage ?? "",
  gradingSystemId: item.gradingSystemId ?? item.GradingSystemId ?? null,
  gradingSystem: item.gradingSystemName ?? item.GradingSystemName ?? "",
  rankCalculation: Boolean(item.rankCalculation ?? item.RankCalculation),
});

const yesNo = (value) => (value ? "Yes" : "No");
const formatBoardDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
};
const boardDetailEntries = (board) => [
  ["Board Name", board.board || "—"],
  ["Board Code", board.code || "—"],
  ["Board Type", board.type || "—"],
  ["Country", board.country || "—"],
  ["State", board.state || "—"],
  ["Academic Pattern", board.pattern || "—"],
  ["Academic Levels", board.level || "—"],
  ["Grading System", board.gradingSystem || "—"],
  ["Internal Assessment", yesNo(board.internalAssessment)],
  ["Practical Exams", yesNo(board.practicalExams)],
  ["Board Exams", yesNo(board.boardExams)],
  ["Rank Calculation", yesNo(board.rankCalculation)],
  ["Status", board.status || "—"],
  ["Created Date", formatBoardDate(board.createdDate)],
  ["Description / Notes", board.description || "—"],
];
const HIDDEN_BOARD_DETAIL_FIELDS = new Set([
  "Academic Pattern",
  "Internal Assessment",
  "Practical Exams",
  "Board Exams",
  "Rank Calculation",
]);

const unwrapPayload = (value) => value?.data ?? value?.Data ?? value;
const asArray = (value) => {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? payload?.Items ?? payload?.records ?? payload?.Records ?? [];
};

const optionValue = (item, camel, pascal) => item?.[camel] ?? item?.[pascal];

function SearchableApiSelect({ value, options, idKey, nameKey, placeholder, onChange, disabled = false, initiallyOpen = false }) {
  const [query, setQuery] = useState(initiallyOpen ? String(value ?? "") : "");
  const [filterByQuery, setFilterByQuery] = useState(!initiallyOpen);
  const [open, setOpen] = useState(initiallyOpen);
  const selected = options.find((item) => String(optionValue(item, idKey, idKey[0].toUpperCase() + idKey.slice(1))) === String(value));
  const selectedName = optionValue(selected, nameKey, nameKey[0].toUpperCase() + nameKey.slice(1)) || "";
  const activeQuery = filterByQuery ? query : "";
  const filtered = options.filter((item) =>
    String(optionValue(item, nameKey, nameKey[0].toUpperCase() + nameKey.slice(1)) || "")
      .toLowerCase().includes(activeQuery.trim().toLowerCase()),
  );
  return (
    <div className="bay-api-picker" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="bay-api-picker-input">
        <Search3DIcon size={16} />
        <input
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : (selectedName || query)}
          placeholder={open && selectedName ? selectedName : placeholder}
          onFocus={() => { if (!open) setQuery(""); setFilterByQuery(false); setOpen(true); }}
          onChange={(event) => { setQuery(event.target.value); setFilterByQuery(true); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && filtered[0]) {
              event.preventDefault();
              onChange(optionValue(filtered[0], idKey, idKey[0].toUpperCase() + idKey.slice(1)));
              setOpen(false);
            }
          }}
        />
      </div>
      {open ? <div className="bay-api-options" role="listbox">
        {filtered.map((item) => {
          const id = optionValue(item, idKey, idKey[0].toUpperCase() + idKey.slice(1));
          const name = optionValue(item, nameKey, nameKey[0].toUpperCase() + nameKey.slice(1));
          const frontendOnly = Boolean(item.frontendOnly);
          return <button type="button" role="option" aria-selected={String(id) === String(value)} aria-disabled={frontendOnly} disabled={frontendOnly} key={id} onClick={() => { onChange(id); setOpen(false); }}>
            <span>{name}{frontendOnly ? <small>Not configured in API</small> : null}</span>
          </button>;
        })}
        {!filtered.length ? <span>No matching options found.</span> : null}
      </div> : null}
    </div>
  );
}

function ApiLevelMultiSelect({ value, options, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const selectedIds = value.map(String);
  const selected = options.filter((item) => selectedIds.includes(String(optionValue(item, "academicLevelId", "AcademicLevelId"))));
  const selectedNames = selected
    .map((item) => optionValue(item, "levelName", "LevelName"))
    .filter(Boolean)
    .join(", ");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((item) => {
    const name = String(optionValue(item, "levelName", "LevelName") || "");
    if (normalizedQuery) return name.toLowerCase().includes(normalizedQuery);
    return showOthers || PRIMARY_BOARD_LEVEL_NAMES.has(name);
  });
  const toggle = (id) => {
    if (selectedIds.includes(String(id))) onChange(value.filter((item) => String(item) !== String(id)));
    else onChange([...value, id]);
    setQuery("");
  };
  return (
    <div className="bay-level-picker bay-api-level-picker" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="bay-level-combobox">
        <Search3DIcon size={16} />
        <input role="combobox" aria-expanded={open} value={open ? query : selectedNames} placeholder={selected.length ? "Search another level" : "Search academic level"}
          title={!open ? selectedNames : undefined}
          onFocus={() => { setQuery(""); setOpen(true); }} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && filtered[0]) {
              event.preventDefault();
              toggle(optionValue(filtered[0], "academicLevelId", "AcademicLevelId"));
            }
          }} />
        {open && selected.length ? <span className="bay-level-count">{selected.length} selected</span> : null}
      </div>
      {open ? <div className="bay-level-options" role="listbox">
        {filtered.map((item) => {
          const id = optionValue(item, "academicLevelId", "AcademicLevelId");
          const isSelected = selectedIds.includes(String(id));
          const frontendOnly = Boolean(item.frontendOnly);
          return <button type="button" role="option" aria-selected={isSelected} aria-disabled={frontendOnly} disabled={frontendOnly} key={id} onClick={() => toggle(id)}>
            <span>{optionValue(item, "levelName", "LevelName")}{frontendOnly ? <small>Not configured in API</small> : null}</span>{isSelected ? <X size={13} /> : null}
          </button>;
        })}
        {!normalizedQuery && !showOthers ? (
          <button type="button" className="bay-level-others" onClick={() => setShowOthers(true)}>
            <span>Others</span>
          </button>
        ) : null}
        {!filtered.length ? <span>No academic levels found.</span> : null}
      </div> : null}
    </div>
  );
}

const emptyForm = {
  boardId: "",
  boardName: "",
  board: "",
  code: "",
  type: "",
  state: "",
  level: "",
  year: "",
  start: "",
  end: "",
  admissionStart: "",
  admissionEnd: "",
  duration: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "",
  description: "",
};
const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${value}T00:00:00`),
      )
    : "—";

const yearCode = (year = "") => `AY-${year.replace(/[^0-9]/g, "-").replace(/-+/g, "-")}`;

const dateInputValue = (value) => (value ? String(value).slice(0, 10) : "");

const mapAcademicYearFromApi = (item = {}) => ({
  id: item.academicYearId ?? item.AcademicYearId ?? item.id ?? item.Id,
  boardId: item.boardId ?? item.BoardId ?? "",
  boardName: item.boardName ?? item.BoardName ?? "",
  year: item.academicYearName ?? item.AcademicYearName ?? item.year ?? "",
  start: dateInputValue(item.startDate ?? item.StartDate ?? item.start),
  end: dateInputValue(item.endDate ?? item.EndDate ?? item.end),
  admissionStart: dateInputValue(
    item.admissionStartDate ?? item.AdmissionStartDate ?? item.admissionStart,
  ),
  admissionEnd: dateInputValue(
    item.admissionEndDate ?? item.AdmissionEndDate ?? item.admissionEnd,
  ),
  status:
    (item.isActive ?? item.IsActive) === false ||
    String(item.status ?? item.Status ?? "").toLowerCase() === "inactive"
      ? "Inactive"
      : "Active",
  description: item.description ?? item.Description ?? "",
});

function unwrapAcademicYearItem(responseData) {
  const payload = responseData?.data ?? responseData?.Data ?? responseData;
  return mapAcademicYearFromApi(payload);
}

function normalizeAcademicYearList(responseData, requestedPage, requestedSize) {
  const envelope = responseData?.data ?? responseData?.Data ?? responseData ?? {};
  const items = Array.isArray(envelope)
    ? envelope
    : envelope.items ?? envelope.Items ?? envelope.records ?? envelope.Records ?? envelope.data ?? envelope.Data ?? [];
  const totalCount = Number(
    envelope.totalCount ??
      envelope.TotalCount ??
      responseData?.totalCount ??
      responseData?.TotalCount ??
      items.length,
  );
  const pageSize = Number(envelope.pageSize ?? envelope.PageSize ?? requestedSize) || requestedSize;
  const pageNumber = Number(envelope.pageNumber ?? envelope.PageNumber ?? requestedPage) || requestedPage;
  const totalPages = Number(
    envelope.totalPages ?? envelope.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  return {
    items: (Array.isArray(items) ? items : []).map(mapAcademicYearFromApi),
    totalCount,
    pageNumber,
    pageSize,
    totalPages: Math.max(1, totalPages),
  };
}

const academicYearPayload = (draft) => {
  const payload = {
    boardId: Number(draft.boardId),
    academicYearName: draft.year.trim(),
    isActive: draft.status === "Active",
    description: draft.description?.trim() || "",
  };
  if (draft.start) payload.startDate = draft.start;
  if (draft.end) payload.endDate = draft.end;
  if (draft.admissionStart) payload.admissionStartDate = draft.admissionStart;
  if (draft.admissionEnd) payload.admissionEndDate = draft.admissionEnd;
  return payload;
};

function AcademicYearWorkspace() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [activeBoards, setActiveBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchAcademicYears = useCallback(async (pageOverride = page) => {
    const sequence = ++requestSequence.current;
    setListLoading(true);
    try {
      const response = await apiClient.get(ACADEMIC_YEAR_API.list, {
        params: {
          Search: debouncedQuery || undefined,
          PageNumber: pageOverride,
          PageSize: PAGE_SIZE,
          "api-version": API_VERSION,
        },
      });
      if (sequence !== requestSequence.current) return;
      const normalized = normalizeAcademicYearList(response.data, pageOverride, PAGE_SIZE);
      setAcademicYears(normalized.items);
      setTotalCount(normalized.totalCount);
      setTotalPages(normalized.totalPages);
      if (normalized.pageNumber !== pageOverride) setPage(normalized.pageNumber);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setAcademicYears([]);
      setTotalCount(0);
      setTotalPages(1);
      setToast(getApiErrorMessage(error));
    } finally {
      if (sequence === requestSequence.current) setListLoading(false);
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    let active = true;
    setBoardsLoading(true);
    apiClient.get(BOARD_API.list, { params: { Status: true } })
      .then((response) => {
        if (!active) return;
        setActiveBoards(asArray(response.data).map(mapBoardListItem).filter((board) => board.status === "Active"));
      })
      .catch((error) => {
        if (!active) return;
        setActiveBoards([]);
        setToast(getApiErrorMessage(error, "Unable to load active Boards."));
      })
      .finally(() => {
        if (active) setBoardsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchAcademicYearDetails = async (id) => {
    setDetailsLoading(true);
    setSelected(null);
    setDetailsOpen(true);
    setFormOpen(false);
    try {
      const response = await apiClient.get(ACADEMIC_YEAR_API.byId(id), {
        params: { "api-version": API_VERSION },
      });
      const record = unwrapAcademicYearItem(response.data);
      setSelected(record);
      setEditingId(record.id);
      setDraft(record);
      setDetailsOpen(true);
      setFormOpen(false);
      return record;
    } catch (error) {
      setDetailsOpen(false);
      setToast(getApiErrorMessage(error));
      return null;
    } finally {
      setDetailsLoading(false);
    }
  };

  const currentPage = Math.min(page, totalPages);
  const pages = totalPages;
  const visible = academicYears;
  const edit = (row) => {
    setEditingId(row.id);
    setDraft({ ...row });
    setDetailsOpen(false);
    setFormOpen(true);
  };
  const update = (name, value) => setDraft((current) => ({ ...current, [name]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!draft.boardId || !draft.year?.trim() || !draft.status) {
      setToast("Complete all required fields.");
      return;
    }
    if (draft.start && draft.end && draft.start > draft.end) {
      setToast("Start Date cannot be after End Date.");
      return;
    }
    if (draft.admissionStart && draft.admissionEnd && draft.admissionStart > draft.admissionEnd) {
      setToast("Admission Start Date cannot be after Admission End Date.");
      return;
    }
    setSaving(true);
    try {
      const payload = academicYearPayload(draft);
      if (editingId) {
        const statusChanged = Boolean(selected) && selected.status !== draft.status;
        const contentChanged =
          !selected ||
          selected.year !== draft.year ||
          selected.start !== draft.start ||
          selected.end !== draft.end ||
          selected.admissionStart !== draft.admissionStart ||
          selected.admissionEnd !== draft.admissionEnd ||
          selected.description !== draft.description;
        if (statusChanged && !contentChanged) {
          const endpoint =
            draft.status === "Active"
              ? ACADEMIC_YEAR_API.activate(editingId)
              : ACADEMIC_YEAR_API.deactivate(editingId);
          await apiClient.patch(endpoint, null, { params: { "api-version": API_VERSION } });
        } else {
          await apiClient.put(ACADEMIC_YEAR_API.byId(editingId), payload, {
            params: { "api-version": API_VERSION },
          });
        }
        setToast("Academic Year updated successfully.");
      } else {
        await apiClient.post(ACADEMIC_YEAR_API.create, payload, {
          params: { "api-version": API_VERSION },
        });
        setToast("Academic Year added successfully.");
      }
      setDetailsOpen(false);
      setFormOpen(false);
      setSelected(null);
      setEditingId(null);
      setDraft(emptyForm);
      if (page !== 1) setPage(1);
      else await fetchAcademicYears(1);
      window.dispatchEvent(new CustomEvent("cms_academic_masters_updated"));
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const deleteAcademicYear = async (row) => {
    if (deletingId || !window.confirm(`Delete academic year ${row.year}? This action cannot be undone.`)) return;
    setDeletingId(row.id);
    try {
      await apiClient.delete(ACADEMIC_YEAR_API.delete(row.id), {
        params: { "api-version": API_VERSION },
      });
      setToast("Academic Year deleted successfully.");
      if (selected?.id === row.id) {
        setSelected(null);
        setDetailsOpen(false);
        setFormOpen(false);
      }
      const targetPage = academicYears.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      else await fetchAcademicYears(targetPage);
      window.dispatchEvent(new CustomEvent("cms_academic_masters_updated"));
    } catch (error) {
      setToast(getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };
  return (
    <section
      className={`ay-workspace${formOpen ? " is-form-open" : ""}${detailsOpen ? " is-details-open" : ""}`}
    >
      <section className="bay-card ay-list-card">
        <div className="bay-toolbar">
          <label className="bay-search">
            <Search3DIcon size={16} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search academic year, start date, end date, admission period..."
            />
          </label>
          <div className="bay-toolbar-actions">
            <button
              className="cms-btn cms-btn-primary"
              disabled={listLoading}
              onClick={() => {
                setEditingId(null);
                setSelected(null);
                setDraft(emptyForm);
                setDetailsOpen(false);
                setFormOpen(true);
              }}
            >
              <Plus size={16} /> Add Academic Year
            </button>
          </div>
        </div>
        <div className="bay-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Board Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Admission Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan="7" className="bay-empty">Loading academic years...</td>
                </tr>
              ) : null}
              {!listLoading && !visible.length ? (
                <tr>
                  <td colSpan="7" className="bay-empty">No academic years available.</td>
                </tr>
              ) : null}
              {!listLoading && visible.map((row) => (
                <tr key={row.id} className={selected?.id === row.id ? "is-selected" : ""}>
                  <td>
                    <strong>{row.year}</strong>
                  </td>
                  <td>{row.boardName || "—"}</td>
                  <td>{fmt(row.start)}</td>
                  <td>{fmt(row.end)}</td>
                  <td>
                    {fmt(row.admissionStart)} – {fmt(row.admissionEnd)}
                  </td>
                  <td>
                    <span className={`bay-status ${row.status.toLowerCase()}`}>{row.status}</span>
                  </td>
                  <td>
                    <div className="bay-actions">
                      <button
                        type="button"
                        className="bay-action-view"
                        aria-label={`View academic year ${row.year}`}
                        title="View academic year details"
                        disabled={detailsLoading}
                        onClick={() => fetchAcademicYearDetails(row.id)}
                      >
                        <Eye />
                      </button>
                      <button
                        type="button"
                        className="bay-action-delete"
                        aria-label={`Delete academic year ${row.year}`}
                        title="Delete academic year"
                        disabled={deletingId === row.id}
                        onClick={() => deleteAcademicYear(row)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer>
          <span>
            Showing {totalCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} records
          </span>
          <nav aria-label="Academic year pagination">
            <button
              className="bay-page-direction"
              disabled={listLoading || currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Prev
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                className={number === currentPage ? "active" : ""}
                disabled={listLoading}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}
            <button
              className="bay-page-direction"
              disabled={listLoading || currentPage === pages}
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
            >
              Next
            </button>
          </nav>
        </footer>
      </section>
      {formOpen || detailsOpen ? (
        <button
          type="button"
          className="cms-back-link ay-form-back"
          onClick={() => {
            setFormOpen(false);
            setDetailsOpen(false);
            setEditingId(selected?.id || null);
            setDraft(selected || emptyForm);
          }}
        >
          <ArrowLeft size={15} /> Back to Academic Year Management
        </button>
      ) : null}
      <div className="ay-lower-grid">
        <article className="bay-card bay-bottom bay-details ay-year-details-card">
          <header>
            <div>
              <Eye size={18} />
              <h2>Configuration Details</h2>
            </div>
            {selected ? (
              <button
                className="cms-btn cms-btn-ghost bay-details-edit"
                onClick={() => edit(selected)}
              >
                <Edit3 size={15} /> Edit Configuration
              </button>
            ) : null}
          </header>
          {detailsLoading ? (
            <p className="bay-empty">Loading academic year details...</p>
          ) : selected ? (
            <dl>
              {[
                ["Academic Year Name", selected.year],
                ["Board Name", selected.boardName],
                ["Start Date", fmt(selected.start)],
                ["End Date", fmt(selected.end)],
                ["Admission Start Date", fmt(selected.admissionStart)],
                ["Admission End Date", fmt(selected.admissionEnd)],
                ["Status", selected.status],
                ["Description / Notes", selected.description],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <span className="bay-detail-separator" aria-hidden="true">
                    –
                  </span>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="bay-empty">Select an academic year to view details.</p>
          )}
        </article>
        <article className="bay-card ay-form-card">
          <header>
            <div>
              <Edit3 size={18} />
              <h2>{editingId ? "Edit Academic Year" : "Add Academic Year"}</h2>
            </div>
          </header>
          <form onSubmit={save}>
            <label>
              <span>
                Board Name <b>*</b>
              </span>
              <select
                value={draft.boardId || ""}
                disabled={boardsLoading}
                onChange={(event) => {
                  const boardId = event.target.value;
                  const boardName = activeBoards.find((board) => String(board.id) === boardId)?.board || "";
                  setDraft((current) => ({ ...current, boardId, boardName }));
                }}
                required
              >
                <option value="">{boardsLoading ? "Loading active Boards..." : "Select Board Name"}</option>
                {activeBoards.map((board) => (
                  <option key={board.id} value={board.id}>{board.board}</option>
                ))}
              </select>
            </label>
            <label>
              <span>
                Academic Year Name <b>*</b>
              </span>
              <input
                value={draft.year || ""}
                onChange={(event) => update("year", event.target.value)}
                placeholder="2026–2027"
              />
            </label>
            <label>
              <span>
                Start Date
              </span>
              <input
                type="date"
                value={draft.start || ""}
                onChange={(event) => update("start", event.target.value)}
              />
            </label>
            <label>
              <span>
                End Date
              </span>
              <input
                type="date"
                value={draft.end || ""}
                onChange={(event) => update("end", event.target.value)}
              />
            </label>
            <label>
              <span>Admission Start Date</span>
              <input
                type="date"
                value={draft.admissionStart || ""}
                onChange={(event) => update("admissionStart", event.target.value)}
              />
            </label>
            <label>
              <span>Admission End Date</span>
              <input
                type="date"
                value={draft.admissionEnd || ""}
                onChange={(event) => update("admissionEnd", event.target.value)}
              />
            </label>
            <label className="ay-status-field">
              <span>
                Status <b>*</b>
              </span>
              <select
                value={draft.status || ""}
                onChange={(event) => update("status", event.target.value)}
              >
                <option value="">Select status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
            <label className="span-3">
              Description / Notes
              <textarea
                rows="3"
                value={draft.description || ""}
                onChange={(event) => update("description", event.target.value)}
              />
            </label>
            <div className="ay-form-actions span-3">
              <button className="cms-btn cms-btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? "Saving..." : "Save Academic Year"}
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  setFormOpen(false);
                  setDetailsOpen(false);
                  setEditingId(selected?.id || null);
                  setDraft(selected || emptyForm);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </article>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </section>
  );
}

export default function BoardAcademicYearManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const screen = searchParams.get("screen");
  const tabParam = searchParams.get("tab");
  const formOpen = screen === "form";
  const detailsOpen = screen === "details";
  const [boardRows, setBoardRows] = useState([]),
    [selected, setSelected] = useState(null),
    [form, setForm] = useState(emptyBoardForm),
    [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState(""),
    [debouncedQuery, setDebouncedQuery] = useState(""),
    [page, setPage] = useState(1),
    [boardTotalCount, setBoardTotalCount] = useState(0),
    [boardTotalPages, setBoardTotalPages] = useState(1),
    [toast, setToast] = useState("");
  const [boardListLoading, setBoardListLoading] = useState(false);
  const [boardDetailsLoading, setBoardDetailsLoading] = useState(false);
  const [boardFormDataLoading, setBoardFormDataLoading] = useState(false);
  const [boardSaving, setBoardSaving] = useState(false);
  const [boardDeletingId, setBoardDeletingId] = useState(null);
  const [codeValidationMessage, setCodeValidationMessage] = useState("");
  const [customBoardEntry, setCustomBoardEntry] = useState(false);
  const [openExistingBoardPicker, setOpenExistingBoardPicker] = useState(false);
  const [choosingOtherCountry, setChoosingOtherCountry] = useState(false);
  const [otherCountryName, setOtherCountryName] = useState("");
  const [formData, setFormData] = useState({
    countries: [],
    academicPatterns: [],
    academicLevels: [],
    gradingSystems: [],
  });
  const [states, setStates] = useState([]);
  const listRequestRef = useRef(0);
  const statesRequestRef = useRef(0);
  const boardSelectionRequestRef = useRef(0);
  const [activeTab, setActiveTab] = useState(
    tabParam === "academic-years" || tabParam === "academic-year" ? "academic-years" : "boards",
  );

  useEffect(() => {
    if (tabParam === "academic-years" || tabParam === "academic-year") {
      setActiveTab("academic-years");
    } else if (tabParam === "boards" || tabParam === "board") {
      setActiveTab("boards");
    }
  }, [tabParam]);
  const indiaStates = useMemo(() => {
    const matching = states.filter((item) => INDIA_REGION_NAMES.has(optionValue(item, "stateName", "StateName")));
    const byName = new Map(matching.map((item) => [String(optionValue(item, "stateName", "StateName")).toLowerCase(), item]));
    return INDIA_REGION_ORDER.map((stateName) => {
      const apiState = byName.get(stateName.toLowerCase());
      if (apiState) return apiState;
      if (stateName === "All India") return { stateId: ALL_INDIA_STATE_ID, stateName };
      return { stateId: `frontend:${stateName}`, stateName, frontendOnly: true };
    });
  }, [states]);
  const indiaCountry = useMemo(() => formData.countries.find((item) =>
    normalizeMasterName(optionValue(item, "countryName", "CountryName")) === "india",
  ), [formData.countries]);
  const otherCountries = useMemo(() => formData.countries.filter((item) =>
    normalizeMasterName(optionValue(item, "countryName", "CountryName")) !== "india",
  ), [formData.countries]);
  const stateOptions = useMemo(() => {
    const indiaId = optionValue(indiaCountry, "countryId", "CountryId");
    return String(form.countryId) === String(indiaId) ? indiaStates : states;
  }, [form.countryId, indiaCountry, indiaStates, states]);
  const boardAcademicLevels = useMemo(() => {
    const apiLevels = [...formData.academicLevels];
    const apiNames = new Set(apiLevels.map((item) => String(optionValue(item, "levelName", "LevelName")).trim().toLowerCase()));
    const frontendFallbacks = FRONTEND_BOARD_LEVELS
      .filter((name) => !apiNames.has(name.toLowerCase()))
      .map((name) => ({ academicLevelId: `frontend:${name}`, levelName: name, frontendOnly: true }));
    return [...apiLevels, ...frontendFallbacks].sort((a, b) => {
    const aName = optionValue(a, "levelName", "LevelName");
    const bName = optionValue(b, "levelName", "LevelName");
    const aIndex = BOARD_ACADEMIC_LEVEL_ORDER.indexOf(aName);
    const bIndex = BOARD_ACADEMIC_LEVEL_ORDER.indexOf(bName);
    if (aIndex !== bIndex) return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
    return String(aName).localeCompare(String(bName));
    });
  }, [formData.academicLevels]);
  const filtered = { length: boardTotalCount };
  const currentPage = page;
  const pages = boardTotalPages;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchBoards = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setBoardListLoading(true);
    try {
      const response = await apiClient.get(BOARD_API.list, {
        params: { Search: debouncedQuery || undefined, PageNumber: page, PageSize: PAGE_SIZE },
      });
      if (requestId !== listRequestRef.current) return;
      const envelope = unwrapPayload(response.data) ?? {};
      const items = asArray(response.data);
      setBoardRows(items.map(mapBoardListItem));
      setBoardTotalCount(Number(envelope.totalCount ?? envelope.TotalCount ?? items.length));
      setBoardTotalPages(
        Math.max(1, Number(envelope.totalPages ?? envelope.TotalPages ?? Math.ceil(items.length / PAGE_SIZE))),
      );
    } catch (error) {
      if (requestId !== listRequestRef.current) return;
      setBoardRows([]);
      setBoardTotalCount(0);
      setBoardTotalPages(1);
      setToast(getApiErrorMessage(error, "Unable to load boards."));
    } finally {
      if (requestId === listRequestRef.current) setBoardListLoading(false);
    }
  }, [debouncedQuery, page]);

  useEffect(() => {
    if (activeTab === "boards" && !formOpen && !detailsOpen) fetchBoards();
  }, [activeTab, detailsOpen, fetchBoards, formOpen]);

  const loadFormData = useCallback(async () => {
    if (formData.countries.length) return formData;
    setBoardFormDataLoading(true);
    try {
      let payload;
      try {
        payload = unwrapPayload((await apiClient.get(BOARD_API.formData)).data) ?? {};
      } catch (formDataError) {
        if (formDataError?.response?.status !== 404) throw formDataError;
        const [countries, academicPatterns, academicLevels, gradingSystems] = await Promise.all([
          apiClient.get(BOARD_API.countries),
          apiClient.get(BOARD_API.academicPatterns),
          apiClient.get(BOARD_API.academicLevels),
          apiClient.get(BOARD_API.gradingSystems),
        ]);
        payload = {
          countries: asArray(countries.data),
          academicPatterns: asArray(academicPatterns.data),
          academicLevels: asArray(academicLevels.data),
          gradingSystems: asArray(gradingSystems.data),
        };
      }
      const next = {
        countries: payload.countries ?? payload.Countries ?? [],
        academicPatterns: payload.academicPatterns ?? payload.AcademicPatterns ?? [],
        academicLevels: payload.academicLevels ?? payload.AcademicLevels ?? [],
        gradingSystems: payload.gradingSystems ?? payload.GradingSystems ?? [],
      };
      setFormData(next);
      return next;
    } catch (error) {
      setToast(getApiErrorMessage(error, "Unable to load Board form options."));
      return null;
    } finally {
      setBoardFormDataLoading(false);
    }
  }, [formData]);

  const loadStates = useCallback(async (countryId) => {
    const requestId = ++statesRequestRef.current;
    setStates([]);
    if (!countryId) return [];
    try {
      const response = await apiClient.get(BOARD_API.states(countryId));
      if (requestId !== statesRequestRef.current) return [];
      const values = asArray(response.data);
      setStates(values);
      return values;
    } catch (error) {
      if (requestId === statesRequestRef.current) {
        setToast(getApiErrorMessage(error, "Unable to load states."));
      }
      return [];
    }
  }, []);

  const fetchBoardDetails = useCallback(async (id, openDetails = true) => {
    setBoardDetailsLoading(true);
    try {
      const response = await apiClient.get(BOARD_API.byId(id));
      const record = mapBoardDetails(unwrapPayload(response.data));
      setSelected(record);
      if (openDetails) setSearchParams({ screen: "details", id: String(id) });
      return record;
    } catch (error) {
      setToast(getApiErrorMessage(error, "Unable to load Board details."));
      return null;
    } finally {
      setBoardDetailsLoading(false);
    }
  }, [setSearchParams]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const handleCountryChange = async (value, keepOtherPicker = false) => {
    if (value === OTHER_COUNTRY_VALUE) {
      setChoosingOtherCountry(true);
      setOtherCountryName("");
      setForm((current) => ({ ...current, countryId: "", stateId: "" }));
      setStates([]);
      return;
    }
    setChoosingOtherCountry(keepOtherPicker);
    if (!keepOtherPicker) setOtherCountryName("");
    setForm((current) => ({ ...current, countryId: value, stateId: "" }));
    await loadStates(value);
  };
  const handleOtherCountryNameChange = async (value) => {
    setOtherCountryName(value);
    const matchingCountry = otherCountries.find((item) =>
      normalizeMasterName(optionValue(item, "countryName", "CountryName")) === normalizeMasterName(value),
    );
    const countryId = matchingCountry ? optionValue(matchingCountry, "countryId", "CountryId") : "";
    setForm((current) => ({ ...current, countryId, stateId: "" }));
    if (countryId) await loadStates(countryId);
    else setStates([]);
  };
  const handleBoardNameChange = async (value) => {
    const requestId = ++boardSelectionRequestRef.current;
    setCodeValidationMessage("");
    if (value === CUSTOM_BOARD_VALUE) {
      setCustomBoardEntry(true);
      setOpenExistingBoardPicker(false);
      setForm((current) => ({
        ...current,
        boardName: "",
        boardCode: "",
        boardType: "",
        stateId: "",
        academicLevelIds: [],
      }));
      return;
    }

    setCustomBoardEntry(false);
    setOpenExistingBoardPicker(false);
    setChoosingOtherCountry(false);
    setOtherCountryName("");
    const config = NORMALIZED_DEFAULT_BOARD_CONFIG[normalizeMasterName(value)];
    if (!config) {
      setForm((current) => ({ ...current, boardName: value }));
      return;
    }

    const masters = formData.countries.length ? formData : await loadFormData();
    if (!masters || requestId !== boardSelectionRequestRef.current) return;
    const india = masters.countries.find((item) => normalizeMasterName(optionValue(item, "countryName", "CountryName")) === "india");
    const countryId = optionValue(india, "countryId", "CountryId") || "";
    const availableStates = countryId ? await loadStates(countryId) : [];
    if (requestId !== boardSelectionRequestRef.current) return;

    const stateRecord = availableStates.find((item) =>
      normalizeMasterName(optionValue(item, "stateName", "StateName")) === normalizeMasterName(config.stateName),
    );
    const stateId = stateRecord
      ? optionValue(stateRecord, "stateId", "StateId")
      : (config.stateName === "All India" ? ALL_INDIA_STATE_ID : "");
    const resolvedLevels = config.academicLevelNames.map((levelName) => masters.academicLevels.find((item) =>
      normalizeMasterName(optionValue(item, "levelName", "LevelName")) === normalizeMasterName(levelName),
    )).filter(Boolean);
    setForm((current) => ({
      ...current,
      boardName: value,
      boardCode: config.boardCode,
      boardType: config.boardType,
      countryId,
      stateId,
      academicLevelIds: resolvedLevels.map((item) => optionValue(item, "academicLevelId", "AcademicLevelId")),
    }));

  };
  const startAdd = async () => {
    setEditingId(null);
    setForm(emptyBoardForm);
    setCustomBoardEntry(false);
    setOpenExistingBoardPicker(false);
    setChoosingOtherCountry(false);
    setOtherCountryName("");
    setSelected(null);
    setStates([]);
    setCodeValidationMessage("");
    setSearchParams({ screen: "form", mode: "add" });
    const masters = await loadFormData();
    if (masters) {
      const india = masters.countries.find((item) =>
        String(optionValue(item, "countryName", "CountryName")).toLowerCase() === "india",
      ) ?? masters.countries[0];
      const countryId = optionValue(india, "countryId", "CountryId") ?? "";
      setForm((current) => ({
        ...current,
        countryId,
        academicPatternId: optionValue(masters.academicPatterns[0], "academicPatternId", "AcademicPatternId") ?? "",
        gradingSystemId: "",
        passPercentage: "0",
      }));
      if (countryId) await loadStates(countryId);
    }
  };
  const startEdit = async (row) => {
    const record = row.academicLevelIds ? row : await fetchBoardDetails(row.id, false);
    if (!record) return;
    const masters = await loadFormData();
    if (record.countryId) await loadStates(record.countryId);
    setEditingId(record.id);
    setCustomBoardEntry(false);
    setOpenExistingBoardPicker(false);
    const editIndia = masters?.countries?.find((item) =>
      normalizeMasterName(optionValue(item, "countryName", "CountryName")) === "india",
    );
    setChoosingOtherCountry(Boolean(record.countryId && String(record.countryId) !== String(optionValue(editIndia, "countryId", "CountryId"))));
    setOtherCountryName(
      record.countryId && String(record.countryId) !== String(optionValue(editIndia, "countryId", "CountryId"))
        ? record.country
        : "",
    );
    setForm({
      boardName: record.board,
      boardCode: record.code,
      boardType: record.type || "",
      description: record.description,
      countryId: record.countryId ?? "",
      stateId: record.stateId ?? (String(record.country).toLowerCase() === "india" ? ALL_INDIA_STATE_ID : ""),
      academicPatternId: record.academicPatternId ?? "",
      academicLevelIds: record.academicLevelIds ?? [],
      internalAssessment: record.internalAssessment,
      practicalExams: record.practicalExams,
      boardExams: record.boardExams,
      passPercentage: record.passPercentage,
      gradingSystemId: record.gradingSystemId ?? "",
      rankCalculation: record.rankCalculation,
      status: record.status === "Active" ? "Active" : "Inactive",
      rowVersion: record.rowVersion,
    });
    setSelected(record);
    setCodeValidationMessage("");
    setSearchParams({ screen: "form", mode: "edit", id: String(record.id) });
  };

  const validateBoardCode = async (value = form.boardCode) => {
    const boardCode = String(value).trim().toUpperCase();
    if (!boardCode) return false;
    try {
      const body = { boardCode, boardId: editingId ?? null };
      const result = unwrapPayload((await apiClient.post(BOARD_API.validateBoardCode, body)).data);
      const valid = result?.isValid ?? result?.IsValid ?? false;
      setCodeValidationMessage(valid ? "" : result?.message ?? result?.Message ?? "Board code is already in use.");
      return valid;
    } catch (error) {
      setCodeValidationMessage(getApiErrorMessage(error, "Unable to validate Board code."));
      return false;
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (boardSaving) return;
    const boardName = form.boardName.trim();
    const boardCode = form.boardCode.trim().toUpperCase();
    const passPercentage = editingId ? Number(form.passPercentage || 0) : 0;
    const academicPatternId = form.academicPatternId ||
      optionValue(formData.academicPatterns[0], "academicPatternId", "AcademicPatternId") || "";
    const missingBoardFields = [
      [!boardName, "Board Name"],
      [!boardCode, "Board Code"],
      [!form.boardType, "Board Type"],
      [!form.countryId, choosingOtherCountry ? "Valid Country Name" : "Country"],
      [!form.stateId, "State"],
      [!form.academicLevelIds.length, "Academic Levels"],
      [!form.gradingSystemId, "Grading System"],
      [!form.status, "Status"],
    ].filter(([missing]) => missing).map(([, label]) => label);
    if (missingBoardFields.length) {
      setToast(`Select the required field${missingBoardFields.length > 1 ? "s" : ""}: ${missingBoardFields.join(", ")}.`);
      return;
    }
    if (!(await validateBoardCode(boardCode))) return;
    const payload = {
      boardName,
      boardCode,
      boardType: form.boardType.trim(),
      description: form.description.trim() || null,
      countryId: Number(form.countryId),
      stateId: form.stateId === ALL_INDIA_STATE_ID ? null : (form.stateId ? Number(form.stateId) : null),
      academicPatternId: academicPatternId ? Number(academicPatternId) : null,
      academicLevelIds: form.academicLevelIds.map(Number),
      internalAssessment: Boolean(form.internalAssessment),
      practicalExams: Boolean(form.practicalExams),
      boardExams: Boolean(form.boardExams),
      passPercentage,
      gradingSystemId: Number(form.gradingSystemId),
      rankCalculation: Boolean(form.rankCalculation),
      status: form.status === "Active",
    };
    setBoardSaving(true);
    try {
      if (editingId) {
        const statusOnly = selected && Object.entries(payload).every(([key, value]) => {
          if (key === "status") return true;
          const comparable = {
            boardName: selected.board, boardCode: selected.code, boardType: selected.type,
            description: selected.description || null,
            countryId: selected.countryId, stateId: selected.stateId, academicPatternId: selected.academicPatternId,
            academicLevelIds: selected.academicLevelIds, internalAssessment: selected.internalAssessment,
            practicalExams: selected.practicalExams, boardExams: selected.boardExams,
            passPercentage: Number(selected.passPercentage), gradingSystemId: selected.gradingSystemId,
            rankCalculation: selected.rankCalculation,
          }[key];
          return JSON.stringify(value) === JSON.stringify(comparable);
        });
        if (statusOnly && payload.status !== (selected.status === "Active")) {
          await apiClient.patch(BOARD_API.status(editingId), {
            status: payload.status,
            ...(form.rowVersion != null ? { rowVersion: form.rowVersion } : {}),
          });
        } else {
          await apiClient.put(BOARD_API.byId(editingId), {
            ...payload,
            ...(form.rowVersion != null ? { rowVersion: form.rowVersion } : {}),
          });
        }
        setToast("Board updated successfully.");
      } else {
        await apiClient.post(BOARD_API.create, payload);
        setToast("Board added successfully.");
        setPage(1);
      }
      setSelected(null);
      setEditingId(null);
      setForm(emptyBoardForm);
      setCustomBoardEntry(false);
      setChoosingOtherCountry(false);
      setOtherCountryName("");
      setSearchParams({});
      await fetchBoards();
      window.dispatchEvent(new CustomEvent("cms_academic_masters_updated"));
    } catch (error) {
      if (error?.response?.status === 409) {
        setToast("This Board was changed by another user. Please reload and try again.");
        if (editingId) await fetchBoardDetails(editingId, false);
      } else {
        setToast(getApiErrorMessage(error, "Unable to save Board."));
      }
    } finally {
      setBoardSaving(false);
    }
  };
  const deleteBoard = async (row) => {
    if (boardDeletingId || !window.confirm(`Delete ${row.board}? This action cannot be undone.`)) return;
    setBoardDeletingId(row.id);
    try {
      const detailsResponse = await apiClient.get(BOARD_API.byId(row.id));
      const currentBoard = mapBoardDetails(unwrapPayload(detailsResponse.data));
      const rowVersion = currentBoard.rowVersion ?? row.rowVersion;
      await apiClient.delete(BOARD_API.byId(row.id), {
        params: rowVersion != null ? { rowVersion } : undefined,
      });
      setToast("Board deleted successfully.");
      if (selected?.id === row.id) {
        setSelected(null);
        setSearchParams({});
      }
      const targetPage = boardRows.length === 1 && page > 1 ? page - 1 : page;
      if (targetPage !== page) setPage(targetPage);
      else await fetchBoards();
      window.dispatchEvent(new CustomEvent("cms_academic_masters_updated"));
    } catch (error) {
      if (error?.response?.status === 404) {
        setToast("This Board no longer exists. The table has been refreshed.");
        await fetchBoards();
      } else if (error?.response?.status === 409) {
        setToast("This Board was changed by another user. Reload the page and try again.");
        await fetchBoards();
      } else {
        setToast(getApiErrorMessage(error) || "Unable to delete Board.");
      }
    } finally {
      setBoardDeletingId(null);
    }
  };
  return (
    <DashboardLayout
      title={activeTab === "academic-years" ? "Academic Year Management" : "Board Management"}
      subtitle={
        activeTab === "academic-years"
          ? "Create and manage academic years for boards and academic levels."
          : "Create and manage education boards, academic levels and status."
      }
      breadcrumb={["Settings"]}
    >
      <main className="bay-page">
        {!formOpen && !detailsOpen ? (
          <div className="bay-tabs" role="tablist" aria-label="Board and academic year sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "boards"}
              className={`bay-tab ${activeTab === "boards" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("boards");
                setPage(1);
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set("tab", "boards");
                  return p;
                });
              }}
            >
              Board Management
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "academic-years"}
              className={`bay-tab ${activeTab === "academic-years" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("academic-years");
                setPage(1);
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set("tab", "academic-years");
                  return p;
                });
              }}
            >
              Academic Year
            </button>
          </div>
        ) : null}
        {!formOpen && !detailsOpen && activeTab === "academic-years" ? (
          <AcademicYearWorkspace />
        ) : null}
        {!formOpen && !detailsOpen && activeTab === "boards" ? (
          <section className="bay-card bay-board-list-card">
            <div className="bay-toolbar">
              <label className="bay-search">
                <Search3DIcon size={16} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search board name, board code, board type, state, academic levels..."
                />
              </label>
              <div className="bay-toolbar-actions">
                <button className="cms-btn cms-btn-primary" onClick={startAdd} disabled={boardFormDataLoading}>
                  <Plus size={16} /> Add Board
                </button>
              </div>
            </div>
            <div className="bay-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Board Name</th>
                    <th>Board Code</th>
                    <th>Board Type</th>
                    <th>State</th>
                    <th>Academic Levels</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boardListLoading ? (
                    <tr><td colSpan="7" className="bay-empty">Loading boards...</td></tr>
                  ) : boardRows.length ? boardRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.board}</strong>
                      </td>
                      <td>{row.code}</td>
                      <td>{row.type || "—"}</td>
                      <td>{row.state || "—"}</td>
                      <td>{row.level || "—"}</td>
                      <td>
                        <span className={`bay-status ${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <div className="bay-actions">
                          <button
                            type="button"
                            className="bay-action-view"
                            aria-label={`View ${row.board}`}
                            title="View configuration"
                            onClick={() => fetchBoardDetails(row.id)}
                          >
                            <Eye />
                          </button>
                          <button
                            type="button"
                            className="bay-action-delete"
                            aria-label={`Delete ${row.board}`}
                            title="Delete Board"
                            disabled={boardDeletingId === row.id}
                            onClick={() => deleteBoard(row)}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="bay-empty">No boards available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer>
              <span>
                Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records
              </span>
              <nav aria-label="Configuration pagination">
                <button
                  className="bay-page-direction"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Prev
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    className={p === currentPage ? "active" : ""}
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={p === currentPage ? "page" : undefined}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="bay-page-direction"
                  disabled={currentPage === pages}
                  onClick={() => setPage((value) => Math.min(pages, value + 1))}
                >
                  Next
                </button>
              </nav>
            </footer>
          </section>
        ) : null}
        {formOpen || detailsOpen ? (
          <section className="bay-bottom">
            <button
              type="button"
              className="cms-back-link bay-back-link"
              onClick={() => setSearchParams({})}
            >
              <ArrowLeft size={15} /> Back to Board Management
            </button>
            {detailsOpen ? (
              <article className="bay-card bay-details">
                <header>
                  <div>
                    <Eye size={17} />
                    <h2>Board Details</h2>
                  </div>
                  <div className="bay-details-actions">
                    {selected ? (
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost bay-details-edit"
                        onClick={() => startEdit(selected)}
                      >
                        <Edit3 size={16} /> Edit Board
                      </button>
                    ) : null}
                  </div>
                </header>
                {boardDetailsLoading ? (
                  <p className="bay-empty">Loading Board details...</p>
                ) : selected ? (
                  <dl>
                    {boardDetailEntries(selected)
                      .filter(([key]) => !HIDDEN_BOARD_DETAIL_FIELDS.has(key))
                      .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <span className="bay-detail-separator" aria-hidden="true">
                          –
                        </span>
                        <dd>{v || "—"}</dd>
                      </div>
                      ))}
                  </dl>
                ) : (
                  <p className="bay-empty">Select a configuration to view details.</p>
                )}
              </article>
            ) : (
              <article className="bay-card bay-form">
                <header>
                  <div>
                    <Edit3 size={17} />
                    <h2>{editingId ? "Edit Board" : "Add Board"}</h2>
                  </div>
                </header>
                <form onSubmit={save}>
                  <div className="bay-form-field span-2">
                    <span>
                      Board Name <b>*</b>
                    </span>
                    {customBoardEntry ? (
                      <div className="bay-custom-board-control">
                        <input
                          autoFocus
                          value={form.boardName}
                          placeholder="Enter new board name"
                          aria-label="New board name"
                          onChange={(event) => update("boardName", event.target.value)}
                        />
                        <button
                          type="button"
                          className="bay-choose-board-button"
                          onClick={() => {
                            setCustomBoardEntry(false);
                            setOpenExistingBoardPicker(true);
                            setCodeValidationMessage("");
                          }}
                        >
                          Choose existing
                        </button>
                      </div>
                    ) : (
                      <SearchableApiSelect
                        value={form.boardName}
                        options={BOARD_NAME_OPTIONS}
                        idKey="value"
                        nameKey="label"
                        placeholder="Search board name"
                        initiallyOpen={openExistingBoardPicker}
                        onChange={handleBoardNameChange}
                      />
                    )}
                  </div>
                  <label>
                    <span>
                      Board Code <b>*</b>
                    </span>
                    <input
                      value={form.boardCode}
                      placeholder="Enter Board Code"
                      onChange={(e) => update("boardCode", e.target.value.toUpperCase())}
                      onBlur={() => validateBoardCode()}
                    />
                    {codeValidationMessage ? <small className="bay-field-error">{codeValidationMessage}</small> : null}
                  </label>
                  <label>
                    <span>
                      Country <b>*</b>
                    </span>
                    <div className={`bay-country-controls${choosingOtherCountry ? " has-other-country" : ""}`}>
                      <select
                        value={choosingOtherCountry ? OTHER_COUNTRY_VALUE : form.countryId}
                        disabled={boardFormDataLoading}
                        onChange={(event) => handleCountryChange(event.target.value)}
                      >
                        <option value="">Select country</option>
                        {indiaCountry ? (
                          <option value={optionValue(indiaCountry, "countryId", "CountryId")}>
                            {optionValue(indiaCountry, "countryName", "CountryName")}
                          </option>
                        ) : null}
                        <option value={OTHER_COUNTRY_VALUE}>Other</option>
                      </select>
                      {choosingOtherCountry ? (
                        <input
                          className="bay-other-country-select"
                          aria-label="Select other country"
                          list="bay-other-country-options"
                          placeholder="Enter country name"
                          autoComplete="off"
                          value={otherCountryName}
                          onChange={(event) => handleOtherCountryNameChange(event.target.value)}
                        />
                      ) : null}
                    </div>
                    {choosingOtherCountry ? (
                      <datalist id="bay-other-country-options">
                        {otherCountries.map((item) => (
                          <option
                            key={optionValue(item, "countryId", "CountryId")}
                            value={optionValue(item, "countryName", "CountryName")}
                          />
                        ))}
                      </datalist>
                    ) : null}
                  </label>
                  <label>
                    <span>
                      Board Type <b>*</b>
                    </span>
                    <select value={form.boardType} onChange={(e) => update("boardType", e.target.value)}>
                      <option value="">Select type</option>
                      <option>State Board</option>
                      <option>Central Board</option>
                      <option>National / Central Board</option>
                      <option>Open Board</option>
                      <option>International Board</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      State <b>*</b>
                    </span>
                    <SearchableApiSelect
                      value={form.stateId}
                      options={stateOptions}
                      idKey="stateId"
                      nameKey="stateName"
                      placeholder="Search state"
                      onChange={(value) => update("stateId", value)}
                    />
                  </label>
                  <label>
                    <span>Academic Levels <b>*</b></span>
                    <ApiLevelMultiSelect
                      value={form.academicLevelIds}
                      options={boardAcademicLevels}
                      onChange={(value) => update("academicLevelIds", value)}
                    />
                  </label>
                  <label>
                    <span>Grading System <b>*</b></span>
                    <select
                      value={form.gradingSystemId}
                      disabled={boardFormDataLoading}
                      onChange={(e) => update("gradingSystemId", e.target.value)}
                    >
                      <option value="">Select grading system</option>
                      {formData.gradingSystems.map((item) => (
                        <option
                          key={optionValue(item, "gradingSystemId", "GradingSystemId")}
                          value={optionValue(item, "gradingSystemId", "GradingSystemId")}
                        >
                          {optionValue(item, "gradingSystemName", "GradingSystemName")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bay-board-status-field">
                    <span>
                      Status <b>*</b>
                    </span>
                    <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                      <option value="">Select Status</option>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </label>
                  <label className="span-4">
                    Description / Notes
                    <textarea
                      rows="3"
                      value={form.description}
                      placeholder="Enter Description / Notes"
                      onChange={(e) => update("description", e.target.value)}
                    />
                  </label>
                  <div className="bay-form-actions span-4">
                    <button className="cms-btn cms-btn-primary" disabled={boardSaving || boardFormDataLoading}>
                      <Save size={17} /> {boardSaving ? "Saving..." : "Save Board"}
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => {
                        setForm(emptyBoardForm);
                        setCustomBoardEntry(false);
                        setOpenExistingBoardPicker(false);
                        setChoosingOtherCountry(false);
                        setOtherCountryName("");
                        setEditingId(selected?.id || null);
                        setSearchParams({});
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </article>
            )}
          </section>
        ) : null}
        <Toast message={toast} onClose={() => setToast("")} />
      </main>
    </DashboardLayout>
  );
}
