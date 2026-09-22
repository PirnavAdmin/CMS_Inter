import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Plus,
  Search,
  X,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowLeft,
  ChevronDown,
  Building2,
  Layers,
  Download,
  Loader2,
  Upload,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import DashboardLayout from "../layout/DashboardLayout";
import "./SectionManagementPage.css";

const PAGE_SIZE = 5;
const BULK_ROOM_PAGE_SIZE = 5;
const normalizeId = (value) => String(value ?? "");
const isActiveRecord = (item, defaultActive = false) => {
  const value = item?.isActive ?? item?.status;
  if (value == null) return defaultActive;
  return ["1", "true", "active", "enabled"].includes(String(value).trim().toLowerCase());
};
const isTeachingStaff = (item) => Boolean(item?.id && item.isActive && String(item.staffType).trim().toLowerCase() === "teaching");

const unwrapList = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  for (const key of ["data", "items", "records", "results"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (payload?.data && typeof payload.data === "object") return unwrapList({ data: payload.data });
  throw new Error("The backend returned an invalid list response. Please reload and try again.");
};

const normalizeEntityList = (response, normalize) => {
  const items = unwrapList(response).map(normalize);
  if (items.some((item) => !item.id)) throw new Error("Backend data contains a record without an ID. Please reload and try again.");
  return items;
};

const normalizeBoard = (item) => ({
  ...item,
  id: normalizeId(item.boardId ?? item.id),
  name: item.boardName ?? item.name ?? "",
  code: item.boardCode ?? item.code ?? "",
  academicLevelIds: Array.isArray(item.academicLevelIds) ? item.academicLevelIds : [],
  academicLevelNames: Array.isArray(item.academicLevelNames)
    ? item.academicLevelNames
    : Array.isArray(item.academicLevels)
      ? item.academicLevels
      : [],
  isActive: isActiveRecord({ status: item.status ?? item.isActive }),
});

const embeddedBoardLevels = (board) => (board?.academicLevelIds || []).map((id, index) => ({
  id: normalizeId(id), name: board.academicLevelNames?.[index] || "", boardId: normalizeId(board.id), isActive: true,
})).filter((level) => level.id && level.name);
const yearBelongsToBoard = (year, boardId) => Boolean(boardId && year?.boardId) && normalizeId(year.boardId) === normalizeId(boardId);

const normalizeYear = (item) => ({
  ...item,
  id: normalizeId(item.academicYearId ?? item.id),
  boardId: normalizeId(item.boardId),
  name: item.academicYearName ?? item.name ?? "",
  isActive: isActiveRecord(item, true),
});

const normalizeLevel = (item) => ({
  ...item,
  id: normalizeId(item.academicLevelId ?? item.id),
  name: item.academicLevelName ?? item.levelName ?? item.yearOfStudy ?? item.name ?? "",
  isActive: isActiveRecord(item, true),
});

const normalizeGroup = (item) => ({
  ...item,
  id: normalizeId(item.groupId ?? item.id),
  boardId: normalizeId(item.boardId),
  academicYearId: normalizeId(item.academicYearId),
  academicLevelId: normalizeId(item.academicLevelId),
  name: item.groupName ?? item.name ?? "",
  code: item.groupCode ?? item.code ?? "",
  isActive: isActiveRecord(item, true),
});

const matchesGroupScope = (group, scope) => Boolean(scope.boardId) &&
  (!group.boardId || normalizeId(group.boardId) === normalizeId(scope.boardId));

const normalizeProgram = (item) => ({
  ...item,
  id: normalizeId(item.programId ?? item.id),
  programId: normalizeId(item.programId ?? item.id),
  groupId: normalizeId(item.groupId),
  name: item.programName ?? item.name ?? "",
  code: item.programCode ?? item.code ?? "",
  isActive: isActiveRecord(item, true),
});

const normalizeTeacher = (item) => ({
  ...item,
  id: normalizeId(item.staffId ?? item.facultyId ?? item.id ?? item.userId ?? (Number.isFinite(Number(item.employeeId)) ? item.employeeId : "")),
  name: item.staffName ?? item.facultyName ?? item.fullName ?? item.name ?? item.employeeName ?? "",
  employeeId: item.employeeId ?? item.employeeCode ?? "",
  isActive: (item.isActive !== undefined || item.status !== undefined) ? isActiveRecord(item, true) : true,
  staffType: item.staffType ?? item.type ?? "Teaching",
});

const normalizeRoom = (item) => ({
  ...item,
  id: normalizeId(item.roomId ?? item.id),
  roomNo: item.roomNumber ?? item.roomNo ?? item.roomCode ?? item.name ?? "",
  capacity: item.capacity ?? 0,
  roomType: item.roomType ?? "",
  building: item.buildingName ?? item.blockName ?? item.building ?? item.block ?? "",
  floor: item.floor ?? "",
  statusKnown: item.isActive != null || item.status != null,
  isActive: isActiveRecord(item),
  status: item.isActive == null && item.status == null ? "" : isActiveRecord(item) ? "Active" : "Inactive",
});

const normalizeSection = (item) => ({
  ...item,
  id: normalizeId(item.sectionId ?? item.id),
  boardId: normalizeId(item.boardId),
  board: item.boardName ?? item.board ?? "",
  boardCode: item.boardCode ?? "",
  academicYearId: normalizeId(item.academicYearId),
  academicYear: item.academicYearName ?? item.academicYear ?? "",
  academicLevelId: normalizeId(item.academicLevelId),
  academicLevel: item.academicLevelName ?? item.academicLevel ?? item.levelName ?? item.yearOfStudy ?? "",
  groupId: normalizeId(item.groupId),
  group: item.groupName ?? item.group ?? "",
  groupProgramId: normalizeId(item.groupProgramId),
  programId: normalizeId(item.programId ?? item.groupProgramId),
  program: item.programName ?? item.program ?? item.programme ?? "",
  name: item.sectionName ?? item.name ?? "",
  roomId: normalizeId(item.roomId),
  roomNo: item.roomNumber ?? item.roomName ?? item.room ?? "",
  classTeacherId: normalizeId(item.inchargeId ?? item.classTeacherId ?? item.teacherId ?? item.facultyId),
  teacher: item.inchargeName ?? item.classTeacherName ?? item.facultyName ?? item.teacher ?? item.incharge ?? "",
  strength: item.maximumStrength ?? item.strength ?? item.capacity ?? 0,
  statusKnown: item.isActive != null || item.status != null,
  isActive: isActiveRecord(item),
  status: item.isActive == null && item.status == null ? "" : isActiveRecord(item) ? "Active" : "Inactive",
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const ROOM_ENDPOINTS = {
  create: "/api/v1/rooms",
  update: (id) => `/api/v1/rooms/${id}`,
  delete: (id) => `/api/v1/rooms/${id}`,
  bulk: "/api/v1/rooms/bulk",
};
const SECTION_BULK_ENDPOINT = apiEndpoints.sections.bulk;

const sectionPayload = (form, context = form) => {
  const program = context.program;
  const teacherId = form.classTeacherId ? Number(form.classTeacherId) : null;
  return {
    boardId: Number(context.boardId),
    academicYearId: Number(context.academicYearId),
    academicLevelId: Number(context.academicLevelId),
    groupId: Number(context.groupId),
    programId: Number(program?.programId ?? context.programId),
    sectionName: form.name.trim(),
    roomId: Number(form.roomId),
    inchargeId: teacherId,
    maximumStrength: Number(form.strength),
    isActive: form.status === "Active",
  };
};

const roomPayload = (form) => ({
  roomNumber: form.roomNo.trim(),
  capacity: Number(form.capacity),
  roomType: form.roomType,
  building: form.building.trim(),
  floor: String(form.floor).trim(),
  isActive: form.isActive === "Active",
});

const sameText = (a, b) => String(a ?? "").trim().replace(/\s+/g, " ").toLowerCase() === String(b ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const matchesRoom = (room, payload) => room.id && sameText(room.roomNo, payload.roomNumber) && Number(room.capacity) === payload.capacity && sameText(room.building, payload.building) && sameText(room.floor, payload.floor) && room.roomType === payload.roomType && (room.statusKnown === false || room.isActive === payload.isActive);
const matchesSection = (section, payload) => section.id && sameText(section.name, payload.sectionName) && ["boardId", "academicYearId", "academicLevelId", "groupId", "programId", "roomId"].every((key) => normalizeId(section[key]) === normalizeId(payload[key])) && normalizeId(section.classTeacherId) === normalizeId(payload.inchargeId) && Number(section.strength) === payload.maximumStrength && (section.statusKnown === false || section.isActive === payload.isActive);
const verifyBulkResult = (response, count) => {
  const result = response?.data?.data ?? response?.data;
  if (result?.errors?.length) throw new Error(result.errors.join(" "));
  if (result?.totalCreated !== undefined && result.totalCreated !== count) throw new Error("Only " + result.totalCreated + " of " + count + " records were saved. Review backend data before retrying.");
};

const sanitizeExcelCell = (value) => {
  if (typeof value !== "string") return Number.isNaN(value) ? 0 : value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
};

const getRoomAllocationDetails = (rooms, sections) =>
  rooms.map((room) => {
    const section = sections.find(
      (item) => item.status === "Active" && normalizeId(item.roomId) === normalizeId(room.id)
    );
    const eligible = room.isActive && room.roomType === "Classroom";
    return {
      room,
      section,
      allocationStatus: !room.isActive
        ? "Inactive"
        : room.roomType !== "Classroom"
          ? "Not Eligible for Section"
          : section
            ? "Allocated"
            : "Available",
      remainingCapacity: eligible ? Math.max(0, Number(room.capacity || 0) - Number(section?.strength || 0)) : 0,
    };
  });

const buildFeasibilitySummaryRows = (rooms, sections) => {
  const details = getRoomAllocationDetails(rooms, sections);
  const activeClassrooms = details.filter((item) => item.room.isActive && item.room.roomType === "Classroom");
  const allocated = activeClassrooms.filter((item) => item.section);
  const available = activeClassrooms.filter((item) => !item.section);
  const sumCapacity = (items) => items.reduce((sum, item) => sum + Number(item.room.capacity || 0), 0);
  const rows = [
    ["Total Rooms", rooms.length, sumCapacity(details)],
    ["Active Rooms", details.filter((item) => item.room.isActive).length, sumCapacity(details.filter((item) => item.room.isActive))],
    ["Active Classrooms", activeClassrooms.length, sumCapacity(activeClassrooms)],
    ["Allocated Active Classrooms", allocated.length, sumCapacity(allocated)],
    ["Available Active Classrooms", available.length, sumCapacity(available)],
    ["Inactive Rooms", details.filter((item) => !item.room.isActive).length, sumCapacity(details.filter((item) => !item.room.isActive))],
    ["Total Active Classroom Capacity", activeClassrooms.length, sumCapacity(activeClassrooms)],
    ["Allocated Section Strength", allocated.length, allocated.reduce((sum, item) => sum + Number(item.section?.strength || 0), 0)],
    ["Remaining Available Classroom Capacity", available.length, sumCapacity(available)],
  ];
  return rows.map(([Metric, Count, total]) => ({ Metric, Count, "Total Capacity": total }));
};

const buildRoomAvailabilityRows = (rooms, sections, resolveSection) =>
  getRoomAllocationDetails(rooms, sections).map((item, index) => {
    const detail = item.section ? resolveSection(item.section) : null;
    return {
      "S.No": index + 1,
      "Room No": sanitizeExcelCell(item.room.roomNo),
      Building: sanitizeExcelCell(item.room.building),
      Floor: sanitizeExcelCell(item.room.floor),
      "Room Type": sanitizeExcelCell(item.room.roomType),
      "Room Capacity": Number(item.room.capacity || 0),
      "Room Status": item.room.isActive ? "Active" : "Inactive",
      "Allocation Status": item.allocationStatus,
      "Allocated Section": sanitizeExcelCell(item.section?.name || "—"),
      Group: sanitizeExcelCell(detail?.groupName || "—"),
      Program: sanitizeExcelCell(detail?.programName || "—"),
      "Academic Level": sanitizeExcelCell(detail?.academicLevelName || "—"),
      "Section Strength": Number(item.section?.strength || 0),
      "Remaining Capacity": item.remainingCapacity,
    };
  });

const buildSectionAllocationRows = (sections, rooms, resolveSection) =>
  sections.map((section, index) => {
    const detail = resolveSection(section);
    const room = rooms.find((item) => normalizeId(item.id) === normalizeId(section.roomId));
    return {
      "S.No": index + 1,
      "Section Name": sanitizeExcelCell(section.name),
      Board: sanitizeExcelCell(detail.boardName),
      "Board Code": sanitizeExcelCell(detail.boardCode),
      "Academic Year": sanitizeExcelCell(detail.academicYearName),
      Group: sanitizeExcelCell(detail.groupName),
      Program: sanitizeExcelCell(detail.programName),
      "Academic Level": sanitizeExcelCell(detail.academicLevelName),
      "Room No": sanitizeExcelCell(detail.roomNo),
      "Room Capacity": Number(room?.capacity || 0),
      "Section Strength": Number(section.strength || 0),
      "Remaining Room Capacity": Math.max(0, Number(room?.capacity || 0) - Number(section.strength || 0)),
      Incharge: sanitizeExcelCell(detail.teacherName),
      "Section Status": section.status,
      "Created At": sanitizeExcelCell(section.createdAt || "—"),
      "Updated At": sanitizeExcelCell(section.updatedAt || "—"),
    };
  });

const autoSizeSheet = (sheet, rows) => {
  const keys = Object.keys(rows[0] || {});
  sheet["!cols"] = keys.map((key) => ({
    wch: Math.min(36, Math.max(key.length + 2, ...rows.map((row) => String(row[key] ?? "").length + 2))),
  }));
};

const downloadAllocationWorkbook = (rooms, sections, resolveSection) => {
  const workbook = XLSX.utils.book_new();
  const datasets = [
    ["Feasibility Summary", buildFeasibilitySummaryRows(rooms, sections)],
    ["Room Availability", buildRoomAvailabilityRows(rooms, sections, resolveSection)],
    ["Section Allocations", buildSectionAllocationRows(sections, rooms, resolveSection)],
  ];
  datasets.forEach(([name, rows]) => {
    const sheet = XLSX.utils.json_to_sheet(rows);
    autoSizeSheet(sheet, rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  });
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `Section_Room_Allocation_Feasibility_${date}.xlsx`);
};

// ---------- DATASETS ----------
const ROOM_TYPES = [
  "Classroom",
  "Laboratory",
  "Computer Lab",
  "Seminar Hall",
  "Library",
  "Examination Hall",
  "Staff Room",
  "Other",
];

const EMPTY_BULK_ROOM_FORM = {
  building: "",
  floor: "",
  startRoomNo: "",
  roomCount: "",
  defaultCapacity: "",
  defaultRoomType: "",
  isActive: "",
};

const parseRoomNumberSequence = (value) => {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  return match ? { prefix: match[1], start: Number(match[2]), padding: match[2].length } : null;
};

const generateRoomNumbers = (startRoomNo, count) => {
  const sequence = parseRoomNumberSequence(startRoomNo);
  if (!sequence || !Number.isInteger(count) || count < 1 || count > 100) return [];
  return Array.from({ length: count }, (_, index) => `${sequence.prefix}${String(sequence.start + index).padStart(sequence.padding, "0")}`);
};

const reconcileBulkRoomAllocations = (current, form) =>
  generateRoomNumbers(form.startRoomNo, Number(form.roomCount)).map((roomNo, index) => ({
    key: current[index]?.key || `bulk-room-${index + 1}`,
    roomNo,
    capacity: current[index]?.capacity || String(form.defaultCapacity || ""),
    roomType: current[index]?.roomType || form.defaultRoomType || "",
  }));

const validateBulkRoomAllocations = (allocations, rooms, expectedCount) => {
  const errors = {};
  const seen = new Set();
  const existing = new Set(rooms.map((room) => room.roomNo.trim().toLowerCase()));
  if (allocations.length !== expectedCount) errors.bulk = "Prepare all Room Allocation Preview rows before creating Rooms.";
  allocations.forEach((allocation, index) => {
    const roomNo = allocation.roomNo.trim();
    const normalizedRoomNo = roomNo.toLowerCase();
    const capacity = Number(allocation.capacity);
    if (!parseRoomNumberSequence(roomNo)) errors[`bulk_roomNo_${index}`] = "Generated Room Number is invalid.";
    else if (roomNo.length > 50) errors[`bulk_roomNo_${index}`] = "Room Number must not exceed 50 characters.";
    else if (seen.has(normalizedRoomNo)) errors[`bulk_roomNo_${index}`] = "Duplicate Room Number in preview.";
    else if (existing.has(normalizedRoomNo)) errors[`bulk_roomNo_${index}`] = `Room No "${roomNo}" already exists.`;
    seen.add(normalizedRoomNo);
    if (!String(allocation.capacity).trim() || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) errors[`bulk_capacity_${index}`] = "Capacity must be an integer from 1 to 1000.";
    if (!ROOM_TYPES.includes(allocation.roomType)) errors[`bulk_roomType_${index}`] = "Room Type is required.";
  });
  return errors;
};

const calculateBulkRoomFeasibility = (allocations, requested) => {
  const valid = allocations.filter(
    (row) =>
      parseRoomNumberSequence(row.roomNo) &&
      Number.isInteger(Number(row.capacity)) &&
      Number(row.capacity) > 0 &&
      Number(row.capacity) <= 1000 &&
      ROOM_TYPES.includes(row.roomType)
  );
  const countType = (type) => allocations.filter((row) => row.roomType === type).length;
  const summarized = ["Classroom", "Library", "Laboratory", "Computer Lab"];
  return {
    requested: Number.isInteger(Number(requested)) ? Number(requested) : 0,
    configured: valid.length,
    totalCapacity: valid.reduce((sum, row) => sum + Number(row.capacity), 0),
    classroom: countType("Classroom"),
    library: countType("Library"),
    laboratory: countType("Laboratory"),
    computerLab: countType("Computer Lab"),
    other: allocations.filter((row) => row.roomType && !summarized.includes(row.roomType)).length,
    incomplete: allocations.length - valid.length,
  };
};

let searchableSelectCounter = 0;

export const pageConfig = {
  title: "Section Management",
  subtitle: "Manage academic sections, classrooms and teacher assignments.",
  breadcrumb: ["Academics"],
};

// ---------- CUSTOM SEARCHABLE SELECT DROPDOWN ----------
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
  emptyText = "No matching options",
  showSearch = true,
  hasError = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxId = useRef(`section-select-${++searchableSelectCounter}`).current;

  const normalizedOptions = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "object" && opt !== null
        ? { value: String(opt.value), label: String(opt.label) }
        : { value: String(opt), label: String(opt) }
    );
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === String(value));
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.trim().toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [normalizedOptions, searchQuery]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQuery("");
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(filteredOptions.length ? 0 : -1);
  }, [filteredOptions]);

  const handleKeyboard = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return setOpen(true);
      if (!filteredOptions.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex((current) => (current + step + filteredOptions.length) % filteredOptions.length);
    } else if (event.key === "Enter" && open && highlightedIndex >= 0) {
      event.preventDefault();
      onChange(filteredOptions[highlightedIndex].value);
      setOpen(false);
      setSearchQuery("");
    } else if (event.key === "Escape") {
      setOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`cms-searchable-select ${disabled ? "is-disabled" : ""} ${open ? "is-open" : ""} ${hasError ? "has-error" : ""}`}
    >
      <button
        type="button"
        className="cms-searchable-select-trigger"
        role="combobox"
        aria-label={placeholder}
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onKeyDown={handleKeyboard}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
            setSearchQuery("");
          }
        }}
      >
        <span className="cms-searchable-select-label" title={selectedOption?.label || ""}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="cms-select-arrow" />
      </button>
      {open && (
        <div className="cms-searchable-select-menu">
          {showSearch && (
            <div className="cms-searchable-select-search">
              <Search size={14} />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyboard}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="cms-search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          <div className="cms-searchable-select-options" id={listboxId} role="listbox">
            <button
              type="button"
              className={`cms-select-option ${!value ? "is-selected" : ""}`}
              role="option"
              aria-selected={!value}
              title={placeholder}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`cms-select-option ${String(value) === opt.value ? "is-selected" : ""} ${highlightedIndex === index ? "is-highlighted" : ""}`}
                  role="option"
                  aria-selected={String(value) === opt.value}
                  title={opt.label}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="cms-select-empty">{emptyText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BulkRoomAllocationPreview({ allocations, requested, errors, onChange, page, setPage }) {
  const summary = calculateBulkRoomFeasibility(allocations, requested);
  if (!allocations.length) return null;
  const totalPages = Math.max(1, Math.ceil(allocations.length / BULK_ROOM_PAGE_SIZE));
  const start = (page - 1) * BULK_ROOM_PAGE_SIZE;
  const shownAllocations = allocations.slice(start, start + BULK_ROOM_PAGE_SIZE);
  return (
    <section className="cms-bulk-room-preview">
      <div className="cms-bulk-room-preview-head">
        <strong>Room Allocation Preview ({allocations.length})</strong>
      </div>
      <div className="cms-bulk-room-summary">
        <span>Rooms Requested <strong>{summary.requested}</strong></span>
        <span>Rooms Configured <strong>{summary.configured}</strong></span>
        <span>Total Planned Capacity <strong>{summary.totalCapacity}</strong></span>
        <span>Classrooms <strong>{summary.classroom}</strong></span>
        <span>Libraries <strong>{summary.library}</strong></span>
        <span>Laboratories <strong>{summary.laboratory}</strong></span>
        <span>Computer Labs <strong>{summary.computerLab}</strong></span>
        <span>Other Types <strong>{summary.other}</strong></span>
        <span>Invalid / Incomplete <strong>{summary.incomplete}</strong></span>
      </div>
      <div className="cms-bulk-room-allocation-list">
        {shownAllocations.map((allocation, pageIndex) => {
          const originalIndex = start + pageIndex;
          return (
            <div className="cms-bulk-room-allocation-row" key={allocation.key}>
              <span className="cms-bulk-room-index">{originalIndex + 1}</span>
              <div className="cms-field">
                <label>Room Number</label>
                <input value={allocation.roomNo} readOnly title={allocation.roomNo} />
                {errors[`bulk_roomNo_${originalIndex}`] && <span className="cms-field-error">{errors[`bulk_roomNo_${originalIndex}`]}</span>}
              </div>
              <div className="cms-field">
                <label>Capacity *</label>
                <input type="number" min="1" max="1000" step="1" value={allocation.capacity} placeholder="e.g. 40" onChange={(event) => onChange(originalIndex, "capacity", event.target.value)} />
                {errors[`bulk_capacity_${originalIndex}`] && <span className="cms-field-error">{errors[`bulk_capacity_${originalIndex}`]}</span>}
              </div>
              <div className="cms-field">
                <label>Room Type *</label>
                <SearchableSelect value={allocation.roomType} onChange={(value) => onChange(originalIndex, "roomType", value)} options={ROOM_TYPES} placeholder="Select Room Type" showSearch={true} hasError={Boolean(errors[`bulk_roomType_${originalIndex}`])} />
                {errors[`bulk_roomType_${originalIndex}`] && <span className="cms-field-error">{errors[`bulk_roomType_${originalIndex}`]}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="cms-bulk-room-pagination">
        <span>Showing {start + 1}–{Math.min(start + BULK_ROOM_PAGE_SIZE, allocations.length)} of {allocations.length} rooms</span>
        <button type="button" className="cms-btn cms-btn-ghost" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <strong>{page} / {totalPages}</strong>
        <button type="button" className="cms-btn cms-btn-ghost" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>
    </section>
  );
}

export default function SectionManagementPage() {
  const {
    selectedBoard,
    selectedBoardId,
    selectedAcademicYear,
    selectedAcademicYearId,
  } = useAcademicContext();

  // First Tab is Room Management ("rooms"), Second Tab is Section Management ("sections")
  const [activeTab, setActiveTab] = useState("rooms");

  const [boardsList, setBoardsList] = useState([]);
  const [academicYearsList, setAcademicYearsList] = useState([]);
  const [academicLevelsList, setAcademicLevelsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [sections, setSections] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dependentLoading, setDependentLoading] = useState({ board: false, group: false, program: false });
  const [operation, setOperation] = useState("");
  const operationRef = useRef(false);
  const runMutation = async (label, mutate, synchronize, onSuccess) => {
    if (operationRef.current) return;
    operationRef.current = true;
    setOperation(label);
    let saved = false;
    try {
      const response = await mutate();
      saved = true;
      await synchronize(response);
      onSuccess();
    } catch (error) {
      console.error(label + " failed", error);
      say((saved ? "The request succeeded, but backend synchronization could not be confirmed. Reload before retrying. " : "") + getApiErrorMessage(error), "error");
    } finally {
      operationRef.current = false;
      setOperation("");
    }
  };
  const boardRequestRef = useRef(0);
  const groupRequestRef = useRef(0);
  const programRequestRef = useRef(0);

  // Filter & Search state for tables
  const [filters, setFilters] = useState({ boardId: "", academicYearId: "", groupId: "", programId: "", academicLevelId: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const effectiveNavbarBoard = useMemo(() => {
    if (!boardsList.length) return null;
    return boardsList.find(
      (b) =>
        normalizeId(b.id) === normalizeId(selectedBoardId) ||
        (selectedBoard?.code && String(b.code || "").trim().toLowerCase() === String(selectedBoard.code).trim().toLowerCase()) ||
        (selectedBoard?.name && String(b.name || "").trim().toLowerCase() === String(selectedBoard.name).trim().toLowerCase())
    ) || boardsList[0] || null;
  }, [boardsList, selectedBoardId, selectedBoard]);

  const effectiveNavbarYear = useMemo(() => {
    if (!academicYearsList.length || !effectiveNavbarBoard) return null;
    const boardYears = academicYearsList.filter((y) => yearBelongsToBoard(y, effectiveNavbarBoard.id));
    return boardYears.find(
      (y) =>
        normalizeId(y.id) === normalizeId(selectedAcademicYearId) ||
        (selectedAcademicYear?.name && String(y.name || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "") === String(selectedAcademicYear.name).trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "")) ||
        (selectedAcademicYear?.code && String(y.name || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "") === String(selectedAcademicYear.code).trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, ""))
    ) || boardYears.find((y) => y.isCurrent) || boardYears[0] || null;
  }, [academicYearsList, effectiveNavbarBoard, selectedAcademicYearId, selectedAcademicYear]);

  // Sync navbar selection with list filters
  useEffect(() => {
    if (effectiveNavbarBoard) {
      const bId = normalizeId(effectiveNavbarBoard.id);
      setFilters((current) => (normalizeId(current.boardId) === bId ? current : { ...current, boardId: bId }));
    }
  }, [effectiveNavbarBoard]);

  useEffect(() => {
    if (effectiveNavbarYear) {
      const yId = normalizeId(effectiveNavbarYear.id);
      setFilters((current) => (normalizeId(current.academicYearId) === yId ? current : { ...current, academicYearId: yId }));
    }
  }, [effectiveNavbarYear]);

  const [roomFilters, setRoomFilters] = useState({ building: "", floor: "", roomType: "" });
  const [roomSearch, setRoomSearch] = useState("");
  const [roomPage, setRoomPage] = useState(1);

  // Dynamic Compact Pagination state
  const [roomPageSize, setRoomPageSize] = useState(5);
  const [isCustomRoomPage, setIsCustomRoomPage] = useState(false);
  const [customRoomPageInput, setCustomRoomPageInput] = useState("");

  const [sectionPageSize, setSectionPageSize] = useState(5);
  const [isCustomSectionPage, setIsCustomSectionPage] = useState(false);
  const [customSectionPageInput, setCustomSectionPageInput] = useState("");

  // Room Excel Global Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const fileInputRef = useRef(null);

  // Section Student Counts & Delete Guard Modal state
  const [sectionStudentCounts, setSectionStudentCounts] = useState({});
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    section: null,
    loading: false,
    studentCount: null,
  });

  // Room Delete Modal state (Unconstrained, matches Section Delete confirmation modal)
  const [deleteRoomModalState, setDeleteRoomModalState] = useState({
    isOpen: false,
    room: null,
  });

  // Screen View state replacing modals
  const [sectionView, setSectionView] = useState("list");
  const [sectionFormMode, setSectionFormMode] = useState("add");
  const [sectionCreationType, setSectionCreationType] = useState("single");

  const [roomView, setRoomView] = useState("list");
  const [roomFormMode, setRoomFormMode] = useState("add");
  const [roomCreationType, setRoomCreationType] = useState("single");

  // Form Data state: STATUS IS MANUAL ENTRY (STARTS EMPTY "")
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    boardId: "",
    academicYearId: "",
    groupId: "",
    programId: "",
    academicLevelId: "",
    name: "",
    roomId: "",
    classTeacherId: "",
    strength: "",
    status: "",
  });
  const [bulkSections, setBulkSections] = useState([
    { name: "", roomId: "", classTeacherId: "", strength: "", status: "" },
  ]);

  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState({
    roomNo: "",
    capacity: "",
    roomType: "",
    building: "",
    floor: "",
    isActive: "",
  });

  const [bulkRoomForm, setBulkRoomForm] = useState(EMPTY_BULK_ROOM_FORM);
  const [bulkRoomAllocations, setBulkRoomAllocations] = useState([]);
  const [bulkRoomPage, setBulkRoomPage] = useState(1);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(bulkRoomAllocations.length / BULK_ROOM_PAGE_SIZE));
    setBulkRoomPage((current) => Math.min(current, totalPages));
  }, [bulkRoomAllocations.length]);

  // Inline Validation Field Errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [roomFieldErrors, setRoomFieldErrors] = useState({});

  // UI Toast feedback
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const say = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const toastObj = typeof message === "object" && message !== null ? message : { text: message, type };
    setToast(toastObj);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 3500);
  }, []);

  const loadRooms = useCallback(async () => {
    const response = await apiClient.get(apiEndpoints.rooms.getAll);
    const next = normalizeEntityList(response, normalizeRoom);
    next.sort((a, b) => {
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
      return 0;
    });
    setRooms(next);
    return next;
  }, []);

  const loadStudentCounts = useCallback(async () => {
    try {
      const res = await apiClient.get(apiEndpoints.students.getAll);
      const studentList = unwrapList(res);
      const counts = {};
      if (Array.isArray(studentList)) {
        studentList.forEach((s) => {
          const sId = normalizeId(s.sectionId);
          if (sId) {
            counts[sId] = (counts[sId] || 0) + 1;
          }
        });
      }
      setSectionStudentCounts(counts);
      return counts;
    } catch (err) {
      console.warn("Could not fetch student counts for sections:", err);
      return {};
    }
  }, []);

  const loadSections = useCallback(async () => {
    const response = await apiClient.get(apiEndpoints.sections.getAll);
    const next = normalizeEntityList(response, normalizeSection);
    next.sort((a, b) => {
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
      return 0;
    });
    setSections(next);
    loadStudentCounts();
    return next;
  }, [loadStudentCounts]);

  useEffect(() => {
    let active = true;
    const boardRequests = boardRequestRef;
    const groupRequests = groupRequestRef;
    const programRequests = programRequestRef;
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.getAll, { params: { Status: true, PageNumber: 1, PageSize: 100 } }),
      apiClient.get(apiEndpoints.academicYears.active),
      apiClient.get(apiEndpoints.rooms.getAll),
      apiClient.get(apiEndpoints.sections.getAll),
      apiClient.get("/api/v1/staff/dropdown", { params: { staffType: "Teaching" } }),
      apiClient.get(apiEndpoints.students.getAll),
    ]).then((results) => {
      if (!active) return;
      const [boardsResult, yearsResult, roomsResult, sectionsResult, staffResult, studentsResult] = results;
      if (boardsResult.status === "fulfilled") {
        setBoardsList(unwrapList(boardsResult.value).map(normalizeBoard).filter((item) => item.id && item.isActive));
      }
      if (yearsResult.status === "fulfilled") setAcademicYearsList(unwrapList(yearsResult.value).map(normalizeYear).filter((item) => item.id && item.isActive));
      if (roomsResult.status === "fulfilled") {
        const fetchedRooms = normalizeEntityList(roomsResult.value, normalizeRoom);
        fetchedRooms.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
          return 0;
        });
        setRooms(fetchedRooms);
      }
      if (sectionsResult.status === "fulfilled") {
        const fetchedSections = normalizeEntityList(sectionsResult.value, normalizeSection);
        fetchedSections.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) return numB - numA;
          return 0;
        });
        setSections(fetchedSections);
      }
      if (staffResult.status === "fulfilled") {
        const staffData = unwrapList(staffResult.value).map(normalizeTeacher);
        const teachingStaff = staffData.filter(
          (item) => item.isActive && String(item.staffType || "Teaching").toLowerCase() === "teaching"
        );
        setTeachersList(teachingStaff.filter((item) => item.id));
      }
      if (studentsResult?.status === "fulfilled") {
        try {
          const studentList = unwrapList(studentsResult.value);
          const counts = {};
          if (Array.isArray(studentList)) {
            studentList.forEach((s) => {
              const sId = normalizeId(s.sectionId);
              if (sId) counts[sId] = (counts[sId] || 0) + 1;
            });
          }
          setSectionStudentCounts(counts);
        } catch {
          // ignore error if student list format varies
        }
      }
      const rejected = results.find((result) => result.status === "rejected");
      if (rejected) say(getApiErrorMessage(rejected.reason) || "Some Section Management data could not be loaded.");
    }).catch((error) => { if (active) say(getApiErrorMessage(error)); }).finally(() => { if (active) setInitialLoading(false); });
    return () => { active = false; ++boardRequests.current; ++groupRequests.current; ++programRequests.current; if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [say]);

  const loadPrograms = useCallback(async (groupId, programId = "") => {
    const requestId = ++programRequestRef.current;
    setProgramsList([]);
    setSectionForm((current) => ({ ...current, programId: "" }));
    if (!groupId) {
      setDependentLoading((current) => ({ ...current, program: false }));
      return;
    }
    setDependentLoading((current) => ({ ...current, program: true }));
    try {
      const response = await apiClient.get(apiEndpoints.groups.getPrograms(groupId));
      if (requestId === programRequestRef.current) {
        const next = unwrapList(response)
          .map((item) => normalizeProgram({ ...item, groupId: item.groupId ?? groupId }))
          .filter((item) => item.id && item.isActive && item.groupId === normalizeId(groupId));
        setProgramsList(next);
        setSectionForm((current) => normalizeId(current.groupId) === normalizeId(groupId)
          ? { ...current, programId: next.some((item) => item.programId === normalizeId(programId)) ? normalizeId(programId) : "" }
          : current);
      }
    } catch (error) {
      if (requestId === programRequestRef.current) say(getApiErrorMessage(error));
    } finally {
      if (requestId === programRequestRef.current) setDependentLoading((current) => ({ ...current, program: false }));
    }
  }, [say]);

  const loadGroups = useCallback(async (scope, preserve = {}) => {
    const requestId = ++groupRequestRef.current;
    ++programRequestRef.current;
    setGroupsList([]);
    setProgramsList([]);
    setSectionForm((current) => ({ ...current, groupId: "", programId: "" }));
    const { boardId } = scope;
    const ready = Boolean(boardId);
    setDependentLoading((current) => ({ ...current, group: ready, program: false }));
    if (!ready) return;
    try {
      const response = await apiClient.get(apiEndpoints.groups.getByBoard(boardId));
      if (requestId !== groupRequestRef.current) return;
      const next = unwrapList(response).map(normalizeGroup)
        .filter((group) => group.id && group.isActive && matchesGroupScope(group, scope));
      setGroupsList(next);
      const restored = next.find((group) => group.id === normalizeId(preserve.groupId));
      if (restored) {
        setSectionForm((current) => matchesGroupScope(restored, current) ? { ...current, groupId: restored.id } : current);
        await loadPrograms(restored.id, preserve.programId);
      }
    } catch (error) {
      if (requestId === groupRequestRef.current) say(getApiErrorMessage(error));
    } finally {
      if (requestId === groupRequestRef.current) setDependentLoading((current) => ({ ...current, group: false }));
    }
  }, [loadPrograms, say]);

  const changeAcademicScope = (field, value) => {
    setSectionForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: null }));
  };

  const loadBoardDependencies = useCallback(async (boardId, preserve = {}) => {
    const requestId = ++boardRequestRef.current;
    const board = boardsList.find((item) => item.isActive && item.id === normalizeId(boardId));
    const embedded = embeddedBoardLevels(board);
    setAcademicLevelsList(embedded);
    setSectionForm((current) => ({
      ...current,
      academicYearId: academicYearsList.some((year) => year.isActive && year.id === normalizeId(current.academicYearId) && yearBelongsToBoard(year, boardId)) ? current.academicYearId : "",
      academicLevelId: embedded.some((level) => level.id === normalizeId(current.academicLevelId)) ? current.academicLevelId : normalizeId(preserve.academicLevelId),
    }));
    setDependentLoading((current) => ({ ...current, board: Boolean(board) }));
    const groupsRequest = loadGroups({ boardId: board ? boardId : "" }, preserve);
    if (!board) return groupsRequest;
    try {
      const response = await apiClient.get(apiEndpoints.academicLevels.getByBoard(boardId));
      if (requestId !== boardRequestRef.current) return;
      const merged = new Map(embedded.map((level) => [level.id, level]));
      for (const item of unwrapList(response)) {
        const level = normalizeLevel(item);
        if (!level.id || (item.boardId != null && normalizeId(item.boardId) !== normalizeId(boardId))) continue;
        if (level.isActive) merged.set(level.id, { ...level, boardId: normalizeId(boardId) });
        else merged.delete(level.id);
      }
      const next = Array.from(merged.values());
      setAcademicLevelsList(next);
      setSectionForm((current) => normalizeId(current.boardId) === normalizeId(boardId) ? {
        ...current,
        academicLevelId: next.some((level) => level.id === normalizeId(current.academicLevelId)) ? normalizeId(current.academicLevelId) : "",
      } : current);
    } catch (error) {
      if (requestId === boardRequestRef.current) say(getApiErrorMessage(error));
    } finally {
      if (requestId === boardRequestRef.current) setDependentLoading((current) => ({ ...current, board: false }));
      await groupsRequest;
    }
  }, [boardsList, academicYearsList, loadGroups, say]);

  // Lookup maps
  const boardsById = useMemo(() => new Map(boardsList.map((b) => [String(b.id), b])), [boardsList]);
  const yearsById = useMemo(() => new Map(academicYearsList.map((y) => [String(y.id), y])), [academicYearsList]);
  const levelsById = useMemo(() => new Map(academicLevelsList.map((l) => [String(l.id), l])), [academicLevelsList]);
  const groupsById = useMemo(() => new Map(groupsList.map((g) => [String(g.id), g])), [groupsList]);
  const programsById = useMemo(() => new Map(programsList.map((p) => [String(p.programId), p])), [programsList]);
  const roomsById = useMemo(() => new Map(rooms.map((r) => [String(r.id), r])), [rooms]);
  const teachersById = useMemo(() => new Map(teachersList.map((t) => [String(t.id), t])), [teachersList]);

  const resolveSection = useCallback((section) => {
    const board = boardsById.get(String(section.boardId));
    const year = yearsById.get(String(section.academicYearId));
    const level = levelsById.get(String(section.academicLevelId));
    const group = groupsById.get(String(section.groupId));
    const program = programsById.get(String(section.programId));
    const room = roomsById.get(String(section.roomId));
    const teacher = teachersById.get(String(section.classTeacherId));

    return {
      boardName: board?.name || section.board || "—",
      boardCode: board?.code || section.boardCode || "—",
      academicYearName: year?.name || section.academicYear || "—",
      academicLevelName: level?.name || section.academicLevel || "—",
      groupName: group?.name || section.group || "—",
      programName: program?.name || section.program || "—",
      roomNo: room?.roomNo || section.roomNo || "—",
      teacherName: teacher?.name || (section.teacher ? section.teacher.replace(/\s*\([^)]*\)$/, "") : "—"),
    };
  }, [boardsById, yearsById, levelsById, groupsById, programsById, roomsById, teachersById]);

  const roomAllowed = (room, row, otherRows = []) => Boolean(room?.id && room.isActive && room.roomType === "Classroom" &&
    (row.status !== "Active" || (![...sections.filter((section) => normalizeId(section.id) !== normalizeId(selectedSectionId)), ...otherRows]
      .some((section) => section.status === "Active" && normalizeId(section.roomId) === normalizeId(room.id)))));
  const teacherAllowed = (teacher, row, otherRows = []) => isTeachingStaff(teacher) &&
    (row.status !== "Active" || ![...sections.filter((section) => normalizeId(section.id) !== normalizeId(selectedSectionId)), ...otherRows]
      .some((section) => section.status === "Active" && normalizeId(section.classTeacherId) === normalizeId(teacher.id)));
  const roomOptionsFor = (row, others = []) => rooms.filter((room) => roomAllowed(room, row, others))
    .map((room) => ({ value: normalizeId(room.id), label: room.roomNo + " (Cap: " + room.capacity + ")" }));
  const teacherOptionsFor = (row, others = []) => teachersList.filter((teacher) => teacherAllowed(teacher, row, others))
    .map((teacher) => ({ value: normalizeId(teacher.id), label: teacher.employeeId ? teacher.name + " (" + teacher.employeeId + ")" : teacher.name }));
  const previewOption = (options, id, label) => sectionFormMode === "preview" && id && !options.some((item) => item.value === normalizeId(id))
    ? [{ value: normalizeId(id), label }, ...options] : options;
  const previewSection = sections.find((item) => normalizeId(item.id) === normalizeId(selectedSectionId));
  const availableRooms = previewOption(roomOptionsFor(sectionForm), sectionForm.roomId, previewSection?.roomNo || "Current Room");
  const availableTeachers = previewOption(teacherOptionsFor(sectionForm), sectionForm.classTeacherId, previewSection?.teacher || "Current Incharge");

  const bulkRoomOptionsFor = (row, others = []) => rooms.filter((room) => roomAllowed(room, row, others))
    .map((room) => ({ value: normalizeId(room.id), label: String(room.roomNo) }));
  const bulkTeacherOptionsFor = (row, others = []) => teachersList.filter((teacher) => teacherAllowed(teacher, row, others))
    .map((teacher) => ({ value: normalizeId(teacher.id), label: teacher.name }));
  const getAvailableRoomsForBulkRow = (index) => bulkRoomOptionsFor(bulkSections[index], bulkSections.filter((_, other) => index !== other));
  const getAvailableTeachersForBulkRow = (index) => bulkTeacherOptionsFor(bulkSections[index], bulkSections.filter((_, other) => index !== other));

  // Filtering & Pagination
  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sections.filter((sec) => {
      const d = resolveSection(sec);
      if (filters.boardId && normalizeId(sec.boardId) !== normalizeId(filters.boardId)) return false;
      if (filters.academicYearId && normalizeId(sec.academicYearId) !== normalizeId(filters.academicYearId)) return false;
      if (filters.groupId && normalizeId(sec.groupId) !== normalizeId(filters.groupId)) return false;
      if (filters.programId && normalizeId(sec.programId) !== normalizeId(filters.programId)) return false;
      if (filters.academicLevelId && normalizeId(sec.academicLevelId) !== normalizeId(filters.academicLevelId)) return false;

      if (!q) return true;
      return [
        sec.name,
        d.boardName,
        d.boardCode,
        d.academicYearName,
        d.groupName,
        d.programName,
        d.academicLevelName,
        d.roomNo,
        d.teacherName,
        sec.status,
      ].some((val) => String(val || "").toLowerCase().includes(q));
    });
  }, [sections, filters, search, resolveSection]);

  const sectionPages = Math.max(1, Math.ceil(filteredSections.length / (sectionPageSize || 5)));
  const shownSections = filteredSections.slice((page - 1) * (sectionPageSize || 5), page * (sectionPageSize || 5));

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    return rooms.filter((r) => {
      if (roomFilters.building && r.building !== roomFilters.building) return false;
      if (roomFilters.floor && String(r.floor) !== roomFilters.floor) return false;
      if (roomFilters.roomType && r.roomType !== roomFilters.roomType) return false;

      if (!q) return true;
      return [
        r.roomNo,
        r.building,
        r.floor,
        r.roomType,
        r.isActive ? "Active" : "Inactive",
      ].some((val) => String(val || "").toLowerCase().includes(q));
    });
  }, [rooms, roomSearch, roomFilters]);

  const roomPages = Math.max(1, Math.ceil(filteredRooms.length / (roomPageSize || 5)));
  const shownRooms = filteredRooms.slice((roomPage - 1) * (roomPageSize || 5), roomPage * (roomPageSize || 5));

  useEffect(() => { setPage((current) => Math.min(current, sectionPages)); }, [sectionPages]);
  useEffect(() => { setRoomPage((current) => Math.min(current, roomPages)); }, [roomPages]);
  useEffect(() => { setRoomPage(1); }, [roomFilters, roomSearch, roomPageSize]);

  useEffect(() => { setPage(1); }, [filters, search, sectionPageSize]);

  // Dropdowns
  const selectedSection = useMemo(() => sections.find((item) => normalizeId(item.id) === normalizeId(selectedSectionId)), [sections, selectedSectionId]);
  const boardOptions = useMemo(() => {
    const options = boardsList.filter((b) => b.isActive).map((b) => ({ value: String(b.id), label: b.name }));
    if (sectionFormMode === "preview" && selectedSection?.boardId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.boardId))) {
      options.unshift({ value: String(selectedSection.boardId), label: selectedSection.board || "Current Board" });
    }
    return options;
  }, [boardsList, selectedSection, sectionFormMode]);

  const filteredYearOptions = useMemo(() => {
    const options = academicYearsList
      .filter((y) => y.isActive && yearBelongsToBoard(y, sectionForm.boardId))
      .map((y) => ({ value: String(y.id), label: y.name }));
    if (sectionFormMode === "preview" && selectedSection?.academicYearId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.academicYearId))) {
      options.unshift({ value: String(selectedSection.academicYearId), label: selectedSection.academicYear || "Current Academic Year" });
    }
    return options;
  }, [academicYearsList, selectedSection, sectionForm.boardId, sectionFormMode]);

  const filteredGroupOptions = useMemo(() => groupsList
    .filter((group) => group.isActive && matchesGroupScope(group, sectionForm))
    .map((group) => ({ value: normalizeId(group.id), label: group.name })),
    [groupsList, sectionForm]);

  const filteredProgramOptions = useMemo(() => programsList
    .filter((program) => program.isActive && normalizeId(program.groupId) === normalizeId(sectionForm.groupId))
    .map((program) => ({ value: normalizeId(program.programId), label: program.name })),
    [programsList, sectionForm.groupId]);

  const levelOptions = useMemo(() => {
    const options = academicLevelsList.filter((l) => l.isActive).map((l) => ({ value: String(l.id), label: l.name }));
    if (sectionFormMode === "preview" && selectedSection?.academicLevelId && !options.some((item) => normalizeId(item.value) === normalizeId(selectedSection.academicLevelId))) {
      options.unshift({ value: String(selectedSection.academicLevelId), label: selectedSection.academicLevel || "Current Academic Level" });
    }
    return options;
  }, [academicLevelsList, selectedSection, sectionFormMode]);

  const uniqueOptions = (items) => items.filter((item, index) => item.value && items.findIndex((other) => other.value === item.value) === index);
  const sectionBoardFilterOptions = uniqueOptions([...boardsList.map((item) => ({ value: item.id, label: item.name })), ...sections.map((item) => ({ value: item.boardId, label: item.board || "Board" }))]);
  const sectionYearFilterOptions = uniqueOptions([...academicYearsList.filter((item) => !filters.boardId || yearBelongsToBoard(item, filters.boardId)).map((item) => ({ value: item.id, label: item.name })), ...sections.filter((item) => !filters.boardId || normalizeId(item.boardId) === normalizeId(filters.boardId)).map((item) => ({ value: item.academicYearId, label: item.academicYear || "Academic Year" }))]);
  const sectionGroupFilterOptions = uniqueOptions(sections.filter((item) => !filters.boardId || normalizeId(item.boardId) === normalizeId(filters.boardId)).map((item) => ({ value: item.groupId, label: item.group || "Group" })));
  const sectionProgramFilterOptions = uniqueOptions(sections.filter((item) => (!filters.boardId || normalizeId(item.boardId) === normalizeId(filters.boardId)) && (!filters.groupId || normalizeId(item.groupId) === normalizeId(filters.groupId))).map((item) => ({ value: item.programId, label: item.program || "Program" })));
  const sectionLevelFilterOptions = uniqueOptions([...boardsList.filter((board) => !filters.boardId || board.id === normalizeId(filters.boardId)).flatMap(embeddedBoardLevels).map((item) => ({ value: item.id, label: item.name })), ...sections.filter((item) => !filters.boardId || normalizeId(item.boardId) === normalizeId(filters.boardId)).map((item) => ({ value: item.academicLevelId, label: item.academicLevel || "Academic Level" }))]);

  const roomBuildings = useMemo(() => [...new Set(rooms.map((r) => r.building).filter(Boolean))], [rooms]);
  const roomFloors = useMemo(() => [...new Set(rooms.map((r) => String(r.floor)).filter(Boolean))], [rooms]);
  const roomFilterTypes = useMemo(() => [...new Set(rooms.map((r) => r.roomType).filter(Boolean))], [rooms]);

  const openAddSection = () => {
    if (operationRef.current) return;
    ++boardRequestRef.current;
    ++groupRequestRef.current;
    ++programRequestRef.current;
    setDependentLoading({ board: false, group: false, program: false });
    setSelectedSectionId(null);
    setSectionFormMode("add");
    setSectionCreationType("single");
    setFieldErrors({});
    const boardId = effectiveNavbarBoard ? normalizeId(effectiveNavbarBoard.id) : (boardsList.some((item) => item.id === normalizeId(filters.boardId)) ? normalizeId(filters.boardId) : "");
    const academicYearId = effectiveNavbarYear ? normalizeId(effectiveNavbarYear.id) : (academicYearsList.some((item) => item.id === normalizeId(filters.academicYearId) && yearBelongsToBoard(item, boardId)) ? normalizeId(filters.academicYearId) : "");
    const academicLevelId = embeddedBoardLevels(boardsList.find((item) => item.id === boardId)).some((item) => item.id === normalizeId(filters.academicLevelId)) || sections.some((item) => item.boardId === boardId && item.academicLevelId === normalizeId(filters.academicLevelId)) ? normalizeId(filters.academicLevelId) : "";
    const groupId = boardId && sections.some((item) => item.boardId === boardId && item.groupId === normalizeId(filters.groupId)) ? normalizeId(filters.groupId) : "";
    const programId = groupId && sections.some((item) => item.groupId === groupId && item.programId === normalizeId(filters.programId)) ? normalizeId(filters.programId) : "";
    setSectionForm({
      boardId,
      academicYearId,
      groupId,
      programId,
      academicLevelId,
      name: "",
      roomId: "",
      classTeacherId: "",
      strength: "",
      status: "",
    });
    setGroupsList([]);
    setProgramsList([]);
    setBulkSections([{ name: "", roomId: "", classTeacherId: "", strength: "", status: "" }]);
    setSectionView("form");
    loadBoardDependencies(boardId, { groupId, programId, academicLevelId });
  };

  useEffect(() => {
    if (sectionView === "form" && sectionFormMode === "add") {
      const bId = effectiveNavbarBoard ? normalizeId(effectiveNavbarBoard.id) : "";
      const yId = effectiveNavbarYear ? normalizeId(effectiveNavbarYear.id) : "";
      if (bId && normalizeId(sectionForm.boardId) !== bId) {
        setSectionForm((f) => ({ ...f, boardId: bId, academicYearId: yId || f.academicYearId }));
        loadBoardDependencies(bId);
      } else if (yId && normalizeId(sectionForm.academicYearId) !== yId) {
        setSectionForm((f) => ({ ...f, academicYearId: yId }));
      }
    }
  }, [sectionView, sectionFormMode, effectiveNavbarBoard, effectiveNavbarYear, sectionForm.boardId, sectionForm.academicYearId, loadBoardDependencies]);

  const openEditSection = (sec, isPreview = false) => {
    if (operationRef.current) return;
    setSelectedSectionId(sec.id);
    setSectionFormMode(isPreview ? "preview" : "edit");
    setSectionCreationType("single");
    setFieldErrors({});
    setSectionForm({
      boardId: sec.boardId ? String(sec.boardId) : "",
      academicYearId: sec.academicYearId ? String(sec.academicYearId) : "",
      groupId: sec.groupId ? String(sec.groupId) : "",
      programId: sec.programId ? String(sec.programId) : "",
      academicLevelId: sec.academicLevelId ? String(sec.academicLevelId) : "",
      name: sec.name || "",
      roomId: sec.roomId ? String(sec.roomId) : "",
      classTeacherId: sec.classTeacherId ? String(sec.classTeacherId) : "",
      strength: String(sec.strength || ""),
      status: sec.status || "",
    });
    setSectionView("form");
    if (isPreview) {
      ++boardRequestRef.current;
      ++groupRequestRef.current;
      ++programRequestRef.current;
      setDependentLoading({ board: false, group: false, program: false });
      setGroupsList(sec.groupId ? [{ id: normalizeId(sec.groupId), boardId: normalizeId(sec.boardId), name: sec.group, isActive: true }] : []);
      setProgramsList(sec.programId ? [{ id: normalizeId(sec.programId), programId: normalizeId(sec.programId), groupId: normalizeId(sec.groupId), name: sec.program, isActive: true }] : []);
    } else {
      loadBoardDependencies(sec.boardId, { groupId: sec.groupId, programId: sec.programId, academicLevelId: sec.academicLevelId });
    }
  };

  const openAddRoom = () => {
    setSelectedRoomId(null);
    setRoomFormMode("add");
    setRoomCreationType("single");
    setRoomFieldErrors({});
    setRoomForm({
      roomNo: "",
      capacity: "",
      roomType: "",
      building: "",
      floor: "",
      isActive: "",
    });
    setBulkRoomForm(EMPTY_BULK_ROOM_FORM);
    setBulkRoomAllocations([]);
    setBulkRoomPage(1);
    setRoomView("form");
  };

  const openEditRoom = (room, isPreview = false) => {
    setSelectedRoomId(room.id);
    setRoomFormMode(isPreview ? "preview" : "edit");
    setRoomCreationType("single");
    setRoomFieldErrors({});
    setRoomForm({
      roomNo: room.roomNo || "",
      capacity: String(room.capacity || ""),
      roomType: room.roomType || "Classroom",
      building: room.building || "",
      floor: String(room.floor ?? ""),
      isActive: room.status ?? (room.isActive === true ? "Active" : room.isActive === false ? "Inactive" : ""),
    });
    setRoomView("form");
  };

  const handleSectionRoomChange = (roomId) => {
    const selectedRoom = roomsById.get(String(roomId));
    setSectionForm((prev) => ({
      ...prev,
      roomId,
      strength: selectedRoom ? String(Math.min(150, Number(selectedRoom.capacity))) : "",
    }));
    setFieldErrors((prev) => ({ ...prev, roomId: null, strength: null }));
  };

  const handleBulkSectionRoomChange = (index, roomId) => {
    const selectedRoom = roomsById.get(String(roomId));
    setBulkSections((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        roomId,
        strength: selectedRoom ? String(Math.min(150, Number(selectedRoom.capacity))) : "",
      };
      return next;
    });
  };

  const prepareBulkRoomAllocations = () => {
    const count = Number(bulkRoomForm.roomCount);
    const sequence = parseRoomNumberSequence(bulkRoomForm.startRoomNo);
    const nextErrors = { ...roomFieldErrors };
    delete nextErrors.startRoomNo;
    delete nextErrors.roomCount;
    if (!sequence) nextErrors.startRoomNo = "First Room Number must end with a numeric suffix";
    if (!Number.isInteger(count) || count < 1 || count > 100) nextErrors.roomCount = "Room count must be between 1 and 100";
    if (!sequence || nextErrors.roomCount) return setRoomFieldErrors(nextErrors);
    const next = reconcileBulkRoomAllocations(bulkRoomAllocations, bulkRoomForm);
    const duplicateErrors = validateBulkRoomAllocations(next, rooms, count);
    Object.keys(nextErrors).filter((key) => key.startsWith("bulk_")).forEach((key) => delete nextErrors[key]);
    setBulkRoomAllocations(next);
    if (!bulkRoomAllocations.length) setBulkRoomPage(1);
    setRoomFieldErrors({ ...nextErrors, ...Object.fromEntries(Object.entries(duplicateErrors).filter(([key]) => key.startsWith("bulk_roomNo_"))) });
  };

  const updateBulkRoomAllocation = (index, field, value) => {
    setBulkRoomAllocations((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    setRoomFieldErrors((current) => ({ ...current, [`bulk_${field}_${index}`]: null }));
  };

  // ---------- SAVE HANDLERS WITH INLINE ERROR MESSAGES ----------
  const saveSection = async (e) => {
    e.preventDefault();
    if (operationRef.current || initialLoading || sectionFormMode === "preview") return;
    const errs = {};

    const { boardId, academicYearId, groupId, programId, academicLevelId } = sectionForm;
    if (!boardId) errs.boardId = "Board selection is required";
    if (!academicYearId) errs.academicYearId = "Academic Year selection is required";
    if (!groupId) errs.groupId = "Group selection is required";
    if (!programId) errs.programId = "Program selection is required";
    if (!academicLevelId) errs.academicLevelId = "Academic Level selection is required";

    const boardObj = boardsById.get(String(boardId));
    const yearObj = yearsById.get(String(academicYearId));
    const groupObj = groupsById.get(String(groupId));
    const programObj = programsById.get(String(programId));
    const levelObj = levelsById.get(String(academicLevelId));
    if (dependentLoading.board || dependentLoading.group || dependentLoading.program) return say("Please wait for academic options to finish loading.");
    if (!boardObj?.isActive) errs.boardId = "Select an active Board";
    if (!yearObj?.isActive || !yearBelongsToBoard(yearObj, boardId)) errs.academicYearId = "Select an active Academic Year for this Board";
    if (!groupObj?.isActive || !matchesGroupScope(groupObj, sectionForm)) errs.groupId = "Select an active Group for this Board";
    if (!programObj?.isActive || programObj.groupId !== groupId) errs.programId = "Select an active Program for this Group";
    if (!levelObj?.isActive || normalizeId(levelObj.boardId) !== normalizeId(boardId)) errs.academicLevelId = "Select an active Academic Level for this Board";

    if (sectionCreationType === "single" || selectedSectionId) {
      if (!sectionForm.name.trim() || sectionForm.name.trim().length > 50) errs.name = "Section Name must contain 1 to 50 characters";
      if (!sectionForm.roomId) errs.roomId = "Room No selection is required";
      if (!["Active", "Inactive"].includes(sectionForm.status)) errs.status = "Status selection is required (Active/Inactive)";

      const roomObj = roomsById.get(String(sectionForm.roomId));
      const strengthNum = Number(sectionForm.strength);
      if (!roomAllowed(roomObj, sectionForm)) errs.roomId = "Room is not available for Section allocation";
      if (sectionForm.classTeacherId && !teacherAllowed(teachersById.get(normalizeId(sectionForm.classTeacherId)), sectionForm)) {
        errs.classTeacherId = "Select an available active Teaching Incharge";
      }
      if (sections.some((item) => normalizeId(item.id) !== normalizeId(selectedSectionId) && sameText(item.name, sectionForm.name) && normalizeId(item.boardId) === normalizeId(boardId) && normalizeId(item.academicYearId) === normalizeId(academicYearId) && normalizeId(item.groupId) === normalizeId(groupId) && normalizeId(item.programId) === normalizeId(programId) && normalizeId(item.academicLevelId) === normalizeId(academicLevelId))) errs.name = "Section Name already exists for this academic scope";

      if (!String(sectionForm.strength).trim()) {
        errs.strength = "Capacity is required";
      } else if (!Number.isInteger(strengthNum) || strengthNum <= 0 || strengthNum > 150) {
        errs.strength = "Section capacity must be an integer from 1 to 150";
      } else if (roomObj && strengthNum > Number(roomObj.capacity)) {
        errs.strength = `Section capacity (${strengthNum}) cannot exceed room capacity (${roomObj.capacity})`;
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      const isEdit = Boolean(selectedSectionId);
      const payload = sectionPayload(sectionForm, { ...sectionForm, program: programObj });
      await runMutation(isEdit ? "UPDATE_SECTION" : "ADD_SECTION",
        () => isEdit ? apiClient.put(apiEndpoints.sections.update(selectedSectionId), payload) : apiClient.post(apiEndpoints.sections.create, payload),
        async () => {
          const next = await loadSections();
          await loadRooms();
          if (!next.some((item) => (!isEdit || item.id === selectedSectionId) && matchesSection(item, payload))) throw new Error("The saved Section was not found with the requested values.");
        },
        () => {
          if (!isEdit) setPage(1);
          setFieldErrors({});
          setSectionView("list");
          say("Section " + sectionForm.name.trim() + (isEdit ? " updated" : " added") + " successfully!");
        });
    } else {
      // BULK SECTIONS SAVE
      if (!bulkSections.length) {
        errs.bulk = "Please configure at least one section";
        setFieldErrors(errs);
        return;
      }

      const namesInBatch = new Set();

      for (let i = 0; i < bulkSections.length; i++) {
        const sec = bulkSections[i];
        if (!sec.name.trim() || sec.name.trim().length > 50) errs[`name_${i}`] = "Section Name must contain 1 to 50 characters";
        if (!sec.roomId) errs[`room_${i}`] = `Room No required`;
        if (!["Active", "Inactive"].includes(sec.status)) errs[`status_${i}`] = `Status required`;
        const normalizedName = sec.name.trim().replace(/\s+/g, " ").toLowerCase();
        if (normalizedName && namesInBatch.has(normalizedName)) errs[`name_${i}`] = "Duplicate Section Name in batch";
        if (normalizedName) namesInBatch.add(normalizedName);
        if (normalizedName && sections.some((item) => sameText(item.name, normalizedName) && normalizeId(item.boardId) === normalizeId(boardId) && normalizeId(item.academicYearId) === normalizeId(academicYearId) && normalizeId(item.groupId) === normalizeId(groupId) && normalizeId(item.programId) === normalizeId(programId) && normalizeId(item.academicLevelId) === normalizeId(academicLevelId))) errs[`name_${i}`] = "Section Name already exists for this academic scope";

        const roomObj = roomsById.get(normalizeId(sec.roomId));
        const others = bulkSections.filter((_, index) => index !== i);
        if (!roomAllowed(roomObj, sec, others)) errs[`room_${i}`] = "Room is not available for Section allocation";
        if (sec.classTeacherId && !teacherAllowed(teachersById.get(normalizeId(sec.classTeacherId)), sec, others)) {
          errs[`teacher_${i}`] = "Select an available active Teaching Incharge";
        }
        const strengthNum = Number(sec.strength);
        if (!String(sec.strength).trim() || !Number.isInteger(strengthNum) || strengthNum <= 0 || strengthNum > 150) {
          errs[`strength_${i}`] = "Section capacity must be an integer from 1 to 150";
        } else if (roomObj && strengthNum > Number(roomObj.capacity)) {
          errs[`strength_${i}`] = `Exceeds room capacity (${roomObj.capacity})`;
        }
      }

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }

      const payloads = bulkSections.map((item) => sectionPayload(item, { ...sectionForm, program: programObj }));
      const { boardId: board, academicYearId: year, academicLevelId: level, groupId: group, programId: program } = payloads[0];
      await runMutation("BULK_SECTION",
        () => apiClient.post(SECTION_BULK_ENDPOINT, { boardId: board, academicYearId: year, academicLevelId: level, groupId: group, programId: program, sections: payloads.map(({ sectionName, roomId, inchargeId, maximumStrength, isActive }) => ({ sectionName, roomId, inchargeId, maximumStrength, isActive })) }),
        async (response) => {
          const next = await loadSections();
          await loadRooms();
          verifyBulkResult(response, payloads.length);
          if (!payloads.every((payload) => next.some((item) => matchesSection(item, payload)))) throw new Error("Not all requested Sections were found in the backend data.");
        },
        () => {
          setPage(1);
          setBulkSections([{ name: "", roomId: "", classTeacherId: "", strength: "", status: "" }]);
          setFieldErrors({});
          setSectionView("list");
          say(payloads.length + " Sections created successfully!");
        });
    }
  };

  const saveRoom = async (event) => {
    event.preventDefault();
    if (operationRef.current || initialLoading || roomFormMode === "preview") return;
    const isEdit = Boolean(selectedRoomId);
    const isBulk = !isEdit && roomCreationType === "bulk";
    const errors = {};
    const form = isBulk ? bulkRoomForm : roomForm;
    if (!form.building.trim()) errors.building = "Building is required";
    if (!String(form.floor).trim()) errors.floor = "Floor is required";
    if (!["Active", "Inactive"].includes(form.isActive)) errors.isActive = "Status is required";
    let forms;
    if (isBulk) {
      const count = Number(form.roomCount);
      if (!parseRoomNumberSequence(form.startRoomNo)) errors.startRoomNo = "First Room Number must end with a numeric suffix";
      if (!Number.isInteger(count) || count < 1 || count > 100) errors.roomCount = "Room count must be between 1 and 100";
      Object.assign(errors, validateBulkRoomAllocations(bulkRoomAllocations, rooms, count));
      const numbers = generateRoomNumbers(form.startRoomNo, count);
      if (bulkRoomAllocations.some((row, index) => row.roomNo !== numbers[index])) errors.bulk = "Prepare the Room Allocation Preview again after changing the sequence.";
      forms = bulkRoomAllocations.map((row) => ({ ...form, ...row }));
    } else {
      forms = [roomForm];
      if (!roomForm.roomNo.trim() || roomForm.roomNo.trim().length > 50) errors.roomNo = "Room Number must contain 1 to 50 characters";
      if (rooms.some((room) => normalizeId(room.id) !== normalizeId(selectedRoomId) && sameText(room.roomNo, roomForm.roomNo))) errors.roomNo = "Room Number already exists";
      if (!Number.isInteger(Number(roomForm.capacity)) || Number(roomForm.capacity) < 1 || Number(roomForm.capacity) > 1000) errors.capacity = "Capacity must be an integer from 1 to 1000";
      if (!ROOM_TYPES.includes(roomForm.roomType)) errors.roomType = "Room Type is required";
      const assigned = sections.filter((section) => section.status === "Active" && normalizeId(section.roomId) === normalizeId(selectedRoomId));
      if (assigned.length) {
        const current = roomsById.get(normalizeId(selectedRoomId));
        if (!sameText(roomForm.roomNo, current?.roomNo)) errors.roomNo = "An allocated Room cannot be renamed";
        if (roomForm.roomType !== "Classroom") errors.roomType = "An allocated Room must remain a Classroom";
        if (roomForm.isActive !== "Active") errors.isActive = "An allocated Room cannot be deactivated";
        if (assigned.some((section) => Number(section.strength) > Number(roomForm.capacity))) errors.capacity = "Capacity cannot be less than allocated Section strength";
      }
    }
    setRoomFieldErrors(errors);
    if (Object.keys(errors).length) return;
    const payloads = forms.map(roomPayload);
    await runMutation(isBulk ? "BULK_ROOM" : isEdit ? "UPDATE_ROOM" : "ADD_ROOM",
      () => isBulk ? apiClient.post(ROOM_ENDPOINTS.bulk, { rooms: payloads }) : isEdit ? apiClient.put(ROOM_ENDPOINTS.update(selectedRoomId), payloads[0]) : apiClient.post(ROOM_ENDPOINTS.create, payloads[0]),
      async (response) => {
        const next = await loadRooms();
        if (isBulk) verifyBulkResult(response, payloads.length);
        if (!payloads.every((payload) => next.some((room) => (!isEdit || room.id === selectedRoomId) && matchesRoom(room, payload)))) throw new Error("The saved Rooms were not found with the requested values.");
      },
      () => {
        if (!isEdit) setRoomPage(1);
        setRoomView("list");
        if (isBulk) { setBulkRoomForm(EMPTY_BULK_ROOM_FORM); setBulkRoomAllocations([]); }
        say(isBulk ? payloads.length + " Rooms created successfully!" : "Room " + roomForm.roomNo.trim() + (isEdit ? " updated" : " added") + " successfully!");
      });
  };

  // ---------- ROOM EXCEL UPLOAD / IMPORT HANDLERS ----------
  const closeUploadModal = () => {
    if (isImporting) return;
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setValidationResult(null);
    setIsValidating(false);
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

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

  const handleFileSelect = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      say("Please upload a valid Excel file (.xlsx, .xls, or .csv)", "error");
      return;
    }
    setUploadFile(file);
    setValidationResult(null);
  };

  const downloadRoomTemplate = () => {
    const templateData = [
      {
        "Room Number": "101",
        "Building": "Main Block",
        "Floor": "1",
        "Room Type": "Classroom",
        "Capacity": 60,
        "Status": "Active",
      },
      {
        "Room Number": "102",
        "Building": "Main Block",
        "Floor": "1",
        "Room Type": "Laboratory",
        "Capacity": 40,
        "Status": "Active",
      },
      {
        "Room Number": "201",
        "Building": "Tech Block",
        "Floor": "2",
        "Room Type": "Computer Lab",
        "Capacity": 50,
        "Status": "Active",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rooms");
    XLSX.writeFile(wb, "Room_Import_Template.xlsx");
  };

  const validateExcelFile = () => {
    if (!uploadFile) {
      say("Please select or drop an Excel file first.", "error");
      return;
    }

    setIsValidating(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error("No worksheets found in the uploaded workbook.");
        }
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawRows.length) {
          setValidationResult({
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            duplicateRows: 0,
            errors: [{ row: 0, message: "The uploaded file contains no data rows." }],
            validPayloads: [],
            isValid: false,
          });
          setIsValidating(false);
          return;
        }

        const errors = [];
        const seenInFile = new Set();
        const existingRoomsSet = new Set(rooms.map((r) => String(r.roomNo || "").trim().toLowerCase()));
        const validPayloads = [];
        let duplicateCount = 0;

        rawRows.forEach((row, idx) => {
          const rowNum = idx + 2; // Excel row number (1-based header is row 1)

          // Match keys case-insensitively and flexibly
          const getVal = (...keys) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase().replace(/[_\s-]/g, "") === key.toLowerCase().replace(/[_\s-]/g, "")
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") {
                return String(row[matchedKey]).trim();
              }
            }
            return "";
          };

          const roomNo = getVal("Room Number", "Room No", "roomNumber", "roomNo", "room");
          const building = getVal("Building", "Block", "Building Name", "Block Name", "buildingName");
          const floor = getVal("Floor", "Floor No", "floorNumber", "floor");
          const rawRoomType = getVal("Room Type", "RoomType", "room_type", "type");
          const rawCapacity = getVal("Capacity", "Room Capacity", "maxCapacity", "capacity");
          const rawStatus = getVal("Status", "isActive", "Active", "status");

          let rowHasError = false;

          // Validate Room Number
          if (!roomNo) {
            errors.push({ row: rowNum, message: "Room Number is required." });
            rowHasError = true;
          } else if (roomNo.length > 50) {
            errors.push({ row: rowNum, message: "Room Number must not exceed 50 characters." });
            rowHasError = true;
          } else {
            const normalizedRoomNo = roomNo.toLowerCase();
            if (seenInFile.has(normalizedRoomNo)) {
              errors.push({ row: rowNum, message: `Duplicate Room Number "${roomNo}" within the file.` });
              duplicateCount++;
              rowHasError = true;
            } else if (existingRoomsSet.has(normalizedRoomNo)) {
              errors.push({ row: rowNum, message: `Room Number "${roomNo}" already exists in the system.` });
              duplicateCount++;
              rowHasError = true;
            }
            seenInFile.add(normalizedRoomNo);
          }

          // Validate Building
          if (!building) {
            errors.push({ row: rowNum, message: "Building / Block name is required." });
            rowHasError = true;
          }

          // Validate Floor
          if (!floor) {
            errors.push({ row: rowNum, message: "Floor is required." });
            rowHasError = true;
          }

          // Validate Room Type
          const matchedType = ROOM_TYPES.find(
            (t) => t.toLowerCase() === rawRoomType.toLowerCase()
          );
          if (!matchedType) {
            errors.push({ row: rowNum, message: `Invalid Room Type "${rawRoomType}". Allowed: ${ROOM_TYPES.join(", ")}.` });
            rowHasError = true;
          }

          // Validate Capacity
          const capNum = Number(rawCapacity);
          if (!rawCapacity || !Number.isInteger(capNum) || capNum < 1 || capNum > 1000) {
            errors.push({ row: rowNum, message: `Capacity must be a whole number between 1 and 1000 (received "${rawCapacity || "empty"}").` });
            rowHasError = true;
          }

          // Status defaults to Active if not explicitly Inactive
          const isActive = !["inactive", "false", "0"].includes(rawStatus.toLowerCase());

          if (!rowHasError) {
            validPayloads.push({
              roomNo,
              building,
              floor: String(floor),
              roomType: matchedType,
              capacity: capNum,
              isActive: isActive ? "Active" : "Inactive",
            });
          }
        });

        const isValid = errors.length === 0 && validPayloads.length === rawRows.length;
        setValidationResult({
          totalRows: rawRows.length,
          validRows: validPayloads.length,
          invalidRows: rawRows.length - validPayloads.length,
          duplicateRows: duplicateCount,
          errors,
          validPayloads,
          isValid,
        });

        if (isValid) {
          say(`All ${validPayloads.length} rooms validated successfully! Ready to import.`);
        } else {
          say(`Validation completed with ${errors.length} issue(s). Please review errors.`, "error");
        }
      } catch (err) {
        console.error("Excel parse failed", err);
        setValidationResult({
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          duplicateRows: 0,
          errors: [{ row: 0, message: "Could not read Excel file: " + (err.message || "Invalid file format") }],
          validPayloads: [],
          isValid: false,
        });
        say("Failed to parse Excel file: " + (err.message || "Invalid format"), "error");
      } finally {
        setIsValidating(false);
      }
    };

    reader.onerror = () => {
      setIsValidating(false);
      say("Failed to read the file from your computer.", "error");
    };

    reader.readAsArrayBuffer(uploadFile);
  };

  const handleImportRooms = async () => {
    if (!validationResult || !validationResult.isValid || !validationResult.validPayloads?.length) return;
    if (isImporting) return;

    setIsImporting(true);
    const payloads = validationResult.validPayloads.map(roomPayload);

    try {
      await runMutation(
        "BULK_ROOM_IMPORT",
        () => apiClient.post(ROOM_ENDPOINTS.bulk, { rooms: payloads }),
        async (response) => {
          const next = await loadRooms();
          verifyBulkResult(response, payloads.length);
          if (!payloads.every((payload) => next.some((room) => matchesRoom(room, payload)))) {
            throw new Error("Some imported Rooms could not be verified in the backend data.");
          }
        },
        () => {
          setRoomPage(1);
          setIsUploadModalOpen(false);
          setUploadFile(null);
          setValidationResult(null);
          say(`Successfully imported ${payloads.length} rooms!`);
        }
      );
    } catch (err) {
      console.error("Import rooms failed", err);
      say("Import failed: " + getApiErrorMessage(err), "error");
    } finally {
      setIsImporting(false);
    }
  };

  const openDeleteSectionModal = async (sec) => {
    if (operationRef.current || initialLoading) return;
    setDeleteModalState({
      isOpen: true,
      section: sec,
      loading: true,
      studentCount: null,
    });

    try {
      const res = await apiClient.get(apiEndpoints.students.getBySection(sec.id));
      const studentList = unwrapList(res);
      const count = Array.isArray(studentList) ? studentList.length : 0;
      setDeleteModalState((prev) => ({
        ...prev,
        loading: false,
        studentCount: count,
      }));
      setSectionStudentCounts((prev) => ({ ...prev, [sec.id]: count }));
    } catch (err) {
      if (err?.response?.status === 404) {
        setDeleteModalState((prev) => ({
          ...prev,
          loading: false,
          studentCount: 0,
        }));
        setSectionStudentCounts((prev) => ({ ...prev, [sec.id]: 0 }));
      } else {
        const list = err?.response?.data?.data || err?.response?.data;
        const count = Array.isArray(list) ? list.length : 0;
        setDeleteModalState((prev) => ({
          ...prev,
          loading: false,
          studentCount: count,
        }));
        setSectionStudentCounts((prev) => ({ ...prev, [sec.id]: count }));
      }
    }
  };

  const closeDeleteSectionModal = () => {
    if (operationRef.current) return;
    setDeleteModalState({
      isOpen: false,
      section: null,
      loading: false,
      studentCount: null,
    });
  };

  const confirmDeleteSection = async () => {
    const sec = deleteModalState.section;
    if (!sec || operationRef.current || deleteModalState.studentCount > 0) return;

    await runMutation(
      "DELETE_SECTION:" + sec.id,
      () => apiClient.delete(apiEndpoints.sections.delete(sec.id)),
      async () => {
        const next = await loadSections();
        await loadRooms();
        closeDeleteSectionModal();
        if (next.some((item) => item.id === sec.id)) {
          throw new Error("The Section is still present in the backend data.");
        }
      },
      () => {
        closeDeleteSectionModal();
        say('Section "' + sec.name + '" deleted successfully.');
      }
    );
  };

  const openDeleteRoomModal = (room) => {
    if (operationRef.current || initialLoading) return;
    setDeleteRoomModalState({
      isOpen: true,
      room,
    });
  };

  const closeDeleteRoomModal = () => {
    if (operationRef.current) return;
    setDeleteRoomModalState({
      isOpen: false,
      room: null,
    });
  };

  const confirmDeleteRoom = async () => {
    const rm = deleteRoomModalState.room;
    if (!rm || operationRef.current) return;
    await runMutation(
      "DELETE_ROOM:" + rm.id,
      () => apiClient.delete(ROOM_ENDPOINTS.delete(rm.id)),
      async () => {
        const next = await loadRooms();
        closeDeleteRoomModal();
        if (next.some((item) => item.id === rm.id)) throw new Error("The Room is still present in the backend data.");
      },
      () => {
        closeDeleteRoomModal();
        say('Room "' + rm.roomNo + '" deleted successfully.');
      }
    );
  };

  const exportAllocationExcel = () => {
    if (!rooms.length && !sections.length) return say("No room or section allocation data is available to export.");
    downloadAllocationWorkbook(rooms, sections, resolveSection);
    say("Section and room allocation workbook downloaded successfully.");
  };

  // DYNAMIC HEADER DETAILS BASED ON ACTIVE TAB
  const dynamicHeader = useMemo(() => {
    if (activeTab === "rooms") {
      return {
        title: "Room Management",
        subtitle: "Manage classrooms, floor wise allocations, and room availability.",
      };
    }
    return {
      title: "Section Management",
      subtitle: "Manage academic sections, classrooms and teacher assignments.",
    };
  }, [activeTab]);

  return (
    <DashboardLayout
      title={dynamicHeader.title}
      subtitle={dynamicHeader.subtitle}
      breadcrumb={pageConfig.breadcrumb}
    >
      <div className="cms-sec-container">
        {initialLoading && <div className="cms-card cms-sec-loading" role="status">Loading Section and Room Management data...</div>}
        {/* Navigation Tabs - FIRST TAB IS ROOM MANAGEMENT, SECOND TAB IS SECTION MANAGEMENT */}
        <div className="cms-room-tabs" role="tablist" aria-label="Management modules">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "rooms"}
            className={`cms-room-tab ${activeTab === "rooms" ? "cms-room-tab-active" : ""}`}
            onClick={() => {
              setActiveTab("rooms");
              setRoomView("list");
            }}
          >
            Room Management
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sections"}
            className={`cms-room-tab ${activeTab === "sections" ? "cms-room-tab-active" : ""}`}
            onClick={() => {
              setActiveTab("sections");
              setSectionView("list");
            }}
          >
            Section Management
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ROOM MANAGEMENT (FIRST TAB)                        */}
        {/* ========================================================= */}
        {activeTab === "rooms" && (
          <>
            {roomView === "list" ? (
              /* ROOMS TABLE VIEW */
              <div className="cms-card">
                <div className="cms-toolbar cms-sec-toolbar">
                  <div className="cms-search cms-sec-search">
                    <Search size={16} />
                    <input
                      type="search"
                      placeholder="Search by Room No, block, floor..."
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                    />
                  </div>
                  <div className="cms-sec-toolbar-filters">
                    <div className="cms-field">
                      <SearchableSelect
                        value={roomFilters.building}
                        onChange={(val) => setRoomFilters((f) => ({ ...f, building: val }))}
                        options={roomBuildings}
                        placeholder="Block Name"
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={roomFilters.floor}
                        onChange={(val) => setRoomFilters((f) => ({ ...f, floor: val }))}
                        options={roomFloors}
                        placeholder="Floor"
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={roomFilters.roomType}
                        onChange={(val) => setRoomFilters((f) => ({ ...f, roomType: val }))}
                        options={roomFilterTypes}
                        placeholder="Room Type"
                        showSearch={true}
                      />
                    </div>
                  </div>
                  <div className="cms-sec-toolbar-spacer" />
                  <button
                    type="button"
                    className="cms-btn cms-btn-outline cms-sec-compact-btn"
                    onClick={() => {
                      setIsUploadModalOpen(true);
                      setUploadFile(null);
                      setValidationResult(null);
                    }}
                  >
                    <Upload size={16} />
                    Upload
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary cms-sec-compact-btn"
                    onClick={openAddRoom}
                  >
                    <Plus size={16} />
                    Add Room
                  </button>
                </div>

                {/* Rooms Table */}
                <div className="cms-table-wrap cms-sec-table-wrap">
                  <table className="cms-table cms-sec-table cms-room-table">
                    <thead>
                      <tr>
                        <th>Room No</th>
                        <th className="cms-cell-center">Block Name</th>
                        <th className="cms-cell-center">Floor</th>
                        <th>Room Type</th>
                        <th className="cms-cell-center">Capacity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownRooms.length ? (
                        shownRooms.map((room) => (
                          <tr key={room.id}>
                            <td className="cms-sec-name-cell">{room.roomNo}</td>
                            <td className="cms-cell-center">{room.building}</td>
                            <td className="cms-cell-center">{room.floor}</td>
                            <td>{room.roomType}</td>
                            <td className="cms-cell-center">{room.capacity}</td>
                            <td>
                              <span
                                className={`cms-sec-status-badge ${room.isActive ? "cms-badge-active" : "cms-badge-inactive"
                                  }`}
                              >
                                {room.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div className="cms-sec-table-actions">
                                <button
                                  type="button"
                                  className="cms-sec-action-btn"
                                  title="View Details"
                                  onClick={() => openEditRoom(room, true)}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="cms-sec-action-btn"
                                  title="Edit Room"
                                  onClick={() => openEditRoom(room, false)}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="cms-sec-action-btn cms-sec-delete-action"
                                  title="Delete Room"
                                  disabled={Boolean(operation)}
                                  onClick={() => openDeleteRoomModal(room)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center", padding: "24px" }}>
                            No rooms found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Room Pagination */}
                <div className="cms-sec-pagination">
                  <span className="cms-sec-record-summary">
                    Showing {shownRooms.length ? (roomPage - 1) * roomPageSize + 1 : 0}–
                    {Math.min(roomPage * roomPageSize, filteredRooms.length)} of {filteredRooms.length} records
                  </span>

                  <div className="cms-sec-page-size-wrap">
                    <span className="cms-sec-page-size-label">Per page:</span>
                    <select
                      className="cms-sec-page-size-select"
                      aria-label="Rooms per page"
                      value={isCustomRoomPage ? "custom" : roomPageSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "custom") {
                          setIsCustomRoomPage(true);
                          setCustomRoomPageInput(String(roomPageSize));
                        } else {
                          setIsCustomRoomPage(false);
                          setRoomPageSize(Number(val));
                          setRoomPage(1);
                        }
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value="custom">Custom</option>
                    </select>
                    {isCustomRoomPage && (
                      <input
                        type="number"
                        min="1"
                        max="200"
                        className="cms-sec-page-size-custom-input"
                        value={customRoomPageInput}
                        placeholder="Qty"
                        aria-label="Custom rooms per page"
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomRoomPageInput(val);
                          const num = parseInt(val, 10);
                          if (Number.isInteger(num) && num > 0) {
                            setRoomPageSize(num);
                            setRoomPage(1);
                          }
                        }}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={roomPage === 1}
                    onClick={() => setRoomPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {roomPage} / {roomPages}
                  </span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={roomPage === roomPages}
                    onClick={() => setRoomPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              /* ROOM FULL SCREEN FORM VIEW */
              <div className="cms-sec-screen-container">
                <div className="cms-sec-screen-head">
                  <div className="cms-sec-screen-title-wrap">
                    <button
                      type="button"
                      className="cms-sec-back-btn"
                      onClick={() => setRoomView("list")}
                      title="Back to Rooms List"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h3>
                      {roomFormMode === "preview"
                        ? "Room Details"
                        : selectedRoomId
                          ? "Edit Room"
                          : "Add Room"}
                    </h3>
                  </div>

                  {roomFormMode === "add" && (
                    <div className="cms-sec-mode-toggle">
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${roomCreationType === "single" ? "is-active" : ""}`}
                        onClick={() => {
                          setRoomCreationType("single");
                          setRoomFieldErrors({});
                        }}
                      >
                        Single Room
                      </button>
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${roomCreationType === "bulk" ? "is-active" : ""}`}
                        onClick={() => {
                          setRoomCreationType("bulk");
                          setRoomFieldErrors({});
                          setBulkRoomForm(EMPTY_BULK_ROOM_FORM);
                          setBulkRoomAllocations([]);
                          setBulkRoomPage(1);
                        }}
                      >
                        Multiple Rooms
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={saveRoom}>
                  <div className="cms-sec-screen-body">
                    {/* SINGLE ROOM FORM */}
                    {(roomCreationType === "single" || selectedRoomId) && (
                      <div className="cms-sec-form-grid">
                        <div className={`cms-field ${roomFieldErrors.roomNo ? "has-error" : ""}`}>
                          <label>
                            Room No <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            value={roomForm.roomNo}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. Block A-101"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, roomNo: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, roomNo: null }));
                            }}
                          />
                          {roomFieldErrors.roomNo && <span className="cms-field-error">{roomFieldErrors.roomNo}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.capacity ? "has-error" : ""}`}>
                          <label>
                            Capacity <span className="req">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={roomForm.capacity}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. 40"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, capacity: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, capacity: null }));
                            }}
                          />
                          {roomFieldErrors.capacity && <span className="cms-field-error">{roomFieldErrors.capacity}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.roomType ? "has-error" : ""}`}>
                          <label>
                            Room Type <span className="req">*</span>
                          </label>
                          <SearchableSelect
                            value={roomForm.roomType}
                            onChange={(val) => {
                              setRoomForm((f) => ({ ...f, roomType: val }));
                              setRoomFieldErrors((err) => ({ ...err, roomType: null }));
                            }}
                            options={ROOM_TYPES}
                            disabled={roomFormMode === "preview"}
                            showSearch={true}
                            hasError={Boolean(roomFieldErrors.roomType)}
                          />
                          {roomFieldErrors.roomType && <span className="cms-field-error">{roomFieldErrors.roomType}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.building ? "has-error" : ""}`}>
                          <label>
                            Block Name <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            value={roomForm.building}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. Block A"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, building: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, building: null }));
                            }}
                          />
                          {roomFieldErrors.building && <span className="cms-field-error">{roomFieldErrors.building}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.floor ? "has-error" : ""}`}>
                          <label>
                            Floor <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            value={roomForm.floor}
                            disabled={roomFormMode === "preview"}
                            placeholder="e.g. 1"
                            onChange={(e) => {
                              setRoomForm((f) => ({ ...f, floor: e.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, floor: null }));
                            }}
                          />
                          {roomFieldErrors.floor && <span className="cms-field-error">{roomFieldErrors.floor}</span>}
                        </div>

                        <div className={`cms-field ${roomFieldErrors.isActive ? "has-error" : ""}`}>
                          <label>
                            Status <span className="req">*</span>
                          </label>
                          <select
                            className="cms-sec-native-select"
                            value={roomForm.isActive}
                            onChange={(event) => {
                              setRoomForm((f) => ({ ...f, isActive: event.target.value }));
                              setRoomFieldErrors((err) => ({ ...err, isActive: null }));
                            }}
                            disabled={roomFormMode === "preview"}
                          >
                            <option value="" disabled>Select Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                          {roomFieldErrors.isActive && <span className="cms-field-error">{roomFieldErrors.isActive}</span>}
                        </div>
                      </div>
                    )}

                    {/* BULK ROOMS FORM */}
                    {roomCreationType === "bulk" && !selectedRoomId && (
                      <>
                        <div className="cms-sec-form-grid">
                          <div className={`cms-field ${roomFieldErrors.building ? "has-error" : ""}`}>
                            <label>
                              Building / Block <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={bulkRoomForm.building}
                              placeholder="e.g. Block A"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, building: e.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, building: null }));
                              }}
                            />
                            {roomFieldErrors.building && <span className="cms-field-error">{roomFieldErrors.building}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.floor ? "has-error" : ""}`}>
                            <label>
                              Floor <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={bulkRoomForm.floor}
                              placeholder="e.g. 1"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, floor: e.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, floor: null }));
                              }}
                            />
                            {roomFieldErrors.floor && <span className="cms-field-error">{roomFieldErrors.floor}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.startRoomNo ? "has-error" : ""}`}>
                            <label>
                              First Room Number <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={bulkRoomForm.startRoomNo}
                              placeholder="e.g. Block A-101"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, startRoomNo: e.target.value }));
                                setBulkRoomPage(1);
                                setRoomFieldErrors((err) => ({ ...err, startRoomNo: null }));
                              }}
                              onBlur={prepareBulkRoomAllocations}
                            />
                            {roomFieldErrors.startRoomNo && <span className="cms-field-error">{roomFieldErrors.startRoomNo}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.roomCount ? "has-error" : ""}`}>
                            <label>
                              Rooms to Create <span className="req">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={bulkRoomForm.roomCount}
                              placeholder="e.g. 30"
                              onChange={(e) => {
                                setBulkRoomForm((f) => ({ ...f, roomCount: e.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, roomCount: null }));
                              }}
                              onBlur={prepareBulkRoomAllocations}
                            />
                            {roomFieldErrors.roomCount && <span className="cms-field-error">{roomFieldErrors.roomCount}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.defaultCapacity ? "has-error" : ""}`}>
                            <label>
                              Capacity
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              step="1"
                              value={bulkRoomForm.defaultCapacity}
                              placeholder="e.g. 40"
                              onChange={(e) => {
                                const value = e.target.value;
                                const previousValue = String(bulkRoomForm.defaultCapacity || "");
                                setBulkRoomForm((f) => ({ ...f, defaultCapacity: value }));
                                setBulkRoomAllocations((current) => current.map((row) =>
                                  !String(row.capacity).trim() || String(row.capacity) === previousValue
                                    ? { ...row, capacity: value }
                                    : row
                                ));
                                setRoomFieldErrors((err) => ({ ...err, defaultCapacity: null }));
                              }}
                            />
                            {roomFieldErrors.defaultCapacity && <span className="cms-field-error">{roomFieldErrors.defaultCapacity}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.defaultRoomType ? "has-error" : ""}`}>
                            <label>
                              Room Type
                            </label>
                            <SearchableSelect
                              value={bulkRoomForm.defaultRoomType}
                              onChange={(val) => {
                                const previousValue = bulkRoomForm.defaultRoomType || "";
                                setBulkRoomForm((f) => ({ ...f, defaultRoomType: val }));
                                setBulkRoomAllocations((current) => current.map((row) =>
                                  !row.roomType || row.roomType === previousValue
                                    ? { ...row, roomType: val }
                                    : row
                                ));
                                setRoomFieldErrors((err) => ({ ...err, defaultRoomType: null }));
                              }}
                              options={ROOM_TYPES}
                              placeholder="Select Room Type"
                              showSearch={true}
                              hasError={Boolean(roomFieldErrors.defaultRoomType)}
                            />
                            {roomFieldErrors.defaultRoomType && <span className="cms-field-error">{roomFieldErrors.defaultRoomType}</span>}
                          </div>

                          <div className={`cms-field ${roomFieldErrors.isActive ? "has-error" : ""}`} style={{ gridColumn: "1 / -1" }}>
                            <label>
                              Status <span className="req">*</span>
                            </label>
                            <select
                              className="cms-sec-native-select"
                              value={bulkRoomForm.isActive}
                              onChange={(event) => {
                                setBulkRoomForm((f) => ({ ...f, isActive: event.target.value }));
                                setRoomFieldErrors((err) => ({ ...err, isActive: null }));
                              }}
                            >
                              <option value="" disabled>Select Status</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                            {roomFieldErrors.isActive && <span className="cms-field-error">{roomFieldErrors.isActive}</span>}
                          </div>
                        </div>
                        <BulkRoomAllocationPreview
                          allocations={bulkRoomAllocations}
                          requested={bulkRoomForm.roomCount}
                          errors={roomFieldErrors}
                          onChange={updateBulkRoomAllocation}
                          page={bulkRoomPage}
                          setPage={setBulkRoomPage}
                        />
                        {roomFieldErrors.bulk && <div className="cms-bulk-room-error">{roomFieldErrors.bulk}</div>}
                      </>
                    )}
                  </div>

                  <div className="cms-sec-screen-foot">
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => setRoomView("list")}
                      disabled={Boolean(operation)}
                    >
                      {roomFormMode === "preview" ? "Close" : "Cancel"}
                    </button>
                    {roomFormMode !== "preview" && (
                      <button type="submit" className="cms-btn cms-btn-primary" disabled={Boolean(operation)}>
                        {selectedRoomId
                          ? operation === "UPDATE_ROOM" ? "Updating..." : "Save Changes"
                          : roomCreationType === "bulk"
                            ? operation === "BULK_ROOM" ? "Creating..." : `Generate ${bulkRoomForm.roomCount || 0} Rooms`
                            : operation === "ADD_ROOM" ? "Adding..." : "Save Room"}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SECTION MANAGEMENT (SECOND TAB)                     */}
        {/* ========================================================= */}
        {activeTab === "sections" && (
          <>
            {sectionView === "list" ? (
              /* SECTION TABLE VIEW */
              <div className="cms-card">
                <div className="cms-toolbar cms-sec-toolbar">
                  <div className="cms-search cms-sec-search">
                    <Search size={16} />
                    <input
                      type="search"
                      placeholder="Search by section, group, program..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="cms-sec-toolbar-filters">
                    <div className="cms-field">
                      <SearchableSelect
                        value={filters.groupId}
                        onChange={(groupId) => {
                          setFilters((current) => ({
                            ...current,
                            groupId,
                            programId: (!groupId || sections.some((section) => (!current.boardId || normalizeId(section.boardId) === normalizeId(current.boardId)) && normalizeId(section.groupId) === normalizeId(groupId) && normalizeId(section.programId) === normalizeId(current.programId))) ? current.programId : "",
                          }));
                          setPage(1);
                        }}
                        options={sectionGroupFilterOptions}
                        placeholder="Select Group"
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={filters.programId}
                        onChange={(programId) => {
                          setFilters((current) => ({ ...current, programId }));
                          setPage(1);
                        }}
                        options={sectionProgramFilterOptions}
                        placeholder="Select Program"
                        showSearch={true}
                      />
                    </div>
                    <div className="cms-field">
                      <SearchableSelect
                        value={filters.academicLevelId}
                        onChange={(academicLevelId) => {
                          setFilters((current) => ({ ...current, academicLevelId }));
                          setPage(1);
                        }}
                        options={sectionLevelFilterOptions}
                        placeholder="Select Academic Level"
                        showSearch={true}
                      />
                    </div>
                  </div>
                  <div className="cms-sec-toolbar-spacer" />
                  <button type="button" className="cms-btn cms-btn-ghost cms-sec-compact-btn cms-allocation-export-btn" onClick={exportAllocationExcel}>
                    <Download size={15} /> Download Excel
                  </button>
                  <button type="button" className="cms-btn cms-btn-primary cms-sec-compact-btn" onClick={openAddSection}>
                    <Plus size={16} /> Add Section
                  </button>
                </div>

                {/* Sections Table */}
                <div className="cms-table-wrap cms-sec-table-wrap">
                  <table className="cms-table cms-sec-table cms-section-table">
                    <thead>
                      <tr>
                        <th>Section Name</th>
                        <th>Group</th>
                        <th>Program</th>
                        <th>Academic Level</th>
                        <th className="cms-cell-center">Room No</th>
                        <th>Incharge</th>
                        <th className="cms-cell-center">Capacity</th>
                        <th className="cms-cell-center">No of Students</th>
                        <th>Status</th>
                        <th className="cms-cell-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownSections.length ? (
                        shownSections.map((sec) => {
                          const detail = resolveSection(sec);
                          const teacherObj = teachersById.get(normalizeId(sec.classTeacherId));
                          const teacherCode = teacherObj?.employeeId || teacherObj?.employeeCode || "";
                          const studentCount = sectionStudentCounts[sec.id] !== undefined ? sectionStudentCounts[sec.id] : 0;
                          return (
                            <tr key={sec.id}>
                              <td className="cms-sec-name-cell">{sec.name}</td>
                              <td title={detail.groupName}>{detail.groupName}</td>
                              <td title={detail.programName}>{detail.programName}</td>
                              <td title={detail.academicLevelName}>
                                <div className="cms-two-line">
                                  <span className="cms-two-line-primary">{detail.academicLevelName || "—"}</span>
                                </div>
                              </td>
                              <td className="cms-cell-center" title={detail.roomNo}>{detail.roomNo || "—"}</td>
                              <td title={detail.teacherName}>
                                <div className="cms-two-line">
                                  <span className="cms-two-line-primary">{detail.teacherName || "—"}</span>
                                  {teacherCode && <span className="cms-two-line-secondary">{teacherCode}</span>}
                                </div>
                              </td>
                              <td className="cms-cell-center">{sec.strength || "—"}</td>
                              <td className="cms-cell-center">{studentCount ?? 0}</td>
                              <td>
                                <span
                                  className={`cms-sec-status-badge ${sec.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"
                                    }`}
                                >
                                  {sec.status}
                                </span>
                              </td>
                              <td className="cms-cell-center">
                                <div className="cms-sec-table-actions" style={{ justifyContent: "center" }}>
                                  <button
                                    type="button"
                                    className="cms-sec-action-btn"
                                    title="View Details"
                                    onClick={() => openEditSection(sec, true)}
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="cms-sec-action-btn"
                                    title="Edit Section"
                                    onClick={() => openEditSection(sec, false)}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="cms-sec-action-btn cms-sec-delete-action"
                                    title="Delete Section"
                                    disabled={Boolean(operation)}
                                    onClick={() => openDeleteSectionModal(sec)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="10" style={{ textAlign: "center", padding: "24px" }}>
                            No sections found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section Pagination */}
                <div className="cms-sec-pagination">
                  <span className="cms-sec-record-summary">
                    Showing {shownSections.length ? (page - 1) * sectionPageSize + 1 : 0}–
                    {Math.min(page * sectionPageSize, filteredSections.length)} of {filteredSections.length} records
                  </span>

                  <div className="cms-sec-page-size-wrap">
                    <span className="cms-sec-page-size-label">Per page:</span>
                    <select
                      className="cms-sec-page-size-select"
                      aria-label="Sections per page"
                      value={isCustomSectionPage ? "custom" : sectionPageSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "custom") {
                          setIsCustomSectionPage(true);
                          setCustomSectionPageInput(String(sectionPageSize));
                        } else {
                          setIsCustomSectionPage(false);
                          setSectionPageSize(Number(val));
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
                    {isCustomSectionPage && (
                      <input
                        type="number"
                        min="1"
                        max="200"
                        className="cms-sec-page-size-custom-input"
                        value={customSectionPageInput}
                        placeholder="Qty"
                        aria-label="Custom sections per page"
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomSectionPageInput(val);
                          const num = parseInt(val, 10);
                          if (Number.isInteger(num) && num > 0) {
                            setSectionPageSize(num);
                            setPage(1);
                          }
                        }}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {page} / {sectionPages}
                  </span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={page === sectionPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              /* SECTION FULL SCREEN FORM VIEW */
              <div className="cms-sec-screen-container">
                <div className="cms-sec-screen-head">
                  <div className="cms-sec-screen-title-wrap">
                    <button
                      type="button"
                      className="cms-sec-back-btn"
                      onClick={() => setSectionView("list")}
                      title="Back to Sections List"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h3>
                      {sectionFormMode === "preview"
                        ? "Section Details"
                        : selectedSectionId
                          ? "Edit & Reassign Section"
                          : "Add Academic Section"}
                    </h3>
                  </div>

                  {sectionFormMode === "add" && (
                    <div className="cms-sec-mode-toggle">
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${sectionCreationType === "single" ? "is-active" : ""}`}
                        onClick={() => {
                          setSectionCreationType("single");
                          setSectionForm((f) => ({
                            ...f,
                            name: "",
                            roomId: "",
                            classTeacherId: "",
                            strength: "",
                            status: "",
                          }));
                          setBulkSections([{ name: "", roomId: "", classTeacherId: "", strength: "", status: "" }]);
                          setFieldErrors({});
                        }}
                      >
                        Single Section
                      </button>
                      <button
                        type="button"
                        className={`cms-sec-mode-toggle-btn ${sectionCreationType === "bulk" ? "is-active" : ""}`}
                        onClick={() => {
                          setSectionCreationType("bulk");
                          setSectionForm((f) => ({
                            ...f,
                            name: "",
                            roomId: "",
                            classTeacherId: "",
                            strength: "",
                            status: "",
                          }));
                          setBulkSections([{ name: "", roomId: "", classTeacherId: "", strength: "", status: "" }]);
                          setFieldErrors({});
                        }}
                      >
                        Multiple Sections
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={saveSection}>
                  <div className="cms-sec-screen-body">
                    {/* Academic Configuration Fields */}
                    <div className="cms-sec-form-section-title">
                      <Layers size={14} /> Academic Configuration
                    </div>
                    <div className="cms-sec-form-grid">
                      <div className={`cms-field ${fieldErrors.boardId ? "has-error" : ""}`}>
                        <label>
                          Board <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.boardId}
                          onChange={(val) => {
                            setSectionForm((f) => ({
                              ...f,
                              boardId: val,
                              groupId: "",
                              programId: "",
                            }));
                            setFieldErrors((err) => ({
                              ...err,
                              boardId: null,
                              academicYearId: null,
                              academicLevelId: null,
                              groupId: null,
                              programId: null,
                            }));
                            loadBoardDependencies(val);
                          }}
                          options={boardOptions}
                          disabled={true}
                          placeholder="Select Board"
                          showSearch={false}
                          hasError={Boolean(fieldErrors.boardId)}
                        />
                        {fieldErrors.boardId && <span className="cms-field-error">{fieldErrors.boardId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.academicYearId ? "has-error" : ""}`}>
                        <label>
                          Academic Year <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.academicYearId}
                          onChange={(val) => {
                            changeAcademicScope("academicYearId", val);
                          }}
                          options={filteredYearOptions}
                          disabled={true}
                          placeholder="Select Academic Year"
                          showSearch={false}
                          hasError={Boolean(fieldErrors.academicYearId)}
                        />
                        {fieldErrors.academicYearId && <span className="cms-field-error">{fieldErrors.academicYearId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.groupId ? "has-error" : ""}`}>
                        <label>
                          Group <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.groupId}
                          onChange={(val) => {
                            setSectionForm((f) => ({ ...f, groupId: val, programId: "" }));
                            setFieldErrors((err) => ({ ...err, groupId: null, programId: null }));
                            loadPrograms(val);
                          }}
                          options={filteredGroupOptions}
                          disabled={sectionFormMode === "preview" || !sectionForm.boardId || dependentLoading.board}
                          placeholder={!sectionForm.boardId ? "Select Board First" : "Select Group (e.g. MPC, BiPC)"}
                          showSearch={true}
                          hasError={Boolean(fieldErrors.groupId)}
                        />
                        {fieldErrors.groupId && <span className="cms-field-error">{fieldErrors.groupId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.programId ? "has-error" : ""}`}>
                        <label>
                          Program <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.programId}
                          onChange={(val) => {
                            setSectionForm((f) => ({ ...f, programId: val }));
                            setFieldErrors((err) => ({ ...err, programId: null }));
                          }}
                          options={filteredProgramOptions}
                          disabled={sectionFormMode === "preview" || dependentLoading.program || !sectionForm.groupId}
                          placeholder={!sectionForm.groupId ? "Select Group First" : "Select Program (e.g. IIT, Mains)"}
                          showSearch={true}
                          hasError={Boolean(fieldErrors.programId)}
                        />
                        {fieldErrors.programId && <span className="cms-field-error">{fieldErrors.programId}</span>}
                      </div>

                      <div className={`cms-field ${fieldErrors.academicLevelId ? "has-error" : ""}`} style={{ gridColumn: "1 / -1" }}>
                        <label>
                          Academic Level <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          value={sectionForm.academicLevelId}
                          onChange={(val) => {
                            changeAcademicScope("academicLevelId", val);
                          }}
                          options={levelOptions}
                          disabled={sectionFormMode === "preview" || !sectionForm.boardId}
                          placeholder="Select Academic Level"
                          showSearch={true}
                          hasError={Boolean(fieldErrors.academicLevelId)}
                        />
                        {fieldErrors.academicLevelId && <span className="cms-field-error">{fieldErrors.academicLevelId}</span>}
                      </div>
                    </div>

                    {/* SINGLE SECTION FORM */}
                    {(sectionCreationType === "single" || selectedSectionId) && (
                      <>
                        <div className="cms-sec-form-section-title" style={{ marginTop: "12px" }}>
                          <Building2 size={14} /> Section & Allocation Details
                        </div>
                        <div className="cms-sec-form-grid">
                          <div className={`cms-field ${fieldErrors.name ? "has-error" : ""}`}>
                            <label>
                              Section Name <span className="req">*</span>
                            </label>
                            <input
                              type="text"
                              value={sectionForm.name}
                              disabled={sectionFormMode === "preview"}
                              placeholder="e.g. Section A"
                              onChange={(e) => {
                                setSectionForm((f) => ({ ...f, name: e.target.value }));
                                setFieldErrors((err) => ({ ...err, name: null }));
                              }}
                            />
                            {fieldErrors.name && <span className="cms-field-error">{fieldErrors.name}</span>}
                          </div>

                          <div className={`cms-field ${fieldErrors.roomId ? "has-error" : ""}`}>
                            <label>
                              Room No <span className="req">*</span>
                            </label>
                            <SearchableSelect
                              value={sectionForm.roomId}
                              onChange={handleSectionRoomChange}
                              options={availableRooms}
                              disabled={sectionFormMode === "preview"}
                              placeholder="Select Room No"
                              emptyText="No eligible classrooms available"
                              showSearch={true}
                              hasError={Boolean(fieldErrors.roomId)}
                            />
                            {fieldErrors.roomId && <span className="cms-field-error">{fieldErrors.roomId}</span>}
                          </div>

                          <div className="cms-field">
                            <label>Incharge</label>
                            <SearchableSelect
                              value={sectionForm.classTeacherId}
                              onChange={(val) => setSectionForm((f) => ({ ...f, classTeacherId: val }))}
                              options={availableTeachers}
                              disabled={sectionFormMode === "preview"}
                              placeholder="Select Incharge"
                              emptyText="No unassigned faculty available"
                              showSearch={true}
                              hasError={Boolean(fieldErrors.classTeacherId)}
                            />
                            {fieldErrors.classTeacherId && <span className="cms-field-error">{fieldErrors.classTeacherId}</span>}
                          </div>

                          <div className={`cms-field ${fieldErrors.strength ? "has-error" : ""}`}>
                            <label>
                              Capacity / Maximum Strength <span className="req">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="150"
                              step="1"
                              value={sectionForm.strength}
                              disabled={sectionFormMode === "preview"}
                              placeholder="Capacity"
                              onChange={(e) => {
                                setSectionForm((f) => ({ ...f, strength: e.target.value }));
                                setFieldErrors((err) => ({ ...err, strength: null }));
                              }}
                            />
                            {fieldErrors.strength && <span className="cms-field-error">{fieldErrors.strength}</span>}
                          </div>

                          <div className={`cms-field ${fieldErrors.status ? "has-error" : ""}`} style={{ gridColumn: "1 / -1" }}>
                            <label>
                              Status <span className="req">*</span>
                            </label>
                            <select
                              className="cms-sec-native-select"
                              value={sectionForm.status}
                              onChange={(event) => {
                                setSectionForm((f) => ({ ...f, status: event.target.value }));
                                setFieldErrors((err) => ({ ...err, status: null }));
                              }}
                              disabled={sectionFormMode === "preview"}
                            >
                              <option value="" disabled>Select Status</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                            {fieldErrors.status && <span className="cms-field-error">{fieldErrors.status}</span>}
                          </div>
                        </div>
                      </>
                    )}

                    {/* BULK SECTIONS FORM */}
                    {sectionCreationType === "bulk" && !selectedSectionId && (
                      <div className="cms-bulk-sections-container">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontSize: "13px", fontWeight: "700" }}>
                            Configure Program Sections
                          </span>
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost"
                            style={{ height: "30px", padding: "4px 10px", fontSize: "12px" }}
                            onClick={() =>
                              setBulkSections((prev) => [
                                ...prev,
                                {
                                  name: "",
                                  roomId: "",
                                  classTeacherId: "",
                                  strength: "",
                                  status: "",
                                },
                              ])
                            }
                          >
                            + Add Another Section
                          </button>
                        </div>

                        {bulkSections.map((sec, idx) => (
                          <div className="cms-bulk-section-row" key={idx}>
                            <div className="cms-field">
                              <input
                                type="text"
                                placeholder="Section Name"
                                value={sec.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].name = val;
                                    return next;
                                  });
                                }}
                              />
                              {fieldErrors[`name_${idx}`] && <span className="cms-field-error">{fieldErrors[`name_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <SearchableSelect
                                value={sec.roomId}
                                onChange={(roomId) => handleBulkSectionRoomChange(idx, roomId)}
                                options={getAvailableRoomsForBulkRow(idx)}
                                placeholder="Select Room No"
                                showSearch={true}
                                hasError={Boolean(fieldErrors[`room_${idx}`])}
                              />
                              {fieldErrors[`room_${idx}`] && <span className="cms-field-error">{fieldErrors[`room_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <SearchableSelect
                                value={sec.classTeacherId}
                                onChange={(val) => {
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].classTeacherId = val;
                                    return next;
                                  });
                                }}
                                options={getAvailableTeachersForBulkRow(idx)}
                                placeholder="Select Incharge"
                                showSearch={true}
                              />
                              {fieldErrors[`teacher_${idx}`] && <span className="cms-field-error">{fieldErrors[`teacher_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <input
                                type="number"
                                min="1"
                                max="150"
                                step="1"
                                placeholder="Capacity"
                                value={sec.strength}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].strength = val;
                                    return next;
                                  });
                                }}
                              />
                              {fieldErrors[`strength_${idx}`] && <span className="cms-field-error">{fieldErrors[`strength_${idx}`]}</span>}
                            </div>

                            <div className="cms-field">
                              <SearchableSelect
                                value={sec.status}
                                onChange={(val) => {
                                  setBulkSections((prev) => {
                                    const next = [...prev];
                                    next[idx].status = val;
                                    return next;
                                  });
                                }}
                                options={[
                                  { value: "Active", label: "Active" },
                                  { value: "Inactive", label: "Inactive" },
                                ]}
                                placeholder="Select Status"
                                showSearch={false}
                                hasError={Boolean(fieldErrors[`status_${idx}`])}
                              />
                              {fieldErrors[`status_${idx}`] && <span className="cms-field-error">{fieldErrors[`status_${idx}`]}</span>}
                            </div>

                            {bulkSections.length > 1 && (
                              <button
                                type="button"
                                className="cms-sec-action-btn cms-sec-delete-action"
                                title="Remove Row"
                                onClick={() => setBulkSections((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="cms-sec-screen-foot">
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => setSectionView("list")}
                      disabled={Boolean(operation)}
                    >
                      {sectionFormMode === "preview" ? "Close" : "Cancel"}
                    </button>
                    {sectionFormMode !== "preview" && (
                      <button type="submit" className="cms-btn cms-btn-primary" disabled={Boolean(operation)}>
                        {operation === "UPDATE_SECTION" ? "Updating..." : operation === "ADD_SECTION" ? "Adding..." : operation === "BULK_SECTION" ? "Creating..." : selectedSectionId ? "Save Changes" : "Create Section"}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* ROOM EXCEL UPLOAD / IMPORT MODAL */}
        {isUploadModalOpen && (
          <div className="cms-overlay" onClick={closeUploadModal}>
            <div
              className="cms-modal cms-room-upload-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="upload-rooms-title"
            >
              <div className="cms-modal-head">
                <div>
                  <h3 id="upload-rooms-title">Upload &amp; Import Rooms</h3>
                  <p className="cms-room-modal-subtitle">
                    Import previous rooms and buildings using an Excel (.xlsx, .xls) or CSV file.
                  </p>
                </div>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{ width: 32, height: 32, padding: 0 }}
                  onClick={closeUploadModal}
                  disabled={isImporting}
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
                    onClick={downloadRoomTemplate}
                  >
                    <Download size={13} />
                    Download Excel Template
                  </button>
                </div>

                {/* Drag and Drop Zone / File Card */}
                {!uploadFile ? (
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
                        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
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
                        <span className="cms-room-file-name">{uploadFile.name}</span>
                        <span className="cms-room-file-meta">
                          {(uploadFile.size / 1024).toFixed(1)} KB • Ready for validation
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      style={{ height: 28, padding: "0 10px", fontSize: 12 }}
                      onClick={() => {
                        setUploadFile(null);
                        setValidationResult(null);
                      }}
                      disabled={isValidating || isImporting}
                    >
                      Change File
                    </button>
                  </div>
                )}

                {/* Validation Results Display */}
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
                  onClick={closeUploadModal}
                  disabled={isImporting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="cms-btn cms-btn-outline"
                  onClick={validateExcelFile}
                  disabled={!uploadFile || isValidating || isImporting}
                >
                  {isValidating ? (
                    <>
                      <Loader2 size={14} className="cms-spin" />
                      Validating...
                    </>
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
                    onClick={handleImportRooms}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={14} className="cms-spin" />
                        Importing Rooms...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Import {validationResult.validPayloads.length} Rooms
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section Delete Confirmation Modal */}
        {deleteModalState.isOpen && (
          <div className="cms-overlay" onClick={closeDeleteSectionModal}>
            <div
              className="cms-modal cms-delete-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-section-title"
            >
              <div className="cms-delete-modal-content">
                <div
                  className={`cms-delete-modal-icon ${
                    deleteModalState.loading
                      ? ""
                      : deleteModalState.studentCount > 0
                        ? "blocked"
                        : "confirm"
                  }`}
                >
                  {deleteModalState.loading ? (
                    <Loader2 size={24} className="cms-spin" />
                  ) : deleteModalState.studentCount > 0 ? (
                    <AlertCircle size={26} />
                  ) : (
                    <Trash2 size={24} />
                  )}
                </div>

                <h3 id="delete-section-title" className="cms-delete-modal-title">
                  {deleteModalState.loading
                    ? "Checking Enrolled Students..."
                    : deleteModalState.studentCount > 0
                      ? "Cannot Delete Section"
                      : `Delete Section "${deleteModalState.section?.name}"?`}
                </h3>

                <p className="cms-delete-modal-desc">
                  {deleteModalState.loading ? (
                    `Checking if "${deleteModalState.section?.name || "this section"}" contains active student assignments...`
                  ) : deleteModalState.studentCount > 0 ? (
                    <>
                      This section currently has{" "}
                      <strong style={{ color: "var(--cms-red, #d93636)" }}>
                        {deleteModalState.studentCount} student{deleteModalState.studentCount === 1 ? "" : "s"}
                      </strong>{" "}
                      enrolled. Sections with active students cannot be deleted.
                    </>
                  ) : (
                    "This action will remove the section and its classroom/incharge assignments. This cannot be undone."
                  )}
                </p>

                {!deleteModalState.loading && deleteModalState.studentCount > 0 && (
                  <div className="cms-delete-modal-alert">
                    Please reassign or remove all {deleteModalState.studentCount} student(s) from this section before attempting deletion.
                  </div>
                )}
              </div>

              <div className="cms-modal-foot">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={closeDeleteSectionModal}
                  disabled={operation === `DELETE_SECTION:${deleteModalState.section?.id}`}
                >
                  {deleteModalState.studentCount > 0 ? "Close" : "Cancel"}
                </button>

                {!deleteModalState.loading && deleteModalState.studentCount === 0 && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-danger"
                    onClick={confirmDeleteSection}
                    disabled={operation === `DELETE_SECTION:${deleteModalState.section?.id}`}
                    style={{
                      background: "var(--cms-red, #d93636)",
                      borderColor: "var(--cms-red, #d93636)",
                      color: "#ffffff",
                    }}
                  >
                    {operation === `DELETE_SECTION:${deleteModalState.section?.id}` ? (
                      <>
                        <Loader2 size={14} className="cms-spin" /> Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} /> Delete Section
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Room Delete Confirmation Modal (Theme-Based Clean Dialog) */}
        {deleteRoomModalState.isOpen && (
          <div className="cms-overlay" onClick={closeDeleteRoomModal}>
            <div
              className="cms-modal cms-delete-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-room-title"
            >
              <div className="cms-delete-modal-content">
                <div className="cms-delete-modal-icon confirm">
                  <Trash2 size={24} />
                </div>

                <h3 id="delete-room-title" className="cms-delete-modal-title">
                  Delete Room "{deleteRoomModalState.room?.roomNo}"?
                </h3>

                <p className="cms-delete-modal-desc">
                  This action will remove the room from institutional records. This cannot be undone.
                </p>
              </div>

              <div className="cms-modal-foot">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={closeDeleteRoomModal}
                  disabled={operation === `DELETE_ROOM:${deleteRoomModalState.room?.id}`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="cms-btn cms-btn-danger"
                  onClick={confirmDeleteRoom}
                  disabled={operation === `DELETE_ROOM:${deleteRoomModalState.room?.id}`}
                  style={{
                    background: "var(--cms-red, #d93636)",
                    borderColor: "var(--cms-red, #d93636)",
                    color: "#ffffff",
                  }}
                >
                  {operation === `DELETE_ROOM:${deleteRoomModalState.room?.id}` ? (
                    <>
                      <Loader2 size={14} className="cms-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Delete Room
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toast && (
          <div
            className={`cms-toast ${typeof toast === "object" && toast?.type === "error" ? "cms-toast-error" : "cms-toast-success"}`}
            role="status"
          >
            {typeof toast === "object" && toast?.type === "error" ? (
              <X size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>{typeof toast === "object" ? toast.text : toast}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
